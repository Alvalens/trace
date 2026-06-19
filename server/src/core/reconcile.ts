// Pure reconciliation: group normalized events into threads by issue-key,
// order each thread newest-first, derive current status + classification
// relative to the target shift. NO LLM. See plan.md §4.

import type { NormalizedEvent, Thread } from './types.js';

/**
 * Group events into threads keyed by `room:category`, newest event first.
 * Current status = newest event. Classification is assigned relative to the
 * most recent shift on/before the target morning.
 *
 * TODO(build): implement grouping + classification (new_tonight / still_open /
 * newly_resolved / resolved_earlier). Cover the data fixtures in plan.md §3.
 */
export function reconcileThreads(_events: NormalizedEvent[], _targetShiftDate: string): Thread[] {
  throw new Error('reconcileThreads not implemented');
}
