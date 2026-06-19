// Express wiring. Handlers stay THIN: validate -> call core/ingest -> shape -> log.
// All business logic lives in core/ (pure) and ingest/. See .claude/rules/api-patterns.md.

import express, { type Request, type Response, type NextFunction } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { log } from './logging.js';
import { getEvents, hasProse } from '../ingest/store.js';
import { buildHandover } from '../core/handover.js';

export function createApp(): express.Express {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_req: Request, res: Response) => {
    res.json({ ok: true });
  });

  // Ingestion trigger: paste/upload the prose night -> extract once -> store.
  app.post('/ingest/:hotel', (req: Request, res: Response) => {
    const { hotel } = req.params;
    const text: unknown = (req.body as { text?: unknown })?.text;
    if (typeof text !== 'string' || text.trim() === '') {
      res.status(400).json({ error: 'body.text (prose markdown) is required' });
      return;
    }
    log('info', 'ingest.requested', { hotel, chars: text.length });
    // TODO(build): extractProse(text, hotel, gemini) -> quoteVerify -> addEvents -> return trace
    res.status(501).json({ error: 'ingestion not implemented yet' });
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
    const handover = buildHandover(events, { hotel, date, proseNightIngested: hasProse(hotel) });
    log('info', 'handover.served', {
      hotel, date: handover.date, eventsConsidered: handover.meta.eventsConsidered,
      counts: Object.fromEntries(Object.entries(handover.buckets).map(([k, v]) => [k, v.length])),
    });
    res.json(handover);
  });

  app.get('/debug/last-run', (_req: Request, res: Response) => {
    res.status(501).json({ error: 'debug trace not implemented yet' });
  });

  // Serve the built React client in production, if present (single-container deploy).
  const clientDist = path.resolve(process.cwd(), '../client/dist');
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
