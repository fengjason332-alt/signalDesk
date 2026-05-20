import type { CategoryKey, Signal, SignalProvenanceSource } from '../../types';
import { CATEGORY_KEYS } from '../../types';

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

export const REAL_CONTENT_FEED_FALLBACK_MESSAGE =
  'Prototype: real content preview is unavailable here, showing the mock feed.';

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
  usedFallback: boolean;
  errorMessage: string | null;
  isEmpty: boolean;
}

interface PreviewReadDiagnostics {
  rowsFetched: number;
  mappedCards: number;
  filteredCount: number;
}

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

  return provenanceSources;
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
    `[Phase 4 real content preview] rowsFetched=${diagnostics.rowsFetched} mappedCards=${diagnostics.mappedCards} filteredCount=${diagnostics.filteredCount} fallbackOccurred=${diagnostics.fallbackOccurred}`,
  );
};

export function resolveRealContentFeedEnabled(value: string | undefined) {
  return value?.trim().toLowerCase() === 'true';
}

export const isRealContentFeedEnabled = resolveRealContentFeedEnabled(
  import.meta.env?.VITE_USE_REAL_CONTENT_FEED,
);

// Phase 4 preview only: this adapter is intentionally deterministic and
// read-only. It maps persisted candidate signals into the current frontend
// card/detail shape before any later AI summary/translation enrichment exists.
export function mapRealContentSignalRowToSignal(row: RealContentSignalRow): Signal {
  const primarySourceItem = getPrimarySourceItem(row);
  const topics = coerceTopics(row);
  const entities = coerceEntities(row);
  const provenanceSources = buildPreviewProvenanceSources(row);

  return {
    id: row.id,
    category: row.primary_category,
    categories: coerceCategoryKeys(row.primary_category, row.categories),
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
      row.summary_zh,
      row.summary_en,
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
      provenanceSources,
    },
  };
}

async function fetchRealContentFeedPreview(
  client: RealContentFeedLoaderClient,
): Promise<{ signals: Signal[]; diagnostics: PreviewReadDiagnostics }> {
  const { data, error } = await client
    .from('intelligence_signals')
    .select(
      `
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
      `,
    )
    .in('lifecycle_stage', ['candidate_preview', 'candidate', 'draft'])
    .or('generation_status.is.null,generation_status.neq.failed')
    .order('published_at', { ascending: false })
    .limit(REAL_CONTENT_FEED_LIMIT);

  if (error) {
    throw buildFeedError('read', error);
  }

  const rows = (data ?? []) as RealContentSignalRow[];
  const eligibleRows = rows.filter(isPreviewEligibleRow);
  const signals = eligibleRows.map(mapRealContentSignalRowToSignal);

  return {
    signals,
    diagnostics: {
      rowsFetched: rows.length,
      mappedCards: signals.length,
      filteredCount: rows.length - eligibleRows.length,
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
}: {
  enableRealContentFeed: boolean;
  client: RealContentFeedLoaderClient | null;
  mockSignals: Signal[];
}): Promise<LoadTodaySignalsResult> {
  if (!enableRealContentFeed) {
    return {
      signals: [...mockSignals],
      source: 'mock',
      usedFallback: false,
      errorMessage: null,
      isEmpty: false,
    };
  }

  if (!client) {
    return {
      signals: [...mockSignals],
      source: 'mock',
      usedFallback: true,
      errorMessage:
        '[Phase 4 real content preview] Supabase client is not configured for frontend reads.',
      isEmpty: false,
    };
  }

  try {
    const { signals, diagnostics } = await fetchRealContentFeedPreview(client);
    logPreviewDiagnostics({ ...diagnostics, fallbackOccurred: false });

    const emptyDebugMessage =
      signals.length === 0
        ? `[Phase 4 real content preview] Read succeeded but returned 0 eligible preview rows. rowsFetched=${diagnostics.rowsFetched} filteredCount=${diagnostics.filteredCount}.`
        : null;

    return {
      signals,
      source: 'real',
      usedFallback: false,
      errorMessage: emptyDebugMessage,
      isEmpty: signals.length === 0,
    };
  } catch (error) {
    console.info(
      '[Phase 4 real content preview] rowsFetched=0 mappedCards=0 filteredCount=0 fallbackOccurred=true',
    );
    return {
      signals: [...mockSignals],
      source: 'mock',
      usedFallback: true,
      errorMessage:
        error instanceof Error
          ? error.message
          : '[Phase 4 real content preview] Unknown read failure.',
      isEmpty: false,
    };
  }
}
