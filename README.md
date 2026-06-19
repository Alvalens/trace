# Trace — Night-Shift Handover Service

Turns a hotel's overnight front-desk records into an action-first morning handover (critical / pending /
info / flags), readable in under a minute. Structured events are parsed by code; the free-text prose night
is extracted once by Gemini, with every statement traceable to its source line. See [`DECISIONS.md`](DECISIONS.md).

**Live service:** https://night-handover-897770238987.asia-southeast1.run.app

## Try it

```bash
BASE=https://night-handover-897770238987.asia-southeast1.run.app

# Health
curl "$BASE/health"

# Handover for a morning (JSON). Reconciles across nights as of that date.
curl "$BASE/handover/lumen-sg?date=2026-05-30"

# Same, rendered as readable HTML
curl -H 'Accept: text/html' "$BASE/handover/lumen-sg?date=2026-05-28"

# Ingest a free-text prose night (one-time Gemini extraction, then persisted).
# body: { "text": "<markdown>", "date": "<shift morning YYYY-MM-DD>" }
curl -X POST "$BASE/ingest/lumen-sg" \
  -H 'Content-Type: application/json' \
  --data-binary "{\"text\": \"$(sed 's/\"/\\\"/g' data/night-logs.md | tr '\n' ' ')\", \"date\": \"2026-05-28\"}"

# Extraction trace from the last ingest (verbatim excerpt + quoteVerified per line)
curl "$BASE/debug/last-run"
```

After ingesting the prose night, re-query `GET /handover/lumen-sg?date=2026-05-28` to see the prose updates
threaded onto the structured issues. A captured live run is in [`docs/evidence/`](docs/evidence/).

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/handover/:hotel?date=YYYY-MM-DD` | Reconciled, action-first handover (JSON or HTML). Default date = latest shift in the data. |
| POST | `/ingest/:hotel` | One-time prose extraction (`{text, date}`), persisted in-memory. |
| GET | `/debug/last-run` | Last extraction trace, for debugging a bad handover. |
| GET | `/health` | Liveness. |

## Develop

```bash
npm run build   # builds server + client
npm test        # server test suite (vitest)
npm start       # node server/dist/index.js
```

## Deploy (Cloud Run, from source)

```bash
gcloud run deploy night-handover --source . \
  --region asia-southeast1 --allow-unauthenticated \
  --min-instances 1 --max-instances 1 \
  --set-env-vars GEMINI_API_KEY=$GEMINI_API_KEY,DATA_PATH=data/events.json,CLIENT_DIST=client/dist
```

Single-instance is deliberate: the in-memory store means upload and query must hit the same instance
(demo tradeoff; production would persist to GCS/DB). See [`DECISIONS.md`](DECISIONS.md).

## Environment

- `GEMINI_API_KEY` — Gemini API key for prose extraction
- `DATA_PATH` — path to events.json (default `data/events.json`)
- `CLIENT_DIST` — path to the built client (default `client/dist`)
