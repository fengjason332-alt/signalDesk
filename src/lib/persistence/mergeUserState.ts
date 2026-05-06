import { createFreshPersistedStateV2 } from '../../storage';
import {
  FeedbackRecord,
  PersistedUserStateV2,
  TopicPreferenceRecord,
} from '../../types';

const getUpdatedAtTime = (value: string) => {
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? Number.NEGATIVE_INFINITY : timestamp;
};

const pickNewest = <T extends { updated_at: string }>(left: T, right: T) =>
  getUpdatedAtTime(left.updated_at) >= getUpdatedAtTime(right.updated_at) ? left : right;

const normalizeCustomTopicIdentity = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

const cloneTopicPreference = (record: TopicPreferenceRecord): TopicPreferenceRecord =>
  record.topic_kind === 'canonical'
    ? { ...record }
    : { ...record };

const cloneFeedbackRecord = (record: FeedbackRecord): FeedbackRecord => ({ ...record });

const sortWatchlistItems = <T extends { sort_order: number }>(items: T[]) =>
  items.sort((left, right) => left.sort_order - right.sort_order);

const cloneState = (state: PersistedUserStateV2): PersistedUserStateV2 => ({
  schema_version: 2,
  profile: {
    ...state.profile,
    core_domains: [...state.profile.core_domains],
  },
  topic_preferences: state.topic_preferences.map(cloneTopicPreference),
  saved_items: state.saved_items.map(item => ({ ...item })),
  watchlist_items: sortWatchlistItems(state.watchlist_items.map(item => ({ ...item }))),
  notes: state.notes.map(note => ({ ...note })),
  feedback: state.feedback.map(cloneFeedbackRecord),
});

const mergeByIdentity = <T extends { updated_at: string }>(
  left: T[],
  right: T[],
  getKey: (value: T) => string,
) => {
  const merged = new Map<string, T>();

  for (const value of [...left, ...right]) {
    const key = getKey(value);
    const existing = merged.get(key);
    merged.set(key, existing ? pickNewest(existing, value) : value);
  }

  return Array.from(merged.values());
};

const getTopicPreferenceIdentity = (record: TopicPreferenceRecord) =>
  record.topic_kind === 'canonical'
    ? `${record.preference_type}:canonical:${record.topic_id}`
    : `${record.preference_type}:custom:${normalizeCustomTopicIdentity(record.custom_topic_label)}`;

export function mergeUserStates(
  localState: PersistedUserStateV2,
  remoteState: PersistedUserStateV2 | null,
): PersistedUserStateV2 {
  if (!remoteState) {
    return cloneState(localState);
  }

  const merged = createFreshPersistedStateV2();
  const winnerProfile = pickNewest(localState.profile, remoteState.profile);

  merged.profile = {
    ...winnerProfile,
    core_domains: [...winnerProfile.core_domains],
  };
  merged.topic_preferences = mergeByIdentity(
    localState.topic_preferences,
    remoteState.topic_preferences,
    getTopicPreferenceIdentity,
  ).map(cloneTopicPreference);
  merged.saved_items = mergeByIdentity(
    localState.saved_items,
    remoteState.saved_items,
    item => `${item.target_type}:${item.target_id}`,
  ).map(item => ({ ...item }));
  merged.watchlist_items = mergeByIdentity(
    localState.watchlist_items,
    remoteState.watchlist_items,
    item => item.entity_id,
  )
    .map(item => ({ ...item }));
  sortWatchlistItems(merged.watchlist_items);
  merged.notes = mergeByIdentity(
    localState.notes,
    remoteState.notes,
    note => `${note.target_type}:${note.target_id}`,
  ).map(note => ({ ...note }));
  merged.feedback = mergeByIdentity(
    localState.feedback,
    remoteState.feedback,
    item => `${item.target_type}:${item.target_id}`,
  ).map(cloneFeedbackRecord);

  return merged;
}
