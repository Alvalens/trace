# CLAUDE.md — Night-Shift Handover Service

Guidance for any AI session working in this repo. Read this first, then `plan.md`, then the rule files
under `.claude/rules/`.

## What this is

A service that generates an **action-first morning handover** for a hotel's night shift (23:00–07:00).
It ingests two formats — structured `events.json` and one free-text prose night (`night-logs.md`,
mixed EN/中文) — reconciles issues into **threads across nights**, and returns what's **on fire /
pending / FYI / to verify** in 60 seconds. Full design + data analysis is in `plan.md`. The brief and
sample data come from `../vouch-builder-test-candidate` (reference only).

**It is not** a CRUD ticket list or a chronological retelling. The graded core is **grounding**
(never state anything the data doesn't support; flag contradictions/gaps) and **reconciliation**.

## The one architecture rule (non-negotiable)

Two phases, hard-separated:
- **Ingestion** (runs once per source) — the *only* place an LLM runs. Gemini extracts the prose night
  into normalized events with cited source excerpts. Structured events are normalized by pure code.
- **Query** (every request) — **pure, deterministic, no LLM.** Load normalized events → thread by
  stable issue-key → classify vs the target shift → rule-based flags → 4 buckets.

The LLM never touches the decision/classification path. An optional cosmetic `narrative` renderer is
the *only* other LLM use, and it sees only already-grounded output (see `.claude/rules/grounding-and-ai.md`).

## Tech stack

- **Server:** Node + TypeScript + **Express**. Core logic is framework-free pure functions.
- **Client:** **React** (Vite) + **Tailwind** + **shadcn/ui** — quick, consistent, decent-looking.
- **LLM:** **Google Gemini**, structured output (`responseSchema`). Extraction + optional narrative only.
- **Deploy:** GCP Cloud Run (single container, single instance), VPS fallback. In-memory store.

## Structure

```
data/            given sample data (events.json, night-logs.md), copied in, self-contained
server/src/
  core/          PURE — no I/O, no framework, no LLM. The graded heart. Fully unit-tested.
  ingest/        Gemini extraction + quote-verifier + in-memory store
  http/          Express routes (thin) + structured stdout logging
client/src/      minimal React viewer + paste/upload form
```

Dependency direction is one-way: `http` and `ingest` depend on `core`; **`core` depends on nothing.**

## Conventions (read before coding)

- `@.claude/rules/clean-code.md` — TS/clean-code standards, file boundaries, testing.
- `@.claude/rules/api-patterns.md` — Express routes, validation, response envelope, logging.
- `@.claude/rules/frontend-patterns.md` — React + Tailwind + shadcn patterns.
- `@.claude/rules/grounding-and-ai.md` — **the project's reason for existing.** Grounding, Gemini
  usage, quote-verifier, prompt-injection handling, the narrative sandbox. Non-negotiable.

## Commands (fill in as scaffolded)

```bash
# server
cd server && npm run dev          # local dev
cd server && npm test             # unit tests for core/*  (run these often)
cd server && npm run build

# client
cd client && npm run dev
cd client && npm run build        # static assets served by Express in prod

# sample request (after deploy)
curl https://<url>/handover/lumen-sg?date=2026-05-30
```

## Working agreements

- 2-hour timebox. Clean code over volume. Spend the budget on `core/` correctness and grounding.
- TDD the core: write the failing test against the real data fixtures, then implement.
- Commit honestly and often; never squash (the brief wants full history).
- Never hardcode to the sample (no `if (room === '205')`). Specific events are test fixtures, not branches.
