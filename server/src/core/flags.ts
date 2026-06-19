// Pure, rule-derived flagging. The model never decides a flag — it only supplies
// quote-anchored `facts`/`signals`; this maps them to dispositions.
// See .claude/rules/grounding-and-ai.md ("Signals vs decisions").

import type { Thread, HandoverItem } from './types.js';

/**
 * Derive flags from reconciled threads:
 *  - contradiction: same issue-key, conflicting facts
 *  - incomplete:    actionable item blocked by a missing field (e.g. !roomIdentifiable)
 *  - stale:         open thread with no update for ~2 shifts
 *  - anomalous:     signals.containsMetaInstruction (surfaced, never executed)
 * Guard: a deliberately-stated exception is NOT a flag.
 *
 * TODO(build): implement per the rules.
 */
export function detectFlags(_threads: Thread[], _targetShiftDate: string): HandoverItem[] {
  throw new Error('detectFlags not implemented');
}
