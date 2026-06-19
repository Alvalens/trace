// Pure handover assembly: reconcile -> classify -> flag -> bucket.
// Deterministic; the single entry point the query route calls. NO LLM.

import type { Handover, NormalizedEvent } from './types.js';

export interface BuildOptions {
  hotel: string;
  date: string; // target morning (YYYY-MM-DD)
  proseNightIngested: boolean;
}

/**
 * Build the four-bucket, action-first handover for a hotel + morning.
 * Bucketing is deterministic (category + quote-anchored signals), never LLM-judged.
 * Every item carries sourceIds.
 *
 * TODO(build): wire reconcileThreads -> detectFlags -> bucketize. Default `date`
 * to the latest shift in the data when omitted.
 */
export function buildHandover(_events: NormalizedEvent[], _opts: BuildOptions): Handover {
  throw new Error('buildHandover not implemented');
}
