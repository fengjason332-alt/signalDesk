export type CategoryKey =
  | 'ai'
  | 'crypto'
  | 'stocks'
  | 'robotics'
  | 'energy'
  | 'us_policy'
  | 'china_policy'
  | 'australia_policy'
  | 'macro'
  | 'geopolitics';

export type Category = CategoryKey;

export const CATEGORY_LABELS: Record<CategoryKey, string> = {
  ai: 'AI',
  crypto: 'Crypto',
  stocks: 'Stocks',
  robotics: 'Robotics',
  energy: 'Energy',
  us_policy: 'US Policy',
  china_policy: 'China Policy',
  australia_policy: 'Australia Policy',
  macro: 'Macro',
  geopolitics: 'Geopolitics',
};

export const CATEGORY_KEYS: CategoryKey[] = [
  'ai',
  'crypto',
  'stocks',
  'robotics',
  'energy',
  'us_policy',
  'china_policy',
  'australia_policy',
  'macro',
  'geopolitics',
];

export function getCategoryLabel(category: CategoryKey) {
  return CATEGORY_LABELS[category];
}

export type ReadingMode = 'Chinese Only' | 'Bilingual' | 'Original';
export type TranslationStyle = 'Professional Analysis' | 'Simple Chinese' | 'Accurate Translation' | 'Student-Friendly Explanation';

export interface SignalProvenanceSource {
  rawSourceItemId?: string;
  sourceId?: string;
  sourceName: string;
  sourceUrl?: string;
  publishedAt?: string;
  isPrimary?: boolean;
}

export interface RealContentPreviewMeta {
  previewKind: 'real_content';
  lifecycleStage?: 'candidate_preview' | 'candidate' | 'draft';
  generationStatus?: string | null;
  primarySourceItemId?: string | null;
  sourceItemCount?: number;
  provenanceSources: SignalProvenanceSource[];
}

export interface AppSettings {
  readingMode: ReadingMode;
  translationStyle: TranslationStyle;
  preferredTopics: CategoryKey[]; // These are core domains
  followedTopics: string[];    // These are specific interests
  mutedTopics: string[];       // These are hidden topics
  criticalAlerts: boolean;
  darkMode: boolean;
}

export interface Signal {
  id: string;
  category?: CategoryKey; // Legacy, optional
  categories: CategoryKey[];
  topics: string[];
  entities: string[];
  titleZh: string;
  titleEn: string;
  summaryZh: string;
  whyItMatters: string[];
  importance: number;
  source: string;
  timestamp: string;
  tags: string[];
  isSaved?: boolean;
  content?: {
    en: string;
    zh: string;
  }[];
  glossary?: {
    term: string;
    definition: string;
  }[];
  realContentPreview?: RealContentPreviewMeta;
}

export interface Topic {
  id: string;
  category: CategoryKey;
  name: string;
  momentum: number;
  explanationZh: string;
  tags: string[];
  signalCount: number;
}

export interface WatchlistItem {
  id: string;
  name: string;
  type: 'Company' | 'Organization' | 'Stock' | 'Crypto' | 'Topic' | 'Policy' | 'Person' | 'Macro Indicator';
  status: string;
  importantUpdates: number;
  totalMentions: number;
  value?: string;
  valueTrend?: 'up' | 'down';
  description?: string;
  signals?: Signal[];
}

export interface LibraryItem {
  id: string;
  source: string;
  date: string;
  title: string;
  summaryZh: string;
  whyItMatters: string;
  tags: string[];
  notePreview?: string;
  category: string;
}

export type TopicPreferenceType = 'followed' | 'muted';
export type TopicKind = 'canonical' | 'custom';
export type SavedItemTargetType = 'signal' | 'library_item' | 'topic' | 'watchlist_item';
export type NoteTargetType = SavedItemTargetType;
export type FeedbackType = 'useful' | 'not_useful';

export interface UserProfileState {
  onboarding_completed: boolean;
  reading_mode: ReadingMode;
  translation_style: TranslationStyle;
  core_domains: CategoryKey[];
  critical_alerts: boolean;
  dark_mode: boolean;
  updated_at: string;
}

interface BaseTopicPreferenceRecord {
  preference_type: TopicPreferenceType;
  topic_kind: TopicKind;
  created_at: string;
  updated_at: string;
}

export interface CanonicalTopicPreferenceRecord extends BaseTopicPreferenceRecord {
  topic_kind: 'canonical';
  topic_id: string;
}

export interface CustomTopicPreferenceRecord extends BaseTopicPreferenceRecord {
  topic_kind: 'custom';
  custom_topic_label: string;
  source: 'legacy_localStorage' | 'user_created';
}

export type TopicPreferenceRecord =
  | CanonicalTopicPreferenceRecord
  | CustomTopicPreferenceRecord;

export interface SavedItemRecord {
  target_type: SavedItemTargetType;
  target_id: string;
  created_at: string;
  updated_at: string;
}

export interface WatchlistItemRecord {
  entity_id: string;
  created_at: string;
  updated_at: string;
  sort_order: number;
}

export interface NoteRecord {
  target_type: NoteTargetType;
  target_id: string;
  body: string;
  created_at: string;
  updated_at: string;
}

export interface FeedbackRecord {
  target_type: SavedItemTargetType;
  target_id: string;
  feedback_type: FeedbackType;
  created_at: string;
  updated_at: string;
}

export interface PersistedUserStateV2 {
  schema_version: 2;
  profile: UserProfileState;
  topic_preferences: TopicPreferenceRecord[];
  saved_items: SavedItemRecord[];
  watchlist_items: WatchlistItemRecord[];
  notes: NoteRecord[];
  feedback: FeedbackRecord[];
}
