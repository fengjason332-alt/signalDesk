# Phase 4 Plan

## Goal

SignalDesk Phase 4 should collect real information from selected domains, store raw source items, deduplicate them, generate structured intelligence signals, summarize them, translate them into Chinese, and eventually show them in the Today feed.

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

## Ingestion Strategy

- start with RSS feeds first
- keep ingestion server-side only
- use a curated source registry instead of client-side fetches
- store raw source items before trying to generate product-facing signals
- add paid APIs only after RSS ingestion and normalization are stable

## Source Types

Phase 4 MVP:
- RSS

Later:
- paid market APIs
- paid policy APIs
- manual curation or analyst inputs if needed

## Raw Source Item Model

Raw source items should capture:
- source identity
- ingestion run
- canonical URL
- title / dek / author
- publication and discovery timestamps
- language
- raw HTML / raw text / normalized text
- title hash
- URL hash
- content hash
- ingestion status
- lightweight metadata

## Signal Model

A signal is a structured, deduplicated intelligence record rather than a single article row.

Signals should include:
- primary category and categories
- English and Chinese headlines
- English and Chinese summaries
- why-it-matters bullets
- source counts
- generation status
- scoring fields
- references back to raw source items

## Entity Extraction Model

Entity support should handle:
- company
- organization
- person
- policy
- asset
- country
- topic
- macro indicator

Entity tables should support:
- canonical entity rows
- raw item -> entity links
- signal -> entity links

## Topic Mapping Model

- reuse `canonical_topics` as the main taxonomy anchor
- map raw items/signals to canonical topics
- start with deterministic alias-based mapping
- add model-assisted refinement later

## Summary Generation Model

Later in Phase 4, signal generation should produce:
- English structured summary
- Chinese reading-ready summary
- why-it-matters bullets
- score candidates
- topic and entity candidates

## Paragraph-By-Paragraph Bilingual Translation Model

Translation should be block-based rather than one large blob.

Each block should store:
- block order
- block kind
- source language
- target language
- original text
- translated text
- translation status

## Scoring

Signals should carry explicit `0-100` scores for:
- importance
- urgency
- confidence
- relevance
- source reliability
- overall score

## Deduplication Strategy

MVP:
- source external id when available
- canonical URL hash
- title hash
- content hash

Later:
- semantic similarity / embedding-based clustering

## Source Reliability

Use source reliability tiers:
- official
- tier_1
- specialist
- aggregator

Reliability should influence confidence and overall signal quality.

## Supabase Tables Needed

- `content_sources`
- `content_ingestion_runs`
- `raw_source_items`
- `content_entities`
- `raw_source_item_entities`
- `intelligence_signals`
- `signal_source_items`
- `signal_entities`
- `signal_topics`
- `signal_translation_blocks`

## Runtime Strategy

- use Supabase Edge Functions for ingestion/enrichment jobs
- do not run ingestion from the client
- do not expose API or AI keys to the browser

## Scheduled Job Strategy

Recommended starting point:
- RSS fetch/normalize job every 15 minutes
- signal-build/enrichment job every 15 minutes after fetch

## Frontend Integration Points

The first real-data surface should be:
- Today feed

Important:
- keep a mock fallback during rollout
- do not break Radar, Watchlist, or Library while Today is moving first

## API Key Handling

Client-safe env only:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Server-only future env:
- `SUPABASE_SERVICE_ROLE_KEY`
- AI provider keys
- paid-source API keys

## MVP Scope

- RSS-first
- English-first raw ingestion
- raw item storage
- deterministic dedupe
- structured signal storage
- topic/entity mapping baseline
- translation-block model in place
- Today integration later in Phase 4 after ingestion is stable

## Later Scope

- paid APIs
- semantic dedupe
- richer entity resolution
- Radar driven by real momentum data
- Watchlist and Library powered by real generated signals
- daily or periodic AI briefings

## Risks

- messy RSS formatting
- duplicate clustering drift
- incomplete topic coverage
- source reliability heuristics being too naive
- AI cost/latency once enrichment begins
- rollout complexity when mixing real and mock content

## Implementation Sequence

1. Task 0: content-domain foundation types, additive mappers, migration draft
2. Task 1: source registry and RSS-ingestion skeleton
3. Task 2: normalization and raw-item deduplication
4. Task 3: signal generation and topic/entity mapping
5. Task 4: summary and translation generation
6. Task 5: Today feed integration with mock fallback
7. Task 6: reliability hardening, retries, and ops cleanup
