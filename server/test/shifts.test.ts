import { describe, it, expect } from 'vitest';
import { shiftDateFor, addDays } from '../src/core/shifts.js';

describe('shiftDateFor', () => {
  it('assigns 23:xx to the next morning (start of the night shift)', () => {
    expect(shiftDateFor('2026-05-25T23:14:00+08:00')).toBe('2026-05-26');
  });

  it('assigns 00:xx–06:xx to the same morning', () => {
    expect(shiftDateFor('2026-05-26T00:20:00+08:00')).toBe('2026-05-26');
    expect(shiftDateFor('2026-05-27T03:20:00+08:00')).toBe('2026-05-27');
  });

  it('handles month boundaries', () => {
    expect(shiftDateFor('2026-05-31T23:00:00+08:00')).toBe('2026-06-01');
  });
});

describe('addDays', () => {
  it('crosses month and year boundaries', () => {
    expect(addDays('2026-05-31', 1)).toBe('2026-06-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });
});
