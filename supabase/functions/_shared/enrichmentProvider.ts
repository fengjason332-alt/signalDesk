import type {
  CategoryKey,
  ContentLanguage,
  EnrichmentSource,
  EnrichmentStatus,
} from './types.ts';

export const AI_ENRICHMENT_OPERATION_KINDS = [
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

export interface AiEnrichmentSourceReference {
  raw_source_item_id?: string | null;
  source_name: string;
  source_url?: string | null;
  published_at?: string | null;
  is_primary?: boolean;
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
}

export interface AiEnrichmentOperationResult<TPayload> {
  operation: AiEnrichmentOperationKind;
  status: EnrichmentStatus;
  source: EnrichmentSource;
  payload: TPayload | null;
  error_message: string | null;
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

export interface AiEnrichmentProvider {
  readonly providerName: string;
  readonly providerVersion: string;
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

export const NOOP_ENRICHMENT_PROVIDER_NAME = 'noop_preflight';
export const NOOP_ENRICHMENT_PROVIDER_VERSION = 'phase4_task13_preflight_v1';
export const NOOP_ENRICHMENT_REASON =
  'AI enrichment is not enabled in Task 13-preflight.';

const buildSkippedResult = <TPayload>(
  operation: AiEnrichmentOperationKind,
  payload: TPayload,
): AiEnrichmentOperationResult<TPayload> => ({
  operation,
  status: 'skipped',
  source: 'unknown',
  payload,
  error_message: NOOP_ENRICHMENT_REASON,
});

export function createNoopAiEnrichmentProvider(): AiEnrichmentProvider {
  return {
    providerName: NOOP_ENRICHMENT_PROVIDER_NAME,
    providerVersion: NOOP_ENRICHMENT_PROVIDER_VERSION,
    async summarize() {
      return buildSkippedResult('summarize', {
        summary_en: null,
        summary_zh: null,
      });
    },
    async translate(input) {
      return buildSkippedResult('translate', {
        source_language: input.source_language,
        target_languages: [...input.target_languages],
        summary_en: null,
        summary_zh: null,
        why_it_matters_en: [],
        why_it_matters_zh: [],
      });
    },
    async generateWhyItMatters() {
      return buildSkippedResult('why_it_matters', {
        why_it_matters_en: [],
        why_it_matters_zh: [],
      });
    },
    async detectLanguage(input) {
      return buildSkippedResult('detect_language', {
        source_language: input.source_language,
      });
    },
  };
}
