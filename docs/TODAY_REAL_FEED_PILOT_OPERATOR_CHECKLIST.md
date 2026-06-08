# Today Real-Feed Pilot Operator Checklist

This document is maintained through Phase 4 Task 29.

It is a beginner-friendly manual checklist for running the Today real-feed pilot without changing the default product behavior.

Today still remains mock-by-default.

## Safety First

- Do not commit local/private evidence files.
- Do not upload or share secrets.
- Do not paste `VITE_SUPABASE_ANON_KEY`, service-role keys, DeepSeek keys, or write tokens into screenshots or notes.
- Do not change Radar, Watchlist, or Library during this pilot.
- Do not turn this into a default-rollout task yet.

## Before You Start

You will use:
- `npm run phase4:today-pilot-check`
- `npm run phase4:create-today-evidence`
- optional: `npm run phase4:create-today-evidence -- --out docs/evidence/today-real-feed-pilot-evidence.private.json`
- `npm run dev`
- `npm run phase4:today-evidence-review -- docs/evidence/today-real-feed-pilot-evidence.local.json`

Your local evidence file should live at:
- `docs/evidence/today-real-feed-pilot-evidence.local.json`

That file is meant to stay local and should not be committed.

## Step-By-Step Checklist

1. Start from mock mode.
2. Set `VITE_USE_REAL_CONTENT_FEED=false`.
3. Run `npm run phase4:today-pilot-check`.
4. Confirm the helper reports `mode: mock_default`.
5. Run `npm run phase4:create-today-evidence`.
6. Confirm `docs/evidence/today-real-feed-pilot-evidence.local.json` now exists.
7. Enable real-feed env:
   - `VITE_USE_REAL_CONTENT_FEED=true`
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
8. Run `npm run phase4:today-pilot-check` again.
9. Confirm the helper reports `mode: pilot_ready`.
10. Start the app with `npm run dev`.
11. Open Today.
12. Check whether real cards appear with the existing style.
13. Open one real card.
14. Check that Detail opens safely.
15. Check source/provenance visibility.
16. Check that no fake full article body appears.
17. Check filter behavior:
   - AI/OpenAI filter
   - nonmatching filter
18. Check empty states:
   - `real_empty` if available
   - normal filter-empty state
19. Check enriched-vs-deterministic fallback:
   - completed and non-empty enriched text should win
   - pending/failed/skipped/not-requested/blank enrichment should fall back safely
20. Test rollback:
   - set `VITE_USE_REAL_CONTENT_FEED=false`
   - restart or rebuild as needed
   - confirm Today is back on mock
21. Fill the evidence JSON while testing.
22. Run:

```bash
npm run phase4:today-evidence-review -- docs/evidence/today-real-feed-pilot-evidence.local.json
```

23. Record the recommendation:
   - `continue_pilot`
   - `keep_mock_default`
   - `ready_for_controlled_default_rollout`
   - `blocked`

## What To Check In The App

- Today real cards render with the existing style.
- Detail is safe.
- Source/provenance area is visible.
- Safe source links render when available.
- No fake full article body appears.
- Completed enriched text wins only when non-empty.
- Deterministic fallback still works when enrichment is incomplete.
- AI/OpenAI filter still matches the expected real cards.
- Nonmatching filters show the normal empty state.
- `real_empty` is different from `filter_empty`.
- Broken preview reads fall back safely to mock.
- No secrets or raw internal errors appear in UI.
- Radar, Watchlist, and Library remain unchanged.

## What Screenshots Or Notes Should I Collect

- Today showing real cards
- one Detail page for a real card
- the source/provenance area
- filter behavior
- empty state if available
- the terminal output from the evidence-review command
- short notes about mobile quality
- short notes about bilingual quality

## Privacy Reminder

- Do not upload or share secrets.
- Do not include publishable keys, service-role keys, DeepSeek keys, or write tokens in screenshots.
- Do not commit your local/private evidence files.

## Rollback Reminder

If anything looks unsafe or confusing:
1. Set `VITE_USE_REAL_CONTENT_FEED=false`
2. Restart locally with `npm run dev`, or rebuild/redeploy
3. Open Today
4. Confirm the mock feed is back
