import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { buildPhase4SmokeTestRequest } from './lib/content/phase4SmokeTestRequest';

const manualQaDocPath = resolve(process.cwd(), 'docs/PHASE_4_MANUAL_QA.md');
const readinessSqlPath = resolve(
  process.cwd(),
  'supabase/manual/phase4_content_readiness_checks.sql',
);
const contentSourcesSeedPath = resolve(
  process.cwd(),
  'supabase/manual/phase4_content_sources_smoke_seed.sql',
);

test('phase 4 manual readiness assets exist for manual SQL rollout', () => {
  assert.equal(existsSync(manualQaDocPath), true);
  assert.equal(existsSync(readinessSqlPath), true);
  assert.equal(existsSync(contentSourcesSeedPath), true);
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

test('buildPhase4SmokeTestRequest defaults to the safest smoke-test settings', () => {
  assert.deepEqual(buildPhase4SmokeTestRequest(), {
    dryRun: true,
    liveFetch: false,
    maxItemsPerSource: 3,
  });
});

test('buildPhase4SmokeTestRequest accepts explicit source ids and write-mode overrides', () => {
  assert.deepEqual(
    buildPhase4SmokeTestRequest({
      dryRun: false,
      liveFetch: true,
      maxItemsPerSource: 2,
      sourceIds: ['rss_openai_blog_ai', 'rss_coindesk_crypto'],
    }),
    {
      dryRun: false,
      liveFetch: true,
      maxItemsPerSource: 2,
      sourceIds: ['rss_openai_blog_ai', 'rss_coindesk_crypto'],
    },
  );
});
