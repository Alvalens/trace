import { useState } from 'react'
import { ingestProse, apiError } from '@/lib/api'
import type { IngestResult } from '@/types'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

export function IngestForm({ hotel, onIngested }: { hotel: string; onIngested: () => void }) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<IngestResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    setBusy(true)
    setError(null)
    setResult(null)
    try {
      const r = await ingestProse(hotel, text)
      setResult(r)
      onIngested()
    } catch (e) {
      setError(apiError(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Ingest prose night</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste the free-text night log (markdown, any language)…"
          className="min-h-40 font-mono text-sm"
        />
        <Button onClick={submit} disabled={busy || !text.trim()}>
          {busy ? 'Extracting…' : 'Extract & ingest'}
        </Button>
        {error && (
          <Alert variant="destructive">
            <AlertTitle>Ingestion failed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {result && (
          <pre className="bg-muted overflow-auto rounded-md p-3 text-xs">
            {JSON.stringify(result.trace, null, 2)}
          </pre>
        )}
      </CardContent>
    </Card>
  )
}
