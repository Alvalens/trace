// Pure, rule-derived flagging. The model never decides a flag — it only supplies
// quote-anchored `facts`/`signals`; this maps them to dispositions.
// See .claude/rules/grounding-and-ai.md ("Signals vs decisions").

import type { HandoverItem, NormalizedEvent, Thread } from './types.js';
import { daysBetween } from './shifts.js';
import { titleOf } from './format.js';

export interface FlagResult {
  items: HandoverItem[];
  flaggedKeys: Set<string>;
}

/**
 * Derive flags from reconciled threads:
 *  - contradiction: same issue-key, conflicting facts
 *  - incomplete:    actionable item blocked by a missing field (e.g. !roomIdentifiable)
 *  - stale:         open thread with no update for ~2 shifts
 *  - anomalous:     signals.containsMetaInstruction (surfaced, never executed)
 * Guard: a deliberately-stated exception is NOT a flag.
 */
export function detectFlags(threads: Thread[], targetShiftDate: string): FlagResult {
  const items: HandoverItem[] = [];
  const flaggedKeys = new Set<string>();

  // 1) Cross-room occupancy contradiction — runs first so it owns the room.
  const byRoom = new Map<string, NormalizedEvent[]>();
  for (const t of threads) {
    for (const e of t.events) {
      if (!e.room) continue;
      const arr = byRoom.get(e.room);
      if (arr) arr.push(e);
      else byRoom.set(e.room, [e]);
    }
  }
  for (const [room, evs] of byRoom) {
    const inHouse = evs.find((e) => e.facts.occupancy === 'in_house');
    const empty = evs.find((e) => e.facts.occupancy === 'empty');
    if (inHouse && empty) {
      items.push({
        issueKey: `${room}:contradiction`,
        title: `Room ${room}: conflicting occupancy (in-house vs observed empty)`,
        status: 'open',
        classification: 'still_open',
        sourceIds: [inHouse.id, empty.id],
        flagType: 'contradiction',
        reason: `${inHouse.id} shows the room in-house; ${empty.id} observed it empty — verify before billing.`,
        thread: [empty, inHouse],
      });
      for (const t of threads) if (t.room === room) flaggedKeys.add(t.issueKey);
    }
  }

  // 2) Thread-level flags (skip rooms already owned by a contradiction).
  for (const t of threads) {
    if (flaggedKeys.has(t.issueKey)) continue;

    // Anomalous (injection / tool-directed text) is a security signal and surfaces
    // regardless of status — intentionally checked BEFORE the resolved guard below.
    const anomalous = t.events.find((e) => e.signals.containsMetaInstruction);
    if (anomalous) {
      items.push(flagItem(t, 'anomalous', 'Contains text addressed to the tool — surfaced for review, not executed.'));
      flaggedKeys.add(t.issueKey);
      continue;
    }

    // Resolved guard scopes ONLY incomplete/stale (avoids false positives on deliberate waivers).
    if (t.status === 'resolved') continue;

    const incomplete = t.events.find((e) => e.signals.roomIdentifiable === false || e.facts.missingApproval);
    if (incomplete) {
      const reason = incomplete.facts.missingApproval
        ? 'Action blocked: no photos / no manager approval on record.'
        : 'Action blocked: room could not be identified.';
      items.push(flagItem(t, 'incomplete', reason));
      flaggedKeys.add(t.issueKey);
      continue;
    }

    if (daysBetween(t.events[0].shiftDate, targetShiftDate) >= 2) {
      items.push(flagItem(t, 'stale', `No follow-up since ${t.events[0].shiftDate} — verify.`));
      flaggedKeys.add(t.issueKey);
    }
  }

  return { items, flaggedKeys };
}

function flagItem(t: Thread, flagType: HandoverItem['flagType'], reason: string): HandoverItem {
  return {
    issueKey: t.issueKey,
    title: titleOf(t),
    status: t.status,
    classification: t.classification,
    sourceIds: t.events.map((e) => e.id),
    flagType,
    reason,
    thread: t.events,
  };
}
