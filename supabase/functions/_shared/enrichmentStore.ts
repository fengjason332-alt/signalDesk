import type {
  CategoryKey,
  ContentLanguage,
  EnrichmentSource,
  EnrichmentStatus,
} from './types.ts';

export const PHASE4_AI_ENRICHMENT_READ_TABLES = [
  'intelligence_signals',
  'signal_source_items',
  'raw_source_items',
  'signal_entities',
  'signal_topics',
  'canonical_topics',
] as const;

export const PHASE4_AI_ENRICHMENT_WRITE_TABLES = [
  'intelligence_signals',
] as const;

export const PHASE4_AI_ENRICHMENT_WRITE_COLUMNS = [
  'enrichment_status',
  'enrichment_version',
  'enrichment_source',
  'summary_status',
  'translation_status',
  'source_language',
  'target_languages',
  'enriched_summary_en',
  'enriched_summary_zh',
  'enriched_why_it_matters_en',
  'enriched_why_it_matters_zh',
  'enrichment_error',
  'last_enriched_at',
] as const;

export interface Phase4AiEnrichmentTopicRow {
  topic_id: string;
  topic_name: string | null;
  relevance_score: number;
}

export interface Phase4AiEnrichmentEntityRow {
  entity_id: string;
  canonical_name: string | null;
  relevance_score: number;
  mention_count: number;
}

export interface Phase4AiEnrichmentSourceRow {
  raw_source_item_id: string;
  source_id: string | null;
  source_name: string | null;
  canonical_url: string | null;
  published_at: string | null;
  title: string | null;
  dek: string | null;
  normalized_text: string | null;
  is_primary: boolean;
}

export interface Phase4AiEnrichmentCandidateRecord {
  signal_id: string;
  lifecycle_stage: 'candidate_preview' | 'candidate' | 'draft';
  generation_status: string | null;
  primary_category: CategoryKey;
  categories: CategoryKey[];
  headline_en: string;
  headline_zh: string | null;
  summary_en: string;
  summary_zh: string | null;
  why_it_matters_en: string[];
  why_it_matters_zh: string[];
  tags: string[];
  primary_source_name: string | null;
  primary_source_item_id: string | null;
  source_item_count: number;
  published_at: string;
  enrichment_status: EnrichmentStatus;
  enrichment_version: number | null;
  enrichment_source: EnrichmentSource | null;
  summary_status: EnrichmentStatus;
  translation_status: EnrichmentStatus;
  source_language: ContentLanguage | null;
  target_languages: ContentLanguage[];
  last_enriched_at: string | null;
  source_rows: Phase4AiEnrichmentSourceRow[];
  topic_rows: Phase4AiEnrichmentTopicRow[];
  entity_rows: Phase4AiEnrichmentEntityRow[];
}

export interface Phase4AiEnrichmentClaimInput {
  signal_id: string;
  target_enrichment_version: number;
  claim_token: string;
  started_at: string;
}

export interface Phase4AiEnrichmentWritePatch {
  enrichment_status: EnrichmentStatus;
  enrichment_version: number;
  enrichment_source: EnrichmentSource;
  summary_status: EnrichmentStatus;
  translation_status: EnrichmentStatus;
  source_language: ContentLanguage | null;
  target_languages: ContentLanguage[];
  enriched_summary_en: string | null;
  enriched_summary_zh: string | null;
  enriched_why_it_matters_en: string[];
  enriched_why_it_matters_zh: string[];
  enrichment_error: string | null;
  last_enriched_at: string;
}

export interface Phase4AiEnrichmentStore {
  listCandidateSignals(signalIds?: string[]): Promise<Phase4AiEnrichmentCandidateRecord[]>;
  claimSignalForEnrichment(input: Phase4AiEnrichmentClaimInput): Promise<boolean>;
  writeEnrichmentResult(
    signalId: string,
    patch: Phase4AiEnrichmentWritePatch,
  ): Promise<void>;
}
