# SignalDesk

SignalDesk is a Chinese-first, mobile-first intelligence dashboard for tracking high-signal developments across AI, crypto, stocks, robotics, energy, macro, geopolitics, and policy domains.

The current product combines:
- a local-first app shell
- optional Supabase-backed user-state sync
- a server-side RSS ingestion pipeline through a Supabase Edge Function
- Supabase persistence for real Phase 4 content rows
- an optional read-only Today real-content preview
- safe Detail provenance preview for real content

It still preserves the existing dark, dotted-grid, cyan-accent SignalDesk visual style and the mock-first default experience.

## Current State

Completed phases and tasks:
- Phase 1: frontend shell and navigation
- Phase 1.5: topic personalization
- Phase 2: PWA install support
- Phase 3: local-first persistence with optional Supabase user-state sync
- Phase 4 Tasks 0-12 plus Task 13-preflight: content foundation, RSS ingestion pipeline, deterministic normalization/dedupe/mapping/scoring, Supabase content persistence, controlled smoke-test tooling, read-only Today preview, preview hardening, enrichment-ready schema/read contracts, and server-only AI enrichment preflight contracts

Current confirmed project state:
- Phase 3 user-state sync works and must be preserved
- the Phase 4 content pipeline exists
- the Phase 4 Supabase content schema has already been applied successfully in the active project environment
- the `content_sources` smoke seed has been applied in the active project environment
- readiness checks have passed
- `supabase/manual/phase4_preview_read_policies.sql` has been applied in the active preview environment
- the `phase4-dry-run` Edge Function has deployed successfully
- live RSS dry-run and write-mode smoke tests have succeeded
- Supabase content tables now contain real rows in the active preview environment
- Today can preview real Supabase content when explicitly enabled

## What SignalDesk Currently Does

Today:
- default behavior still uses mock cards
- optional real-content preview is available behind `VITE_USE_REAL_CONTENT_FEED=true`

Detail:
- mock detail behavior still works
- real-content preview cards can open safely
- detail shows available title, summary, score, categories, source provenance, and safe source links
- detail can show a subtle non-AI enrichment placeholder when richer summary fields have not been generated yet
- no fake full article body is generated when full body content is unavailable

State and sync:
- user state remains local-first
- `localStorage` writes happen immediately
- Supabase user-state sync is optional and account-based

Server-side content pipeline:
- curated RSS source registry
- normalization and deduplication
- deterministic topic/entity mapping
- deterministic candidate signal generation
- Supabase persistence for raw items and deterministic candidate signals

## What Is Still Mock

- the default Today feed when `VITE_USE_REAL_CONTENT_FEED=false`
- Radar
- Watchlist fixture catalog / existing non-real-content behavior
- Library fixture content / existing non-real-content behavior
- AI summaries and AI translations do not exist yet
- Task 12 only prepares optional enrichment-ready schema and read-path support without introducing AI calls
- Task 13-preflight only prepares server-side AI enrichment boundaries, no-op provider stubs, and planning docs without introducing AI calls

## Local Development

Install dependencies:

```bash
npm install
```

Run the app:

```bash
npm run dev
```

Run verification:

```bash
node --import tsx --test src/*.test.ts
npm run lint
npm run build
```

## Client Environment Variables

Client-safe env vars:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_USE_REAL_CONTENT_FEED=false` by default

Notes:
- if the Supabase client env vars are missing, the app must remain safe in local-only mode
- the default Today experience must remain mock unless `VITE_USE_REAL_CONTENT_FEED=true`
- do not commit `.env` or secrets

See [.env.example](/Users/jasonfeng/Desktop/project3_signalDESK/signaldesk/.env.example) for safe placeholders.

## Server-Side / Edge Function Environment

Do not place these in the client bundle. These are server-side concepts for the Supabase Edge Function only:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `PHASE4_ENABLE_CONTENT_WRITES`
- `PHASE4_WRITE_AUTH_TOKEN`
- `PHASE4_ENABLE_LIVE_FETCH`
- `PHASE4_ENABLE_AI_ENRICHMENT`
- `PHASE4_AI_PROVIDER`
- `PHASE4_AI_API_KEY`
- `PHASE4_AI_MODEL`
- `PHASE4_AI_MAX_SIGNALS_PER_RUN`

Safety model:
- `dryRun: true` is the default
- write mode requires explicit `dryRun: false`
- write mode also requires server-side enablement plus a matching write token
- frontend preview is read-only
- frontend does not write Phase 4 content tables
- there are no AI provider calls yet
- future AI enrichment must remain server-side only and manually/dry-run gated first

## Manual Supabase SQL Assets

Current manual SQL and migration assets:
- `supabase/migrations/202605170001_phase4_content_foundation.sql`
- `supabase/migrations/202605210001_phase4_enrichment_ready.sql`
- `supabase/manual/phase4_content_sources_smoke_seed.sql`
- `supabase/manual/phase4_content_readiness_checks.sql`
- `supabase/manual/phase4_preview_read_policies.sql`

Use them manually in a non-production Supabase project. Do not automate their application from the frontend.

## Safe Testing Order

Use this order for a new non-production environment:

1. Apply `supabase/migrations/202605170001_phase4_content_foundation.sql`
2. Apply `supabase/migrations/202605210001_phase4_enrichment_ready.sql` when validating Task 12 enrichment-ready fields
3. Seed `content_sources` with `supabase/manual/phase4_content_sources_smoke_seed.sql`
4. Run `supabase/manual/phase4_content_readiness_checks.sql`
5. Deploy the `phase4-dry-run` Edge Function
6. Run a `liveFetch: true` plus `dryRun: true` smoke test
7. Run a guarded write-mode smoke test with `dryRun: false`
8. Verify content-table row counts conceptually:
   - ingestion runs should increment
   - duplicate reruns should not duplicate raw items or deterministic candidate signals
9. Apply `supabase/manual/phase4_preview_read_policies.sql`
10. Enable frontend preview locally with `VITE_USE_REAL_CONTENT_FEED=true`

## Current Safety Model

- local-first user-state behavior remains the default for Phase 3
- Phase 4 frontend preview is read-only
- Today does not switch to real content by default
- Radar remains mock
- Watchlist and Library remain mock or existing behavior
- no AI calls exist yet
- no AI keys or secrets should be committed

## Known Limitations

- full article body storage is not implemented yet
- no AI summary exists yet
- no AI-generated Chinese translation exists yet
- Task 13-preflight adds no-op provider/planning stubs only, not live AI
- no scheduled ingestion exists yet
- the Today real-content path is still preview-only
- Radar is still mock
- Watchlist and Library are not real-content-backed yet

## Where To Read Next

Start with:
- [AGENTS.md](/Users/jasonfeng/Desktop/project3_signalDESK/signaldesk/AGENTS.md)
- [PROJECT_CONTEXT.md](/Users/jasonfeng/Desktop/project3_signalDESK/signaldesk/PROJECT_CONTEXT.md)
- [ROADMAP.md](/Users/jasonfeng/Desktop/project3_signalDESK/signaldesk/ROADMAP.md)
- [docs/CODEX_HANDOFF.md](/Users/jasonfeng/Desktop/project3_signalDESK/signaldesk/docs/CODEX_HANDOFF.md)
- [docs/PHASE_4_PLAN.md](/Users/jasonfeng/Desktop/project3_signalDESK/signaldesk/docs/PHASE_4_PLAN.md)
- [docs/PHASE_4_MANUAL_QA.md](/Users/jasonfeng/Desktop/project3_signalDESK/signaldesk/docs/PHASE_4_MANUAL_QA.md)
