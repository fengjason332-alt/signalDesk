import test from 'node:test';
import assert from 'node:assert/strict';

import {
  mapRealContentSignalRowToSignal,
  resolveRealContentFeedEnabled,
} from './lib/content/realContentFeed';

test('resolveRealContentFeedEnabled only enables the preview feed for explicit true values', () => {
  assert.equal(resolveRealContentFeedEnabled(undefined), false);
  assert.equal(resolveRealContentFeedEnabled(''), false);
  assert.equal(resolveRealContentFeedEnabled('false'), false);
  assert.equal(resolveRealContentFeedEnabled(' TRUE '), true);
});

test('mapRealContentSignalRowToSignal applies safe fallbacks for sparse Supabase rows', () => {
  const signal = mapRealContentSignalRowToSignal({
    id: 'signal-real-1',
    primary_category: 'ai',
    categories: ['ai', 'ai', 'macro'],
    headline_en: 'OpenAI infrastructure update',
    headline_zh: null,
    summary_en: 'OpenAI is expanding compute infrastructure.',
    summary_zh: null,
    why_it_matters_en: [],
    why_it_matters_zh: [],
    primary_source_name: '',
    published_at: '',
    source_item_count: 2,
    overall_score: 87,
    signal_topics: [
      {
        relevance_score: 95,
        topic_id: 'topic_ai_data_center_power',
        canonical_topic: {
          id: 'ai_data_center_power',
          name: 'AI Data Center Power Demand',
        },
      },
      {
        relevance_score: 80,
        canonical_topic: {
          id: 'ai_data_center_power',
          name: 'AI Data Center Power Demand',
        },
      },
    ],
    signal_entities: [
      {
        relevance_score: 88,
        entity_id: 'entity-openai',
        content_entity: {
          canonical_name: 'OpenAI',
        },
      },
      {
        relevance_score: 72,
        entity_id: 'entity-openai',
        content_entity: {
          canonical_name: 'OpenAI',
        },
      },
      {
        relevance_score: 70,
        entity_id: 'entity-microsoft',
        content_entity: {
          canonical_name: 'Microsoft',
        },
      },
    ],
    signal_source_items: [
      {
        is_primary: true,
        raw_source_item: {
          title: 'Primary linked source title',
          dek: 'Linked source dek.',
          canonical_url: 'https://example.com/openai-infra',
          published_at: '2026-05-19T10:30:00.000Z',
          metadata: {
            source_name: 'Linked Source',
          },
        },
      },
    ],
  });

  assert.equal(signal.id, 'signal-real-1');
  assert.deepEqual(signal.categories, ['ai', 'macro']);
  assert.equal(signal.titleZh, 'OpenAI infrastructure update');
  assert.equal(signal.titleEn, 'OpenAI infrastructure update');
  assert.equal(signal.summaryZh, 'OpenAI is expanding compute infrastructure.');
  assert.deepEqual(signal.whyItMatters, [
    'Preview clustered 2 corroborating source items.',
    'Mapped topics: AI Data Center Power Demand.',
    'Key entities: OpenAI, Microsoft.',
  ]);
  assert.equal(signal.source, 'Linked Source');
  assert.equal(signal.timestamp, '2026-05-19');
  assert.deepEqual(signal.topics, ['AI Data Center Power Demand']);
  assert.deepEqual(signal.entities, ['OpenAI', 'Microsoft']);
  assert.equal(signal.importance, 8.7);
  assert.deepEqual(signal.tags, ['AI Data Center Power Demand', 'OpenAI', 'Microsoft']);
});
