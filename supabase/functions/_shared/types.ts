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

export const CONTENT_SOURCE_TYPES = ['rss', 'api', 'manual'] as const;
export type ContentSourceType = (typeof CONTENT_SOURCE_TYPES)[number];

export const SOURCE_RELIABILITY_TIERS = [
  'official',
  'tier_1',
  'specialist',
  'aggregator',
] as const;
export type SourceReliabilityTier = (typeof SOURCE_RELIABILITY_TIERS)[number];

export const INGESTION_STATUSES = [
  'queued',
  'fetched',
  'normalized',
  'deduplicated',
  'processed',
  'failed',
] as const;
export type IngestionStatus = (typeof INGESTION_STATUSES)[number];

export const INGESTION_RUN_STATUSES = [
  'running',
  'succeeded',
  'partial',
  'failed',
] as const;
export type IngestionRunStatus = (typeof INGESTION_RUN_STATUSES)[number];

export const PHASE4_BATCH_STATUSES = [
  'succeeded',
  'partial_success',
  'failed',
] as const;
export type Phase4BatchStatus = (typeof PHASE4_BATCH_STATUSES)[number];

export const CONTENT_LANGUAGES = ['en', 'zh', 'mixed', 'unknown'] as const;
export type ContentLanguage = (typeof CONTENT_LANGUAGES)[number];

export const CONTENT_ENTITY_TYPES = [
  'company',
  'organization',
  'person',
  'policy',
  'asset',
  'country',
  'topic',
  'macro_indicator',
] as const;
export type ContentEntityType = (typeof CONTENT_ENTITY_TYPES)[number];

export const SIGNAL_GENERATION_STATUSES = [
  'pending',
  'generated',
  'reviewed',
  'failed',
] as const;
export type SignalGenerationStatus = (typeof SIGNAL_GENERATION_STATUSES)[number];

export const SIGNAL_TRANSLATION_BLOCK_KINDS = [
  'headline',
  'summary',
  'analysis',
  'bullet',
  'quote',
] as const;
export type SignalTranslationBlockKind =
  (typeof SIGNAL_TRANSLATION_BLOCK_KINDS)[number];

export const TRANSLATION_STATUSES = ['pending', 'completed', 'failed'] as const;
export type TranslationStatus = (typeof TRANSLATION_STATUSES)[number];

export const ENRICHMENT_STATUSES = [
  'not_requested',
  'pending',
  'completed',
  'failed',
  'skipped',
] as const;
export type EnrichmentStatus = (typeof ENRICHMENT_STATUSES)[number];

export const ENRICHMENT_SOURCES = [
  'deterministic',
  'manual',
  'unknown',
] as const;
export type EnrichmentSource = (typeof ENRICHMENT_SOURCES)[number];

export const RAW_ITEM_DEDUPE_CONFIDENCES = [
  'exact',
  'high',
  'medium',
  'low',
  'none',
] as const;
export type RawItemDedupeConfidence =
  (typeof RAW_ITEM_DEDUPE_CONFIDENCES)[number];

export type ContentMetadata = Record<string, string | number | boolean | null>;

export interface SourceRegistryEntry {
  id: string;
  name: string;
  url: string;
  source_type: 'rss';
  language: ContentLanguage;
  reliability_tier: SourceReliabilityTier;
  category_key: CategoryKey;
  active: boolean;
  notes: string;
}

export interface ParsedRssFeedItem {
  guid: string | null;
  title: string;
  link: string;
  pubDate: string | null;
  description: string | null;
  contentEncoded: string | null;
  author: string | null;
}

export interface FetchedSourceFeed {
  source: SourceRegistryEntry;
  fetchedAt: string;
  rawXml: string;
  items: ParsedRssFeedItem[];
}

export interface NormalizedFeedItem {
  source_id: string;
  external_id: string | null;
  canonical_url: string;
  title: string;
  dek: string | null;
  author: string | null;
  published_at: string;
  discovered_at: string;
  language: ContentLanguage;
  category_keys: CategoryKey[];
  raw_html: string | null;
  raw_text: string | null;
  normalized_text: string | null;
  metadata: ContentMetadata;
}

export interface RawItemHashes {
  title_hash: string;
  canonical_url_hash: string;
  content_hash: string;
}

export interface ContentSourceRecord {
  id: string;
  name: string;
  source_type: ContentSourceType;
  category_key: CategoryKey;
  publisher: string;
  base_url: string | null;
  feed_url: string | null;
  reliability_tier: SourceReliabilityTier;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ContentIngestionRunRecord {
  id: string;
  source_id: string;
  run_status: IngestionRunStatus;
  started_at: string;
  completed_at: string | null;
  fetched_count: number;
  inserted_count: number;
  skipped_count: number;
  failed_count: number;
  error_summary: string | null;
}

export interface RawSourceItemRecord {
  id: string;
  source_id: string;
  ingestion_run_id: string | null;
  external_id: string | null;
  canonical_url: string;
  title: string;
  dek: string | null;
  author: string | null;
  published_at: string;
  discovered_at: string;
  language: ContentLanguage;
  category_keys: CategoryKey[];
  raw_html: string | null;
  raw_text: string | null;
  normalized_text: string | null;
  content_hash: string;
  title_hash: string;
  canonical_url_hash: string;
  ingestion_status: IngestionStatus;
  metadata: ContentMetadata;
  created_at: string;
  updated_at: string;
}

export interface ContentEntityRecord {
  id: string;
  canonical_name: string;
  entity_type: ContentEntityType;
  aliases: string[];
  ticker: string | null;
  country_code: string | null;
  metadata: ContentMetadata;
  created_at: string;
  updated_at: string;
}

export interface RawSourceItemEntityRecord {
  raw_source_item_id: string;
  entity_id: string;
  match_text: string;
  confidence_score: number;
  created_at: string;
}

export interface SignalScoreRecord {
  importance_score: number;
  urgency_score: number;
  confidence_score: number;
  relevance_score: number;
  source_reliability_score: number;
  overall_score: number;
}

export interface GeneratedSignalRecord {
  id: string;
  primary_category: CategoryKey;
  categories: CategoryKey[];
  headline_en: string;
  headline_zh: string;
  summary_en: string;
  summary_zh: string;
  why_it_matters_en: string[];
  why_it_matters_zh: string[];
  primary_source_name: string;
  primary_source_item_id: string | null;
  source_item_count: number;
  published_at: string;
  generated_at: string;
  generation_status: SignalGenerationStatus;
  enrichment_status?: EnrichmentStatus;
  enrichment_version?: number | null;
  enrichment_source?: EnrichmentSource;
  summary_status?: EnrichmentStatus;
  translation_status?: EnrichmentStatus;
  source_language?: ContentLanguage | null;
  target_languages?: ContentLanguage[] | null;
  enriched_summary_en?: string | null;
  enriched_summary_zh?: string | null;
  enriched_why_it_matters_en?: string[] | null;
  enriched_why_it_matters_zh?: string[] | null;
  enrichment_error?: string | null;
  last_enriched_at?: string | null;
  topic_ids?: string[];
  entity_names?: string[];
  tags?: string[];
  scores: SignalScoreRecord;
  created_at: string;
  updated_at: string;
}

export interface SignalTopicLinkRecord {
  signal_id: string;
  topic_id: string;
  relevance_score: number;
  created_at: string;
}

export interface SignalEntityLinkRecord {
  signal_id: string;
  entity_id: string;
  relevance_score: number;
  mention_count: number;
  created_at: string;
}

export interface SignalTranslationBlockRecord {
  id: string;
  signal_id: string;
  block_order: number;
  block_kind: SignalTranslationBlockKind;
  source_language: ContentLanguage;
  target_language: ContentLanguage;
  original_text: string;
  translated_text: string | null;
  translation_status: TranslationStatus;
  created_at: string;
  updated_at: string;
}

export interface TopicEntityMappingInput {
  title: string;
  dek?: string | null;
  text?: string | null;
  categoryKeys?: readonly CategoryKey[];
}

export interface DeterministicTopicMatch {
  topic_id: string;
  topic_name: string;
  category_key: CategoryKey;
  // Integer-like deterministic confidence aligned with future persistence schemas.
  confidence_score: number;
  evidence_snippets: string[];
}

export interface DeterministicEntityMatch {
  entity_id: string;
  canonical_name: string;
  entity_type: ContentEntityType;
  // Integer-like deterministic confidence aligned with future persistence schemas.
  confidence_score: number;
  evidence_snippets: string[];
  matched_aliases: string[];
}

export interface TopicEntityMappingResult {
  primary_category: CategoryKey | null;
  categories: CategoryKey[];
  topics: DeterministicTopicMatch[];
  entities: DeterministicEntityMatch[];
}

export interface DeterministicScoringSeed {
  seed_version: 'phase4_det_v1';
  source_reliability_score: number;
  recency_score: number;
  entity_importance_score: number;
  topic_relevance_score: number;
  source_count_score: number;
  duplicate_confidence_score: number;
  overall_seed_score: number;
}

export const CANDIDATE_SIGNAL_STATUSES = ['draft', 'candidate'] as const;
export type CandidateSignalStatus = (typeof CANDIDATE_SIGNAL_STATUSES)[number];
export const CANDIDATE_SIGNAL_LIFECYCLE_STAGES = ['candidate_preview'] as const;
export type CandidateSignalLifecycleStage =
  (typeof CANDIDATE_SIGNAL_LIFECYCLE_STAGES)[number];

export interface CandidateSignalEntityMatch extends DeterministicEntityMatch {
  mention_count: number;
  relevance_score: number;
}

export interface CandidateSignalTopicMatch extends DeterministicTopicMatch {
  match_count: number;
  relevance_score: number;
}

export interface CandidateSignalSourceProvenance {
  // Preview-only raw item id from the dry-run pipeline before any persisted
  // raw_source_items UUID boundary exists in Supabase.
  preview_raw_source_item_id: string;
  source_id: string;
  source_name: string;
  ingestion_run_id: string | null;
  published_at: string;
  reliability_tier: SourceReliabilityTier;
}

export interface CandidateSignalRecord {
  candidate_id: string;
  title_seed: string;
  primary_category: CategoryKey;
  categories: CategoryKey[];
  entities: string[];
  topics: string[];
  entity_matches: CandidateSignalEntityMatch[];
  topic_matches: CandidateSignalTopicMatch[];
  source_item_ids: string[];
  source_count: number;
  source_ids: string[];
  source_names: string[];
  source_provenance: CandidateSignalSourceProvenance[];
  primary_preview_raw_source_item_id: string | null;
  primary_source_name: string | null;
  published_at: string;
  // Preview-only candidate status for clustering output, not the same as
  // intelligence_signals.generation_status in persisted signal rows.
  status: CandidateSignalStatus;
  lifecycle_stage: CandidateSignalLifecycleStage;
  scoring_seed: DeterministicScoringSeed;
}

export interface Phase4DryRunRequest {
  dryRun?: boolean;
  liveFetch?: boolean;
  sourceIds?: string[];
  discoveredAt?: string;
  now?: string;
  maxItemsPerSource?: number;
}

export interface Phase4IngestionRunSummary {
  run_id: string;
  source_id: string;
  status: IngestionRunStatus;
  started_at: string;
  completed_at: string | null;
  items_fetched: number;
  items_inserted: number;
  items_skipped_as_duplicates: number;
  items_failed: number;
  error_message: string | null;
}

export interface Phase4SourcePreview {
  source_id: string;
  source_name: string;
  status: IngestionRunStatus;
  fetched_count: number;
  normalized_count: number;
  inserted_count: number;
  skipped_count: number;
  failed_count: number;
  run_id: string | null;
  run_status: IngestionRunStatus | null;
  error_message: string | null;
}

export interface Phase4WriteStep {
  step: string;
  enabled: boolean;
}

export interface Phase4IngestionSummary {
  overall_status: Phase4BatchStatus;
  source_count: number;
  candidate_signal_count: number;
  raw_item_count: number;
  raw_inserted_count: number;
  raw_skipped_count: number;
  raw_failed_count: number;
  signal_inserted_count: number;
  signal_skipped_count: number;
  signal_failed_count: number;
  write_mode_enabled: boolean;
}

export interface Phase4IngestionResult {
  dry_run: boolean;
  writes_disabled: boolean;
  overall_status: Phase4BatchStatus;
  selected_source_ids: string[];
  fetched_item_count: number;
  normalized_item_count: number;
  raw_item_count: number;
  inserted_item_count: number;
  skipped_duplicate_count: number;
  failed_item_count: number;
  dedupe_relationships: Array<{
    left_id: string;
    right_id: string;
    confidence: RawItemDedupeConfidence;
  }>;
  candidate_signals: CandidateSignalRecord[];
  source_previews: Phase4SourcePreview[];
  ingestion_runs: Phase4IngestionRunSummary[];
  write_steps: Phase4WriteStep[];
  summary: Phase4IngestionSummary;
}

export type Phase4DryRunPreview = Phase4IngestionResult & {
  dry_run: true;
  writes_disabled: true;
};
