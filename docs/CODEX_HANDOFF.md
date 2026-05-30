# SignalDesk Codex Handoff

## Latest Handoff: 2026-05-30

This handoff supersedes older Phase 4 notes. Use this section first before touching code.

### Current Working State

- SignalDesk now includes a real-content preview path, but the default product experience is still mock-first
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
- no frontend AI calls are allowed
- no frontend writes to Phase 4 content tables are allowed
- the default Today feed remains mock when `VITE_USE_REAL_CONTENT_FEED=false`
- Today remains mock by default
- the frontend real-content path is read-only
- AI enrichment can now populate summary and translation fields server-side, but it is still optional and not part of the default product experience
- DeepSeek is now wired as the first optional server-side provider
- Task 13C adds a guarded manual-only AI write mode
- Task 13D and Task 13E add additive claim / retry hardening plus sequential one-to-three signal manual batch support
- Task 14A-22 add a single-intent non-AI ingestion contract, mixed-request rejection, explicit requested/resolved source-id diagnostics, bounded scheduled-ingestion enablement, confirmation that AI enrichment still rejects scheduled trigger mode, a controlled Today real-feed rollout path that remains mock-by-default, a dedicated rollout-decision checklist before any default-feed change, stronger real-feed diagnostics and fallback QA hardening, a Task 20 keep-mock-by-default decision with explicit rollback guidance, a Task 21 target-environment pilot runbook, a Task 22 local pilot preflight helper, and a planning-only future X or Grok user-curated source path
- AI writes remain limited to enrichment-ready columns plus additive claim/retry bookkeeping columns on `public.intelligence_signals`
- scheduled non-AI ingestion now exists behind `PHASE4_ENABLE_SCHEDULED_INGESTION=true`
- scheduled non-AI ingestion remains disabled by default, keeps AI out of the path entirely, and applies hard caps for:
  - max `4` sources per run
  - max `3` items per source
  - max `12` total candidate items
  - max `12` candidate signals
- Task 16 now adds an operator-safe recurring request helper and runbook:
  - `src/lib/content/phase4ScheduledIngestionRequest.ts`
  - explicit `sourceIds` allowlist preferred for recurring runs
  - recommended starting cadence: every `30` or `60` minutes
  - rollback is still just `PHASE4_ENABLE_SCHEDULED_INGESTION=false`
- Today real-feed mode now distinguishes:
  - `real`
  - `real_empty`
  - `fallback_to_mock`
  - default `mock`
- rollout criteria for any future real-by-default Today decision now live in:
  - `docs/TODAY_REAL_FEED_ROLLOUT_DECISION.md`
- Task 20 decision: keep Today mock-by-default until live-environment preview-read, freshness, and rollback validation are re-confirmed
- Task 21 now adds a target-environment pilot runbook:
  - `docs/TODAY_REAL_FEED_TARGET_PILOT.md`
- Task 22 adds a local Today pilot preflight helper:
  - `npm run phase4:today-pilot-check`
- a planning-only future X or Grok user-curated source path now lives in:
  - `docs/X_GROK_USER_CURATED_SOURCE_PLAN.md`

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
- [docs/TODAY_REAL_FEED_ROLLOUT_DECISION.md](/Users/jasonfeng/Desktop/project3_signalDESK/signaldesk/docs/TODAY_REAL_FEED_ROLLOUT_DECISION.md)
- [docs/TODAY_REAL_FEED_TARGET_PILOT.md](/Users/jasonfeng/Desktop/project3_signalDESK/signaldesk/docs/TODAY_REAL_FEED_TARGET_PILOT.md)
- [docs/X_GROK_USER_CURATED_SOURCE_PLAN.md](/Users/jasonfeng/Desktop/project3_signalDESK/signaldesk/docs/X_GROK_USER_CURATED_SOURCE_PLAN.md)

### Required Client Env

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_USE_REAL_CONTENT_FEED=false` by default

Enable preview only when intentionally testing:
- `VITE_USE_REAL_CONTENT_FEED=true`
- run `npm run phase4:today-pilot-check` before opening the app to confirm whether the env is still `mock_default`, `pilot_ready`, or `pilot_misconfigured`

### Required Server-Side Env Concepts

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `PHASE4_ENABLE_CONTENT_WRITES`
- `PHASE4_WRITE_AUTH_TOKEN`
- `PHASE4_ENABLE_LIVE_FETCH`
- `PHASE4_ENABLE_SCHEDULED_INGESTION`
- `PHASE4_ENABLE_AI_ENRICHMENT`
- `PHASE4_AI_DRY_RUN_ONLY`
- `AI_PROVIDER`
- `DEEPSEEK_API_KEY`
- `DEEPSEEK_BASE_URL`
- `DEEPSEEK_MODEL`

Do not commit any of these secrets or real values.

### Supabase SQL Files To Know

- `supabase/migrations/202605170001_phase4_content_foundation.sql`
- `supabase/migrations/202605210001_phase4_enrichment_ready.sql`
- `supabase/migrations/202605230001_phase4_enrichment_source_deepseek.sql`
- `supabase/migrations/202605250001_phase4_ai_enrichment_leases.sql`
- `supabase/manual/phase4_content_sources_smoke_seed.sql`
- `supabase/manual/phase4_content_readiness_checks.sql`
- `supabase/manual/phase4_preview_read_policies.sql`

### Manual QA Checklist

1. Confirm the Phase 4 migration is applied in the target non-production project
2. Confirm `content_sources` smoke seed has been applied
3. Run readiness checks
4. Confirm preview read policies are applied
5. Deploy `phase4-dry-run`
6. Run an ingestion-only request with `intent: "ingestion"` plus `liveFetch: true` plus `dryRun: true`
7. Run an ingestion-only guarded write-mode smoke test with `intent: "ingestion"` plus `dryRun: false`
8. Verify:
   - ingestion runs increment
   - duplicate reruns do not duplicate raw items or candidate signals
   - `signal_topics` can populate for clearly mappable items
9. Enable `VITE_USE_REAL_CONTENT_FEED=true` locally
10. Verify Today preview, explicit feed-mode behavior, and Detail provenance
11. Set `VITE_USE_REAL_CONTENT_FEED=false` again and confirm Today returns to mock
12. Use `docs/TODAY_REAL_FEED_ROLLOUT_DECISION.md` to decide whether the current environment is even eligible for a future real-by-default Today rollout
13. Inspect the ingestion response for:
   - `requested_source_ids`
   - `selected_source_ids`
   - `unknown_source_ids`
   - `warnings`
   - `source_previews[].reliability_tier`
   - `source_previews[].started_at`
   - `source_previews[].completed_at`
14. Confirm scheduled ingestion is disabled by default by sending `intent: "ingestion"` plus `triggerMode: "scheduled"` before setting `PHASE4_ENABLE_SCHEDULED_INGESTION`
15. If intentionally validating Task 14E, set `PHASE4_ENABLE_SCHEDULED_INGESTION=true` server-side only
16. Run a bounded scheduled-ingestion dry-run request with `intent: "ingestion"` plus `triggerMode: "scheduled"`
17. Keep recurring validation bounded:
   - prefer an explicit `sourceIds` allowlist
   - start at every `30` or `60` minutes only after dry-run validation
18. Optionally run a bounded scheduled-ingestion write-mode request with one source, `dryRun: false`, and `x-phase4-write-token`
19. Confirm AI remains manual-only by sending `intent: "ai_enrichment"` plus `triggerMode: "scheduled"` and verifying a clear rejection payload
20. If intentionally validating Task 13B-13E, configure DeepSeek server env only
21. Run one-signal AI dry-run against `phase4-dry-run`
22. For Task 13D/13E, apply `202605250001_phase4_ai_enrichment_leases.sql`
23. Set `PHASE4_AI_DRY_RUN_ONLY=false` and run a one-signal write-mode request with `x-phase4-write-token`
24. Optionally run a three-signal manual batch request and confirm sequential per-signal statuses
25. Verify only enrichment-ready plus additive claim/retry fields changed and that Today preview prefers enriched text when present

### Boundaries For The Next Session

- Do not switch default Today feed yet.
- Do not touch Radar real-data integration yet.
- Do not add any new frontend AI calls.
- Do not broaden AI writes beyond the guarded manual `intelligence_signals` enrichment-field scope.
- Do not automate AI enrichment yet.
- Do not assume scheduled ingestion is on in any environment unless `PHASE4_ENABLE_SCHEDULED_INGESTION=true` is set deliberately.
- Do not commit `.env` or secrets.
- Do not add frontend writes to Phase 4 content tables.
- Do not weaken write-mode guardrails for the Edge Function.
- Do not fabricate full article bodies in Detail.
- Do not implement Capacitor or `ios/` runtime work in Phase 4.

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

### Latest Task 13B Status

- the first real provider path is now wired server-side only through DeepSeek
- DeepSeek uses a guarded OpenAI-compatible API call shape with:
  - `AI_PROVIDER=deepseek`
  - `DEEPSEEK_API_KEY`
  - `DEEPSEEK_BASE_URL`
  - `DEEPSEEK_MODEL`
  - `PHASE4_ENABLE_AI_ENRICHMENT`
  - `PHASE4_AI_DRY_RUN_ONLY`
- AI provider execution remains dry-run only in this task
- invalid provider JSON is treated as failed output and is not written anywhere
- the Edge Function can now return proposed enrichment output for one or more persisted candidate signals
- no AI outputs are written back to Supabase in Task 13B
- the frontend remains read-only and unchanged by default

### Latest Task 13C-13E Status

- AI write mode remains manual-only and off by default
- writes require:
  - `dryRun: false`
  - `aiEnrichment.writeMode: true`
  - `PHASE4_ENABLE_AI_ENRICHMENT=true`
  - `PHASE4_AI_DRY_RUN_ONLY=false`
  - `AI_PROVIDER=deepseek`
  - `DEEPSEEK_API_KEY`
  - matching `x-phase4-write-token`
- write mode is capped at three signals and defaults to one signal when `signalIds` are omitted
- only these `public.intelligence_signals` fields are written:
  - `enrichment_status`
  - `enrichment_version`
  - `enrichment_source`
  - `summary_status`
  - `translation_status`
  - `source_language`
  - `target_languages`
  - `enriched_summary_en`
  - `enriched_summary_zh`
  - `enriched_why_it_matters_en`
  - `enriched_why_it_matters_zh`
  - `enrichment_error`
  - `last_enriched_at`
  - `updated_at`
- additive claim/retry bookkeeping now also exists on `public.intelligence_signals`:
  - `enrichment_claim_id`
  - `enrichment_claimed_at`
  - `enrichment_claim_expires_at`
  - `enrichment_attempt_count`
  - `enrichment_last_attempt_at`
  - `enrichment_next_retry_at`
  - `enrichment_last_run_id`
- deterministic headline/summary/category/score/provenance fields are not overwritten
- invalid provider output is not written
- provider failure or validation failure now records safe failed state and retry timing without writing enriched text
- one failed signal no longer collapses a 3-signal manual batch
- there is still no scheduled AI execution
- deploys using `--no-verify-jwt` should treat AI-enabled requests as operator-only

### Latest Task 14A-22 Status

- non-AI ingestion now uses an explicit endpoint contract:
  - `intent: "ingestion"`
  - `triggerMode: "manual"` or `triggerMode: "scheduled"`
- mixed payloads that combine ingestion fields with `aiEnrichment` are now rejected clearly
- explicit but unknown `sourceIds` now fail fast when none resolve and surface warnings when only some resolve
- scheduled non-AI ingestion is now disabled by default unless `PHASE4_ENABLE_SCHEDULED_INGESTION=true`
- scheduled non-AI ingestion now returns:
  - `scheduled_ingestion_enabled`
  - `limits_applied`
  - the same per-source diagnostics as manual ingestion
- scheduled non-AI ingestion hard caps currently clamp to:
  - max `4` sources per run
  - max `3` items per source
  - max `12` total candidate items
  - max `12` candidate signals
- Task 16 now adds:
  - `buildPhase4ScheduledIngestionRequest(...)` for bounded operator payloads
  - explicit `sourceIds` allowlist guidance for recurring runs
  - scheduled dry-run / live-fetch dry-run / write-mode operator QA steps
  - a rollback path that simply disables `PHASE4_ENABLE_SCHEDULED_INGESTION`
- Task 17 now adds:
  - `docs/TODAY_REAL_FEED_ROLLOUT_DECISION.md`
  - explicit real-feed QA criteria before any default-feed change
  - product and technical readiness gates for any future real-by-default decision
- Task 18 now adds:
  - explicit operator documentation for optional scheduler activation in non-production only
  - rollback and cadence guidance for bounded scheduled non-AI ingestion
  - `docs/X_GROK_USER_CURATED_SOURCE_PLAN.md` as a planning-only future connector path
  - no runtime X API calls, no runtime Grok or xAI calls, and no default Today rollout change
- Task 19 now adds:
  - `feedReason` diagnostics for Today real-feed mode selection
  - a typed helper to distinguish `real_empty` from filter-empty behavior safely
  - stronger coverage for completed-but-blank enriched fallback behavior
  - tighter rollout gates in `docs/TODAY_REAL_FEED_ROLLOUT_DECISION.md`
- Task 20 now adds:
  - an explicit keep-mock-by-default decision because live-environment rollout validation is still required
  - a typed rollout-mode helper so Today's default-feed choice is explicit rather than magical
  - a documented rollback path that stays `VITE_USE_REAL_CONTENT_FEED=false`
  - updated handoff and QA guidance for a future target-environment pilot instead of a silent default switch
- Task 21 now adds:
  - `docs/TODAY_REAL_FEED_TARGET_PILOT.md`
  - a dedicated target-environment pilot checklist with success criteria, stop criteria, and rollback
  - explicit pilot guidance for enriched-vs-deterministic validation and real_empty vs filter_empty validation
  - no default-feed change and no runtime expansion beyond existing read-only behavior
- Task 22 now adds:
  - `npm run phase4:today-pilot-check`
  - a local env preflight that reports `mock_default`, `pilot_ready`, or `pilot_misconfigured`
  - updated README / manual QA / handoff guidance so operators can run the same bounded pilot steps consistently
- Today real-feed mode now keeps the same UI style but returns clearer prototype states:
  - `mock` when preview is disabled
  - `real` when preview-safe rows load
  - `real_empty` when preview mode is enabled but zero preview-safe rows are found
  - `fallback_to_mock` when frontend Supabase reads fail safely
- Today and Detail still prefer completed enriched fields when present and fall back to deterministic preview fields otherwise
- ingestion responses now include:
  - `request_kind`
  - `trigger_mode`
  - `started_at`
  - `completed_at`
  - `requested_source_ids`
  - `selected_source_ids`
  - `unknown_source_ids`
  - `warnings`
  - per-source `reliability_tier`
  - per-source `started_at` / `completed_at`
  - summary source success / partial / failed counts
- AI enrichment still remains manual-only and now rejects `triggerMode: "scheduled"`
- Today and Detail still prefer completed enriched summary content when present and otherwise fall back safely to deterministic preview content

### Exact Next Recommended Task

Phase 4 Task 23:
- use `docs/TODAY_REAL_FEED_TARGET_PILOT.md` plus `npm run phase4:today-pilot-check` to execute a bounded Today real-feed pilot in a target environment
- keep the real-content path read-only on the client
- keep Radar on mock
- keep AI enrichment manual-only while scheduled non-AI ingestion gains more operational validation
