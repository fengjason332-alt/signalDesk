# SignalDesk Codex Handoff

## Latest Handoff: 2026-05-21

This handoff supersedes older Phase 4 notes. Use this section first before touching code.

### Current Working State

- SignalDesk is no longer pure mock-only
- Phase 3 user-state sync works and must be preserved
- Phase 4 content pipeline exists and has been smoke-tested successfully
- the active preview environment already has:
  - Phase 4 schema applied
  - `content_sources` smoke seed applied
  - readiness checks passed
  - preview read policies applied
  - deployed `phase4-dry-run` Edge Function
  - successful live RSS dry-run and write-mode smoke tests
  - real rows in Phase 4 content tables
- Today can preview real Supabase content when:
  - `VITE_USE_REAL_CONTENT_FEED=true`
  - `VITE_SUPABASE_URL` is set
  - `VITE_SUPABASE_ANON_KEY` is set
  - `supabase/manual/phase4_preview_read_policies.sql` has been applied
- clicking a real content card opens Detail safely
- Detail shows provenance and safe source links when available
- full article body is not stored yet and must not be faked
- Radar remains mock
- Watchlist and Library remain on mock or existing behavior
- the default Today feed remains mock when `VITE_USE_REAL_CONTENT_FEED=false`
- the frontend real-content path is read-only
- no AI summary exists yet
- no AI translation exists yet
- no AI provider calls exist yet
- Task 13-preflight adds server-only no-op AI enrichment contracts and planning helpers only

### Current Test Status

Latest required verification for this repo should remain:

```bash
node --import tsx --test src/*.test.ts
npm run lint
npm run build
```

### Read First

Before changing code, read:
- [AGENTS.md](/Users/jasonfeng/Desktop/project3_signalDESK/signaldesk/AGENTS.md)
- [PROJECT_CONTEXT.md](/Users/jasonfeng/Desktop/project3_signalDESK/signaldesk/PROJECT_CONTEXT.md)
- [ROADMAP.md](/Users/jasonfeng/Desktop/project3_signalDESK/signaldesk/ROADMAP.md)
- [README.md](/Users/jasonfeng/Desktop/project3_signalDESK/signaldesk/README.md)
- [docs/PHASE_4_PLAN.md](/Users/jasonfeng/Desktop/project3_signalDESK/signaldesk/docs/PHASE_4_PLAN.md)
- [docs/PHASE_4_MANUAL_QA.md](/Users/jasonfeng/Desktop/project3_signalDESK/signaldesk/docs/PHASE_4_MANUAL_QA.md)

### Required Client Env

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_USE_REAL_CONTENT_FEED=false` by default

Enable preview only when intentionally testing:
- `VITE_USE_REAL_CONTENT_FEED=true`

### Required Server-Side Env Concepts

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `PHASE4_ENABLE_CONTENT_WRITES`
- `PHASE4_WRITE_AUTH_TOKEN`
- `PHASE4_ENABLE_LIVE_FETCH`
- `PHASE4_ENABLE_AI_ENRICHMENT`
- `PHASE4_AI_PROVIDER`
- `PHASE4_AI_API_KEY`
- `PHASE4_AI_MODEL`
- `PHASE4_AI_MAX_SIGNALS_PER_RUN`

Do not commit any of these secrets or real values.

### Supabase SQL Files To Know

- `supabase/migrations/202605170001_phase4_content_foundation.sql`
- `supabase/migrations/202605210001_phase4_enrichment_ready.sql`
- `supabase/manual/phase4_content_sources_smoke_seed.sql`
- `supabase/manual/phase4_content_readiness_checks.sql`
- `supabase/manual/phase4_preview_read_policies.sql`

### Manual QA Checklist

1. Confirm the Phase 4 migration is applied in the target non-production project
2. Confirm `content_sources` smoke seed has been applied
3. Run readiness checks
4. Confirm preview read policies are applied
5. Deploy `phase4-dry-run`
6. Run `liveFetch: true` plus `dryRun: true`
7. Run a guarded write-mode smoke test with `dryRun: false`
8. Verify:
   - ingestion runs increment
   - duplicate reruns do not duplicate raw items or candidate signals
   - `signal_topics` can populate for clearly mappable items
9. Enable `VITE_USE_REAL_CONTENT_FEED=true` locally
10. Verify Today preview and Detail provenance
11. Set `VITE_USE_REAL_CONTENT_FEED=false` again and confirm Today returns to mock

### Boundaries For The Next Session

- Do not switch default Today feed yet.
- Do not touch Radar real-data integration yet.
- Do not add AI calls yet.
- Do not commit `.env` or secrets.
- Do not add frontend writes to Phase 4 content tables.
- Do not weaken write-mode guardrails for the Edge Function.
- Do not fabricate full article bodies in Detail.

### Latest Task 12 Status

- additive migration now exists for optional enrichment-ready `intelligence_signals` fields:
  - `supabase/migrations/202605210001_phase4_enrichment_ready.sql`
- frontend and shared TS contracts now understand optional enrichment status/source fields
- the Today preview adapter now prefers enriched summary / why-it-matters fields only when present and marked completed
- the Today preview adapter falls back to the legacy pre-Task-12 query if the active preview environment has not applied the new migration yet
- Detail can show a subtle non-AI enrichment placeholder when richer summary text has not been generated yet
- the client real-content path remains read-only
- Today still remains mock by default
- Radar still remains mock
- no AI provider calls, SDKs, keys, or frontend writes were added

### Latest Task 13-preflight Status

- future AI enrichment has been planned as a server-side-only concern
- provider-neutral no-op interfaces now exist under `supabase/functions/_shared`:
  - `enrichmentProvider.ts`
  - `enrichmentPlanner.ts`
  - `enrichmentStore.ts`
- deterministic job-planning helpers now define:
  - dry-run as the safe default
  - write gating
  - manual-vs-scheduled trigger intent
  - max batch size and input budget defaults
  - retry backoff and enrichment-version boundaries
- future `enrichment_error` usage must stay sanitized and operator-safe because preview tables are browser-readable through read-only policies
- no AI SDKs, provider fetches, API keys, scheduled jobs, or frontend AI imports were added
- the frontend real-content path remains read-only and unchanged by default

### Exact Next Recommended Task

Phase 4 Task 13 actual implementation:
- guarded AI enrichment dry-run implementation on the server side
- keep the real-content path read-only on the client
- keep Today mock by default
- keep Radar on mock
- require explicit server-side controls before any AI integration
- do not jump to scheduled enrichment until retry/lease bookkeeping is designed
