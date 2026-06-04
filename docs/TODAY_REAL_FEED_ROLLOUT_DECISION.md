# Today Real-Feed Rollout Decision

This document is maintained through Task 20. It does not switch Today to real content by default.

Today must remain mock by default until the criteria below are met and the team explicitly approves a later rollout task.

## Task 20 Decision

Task 20 keeps Today mock by default.

Why:
- production-like validation is still required for preview-read availability and rollback behavior
- current repo tests prove the code path is safe, but they do not prove every deployed environment has recent healthy data
- the fallback path is ready, but the default switch should remain a separate explicit rollout task after target-environment evidence is collected

This means:
- `VITE_USE_REAL_CONTENT_FEED=false` remains the default
- `VITE_USE_REAL_CONTENT_FEED=true` remains the opt-in QA path
- any future real-by-default change still needs an explicit rollout task
- Task 21 adds `docs/TODAY_REAL_FEED_TARGET_PILOT.md` as the bounded pilot runbook for gathering that evidence
- Task 22 adds `npm run phase4:today-pilot-check` so operators can confirm the local env contract before opening the app
- Task 23 adds `docs/TODAY_REAL_FEED_PILOT_EVIDENCE.md` so the pilot outcome can be recorded against explicit pass, blocker, and rollback criteria
- Task 24 adds `npm run phase4:today-evidence-review` plus local example JSON files so pilot evidence can be reviewed conservatively before any future default-switch preparation
- Task 25 adds `docs/TODAY_REAL_FEED_CONTROLLED_DEFAULT_ROLLOUT_PLAN.md` plus a beginner-friendly evidence template so the next rollout step can stay explicit and reversible
- Task 26 adds `npm run phase4:create-today-evidence` plus `docs/TODAY_REAL_FEED_PILOT_OPERATOR_CHECKLIST.md` so a beginner operator can create a local evidence file and run the pilot more safely

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

Prerequisites:
- `supabase/manual/phase4_preview_read_policies.sql` is already applied.
- at least one preview-safe `intelligence_signals` row exists for the chosen environment.

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
14. Set `VITE_USE_REAL_CONTENT_FEED=false`, rebuild, and confirm Today returns to mock.

## Product Criteria Before Real-By-Default

- data freshness acceptable
- enough source coverage
- At least a few stable sources are producing usable signals repeatedly.
- Real cards are readable, useful, and not obviously prototype-only.
- Empty states are understandable:
  - real empty
  - filter empty
  - fallback to mock
- Detail does not pretend to have a full article body if one is not stored.
- Source provenance is visible and source links are safe.
- Real cards remain valuable even when AI enrichment is absent.
- Chinese or bilingual display is acceptable on real cards and Detail.
- mobile viewport quality remains acceptable.
- no Radar, Watchlist, or Library real-data coupling is introduced by the Today rollout.

## Technical Criteria Before Real-By-Default

- production-like validation is still required
- Preview read policies applied and RLS or read-policy assumptions confirmed.
- Supabase anon read works.
- Ingestion has recent successful runs.
- fallback path tested
- Today real-feed preview still falls back safely to mock on read failure.
- AI enrichment is optional, not required for card rendering.
- Existing mock fallback remains available until rollout is deliberately changed.
- no secret exposure
- no frontend writes
- manual rollback tested
- the app remains useful when enrichment is missing, pending, failed, or incomplete.

## Rollback Plan

1. Set `VITE_USE_REAL_CONTENT_FEED=false`.
2. Rebuild/redeploy the frontend.
3. Confirm Today returns to mock.
4. Confirm Radar, Watchlist, and Library remain unchanged.

## Decision Notes

- This is a QA and rollout-decision document only.
- It does not approve switching Today to real feed by default.
- Task 20 decision: keep Today mock by default until target-environment rollout validation is complete.
- It does not approve Radar, Watchlist, or Library real-data rollout.
- It does not change any server-side AI scheduling boundary.
- The next task should be an explicit rollout task, not an implicit default switch.
