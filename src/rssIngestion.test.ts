import test from 'node:test';
import assert from 'node:assert/strict';

import {
  SAMPLE_AI_RSS_FEED_XML,
  SAMPLE_AI_RSS_SOURCE,
} from './lib/content/rssFixtures';
import {
  computeRawItemHashes,
  fetchSourceFeed,
  mapFeedItemToRawSourceItem,
  normalizeFeedItem,
} from './lib/content/rss';

test('fetchSourceFeed parses sample RSS XML using an injected fetch implementation', async () => {
  const parsedFeed = await fetchSourceFeed(SAMPLE_AI_RSS_SOURCE, async () => ({
    ok: true,
    status: 200,
    text: async () => SAMPLE_AI_RSS_FEED_XML,
  }));

  assert.equal(parsedFeed.source.id, SAMPLE_AI_RSS_SOURCE.id);
  assert.equal(parsedFeed.items.length, 2);
  assert.equal(parsedFeed.items[0]?.title, 'OpenAI expands power agreements for new data centers');
  assert.equal(parsedFeed.items[0]?.guid, 'item-001');
});

test('normalizeFeedItem strips HTML and preserves source/category defaults', () => {
  const normalized = normalizeFeedItem(SAMPLE_AI_RSS_SOURCE, {
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

  assert.equal(normalized.external_id, 'item-001');
  assert.equal(normalized.canonical_url, 'https://example.com/ai/openai-power');
  assert.equal(normalized.language, 'en');
  assert.deepEqual(normalized.category_keys, ['ai']);
  assert.equal(
    normalized.normalized_text,
    'OpenAI and Microsoft are securing additional energy capacity.',
  );
});

test('computeRawItemHashes returns stable hashes for normalized source items', () => {
  const normalized = normalizeFeedItem(SAMPLE_AI_RSS_SOURCE, {
    guid: 'item-001',
    title: 'OpenAI expands power agreements for new data centers',
    link: 'https://example.com/ai/openai-power?utm_source=rss',
    pubDate: 'Sat, 17 May 2026 00:00:00 GMT',
    description: '<p>OpenAI and Microsoft are securing additional energy capacity.</p>',
    contentEncoded:
      '<div><p>OpenAI and Microsoft are securing additional energy capacity.</p></div>',
    author: 'SignalDesk Test Feed',
  });

  const hashes = computeRawItemHashes(normalized);

  assert.equal(hashes.title_hash.length, 64);
  assert.equal(hashes.canonical_url_hash.length, 64);
  assert.equal(hashes.content_hash.length, 64);
  assert.deepEqual(hashes, computeRawItemHashes(normalized));
});

test('mapFeedItemToRawSourceItem builds a deterministic RawSourceItemRecord without writing to Supabase', () => {
  const normalized = normalizeFeedItem(SAMPLE_AI_RSS_SOURCE, {
    guid: 'item-001',
    title: 'OpenAI expands power agreements for new data centers',
    link: 'https://example.com/ai/openai-power?utm_source=rss',
    pubDate: 'Sat, 17 May 2026 00:00:00 GMT',
    description: '<p>OpenAI and Microsoft are securing additional energy capacity.</p>',
    contentEncoded:
      '<div><p>OpenAI and Microsoft are securing additional energy capacity.</p></div>',
    author: 'SignalDesk Test Feed',
  });

  const rawSourceItem = mapFeedItemToRawSourceItem(SAMPLE_AI_RSS_SOURCE, normalized, {
    discoveredAt: '2026-05-17T00:15:00.000Z',
    ingestionRunId: 'run_rss_001',
  });

  assert.equal(rawSourceItem.source_id, SAMPLE_AI_RSS_SOURCE.id);
  assert.equal(rawSourceItem.ingestion_run_id, 'run_rss_001');
  assert.equal(rawSourceItem.ingestion_status, 'normalized');
  assert.equal(rawSourceItem.id.startsWith(`raw_${SAMPLE_AI_RSS_SOURCE.id}_`), true);
  assert.equal(rawSourceItem.metadata.feed_item_guid, 'item-001');
});
