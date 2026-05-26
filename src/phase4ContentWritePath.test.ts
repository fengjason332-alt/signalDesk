import test from 'node:test';
import assert from 'node:assert/strict';

import {
  SAMPLE_AI_RSS_FEED_XML,
  SAMPLE_AI_RSS_SOURCE,
} from './lib/content/rssFixtures';
import { computeRawItemHashes, normalizeFeedItem } from './lib/content/rss';
import { runPhase4Ingestion } from './lib/content/phase4DryRun';
import type {
  Phase4CandidateSignalWriteInput,
  Phase4ContentStore,
  Phase4ContentEntityUpsert,
  Phase4ContentIngestionRunCreate,
  Phase4ContentIngestionRunFinalize,
  Phase4RawItemEntityLinkUpsert,
  Phase4RawSourceItemMatch,
  Phase4RawSourceItemWriteInput,
  Phase4SignalEntityLinkUpsert,
  Phase4SignalSourceItemLinkUpsert,
  Phase4SignalTopicLinkUpsert,
} from './lib/content/supabaseContentStore';
import type { SourceRegistryEntry } from './lib/content/types';

class MockPhase4ContentStore implements Phase4ContentStore {
  public assertedSourceIds: string[][] = [];
  public createdRuns: Phase4ContentIngestionRunCreate[] = [];
  public finalizedRuns: Array<{ runId: string; update: Phase4ContentIngestionRunFinalize }> = [];
  public insertedRawItems: Phase4RawSourceItemWriteInput[] = [];
  public upsertedEntities: Phase4ContentEntityUpsert[] = [];
  public linkedEntities: Phase4RawItemEntityLinkUpsert[] = [];
  public upsertedSignals: Phase4CandidateSignalWriteInput[] = [];
  public linkedSignalSourceItems: Phase4SignalSourceItemLinkUpsert[] = [];
  public linkedSignalEntities: Phase4SignalEntityLinkUpsert[] = [];
  public linkedSignalTopics: Phase4SignalTopicLinkUpsert[] = [];
  public existingMatches = new Map<string, Phase4RawSourceItemMatch>();
  public failInsertForCanonicalUrl: string | null = null;
  public failSignalCandidateKey: string | null = null;
  public failFirstSignalUpsert = false;
  private runCounter = 0;
  private rawCounter = 0;
  private signalCounter = 0;
  private signalIdByCandidateKey = new Map<string, string>();
  private failedFirstSignalUpsert = false;

  async assertSourceIdsExist(sourceIds: string[]) {
    this.assertedSourceIds.push([...sourceIds]);
  }

  async createIngestionRun(input: Phase4ContentIngestionRunCreate) {
    this.createdRuns.push(input);
    this.runCounter += 1;

    return {
      id: `run-${this.runCounter}`,
      source_id: input.source_id,
      started_at: input.started_at,
    };
  }

  async finalizeIngestionRun(runId: string, update: Phase4ContentIngestionRunFinalize) {
    this.finalizedRuns.push({ runId, update });
  }

  async findMatchingRawItem(item: Phase4RawSourceItemWriteInput) {
    return this.existingMatches.get(item.canonical_url_hash) ?? null;
  }

  async insertRawItem(item: Phase4RawSourceItemWriteInput) {
    if (this.failInsertForCanonicalUrl === item.canonical_url) {
      throw new Error(`insert failed for ${item.canonical_url}`);
    }

    this.insertedRawItems.push(item);
    this.rawCounter += 1;

    const row = {
      id: `raw-db-${this.rawCounter}`,
      source_id: item.source_id,
      external_id: item.external_id,
      canonical_url_hash: item.canonical_url_hash,
      title_hash: item.title_hash,
      content_hash: item.content_hash,
      published_at: item.published_at,
    };
    this.existingMatches.set(item.canonical_url_hash, row);
    return row;
  }

  async upsertEntity(entity: Phase4ContentEntityUpsert) {
    this.upsertedEntities.push(entity);
    return {
      id: entity.id,
    };
  }

  async upsertRawItemEntityLink(link: Phase4RawItemEntityLinkUpsert) {
    this.linkedEntities.push(link);
  }

  async upsertCandidateSignal(signal: Phase4CandidateSignalWriteInput) {
    if (
      (this.failFirstSignalUpsert && !this.failedFirstSignalUpsert) ||
      this.failSignalCandidateKey === signal.candidate_key
    ) {
      this.failedFirstSignalUpsert = true;
      throw new Error(`signal upsert failed for ${signal.candidate_key}`);
    }

    const existingIndex = this.upsertedSignals.findIndex(
      existing => existing.candidate_key === signal.candidate_key,
    );

    if (existingIndex >= 0) {
      this.upsertedSignals[existingIndex] = signal;
      return {
        id: this.signalIdByCandidateKey.get(signal.candidate_key)!,
        candidate_key: signal.candidate_key,
        created: false,
      };
    }

    this.signalCounter += 1;
    const id = `signal-${this.signalCounter}`;
    this.signalIdByCandidateKey.set(signal.candidate_key, id);
    this.upsertedSignals.push(signal);
    return {
      id,
      candidate_key: signal.candidate_key,
      created: true,
    };
  }

  async upsertSignalSourceItemLink(link: Phase4SignalSourceItemLinkUpsert) {
    const existingIndex = this.linkedSignalSourceItems.findIndex(
      existing =>
        existing.signal_id === link.signal_id &&
        existing.raw_source_item_id === link.raw_source_item_id,
    );

    if (existingIndex >= 0) {
      this.linkedSignalSourceItems[existingIndex] = link;
      return;
    }

    this.linkedSignalSourceItems.push(link);
  }

  async upsertSignalEntityLink(link: Phase4SignalEntityLinkUpsert) {
    const existingIndex = this.linkedSignalEntities.findIndex(
      existing =>
        existing.signal_id === link.signal_id && existing.entity_id === link.entity_id,
    );

    if (existingIndex >= 0) {
      this.linkedSignalEntities[existingIndex] = link;
      return;
    }

    this.linkedSignalEntities.push(link);
  }

  async upsertSignalTopicLink(link: Phase4SignalTopicLinkUpsert) {
    const existingIndex = this.linkedSignalTopics.findIndex(
      existing =>
        existing.signal_id === link.signal_id && existing.topic_id === link.topic_id,
    );

    if (existingIndex >= 0) {
      this.linkedSignalTopics[existingIndex] = link;
      return;
    }

    this.linkedSignalTopics.push(link);
  }
}

const createFetchImpl = (xml: string) => async () => ({
  ok: true,
  status: 200,
  text: async () => xml,
});

const OPENAI_OFFICIAL_SOURCE: SourceRegistryEntry = {
  ...SAMPLE_AI_RSS_SOURCE,
  id: 'rss_openai_fixture_official',
  name: 'OpenAI Fixture Official',
  url: 'https://example.com/feeds/openai.xml',
  reliability_tier: 'official',
};

const OPENAI_OFFICIAL_RSS_FEED_XML = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>OpenAI Fixture Feed</title>
    <item>
      <guid>openai-official-001</guid>
      <title>OpenAI details new power planning for AI data centers</title>
      <link>https://example.com/openai/power-planning</link>
      <pubDate>Sat, 17 May 2026 01:15:00 GMT</pubDate>
      <description><![CDATA[<p>OpenAI says data center expansion will require new power capacity and long-term infrastructure planning.</p>]]></description>
      <content:encoded><![CDATA[<div><p>OpenAI says data center expansion will require new power capacity and long-term infrastructure planning.</p></div>]]></content:encoded>
      <author>OpenAI</author>
    </item>
  </channel>
</rss>`;

const OPENAI_ACADEMY_RSS_FEED_XML = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>OpenAI Academy Feed</title>
    <item>
      <guid>openai-academy-001</guid>
      <title>OpenAI Academy launches reasoning model curriculum for educators</title>
      <link>https://example.com/openai/academy-reasoning-curriculum</link>
      <pubDate>Sat, 17 May 2026 03:00:00 GMT</pubDate>
      <description><![CDATA[<p>OpenAI Academy is expanding teacher and student access to reasoning model lessons and guided ChatGPT usage.</p>]]></description>
      <content:encoded><![CDATA[<div><p>OpenAI Academy is expanding teacher and student access to reasoning model lessons and guided ChatGPT usage.</p></div>]]></content:encoded>
      <author>OpenAI</author>
    </item>
  </channel>
</rss>`;

const createSourceAwareFetchImpl = (sources: Record<string, string>) => async (url: string) => ({
  ok: true,
  status: 200,
  text: async () => sources[url] ?? SAMPLE_AI_RSS_FEED_XML,
});

const createPartiallyFailingFetchImpl = (
  responses: Record<string, string>,
  failingUrls: string[],
) => async (url: string) => {
  if (failingUrls.includes(url)) {
    throw new Error(`fetch failed for ${url}`);
  }

  return {
    ok: true,
    status: 200,
    text: async () => responses[url] ?? SAMPLE_AI_RSS_FEED_XML,
  };
};

test('runPhase4Ingestion keeps dry-run as the default and never writes without explicit enablement', async () => {
  const store = new MockPhase4ContentStore();

  const result = await runPhase4Ingestion(
    {
      sourceIds: [SAMPLE_AI_RSS_SOURCE.id],
      discoveredAt: '2026-05-17T12:00:00.000Z',
    },
    {
      sourceRegistry: [SAMPLE_AI_RSS_SOURCE],
      fetchImpl: createFetchImpl(SAMPLE_AI_RSS_FEED_XML),
      now: () => '2026-05-17T12:00:00.000Z',
      contentStore: store,
      allowWrites: true,
    },
  );

  assert.equal(result.dry_run, true);
  assert.equal(result.writes_disabled, true);
  assert.equal(result.ingestion_runs.length, 0);
  assert.equal(store.assertedSourceIds.length, 0);
  assert.equal(store.createdRuns.length, 0);
  assert.equal(store.insertedRawItems.length, 0);
  assert.equal(store.upsertedEntities.length, 0);
  assert.equal(store.linkedEntities.length, 0);
  assert.equal(store.upsertedSignals.length, 0);
  assert.equal(store.linkedSignalSourceItems.length, 0);
  assert.equal(store.linkedSignalEntities.length, 0);
  assert.equal(store.linkedSignalTopics.length, 0);
});

test('runPhase4Ingestion writes expected raw items and records a succeeded ingestion run in explicit write mode', async () => {
  const store = new MockPhase4ContentStore();

  const result = await runPhase4Ingestion(
    {
      dryRun: false,
      sourceIds: [SAMPLE_AI_RSS_SOURCE.id],
      discoveredAt: '2026-05-17T12:00:00.000Z',
    },
    {
      sourceRegistry: [SAMPLE_AI_RSS_SOURCE],
      fetchImpl: createFetchImpl(SAMPLE_AI_RSS_FEED_XML),
      now: () => '2026-05-17T12:00:00.000Z',
      contentStore: store,
      allowWrites: true,
    },
  );

  assert.equal(result.dry_run, false);
  assert.equal(result.writes_disabled, false);
  assert.equal(result.request_kind, 'ingestion');
  assert.equal(result.trigger_mode, 'manual');
  assert.equal(typeof result.started_at, 'string');
  assert.equal(typeof result.completed_at, 'string');
  assert.equal(result.fetched_item_count, 2);
  assert.equal(result.inserted_item_count, 2);
  assert.equal(result.skipped_duplicate_count, 0);
  assert.deepEqual(store.assertedSourceIds, [[SAMPLE_AI_RSS_SOURCE.id]]);
  assert.equal(store.createdRuns.length, 1);
  assert.equal(store.insertedRawItems.length, 2);
  assert.equal(store.upsertedSignals.length, result.candidate_signals.length);
  assert.equal(store.linkedSignalSourceItems.length, 2);
  assert.equal(store.linkedSignalEntities.length > 0, true);
  assert.equal(store.linkedSignalTopics.length > 0, true);
  assert.equal(result.ingestion_runs.length, 1);
  assert.equal(result.ingestion_runs[0]?.status, 'succeeded');
  assert.equal(result.ingestion_runs[0]?.items_inserted, 2);
  assert.equal(result.ingestion_runs[0]?.items_skipped_as_duplicates, 0);
  assert.equal(typeof result.ingestion_runs[0]?.started_at, 'string');
  assert.equal(typeof result.ingestion_runs[0]?.completed_at, 'string');
  assert.equal(result.source_previews[0]?.reliability_tier, SAMPLE_AI_RSS_SOURCE.reliability_tier);
  assert.equal(typeof result.source_previews[0]?.started_at, 'string');
  assert.equal(typeof result.source_previews[0]?.completed_at, 'string');
  assert.equal(result.summary.succeeded_source_count, 1);
  assert.equal(result.summary.partial_source_count, 0);
  assert.equal(result.summary.failed_source_count, 0);
  assert.equal(result.write_steps.every(step => step.enabled === true), true);
});

test('runPhase4Ingestion skips duplicate raw items safely and still links entities to the persisted raw item', async () => {
  const store = new MockPhase4ContentStore();
  const duplicatedItem = normalizeFeedItem(SAMPLE_AI_RSS_SOURCE, {
    guid: 'item-001',
    title: 'OpenAI expands power agreements for new data centers',
    link: 'https://example.com/ai/openai-power?utm_source=rss',
    pubDate: 'Sat, 17 May 2026 00:00:00 GMT',
    description:
      '<p>OpenAI and Microsoft are <strong>securing</strong> additional energy capacity.</p>',
    contentEncoded:
      '<div><p>OpenAI and Microsoft are securing additional energy capacity.</p></div>',
    author: 'SignalDesk Test Feed',
  });
  const duplicatedHashes = computeRawItemHashes(duplicatedItem);

  store.existingMatches.set(
    duplicatedHashes.canonical_url_hash,
    {
      id: 'raw-existing-1',
      source_id: SAMPLE_AI_RSS_SOURCE.id,
      external_id: duplicatedItem.external_id,
      canonical_url_hash: duplicatedHashes.canonical_url_hash,
      title_hash: duplicatedHashes.title_hash,
      content_hash: duplicatedHashes.content_hash,
      published_at: '2026-05-17T00:00:00.000Z',
    },
  );

  const result = await runPhase4Ingestion(
    {
      dryRun: false,
      sourceIds: [SAMPLE_AI_RSS_SOURCE.id],
      discoveredAt: '2026-05-17T12:00:00.000Z',
    },
    {
      sourceRegistry: [SAMPLE_AI_RSS_SOURCE],
      fetchImpl: createFetchImpl(SAMPLE_AI_RSS_FEED_XML),
      now: () => '2026-05-17T12:00:00.000Z',
      contentStore: store,
      allowWrites: true,
    },
  );

  assert.equal(result.inserted_item_count, 1);
  assert.equal(result.skipped_duplicate_count, 1);
  assert.equal(result.ingestion_runs[0]?.items_inserted, 1);
  assert.equal(result.ingestion_runs[0]?.items_skipped_as_duplicates, 1);
  assert.equal(store.insertedRawItems.length, 1);
  assert.equal(
    store.linkedEntities.some(link => link.raw_source_item_id === 'raw-existing-1'),
    true,
  );
});

test('runPhase4Ingestion persists deterministic candidate signals with signal-layer provenance links in write mode', async () => {
  const store = new MockPhase4ContentStore();

  const result = await runPhase4Ingestion(
    {
      dryRun: false,
      sourceIds: [SAMPLE_AI_RSS_SOURCE.id, OPENAI_OFFICIAL_SOURCE.id],
      discoveredAt: '2026-05-17T12:00:00.000Z',
      maxItemsPerSource: 1,
    },
    {
      sourceRegistry: [SAMPLE_AI_RSS_SOURCE, OPENAI_OFFICIAL_SOURCE],
      fetchImpl: createSourceAwareFetchImpl({
        [SAMPLE_AI_RSS_SOURCE.url]: SAMPLE_AI_RSS_FEED_XML,
        [OPENAI_OFFICIAL_SOURCE.url]: OPENAI_OFFICIAL_RSS_FEED_XML,
      }),
      now: () => '2026-05-17T12:00:00.000Z',
      contentStore: store,
      allowWrites: true,
    },
  );

  assert.equal(result.candidate_signals.length, 1);
  assert.equal(store.upsertedSignals.length, 1);
  assert.equal(store.upsertedSignals[0]?.candidate_key, result.candidate_signals[0]?.candidate_id);
  assert.equal(store.upsertedSignals[0]?.lifecycle_stage, 'candidate');
  assert.equal(store.upsertedSignals[0]?.deterministic_seed_version, 'phase4_det_v1');
  assert.equal(store.upsertedSignals[0]?.headline_en, result.candidate_signals[0]?.title_seed);
  assert.equal(store.linkedSignalSourceItems.length, 2);
  assert.equal(
    store.linkedSignalSourceItems.filter(link => link.is_primary === true).length,
    1,
  );
  assert.equal(
    new Set(store.linkedSignalSourceItems.map(link => link.raw_source_item_id)).size,
    2,
  );
  assert.equal(
    store.linkedSignalEntities.some(link => link.entity_id === 'entity_openai'),
    true,
  );
  assert.equal(
    store.linkedSignalTopics.some(link => link.topic_id === 'topic_ai_data_center_power'),
    true,
  );
});

test('runPhase4Ingestion returns partial_success for multi-source batches when one source fails and another succeeds', async () => {
  const store = new MockPhase4ContentStore();
  const failingSource: SourceRegistryEntry = {
    ...OPENAI_OFFICIAL_SOURCE,
    id: 'rss_openai_fixture_failing',
    name: 'OpenAI Fixture Failing',
    url: 'https://example.com/feeds/openai-failing.xml',
  };

  const result = await runPhase4Ingestion(
    {
      dryRun: false,
      sourceIds: [SAMPLE_AI_RSS_SOURCE.id, failingSource.id],
      discoveredAt: '2026-05-17T12:00:00.000Z',
      maxItemsPerSource: 1,
    },
    {
      sourceRegistry: [SAMPLE_AI_RSS_SOURCE, failingSource],
      fetchImpl: createPartiallyFailingFetchImpl(
        {
          [SAMPLE_AI_RSS_SOURCE.url]: SAMPLE_AI_RSS_FEED_XML,
        },
        [failingSource.url],
      ),
      now: () => '2026-05-17T12:00:00.000Z',
      contentStore: store,
      allowWrites: true,
    },
  );

  assert.equal(result.overall_status, 'partial_success');
  assert.equal(result.summary.overall_status, 'partial_success');
  assert.equal(result.summary.source_count, 2);
  assert.equal(result.summary.succeeded_source_count, 1);
  assert.equal(result.summary.partial_source_count, 0);
  assert.equal(result.summary.failed_source_count, 1);
  assert.equal(result.summary.signal_inserted_count >= 1, true);
  assert.equal(result.source_previews.length, 2);
  assert.equal(result.source_previews.some(source => source.status === 'succeeded'), true);
  assert.equal(result.source_previews.some(source => source.status === 'failed'), true);
  assert.equal(
    result.source_previews.find(source => source.source_id === failingSource.id)
      ?.reliability_tier,
    failingSource.reliability_tier,
  );
  assert.equal(
    result.source_previews.find(source => source.source_id === failingSource.id)?.error_message?.includes('fetch failed'),
    true,
  );
  assert.equal(result.ingestion_runs.length, 2);
});

test('runPhase4Ingestion surfaces scheduled ingestion intent as observability-only metadata without changing dry-run safety', async () => {
  const result = await runPhase4Ingestion(
    {
      sourceIds: [SAMPLE_AI_RSS_SOURCE.id],
      discoveredAt: '2026-05-17T12:00:00.000Z',
      triggerMode: 'scheduled',
      maxItemsPerSource: 1,
    },
    {
      sourceRegistry: [SAMPLE_AI_RSS_SOURCE],
      fetchImpl: createFetchImpl(SAMPLE_AI_RSS_FEED_XML),
      allowScheduledIngestion: true,
      now: () => '2026-05-17T12:00:00.000Z',
    },
  );

  assert.equal(result.dry_run, true);
  assert.equal(result.trigger_mode, 'scheduled');
  assert.equal(result.request_kind, 'ingestion');
  assert.equal(result.scheduled_ingestion_enabled, true);
  assert.equal(result.summary.write_mode_enabled, false);
  assert.equal(result.source_previews[0]?.started_at, '2026-05-17T12:00:00.000Z');
});

test('runPhase4Ingestion keeps dry-run previews usable for multi-source partial failures', async () => {
  const failingSource: SourceRegistryEntry = {
    ...OPENAI_OFFICIAL_SOURCE,
    id: 'rss_openai_fixture_dryrun_failure',
    name: 'OpenAI Fixture Dryrun Failure',
    url: 'https://example.com/feeds/openai-dryrun-failing.xml',
  };

  const result = await runPhase4Ingestion(
    {
      sourceIds: [SAMPLE_AI_RSS_SOURCE.id, failingSource.id],
      discoveredAt: '2026-05-17T12:00:00.000Z',
      maxItemsPerSource: 1,
    },
    {
      sourceRegistry: [SAMPLE_AI_RSS_SOURCE, failingSource],
      fetchImpl: createPartiallyFailingFetchImpl(
        {
          [SAMPLE_AI_RSS_SOURCE.url]: SAMPLE_AI_RSS_FEED_XML,
        },
        [failingSource.url],
      ),
      now: () => '2026-05-17T12:00:00.000Z',
    },
  );

  assert.equal(result.dry_run, true);
  assert.equal(result.overall_status, 'partial_success');
  assert.equal(result.source_previews.length, 2);
  assert.equal(result.source_previews.some(source => source.status === 'succeeded'), true);
  assert.equal(result.source_previews.some(source => source.status === 'failed'), true);
  assert.equal(result.candidate_signals.length >= 1, true);
});

test('runPhase4Ingestion persists signal_topics when OpenAI reasoning content maps to a canonical AI topic', async () => {
  const store = new MockPhase4ContentStore();
  const academySource: SourceRegistryEntry = {
    ...OPENAI_OFFICIAL_SOURCE,
    id: 'rss_openai_academy_fixture',
    name: 'OpenAI Academy Fixture',
    url: 'https://example.com/feeds/openai-academy.xml',
  };

  const result = await runPhase4Ingestion(
    {
      dryRun: false,
      sourceIds: [academySource.id],
      discoveredAt: '2026-05-17T12:00:00.000Z',
      maxItemsPerSource: 1,
    },
    {
      sourceRegistry: [academySource],
      fetchImpl: createSourceAwareFetchImpl({
        [academySource.url]: OPENAI_ACADEMY_RSS_FEED_XML,
      }),
      now: () => '2026-05-17T12:00:00.000Z',
      contentStore: store,
      allowWrites: true,
    },
  );

  assert.equal(result.candidate_signals.length, 1);
  assert.equal(
    result.candidate_signals[0]?.topic_matches.some(match => match.topic_id === 'topic_ai_agents'),
    true,
  );
  assert.equal(
    store.linkedSignalTopics.some(link => link.topic_id === 'topic_ai_agents'),
    true,
  );
});

test('runPhase4Ingestion upserts duplicate deterministic candidate signals safely across repeated writes', async () => {
  const store = new MockPhase4ContentStore();
  const options = {
    sourceRegistry: [SAMPLE_AI_RSS_SOURCE],
    fetchImpl: createFetchImpl(SAMPLE_AI_RSS_FEED_XML),
    now: () => '2026-05-17T12:00:00.000Z',
    contentStore: store,
    allowWrites: true,
  };
  const payload = {
    dryRun: false as const,
    sourceIds: [SAMPLE_AI_RSS_SOURCE.id],
    discoveredAt: '2026-05-17T12:00:00.000Z',
  };

  const first = await runPhase4Ingestion(payload, options);
  const second = await runPhase4Ingestion(payload, options);

  assert.equal(first.candidate_signals.length, second.candidate_signals.length);
  assert.equal(store.insertedRawItems.length, 2);
  assert.equal(second.ingestion_runs[0]?.items_skipped_as_duplicates, 2);
  assert.equal(
    new Set(store.upsertedSignals.map(signal => signal.candidate_key)).size,
    store.upsertedSignals.length,
  );
  assert.equal(store.linkedSignalSourceItems.length, 2);
  assert.equal(
    new Set(
      store.linkedSignalSourceItems.map(
        link => `${link.signal_id}:${link.raw_source_item_id}`,
      ),
    ).size,
    store.linkedSignalSourceItems.length,
  );
});

test('runPhase4Ingestion upserts deterministic entities and raw-item links with confidence-bearing evidence', async () => {
  const store = new MockPhase4ContentStore();

  await runPhase4Ingestion(
    {
      dryRun: false,
      sourceIds: [SAMPLE_AI_RSS_SOURCE.id],
      discoveredAt: '2026-05-17T12:00:00.000Z',
      maxItemsPerSource: 1,
    },
    {
      sourceRegistry: [SAMPLE_AI_RSS_SOURCE],
      fetchImpl: createFetchImpl(SAMPLE_AI_RSS_FEED_XML),
      now: () => '2026-05-17T12:00:00.000Z',
      contentStore: store,
      allowWrites: true,
    },
  );

  assert.equal(store.upsertedEntities.length > 0, true);
  assert.equal(
    store.upsertedEntities.some(entity => entity.id === 'entity_openai'),
    true,
  );
  assert.equal(
    store.upsertedEntities.some(entity => entity.id === 'entity_microsoft'),
    true,
  );
  assert.equal(store.linkedEntities.length > 0, true);
  assert.equal(
    store.linkedEntities.every(
      link =>
        Number.isInteger(link.confidence_score) &&
        link.confidence_score >= 60 &&
        typeof link.match_text === 'string' &&
        link.match_text.length > 0,
    ),
    true,
  );
});

test('runPhase4Ingestion records a failed ingestion run when raw item persistence fails', async () => {
  const store = new MockPhase4ContentStore();
  store.failInsertForCanonicalUrl = 'https://example.com/ai/openai-power';

  const result = await runPhase4Ingestion(
    {
      dryRun: false,
      sourceIds: [SAMPLE_AI_RSS_SOURCE.id],
      discoveredAt: '2026-05-17T12:00:00.000Z',
      maxItemsPerSource: 1,
    },
    {
      sourceRegistry: [SAMPLE_AI_RSS_SOURCE],
      fetchImpl: createFetchImpl(SAMPLE_AI_RSS_FEED_XML),
      now: () => '2026-05-17T12:00:00.000Z',
      contentStore: store,
      allowWrites: true,
    },
  );

  assert.equal(result.inserted_item_count, 0);
  assert.equal(result.failed_item_count, 1);
  assert.equal(result.ingestion_runs[0]?.status, 'failed');
  assert.equal(result.ingestion_runs[0]?.items_inserted, 0);
  assert.equal(result.ingestion_runs[0]?.items_failed, 1);
  assert.match(result.ingestion_runs[0]?.error_message ?? '', /insert failed/i);
  assert.equal(store.finalizedRuns.length, 1);
  assert.equal(store.finalizedRuns[0]?.update.status, 'failed');
});

test('runPhase4Ingestion records a partial ingestion run when deterministic signal persistence fails after raw writes succeed', async () => {
  const store = new MockPhase4ContentStore();
  store.failFirstSignalUpsert = true;

  const result = await runPhase4Ingestion(
    {
      dryRun: false,
      sourceIds: [SAMPLE_AI_RSS_SOURCE.id],
      discoveredAt: '2026-05-17T12:00:00.000Z',
    },
    {
      sourceRegistry: [SAMPLE_AI_RSS_SOURCE],
      fetchImpl: createFetchImpl(SAMPLE_AI_RSS_FEED_XML),
      now: () => '2026-05-17T12:00:00.000Z',
      contentStore: store,
      allowWrites: true,
    },
  );

  assert.equal(result.inserted_item_count, 2);
  assert.equal(result.failed_item_count, 1);
  assert.equal(result.ingestion_runs[0]?.status, 'partial');
  assert.equal(result.ingestion_runs[0]?.items_inserted, 2);
  assert.equal(result.ingestion_runs[0]?.items_failed, 1);
  assert.match(result.ingestion_runs[0]?.error_message ?? '', /signal upsert failed/i);
  assert.equal(store.upsertedSignals.length, 1);
  assert.equal(store.finalizedRuns[0]?.update.status, 'partial');
});

test('runPhase4Ingestion marks all contributing source runs partial when a multi-source candidate signal write fails', async () => {
  const store = new MockPhase4ContentStore();
  store.failFirstSignalUpsert = true;

  const result = await runPhase4Ingestion(
    {
      dryRun: false,
      sourceIds: [SAMPLE_AI_RSS_SOURCE.id, OPENAI_OFFICIAL_SOURCE.id],
      discoveredAt: '2026-05-17T12:00:00.000Z',
      maxItemsPerSource: 1,
    },
    {
      sourceRegistry: [SAMPLE_AI_RSS_SOURCE, OPENAI_OFFICIAL_SOURCE],
      fetchImpl: createSourceAwareFetchImpl({
        [SAMPLE_AI_RSS_SOURCE.url]: SAMPLE_AI_RSS_FEED_XML,
        [OPENAI_OFFICIAL_SOURCE.url]: OPENAI_OFFICIAL_RSS_FEED_XML,
      }),
      now: () => '2026-05-17T12:00:00.000Z',
      contentStore: store,
      allowWrites: true,
    },
  );

  assert.equal(result.ingestion_runs.length, 2);
  assert.equal(result.ingestion_runs.every(run => run.status === 'partial'), true);
  assert.equal(
    result.ingestion_runs.every(run =>
      (run.error_message ?? '').includes('signal upsert failed'),
    ),
    true,
  );
});
