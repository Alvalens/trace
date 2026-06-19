import type { ExtractionTraceEntry } from './extractProse.js';

let last: { hotel: string; at: string; trace: ExtractionTraceEntry[] } | null = null;

export function setLastRun(hotel: string, at: string, trace: ExtractionTraceEntry[]): void {
  last = { hotel, at, trace };
}
export function getLastRun(): typeof last {
  return last;
}
