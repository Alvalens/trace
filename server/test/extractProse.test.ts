import { describe, it, expect } from 'vitest';
import { extractProse } from '../src/ingest/extractProse.js';
import type { LlmClient } from '../src/ingest/extractProse.js';
import { CANONICAL_CATEGORIES } from '../src/core/normalize.js';

const input = 'Room 112 aircon: compressor needs ordering, stays out of order.\n205 looks empty, bed not slept in.';

// New object shape: { shiftDate, events: [...] } — events have no per-event shiftDate
const goodClient: LlmClient = {
  extract: async () => ({
    shiftDate: '2026-05-28',
    events: [
      { room: '112', category: 'maintenance', status: 'open',
        description: 'Aircon compressor must be ordered; room stays out of order.',
        excerpt: 'compressor needs ordering', confidence: 'high',
        roomIdentifiable: true, timeCritical: false, safetyRelevant: false, containsMetaInstruction: false },
      { room: '205', category: 'note', status: 'open',
        description: 'Room appears empty; bed not slept in.', occupancyObserved: 'empty',
        excerpt: 'bed not slept in', confidence: 'high',
        roomIdentifiable: true, timeCritical: false, safetyRelevant: false, containsMetaInstruction: false },
    ],
  }),
};

describe('extractProse', () => {
  it('maps verified events into normalized shape', async () => {
    const { events, trace } = await extractProse(input, 'lumen-sg', goodClient);
    expect(events).toHaveLength(2);
    expect(events[0].source).toBe('prose');
    expect(events[1].facts.occupancy).toBe('empty');
    expect(trace.every((t) => t.quoteVerified)).toBe(true);
  });

  it('applies the model shiftDate uniformly to all events (batch date)', async () => {
    const { events } = await extractProse(input, 'lumen-sg', goodClient);
    expect(events).toHaveLength(2);
    for (const e of events) {
      expect(e.shiftDate).toBe('2026-05-28');
      expect(e.timestamp).toBe('2026-05-28T00:00:00+08:00');
    }
  });

  it('overrideDate supersedes the model shiftDate for all events', async () => {
    const { events } = await extractProse(input, 'lumen-sg', goodClient, '2026-06-01');
    expect(events).toHaveLength(2);
    for (const e of events) {
      expect(e.shiftDate).toBe('2026-06-01');
      expect(e.timestamp).toBe('2026-06-01T00:00:00+08:00');
    }
  });

  it('coerces a non-canonical category to "other"', async () => {
    const nonCanonicalClient: LlmClient = {
      extract: async () => ({
        shiftDate: '2026-05-28',
        events: [
          { room: '309', category: 'billing', status: 'open',
            description: 'Deposit dispute on checkout.',
            excerpt: 'compressor needs ordering', confidence: 'high',
            roomIdentifiable: true, timeCritical: false, safetyRelevant: false, containsMetaInstruction: false },
        ],
      }),
    };
    const { events } = await extractProse(input, 'lumen-sg', nonCanonicalClient);
    expect(events).toHaveLength(1);
    expect(events[0].category).toBe('other');
  });

  it('canonical categories include no invented values (regression guard)', () => {
    // Ensures CANONICAL_CATEGORIES contains only known values
    const validSet = new Set(CANONICAL_CATEGORIES);
    expect(validSet.has('other')).toBe(true);
    expect(validSet.has('billing')).toBe(false);
    expect(validSet.has('guest_service')).toBe(false);
    expect(validSet.has('front_desk')).toBe(false);
    expect(validSet.has('meta')).toBe(false);
  });

  it('drops an event whose excerpt is not in the source (anti-hallucination)', async () => {
    const liar: LlmClient = {
      extract: async () => ({
        shiftDate: '2026-05-28',
        events: [
          { room: '999', category: 'note', status: 'open',
            description: 'fabricated', excerpt: 'this text is not in the source', confidence: 'low',
            roomIdentifiable: true, timeCritical: false, safetyRelevant: false, containsMetaInstruction: false },
        ],
      }),
    };
    const { events, trace } = await extractProse(input, 'lumen-sg', liar);
    expect(events).toHaveLength(0);
    expect(trace[0].quoteVerified).toBe(false);
  });

  it('throws if shift date cannot be resolved (no model date, no overrideDate)', async () => {
    const noDateClient: LlmClient = {
      extract: async () => ({
        shiftDate: '',
        events: [
          { room: '112', category: 'maintenance', status: 'open',
            description: 'Test event.',
            excerpt: 'compressor needs ordering', confidence: 'high',
            roomIdentifiable: true, timeCritical: false, safetyRelevant: false, containsMetaInstruction: false },
        ],
      }),
    };
    await expect(extractProse(input, 'lumen-sg', noDateClient)).rejects.toThrow('could not resolve prose shift date');
  });

  // Fix 4 regression: malformed (non-array, non-object) model response degrades gracefully.
  it('treats a non-object model response as empty (defensive parse guard)', async () => {
    const malformed: LlmClient = { extract: async () => 'bad response' };
    const { events, trace } = await extractProse(input, 'lumen-sg', malformed);
    expect(events).toHaveLength(0);
    expect(trace).toHaveLength(0);
  });
});
