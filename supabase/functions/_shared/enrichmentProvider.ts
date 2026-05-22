import type {
  ContentLanguage,
  EnrichmentStatus,
  CategoryKey,
} from './types.ts';

export const AI_ENRICHMENT_OPERATION_KINDS = [
  'enrich',
  'summarize',
  'translate',
  'why_it_matters',
  'detect_language',
] as const;
export type AiEnrichmentOperationKind =
  (typeof AI_ENRICHMENT_OPERATION_KINDS)[number];

export const AI_ENRICHMENT_TARGET_LANGUAGES = ['en', 'zh'] as const;
export type AiEnrichmentTargetLanguage =
  (typeof AI_ENRICHMENT_TARGET_LANGUAGES)[number];

export const AI_ENRICHMENT_PROVIDER_NAMES = ['noop', 'deepseek'] as const;
export type AiEnrichmentProviderName =
  (typeof AI_ENRICHMENT_PROVIDER_NAMES)[number];

export interface AiEnrichmentSourceReference {
  raw_source_item_id?: string | null;
  source_name: string;
  source_url?: string | null;
  published_at?: string | null;
  is_primary?: boolean;
}

export interface AiEnrichmentSourceDocument extends AiEnrichmentSourceReference {
  title: string | null;
  dek: string | null;
  normalized_text: string | null;
}

export interface AiEnrichmentSignalInput {
  signal_id: string;
  primary_category: CategoryKey;
  categories: CategoryKey[];
  headline_en: string;
  headline_zh: string | null;
  summary_en: string;
  summary_zh: string | null;
  why_it_matters_en: string[];
  why_it_matters_zh: string[];
  tags: string[];
  source_language: ContentLanguage | null;
  target_languages: AiEnrichmentTargetLanguage[];
  source_item_count: number;
  published_at: string;
  provenance_sources: AiEnrichmentSourceReference[];
  source_documents: AiEnrichmentSourceDocument[];
  topics: string[];
  entities: string[];
}

export interface AiEnrichmentTokenUsage {
  prompt_tokens: number | null;
  completion_tokens: number | null;
  total_tokens: number | null;
  approximate_prompt_tokens: number;
  approximate_completion_tokens: number | null;
  approximate_total_tokens: number | null;
}

export type AiEnrichmentResultSource =
  | AiEnrichmentProviderName
  | 'provider_not_configured'
  | 'unknown';

export interface AiEnrichmentOperationResult<TPayload> {
  operation: AiEnrichmentOperationKind;
  status: EnrichmentStatus;
  source: AiEnrichmentResultSource;
  payload: TPayload | null;
  error_message: string | null;
  token_usage: AiEnrichmentTokenUsage | null;
}

export interface AiSummaryPayload {
  summary_en: string | null;
  summary_zh: string | null;
}

export interface AiWhyItMattersPayload {
  why_it_matters_en: string[];
  why_it_matters_zh: string[];
}

export interface AiTranslationPayload {
  source_language: ContentLanguage | null;
  target_languages: AiEnrichmentTargetLanguage[];
  summary_en: string | null;
  summary_zh: string | null;
  why_it_matters_en: string[];
  why_it_matters_zh: string[];
}

export interface AiLanguageDetectionPayload {
  source_language: ContentLanguage | null;
}

export interface AiCombinedEnrichmentPayload {
  enriched_summary_en: string | null;
  enriched_summary_zh: string | null;
  enriched_why_it_matters_en: string[];
  enriched_why_it_matters_zh: string[];
  source_language: ContentLanguage | null;
  target_languages: AiEnrichmentTargetLanguage[];
  confidence_notes: string | null;
}

export interface AiEnrichmentProvider {
  readonly providerName: AiEnrichmentProviderName;
  readonly providerVersion: string;
  readonly modelName: string | null;
  enrich(
    input: AiEnrichmentSignalInput,
  ): Promise<AiEnrichmentOperationResult<AiCombinedEnrichmentPayload>>;
  summarize(
    input: AiEnrichmentSignalInput,
  ): Promise<AiEnrichmentOperationResult<AiSummaryPayload>>;
  translate(
    input: AiEnrichmentSignalInput,
  ): Promise<AiEnrichmentOperationResult<AiTranslationPayload>>;
  generateWhyItMatters(
    input: AiEnrichmentSignalInput,
  ): Promise<AiEnrichmentOperationResult<AiWhyItMattersPayload>>;
  detectLanguage(
    input: AiEnrichmentSignalInput,
  ): Promise<AiEnrichmentOperationResult<AiLanguageDetectionPayload>>;
}

export const NOOP_ENRICHMENT_PROVIDER_NAME = 'noop';
export const NOOP_ENRICHMENT_PROVIDER_VERSION = 'phase4_task13_preflight_v1';
export const NOOP_ENRICHMENT_REASON =
  'AI enrichment is not enabled in Task 13-preflight.';

const buildSkippedResult = <TPayload>(
  operation: AiEnrichmentOperationKind,
  source: AiEnrichmentResultSource,
  payload: TPayload,
): AiEnrichmentOperationResult<TPayload> => ({
  operation,
  status: 'skipped',
  source,
  payload,
  error_message: NOOP_ENRICHMENT_REASON,
  token_usage: null,
});

export function createNoopAiEnrichmentProvider(): AiEnrichmentProvider {
  return {
    providerName: NOOP_ENRICHMENT_PROVIDER_NAME,
    providerVersion: NOOP_ENRICHMENT_PROVIDER_VERSION,
    modelName: null,
    async enrich(input) {
      return buildSkippedResult('enrich', 'noop', {
        enriched_summary_en: null,
        enriched_summary_zh: null,
        enriched_why_it_matters_en: [],
        enriched_why_it_matters_zh: [],
        source_language: input.source_language,
        target_languages: [...input.target_languages],
        confidence_notes: null,
      });
    },
    async summarize() {
      return buildSkippedResult('summarize', 'noop', {
        summary_en: null,
        summary_zh: null,
      });
    },
    async translate(input) {
      return buildSkippedResult('translate', 'noop', {
        source_language: input.source_language,
        target_languages: [...input.target_languages],
        summary_en: null,
        summary_zh: null,
        why_it_matters_en: [],
        why_it_matters_zh: [],
      });
    },
    async generateWhyItMatters() {
      return buildSkippedResult('why_it_matters', 'noop', {
        why_it_matters_en: [],
        why_it_matters_zh: [],
      });
    },
    async detectLanguage(input) {
      return buildSkippedResult('detect_language', 'noop', {
        source_language: input.source_language,
      });
    },
  };
}
