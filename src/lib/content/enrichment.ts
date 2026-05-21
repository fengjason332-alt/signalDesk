import type {
  ContentLanguage,
  EnrichmentSource,
  EnrichmentStatus,
} from './types';
import {
  CONTENT_LANGUAGES,
  ENRICHMENT_SOURCES,
  ENRICHMENT_STATUSES,
} from './types';

export {
  ENRICHMENT_SOURCES,
  ENRICHMENT_STATUSES,
} from './types';
export type {
  EnrichmentSource,
  EnrichmentStatus,
} from './types';

export interface EnrichmentResolutionInput {
  enrichment_status?: string | null;
  enrichment_version?: number | null;
  enrichment_source?: string | null;
  summary_status?: string | null;
  translation_status?: string | null;
  source_language?: string | null;
  target_languages?: string[] | null;
  enriched_summary_en?: string | null;
  enriched_summary_zh?: string | null;
  enriched_why_it_matters_en?: string[] | null;
  enriched_why_it_matters_zh?: string[] | null;
}

export interface ResolvedEnrichmentState {
  enrichmentStatus: EnrichmentStatus;
  enrichmentVersion: number | null;
  enrichmentSource: EnrichmentSource | null;
  summaryStatus: EnrichmentStatus;
  translationStatus: EnrichmentStatus;
  sourceLanguage: ContentLanguage | null;
  targetLanguages: ContentLanguage[];
  hasEnrichedSummary: boolean;
  hasEnrichedWhyItMatters: boolean;
  usesEnrichedSummary: boolean;
  usesEnrichedWhyItMatters: boolean;
}

const ENRICHMENT_STATUS_SET = new Set<string>(ENRICHMENT_STATUSES);
const ENRICHMENT_SOURCE_SET = new Set<string>(ENRICHMENT_SOURCES);
const CONTENT_LANGUAGE_SET = new Set<string>(CONTENT_LANGUAGES);

const normalizeText = (value: string | null | undefined) => value?.trim() ?? '';

const normalizeStringArray = (values: string[] | null | undefined) =>
  Array.isArray(values)
    ? values
        .map(value => normalizeText(value))
        .filter(Boolean)
    : [];

export const isEnrichmentStatus = (
  value: string | null | undefined,
): value is EnrichmentStatus => ENRICHMENT_STATUS_SET.has(normalizeText(value));

export const normalizeEnrichmentStatus = (
  value: string | null | undefined,
  fallback: EnrichmentStatus = 'not_requested',
): EnrichmentStatus => (isEnrichmentStatus(value) ? value : fallback);

export const isCompletedEnrichmentStatus = (
  status: EnrichmentStatus | null | undefined,
) => status === 'completed';

export const isEnrichmentSource = (
  value: string | null | undefined,
): value is EnrichmentSource => ENRICHMENT_SOURCE_SET.has(normalizeText(value));

export const normalizeEnrichmentSource = (
  value: string | null | undefined,
): EnrichmentSource | null => (isEnrichmentSource(value) ? value : null);

export const isContentLanguage = (
  value: string | null | undefined,
): value is ContentLanguage => CONTENT_LANGUAGE_SET.has(normalizeText(value));

export const shouldUseEnrichedText = (
  status: EnrichmentStatus | null | undefined,
  value: string | null | undefined,
) => isCompletedEnrichmentStatus(status) && normalizeText(value).length > 0;

export const shouldUseEnrichedArray = (
  status: EnrichmentStatus | null | undefined,
  values: string[] | null | undefined,
) =>
  isCompletedEnrichmentStatus(status) &&
  Array.isArray(values) &&
  values.some(value => normalizeText(value).length > 0);

export const getEnrichmentStatusLabel = (
  status: EnrichmentStatus | null | undefined,
) => {
  switch (status) {
    case 'not_requested':
      return 'Not requested';
    case 'pending':
      return 'Pending';
    case 'completed':
      return 'Completed';
    case 'failed':
      return 'Failed';
    case 'skipped':
      return 'Skipped';
    default:
      return 'Unknown';
  }
};

export function resolveEnrichmentState(
  input: EnrichmentResolutionInput,
): ResolvedEnrichmentState {
  const enrichmentStatus = normalizeEnrichmentStatus(input.enrichment_status);
  const summaryStatus = normalizeEnrichmentStatus(input.summary_status);
  const translationStatus = normalizeEnrichmentStatus(input.translation_status);
  const hasEnrichedSummary =
    normalizeText(input.enriched_summary_en).length > 0 ||
    normalizeText(input.enriched_summary_zh).length > 0;
  const hasEnrichedWhyItMatters =
    normalizeStringArray(input.enriched_why_it_matters_en).length > 0 ||
    normalizeStringArray(input.enriched_why_it_matters_zh).length > 0;

  return {
    enrichmentStatus,
    enrichmentVersion:
      typeof input.enrichment_version === 'number' ? input.enrichment_version : null,
    enrichmentSource: normalizeEnrichmentSource(input.enrichment_source),
    summaryStatus,
    translationStatus,
    sourceLanguage: isContentLanguage(input.source_language)
      ? input.source_language
      : null,
    targetLanguages: normalizeStringArray(input.target_languages).filter(
      isContentLanguage,
    ),
    hasEnrichedSummary,
    hasEnrichedWhyItMatters,
    usesEnrichedSummary:
      hasEnrichedSummary &&
      (isCompletedEnrichmentStatus(summaryStatus) ||
        isCompletedEnrichmentStatus(translationStatus) ||
        isCompletedEnrichmentStatus(enrichmentStatus)),
    usesEnrichedWhyItMatters:
      hasEnrichedWhyItMatters &&
      (isCompletedEnrichmentStatus(summaryStatus) ||
        isCompletedEnrichmentStatus(translationStatus) ||
        isCompletedEnrichmentStatus(enrichmentStatus)),
  };
}
