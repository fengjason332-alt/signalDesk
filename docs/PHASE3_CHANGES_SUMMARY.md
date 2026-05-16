# Phase 3 Changes Summary

This is the canonical Phase 3 status and handoff summary for SignalDesk.

## What changed

This document summarizes the Phase 3 Supabase persistence work that was implemented for SignalDesk's user-state sync layer.

It should be updated instead of creating a duplicate `PHASE_3_STATUS.md` file.

## High-level outcome

SignalDesk now supports:

- local-first persisted user state
- optional Supabase account sync for user state
- safe fallback to local-only mode when Supabase is not configured
- ongoing debounced remote sync after initial hydration
- replace-style collection sync so remote deletions do not reappear
- minimal Settings auth/sync UI
- durable repo documentation for the current product state

The product still keeps mock content in the frontend. This phase did not move content ingestion or live data into Supabase.

## Main implementation areas

### 1. Supabase schema and seeds

Added:

- `supabase/migrations/202605060001_phase3_user_state_schema.sql`
- `supabase/migrations/202605060002_seed_canonical_topics.sql`

What these do:

- create user-state tables for profiles, topic preferences, saved items, watchlist items, notes, and feedback
- add enums, indexes, triggers, and row-level security
- seed canonical topics from the current frontend topic registry

### 2. Merge and sync infrastructure

Added:

- `src/lib/persistence/mergeUserState.ts`
- `src/lib/persistence/userStateMapper.ts`
- `src/lib/persistence/supabaseUserStateStore.ts`
- `src/lib/persistence/syncDecisions.ts`
- `src/lib/persistence/useUserStateSync.ts`

What these do:

- merge local V2 state with remote Supabase state
- map between `PersistedUserStateV2` and normalized Supabase rows
- load and save remote user state explicitly
- upsert current local rows and delete remote rows that no longer exist locally
- keep the app local-first while syncing in the background when a session exists

### 3. Supabase client and auth shell

Added:

- `src/lib/supabase/client.ts`
- `src/lib/auth/AuthContext.tsx`

Updated:

- `src/main.tsx`
- `.env.example`
- `src/vite-env.d.ts`
- `package.json`
- `package-lock.json`

What changed:

- added Supabase client configuration
- added safe env handling so missing env vars do not crash the app
- added auth context for session loading, OTP sign-in, and sign-out
- app now runs in local-only mode when Supabase is not configured

### 4. App state integration

Updated:

- `src/AppContext.tsx`
- `src/storage.ts`
- `src/persistenceV2.test.ts`

What changed:

- wired AppContext to the ongoing sync controller
- preserved local `writePersistedStateV2(...)` behavior
- kept hydration and persistence compatible with the V2 local schema
- preserved feedback records in V2 hydration

### 5. Settings sync UI

Updated:

- `src/views/SettingsView.tsx`
- `src/AppContext.tsx`

Added:

- `src/appSyncState.test.ts`

What changed:

- added a minimal `Sync` section in Settings
- shows:
  - `Sync not configured`
  - loading state while auth session resolves
  - email sign-in form when signed out
  - signed-in email plus sign-out button when signed in
- added pending, status, and error states for auth actions

### 6. Tests

Added:

- `src/supabaseSchema.test.ts`
- `src/canonicalTopicsSeed.test.ts`
- `src/mergeUserState.test.ts`
- `src/supabaseUserState.test.ts`
- `src/userStateSync.test.ts`
- `src/supabaseClientConfig.test.ts`
- `src/appSyncState.test.ts`

What they cover:

- schema contract
- canonical topic seed alignment
- local/remote merge behavior
- remote load/save behavior
- delete cleanup behavior
- local-only Supabase fallback
- auth/sync UI state derivation

### 7. Product and repo docs

Added:

- `docs/PRD.md`

Updated:

- `AGENTS.md`
- `PROJECT_CONTEXT.md`
- `ROADMAP.md`

What changed:

- documented the current shipped product more accurately
- marked Phase 2 and Phase 3 as completed
- aligned all repo docs around:
  - dark dotted-grid / cyan / mobile-first framing
  - local-first persistence
  - optional Supabase account sync for user state
  - current non-goals such as no live market terminal behavior, no generic social feed behavior, and no backend content ingestion in the current shipped product

## Verification that was run

These checks were run during the rollout:

- targeted `node --import tsx --test ...` suites for schema, seeds, merge, sync, config, persistence, and app sync state
- full combined `node --import tsx --test ...` suite used during Task 7
- `npm run lint`
- `npm run build`
- documentation consistency `rg` checks for Task 8

Most recent full app verification during implementation:

- `60/60` tests passed
- `npm run lint` passed
- `npm run build` passed

Note:

- the Vite build still reports the existing chunk-size warning for the main JS bundle, but the build succeeds

## Important behavior changes

- user state now remains usable without sign-in
- when signed in, user state can sync to Supabase
- when signed out or unconfigured, the app stays local-only
- remote rows removed locally are deleted remotely on save, so they should not reappear on next sync

## Files most important to review

If you only want to inspect the core work, start with:

- `src/AppContext.tsx`
- `src/lib/persistence/useUserStateSync.ts`
- `src/lib/persistence/supabaseUserStateStore.ts`
- `src/lib/persistence/userStateMapper.ts`
- `supabase/migrations/202605060001_phase3_user_state_schema.sql`
- `src/views/SettingsView.tsx`
- `docs/PRD.md`

## Remaining follow-up ideas

- add UI/integration coverage for the new Settings sync panel
- consider reducing repeated product-state wording across docs over time
- later phases can build on this foundation for real content ingestion and richer sync conflict handling
