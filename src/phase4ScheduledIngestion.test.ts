import test from 'node:test';
import assert from 'node:assert/strict';

import {
  SAMPLE_AI_RSS_FEED_XML,
  SAMPLE_AI_RSS_SOURCE,
} from './lib/content/rssFixtures';
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
import { createPhase4IngestionHandler } from '../supabase/functions/_shared/phase4DryRun.ts';

class ScheduledMockContentStore implements Phase4ContentStore {
  public assertedSourceIds: string[][] = [];
  public createdRuns: Phase4ContentIngestionRunCreate[] = [];
  public finalizedRuns: Array<{ runId: string; update: Phase4ContentIngestionRunFinalize }> =
    [];
  public insertedRawItems: Phase4RawSourceItemWriteInput[] = [];
  public upsertedEntities: Phase4ContentEntityUpsert[] = [];
  public linkedEntities: Phase4RawItemEntityLinkUpsert[] = [];
  public upsertedSignals: Phase4CandidateSignalWriteInput[] = [];
  public linkedSignalSourceItems: Phase4SignalSourceItemLinkUpsert[] = [];
  public linkedSignalEntities: Phase4SignalEntityLinkUpsert[] = [];
  public linkedSignalTopics: Phase4SignalTopicLinkUpsert[] = [];
  private rawCounter = 0;
  private signalCounter = 0;

  async assertSourceIdsExist(sourceIds: string[]) {
    this.assertedSourceIds.push([...sourceIds]);
  }

  async createIngestionRun(input: Phase4ContentIngestionRunCreate) {
    this.createdRuns.push(input);
    return {
      id: `scheduled-run-${this.createdRuns.length}`,
      source_id: input.source_id,
      started_at: input.started_at,
    };
  }

  async finalizeIngestionRun(runId: string, update: Phase4ContentIngestionRunFinalize) {
    this.finalizedRuns.push({ runId, update });
  }

  async findMatchingRawItem(
    _item: Phase4RawSourceItemWriteInput,
  ): Promise<Phase4RawSourceItemMatch | null> {
    return null;
  }

  async insertRawItem(item: Phase4RawSourceItemWriteInput) {
    this.insertedRawItems.push(item);
    this.rawCounter += 1;
    return {
      id: `scheduled-raw-${this.rawCounter}`,
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
    return { id: entity.id };
  }

  async upsertRawItemEntityLink(link: Phase4RawItemEntityLinkUpsert) {
    this.linkedEntities.push(link);
  }

  async upsertCandidateSignal(signal: Phase4CandidateSignalWriteInput) {
    this.upsertedSignals.push(signal);
    this.signalCounter += 1;
    return {
      id: `scheduled-signal-${this.signalCounter}`,
      candidate_key: signal.candidate_key,
      created: true,
    };
  }

  async upsertSignalSourceItemLink(link: Phase4SignalSourceItemLinkUpsert) {
    this.linkedSignalSourceItems.push(link);
  }

  async upsertSignalEntityLink(link: Phase4SignalEntityLinkUpsert) {
    this.linkedSignalEntities.push(link);
  }

  async upsertSignalTopicLink(link: Phase4SignalTopicLinkUpsert) {
    this.linkedSignalTopics.push(link);
  }
}

const makeSource = (id: string, url: string, name = id): SourceRegistryEntry => ({
  ...SAMPLE_AI_RSS_SOURCE,
  id,
  name,
  url,
});

const createFetchImpl = (responses: Record<string, string>, failingUrls: string[] = []) =>
  async (url: string) => {
    if (failingUrls.includes(url)) {
      throw new Error(`fetch failed for ${url}`);
    }

    return {
      ok: true,
      status: 200,
      text: async () => responses[url] ?? SAMPLE_AI_RSS_FEED_XML,
    };
  };

test('scheduled non-AI ingestion is rejected by default when PHASE4_ENABLE_SCHEDULED_INGESTION is not enabled', async () => {
  const handler = createPhase4IngestionHandler({
    sourceRegistry: [SAMPLE_AI_RSS_SOURCE],
    fetchImpl: createFetchImpl({
      [SAMPLE_AI_RSS_SOURCE.url]: SAMPLE_AI_RSS_FEED_XML,
    }),
    now: () => '2026-05-26T10:00:00.000Z',
  });

  const response = await handler(
    new Request('http://localhost/phase4-dry-run', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        intent: 'ingestion',
        triggerMode: 'scheduled',
        dryRun: true,
        sourceIds: [SAMPLE_AI_RSS_SOURCE.id],
      }),
    }),
  );

  assert.equal(response.status, 403);
  const payload = await response.json();
  assert.equal(payload.code, 'phase4_scheduled_ingestion_disabled');
  assert.equal(payload.trigger_mode, 'scheduled');
});

test('scheduled non-AI ingestion dry-run works when PHASE4_ENABLE_SCHEDULED_INGESTION is enabled and writes nothing', async () => {
  const store = new ScheduledMockContentStore();
  const handler = createPhase4IngestionHandler({
    sourceRegistry: [SAMPLE_AI_RSS_SOURCE],
    fetchImpl: createFetchImpl({
      [SAMPLE_AI_RSS_SOURCE.url]: SAMPLE_AI_RSS_FEED_XML,
    }),
    allowScheduledIngestion: true,
    contentStore: store,
    now: () => '2026-05-26T10:00:00.000Z',
  });

  const response = await handler(
    new Request('http://localhost/phase4-dry-run', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        intent: 'ingestion',
        triggerMode: 'scheduled',
        dryRun: true,
        sourceIds: [SAMPLE_AI_RSS_SOURCE.id],
        maxItemsPerSource: 1,
      }),
    }),
  );

  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.request_kind, 'ingestion');
  assert.equal(payload.trigger_mode, 'scheduled');
  assert.equal(payload.scheduled_ingestion_enabled, true);
  assert.equal(payload.dry_run, true);
  assert.equal(payload.writes_disabled, true);
  assert.equal(payload.summary.write_mode_enabled, false);
  assert.equal(store.createdRuns.length, 0);
  assert.equal(store.insertedRawItems.length, 0);
});

test('scheduled non-AI ingestion applies hard caps for sources, items, and candidate signals even when the request asks for too much', async () => {
  const sourceRegistry = [
    makeSource('rss_sched_1', 'https://example.com/rss/sched-1.xml'),
    makeSource('rss_sched_2', 'https://example.com/rss/sched-2.xml'),
    makeSource('rss_sched_3', 'https://example.com/rss/sched-3.xml'),
    makeSource('rss_sched_4', 'https://example.com/rss/sched-4.xml'),
    makeSource('rss_sched_5', 'https://example.com/rss/sched-5.xml'),
  ];

  const result = await runPhase4Ingestion(
    {
      intent: 'ingestion',
      triggerMode: 'scheduled',
      dryRun: true,
      sourceIds: [
        'rss_sched_1',
        'rss_sched_2',
        'rss_sched_3',
        'rss_sched_4',
        'rss_sched_5',
      ],
      maxItemsPerSource: 99,
    },
    {
      sourceRegistry,
      fetchImpl: createFetchImpl(
        Object.fromEntries(sourceRegistry.map(source => [source.url, SAMPLE_AI_RSS_FEED_XML])),
      ),
      allowScheduledIngestion: true,
      now: () => '2026-05-26T10:00:00.000Z',
    },
  );

  assert.equal(result.trigger_mode, 'scheduled');
  assert.equal(result.scheduled_ingestion_enabled, true);
  assert.equal(result.selected_source_ids.length, 4);
  assert.equal(result.source_previews.length, 4);
  assert.equal(result.limits_applied.max_sources_per_run, 4);
  assert.equal(result.limits_applied.max_items_per_source, 3);
  assert.equal(result.limits_applied.max_total_items, 12);
  assert.equal(result.limits_applied.max_candidate_signals, 12);
  assert.equal(result.limits_applied.source_count_capped, true);
  assert.equal(result.limits_applied.items_per_source_capped, true);
  assert.equal(result.fetched_item_count <= 12, true);
  assert.equal(result.candidate_signals.length <= 12, true);
});

test('scheduled non-AI ingestion does not call the AI provider path', async () => {
  let aiFetchCalls = 0;
  const handler = createPhase4IngestionHandler({
    sourceRegistry: [SAMPLE_AI_RSS_SOURCE],
    fetchImpl: createFetchImpl({
      [SAMPLE_AI_RSS_SOURCE.url]: SAMPLE_AI_RSS_FEED_XML,
    }),
    allowScheduledIngestion: true,
    aiConfig: {
      provider: 'deepseek',
      enabled: true,
      dryRunOnly: true,
      deepseekApiKey: 'server-only-secret',
      deepseekBaseUrl: 'https://api.deepseek.com',
      deepseekModel: 'deepseek-chat',
    },
    aiFetchImpl: async () => {
      aiFetchCalls += 1;
      throw new Error('AI provider should not run for scheduled non-AI ingestion');
    },
    now: () => '2026-05-26T10:00:00.000Z',
  });

  const response = await handler(
    new Request('http://localhost/phase4-dry-run', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        intent: 'ingestion',
        triggerMode: 'scheduled',
        dryRun: true,
        sourceIds: [SAMPLE_AI_RSS_SOURCE.id],
      }),
    }),
  );

  assert.equal(response.status, 200);
  assert.equal(aiFetchCalls, 0);
});

test('scheduled write-mode ingestion is allowed only for non-AI ingestion when scheduled execution is enabled and within caps', async () => {
  const store = new ScheduledMockContentStore();
  const handler = createPhase4IngestionHandler({
    sourceRegistry: [SAMPLE_AI_RSS_SOURCE],
    fetchImpl: createFetchImpl({
      [SAMPLE_AI_RSS_SOURCE.url]: SAMPLE_AI_RSS_FEED_XML,
    }),
    allowScheduledIngestion: true,
    allowWrites: true,
    writeAuthToken: 'scheduled-write-token',
    contentStore: store,
    now: () => '2026-05-26T10:00:00.000Z',
  });

  const response = await handler(
    new Request('http://localhost/phase4-dry-run', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-phase4-write-token': 'scheduled-write-token',
      },
      body: JSON.stringify({
        intent: 'ingestion',
        triggerMode: 'scheduled',
        dryRun: false,
        sourceIds: [SAMPLE_AI_RSS_SOURCE.id],
        maxItemsPerSource: 1,
      }),
    }),
  );

  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.dry_run, false);
  assert.equal(payload.scheduled_ingestion_enabled, true);
  assert.equal(payload.summary.write_mode_enabled, true);
  assert.equal(store.createdRuns.length, 1);
  assert.equal(store.insertedRawItems.length > 0, true);
});

test('scheduled ingestion returns partial_success when one source fails and another succeeds', async () => {
  const goodSource = makeSource('rss_sched_good', 'https://example.com/rss/good.xml');
  const badSource = makeSource('rss_sched_bad', 'https://example.com/rss/bad.xml');

  const result = await runPhase4Ingestion(
    {
      intent: 'ingestion',
      triggerMode: 'scheduled',
      dryRun: true,
      sourceIds: [goodSource.id, badSource.id],
      maxItemsPerSource: 1,
    },
    {
      sourceRegistry: [goodSource, badSource],
      fetchImpl: createFetchImpl(
        {
          [goodSource.url]: SAMPLE_AI_RSS_FEED_XML,
        },
        [badSource.url],
      ),
      allowScheduledIngestion: true,
      now: () => '2026-05-26T10:00:00.000Z',
    },
  );

  assert.equal(result.overall_status, 'partial_success');
  assert.equal(result.summary.succeeded_source_count, 1);
  assert.equal(result.summary.failed_source_count, 1);
  assert.equal(result.source_previews.some(source => source.status === 'failed'), true);
  assert.equal(result.source_previews.some(source => source.status === 'succeeded'), true);
});

test('scheduled ingestion returns failed when all selected sources fail', async () => {
  const sourceOne = makeSource('rss_sched_fail_1', 'https://example.com/rss/fail-1.xml');
  const sourceTwo = makeSource('rss_sched_fail_2', 'https://example.com/rss/fail-2.xml');

  const result = await runPhase4Ingestion(
    {
      intent: 'ingestion',
      triggerMode: 'scheduled',
      dryRun: true,
      sourceIds: [sourceOne.id, sourceTwo.id],
    },
    {
      sourceRegistry: [sourceOne, sourceTwo],
      fetchImpl: createFetchImpl({}, [sourceOne.url, sourceTwo.url]),
      allowScheduledIngestion: true,
      now: () => '2026-05-26T10:00:00.000Z',
    },
  );

  assert.equal(result.overall_status, 'failed');
  assert.equal(result.summary.failed_source_count, 2);
  assert.equal(result.summary.succeeded_source_count, 0);
});

test('scheduled ingestion reports unknown explicit source ids clearly while still processing known sources', async () => {
  const response = await createPhase4IngestionHandler({
    sourceRegistry: [SAMPLE_AI_RSS_SOURCE],
    fetchImpl: createFetchImpl({
      [SAMPLE_AI_RSS_SOURCE.url]: SAMPLE_AI_RSS_FEED_XML,
    }),
    allowScheduledIngestion: true,
    now: () => '2026-05-26T10:00:00.000Z',
  })(
    new Request('http://localhost/phase4-dry-run', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        intent: 'ingestion',
        triggerMode: 'scheduled',
        dryRun: true,
        sourceIds: [SAMPLE_AI_RSS_SOURCE.id, 'rss_unknown_source'],
        maxItemsPerSource: 1,
      }),
    }),
  );

  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.deepEqual(payload.selected_source_ids, [SAMPLE_AI_RSS_SOURCE.id]);
  assert.deepEqual(payload.unknown_source_ids, ['rss_unknown_source']);
  assert.equal(payload.warnings.length, 1);
});
