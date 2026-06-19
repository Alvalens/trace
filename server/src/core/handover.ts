// Pure handover assembly: reconcile -> classify -> flag -> bucket.
// Deterministic; the single entry point the query route calls. NO LLM.

import type { BucketName, Handover, HandoverItem, NormalizedEvent, Thread } from './types.js';
import { reconcileThreads } from './reconcile.js';
import { detectFlags } from './flags.js';
import { titleOf } from './format.js';
import { addDays } from './shifts.js';

export interface BuildOptions {
  hotel: string;
  date?: string;
  proseNightIngested: boolean;
}

/**
 * Build the four-bucket, action-first handover for a hotel + morning.
 * Bucketing is deterministic (category + quote-anchored signals), never LLM-judged.
 * Every item carries sourceIds.
 */
export function buildHandover(allEvents: NormalizedEvent[], opts: BuildOptions): Handover {
  const target = opts.date ?? latestShift(allEvents);
  const events = allEvents.filter((e) => e.shiftDate <= target);
  const threads = reconcileThreads(events, target);
  const { items: flagItems, flaggedKeys } = detectFlags(threads, target);

  const buckets: Record<BucketName, HandoverItem[]> = { critical: [], pending: [], info: [], flags: flagItems };
  for (const t of threads) {
    if (flaggedKeys.has(t.issueKey)) continue;
    const item = toItem(t);
    const openNow = t.status !== 'resolved';
    const critical = openNow && t.events.some((e) => e.signals.safetyRelevant || e.signals.timeCritical);
    if (critical) buckets.critical.push(item);
    else if (openNow) buckets.pending.push(item);
    else buckets.info.push(item);
  }

  return {
    hotel: opts.hotel,
    date: target,
    shift: `${addDays(target, -1)}T23:00 → ${target}T07:00`,
    buckets,
    meta: { proseNightIngested: opts.proseNightIngested, eventsConsidered: events.length },
    narrative: null,
  };
}

function toItem(t: Thread): HandoverItem {
  return {
    issueKey: t.issueKey,
    title: titleOf(t),
    status: t.status,
    classification: t.classification,
    sourceIds: t.events.map((e) => e.id),
    thread: t.events,
  };
}

function latestShift(events: NormalizedEvent[]): string {
  return events.reduce((m, e) => (e.shiftDate > m ? e.shiftDate : m), '0000-00-00');
}
