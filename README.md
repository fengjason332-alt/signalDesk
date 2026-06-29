# SignalDesk

SignalDesk is a Chinese-first, mobile-first intelligence dashboard for tracking high-signal developments across AI, crypto, stocks, robotics, energy, macro, geopolitics, and policy domains.

The current product combines:
- a local-first app shell
- optional Supabase-backed user-state sync
- a server-side RSS ingestion pipeline through a Supabase Edge Function
- Supabase persistence for real Phase 4 content rows
- an optional read-only Today real-content preview
- safe Detail provenance preview for real content

It still preserves the existing dark, dotted-grid, cyan-accent SignalDesk visual style and the mock-first default experience.

## Current State

Completed phases and tasks:
- Phase 1: frontend shell and navigation
- Phase 1.5: topic personalization
- Phase 2: PWA install support
- Phase 3: local-first persistence with optional Supabase user-state sync
- Phase 4 Tasks 0-12 plus Task 13-preflight, Tasks 13B-13E, and Tasks 14A-45: content foundation, RSS ingestion pipeline, deterministic normalization/dedupe/mapping/scoring, Supabase content persistence, controlled smoke-test tooling, read-only Today preview, preview hardening, enrichment-ready schema/read contracts, server-only AI enrichment preflight contracts, a guarded DeepSeek dry-run provider path, a manual-only guarded AI enrichment write mode, additive lease/retry hardening for one-to-three signal manual batches, explicit non-AI ingestion intent/trigger guardrails, stronger ingestion observability, a bounded scheduled non-AI ingestion contract that remains disabled by default, a controlled Today real-feed rollout path that is still mock-by-default, an operator-safe recurring scheduled-ingestion helper/runbook for bounded non-AI automation, an explicit Today real-feed QA and rollout-decision checklist without changing the default feed, Task 19 feed-mode diagnostics and fallback hardening for future rollout readiness, Task 20 explicit real-by-default decision gating that still keeps Today mock-by-default, Task 21 target-environment pilot runbook coverage, Task 22 target-pilot execution support with a local helper command, Task 23 pilot-evidence execution preparation with a dedicated evidence doc, Task 24 local evidence-review tooling and typed review logic, Task 25 stricter pilot-evidence hardening plus a controlled default-rollout preparation plan, Task 26 operator-safe manual pilot execution support with a local evidence-starter command, checklist, and gitignored local evidence folder, Task 27 beginner-safe pilot execution guidance and evidence UX improvements, Task 28 read-only Today real-feed runtime reason hardening, Task 29 docs and handoff consolidation, Task 30 local evidence-update tooling, Task 31 local Markdown report generation, Task 32 full local-operator flow documentation, Task 33 bounded pilot-help output, Task 34 actual local pilot execution, Task 35 small operator-tooling hardening based on real pilot friction, Task 36 a sanitized committed pilot summary, Task 37 missing-evidence guidance hardening, Task 38 a local today-evidence-next helper, Task 39 docs and handoff updates for the next operator step, Task 40 actionable missing-evidence buckets and copy-paste update commands, Task 41 guidance-only evidence completeness scoring, Task 42 richer sanitized local reporting, Task 43 a phased human pilot checklist, Task 44 guided evidence presets plus updater dry-run, Task 45 a local evidence-status dashboard, and planning-only support for a future X/Grok user-curated source track

Current confirmed project state:
- Phase 3 user-state sync works and must be preserved
- the Phase 4 content pipeline exists
- the Phase 4 Supabase content schema has already been applied successfully in the active project environment
- the `content_sources` smoke seed has been applied in the active project environment
- readiness checks have passed
- `supabase/manual/phase4_preview_read_policies.sql` has been applied in the active preview environment
- the `phase4-dry-run` Edge Function has deployed successfully
- live RSS dry-run and write-mode smoke tests have succeeded
- Supabase content tables now contain real rows in the active preview environment
- Today can preview real Supabase content when explicitly enabled
- Task 20 has now evaluated the default-switch decision and kept Today mock-by-default because production-like rollout validation is still required
- Today real-feed mode now reports clearer prototype states:
  - `mock`
  - `real`
  - `fallback_to_mock`
  - `real_empty`
- Today real-feed diagnostics now also distinguish why a mode was chosen:
  - mock default
  - rollback to mock
  - real rows loaded
  - zero preview-safe rows
  - filter-empty after a successful real load
  - fallback because frontend Supabase env is missing or invalid
  - fallback because the preview client is unavailable
  - fallback because the preview read failed
  - fallback because all eligible rows failed mapping
- the non-AI ingestion endpoint now uses a single-intent contract:
  - `intent: "ingestion"` for RSS/content ingestion
  - `intent: "ai_enrichment"` for server-side AI enrichment
- mixed ingestion plus `aiEnrichment` payloads are now rejected clearly instead of being routed implicitly
- scheduled non-AI ingestion can now use `triggerMode: "scheduled"` only when `PHASE4_ENABLE_SCHEDULED_INGESTION=true` is enabled server-side
- scheduled non-AI ingestion remains disabled by default and applies hard caps for source count, items per source, total candidate items, and candidate signals
- scheduled non-AI ingestion now also has an operator-safe request helper in `src/lib/content/phase4ScheduledIngestionRequest.ts` that requires an explicit `sourceIds` allowlist and clamps recurring requests before they hit the Edge Function
- non-AI ingestion now returns clearer diagnostics for:
  - requested / resolved / unknown source ids
  - per-source reliability tier
  - per-source started / completed timestamps
  - per-run source success / partial / failed counts
- an optional server-side DeepSeek dry-run path exists behind explicit env gating
- a manual-only guarded DeepSeek enrichment write mode now exists for one-to-three signals at a time
- manual AI write mode now uses claim / retry bookkeeping on `public.intelligence_signals`
- AI enrichment still rejects `triggerMode: "scheduled"` and remains manual-only

## What SignalDesk Currently Does

Today:
- default behavior still uses mock cards
- Today remains mock by default after Task 20
- optional real-content preview is available behind `VITE_USE_REAL_CONTENT_FEED=true`
- rollout criteria for any future real-by-default Today decision now live in [docs/TODAY_REAL_FEED_ROLLOUT_DECISION.md](/Users/jasonfeng/Desktop/project3_signalDESK/signaldesk/docs/TODAY_REAL_FEED_ROLLOUT_DECISION.md)
- Task 20 records a separate explicit rollout decision instead of silently changing the default feed
- the current Task 20 decision is to keep the default on mock until a separate explicit rollout task re-validates live environment gates
- Task 21 adds the target-environment pilot runbook in [docs/TODAY_REAL_FEED_TARGET_PILOT.md](/Users/jasonfeng/Desktop/project3_signalDESK/signaldesk/docs/TODAY_REAL_FEED_TARGET_PILOT.md)
- Task 22 adds the local helper command `npm run phase4:today-pilot-check` so operators can confirm pilot env readiness before opening the app
- Task 23 adds the pilot evidence template in [docs/TODAY_REAL_FEED_PILOT_EVIDENCE.md](/Users/jasonfeng/Desktop/project3_signalDESK/signaldesk/docs/TODAY_REAL_FEED_PILOT_EVIDENCE.md) so the target-environment pilot can be recorded consistently
- Task 24 adds `npm run phase4:today-evidence-review` so pilot evidence can be reviewed locally without contacting Supabase
- Task 25 adds a beginner-friendly template JSON plus [docs/TODAY_REAL_FEED_CONTROLLED_DEFAULT_ROLLOUT_PLAN.md](/Users/jasonfeng/Desktop/project3_signalDESK/signaldesk/docs/TODAY_REAL_FEED_CONTROLLED_DEFAULT_ROLLOUT_PLAN.md) for a future explicit default-rollout task
- Task 26 adds `npm run phase4:create-today-evidence` plus a dedicated operator checklist so a beginner can create a local evidence file and walk through the pilot safely
- Task 27 adds optional `--out`, `--output`, `--overwrite`, and `--from-template` support to the local evidence starter plus clearer evidence-review output
- Task 28 keeps Today mock-by-default while tightening the read-only real-feed runtime reasons:
  - `mock_default`
  - `rollback_to_mock`
  - `real_loaded`
  - `real_empty`
  - `filter_empty`
  - `fallback_invalid_env`
  - `fallback_no_client`
  - `fallback_read_failed`
  - `fallback_mapping_failed`
- Task 29 consolidates the Phase 4 pilot docs so the next meaningful step is still the actual target-environment pilot, not a default switch
- Task 30 adds `npm run phase4:update-today-evidence` so operators can fill local evidence incrementally without hand-editing JSON
- Task 31 adds `npm run phase4:today-pilot-report` so local evidence can be turned into a Markdown rollout report without contacting Supabase
- Task 32 documents the full local operator flow from evidence creation through rollback
- Task 33 adds `npm run phase4:today-help` so the full local-only command flow is easy to rediscover
- Task 35 hardens the local operator tools so create/update/report default to gitignored `docs/evidence/*.local.*` or `*.private.*` paths, and the pilot preflight now says more clearly that `pilot_ready` only checks local env presence
- Task 36 adds [docs/TODAY_REAL_FEED_PILOT_SANITIZED_SUMMARY.md](/Users/jasonfeng/Desktop/project3_signalDESK/signaldesk/docs/TODAY_REAL_FEED_PILOT_SANITIZED_SUMMARY.md) so the repo can record a safe public summary of the local pilot without committing local evidence
- when real preview is enabled, completed enriched fields are preferred
- when enrichment is missing, pending, failed, or incomplete, Today falls back to deterministic preview fields
- when completed enrichment fields are blank, Today and Detail still fall back safely to deterministic preview fields
- when real preview returns zero preview-safe rows, Today shows a clear real-feed empty state instead of looking broken
- when real preview reads fail, Today falls back safely to mock with a lightweight prototype diagnostic

Detail:
- mock detail behavior still works
- real-content preview cards can open safely
- detail shows available title, summary, score, categories, source provenance, and safe source links
- detail can show a subtle non-AI enrichment placeholder when richer summary fields have not been generated yet
- no fake full article body is generated when full body content is unavailable

State and sync:
- user state remains local-first
- `localStorage` writes happen immediately
- Supabase user-state sync is optional and account-based

Server-side content pipeline:
- curated RSS source registry
- normalization and deduplication
- deterministic topic/entity mapping
- deterministic candidate signal generation
- Supabase persistence for raw items and deterministic candidate signals
- explicit non-AI ingestion intent plus trigger metadata for future scheduling work
- bounded recurring-ingestion request helper for operator-safe `triggerMode: "scheduled"` payloads
- mixed ingestion plus AI requests rejected at the endpoint boundary
- optional server-only DeepSeek enrichment with:
  - dry-run by default
  - manual write mode only
  - max batch size of 3 signals
  - lease / claim / retry bookkeeping on `intelligence_signals`

## What Is Still Mock

- the default Today feed when `VITE_USE_REAL_CONTENT_FEED=false`
- Radar
- Watchlist fixture catalog / existing non-real-content behavior
- Library fixture content / existing non-real-content behavior
- AI-enriched summaries and AI translations are not enabled by default and only appear if manual server-side enrichment writes have been run successfully
- the AI provider path is still operator-facing and server-side only
- Radar remains mock
- Watchlist and Library are not real-content-backed yet

## Local Development

Install dependencies:

```bash
npm install
```

Run the app:

```bash
npm run dev
```

Run verification:

```bash
node --import tsx --test src/*.test.ts
npm run lint
npm run build
```

Local Today pilot helper:

```bash
npm run phase4:today-pilot-check
```

This helper is local-only. It checks the Today real-feed pilot env contract and prints the manual QA checklist without calling Supabase, calling AI providers, or writing content.

Local Today pilot evidence review:

```bash
npm run phase4:today-evidence-review -- docs/examples/today-real-feed-pilot-evidence.example.json
```

This review command is also local-only. It reads a local JSON evidence file, evaluates rollout readiness conservatively, and does not contact Supabase, call AI providers, or write content.

Local Today pilot evidence starter:

```bash
npm run phase4:create-today-evidence
```

This command creates `docs/evidence/today-real-feed-pilot-evidence.local.json` unless that local file already exists. It does not overwrite your notes by default.
It now also refuses non-gitignored evidence paths by default unless `--allow-any-path` is passed intentionally.

Optional starter flags:
- `npm run phase4:create-today-evidence -- --out docs/evidence/custom.local.json`
- `npm run phase4:create-today-evidence -- --from-template docs/examples/today-real-feed-pilot-evidence.template.json`
- `npm run phase4:create-today-evidence -- --overwrite`

Local Today pilot evidence updater:

```bash
npm run phase4:update-today-evidence -- docs/evidence/today-real-feed-pilot-evidence.local.json --preset real-cards-rendered
```

This command is local-only. It does not call Supabase, does not call AI, does not write app content, and does not print secret values.
It now covers the common pilot fields such as observed feed mode, detail count, env flags, sample cards, fallback checks, rollback checks, and final recommendation.
It now also supports guided presets such as `real-cards-rendered`, `detail-safe`, `provenance-visible`, `filter-ai-openai-works`, `filter-empty-works`, `real-empty-observed`, `enriched-non-empty-wins`, `blank-enrichment-fallback`, `mobile-acceptable`, `freshness-acceptable`, `source-coverage-acceptable`, and `rollback-tested`.
Use `--dry-run` when you want a preview of changed fields without writing the local evidence file.

Local Today pilot evidence status dashboard:

```bash
npm run phase4:today-evidence-status -- docs/evidence/today-real-feed-pilot-evidence.local.json
```

This command is local-only. It summarizes recommendation, required evidence progress, missing evidence buckets, critical blockers, warnings, next exact commands, whether the local report exists, and whether the evidence path is gitignored. It does not switch Today by default.

Local Today pilot report generator:

```bash
npm run phase4:today-pilot-report -- docs/evidence/today-real-feed-pilot-evidence.local.json --out docs/evidence/today-real-feed-pilot-report.local.md
```

This command is local-only. It prints a Markdown report, does not switch defaults, does not call Supabase, and does not call AI.
It now refuses non-gitignored report paths by default unless `--allow-any-path` is passed intentionally.

Local Today pilot next-step helper:

```bash
npm run phase4:today-evidence-next -- docs/evidence/today-real-feed-pilot-evidence.local.json
```

This command is local-only. It reads the local evidence JSON, reuses the same conservative evaluator, and tells the operator exactly which missing evidence to collect next, including suggested updater commands. It does not call Supabase, does not call AI, and does not write content.
By default it reads either a gitignored `docs/evidence/*.local.json` or `docs/evidence/*.private.json` file, or one of the shipped `docs/examples/today-real-feed-pilot-evidence*.json` practice files. Use `--allow-any-path` only when you intentionally need to bypass that local-only guard.
It now groups the operator output into must-collect, optional, blocked, and already-satisfied buckets, and also prints a guidance-only completeness score plus exact copy-paste updater commands.

Local Today pilot help:

```bash
npm run phase4:today-help
```

## How To Run The Today Real-Feed Pilot

1. Create a local evidence file:

```bash
npm run phase4:create-today-evidence
```

2. Check the local pilot contract:

```bash
npm run phase4:today-pilot-check
```

`pilot_ready` only means the local env keys are present. Broken preview-read policies, empty real datasets, or wrong-project wiring can still show up later in-browser as `fallback_to_mock` or `real_empty`.

3. Enable `VITE_USE_REAL_CONTENT_FEED=true`, set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, then start the app:

```bash
npm run dev
```

4. While testing Today and Detail, update the evidence file safely:

```bash
npm run phase4:update-today-evidence -- docs/evidence/today-real-feed-pilot-evidence.local.json --preset real-cards-rendered --preset detail-safe
```

5. Review the evidence locally after the manual QA pass:

```bash
npm run phase4:today-evidence-review -- docs/evidence/today-real-feed-pilot-evidence.local.json
```

6. If the review still returns `continue_pilot`, ask the local next-step helper what to capture next:

```bash
npm run phase4:today-evidence-next -- docs/evidence/today-real-feed-pilot-evidence.local.json
```

That helper now prints grouped buckets and the exact evidence-update command to run next.

6A. Check the local readiness dashboard at any point:

```bash
npm run phase4:today-evidence-status -- docs/evidence/today-real-feed-pilot-evidence.local.json
```

That dashboard now summarizes whether rollout is `blocked`, `continue_pilot`, or `ready_for_controlled_default_rollout`, and reminds the operator that it does not switch Today default.

7. Generate a local Markdown report:

```bash
npm run phase4:today-pilot-report -- docs/evidence/today-real-feed-pilot-evidence.local.json --out docs/evidence/today-real-feed-pilot-report.local.md
```

The local report now includes a guidance-only completeness summary, explicit boundaries, rollback confirmation, and the next recommended task without exposing local secrets.

Rollback:
- set `VITE_USE_REAL_CONTENT_FEED=false`
- restart locally or rebuild/redeploy
- confirm Today returns to mock

Do not commit local/private evidence files such as `docs/evidence/*.local.json` or `docs/evidence/*.private.json`.
Do not commit local/private report files such as `docs/evidence/*.local.md` or `docs/evidence/*.private.md`.

## Client Environment Variables

Client-safe env vars:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_USE_REAL_CONTENT_FEED=false` by default

Notes:
- if the Supabase client env vars are missing or invalid, the app must remain safe in local-only mode
- the default Today experience must remain mock unless `VITE_USE_REAL_CONTENT_FEED=true`
- do not commit `.env` or secrets

See [.env.example](/Users/jasonfeng/Desktop/project3_signalDESK/signaldesk/.env.example) for safe placeholders.
See [docs/TODAY_REAL_FEED_ROLLOUT_DECISION.md](/Users/jasonfeng/Desktop/project3_signalDESK/signaldesk/docs/TODAY_REAL_FEED_ROLLOUT_DECISION.md) for the controlled real-feed QA checklist and rollback plan.
See [docs/TODAY_REAL_FEED_TARGET_PILOT.md](/Users/jasonfeng/Desktop/project3_signalDESK/signaldesk/docs/TODAY_REAL_FEED_TARGET_PILOT.md) for the target-environment pilot runbook.
See [docs/TODAY_REAL_FEED_PILOT_EVIDENCE.md](/Users/jasonfeng/Desktop/project3_signalDESK/signaldesk/docs/TODAY_REAL_FEED_PILOT_EVIDENCE.md) for the operator-facing evidence checklist and pass/fail recording template.
See [docs/TODAY_REAL_FEED_PILOT_OPERATOR_CHECKLIST.md](/Users/jasonfeng/Desktop/project3_signalDESK/signaldesk/docs/TODAY_REAL_FEED_PILOT_OPERATOR_CHECKLIST.md) for the step-by-step beginner pilot checklist.
See [docs/TODAY_REAL_FEED_PILOT_SANITIZED_SUMMARY.md](/Users/jasonfeng/Desktop/project3_signalDESK/signaldesk/docs/TODAY_REAL_FEED_PILOT_SANITIZED_SUMMARY.md) for the committed high-level pilot summary without local evidence details.
See [docs/TODAY_REAL_FEED_CONTROLLED_DEFAULT_ROLLOUT_PLAN.md](/Users/jasonfeng/Desktop/project3_signalDESK/signaldesk/docs/TODAY_REAL_FEED_CONTROLLED_DEFAULT_ROLLOUT_PLAN.md) for the planning-only staged rollout path after evidence is accepted.
See [docs/examples/today-real-feed-pilot-evidence.passing.example.json](/Users/jasonfeng/Desktop/project3_signalDESK/signaldesk/docs/examples/today-real-feed-pilot-evidence.passing.example.json) for a fake local example that can be reviewed with `npm run phase4:today-evidence-review`.
See [docs/examples/today-real-feed-pilot-evidence.template.json](/Users/jasonfeng/Desktop/project3_signalDESK/signaldesk/docs/examples/today-real-feed-pilot-evidence.template.json) for a beginner-friendly file you can copy and fill in manually.
The template and example files now use canonical camelCase keys. The local parser still accepts older alias keys for backwards-compatible local evidence only.
Local private evidence files under `docs/evidence/*.local.json` or `docs/evidence/*.private.json` should not be committed.
Keep updating one local/private evidence file across multiple pilot sessions. Merge separate `real_empty`, enriched-content, mobile, freshness, and source-coverage observations into the same local/private evidence file before review/report.
The current evidence result still remains `continue_pilot` unless the missing evidence is completed. The next real operator step after Task 45 is still to fill the remaining evidence gaps with the phased checklist, presets, and local status dashboard, not to switch Today by default.
See [docs/X_GROK_USER_CURATED_SOURCE_PLAN.md](/Users/jasonfeng/Desktop/project3_signalDESK/signaldesk/docs/X_GROK_USER_CURATED_SOURCE_PLAN.md) for the planning-only future X or Grok user-curated source model.
Task 20 keeps the rollback path explicit: set `VITE_USE_REAL_CONTENT_FEED=false`, rebuild/redeploy, and confirm Today returns to mock.

## Server-Side / Edge Function Environment

Do not place these in the client bundle. These are server-side concepts for the Supabase Edge Function only:
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

Safety model:
- `dryRun: true` is the default
- write mode requires explicit `dryRun: false`
- write mode also requires server-side enablement plus a matching write token
- non-AI ingestion requests should use `intent: "ingestion"`
- recurring non-AI ingestion may use `triggerMode: "scheduled"` only when `PHASE4_ENABLE_SCHEDULED_INGESTION=true`
- scheduled non-AI ingestion remains server-side/operator work only and stays disabled by default
- scheduled non-AI ingestion should prefer an explicit `sourceIds` allowlist; the repo helper for this is `buildPhase4ScheduledIngestionRequest(...)`
- scheduled non-AI ingestion currently applies these hard caps:
  - max `4` sources per run
  - max `3` items per source
  - max `12` total candidate items
  - max `12` candidate signals
  - recommended minimum `30` minutes between scheduler-triggered runs
- requests that combine ingestion fields with `aiEnrichment` are rejected
- frontend preview is read-only
- frontend does not write Phase 4 content tables
- DeepSeek enrichment calls exist only on the server
- AI dry-run remains the default path
- AI enrichment remains manual-only and rejects `triggerMode: "scheduled"`
- manual AI write mode requires:
  - `dryRun: false`
  - `aiEnrichment.writeMode: true`
  - `PHASE4_ENABLE_AI_ENRICHMENT=true`
  - `PHASE4_AI_DRY_RUN_ONLY=false`
  - `AI_PROVIDER=deepseek`
  - `DEEPSEEK_API_KEY`
  - matching `x-phase4-write-token`
- manual AI write mode also requires:
  - claim / lease success before the provider call
  - max `signalIds.length <= 3`
  - max `maxSignals <= 3`
  - valid provider JSON before any enrichment text write
- Task 13C-13E writes only approved enrichment fields plus additive lease/retry bookkeeping fields on `public.intelligence_signals`
- deterministic headline/summary/category/score/provenance fields are not overwritten by AI writes
- future AI enrichment must remain server-side only and manually gated first
- if `phase4-dry-run` is deployed with `--no-verify-jwt`, AI-enabled usage should be treated as operator-only and kept behind explicit server env plus write-token controls

## Manual Supabase SQL Assets

Current manual SQL and migration assets:
- `supabase/migrations/202605170001_phase4_content_foundation.sql`
- `supabase/migrations/202605210001_phase4_enrichment_ready.sql`
- `supabase/migrations/202605230001_phase4_enrichment_source_deepseek.sql`
- `supabase/migrations/202605250001_phase4_ai_enrichment_leases.sql`
- `supabase/manual/phase4_content_sources_smoke_seed.sql`
- `supabase/manual/phase4_content_readiness_checks.sql`
- `supabase/manual/phase4_preview_read_policies.sql`

Use them manually in a non-production Supabase project. Do not automate their application from the frontend.

## Safe Testing Order

Use this order for a new non-production environment:

1. Apply `supabase/migrations/202605170001_phase4_content_foundation.sql`
2. Apply `supabase/migrations/202605210001_phase4_enrichment_ready.sql`
3. Apply `supabase/migrations/202605230001_phase4_enrichment_source_deepseek.sql`
4. Apply `supabase/migrations/202605250001_phase4_ai_enrichment_leases.sql` before validating manual AI claim/retry behavior
5. Seed `content_sources` with `supabase/manual/phase4_content_sources_smoke_seed.sql`
6. Run `supabase/manual/phase4_content_readiness_checks.sql`
7. Deploy the `phase4-dry-run` Edge Function
8. Run an ingestion-only `intent: "ingestion"` plus `liveFetch: true` plus `dryRun: true` smoke test
9. Run an ingestion-only guarded write-mode smoke test with `intent: "ingestion"` plus `dryRun: false`
10. Verify content-table row counts conceptually:
   - ingestion runs should increment
   - duplicate reruns should not duplicate raw items or deterministic candidate signals
11. Apply `supabase/manual/phase4_preview_read_policies.sql`
12. Enable frontend preview locally with `VITE_USE_REAL_CONTENT_FEED=true`
13. Confirm Today shows one of the expected prototype states:
   - real cards
   - real empty state
   - fallback to mock after a safe read failure
14. Optionally configure DeepSeek dry-run env on the Edge Function:
   - `PHASE4_ENABLE_AI_ENRICHMENT=true`
   - `PHASE4_AI_DRY_RUN_ONLY=true`
   - `AI_PROVIDER=deepseek`
   - `DEEPSEEK_API_KEY=<server-only secret>`
   - `DEEPSEEK_BASE_URL=https://api.deepseek.com`
   - `DEEPSEEK_MODEL=deepseek-chat`
15. Run a one-signal AI dry-run request against `phase4-dry-run`
16. Verify the response returns proposed enrichment output only and performs no database writes
17. Confirm AI enrichment is still manual-only by sending `intent: "ai_enrichment"` plus `triggerMode: "scheduled"` and verifying a clear rejection response
18. Confirm scheduled non-AI ingestion is disabled by default by sending `intent: "ingestion"` plus `triggerMode: "scheduled"` before enabling `PHASE4_ENABLE_SCHEDULED_INGESTION`
19. Optionally enable `PHASE4_ENABLE_SCHEDULED_INGESTION=true` in a non-production environment and start with a bounded scheduled-ingestion dry-run that uses an explicit `sourceIds` allowlist
20. Keep the first recurring validation at a recommended cadence of every `30` or `60` minutes, and prefer using `buildPhase4ScheduledIngestionRequest(...)` or an equivalent explicit allowlist payload builder
21. Optionally validate a bounded scheduled-ingestion live-fetch dry-run and then a one-source write-mode request with `maxItemsPerSource: 1`
22. Roll back scheduled-ingestion enablement by setting `PHASE4_ENABLE_SCHEDULED_INGESTION=false`
23. For manual Task 13D/13E write-mode validation only:
   - set `PHASE4_AI_DRY_RUN_ONLY=false`
   - keep `PHASE4_ENABLE_AI_ENRICHMENT=true`
   - keep `AI_PROVIDER=deepseek`
   - keep `DEEPSEEK_API_KEY`, `DEEPSEEK_BASE_URL`, and `DEEPSEEK_MODEL` server-side only
   - send `dryRun: false` plus `aiEnrichment.writeMode: true` plus `x-phase4-write-token`
24. Verify only enrichment-ready columns plus additive claim/retry bookkeeping fields on `public.intelligence_signals` changed
25. Verify one-to-three signal manual batches process sequentially and return per-signal statuses
26. Verify Today preview still falls back safely when disabled and still shows deterministic fallback text when enrichment is incomplete

## Current Safety Model

- local-first user-state behavior remains the default for Phase 3
- Phase 4 frontend preview is read-only
- Today does not switch to real content by default
- Radar remains mock
- Watchlist and Library remain mock or existing behavior
- no AI keys or secrets should be committed
- DeepSeek is the first optional provider and remains server-side only
- AI dry-run remains the default supported AI mode
- Task 13D and Task 13E keep manual AI writes intentionally narrow and require explicit server-side guards
- lease / claim / retry bookkeeping now exists to reduce concurrent-manual-rerun risk
- no frontend or client-side Phase 4 content writes have been added

## Known Limitations

- full article body storage is not implemented yet
- no scheduled AI enrichment exists yet
- Task 13D/13E AI writes update enrichment-ready fields plus additive lease/retry bookkeeping only and do not overwrite deterministic fields
- AI dry-run and write mode should still be treated as operator-only manual tools
- no production recurring non-AI ingestion job is enabled by default even though the endpoint contract now supports bounded scheduled requests and an operator-safe request helper
- the Today real-content path is still preview-only and still mock-by-default
- Radar is still mock
- Watchlist and Library are not real-content-backed yet

## Where To Read Next

Start with:
- [AGENTS.md](/Users/jasonfeng/Desktop/project3_signalDESK/signaldesk/AGENTS.md)
- [PROJECT_CONTEXT.md](/Users/jasonfeng/Desktop/project3_signalDESK/signaldesk/PROJECT_CONTEXT.md)
- [ROADMAP.md](/Users/jasonfeng/Desktop/project3_signalDESK/signaldesk/ROADMAP.md)
- [docs/CODEX_HANDOFF.md](/Users/jasonfeng/Desktop/project3_signalDESK/signaldesk/docs/CODEX_HANDOFF.md)
- [docs/PHASE_4_PLAN.md](/Users/jasonfeng/Desktop/project3_signalDESK/signaldesk/docs/PHASE_4_PLAN.md)
- [docs/PHASE_4_MANUAL_QA.md](/Users/jasonfeng/Desktop/project3_signalDESK/signaldesk/docs/PHASE_4_MANUAL_QA.md)
- [docs/APP_STORE_READINESS.md](/Users/jasonfeng/Desktop/project3_signalDESK/signaldesk/docs/APP_STORE_READINESS.md)
