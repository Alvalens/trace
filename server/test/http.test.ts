// Edge smoke test: the abuse guards on the HTTP boundary (payload cap + ingest rate limit).
// These checks run BEFORE extractProse, so no Gemini call happens here.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { Server } from 'node:http';
import { createApp } from '../src/http/app.js';
import { MAX_PROSE_CHARS } from '../src/http/limits.js';

let server: Server;
let base: string;

beforeAll(async () => {
  const app = createApp();
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const addr = server.address();
      const port = typeof addr === 'object' && addr ? addr.port : 0;
      base = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

afterAll(() => {
  server?.close();
});

// trust proxy=1 → the limiter keys on X-Forwarded-For, so a distinct client IP per test
// isolates each test's rate-limit window (order-independent).
const ingest = (body: unknown, clientIp: string) =>
  fetch(`${base}/ingest/test-hotel`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': clientIp },
    body: JSON.stringify(body),
  });

describe('HTTP abuse guards', () => {
  it('rejects prose longer than MAX_PROSE_CHARS with 413 (no model call)', async () => {
    const res = await ingest({ text: 'x'.repeat(MAX_PROSE_CHARS + 1) }, '203.0.113.1');
    expect(res.status).toBe(413);
  });

  it('rate-limits the ingest path: the 6th request in the window is 429', async () => {
    // 5 allowed/window. Empty text → 400 from the handler, but the limiter counts every hit,
    // so the 6th is rejected with 429 before reaching validation — and never touches the model.
    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) {
      statuses.push((await ingest({ text: '' }, '203.0.113.2')).status);
    }
    expect(statuses.slice(0, 5)).toEqual([400, 400, 400, 400, 400]);
    expect(statuses[5]).toBe(429);
  });
});
