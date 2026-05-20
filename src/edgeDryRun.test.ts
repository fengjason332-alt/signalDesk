import test from 'node:test';
import assert from 'node:assert/strict';

import {
  SAMPLE_AI_RSS_FEED_XML,
  SAMPLE_AI_RSS_SOURCE,
} from './lib/content/rssFixtures';
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
import {
  createPhase4IngestionHandler,
  createPhase4DryRunHandler,
} from './lib/content/phase4DryRun';

class EdgeMockContentStore implements Phase4ContentStore {
  public failSignalWrites = false;

  async assertSourceIdsExist() {}
  async createIngestionRun(input: Phase4ContentIngestionRunCreate) {
    return { id: 'run-edge-1', source_id: input.source_id, started_at: input.started_at };
  }
  async finalizeIngestionRun(_runId: string, _update: Phase4ContentIngestionRunFinalize) {}
  async findMatchingRawItem(_item: Phase4RawSourceItemWriteInput): Promise<Phase4RawSourceItemMatch | null> {
    return null;
  }
  async insertRawItem(item: Phase4RawSourceItemWriteInput) {
    return {
      id: `raw-edge-${item.external_id ?? '1'}`,
      source_id: item.source_id,
      external_id: item.external_id,
      canonical_url_hash: item.canonical_url_hash,
      title_hash: item.title_hash,
      content_hash: item.content_hash,
      published_at: item.published_at,
    };
  }
  async upsertEntity(entity: Phase4ContentEntityUpsert) {
    return { id: entity.id };
  }
  async upsertRawItemEntityLink(_link: Phase4RawItemEntityLinkUpsert) {}
  async upsertCandidateSignal(signal: Phase4CandidateSignalWriteInput) {
    if (this.failSignalWrites) {
      throw new Error(`signal upsert failed for ${signal.candidate_key}`);
    }

    return { id: 'signal-edge-1', candidate_key: signal.candidate_key };
  }
  async upsertSignalSourceItemLink(_link: Phase4SignalSourceItemLinkUpsert) {}
  async upsertSignalEntityLink(_link: Phase4SignalEntityLinkUpsert) {}
  async upsertSignalTopicLink(_link: Phase4SignalTopicLinkUpsert) {}
}

test('phase4 dry-run handler returns a structured preview payload with writes disabled', async () => {
  const handler = createPhase4DryRunHandler({
    sourceRegistry: [SAMPLE_AI_RSS_SOURCE],
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      text: async () => SAMPLE_AI_RSS_FEED_XML,
    }),
    now: () => '2026-05-17T12:00:00.000Z',
  });

  const response = await handler(
    new Request('http://localhost/phase4-dry-run', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sourceIds: [SAMPLE_AI_RSS_SOURCE.id],
        discoveredAt: '2026-05-17T12:00:00.000Z',
      }),
    }),
  );

  assert.equal(response.status, 200);

  const payload = await response.json();

  assert.equal(payload.dry_run, true);
  assert.equal(payload.writes_disabled, true);
  assert.deepEqual(payload.selected_source_ids, [SAMPLE_AI_RSS_SOURCE.id]);
  assert.equal(payload.fetched_item_count, 2);
  assert.equal(payload.normalized_item_count, 2);
  assert.equal(Array.isArray(payload.candidate_signals), true);
  assert.equal(payload.write_steps.every((step: { enabled: boolean }) => step.enabled === false), true);
  assert.deepEqual(
    payload.write_steps.map((step: { step: string }) => step.step),
    [
      'insert_raw_source_items',
      'upsert_content_entities',
      'insert_raw_source_item_entities',
      'insert_intelligence_signals',
      'insert_signal_source_items',
      'insert_signal_entities',
      'insert_signal_topics',
    ],
  );
});

test('phase4 dry-run handler is safe by default and does not perform live fetches without explicit enablement', async () => {
  const handler = createPhase4DryRunHandler();

  const response = await handler(
    new Request('http://localhost/phase4-dry-run', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({}),
    }),
  );

  assert.equal(response.status, 503);

  const payload = await response.json();
  assert.match(payload.error, /disabled by default/i);
});

test('phase4 dry-run handler rejects malformed JSON before any fetch fan-out', async () => {
  const handler = createPhase4DryRunHandler({
    fetchImpl: async () => {
      throw new Error('fetch should not run for malformed JSON');
    },
  });

  const response = await handler(
    new Request('http://localhost/phase4-dry-run', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: '{not-json',
    }),
  );

  assert.equal(response.status, 400);

  const payload = await response.json();
  assert.match(payload.error, /invalid json/i);
});

test('phase4 dry-run honors maxItemsPerSource consistently across preview counters', async () => {
  const handler = createPhase4DryRunHandler({
    sourceRegistry: [SAMPLE_AI_RSS_SOURCE],
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      text: async () => SAMPLE_AI_RSS_FEED_XML,
    }),
    now: () => '2026-05-17T12:00:00.000Z',
  });

  const response = await handler(
    new Request('http://localhost/phase4-dry-run', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sourceIds: [SAMPLE_AI_RSS_SOURCE.id],
        discoveredAt: '2026-05-17T12:00:00.000Z',
        maxItemsPerSource: 1,
      }),
    }),
  );

  assert.equal(response.status, 200);
  const payload = await response.json();

  assert.equal(payload.fetched_item_count, 1);
  assert.equal(payload.normalized_item_count, 1);
  assert.equal(payload.raw_item_count, 1);
  assert.equal(payload.source_previews[0]?.fetched_count, 1);
  assert.equal(payload.source_previews[0]?.normalized_count, 1);
});

test('phase4 dry-run handler remains preview-only even if the request body asks for write mode', async () => {
  const handler = createPhase4DryRunHandler({
    sourceRegistry: [SAMPLE_AI_RSS_SOURCE],
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      text: async () => SAMPLE_AI_RSS_FEED_XML,
    }),
    allowWrites: true,
    now: () => '2026-05-17T12:00:00.000Z',
  });

  const response = await handler(
    new Request('http://localhost/phase4-dry-run', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        dryRun: false,
        sourceIds: [SAMPLE_AI_RSS_SOURCE.id],
        discoveredAt: '2026-05-17T12:00:00.000Z',
      }),
    }),
  );

  assert.equal(response.status, 200);
  const payload = await response.json();

  assert.equal(payload.dry_run, true);
  assert.equal(payload.writes_disabled, true);
  assert.equal(payload.ingestion_runs.length, 0);
  assert.equal(payload.inserted_item_count, 0);
});

test('phase4 ingestion handler requires a valid write token before enabling write mode', async () => {
  const handler = createPhase4IngestionHandler({
    sourceRegistry: [SAMPLE_AI_RSS_SOURCE],
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      text: async () => SAMPLE_AI_RSS_FEED_XML,
    }),
    allowWrites: true,
    writeAuthToken: 'secret-phase4-token',
    contentStore: new EdgeMockContentStore(),
    now: () => '2026-05-17T12:00:00.000Z',
  });

  const response = await handler(
    new Request('http://localhost/phase4-ingestion', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        dryRun: false,
        sourceIds: [SAMPLE_AI_RSS_SOURCE.id],
        discoveredAt: '2026-05-17T12:00:00.000Z',
      }),
    }),
  );

  assert.equal(response.status, 403);
  const payload = await response.json();
  assert.equal(payload.code, 'phase4_write_token_missing');
  assert.equal(payload.write_mode_requested, true);
  assert.equal(payload.writes_enabled, true);
  assert.equal(payload.write_token_configured, true);
  assert.match(payload.error, /write token/i);
});

test('phase4 ingestion handler rejects write mode clearly when writes are disabled', async () => {
  const handler = createPhase4IngestionHandler({
    sourceRegistry: [SAMPLE_AI_RSS_SOURCE],
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      text: async () => SAMPLE_AI_RSS_FEED_XML,
    }),
    allowWrites: false,
    contentStore: new EdgeMockContentStore(),
    now: () => '2026-05-17T12:00:00.000Z',
  });

  const response = await handler(
    new Request('http://localhost/phase4-ingestion', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        dryRun: false,
        sourceIds: [SAMPLE_AI_RSS_SOURCE.id],
        discoveredAt: '2026-05-17T12:00:00.000Z',
      }),
    }),
  );

  assert.equal(response.status, 403);
  const payload = await response.json();
  assert.equal(payload.code, 'phase4_write_mode_disabled');
  assert.equal(payload.write_mode_requested, true);
  assert.equal(payload.writes_enabled, false);
  assert.equal(payload.write_token_configured, false);
  assert.match(payload.error, /disabled/i);
});

test('phase4 ingestion handler keeps dry-run working without write secrets', async () => {
  const handler = createPhase4IngestionHandler({
    sourceRegistry: [SAMPLE_AI_RSS_SOURCE],
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      text: async () => SAMPLE_AI_RSS_FEED_XML,
    }),
    now: () => '2026-05-17T12:00:00.000Z',
  });

  const response = await handler(
    new Request('http://localhost/phase4-ingestion', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sourceIds: [SAMPLE_AI_RSS_SOURCE.id],
        discoveredAt: '2026-05-17T12:00:00.000Z',
      }),
    }),
  );

  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.dry_run, true);
  assert.equal(payload.writes_disabled, true);
});

test('phase4 ingestion handler surfaces partial write failures with a non-200 status', async () => {
  const store = new EdgeMockContentStore();
  store.failSignalWrites = true;

  const handler = createPhase4IngestionHandler({
    sourceRegistry: [SAMPLE_AI_RSS_SOURCE],
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      text: async () => SAMPLE_AI_RSS_FEED_XML,
    }),
    allowWrites: true,
    writeAuthToken: 'secret-phase4-token',
    contentStore: store,
    now: () => '2026-05-17T12:00:00.000Z',
  });

  const response = await handler(
    new Request('http://localhost/phase4-ingestion', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-phase4-write-token': 'secret-phase4-token',
      },
      body: JSON.stringify({
        dryRun: false,
        sourceIds: [SAMPLE_AI_RSS_SOURCE.id],
        discoveredAt: '2026-05-17T12:00:00.000Z',
      }),
    }),
  );

  assert.equal(response.status, 207);
  const payload = await response.json();
  assert.equal(payload.ingestion_runs[0]?.status, 'partial');
});
