// Abuse guards for the public endpoints. The /ingest path triggers a paid Gemini call per
// request, so it is rate-limited far more strictly than the read-only query path. These are a
// basic flood/cost guard, not an auth boundary (there is no auth — see DECISIONS.md, hours 3-6).

import rateLimit, { type RateLimitRequestHandler } from 'express-rate-limit';

/** Max accepted JSON body size. A prose night is a few KB; this is generous but bounded. */
export const MAX_BODY_SIZE = '256kb';

/** Max length of the prose `text` field, in characters. Rejected with 413 above this. */
export const MAX_PROSE_CHARS = 50_000;

// We sit behind the Cloud Run front end (one proxy hop), which appends the real client IP to
// X-Forwarded-For. We deliberately trust that single hop for per-client keying; tell the limiter
// so it does not warn about the (intentional) trust-proxy setting.
const VALIDATE = { trustProxy: false } as const;

/** Coarse flood guard across every route: 60 requests/minute per IP. */
export const globalLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 60_000,
  limit: 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  validate: VALIDATE,
  message: { error: 'too many requests; slow down' },
});

/** Strict guard on the expensive LLM path: 5 ingests / 15 minutes per IP. */
export const ingestLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 15 * 60_000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  validate: VALIDATE,
  message: { error: 'ingest rate limit reached; each upload runs a model extraction — try again later' },
});
