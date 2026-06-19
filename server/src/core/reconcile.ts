// Pure reconciliation: group normalized events into threads by issue-key,
// order each thread newest-first, derive current status + classification
// relative to the target shift. NO LLM. See plan.md §4.

import type { Classification, NormalizedEvent, Thread } from './types.js';
import { issueKey } from './normalize.js';

/**
 * Group events into threads keyed by `room:category`, newest event first.
 * Current status = newest event's status. Classification relative to the
 * target shift date: new_tonight (opened tonight), still_open (older, unresolved),
 * newly_resolved (resolved tonight), or resolved_earlier (resolved before tonight).
 */
export function reconcileThreads(events: NormalizedEvent[], targetShiftDate: string): Thread[] {
  const groups = new Map<string, NormalizedEvent[]>();
  for (const e of events) {
    const key = issueKey(e.room, e.category);
    const arr = groups.get(key);
    if (arr) arr.push(e);
    else groups.set(key, [e]);
  }

  const threads: Thread[] = [];
  for (const [key, evs] of groups) {
    const sorted = [...evs].sort((a, b) => b.timestamp.localeCompare(a.timestamp)); // newest first
    const last = sorted[0];
    const first = sorted[sorted.length - 1];
    threads.push({
      issueKey: key,
      room: last.room,
      category: last.category,
      status: last.status,
      classification: classify(first, last, targetShiftDate),
      events: sorted,
    });
  }
  return threads;
}

function classify(first: NormalizedEvent, last: NormalizedEvent, target: string): Classification {
  const openNow = last.status !== 'resolved';
  if (!openNow && last.shiftDate === target) return 'newly_resolved';
  if (openNow && first.shiftDate === target) return 'new_tonight';
  if (openNow) return 'still_open';
  return 'resolved_earlier';
}
