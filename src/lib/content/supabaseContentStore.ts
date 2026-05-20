import type { SupabaseClient } from '@supabase/supabase-js';

import { compareRawSourceItems } from './dedupe';
import type {
  ContentEntityType,
  ContentLanguage,
  ContentMetadata,
  IngestionRunStatus,
  IngestionStatus,
  SignalGenerationStatus,
} from './types';
import type { CategoryKey } from '../../types';

export interface Phase4ContentIngestionRunCreate {
  source_id: string;
  started_at: string;
}

export interface Phase4ContentIngestionRunFinalize {
  completed_at: string;
  status: IngestionRunStatus;
  items_fetched: number;
  items_inserted: number;
  items_skipped_as_duplicates: number;
  items_failed: number;
  error_message: string | null;
}

export interface Phase4RawSourceItemWriteInput {
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
  category_keys: string[];
  raw_html: string | null;
  raw_text: string | null;
  normalized_text: string | null;
  content_hash: string;
  title_hash: string;
  canonical_url_hash: string;
  ingestion_status: IngestionStatus;
  metadata: ContentMetadata;
}

export interface Phase4RawSourceItemMatch {
  id: string;
  source_id: string;
  external_id: string | null;
  canonical_url_hash: string;
  title_hash: string;
  content_hash: string;
  published_at: string;
}

export interface Phase4ContentEntityUpsert {
  id: string;
  canonical_name: string;
  entity_type: ContentEntityType;
  aliases: string[];
  ticker: string | null;
  country_code: string | null;
  metadata: ContentMetadata;
}

export interface Phase4RawItemEntityLinkUpsert {
  raw_source_item_id: string;
  entity_id: string;
  match_text: string;
  confidence_score: number;
}

export interface Phase4CandidateSignalWriteInput {
  candidate_key: string;
  lifecycle_stage: 'candidate' | 'draft';
  deterministic_seed_version: string;
  primary_category: CategoryKey;
  categories: CategoryKey[];
  headline_en: string;
  headline_zh: string | null;
  summary_en: string;
  summary_zh: string | null;
  why_it_matters_en: string[];
  why_it_matters_zh: string[];
  primary_source_name: string;
  primary_source_item_id: string | null;
  source_item_count: number;
  published_at: string;
  generated_at: string;
  generation_status: SignalGenerationStatus;
  tags: string[];
  importance_score: number;
  urgency_score: number;
  confidence_score: number;
  relevance_score: number;
  source_reliability_score: number;
  recency_score: number;
  entity_importance_score: number;
  topic_relevance_score: number;
  source_count_score: number;
  duplicate_confidence_score: number;
  overall_score: number;
}

interface ExistingCandidateSignalRow {
  id: string;
  candidate_key: string;
  headline_en: string;
  headline_zh: string | null;
  summary_en: string;
  summary_zh: string | null;
  why_it_matters_en: string[];
  why_it_matters_zh: string[];
  generation_status: SignalGenerationStatus;
  lifecycle_stage: 'candidate' | 'draft';
  tags: string[];
}

export interface Phase4SignalSourceItemLinkUpsert {
  signal_id: string;
  raw_source_item_id: string;
  is_primary: boolean;
}

export interface Phase4SignalEntityLinkUpsert {
  signal_id: string;
  entity_id: string;
  relevance_score: number;
  mention_count: number;
}

export interface Phase4SignalTopicLinkUpsert {
  signal_id: string;
  topic_id: string;
  relevance_score: number;
}

export interface Phase4ContentStore {
  assertSourceIdsExist(sourceIds: string[]): Promise<void>;
  createIngestionRun(input: Phase4ContentIngestionRunCreate): Promise<{
    id: string;
    source_id: string;
    started_at: string;
  }>;
  finalizeIngestionRun(
    runId: string,
    update: Phase4ContentIngestionRunFinalize,
  ): Promise<void>;
  findMatchingRawItem(
    item: Phase4RawSourceItemWriteInput,
  ): Promise<Phase4RawSourceItemMatch | null>;
  insertRawItem(
    item: Phase4RawSourceItemWriteInput,
  ): Promise<Phase4RawSourceItemMatch>;
  upsertEntity(entity: Phase4ContentEntityUpsert): Promise<{ id: string }>;
  upsertRawItemEntityLink(link: Phase4RawItemEntityLinkUpsert): Promise<void>;
  upsertCandidateSignal(
    signal: Phase4CandidateSignalWriteInput,
  ): Promise<{ id: string; candidate_key: string }>;
  upsertSignalSourceItemLink(link: Phase4SignalSourceItemLinkUpsert): Promise<void>;
  upsertSignalEntityLink(link: Phase4SignalEntityLinkUpsert): Promise<void>;
  upsertSignalTopicLink(link: Phase4SignalTopicLinkUpsert): Promise<void>;
}

type SupabaseRuntimeClient = Pick<SupabaseClient<any, any, any>, 'from'>;

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
    `[Phase 4 content] ${context} failed${error.code ? ` (${error.code})` : ''}: ${
      error.message ?? 'Unknown Supabase error'
    }`,
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

const getComparableKey = (item: Phase4RawSourceItemMatch) => item.id;

const addCandidateMatches = (
  target: Map<string, Phase4RawSourceItemMatch>,
  rows: Phase4RawSourceItemMatch[] | null | undefined,
) => {
  for (const row of rows ?? []) {
    target.set(getComparableKey(row), row);
  }
};

const DEDUPE_STRENGTH: Record<
  ReturnType<typeof compareRawSourceItems>,
  number
> = {
  exact: 4,
  high: 3,
  medium: 2,
  low: 1,
  none: 0,
};

// Only suppress strong same-story duplicates here. Medium-confidence matches can
// still represent distinct publisher observations, and we want to preserve that
// provenance at the raw-item layer for later clustering.
const SKIPPABLE_DUPLICATE_CONFIDENCES = new Set<
  ReturnType<typeof compareRawSourceItems>
>(['exact', 'high']);

const RAW_ITEM_MATCH_COLUMNS =
  'id, source_id, external_id, canonical_url_hash, title_hash, content_hash, published_at';

const EXISTING_SIGNAL_COLUMNS =
  'id, candidate_key, headline_en, headline_zh, summary_en, summary_zh, why_it_matters_en, why_it_matters_zh, generation_status, lifecycle_stage, tags';

const hasEnrichedSignalContent = (signal: ExistingCandidateSignalRow) =>
  signal.summary_en.trim().length > 0 ||
  signal.summary_zh !== null ||
  signal.why_it_matters_en.length > 0 ||
  signal.why_it_matters_zh.length > 0 ||
  signal.headline_zh !== null ||
  signal.generation_status !== 'pending' ||
  signal.lifecycle_stage !== 'candidate' ||
  signal.tags.length > 0;

const mergeCandidateSignalWriteInput = (
  signal: Phase4CandidateSignalWriteInput,
  existing: ExistingCandidateSignalRow | null,
): Phase4CandidateSignalWriteInput => {
  if (!existing || !hasEnrichedSignalContent(existing)) {
    return signal;
  }

  return {
    ...signal,
    headline_en: existing.headline_en,
    headline_zh: existing.headline_zh,
    summary_en: existing.summary_en,
    summary_zh: existing.summary_zh,
    why_it_matters_en: [...existing.why_it_matters_en],
    why_it_matters_zh: [...existing.why_it_matters_zh],
    generation_status: existing.generation_status,
    lifecycle_stage: existing.lifecycle_stage,
    tags: [...existing.tags],
  };
};

export function createSupabaseContentStore(
  client: SupabaseRuntimeClient,
): Phase4ContentStore {
  return {
    async assertSourceIdsExist(sourceIds) {
      if (sourceIds.length === 0) {
        return;
      }

      const rows = await runSupabaseQuery(
        client.from('content_sources').select('id').in('id', sourceIds),
        'load content_sources',
      );

      const foundIds = new Set((rows ?? []).map(row => row.id as string));
      const missingIds = sourceIds.filter(sourceId => !foundIds.has(sourceId));
      if (missingIds.length > 0) {
        throw new Error(
          `Phase 4 write mode requires seeded content_sources rows for: ${missingIds.join(', ')}`,
        );
      }
    },

    async createIngestionRun(input) {
      const row = await runSupabaseQuery(
        client
          .from('content_ingestion_runs')
          .insert({
            source_id: input.source_id,
            run_status: 'running',
            started_at: input.started_at,
          })
          .select('id, source_id, started_at')
          .single(),
        'insert content_ingestion_runs',
      );

      return row as {
        id: string;
        source_id: string;
        started_at: string;
      };
    },

    async finalizeIngestionRun(runId, update) {
      await runSupabaseQuery(
        client
          .from('content_ingestion_runs')
          .update({
            run_status: update.status,
            completed_at: update.completed_at,
            fetched_count: update.items_fetched,
            inserted_count: update.items_inserted,
            skipped_count: update.items_skipped_as_duplicates,
            failed_count: update.items_failed,
            error_summary: update.error_message,
          })
          .eq('id', runId),
        'update content_ingestion_runs',
      );
    },

    async findMatchingRawItem(item) {
      const candidates = new Map<string, Phase4RawSourceItemMatch>();

      if (item.external_id) {
        const row = await runSupabaseQuery(
          client
            .from('raw_source_items')
            .select(RAW_ITEM_MATCH_COLUMNS)
            .eq('source_id', item.source_id)
            .eq('external_id', item.external_id)
            .maybeSingle(),
          'load raw_source_items by external_id',
        );

        if (row) {
          candidates.set(getComparableKey(row as Phase4RawSourceItemMatch), row as Phase4RawSourceItemMatch);
        }
      }

      const canonicalUrlRows = await runSupabaseQuery(
        client
          .from('raw_source_items')
          .select(RAW_ITEM_MATCH_COLUMNS)
          .eq('canonical_url_hash', item.canonical_url_hash),
        'load raw_source_items by canonical_url_hash',
      );
      addCandidateMatches(candidates, canonicalUrlRows as Phase4RawSourceItemMatch[]);

      const titleRows = await runSupabaseQuery(
        client
          .from('raw_source_items')
          .select(RAW_ITEM_MATCH_COLUMNS)
          .eq('title_hash', item.title_hash),
        'load raw_source_items by title_hash',
      );
      addCandidateMatches(candidates, titleRows as Phase4RawSourceItemMatch[]);

      const contentRows = await runSupabaseQuery(
        client
          .from('raw_source_items')
          .select(RAW_ITEM_MATCH_COLUMNS)
          .eq('content_hash', item.content_hash),
        'load raw_source_items by content_hash',
      );
      addCandidateMatches(candidates, contentRows as Phase4RawSourceItemMatch[]);

      const fallbackRows = await runSupabaseQuery(
        client
          .from('raw_source_items')
          .select(RAW_ITEM_MATCH_COLUMNS)
          .eq('source_id', item.source_id)
          .eq('published_at', item.published_at),
        'load raw_source_items by source_id + published_at',
      );
      addCandidateMatches(candidates, fallbackRows as Phase4RawSourceItemMatch[]);

      const sortedMatches = Array.from(candidates.values())
        .map(match => ({
          match,
          confidence: compareRawSourceItems(item, match),
        }))
        .filter(result => SKIPPABLE_DUPLICATE_CONFIDENCES.has(result.confidence))
        .sort((left, right) => {
          const strengthDifference =
            DEDUPE_STRENGTH[right.confidence] - DEDUPE_STRENGTH[left.confidence];
          if (strengthDifference !== 0) {
            return strengthDifference;
          }

          return left.match.id.localeCompare(right.match.id);
        });

      return sortedMatches[0]?.match ?? null;
    },

    async insertRawItem(item) {
      const row = await runSupabaseQuery(
        client
          .from('raw_source_items')
          .insert(item)
          .select(RAW_ITEM_MATCH_COLUMNS)
          .single(),
        'insert raw_source_items',
      );

      return row as Phase4RawSourceItemMatch;
    },

    async upsertEntity(entity) {
      const row = await runSupabaseQuery(
        client
          .from('content_entities')
          .upsert(entity, {
            onConflict: 'id',
          })
          .select('id')
          .single(),
        'upsert content_entities',
      );

      return row as { id: string };
    },

    async upsertRawItemEntityLink(link) {
      await runSupabaseQuery(
        client
          .from('raw_source_item_entities')
          .upsert(link, {
            onConflict: 'raw_source_item_id,entity_id',
          }),
        'upsert raw_source_item_entities',
      );
    },

    async upsertCandidateSignal(signal) {
      const existing = await runSupabaseQuery(
        client
          .from('intelligence_signals')
          .select(EXISTING_SIGNAL_COLUMNS)
          .eq('candidate_key', signal.candidate_key)
          .maybeSingle(),
        'load intelligence_signals by candidate_key',
      );

      const row = await runSupabaseQuery(
        client
          .from('intelligence_signals')
          .upsert(mergeCandidateSignalWriteInput(signal, existing as ExistingCandidateSignalRow | null), {
            onConflict: 'candidate_key',
          })
          .select('id, candidate_key')
          .single(),
        'upsert intelligence_signals',
      );

      return row as { id: string; candidate_key: string };
    },

    async upsertSignalSourceItemLink(link) {
      await runSupabaseQuery(
        client
          .from('signal_source_items')
          .upsert(link, {
            onConflict: 'signal_id,raw_source_item_id',
          }),
        'upsert signal_source_items',
      );
    },

    async upsertSignalEntityLink(link) {
      await runSupabaseQuery(
        client
          .from('signal_entities')
          .upsert(link, {
            onConflict: 'signal_id,entity_id',
          }),
        'upsert signal_entities',
      );
    },

    async upsertSignalTopicLink(link) {
      await runSupabaseQuery(
        client
          .from('signal_topics')
          .upsert(link, {
            onConflict: 'signal_id,topic_id',
          }),
        'upsert signal_topics',
      );
    },
  };
}
