import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_PHASE4_SCHEDULED_INGESTION_CADENCE_MINUTES,
  DEFAULT_PHASE4_SCHEDULED_INGESTION_REQUEST,
  buildPhase4ScheduledIngestionRequest,
} from './lib/content/phase4ScheduledIngestionRequest';

test('buildPhase4ScheduledIngestionRequest requires explicit sourceIds for operator-safe recurring runs', () => {
  assert.throws(
    () =>
      buildPhase4ScheduledIngestionRequest({
        sourceIds: [],
      }),
    /requires at least one explicit sourceId/i,
  );
});

test('buildPhase4ScheduledIngestionRequest defaults to a bounded scheduled dry-run with live fetch enabled', () => {
  const request = buildPhase4ScheduledIngestionRequest({
    sourceIds: ['rss_openai_blog_ai', 'rss_coindesk_crypto'],
  });

  assert.deepEqual(request, {
    ...DEFAULT_PHASE4_SCHEDULED_INGESTION_REQUEST,
    sourceIds: ['rss_openai_blog_ai', 'rss_coindesk_crypto'],
  });
  assert.equal(DEFAULT_PHASE4_SCHEDULED_INGESTION_CADENCE_MINUTES, 30);
});

test('buildPhase4ScheduledIngestionRequest de-duplicates and caps sourceIds plus maxItemsPerSource', () => {
  const request = buildPhase4ScheduledIngestionRequest({
    sourceIds: [
      'rss_openai_blog_ai',
      'rss_openai_blog_ai',
      'rss_coindesk_crypto',
      'rss_white_house_briefing',
      'rss_yahoo_finance_markets',
      'rss_extra_should_be_capped',
    ],
    maxItemsPerSource: 99,
    dryRun: false,
  });

  assert.deepEqual(request.sourceIds, [
    'rss_openai_blog_ai',
    'rss_coindesk_crypto',
    'rss_white_house_briefing',
    'rss_yahoo_finance_markets',
  ]);
  assert.equal(request.maxItemsPerSource, 3);
  assert.equal(request.dryRun, false);
  assert.equal(request.triggerMode, 'scheduled');
});
