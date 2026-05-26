import { compareRawSourceItems } from './dedupe.ts';
import {
  fetchSourceFeed,
  mapFeedItemToRawSourceItem,
  normalizeFeedItem,
} from './rss.ts';
import {
  runPhase4AiEnrichment,
  isAiEnrichmentRequest,
  type Phase4AiEnrichmentRuntimeOptions,
  type Phase4AiEnrichmentServerConfig,
} from './phase4AiEnrichment.ts';
import { generateCandidateSignals } from './signalGeneration.ts';
import { getActiveEnglishRssSources } from './sourceRegistry.ts';
import type {
  Phase4CandidateSignalWriteInput,
  Phase4ContentEntityUpsert,
  Phase4ContentStore,
  Phase4RawItemEntityLinkUpsert,
  Phase4RawSourceItemWriteInput,
} from './supabaseContentStore.ts';
import { CONTENT_ENTITY_CATALOG, mapTopicsAndEntities } from './topicEntityMapping.ts';
import type { Phase4AiEnrichmentStore } from './enrichmentStore.ts';
import type {
  CandidateSignalRecord,
  DeterministicEntityMatch,
  Phase4BatchStatus,
  IngestionRunStatus,
  Phase4DryRunPreview,
  Phase4DryRunRequest,
  Phase4IngestionResult,
  RawSourceItemRecord,
  SourceRegistryEntry,
} from './types.ts';

interface FetchResponseLike {
  ok: boolean;
  status: number;
  text: () => Promise<string>;
}

type FetchLike = (url: string) => Promise<FetchResponseLike>;

export interface Phase4IngestionOptions {
  sourceRegistry?: SourceRegistryEntry[];
  fetchImpl?: FetchLike;
  allowLiveFetch?: boolean;
  now?: () => string;
  allowWrites?: boolean;
  writeAuthToken?: string | null;
  contentStore?: Phase4ContentStore | null;
  aiEnrichmentStore?: Phase4AiEnrichmentStore | null;
  aiConfig?: Phase4AiEnrichmentServerConfig | null;
  aiFetchImpl?: Phase4AiEnrichmentRuntimeOptions['fetchImpl'];
}

const DEFAULT_MAX_ITEMS_PER_SOURCE = 5;

const WRITE_STEP_ENABLEMENT = {
  insert_raw_source_items: true,
  upsert_content_entities: true,
  insert_raw_source_item_entities: true,
  insert_intelligence_signals: true,
  insert_signal_source_items: true,
  insert_signal_entities: true,
  insert_signal_topics: true,
} as const;

const WRITE_STEP_ORDER = Object.keys(WRITE_STEP_ENABLEMENT) as Array<
  keyof typeof WRITE_STEP_ENABLEMENT
>;

const COUNTRY_CODE_BY_ENTITY_NAME: Record<string, string> = {
  China: 'CN',
  Australia: 'AU',
};

interface Phase4WriteGuardrailPayload {
  error: string;
  code:
    | 'phase4_write_mode_disabled'
    | 'phase4_write_token_not_configured'
    | 'phase4_write_token_missing'
    | 'phase4_write_token_mismatch';
  write_mode_requested: true;
  writes_enabled: boolean;
  write_token_configured: boolean;
}

interface PendingRunState {
  source: SourceRegistryEntry;
  runRef:
    | {
        id: string;
        source_id: string;
        started_at: string;
      }
    | null;
  errorMessage: string | null;
  fetchedCount: number;
  normalizedCount: number;
  insertedCount: number;
  skippedCount: number;
  failedCount: number;
}

const isExplicitWriteRequest = (payload: Phase4DryRunRequest) => payload.dryRun === false;
const isExplicitLiveFetchRequest = (payload: Phase4DryRunRequest) =>
  payload.liveFetch === true;

const getNow = (payload: Phase4DryRunRequest, now: (() => string) | undefined, fallback: string) =>
  payload.now ?? now?.() ?? fallback;

const buildWriteSteps = (dryRun: boolean) =>
  WRITE_STEP_ORDER.map(step => ({
    step,
    enabled: dryRun ? false : WRITE_STEP_ENABLEMENT[step],
  }));

const toErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Phase 4 ingestion failed.';

const getWriteResponseStatus = (result: Phase4IngestionResult) => {
  if (result.dry_run) {
    return 200;
  }

  if (result.overall_status === 'failed') {
    return 500;
  }

  if (result.overall_status === 'partial_success') {
    return 207;
  }

  return 200;
};

const getAiEnrichmentResponseStatus = (
  result: Awaited<ReturnType<typeof runPhase4AiEnrichment>>,
) => {
  if (result.code === 'provider_not_configured' || result.code === 'ai_enrichment_disabled') {
    return 503;
  }

  if (result.code === 'ai_store_not_configured') {
    return 503;
  }

  if (
    result.code === 'ai_dry_run_only' ||
    result.code === 'unsupported_provider' ||
    result.code === 'ai_write_requires_dry_run_false' ||
    result.code === 'ai_write_mode_required' ||
    result.code === 'ai_write_token_missing' ||
    result.code === 'ai_write_token_mismatch'
  ) {
    return 403;
  }

  if (result.code === 'ai_write_token_not_configured') {
    return 503;
  }

  if (result.code === 'ai_write_signal_limit_exceeded') {
    return 400;
  }

  if (result.code === 'ai_write_signal_ids_limit_exceeded') {
    return 400;
  }

  if (result.dry_run) {
    return 200;
  }

  if (!result.dry_run && 'overall_status' in result && result.overall_status === 'failed') {
    return 500;
  }

  if (
    !result.dry_run &&
    'overall_status' in result &&
    result.overall_status === 'partial_success'
  ) {
    return 207;
  }

  return 200;
};

const jsonResponse = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json',
    },
  });

const buildWriteGuardrailPayload = (
  options: Phase4IngestionOptions,
  payload: Pick<Phase4WriteGuardrailPayload, 'error' | 'code'>,
): Phase4WriteGuardrailPayload => ({
  ...payload,
  write_mode_requested: true,
  writes_enabled: Boolean(options.allowWrites && options.contentStore),
  write_token_configured: Boolean(options.writeAuthToken),
});

const appendErrorMessage = (current: string | null, next: string) => {
  if (!current) {
    return next;
  }

  if (current.includes(next)) {
    return current;
  }

  return `${current}; ${next}`;
};

const toRawItemWriteInput = (
  item: RawSourceItemRecord,
  ingestionRunId: string,
): Phase4RawSourceItemWriteInput => ({
  source_id: item.source_id,
  ingestion_run_id: ingestionRunId,
  external_id: item.external_id,
  canonical_url: item.canonical_url,
  title: item.title,
  dek: item.dek,
  author: item.author,
  published_at: item.published_at,
  discovered_at: item.discovered_at,
  language: item.language,
  category_keys: [...item.category_keys],
  raw_html: item.raw_html,
  raw_text: item.raw_text,
  normalized_text: item.normalized_text,
  content_hash: item.content_hash,
  title_hash: item.title_hash,
  canonical_url_hash: item.canonical_url_hash,
  ingestion_status: item.ingestion_status,
  metadata: {
    ...item.metadata,
  },
});

const buildEntityUpsert = (
  match: DeterministicEntityMatch,
): Phase4ContentEntityUpsert => {
  const entityCatalogEntry = CONTENT_ENTITY_CATALOG.find(
    entity => entity.id === match.entity_id,
  );

  return {
    id: match.entity_id,
    canonical_name: match.canonical_name,
    entity_type: match.entity_type,
    aliases:
      entityCatalogEntry?.aliases.length ?? 0
        ? [...entityCatalogEntry!.aliases]
        : [...match.matched_aliases],
    ticker: null,
    country_code: COUNTRY_CODE_BY_ENTITY_NAME[match.canonical_name] ?? null,
    metadata: {
      deterministic_entity: true,
      category_keys: entityCatalogEntry?.categoryKeys.join(',') ?? '',
    },
  };
};

const buildEntityLinkUpsert = (
  rawSourceItemId: string,
  match: DeterministicEntityMatch,
): Phase4RawItemEntityLinkUpsert => ({
  raw_source_item_id: rawSourceItemId,
  entity_id: match.entity_id,
  match_text:
    match.evidence_snippets[0] ?? match.matched_aliases[0] ?? match.canonical_name,
  confidence_score: match.confidence_score,
});

async function persistRawItemAndEntities(
  rawItem: RawSourceItemRecord,
  store: Phase4ContentStore,
  ingestionRunId: string,
) {
  const writeInput = toRawItemWriteInput(rawItem, ingestionRunId);
  const existingRawItem = await store.findMatchingRawItem(writeInput);
  const persistedRawItem =
    existingRawItem ?? (await store.insertRawItem(writeInput));

  const mapping = mapTopicsAndEntities({
    title: rawItem.title,
    dek: rawItem.dek,
    text: rawItem.normalized_text ?? rawItem.raw_text,
    categoryKeys: rawItem.category_keys,
  });

  for (const entityMatch of mapping.entities) {
    await store.upsertEntity(buildEntityUpsert(entityMatch));
    await store.upsertRawItemEntityLink(
      buildEntityLinkUpsert(persistedRawItem.id, entityMatch),
    );
  }

  return {
    inserted: existingRawItem === null,
    raw_source_item_id: persistedRawItem.id,
  };
}

const buildSignalConfidenceScore = (candidate: CandidateSignalRecord) =>
  Math.round(
    (candidate.scoring_seed.source_reliability_score +
      candidate.scoring_seed.duplicate_confidence_score) /
      2,
  );

const buildCandidateSignalWriteInput = (
  candidate: CandidateSignalRecord,
  persistedPrimarySourceItemId: string | null,
  generatedAt: string,
): Phase4CandidateSignalWriteInput => ({
  candidate_key: candidate.candidate_id,
  lifecycle_stage: 'candidate',
  deterministic_seed_version: candidate.scoring_seed.seed_version,
  primary_category: candidate.primary_category,
  categories: [...candidate.categories],
  headline_en: candidate.title_seed,
  headline_zh: null,
  summary_en: '',
  summary_zh: null,
  why_it_matters_en: [],
  why_it_matters_zh: [],
  primary_source_name: candidate.primary_source_name ?? 'Unknown source',
  primary_source_item_id: persistedPrimarySourceItemId,
  source_item_count: candidate.source_count,
  published_at: candidate.published_at,
  generated_at: generatedAt,
  generation_status: 'pending',
  tags: [],
  importance_score: candidate.scoring_seed.entity_importance_score,
  urgency_score: candidate.scoring_seed.recency_score,
  confidence_score: buildSignalConfidenceScore(candidate),
  relevance_score: candidate.scoring_seed.topic_relevance_score,
  source_reliability_score: candidate.scoring_seed.source_reliability_score,
  recency_score: candidate.scoring_seed.recency_score,
  entity_importance_score: candidate.scoring_seed.entity_importance_score,
  topic_relevance_score: candidate.scoring_seed.topic_relevance_score,
  source_count_score: candidate.scoring_seed.source_count_score,
  duplicate_confidence_score: candidate.scoring_seed.duplicate_confidence_score,
  overall_score: candidate.scoring_seed.overall_seed_score,
});

async function persistCandidateSignal(
  candidate: CandidateSignalRecord,
  store: Phase4ContentStore,
  persistedRawItemIdByPreviewId: Map<string, string>,
  generatedAt: string,
) {
  const persistedSourceItemIds = candidate.source_item_ids.map(sourceItemId => {
    const persistedId = persistedRawItemIdByPreviewId.get(sourceItemId);
    if (!persistedId) {
      throw new Error(
        `Missing persisted raw source item for candidate ${candidate.candidate_id}: ${sourceItemId}`,
      );
    }

    return persistedId;
  });

  const persistedPrimarySourceItemId = candidate.primary_preview_raw_source_item_id
    ? persistedRawItemIdByPreviewId.get(candidate.primary_preview_raw_source_item_id) ?? null
    : null;

  const persistedSignal = await store.upsertCandidateSignal(
    buildCandidateSignalWriteInput(
      candidate,
      persistedPrimarySourceItemId,
      generatedAt,
    ),
  );

  for (const rawSourceItemId of persistedSourceItemIds) {
    await store.upsertSignalSourceItemLink({
      signal_id: persistedSignal.id,
      raw_source_item_id: rawSourceItemId,
      is_primary:
        persistedPrimarySourceItemId !== null &&
        rawSourceItemId === persistedPrimarySourceItemId,
    });
  }

  for (const entityMatch of candidate.entity_matches) {
    await store.upsertSignalEntityLink({
      signal_id: persistedSignal.id,
      entity_id: entityMatch.entity_id,
      relevance_score: entityMatch.relevance_score,
      mention_count: entityMatch.mention_count,
    });
  }

  for (const topicMatch of candidate.topic_matches) {
    await store.upsertSignalTopicLink({
      signal_id: persistedSignal.id,
      topic_id: topicMatch.topic_id,
      relevance_score: topicMatch.relevance_score,
    });
  }

  return {
    created: persistedSignal.created,
  };
}

const resolveRunStatus = (counts: {
  fetched: number;
  inserted: number;
  skipped: number;
  failed: number;
}): IngestionRunStatus => {
  if (counts.failed === 0) {
    return 'succeeded';
  }

  if (counts.inserted > 0 || counts.skipped > 0) {
    return 'partial';
  }

  return 'failed';
};

const resolveBatchStatus = (
  sourceStatuses: IngestionRunStatus[],
): Phase4BatchStatus => {
  if (sourceStatuses.length === 0) {
    return 'succeeded';
  }

  if (sourceStatuses.every(status => status === 'succeeded')) {
    return 'succeeded';
  }

  if (sourceStatuses.every(status => status === 'failed')) {
    return 'failed';
  }

  return 'partial_success';
};

export function resolveDryRunSources(
  sourceIds: string[] | undefined,
  sourceRegistry: SourceRegistryEntry[],
) {
  const selectedIds = sourceIds?.length ? new Set(sourceIds) : null;
  return sourceRegistry.filter(source => (selectedIds ? selectedIds.has(source.id) : source.active));
}

export async function runPhase4Ingestion(
  payload: Phase4DryRunRequest,
  options: Phase4IngestionOptions = {},
): Promise<Phase4IngestionResult> {
  if (!options.fetchImpl) {
    if (!isExplicitLiveFetchRequest(payload)) {
      throw new Error(
        'Phase 4 live fetch is disabled by default. Re-run with liveFetch: true only for intentional smoke tests.',
      );
    }

    if (!options.allowLiveFetch) {
      throw new Error(
        'Phase 4 live fetch is not enabled on this server. Set PHASE4_ENABLE_LIVE_FETCH=true for intentional live fetch smoke tests.',
      );
    }
  }

  const sourceRegistry = options.sourceRegistry ?? getActiveEnglishRssSources();
  const selectedSources = resolveDryRunSources(payload.sourceIds, sourceRegistry);
  const discoveredAt = payload.discoveredAt ?? options.now?.() ?? new Date().toISOString();
  const now = getNow(payload, options.now, discoveredAt);
  const maxItemsPerSource = Math.max(
    1,
    Math.min(payload.maxItemsPerSource ?? DEFAULT_MAX_ITEMS_PER_SOURCE, 20),
  );
  const dryRun = !isExplicitWriteRequest(payload);
  const contentStore = options.contentStore ?? null;

  if (!dryRun) {
    if (!options.allowWrites || !contentStore) {
      throw new Error(
        'Phase 4 write mode requires dryRun: false plus explicit allowWrites and a server-side contentStore.',
      );
    }

    await contentStore.assertSourceIdsExist(selectedSources.map(source => source.id));
  }

  const previewRawItems: RawSourceItemRecord[] = [];
  const signalCandidateRawItems: RawSourceItemRecord[] = [];
  const persistedRawItemIdByPreviewId = new Map<string, string>();
  const sourcePreviews: Phase4IngestionResult['source_previews'] = [];
  const ingestionRuns: Phase4IngestionResult['ingestion_runs'] = [];
  const pendingRuns: PendingRunState[] = [];
  const pendingRunBySourceId = new Map<string, PendingRunState>();

  let fetchedItemCount = 0;
  let normalizedItemCount = 0;
  let insertedItemCount = 0;
  let skippedDuplicateCount = 0;
  let failedItemCount = 0;
  let insertedSignalCount = 0;
  let skippedSignalCount = 0;
  let failedSignalCount = 0;

  for (const source of selectedSources) {
    const pendingRun: PendingRunState = {
      source,
      runRef: null,
      errorMessage: null,
      fetchedCount: 0,
      normalizedCount: 0,
      insertedCount: 0,
      skippedCount: 0,
      failedCount: 0,
    };
    pendingRuns.push(pendingRun);
    pendingRunBySourceId.set(source.id, pendingRun);

    try {
      if (!dryRun) {
        pendingRun.runRef = await contentStore!.createIngestionRun({
          source_id: source.id,
          started_at: now,
        });
      }

      const feed = await fetchSourceFeed(source, options.fetchImpl);
      const feedItems = feed.items.slice(0, maxItemsPerSource);
      pendingRun.fetchedCount = feedItems.length;
      fetchedItemCount += feedItems.length;

      for (const feedItem of feedItems) {
        const normalizedItem = normalizeFeedItem(feed.source, feedItem, discoveredAt);
        const rawItem = mapFeedItemToRawSourceItem(feed.source, normalizedItem, {
          discoveredAt,
          ingestionRunId: pendingRun.runRef?.id ?? null,
        });

        previewRawItems.push(rawItem);
        normalizedItemCount += 1;
        pendingRun.normalizedCount += 1;

        if (dryRun) {
          signalCandidateRawItems.push(rawItem);
          continue;
        }

        try {
          const persistedItem = await persistRawItemAndEntities(
            rawItem,
            contentStore!,
            pendingRun.runRef!.id,
          );
          persistedRawItemIdByPreviewId.set(rawItem.id, persistedItem.raw_source_item_id);
          signalCandidateRawItems.push(rawItem);

          if (persistedItem.inserted) {
            insertedItemCount += 1;
            pendingRun.insertedCount += 1;
          } else {
            skippedDuplicateCount += 1;
            pendingRun.skippedCount += 1;
          }
        } catch (error) {
          failedItemCount += 1;
          pendingRun.failedCount += 1;
          pendingRun.errorMessage = appendErrorMessage(
            pendingRun.errorMessage,
            toErrorMessage(error),
          );
        }
      }
    } catch (error) {
      const message = toErrorMessage(error);
      pendingRun.errorMessage = appendErrorMessage(pendingRun.errorMessage, message);
      if (pendingRun.fetchedCount === 0) {
        pendingRun.failedCount = Math.max(pendingRun.failedCount, 1);
        failedItemCount += 1;
      }
    }
  }

  const dedupeRelationships: Phase4IngestionResult['dedupe_relationships'] = [];
  for (let index = 0; index < previewRawItems.length; index += 1) {
    for (
      let compareIndex = index + 1;
      compareIndex < previewRawItems.length;
      compareIndex += 1
    ) {
      dedupeRelationships.push({
        left_id: previewRawItems[index]!.id,
        right_id: previewRawItems[compareIndex]!.id,
        confidence: compareRawSourceItems(
          previewRawItems[index]!,
          previewRawItems[compareIndex]!,
        ),
      });
    }
  }

  const candidateSignals = generateCandidateSignals(
    dryRun ? previewRawItems : signalCandidateRawItems,
    {
      sourceRegistry: selectedSources,
      now,
    },
  );

  if (!dryRun) {
    for (const candidateSignal of candidateSignals) {
      try {
        const persistedSignal = await persistCandidateSignal(
          candidateSignal,
          contentStore!,
          persistedRawItemIdByPreviewId,
          now,
        );
        if (persistedSignal.created) {
          insertedSignalCount += 1;
        } else {
          skippedSignalCount += 1;
        }
      } catch (error) {
        const message = toErrorMessage(error);
        failedItemCount += 1;
        failedSignalCount += 1;

        for (const sourceId of candidateSignal.source_ids) {
          const pendingRun = pendingRunBySourceId.get(sourceId);
          if (!pendingRun) {
            continue;
          }

          pendingRun.failedCount += 1;
          pendingRun.errorMessage = appendErrorMessage(pendingRun.errorMessage, message);
        }
      }
    }
  }

  const sourceStatuses: IngestionRunStatus[] = [];
  for (const pendingRun of pendingRuns) {
    const status = resolveRunStatus({
      fetched: pendingRun.fetchedCount,
      inserted: pendingRun.insertedCount,
      skipped: pendingRun.skippedCount,
      failed: pendingRun.failedCount,
    });

    let completedAt: string | null = null;
    if (!dryRun && pendingRun.runRef) {
      completedAt = getNow(payload, options.now, new Date().toISOString());
      await contentStore!.finalizeIngestionRun(pendingRun.runRef.id, {
        completed_at: completedAt,
        status,
        items_fetched: pendingRun.fetchedCount,
        items_inserted: pendingRun.insertedCount,
        items_skipped_as_duplicates: pendingRun.skippedCount,
        items_failed: pendingRun.failedCount,
        error_message: pendingRun.errorMessage,
      });

      ingestionRuns.push({
        run_id: pendingRun.runRef.id,
        source_id: pendingRun.source.id,
        status,
        started_at: pendingRun.runRef.started_at,
        completed_at: completedAt,
        items_fetched: pendingRun.fetchedCount,
        items_inserted: pendingRun.insertedCount,
        items_skipped_as_duplicates: pendingRun.skippedCount,
        items_failed: pendingRun.failedCount,
        error_message: pendingRun.errorMessage,
      });
    }

    sourceStatuses.push(status);
    sourcePreviews.push({
      source_id: pendingRun.source.id,
      source_name: pendingRun.source.name,
      status,
      fetched_count: pendingRun.fetchedCount,
      normalized_count: pendingRun.normalizedCount,
      inserted_count: pendingRun.insertedCount,
      skipped_count: pendingRun.skippedCount,
      failed_count: pendingRun.failedCount,
      run_id: pendingRun.runRef?.id ?? null,
      run_status: dryRun ? null : status,
      error_message: pendingRun.errorMessage,
    });
  }

  const overallStatus = resolveBatchStatus(sourceStatuses);

  return {
    dry_run: dryRun,
    writes_disabled: dryRun,
    overall_status: overallStatus,
    selected_source_ids: selectedSources.map(source => source.id),
    fetched_item_count: fetchedItemCount,
    normalized_item_count: normalizedItemCount,
    raw_item_count: previewRawItems.length,
    inserted_item_count: insertedItemCount,
    skipped_duplicate_count: skippedDuplicateCount,
    failed_item_count: failedItemCount,
    dedupe_relationships: dedupeRelationships,
    candidate_signals: candidateSignals,
    source_previews: sourcePreviews,
    ingestion_runs: ingestionRuns,
    write_steps: buildWriteSteps(dryRun),
    summary: {
      overall_status: overallStatus,
      source_count: selectedSources.length,
      candidate_signal_count: candidateSignals.length,
      raw_item_count: previewRawItems.length,
      raw_inserted_count: insertedItemCount,
      raw_skipped_count: skippedDuplicateCount,
      raw_failed_count: failedItemCount,
      signal_inserted_count: insertedSignalCount,
      signal_skipped_count: skippedSignalCount,
      signal_failed_count: failedSignalCount,
      write_mode_enabled: !dryRun,
    },
  };
}

export async function runPhase4DryRun(
  payload: Phase4DryRunRequest,
  options: Phase4IngestionOptions = {},
): Promise<Phase4DryRunPreview> {
  const result = await runPhase4Ingestion(
    {
      ...payload,
      dryRun: true,
    },
    options,
  );

  return result as Phase4DryRunPreview;
}

export function createPhase4IngestionHandler(options: Phase4IngestionOptions = {}) {
  return async (request: Request) => {
    if (request.method !== 'POST') {
      return jsonResponse(
        {
          error: 'Method not allowed. Use POST for the phase4 dry-run preview.',
        },
        405,
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonResponse(
        {
          error: 'Invalid JSON body for the phase4 dry-run preview.',
        },
        400,
      );
    }

    if (isAiEnrichmentRequest(body)) {
      try {
        const preview = await runPhase4AiEnrichment(body, {
          aiEnrichmentStore: options.aiEnrichmentStore,
          aiConfig: options.aiConfig,
          fetchImpl: options.aiFetchImpl,
          now: options.now,
          writeAuthToken: options.writeAuthToken ?? null,
          requestWriteToken: request.headers.get('x-phase4-write-token'),
        });

        return jsonResponse(preview, getAiEnrichmentResponseStatus(preview));
      } catch (error) {
        return jsonResponse(
          {
            error: toErrorMessage(error),
          },
          503,
        );
      }
    }

    const ingestionBody = body as Phase4DryRunRequest;

    if (ingestionBody.dryRun === false) {
      if (!options.allowWrites || !options.contentStore) {
        return jsonResponse(
          buildWriteGuardrailPayload(options, {
            error:
              'Phase 4 write mode is disabled on this server. Keep dryRun: true unless PHASE4_ENABLE_CONTENT_WRITES is intentionally enabled with a server-side content store.',
            code: 'phase4_write_mode_disabled',
          }),
          403,
        );
      }

      if (!options.writeAuthToken) {
        return jsonResponse(
          buildWriteGuardrailPayload(options, {
            error:
              'Phase 4 write mode requires PHASE4_WRITE_AUTH_TOKEN to be configured on the server before dryRun: false requests are allowed.',
            code: 'phase4_write_token_not_configured',
          }),
          503,
        );
      }

      const requestToken = request.headers.get('x-phase4-write-token');
      if (!requestToken) {
        return jsonResponse(
          buildWriteGuardrailPayload(options, {
            error:
              'Phase 4 write mode requires the x-phase4-write-token header as the write token when dryRun is false.',
            code: 'phase4_write_token_missing',
          }),
          403,
        );
      }

      if (requestToken !== options.writeAuthToken) {
        return jsonResponse(
          buildWriteGuardrailPayload(options, {
            error: 'Provided Phase 4 write token does not match server configuration.',
            code: 'phase4_write_token_mismatch',
          }),
          403,
        );
      }
    }

    try {
      const preview = await runPhase4Ingestion(ingestionBody, options);

      return jsonResponse(preview, getWriteResponseStatus(preview));
    } catch (error) {
      return jsonResponse(
        {
          error: toErrorMessage(error),
        },
        503,
      );
    }
  };
}

export function createPhase4DryRunHandler(options: Phase4IngestionOptions = {}) {
  return async (request: Request) => {
    if (request.method !== 'POST') {
      return jsonResponse(
        {
          error: 'Method not allowed. Use POST for the phase4 dry-run preview.',
        },
        405,
      );
    }

    let body: Phase4DryRunRequest;
    try {
      body = (await request.json()) as Phase4DryRunRequest;
    } catch {
      return jsonResponse(
        {
          error: 'Invalid JSON body for the phase4 dry-run preview.',
        },
        400,
      );
    }

    try {
      const preview = await runPhase4DryRun(body, {
        ...options,
        allowWrites: false,
        contentStore: null,
      });

      return jsonResponse(preview, 200);
    } catch (error) {
      return jsonResponse(
        {
          error: toErrorMessage(error),
        },
        503,
      );
    }
  };
}
