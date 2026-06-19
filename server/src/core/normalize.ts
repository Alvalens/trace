// Deterministic normalization of structured events (NO LLM).
// Maps raw type -> canonical category, resolves room from field-or-text,
// normalizes status, assigns the shift. See .claude/rules/grounding-and-ai.md.

import type { Facts, NormalizedEvent, RawStructuredEvent, Signals, Status } from './types.js';
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

const SAFETY_RE = /\b(safe|passport|ambulance|fire|flood|injur|unwell|medical|locked in)\b/i;
const TIME_CRITICAL_RE = /\b(deadline|\d+\s*hours?|before checkout|checks? out tomorrow|flight|asap|urgent|first thing)\b/i;
const META_RE = /\b(system note to the|ignore (all|other|previous)|report .* all clear|mark .* approved|disregard|goodwill credit)\b/i;
const MISSING_APPROVAL_RE = /\b(no (manager )?approval|no photos?|without approval)\b/i;

/**
 * Categories that are inherently area/hotel-level: a null room is expected and
 * does NOT mean the item is "blocked by missing room." Incomplete-flag skips these.
 */
const AREA_LEVEL_CATEGORIES = new Set(['compliance', 'facilities', 'finance', 'note', 'no_show']);

function deriveSignals(description: string, room: string | null, category: string): Signals {
  // roomIdentifiable: true when (a) a specific room is known, OR
  // (b) the category is area-level (no specific room is required to act).
  const roomIdentifiable = room !== null || AREA_LEVEL_CATEGORIES.has(category);
  return {
    roomIdentifiable,
    timeCritical: TIME_CRITICAL_RE.test(description),
    safetyRelevant: SAFETY_RE.test(description),
    containsMetaInstruction: META_RE.test(description),
  };
}

function deriveFacts(rawType: string, description: string): Facts {
  const facts: Facts = {};
  if (rawType === 'check_in') facts.occupancy = 'in_house';
  if (MISSING_APPROVAL_RE.test(description)) facts.missingApproval = true;
  return facts;
}

/**
 * Normalize one structured event. Pure, deterministic.
 * Derives `facts` (e.g. inHouse) + rule-derivable `signals`
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
    facts: deriveFacts(raw.type, raw.description),
    signals: deriveSignals(raw.description, room, category),
    description: raw.description,
    sourceRef: { eventId: raw.id },
  };
}
