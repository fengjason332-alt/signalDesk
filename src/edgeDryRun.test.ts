import test from 'node:test';
import assert from 'node:assert/strict';

import {
  SAMPLE_AI_RSS_FEED_XML,
  SAMPLE_AI_RSS_SOURCE,
} from './lib/content/rssFixtures';
import { createPhase4DryRunHandler } from '../supabase/functions/phase4-dry-run/index';

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
