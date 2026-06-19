import { describe, it, expect } from 'vitest';
import { detectFlags } from '../src/core/flags.js';
import { reconcileThreads } from '../src/core/reconcile.js';
import { ev } from './factory.js';

const T = '2026-05-30';

describe('detectFlags', () => {
  it('contradiction: same room in-house vs observed empty', () => {
    const threads = reconcileThreads([
      ev({ id: 'in', room: '205', category: 'arrival', status: 'resolved', shiftDate: '2026-05-27', facts: { occupancy: 'in_house' } }),
      ev({ id: 'empty', room: '205', category: 'note', status: 'open', shiftDate: '2026-05-28', facts: { occupancy: 'empty' } }),
    ], T);
    const { items, flaggedKeys } = detectFlags(threads, T);
    const c = items.find((i) => i.flagType === 'contradiction');
    expect(c?.sourceIds.sort()).toEqual(['empty', 'in']);
    expect(flaggedKeys.has('205:arrival')).toBe(true); // involved threads suppressed
    expect(flaggedKeys.has('205:note')).toBe(true);
  });

  it('anomalous: meta-instruction surfaced, not executed', () => {
    const threads = reconcileThreads([ev({ id: 'x', room: '214', category: 'note', status: 'pending', signals: { containsMetaInstruction: true } })], T);
    const { items } = detectFlags(threads, T);
    expect(items[0].flagType).toBe('anomalous');
  });

  it('incomplete: open item with unidentifiable room or missing approval', () => {
    const threads = reconcileThreads([ev({ id: 'w', room: null, category: 'complaint', status: 'open', signals: { roomIdentifiable: false } })], T);
    expect(detectFlags(threads, T).items[0].flagType).toBe('incomplete');
  });

  it('stale: open thread with no update for >= 2 shifts', () => {
    const threads = reconcileThreads([ev({ id: 's', room: '208', category: 'note', status: 'open', shiftDate: '2026-05-28' })], T);
    expect(detectFlags(threads, T).items[0].flagType).toBe('stale');
  });

  it('does NOT flag a deliberately resolved waiver', () => {
    const threads = reconcileThreads([ev({ id: 'ok', room: '230', category: 'finance', status: 'resolved', shiftDate: T })], T);
    expect(detectFlags(threads, T).items).toHaveLength(0);
  });
});
