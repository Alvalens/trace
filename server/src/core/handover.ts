// Pure handover assembly: reconcile -> classify -> flag -> bucket.
// Deterministic; the single entry point the query route calls. NO LLM.

import type { BucketName, Handover, HandoverItem, NormalizedEvent, ReviewItem, Thread } from './types.js';
import { reconcileThreads } from './reconcile.js';
import { detectFlags } from './flags.js';
import { titleOf } from './format.js';
import { addDays } from './shifts.js';

export interface BuildOptions {
  hotel: string;
  date?: string;
  proseNightIngested: boolean;
  /** Unverified extractions to surface as `unverified` flags (never silently dropped). */
  review?: ReviewItem[];
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
  for (const r of opts.review ?? []) buckets.flags.push(unverifiedFlag(r));
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

/**
 * An unverified extraction: never asserted as a fact (no thread, no normal bucket), but
 * surfaced so a human can check the source line. If the model marked it time/safety-critical,
 * say so in the reason — a critical line must never vanish just because its excerpt didn't match.
 */
function unverifiedFlag(r: ReviewItem): HandoverItem {
  const where = r.room ? `Room ${r.room}` : r.line ? `prose line ${r.line}` : 'prose log';
  const urgent = r.safetyRelevant || r.timeCritical ? ' Model flagged it safety/time-critical — review urgently.' : '';
  return {
    issueKey: `${r.room ?? 'prose'}:unverified${r.line ? `:${r.line}` : ''}`,
    title: `${where}: unverified extraction — check the source line`,
    status: 'open',
    classification: 'new_tonight',
    sourceIds: r.line ? [`prose:line:${r.line}`] : ['prose'],
    flagType: 'unverified',
    reason: `The model's excerpt did not match the source verbatim, so this was withheld from the buckets rather than asserted.${urgent}`,
    thread: [],
  };
}

function latestShift(events: NormalizedEvent[]): string {
  return events.reduce((m, e) => (e.shiftDate > m ? e.shiftDate : m), '0000-00-00');
}
