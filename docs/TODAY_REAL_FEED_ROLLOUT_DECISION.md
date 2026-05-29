# Today Real-Feed Rollout Decision

This document is for Task 17 only. It does not switch Today to real content by default.

Today must remain mock by default until the criteria below are met and the team explicitly approves a later rollout task.

## Current Boundary

- `VITE_USE_REAL_CONTENT_FEED=false` remains the safe default.
- Real Today mode is opt-in for local QA only.
- Radar, Watchlist, and Library remain unchanged.
- AI enrichment remains optional and manual-only.
- No frontend AI calls or frontend content writes are allowed.

## Local Env Required For Real Today QA

- `VITE_USE_REAL_CONTENT_FEED=true`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Return to mock:
- `VITE_USE_REAL_CONTENT_FEED=false`

## Controlled QA Checklist

1. Start the app with:
   - `VITE_USE_REAL_CONTENT_FEED=true`
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
2. Confirm Today renders real cards with the existing visual style.
3. Click a real card and confirm Detail opens safely.
4. Confirm Completed enriched summary is preferred when present.
5. Confirm Deterministic preview summary is used when enrichment is missing, pending, failed, or incomplete.
6. Confirm the AI or OpenAI topic filter matches real AI cards.
7. Confirm nonmatching filters show the normal filter-empty state instead of looking broken.
8. Confirm zero real rows show the explicit real-empty state.
9. Break or remove preview reads intentionally and confirm Today uses fallback to mock safely.
10. Confirm Detail never fabricates a full article body when full body content is unavailable.
11. Confirm source provenance and safe source links remain visible.
12. Confirm Radar, Watchlist, and Library remain unchanged.
13. Confirm no secrets or raw internal errors appear in UI text.

## Product Criteria Before Real-By-Default

- At least a few stable sources are producing usable signals repeatedly.
- Real cards are readable, useful, and not obviously prototype-only.
- Empty states are understandable:
  - real empty
  - filter empty
  - fallback to mock
- Detail does not pretend to have a full article body if one is not stored.
- Source provenance is visible and source links are safe.
- Real cards remain valuable even when AI enrichment is absent.

## Technical Criteria Before Real-By-Default

- Preview read policies applied.
- Supabase anon read works.
- Ingestion has recent successful runs.
- Today real-feed preview still falls back safely to mock on read failure.
- AI enrichment is optional, not required for card rendering.
- Existing mock fallback remains available until rollout is deliberately changed.

## Rollback Plan

1. Set `VITE_USE_REAL_CONTENT_FEED=false`.
2. Rebuild/redeploy the frontend.
3. Confirm Today returns to mock.
4. Confirm Radar, Watchlist, and Library remain unchanged.

## Decision Notes

- This is a QA and rollout-decision document only.
- It does not approve switching Today to real feed by default.
- It does not approve Radar, Watchlist, or Library real-data rollout.
- It does not change any server-side AI scheduling boundary.
