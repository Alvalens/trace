// Typed API layer (axios). The only place that knows endpoint URLs.
import axios from 'axios'
import type { Handover, IngestResult } from '@/types'

const http = axios.create({ baseURL: '/', timeout: 30000 })

/** Max prose length accepted by POST /ingest — mirrors the server's MAX_PROSE_CHARS. */
export const MAX_PROSE_CHARS = 50_000

/** Extract a human-readable message from an axios error. */
export function apiError(e: unknown): string {
  if (axios.isAxiosError(e)) {
    return (e.response?.data as { error?: string } | undefined)?.error ?? e.message
  }
  return e instanceof Error ? e.message : String(e)
}

export async function getHandover(hotel: string, date?: string): Promise<Handover> {
  const { data } = await http.get<Handover>(`/handover/${encodeURIComponent(hotel)}`, {
    params: date ? { date } : undefined,
  })
  return data
}

export async function ingestProse(hotel: string, text: string): Promise<IngestResult> {
  const { data } = await http.post<IngestResult>(`/ingest/${encodeURIComponent(hotel)}`, { text })
  return data
}
