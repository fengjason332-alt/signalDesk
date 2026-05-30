import type { CategoryKey, Signal, SignalProvenanceSource } from '../../types';
import { CATEGORY_KEYS } from '../../types';
import {
  resolveEnrichmentState,
  type EnrichmentStatus,
  type EnrichmentSource,
} from './enrichment';
import type { ContentLanguage } from './types';

const REAL_CONTENT_FEED_LIMIT = 24;
const DEFAULT_WHY_IT_MATTERS = 'Why this matters is still being prepared.';
const DEFAULT_SIGNAL_TITLE = 'Untitled signal';
const DEFAULT_SIGNAL_SUMMARY = 'Summary unavailable.';
const DEFAULT_SIGNAL_SOURCE = 'Unknown source';
const DEFAULT_SIGNAL_TIMESTAMP = 'Unknown publish time';
const PREVIEW_ELIGIBLE_LIFECYCLE_STAGES = new Set([
  'candidate_preview',
  'candidate',
  'draft',
]);
const OPTIONAL_ENRICHMENT_PREVIEW_COLUMNS = [
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
  'last_enriched_at',
] as const;

export const REAL_CONTENT_FEED_FALLBACK_MESSAGE =
  'Prototype: real content preview is unavailable here, showing the mock feed.';
export const REAL_CONTENT_FEED_EMPTY_MESSAGE =
  'Real-content preview is enabled, but no preview-safe signals were found yet.';
export const REAL_CONTENT_FILTER_EMPTY_MESSAGE =
  'No real-content signals found matching your current filters yet.';

type SupabaseErrorLike = {
  message?: string;
  code?: string | null;
};

export interface RealContentFeedTopicRow {
  relevance_score?: number | null;
  topic_id?: string | null;
  canonical_topic?: {
    id: string;
    name: string | null;
  } | Array<{
    id: string;
    name: string | null;
  }> | null;
}

export interface RealContentFeedEntityRow {
  relevance_score?: number | null;
  entity_id: string;
  content_entity?: {
    canonical_name?: string | null;
  } | Array<{
    canonical_name?: string | null;
  }> | null;
}

export interface RealContentFeedSourceItemRow {
  is_primary?: boolean | null;
  raw_source_item?: {
    id?: string | null;
    source_id?: string | null;
    title?: string | null;
    dek?: string | null;
    canonical_url?: string | null;
    published_at?: string | null;
    created_at?: string | null;
    normalized_text?: string | null;
    metadata?: Record<string, unknown> | null;
  } | null;
}

export interface RealContentSignalRow {
  id: string;
  primary_category: CategoryKey;
  categories: string[] | null;
  headline_en: string | null;
  headline_zh: string | null;
  summary_en: string | null;
  summary_zh: string | null;
  why_it_matters_en: string[] | null;
  why_it_matters_zh: string[] | null;
  primary_source_name: string | null;
  published_at: string | null;
  created_at?: string | null;
  lifecycle_stage?: 'candidate_preview' | 'candidate' | 'draft' | string | null;
  generation_status?: string | null;
  primary_source_item_id?: string | null;
  source_item_count?: number | null;
  overall_score: number | null;
  tags?: string[] | null;
  enrichment_status?: EnrichmentStatus | string | null;
  enrichment_version?: number | null;
  enrichment_source?: EnrichmentSource | string | null;
  summary_status?: EnrichmentStatus | string | null;
  translation_status?: EnrichmentStatus | string | null;
  source_language?: ContentLanguage | string | null;
  target_languages?: Array<ContentLanguage | string> | null;
  enriched_summary_en?: string | null;
  enriched_summary_zh?: string | null;
  enriched_why_it_matters_en?: string[] | null;
  enriched_why_it_matters_zh?: string[] | null;
  last_enriched_at?: string | null;
  signal_topics?: RealContentFeedTopicRow[] | null;
  signal_entities?: RealContentFeedEntityRow[] | null;
  signal_source_items?: RealContentFeedSourceItemRow[] | null;
}

interface RealContentFeedQueryResult {
  data: unknown[] | null;
  error: SupabaseErrorLike | null;
}

interface RealContentFeedQueryBuilder {
  in: (column: string, values: readonly string[]) => RealContentFeedQueryBuilder;
  or: (filter: string) => RealContentFeedQueryBuilder;
  order: (
    column: string,
    options: { ascending: boolean },
  ) => RealContentFeedQueryBuilder;
  limit: (value: number) => PromiseLike<RealContentFeedQueryResult>;
}

export interface RealContentFeedLoaderClient {
  from: (relation: string) => {
    select: (columns: string) => RealContentFeedQueryBuilder;
  };
}

export interface LoadTodaySignalsResult {
  signals: Signal[];
  source: 'mock' | 'real';
  feedMode: 'mock' | 'real' | 'fallback_to_mock' | 'real_empty';
  feedReason:
    | 'env_disabled'
    | 'rollback_to_mock'
    | 'real_loaded'
    | 'real_zero_rows'
    | 'fallback_no_client'
    | 'fallback_read_failed'
    | 'fallback_all_rows_failed_mapping';
  usedFallback: boolean;
  errorMessage: string | null;
  isEmpty: boolean;
}

export interface TodayFeedViewState {
  viewState: 'cards' | 'real_empty' | 'filter_empty' | 'empty';
  message: string;
  filterExcludedAllSignals: boolean;
  feedReason: LoadTodaySignalsResult['feedReason'];
}

export type TodayRealFeedRolloutMode =
  | 'mock_by_default'
  | 'real_by_env'
  | 'real_by_default_candidate'
  | 'rollback_to_mock';

interface PreviewReadDiagnostics {
  rowsFetched: number;
  mappedCards: number;
  filteredCount: number;
  skippedRows: number;
  fallbackReason: string | null;
}

const LEGACY_REAL_CONTENT_SELECT = `
  id,
  primary_category,
  categories,
  headline_en,
  headline_zh,
  summary_en,
  summary_zh,
  why_it_matters_en,
  why_it_matters_zh,
  primary_source_name,
  published_at,
  created_at,
  lifecycle_stage,
  generation_status,
  primary_source_item_id,
  source_item_count,
  overall_score,
  tags,
  signal_topics (
    relevance_score,
    topic_id,
    canonical_topic:canonical_topics (
      id,
      name
    )
  ),
  signal_entities (
    relevance_score,
    entity_id,
    content_entity:content_entities (
      canonical_name
    )
  ),
  signal_source_items (
    is_primary,
    raw_source_item:raw_source_items (
      id,
      source_id,
      title,
      dek,
      canonical_url,
      published_at,
      created_at,
      normalized_text,
      metadata
    )
  )
`;

const ENRICHED_REAL_CONTENT_SELECT = `
  id,
  primary_category,
  categories,
  headline_en,
  headline_zh,
  summary_en,
  summary_zh,
  why_it_matters_en,
  why_it_matters_zh,
  primary_source_name,
  published_at,
  created_at,
  lifecycle_stage,
  generation_status,
  primary_source_item_id,
  source_item_count,
  overall_score,
  tags,
  enrichment_status,
  enrichment_version,
  enrichment_source,
  summary_status,
  translation_status,
  source_language,
  target_languages,
  enriched_summary_en,
  enriched_summary_zh,
  enriched_why_it_matters_en,
  enriched_why_it_matters_zh,
  last_enriched_at,
  signal_topics (
    relevance_score,
    topic_id,
    canonical_topic:canonical_topics (
      id,
      name
    )
  ),
  signal_entities (
    relevance_score,
    entity_id,
    content_entity:content_entities (
      canonical_name
    )
  ),
  signal_source_items (
    is_primary,
    raw_source_item:raw_source_items (
      id,
      source_id,
      title,
      dek,
      canonical_url,
      published_at,
      created_at,
      normalized_text,
      metadata
    )
  )
`;

const CATEGORY_KEY_SET = new Set<CategoryKey>(CATEGORY_KEYS);

const normalizeText = (value: string | null | undefined) => value?.trim() ?? '';

const uniqueStrings = (values: Array<string | null | undefined>) => {
  const seen = new Set<string>();
  const normalizedValues: string[] = [];

  for (const value of values) {
    const trimmedValue = normalizeText(value);
    const normalizedKey = trimmedValue.toLowerCase();
    if (!trimmedValue || seen.has(normalizedKey)) {
      continue;
    }

    seen.add(normalizedKey);
    normalizedValues.push(trimmedValue);
  }

  return normalizedValues;
};

const isCategoryKey = (value: string): value is CategoryKey =>
  CATEGORY_KEY_SET.has(value as CategoryKey);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const sortByRelevanceDescending = <T extends { relevance_score?: number | null }>(
  values: T[] | null | undefined,
) =>
  [...(values ?? [])].sort(
    (left, right) => (right.relevance_score ?? 0) - (left.relevance_score ?? 0),
  );

const coerceCategoryKeys = (
  primaryCategory: CategoryKey,
  categories: string[] | null | undefined,
) => {
  const normalizedCategories = uniqueStrings([
    primaryCategory,
    ...(Array.isArray(categories) ? categories : []),
  ]);

  return normalizedCategories.filter(isCategoryKey);
};

const resolvePrimaryCategory = (row: RealContentSignalRow): CategoryKey | null => {
  if (isCategoryKey(normalizeText(row.primary_category))) {
    return normalizeText(row.primary_category) as CategoryKey;
  }

  const fallbackCategory = uniqueStrings(Array.isArray(row.categories) ? row.categories : [])
    .map(category => normalizeText(category))
    .find(isCategoryKey);

  return fallbackCategory ?? null;
};

const clampImportance = (overallScore: number | null | undefined) => {
  const numericScore = Number.isFinite(overallScore) ? Number(overallScore) : 0;
  const boundedScore = Math.max(0, Math.min(100, numericScore));
  return Number((boundedScore / 10).toFixed(1));
};

const getPrimarySourceItem = (row: RealContentSignalRow) => {
  const primarySourceItemId = normalizeText(row.primary_source_item_id);
  if (primarySourceItemId) {
    const matchedPrimarySourceItem = (row.signal_source_items ?? []).find(
      sourceItem =>
        normalizeText(sourceItem.raw_source_item?.id) === primarySourceItemId,
    );
    if (matchedPrimarySourceItem) {
      return matchedPrimarySourceItem;
    }
  }

  return (
    (row.signal_source_items ?? []).find(sourceItem => sourceItem.is_primary) ??
    (row.signal_source_items ?? [])[0] ??
    null
  );
};

const getSortTimestamp = (value: string | null | undefined) => {
  const normalizedValue = normalizeText(value);
  if (!normalizedValue) {
    return Number.NEGATIVE_INFINITY;
  }

  const parsedTime = new Date(normalizedValue).getTime();
  return Number.isNaN(parsedTime) ? Number.NEGATIVE_INFINITY : parsedTime;
};

const getSortScore = (value: number | null | undefined) =>
  Number.isFinite(value) ? Number(value) : Number.NEGATIVE_INFINITY;

const compareNumberDescending = (left: number, right: number) => {
  if (left === right) {
    return 0;
  }

  return left > right ? -1 : 1;
};

const compareRealContentRows = (
  left: RealContentSignalRow,
  right: RealContentSignalRow,
) => {
  const scoreDelta = compareNumberDescending(
    getSortScore(left.overall_score),
    getSortScore(right.overall_score),
  );
  if (scoreDelta !== 0) {
    return scoreDelta;
  }

  const publishedAtDelta = compareNumberDescending(
    getSortTimestamp(left.published_at),
    getSortTimestamp(right.published_at),
  );
  if (publishedAtDelta !== 0) {
    return publishedAtDelta;
  }

  const createdAtDelta = compareNumberDescending(
    getSortTimestamp(left.created_at),
    getSortTimestamp(right.created_at),
  );
  if (createdAtDelta !== 0) {
    return createdAtDelta;
  }

  return normalizeText(left.id).localeCompare(normalizeText(right.id));
};

const isPrimarySourceItem = (
  row: RealContentSignalRow,
  sourceItem: RealContentFeedSourceItemRow,
) => {
  const primarySourceItemId = normalizeText(row.primary_source_item_id);
  const rawSourceItemId = normalizeText(sourceItem.raw_source_item?.id);

  if (primarySourceItemId && rawSourceItemId) {
    return rawSourceItemId === primarySourceItemId;
  }

  return Boolean(sourceItem.is_primary);
};

const getJoinedSingle = <T>(value: T | T[] | null | undefined): T | null => {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
};

const getSourceNameFromMetadata = (
  metadata: Record<string, unknown> | null | undefined,
) => {
  for (const key of ['source_name', 'publisher', 'publication_name']) {
    const sourceName = metadata?.[key];
    if (typeof sourceName === 'string' && sourceName.trim()) {
      return sourceName.trim();
    }
  }

  return '';
};

const getStringFromMetadata = (
  metadata: Record<string, unknown> | null | undefined,
  keys: string[],
) => {
  for (const key of keys) {
    const value = metadata?.[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return '';
};

const buildNormalizedTextSummary = (value: string | null | undefined) => {
  const normalizedValue = normalizeText(value);
  if (!normalizedValue) {
    return '';
  }

  const firstSentence = normalizedValue.match(/^(.{1,220}?[.!?])(?:\s|$)/)?.[1];
  if (firstSentence) {
    return firstSentence.trim();
  }

  if (normalizedValue.length <= 220) {
    return normalizedValue;
  }

  return `${normalizedValue.slice(0, 217).trimEnd()}...`;
};

const getHostFromUrl = (url: string | null | undefined) => {
  const normalizedUrl = normalizeText(url);
  if (!normalizedUrl) {
    return '';
  }

  try {
    return new URL(normalizedUrl).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
};

const getSafeHttpUrl = (url: string | null | undefined) => {
  const normalizedUrl = normalizeText(url);
  if (!normalizedUrl) {
    return '';
  }

  try {
    const parsedUrl = new URL(normalizedUrl);
    if (parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:') {
      return parsedUrl.toString();
    }
  } catch {
    return '';
  }

  return '';
};

const getProvenanceSourceName = (
  row: RealContentSignalRow,
  sourceItem: RealContentFeedSourceItemRow,
) => {
  const metadataSourceName = getSourceNameFromMetadata(
    sourceItem.raw_source_item?.metadata,
  );
  const sourceId = normalizeText(sourceItem.raw_source_item?.source_id);
  const primarySourceName =
    isPrimarySourceItem(row, sourceItem) ? normalizeText(row.primary_source_name) : '';

  return metadataSourceName || primarySourceName || sourceId;
};

const getProvenanceSourceUrl = (sourceItem: RealContentFeedSourceItemRow) =>
  getSafeHttpUrl(sourceItem.raw_source_item?.canonical_url) ||
  getSafeHttpUrl(
    getStringFromMetadata(sourceItem.raw_source_item?.metadata, [
      'source_url',
      'url',
      'canonical_url',
    ]),
  );

const getProvenancePublishedAt = (sourceItem: RealContentFeedSourceItemRow) =>
  normalizeText(sourceItem.raw_source_item?.published_at) ||
  getStringFromMetadata(sourceItem.raw_source_item?.metadata, ['published_at']);

const toProvenanceSource = (
  row: RealContentSignalRow,
  sourceItem: RealContentFeedSourceItemRow,
): SignalProvenanceSource | null => {
  const sourceName = getProvenanceSourceName(row, sourceItem);
  const sourceUrl = getProvenanceSourceUrl(sourceItem);
  const sourceId = normalizeText(sourceItem.raw_source_item?.source_id) || undefined;
  const rawSourceItemId =
    normalizeText(sourceItem.raw_source_item?.id) || undefined;
  const publishedAt = getProvenancePublishedAt(sourceItem) || undefined;

  if (!sourceName && !sourceUrl && !sourceId && !rawSourceItemId) {
    return null;
  }

  return {
    sourceName: sourceName || sourceUrl || sourceId || rawSourceItemId!,
    isPrimary: isPrimarySourceItem(row, sourceItem),
    ...(rawSourceItemId ? { rawSourceItemId } : {}),
    ...(sourceId ? { sourceId } : {}),
    ...(sourceUrl ? { sourceUrl } : {}),
    ...(publishedAt ? { publishedAt } : {}),
  };
};

const buildPreviewProvenanceSources = (row: RealContentSignalRow) => {
  const seen = new Set<string>();
  const provenanceSources: SignalProvenanceSource[] = [];

  for (const sourceItem of row.signal_source_items ?? []) {
    const provenanceSource = toProvenanceSource(row, sourceItem);
    if (!provenanceSource) {
      continue;
    }

    const dedupeKey = [
      provenanceSource.rawSourceItemId,
      provenanceSource.sourceId,
      provenanceSource.sourceUrl,
      provenanceSource.sourceName,
    ]
      .filter(Boolean)
      .join('::')
      .toLowerCase();

    if (!dedupeKey || seen.has(dedupeKey)) {
      continue;
    }

    seen.add(dedupeKey);
    provenanceSources.push(provenanceSource);
  }

  if (provenanceSources.length === 0) {
    const primarySourceName = normalizeText(row.primary_source_name);
    if (primarySourceName) {
      provenanceSources.push({
        sourceName: primarySourceName,
        isPrimary: true,
      });
    }
  }

  return provenanceSources.sort((left, right) => {
    if (Boolean(left.isPrimary) !== Boolean(right.isPrimary)) {
      return left.isPrimary ? -1 : 1;
    }

    const publishedAtDelta = compareNumberDescending(
      getSortTimestamp(left.publishedAt),
      getSortTimestamp(right.publishedAt),
    );
    if (publishedAtDelta !== 0) {
      return publishedAtDelta;
    }

    const leftStableKey = [
      left.sourceName,
      left.sourceId,
      left.rawSourceItemId,
      left.sourceUrl,
    ]
      .filter(Boolean)
      .join('::');
    const rightStableKey = [
      right.sourceName,
      right.sourceId,
      right.rawSourceItemId,
      right.sourceUrl,
    ]
      .filter(Boolean)
      .join('::');

    return leftStableKey.localeCompare(rightStableKey);
  });
};

const isPreviewEligibleRow = (row: RealContentSignalRow) => {
  const lifecycleStage = normalizeText(row.lifecycle_stage);
  const generationStatus = normalizeText(row.generation_status);

  if (
    lifecycleStage &&
    !PREVIEW_ELIGIBLE_LIFECYCLE_STAGES.has(lifecycleStage)
  ) {
    return false;
  }

  return generationStatus !== 'failed';
};

const coerceTopics = (row: RealContentSignalRow) =>
  uniqueStrings(
    sortByRelevanceDescending(row.signal_topics).map(
      topicRow =>
        getJoinedSingle(topicRow.canonical_topic)?.name ?? topicRow.topic_id,
    ),
  );

const coerceEntities = (row: RealContentSignalRow) =>
  uniqueStrings(
    sortByRelevanceDescending(row.signal_entities).map(
      entityRow =>
        getJoinedSingle(entityRow.content_entity)?.canonical_name ??
        entityRow.entity_id,
    ),
  );

const coerceTags = (row: RealContentSignalRow, topics: string[], entities: string[]) =>
  uniqueStrings([...(row.tags ?? []), ...topics, ...entities]);

const coerceSource = (
  row: RealContentSignalRow,
  primarySourceItem: RealContentFeedSourceItemRow | null,
) => {
  const primarySourceName = normalizeText(row.primary_source_name);
  if (primarySourceName) {
    return primarySourceName;
  }

  const metadataSourceName = getSourceNameFromMetadata(
    primarySourceItem?.raw_source_item?.metadata,
  );
  if (metadataSourceName) {
    return metadataSourceName;
  }

  const sourceId = normalizeText(primarySourceItem?.raw_source_item?.source_id);
  if (sourceId) {
    return sourceId;
  }

  const host = getHostFromUrl(primarySourceItem?.raw_source_item?.canonical_url);
  return host || DEFAULT_SIGNAL_SOURCE;
};

const formatPreviewTimestamp = (value: string) => {
  const normalizedValue = normalizeText(value);
  if (!normalizedValue) {
    return DEFAULT_SIGNAL_TIMESTAMP;
  }

  const parsedDate = new Date(normalizedValue);
  if (Number.isNaN(parsedDate.getTime())) {
    return normalizedValue;
  }

  return parsedDate.toISOString().slice(0, 10);
};

const coerceTimestamp = (
  row: RealContentSignalRow,
  primarySourceItem: RealContentFeedSourceItemRow | null,
) =>
  formatPreviewTimestamp(
    normalizeText(row.published_at) ||
      normalizeText(primarySourceItem?.raw_source_item?.published_at) ||
      normalizeText(row.created_at) ||
      normalizeText(primarySourceItem?.raw_source_item?.created_at),
  );

const coerceTitle = (
  preferredTitle: string | null | undefined,
  fallbackTitle: string | null | undefined,
  linkedTitle: string | null | undefined,
) =>
  normalizeText(preferredTitle) ||
  normalizeText(fallbackTitle) ||
  normalizeText(linkedTitle) ||
  DEFAULT_SIGNAL_TITLE;

const coerceSummary = (
  preferredSummary: string | null | undefined,
  fallbackSummary: string | null | undefined,
  linkedDek: string | null | undefined,
  linkedNormalizedText: string | null | undefined,
) =>
  normalizeText(preferredSummary) ||
  normalizeText(fallbackSummary) ||
  normalizeText(linkedDek) ||
  buildNormalizedTextSummary(linkedNormalizedText) ||
  DEFAULT_SIGNAL_SUMMARY;

const buildPreviewWhyItMatters = (
  row: RealContentSignalRow,
  topics: string[],
  entities: string[],
) => {
  const enrichment = resolveEnrichmentState(row);

  if (enrichment.usesEnrichedWhyItMatters) {
    const preferredZhBullets = uniqueStrings(row.enriched_why_it_matters_zh ?? []);
    if (preferredZhBullets.length > 0) {
      return preferredZhBullets;
    }

    const fallbackEnBullets = uniqueStrings(row.enriched_why_it_matters_en ?? []);
    if (fallbackEnBullets.length > 0) {
      return fallbackEnBullets;
    }
  }

  const preferredBullets = uniqueStrings(row.why_it_matters_en ?? []);
  if (preferredBullets.length > 0) {
    return preferredBullets;
  }

  const fallbackBullets = uniqueStrings(row.why_it_matters_zh ?? []);
  if (fallbackBullets.length > 0) {
    return fallbackBullets;
  }

  const previewBullets: string[] = [];

  if ((row.source_item_count ?? 0) > 1) {
    previewBullets.push(
      `Preview clustered ${row.source_item_count} corroborating source items.`,
    );
  }

  if (topics.length > 0) {
    previewBullets.push(`Mapped topics: ${topics.slice(0, 2).join(', ')}.`);
  }

  if (entities.length > 0) {
    previewBullets.push(`Key entities: ${entities.slice(0, 3).join(', ')}.`);
  }

  return previewBullets.length > 0
    ? previewBullets
    : [DEFAULT_WHY_IT_MATTERS];
};

const buildFeedError = (context: string, error: SupabaseErrorLike) =>
  new Error(
    `[Phase 4 real content preview] ${context} failed${
      error.code ? ` (${error.code})` : ''
    }: ${error.message ?? 'Unknown Supabase error'}`,
  );

const logPreviewDiagnostics = (
  diagnostics: PreviewReadDiagnostics & { fallbackOccurred: boolean },
) => {
  console.info(
    `[Phase 4 real content preview] rowsFetched=${diagnostics.rowsFetched} mappedCards=${diagnostics.mappedCards} filteredCount=${diagnostics.filteredCount} skippedRows=${diagnostics.skippedRows} fallbackOccurred=${diagnostics.fallbackOccurred} fallbackReason=${diagnostics.fallbackReason ?? 'none'}`,
  );
};

const logTodayFeedMode = (
  feedMode: LoadTodaySignalsResult['feedMode'],
  feedReason: LoadTodaySignalsResult['feedReason'],
  details: {
    signalCount: number;
    usedFallback: boolean;
    isEmpty: boolean;
  },
) => {
  console.info(
    `[Phase 4 Today feed] mode=${feedMode} reason=${feedReason} signalCount=${details.signalCount} usedFallback=${details.usedFallback} isEmpty=${details.isEmpty}`,
  );
};

const parseRealContentSignalRow = (row: unknown): RealContentSignalRow => {
  if (!isRecord(row)) {
    throw new Error('row is not an object');
  }

  if (!normalizeText(typeof row.id === 'string' ? row.id : '')) {
    throw new Error('row.id is required');
  }

  return row as unknown as RealContentSignalRow;
};

const isMissingEnrichmentSchemaError = (error: SupabaseErrorLike) => {
  const message = `${error.code ?? ''} ${error.message ?? ''}`.toLowerCase();
  return (
    message.includes('schema cache') ||
    OPTIONAL_ENRICHMENT_PREVIEW_COLUMNS.some(column => message.includes(column))
  );
};

async function runPreviewQuery(
  client: RealContentFeedLoaderClient,
  columns: string,
) {
  return client
    .from('intelligence_signals')
    .select(columns)
    .in('lifecycle_stage', ['candidate_preview', 'candidate', 'draft'])
    .or('generation_status.is.null,generation_status.neq.failed')
    .order('published_at', { ascending: false })
    .limit(REAL_CONTENT_FEED_LIMIT);
}

export function resolveRealContentFeedEnabled(value: string | undefined) {
  return value?.trim().toLowerCase() === 'true';
}

export function resolveTodayRealFeedRolloutMode({
  envValue,
  defaultRealFeedEnabled = false,
}: {
  envValue: string | undefined;
  defaultRealFeedEnabled?: boolean;
}): TodayRealFeedRolloutMode {
  const normalizedValue = envValue?.trim().toLowerCase();

  if (normalizedValue === 'false') {
    return 'rollback_to_mock';
  }

  if (normalizedValue === 'true') {
    return 'real_by_env';
  }

  if (defaultRealFeedEnabled) {
    return 'real_by_default_candidate';
  }

  return 'mock_by_default';
}

export function resolveTodayFeedDisabledReason(
  rolloutMode: TodayRealFeedRolloutMode,
): Extract<LoadTodaySignalsResult['feedReason'], 'env_disabled' | 'rollback_to_mock'> {
  return rolloutMode === 'rollback_to_mock' ? 'rollback_to_mock' : 'env_disabled';
}

export const todayRealFeedRolloutMode = resolveTodayRealFeedRolloutMode({
  envValue: import.meta.env?.VITE_USE_REAL_CONTENT_FEED,
  // Task 20 keeps mock as the default until a later explicit rollout task
  // decides otherwise with target-environment evidence.
  defaultRealFeedEnabled: false,
});

export const isRealContentFeedEnabled =
  todayRealFeedRolloutMode === 'real_by_env' ||
  todayRealFeedRolloutMode === 'real_by_default_candidate';

export function getTodayFeedEmptyStateMessage({
  feedMode,
  feedReason,
  totalFeedSignals,
  filteredSignalCount,
}: {
  feedMode: LoadTodaySignalsResult['feedMode'];
  feedReason: LoadTodaySignalsResult['feedReason'];
  totalFeedSignals: number;
  filteredSignalCount: number;
}) {
  return resolveTodayFeedViewState({
    feedMode,
    feedReason,
    totalFeedSignals,
    filteredSignalCount,
  }).message;
}

export function resolveTodayFeedViewState({
  feedMode,
  feedReason,
  totalFeedSignals,
  filteredSignalCount,
}: {
  feedMode: LoadTodaySignalsResult['feedMode'];
  feedReason: LoadTodaySignalsResult['feedReason'];
  totalFeedSignals: number;
  filteredSignalCount: number;
}): TodayFeedViewState {
  if (filteredSignalCount > 0) {
    return {
      viewState: 'cards',
      message: '',
      filterExcludedAllSignals: false,
      feedReason,
    };
  }

  if (feedMode === 'real_empty' && totalFeedSignals === 0) {
    return {
      viewState: 'real_empty',
      message: REAL_CONTENT_FEED_EMPTY_MESSAGE,
      filterExcludedAllSignals: false,
      feedReason,
    };
  }

  if (feedMode === 'real' && totalFeedSignals > 0) {
    return {
      viewState: 'filter_empty',
      message: REAL_CONTENT_FILTER_EMPTY_MESSAGE,
      filterExcludedAllSignals: true,
      feedReason,
    };
  }

  return {
    viewState: 'empty',
    message: 'No signals found matching your current filters.',
    filterExcludedAllSignals: false,
    feedReason,
  };
}

// Phase 4 preview only: this adapter is intentionally deterministic and
// read-only. It can prefer future enriched summary fields when they exist, but
// it must keep working against older preview environments that still only have
// the pre-enrichment signal schema.
export function mapRealContentSignalRowToSignal(row: RealContentSignalRow): Signal {
  const primaryCategory = resolvePrimaryCategory(row);
  if (!primaryCategory) {
    throw new Error('row must include at least one supported category');
  }

  const enrichment = resolveEnrichmentState(row);
  const primarySourceItem = getPrimarySourceItem(row);
  const topics = coerceTopics(row);
  const entities = coerceEntities(row);
  const provenanceSources = buildPreviewProvenanceSources(row);

  return {
    id: row.id,
    category: primaryCategory,
    categories: coerceCategoryKeys(primaryCategory, row.categories),
    topics,
    entities,
    titleZh: coerceTitle(
      row.headline_zh,
      row.headline_en,
      primarySourceItem?.raw_source_item?.title,
    ),
    titleEn: coerceTitle(
      row.headline_en,
      row.headline_zh,
      primarySourceItem?.raw_source_item?.title,
    ),
    summaryZh: coerceSummary(
      enrichment.usesEnrichedSummary ? row.enriched_summary_zh : row.summary_zh,
      enrichment.usesEnrichedSummary ? row.enriched_summary_en : row.summary_en,
      primarySourceItem?.raw_source_item?.dek,
      primarySourceItem?.raw_source_item?.normalized_text,
    ),
    whyItMatters: buildPreviewWhyItMatters(row, topics, entities),
    importance: clampImportance(row.overall_score),
    source: coerceSource(row, primarySourceItem),
    timestamp: coerceTimestamp(row, primarySourceItem),
    tags: coerceTags(row, topics, entities),
    realContentPreview: {
      previewKind: 'real_content',
      lifecycleStage:
        normalizeText(row.lifecycle_stage) &&
        PREVIEW_ELIGIBLE_LIFECYCLE_STAGES.has(normalizeText(row.lifecycle_stage))
          ? (normalizeText(row.lifecycle_stage) as
              | 'candidate_preview'
              | 'candidate'
              | 'draft')
          : undefined,
      generationStatus: normalizeText(row.generation_status) || null,
      primarySourceItemId: normalizeText(row.primary_source_item_id) || null,
      sourceItemCount: row.source_item_count ?? provenanceSources.length,
      enrichmentStatus: enrichment.enrichmentStatus,
      enrichmentVersion: enrichment.enrichmentVersion,
      enrichmentSource: enrichment.enrichmentSource,
      summaryStatus: enrichment.summaryStatus,
      translationStatus: enrichment.translationStatus,
      sourceLanguage: enrichment.sourceLanguage,
      targetLanguages: enrichment.targetLanguages,
      hasEnrichedSummary: enrichment.hasEnrichedSummary,
      usesEnrichedSummary: enrichment.usesEnrichedSummary,
      provenanceSources,
    },
  };
}

async function fetchRealContentFeedPreview(
  client: RealContentFeedLoaderClient,
): Promise<{ signals: Signal[]; diagnostics: PreviewReadDiagnostics }> {
  const enrichedResult = await runPreviewQuery(client, ENRICHED_REAL_CONTENT_SELECT);

  let rows: RealContentSignalRow[];

  if (enrichedResult.error) {
    if (!isMissingEnrichmentSchemaError(enrichedResult.error)) {
      throw buildFeedError('read', enrichedResult.error);
    }

    console.info(
      '[Phase 4 real content preview] Enrichment columns are unavailable in this Supabase schema yet, retrying the legacy preview query.',
    );

    const legacyResult = await runPreviewQuery(client, LEGACY_REAL_CONTENT_SELECT);
    if (legacyResult.error) {
      throw buildFeedError('read', legacyResult.error);
    }

    rows = (legacyResult.data ?? []) as RealContentSignalRow[];
  } else {
    rows = (enrichedResult.data ?? []) as RealContentSignalRow[];
  }

  const eligibleRows = rows.filter(isPreviewEligibleRow).sort(compareRealContentRows);
  const signals: Signal[] = [];
  let skippedRows = 0;

  for (const row of eligibleRows) {
    try {
      signals.push(mapRealContentSignalRowToSignal(parseRealContentSignalRow(row)));
    } catch (error) {
      skippedRows += 1;
      console.warn(
        `[Phase 4 real content preview] Skipping malformed preview row id=${isRecord(row) && typeof row.id === 'string' ? row.id : 'unknown'} reason=${
          error instanceof Error ? error.message : 'unknown mapping error'
        }`,
      );
    }
  }

  const fallbackReason =
    eligibleRows.length > 0 && signals.length === 0 && skippedRows > 0
      ? 'all_eligible_rows_failed_mapping'
      : null;

  return {
    signals,
    diagnostics: {
      rowsFetched: rows.length,
      mappedCards: signals.length,
      filteredCount: rows.length - eligibleRows.length,
      skippedRows,
      fallbackReason,
    },
  };
}

export async function loadRealContentFeedPreview(client: RealContentFeedLoaderClient) {
  const { signals, diagnostics } = await fetchRealContentFeedPreview(client);
  logPreviewDiagnostics({ ...diagnostics, fallbackOccurred: false });
  return signals;
}

export async function loadTodaySignals({
  enableRealContentFeed,
  client,
  mockSignals,
  disabledReason = 'env_disabled',
}: {
  enableRealContentFeed: boolean;
  client: RealContentFeedLoaderClient | null;
  mockSignals: Signal[];
  disabledReason?: Extract<
    LoadTodaySignalsResult['feedReason'],
    'env_disabled' | 'rollback_to_mock'
  >;
}): Promise<LoadTodaySignalsResult> {
  if (!enableRealContentFeed) {
    return {
      signals: [...mockSignals],
      source: 'mock',
      feedMode: 'mock',
      feedReason: disabledReason,
      usedFallback: false,
      errorMessage: null,
      isEmpty: false,
    };
  }

  if (!client) {
    const result: LoadTodaySignalsResult = {
      signals: [...mockSignals],
      source: 'mock',
      feedMode: 'fallback_to_mock',
      feedReason: 'fallback_no_client',
      usedFallback: true,
      errorMessage:
        '[Phase 4 real content preview] Supabase client is not configured for frontend reads.',
      isEmpty: false,
    };
    logTodayFeedMode(result.feedMode, result.feedReason, {
      signalCount: result.signals.length,
      usedFallback: result.usedFallback,
      isEmpty: result.isEmpty,
    });
    return result;
  }

  try {
    const { signals, diagnostics } = await fetchRealContentFeedPreview(client);
    if (diagnostics.fallbackReason) {
      logPreviewDiagnostics({ ...diagnostics, fallbackOccurred: true });
      const result: LoadTodaySignalsResult = {
        signals: [...mockSignals],
        source: 'mock',
        feedMode: 'fallback_to_mock',
        feedReason: 'fallback_all_rows_failed_mapping',
        usedFallback: true,
        errorMessage:
          `[Phase 4 real content preview] All eligible preview rows failed mapping. rowsFetched=${diagnostics.rowsFetched} skippedRows=${diagnostics.skippedRows}.`,
        isEmpty: false,
      };
      logTodayFeedMode(result.feedMode, result.feedReason, {
        signalCount: result.signals.length,
        usedFallback: result.usedFallback,
        isEmpty: result.isEmpty,
      });
      return result;
    }

    logPreviewDiagnostics({ ...diagnostics, fallbackOccurred: false });

    const emptyDebugMessage =
      signals.length === 0
        ? `[Phase 4 real content preview] Read succeeded but returned 0 eligible preview rows. rowsFetched=${diagnostics.rowsFetched} filteredCount=${diagnostics.filteredCount} skippedRows=${diagnostics.skippedRows}.`
        : null;

    const result: LoadTodaySignalsResult = {
      signals,
      source: 'real',
      feedMode: signals.length === 0 ? 'real_empty' : 'real',
      feedReason: signals.length === 0 ? 'real_zero_rows' : 'real_loaded',
      usedFallback: false,
      errorMessage: emptyDebugMessage,
      isEmpty: signals.length === 0,
    };
    logTodayFeedMode(result.feedMode, result.feedReason, {
      signalCount: result.signals.length,
      usedFallback: result.usedFallback,
      isEmpty: result.isEmpty,
    });
    return result;
  } catch (error) {
    console.info(
      '[Phase 4 real content preview] rowsFetched=0 mappedCards=0 filteredCount=0 skippedRows=0 fallbackOccurred=true fallbackReason=read_failed',
    );
    const result: LoadTodaySignalsResult = {
      signals: [...mockSignals],
      source: 'mock',
      feedMode: 'fallback_to_mock',
      feedReason: 'fallback_read_failed',
      usedFallback: true,
      errorMessage:
        error instanceof Error
          ? error.message
          : '[Phase 4 real content preview] Unknown read failure.',
      isEmpty: false,
    };
    logTodayFeedMode(result.feedMode, result.feedReason, {
      signalCount: result.signals.length,
      usedFallback: result.usedFallback,
      isEmpty: result.isEmpty,
    });
    return result;
  }
}
