# SignalDesk Roadmap

## Completed

- Phase 1: frontend shell and navigation
- Phase 1.5: topic personalization
- Phase 2: PWA install support
- Phase 3: local-first persistence with optional Supabase account sync for user state

## Phase 3 Scope Clarification

Phase 3 was user-state sync only. It completed:
- Supabase Auth
- Supabase tables for user state
- canonical topic seed
- local-first hydration and persistence
- debounced ongoing sync for profile, topic preferences, saved items, watchlist items, notes, and feedback

Phase 3 did not move content cards or feed data into Supabase.

## Phase 4: Real Content Ingestion And Preview Path

Phase 4 is the real-content phase. Its purpose is to ingest real information, store raw source items, deduplicate them, generate structured intelligence signals, and eventually feed those results into the Today experience without breaking the mock-first default rollout.

### Phase 4 Tasks 0-12 Plus Task 13-preflight And Tasks 13B-13E Complete

1. Task 0: content-domain foundation types, additive mappers, and Phase 4 schema draft
2. Task 1: source registry and RSS ingestion skeleton
3. Task 2: normalization and deterministic raw-item deduplication
4. Task 3: deterministic topic/entity mapping foundation
5. Task 4: candidate signal generation, deterministic scoring seed, and dry-run pipeline scaffold
6. Task 5: raw content persistence into `content_ingestion_runs`, `raw_source_items`, `content_entities`, and `raw_source_item_entities`
7. Task 6: deterministic candidate signal persistence into `intelligence_signals`, `signal_source_items`, `signal_entities`, and `signal_topics`
8. Task 7: controlled Supabase smoke-test readiness and manual rollout assets
9. Task 8: multi-source ingestion hardening, topic mapping improvement, and operational observability
10. Task 9: read-only real-content adapter plus feature-flagged Today preview with mock fallback
11. Task 10: preview hardening, provenance/detail improvements, and safer read rollout validation
12. Task 11: preview quality hardening for deterministic ranking, multi-source provenance display readiness, safe row skipping, and filter parity
13. Task 12: enrichment-ready schema, optional enrichment contract/types, preview read fallback compatibility, and non-AI detail placeholders
14. Task 13-preflight: guarded AI enrichment architecture plan, server-only provider-neutral no-op interfaces, cost/write guardrails, and dry-run-first boundaries without any AI calls
15. Task 13B: server-side DeepSeek dry-run provider integration, guarded prompt/input validation, structured JSON-only proposed outputs, and no-write dry-run endpoint support
16. Task 13C: manual-only guarded AI enrichment write mode for one-to-three signals, validated DeepSeek output persistence into enrichment-ready `intelligence_signals` columns only, readback confirmation, and no deterministic-field overwrites
17. Task 13D: additive claim / lease / retry bookkeeping for manual AI enrichment writes
18. Task 13E: sequential manual batch write-mode support for up to 3 signals, partial-failure handling, and richer operator readback / observability

### Current Phase 4 Status

- Supabase content schema has been applied successfully in the active preview environment
- `content_sources` smoke seed has been applied
- readiness checks and preview read policies have been applied
- the `phase4-dry-run` Edge Function has deployed successfully
- live RSS smoke tests have succeeded
- guarded write-mode smoke tests have succeeded
- Supabase content tables now contain real rows in the active preview environment
- Today can preview real content when explicitly enabled
- Today remains mock by default
- Radar remains mock
- AI summary and translation now exist only as manual guarded server-side enrichment, not as a default product behavior
- enrichment-ready columns and read helpers now exist, but they remain optional and do not introduce AI or client writes
- DeepSeek dry-run provider integration now exists server-side
- guarded manual AI enrichment persistence now exists for enrichment-ready `intelligence_signals` fields only
- manual DeepSeek write mode has succeeded in non-production
- claim / retry bookkeeping now exists for manual AI reruns
- no scheduled AI execution exists yet

## Next Recommended Tasks

### Task 14: Scheduled Ingestion

- add controlled scheduling for recurring ingestion
- keep live fetch and writes observable and bounded
- preserve dry-run and manual smoke-test safety patterns
- keep AI enrichment manual-only while scheduled ingestion is stabilized

### Task 15: Controlled Today Real-Feed Rollout

- graduate the Today real-content path from preview-only to a controlled rollout
- maintain mock fallback
- do not touch Radar, Watchlist, or Library real-data rollout until Today is stable

## Phase 5 Planning Only: App Store Route

- Phase 5A: Capacitor proof-of-build only
- Phase 5B: mobile polish, safe-area handling, and native share planning
- Phase 5C: Watchlist and Library real saved-item functionality
- Phase 5D: privacy/about/source transparency
- Phase 5E: TestFlight build
- Phase 5F: App Store submission package

## Rollout Policy

- AI should not be added until the real-content preview path is stable
- AI should not be scheduled until the manual lease/retry path is stable
- default Today behavior must remain mock until an explicit rollout task changes it
- Radar, Watchlist, and Library should remain on current behavior until separately approved
