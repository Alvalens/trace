import { useEffect, useState } from 'react'
import { getHandover, apiError } from '@/lib/api'
import type { Handover, BucketName } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Flame, Clock, TriangleAlert, Info, type LucideIcon } from 'lucide-react'

const BUCKETS: { key: BucketName; label: string; Icon: LucideIcon }[] = [
  { key: 'critical', label: 'Critical', Icon: Flame },
  { key: 'pending', label: 'Pending', Icon: Clock },
  { key: 'flags', label: 'Flags', Icon: TriangleAlert },
  { key: 'info', label: 'Info', Icon: Info },
]

export function HandoverView({
  hotel,
  date,
  refreshKey,
}: {
  hotel: string
  date: string
  refreshKey: number
}) {
  const [data, setData] = useState<Handover | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    getHandover(hotel, date || undefined)
      .then((h) => !cancelled && setData(h))
      .catch((e) => !cancelled && setError(apiError(e)))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [hotel, date, refreshKey])

  if (loading) return <p className="text-muted-foreground text-sm">Loading handover…</p>
  if (error)
    return (
      <Alert>
        <AlertTitle>Handover unavailable</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  if (!data) return null

  return (
    <div className="space-y-4">
      {!data.meta.proseNightIngested && (
        <Alert>
          <AlertTitle>Prose night not ingested</AlertTitle>
          <AlertDescription>Paste the free-text night below to complete this handover.</AlertDescription>
        </Alert>
      )}
      {BUCKETS.map(({ key, label, Icon }) => {
        const items = data.buckets[key] ?? []
        return (
          <Card key={key}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Icon className="size-4" />
                {label} ({items.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {items.length === 0 && <p className="text-muted-foreground text-sm">None.</p>}
              {items.map((item) => (
                <div key={item.issueKey} className="rounded-md border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{item.title}</span>
                    <div className="flex gap-2">
                      <Badge variant="outline">{item.status}</Badge>
                      <Badge variant="secondary">{item.classification.replace('_', ' ')}</Badge>
                    </div>
                  </div>
                  {item.reason && (
                    <p className="text-muted-foreground mt-1 text-sm">{item.reason}</p>
                  )}
                  <p className="text-muted-foreground mt-1 text-xs">
                    src: {item.sourceIds.join(', ')}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
