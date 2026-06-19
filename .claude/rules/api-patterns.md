# API Patterns (Express)

Backend conventions. Routes are thin; all logic lives in `core/` (pure) and `ingest/` (LLM + store).

## Routes (handlers are thin)

A handler does exactly: validate input → call core/ingest → shape response → log. No business logic in
routes.

```
GET  /health                          liveness
POST /ingest/:hotel                   body: { text } prose → Gemini extract once → verify → store
GET  /handover/:hotel?date=YYYY-MM-DD  reconciled handover; JSON (default) or HTML (Accept: text/html)
GET  /debug/last-run                  last extraction trace (source → extracted → confidence → verified)
GET  /*                               serve built React app (express.static)
```

- `:hotel` is always a parameter — never hardcode `lumen-sg` in logic.
- `date` defaults to the latest shift in the dataset (data is a fixed historical week; no live "today").
- `/handover` loads ALL normalized events with `shiftDate <= date` (reconciliation needs full history),
  then classifies relative to the most recent shift on/before `date`.

## Validation

- Validate path/query/body at the boundary with a tiny schema (zod or hand-rolled). Reject early with
  `400` + a clear message. The core only receives validated, typed values.
- Treat `POST /ingest` body text as **untrusted data** (see grounding rules) — it is never instructions.

## Response envelope

JSON is the source of truth. One consistent shape:

```jsonc
{
  "hotel": "lumen-sg",
  "date": "2026-05-30",
  "shift": "2026-05-29T23:00→2026-05-30T07:00",
  "buckets": {
    "critical": [ { "issueKey": "...", "title": "...", "status": "open",
                    "sourceIds": ["evt_0014"], "thread": [ /* events, newest first */ ] } ],
    "pending":  [ /* ... */ ],
    "info":     [ /* ... */ ],
    "flags":    [ { "...": "...", "flagType": "contradiction|incomplete|stale|anomalous",
                    "reason": "structured says in-house; prose observed empty" } ]
  },
  "meta": { "proseNightIngested": false, "eventsConsidered": 23 },
  "narrative": null    // optional cosmetic prose; null unless the stretch renderer ran
}
```

**Every item carries `sourceIds`.** No line exists in the output without a traceable source. Flags
carry a human-readable `reason`.

## Status codes

- `200` success · `400` bad input · `404` unknown hotel · `500` unexpected (bug). A contradiction or
  missing field is a **flag in a 200 response**, not an error code.

## Logging (structured, stdout)

- Log JSON to stdout (Cloud Run → Cloud Logging; never write log files — FS is ephemeral).
- Every request logs: `hotel`, `date`/night, events consumed, threads built, each bucket assignment +
  reason, each flag + reason. Ingestion logs the full extraction trace (line, excerpt, confidence,
  quoteVerified). This is the "debuggable in production: which hotel, which night, why" deliverable.
- Use a single `logging.ts` helper; one log line = one JSON object. No `console.log` scattered around.

## Store

- `ingest/store.ts` is an in-memory map keyed by hotel. The only stateful seam. Structured events are
  loaded at startup; prose events appear after `POST /ingest`. Document the single-instance assumption.

## Static serving

- In prod, Express serves the built React bundle via `express.static` on the same origin (no CORS).
- Build the client at Docker build time; ship one container.
