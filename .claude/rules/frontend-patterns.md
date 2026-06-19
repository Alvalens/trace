# Frontend Patterns (React + Tailwind + shadcn/ui)

The UI is a **viewer**, not the product. Keep it minimal but clean and readable — shadcn gives us
decent-looking components fast without a design budget. JSON from the API is the source of truth; the
UI only renders it.

## Stack & setup

- **Vite + React + TypeScript.** Function components + hooks only. No Redux/MobX/router unless a real
  need appears (it won't for one page).
- **Tailwind** utility-first for layout/spacing. No custom CSS files beyond the Tailwind entry.
- **shadcn/ui** for components. Setup once:
  ```bash
  cd client
  npx shadcn@latest init        # choose TS, Tailwind, path alias @/*
  npx shadcn@latest add card badge button textarea separator alert
  ```
  Components land in `client/src/components/ui/` and are owned/editable code (not a dep). Compose them;
  don't wrap them in needless abstractions.

## Structure

```
client/src/
  components/ui/      shadcn primitives (generated)
  components/         app components: HandoverView, BucketSection, ItemCard, IngestForm, FlagCard
  lib/api.ts         typed fetch helpers (one place that knows endpoint URLs + response types)
  App.tsx            composition: IngestForm + HandoverView
  main.tsx
```

- Mirror the server's response types in `lib/api.ts` (copy the `core` types or a trimmed view). One
  typed `getHandover(hotel, date)` and `ingest(hotel, text)` — components never build URLs inline.

## Patterns

- **Data fetching:** a small `useHandover(hotel, date)` hook wrapping `fetch` with `loading | error |
  data` state. No data-fetching library needed for two endpoints.
- **Rendering the handover:** map buckets in priority order — Critical → Pending → Flags → Info. Each
  bucket is a `BucketSection`; each item an `ItemCard` showing title, status `Badge`, and its
  **source ids** (always visible — grounding is the point). Flags use an `Alert`/`FlagCard` with the
  `reason` text.
- **Visual hierarchy = the 60-second read.** Critical first, color-coded badges
  (critical=red, pending=amber, flag=amber-outline, info=muted). Don't bury the action items.
- **IngestForm:** a `Textarea` to paste the prose night + a `Button` → `POST /ingest/:hotel`, then show
  the extraction result/trace. This is the live-ingestion demo surface.

## Discipline

- Keep components small and presentational; no business logic in the client (classification already
  happened server-side — never re-decide buckets in React).
- Accessibility basics: semantic headings per bucket, `aria` where shadcn doesn't cover it, sufficient
  contrast.
- Don't over-build. If short on time, a single page that renders the JSON cleanly beats a polished
  multi-view app. The `<pre>` fallback is acceptable under the cut line (see `plan.md` §12).
