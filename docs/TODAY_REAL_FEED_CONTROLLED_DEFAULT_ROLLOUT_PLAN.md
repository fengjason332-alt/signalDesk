# Today Real-Feed Controlled Default Rollout Plan

This document is maintained through Phase 4 Task 36. It is planning-only.

It does **not** switch Today to real content by default. It explains what must be true before a later explicit rollout task is allowed to change that default.

## Current Boundary

- Today remains mock by default.
- Real Today mode remains opt-in behind `VITE_USE_REAL_CONTENT_FEED=true`.
- Radar, Watchlist, and Library remain out of scope for this rollout.
- Scheduled AI enrichment remains out of scope.
- X/Grok remains planning-only.
- App Store, Capacitor, and iOS runtime work remain planning-only.

## What Evidence Is Required Before A Default Switch

Before any future default switch, we should have clear evidence that:

- real cards render with the existing style and remain readable
- Detail opens safely
- source provenance and safe source links are visible
- no fake full article body appears
- completed and non-empty enriched text wins when it should
- completed but blank enriched text falls back safely to deterministic preview text
- pending, failed, skipped, or not-requested enrichment still falls back safely to deterministic preview text
- AI/OpenAI filter behavior remains understandable
- `real_empty` is distinguishable from `filter_empty`
- broken preview reads fall back safely to mock
- Radar, Watchlist, and Library remain unchanged
- no secrets or raw internal errors appear in UI
- mobile quality is acceptable
- bilingual quality is acceptable
- data freshness is acceptable
- source coverage is acceptable
- preview read policies and anon reads are confirmed
- rollback to mock has already been tested

## What Exact Env Flag Would Change In The Future

In a future explicit rollout task, the client-side default would be changed by making the deployed frontend use:

- `VITE_USE_REAL_CONTENT_FEED=true`

Today should only move to that state after the evidence above is accepted.

## Rollback Plan

If the controlled default rollout looks unhealthy:

1. Set `VITE_USE_REAL_CONTENT_FEED=false`
2. Rebuild or redeploy the frontend
3. Open Today and confirm the mock feed is back
4. Confirm no real-feed-only empty or fallback confusion remains
5. Confirm Radar, Watchlist, and Library remain unchanged

This rollback should stay simple. If it is not simple, the rollout is not ready.

## What Should Be Monitored After A Future Rollout

After a future controlled default rollout, check:

- whether real cards continue to load
- whether cards are still recent enough to be useful
- whether the fallback-to-mock path still works safely
- whether filter behavior still feels normal
- whether source provenance still appears
- whether user-facing UI stays free of secrets and raw error text

## Why Radar, Watchlist, And Library Stay Out Of Scope

This rollout is only about Today.

Keeping the scope narrow makes it easier to answer one question clearly:

“Is Today real-feed mode safe and useful enough to become the default?”

If Radar, Watchlist, or Library also change at the same time, it becomes much harder to tell what caused a problem.

## Why Scheduled AI Enrichment Stays Out Of Scope

AI enrichment is still manual-only on purpose.

This rollout plan only checks whether Today can safely read real content by default. It does not widen the server-side AI boundary.

## Why X/Grok Stays Planning-Only

Future X or Grok work is still planning-only.

It has no runtime role in this rollout plan. Today default-rollout decisions should not depend on adding another source system first.

## Stop Criteria

Rollback immediately if any of these happen during a future rollout:

- Today becomes unreadable or confusing
- Detail looks misleading without a stored full article body
- source provenance disappears
- fallback to mock becomes unsafe or confusing
- secrets or raw internal errors appear in UI
- Radar, Watchlist, or Library change unexpectedly

## Success Criteria

A future controlled default rollout is acceptable only if:

- the pilot evidence is complete
- no critical evidence checks are failing
- the local evidence review result is `ready_for_controlled_default_rollout`
- rollback has been tested successfully
- the team still agrees to keep the scope limited to Today only

## Staged Rollout Plan

1. Local pilot
   - run the app locally with `VITE_USE_REAL_CONTENT_FEED=true`
   - collect evidence using the template and the local review command

2. Private deployed pilot
   - test the same behavior in a private non-production or private deployed environment
   - confirm preview reads, freshness, and rollback there too

3. Controlled default for myself only, if supported
   - if deployment controls allow it, enable the default only for a very small audience first
   - confirm that the rollback path still works quickly

4. Broader default only after evidence
   - widen the default only after earlier stages remain healthy

## Beginner-Friendly Reminder

This file is a **plan**, not a switch.

Tasks 25 through 36 are only about making the pilot evidence easier to collect, update, review, report, execute, and summarize while keeping the current safety boundaries intact. The app still stays mock-by-default after these tasks.
