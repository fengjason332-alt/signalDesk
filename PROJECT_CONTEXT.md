# SignalDesk Project Context

## What SignalDesk Is

SignalDesk is a Chinese-first, mobile-first PWA-style intelligence dashboard for scanning, tracking, saving, and reviewing high-signal developments across a focused set of strategic domains.

It is designed to feel like a calm personal intelligence desk, not:
- a trading terminal
- a military command screen
- a generic social/news feed

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

## Current Visual Language

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
- Phase 4 Task 0: content-domain foundation models, additive mapper utilities, and a draft Supabase content migration

## Current App Architecture

- Vite + React client application
- `AppContext` as the main UI state coordinator
- local-first persistence through the V2 user-state model
- optional Supabase Auth + Postgres sync for user state
- mock/demo content rendered from frontend fixtures

Main tabs:
- Today
- Radar
- Watchlist
- Library
- Settings

## Current Persistence Model

User state persists locally first in `localStorage` via the V2 schema and syncs to Supabase only when:
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are configured
- the user has an authenticated session

Persisted user state currently includes:
- onboarding completion
- reading/translation settings
- selected core domains
- followed topics
- muted topics
- saved items
- watchlist items
- notes
- lightweight feedback state

## Mock Content vs Real Persisted State

Mock/demo content:
- Today feed cards
- Radar content
- Watchlist fixture catalog
- Library fixture content
- detail payload content

Current source of truth for mock content:
- [src/mockData.ts](/Users/jasonfeng/Desktop/project3_signalDESK/signaldesk/src/mockData.ts)

Real persisted state:
- local `signaldesk_state_v2`
- Supabase `user_profiles`
- Supabase `user_topic_preferences`
- Supabase `user_saved_items`
- Supabase `user_watchlist_items`
- Supabase `user_notes`
- Supabase `user_feedback`

Supabase does not currently store live news/content items in the shipped app.

## Supabase Status

Phase 3 user-state sync is implemented and working locally:
- Supabase Auth is wired
- canonical topics are seeded
- user-state sync is local-first and debounced
- missing Supabase env vars fall back safely to local-only mode

Phase 4 content storage is not live yet:
- a draft content-schema migration now exists in the repo
- it has not been wired into the client feed
- it should not be treated as applied or production-ready ingestion

## Vercel / Environment Requirements

Current public client env:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

If these env vars are missing:
- the app must still boot
- the app must stay in local-only mode
- Settings should reflect that sync is not configured

Future server-side Phase 4 env should remain server-only:
- `SUPABASE_SERVICE_ROLE_KEY`
- AI provider keys
- paid-source API keys

These must never be exposed in the client bundle.

## What Comes Next

The next major phase is Phase 4:
- real content ingestion
- raw source storage
- deduplication
- structured intelligence signal generation
- bilingual summarization and translation
- eventual Today feed integration backed by real signals

Phase 4 should begin with RSS-first, server-side ingestion. It must preserve:
- the current SignalDesk visual style
- local-first user-state behavior
- working Supabase user-state sync
