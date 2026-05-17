import test from 'node:test';
import assert from 'node:assert/strict';

import { mapFeedItemToRawSourceItem, normalizeFeedItem } from './lib/content/rss';
import {
  buildRawItemDedupeKeys,
  compareRawSourceItems,
} from './lib/content/dedupe';
import {
  SAME_CONTENT_DIFFERENT_IDS_ITEMS,
  SAMPLE_AI_RSS_SOURCE,
  SIMILAR_NOT_DUPLICATE_ITEMS,
  TRACKING_VARIANT_ITEMS,
  TYPOGRAPHIC_TITLE_VARIANT_ITEMS,
} from './lib/content/rssFixtures';
import type { ParsedRssFeedItem } from './lib/content/types';

const toRawItem = (item: ParsedRssFeedItem, ingestionRunId: string) =>
  mapFeedItemToRawSourceItem(
    SAMPLE_AI_RSS_SOURCE,
    normalizeFeedItem(SAMPLE_AI_RSS_SOURCE, item, '2026-05-17T00:15:00.000Z'),
    {
      discoveredAt: '2026-05-17T00:15:00.000Z',
      ingestionRunId,
    },
  );

test('buildRawItemDedupeKeys includes external, url, title, content, and fallback keys', () => {
  const rawItem = toRawItem(TRACKING_VARIANT_ITEMS[0], 'run_1');
  const keys = buildRawItemDedupeKeys(rawItem);

  assert.equal(keys.some(key => key.startsWith('external:')), true);
  assert.equal(keys.some(key => key.startsWith('url:')), true);
  assert.equal(keys.some(key => key.startsWith('title:')), true);
  assert.equal(keys.some(key => key.startsWith('content:')), true);
  assert.equal(keys.some(key => key.startsWith('fallback:')), true);
});

test('compareRawSourceItems returns exact for the same article with tracking-param variants', () => {
  const left = toRawItem(TRACKING_VARIANT_ITEMS[0], 'run_1');
  const right = toRawItem(TRACKING_VARIANT_ITEMS[1], 'run_2');

  assert.equal(compareRawSourceItems(left, right), 'exact');
});

test('compareRawSourceItems returns high for same title with punctuation differences', () => {
  const left = toRawItem(TYPOGRAPHIC_TITLE_VARIANT_ITEMS[0], 'run_1');
  const right = toRawItem(TYPOGRAPHIC_TITLE_VARIANT_ITEMS[1], 'run_2');

  assert.equal(compareRawSourceItems(left, right), 'high');
});

test('compareRawSourceItems returns medium for same content excerpt with different feed ids', () => {
  const left = toRawItem(SAME_CONTENT_DIFFERENT_IDS_ITEMS[0], 'run_1');
  const right = toRawItem(SAME_CONTENT_DIFFERENT_IDS_ITEMS[1], 'run_2');

  assert.equal(compareRawSourceItems(left, right), 'medium');
});

test('compareRawSourceItems returns none for different articles with similar titles', () => {
  const left = toRawItem(SIMILAR_NOT_DUPLICATE_ITEMS[0], 'run_1');
  const right = toRawItem(SIMILAR_NOT_DUPLICATE_ITEMS[1], 'run_2');

  assert.equal(compareRawSourceItems(left, right), 'none');
});

test('compareRawSourceItems returns low for same-source same-published fallback matches', () => {
  const left = toRawItem(
    {
      ...SIMILAR_NOT_DUPLICATE_ITEMS[0],
      pubDate: 'Sat, 17 May 2026 08:00:00 GMT',
    },
    'run_1',
  );
  const right = toRawItem(
    {
      ...SIMILAR_NOT_DUPLICATE_ITEMS[1],
      pubDate: 'Sat, 17 May 2026 08:00:00 GMT',
    },
    'run_2',
  );

  assert.equal(compareRawSourceItems(left, right), 'low');
});
