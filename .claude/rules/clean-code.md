# Clean Code Rules

Standards for this repo. Bias: small, pure, obvious. We're judged on code an operator could trust, not
cleverness.

## TypeScript

- `strict: true`. No `any` — use `unknown` + narrowing at boundaries. No `// @ts-ignore`.
- Prefer `type` aliases for data shapes; one source of truth in `core/types.ts`.
- Make illegal states unrepresentable: discriminated unions over boolean flags
  (`status: 'open' | 'resolved' | 'pending'`, not `isOpen/isResolved`).
- Parse external input into typed shapes at the edge; the core only ever sees valid typed data.

## Functions & modules

- **Pure by default.** A `core/` function takes data and returns data — no I/O, no `Date.now()`, no
  globals, no framework imports. Pass "now"/target-date in as arguments.
- Single responsibility per function and per file. If a file does two things, split it.
- Soft size limits: functions ≤ ~40 lines, files ≤ ~200. Crossing them is a smell, not a crime —
  refactor when it hurts readability.
- Name by intent: `reconcileThreads`, `classifyAgainstShift`, `detectContradictionFlags`. No `data2`,
  `tmp`, `doStuff`.
- Compose small functions over one big procedure. Each step should be independently testable.

## Dependency direction

`core/` depends on nothing in the project. `ingest/` and `http/` depend on `core/`, never the reverse.
Gemini and Express stay at the edges so the graded logic is provider/framework-agnostic and testable.

## Immutability & data flow

- Treat inputs as read-only; return new objects rather than mutating arguments.
- Prefer `map`/`filter`/`reduce` over index mutation when it stays readable.
- No shared mutable module state except the explicit in-memory store in `ingest/store.ts`, which is the
  one sanctioned stateful seam (documented as such).

## Errors

- Validate at the boundary (route handlers, LLM output). Fail loud with a clear message; never swallow.
- Distinguish *expected* outcomes (missing field → a **flag** in the handover) from *bugs* (throw).
  A contradiction in the data is a feature output, not an error.
- LLM output is untrusted: schema-validate it, then run the quote-verifier (see grounding rules).

## Comments & docs

- Comment **why**, not what. The code says what. Note non-obvious domain rules
  (e.g. "shift = 23:00–07:00, so timestamp 01:00 belongs to the previous calendar day's shift").
- One short JSDoc line on each exported `core/` function: what it does, what it returns.

## Testing

- Unit-test every `core/` function with the **real data as fixtures** (see `plan.md` §3). Tests assert
  general behaviour (a thread carries across formats; a deliberate waiver is not flagged), never
  sample-specific branches.
- Write the failing test first (TDD) for core logic. The edges (Express wiring, React) get a smoke
  test at most — don't chase coverage there.
- A test must be able to run with no network and no LLM. Mock the Gemini client behind an interface.

## YAGNI

No database, no auth, no abstraction for a second provider, no config system. Build exactly what the
handover needs. If a generalization isn't exercised by the data or the brief, don't add it.
