import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';

import { createFreshPersistedStateV2 } from './storage';
import {
  fromSupabaseRows,
  toSupabaseRows,
  type SupabaseFeedbackRow,
  type SupabaseNoteRow,
  type SupabaseSavedItemRow,
  type SupabaseTopicPreferenceRow,
  type SupabaseUserProfileRow,
  type SupabaseWatchlistItemRow,
} from './lib/persistence/userStateMapper';
import {
  configureSupabaseUserStateStore,
  configureRuntimeSupabaseUserStateStore,
  createSupabaseClientUserStateStoreAdapter,
  createSupabaseUserStateStore,
  loadRemoteUserState,
  saveRemoteUserState,
  type LoadedSupabaseFeedbackRow,
  type LoadedSupabaseNoteRow,
  type LoadedSupabaseSavedItemRow,
  type LoadedSupabaseTopicPreferenceRow,
  type LoadedSupabaseWatchlistItemRow,
  type SupabaseUserStateStoreAdapter,
} from './lib/persistence/supabaseUserStateStore';

const USER_ID = '00000000-0000-0000-0000-000000000001';
const BASE_TIME = '2026-05-06T00:00:00.000Z';

const cloneTopicPreferenceRow = <TRow extends SupabaseTopicPreferenceRow>(row: TRow): TRow =>
  row.topic_kind === 'canonical'
    ? { ...row }
    : { ...row };

const cloneSavedItemRow = <TRow extends SupabaseSavedItemRow>(row: TRow): TRow => ({ ...row });
const cloneWatchlistItemRow = <TRow extends SupabaseWatchlistItemRow>(row: TRow): TRow => ({ ...row });
const cloneNoteRow = <TRow extends SupabaseNoteRow>(row: TRow): TRow => ({ ...row });
const cloneFeedbackRow = <TRow extends SupabaseFeedbackRow>(row: TRow): TRow => ({ ...row });

const topicPreferenceIdentity = (row: SupabaseTopicPreferenceRow) =>
  row.topic_kind === 'canonical'
    ? `${row.preference_type}:canonical:${row.topic_id}`
    : `${row.preference_type}:custom:${row.custom_topic_label_normalized}`;

const savedItemIdentity = (row: SupabaseSavedItemRow) => `${row.target_type}:${row.target_id}`;
const watchlistIdentity = (row: SupabaseWatchlistItemRow) => row.entity_id;
const noteIdentity = (row: SupabaseNoteRow) => `${row.target_type}:${row.target_id}`;
const feedbackIdentity = (row: SupabaseFeedbackRow) => `${row.target_type}:${row.target_id}`;

type RuntimeTableName =
  | 'user_profiles'
  | 'user_topic_preferences'
  | 'user_saved_items'
  | 'user_watchlist_items'
  | 'user_notes'
  | 'user_feedback';

class FakeSupabaseRuntimeClient {
  tables: Record<RuntimeTableName, Record<string, unknown>[]> = {
    user_profiles: [],
    user_topic_preferences: [],
    user_saved_items: [],
    user_watchlist_items: [],
    user_notes: [],
    user_feedback: [],
  };

  private nextId = 1;

  from(table: RuntimeTableName) {
    return new FakeSupabaseRuntimeTable(this, table);
  }

  query(table: RuntimeTableName, filters: Array<{ column: string; value: unknown }>) {
    return this.tables[table]
      .filter(row =>
        filters.every(filter => row[filter.column] === filter.value),
      )
      .map(row => ({ ...row }));
  }

  upsert(
    table: RuntimeTableName,
    values: Record<string, unknown>[],
    onConflict: string | undefined,
  ) {
    const keyColumns =
      onConflict?.split(',').map(column => column.trim()).filter(Boolean) ??
      (table === 'user_profiles' ? ['user_id'] : ['id']);

    for (const value of values) {
      const rows = this.tables[table];
      const matchIndex = rows.findIndex(row =>
        keyColumns.every(column => row[column] === value[column]),
      );

      if (matchIndex >= 0) {
        const existing = rows[matchIndex];
        rows[matchIndex] = {
          ...existing,
          ...value,
          id: existing.id ?? value.id,
        };
        continue;
      }

      rows.push({
        ...value,
        ...(table === 'user_profiles'
          ? {}
          : { id: value.id ?? `${table}-${this.nextId++}` }),
      });
    }
  }

  delete(
    table: RuntimeTableName,
    filters: Array<{ column: string; value: unknown }>,
    ids: string[],
  ) {
    const idSet = new Set(ids);
    this.tables[table] = this.tables[table].filter(row => {
      const matchesFilters = filters.every(filter => row[filter.column] === filter.value);
      return !(matchesFilters && typeof row.id === 'string' && idSet.has(row.id));
    });
  }
}

class FakeSupabaseRuntimeTable {
  constructor(
    private client: FakeSupabaseRuntimeClient,
    private table: RuntimeTableName,
  ) {}

  select(_columns: string) {
    return new FakeSupabaseRuntimeSelectBuilder(this.client, this.table);
  }

  upsert(values: Record<string, unknown>[] | Record<string, unknown>, options?: { onConflict?: string }) {
    const rows = Array.isArray(values) ? values : [values];
    this.client.upsert(this.table, rows, options?.onConflict);
    return Promise.resolve({ data: null, error: null });
  }

  delete() {
    return new FakeSupabaseRuntimeDeleteBuilder(this.client, this.table);
  }
}

class FakeSupabaseRuntimeSelectBuilder {
  private filters: Array<{ column: string; value: unknown }> = [];
  private sortColumn: string | null = null;
  private sortAscending = true;

  constructor(
    private client: FakeSupabaseRuntimeClient,
    private table: RuntimeTableName,
  ) {}

  eq(column: string, value: unknown) {
    this.filters.push({ column, value });
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.sortColumn = column;
    this.sortAscending = options?.ascending !== false;
    return this;
  }

  maybeSingle() {
    const rows = this.executeRows();
    return Promise.resolve({
      data: rows[0] ?? null,
      error: null,
    });
  }

  then<TResult1 = { data: Record<string, unknown>[]; error: null }, TResult2 = never>(
    onfulfilled?:
      | ((value: { data: Record<string, unknown>[]; error: null }) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) {
    return Promise.resolve({
      data: this.executeRows(),
      error: null,
    }).then(onfulfilled, onrejected);
  }

  private executeRows() {
    const rows = this.client.query(this.table, this.filters);
    if (!this.sortColumn) {
      return rows;
    }

    return [...rows].sort((left, right) => {
      const leftValue = left[this.sortColumn!];
      const rightValue = right[this.sortColumn!];
      const comparison =
        typeof leftValue === 'number' && typeof rightValue === 'number'
          ? leftValue - rightValue
          : String(leftValue).localeCompare(String(rightValue));

      return this.sortAscending ? comparison : -comparison;
    });
  }
}

class FakeSupabaseRuntimeDeleteBuilder {
  private filters: Array<{ column: string; value: unknown }> = [];
  private ids: string[] = [];

  constructor(
    private client: FakeSupabaseRuntimeClient,
    private table: RuntimeTableName,
  ) {}

  eq(column: string, value: unknown) {
    this.filters.push({ column, value });
    return this;
  }

  in(column: string, values: string[]) {
    if (column === 'id') {
      this.ids = [...values];
    }

    return this;
  }

  then<TResult1 = { data: null; error: null }, TResult2 = never>(
    onfulfilled?:
      | ((value: { data: null; error: null }) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) {
    this.client.delete(this.table, this.filters, this.ids);
    return Promise.resolve({ data: null, error: null }).then(onfulfilled, onrejected);
  }
}

class MemorySupabaseUserStateStoreAdapter implements SupabaseUserStateStoreAdapter {
  profile: SupabaseUserProfileRow | null = null;
  topicPreferences: LoadedSupabaseTopicPreferenceRow[] = [];
  savedItems: LoadedSupabaseSavedItemRow[] = [];
  watchlistItems: LoadedSupabaseWatchlistItemRow[] = [];
  notes: LoadedSupabaseNoteRow[] = [];
  feedback: LoadedSupabaseFeedbackRow[] = [];
  deleteCalls: Array<{ table: string; ids: string[] }> = [];

  constructor(seed?: Partial<MemorySupabaseUserStateStoreAdapter>) {
    Object.assign(this, seed);
  }

  async loadProfile(userId: string) {
    if (!this.profile || this.profile.user_id !== userId) {
      return null;
    }

    return { ...this.profile };
  }

  async loadTopicPreferences(userId: string) {
    return this.topicPreferences
      .filter(row => row.user_id === userId)
      .map(cloneTopicPreferenceRow);
  }

  async loadSavedItems(userId: string) {
    return this.savedItems.filter(row => row.user_id === userId).map(cloneSavedItemRow);
  }

  async loadWatchlistItems(userId: string) {
    return this.watchlistItems
      .filter(row => row.user_id === userId)
      .map(cloneWatchlistItemRow);
  }

  async loadNotes(userId: string) {
    return this.notes.filter(row => row.user_id === userId).map(cloneNoteRow);
  }

  async loadFeedback(userId: string) {
    return this.feedback.filter(row => row.user_id === userId).map(cloneFeedbackRow);
  }

  async upsertProfile(row: SupabaseUserProfileRow) {
    this.profile = { ...row };
  }

  async upsertTopicPreferences(rows: SupabaseTopicPreferenceRow[]) {
    this.topicPreferences = this.upsertRows(
      this.topicPreferences,
      rows,
      topicPreferenceIdentity,
      topicPreferenceIdentity,
      cloneTopicPreferenceRow,
    );
  }

  async upsertSavedItems(rows: SupabaseSavedItemRow[]) {
    this.savedItems = this.upsertRows(
      this.savedItems,
      rows,
      savedItemIdentity,
      savedItemIdentity,
      cloneSavedItemRow,
    );
  }

  async upsertWatchlistItems(rows: SupabaseWatchlistItemRow[]) {
    this.watchlistItems = this.upsertRows(
      this.watchlistItems,
      rows,
      watchlistIdentity,
      watchlistIdentity,
      cloneWatchlistItemRow,
    );
  }

  async upsertNotes(rows: SupabaseNoteRow[]) {
    this.notes = this.upsertRows(
      this.notes,
      rows,
      noteIdentity,
      noteIdentity,
      cloneNoteRow,
    );
  }

  async upsertFeedback(rows: SupabaseFeedbackRow[]) {
    this.feedback = this.upsertRows(
      this.feedback,
      rows,
      feedbackIdentity,
      feedbackIdentity,
      cloneFeedbackRow,
    );
  }

  async deleteTopicPreferences(userId: string, ids: string[]) {
    this.topicPreferences = this.deleteRows('user_topic_preferences', this.topicPreferences, userId, ids);
  }

  async deleteSavedItems(userId: string, ids: string[]) {
    this.savedItems = this.deleteRows('user_saved_items', this.savedItems, userId, ids);
  }

  async deleteWatchlistItems(userId: string, ids: string[]) {
    this.watchlistItems = this.deleteRows('user_watchlist_items', this.watchlistItems, userId, ids);
  }

  async deleteNotes(userId: string, ids: string[]) {
    this.notes = this.deleteRows('user_notes', this.notes, userId, ids);
  }

  async deleteFeedback(userId: string, ids: string[]) {
    this.feedback = this.deleteRows('user_feedback', this.feedback, userId, ids);
  }

  private upsertRows<
    TWriteRow extends { id?: string | null; user_id: string },
    TLoadedRow extends TWriteRow & { id: string },
  >(
    currentRows: TLoadedRow[],
    nextRows: TWriteRow[],
    getCurrentIdentity: (row: TLoadedRow) => string,
    getNextIdentity: (row: TWriteRow) => string,
    cloneRow: (row: TWriteRow) => TWriteRow,
  ) {
    const merged = new Map<string, TLoadedRow>();

    for (const row of currentRows) {
      merged.set(getCurrentIdentity(row), { ...row });
    }

    for (const row of nextRows) {
      const identity = getNextIdentity(row);
      const existing = merged.get(identity);
      merged.set(identity, {
        ...cloneRow(row),
        id: existing?.id ?? row.id ?? `${identity}-id`,
      } as unknown as TLoadedRow);
    }

    return Array.from(merged.values());
  }

  private deleteRows<T extends { id: string; user_id: string }>(
    table: string,
    currentRows: T[],
    userId: string,
    ids: string[],
  ) {
    this.deleteCalls.push({ table, ids: [...ids] });
    const idSet = new Set(ids);

    return currentRows.filter(row => row.user_id !== userId || !idSet.has(row.id));
  }
}

afterEach(() => {
  configureSupabaseUserStateStore(null);
});

test('toSupabaseRows expands a V2 snapshot into normalized row groups', () => {
  const state = createFreshPersistedStateV2();
  state.profile.onboarding_completed = true;
  state.profile.reading_mode = 'Original';
  state.topic_preferences = [
    {
      preference_type: 'followed',
      topic_kind: 'canonical',
      topic_id: 'topic_ai_agents',
      created_at: BASE_TIME,
      updated_at: BASE_TIME,
    },
    {
      preference_type: 'muted',
      topic_kind: 'custom',
      custom_topic_label: '  Macro Noise  ',
      source: 'user_created',
      created_at: BASE_TIME,
      updated_at: BASE_TIME,
    },
  ];
  state.saved_items = [
    {
      target_type: 'signal',
      target_id: 's1',
      created_at: BASE_TIME,
      updated_at: BASE_TIME,
    },
  ];
  state.watchlist_items = [
    {
      entity_id: 'entity_msft',
      sort_order: 3,
      created_at: BASE_TIME,
      updated_at: BASE_TIME,
    },
    {
      entity_id: 'entity_nvda',
      sort_order: 1,
      created_at: BASE_TIME,
      updated_at: BASE_TIME,
    },
  ];
  state.notes = [
    {
      target_type: 'signal',
      target_id: 's1',
      body: 'Keep watching',
      created_at: BASE_TIME,
      updated_at: BASE_TIME,
    },
  ];
  state.feedback = [
    {
      target_type: 'signal',
      target_id: 's1',
      feedback_type: 'useful',
      created_at: BASE_TIME,
      updated_at: BASE_TIME,
    },
  ];

  const rows = toSupabaseRows(USER_ID, state);

  assert.equal(rows.profile.user_id, USER_ID);
  assert.equal(rows.profile.local_schema_version, 2);
  assert.equal(rows.profile.reading_mode, 'Original');
  assert.equal(rows.topicPreferences[1].topic_kind, 'custom');
  assert.equal(rows.topicPreferences[1].custom_topic_label, 'Macro Noise');
  assert.equal(rows.topicPreferences[1].custom_topic_label_normalized, 'macro noise');
  assert.deepEqual(
    rows.watchlistItems.map(row => [row.entity_id, row.sort_order]),
    [
      ['entity_nvda', 1],
      ['entity_msft', 3],
    ],
  );
  assert.equal(rows.savedItems[0].target_id, 's1');
  assert.equal(rows.notes[0].body, 'Keep watching');
  assert.equal(rows.feedback[0].feedback_type, 'useful');
});

test('fromSupabaseRows reconstructs a V2 snapshot and sorts watchlist items by sort_order', () => {
  const state = fromSupabaseRows({
    profile: {
      user_id: USER_ID,
      onboarding_completed: true,
      reading_mode: 'Bilingual',
      translation_style: 'Professional Analysis',
      core_domains: ['ai', 'energy'],
      critical_alerts: true,
      dark_mode: false,
      local_schema_version: 2,
      local_v2_migrated_at: null,
      created_at: BASE_TIME,
      updated_at: '2026-05-06T01:00:00.000Z',
    },
    topicPreferences: [
      {
        id: 'tp-1',
        user_id: USER_ID,
        preference_type: 'followed',
        topic_kind: 'canonical',
        topic_id: 'topic_ai_agents',
        custom_topic_label: null,
        custom_topic_label_normalized: null,
        source: null,
        created_at: BASE_TIME,
        updated_at: BASE_TIME,
      },
      {
        id: 'tp-2',
        user_id: USER_ID,
        preference_type: 'muted',
        topic_kind: 'custom',
        topic_id: null,
        custom_topic_label: 'Macro Noise',
        custom_topic_label_normalized: 'macro noise',
        source: 'user_created',
        created_at: BASE_TIME,
        updated_at: BASE_TIME,
      },
    ],
    savedItems: [
      {
        id: 'saved-1',
        user_id: USER_ID,
        target_type: 'signal',
        target_id: 's1',
        created_at: BASE_TIME,
        updated_at: BASE_TIME,
      },
    ],
    watchlistItems: [
      {
        id: 'watch-2',
        user_id: USER_ID,
        entity_id: 'entity_msft',
        sort_order: 5,
        created_at: BASE_TIME,
        updated_at: BASE_TIME,
      },
      {
        id: 'watch-1',
        user_id: USER_ID,
        entity_id: 'entity_nvda',
        sort_order: 1,
        created_at: BASE_TIME,
        updated_at: BASE_TIME,
      },
    ],
    notes: [
      {
        id: 'note-1',
        user_id: USER_ID,
        target_type: 'signal',
        target_id: 's1',
        body: 'Saved note',
        created_at: BASE_TIME,
        updated_at: BASE_TIME,
      },
    ],
    feedback: [
      {
        id: 'feedback-1',
        user_id: USER_ID,
        target_type: 'signal',
        target_id: 's1',
        feedback_type: 'useful',
        created_at: BASE_TIME,
        updated_at: BASE_TIME,
      },
    ],
  });

  assert.equal(state.schema_version, 2);
  assert.equal(state.profile.onboarding_completed, true);
  assert.equal(state.profile.dark_mode, false);
  assert.equal(state.topic_preferences[0].topic_kind, 'canonical');
  assert.equal(state.topic_preferences[1].topic_kind, 'custom');
  assert.deepEqual(
    state.watchlist_items.map(item => [item.entity_id, item.sort_order]),
    [
      ['entity_nvda', 1],
      ['entity_msft', 5],
    ],
  );
  assert.equal(state.notes[0].body, 'Saved note');
  assert.equal(state.feedback[0].feedback_type, 'useful');
});

test('loadRemoteUserState stays local-only when no adapter is configured', async () => {
  configureSupabaseUserStateStore(null);

  const remoteState = await loadRemoteUserState(USER_ID);

  assert.equal(remoteState, null);
  await assert.doesNotReject(async () => {
    await saveRemoteUserState(USER_ID, createFreshPersistedStateV2());
  });
});

test('loadRemoteUserState rebuilds a V2 snapshot from injected remote rows', async () => {
  const adapter = new MemorySupabaseUserStateStoreAdapter({
    profile: {
      user_id: USER_ID,
      onboarding_completed: true,
      reading_mode: 'Original',
      translation_style: 'Accurate Translation',
      core_domains: ['ai', 'macro'],
      critical_alerts: false,
      dark_mode: true,
      local_schema_version: 2,
      local_v2_migrated_at: null,
      created_at: BASE_TIME,
      updated_at: '2026-05-06T02:00:00.000Z',
    },
    topicPreferences: [
      {
        id: 'tp-1',
        user_id: USER_ID,
        preference_type: 'followed',
        topic_kind: 'custom',
        topic_id: null,
        custom_topic_label: 'Power Semis',
        custom_topic_label_normalized: 'power semis',
        source: 'user_created',
        created_at: BASE_TIME,
        updated_at: BASE_TIME,
      },
    ],
    savedItems: [
      {
        id: 'saved-1',
        user_id: USER_ID,
        target_type: 'signal',
        target_id: 's9',
        created_at: BASE_TIME,
        updated_at: BASE_TIME,
      },
    ],
    watchlistItems: [
      {
        id: 'watch-2',
        user_id: USER_ID,
        entity_id: 'entity_msft',
        sort_order: 4,
        created_at: BASE_TIME,
        updated_at: BASE_TIME,
      },
      {
        id: 'watch-1',
        user_id: USER_ID,
        entity_id: 'entity_nvda',
        sort_order: 0,
        created_at: BASE_TIME,
        updated_at: BASE_TIME,
      },
    ],
    notes: [
      {
        id: 'note-1',
        user_id: USER_ID,
        target_type: 'signal',
        target_id: 's9',
        body: 'Remote note',
        created_at: BASE_TIME,
        updated_at: BASE_TIME,
      },
    ],
    feedback: [
      {
        id: 'feedback-1',
        user_id: USER_ID,
        target_type: 'signal',
        target_id: 's9',
        feedback_type: 'not_useful',
        created_at: BASE_TIME,
        updated_at: BASE_TIME,
      },
    ],
  });
  const store = createSupabaseUserStateStore(adapter);

  const remoteState = await store.loadRemoteUserState(USER_ID);

  assert.ok(remoteState);
  assert.equal(remoteState.profile.reading_mode, 'Original');
  assert.deepEqual(remoteState.profile.core_domains, ['ai', 'macro']);
  assert.equal(remoteState.topic_preferences[0].topic_kind, 'custom');
  assert.deepEqual(
    remoteState.watchlist_items.map(item => item.entity_id),
    ['entity_nvda', 'entity_msft'],
  );
  assert.equal(remoteState.notes[0].body, 'Remote note');
  assert.equal(remoteState.feedback[0].feedback_type, 'not_useful');
});

test('saveRemoteUserState upserts current rows and deletes remote rows missing after replace sync', async () => {
  const adapter = new MemorySupabaseUserStateStoreAdapter({
    profile: {
      user_id: USER_ID,
      onboarding_completed: false,
      reading_mode: 'Bilingual',
      translation_style: 'Professional Analysis',
      core_domains: ['ai', 'energy'],
      critical_alerts: true,
      dark_mode: true,
      local_schema_version: 2,
      local_v2_migrated_at: null,
      created_at: BASE_TIME,
      updated_at: BASE_TIME,
    },
    topicPreferences: [
      {
        id: 'tp-keep',
        user_id: USER_ID,
        preference_type: 'followed',
        topic_kind: 'canonical',
        topic_id: 'topic_ai_agents',
        custom_topic_label: null,
        custom_topic_label_normalized: null,
        source: null,
        created_at: BASE_TIME,
        updated_at: BASE_TIME,
      },
      {
        id: 'tp-drop',
        user_id: USER_ID,
        preference_type: 'muted',
        topic_kind: 'custom',
        topic_id: null,
        custom_topic_label: 'Old Topic',
        custom_topic_label_normalized: 'old topic',
        source: 'user_created',
        created_at: BASE_TIME,
        updated_at: BASE_TIME,
      },
    ],
    savedItems: [
      {
        id: 'saved-keep',
        user_id: USER_ID,
        target_type: 'signal',
        target_id: 's1',
        created_at: BASE_TIME,
        updated_at: BASE_TIME,
      },
      {
        id: 'saved-drop',
        user_id: USER_ID,
        target_type: 'signal',
        target_id: 's-old',
        created_at: BASE_TIME,
        updated_at: BASE_TIME,
      },
    ],
    watchlistItems: [
      {
        id: 'watch-keep',
        user_id: USER_ID,
        entity_id: 'entity_nvda',
        sort_order: 9,
        created_at: BASE_TIME,
        updated_at: BASE_TIME,
      },
      {
        id: 'watch-drop',
        user_id: USER_ID,
        entity_id: 'entity_old',
        sort_order: 10,
        created_at: BASE_TIME,
        updated_at: BASE_TIME,
      },
    ],
    notes: [
      {
        id: 'note-keep',
        user_id: USER_ID,
        target_type: 'signal',
        target_id: 's1',
        body: 'old note',
        created_at: BASE_TIME,
        updated_at: BASE_TIME,
      },
      {
        id: 'note-drop',
        user_id: USER_ID,
        target_type: 'signal',
        target_id: 's-old',
        body: 'delete me',
        created_at: BASE_TIME,
        updated_at: BASE_TIME,
      },
    ],
    feedback: [
      {
        id: 'feedback-keep',
        user_id: USER_ID,
        target_type: 'signal',
        target_id: 's1',
        feedback_type: 'useful',
        created_at: BASE_TIME,
        updated_at: BASE_TIME,
      },
      {
        id: 'feedback-drop',
        user_id: USER_ID,
        target_type: 'signal',
        target_id: 's-old',
        feedback_type: 'not_useful',
        created_at: BASE_TIME,
        updated_at: BASE_TIME,
      },
    ],
  });
  const store = createSupabaseUserStateStore(adapter);
  const state = createFreshPersistedStateV2();

  state.profile.onboarding_completed = true;
  state.profile.reading_mode = 'Original';
  state.profile.updated_at = '2026-05-06T05:00:00.000Z';
  state.topic_preferences = [
    {
      preference_type: 'followed',
      topic_kind: 'canonical',
      topic_id: 'topic_ai_agents',
      created_at: BASE_TIME,
      updated_at: '2026-05-06T05:00:00.000Z',
    },
    {
      preference_type: 'muted',
      topic_kind: 'custom',
      custom_topic_label: '  Macro Noise  ',
      source: 'user_created',
      created_at: BASE_TIME,
      updated_at: '2026-05-06T05:00:00.000Z',
    },
  ];
  state.saved_items = [
    {
      target_type: 'signal',
      target_id: 's1',
      created_at: BASE_TIME,
      updated_at: '2026-05-06T05:00:00.000Z',
    },
    {
      target_type: 'library_item',
      target_id: 'l2',
      created_at: BASE_TIME,
      updated_at: '2026-05-06T05:00:00.000Z',
    },
  ];
  state.watchlist_items = [
    {
      entity_id: 'entity_msft',
      sort_order: 2,
      created_at: BASE_TIME,
      updated_at: '2026-05-06T05:00:00.000Z',
    },
    {
      entity_id: 'entity_nvda',
      sort_order: 0,
      created_at: BASE_TIME,
      updated_at: '2026-05-06T05:00:00.000Z',
    },
  ];
  state.notes = [
    {
      target_type: 'signal',
      target_id: 's1',
      body: 'fresh note',
      created_at: BASE_TIME,
      updated_at: '2026-05-06T05:00:00.000Z',
    },
    {
      target_type: 'library_item',
      target_id: 'l2',
      body: 'library note',
      created_at: BASE_TIME,
      updated_at: '2026-05-06T05:00:00.000Z',
    },
  ];
  state.feedback = [
    {
      target_type: 'signal',
      target_id: 's1',
      feedback_type: 'not_useful',
      created_at: BASE_TIME,
      updated_at: '2026-05-06T05:00:00.000Z',
    },
    {
      target_type: 'library_item',
      target_id: 'l2',
      feedback_type: 'useful',
      created_at: BASE_TIME,
      updated_at: '2026-05-06T05:00:00.000Z',
    },
  ];

  await store.saveRemoteUserState(USER_ID, state);

  assert.equal(adapter.profile?.user_id, USER_ID);
  assert.equal(adapter.profile?.onboarding_completed, true);
  assert.equal(adapter.profile?.reading_mode, 'Original');
  assert.deepEqual(
    adapter.topicPreferences.map(topicPreferenceIdentity).sort(),
    [
      'followed:canonical:topic_ai_agents',
      'muted:custom:macro noise',
    ],
  );
  assert.deepEqual(
    adapter.savedItems.map(savedItemIdentity).sort(),
    ['library_item:l2', 'signal:s1'],
  );
  assert.deepEqual(
    adapter.watchlistItems.map(row => [row.entity_id, row.sort_order]),
    [
      ['entity_nvda', 0],
      ['entity_msft', 2],
    ],
  );
  assert.deepEqual(
    adapter.notes.map(noteIdentity).sort(),
    ['library_item:l2', 'signal:s1'],
  );
  assert.deepEqual(
    adapter.feedback.map(feedbackIdentity).sort(),
    ['library_item:l2', 'signal:s1'],
  );
  assert.deepEqual(adapter.deleteCalls, [
    { table: 'user_topic_preferences', ids: ['tp-drop'] },
    { table: 'user_saved_items', ids: ['saved-drop'] },
    { table: 'user_watchlist_items', ids: ['watch-drop'] },
    { table: 'user_notes', ids: ['note-drop'] },
    { table: 'user_feedback', ids: ['feedback-drop'] },
  ]);
});

test('saveRemoteUserState deletes stale remote rows when a local collection is cleared to empty', async () => {
  const adapter = new MemorySupabaseUserStateStoreAdapter({
    profile: {
      user_id: USER_ID,
      onboarding_completed: false,
      reading_mode: 'Bilingual',
      translation_style: 'Professional Analysis',
      core_domains: ['ai', 'energy'],
      critical_alerts: true,
      dark_mode: true,
      local_schema_version: 2,
      local_v2_migrated_at: null,
      created_at: BASE_TIME,
      updated_at: BASE_TIME,
    },
    watchlistItems: [
      {
        id: 'watch-1',
        user_id: USER_ID,
        entity_id: 'entity_nvda',
        sort_order: 0,
        created_at: BASE_TIME,
        updated_at: BASE_TIME,
      },
      {
        id: 'watch-2',
        user_id: USER_ID,
        entity_id: 'entity_msft',
        sort_order: 1,
        created_at: BASE_TIME,
        updated_at: BASE_TIME,
      },
    ],
  });
  const store = createSupabaseUserStateStore(adapter);
  const state = createFreshPersistedStateV2();

  await store.saveRemoteUserState(USER_ID, state);

  assert.deepEqual(adapter.watchlistItems, []);
  assert.deepEqual(adapter.deleteCalls, [
    { table: 'user_watchlist_items', ids: ['watch-1', 'watch-2'] },
  ]);
});

test('saveRemoteUserState rejects malformed loaded rows that are missing stable ids', async () => {
  const adapter = new MemorySupabaseUserStateStoreAdapter({
    profile: {
      user_id: USER_ID,
      onboarding_completed: false,
      reading_mode: 'Bilingual',
      translation_style: 'Professional Analysis',
      core_domains: ['ai', 'energy'],
      critical_alerts: true,
      dark_mode: true,
      local_schema_version: 2,
      local_v2_migrated_at: null,
      created_at: BASE_TIME,
      updated_at: BASE_TIME,
    },
    savedItems: [
      {
        id: 'saved-1',
        user_id: USER_ID,
        target_type: 'signal',
        target_id: 'stale',
        created_at: BASE_TIME,
        updated_at: BASE_TIME,
      },
    ],
  });
  const store = createSupabaseUserStateStore({
    loadProfile: adapter.loadProfile.bind(adapter),
    loadTopicPreferences: adapter.loadTopicPreferences.bind(adapter),
    async loadSavedItems(userId: string) {
      const rows = await adapter.loadSavedItems(userId);
      return rows.map(row => ({ ...row, id: undefined })) as any;
    },
    loadWatchlistItems: adapter.loadWatchlistItems.bind(adapter),
    loadNotes: adapter.loadNotes.bind(adapter),
    loadFeedback: adapter.loadFeedback.bind(adapter),
    upsertProfile: adapter.upsertProfile.bind(adapter),
    upsertTopicPreferences: adapter.upsertTopicPreferences.bind(adapter),
    upsertSavedItems: adapter.upsertSavedItems.bind(adapter),
    upsertWatchlistItems: adapter.upsertWatchlistItems.bind(adapter),
    upsertNotes: adapter.upsertNotes.bind(adapter),
    upsertFeedback: adapter.upsertFeedback.bind(adapter),
    deleteTopicPreferences: adapter.deleteTopicPreferences.bind(adapter),
    deleteSavedItems: adapter.deleteSavedItems.bind(adapter),
    deleteWatchlistItems: adapter.deleteWatchlistItems.bind(adapter),
    deleteNotes: adapter.deleteNotes.bind(adapter),
    deleteFeedback: adapter.deleteFeedback.bind(adapter),
  });
  const state = createFreshPersistedStateV2();

  await assert.rejects(
    store.saveRemoteUserState(USER_ID, state),
    /missing stable id/i,
  );
});

test('runtime store configuration wires the Supabase client adapter so profile and saved item writes reach the global store', async () => {
  const client = new FakeSupabaseRuntimeClient();
  configureRuntimeSupabaseUserStateStore(
    client as unknown as Parameters<typeof createSupabaseClientUserStateStoreAdapter>[0],
  );

  const state = createFreshPersistedStateV2();
  state.profile.onboarding_completed = true;
  state.saved_items = [
    {
      target_type: 'signal',
      target_id: 's-runtime',
      created_at: BASE_TIME,
      updated_at: BASE_TIME,
    },
  ];

  await saveRemoteUserState(USER_ID, state);
  const remoteState = await loadRemoteUserState(USER_ID);

  assert.equal(client.tables.user_profiles.length, 1);
  assert.equal(client.tables.user_saved_items.length, 1);
  assert.equal(
    client.tables.user_profiles[0]?.user_id,
    USER_ID,
  );
  assert.deepEqual(
    remoteState?.saved_items.map(item => item.target_id),
    ['s-runtime'],
  );
});
