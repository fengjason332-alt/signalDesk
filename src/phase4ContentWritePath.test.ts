import test from 'node:test';
import assert from 'node:assert/strict';

import {
  SAMPLE_AI_RSS_FEED_XML,
  SAMPLE_AI_RSS_SOURCE,
} from './lib/content/rssFixtures';
import { computeRawItemHashes, normalizeFeedItem } from './lib/content/rss';
import { runPhase4Ingestion } from './lib/content/phase4DryRun';
import type {
  Phase4ContentStore,
  Phase4ContentEntityUpsert,
  Phase4ContentIngestionRunCreate,
  Phase4ContentIngestionRunFinalize,
  Phase4RawItemEntityLinkUpsert,
  Phase4RawSourceItemMatch,
  Phase4RawSourceItemWriteInput,
} from './lib/content/supabaseContentStore';

class MockPhase4ContentStore implements Phase4ContentStore {
  public assertedSourceIds: string[][] = [];
  public createdRuns: Phase4ContentIngestionRunCreate[] = [];
  public finalizedRuns: Array<{ runId: string; update: Phase4ContentIngestionRunFinalize }> = [];
  public insertedRawItems: Phase4RawSourceItemWriteInput[] = [];
  public upsertedEntities: Phase4ContentEntityUpsert[] = [];
  public linkedEntities: Phase4RawItemEntityLinkUpsert[] = [];
  public existingMatches = new Map<string, Phase4RawSourceItemMatch>();
  public failInsertForCanonicalUrl: string | null = null;
  private runCounter = 0;
  private rawCounter = 0;

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

    return {
      id: `raw-db-${this.rawCounter}`,
      source_id: item.source_id,
      external_id: item.external_id,
      canonical_url_hash: item.canonical_url_hash,
      title_hash: item.title_hash,
      content_hash: item.content_hash,
      published_at: item.published_at,
    };
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
}

const createFetchImpl = (xml: string) => async () => ({
  ok: true,
  status: 200,
  text: async () => xml,
});

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
  assert.equal(result.fetched_item_count, 2);
  assert.equal(result.inserted_item_count, 2);
  assert.equal(result.skipped_duplicate_count, 0);
  assert.deepEqual(store.assertedSourceIds, [[SAMPLE_AI_RSS_SOURCE.id]]);
  assert.equal(store.createdRuns.length, 1);
  assert.equal(store.insertedRawItems.length, 2);
  assert.equal(result.ingestion_runs.length, 1);
  assert.equal(result.ingestion_runs[0]?.status, 'succeeded');
  assert.equal(result.ingestion_runs[0]?.items_inserted, 2);
  assert.equal(result.ingestion_runs[0]?.items_skipped_as_duplicates, 0);
  assert.equal(typeof result.ingestion_runs[0]?.started_at, 'string');
  assert.equal(typeof result.ingestion_runs[0]?.completed_at, 'string');
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
