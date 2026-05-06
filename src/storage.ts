import {
  AppSettings,
  CategoryKey,
  NoteRecord,
  NoteTargetType,
  PersistedUserStateV2,
  SavedItemRecord,
  TopicPreferenceRecord,
  WatchlistItemRecord,
} from './types';
import { DEFAULT_CORE_DOMAINS } from './topicPreferences';
import {
  findCanonicalTopicByValue,
  getCanonicalTopicName,
  getDisplayTopicsFromPreferenceRecords,
} from './topicRegistry';

export const STORAGE_KEYS = {
  settings: 'signaldesk_settings',
  savedSignals: 'signaldesk_saved',
  watchlist: 'signaldesk_watchlist',
  notes: 'signaldesk_notes',
  onboardingComplete: 'signaldesk_onboarding_complete',
  persistedStateV2: 'signaldesk_state_v2',
} as const;

const LEGACY_DEFAULT_WATCHLIST_IDS = ['w1', 'w2', 'w3', 'w4'];
const WATCHLIST_ENTITY_PREFIX = 'entity_';

const LEGACY_CATEGORY_LABEL_TO_KEY: Record<string, CategoryKey> = {
  ai: 'ai',
  crypto: 'crypto',
  stocks: 'stocks',
  robotics: 'robotics',
  energy: 'energy',
  'us policy': 'us_policy',
  us_policy: 'us_policy',
  'china policy': 'china_policy',
  china_policy: 'china_policy',
  'australia policy': 'australia_policy',
  australia_policy: 'australia_policy',
  macro: 'macro',
  geopolitics: 'geopolitics',
};

const VALID_READING_MODES = new Set(['Chinese Only', 'Bilingual', 'Original']);
const VALID_TRANSLATION_STYLES = new Set([
  'Professional Analysis',
  'Simple Chinese',
  'Accurate Translation',
  'Student-Friendly Explanation',
]);

const getStorage = (): Storage | null => {
  if (typeof globalThis === 'undefined' || !('localStorage' in globalThis)) {
    return null;
  }

  return globalThis.localStorage;
};

const normalizeText = (value: string) => value.trim().toLowerCase();

const uniqueStrings = (values: string[]) => {
  const seen = new Set<string>();

  return values.filter(value => {
    const normalizedValue = normalizeText(value);
    if (!normalizedValue || seen.has(normalizedValue)) {
      return false;
    }

    seen.add(normalizedValue);
    return true;
  });
};

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every(item => typeof item === 'string');

const safeParseJson = (rawValue: string | null): unknown => {
  if (rawValue === null) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as unknown;
  } catch {
    return null;
  }
};

const readRawStorageValue = (key: string) => {
  const storage = getStorage();
  if (!storage) {
    return null;
  }

  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
};

const nowIso = () => new Date().toISOString();

const normalizeCategoryKey = (value: string): CategoryKey | null => {
  const normalizedValue = normalizeText(value);
  if (!normalizedValue) {
    return null;
  }

  return LEGACY_CATEGORY_LABEL_TO_KEY[normalizedValue] ?? null;
};

const sanitizeCoreDomains = (values: unknown): CategoryKey[] => {
  if (!isStringArray(values)) {
    return DEFAULT_CORE_DOMAINS;
  }

  const normalizedValues = uniqueStrings(
    values
      .map(normalizeCategoryKey)
      .filter((value): value is CategoryKey => Boolean(value)),
  ) as CategoryKey[];

  return normalizedValues.length > 0 ? normalizedValues : DEFAULT_CORE_DOMAINS;
};

const sanitizeTopicLabels = (values: unknown) => (isStringArray(values) ? uniqueStrings(values) : []);

const sanitizeBoolean = (value: unknown, fallback: boolean) =>
  typeof value === 'boolean' ? value : fallback;

const sanitizeReadingMode = (value: unknown): AppSettings['readingMode'] =>
  typeof value === 'string' && VALID_READING_MODES.has(value) ? value as AppSettings['readingMode'] : 'Bilingual';

const sanitizeTranslationStyle = (value: unknown): AppSettings['translationStyle'] =>
  typeof value === 'string' && VALID_TRANSLATION_STYLES.has(value)
    ? value as AppSettings['translationStyle']
    : 'Professional Analysis';

export const inferNoteTargetType = (targetId: string): NoteTargetType => {
  if (targetId.startsWith('l')) {
    return 'library_item';
  }

  if (targetId.startsWith('topic_')) {
    return 'topic';
  }

  if (targetId.startsWith(WATCHLIST_ENTITY_PREFIX)) {
    return 'watchlist_item';
  }

  return 'signal';
};

const isLegacyDefaultWatchlist = (itemIds: string[]) => {
  const uniqueIds = uniqueStrings(itemIds);
  if (uniqueIds.length !== LEGACY_DEFAULT_WATCHLIST_IDS.length) {
    return false;
  }

  const normalizedIds = [...uniqueIds].sort();
  const normalizedDefaults = [...LEGACY_DEFAULT_WATCHLIST_IDS].sort();
  return normalizedIds.every((itemId, index) => itemId === normalizedDefaults[index]);
};

const buildTopicPreferenceRecords = (
  values: string[],
  preferenceType: 'followed' | 'muted',
  source: 'legacy_localStorage' | 'user_created',
  timestamp: string,
): TopicPreferenceRecord[] =>
  uniqueStrings(values).flatMap<TopicPreferenceRecord>(value => {
    const canonicalTopic = findCanonicalTopicByValue(value);
    if (canonicalTopic) {
      return [
        {
          topic_id: canonicalTopic.id,
          topic_kind: 'canonical',
          preference_type: preferenceType,
          created_at: timestamp,
          updated_at: timestamp,
        } satisfies TopicPreferenceRecord,
      ];
    }

    return [
      {
        custom_topic_label: value.trim(),
        topic_kind: 'custom',
        preference_type: preferenceType,
        source,
        created_at: timestamp,
        updated_at: timestamp,
      } satisfies TopicPreferenceRecord,
    ];
  });

const sanitizeSavedItems = (value: unknown): SavedItemRecord[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap(item => {
    if (!item || typeof item !== 'object') {
      return [];
    }

    const record = item as Partial<SavedItemRecord>;
    if (
      typeof record.target_id !== 'string' ||
      typeof record.target_type !== 'string' ||
      typeof record.created_at !== 'string' ||
      typeof record.updated_at !== 'string'
    ) {
      return [];
    }

    if (!['signal', 'library_item', 'topic', 'watchlist_item'].includes(record.target_type)) {
      return [];
    }

    return [record as SavedItemRecord];
  });
};

const sanitizeWatchlistItems = (value: unknown): WatchlistItemRecord[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap(item => {
    if (!item || typeof item !== 'object') {
      return [];
    }

    const record = item as Partial<WatchlistItemRecord>;
    if (
      typeof record.entity_id !== 'string' ||
      typeof record.created_at !== 'string' ||
      typeof record.updated_at !== 'string' ||
      typeof record.sort_order !== 'number'
    ) {
      return [];
    }

    return [record as WatchlistItemRecord];
  });
};

const sanitizeNoteRecords = (value: unknown): NoteRecord[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap(item => {
    if (!item || typeof item !== 'object') {
      return [];
    }

    const record = item as Partial<NoteRecord>;
    if (
      typeof record.target_id !== 'string' ||
      typeof record.target_type !== 'string' ||
      typeof record.body !== 'string' ||
      typeof record.created_at !== 'string' ||
      typeof record.updated_at !== 'string'
    ) {
      return [];
    }

    if (!['signal', 'library_item', 'topic', 'watchlist_item'].includes(record.target_type)) {
      return [];
    }

    return [record as NoteRecord];
  });
};

const sanitizeFeedbackRecords = (value: unknown): PersistedUserStateV2['feedback'] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap(item => {
    if (!item || typeof item !== 'object') {
      return [];
    }

    const record = item as Partial<PersistedUserStateV2['feedback'][number]>;
    if (
      typeof record.target_id !== 'string' ||
      typeof record.target_type !== 'string' ||
      typeof record.feedback_type !== 'string' ||
      typeof record.created_at !== 'string' ||
      typeof record.updated_at !== 'string'
    ) {
      return [];
    }

    if (!['signal', 'library_item', 'topic', 'watchlist_item'].includes(record.target_type)) {
      return [];
    }

    if (!['useful', 'not_useful'].includes(record.feedback_type)) {
      return [];
    }

    return [record as PersistedUserStateV2['feedback'][number]];
  });
};

const sanitizeTopicPreferenceRecords = (value: unknown): TopicPreferenceRecord[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap(item => {
    if (!item || typeof item !== 'object') {
      return [];
    }

    const record = item as Partial<TopicPreferenceRecord>;
    if (
      typeof record.preference_type !== 'string' ||
      typeof record.topic_kind !== 'string' ||
      typeof record.created_at !== 'string' ||
      typeof record.updated_at !== 'string'
    ) {
      return [];
    }

    if (!['followed', 'muted'].includes(record.preference_type)) {
      return [];
    }

    if (record.topic_kind === 'canonical' && typeof (record as { topic_id?: unknown }).topic_id === 'string') {
      return [record as TopicPreferenceRecord];
    }

    if (
      record.topic_kind === 'custom' &&
      typeof (record as { custom_topic_label?: unknown }).custom_topic_label === 'string' &&
      (((record as { source?: unknown }).source === 'legacy_localStorage') ||
        ((record as { source?: unknown }).source === 'user_created'))
    ) {
      return [record as TopicPreferenceRecord];
    }

    return [];
  });
};

const sanitizeProfile = (value: unknown): PersistedUserStateV2['profile'] => {
  const timestamp = nowIso();

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return createFreshPersistedStateV2().profile;
  }

  const profile = value as Partial<PersistedUserStateV2['profile']>;
  return {
    onboarding_completed: sanitizeBoolean(profile.onboarding_completed, false),
    reading_mode: sanitizeReadingMode(profile.reading_mode),
    translation_style: sanitizeTranslationStyle(profile.translation_style),
    core_domains: sanitizeCoreDomains(profile.core_domains),
    critical_alerts: sanitizeBoolean(profile.critical_alerts, true),
    dark_mode: sanitizeBoolean(profile.dark_mode, true),
    updated_at: typeof profile.updated_at === 'string' ? profile.updated_at : timestamp,
  };
};

const sanitizePersistedStateV2 = (value: unknown): PersistedUserStateV2 | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const parsed = value as Partial<PersistedUserStateV2>;
  if (parsed.schema_version !== 2) {
    return null;
  }

  return {
    schema_version: 2,
    profile: sanitizeProfile(parsed.profile),
    topic_preferences: sanitizeTopicPreferenceRecords(parsed.topic_preferences),
    saved_items: sanitizeSavedItems(parsed.saved_items),
    watchlist_items: sanitizeWatchlistItems(parsed.watchlist_items),
    notes: sanitizeNoteRecords(parsed.notes),
    feedback: sanitizeFeedbackRecords(parsed.feedback),
  };
};

const migrateLegacySettings = (value: unknown, onboardingCompleted: boolean): PersistedUserStateV2['profile'] => {
  const timestamp = nowIso();

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {
      ...createFreshPersistedStateV2().profile,
      onboarding_completed: onboardingCompleted,
      updated_at: timestamp,
    };
  }

  const settings = value as Partial<AppSettings>;
  return {
    onboarding_completed: onboardingCompleted,
    reading_mode: sanitizeReadingMode(settings.readingMode),
    translation_style: sanitizeTranslationStyle(settings.translationStyle),
    core_domains: sanitizeCoreDomains(settings.preferredTopics),
    critical_alerts: sanitizeBoolean(settings.criticalAlerts, true),
    dark_mode: sanitizeBoolean(settings.darkMode, true),
    updated_at: timestamp,
  };
};

const migrateLegacySavedSignals = (value: unknown, timestamp: string): SavedItemRecord[] =>
  sanitizeTopicLabels(value).map(targetId => ({
    target_type: 'signal',
    target_id: targetId,
    created_at: timestamp,
    updated_at: timestamp,
  }));

const migrateLegacyNotes = (value: unknown, timestamp: string): NoteRecord[] => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return [];
  }

  return Object.entries(value)
    .filter(([targetId, body]) => typeof targetId === 'string' && typeof body === 'string')
    .map(([targetId, body]) => ({
      target_type: inferNoteTargetType(targetId),
      target_id: targetId,
      body,
      created_at: timestamp,
      updated_at: timestamp,
    }));
};

const migrateLegacyWatchlist = (value: unknown, timestamp: string): WatchlistItemRecord[] => {
  const legacyIds = sanitizeTopicLabels(value);
  if (legacyIds.length === 0 || isLegacyDefaultWatchlist(legacyIds)) {
    return [];
  }

  const preservedIds = legacyIds.filter(itemId => itemId.startsWith(WATCHLIST_ENTITY_PREFIX));

  return preservedIds.map((entityId, index) => ({
    entity_id: entityId,
    created_at: timestamp,
    updated_at: timestamp,
    sort_order: index,
  }));
};

const migrateLegacyTopicPreferences = (value: unknown, timestamp: string) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {
      followed: [] as TopicPreferenceRecord[],
      muted: [] as TopicPreferenceRecord[],
    };
  }

  const settings = value as Partial<AppSettings>;
  return {
    followed: buildTopicPreferenceRecords(
      sanitizeTopicLabels(settings.followedTopics),
      'followed',
      'legacy_localStorage',
      timestamp,
    ),
    muted: buildTopicPreferenceRecords(
      sanitizeTopicLabels(settings.mutedTopics),
      'muted',
      'legacy_localStorage',
      timestamp,
    ),
  };
};

const readParsedStorage = (key: string) => safeParseJson(readRawStorageValue(key));

const readLegacyOnboardingComplete = () => {
  const rawValue = readRawStorageValue(STORAGE_KEYS.onboardingComplete);
  if (rawValue === 'true') {
    return true;
  }

  if (rawValue === 'false' || rawValue === null) {
    return false;
  }

  const parsed = safeParseJson(rawValue);
  return typeof parsed === 'boolean' ? parsed : false;
};

export function createFreshPersistedStateV2(): PersistedUserStateV2 {
  const timestamp = nowIso();

  return {
    schema_version: 2,
    profile: {
      onboarding_completed: false,
      reading_mode: 'Bilingual',
      translation_style: 'Professional Analysis',
      core_domains: [...DEFAULT_CORE_DOMAINS],
      critical_alerts: true,
      dark_mode: true,
      updated_at: timestamp,
    },
    topic_preferences: [],
    saved_items: [],
    watchlist_items: [],
    notes: [],
    feedback: [],
  };
}

export function readJsonStorage<T>(key: string, fallback: T): T {
  const parsedValue = readParsedStorage(key);
  return parsedValue === null ? fallback : (parsedValue as T);
}

export function writeJsonStorage(key: string, value: unknown) {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage write failures in the prototype shell.
  }
}

export function readBooleanStorage(key: string, fallback: boolean) {
  const rawValue = readRawStorageValue(key);
  if (rawValue === null) {
    return fallback;
  }

  if (rawValue === 'true') {
    return true;
  }

  if (rawValue === 'false') {
    return false;
  }

  const parsedValue = safeParseJson(rawValue);
  return typeof parsedValue === 'boolean' ? parsedValue : fallback;
}

export function writeBooleanStorage(key: string, value: boolean) {
  writeJsonStorage(key, value);
}

export function removeStorageKey(key: string) {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  try {
    storage.removeItem(key);
  } catch {
    // Ignore storage delete failures in the prototype shell.
  }
}

export function writePersistedStateV2(state: PersistedUserStateV2) {
  writeJsonStorage(STORAGE_KEYS.persistedStateV2, state);
}

export function migrateLegacyStorageToV2(): PersistedUserStateV2 {
  const timestamp = nowIso();

  try {
    const onboardingCompleted = readLegacyOnboardingComplete();
    const legacySettings = readParsedStorage(STORAGE_KEYS.settings);
    const topicPreferences = migrateLegacyTopicPreferences(legacySettings, timestamp);
    const nextState: PersistedUserStateV2 = {
      schema_version: 2,
      profile: migrateLegacySettings(legacySettings, onboardingCompleted),
      topic_preferences: [...topicPreferences.followed, ...topicPreferences.muted],
      saved_items: migrateLegacySavedSignals(readParsedStorage(STORAGE_KEYS.savedSignals), timestamp),
      watchlist_items: migrateLegacyWatchlist(readParsedStorage(STORAGE_KEYS.watchlist), timestamp),
      notes: migrateLegacyNotes(readParsedStorage(STORAGE_KEYS.notes), timestamp),
      feedback: [],
    };

    writePersistedStateV2(nextState);
    return nextState;
  } catch {
    return createFreshPersistedStateV2();
  }
}

export function hydratePersistedStateV2(): PersistedUserStateV2 {
  const parsedV2 = sanitizePersistedStateV2(readParsedStorage(STORAGE_KEYS.persistedStateV2));
  if (parsedV2) {
    return parsedV2;
  }

  return migrateLegacyStorageToV2();
}

export function deriveSavedSignalIds(state: PersistedUserStateV2) {
  return state.saved_items
    .filter(item => item.target_type === 'signal')
    .map(item => item.target_id);
}

export function deriveWatchlistEntityIds(state: PersistedUserStateV2) {
  return [...state.watchlist_items]
    .sort((left, right) => left.sort_order - right.sort_order)
    .map(item => item.entity_id);
}

export function deriveNotesMap(state: PersistedUserStateV2) {
  return Object.fromEntries(state.notes.map(note => [note.target_id, note.body]));
}

export function deriveSettingsFromPersistedState(state: PersistedUserStateV2): AppSettings {
  return {
    readingMode: state.profile.reading_mode,
    translationStyle: state.profile.translation_style,
    preferredTopics: state.profile.core_domains,
    followedTopics: getDisplayTopicsFromPreferenceRecords(state.topic_preferences, 'followed'),
    mutedTopics: getDisplayTopicsFromPreferenceRecords(state.topic_preferences, 'muted'),
    criticalAlerts: state.profile.critical_alerts,
    darkMode: state.profile.dark_mode,
  };
}

export function isOnboardingComplete(state: PersistedUserStateV2) {
  return state.profile.onboarding_completed;
}

export function buildTopicPreferenceRecordsForUserInput(
  values: string[],
  preferenceType: 'followed' | 'muted',
) {
  return buildTopicPreferenceRecords(values, preferenceType, 'user_created', nowIso());
}

export function getCanonicalTopicIdFromDisplayValue(value: string) {
  return findCanonicalTopicByValue(value)?.id ?? null;
}

export function getTopicDisplayValue(record: TopicPreferenceRecord) {
  return record.topic_kind === 'canonical'
    ? getCanonicalTopicName(record.topic_id)
    : record.custom_topic_label;
}
