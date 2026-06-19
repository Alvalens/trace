import { describe, it, expect } from 'vitest';
import { buildHandover } from '../src/core/handover.js';
import { ev } from './factory.js';

describe('buildHandover', () => {
  const opts = { hotel: 'h', date: '2026-05-30', proseNightIngested: true };

  it('routes open + time-critical to critical, resolved to info, flags to flags', () => {
    const h = buildHandover([
      ev({ id: 'crit', room: '309', category: 'deposit', status: 'open', shiftDate: '2026-05-30', signals: { timeCritical: true } }),
      ev({ id: 'done', room: '215', category: 'facilities', status: 'resolved', shiftDate: '2026-05-29' }),
      ev({ id: 'inj', room: '214', category: 'note', status: 'pending', shiftDate: '2026-05-30', signals: { containsMetaInstruction: true } }),
    ], opts);
    expect(h.buckets.critical.map((i) => i.issueKey)).toContain('309:deposit');
    expect(h.buckets.info.map((i) => i.issueKey)).toContain('215:facilities');
    expect(h.buckets.flags.some((i) => i.flagType === 'anomalous')).toBe(true);
  });

  it('a flagged item does not also appear in another bucket', () => {
    const h = buildHandover([ev({ id: 'inj', room: '214', category: 'note', status: 'open', shiftDate: '2026-05-30', signals: { containsMetaInstruction: true } })], opts);
    expect(h.buckets.critical).toHaveLength(0);
    expect(h.buckets.pending).toHaveLength(0);
    expect(h.buckets.flags).toHaveLength(1);
  });

  it('defaults date to the latest shift and reports meta', () => {
    const h = buildHandover([ev({ id: 'a', shiftDate: '2026-05-26' }), ev({ id: 'b', shiftDate: '2026-05-30' })], { hotel: 'h', proseNightIngested: false });
    expect(h.date).toBe('2026-05-30');
    expect(h.meta.eventsConsidered).toBe(2);
    expect(h.meta.proseNightIngested).toBe(false);
  });
});
