# Today Real-Feed Pilot Operator Checklist

This document is maintained through Phase 4 Task 39.

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
- `npm run phase4:update-today-evidence -- docs/evidence/today-real-feed-pilot-evidence.local.json --real-cards-rendered true`
- `npm run dev`
- `npm run phase4:today-evidence-review -- docs/evidence/today-real-feed-pilot-evidence.local.json`
- `npm run phase4:today-evidence-next -- docs/evidence/today-real-feed-pilot-evidence.local.json`
- `npm run phase4:today-pilot-report -- docs/evidence/today-real-feed-pilot-evidence.local.json --out docs/evidence/today-real-feed-pilot-report.local.md`
- `npm run phase4:today-help`
- create/update only accept gitignored `docs/evidence/*.local.*` or `docs/evidence/*.private.*` paths by default
- review/next/report also accept the shipped `docs/examples/today-real-feed-pilot-evidence*.json` files for local practice
- use `--allow-any-path` only when you intentionally need to bypass those local-only guards

Your local evidence file should live at:
- `docs/evidence/today-real-feed-pilot-evidence.local.json`

That file is meant to stay local and should not be committed.
Keep updating that same local/private evidence file across multiple pilot sessions instead of creating a tracked history of partial evidence files.

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
   - this only proves the local env keys are present
   - preview-read policy failures or wrong-project wiring can still show up later in-browser as `fallback_to_mock` or `real_empty`
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
22. If you do not want to hand-edit JSON, use `npm run phase4:update-today-evidence -- docs/evidence/today-real-feed-pilot-evidence.local.json ...`.
   - it now covers the common pilot fields such as observed feed mode, detail count, env flags, sample cards, fallback checks, rollback checks, freshness notes, source-coverage notes, and final recommendation
   - hand-edit JSON only if you need a rarer field that is still not exposed as a flag
23. Run:

```bash
npm run phase4:today-evidence-review -- docs/evidence/today-real-feed-pilot-evidence.local.json
```

24. If the result is still `continue_pilot`, run:

```bash
npm run phase4:today-evidence-next -- docs/evidence/today-real-feed-pilot-evidence.local.json
```

25. Follow the printed next target:
   - genuine `real_empty`
   - completed non-empty enriched-content win
   - completed-but-blank enrichment fallback
   - mobile quality
   - freshness
   - source coverage
26. Generate a local Markdown report:

```bash
npm run phase4:today-pilot-report -- docs/evidence/today-real-feed-pilot-evidence.local.json --out docs/evidence/today-real-feed-pilot-report.local.md
```

27. Record the recommendation:
   - `continue_pilot`
   - `keep_mock_default`
   - `ready_for_controlled_default_rollout`
   - `blocked`

## Exact Field Mapping For The Current Missing Evidence

- genuine `real_empty`
  - `observedFeedMode=real_empty`
  - `realEmptyDistinctFromFilterEmpty=true`
  - add one `emptyStateChecks` note
- completed non-empty enriched-content win
  - `completedNonEmptyEnrichedContentObserved=true`
  - `completedNonEmptyEnrichedContentWon=true`
  - add one `enrichedSummaryCases` note
- completed-but-blank enrichment fallback
  - `completedBlankEnrichedContentFallbackWorked=true`
  - add one `deterministicFallbackCases` note
- mobile quality
  - `mobileQualityAcceptable=true`
  - add one `mobileQualityNotes` note
- freshness
  - `dataFreshnessAcceptable=true`
  - add one `freshnessNotes` note
- source coverage
  - `sourceCoverageAcceptable=true`
  - update `sourceCount`
  - add one `sourceCoverageNotes` note

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
- Do not commit your local/private pilot report files either.

## Rollback Reminder

If anything looks unsafe or confusing:
1. Set `VITE_USE_REAL_CONTENT_FEED=false`
2. Restart locally with `npm run dev`, or rebuild/redeploy
3. Open Today
4. Confirm the mock feed is back
