import type { SupabaseClient } from '@supabase/supabase-js';
import type { PersistedUserStateV2 } from '../../types';
import {
  fromSupabaseRows,
  normalizeCustomTopicLabel,
  toSupabaseRows,
  type SupabaseCanonicalTopicPreferenceRow,
  type SupabaseCustomTopicPreferenceRow,
  type SupabaseFeedbackRow,
  type SupabaseNoteRow,
  type SupabaseSavedItemRow,
  type SupabaseTopicPreferenceRow,
  type SupabaseUserProfileRow,
  type SupabaseWatchlistItemRow,
} from './userStateMapper';
import { buildMissingDeleteIds } from './syncDecisions';

interface SupabaseCollectionRow {
  id?: string | null;
  user_id: string;
}

type SupabaseLoadedCollectionRow<TRow extends SupabaseCollectionRow> =
  Omit<TRow, 'id'> & { id: string };

type LoadedSupabaseCanonicalTopicPreferenceRow =
  SupabaseLoadedCollectionRow<SupabaseCanonicalTopicPreferenceRow>;
type LoadedSupabaseCustomTopicPreferenceRow =
  SupabaseLoadedCollectionRow<SupabaseCustomTopicPreferenceRow>;

export type LoadedSupabaseTopicPreferenceRow =
  | LoadedSupabaseCanonicalTopicPreferenceRow
  | LoadedSupabaseCustomTopicPreferenceRow;
export type LoadedSupabaseSavedItemRow =
  SupabaseLoadedCollectionRow<SupabaseSavedItemRow>;
export type LoadedSupabaseWatchlistItemRow =
  SupabaseLoadedCollectionRow<SupabaseWatchlistItemRow>;
export type LoadedSupabaseNoteRow =
  SupabaseLoadedCollectionRow<SupabaseNoteRow>;
export type LoadedSupabaseFeedbackRow =
  SupabaseLoadedCollectionRow<SupabaseFeedbackRow>;

export interface SupabaseUserStateStoreAdapter {
  loadProfile(userId: string): Promise<SupabaseUserProfileRow | null>;
  loadTopicPreferences(userId: string): Promise<LoadedSupabaseTopicPreferenceRow[]>;
  loadSavedItems(userId: string): Promise<LoadedSupabaseSavedItemRow[]>;
  loadWatchlistItems(userId: string): Promise<LoadedSupabaseWatchlistItemRow[]>;
  loadNotes(userId: string): Promise<LoadedSupabaseNoteRow[]>;
  loadFeedback(userId: string): Promise<LoadedSupabaseFeedbackRow[]>;
  upsertProfile(row: SupabaseUserProfileRow): Promise<void>;
  upsertTopicPreferences(rows: SupabaseTopicPreferenceRow[]): Promise<void>;
  upsertSavedItems(rows: SupabaseSavedItemRow[]): Promise<void>;
  upsertWatchlistItems(rows: SupabaseWatchlistItemRow[]): Promise<void>;
  upsertNotes(rows: SupabaseNoteRow[]): Promise<void>;
  upsertFeedback(rows: SupabaseFeedbackRow[]): Promise<void>;
  deleteTopicPreferences(userId: string, ids: string[]): Promise<void>;
  deleteSavedItems(userId: string, ids: string[]): Promise<void>;
  deleteWatchlistItems(userId: string, ids: string[]): Promise<void>;
  deleteNotes(userId: string, ids: string[]): Promise<void>;
  deleteFeedback(userId: string, ids: string[]): Promise<void>;
}

export interface SupabaseUserStateStore {
  loadRemoteUserState(userId: string): Promise<PersistedUserStateV2 | null>;
  saveRemoteUserState(userId: string, state: PersistedUserStateV2): Promise<void>;
}

type SupabaseRuntimeClient = Pick<SupabaseClient<any, any, any>, 'from'>;

const topicPreferenceIdentity = (row: SupabaseTopicPreferenceRow) =>
  row.topic_kind === 'canonical'
    ? `${row.preference_type}:canonical:${row.topic_id}`
    : `${row.preference_type}:custom:${normalizeCustomTopicLabel(row.custom_topic_label)}`;

const savedItemIdentity = (row: SupabaseSavedItemRow) => `${row.target_type}:${row.target_id}`;
const watchlistIdentity = (row: SupabaseWatchlistItemRow) => row.entity_id;
const noteIdentity = (row: SupabaseNoteRow) => `${row.target_type}:${row.target_id}`;
const feedbackIdentity = (row: SupabaseFeedbackRow) => `${row.target_type}:${row.target_id}`;

const ensureStableLoadedId = (value: unknown) => {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error('Loaded remote row is missing stable id');
  }

  return value;
};

const buildSupabaseError = (context: string, error: { message?: string; code?: string | null }) =>
  new Error(
    `[SignalDesk sync] ${context} failed${error.code ? ` (${error.code})` : ''}: ${
      error.message ?? 'Unknown Supabase error'
    }`,
  );

async function runSupabaseQuery<TData>(
  operation: PromiseLike<{ data: TData; error: { message?: string; code?: string | null } | null }>,
  context: string,
) {
  const { data, error } = await operation;
  if (error) {
    throw buildSupabaseError(context, error);
  }

  return data;
}

async function replaceUserCollection<
  TWriteRow extends SupabaseCollectionRow,
  TLoadedRow extends TWriteRow & { id: string },
>(args: {
  userId: string;
  rows: TWriteRow[];
  loadRows: (userId: string) => Promise<TLoadedRow[]>;
  upsertRows: (rows: TWriteRow[]) => Promise<void>;
  deleteRows: (userId: string, ids: string[]) => Promise<void>;
  getLocalIdentity: (row: TWriteRow) => string;
  getRemoteIdentity: (row: TLoadedRow) => string;
}) {
  if (args.rows.length > 0) {
    await args.upsertRows(args.rows);
  }

  const remoteRows = await args.loadRows(args.userId);
  const deleteIds = buildMissingDeleteIds(
    remoteRows.map(row => ({
      id: ensureStableLoadedId(row.id),
      key: args.getRemoteIdentity(row),
    })),
    new Set(args.rows.map(args.getLocalIdentity)),
  );

  if (deleteIds.length > 0) {
    await args.deleteRows(args.userId, deleteIds);
  }
}

export function createSupabaseUserStateStore(
  adapter: SupabaseUserStateStoreAdapter | null,
): SupabaseUserStateStore {
  return {
    async loadRemoteUserState(userId: string) {
      if (!adapter) {
        return null;
      }

      const profile = await adapter.loadProfile(userId);
      if (!profile) {
        return null;
      }

      const [
        topicPreferences,
        savedItems,
        watchlistItems,
        notes,
        feedback,
      ] = await Promise.all([
        adapter.loadTopicPreferences(userId),
        adapter.loadSavedItems(userId),
        adapter.loadWatchlistItems(userId),
        adapter.loadNotes(userId),
        adapter.loadFeedback(userId),
      ]);

      return fromSupabaseRows({
        profile,
        topicPreferences,
        savedItems,
        watchlistItems,
        notes,
        feedback,
      });
    },

    async saveRemoteUserState(userId: string, state: PersistedUserStateV2) {
      if (!adapter) {
        return;
      }

      const rows = toSupabaseRows(userId, state);

      await adapter.upsertProfile(rows.profile);
      await replaceUserCollection({
        userId,
        rows: rows.topicPreferences,
        loadRows: adapter.loadTopicPreferences.bind(adapter),
        upsertRows: adapter.upsertTopicPreferences.bind(adapter),
        deleteRows: adapter.deleteTopicPreferences.bind(adapter),
        getLocalIdentity: topicPreferenceIdentity,
        getRemoteIdentity: topicPreferenceIdentity,
      });
      await replaceUserCollection({
        userId,
        rows: rows.savedItems,
        loadRows: adapter.loadSavedItems.bind(adapter),
        upsertRows: adapter.upsertSavedItems.bind(adapter),
        deleteRows: adapter.deleteSavedItems.bind(adapter),
        getLocalIdentity: savedItemIdentity,
        getRemoteIdentity: savedItemIdentity,
      });
      await replaceUserCollection({
        userId,
        rows: rows.watchlistItems,
        loadRows: adapter.loadWatchlistItems.bind(adapter),
        upsertRows: adapter.upsertWatchlistItems.bind(adapter),
        deleteRows: adapter.deleteWatchlistItems.bind(adapter),
        getLocalIdentity: watchlistIdentity,
        getRemoteIdentity: watchlistIdentity,
      });
      await replaceUserCollection({
        userId,
        rows: rows.notes,
        loadRows: adapter.loadNotes.bind(adapter),
        upsertRows: adapter.upsertNotes.bind(adapter),
        deleteRows: adapter.deleteNotes.bind(adapter),
        getLocalIdentity: noteIdentity,
        getRemoteIdentity: noteIdentity,
      });
      await replaceUserCollection({
        userId,
        rows: rows.feedback,
        loadRows: adapter.loadFeedback.bind(adapter),
        upsertRows: adapter.upsertFeedback.bind(adapter),
        deleteRows: adapter.deleteFeedback.bind(adapter),
        getLocalIdentity: feedbackIdentity,
        getRemoteIdentity: feedbackIdentity,
      });
    },
  };
}

export function createSupabaseClientUserStateStoreAdapter(
  client: SupabaseRuntimeClient,
): SupabaseUserStateStoreAdapter {
  return {
    async loadProfile(userId) {
      const data = await runSupabaseQuery(
        client.from('user_profiles').select('*').eq('user_id', userId).maybeSingle(),
        'load user_profiles',
      );

      return (data ?? null) as SupabaseUserProfileRow | null;
    },
    async loadTopicPreferences(userId) {
      const data = await runSupabaseQuery(
        client.from('user_topic_preferences').select('*').eq('user_id', userId),
        'load user_topic_preferences',
      );

      return (data ?? []) as LoadedSupabaseTopicPreferenceRow[];
    },
    async loadSavedItems(userId) {
      const data = await runSupabaseQuery(
        client.from('user_saved_items').select('*').eq('user_id', userId),
        'load user_saved_items',
      );

      return (data ?? []) as LoadedSupabaseSavedItemRow[];
    },
    async loadWatchlistItems(userId) {
      const data = await runSupabaseQuery(
        client
          .from('user_watchlist_items')
          .select('*')
          .eq('user_id', userId)
          .order('sort_order', { ascending: true }),
        'load user_watchlist_items',
      );

      return (data ?? []) as LoadedSupabaseWatchlistItemRow[];
    },
    async loadNotes(userId) {
      const data = await runSupabaseQuery(
        client.from('user_notes').select('*').eq('user_id', userId),
        'load user_notes',
      );

      return (data ?? []) as LoadedSupabaseNoteRow[];
    },
    async loadFeedback(userId) {
      const data = await runSupabaseQuery(
        client.from('user_feedback').select('*').eq('user_id', userId),
        'load user_feedback',
      );

      return (data ?? []) as LoadedSupabaseFeedbackRow[];
    },
    async upsertProfile(row) {
      await runSupabaseQuery(
        client.from('user_profiles').upsert(row, { onConflict: 'user_id' }),
        'upsert user_profiles',
      );
    },
    async upsertTopicPreferences(rows) {
      const canonicalRows = rows.filter(
        (row): row is SupabaseCanonicalTopicPreferenceRow => row.topic_kind === 'canonical',
      );
      const customRows = rows.filter(
        (row): row is SupabaseCustomTopicPreferenceRow => row.topic_kind === 'custom',
      );

      if (canonicalRows.length > 0) {
        await runSupabaseQuery(
          client.from('user_topic_preferences').upsert(canonicalRows, {
            onConflict: 'user_id,preference_type,topic_id',
          }),
          'upsert canonical user_topic_preferences',
        );
      }

      if (customRows.length > 0) {
        await runSupabaseQuery(
          client.from('user_topic_preferences').upsert(customRows, {
            onConflict: 'user_id,preference_type,custom_topic_label_normalized',
          }),
          'upsert custom user_topic_preferences',
        );
      }
    },
    async upsertSavedItems(rows) {
      if (rows.length === 0) {
        return;
      }

      await runSupabaseQuery(
        client.from('user_saved_items').upsert(rows, {
          onConflict: 'user_id,target_type,target_id',
        }),
        'upsert user_saved_items',
      );
    },
    async upsertWatchlistItems(rows) {
      if (rows.length === 0) {
        return;
      }

      await runSupabaseQuery(
        client.from('user_watchlist_items').upsert(rows, {
          onConflict: 'user_id,entity_id',
        }),
        'upsert user_watchlist_items',
      );
    },
    async upsertNotes(rows) {
      if (rows.length === 0) {
        return;
      }

      await runSupabaseQuery(
        client.from('user_notes').upsert(rows, {
          onConflict: 'user_id,target_type,target_id',
        }),
        'upsert user_notes',
      );
    },
    async upsertFeedback(rows) {
      if (rows.length === 0) {
        return;
      }

      await runSupabaseQuery(
        client.from('user_feedback').upsert(rows, {
          onConflict: 'user_id,target_type,target_id',
        }),
        'upsert user_feedback',
      );
    },
    async deleteTopicPreferences(userId, ids) {
      if (ids.length === 0) {
        return;
      }

      await runSupabaseQuery(
        client.from('user_topic_preferences').delete().eq('user_id', userId).in('id', ids),
        'delete user_topic_preferences',
      );
    },
    async deleteSavedItems(userId, ids) {
      if (ids.length === 0) {
        return;
      }

      await runSupabaseQuery(
        client.from('user_saved_items').delete().eq('user_id', userId).in('id', ids),
        'delete user_saved_items',
      );
    },
    async deleteWatchlistItems(userId, ids) {
      if (ids.length === 0) {
        return;
      }

      await runSupabaseQuery(
        client.from('user_watchlist_items').delete().eq('user_id', userId).in('id', ids),
        'delete user_watchlist_items',
      );
    },
    async deleteNotes(userId, ids) {
      if (ids.length === 0) {
        return;
      }

      await runSupabaseQuery(
        client.from('user_notes').delete().eq('user_id', userId).in('id', ids),
        'delete user_notes',
      );
    },
    async deleteFeedback(userId, ids) {
      if (ids.length === 0) {
        return;
      }

      await runSupabaseQuery(
        client.from('user_feedback').delete().eq('user_id', userId).in('id', ids),
        'delete user_feedback',
      );
    },
  };
}

let configuredStore = createSupabaseUserStateStore(null);

export function configureSupabaseUserStateStore(
  adapter: SupabaseUserStateStoreAdapter | null,
) {
  configuredStore = createSupabaseUserStateStore(adapter);
}

export function configureRuntimeSupabaseUserStateStore(
  client: SupabaseRuntimeClient | null,
) {
  configureSupabaseUserStateStore(
    client ? createSupabaseClientUserStateStoreAdapter(client) : null,
  );
}

export function loadRemoteUserState(userId: string) {
  return configuredStore.loadRemoteUserState(userId);
}

export function saveRemoteUserState(userId: string, state: PersistedUserStateV2) {
  return configuredStore.saveRemoteUserState(userId, state);
}
