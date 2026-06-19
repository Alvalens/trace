// One-time prose extraction (the ONLY decision-irrelevant LLM step besides the
// optional narrative). Gemini translates to English + structures into normalized
// events; each carries a verbatim original-language excerpt that we quote-verify.
// See .claude/rules/grounding-and-ai.md.

import type { NormalizedEvent } from '../core/types.js';

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

/**
 * Extract prose -> normalized events. Pure orchestration around the LLM seam:
 * call client -> validate schema -> quote-verify (drop/flag failures) -> map.
 *
 * TODO(build): build the responseSchema prompt, validate output, run quoteVerify,
 * assign shiftDate + issueKey, and emit the trace.
 */
export async function extractProse(
  _input: string,
  _hotelId: string,
  _client: LlmClient,
): Promise<ExtractionResult> {
  throw new Error('extractProse not implemented');
}
