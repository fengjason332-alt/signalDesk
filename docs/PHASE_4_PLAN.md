# Phase 4 Plan

## Goal

SignalDesk Phase 4 adds a real-content pipeline around curated RSS ingestion, deterministic normalization/deduplication/mapping, Supabase content persistence, and a safe frontend preview path before any AI summarization or translation is introduced.

## Supported Domains

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

## Completed Through Task 12 Plus Task 13-preflight, Tasks 13B-13E, And Tasks 14A-24

### Tasks 0-4: Foundations

- content-domain types and mappers
- Phase 4 schema foundation
- RSS source registry
- deterministic normalization and dedupe
- deterministic topic/entity mapping
- deterministic candidate signal generation
- deterministic scoring seed
- dry-run pipeline scaffold

### Tasks 5-8: Server-Side Persistence And Smoke-Test Hardening

- raw content persistence into:
  - `content_ingestion_runs`
  - `raw_source_items`
  - `content_entities`
  - `raw_source_item_entities`
- deterministic candidate signal persistence into:
  - `intelligence_signals`
  - `signal_source_items`
  - `signal_entities`
  - `signal_topics`
- explicit `dryRun` default and guarded write mode
- multi-source ingestion hardening
- observability for partial success and duplicate-safe reruns

### Tasks 9-11: Read-Only Frontend Preview

- read-only real-content adapter from Supabase content tables into the frontend `Signal` shape
- feature-flagged Today preview behind `VITE_USE_REAL_CONTENT_FEED=true`
- safe mock fallback when preview reads fail
- safe Detail provenance preview without fake article bodies
- deterministic preview ranking
- multi-source provenance display readiness
- malformed-row skipping without breaking the whole preview feed

### Task 12: Enrichment-Ready Contract Without AI

- additive `intelligence_signals` enrichment-ready columns for summary/translation state
- optional TypeScript enrichment contract and helpers
- preview adapter preference for completed enriched summary / why-it-matters fields
- legacy-query fallback when the active preview environment has not applied the Task 12 migration yet
- subtle Detail placeholder when enrichment has not been generated yet
- no AI calls, no frontend writes, no default Today rollout change

### Task 13-preflight: Guarded AI Enrichment Design Without AI Calls

- server-side-only AI enrichment architecture defined before implementation
- provider-neutral no-op interfaces for:
  - summarize
  - translate
  - why-it-matters generation
  - language detection
- server-only contract modules now exist for:
  - provider boundary
  - job planning / cost controls
  - enrichment store read/write scope
- dry-run-first enrichment planning helpers with:
  - explicit write gating
  - target enrichment version
  - retry backoff
  - bounded batch size and input budgets
- no AI SDKs, provider fetches, keys, scheduled jobs, or frontend writes

### Task 13B: DeepSeek Provider Dry-Run Implementation

- DeepSeek is now the first optional real provider
- provider integration is server-side only under `supabase/functions/_shared`
- base URL defaults to `https://api.deepseek.com`
- model defaults to `deepseek-chat`
- both base URL and model are overridable through server-side env
- provider execution remains dry-run only in this task
- no AI output is written back to Supabase yet
- JSON output is parsed and validated before being returned as a proposed enrichment payload
- invalid JSON or missing required fields produce failed dry-run results instead of writes
- the existing `phase4-dry-run` endpoint now has an additive optional `aiEnrichment` request block for server-side dry-run only

### Task 13C: Guarded DeepSeek Write Mode

- manual-only guarded AI enrichment writes now exist for one-to-three signals at a time
- write mode requires:
  - `dryRun: false`
  - `aiEnrichment.writeMode: true`
  - `PHASE4_ENABLE_AI_ENRICHMENT=true`
  - `PHASE4_AI_DRY_RUN_ONLY=false`
  - `AI_PROVIDER=deepseek`
  - `DEEPSEEK_API_KEY`
  - matching `x-phase4-write-token`
- valid DeepSeek JSON can now update enrichment-ready fields on `public.intelligence_signals` only
- dry-run behavior is unchanged and still performs no writes
- invalid provider output is rejected without writes
- current-version completed enrichment is skipped unless `force=true`
- write responses include readback summaries and do not expose raw article bodies or secrets

### Task 13D And Task 13E: Lease / Retry Hardening And Manual Batch Support

- additive manual AI bookkeeping now exists on `public.intelligence_signals`:
  - `enrichment_claim_id`
  - `enrichment_claimed_at`
  - `enrichment_claim_expires_at`
  - `enrichment_attempt_count`
  - `enrichment_last_attempt_at`
  - `enrichment_next_retry_at`
  - `enrichment_last_run_id`
- manual write mode now claims a signal before the provider call
- active claims are skipped safely
- expired claims can be reclaimed
- retry windows are persisted and respected
- provider and validation failure now record safe failed state without writing enriched text
- manual batch write mode remains sequential only and capped at 3
- one failed signal no longer collapses the whole batch
- dry-run behavior remains claim-free and no-write

### Task 14A Through Task 15: Non-AI Ingestion Hardening, Scheduled Guardrails, And Controlled Today Rollout

- non-AI ingestion now has an explicit single-intent request contract:
  - `intent: "ingestion"`
  - `triggerMode: "manual"` or `triggerMode: "scheduled"`
- mixed payloads that combine ingestion fields with `aiEnrichment` are rejected clearly
- explicit but unknown `sourceIds` now fail fast when none resolve and surface warnings when only some resolve
- non-AI ingestion responses now include:
  - `request_kind`
  - `trigger_mode`
  - `started_at`
  - `completed_at`
  - `requested_source_ids`
  - `selected_source_ids`
  - `unknown_source_ids`
  - `warnings`
  - per-source reliability tiers and timestamps
  - source success / partial / failed counts in the summary
- non-AI ingestion still performs no AI provider calls
- bounded scheduled non-AI ingestion now exists behind `PHASE4_ENABLE_SCHEDULED_INGESTION=true`
- scheduled non-AI ingestion remains disabled by default and clamps to:
  - max `4` sources per run
  - max `3` items per source
  - max `12` total candidate items
  - max `12` candidate signals
- AI enrichment still remains manual-only and rejects `triggerMode: "scheduled"`
- Today and Detail enriched-content priority behavior is verified and still falls back safely to deterministic preview content when enrichment is missing
- Today real-feed mode now reports explicit rollout states:
  - `mock`
  - `real`
  - `fallback_to_mock`
  - `real_empty`
- Today still remains mock-by-default unless `VITE_USE_REAL_CONTENT_FEED=true`

Proposed future AI enrichment flow:
- runtime location:
  - server-side only
  - preferred first runtime: Supabase Edge Function or another server-only job entrypoint
  - never in frontend code or client env
- read set:
  - `intelligence_signals`
  - `signal_source_items`
  - `raw_source_items`
  - optional `signal_topics`
  - optional `signal_entities`
- write set:
  - `intelligence_signals` enrichment-ready columns only in the first guarded implementation
  - do not touch frontend user-state tables
  - do not require `signal_translation_blocks` yet unless a later task explicitly chooses that path
- candidate selection:
  - preview-safe lifecycle stages only: `candidate_preview`, `candidate`, `draft`
  - exclude `generation_status = failed`
  - skip rows already `pending`
  - skip rows already enriched for the current `enrichment_version` unless a force flag is used
  - retry failed rows only after a bounded backoff window
- versioning:
  - increment `enrichment_version` only when the prompt/output contract changes meaningfully
  - use `summary_status` and `translation_status` separately so reruns can target one missing piece without overwriting the other
- failure handling:
  - keep `enrichment_error` sanitized and operator-safe only
  - do not store raw provider payloads, prompt text, or unsanitized provider errors in publicly readable preview tables
  - do not expose raw provider errors to the frontend preview path
  - first guarded implementation should prefer partial per-row failure recording over all-or-nothing batch failure
- cost controls:
  - default dry-run
  - manual trigger first
  - bounded max signals per run
  - bounded source items per signal
  - bounded input characters per request
  - no scheduled trigger until manual dry-runs are operationally stable
- trigger order:
  - first: manual dry-run only
  - second: manual guarded write mode
  - later: scheduled enrichment after observed stability

## Current Known Working State

- the Phase 4 content migration has been applied successfully in the active preview environment
- the smoke-test `content_sources` seed has been applied
- readiness checks have passed
- preview read policies have been applied
- the `phase4-dry-run` Edge Function has deployed successfully
- live RSS dry-run and write-mode smoke tests have succeeded
- Supabase content tables now contain real rows
- duplicate reruns do not duplicate `raw_source_items` or `intelligence_signals`
- Today real-content preview works when:
  - `VITE_USE_REAL_CONTENT_FEED=true`
  - `VITE_SUPABASE_URL` is set
  - `VITE_SUPABASE_ANON_KEY` is set
  - `supabase/manual/phase4_preview_read_policies.sql` has been applied
- default Today behavior is still mock
- Radar remains mock
- non-AI ingestion now supports a bounded scheduled request path, but no production recurring scheduler is enabled by default
- Task 16 now adds an operator-safe recurring request helper plus explicit allowlist / cadence / rollback guidance for bounded scheduled runs
- Task 17 now adds a dedicated Today real-feed QA checklist plus explicit product and technical criteria for any future real-by-default decision
- Task 18 keeps scheduler activation operator-safe and documented for non-production only, and adds a planning-only future X or Grok user-curated source path
- Task 19 adds stronger Today feed-mode diagnostics, a typed view-state helper for real-empty vs filter-empty behavior, and stricter enriched-field fallback coverage without changing the default feed
- Task 20 keeps Today mock-by-default after reviewing the rollout gates, adds an explicit default-rollout helper boundary, and records that a target-environment pilot is still required before any default switch
- Task 21 adds the target-environment pilot runbook, bounded QA checklist, success criteria, stop criteria, and rollback steps without changing runtime defaults
- Task 22 adds a local Today pilot preflight helper command and ties the operator runbook, rollback path, and env-boundary docs together with regression coverage
- Task 23 adds a dedicated pilot evidence document plus clearer helper sections for pass criteria, evidence capture, blockers, and rollback recording without changing any runtime defaults
- Task 24 adds a typed local pilot-evidence contract, a conservative evidence-review script, fake example JSON files, and rollout-decision doc updates without changing runtime defaults or contacting Supabase
- there is still no scheduled AI execution

## Remaining Tasks

### Task 25: Controlled Today Default-Rollout Preparation Only After Accepted Pilot Evidence

- only start this task after Task 24 evidence review is accepted
- preserve fallback paths and disable paths either way
- do not use this task to touch Radar, Watchlist, or Library real-data rollout

## Risks To Keep In Mind

- RLS and preview-read policies can drift from what the frontend read adapter expects
- RSS feeds can go stale, change shape, or become noisy
- explicit source-id typos can still waste operator time unless scheduler callers surface `unknown_source_ids` and warnings
- duplicate handling can still miss tricky cross-source near-duplicates
- partial failures can leave the system operationally confusing even when writes are guarded
- source provenance quality depends on source metadata consistency
- full article body is not stored yet, so Detail must stay honest about preview limitations
- AI cost and retry behavior can spiral without strict per-run batch limits and explicit version gating
- operator-facing AI dry-run calls are still sensitive if paired with `--no-verify-jwt`, so keep AI execution tightly gated server-side
- preview-read policies expose enrichment-ready rows, so AI write copy must stay sanitized and operator-safe
- recurring non-AI ingestion can still overload noisy sources if future schedulers ignore the current hard caps or warning diagnostics
- recurring non-AI ingestion can still drift too broad if scheduler callers stop using explicit `sourceIds` allowlists for bounded runs

## Guardrails

- keep `dryRun: true` as the default
- keep write mode guarded by explicit enablement and `PHASE4_WRITE_AUTH_TOKEN`
- keep ingestion and AI enrichment as separate request intents
- keep scheduled ingestion disabled unless `PHASE4_ENABLE_SCHEDULED_INGESTION=true`
- keep the frontend real-content path read-only
- keep Today mock by default
- keep Radar mock
- do not add AI until the real-content preview path is stable
