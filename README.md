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
- Phase 4 Tasks 0-12 plus Task 13-preflight, Tasks 13B-13E, and Tasks 14A-14D: content foundation, RSS ingestion pipeline, deterministic normalization/dedupe/mapping/scoring, Supabase content persistence, controlled smoke-test tooling, read-only Today preview, preview hardening, enrichment-ready schema/read contracts, server-only AI enrichment preflight contracts, a guarded DeepSeek dry-run provider path, a manual-only guarded AI enrichment write mode, additive lease/retry hardening for one-to-three signal manual batches, explicit non-AI ingestion intent/trigger guardrails, and stronger ingestion observability

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
- the non-AI ingestion endpoint now uses a single-intent contract:
  - `intent: "ingestion"` for RSS/content ingestion
  - `intent: "ai_enrichment"` for server-side AI enrichment
- mixed ingestion plus `aiEnrichment` payloads are now rejected clearly instead of being routed implicitly
- non-AI ingestion now returns clearer diagnostics for:
  - requested / resolved / unknown source ids
  - per-source reliability tier
  - per-source started / completed timestamps
  - per-run source success / partial / failed counts
- an optional server-side DeepSeek dry-run path exists behind explicit env gating
- a manual-only guarded DeepSeek enrichment write mode now exists for one-to-three signals at a time
- manual AI write mode now uses claim / retry bookkeeping on `public.intelligence_signals`
- AI enrichment still rejects `triggerMode: "scheduled"` and remains manual-only

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
- explicit non-AI ingestion intent plus trigger metadata for future scheduling work
- mixed ingestion plus AI requests rejected at the endpoint boundary
- optional server-only DeepSeek enrichment with:
  - dry-run by default
  - manual write mode only
  - max batch size of 3 signals
  - lease / claim / retry bookkeeping on `intelligence_signals`

## What Is Still Mock

- the default Today feed when `VITE_USE_REAL_CONTENT_FEED=false`
- Radar
- Watchlist fixture catalog / existing non-real-content behavior
- Library fixture content / existing non-real-content behavior
- AI-enriched summaries and AI translations are not enabled by default and only appear if manual server-side enrichment writes have been run successfully
- the AI provider path is still operator-facing and server-side only
- Radar remains mock
- Watchlist and Library are not real-content-backed yet

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
- `PHASE4_AI_DRY_RUN_ONLY`
- `AI_PROVIDER`
- `DEEPSEEK_API_KEY`
- `DEEPSEEK_BASE_URL`
- `DEEPSEEK_MODEL`

Safety model:
- `dryRun: true` is the default
- write mode requires explicit `dryRun: false`
- write mode also requires server-side enablement plus a matching write token
- non-AI ingestion requests should use `intent: "ingestion"`
- future recurring non-AI ingestion may use `triggerMode: "scheduled"`, but that is still server-side/operator work
- requests that combine ingestion fields with `aiEnrichment` are rejected
- frontend preview is read-only
- frontend does not write Phase 4 content tables
- DeepSeek enrichment calls exist only on the server
- AI dry-run remains the default path
- AI enrichment remains manual-only and rejects `triggerMode: "scheduled"`
- manual AI write mode requires:
  - `dryRun: false`
  - `aiEnrichment.writeMode: true`
  - `PHASE4_ENABLE_AI_ENRICHMENT=true`
  - `PHASE4_AI_DRY_RUN_ONLY=false`
  - `AI_PROVIDER=deepseek`
  - `DEEPSEEK_API_KEY`
  - matching `x-phase4-write-token`
- manual AI write mode also requires:
  - claim / lease success before the provider call
  - max `signalIds.length <= 3`
  - max `maxSignals <= 3`
  - valid provider JSON before any enrichment text write
- Task 13C-13E writes only approved enrichment fields plus additive lease/retry bookkeeping fields on `public.intelligence_signals`
- deterministic headline/summary/category/score/provenance fields are not overwritten by AI writes
- future AI enrichment must remain server-side only and manually gated first
- if `phase4-dry-run` is deployed with `--no-verify-jwt`, AI-enabled usage should be treated as operator-only and kept behind explicit server env plus write-token controls

## Manual Supabase SQL Assets

Current manual SQL and migration assets:
- `supabase/migrations/202605170001_phase4_content_foundation.sql`
- `supabase/migrations/202605210001_phase4_enrichment_ready.sql`
- `supabase/migrations/202605230001_phase4_enrichment_source_deepseek.sql`
- `supabase/migrations/202605250001_phase4_ai_enrichment_leases.sql`
- `supabase/manual/phase4_content_sources_smoke_seed.sql`
- `supabase/manual/phase4_content_readiness_checks.sql`
- `supabase/manual/phase4_preview_read_policies.sql`

Use them manually in a non-production Supabase project. Do not automate their application from the frontend.

## Safe Testing Order

Use this order for a new non-production environment:

1. Apply `supabase/migrations/202605170001_phase4_content_foundation.sql`
2. Apply `supabase/migrations/202605210001_phase4_enrichment_ready.sql`
3. Apply `supabase/migrations/202605230001_phase4_enrichment_source_deepseek.sql`
4. Apply `supabase/migrations/202605250001_phase4_ai_enrichment_leases.sql` before validating manual AI claim/retry behavior
5. Seed `content_sources` with `supabase/manual/phase4_content_sources_smoke_seed.sql`
6. Run `supabase/manual/phase4_content_readiness_checks.sql`
7. Deploy the `phase4-dry-run` Edge Function
8. Run an ingestion-only `intent: "ingestion"` plus `liveFetch: true` plus `dryRun: true` smoke test
9. Run an ingestion-only guarded write-mode smoke test with `intent: "ingestion"` plus `dryRun: false`
10. Verify content-table row counts conceptually:
   - ingestion runs should increment
   - duplicate reruns should not duplicate raw items or deterministic candidate signals
11. Apply `supabase/manual/phase4_preview_read_policies.sql`
12. Enable frontend preview locally with `VITE_USE_REAL_CONTENT_FEED=true`
13. Optionally configure DeepSeek dry-run env on the Edge Function:
   - `PHASE4_ENABLE_AI_ENRICHMENT=true`
   - `PHASE4_AI_DRY_RUN_ONLY=true`
   - `AI_PROVIDER=deepseek`
   - `DEEPSEEK_API_KEY=<server-only secret>`
   - `DEEPSEEK_BASE_URL=https://api.deepseek.com`
   - `DEEPSEEK_MODEL=deepseek-chat`
14. Run a one-signal AI dry-run request against `phase4-dry-run`
15. Verify the response returns proposed enrichment output only and performs no database writes
16. Confirm AI enrichment is still manual-only by sending `intent: "ai_enrichment"` plus `triggerMode: "scheduled"` and verifying a clear rejection response
17. For manual Task 13D/13E write-mode validation only:
   - set `PHASE4_AI_DRY_RUN_ONLY=false`
   - keep `PHASE4_ENABLE_AI_ENRICHMENT=true`
   - keep `AI_PROVIDER=deepseek`
   - keep `DEEPSEEK_API_KEY`, `DEEPSEEK_BASE_URL`, and `DEEPSEEK_MODEL` server-side only
   - send `dryRun: false` plus `aiEnrichment.writeMode: true` plus `x-phase4-write-token`
18. Verify only enrichment-ready columns plus additive claim/retry bookkeeping fields on `public.intelligence_signals` changed
19. Verify one-to-three signal manual batches process sequentially and return per-signal statuses
20. Verify Today preview still falls back safely when disabled

## Current Safety Model

- local-first user-state behavior remains the default for Phase 3
- Phase 4 frontend preview is read-only
- Today does not switch to real content by default
- Radar remains mock
- Watchlist and Library remain mock or existing behavior
- no AI keys or secrets should be committed
- DeepSeek is the first optional provider and remains server-side only
- AI dry-run remains the default supported AI mode
- Task 13D and Task 13E keep manual AI writes intentionally narrow and require explicit server-side guards
- lease / claim / retry bookkeeping now exists to reduce concurrent-manual-rerun risk
- no frontend or client-side Phase 4 content writes have been added

## Known Limitations

- full article body storage is not implemented yet
- no scheduled AI enrichment exists yet
- Task 13D/13E AI writes update enrichment-ready fields plus additive lease/retry bookkeeping only and do not overwrite deterministic fields
- AI dry-run and write mode should still be treated as operator-only manual tools
- no recurring non-AI ingestion job exists yet even though the endpoint contract is now scheduler-ready
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
- [docs/APP_STORE_READINESS.md](/Users/jasonfeng/Desktop/project3_signalDESK/signaldesk/docs/APP_STORE_READINESS.md)
