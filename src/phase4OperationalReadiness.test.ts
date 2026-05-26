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

test('phase 4 manual readiness assets exist for manual SQL rollout', () => {
  assert.equal(existsSync(manualQaDocPath), true);
  assert.equal(existsSync(readmePath), true);
  assert.equal(existsSync(edgeFunctionPath), true);
  assert.equal(existsSync(sharedPhase4HandlerPath), true);
  assert.equal(existsSync(sharedContentStorePath), true);
  assert.equal(existsSync(readinessSqlPath), true);
  assert.equal(existsSync(contentSourcesSeedPath), true);
  assert.equal(existsSync(previewReadPoliciesPath), true);
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
  assert.match(manualQaDoc, /PHASE4_ENABLE_SCHEDULED_INGESTION/i);
  assert.match(manualQaDoc, /code:\s*"phase4_scheduled_ingestion_disabled"/i);
  assert.match(manualQaDoc, /code:\s*"ai_scheduled_trigger_not_allowed"/i);
});
