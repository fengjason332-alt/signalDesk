import test from 'node:test';
import assert from 'node:assert/strict';

import { CATEGORY_KEYS } from './types';
import {
  CURATED_ENGLISH_RSS_SOURCES,
  getActiveEnglishRssSources,
  validateSourceRegistry,
} from './lib/content/sourceRegistry';

test('curated English RSS source registry covers every supported SignalDesk domain', () => {
  const coveredCategories = new Set(
    CURATED_ENGLISH_RSS_SOURCES.filter(source => source.active).map(
      source => source.category_key,
    ),
  );

  assert.deepEqual(Array.from(coveredCategories).sort(), [...CATEGORY_KEYS].sort());
});

test('curated English RSS source registry validates cleanly', () => {
  assert.deepEqual(validateSourceRegistry(CURATED_ENGLISH_RSS_SOURCES), []);
});

test('active English RSS source helper returns only active rss entries', () => {
  const activeSources = getActiveEnglishRssSources();

  assert.equal(activeSources.length, CURATED_ENGLISH_RSS_SOURCES.length);
  assert.equal(activeSources.every(source => source.source_type === 'rss'), true);
  assert.equal(activeSources.every(source => source.language === 'en'), true);
  assert.equal(activeSources.every(source => source.active), true);
});
