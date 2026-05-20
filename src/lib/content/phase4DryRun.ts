import { compareRawSourceItems } from './dedupe';
import {
  fetchSourceFeed,
  mapFeedItemToRawSourceItem,
  normalizeFeedItem,
} from './rss';
import { generateCandidateSignals } from './signalGeneration';
import { getActiveEnglishRssSources } from './sourceRegistry';
import type {
  Phase4ContentEntityUpsert,
  Phase4ContentStore,
  Phase4RawItemEntityLinkUpsert,
  Phase4RawSourceItemWriteInput,
} from './supabaseContentStore';
import { CONTENT_ENTITY_CATALOG, mapTopicsAndEntities } from './topicEntityMapping';
import type {
  DeterministicEntityMatch,
  IngestionRunStatus,
  Phase4DryRunPreview,
  Phase4DryRunRequest,
  Phase4IngestionResult,
  RawSourceItemRecord,
  SourceRegistryEntry,
} from './types';

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
  contentStore?: Phase4ContentStore | null;
}

const DEFAULT_MAX_ITEMS_PER_SOURCE = 5;

const WRITE_STEP_ENABLEMENT = {
  insert_raw_source_items: true,
  upsert_content_entities: true,
  insert_raw_source_item_entities: true,
  insert_intelligence_signals: false,
  insert_signal_source_items: false,
  insert_signal_entities: false,
  insert_signal_topics: false,
} as const;

const WRITE_STEP_ORDER = Object.keys(WRITE_STEP_ENABLEMENT) as Array<
  keyof typeof WRITE_STEP_ENABLEMENT
>;

const COUNTRY_CODE_BY_ENTITY_NAME: Record<string, string> = {
  China: 'CN',
  Australia: 'AU',
};

const isExplicitWriteRequest = (payload: Phase4DryRunRequest) => payload.dryRun === false;

const getNow = (payload: Phase4DryRunRequest, now: (() => string) | undefined, fallback: string) =>
  payload.now ?? now?.() ?? fallback;

const buildWriteSteps = (dryRun: boolean) =>
  WRITE_STEP_ORDER.map(step => ({
    step,
    enabled: dryRun ? false : WRITE_STEP_ENABLEMENT[step],
  }));

const toErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Phase 4 ingestion failed.';

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
  if (!options.fetchImpl && !options.allowLiveFetch) {
    throw new Error(
      'Phase 4 dry-run live fetch is disabled by default. Provide a fetch implementation or explicitly enable live fetch.',
    );
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
  const sourcePreviews: Phase4IngestionResult['source_previews'] = [];
  const ingestionRuns: Phase4IngestionResult['ingestion_runs'] = [];

  let fetchedItemCount = 0;
  let normalizedItemCount = 0;
  let insertedItemCount = 0;
  let skippedDuplicateCount = 0;
  let failedItemCount = 0;

  for (const source of selectedSources) {
    let runRef:
      | {
          id: string;
          source_id: string;
          started_at: string;
        }
      | null = null;
    let runCompletedAt: string | null = null;
    let sourceErrorMessage: string | null = null;
    let sourceFetchedCount = 0;
    let sourceNormalizedCount = 0;
    let sourceInsertedCount = 0;
    let sourceSkippedCount = 0;
    let sourceFailedCount = 0;

    try {
      if (!dryRun) {
        runRef = await contentStore!.createIngestionRun({
          source_id: source.id,
          started_at: now,
        });
      }

      const feed = await fetchSourceFeed(source, options.fetchImpl);
      const feedItems = feed.items.slice(0, maxItemsPerSource);
      sourceFetchedCount = feedItems.length;
      fetchedItemCount += feedItems.length;

      for (const feedItem of feedItems) {
        const normalizedItem = normalizeFeedItem(feed.source, feedItem, discoveredAt);
        const rawItem = mapFeedItemToRawSourceItem(feed.source, normalizedItem, {
          discoveredAt,
          ingestionRunId: runRef?.id ?? null,
        });

        previewRawItems.push(rawItem);
        normalizedItemCount += 1;
        sourceNormalizedCount += 1;

        if (dryRun) {
          continue;
        }

        try {
          const persistedItem = await persistRawItemAndEntities(
            rawItem,
            contentStore!,
            runRef!.id,
          );

          if (persistedItem.inserted) {
            insertedItemCount += 1;
            sourceInsertedCount += 1;
          } else {
            skippedDuplicateCount += 1;
            sourceSkippedCount += 1;
          }
        } catch (error) {
          failedItemCount += 1;
          sourceFailedCount += 1;
          sourceErrorMessage ??= toErrorMessage(error);
        }
      }
    } catch (error) {
      if (dryRun) {
        throw error;
      }

      const message = toErrorMessage(error);
      sourceErrorMessage = sourceErrorMessage ?? message;
      if (sourceFetchedCount === 0) {
        sourceFailedCount = Math.max(sourceFailedCount, 1);
        failedItemCount += 1;
      }
    }

    if (!dryRun && runRef) {
      const status = resolveRunStatus({
        fetched: sourceFetchedCount,
        inserted: sourceInsertedCount,
        skipped: sourceSkippedCount,
        failed: sourceFailedCount,
      });

      runCompletedAt = getNow(payload, options.now, new Date().toISOString());
      await contentStore!.finalizeIngestionRun(runRef.id, {
        completed_at: runCompletedAt,
        status,
        items_fetched: sourceFetchedCount,
        items_inserted: sourceInsertedCount,
        items_skipped_as_duplicates: sourceSkippedCount,
        items_failed: sourceFailedCount,
        error_message: sourceErrorMessage,
      });

      ingestionRuns.push({
        run_id: runRef.id,
        source_id: source.id,
        status,
        started_at: runRef.started_at,
        completed_at: runCompletedAt,
        items_fetched: sourceFetchedCount,
        items_inserted: sourceInsertedCount,
        items_skipped_as_duplicates: sourceSkippedCount,
        items_failed: sourceFailedCount,
        error_message: sourceErrorMessage,
      });
    }

    sourcePreviews.push({
      source_id: source.id,
      source_name: source.name,
      fetched_count: sourceFetchedCount,
      normalized_count: sourceNormalizedCount,
      inserted_count: sourceInsertedCount,
      skipped_count: sourceSkippedCount,
      failed_count: sourceFailedCount,
      run_id: runRef?.id ?? null,
      run_status: ingestionRuns.find(run => run.run_id === runRef?.id)?.status ?? null,
      error_message: sourceErrorMessage,
    });
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

  const candidateSignals = generateCandidateSignals(previewRawItems, {
    sourceRegistry: selectedSources,
    now,
  });

  return {
    dry_run: dryRun,
    writes_disabled: dryRun,
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
      return new Response(
        JSON.stringify({
          error: 'Method not allowed. Use POST for the phase4 dry-run preview.',
        }),
        {
          status: 405,
          headers: {
            'content-type': 'application/json',
          },
        },
      );
    }

    let body: Phase4DryRunRequest;
    try {
      body = (await request.json()) as Phase4DryRunRequest;
    } catch {
      return new Response(
        JSON.stringify({
          error: 'Invalid JSON body for the phase4 dry-run preview.',
        }),
        {
          status: 400,
          headers: {
            'content-type': 'application/json',
          },
        },
      );
    }

    try {
      const preview = await runPhase4Ingestion(body, options);

      return new Response(JSON.stringify(preview), {
        status: 200,
        headers: {
          'content-type': 'application/json',
        },
      });
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: toErrorMessage(error),
        }),
        {
          status: 503,
          headers: {
            'content-type': 'application/json',
          },
        },
      );
    }
  };
}

export function createPhase4DryRunHandler(options: Phase4IngestionOptions = {}) {
  return async (request: Request) => {
    if (request.method !== 'POST') {
      return new Response(
        JSON.stringify({
          error: 'Method not allowed. Use POST for the phase4 dry-run preview.',
        }),
        {
          status: 405,
          headers: {
            'content-type': 'application/json',
          },
        },
      );
    }

    let body: Phase4DryRunRequest;
    try {
      body = (await request.json()) as Phase4DryRunRequest;
    } catch {
      return new Response(
        JSON.stringify({
          error: 'Invalid JSON body for the phase4 dry-run preview.',
        }),
        {
          status: 400,
          headers: {
            'content-type': 'application/json',
          },
        },
      );
    }

    try {
      const preview = await runPhase4DryRun(body, {
        ...options,
        allowWrites: false,
        contentStore: null,
      });

      return new Response(JSON.stringify(preview), {
        status: 200,
        headers: {
          'content-type': 'application/json',
        },
      });
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: toErrorMessage(error),
        }),
        {
          status: 503,
          headers: {
            'content-type': 'application/json',
          },
        },
      );
    }
  };
}
