import test from 'node:test';
import assert from 'node:assert/strict';

import { MOCK_LIBRARY, MOCK_SIGNALS, MOCK_TOPICS, MOCK_WATCHLIST } from './mockData';
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
