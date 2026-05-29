# X Grok User Curated Source Plan

This document is planning only. It does not implement runtime X API calls, Grok or xAI runtime calls, frontend source writes, or any default Today rollout change.

## 1. Product Rationale

- X is valuable because many AI, crypto, market, founder, policy, and expert signals appear there before traditional media.
- SignalDesk should not clone a Twitter/X timeline.
- SignalDesk should let users define watched accounts and topics, then convert high-noise updates into strategic signals.

## 2. User Facing Concept

- Users can create custom X watchlists.
- Each watchlist can contain:
  - X accounts or handles
  - keywords
  - excluded keywords
  - topic labels
  - language preference
  - source reliability preference
  - minimum engagement threshold
  - optional official accounts only mode
- Example watchlists:
  - AI Founders
  - Crypto Market Structure
  - US Policy
  - China Policy
  - Robotics
  - Energy
  - My Dad's Watchlist
- Users can choose whether X-derived signals appear in Today, Watchlist, or only a separate preview queue.

## 3. Architecture Proposal

- The X/Grok connector should be server-side only.
- Proposed future flow:
  - `user_x_watchlists`
  - `user_x_watchlist_sources`
  - `raw_x_items`
  - `candidate_signals`
  - `signal_source_items`
  - `intelligence_signals`
  - optional AI enrichment
- X source provenance must be preserved.
- Original post URL should be stored when allowed.
- Quote, repost, and reply context should be tracked separately when possible.

## 4. X API vs Grok xAI Boundary

- X API should be treated as the raw source fetch layer.
- Grok/xAI should be treated as analysis/enrichment/search support, not the only source of truth.
- Grok should not be allowed to invent source posts.
- Any Grok-produced claim must link back to source URLs or be labeled as unverified analysis.
- X API credentials and Grok/xAI keys must remain server-side only.

## 5. User Customization Model

- Future schema ideas only, no migration in this task:
  - `user_watchlists`
  - `user_watchlist_sources`
  - `user_watchlist_keywords`
  - `user_watchlist_exclusions`
  - `user_source_preferences`
- Support per-user allowlists.
- Support global trusted source presets.
- Support user-created custom source bundles.
- Support turning a watchlist on or off.
- Support per-watchlist cadence and max items.
- Support preview only mode before writing to `intelligence_signals`.

## 6. Quality And Safety

- Avoid unbounded X crawling.
- Start with allowlisted accounts only.
- Label rumors and unconfirmed claims.
- Detect duplicate claims across tweets, quotes, reposts, and news articles.
- Preserve source reliability tier.
- Avoid over-weighting viral posts only because they have engagement.
- Record why an X post became a candidate signal.
- Do not fabricate missing context.
- Do not show private or user-specific X data unless explicitly authorized by the user in a future implementation.

## 7. Rate Limits And Cost Controls

- Bounded accounts per watchlist.
- Bounded watchlists per run.
- Bounded posts per account or search.
- Cache fetched posts.
- Deduplicate by post ID and canonical URL.
- Use dry-run before writes.
- Add diagnostics for fetched, skipped, duplicate, and failed items.
- Never schedule high-frequency X/Grok polling by default.

## 8. Rollout Plan

- Phase 5B: planning document only
- Phase 5C: schema design for user-curated source lists
- Phase 5D: server-side dry-run connector using mocked X data
- Phase 5E: limited real X API allowlist dry-run
- Phase 5F: optional Grok enrichment dry-run
- Phase 5G: write `raw_x_items` and `candidate_signals` in non-production
- Phase 5H: controlled Today inclusion for selected watchlists
- Later: Radar integration only after Today and Watchlist behavior is stable

## 9. Non Goals

- No scraping.
- No frontend X API calls.
- No frontend Grok calls.
- No secrets in frontend.
- No automatic public timeline clone.
- No scheduled Grok enrichment by default.
- No default Today inclusion.
- No Radar real-data integration yet.
- No App Store runtime work in this task.

## 10. Product Note

- This future feature should support the original SignalDesk purpose:
  - reduce information overload
  - help the user and family follow fast-moving domains
  - convert noisy updates into strategic, bilingual, source-grounded signals
  - allow personal source customization without losing quality control
