// One-time prose extraction (the ONLY decision-irrelevant LLM step besides the
// optional narrative). Gemini translates to English + structures into normalized
// events; each carries a verbatim original-language excerpt that we quote-verify.
// See .claude/rules/grounding-and-ai.md.

import type { Facts, NormalizedEvent, ReviewItem, Signals, Status } from '../core/types.js';
import { CANONICAL_CATEGORIES } from '../core/normalize.js';

/** Minimal LLM seam so the extractor is mockable in tests (clean-code rules). */
export interface LlmClient {
  /** Return the model's structured JSON output for the given prose input. */
  extract(input: string): Promise<unknown>;
}

export interface ExtractionTraceEntry {
  line?: number;
  excerpt?: string;
  confidence?: string;
  quoteVerified: boolean;
}

export interface ExtractionResult {
  events: NormalizedEvent[];
  /** Extractions that failed quote-verification — surfaced as flags, never silently dropped. */
  review: ReviewItem[];
  trace: ExtractionTraceEntry[];
}

/**
 * Quote-verifier: an extracted excerpt must be a literal substring of the source.
 * Language-agnostic (substring match). This — not self-reported confidence — is
 * the anti-hallucination guarantee.
 */
export function quoteVerify(excerpt: string | undefined, source: string): boolean {
  if (!excerpt) return false;
  return source.includes(excerpt);
}

interface RawExtracted {
  room: string | null;
  category: string;
  status: Status;
  description: string;
  excerpt: string;
  excerptEn?: string;
  confidence?: 'high' | 'medium' | 'low';
  occupancyObserved?: 'in_house' | 'empty';
  line?: number;
  roomIdentifiable?: boolean;
  timeCritical?: boolean;
  safetyRelevant?: boolean;
  containsMetaInstruction?: boolean;
}

interface ModelOutput {
  shiftDate?: string;
  events: RawExtracted[];
}

function isModelOutput(v: unknown): v is ModelOutput {
  return (
    typeof v === 'object' &&
    v !== null &&
    'events' in v &&
    Array.isArray((v as { events: unknown }).events)
  );
}

const CANONICAL_SET: ReadonlySet<string> = new Set<string>(CANONICAL_CATEGORIES);

export async function extractProse(
  input: string,
  hotelId: string,
  client: LlmClient,
  overrideDate?: string,
): Promise<ExtractionResult> {
  const extracted = await client.extract(input);

  if (!isModelOutput(extracted)) {
    return { events: [], review: [], trace: [] };
  }

  const parsed: ModelOutput = extracted;
  const pickDate = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');
  const shiftDate = pickDate(overrideDate) || pickDate(parsed.shiftDate);
  if (!shiftDate) {
    throw new Error('could not resolve prose shift date');
  }

  const raw: RawExtracted[] = parsed.events;
  const events: NormalizedEvent[] = [];
  const review: ReviewItem[] = [];
  const trace: ExtractionTraceEntry[] = [];
  let n = 0;

  for (const r of raw) {
    const verified = quoteVerify(r.excerpt, input);
    trace.push({ line: r.line, excerpt: r.excerpt, confidence: r.confidence, quoteVerified: verified });
    if (!verified) {
      // Anti-hallucination: the excerpt is not a literal substring of the source, so we will
      // NOT assert this as a fact. But we never silently lose it — surface it for human review,
      // preserving the model's time/safety signals so a critical line can't disappear unnoticed.
      review.push({
        room: r.room,
        line: r.line,
        excerpt: r.excerpt,
        timeCritical: r.timeCritical ?? false,
        safetyRelevant: r.safetyRelevant ?? false,
      });
      continue;
    }

    const facts: Facts = {};
    if (r.occupancyObserved) facts.occupancy = r.occupancyObserved;
    const signals: Signals = {
      roomIdentifiable: r.roomIdentifiable ?? r.room !== null,
      timeCritical: r.timeCritical ?? false,
      safetyRelevant: r.safetyRelevant ?? false,
      containsMetaInstruction: r.containsMetaInstruction ?? false,
    };

    // Defensively coerce any non-canonical category to 'other'
    const category = CANONICAL_SET.has(r.category) ? r.category : 'other';

    events.push({
      id: `ext_${String(++n).padStart(4, '0')}`,
      hotelId,
      timestamp: `${shiftDate}T00:00:00+08:00`, // single shift date applied to all events
      shiftDate,
      source: 'prose',
      room: r.room,
      category,
      status: r.status,
      facts,
      signals,
      description: r.description,
      sourceRef: { line: r.line, excerpt: r.excerpt, excerptEn: r.excerptEn, confidence: r.confidence },
    });
  }
  return { events, review, trace };
}
