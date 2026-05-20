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

test('mapRealContentSignalRowToSignal prefers headline_zh, then headline_en, then linked raw source title', () => {
  const zhPreferred = mapRealContentSignalRowToSignal({
    id: 'signal-real-zh',
    primary_category: 'ai',
    categories: ['ai'],
    headline_en: 'English fallback headline',
    headline_zh: '中文标题',
    summary_en: null,
    summary_zh: null,
    why_it_matters_en: [],
    why_it_matters_zh: [],
    primary_source_name: 'OpenAI',
    published_at: '2026-05-20T08:00:00.000Z',
    overall_score: 70,
    signal_topics: [],
    signal_entities: [],
    signal_source_items: [],
  });

  const rawTitleFallback = mapRealContentSignalRowToSignal({
    id: 'signal-real-raw-title',
    primary_category: 'ai',
    categories: ['ai'],
    headline_en: null,
    headline_zh: null,
    summary_en: null,
    summary_zh: null,
    why_it_matters_en: [],
    why_it_matters_zh: [],
    primary_source_name: '',
    published_at: null,
    created_at: '2026-05-20T09:00:00.000Z',
    overall_score: 40,
    signal_topics: [],
    signal_entities: [],
    signal_source_items: [
      {
        is_primary: true,
        raw_source_item: {
          source_id: 'rss_openai_blog_ai',
          title: 'Raw source fallback title',
          dek: 'A linked dek fallback.',
          canonical_url: 'https://openai.com/news/example',
          published_at: null,
          created_at: '2026-05-20T10:00:00.000Z',
          normalized_text: null,
          metadata: null,
        },
      },
    ],
  });

  assert.equal(zhPreferred.titleZh, '中文标题');
  assert.equal(zhPreferred.titleEn, 'English fallback headline');
  assert.equal(rawTitleFallback.titleZh, 'Raw source fallback title');
  assert.equal(rawTitleFallback.titleEn, 'Raw source fallback title');
});

test('mapRealContentSignalRowToSignal does not require a signal title column and falls back through raw source summary/source/date fields', () => {
  const signal = mapRealContentSignalRowToSignal({
    id: 'signal-real-fallbacks',
    primary_category: 'macro',
    categories: ['macro'],
    headline_en: null,
    headline_zh: null,
    summary_en: null,
    summary_zh: null,
    why_it_matters_en: [],
    why_it_matters_zh: [],
    primary_source_name: '',
    published_at: null,
    created_at: '2026-05-21T02:00:00.000Z',
    overall_score: 63,
    signal_topics: [],
    signal_entities: [],
    signal_source_items: [
      {
        is_primary: true,
        raw_source_item: {
          source_id: 'rss_white_house_briefing',
          title: 'Raw item title fallback',
          dek: '',
          canonical_url: 'https://example.com/policy-update',
          published_at: '',
          created_at: '2026-05-20T10:00:00.000Z',
          normalized_text:
            'The White House outlined a new export control posture for advanced chips and related policy coordination with allies.',
          metadata: null,
        },
      },
    ],
  });

  assert.equal(signal.titleZh, 'Raw item title fallback');
  assert.equal(
    signal.summaryZh,
    'The White House outlined a new export control posture for advanced chips and related policy coordination with allies.',
  );
  assert.equal(signal.source, 'rss_white_house_briefing');
  assert.equal(signal.timestamp, '2026-05-21');
});
