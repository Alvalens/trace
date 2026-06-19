// Shared data shapes. Single source of truth for the whole service.
// See ../../../.claude/rules/grounding-and-ai.md and plan.md §4.

export type Source = 'structured' | 'prose';
export type Status = 'open' | 'resolved' | 'pending';
export type FlagType = 'contradiction' | 'incomplete' | 'stale' | 'anomalous';
export type BucketName = 'critical' | 'pending' | 'info' | 'flags';
export type Classification =
  | 'new_tonight'
  | 'still_open'
  | 'newly_resolved'
  | 'resolved_earlier';

/** Raw structured event as it appears in data/events.json. All 7 keys always present. */
export interface RawStructuredEvent {
  id: string;
  timestamp: string; // ISO8601 with +08:00 offset
  type: string; // open vocabulary, ~16 values
  room: string | null;
  guest: string | null;
  description: string;
  status: string; // resolved | unresolved | pending
}

/** Normalized facts used for deterministic contradiction detection. */
export interface Facts {
  occupancy?: 'in_house' | 'empty';
  missingApproval?: boolean;
}

/** Model OBSERVATIONS extracted from text. Code maps these to flags/buckets — never the model. */
export interface Signals {
  roomIdentifiable?: boolean;
  timeCritical?: boolean;
  safetyRelevant?: boolean;
  containsMetaInstruction?: boolean;
}

/** Grounding anchor for a normalized event. */
export interface SourceRef {
  eventId?: string; // structured source
  line?: number; // prose source line
  excerpt?: string; // VERBATIM original-language substring — what quote-verify checks
  excerptEn?: string; // optional English gloss for display only — never verified
  confidence?: 'high' | 'medium' | 'low';
}

/** The one normalized shape both sources produce. */
export interface NormalizedEvent {
  id: string;
  hotelId: string;
  timestamp: string;
  shiftDate: string; // YYYY-MM-DD, morning of the shift this belongs to
  source: Source;
  room: string | null; // resolved from field-or-text
  rooms?: string[]; // multi-room/area events (e.g. compliance backlog)
  category: string; // canonical category, 'other' fallback
  rawType?: string; // original structured type
  status: Status;
  facts: Facts;
  signals: Signals;
  description: string; // English (translated at extraction), never invented
  sourceRef: SourceRef;
}

/** A reconciled issue across nights: one issue-key, full history. */
export interface Thread {
  issueKey: string;
  room: string | null;
  category: string;
  status: Status; // current = newest event's status
  classification: Classification;
  events: NormalizedEvent[]; // newest first
}

/** One line in the handover. Always carries source ids. */
export interface HandoverItem {
  issueKey: string;
  title: string;
  status: Status;
  classification: Classification;
  sourceIds: string[];
  flagType?: FlagType;
  reason?: string;
  thread: NormalizedEvent[]; // newest first
}

export interface Handover {
  hotel: string;
  date: string; // target morning
  shift: string; // human label of the most recent shift on/before date
  buckets: Record<BucketName, HandoverItem[]>;
  meta: { proseNightIngested: boolean; eventsConsidered: number };
  narrative: string | null; // optional cosmetic prose (stretch); null otherwise
}
