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

test('mapRealContentSignalRowToSignal uses primary_source_item_id to choose the primary joined source and prefers publisher metadata for source label', () => {
  const signal = mapRealContentSignalRowToSignal({
    id: 'signal-real-primary-source-item-id',
    primary_category: 'ai',
    categories: ['ai'],
    headline_en: 'Primary source item id selection',
    headline_zh: null,
    summary_en: null,
    summary_zh: null,
    why_it_matters_en: [],
    why_it_matters_zh: [],
    primary_source_name: '',
    published_at: null,
    primary_source_item_id: 'raw-preferred',
    overall_score: 50,
    signal_topics: [],
    signal_entities: [],
    signal_source_items: [
      {
        is_primary: false,
        raw_source_item: {
          id: 'raw-other',
          source_id: 'rss_internal_other',
          title: 'Other title',
          canonical_url: 'https://example.com/other',
          published_at: '2026-05-20T07:00:00.000Z',
          metadata: {
            source_name: 'Other Source',
          },
        },
      },
      {
        is_primary: false,
        raw_source_item: {
          id: 'raw-preferred',
          source_id: 'rss_internal_preferred',
          title: 'Preferred raw title',
          canonical_url: 'https://example.com/preferred',
          published_at: '2026-05-20T08:00:00.000Z',
          metadata: {
            publisher: 'Preferred Publisher',
          },
        },
      },
    ],
  });

  assert.equal(signal.titleZh, 'Primary source item id selection');
  assert.equal(signal.source, 'Preferred Publisher');
  assert.equal(signal.timestamp, '2026-05-20');
  assert.deepEqual(signal.realContentPreview?.provenanceSources, [
    {
      rawSourceItemId: 'raw-preferred',
      sourceId: 'rss_internal_preferred',
      sourceName: 'Preferred Publisher',
      sourceUrl: 'https://example.com/preferred',
      publishedAt: '2026-05-20T08:00:00.000Z',
      isPrimary: true,
    },
    {
      rawSourceItemId: 'raw-other',
      sourceId: 'rss_internal_other',
      sourceName: 'Other Source',
      sourceUrl: 'https://example.com/other',
      publishedAt: '2026-05-20T07:00:00.000Z',
      isPrimary: false,
    },
  ]);
});

test('mapRealContentSignalRowToSignal preserves preview provenance metadata across multiple linked sources', () => {
  const signal = mapRealContentSignalRowToSignal({
    id: 'signal-real-provenance',
    primary_category: 'ai',
    categories: null,
    headline_en: null,
    headline_zh: null,
    summary_en: null,
    summary_zh: null,
    why_it_matters_en: [],
    why_it_matters_zh: [],
    primary_source_name: 'OpenAI',
    published_at: null,
    created_at: '2026-05-20T09:00:00.000Z',
    lifecycle_stage: 'candidate_preview',
    generation_status: 'drafted',
    primary_source_item_id: 'raw-1',
    source_item_count: 2,
    overall_score: 76,
    tags: null,
    signal_topics: null,
    signal_entities: null,
    signal_source_items: [
      {
        is_primary: true,
        raw_source_item: {
          id: 'raw-1',
          source_id: 'rss_openai_blog_ai',
          title: 'OpenAI expands access',
          canonical_url: 'https://openai.com/index/openai-expands-access',
          published_at: '2026-05-20T08:00:00.000Z',
          metadata: {
            source_name: 'OpenAI',
          },
        },
      },
      {
        is_primary: false,
        raw_source_item: {
          id: 'raw-2',
          source_id: 'rss_reuters_ai',
          title: 'Reuters follow-up',
          canonical_url: 'https://www.reuters.com/world/openai-follow-up',
          published_at: '2026-05-20T09:30:00.000Z',
          metadata: {
            source_name: 'Reuters',
          },
        },
      },
    ],
  });

  assert.equal(signal.realContentPreview?.previewKind, 'real_content');
  assert.equal(signal.realContentPreview?.lifecycleStage, 'candidate_preview');
  assert.equal(signal.realContentPreview?.generationStatus, 'drafted');
  assert.equal(signal.realContentPreview?.primarySourceItemId, 'raw-1');
  assert.equal(signal.realContentPreview?.sourceItemCount, 2);
  assert.deepEqual(signal.realContentPreview?.provenanceSources, [
    {
      rawSourceItemId: 'raw-1',
      sourceId: 'rss_openai_blog_ai',
      sourceName: 'OpenAI',
      sourceUrl: 'https://openai.com/index/openai-expands-access',
      publishedAt: '2026-05-20T08:00:00.000Z',
      isPrimary: true,
    },
    {
      rawSourceItemId: 'raw-2',
      sourceId: 'rss_reuters_ai',
      sourceName: 'Reuters',
      sourceUrl: 'https://www.reuters.com/world/openai-follow-up',
      publishedAt: '2026-05-20T09:30:00.000Z',
      isPrimary: false,
    },
  ]);
});

test('mapRealContentSignalRowToSignal drops unsafe provenance URLs and falls back to primary_source_name provenance', () => {
  const unsafeUrlSignal = mapRealContentSignalRowToSignal({
    id: 'signal-real-unsafe-url',
    primary_category: 'ai',
    categories: ['ai'],
    headline_en: 'Unsafe URL example',
    headline_zh: null,
    summary_en: null,
    summary_zh: null,
    why_it_matters_en: [],
    why_it_matters_zh: [],
    primary_source_name: 'OpenAI',
    published_at: '2026-05-20T08:00:00.000Z',
    lifecycle_stage: 'candidate_preview',
    generation_status: 'drafted',
    overall_score: 55,
    signal_topics: [],
    signal_entities: [],
    signal_source_items: [
      {
        is_primary: true,
        raw_source_item: {
          id: 'raw-unsafe-1',
          source_id: 'rss_openai_blog_ai',
          canonical_url: 'javascript:alert(1)',
          published_at: '2026-05-20T08:00:00.000Z',
          metadata: {
            source_name: 'OpenAI',
          },
        },
      },
    ],
  });

  const primaryNameOnlySignal = mapRealContentSignalRowToSignal({
    id: 'signal-real-primary-name-only',
    primary_category: 'macro',
    categories: ['macro'],
    headline_en: null,
    headline_zh: null,
    summary_en: null,
    summary_zh: null,
    why_it_matters_en: [],
    why_it_matters_zh: [],
    primary_source_name: 'White House Briefing Room',
    published_at: '2026-05-20T08:00:00.000Z',
    lifecycle_stage: 'candidate',
    generation_status: null,
    overall_score: 61,
    signal_topics: [],
    signal_entities: [],
    signal_source_items: [],
  });

  assert.deepEqual(unsafeUrlSignal.realContentPreview?.provenanceSources, [
    {
      rawSourceItemId: 'raw-unsafe-1',
      sourceId: 'rss_openai_blog_ai',
      sourceName: 'OpenAI',
      publishedAt: '2026-05-20T08:00:00.000Z',
      isPrimary: true,
    },
  ]);

  assert.deepEqual(primaryNameOnlySignal.realContentPreview?.provenanceSources, [
    {
      sourceName: 'White House Briefing Room',
      isPrimary: true,
    },
  ]);
});

test('mapRealContentSignalRowToSignal preserves source count, primary source first, and safe multi-source provenance metadata', () => {
  const signal = mapRealContentSignalRowToSignal({
    id: 'signal-real-source-count',
    primary_category: 'ai',
    categories: ['ai'],
    headline_en: 'OpenAI model launch corroborated by multiple outlets',
    headline_zh: null,
    summary_en: 'Multiple outlets corroborate the same update.',
    summary_zh: null,
    why_it_matters_en: [],
    why_it_matters_zh: [],
    primary_source_name: 'OpenAI',
    published_at: '2026-05-20T08:00:00.000Z',
    lifecycle_stage: 'candidate_preview',
    generation_status: 'drafted',
    primary_source_item_id: 'raw-openai-1',
    source_item_count: 3,
    overall_score: 92,
    signal_topics: [],
    signal_entities: [],
    signal_source_items: [
      {
        is_primary: false,
        raw_source_item: {
          id: 'raw-reuters-1',
          source_id: 'rss_reuters_ai',
          canonical_url: 'https://www.reuters.com/world/openai-follow-up',
          published_at: '2026-05-20T09:00:00.000Z',
          metadata: {
            source_name: 'Reuters',
          },
        },
      },
      {
        is_primary: true,
        raw_source_item: {
          id: 'raw-openai-1',
          source_id: 'rss_openai_blog_ai',
          canonical_url: 'https://openai.com/news/example',
          published_at: '2026-05-20T08:00:00.000Z',
          metadata: {
            source_name: 'OpenAI',
          },
        },
      },
      {
        is_primary: false,
        raw_source_item: {
          id: 'raw-axios-1',
          source_id: 'rss_axios_ai',
          canonical_url: 'https://www.axios.com/2026/05/20/openai',
          published_at: '2026-05-20T10:00:00.000Z',
          metadata: {
            source_name: 'Axios',
          },
        },
      },
    ],
  });

  assert.equal(signal.realContentPreview?.sourceItemCount, 3);
  assert.deepEqual(signal.realContentPreview?.provenanceSources, [
    {
      rawSourceItemId: 'raw-openai-1',
      sourceId: 'rss_openai_blog_ai',
      sourceName: 'OpenAI',
      sourceUrl: 'https://openai.com/news/example',
      publishedAt: '2026-05-20T08:00:00.000Z',
      isPrimary: true,
    },
    {
      rawSourceItemId: 'raw-axios-1',
      sourceId: 'rss_axios_ai',
      sourceName: 'Axios',
      sourceUrl: 'https://www.axios.com/2026/05/20/openai',
      publishedAt: '2026-05-20T10:00:00.000Z',
      isPrimary: false,
    },
    {
      rawSourceItemId: 'raw-reuters-1',
      sourceId: 'rss_reuters_ai',
      sourceName: 'Reuters',
      sourceUrl: 'https://www.reuters.com/world/openai-follow-up',
      publishedAt: '2026-05-20T09:00:00.000Z',
      isPrimary: false,
    },
  ]);
});

test('mapRealContentSignalRowToSignal excludes unsafe source URLs from mapped source and provenance links', () => {
  const signal = mapRealContentSignalRowToSignal({
    id: 'signal-real-unsafe-source-link',
    primary_category: 'ai',
    categories: ['ai'],
    headline_en: 'Unsafe source link example',
    headline_zh: null,
    summary_en: null,
    summary_zh: null,
    why_it_matters_en: [],
    why_it_matters_zh: [],
    primary_source_name: '',
    published_at: '2026-05-20T08:00:00.000Z',
    overall_score: 80,
    signal_topics: [],
    signal_entities: [],
    signal_source_items: [
      {
        is_primary: true,
        raw_source_item: {
          id: 'raw-source-link-1',
          source_id: 'rss_openai_blog_ai',
          canonical_url: 'javascript:alert(1)',
          metadata: {
            source_name: '',
            source_url: 'data:text/html;base64,abc',
          },
        },
      },
    ],
  });

  assert.equal(signal.source, 'rss_openai_blog_ai');
  assert.deepEqual(signal.realContentPreview?.provenanceSources, [
    {
      rawSourceItemId: 'raw-source-link-1',
      sourceId: 'rss_openai_blog_ai',
      sourceName: 'rss_openai_blog_ai',
      isPrimary: true,
    },
  ]);
});
