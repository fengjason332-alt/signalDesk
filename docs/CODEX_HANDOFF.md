# SignalDesk Codex Handoff

## Read First

Before changing code, read:
- [AGENTS.md](/Users/jasonfeng/Desktop/project3_signalDESK/signaldesk/AGENTS.md)
- [PROJECT_CONTEXT.md](/Users/jasonfeng/Desktop/project3_signalDESK/signaldesk/PROJECT_CONTEXT.md)
- [ROADMAP.md](/Users/jasonfeng/Desktop/project3_signalDESK/signaldesk/ROADMAP.md)
- [README.md](/Users/jasonfeng/Desktop/project3_signalDESK/signaldesk/README.md)
- [docs/PRD.md](/Users/jasonfeng/Desktop/project3_signalDESK/signaldesk/docs/PRD.md)
- [docs/PHASE3_CHANGES_SUMMARY.md](/Users/jasonfeng/Desktop/project3_signalDESK/signaldesk/docs/PHASE3_CHANGES_SUMMARY.md)
- [docs/PHASE_4_PLAN.md](/Users/jasonfeng/Desktop/project3_signalDESK/signaldesk/docs/PHASE_4_PLAN.md)

## Current Product State

- Product: SignalDesk
- Form factor: mobile-first PWA-style intelligence dashboard
- Visual style: dark dotted-grid, cyan accent, rounded dark cards
- Main tabs: Today, Radar, Watchlist, Library, Settings
- Current content source: frontend mock/demo content
- Current real persistence: local-first V2 user state with optional Supabase sync

## Current Technical State

- Phase 3 user-state sync is implemented
- Supabase Auth is wired
- Supabase user-state tables and canonical topic seed exist
- app remains safe in local-only mode without Supabase env vars
- Today feed still renders mock cards
- Phase 4 Task 0 foundation is now present:
  - content-domain TypeScript types
  - additive generated-signal mapper
  - draft content-schema migration

## Important Constraints

- Preserve the current SignalDesk visual style
- Preserve local-first user-state behavior
- Preserve working Supabase user-state sync
- Do not move mock content into Supabase unless the current phase explicitly requires it
- Do not wire TodayView to real Supabase content until a later Phase 4 task explicitly does that
- Do not expose ingestion or AI secrets in client code

## Current Content/State Split

Mock/demo content:
- [src/mockData.ts](/Users/jasonfeng/Desktop/project3_signalDESK/signaldesk/src/mockData.ts)

Real persisted user state:
- [src/storage.ts](/Users/jasonfeng/Desktop/project3_signalDESK/signaldesk/src/storage.ts)
- [src/AppContext.tsx](/Users/jasonfeng/Desktop/project3_signalDESK/signaldesk/src/AppContext.tsx)
- [src/lib/persistence](/Users/jasonfeng/Desktop/project3_signalDESK/signaldesk/src/lib/persistence)

Phase 4 foundation:
- [src/lib/content/types.ts](/Users/jasonfeng/Desktop/project3_signalDESK/signaldesk/src/lib/content/types.ts)
- [src/lib/content/mappers.ts](/Users/jasonfeng/Desktop/project3_signalDESK/signaldesk/src/lib/content/mappers.ts)
- [supabase/migrations/202605170001_phase4_content_foundation.sql](/Users/jasonfeng/Desktop/project3_signalDESK/signaldesk/supabase/migrations/202605170001_phase4_content_foundation.sql)

## Current Next Recommended Task

Phase 4 Task 9:
- keep the pipeline server-side only
- keep Today on mock content until the persisted signal layer is stable enough for controlled integration
- use the Task 7/8 manual readiness assets before any non-production write smoke test:
  - `docs/PHASE_4_MANUAL_QA.md`
  - `supabase/manual/phase4_content_sources_smoke_seed.sql`
  - `supabase/manual/phase4_content_readiness_checks.sql`
- next likely work branches:
  - controlled multi-source smoke-test follow-through and stronger write observability
  - or the first summary / translation persistence step, still without frontend Today integration until the signal layer is stable

## Phase 4 Task 5 Status

- the server-side RSS path now supports explicit write mode into `content_ingestion_runs`, `raw_source_items`, `content_entities`, and `raw_source_item_entities`
- dry-run remains the default; writes require `dryRun: false` plus an explicitly enabled server-side content store
- the Edge Function path stays safe by default; real server-side fetch/write execution should only be enabled in a non-production environment with explicit server env flags and a service-role-backed content store
- this still does not write `intelligence_signals` or translation blocks
- this still does not switch the Today feed or any frontend surface away from mock content
- manual write testing later requires the draft Phase 4 migration to be applied in a non-production environment and matching `content_sources` rows to exist for the selected registry source ids

## Phase 4 Task 6 Status

- explicit write mode now also persists deterministic candidate signals into:
  - `intelligence_signals`
  - `signal_source_items`
  - `signal_entities`
  - `signal_topics`
- candidate signal writes stay server-side only and still require `dryRun: false` plus explicit server-side write enablement
- persisted signal rows now carry a deterministic `candidate_key`, `lifecycle_stage`, and deterministic scoring seed fields for recency, entity importance, topic relevance, source count, duplicate confidence, and overall seed score
- raw source provenance is preserved through `signal_source_items`, with a persisted `primary_source_item_id` and `is_primary` links
- run finalization now records partial/failed status when deterministic signal persistence fails after raw item writes
- this still does not write `signal_translation_blocks`
- this still does not write AI-generated summaries or translations
- this still does not switch the Today feed or any frontend surface away from mock content

## Phase 4 Task 7 Status

- manual migration/readiness guidance now lives in:
  - `docs/PHASE_4_MANUAL_QA.md`
  - `supabase/manual/phase4_content_sources_smoke_seed.sql`
  - `supabase/manual/phase4_content_readiness_checks.sql`
- smoke-test payload construction now has a safe helper in:
  - `src/lib/content/phase4SmokeTestRequest.ts`
- the Edge handler now returns clearer server-side guardrail payloads for:
  - writes disabled
  - missing server write token configuration
  - missing request write token
  - mismatched request write token
- dry-run remains the default
- live fetch remains opt-in and should only be enabled intentionally
- this still does not call AI
- this still does not change the UI or switch the Today feed

## Phase 4 Task 8 Status

- multi-source ingestion now behaves more safely when one selected source fails:
  - successful sources continue
  - failed sources report their own `error_message`
  - top-level batch status now distinguishes:
    - `succeeded`
    - `partial_success`
    - `failed`
- dry-run remains the default
- write mode remains guarded by:
  - `dryRun: false`
  - server-side write enablement
  - a configured `PHASE4_WRITE_AUTH_TOKEN`
  - a matching `x-phase4-write-token` request header
- deterministic topic mapping now covers a broader set of obvious AI / crypto / policy patterns, including:
  - OpenAI reasoning / education style AI content
  - bitcoin ETF / stablecoin policy content
  - Australia critical minerals policy content
- deterministic candidate-signal writes now expose clearer observability fields:
  - top-level `overall_status`
  - top-level `summary`
  - per-source `status`
  - signal inserted/skipped counts
- `signal_topics` should now become non-zero when content clearly maps to canonical topics
- this still does not:
  - call AI
  - write translation blocks
  - write AI summaries
  - switch the Today feed away from mock content

## Manual QA Prerequisites For Non-Production Write Testing

- apply the draft migration `supabase/migrations/202605170001_phase4_content_foundation.sql` in a non-production Supabase project only
- ensure `content_sources` rows exist for the selected registry source ids before enabling write mode
- ensure `canonical_topics` is already seeded so deterministic `signal_topics` links can insert cleanly
- set server-only env vars:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `PHASE4_ENABLE_CONTENT_WRITES=true`
  - `PHASE4_WRITE_AUTH_TOKEN=<server-side secret>`
  - `PHASE4_ENABLE_LIVE_FETCH=true` only when live fetch is intentionally being exercised
- invoke the Edge Function with `POST`, an explicit body containing `dryRun: false`, and a matching `x-phase4-write-token` header
- use `liveFetch: true` only for intentional live-source smoke tests; the safe default request builder leaves it off
- verify results in:
  - `content_ingestion_runs`
  - `raw_source_items`
  - `content_entities`
  - `raw_source_item_entities`
  - `intelligence_signals`
  - `signal_source_items`
  - `signal_entities`
  - `signal_topics`
