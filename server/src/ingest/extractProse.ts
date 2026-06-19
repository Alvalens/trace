// One-time prose extraction (the ONLY decision-irrelevant LLM step besides the
// optional narrative). Gemini translates to English + structures into normalized
// events; each carries a verbatim original-language excerpt that we quote-verify.
// See .claude/rules/grounding-and-ai.md.

import type { Facts, NormalizedEvent, Signals, Status } from '../core/types.js';

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
  shiftDate: string;
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

export async function extractProse(
  input: string,
  hotelId: string,
  client: LlmClient,
): Promise<ExtractionResult> {
  const extracted = await client.extract(input);
  const raw: RawExtracted[] = Array.isArray(extracted) ? (extracted as RawExtracted[]) : [];
  const events: NormalizedEvent[] = [];
  const trace: ExtractionTraceEntry[] = [];
  let n = 0;

  for (const r of raw) {
    const verified = quoteVerify(r.excerpt, input);
    trace.push({ line: r.line, excerpt: r.excerpt, confidence: r.confidence, quoteVerified: verified });
    if (!verified) continue; // anti-hallucination: no excerpt match -> drop

    const facts: Facts = {};
    if (r.occupancyObserved) facts.occupancy = r.occupancyObserved;
    const signals: Signals = {
      roomIdentifiable: r.roomIdentifiable ?? r.room !== null,
      timeCritical: r.timeCritical ?? false,
      safetyRelevant: r.safetyRelevant ?? false,
      containsMetaInstruction: r.containsMetaInstruction ?? false,
    };

    events.push({
      id: `ext_${String(++n).padStart(4, '0')}`,
      hotelId,
      timestamp: `${r.shiftDate}T00:00:00+08:00`, // prose lacks precise times; date is enough for shift bucketing
      shiftDate: r.shiftDate,
      source: 'prose',
      room: r.room,
      category: r.category || 'other',
      status: r.status,
      facts,
      signals,
      description: r.description,
      sourceRef: { line: r.line, excerpt: r.excerpt, excerptEn: r.excerptEn, confidence: r.confidence },
    });
  }
  return { events, trace };
}
