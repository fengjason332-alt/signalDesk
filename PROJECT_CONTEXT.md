# SignalDesk Project Context

## What SignalDesk Is

SignalDesk is a Chinese-first, mobile-first PWA-style intelligence dashboard for scanning, tracking, saving, and reviewing high-signal developments across a focused set of strategic domains.

It is designed to feel like:
- a calm personal intelligence desk
- a premium reading-oriented dashboard

It should not drift into:
- a trading terminal
- a military command screen
- a generic noisy news feed

## Coverage Areas

- AI
- Crypto
- Stocks
- Robotics
- Energy
- US Policy
- China Policy
- Australia Policy
- Macro
- Geopolitics

## Visual Language

- dark dotted-grid background
- cyan primary accents
- rounded dark cards
- mobile-first layout
- bottom-tab navigation

## Completed Phases

- Phase 1: frontend shell and navigation
- Phase 1.5: topic personalization
- Phase 2: PWA install support
- Phase 3: local-first persistence with optional Supabase user-state sync
- Phase 4 Tasks 0-12 plus Task 13-preflight, Tasks 13B-13E, and Tasks 14A-25: content pipeline foundation, RSS ingestion/write path, deterministic mapping and scoring, smoke-test tooling, real-content Today preview, preview-detail hardening, enrichment-ready schema/read support, server-only AI enrichment preflight planning/contracts, guarded DeepSeek dry-run integration, a manual-only guarded DeepSeek enrichment write path, additive lease/retry hardening for one-to-three signal manual batches, single-intent non-AI ingestion hardening plus bounded scheduled-ingestion readiness, controlled Today real-feed rollout hardening, an operator-safe recurring-ingestion contract/helper for bounded non-AI automation, an explicit rollout-decision checklist for any later Today real-by-default decision, stronger feed-mode diagnostics and fallback QA hardening, a Task 20 keep-mock-by-default decision with explicit rollback and blocker docs, a Task 21 target-environment pilot runbook, a Task 22 local pilot helper plus QA hardening, a Task 23 pilot-evidence preparation doc and helper output expansion, Task 24 local pilot-evidence review tooling, Task 25 stricter pilot-evidence hardening plus a controlled default-rollout preparation plan, and a planning-only future X/Grok user-curated source connector path

## Current App Architecture

Main client shell:
- Vite + React application
- `AppContext` as the main UI state coordinator
- local-first persistence for user state
- optional Supabase Auth + Postgres sync for user state

Phase 4 server-side content pipeline:
- curated RSS source registry
- Edge Function entrypoint: `supabase/functions/phase4-dry-run`
- single-intent request contract on the Edge Function:
  - `intent: "ingestion"` for non-AI content ingestion
  - `intent: "ai_enrichment"` for server-side AI enrichment
- bounded scheduled non-AI ingestion support exists behind `PHASE4_ENABLE_SCHEDULED_INGESTION=true`
- operator-safe recurring requests can now be built with `src/lib/content/phase4ScheduledIngestionRequest.ts`, which requires explicit `sourceIds` and clamps scheduled payloads to repo defaults
- normalization and deduplication helpers
- deterministic topic/entity mapping
- deterministic candidate signal generation
- deterministic scoring seed helpers
- Supabase persistence for raw items and deterministic candidate signals
- additive ingestion diagnostics for requested / resolved / unknown source ids, per-source timestamps, and per-source reliability tiers
- scheduled non-AI ingestion now has hard caps for sources, items per source, total candidate items, and candidate signals
- recurring non-AI ingestion is still expected to start with explicit source allowlists and a conservative `30` or `60` minute cadence

Phase 4 read path:
- read-only adapter from Supabase content tables into the frontend `Signal` shape
- feature-flagged Today preview behind `VITE_USE_REAL_CONTENT_FEED=true`
- explicit Today feed-mode states now exist for rollout diagnostics:
  - `mock`
  - `real`
  - `fallback_to_mock`
  - `real_empty`
- feed-mode reasons now also distinguish:
  - env disabled
  - real rows loaded
  - zero preview-safe rows
  - fallback because preview reads failed
  - fallback because all eligible rows failed mapping
- safe Detail preview with provenance and limited-preview messaging when full body content is unavailable
- optional enrichment-aware summary fallback while full body content still remains unstored

Phase 4 AI enrichment path:
- server-only provider-neutral enrichment interfaces live under `supabase/functions/_shared`
- a guarded DeepSeek provider implementation now exists only in the Edge Function/shared server path
- dry-run remains the default AI path
- Task 13C adds a manual-only guarded write mode for one-to-three signals at a time
- Task 13D and Task 13E add claim / retry bookkeeping and sequential batch handling for up to 3 manual writes
- AI writes are limited to enrichment-ready columns on `public.intelligence_signals`
- no AI SDKs are installed in the frontend, and no client env/provider calls exist

Main tabs:
- Today
- Radar
- Watchlist
- Library
- Settings

## Current Persistence Model

Phase 3 user state persists locally first in `localStorage` and syncs to Supabase only when:
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are configured
- the user has an authenticated session

Persisted user state includes:
- onboarding completion
- reading/translation settings
- selected core domains
- followed topics
- muted topics
- saved items
- watchlist items
- notes
- lightweight feedback state

Phase 4 content persistence is server-side only:
- raw RSS items
- deterministic content entities and links
- deterministic candidate signals and provenance links

The frontend does not write Phase 4 content tables.

## Mock Content vs Real Persisted State

Still mock or existing fixture behavior:
- default Today feed
- Radar
- Watchlist fixture catalog / existing behavior
- Library fixture content / existing behavior

Real persisted user state:
- local `signaldesk_state_v2`
- Supabase Phase 3 user-state tables

Real persisted Phase 4 content state:
- `content_ingestion_runs`
- `raw_source_items`
- `content_entities`
- `raw_source_item_entities`
- `intelligence_signals`
- `signal_source_items`
- `signal_entities`
- `signal_topics`

Preview-only real-content frontend path:
- Today can read real candidate-signal rows when explicitly enabled
- Detail can show provenance and safe source links
- full article body is not stored yet and must not be fabricated

## Current Phase 4 Status

Confirmed current working state:
- the Phase 4 content schema has been applied successfully in the active preview environment
- the smoke-test `content_sources` seed has been applied
- readiness checks have passed
- preview read policies have been applied
- the `phase4-dry-run` Edge Function has deployed successfully
- live RSS dry-run and write-mode smoke tests have succeeded
- Supabase content tables now contain real rows in the active preview environment
- duplicate reruns do not duplicate `raw_source_items` or `intelligence_signals`
- Today real-content preview works when:
  - `VITE_USE_REAL_CONTENT_FEED=true`
  - `VITE_SUPABASE_URL` is set
  - `VITE_SUPABASE_ANON_KEY` is set
  - preview read policies are applied
- clicking a real content card opens Detail safely
- Detail shows source provenance and safe source links when available
- Radar remains mock
- manual AI enrichment can now populate enrichment-ready summary / translation fields server-side, but it remains optional and operator-only
- Task 12 enrichment-ready columns and read fallbacks are additive only and remain optional
- Task 13B adds the first optional DeepSeek dry-run path on the server side only
- Task 13C adds a guarded manual AI write mode that can persist validated DeepSeek output into enrichment-ready `intelligence_signals` columns only
- Task 13D and Task 13E add additive claim / lease / retry bookkeeping so manual write mode can skip claimed rows, respect retry windows, and return clearer per-signal run statuses
- Task 14A-14D add explicit non-AI ingestion intent / trigger metadata, mixed-request rejection, unknown-source diagnostics, and confirmation that AI enrichment still rejects scheduled trigger mode
- Task 14E adds bounded scheduled non-AI ingestion support behind a server-side env gate, while keeping scheduled AI explicitly rejected
- Task 15 keeps Today mock-by-default while making the real-feed rollout path clearer for manual QA with explicit empty/fallback states and completed-enrichment preference
- Task 16 adds an operator-safe recurring-ingestion helper, clearer scheduled-run docs, explicit allowlist guidance, and rollback/cadence instructions while keeping actual scheduling disabled by default
- Task 17 adds a controlled Today real-feed QA checklist plus explicit product/technical criteria for any future real-by-default decision, without changing the default feed
- Task 18 keeps scheduled non-AI ingestion operator-safe, records the activation/runbook boundary in docs, and adds a planning-only future X/Grok user-curated source connector document
- Task 19 adds clearer Today real-feed mode diagnostics, stronger enriched-field fallback tests, and explicit rollout-decision gates without changing the default feed
- Task 20 evaluates the real-by-default decision and keeps Today mock-by-default because production-like preview-read, freshness, and rollback validation still need explicit sign-off
- Task 21 adds a dedicated target-environment pilot runbook so operators can validate real-feed behavior and rollback without changing the default
- Task 22 adds `npm run phase4:today-pilot-check` so operators can confirm `mock_default`, `pilot_ready`, or `pilot_misconfigured` before opening the app
- Task 23 adds `docs/TODAY_REAL_FEED_PILOT_EVIDENCE.md` so target-environment pilot results can be recorded against consistent pass/fail and rollback criteria
- Task 24 adds `src/lib/content/todayRealFeedPilotEvidence.ts` plus `npm run phase4:today-evidence-review` so local pilot evidence can be reviewed conservatively without contacting Supabase or changing runtime defaults
- Task 25 adds a stronger user-fillable template JSON, stricter rollout-readiness checks, and a planning-only controlled default-rollout doc without changing any runtime default

## Environment And Deployment

Client env:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_USE_REAL_CONTENT_FEED=false` by default

Server-side Phase 4 env concepts:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `PHASE4_ENABLE_CONTENT_WRITES`
- `PHASE4_WRITE_AUTH_TOKEN`
- `PHASE4_ENABLE_LIVE_FETCH`
- `PHASE4_ENABLE_SCHEDULED_INGESTION`
- `PHASE4_ENABLE_AI_ENRICHMENT`
- `PHASE4_AI_DRY_RUN_ONLY`
- `AI_PROVIDER`
- `DEEPSEEK_API_KEY`
- `DEEPSEEK_BASE_URL`
- `DEEPSEEK_MODEL`

Manual SQL assets:
- `supabase/migrations/202605170001_phase4_content_foundation.sql`
- `supabase/migrations/202605210001_phase4_enrichment_ready.sql`
- `supabase/migrations/202605230001_phase4_enrichment_source_deepseek.sql`
- `supabase/migrations/202605250001_phase4_ai_enrichment_leases.sql`
- `supabase/manual/phase4_content_sources_smoke_seed.sql`
- `supabase/manual/phase4_content_readiness_checks.sql`
- `supabase/manual/phase4_preview_read_policies.sql`

## Do Not Accidentally Break

- preserve local-first behavior
- preserve working Phase 3 user-state sync
- preserve mock fallback when preview reads fail or are disabled
- preserve the preview read-only boundary for Phase 4 content from the frontend
- do not switch default Today to real content yet
- do not touch Radar real-data integration yet
- do not expose DeepSeek or future AI keys to the frontend
- do not broaden AI enrichment writes beyond the guarded manual Task 13C-13E path without explicit future approval
- do not combine ingestion fields and `aiEnrichment` in one request body
- do not assume scheduled ingestion is enabled unless `PHASE4_ENABLE_SCHEDULED_INGESTION=true`
- do not run recurring ingestion without an explicit `sourceIds` allowlist unless you intentionally want the capped active-source fallback
- do not store raw provider errors or prompt text in publicly readable preview tables
- do not bypass the new claim / retry guards for manual AI writes
- do not enable scheduled AI execution yet
- do not implement Capacitor or iOS runtime work in Phase 4
- do not add secrets or commit `.env`
- do not fabricate full article bodies in Detail

## Next Recommended Task

Phase 4 Task 26:
- either run the actual target-environment Today pilot and fill the Task 25 evidence template, or, if accepted evidence already exists, prepare a tiny controlled default switch behind an explicit env flag
- keep Today mock-by-default unless a later explicit task changes that
- keep Radar, Watchlist, and Library on current behavior
- keep scheduled AI enrichment out of scope until manual AI write mode is operationally stable
- use [docs/APP_STORE_READINESS.md](/Users/jasonfeng/Desktop/project3_signalDESK/signaldesk/docs/APP_STORE_READINESS.md) as planning only, not as implementation scope in Phase 4
