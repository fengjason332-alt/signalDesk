# Today Real-Feed Pilot Sanitized Summary

This document is a committed, sanitized summary of the bounded local Today real-feed pilot work completed through Phase 4 Task 36.

It does not include local evidence JSON, local Markdown reports, secret values, or private operator notes.

Today remains mock-by-default after this pilot summary.

## What Was Observed

- `npm run phase4:today-pilot-check` confirmed:
  - `mock_default` when `VITE_USE_REAL_CONTENT_FEED=false`
  - `pilot_ready` when the local real-feed env keys were present
- With real-feed enabled against the preview-safe Supabase environment, Today rendered a real OpenAI card with the existing UI style.
- Opening that real card led to a safe Detail view with visible provenance and a valid source link.
- Detail did not pretend to have a stored full article body.
- The sampled real card showed deterministic fallback behavior when richer enrichment content was not available yet.
- The AI filter matched the sampled real card.
- A nonmatching filter produced the normal filter-empty state.
- An explicitly broken client-side Supabase env override fell back safely to mock cards.
- Radar, Watchlist, and Library remained unchanged during the pilot checks.
- An explicit rollback path back to mock mode was verified locally.

## What Was Not Yet Observed

- A genuine `real_empty` state from zero preview-safe rows in the tested target environment.
- A real sampled card where completed and non-empty enriched content clearly won over deterministic fallback in the browser.
- Broader source-coverage confidence beyond a narrow preview sample.
- A dedicated mobile-device pilot pass.

## Current Recommendation

- Keep Today mock-by-default.
- Treat the current pilot as `continue_pilot`, not as rollout approval.
- Capture the still-missing evidence before any explicit default-switch task is considered.

## Boundaries Preserved

- No frontend AI calls were added.
- No frontend content writes were added.
- No scheduled AI enrichment was added.
- Radar, Watchlist, and Library remain out of scope for this rollout.
- No Capacitor, iOS, or App Store runtime work was introduced here.
