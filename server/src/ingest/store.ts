// In-memory, per-hotel event store. The ONE sanctioned stateful seam
// (single-instance demo; production would persist to GCS/DB — see plan.md §10).

import type { NormalizedEvent } from '../core/types.js';

const byHotel = new Map<string, NormalizedEvent[]>();

export function setEvents(hotelId: string, events: NormalizedEvent[]): void {
  byHotel.set(hotelId, events);
}

export function addEvents(hotelId: string, events: NormalizedEvent[]): void {
  const current = byHotel.get(hotelId) ?? [];
  byHotel.set(hotelId, [...current, ...events]);
}

export function getEvents(hotelId: string): NormalizedEvent[] {
  return byHotel.get(hotelId) ?? [];
}

export function hasHotel(hotelId: string): boolean {
  return byHotel.has(hotelId);
}

/** True once a prose night has been ingested for this hotel. */
export function hasProse(hotelId: string): boolean {
  return (byHotel.get(hotelId) ?? []).some((e) => e.source === 'prose');
}
