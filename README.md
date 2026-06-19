# Night Handover Service

Shift handover coordinator for hotel operations. Ingests prose night logs via Gemini, extracts events, and serves reconciled handover summaries.

## Deployment to Cloud Run

Deploy from source using Google Cloud buildpacks (no Docker required):

```bash
gcloud run deploy night-handover --source . \
  --region asia-southeast1 --allow-unauthenticated \
  --min-instances 1 --max-instances 1 \
  --set-env-vars GEMINI_API_KEY=$GEMINI_API_KEY,DATA_PATH=data/events.json,CLIENT_DIST=client/dist
```

**Deployed service:** `<SERVICE_URL>`

Replace `<SERVICE_URL>` with the actual Cloud Run service URL after deployment (e.g., `https://night-handover-abc123.asia-southeast1.run.app`).

## API Endpoints

### Query handover (JSON or HTML)
```bash
# JSON response
curl '<SERVICE_URL>/handover/lumen-sg?date=2026-05-30'

# Readable HTML
curl -H 'Accept: text/html' '<SERVICE_URL>/handover/lumen-sg'
```

### Serve React client
```bash
curl '<SERVICE_URL>/'
```

### Health check
```bash
curl '<SERVICE_URL>/health'
```

## Development

Build and test locally:
```bash
npm run build
npm test
npm start
```

## Environment Variables

- `GEMINI_API_KEY` — Gemini API key for prose extraction
- `DATA_PATH` — Path to events.json (default: `data/events.json`)
- `CLIENT_DIST` — Path to built React client (default: `client/dist`)
