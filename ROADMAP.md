# SignalDesk Roadmap

## Completed

- Phase 1: frontend shell and navigation
- Phase 1.5: topic personalization
- Phase 2: PWA install support
- Phase 3: local-first persistence with optional Supabase account sync for user state
- Phase 4 Task 0: content-model foundation types, additive mappers, and a draft content-schema migration

## Phase 3 Scope Clarification

Phase 3 was user-state sync only. It completed:
- Supabase Auth
- Supabase tables for user state
- canonical topic seed
- local-first hydration and persistence
- debounced ongoing sync for profile, topic preferences, saved items, watchlist items, notes, and feedback

Phase 3 did not move mock intelligence/news content into Supabase.

## Phase 4: Real Content Ingestion And Intelligence Generation

Phase 4 is the real-content phase. Its purpose is to ingest real information, store raw source items, deduplicate them, generate structured intelligence signals, summarize them, translate them into Chinese, and eventually feed those results into the Today experience.

Task order:
1. Task 0: foundation models and content-schema draft
2. Task 1: source registry and RSS ingestion skeleton
3. Task 2: raw-item normalization and deduplication
4. Task 3: signal generation plus topic/entity mapping
5. Task 4: summary generation and paragraph-by-paragraph translation
6. Task 5: Today feed integration with mock fallback
7. Task 6: ops, retries, reliability scoring, and hardening

## Later

- Phase 5: richer AI summarization, translation workflows, and Ask SignalDesk
- later product work may expand Radar, Watchlist, and Library to use real generated signals after the Today feed path is stable
