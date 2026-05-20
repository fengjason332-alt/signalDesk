import type { CategoryKey, Signal } from '../../types';
import { CATEGORY_KEYS } from '../../types';

const REAL_CONTENT_FEED_LIMIT = 24;
const DEFAULT_WHY_IT_MATTERS = 'Why this matters is still being prepared.';
const DEFAULT_SIGNAL_TITLE = 'Untitled signal';
const DEFAULT_SIGNAL_SUMMARY = 'Summary unavailable.';
const DEFAULT_SIGNAL_SOURCE = 'Unknown source';
const DEFAULT_SIGNAL_TIMESTAMP = 'Unknown publish time';

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

const getPrimarySourceItem = (row: RealContentSignalRow) =>
  (row.signal_source_items ?? []).find(sourceItem => sourceItem.is_primary) ??
  (row.signal_source_items ?? [])[0] ??
  null;

const getJoinedSingle = <T>(value: T | T[] | null | undefined): T | null => {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
};

const getSourceNameFromMetadata = (
  metadata: Record<string, unknown> | null | undefined,
) => {
  const sourceName = metadata?.source_name;
  return typeof sourceName === 'string' ? sourceName.trim() : '';
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

  const sourceId = normalizeText(primarySourceItem?.raw_source_item?.source_id);
  if (sourceId) {
    return sourceId;
  }

  const metadataSourceName = getSourceNameFromMetadata(
    primarySourceItem?.raw_source_item?.metadata,
  );
  if (metadataSourceName) {
    return metadataSourceName;
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
  };
}

export async function loadRealContentFeedPreview(client: RealContentFeedLoaderClient) {
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

  return (data ?? []).map(row =>
    mapRealContentSignalRowToSignal(row as unknown as RealContentSignalRow),
  );
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
    const signals = await loadRealContentFeedPreview(client);
    return {
      signals,
      source: 'real',
      usedFallback: false,
      errorMessage: null,
      isEmpty: signals.length === 0,
    };
  } catch (error) {
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
