import { describe, it, expect } from 'vitest';
import { reconcileThreads } from '../src/core/reconcile.js';
import { ev } from './factory.js';

describe('reconcileThreads', () => {
  it('groups same room+category into one thread, newest first', () => {
    const threads = reconcileThreads([
      ev({ id: 'old', room: '309', category: 'deposit', status: 'open', timestamp: '2026-05-27T00:15:00+08:00', shiftDate: '2026-05-27' }),
      ev({ id: 'new', room: '309', category: 'deposit', status: 'open', timestamp: '2026-05-30T00:45:00+08:00', shiftDate: '2026-05-30' }),
    ], '2026-05-30');
    expect(threads).toHaveLength(1);
    expect(threads[0].events[0].id).toBe('new');
    expect(threads[0].status).toBe('open');
  });

  it('classifies a thread resolved on the target shift as newly_resolved', () => {
    const t = reconcileThreads([
      ev({ id: 'o', room: '215', category: 'facilities', status: 'open', timestamp: '2026-05-27T01:40:00+08:00', shiftDate: '2026-05-27' }),
      ev({ id: 'r', room: '215', category: 'facilities', status: 'resolved', timestamp: '2026-05-29T00:10:00+08:00', shiftDate: '2026-05-29' }),
    ], '2026-05-29');
    expect(t[0].classification).toBe('newly_resolved');
  });

  it('classifies open issues carried from before as still_open, and same-night as new_tonight', () => {
    const carried = reconcileThreads([ev({ id: 'c', room: '112', category: 'maintenance', status: 'open', shiftDate: '2026-05-26' })], '2026-05-30');
    expect(carried[0].classification).toBe('still_open');
    const fresh = reconcileThreads([ev({ id: 'f', room: '108', category: 'arrival', status: 'open', shiftDate: '2026-05-30' })], '2026-05-30');
    expect(fresh[0].classification).toBe('new_tonight');
  });
});
