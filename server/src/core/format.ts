import type { Thread } from './types.js';

export function shorten(s: string, max = 140): string {
  return s.length <= max ? s : `${s.slice(0, max - 1).trimEnd()}…`;
}

export function titleOf(t: Thread): string {
  const last = t.events[0];
  const where = last.room ? `Room ${last.room}` : last.category;
  return `${where}: ${shorten(last.description)}`;
}
