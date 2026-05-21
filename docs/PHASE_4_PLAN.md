# Phase 4 Plan

## Goal

SignalDesk Phase 4 adds a real-content pipeline around curated RSS ingestion, deterministic normalization/deduplication/mapping, Supabase content persistence, and a safe frontend preview path before any AI summarization or translation is introduced.

## Supported Domains

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

## Completed Through Task 11

### Tasks 0-4: Foundations

- content-domain types and mappers
- Phase 4 schema foundation
- RSS source registry
- deterministic normalization and dedupe
- deterministic topic/entity mapping
- deterministic candidate signal generation
- deterministic scoring seed
- dry-run pipeline scaffold

### Tasks 5-8: Server-Side Persistence And Smoke-Test Hardening

- raw content persistence into:
  - `content_ingestion_runs`
  - `raw_source_items`
  - `content_entities`
  - `raw_source_item_entities`
- deterministic candidate signal persistence into:
  - `intelligence_signals`
  - `signal_source_items`
  - `signal_entities`
  - `signal_topics`
- explicit `dryRun` default and guarded write mode
- multi-source ingestion hardening
- observability for partial success and duplicate-safe reruns

### Tasks 9-11: Read-Only Frontend Preview

- read-only real-content adapter from Supabase content tables into the frontend `Signal` shape
- feature-flagged Today preview behind `VITE_USE_REAL_CONTENT_FEED=true`
- safe mock fallback when preview reads fail
- safe Detail provenance preview without fake article bodies
- deterministic preview ranking
- multi-source provenance display readiness
- malformed-row skipping without breaking the whole preview feed

## Current Known Working State

- the Phase 4 content migration has been applied successfully in the active preview environment
- the smoke-test `content_sources` seed has been applied
- readiness checks have passed
- preview read policies have been applied
- the `phase4-dry-run` Edge Function has deployed successfully
- live RSS dry-run and write-mode smoke tests have succeeded
- Supabase content tables now contain real rows
- duplicate reruns do not duplicate `raw_source_items` or `intelligence_signals`
- Today real-content preview works when:
  - `VITE_USE_REAL_CONTENT_FEED=true`
  - `VITE_SUPABASE_URL` is set
  - `VITE_SUPABASE_ANON_KEY` is set
  - `supabase/manual/phase4_preview_read_policies.sql` has been applied
- default Today behavior is still mock
- Radar remains mock
- there are still no AI summary or translation calls

## Remaining Tasks

### Task 12: Enrichment-Ready Schema / Non-AI Enrichment Placeholders

- prepare the next schema/storage layer for richer summaries, detail fragments, or provenance expansions
- keep implementation deterministic and server-side
- do not introduce AI yet

### Task 13: AI Summary / Translation Integration Design Only Or Guarded Implementation

- design or add the first guarded AI-assisted summary/translation layer
- require explicit server-side keys and controls
- do not make AI the default path until preview stability is proven

### Task 14: Scheduled Ingestion

- add bounded scheduling for recurring ingestion
- preserve dry-run and explicit write controls
- make operational observability stronger before increasing ingestion cadence

### Task 15: Controlled Today Real-Feed Rollout

- move Today from preview-only toward a controlled rollout
- preserve mock fallback and safe disable paths
- do not touch Radar, Watchlist, or Library real-data rollout until Today is stable

## Risks To Keep In Mind

- RLS and preview-read policies can drift from what the frontend read adapter expects
- RSS feeds can go stale, change shape, or become noisy
- duplicate handling can still miss tricky cross-source near-duplicates
- partial failures can leave the system operationally confusing even when writes are guarded
- source provenance quality depends on source metadata consistency
- full article body is not stored yet, so Detail must stay honest about preview limitations

## Guardrails

- keep `dryRun: true` as the default
- keep write mode guarded by explicit enablement and `PHASE4_WRITE_AUTH_TOKEN`
- keep the frontend real-content path read-only
- keep Today mock by default
- keep Radar mock
- do not add AI until the real-content preview path is stable
