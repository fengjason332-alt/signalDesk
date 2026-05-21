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
- Phase 4 Tasks 0-12 plus Task 13-preflight: content pipeline foundation, RSS ingestion/write path, deterministic mapping and scoring, smoke-test tooling, real-content Today preview, preview-detail hardening, enrichment-ready schema/read support, and server-only AI enrichment preflight planning/contracts

## Current App Architecture

Main client shell:
- Vite + React application
- `AppContext` as the main UI state coordinator
- local-first persistence for user state
- optional Supabase Auth + Postgres sync for user state

Phase 4 server-side content pipeline:
- curated RSS source registry
- Edge Function entrypoint: `supabase/functions/phase4-dry-run`
- normalization and deduplication helpers
- deterministic topic/entity mapping
- deterministic candidate signal generation
- deterministic scoring seed helpers
- Supabase persistence for raw items and deterministic candidate signals

Phase 4 read path:
- read-only adapter from Supabase content tables into the frontend `Signal` shape
- feature-flagged Today preview behind `VITE_USE_REAL_CONTENT_FEED=true`
- safe Detail preview with provenance and limited-preview messaging when full body content is unavailable
- optional enrichment-aware summary fallback while full body content still remains unstored

Phase 4 AI enrichment preflight:
- server-only provider-neutral enrichment interfaces live under `supabase/functions/_shared`
- no-op provider and deterministic job-planning helpers exist only to define future batch/version/write boundaries
- no AI SDKs, keys, provider fetches, or scheduled jobs are implemented yet

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
- no AI summary or translation exists yet
- Task 12 enrichment-ready columns and read fallbacks are additive only and remain optional
- Task 13-preflight defines future AI enrichment flow and cost/write boundaries, but still performs no AI calls

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

Manual SQL assets:
- `supabase/migrations/202605170001_phase4_content_foundation.sql`
- `supabase/migrations/202605210001_phase4_enrichment_ready.sql`
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
- do not add AI calls yet
- do not store raw provider errors or prompt text in publicly readable preview tables
- do not add secrets or commit `.env`
- do not fabricate full article bodies in Detail

## Next Recommended Task

Phase 4 Task 13 actual implementation:
- guarded AI summary / translation dry-run implementation on the server side
- keep Today mock-by-default
- keep Radar, Watchlist, and Library on current behavior
- keep AI design and implementation gated until the real-content preview path is more stable operationally
