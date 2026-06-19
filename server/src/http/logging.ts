// Structured logging to stdout (Cloud Run -> Cloud Logging). One JSON object per line.
// Keep every log keyed by hotel / night / why — the "debuggable in production" deliverable.

type Level = 'info' | 'warn' | 'error';

export function log(level: Level, event: string, data: Record<string, unknown> = {}): void {
  process.stdout.write(JSON.stringify({ level, event, ...data }) + '\n');
}
