// Express wiring. Handlers stay THIN: validate -> call core/ingest -> shape -> log.
// All business logic lives in core/ (pure) and ingest/. See .claude/rules/api-patterns.md.

import express, { type Request, type Response, type NextFunction } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { log } from './logging.js';
import { getEvents, hasProse, addEvents, addReview, getReview } from '../ingest/store.js';
import { buildHandover } from '../core/handover.js';
import { extractProse } from '../ingest/extractProse.js';
import { GeminiClient } from '../ingest/gemini.js';
import { setLastRun, getLastRun } from '../ingest/lastRun.js';
import { renderHandoverHtml } from './htmlView.js';

const gemini = new GeminiClient();

export function createApp(): express.Express {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  // Request log: every call gets one line with method / path / status / latency — so a bad
  // handover can be traced to the exact request that produced it. See logging.ts.
  app.use((req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    res.on('finish', () => {
      log('info', 'request', { method: req.method, path: req.path, status: res.statusCode, ms: Date.now() - start });
    });
    next();
  });

  app.get('/health', (_req: Request, res: Response) => {
    res.json({ ok: true });
  });

  // Ingestion trigger: paste/upload the prose night -> extract once -> store.
  app.post('/ingest/:hotel', async (req: Request, res: Response, next: NextFunction) => {
    const { hotel } = req.params;
    const body = req.body as { text?: unknown; date?: unknown };
    const text: unknown = body.text;
    if (typeof text !== 'string' || text.trim() === '') {
      res.status(400).json({ error: 'body.text (prose markdown) is required' });
      return;
    }
    const overrideDate = typeof body.date === 'string' && body.date.trim() !== '' ? body.date.trim() : undefined;
    try {
      const { events, review, trace } = await extractProse(text, hotel, gemini, overrideDate);
      addEvents(hotel, events);
      addReview(hotel, review);
      setLastRun(hotel, new Date().toISOString(), trace);
      log('info', 'ingest.done', { hotel, extracted: events.length, unverified: review.length });
      res.json({ events, review, trace });
    } catch (err) {
      next(err);
    }
  });

  // Query: reconciled, action-first handover for a morning. Pure, deterministic.
  app.get('/handover/:hotel', (req: Request, res: Response) => {
    const { hotel } = req.params;
    const date = typeof req.query.date === 'string' ? req.query.date : undefined;
    const events = getEvents(hotel);
    if (events.length === 0) {
      res.status(404).json({ error: `unknown hotel: ${hotel}` });
      return;
    }
    const handover = buildHandover(events, { hotel, date, proseNightIngested: hasProse(hotel), review: getReview(hotel) });
    log('info', 'handover.served', {
      hotel, date: handover.date, eventsConsidered: handover.meta.eventsConsidered,
      counts: Object.fromEntries(Object.entries(handover.buckets).map(([k, v]) => [k, v.length])),
    });
    if (req.accepts(['json', 'html']) === 'html') {
      res.type('html').send(renderHandoverHtml(handover));
      return;
    }
    res.json(handover);
  });

  app.get('/debug/last-run', (_req: Request, res: Response) => {
    const last = getLastRun();
    if (!last) {
      res.status(404).json({ error: 'no extraction has run yet' });
      return;
    }
    res.json(last);
  });

  // Serve the built React client in production, if present (single-container deploy).
  const clientDist = process.env.CLIENT_DIST ?? path.resolve(process.cwd(), '../client/dist');
  if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    log('error', 'unhandled', { message: err instanceof Error ? err.message : String(err) });
    res.status(500).json({ error: 'internal error' });
  });

  return app;
}
