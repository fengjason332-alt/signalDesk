import test from 'node:test';
import assert from 'node:assert/strict';

import { MOCK_LIBRARY, MOCK_SIGNALS, MOCK_TOPICS, MOCK_WATCHLIST } from './mockData';
import { mapRealContentSignalRowToSignal } from './lib/content/realContentFeed';
import {
  isSignalRelatedToTopic,
  isSignalRelatedToWatchlistItem,
  toDetailPayloadFromLibraryItem,
  toDetailPayloadFromSignal,
} from './detailPayload';
import {
  readBooleanStorage,
  readJsonStorage,
  removeStorageKey,
  writeJsonStorage,
} from './storage';

class MemoryStorage implements Storage {
  private store = new Map<string, string>();

  get length() {
    return this.store.size;
  }

  clear() {
    this.store.clear();
  }

  getItem(key: string) {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  key(index: number) {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string) {
    this.store.delete(key);
  }

  setItem(key: string, value: string) {
    this.store.set(key, value);
  }
}

test('maps a signal to a complete detail payload', () => {
  const payload = toDetailPayloadFromSignal(MOCK_SIGNALS[0]);

  assert.equal(payload.kind, 'signal');
  assert.deepEqual(payload.categories, MOCK_SIGNALS[0].categories);
  assert.deepEqual(payload.topics, MOCK_SIGNALS[0].topics);
  assert.deepEqual(payload.entities, MOCK_SIGNALS[0].entities);
  assert.ok(Array.isArray(payload.whyItMatters));
});

test('maps sparse real-content signals to a safe detail payload', () => {
  const payload = toDetailPayloadFromSignal({
    id: 'signal-real-sparse',
    categories: [],
    topics: [],
    entities: [],
    titleZh: '',
    titleEn: '',
    summaryZh: '',
    whyItMatters: [],
    importance: Number.NaN,
    source: '',
    timestamp: '',
    tags: [],
  });

  assert.equal(payload.titleZh, 'Untitled signal');
  assert.equal(payload.summaryZh, 'Summary unavailable.');
  assert.deepEqual(payload.whyItMatters, []);
  assert.equal(payload.importance, 0);
  assert.equal(payload.source, 'Unknown source');
  assert.equal(payload.timestamp, 'Unknown publish time');
});

test('maps a real-content preview signal into a safe detail payload without full article blocks', () => {
  const payload = toDetailPayloadFromSignal(
    mapRealContentSignalRowToSignal({
      id: 'signal-real-preview',
      primary_category: 'ai',
      categories: ['ai'],
      headline_en: 'OpenAI expands reasoning access in education',
      headline_zh: null,
      summary_en: '',
      summary_zh: null,
      why_it_matters_en: [],
      why_it_matters_zh: [],
      primary_source_name: 'OpenAI',
      published_at: '2026-05-20T08:00:00.000Z',
      source_item_count: 1,
      overall_score: 84,
      signal_topics: [],
      signal_entities: [],
      signal_source_items: [
        {
          is_primary: true,
          raw_source_item: {
            title: 'OpenAI expands reasoning access in education',
            dek: 'Students and teachers get access to improved reasoning tools.',
            canonical_url: 'https://openai.com/news/example',
            published_at: '2026-05-20T08:00:00.000Z',
            metadata: null,
          },
        },
      ],
    }),
  );

  assert.equal(payload.kind, 'signal');
  assert.equal(payload.titleZh, 'OpenAI expands reasoning access in education');
  assert.equal(payload.summaryZh, 'Students and teachers get access to improved reasoning tools.');
  assert.equal(payload.source, 'OpenAI');
  assert.equal(payload.timestamp, '2026-05-20');
  assert.equal(payload.content, undefined);
});

test('maps real-content preview provenance sources into detail payload', () => {
  const payload = toDetailPayloadFromSignal(
    mapRealContentSignalRowToSignal({
      id: 'signal-real-preview-provenance',
      primary_category: 'ai',
      categories: ['ai'],
      headline_en: 'OpenAI expands reasoning access in education',
      headline_zh: null,
      summary_en: '',
      summary_zh: null,
      why_it_matters_en: [],
      why_it_matters_zh: [],
      primary_source_name: 'OpenAI',
      published_at: '2026-05-20T08:00:00.000Z',
      lifecycle_stage: 'candidate_preview',
      generation_status: 'drafted',
      primary_source_item_id: 'raw-openai-1',
      source_item_count: 2,
      overall_score: 84,
      signal_topics: [],
      signal_entities: [],
      signal_source_items: [
        {
          is_primary: true,
          raw_source_item: {
            id: 'raw-openai-1',
            source_id: 'rss_openai_blog_ai',
            title: 'OpenAI expands reasoning access in education',
            dek: 'Students and teachers get access to improved reasoning tools.',
            canonical_url: 'https://openai.com/news/example',
            published_at: '2026-05-20T08:00:00.000Z',
            metadata: {
              source_name: 'OpenAI',
            },
          },
        },
        {
          is_primary: false,
          raw_source_item: {
            id: 'raw-reuters-1',
            source_id: 'rss_reuters_ai',
            title: 'Reuters follow-up',
            canonical_url: 'https://www.reuters.com/world/openai-follow-up',
            published_at: '2026-05-20T09:00:00.000Z',
            metadata: {
              source_name: 'Reuters',
            },
          },
        },
      ],
    }),
  );

  assert.equal(payload.previewMode, 'real_content');
  assert.deepEqual(payload.provenanceSources, [
    {
      rawSourceItemId: 'raw-openai-1',
      sourceId: 'rss_openai_blog_ai',
      sourceName: 'OpenAI',
      sourceUrl: 'https://openai.com/news/example',
      publishedAt: '2026-05-20T08:00:00.000Z',
      isPrimary: true,
    },
    {
      rawSourceItemId: 'raw-reuters-1',
      sourceId: 'rss_reuters_ai',
      sourceName: 'Reuters',
      sourceUrl: 'https://www.reuters.com/world/openai-follow-up',
      publishedAt: '2026-05-20T09:00:00.000Z',
      isPrimary: false,
    },
  ]);
});

test('maps a library item to a safe detail payload with complete arrays', () => {
  const payload = toDetailPayloadFromLibraryItem(MOCK_LIBRARY[0]);

  assert.equal(payload.kind, 'library');
  assert.deepEqual(payload.categories, []);
  assert.deepEqual(payload.topics, []);
  assert.deepEqual(payload.entities, []);
  assert.deepEqual(payload.tags, MOCK_LIBRARY[0].tags);
  assert.equal(payload.libraryMeta?.title, MOCK_LIBRARY[0].category);
});

test('matches a signal to a topic by topic name, category, or overlapping tags', () => {
  assert.equal(isSignalRelatedToTopic(MOCK_SIGNALS[2], MOCK_TOPICS[0]), true);
  assert.equal(isSignalRelatedToTopic(MOCK_SIGNALS[1], MOCK_TOPICS[1]), false);
});

test('matches a signal to a watchlist item via structured fields', () => {
  assert.equal(isSignalRelatedToWatchlistItem(MOCK_SIGNALS[0], MOCK_WATCHLIST[1]), true);
  assert.equal(isSignalRelatedToWatchlistItem(MOCK_SIGNALS[4], MOCK_WATCHLIST[0]), true);
  assert.equal(isSignalRelatedToWatchlistItem(MOCK_SIGNALS[1], MOCK_WATCHLIST[3]), false);
});

test('storage helpers survive malformed JSON and boolean values', () => {
  const memoryStorage = new MemoryStorage();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: memoryStorage,
  });

  memoryStorage.setItem('broken-json', '{oops');
  memoryStorage.setItem('bool-true', 'true');
  memoryStorage.setItem('bool-json-false', 'false');

  assert.deepEqual(readJsonStorage('broken-json', ['fallback']), ['fallback']);
  assert.equal(readBooleanStorage('bool-true', false), true);
  assert.equal(readBooleanStorage('bool-json-false', true), false);

  writeJsonStorage('safe-json', { ok: true });
  assert.equal(memoryStorage.getItem('safe-json'), JSON.stringify({ ok: true }));

  removeStorageKey('safe-json');
  assert.equal(memoryStorage.getItem('safe-json'), null);
});
