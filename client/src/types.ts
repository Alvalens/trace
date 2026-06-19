// Mirrors the server's handover response (trimmed to what the UI renders).
// Server source of truth: server/src/core/types.ts

export type Status = 'open' | 'resolved' | 'pending'
export type FlagType = 'contradiction' | 'incomplete' | 'stale' | 'anomalous'
export type BucketName = 'critical' | 'pending' | 'info' | 'flags'

export interface HandoverItem {
  issueKey: string
  title: string
  status: Status
  classification: string
  sourceIds: string[]
  flagType?: FlagType
  reason?: string
}

export interface Handover {
  hotel: string
  date: string
  shift: string
  buckets: Record<BucketName, HandoverItem[]>
  meta: { proseNightIngested: boolean; eventsConsidered: number }
  narrative: string | null
}

export interface IngestTraceEntry {
  line?: number
  excerpt?: string
  confidence?: string
  quoteVerified: boolean
}

export interface IngestResult {
  events: unknown[]
  trace: IngestTraceEntry[]
}
