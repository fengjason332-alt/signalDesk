import type {
  CategoryKey,
  FeedbackType,
  PersistedUserStateV2,
  ReadingMode,
  SavedItemTargetType,
  TopicPreferenceType,
  TranslationStyle,
} from '../../types';

const sortWatchlistRows = <T extends { sort_order: number }>(rows: T[]) =>
  rows.sort((left, right) => left.sort_order - right.sort_order);

export const normalizeCustomTopicLabel = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

export interface SupabaseUserProfileRow {
  user_id: string;
  onboarding_completed: boolean;
  reading_mode: ReadingMode;
  translation_style: TranslationStyle;
  core_domains: CategoryKey[];
  critical_alerts: boolean;
  dark_mode: boolean;
  local_schema_version: number;
  local_v2_migrated_at: string | null;
  created_at?: string;
  updated_at: string;
}

interface SupabaseCollectionRow {
  id?: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
}

interface SupabaseBaseTopicPreferenceRow extends SupabaseCollectionRow {
  preference_type: TopicPreferenceType;
  source: 'legacy_localStorage' | 'user_created' | null;
}

export interface SupabaseCanonicalTopicPreferenceRow extends SupabaseBaseTopicPreferenceRow {
  topic_kind: 'canonical';
  topic_id: string;
  custom_topic_label: null;
  custom_topic_label_normalized: null;
  source: null;
}

export interface SupabaseCustomTopicPreferenceRow extends SupabaseBaseTopicPreferenceRow {
  topic_kind: 'custom';
  topic_id: null;
  custom_topic_label: string;
  custom_topic_label_normalized: string;
  source: 'legacy_localStorage' | 'user_created';
}

export type SupabaseTopicPreferenceRow =
  | SupabaseCanonicalTopicPreferenceRow
  | SupabaseCustomTopicPreferenceRow;

export interface SupabaseSavedItemRow extends SupabaseCollectionRow {
  target_type: SavedItemTargetType;
  target_id: string;
}

export interface SupabaseWatchlistItemRow extends SupabaseCollectionRow {
  entity_id: string;
  sort_order: number;
}

export interface SupabaseNoteRow extends SupabaseCollectionRow {
  target_type: SavedItemTargetType;
  target_id: string;
  body: string;
}

export interface SupabaseFeedbackRow extends SupabaseCollectionRow {
  target_type: SavedItemTargetType;
  target_id: string;
  feedback_type: FeedbackType;
}

export interface SupabaseUserStateRows {
  profile: SupabaseUserProfileRow;
  topicPreferences: SupabaseTopicPreferenceRow[];
  savedItems: SupabaseSavedItemRow[];
  watchlistItems: SupabaseWatchlistItemRow[];
  notes: SupabaseNoteRow[];
  feedback: SupabaseFeedbackRow[];
}

const toTopicPreferenceRow = (
  userId: string,
  record: PersistedUserStateV2['topic_preferences'][number],
): SupabaseTopicPreferenceRow => {
  if (record.topic_kind === 'canonical') {
    return {
      user_id: userId,
      preference_type: record.preference_type,
      topic_kind: 'canonical',
      topic_id: record.topic_id,
      custom_topic_label: null,
      custom_topic_label_normalized: null,
      source: null,
      created_at: record.created_at,
      updated_at: record.updated_at,
    };
  }

  const trimmedLabel = record.custom_topic_label.trim();

  return {
    user_id: userId,
    preference_type: record.preference_type,
    topic_kind: 'custom',
    topic_id: null,
    custom_topic_label: trimmedLabel,
    custom_topic_label_normalized: normalizeCustomTopicLabel(record.custom_topic_label),
    source: record.source,
    created_at: record.created_at,
    updated_at: record.updated_at,
  };
};

export function toSupabaseRows(userId: string, state: PersistedUserStateV2): SupabaseUserStateRows {
  return {
    profile: {
      user_id: userId,
      onboarding_completed: state.profile.onboarding_completed,
      reading_mode: state.profile.reading_mode,
      translation_style: state.profile.translation_style,
      core_domains: [...state.profile.core_domains],
      critical_alerts: state.profile.critical_alerts,
      dark_mode: state.profile.dark_mode,
      local_schema_version: state.schema_version,
      local_v2_migrated_at: null,
      updated_at: state.profile.updated_at,
    },
    topicPreferences: state.topic_preferences.map(record => toTopicPreferenceRow(userId, record)),
    savedItems: state.saved_items.map(record => ({
      user_id: userId,
      target_type: record.target_type,
      target_id: record.target_id,
      created_at: record.created_at,
      updated_at: record.updated_at,
    })),
    watchlistItems: sortWatchlistRows(
      state.watchlist_items.map(record => ({
        user_id: userId,
        entity_id: record.entity_id,
        sort_order: record.sort_order,
        created_at: record.created_at,
        updated_at: record.updated_at,
      })),
    ),
    notes: state.notes.map(record => ({
      user_id: userId,
      target_type: record.target_type,
      target_id: record.target_id,
      body: record.body,
      created_at: record.created_at,
      updated_at: record.updated_at,
    })),
    feedback: state.feedback.map(record => ({
      user_id: userId,
      target_type: record.target_type,
      target_id: record.target_id,
      feedback_type: record.feedback_type,
      created_at: record.created_at,
      updated_at: record.updated_at,
    })),
  };
}

export function fromSupabaseRows(rows: SupabaseUserStateRows): PersistedUserStateV2 {
  return {
    schema_version: 2,
    profile: {
      onboarding_completed: rows.profile.onboarding_completed,
      reading_mode: rows.profile.reading_mode,
      translation_style: rows.profile.translation_style,
      core_domains: [...rows.profile.core_domains],
      critical_alerts: rows.profile.critical_alerts,
      dark_mode: rows.profile.dark_mode,
      updated_at: rows.profile.updated_at,
    },
    topic_preferences: rows.topicPreferences.map(record =>
      record.topic_kind === 'canonical'
        ? {
            preference_type: record.preference_type,
            topic_kind: 'canonical',
            topic_id: record.topic_id,
            created_at: record.created_at,
            updated_at: record.updated_at,
          }
        : {
            preference_type: record.preference_type,
            topic_kind: 'custom',
            custom_topic_label: record.custom_topic_label,
            source: record.source,
            created_at: record.created_at,
            updated_at: record.updated_at,
          }),
    saved_items: rows.savedItems.map(record => ({
      target_type: record.target_type,
      target_id: record.target_id,
      created_at: record.created_at,
      updated_at: record.updated_at,
    })),
    watchlist_items: sortWatchlistRows(
      rows.watchlistItems.map(record => ({
        entity_id: record.entity_id,
        sort_order: record.sort_order,
        created_at: record.created_at,
        updated_at: record.updated_at,
      })),
    ),
    notes: rows.notes.map(record => ({
      target_type: record.target_type,
      target_id: record.target_id,
      body: record.body,
      created_at: record.created_at,
      updated_at: record.updated_at,
    })),
    feedback: rows.feedback.map(record => ({
      target_type: record.target_type,
      target_id: record.target_id,
      feedback_type: record.feedback_type,
      created_at: record.created_at,
      updated_at: record.updated_at,
    })),
  };
}
