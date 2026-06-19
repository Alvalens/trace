import { useState } from 'react'
import { IngestForm } from '@/components/IngestForm'
import { HandoverView } from '@/components/HandoverView'
import { Separator } from '@/components/ui/separator'

const HOTEL = 'lumen-sg'

export default function App() {
  const [date, setDate] = useState('2026-05-30')
  const [refreshKey, setRefreshKey] = useState(0)

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Night-Shift Handover</h1>
        <p className="text-muted-foreground text-sm">Hotel: {HOTEL}</p>
      </header>

      <div className="flex items-center gap-2">
        <label htmlFor="date" className="text-sm font-medium">
          Morning
        </label>
        <input
          id="date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-md border px-2 py-1 text-sm"
        />
      </div>

      <HandoverView hotel={HOTEL} date={date} refreshKey={refreshKey} />
      <Separator />
      <IngestForm hotel={HOTEL} onIngested={() => setRefreshKey((k) => k + 1)} />
    </div>
  )
}
