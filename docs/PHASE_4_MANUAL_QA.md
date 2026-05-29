# Phase 4 Manual QA

## Scope

This document covers the current manual QA path for the real-content ingestion pipeline and the read-only Today preview path.

Important boundaries:
- default Today remains mock
- Radar remains mock
- Watchlist and Library remain on current behavior
- the frontend real-content path is read-only
- no AI summary or translation exists yet in persisted/frontend-visible form
- Task 12 enrichment fields are optional and may be absent in an older preview environment
- Task 13B adds an optional DeepSeek dry-run path on the server side only
- Task 13C adds a guarded manual-only AI write mode for enrichment-ready `intelligence_signals` fields only
- Task 13D and Task 13E add additive claim / retry bookkeeping and sequential batch handling for one-to-three manual AI writes
- Task 14A-15 add an explicit ingestion request contract, mixed-request rejection, richer non-AI ingestion diagnostics, bounded scheduled-ingestion enablement that remains off by default, and a controlled Today real-feed rollout path that remains mock-by-default
- Task 16 adds an operator-safe recurring-ingestion helper and bounded recurring runbook
- Task 17 adds a dedicated Today real-feed QA and rollout-decision checklist without changing the default feed
- do not commit `.env` or secrets

## Current Known Good State

The active preview environment has already proven:
- Phase 4 migration applied successfully
- `content_sources` smoke seed applied
- readiness checks passed
- preview read policies applied
- `phase4-dry-run` deployed successfully
- `liveFetch: true` plus `dryRun: true` succeeded
- guarded write-mode smoke test succeeded
- Supabase content tables contain real rows
- duplicate reruns do not duplicate raw items or deterministic candidate signals
- Today real-content preview works when explicitly enabled
- non-AI ingestion now returns requested / resolved / unknown source-id diagnostics
- AI enrichment still rejects `triggerMode: "scheduled"` and remains manual-only

## 1. Supabase Migration Applied

Manual migration file:
- `supabase/migrations/202605170001_phase4_content_foundation.sql`
- `supabase/migrations/202605210001_phase4_enrichment_ready.sql`
- `supabase/migrations/202605230001_phase4_enrichment_source_deepseek.sql`
- `supabase/migrations/202605250001_phase4_ai_enrichment_leases.sql`

Verify conceptually:
- required Phase 4 content tables exist
- indexes referenced by the adapters exist
- the schema matches the current server-side write/read adapters
- if the Task 12 enrichment migration is not applied yet, the preview adapter should still work through its legacy read fallback

Do not apply this automatically from the app.

## 2. content_sources Seeded

Manual seed file:
- `supabase/manual/phase4_content_sources_smoke_seed.sql`

Use it manually after the migration.

Smoke-test subset currently includes a small set of sources such as:
- OpenAI / AI
- markets / stocks stand-in
- crypto
- US policy / macro-adjacent source

Verify conceptually:
- expected source ids exist
- rerunning the seed is safe and idempotent

## 3. Readiness Checks

Manual check file:
- `supabase/manual/phase4_content_readiness_checks.sql`

Use it manually to confirm:
- required Phase 4 tables exist
- required indexes exist
- `content_sources` rows exist
- `canonical_topics` rows exist
- existing expected policies are visible

## 4. Edge Function Deployment

Function:
- `phase4-dry-run`

Typical non-production deployment flow:

```bash
supabase login
supabase link --project-ref <project-ref>
supabase functions deploy phase4-dry-run --no-verify-jwt
```

Required server-side env concepts:
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

Do not put real values in repo files.

## 5. Dry-Run Smoke Test

Run dry-run first.

Example:

```bash
curl --request POST 'https://<project-ref>.supabase.co/functions/v1/phase4-dry-run' \
  --header 'Content-Type: application/json' \
  --header 'apikey: <publishable-key>' \
  --data '{
    "intent": "ingestion",
    "triggerMode": "manual",
    "dryRun": true,
    "liveFetch": true,
    "maxItemsPerSource": 1,
    "sourceIds": ["rss_openai_blog_ai", "rss_coindesk_crypto"]
  }'
```

Expected conceptually:
- request succeeds without content writes
- response includes readable run summary
- response includes `requested_source_ids`, `selected_source_ids`, `unknown_source_ids`, and `warnings`
- per-source previews are visible
- candidate signals can appear in preview output

## 5A. Scheduled Ingestion Disabled Check

Before enabling any recurring ingestion path, confirm the server still rejects scheduled ingestion by default.

```bash
curl --request POST 'https://<project-ref>.supabase.co/functions/v1/phase4-dry-run' \
  --header 'Content-Type: application/json' \
  --header 'apikey: <publishable-key>' \
  --data '{
    "intent": "ingestion",
    "triggerMode": "scheduled",
    "dryRun": true,
    "sourceIds": ["rss_openai_blog_ai"]
  }'
```

Expected conceptually:
- response fails clearly
- response includes `code: "phase4_scheduled_ingestion_disabled"`
- no content writes occur

## 5B. Scheduled Ingestion Dry-Run When Enabled

Only after intentionally setting `PHASE4_ENABLE_SCHEDULED_INGESTION=true` server-side, start with a bounded scheduled dry-run that does not live-fetch yet. Prefer an explicit `sourceIds` allowlist or build the payload through `buildPhase4ScheduledIngestionRequest(...)`.

```bash
curl --request POST 'https://<project-ref>.supabase.co/functions/v1/phase4-dry-run' \
  --header 'Content-Type: application/json' \
  --header 'apikey: <publishable-key>' \
  --data '{
    "intent": "ingestion",
    "triggerMode": "scheduled",
    "dryRun": true,
    "liveFetch": false,
    "maxItemsPerSource": 2,
    "sourceIds": ["rss_openai_blog_ai", "rss_coindesk_crypto"]
  }'
```

Expected conceptually:
- response succeeds without writes
- response includes `scheduled_ingestion_enabled: true`
- response includes `limits_applied`
- response still includes `requested_source_ids`, `selected_source_ids`, `unknown_source_ids`, `warnings`, and per-source counts
- no AI provider call is involved
- response should prefer the explicit `sourceIds` allowlist instead of falling back to capped active-source selection

## 5C. Scheduled Ingestion Live-Fetch Dry-Run When Enabled

Only after the bounded scheduled dry-run looks healthy, run the same scheduled request with live fetch enabled:

```bash
curl --request POST 'https://<project-ref>.supabase.co/functions/v1/phase4-dry-run' \
  --header 'Content-Type: application/json' \
  --header 'apikey: <publishable-key>' \
  --data '{
    "intent": "ingestion",
    "triggerMode": "scheduled",
    "dryRun": true,
    "liveFetch": true,
    "maxItemsPerSource": 1,
    "sourceIds": ["rss_openai_blog_ai", "rss_coindesk_crypto"]
  }'
```

Expected conceptually:
- response succeeds without writes
- response includes per-source fetched / normalized / inserted / skipped / failed diagnostics
- response remains bounded by scheduled hard caps even if the request asks for more
- no AI provider call is involved

## 6. Write-Mode Smoke Test

Only run after dry-run looks healthy.

Write mode must remain guarded by:
- `dryRun: false`
- server-side write enablement
- configured `PHASE4_WRITE_AUTH_TOKEN`
- matching request token

Example:

```bash
curl --request POST 'https://<project-ref>.supabase.co/functions/v1/phase4-dry-run' \
  --header 'Content-Type: application/json' \
  --header 'apikey: <publishable-key>' \
  --header 'x-phase4-write-token: <phase4-write-auth-token>' \
  --data '{
    "intent": "ingestion",
    "triggerMode": "manual",
    "dryRun": false,
    "liveFetch": true,
    "maxItemsPerSource": 1,
    "sourceIds": ["rss_openai_blog_ai", "rss_coindesk_crypto"]
  }'
```

Expected conceptually:
- content rows may be written
- ingestion run status is recorded
- response includes per-source `reliability_tier`, `started_at`, and `completed_at`
- rerunning the same sources should not blindly duplicate raw items or deterministic candidate signals

## 6A. Scheduled Ingestion Write-Mode Smoke Test

Only after `PHASE4_ENABLE_SCHEDULED_INGESTION=true` is enabled intentionally and the scheduled dry-run looks healthy, run a bounded scheduled write-mode request.

```bash
curl --request POST 'https://<project-ref>.supabase.co/functions/v1/phase4-dry-run' \
  --header 'Content-Type: application/json' \
  --header 'apikey: <publishable-key>' \
  --header 'x-phase4-write-token: <phase4-write-auth-token>' \
  --data '{
    "intent": "ingestion",
    "triggerMode": "scheduled",
    "dryRun": false,
    "liveFetch": true,
    "maxItemsPerSource": 1,
    "sourceIds": ["rss_openai_blog_ai"]
  }'
```

Expected conceptually:
- response includes `scheduled_ingestion_enabled: true`
- response includes `limits_applied`
- response remains bounded even if the request asks for more than the scheduled caps
- only non-AI ingestion tables are written
- one failing source should not collapse the whole run if another source succeeds
- keep the first recurring operator cadence conservative, such as every `30` or `60` minutes

## 7. Row Count Verification

Verify conceptually after a successful write smoke test:
- `content_ingestion_runs` should increment per run
- `raw_source_items` should grow when genuinely new items appear
- duplicate reruns should not create duplicate `raw_source_items`
- `intelligence_signals` should grow only when genuinely new deterministic candidates appear
- `signal_topics` should become non-zero when clearly mappable items exist
- provenance/link tables should populate when source/entity/topic matches exist

Do not hardcode fragile exact counts as a requirement.

Rollback:
- disable recurring ingestion again by setting `PHASE4_ENABLE_SCHEDULED_INGESTION=false`
- rerun the disabled scheduled-ingestion curl from section `5A` and confirm `code: "phase4_scheduled_ingestion_disabled"` returns again

SQL inspection snippets:

```sql
select
  id,
  source_id,
  status,
  started_at,
  completed_at,
  items_fetched,
  items_inserted,
  items_skipped_as_duplicates,
  items_failed,
  error_message
from public.content_ingestion_runs
order by started_at desc
limit 10;
```

```sql
select
  id,
  source_id,
  title,
  canonical_url,
  published_at
from public.raw_source_items
order by published_at desc nulls last
limit 20;
```

```sql
select
  id,
  headline_en,
  headline_zh,
  primary_source_name,
  published_at,
  overall_score,
  enrichment_status,
  summary_status,
  translation_status
from public.intelligence_signals
order by published_at desc nulls last
limit 20;
```

```sql
select source_id, count(*) as raw_item_count
from public.raw_source_items
group by source_id
order by raw_item_count desc, source_id asc;
```

```sql
select signal_id, count(*) as linked_source_count
from public.signal_source_items
group by signal_id
order by linked_source_count desc, signal_id asc
limit 20;
```

```sql
select signal_id, count(*) as topic_count
from public.signal_topics
group by signal_id
order by topic_count desc, signal_id asc
limit 20;
```

```sql
select signal_id, count(*) as entity_count
from public.signal_entities
group by signal_id
order by entity_count desc, signal_id asc
limit 20;
```

## 8. Preview Read Policies

Manual read-only policy file:
- `supabase/manual/phase4_preview_read_policies.sql`

Apply it manually before frontend preview testing.

It should support read-only preview access to the Phase 4 read tables used by the frontend adapter.

## 9. Frontend Real-Content Preview

Required local env:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_USE_REAL_CONTENT_FEED=true`

Verify:
- Today shows real Supabase-backed cards
- existing visual style remains unchanged
- completed enrichment fields override deterministic preview text when present
- deterministic preview text still renders when enrichment is missing, pending, failed, or incomplete
- AI/OpenAI content can match the AI filter
- nonmatching filters show a normal empty state
- if zero preview-safe rows exist, Today shows a clear real-feed empty state instead of looking broken
- preview read failures fall back safely to mock
- preview still works even before applying the Task 12 enrichment migration
- after applying the Task 12 migration, completed enrichment fields should override deterministic summary / why-it-matters fields when present

## 10. Detail Provenance

Click a real-content card and verify:
- Detail opens safely
- headline/title renders
- source/date/category render or safely fallback
- summary renders or safely fallback
- when enrichment is missing, a subtle placeholder explains that deterministic preview summary is still being shown
- score renders when available
- source provenance is visible
- safe source links render when valid
- no fake full article body is shown
- a limited-preview message is shown when full body content is unavailable

Use [docs/TODAY_REAL_FEED_ROLLOUT_DECISION.md](/Users/jasonfeng/Desktop/project3_signalDESK/signaldesk/docs/TODAY_REAL_FEED_ROLLOUT_DECISION.md) when deciding whether the current environment is eligible for any later real-by-default Today rollout.

## 11. Mock Fallback By Setting VITE_USE_REAL_CONTENT_FEED=false

Disable preview mode locally:
- unset `VITE_USE_REAL_CONTENT_FEED`
- or set `VITE_USE_REAL_CONTENT_FEED=false`

Verify:
- Today returns to mock by default
- Radar remains mock
- the app does not depend on Phase 4 preview reads for its normal default experience

## 11A. Controlled Today Real-Feed Rollout Decision Checklist

- Set:
  - `VITE_USE_REAL_CONTENT_FEED=true`
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
- Confirm Today renders real cards with the existing visual style.
- Confirm clicking a real card opens Detail safely.
- Confirm completed enriched summary is preferred when present.
- Confirm deterministic preview summary is used when enrichment is missing, pending, failed, or incomplete.
- Confirm AI or OpenAI topic filters match real AI cards.
- Confirm nonmatching filters show the normal filter-empty state.
- Confirm zero preview-safe rows show the explicit real-empty state.
- Confirm a broken Supabase preview read falls back safely to mock.
- Confirm Radar, Watchlist, and Library remain unchanged.
- Confirm no secrets or raw internal errors appear in UI copy.
- Return to mock with `VITE_USE_REAL_CONTENT_FEED=false`.

## 12. Task 13B DeepSeek Dry-Run

Required server-side env:
- `PHASE4_ENABLE_AI_ENRICHMENT=true`
- `PHASE4_AI_DRY_RUN_ONLY=true`
- `AI_PROVIDER=deepseek`
- `DEEPSEEK_API_KEY=<server-only secret>`
- `DEEPSEEK_BASE_URL=https://api.deepseek.com`
- `DEEPSEEK_MODEL=deepseek-chat`

Example one-signal dry-run:

```bash
curl --request POST 'https://<project-ref>.supabase.co/functions/v1/phase4-dry-run' \
  --header 'Content-Type: application/json' \
  --header 'apikey: <publishable-key>' \
  --data '{
    "intent": "ai_enrichment",
    "triggerMode": "manual",
    "dryRun": true,
    "aiEnrichment": {
      "provider": "deepseek",
      "maxSignals": 1,
      "signalIds": ["<existing-intelligence-signal-id>"]
    }
  }'
```

Expected conceptually:
- response returns `dry_run: true`
- response identifies `provider: deepseek`
- response includes proposed enrichment output only
- response includes per-signal status and token estimates
- no database writes are performed
- if `DEEPSEEK_API_KEY` is missing, response fails clearly with `provider_not_configured`
- if using `--no-verify-jwt`, treat AI dry-run as operator-only and keep `maxSignals` intentionally small

Manual-only boundary check for AI:

```bash
curl --request POST 'https://<project-ref>.supabase.co/functions/v1/phase4-dry-run' \
  --header 'Content-Type: application/json' \
  --header 'apikey: <publishable-key>' \
  --data '{
    "intent": "ai_enrichment",
    "triggerMode": "scheduled",
    "dryRun": true,
    "aiEnrichment": {
      "provider": "deepseek",
      "maxSignals": 1,
      "signalIds": ["<existing-intelligence-signal-id>"]
    }
  }'
```

Expected conceptually:
- response fails clearly
- response includes `code: "ai_scheduled_trigger_not_allowed"`
- no AI writes occur

## 13. Task 13 Boundary Check

Verify conceptually:
- DeepSeek is server-side only
- no AI SDKs are imported into frontend runtime code
- frontend runtime files do not import server-only AI enrichment modules
- required server-side AI env names are:
  - `PHASE4_ENABLE_AI_ENRICHMENT`
  - `PHASE4_AI_DRY_RUN_ONLY`
  - `AI_PROVIDER`
  - `DEEPSEEK_API_KEY`
  - `DEEPSEEK_BASE_URL`
  - `DEEPSEEK_MODEL`
- future `enrichment_error` values must stay sanitized and operator-safe only
- Task 13B dry-run still performs no AI writes
- Task 13C writes only enrichment-ready fields on `public.intelligence_signals`
- no scheduled AI jobs exist
- sending `intent: "ai_enrichment"` plus `triggerMode: "scheduled"` should fail clearly
- future AI implementation is still expected to stay guarded and server-side only

## 14. Task 13C-13E DeepSeek Write Mode

Required server-side env:
- `PHASE4_ENABLE_AI_ENRICHMENT=true`
- `PHASE4_AI_DRY_RUN_ONLY=false`
- `AI_PROVIDER=deepseek`
- `DEEPSEEK_API_KEY=<server-only secret>`
- `DEEPSEEK_BASE_URL=https://api.deepseek.com`
- `DEEPSEEK_MODEL=deepseek-chat`
- `PHASE4_WRITE_AUTH_TOKEN=<server-only secret>`

Apply this migration first:
- `supabase/migrations/202605250001_phase4_ai_enrichment_leases.sql`

Example one-signal write mode:

```bash
curl --request POST 'https://<project-ref>.supabase.co/functions/v1/phase4-dry-run' \
  --header 'Content-Type: application/json' \
  --header 'apikey: <publishable-key>' \
  --header 'x-phase4-write-token: <phase4-write-auth-token>' \
  --data '{
    "dryRun": false,
    "aiEnrichment": {
      "provider": "deepseek",
      "writeMode": true,
      "maxSignals": 1,
      "signalIds": ["<existing-intelligence-signal-id>"]
    }
  }'
```

Expected conceptually:
- response returns `dry_run: false`
- response returns a `run_id`
- response returns `overall_status`
- response identifies `provider: deepseek`
- response shows `write_mode_enabled: true`
- response includes per-signal claim status, provider status, validation status, write status, and readback status
- response includes `written_count`
- only enrichment-ready fields plus additive claim/retry bookkeeping fields on `public.intelligence_signals` change
- deterministic headline/summary/category/score/provenance fields do not change

SQL verification example:

```sql
select
  id,
  enrichment_status,
  enrichment_version,
  enrichment_source,
  summary_status,
  translation_status,
  source_language,
  target_languages,
  enriched_summary_en,
  enriched_summary_zh,
  enriched_why_it_matters_en,
  enriched_why_it_matters_zh,
  enrichment_error,
  last_enriched_at,
  enrichment_claim_id,
  enrichment_claimed_at,
  enrichment_claim_expires_at,
  enrichment_attempt_count,
  enrichment_last_attempt_at,
  enrichment_next_retry_at,
  enrichment_last_run_id,
  updated_at
from public.intelligence_signals
where id = '<existing-intelligence-signal-id>';
```

Example three-signal manual batch:

```bash
curl --request POST 'https://<project-ref>.supabase.co/functions/v1/phase4-dry-run' \
  --header 'Content-Type: application/json' \
  --header 'apikey: <publishable-key>' \
  --header 'x-phase4-write-token: <phase4-write-auth-token>' \
  --data '{
    "dryRun": false,
    "aiEnrichment": {
      "provider": "deepseek",
      "writeMode": true,
      "maxSignals": 3,
      "signalIds": [
        "<signal-id-1>",
        "<signal-id-2>",
        "<signal-id-3>"
      ]
    }
  }'
```

Expected conceptually:
- processing is sequential
- at most 3 signals are attempted
- one failure does not collapse the whole batch
- `overall_status` can be `completed`, `partial_success`, `failed`, or `skipped`
- per-signal rows show `claim_status`, `provider_status`, `validation_status`, `write_status`, and `readback_status`

Retry / claim verification SQL:

```sql
select
  id,
  enrichment_status,
  enrichment_version,
  enrichment_error,
  enrichment_claim_id,
  enrichment_claimed_at,
  enrichment_claim_expires_at,
  enrichment_attempt_count,
  enrichment_last_attempt_at,
  enrichment_next_retry_at,
  enrichment_last_run_id
from public.intelligence_signals
where id in ('<signal-id-1>', '<signal-id-2>', '<signal-id-3>');
```

Safe reset for one manual re-test:

```sql
update public.intelligence_signals
set
  enrichment_status = 'not_requested',
  enrichment_version = null,
  enrichment_source = 'unknown',
  summary_status = 'not_requested',
  translation_status = 'not_requested',
  enriched_summary_en = null,
  enriched_summary_zh = null,
  enriched_why_it_matters_en = null,
  enriched_why_it_matters_zh = null,
  enrichment_error = null,
  last_enriched_at = null,
  enrichment_claim_id = null,
  enrichment_claimed_at = null,
  enrichment_claim_expires_at = null,
  enrichment_attempt_count = 0,
  enrichment_last_attempt_at = null,
  enrichment_next_retry_at = null,
  enrichment_last_run_id = null,
  updated_at = now()
where id = '<existing-intelligence-signal-id>';
```

## Suggested Manual Order

1. Apply `supabase/migrations/202605170001_phase4_content_foundation.sql`
2. Apply `supabase/migrations/202605210001_phase4_enrichment_ready.sql`
3. Apply `supabase/migrations/202605230001_phase4_enrichment_source_deepseek.sql`
4. Apply `supabase/migrations/202605250001_phase4_ai_enrichment_leases.sql`
5. Apply `supabase/manual/phase4_content_sources_smoke_seed.sql`
6. Run `supabase/manual/phase4_content_readiness_checks.sql`
7. Apply `supabase/manual/phase4_preview_read_policies.sql`
8. Deploy `phase4-dry-run` with:
   `supabase functions deploy phase4-dry-run --no-verify-jwt`
9. Run dry-run smoke test
10. Run guarded content write-mode smoke test
11. Verify row-count behavior conceptually
12. Enable frontend preview with `VITE_USE_REAL_CONTENT_FEED=true`
13. Verify Today preview, explicit feed mode behavior, and Detail provenance
14. Set `VITE_USE_REAL_CONTENT_FEED=false` and confirm mock default still holds
15. If validating Task 13B-13E, configure DeepSeek server-side env only
16. Run one-signal DeepSeek dry-run against `phase4-dry-run`
17. Set `PHASE4_AI_DRY_RUN_ONLY=false`
18. Run one-signal guarded DeepSeek write mode with `x-phase4-write-token`
19. Optionally run a three-signal manual batch write
20. Query `public.intelligence_signals` and confirm only enrichment-ready plus claim/retry fields changed
21. Open Today with `VITE_USE_REAL_CONTENT_FEED=true` and confirm enriched text is preferred when present
22. Verify the real-feed empty state and fallback-to-mock path look intentional and do not resemble a crash
23. Verify Radar, Watchlist, and Library remain untouched
24. Set `VITE_USE_REAL_CONTENT_FEED=false` and confirm mock default still holds
