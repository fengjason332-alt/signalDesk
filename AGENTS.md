# SignalDesk Agent Guidance

## Product Purpose

SignalDesk is a mobile-first PWA-style personal intelligence dashboard for tracking high-signal developments across focused strategic domains. It is Chinese-first, supports bilingual reading, and should feel like a calm personal intelligence desk rather than a trading app or generic news reader.

## Current Tech Stack

- React 19
- TypeScript
- Vite 6
- Tailwind CSS v4
- `motion` / `motion/react`
- local React state plus `AppContext`
- `localStorage` for immediate local-first persistence
- Supabase Auth + Postgres for optional Phase 3 user-state sync
- Supabase Edge Function + Postgres for Phase 4 content ingestion and persistence

## Current Development Phase

- Phase 1: stabilization completed
- Phase 1.5: topic personalization completed
- Phase 2: PWA install support completed
- Phase 3: local-first persistence with optional Supabase account sync for user state completed
- Phase 4 Tasks 0-12 plus Task 13-preflight, Tasks 13B-13E, and Tasks 14A-33: content pipeline, smoke-tested persistence, read-only Today preview, enrichment-ready schema/contracts, guarded DeepSeek dry-run/write integration, lease/retry hardening, explicit non-AI ingestion contract/observability work, bounded scheduled non-AI ingestion readiness, controlled Today real-feed rollout hardening, operator-safe recurring-ingestion automation, controlled real-feed QA/rollout-decision criteria, stronger feed-mode diagnostics and fallback verification, an explicit keep-mock-by-default default-switch decision, a target-environment pilot runbook, a local Today pilot preflight helper, a pilot-evidence recording template, local pilot-evidence review tooling, a stronger beginner-friendly pilot template plus rollout-readiness checks, a local evidence-starter command, Task 27 pilot execution/evidence UX improvements, Task 28 read-only runtime reason hardening, Task 29 doc consolidation, Task 30 local evidence update tooling, Task 31 local pilot reports, Task 32 operator doc alignment, Task 33 local pilot help output, and planning-only future X/Grok user-curated source work completed
- Next recommended task: Phase 4 Task 34 run the actual operator pilot, fill the local evidence file, review it locally, and only then consider any explicit default-switch task, not Radar or scheduled AI rollout

## Visual Design Rules

- preserve the current dark dotted-grid SignalDesk look
- keep cyan as the primary accent
- keep rounded dark cards and the mobile-first bottom navigation
- favor a calm, premium intelligence-reading experience
- do not redesign screens unless fixing a clear usability bug

## Product Rules

- Chinese-first reading experience is a core product constraint
- English source context should remain available where appropriate
- focus only on these domains:
  - AI
  - Crypto
  - Stocks
  - Robotics
  - Energy
  - US Policy
  - China Policy
  - Australia Policy
  - Macro
  - Geopolitics

## Data And State Rules

- persisted user state remains local-first
- preserve working Phase 3 user-state sync unless the current task explicitly changes it
- Phase 4 content ingestion and persistence are server-side only
- the frontend real-content path is read-only
- any future AI enrichment provider boundary must remain server-side only
- Today real-content preview is optional behind `VITE_USE_REAL_CONTENT_FEED=true`
- the default Today feed must remain mock until an explicit rollout task changes that
- Today real-feed mode should stay preview-safe and prefer completed enriched fields but fall back cleanly to deterministic fields
- Radar must remain mock for now
- Watchlist and Library should remain on current behavior for now
- do not fabricate full article bodies in Detail
- do not expose ingestion or AI secrets to the client
- do not commit `.env` or secrets
- no broader AI provider calls, scheduled AI jobs, or AI persistence expansion should be added unless the task explicitly approves them
- do not combine ingestion request fields and `aiEnrichment` in one endpoint request body
- do not assume scheduled ingestion is enabled unless `PHASE4_ENABLE_SCHEDULED_INGESTION=true`
- prefer an explicit `sourceIds` allowlist for recurring scheduled ingestion; use the repo helper in `src/lib/content/phase4ScheduledIngestionRequest.ts` when you need a bounded operator payload
- do not import server-only AI enrichment planner/provider modules into frontend runtime code

## Do Not Do Without Explicit Approval

- do not switch default Today to real content
- do not touch Radar real-data integration
- do not add AI summaries or translations
- do not add new client-side writes to Phase 4 content tables
- do not weaken write-mode guards for the Edge Function
- do not redesign the visual system

## Testing Commands

Run these from the repo root:

```bash
node --import tsx --test src/*.test.ts
npm run lint
npm run build
```

## Commit And PR Expectations

- keep commits scoped and readable
- mention persistence, schema, or preview-gate changes explicitly
- report verification results before claiming work is complete
