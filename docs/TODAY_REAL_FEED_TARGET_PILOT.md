# Today Real-Feed Target Pilot

This document is for a target-environment pilot only. It does not switch Today to real content by default.

Today remains mock by default. This pilot exists to help an operator validate whether a real-feed rollout is safe in a specific environment before any later explicit default-switch task.

## Purpose

- validate real Today cards against real Supabase preview data
- confirm that Detail opens safely
- confirm enriched text wins only when completed and non-empty
- confirm deterministic fallback remains useful when enrichment is pending, failed, skipped, not requested, or blank
- confirm rollback to mock is immediate and safe

## Required Environment

Client-side pilot env:
- `VITE_USE_REAL_CONTENT_FEED=true`
- `VITE_SUPABASE_URL=<project url>`
- `VITE_SUPABASE_ANON_KEY=<publishable key>`

Local helper command:
- `npm run phase4:today-pilot-check`
- This helper is local-only. It does not call Supabase, does not call AI providers, and does not write content.
- Record pilot outcomes in `docs/TODAY_REAL_FEED_PILOT_EVIDENCE.md`.

Important boundaries:
- no `SUPABASE_SERVICE_ROLE_KEY` in the frontend
- no `DEEPSEEK_API_KEY` in the frontend
- no `PHASE4_WRITE_AUTH_TOKEN` in the frontend
- No frontend writes
- No frontend AI calls

To confirm the normal default remains intact:
- set `VITE_USE_REAL_CONTENT_FEED=false`
- restart or rebuild/redeploy as appropriate

## Prerequisites

- `supabase/manual/phase4_preview_read_policies.sql` is applied
- preview-safe rows exist in `public.intelligence_signals`
- recent non-AI ingestion runs succeeded
- Today remains mock by default before the pilot begins
- Radar, Watchlist, and Library remain unchanged

## Pilot Steps

### 1. Confirm Mock Baseline

1. Set `VITE_USE_REAL_CONTENT_FEED=false`.
2. Run `npm run phase4:today-pilot-check`.
3. Confirm the helper reports `mode: mock_default`.
4. Start the app with `npm run dev`, or rebuild/redeploy if using a deployed target.
5. Open Today.
6. Confirm Today displays the mock feed.
7. Confirm no real-feed-only empty state appears.

### 2. Enable Real Today Mode

1. Set:
   - `VITE_USE_REAL_CONTENT_FEED=true`
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
2. Run `npm run phase4:today-pilot-check`.
3. Confirm the helper reports `mode: pilot_ready`.
4. Start the app with `npm run dev`, or rebuild/redeploy if the target environment needs a build artifact refresh.
5. Open Today.
6. Start recording observations in `docs/TODAY_REAL_FEED_PILOT_EVIDENCE.md`.

Expected:
- real cards render with the existing style
- no crash UI
- no secrets or raw internal errors appear in UI text

### 3. Verify Cards And Detail

1. Open at least one real card.
2. Confirm Detail opens safely.
3. Confirm source provenance is visible.
4. Confirm safe source links render when available.
5. Confirm Detail never fabricates a full article body.

### 4. Verify Enriched vs Deterministic Priority

1. Find a signal where enrichment is completed and non-empty.
2. Confirm completed and non-empty enriched summary text is shown first.
3. Confirm completed and non-empty enriched why-it-matters text is shown first.
4. Find a signal where enrichment is pending, failed, skipped, not requested, or blank.
5. Confirm deterministic preview summary remains visible.
6. Confirm deterministic why-it-matters remains visible.

### 5. Verify Filter Behavior

1. Select the AI or OpenAI-related filter.
2. Confirm AI/OpenAI real cards are matched.
3. Select a nonmatching filter.
4. Confirm the normal filter-empty state appears.
5. Confirm real_empty is distinct from filter_empty:
   - `real_empty` means the real preview query returned zero preview-safe rows
   - `filter_empty` means real rows exist, but the current filter excludes them

### 6. Verify Fallback To Mock

1. Intentionally break the Supabase preview read in the pilot environment:
   - use an invalid publishable key in a non-production environment, or
   - remove preview read access in a non-production environment, or
   - point the client env at a project that lacks the preview-read setup
2. Run `npm run phase4:today-pilot-check` and confirm the helper reports `mode: pilot_misconfigured` if the env is now incomplete.
3. Reload Today.
4. Confirm fallback to mock occurs safely.
5. Confirm the app does not crash.
6. Confirm no raw secret values or stack traces appear in user-facing UI.

## Success Criteria

- real cards are readable and useful
- Detail opens safely for real cards
- source provenance is visible
- completed and non-empty enrichment wins over deterministic preview text
- deterministic fallback works when enrichment is pending, failed, skipped, not requested, or blank
- AI/OpenAI filter matches real cards
- real_empty is distinct from filter_empty
- fallback to mock is safe and understandable
- Today remains mock by default outside the pilot
- Radar, Watchlist, and Library remain unchanged

## Stop Criteria

Stop the pilot and revert to mock immediately if any of these happen:
- Today crashes or becomes unreadable
- Detail pretends to have a full article body that is not actually stored
- provenance disappears unexpectedly
- a real-feed read failure does not fall back safely to mock
- user-facing UI shows raw internal errors
- the pilot requires frontend secrets or frontend writes
- Radar, Watchlist, or Library behavior changes unexpectedly

## Rollback

1. Set `VITE_USE_REAL_CONTENT_FEED=false`.
2. Restart locally with `npm run dev`, or rebuild/redeploy the target environment.
3. Open Today and confirm the mock feed is back.
4. Confirm no Supabase preview read is attempted in mock mode.
5. Confirm Radar, Watchlist, and Library remain unchanged.

## Known Non-Goals

- Do not switch Today to real-by-default in this pilot.
- Do not add scheduled AI enrichment.
- Do not add frontend AI calls.
- Do not add frontend content writes.
- Do not add X/Grok runtime.
- Do not add App Store or Capacitor runtime changes.
