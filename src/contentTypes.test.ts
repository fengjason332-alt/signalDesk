import test from 'node:test';
import assert from 'node:assert/strict';

import { CATEGORY_KEYS } from './types';
import {
  CONTENT_ENTITY_TYPES,
  CONTENT_LANGUAGES,
  CONTENT_SOURCE_TYPES,
  ENRICHMENT_SOURCES,
  ENRICHMENT_STATUSES,
  INGESTION_RUN_STATUSES,
  INGESTION_STATUSES,
  SIGNAL_GENERATION_STATUSES,
  SIGNAL_TRANSLATION_BLOCK_KINDS,
  SOURCE_RELIABILITY_TIERS,
  type ContentEntityRecord,
  type ContentIngestionRunRecord,
  type ContentSourceRecord,
  type GeneratedSignalRecord,
  type RawSourceItemRecord,
  type SignalScoreRecord,
  type SignalTranslationBlockRecord,
} from './lib/content/types';

test('phase 4 content constants cover the approved Task 0 foundation surface', () => {
  assert.deepEqual(CATEGORY_KEYS, [
    'ai',
    'crypto',
    'stocks',
    'robotics',
    'energy',
    'us_policy',
    'china_policy',
    'australia_policy',
    'macro',
    'geopolitics',
  ]);
  assert.deepEqual(CONTENT_SOURCE_TYPES, ['rss', 'api', 'manual']);
  assert.deepEqual(SOURCE_RELIABILITY_TIERS, [
    'official',
    'tier_1',
    'specialist',
    'aggregator',
  ]);
  assert.deepEqual(INGESTION_STATUSES, [
    'queued',
    'fetched',
    'normalized',
    'deduplicated',
    'processed',
    'failed',
  ]);
  assert.deepEqual(INGESTION_RUN_STATUSES, [
    'running',
    'succeeded',
    'partial',
    'failed',
  ]);
  assert.deepEqual(CONTENT_LANGUAGES, ['en', 'zh', 'mixed', 'unknown']);
  assert.deepEqual(CONTENT_ENTITY_TYPES, [
    'company',
    'organization',
    'person',
    'policy',
    'asset',
    'country',
    'topic',
    'macro_indicator',
  ]);
  assert.deepEqual(SIGNAL_GENERATION_STATUSES, [
    'pending',
    'generated',
    'reviewed',
    'failed',
  ]);
  assert.deepEqual(SIGNAL_TRANSLATION_BLOCK_KINDS, [
    'headline',
    'summary',
    'analysis',
    'bullet',
    'quote',
  ]);
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
});

test('representative phase 4 records are type-safe for future ingestion work', () => {
  const source: ContentSourceRecord = {
    id: 'source_reuters_ai_rss',
    name: 'Reuters AI',
    source_type: 'rss',
    category_key: 'ai',
    publisher: 'Reuters',
    base_url: 'https://www.reuters.com',
    feed_url: 'https://www.reuters.com/world/rss',
    reliability_tier: 'tier_1',
    active: true,
    created_at: '2026-05-17T00:00:00.000Z',
    updated_at: '2026-05-17T00:00:00.000Z',
  };

  const run: ContentIngestionRunRecord = {
    id: 'run_001',
    source_id: source.id,
    run_status: 'running',
    started_at: '2026-05-17T00:15:00.000Z',
    completed_at: null,
    fetched_count: 0,
    inserted_count: 0,
    skipped_count: 0,
    failed_count: 0,
    error_summary: null,
  };

  const rawItem: RawSourceItemRecord = {
    id: 'raw_001',
    source_id: source.id,
    ingestion_run_id: run.id,
    external_id: 'reuters-123',
    canonical_url: 'https://www.reuters.com/example-story',
    title: 'Power demand rises for AI data centers',
    dek: 'Operators are racing to secure firm energy supply.',
    author: 'Reuters Staff',
    published_at: '2026-05-17T00:10:00.000Z',
    discovered_at: '2026-05-17T00:15:00.000Z',
    language: 'en',
    category_keys: ['ai', 'energy'],
    raw_html: '<p>Example</p>',
    raw_text: 'Example',
    normalized_text: 'Example',
    content_hash: 'hash_content',
    title_hash: 'hash_title',
    canonical_url_hash: 'hash_url',
    ingestion_status: 'normalized',
    metadata: { region: 'us' },
    created_at: '2026-05-17T00:15:00.000Z',
    updated_at: '2026-05-17T00:15:00.000Z',
  };

  const entity: ContentEntityRecord = {
    id: 'entity_microsoft',
    canonical_name: 'Microsoft',
    entity_type: 'company',
    aliases: ['MSFT', 'Microsoft Corp.'],
    ticker: 'MSFT',
    country_code: 'US',
    metadata: { sector: 'software' },
    created_at: '2026-05-17T00:00:00.000Z',
    updated_at: '2026-05-17T00:00:00.000Z',
  };

  const scores: SignalScoreRecord = {
    importance_score: 92,
    urgency_score: 83,
    confidence_score: 78,
    relevance_score: 90,
    source_reliability_score: 88,
    overall_score: 89,
  };

  const signal: GeneratedSignalRecord = {
    id: 'signal_001',
    primary_category: 'energy',
    categories: ['energy', 'ai'],
    headline_en: 'Microsoft secures nuclear power for AI data centers',
    headline_zh: '微软为 AI 数据中心锁定核电供应',
    summary_en: 'Large data-center operators are moving toward dedicated clean baseload power.',
    summary_zh: '大型数据中心运营商正在转向专属的清洁基荷电力。',
    why_it_matters_en: [
      'Power availability is a constraint on AI expansion.',
      'Nuclear supply may improve long-term cost visibility.',
    ],
    why_it_matters_zh: [
      '电力供给正在成为 AI 扩张的关键约束。',
      '核电可能改善长期成本可见性。',
    ],
    primary_source_name: 'Reuters',
    primary_source_item_id: rawItem.id,
    source_item_count: 2,
    published_at: '2026-05-17T00:10:00.000Z',
    generated_at: '2026-05-17T00:20:00.000Z',
    generation_status: 'generated',
    enrichment_status: 'not_requested',
    enrichment_version: null,
    enrichment_source: 'unknown',
    summary_status: 'not_requested',
    translation_status: 'not_requested',
    source_language: 'en',
    target_languages: ['zh'],
    enriched_summary_en: null,
    enriched_summary_zh: null,
    enriched_why_it_matters_en: null,
    enriched_why_it_matters_zh: null,
    enrichment_error: null,
    last_enriched_at: null,
    topic_ids: ['topic_ai_data_center_power', 'topic_nuclear_energy'],
    entity_names: ['Microsoft', 'Constellation Energy'],
    tags: ['MSFT', 'Energy'],
    scores,
    created_at: '2026-05-17T00:20:00.000Z',
    updated_at: '2026-05-17T00:20:00.000Z',
  };

  const block: SignalTranslationBlockRecord = {
    id: 'translation_001',
    signal_id: signal.id,
    block_order: 0,
    block_kind: 'summary',
    source_language: 'en',
    target_language: 'zh',
    original_text: signal.summary_en,
    translated_text: signal.summary_zh,
    translation_status: 'completed',
    created_at: '2026-05-17T00:20:00.000Z',
    updated_at: '2026-05-17T00:20:00.000Z',
  };

  assert.equal(source.source_type, 'rss');
  assert.equal(run.run_status, 'running');
  assert.equal(rawItem.category_keys.includes('energy'), true);
  assert.equal(entity.entity_type, 'company');
  assert.equal(signal.scores.overall_score, 89);
  assert.equal(block.block_kind, 'summary');
});
