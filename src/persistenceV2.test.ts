import test from 'node:test';
import assert from 'node:assert/strict';

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

const withMemoryStorage = () => {
  const storage = new MemoryStorage();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: storage,
  });
  return storage;
};

async function loadStorageApi() {
  const module = (await import('./storage')) as Record<string, unknown>;

  return {
    STORAGE_KEYS: module.STORAGE_KEYS as Record<string, string>,
    createFreshPersistedStateV2: module.createFreshPersistedStateV2 as (() => any) | undefined,
    hydratePersistedStateV2: module.hydratePersistedStateV2 as (() => any) | undefined,
    deriveSavedSignalIds: module.deriveSavedSignalIds as ((state: any) => string[]) | undefined,
    deriveWatchlistEntityIds: module.deriveWatchlistEntityIds as ((state: any) => string[]) | undefined,
  };
}

test('empty storage hydrates to a fresh V2 state', async () => {
  withMemoryStorage();
  const api = await loadStorageApi();

  assert.equal(typeof api.createFreshPersistedStateV2, 'function');
  assert.equal(typeof api.hydratePersistedStateV2, 'function');

  const state = api.hydratePersistedStateV2!();

  assert.equal(state.schema_version, 2);
  assert.deepEqual(state.profile.core_domains, ['ai', 'energy']);
  assert.equal(state.profile.onboarding_completed, false);
  assert.deepEqual(state.saved_items, []);
  assert.deepEqual(state.watchlist_items, []);
  assert.deepEqual(state.notes, []);
  assert.deepEqual(state.feedback, []);
});

test('malformed V2 storage falls back to a safe fresh state', async () => {
  const storage = withMemoryStorage();
  const api = await loadStorageApi();

  storage.setItem('signaldesk_state_v2', '{broken-json');

  const state = api.hydratePersistedStateV2!();

  assert.equal(state.schema_version, 2);
  assert.deepEqual(state.profile.core_domains, ['ai', 'energy']);
  assert.deepEqual(state.watchlist_items, []);
});

test('malformed legacy storage never crashes hydration and falls back safely', async () => {
  const storage = withMemoryStorage();
  const api = await loadStorageApi();

  storage.setItem(api.STORAGE_KEYS.settings, '{broken-json');
  storage.setItem(api.STORAGE_KEYS.savedSignals, '{broken-json');
  storage.setItem(api.STORAGE_KEYS.notes, '{broken-json');

  const state = api.hydratePersistedStateV2!();

  assert.equal(state.schema_version, 2);
  assert.equal(state.profile.onboarding_completed, false);
  assert.deepEqual(state.saved_items, []);
  assert.deepEqual(state.notes, []);
});

test('legacy onboarding and settings migrate into profile and topic preference records', async () => {
  const storage = withMemoryStorage();
  const api = await loadStorageApi();

  storage.setItem(
    api.STORAGE_KEYS.settings,
    JSON.stringify({
      readingMode: 'Original',
      translationStyle: 'Accurate Translation',
      preferredTopics: ['AI', 'US Policy'],
      followedTopics: ['US Chip Export Controls', 'Unmapped Legacy Topic'],
      mutedTopics: ['Stablecoin Regulation', 'AI'],
      criticalAlerts: false,
      darkMode: true,
    }),
  );
  storage.setItem(api.STORAGE_KEYS.onboardingComplete, 'true');

  const state = api.hydratePersistedStateV2!();

  assert.equal(state.profile.onboarding_completed, true);
  assert.deepEqual(state.profile.core_domains, ['ai', 'us_policy']);
  assert.ok(
    state.topic_preferences.some(
      (record: any) =>
        record.preference_type === 'followed' &&
        record.topic_kind === 'canonical' &&
        record.topic_id === 'topic_us_chip_export_controls',
    ),
  );
  assert.ok(
    state.topic_preferences.some(
      (record: any) =>
        record.preference_type === 'muted' &&
        record.topic_kind === 'canonical' &&
        record.topic_id === 'topic_stablecoin_regulation',
    ),
  );
  assert.ok(
    state.topic_preferences.some(
      (record: any) =>
        record.preference_type === 'followed' &&
        record.topic_kind === 'custom' &&
        record.custom_topic_label === 'Unmapped Legacy Topic' &&
        record.source === 'legacy_localStorage',
    ),
  );
});

test('legacy saved signals and notes migrate into generic saved_items and notes', async () => {
  const storage = withMemoryStorage();
  const api = await loadStorageApi();

  storage.setItem(api.STORAGE_KEYS.savedSignals, JSON.stringify(['s1', 's3']));
  storage.setItem(
    api.STORAGE_KEYS.notes,
    JSON.stringify({
      s1: 'Signal note',
      l1: 'Library note',
    }),
  );

  const state = api.hydratePersistedStateV2!();

  assert.deepEqual(
    state.saved_items.map((item: any) => [item.target_type, item.target_id]),
    [
      ['signal', 's1'],
      ['signal', 's3'],
    ],
  );
  assert.ok(
    state.notes.some(
      (record: any) =>
        record.target_type === 'signal' &&
        record.target_id === 's1' &&
        record.body === 'Signal note',
    ),
  );
  assert.ok(
    state.notes.some(
      (record: any) =>
        record.target_type === 'library_item' &&
        record.target_id === 'l1' &&
        record.body === 'Library note',
    ),
  );
});

test('legacy default mock watchlist does not become a real user watchlist', async () => {
  const storage = withMemoryStorage();
  const api = await loadStorageApi();

  storage.setItem(api.STORAGE_KEYS.watchlist, JSON.stringify(['w1', 'w2', 'w3', 'w4']));

  const state = api.hydratePersistedStateV2!();

  assert.deepEqual(state.watchlist_items, []);
});

test('legacy watchlist outside demo defaults is preserved as entity-based records', async () => {
  const storage = withMemoryStorage();
  const api = await loadStorageApi();

  storage.setItem(api.STORAGE_KEYS.watchlist, JSON.stringify(['w1', 'w4', 'entity_bitcoin']));

  const state = api.hydratePersistedStateV2!();

  assert.deepEqual(
    state.watchlist_items.map((item: any) => item.entity_id),
    ['entity_bitcoin'],
  );
  assert.equal(state.watchlist_items[0].sort_order, 0);
});

test('persisted V2 feedback survives hydration', async () => {
  const storage = withMemoryStorage();
  const api = await loadStorageApi();

  storage.setItem(
    api.STORAGE_KEYS.persistedStateV2,
    JSON.stringify({
      schema_version: 2,
      profile: api.createFreshPersistedStateV2!().profile,
      topic_preferences: [],
      saved_items: [],
      watchlist_items: [],
      notes: [],
      feedback: [
        {
          target_type: 'signal',
          target_id: 's1',
          feedback_type: 'useful',
          created_at: '2026-05-05T00:00:00.000Z',
          updated_at: '2026-05-05T00:00:00.000Z',
        },
      ],
    }),
  );

  const state = api.hydratePersistedStateV2!();

  assert.deepEqual(state.feedback, [
    {
      target_type: 'signal',
      target_id: 's1',
      feedback_type: 'useful',
      created_at: '2026-05-05T00:00:00.000Z',
      updated_at: '2026-05-05T00:00:00.000Z',
    },
  ]);
});

test('compatibility adapters derive signal bookmarks and watchlist ids from V2 state', async () => {
  withMemoryStorage();
  const api = await loadStorageApi();

  assert.equal(typeof api.deriveSavedSignalIds, 'function');
  assert.equal(typeof api.deriveWatchlistEntityIds, 'function');

  const state = {
    schema_version: 2,
    profile: api.createFreshPersistedStateV2!().profile,
    topic_preferences: [],
    saved_items: [
      { target_type: 'signal', target_id: 's1', created_at: '2026-05-05T00:00:00.000Z', updated_at: '2026-05-05T00:00:00.000Z' },
      { target_type: 'library_item', target_id: 'l1', created_at: '2026-05-05T00:00:00.000Z', updated_at: '2026-05-05T00:00:00.000Z' },
    ],
    watchlist_items: [
      { entity_id: 'entity_nvidia', created_at: '2026-05-05T00:00:00.000Z', updated_at: '2026-05-05T00:00:00.000Z', sort_order: 0 },
    ],
    notes: [],
    feedback: [],
  };

  assert.deepEqual(api.deriveSavedSignalIds!(state), ['s1']);
  assert.deepEqual(api.deriveWatchlistEntityIds!(state), ['entity_nvidia']);
});
