// Entry point: load structured events, then start the HTTP server.

import { createApp } from './http/app.js';
import { loadStructuredEvents } from './ingest/bootstrap.js';
import { log } from './http/logging.js';

const PORT = Number(process.env.PORT) || 8080;

function main(): void {
  loadStructuredEvents();
  const app = createApp();
  app.listen(PORT, () => log('info', 'server.started', { port: PORT }));
}

try {
  main();
} catch (err) {
  log('error', 'startup.failed', { message: err instanceof Error ? err.message : String(err) });
  process.exit(1);
}
