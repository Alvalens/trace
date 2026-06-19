// Deterministic normalization of structured events (NO LLM).
// Maps raw type -> canonical category, resolves room from field-or-text,
// normalizes status, assigns the shift. See .claude/rules/grounding-and-ai.md.

import type { NormalizedEvent, RawStructuredEvent, Status } from './types.js';
import { shiftDateFor } from './shifts.js';

/** raw `type` (open vocabulary) -> small canonical category set. Extend as needed; 'other' is the fallback. */
export const CATEGORY_BY_TYPE: Record<string, string> = {
  check_in: 'arrival',
  walk_in: 'arrival',
  maintenance: 'maintenance',
  facilities: 'facilities',
  compliance: 'compliance',
  complaint: 'complaint',
  lost_keycard: 'keycard',
  check_in_issue: 'verification',
  deposit_issue: 'deposit',
  finance_note: 'finance',
  no_show: 'no_show',
  incident: 'incident',
  early_checkout_request: 'checkout',
  note: 'note',
  guest_message: 'note',
  damage_report: 'damage',
};

const STATUS_BY_RAW: Record<string, Status> = {
  resolved: 'resolved',
  unresolved: 'open',
  pending: 'pending',
};

export function categoryFor(rawType: string): string {
  return CATEGORY_BY_TYPE[rawType] ?? 'other';
}

/** Use the structured room field; fall back to the first 3-digit room-like token in the text. */
export function resolveRoom(room: string | null, description: string): string | null {
  if (room) return room;
  const m = /\b(\d{3})\b/.exec(description);
  return m ? m[1] : null;
}

export function issueKey(room: string | null, category: string): string {
  return `${room ?? 'area'}:${category}`;
}

/**
 * Normalize one structured event. Pure, deterministic.
 * TODO(build): derive `facts` (e.g. inHouse, depositCollected) + rule-derivable `signals`
 * needed for contradiction detection and bucketing.
 */
export function normalizeStructured(raw: RawStructuredEvent, hotelId: string): NormalizedEvent {
  const category = categoryFor(raw.type);
  const room = resolveRoom(raw.room, raw.description);
  return {
    id: raw.id,
    hotelId,
    timestamp: raw.timestamp,
    shiftDate: shiftDateFor(raw.timestamp),
    source: 'structured',
    room,
    category,
    rawType: raw.type,
    status: STATUS_BY_RAW[raw.status] ?? 'open',
    facts: {},
    signals: {},
    description: raw.description,
    sourceRef: { eventId: raw.id },
  };
}
