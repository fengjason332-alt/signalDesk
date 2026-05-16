import type { CategoryKey } from '../../types';

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
