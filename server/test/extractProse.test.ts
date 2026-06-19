import { describe, it, expect } from 'vitest';
import { extractProse } from '../src/ingest/extractProse.js';
import type { LlmClient } from '../src/ingest/extractProse.js';

const input = 'Room 112 aircon: compressor needs ordering, stays out of order.\n205 looks empty, bed not slept in.';

const goodClient: LlmClient = {
  extract: async () => [
    { room: '112', category: 'maintenance', status: 'open', shiftDate: '2026-05-28',
      description: 'Aircon compressor must be ordered; room stays out of order.',
      excerpt: 'compressor needs ordering', confidence: 'high',
      roomIdentifiable: true, timeCritical: false, safetyRelevant: false, containsMetaInstruction: false },
    { room: '205', category: 'note', status: 'open', shiftDate: '2026-05-28',
      description: 'Room appears empty; bed not slept in.', occupancyObserved: 'empty',
      excerpt: 'bed not slept in', confidence: 'high',
      roomIdentifiable: true, timeCritical: false, safetyRelevant: false, containsMetaInstruction: false },
  ],
};

describe('extractProse', () => {
  it('maps verified events into normalized shape', async () => {
    const { events, trace } = await extractProse(input, 'lumen-sg', goodClient);
    expect(events).toHaveLength(2);
    expect(events[0].source).toBe('prose');
    expect(events[1].facts.occupancy).toBe('empty');
    expect(trace.every((t) => t.quoteVerified)).toBe(true);
  });

  it('drops an event whose excerpt is not in the source (anti-hallucination)', async () => {
    const liar: LlmClient = { extract: async () => [
      { room: '999', category: 'note', status: 'open', shiftDate: '2026-05-28',
        description: 'fabricated', excerpt: 'this text is not in the source', confidence: 'low',
        roomIdentifiable: true, timeCritical: false, safetyRelevant: false, containsMetaInstruction: false },
    ] };
    const { events, trace } = await extractProse(input, 'lumen-sg', liar);
    expect(events).toHaveLength(0);
    expect(trace[0].quoteVerified).toBe(false);
  });
});
