# Phase 4 Manual QA

## Scope

This document covers the current manual QA path for the real-content ingestion pipeline and the read-only Today preview path.

Important boundaries:
- default Today remains mock
- Radar remains mock
- Watchlist and Library remain on current behavior
- the frontend real-content path is read-only
- no AI summary or translation exists yet
- Task 12 enrichment fields are optional and may be absent in an older preview environment
- Task 13-preflight adds server-only AI planning/contracts only and does not add a live AI QA path yet
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

## 1. Supabase Migration Applied

Manual migration file:
- `supabase/migrations/202605170001_phase4_content_foundation.sql`
- `supabase/migrations/202605210001_phase4_enrichment_ready.sql`

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

Do not put real values in repo files.

## 5. Dry-Run Smoke Test

Run dry-run first.

Example:

```bash
curl --request POST 'https://<project-ref>.supabase.co/functions/v1/phase4-dry-run' \
  --header 'Content-Type: application/json' \
  --header 'apikey: <publishable-key>' \
  --data '{
    "dryRun": true,
    "liveFetch": true,
    "maxItemsPerSource": 1,
    "sourceIds": ["rss_openai_blog_ai", "rss_coindesk_crypto"]
  }'
```

Expected conceptually:
- request succeeds without content writes
- response includes readable run summary
- per-source previews are visible
- candidate signals can appear in preview output

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
    "dryRun": false,
    "liveFetch": true,
    "maxItemsPerSource": 1,
    "sourceIds": ["rss_openai_blog_ai", "rss_coindesk_crypto"]
  }'
```

Expected conceptually:
- content rows may be written
- ingestion run status is recorded
- rerunning the same sources should not blindly duplicate raw items or deterministic candidate signals

## 7. Row Count Verification

Verify conceptually after a successful write smoke test:
- `content_ingestion_runs` should increment per run
- `raw_source_items` should grow when genuinely new items appear
- duplicate reruns should not create duplicate `raw_source_items`
- `intelligence_signals` should grow only when genuinely new deterministic candidates appear
- `signal_topics` should become non-zero when clearly mappable items exist
- provenance/link tables should populate when source/entity/topic matches exist

Do not hardcode fragile exact counts as a requirement.

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
- AI/OpenAI content can match the AI filter
- nonmatching filters show a normal empty state
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

## 11. Mock Fallback By Setting VITE_USE_REAL_CONTENT_FEED=false

Disable preview mode locally:
- unset `VITE_USE_REAL_CONTENT_FEED`
- or set `VITE_USE_REAL_CONTENT_FEED=false`

Verify:
- Today returns to mock by default
- Radar remains mock
- the app does not depend on Phase 4 preview reads for its normal default experience

## 12. Task 13-preflight Boundary Check

Verify conceptually:
- no AI provider calls have been added
- no AI SDKs or API keys are required yet
- frontend runtime files do not import server-only AI enrichment modules
- future AI env names remain placeholders only:
  - `PHASE4_ENABLE_AI_ENRICHMENT`
  - `PHASE4_AI_PROVIDER`
  - `PHASE4_AI_API_KEY`
  - `PHASE4_AI_MODEL`
  - `PHASE4_AI_MAX_SIGNALS_PER_RUN`
- future `enrichment_error` values must stay sanitized and operator-safe only
- future AI implementation is still expected to start in guarded server-side dry-run mode, not default write mode

## Suggested Manual Order

1. Apply `supabase/migrations/202605170001_phase4_content_foundation.sql`
2. Optionally apply `supabase/migrations/202605210001_phase4_enrichment_ready.sql` when validating Task 12 enrichment fields
3. Apply `supabase/manual/phase4_content_sources_smoke_seed.sql`
4. Run `supabase/manual/phase4_content_readiness_checks.sql`
5. Apply `supabase/manual/phase4_preview_read_policies.sql`
6. Deploy `phase4-dry-run`
7. Run dry-run smoke test
8. Run guarded write-mode smoke test
9. Verify row-count behavior conceptually
10. Enable frontend preview with `VITE_USE_REAL_CONTENT_FEED=true`
11. Verify Today preview and Detail provenance
12. Set `VITE_USE_REAL_CONTENT_FEED=false` and confirm mock default still holds
13. For Task 13-preflight only, verify docs and tests describe future server-side AI boundaries without introducing any live AI path
