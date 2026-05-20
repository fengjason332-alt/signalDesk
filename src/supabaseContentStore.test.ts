import test from 'node:test';
import assert from 'node:assert/strict';

import { createSupabaseContentStore } from './lib/content/supabaseContentStore';
import type {
  Phase4CandidateSignalWriteInput,
  Phase4ContentEntityUpsert,
  Phase4RawItemEntityLinkUpsert,
  Phase4RawSourceItemWriteInput,
  Phase4SignalEntityLinkUpsert,
  Phase4SignalSourceItemLinkUpsert,
  Phase4SignalTopicLinkUpsert,
} from './lib/content/supabaseContentStore';

type ContentTableName =
  | 'content_sources'
  | 'content_ingestion_runs'
  | 'raw_source_items'
  | 'content_entities'
  | 'raw_source_item_entities'
  | 'intelligence_signals'
  | 'signal_source_items'
  | 'signal_entities'
  | 'signal_topics';

class FakeContentRuntimeClient {
  tables: Record<ContentTableName, Record<string, unknown>[]> = {
    content_sources: [],
    content_ingestion_runs: [],
    raw_source_items: [],
    content_entities: [],
    raw_source_item_entities: [],
    intelligence_signals: [],
    signal_source_items: [],
    signal_entities: [],
    signal_topics: [],
  };

  private runCounter = 1;
  private rawCounter = 1;
  private signalCounter = 1;

  from(table: ContentTableName) {
    return new FakeContentRuntimeTable(this, table);
  }

  query(table: ContentTableName, filters: Array<{ column: string; value: unknown }>) {
    return this.tables[table]
      .filter(row => filters.every(filter => row[filter.column] === filter.value))
      .map(row => ({ ...row }));
  }

  insert(table: ContentTableName, value: Record<string, unknown>) {
    if (table === 'content_ingestion_runs') {
      const row = {
        id: value.id ?? `run-db-${this.runCounter++}`,
        ...value,
      };
      this.tables[table].push(row);
      return row;
    }

    if (table === 'raw_source_items') {
      const row = {
        id: value.id ?? `raw-db-${this.rawCounter++}`,
        ...value,
      };
      this.tables[table].push(row);
      return row;
    }

    if (table === 'intelligence_signals') {
      const row = {
        id: value.id ?? `signal-db-${this.signalCounter++}`,
        ...value,
      };
      this.tables[table].push(row);
      return row;
    }

    this.tables[table].push({ ...value });
    return value;
  }

  update(table: ContentTableName, filters: Array<{ column: string; value: unknown }>, value: Record<string, unknown>) {
    for (const row of this.tables[table]) {
      if (filters.every(filter => row[filter.column] === filter.value)) {
        Object.assign(row, value);
      }
    }
  }

  upsert(table: ContentTableName, value: Record<string, unknown>, onConflict?: string) {
    const keys = (onConflict ?? 'id')
      .split(',')
      .map(part => part.trim())
      .filter(Boolean);

    const matchIndex = this.tables[table].findIndex(row =>
      keys.every(key => row[key] === value[key]),
    );

    if (matchIndex >= 0) {
      this.tables[table][matchIndex] = {
        ...this.tables[table][matchIndex],
        ...value,
      };
      return this.tables[table][matchIndex];
    }

    const row = {
      ...(table === 'raw_source_item_entities'
        ? { id: `link-${this.tables[table].length + 1}` }
        : {}),
      ...(table === 'intelligence_signals' ? { id: `signal-db-${this.signalCounter++}` } : {}),
      ...value,
    };
    this.tables[table].push(row);
    return row;
  }
}

class FakeContentRuntimeTable {
  constructor(
    private client: FakeContentRuntimeClient,
    private table: ContentTableName,
  ) {}

  select(_columns: string) {
    return new FakeContentSelectBuilder(this.client, this.table);
  }

  insert(value: Record<string, unknown>) {
    const inserted = this.client.insert(this.table, value);
    return {
      select: (_columns: string) => ({
        single: () => Promise.resolve({ data: inserted, error: null }),
      }),
      then: <TResult1, TResult2 = never>(
        onfulfilled?: ((value: { data: Record<string, unknown>; error: null }) => TResult1 | PromiseLike<TResult1>) | null,
        onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
      ) => Promise.resolve({ data: inserted, error: null }).then(onfulfilled, onrejected),
    };
  }

  update(value: Record<string, unknown>) {
    return new FakeContentUpdateBuilder(this.client, this.table, value);
  }

  upsert(value: Record<string, unknown>, options?: { onConflict?: string }) {
    const upserted = this.client.upsert(this.table, value, options?.onConflict);
    return {
      select: (_columns: string) => ({
        single: () => Promise.resolve({ data: upserted, error: null }),
      }),
      then: <TResult1, TResult2 = never>(
        onfulfilled?: ((value: { data: Record<string, unknown>; error: null }) => TResult1 | PromiseLike<TResult1>) | null,
        onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
      ) => Promise.resolve({ data: upserted, error: null }).then(onfulfilled, onrejected),
    };
  }
}

class FakeContentSelectBuilder {
  private filters: Array<{ column: string; value: unknown }> = [];

  constructor(
    private client: FakeContentRuntimeClient,
    private table: ContentTableName,
  ) {}

  eq(column: string, value: unknown) {
    this.filters.push({ column, value });
    return this;
  }

  in(column: string, values: string[]) {
    const rows = this.client.tables[this.table]
      .filter(row => values.includes(String(row[column])))
      .map(row => ({ ...row }));
    return Promise.resolve({ data: rows, error: null });
  }

  maybeSingle() {
    const rows = this.client.query(this.table, this.filters);
    return Promise.resolve({ data: rows[0] ?? null, error: null });
  }

  then<TResult1 = { data: Record<string, unknown>[]; error: null }, TResult2 = never>(
    onfulfilled?:
      | ((value: { data: Record<string, unknown>[]; error: null }) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) {
    return Promise.resolve({
      data: this.client.query(this.table, this.filters),
      error: null,
    }).then(onfulfilled, onrejected);
  }
}

class FakeContentUpdateBuilder {
  private filters: Array<{ column: string; value: unknown }> = [];

  constructor(
    private client: FakeContentRuntimeClient,
    private table: ContentTableName,
    private value: Record<string, unknown>,
  ) {}

  eq(column: string, value: unknown) {
    this.filters.push({ column, value });
    return this;
  }

  then<TResult1 = { data: null; error: null }, TResult2 = never>(
    onfulfilled?:
      | ((value: { data: null; error: null }) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) {
    this.client.update(this.table, this.filters, this.value);
    return Promise.resolve({ data: null, error: null }).then(onfulfilled, onrejected);
  }
}

const RAW_ITEM_INPUT: Phase4RawSourceItemWriteInput = {
  source_id: 'rss_fixture_ai',
  ingestion_run_id: 'run-1',
  external_id: 'item-001',
  canonical_url: 'https://example.com/ai/openai-power',
  title: 'OpenAI expands power agreements for new data centers',
  dek: 'Energy capacity planning for AI expansion.',
  author: 'SignalDesk Fixture',
  published_at: '2026-05-17T00:00:00.000Z',
  discovered_at: '2026-05-17T12:00:00.000Z',
  language: 'en',
  category_keys: ['ai'],
  raw_html: '<p>OpenAI and Microsoft are securing additional energy capacity.</p>',
  raw_text: 'OpenAI and Microsoft are securing additional energy capacity.',
  normalized_text: 'OpenAI and Microsoft are securing additional energy capacity.',
  content_hash: 'content-hash-1',
  title_hash: 'title-hash-1',
  canonical_url_hash: 'url-hash-1',
  ingestion_status: 'normalized',
  metadata: {
    source_name: 'SignalDesk Fixture AI Feed',
    source_url: 'https://example.com/feeds/ai.xml',
  },
};

test('createSupabaseContentStore validates seeded content_sources before write mode proceeds', async () => {
  const client = new FakeContentRuntimeClient();
  const store = createSupabaseContentStore(client as never);

  await assert.rejects(
    () => store.assertSourceIdsExist(['rss_fixture_ai']),
    /requires seeded content_sources rows/i,
  );

  client.tables.content_sources.push({ id: 'rss_fixture_ai' });
  await assert.doesNotReject(() => store.assertSourceIdsExist(['rss_fixture_ai']));
});

test('createSupabaseContentStore creates and finalizes ingestion runs', async () => {
  const client = new FakeContentRuntimeClient();
  client.tables.content_sources.push({ id: 'rss_fixture_ai' });
  const store = createSupabaseContentStore(client as never);

  const run = await store.createIngestionRun({
    source_id: 'rss_fixture_ai',
    started_at: '2026-05-17T12:00:00.000Z',
  });

  await store.finalizeIngestionRun(run.id, {
    completed_at: '2026-05-17T12:05:00.000Z',
    status: 'succeeded',
    items_fetched: 2,
    items_inserted: 1,
    items_skipped_as_duplicates: 1,
    items_failed: 0,
    error_message: null,
  });

  assert.equal(client.tables.content_ingestion_runs.length, 1);
  assert.equal(client.tables.content_ingestion_runs[0]?.run_status, 'succeeded');
  assert.equal(client.tables.content_ingestion_runs[0]?.inserted_count, 1);
  assert.equal(client.tables.content_ingestion_runs[0]?.skipped_count, 1);
});

test('createSupabaseContentStore finds duplicate raw items deterministically and inserts new rows otherwise', async () => {
  const client = new FakeContentRuntimeClient();
  const store = createSupabaseContentStore(client as never);

  client.tables.raw_source_items.push({
    id: 'raw-existing-1',
    source_id: RAW_ITEM_INPUT.source_id,
    external_id: RAW_ITEM_INPUT.external_id,
    canonical_url_hash: RAW_ITEM_INPUT.canonical_url_hash,
    title_hash: RAW_ITEM_INPUT.title_hash,
    content_hash: RAW_ITEM_INPUT.content_hash,
    published_at: RAW_ITEM_INPUT.published_at,
  });

  const existing = await store.findMatchingRawItem(RAW_ITEM_INPUT);
  assert.equal(existing?.id, 'raw-existing-1');

  const inserted = await store.insertRawItem({
    ...RAW_ITEM_INPUT,
    external_id: 'item-002',
    canonical_url_hash: 'url-hash-2',
    title_hash: 'title-hash-2',
    content_hash: 'content-hash-2',
    canonical_url: 'https://example.com/ai/grid-financing',
    title: 'New AI grid financing vehicles emerge',
  });

  assert.equal(inserted.id, 'raw-db-1');
  assert.equal(client.tables.raw_source_items.length, 2);
});

test('createSupabaseContentStore does not suppress insertion for low-confidence duplicate candidates', async () => {
  const client = new FakeContentRuntimeClient();
  const store = createSupabaseContentStore(client as never);

  client.tables.raw_source_items.push({
    id: 'raw-low-1',
    source_id: RAW_ITEM_INPUT.source_id,
    external_id: 'different-guid',
    canonical_url_hash: 'other-url-hash',
    title_hash: RAW_ITEM_INPUT.title_hash,
    content_hash: 'other-content-hash',
    published_at: '2026-05-16T00:00:00.000Z',
  });

  const existing = await store.findMatchingRawItem(RAW_ITEM_INPUT);
  assert.equal(existing, null);
});

test('createSupabaseContentStore preserves cross-source provenance by not suppressing medium-confidence matches', async () => {
  const client = new FakeContentRuntimeClient();
  const store = createSupabaseContentStore(client as never);

  client.tables.raw_source_items.push({
    id: 'raw-medium-1',
    source_id: 'rss_other_source',
    external_id: 'other-guid',
    canonical_url_hash: 'other-url-hash',
    title_hash: 'other-title-hash',
    content_hash: RAW_ITEM_INPUT.content_hash,
    published_at: RAW_ITEM_INPUT.published_at,
  });

  const existing = await store.findMatchingRawItem(RAW_ITEM_INPUT);
  assert.equal(existing, null);
});

test('createSupabaseContentStore upserts entities and raw item entity links through a mocked Supabase client', async () => {
  const client = new FakeContentRuntimeClient();
  const store = createSupabaseContentStore(client as never);

  const entity: Phase4ContentEntityUpsert = {
    id: 'entity_openai',
    canonical_name: 'OpenAI',
    entity_type: 'company',
    aliases: ['openai'],
    ticker: null,
    country_code: null,
    metadata: {
      deterministic_entity: true,
    },
  };

  const link: Phase4RawItemEntityLinkUpsert = {
    raw_source_item_id: 'raw-db-1',
    entity_id: 'entity_openai',
    match_text: 'OpenAI expands power agreements',
    confidence_score: 83,
  };

  await store.upsertEntity(entity);
  await store.upsertRawItemEntityLink(link);
  await store.upsertRawItemEntityLink(link);

  assert.equal(client.tables.content_entities.length, 1);
  assert.equal(client.tables.content_entities[0]?.id, 'entity_openai');
  assert.equal(client.tables.raw_source_item_entities.length, 1);
  assert.equal(client.tables.raw_source_item_entities[0]?.entity_id, 'entity_openai');
});

test('createSupabaseContentStore upserts deterministic candidate signals and signal links without duplicating rows', async () => {
  const client = new FakeContentRuntimeClient();
  const store = createSupabaseContentStore(client as never);

  const signal: Phase4CandidateSignalWriteInput = {
    candidate_key: 'candidate_fixture_ai_power',
    lifecycle_stage: 'candidate',
    deterministic_seed_version: 'phase4_det_v1',
    primary_category: 'ai',
    categories: ['ai'],
    headline_en: 'OpenAI expands power agreements for new data centers',
    headline_zh: null,
    summary_en: '',
    summary_zh: null,
    why_it_matters_en: [],
    why_it_matters_zh: [],
    primary_source_name: 'SignalDesk Fixture AI Feed',
    primary_source_item_id: 'raw-db-1',
    source_item_count: 2,
    published_at: '2026-05-17T01:00:00.000Z',
    generated_at: '2026-05-17T12:00:00.000Z',
    generation_status: 'pending',
    tags: [],
    importance_score: 84,
    urgency_score: 85,
    confidence_score: 92,
    relevance_score: 74,
    source_reliability_score: 88,
    recency_score: 85,
    entity_importance_score: 84,
    topic_relevance_score: 74,
    source_count_score: 65,
    duplicate_confidence_score: 95,
    overall_score: 81,
  };

  const first = await store.upsertCandidateSignal(signal);
  const second = await store.upsertCandidateSignal({
    ...signal,
    source_item_count: 3,
    source_count_score: 78,
    overall_score: 83,
  });

  const sourceItemLink: Phase4SignalSourceItemLinkUpsert = {
    signal_id: first.id,
    raw_source_item_id: 'raw-db-1',
    is_primary: true,
  };
  const entityLink: Phase4SignalEntityLinkUpsert = {
    signal_id: first.id,
    entity_id: 'entity_openai',
    relevance_score: 92,
    mention_count: 2,
  };
  const topicLink: Phase4SignalTopicLinkUpsert = {
    signal_id: first.id,
    topic_id: 'topic_ai_data_center_power',
    relevance_score: 90,
  };

  await store.upsertSignalSourceItemLink(sourceItemLink);
  await store.upsertSignalSourceItemLink(sourceItemLink);
  await store.upsertSignalEntityLink(entityLink);
  await store.upsertSignalEntityLink(entityLink);
  await store.upsertSignalTopicLink(topicLink);
  await store.upsertSignalTopicLink(topicLink);

  assert.equal(first.id, second.id);
  assert.equal(client.tables.intelligence_signals.length, 1);
  assert.equal(client.tables.intelligence_signals[0]?.candidate_key, signal.candidate_key);
  assert.equal(client.tables.intelligence_signals[0]?.source_item_count, 3);
  assert.equal(client.tables.intelligence_signals[0]?.source_count_score, 78);
  assert.equal(client.tables.signal_source_items.length, 1);
  assert.equal(client.tables.signal_source_items[0]?.is_primary, true);
  assert.equal(client.tables.signal_entities.length, 1);
  assert.equal(client.tables.signal_entities[0]?.mention_count, 2);
  assert.equal(client.tables.signal_topics.length, 1);
  assert.equal(client.tables.signal_topics[0]?.topic_id, 'topic_ai_data_center_power');
});

test('createSupabaseContentStore preserves richer signal fields on rerun instead of clobbering future enrichment', async () => {
  const client = new FakeContentRuntimeClient();
  const store = createSupabaseContentStore(client as never);

  client.tables.intelligence_signals.push({
    id: 'signal-db-existing',
    candidate_key: 'candidate_fixture_ai_power',
    lifecycle_stage: 'draft',
    deterministic_seed_version: 'phase4_det_v1',
    primary_category: 'ai',
    categories: ['ai'],
    headline_en: 'Refined OpenAI power expansion headline',
    headline_zh: 'OpenAI 扩张电力布局',
    summary_en: 'Existing enriched summary',
    summary_zh: '已有中文摘要',
    why_it_matters_en: ['Existing why it matters'],
    why_it_matters_zh: ['已有中文要点'],
    primary_source_name: 'SignalDesk Fixture AI Feed',
    primary_source_item_id: 'raw-db-1',
    source_item_count: 2,
    published_at: '2026-05-17T01:00:00.000Z',
    generated_at: '2026-05-17T12:00:00.000Z',
    generation_status: 'generated',
    tags: ['existing-tag'],
    importance_score: 84,
    urgency_score: 85,
    confidence_score: 92,
    relevance_score: 74,
    source_reliability_score: 88,
    recency_score: 85,
    entity_importance_score: 84,
    topic_relevance_score: 74,
    source_count_score: 65,
    duplicate_confidence_score: 95,
    overall_score: 81,
  });

  const updated = await store.upsertCandidateSignal({
    candidate_key: 'candidate_fixture_ai_power',
    lifecycle_stage: 'candidate',
    deterministic_seed_version: 'phase4_det_v1',
    primary_category: 'ai',
    categories: ['ai'],
    headline_en: 'OpenAI expands power agreements for new data centers',
    headline_zh: null,
    summary_en: '',
    summary_zh: null,
    why_it_matters_en: [],
    why_it_matters_zh: [],
    primary_source_name: 'SignalDesk Fixture AI Feed',
    primary_source_item_id: 'raw-db-1',
    source_item_count: 3,
    published_at: '2026-05-17T01:00:00.000Z',
    generated_at: '2026-05-17T13:00:00.000Z',
    generation_status: 'pending',
    tags: [],
    importance_score: 86,
    urgency_score: 87,
    confidence_score: 93,
    relevance_score: 75,
    source_reliability_score: 88,
    recency_score: 87,
    entity_importance_score: 86,
    topic_relevance_score: 75,
    source_count_score: 78,
    duplicate_confidence_score: 95,
    overall_score: 84,
  });

  assert.equal(updated.id, 'signal-db-existing');
  assert.equal(client.tables.intelligence_signals.length, 1);
  assert.equal(
    client.tables.intelligence_signals[0]?.headline_en,
    'Refined OpenAI power expansion headline',
  );
  assert.equal(client.tables.intelligence_signals[0]?.headline_zh, 'OpenAI 扩张电力布局');
  assert.equal(client.tables.intelligence_signals[0]?.summary_en, 'Existing enriched summary');
  assert.equal(client.tables.intelligence_signals[0]?.summary_zh, '已有中文摘要');
  assert.equal(client.tables.intelligence_signals[0]?.generation_status, 'generated');
  assert.equal(client.tables.intelligence_signals[0]?.lifecycle_stage, 'draft');
  assert.deepEqual(client.tables.intelligence_signals[0]?.tags, ['existing-tag']);
  assert.equal(client.tables.intelligence_signals[0]?.source_item_count, 3);
  assert.equal(client.tables.intelligence_signals[0]?.overall_score, 84);
});
