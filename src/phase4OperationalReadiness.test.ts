import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { buildPhase4SmokeTestRequest } from './lib/content/phase4SmokeTestRequest';

const manualQaDocPath = resolve(process.cwd(), 'docs/PHASE_4_MANUAL_QA.md');
const readmePath = resolve(process.cwd(), 'README.md');
const edgeFunctionPath = resolve(
  process.cwd(),
  'supabase/functions/phase4-dry-run/index.ts',
);
const sharedPhase4HandlerPath = resolve(
  process.cwd(),
  'supabase/functions/_shared/phase4DryRun.ts',
);
const sharedContentStorePath = resolve(
  process.cwd(),
  'supabase/functions/_shared/supabaseContentStore.ts',
);
const readinessSqlPath = resolve(
  process.cwd(),
  'supabase/manual/phase4_content_readiness_checks.sql',
);
const contentSourcesSeedPath = resolve(
  process.cwd(),
  'supabase/manual/phase4_content_sources_smoke_seed.sql',
);
const previewReadPoliciesPath = resolve(
  process.cwd(),
  'supabase/manual/phase4_preview_read_policies.sql',
);
const appStoreReadinessDocPath = resolve(
  process.cwd(),
  'docs/APP_STORE_READINESS.md',
);
const todayRolloutDecisionDocPath = resolve(
  process.cwd(),
  'docs/TODAY_REAL_FEED_ROLLOUT_DECISION.md',
);
const todayTargetPilotDocPath = resolve(
  process.cwd(),
  'docs/TODAY_REAL_FEED_TARGET_PILOT.md',
);
const xGrokUserCuratedSourcePlanPath = resolve(
  process.cwd(),
  'docs/X_GROK_USER_CURATED_SOURCE_PLAN.md',
);

test('phase 4 manual readiness assets exist for manual SQL rollout', () => {
  assert.equal(existsSync(manualQaDocPath), true);
  assert.equal(existsSync(readmePath), true);
  assert.equal(existsSync(edgeFunctionPath), true);
  assert.equal(existsSync(sharedPhase4HandlerPath), true);
  assert.equal(existsSync(sharedContentStorePath), true);
  assert.equal(existsSync(readinessSqlPath), true);
  assert.equal(existsSync(contentSourcesSeedPath), true);
  assert.equal(existsSync(previewReadPoliciesPath), true);
  assert.equal(existsSync(appStoreReadinessDocPath), true);
  assert.equal(existsSync(todayRolloutDecisionDocPath), true);
  assert.equal(existsSync(todayTargetPilotDocPath), true);
  assert.equal(existsSync(xGrokUserCuratedSourcePlanPath), true);
});

test('phase 4 edge function uses a direct Deno-compatible npm supabase import', () => {
  const edgeFunction = readFileSync(edgeFunctionPath, 'utf8');

  assert.match(
    edgeFunction,
    /import\s+\{\s*createClient\s*\}\s+from\s+['"]npm:@supabase\/supabase-js@2['"]/i,
  );
  assert.doesNotMatch(edgeFunction, /src\/lib\/content/i);
  assert.match(edgeFunction, /from\s+['"]\.\.\/_shared\/phase4DryRun\.ts['"]/i);
  assert.match(edgeFunction, /from\s+['"]\.\.\/_shared\/supabaseContentStore\.ts['"]/i);
});

test('phase 4 readiness SQL checks required tables, indexes, canonical topics, and policy expectations', () => {
  const sql = readFileSync(readinessSqlPath, 'utf8');

  assert.match(sql, /with expected_tables\(expected_table_name\) as/i);
  assert.match(sql, /expected_tables\.expected_table_name as table_name/i);
  assert.match(sql, /\(schema_tables\.table_name is not null\) as table_exists/i);
  assert.match(sql, /content_sources/i);
  assert.match(sql, /content_ingestion_runs/i);
  assert.match(sql, /raw_source_items/i);
  assert.match(sql, /content_entities/i);
  assert.match(sql, /raw_source_item_entities/i);
  assert.match(sql, /intelligence_signals/i);
  assert.match(sql, /signal_source_items/i);
  assert.match(sql, /signal_entities/i);
  assert.match(sql, /signal_topics/i);
  assert.match(sql, /signal_translation_blocks/i);
  assert.match(sql, /canonical_topics/i);
  assert.match(sql, /raw_source_items_canonical_url_hash_idx/i);
  assert.match(sql, /intelligence_signals_candidate_key_idx/i);
  assert.match(sql, /pg_policies/i);
  assert.match(sql, /row_security/i);
});

test('phase 4 smoke-test content_sources seed SQL stays idempotent and covers the expected source subset', () => {
  const sql = readFileSync(contentSourcesSeedPath, 'utf8');

  assert.match(sql, /insert into public\.content_sources/i);
  assert.match(sql, /on conflict\s*\(id\)\s*do update/i);
  assert.match(sql, /rss_openai_blog_ai/i);
  assert.match(sql, /rss_yahoo_finance_markets/i);
  assert.match(sql, /rss_coindesk_crypto/i);
  assert.match(sql, /rss_white_house_briefing/i);
});

test('phase 4 preview read-policy SQL is manual, select-only, and scoped to preview-safe signal rows', () => {
  const sql = readFileSync(previewReadPoliciesPath, 'utf8');

  assert.match(sql, /manual-only phase 4 preview read policies/i);
  assert.match(sql, /intelligence_signals_select_preview_public/i);
  assert.match(sql, /signal_source_items_select_preview_public/i);
  assert.match(sql, /raw_source_items_select_preview_public/i);
  assert.match(sql, /signal_entities_select_preview_public/i);
  assert.match(sql, /signal_topics_select_preview_public/i);
  assert.match(sql, /content_entities_select_preview_public/i);
  assert.match(sql, /canonical_topics_select_preview_public/i);
  assert.match(sql, /to anon, authenticated/gi);
  assert.match(sql, /for select/gi);
  assert.match(sql, /candidate_preview', 'candidate', 'draft'/i);
  assert.match(sql, /generation_status is null/i);
  assert.match(sql, /generation_status::text <> 'failed'/i);
  assert.doesNotMatch(sql, /for insert/i);
  assert.doesNotMatch(sql, /for update/i);
  assert.doesNotMatch(sql, /for delete/i);
  assert.doesNotMatch(sql, /user_profiles/i);
  assert.doesNotMatch(sql, /user_topic_preferences/i);
});

test('buildPhase4SmokeTestRequest defaults to the safest smoke-test settings', () => {
  assert.deepEqual(buildPhase4SmokeTestRequest(), {
    intent: 'ingestion',
    triggerMode: 'manual',
    dryRun: true,
    liveFetch: false,
    maxItemsPerSource: 3,
  });
});

test('buildPhase4SmokeTestRequest accepts explicit source ids and write-mode overrides', () => {
  assert.deepEqual(
    buildPhase4SmokeTestRequest({
      intent: 'ingestion',
      triggerMode: 'scheduled',
      dryRun: false,
      liveFetch: true,
      maxItemsPerSource: 2,
      sourceIds: ['rss_openai_blog_ai', 'rss_coindesk_crypto'],
    }),
    {
      intent: 'ingestion',
      triggerMode: 'scheduled',
      dryRun: false,
      liveFetch: true,
      maxItemsPerSource: 2,
      sourceIds: ['rss_openai_blog_ai', 'rss_coindesk_crypto'],
    },
  );
});

test('scheduled ingestion docs mention the explicit env gate, bounded scheduled trigger, and continued AI manual-only boundary', () => {
  const readme = readFileSync(readmePath, 'utf8');
  const manualQaDoc = readFileSync(manualQaDocPath, 'utf8');

  assert.match(readme, /PHASE4_ENABLE_SCHEDULED_INGESTION/i);
  assert.match(readme, /triggerMode:\s*"scheduled"/i);
  assert.match(readme, /scheduled non-AI ingestion/i);
  assert.match(readme, /buildPhase4ScheduledIngestionRequest/i);
  assert.match(manualQaDoc, /PHASE4_ENABLE_SCHEDULED_INGESTION/i);
  assert.match(manualQaDoc, /buildPhase4ScheduledIngestionRequest/i);
  assert.match(manualQaDoc, /every `30` or `60` minutes/i);
  assert.match(manualQaDoc, /PHASE4_ENABLE_SCHEDULED_INGESTION=false/i);
  assert.match(manualQaDoc, /code:\s*"phase4_scheduled_ingestion_disabled"/i);
  assert.match(manualQaDoc, /code:\s*"ai_scheduled_trigger_not_allowed"/i);
});

test('README records the Task 22 real-feed pilot readiness without switching Today by default', () => {
  const readme = readFileSync(readmePath, 'utf8');

  assert.match(readme, /Tasks 14A-22/i);
  assert.match(readme, /Today remains mock by default/i);
  assert.match(readme, /separate explicit rollout decision/i);
  assert.match(readme, /VITE_USE_REAL_CONTENT_FEED=false/i);
  assert.match(readme, /fallback to mock/i);
  assert.match(readme, /phase4:today-pilot-check/i);
});

test('App Store readiness doc remains planning-only and does not imply Phase 4 runtime changes', () => {
  const doc = readFileSync(appStoreReadinessDocPath, 'utf8');

  assert.match(doc, /planning-only/i);
  assert.match(doc, /Do not add Capacitor in Phase 4/i);
  assert.match(doc, /Do not add\s+`?ios\/`?\s+yet/i);
  assert.match(doc, /AI enrichment remains manual-only/i);
});

test('Today real-feed rollout decision doc captures Task 20 blockers, enablement criteria, and rollback steps without switching defaults', () => {
  const doc = readFileSync(todayRolloutDecisionDocPath, 'utf8');

  assert.match(doc, /Task 20 decision/i);
  assert.match(doc, /keep Today mock by default/i);
  assert.match(doc, /explicit rollout task/i);
  assert.match(doc, /production-like validation is still required/i);
  assert.match(doc, /VITE_USE_REAL_CONTENT_FEED=true/i);
  assert.match(doc, /VITE_SUPABASE_URL/i);
  assert.match(doc, /VITE_SUPABASE_ANON_KEY/i);
  assert.match(doc, /VITE_USE_REAL_CONTENT_FEED=false/i);
  assert.match(doc, /Today must remain mock by default/i);
  assert.match(doc, /Radar, Watchlist, and Library remain unchanged/i);
  assert.match(doc, /Completed enriched summary is preferred when present/i);
  assert.match(
    doc,
    /Deterministic preview summary is used when enrichment is missing, pending, failed, or incomplete/i,
  );
  assert.match(doc, /fallback to mock/i);
  assert.match(doc, /Preview read policies applied/i);
  assert.match(doc, /Supabase anon read works/i);
  assert.match(doc, /Ingestion has recent successful runs/i);
  assert.match(doc, /data freshness acceptable/i);
  assert.match(doc, /enough source coverage/i);
  assert.match(doc, /Chinese or bilingual display is acceptable/i);
  assert.match(doc, /mobile viewport quality remains acceptable/i);
  assert.match(doc, /no Radar, Watchlist, or Library real-data coupling/i);
  assert.match(doc, /RLS or read-policy assumptions confirmed/i);
  assert.match(doc, /no frontend writes/i);
  assert.match(doc, /no secret exposure/i);
  assert.match(doc, /manual rollback tested/i);
  assert.match(doc, /the app remains useful when enrichment is missing/i);
  assert.match(doc, /Rebuild\/redeploy/i);
});

test('Today real-feed target pilot doc captures pilot-only env, QA, rollback, and stop criteria without changing defaults', () => {
  const doc = readFileSync(todayTargetPilotDocPath, 'utf8');

  assert.match(doc, /target-environment pilot/i);
  assert.match(doc, /phase4:today-pilot-check/i);
  assert.match(doc, /VITE_USE_REAL_CONTENT_FEED=true/i);
  assert.match(doc, /VITE_SUPABASE_URL/i);
  assert.match(doc, /VITE_SUPABASE_ANON_KEY/i);
  assert.match(doc, /VITE_USE_REAL_CONTENT_FEED=false/i);
  assert.match(doc, /Today remains mock by default/i);
  assert.match(doc, /Detail opens safely/i);
  assert.match(doc, /source provenance is visible/i);
  assert.match(doc, /completed and non-empty/i);
  assert.match(doc, /pending, failed, skipped, not requested, or blank/i);
  assert.match(doc, /real_empty is distinct from filter_empty/i);
  assert.match(doc, /fallback to mock/i);
  assert.match(doc, /stop criteria/i);
  assert.match(doc, /Radar, Watchlist, and Library remain unchanged/i);
  assert.match(doc, /No frontend writes/i);
  assert.match(doc, /No frontend AI calls/i);
});

test('Task 22 docs mention the local Today pilot helper command and keep it bounded to local QA only', () => {
  const readme = readFileSync(readmePath, 'utf8');
  const manualQaDoc = readFileSync(manualQaDocPath, 'utf8');
  const handoffDoc = readFileSync(resolve(process.cwd(), 'docs/CODEX_HANDOFF.md'), 'utf8');

  assert.match(readme, /phase4:today-pilot-check/i);
  assert.match(manualQaDoc, /phase4:today-pilot-check/i);
  assert.match(handoffDoc, /phase4:today-pilot-check/i);
  assert.match(handoffDoc, /no frontend ai calls/i);
  assert.match(handoffDoc, /Today remains mock by default/i);
});

test('X Grok user-curated source plan stays planning-only and preserves the server-side boundary', () => {
  const doc = readFileSync(xGrokUserCuratedSourcePlanPath, 'utf8');

  assert.match(doc, /planning only/i);
  assert.match(doc, /SignalDesk should not clone a Twitter\/X timeline/i);
  assert.match(doc, /user_x_watchlists/i);
  assert.match(doc, /raw_x_items/i);
  assert.match(doc, /candidate_signals/i);
  assert.match(doc, /X API should be treated as the raw source fetch layer/i);
  assert.match(doc, /Grok\/xAI should be treated as analysis\/enrichment\/search support/i);
  assert.match(doc, /No scraping/i);
  assert.match(doc, /No frontend X API calls/i);
  assert.match(doc, /No frontend Grok calls/i);
  assert.match(doc, /No secrets in frontend/i);
  assert.match(doc, /No default Today inclusion/i);
  assert.match(doc, /No Radar real-data integration yet/i);
  assert.match(doc, /Phase 5C: schema design for user-curated source lists/i);
  assert.match(doc, /Phase 5H: controlled Today inclusion for selected watchlists/i);
});
