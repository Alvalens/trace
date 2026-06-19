// Startup loader: read the committed structured events, normalize them (no LLM),
// and seed the in-memory store. Prose nights arrive later via POST /ingest.

import fs from 'node:fs';
import path from 'node:path';
import type { RawStructuredEvent } from '../core/types.js';
import { normalizeStructured } from '../core/normalize.js';
import { setEvents } from './store.js';
import { log } from '../http/logging.js';

interface EventsFile {
  hotel: { id: string; name: string };
  events: RawStructuredEvent[];
}

const DATA_PATH = process.env.DATA_PATH ?? path.resolve(process.cwd(), '../data/events.json');

/** Load + normalize structured events into the store. Returns the hotel id. */
export function loadStructuredEvents(): string {
  const file = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8')) as EventsFile;
  const hotelId = file.hotel.id;
  const normalized = file.events.map((e) => normalizeStructured(e, hotelId));
  setEvents(hotelId, normalized);
  log('info', 'structured.loaded', { hotel: hotelId, count: normalized.length, path: DATA_PATH });
  return hotelId;
}
