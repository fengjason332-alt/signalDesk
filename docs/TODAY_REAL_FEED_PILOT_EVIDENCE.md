# Today Real-Feed Pilot Evidence

This document is for Phase 4 Task 23. It prepares the target-environment Today real-feed pilot to be executed consistently and reviewed as evidence, without switching Today to real by default.

Today remains mock by default. No production default switch is made in this task.

## Pilot Objective

- gather bounded evidence about whether Today real-feed mode is safe and useful in a target environment
- confirm that real-feed behavior is understandable without weakening the mock fallback
- confirm that Detail remains honest about preview-only content
- confirm that a future default switch would be an explicit product decision, not an accidental side effect

## Required Environment

Client-side env:
- `VITE_USE_REAL_CONTENT_FEED=true`
- `VITE_SUPABASE_URL=<project url>`
- `VITE_SUPABASE_ANON_KEY=<publishable key>`

Local helper command:
- `npm run phase4:today-pilot-check`

Important boundaries:
- no `SUPABASE_SERVICE_ROLE_KEY` in the frontend
- no `DEEPSEEK_API_KEY` in the frontend
- no `PHASE4_WRITE_AUTH_TOKEN` in the frontend
- no frontend AI calls
- no frontend content writes

## Baseline Mock Check

1. Set `VITE_USE_REAL_CONTENT_FEED=false`.
2. Run `npm run phase4:today-pilot-check`.
3. Confirm the helper reports `mode: mock_default`.
4. Start the app and confirm Today shows the existing mock feed.
5. Confirm no real-feed-only empty state appears.

## Real-Feed Pilot Check

1. Set:
   - `VITE_USE_REAL_CONTENT_FEED=true`
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
2. Run `npm run phase4:today-pilot-check`.
3. Confirm the helper reports:
   - `mode: pilot_ready`
   - `shouldAttemptRealFeedRead: true`
4. Open Today and confirm real cards load with the existing style.

## Manual QA Checklist

- Confirm real cards render with the existing style.
- Confirm clicking a real card opens Detail safely.
- Confirm Detail never fabricates a full article body.
- Confirm source provenance and safe source links remain visible.
- Confirm completed and non-empty enriched text wins over deterministic preview text.
- Confirm deterministic fallback appears when enrichment is missing, pending, failed, skipped, not requested, or blank.
- Confirm AI/OpenAI filters still match real cards when applicable.
- Confirm nonmatching filters show the normal filter-empty state.
- Confirm `real_empty` is distinguishable from `filter_empty`.
- Confirm a broken preview read falls back safely to mock.
- Confirm Radar, Watchlist, and Library remain unchanged.
- Confirm no secrets or raw internal errors appear in UI.

## Rollback Checklist

1. Set `VITE_USE_REAL_CONTENT_FEED=false`.
2. Restart locally with `npm run dev`, or rebuild/redeploy the target environment.
3. Open Today and confirm the mock feed is back.
4. Confirm no Supabase preview read is attempted in mock mode.
5. Confirm Radar, Watchlist, and Library remain unchanged.

## Pass Criteria

- real cards are readable and useful
- Detail opens safely
- no fake full article body appears
- enriched text wins only when completed and non-empty
- deterministic fallback remains useful when enrichment is missing
- fallback to mock remains safe and understandable
- the app stays useful even when real rows are sparse

## What Evidence Should Be Collected

- screenshots or notes showing real-card rendering in Today
- one safe Detail example with provenance visible
- one example where completed enriched text wins
- one example where deterministic fallback is used
- one example of AI/OpenAI filter behavior
- one example of nonmatching filter-empty behavior
- one example of `real_empty` if available
- one example or note proving fallback to mock remains safe
- one note confirming rollback to mock succeeded

## What Would Justify A Future Default Switch

- multiple stable sources are producing usable recent signals
- real cards are consistently readable and useful
- Detail is safe and honest about preview-only limits
- source provenance is visible
- preview-read policies and anon reads are reliable in the target environment
- AI enrichment is optional and not required for card rendering
- rollback has been tested and remains simple

## What Would Block A Default Switch

- preview-read fallback is unreliable or confusing
- real cards are sparse, stale, or low-value
- Detail appears misleading without a stored full body
- source provenance disappears or becomes unclear
- secrets or raw internals appear in UI
- the pilot would require frontend writes or frontend AI calls
- Radar, Watchlist, or Library become coupled to the Today rollout unexpectedly
