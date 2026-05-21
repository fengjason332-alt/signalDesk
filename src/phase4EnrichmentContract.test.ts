import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  ENRICHMENT_SOURCES,
  ENRICHMENT_STATUSES,
  getEnrichmentStatusLabel,
  isCompletedEnrichmentStatus,
  shouldUseEnrichedArray,
  shouldUseEnrichedText,
} from './lib/content/enrichment';

const migrationPath = resolve(
  process.cwd(),
  'supabase/migrations/202605210001_phase4_enrichment_ready.sql',
);

test('phase 4 enrichment constants and helpers cover the approved Task 12 status contract', () => {
  assert.deepEqual(ENRICHMENT_STATUSES, [
    'not_requested',
    'pending',
    'completed',
    'failed',
    'skipped',
  ]);
  assert.deepEqual(ENRICHMENT_SOURCES, [
    'deterministic',
    'manual',
    'unknown',
  ]);

  assert.equal(isCompletedEnrichmentStatus('completed'), true);
  assert.equal(isCompletedEnrichmentStatus('pending'), false);
  assert.equal(getEnrichmentStatusLabel('not_requested'), 'Not requested');
  assert.equal(
    shouldUseEnrichedText('completed', ' Enriched summary ready. '),
    true,
  );
  assert.equal(shouldUseEnrichedText('pending', 'Enriched summary ready.'), false);
  assert.equal(
    shouldUseEnrichedArray('completed', [' First bullet ', 'Second bullet']),
    true,
  );
  assert.equal(shouldUseEnrichedArray('failed', ['First bullet']), false);
});

test('phase 4 enrichment migration adds optional enrichment-ready columns and indexes additively', () => {
  const sql = readFileSync(migrationPath, 'utf8');

  assert.match(sql, /alter table public\.intelligence_signals/i);
  assert.match(sql, /add column if not exists enrichment_status/i);
  assert.match(sql, /add column if not exists enrichment_version/i);
  assert.match(sql, /add column if not exists enrichment_source/i);
  assert.match(sql, /add column if not exists summary_status/i);
  assert.match(sql, /add column if not exists translation_status/i);
  assert.match(sql, /add column if not exists source_language/i);
  assert.match(sql, /add column if not exists target_languages/i);
  assert.match(sql, /add column if not exists enriched_summary_en/i);
  assert.match(sql, /add column if not exists enriched_summary_zh/i);
  assert.match(sql, /add column if not exists enriched_why_it_matters_en/i);
  assert.match(sql, /add column if not exists enriched_why_it_matters_zh/i);
  assert.match(sql, /add column if not exists enrichment_error/i);
  assert.match(sql, /add column if not exists last_enriched_at/i);
  assert.match(sql, /create index if not exists intelligence_signals_enrichment_status_idx/i);
  assert.match(sql, /create index if not exists intelligence_signals_last_enriched_at_idx/i);
});
