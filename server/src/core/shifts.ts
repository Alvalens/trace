// Pure shift-window logic. A night shift runs 23:00–07:00 (hotel-local).
// Timestamps embed the hotel offset (+08:00), so the literal clock in the
// string IS hotel-local — read it directly, no timezone math needed.

/** Morning date (YYYY-MM-DD) of the shift a timestamp belongs to. */
export function shiftDateFor(timestamp: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2})/.exec(timestamp);
  if (!m) throw new Error(`Unparseable timestamp: ${timestamp}`);
  const [, y, mo, d, hh] = m;
  const hour = Number(hh);
  // 23:00–23:59 -> next morning. 00:00–22:59 -> same calendar date's morning.
  // (Daytime 07:00–22:59 shouldn't occur in night data; same-morning is a safe default.)
  if (hour >= 23) return addDays(`${y}-${mo}-${d}`, 1);
  return `${y}-${mo}-${d}`;
}

/** Add n days to a YYYY-MM-DD string (UTC math, month/year safe). */
export function addDays(date: string, n: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}

/** Whole-day difference to - from (both YYYY-MM-DD). */
export function daysBetween(from: string, to: string): number {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}
