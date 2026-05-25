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
  'content_entities',
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
  'updated_at',
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
  updated_at?: string;
}

export interface Phase4AiEnrichmentReadbackRecord {
  signal_id: string;
  enrichment_status: EnrichmentStatus;
  enrichment_version: number | null;
  enrichment_source: EnrichmentSource | null;
  summary_status: EnrichmentStatus;
  translation_status: EnrichmentStatus;
  source_language: ContentLanguage | null;
  target_languages: ContentLanguage[];
  enrichment_error: string | null;
  last_enriched_at: string | null;
}

export interface Phase4AiEnrichmentStore {
  listCandidateSignals(signalIds?: string[]): Promise<Phase4AiEnrichmentCandidateRecord[]>;
  claimSignalForEnrichment(input: Phase4AiEnrichmentClaimInput): Promise<boolean>;
  writeEnrichmentResult(
    signalId: string,
    patch: Phase4AiEnrichmentWritePatch,
  ): Promise<void>;
  readEnrichmentResult(
    signalId: string,
  ): Promise<Phase4AiEnrichmentReadbackRecord | null>;
}

type SupabaseRuntimeClient = {
  from: (table: string) => any;
};

type SupabaseErrorLike = {
  message?: string;
  code?: string | null;
};

type SupabaseQueryResult<TData> = {
  data: TData;
  error: SupabaseErrorLike | null;
};

const buildSupabaseError = (context: string, error: SupabaseErrorLike) =>
  new Error(
    `[Phase 4 AI enrichment] ${context} failed${
      error.code ? ` (${error.code})` : ''
    }: ${error.message ?? 'Unknown Supabase error'}`,
  );

async function runSupabaseQuery<TData>(
  operation: PromiseLike<SupabaseQueryResult<TData>>,
  context: string,
) {
  const { data, error } = await operation;
  if (error) {
    throw buildSupabaseError(context, error);
  }

  return data;
}

const ENRICHMENT_SIGNAL_SELECT = `
  id,
  lifecycle_stage,
  generation_status,
  primary_category,
  categories,
  headline_en,
  headline_zh,
  summary_en,
  summary_zh,
  why_it_matters_en,
  why_it_matters_zh,
  tags,
  primary_source_name,
  primary_source_item_id,
  source_item_count,
  published_at,
  enrichment_status,
  enrichment_version,
  enrichment_source,
  summary_status,
  translation_status,
  source_language,
  target_languages,
  last_enriched_at,
  signal_source_items(
    is_primary,
    raw_source_item:raw_source_items(
      id,
      source_id,
      canonical_url,
      published_at,
      title,
      dek,
      normalized_text,
      metadata
    )
  ),
  signal_entities(
    relevance_score,
    mention_count,
    content_entity:content_entities(
      id,
      canonical_name
    )
  ),
  signal_topics(
    relevance_score,
    canonical_topic:canonical_topics(
      id,
      name
    )
  )
`;

type SupabaseAiEnrichmentRow = {
  id: string;
  lifecycle_stage: 'candidate_preview' | 'candidate' | 'draft' | null;
  generation_status: string | null;
  primary_category: CategoryKey;
  categories: CategoryKey[] | null;
  headline_en: string;
  headline_zh: string | null;
  summary_en: string;
  summary_zh: string | null;
  why_it_matters_en: string[] | null;
  why_it_matters_zh: string[] | null;
  tags: string[] | null;
  primary_source_name: string | null;
  primary_source_item_id: string | null;
  source_item_count: number | null;
  published_at: string;
  enrichment_status: EnrichmentStatus | null;
  enrichment_version: number | null;
  enrichment_source: EnrichmentSource | null;
  summary_status: EnrichmentStatus | null;
  translation_status: EnrichmentStatus | null;
  source_language: ContentLanguage | null;
  target_languages: ContentLanguage[] | null;
  last_enriched_at: string | null;
  signal_source_items:
    | Array<{
        is_primary: boolean;
        raw_source_item: {
          id: string;
          source_id: string | null;
          canonical_url: string | null;
          published_at: string | null;
          title: string | null;
          dek: string | null;
          normalized_text: string | null;
          metadata?: Record<string, unknown> | null;
        } | null;
      }>
    | null;
  signal_entities:
    | Array<{
        relevance_score: number | null;
        mention_count: number | null;
        content_entity: {
          id: string;
          canonical_name: string | null;
        } | null;
      }>
    | null;
  signal_topics:
    | Array<{
        relevance_score: number | null;
        canonical_topic: {
          id: string;
          name: string | null;
        } | null;
      }>
    | null;
};

type SupabaseAiEnrichmentReadbackRow = {
  id: string;
  enrichment_status: EnrichmentStatus | null;
  enrichment_version: number | null;
  enrichment_source: EnrichmentSource | null;
  summary_status: EnrichmentStatus | null;
  translation_status: EnrichmentStatus | null;
  source_language: ContentLanguage | null;
  target_languages: ContentLanguage[] | null;
  enrichment_error: string | null;
  last_enriched_at: string | null;
};

const normalizeText = (value: string | null | undefined) => value?.trim() ?? '';

export function createSupabaseAiEnrichmentStore(
  client: SupabaseRuntimeClient,
): Phase4AiEnrichmentStore {
  return {
    async listCandidateSignals(signalIds) {
      const query = client
        .from('intelligence_signals')
        .select(ENRICHMENT_SIGNAL_SELECT);

      const rows = await runSupabaseQuery(
        signalIds && signalIds.length > 0
          ? query.in('id', signalIds)
          : query,
        'load intelligence_signals for AI enrichment',
      );

      return ((rows ?? []) as SupabaseAiEnrichmentRow[]).map(row => ({
        signal_id: row.id,
        lifecycle_stage: (row.lifecycle_stage ?? 'candidate') as
          | 'candidate_preview'
          | 'candidate'
          | 'draft',
        generation_status: row.generation_status,
        primary_category: row.primary_category,
        categories: [...(row.categories ?? [row.primary_category])],
        headline_en: row.headline_en,
        headline_zh: row.headline_zh,
        summary_en: row.summary_en,
        summary_zh: row.summary_zh,
        why_it_matters_en: [...(row.why_it_matters_en ?? [])],
        why_it_matters_zh: [...(row.why_it_matters_zh ?? [])],
        tags: [...(row.tags ?? [])],
        primary_source_name: row.primary_source_name,
        primary_source_item_id: row.primary_source_item_id,
        source_item_count: row.source_item_count ?? row.signal_source_items?.length ?? 0,
        published_at: row.published_at,
        enrichment_status: row.enrichment_status ?? 'not_requested',
        enrichment_version: row.enrichment_version,
        enrichment_source: row.enrichment_source,
        summary_status: row.summary_status ?? 'not_requested',
        translation_status: row.translation_status ?? 'not_requested',
        source_language: row.source_language,
        target_languages: [...(row.target_languages ?? [])],
        last_enriched_at: row.last_enriched_at,
        source_rows: (row.signal_source_items ?? [])
          .map(link => {
            const sourceItem = link.raw_source_item;
            if (!sourceItem) {
              return null;
            }

            const metadata = sourceItem.metadata ?? {};
            const sourceName =
              normalizeText(
                typeof metadata.source_name === 'string' ? metadata.source_name : null,
              ) ||
              normalizeText(
                typeof metadata.publisher === 'string' ? metadata.publisher : null,
              ) ||
              normalizeText(
                typeof metadata.publication_name === 'string'
                  ? metadata.publication_name
                  : null,
              ) ||
              sourceItem.source_id;

            return {
              raw_source_item_id: sourceItem.id,
              source_id: sourceItem.source_id,
              source_name: sourceName,
              canonical_url: sourceItem.canonical_url,
              published_at: sourceItem.published_at,
              title: sourceItem.title,
              dek: sourceItem.dek,
              normalized_text: sourceItem.normalized_text,
              is_primary: link.is_primary === true,
            };
          })
          .filter((value): value is Phase4AiEnrichmentCandidateRecord['source_rows'][number] => value !== null)
          .sort((left, right) => Number(right.is_primary) - Number(left.is_primary)),
        topic_rows: (row.signal_topics ?? [])
          .map(topicLink => {
            const topic = topicLink.canonical_topic;
            if (!topic) {
              return null;
            }

            return {
              topic_id: topic.id,
              topic_name: topic.name,
              relevance_score: Math.round(topicLink.relevance_score ?? 0),
            };
          })
          .filter((value): value is Phase4AiEnrichmentCandidateRecord['topic_rows'][number] => value !== null),
        entity_rows: (row.signal_entities ?? [])
          .map(entityLink => {
            const entity = entityLink.content_entity;
            if (!entity) {
              return null;
            }

            return {
              entity_id: entity.id,
              canonical_name: entity.canonical_name,
              relevance_score: Math.round(entityLink.relevance_score ?? 0),
              mention_count: Math.round(entityLink.mention_count ?? 0),
            };
          })
          .filter((value): value is Phase4AiEnrichmentCandidateRecord['entity_rows'][number] => value !== null),
      }));
    },

    async claimSignalForEnrichment(_input) {
      // Task 13C uses direct validated writes after provider completion.
      // A lease/claim mechanism can be added later for scheduled execution.
      return false;
    },

    async writeEnrichmentResult(signalId, patch) {
      await runSupabaseQuery(
        client
          .from('intelligence_signals')
          .update({
            enrichment_status: patch.enrichment_status,
            enrichment_version: patch.enrichment_version,
            enrichment_source: patch.enrichment_source,
            summary_status: patch.summary_status,
            translation_status: patch.translation_status,
            source_language: patch.source_language,
            target_languages: [...patch.target_languages],
            enriched_summary_en: patch.enriched_summary_en,
            enriched_summary_zh: patch.enriched_summary_zh,
            enriched_why_it_matters_en: [...patch.enriched_why_it_matters_en],
            enriched_why_it_matters_zh: [...patch.enriched_why_it_matters_zh],
            enrichment_error: patch.enrichment_error,
            last_enriched_at: patch.last_enriched_at,
            ...(patch.updated_at ? { updated_at: patch.updated_at } : {}),
          })
          .eq('id', signalId),
        'update intelligence_signals enrichment fields',
      );
    },

    async readEnrichmentResult(signalId) {
      const rows = await runSupabaseQuery(
        client
          .from('intelligence_signals')
          .select(
            [
              'id',
              'enrichment_status',
              'enrichment_version',
              'enrichment_source',
              'summary_status',
              'translation_status',
              'source_language',
              'target_languages',
              'enrichment_error',
              'last_enriched_at',
            ].join(','),
          )
          .eq('id', signalId),
        'read intelligence_signals enrichment fields',
      );

      const row = ((rows ?? []) as SupabaseAiEnrichmentReadbackRow[])[0] ?? null;
      if (!row) {
        return null;
      }

      return {
        signal_id: row.id,
        enrichment_status: row.enrichment_status ?? 'not_requested',
        enrichment_version: row.enrichment_version,
        enrichment_source: row.enrichment_source,
        summary_status: row.summary_status ?? 'not_requested',
        translation_status: row.translation_status ?? 'not_requested',
        source_language: row.source_language,
        target_languages: [...(row.target_languages ?? [])],
        enrichment_error: row.enrichment_error,
        last_enriched_at: row.last_enriched_at,
      };
    },
  };
}
