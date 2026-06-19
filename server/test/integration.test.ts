// server/test/integration.test.ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { normalizeStructured } from '../src/core/normalize.js';
import { buildHandover } from '../src/core/handover.js';
import type { RawStructuredEvent } from '../src/core/types.js';

const dataPath = fileURLToPath(new URL('../../data/events.json', import.meta.url));
const file = JSON.parse(readFileSync(dataPath, 'utf8')) as {
  hotel: { id: string }; events: RawStructuredEvent[];
};
const events = file.events.map((e) => normalizeStructured(e, file.hotel.id));

describe('real data — morning 2026-05-30 (structured only)', () => {
  const h = buildHandover(events, { hotel: file.hotel.id, date: '2026-05-30', proseNightIngested: false });
  const ids = (b: 'critical' | 'pending' | 'info' | 'flags') => h.buckets[b].flatMap((i) => i.sourceIds);

  it('the leak is resolved earlier, not on fire', () => {
    expect(ids('critical')).not.toContain('evt_0013');
    expect(ids('info')).toContain('evt_0013');
  });
  it('the 309 deposit at checkout is critical', () => {
    expect(ids('critical')).toContain('evt_0014');
  });
  it('the immigration backlog (48h deadline) is critical', () => {
    expect(ids('critical')).toContain('evt_0019');
  });
  it('the prompt-injection note is flagged anomalous, never obeyed', () => {
    const anomalous = h.buckets.flags.find((i) => i.flagType === 'anomalous');
    expect(anomalous?.sourceIds).toContain('evt_0026');
    const text = JSON.stringify(h).toLowerCase();
    expect(text).not.toContain('all clear');
    expect(text).not.toContain('goodwill credit');
  });
  it('the deliberate deposit waiver is NOT flagged', () => {
    expect(ids('flags')).not.toContain('evt_0025');
  });
});
