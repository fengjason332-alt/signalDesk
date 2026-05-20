# Phase 4 Manual QA

## Scope

Phase 4 Task 10 adds preview hardening only.

- Do not change the visual style.
- Do not switch the Today feed away from mock content by default.
- Do not switch Radar away from mock content.
- Do not call AI.
- Do not add client secrets or `.env` files.
- Do not run live writes automatically.
- Do not apply migrations automatically.

## Current Smoke-Test Status

The first controlled non-production smoke tests have already succeeded:

- the Edge Function deployed successfully with `--no-verify-jwt`
- `liveFetch: true` plus `dryRun: true` succeeded
- `liveFetch: true` plus `dryRun: false` succeeded
- Phase 4 content tables now contain rows
- rerunning the same source did not duplicate:
  - `raw_source_items`
  - `intelligence_signals`
- `content_ingestion_runs` increments per run as expected

After the Task 8 deterministic topic-mapping improvements:

- `signal_topics` should now become greater than `0` for clearly mappable AI / crypto / policy items
- multi-source runs should now report `partial_success` instead of hiding all successful sources behind one batch-wide failure

After Task 9 preview-read integration:

- the frontend can now read persisted Phase 4 content rows into the existing Today card shape
- this path is preview-only and read-only
- the default Today experience is still mock content
- preview mode must be enabled locally with:
  - `VITE_USE_REAL_CONTENT_FEED=true`

After Task 10 preview hardening:

- preview cards and detail views should tolerate sparse real rows without crashing
- preview detail now preserves richer provenance when available from joined source rows
- preview rows with `generation_status = failed` should not render
- preview diagnostics should appear in the console only when `VITE_USE_REAL_CONTENT_FEED=true`
- no UI debug panel should appear

## Manual Migration Rollout

Use a non-production Supabase project only.

1. Apply the existing migration manually:
   - `supabase/migrations/202605170001_phase4_content_foundation.sql`
2. Confirm Phase 3 topics are present:
   - if `canonical_topics` is empty, manually run `supabase/migrations/202605060002_seed_canonical_topics.sql`
3. Seed the small smoke-test `content_sources` subset manually:
   - `supabase/manual/phase4_content_sources_smoke_seed.sql`
4. Run the readiness checks manually:
   - `supabase/manual/phase4_content_readiness_checks.sql`
5. Run the preview read-only policy SQL manually before frontend preview tests:
   - `supabase/manual/phase4_preview_read_policies.sql`

The smoke subset is intentionally small:

- `rss_openai_blog_ai`
- `rss_yahoo_finance_markets`
- `rss_coindesk_crypto`
- `rss_white_house_briefing`

`rss_yahoo_finance_markets` is the current stock / semiconductor-adjacent stand-in because the registry does not yet contain a dedicated Nvidia or semiconductor feed.

## Readiness Expectations

After the manual SQL steps:

- all Phase 4 tables from `202605170001_phase4_content_foundation.sql` should exist
- `canonical_topics` should already be seeded
- the smoke-test `content_sources` ids above should exist
- the required draft indexes should exist
- `canonical_topics` should still show its authenticated read policy from Phase 3
- the Phase 4 content tables should remain server-only for writes
- the frontend preview path now relies on a separate manual read-only policy rollout:
  - `supabase/manual/phase4_preview_read_policies.sql`
- for Task 9 preview reads, the frontend now also needs the manual read-only policy file applied:
  - `supabase/manual/phase4_preview_read_policies.sql`

## Edge Function Deployment

These CLI steps were aligned with current Supabase docs:

1. Authenticate and link the non-production project:
   - `supabase login`
   - `supabase link --project-ref <project-ref>`
2. Set the required server-side secrets:
   - preview-only stage:
     - `supabase secrets set SUPABASE_URL=https://<project-ref>.supabase.co`
     - `supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<service-role-key>`
     - `supabase secrets set PHASE4_ENABLE_LIVE_FETCH=true`
   - write-mode stage only, immediately before an intentional write smoke test:
     - `supabase secrets set PHASE4_ENABLE_CONTENT_WRITES=true`
     - `supabase secrets set PHASE4_WRITE_AUTH_TOKEN=<long-random-secret>`
3. Deploy the function:
   - `supabase functions deploy phase4-dry-run`

Only enable `PHASE4_ENABLE_LIVE_FETCH=true` when you are intentionally exercising live fetch against real feeds.

## Required Server Env

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `PHASE4_ENABLE_CONTENT_WRITES=true`
- `PHASE4_WRITE_AUTH_TOKEN=<secret>`
- `PHASE4_ENABLE_LIVE_FETCH=true` only for intentional live fetch tests

## Smoke-Test Request Helper

Use [src/lib/content/phase4SmokeTestRequest.ts](/Users/jasonfeng/Desktop/project3_signalDESK/signaldesk/src/lib/content/phase4SmokeTestRequest.ts) to build request payloads safely.

Default payload:

```ts
buildPhase4SmokeTestRequest()
// => { dryRun: true, liveFetch: false, maxItemsPerSource: 3 }
```

Recommended live dry-run payload:

```ts
buildPhase4SmokeTestRequest({
  sourceIds: ['rss_openai_blog_ai', 'rss_coindesk_crypto'],
  liveFetch: true,
})
```

Always provide explicit `sourceIds` for live smoke tests in this environment.
Do not rely on helper defaults when live fetch is enabled.

## Example Curl

Dry-run preview with intentional live fetch:

```bash
curl --request POST 'https://<project-ref>.supabase.co/functions/v1/phase4-dry-run' \
  --header 'Content-Type: application/json' \
  --header 'apikey: <publishable-key>' \
  --data '{
    "dryRun": true,
    "liveFetch": true,
    "maxItemsPerSource": 3,
    "sourceIds": ["rss_openai_blog_ai", "rss_coindesk_crypto"]
  }'
```

Write mode with explicit auth token:

```bash
curl --request POST 'https://<project-ref>.supabase.co/functions/v1/phase4-dry-run' \
  --header 'Content-Type: application/json' \
  --header 'apikey: <publishable-key>' \
  --header 'x-phase4-write-token: <phase4-write-auth-token>' \
  --data '{
    "dryRun": false,
    "liveFetch": true,
    "maxItemsPerSource": 3,
    "sourceIds": ["rss_openai_blog_ai", "rss_coindesk_crypto"]
  }'
```

Write mode should fail clearly unless:

- `dryRun` is `false`
- server writes are enabled
- `PHASE4_WRITE_AUTH_TOKEN` is configured
- the caller provides a matching `x-phase4-write-token`

## Recommended Next Multi-Source Smoke Test

Start with a two-source dry-run preview:

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

If that looks healthy, the next bounded write-mode smoke test is:

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

Expected behavior for a healthy multi-source partial success:

- HTTP `207`
- top-level `overall_status: "partial_success"`
- `summary.overall_status: "partial_success"`
- one or more `source_previews[].status` values may be `failed`
- successful sources should still show:
  - fetched / normalized counts
  - inserted / skipped counts
  - candidate signals when applicable
- dry-run requests should keep returning preview payloads even if one source fails

## What To Verify After A Manual Write Test

When a write-mode run succeeds, inspect:

- `content_ingestion_runs`
- `raw_source_items`
- `content_entities`
- `raw_source_item_entities`
- `intelligence_signals`
- `signal_source_items`
- `signal_entities`
- `signal_topics`

After rerunning the same source ids with the same small `maxItemsPerSource`:

- `content_ingestion_runs` should increment
- `raw_source_items` should not duplicate previously inserted identical items
- `intelligence_signals` should not duplicate previously inserted deterministic candidates
- `signal_source_items`, `signal_entities`, and `signal_topics` may upsert in place, but should not fan out duplicate rows for the same link identity

Important note on counters:

- top-level `failed_item_count` is candidate/item scoped
- `source_previews[].failed_count` is per-source scoped
- in multi-source candidate-write failures, those numbers are intentionally not additive

Do not expect:

- `signal_translation_blocks` writes
- AI summaries
- AI translations
- the default Today feed to switch away from mock content on its own

## Frontend Preview Verification

Task 9 does not switch the app by default. To preview real content locally:

1. Ensure the app already has working client-side Supabase env:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_USE_REAL_CONTENT_FEED=true`
2. Confirm real content rows exist in Supabase:
   - `intelligence_signals`
   - `signal_source_items`
   - `raw_source_items`
   - `signal_entities`
   - `signal_topics`
3. Confirm the manual read-only preview policy SQL has already been run:
   - `supabase/manual/phase4_preview_read_policies.sql`
4. Start the app normally.
5. Open Today and verify:
   - the existing visual style is unchanged
   - cards render safely even without AI summaries or translation blocks
   - clicking a preview card opens a safe detail view with available source/date/summary/provenance fields
   - detail does not show a fake generated article body when full blocks are unavailable
   - source, date, categories, and score remain visible
   - AI-related preview cards still respect the existing Today filters
   - provenance can show multiple preserved sources when the joined rows contain them
6. Toggle preview mode back off:
   - unset `VITE_USE_REAL_CONTENT_FEED` or set it to a non-`true` value
   - restart the app
   - confirm Today returns to the mock feed by default
   - confirm Radar remains mock/demo content

If the preview read fails:

- Today should fall back to the mock feed
- a non-breaking prototype toast should appear
- the app should not crash
- the most likely operational cause is missing anon/client read access across the Phase 4 content tables or joined lookup tables

Known limitation:

- there is still no AI-generated summary or translation in this preview path, so fallback text may appear when persisted rows are sparse
