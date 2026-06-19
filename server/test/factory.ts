import type { NormalizedEvent } from '../src/core/types.js';

export function ev(p: Partial<NormalizedEvent> & { id: string }): NormalizedEvent {
  return {
    id: p.id, hotelId: p.hotelId ?? 'h',
    timestamp: p.timestamp ?? `2026-05-30T01:00:00+08:00`,
    shiftDate: p.shiftDate ?? '2026-05-30', source: p.source ?? 'structured',
    room: p.room ?? null, category: p.category ?? 'note', rawType: p.rawType,
    status: p.status ?? 'open', facts: p.facts ?? {}, signals: p.signals ?? {},
    description: p.description ?? 'desc', sourceRef: p.sourceRef ?? { eventId: p.id },
  };
}
