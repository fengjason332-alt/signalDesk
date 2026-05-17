import { compareRawSourceItems } from './dedupe';
import { fetchSourceFeed, mapFeedItemToRawSourceItem, normalizeFeedItem } from './rss';
import { generateCandidateSignals } from './signalGeneration';
import { getActiveEnglishRssSources } from './sourceRegistry';
import type {
  Phase4DryRunPreview,
  Phase4DryRunRequest,
  SourceRegistryEntry,
} from './types';

interface FetchResponseLike {
  ok: boolean;
  status: number;
  text: () => Promise<string>;
}

type FetchLike = (url: string) => Promise<FetchResponseLike>;
const DEFAULT_MAX_ITEMS_PER_SOURCE = 5;

export function resolveDryRunSources(
  sourceIds: string[] | undefined,
  sourceRegistry: SourceRegistryEntry[],
) {
  const selectedIds = sourceIds?.length ? new Set(sourceIds) : null;
  return sourceRegistry.filter(source => (selectedIds ? selectedIds.has(source.id) : source.active));
}

export async function runPhase4DryRun(
  payload: Phase4DryRunRequest,
  options: {
    sourceRegistry?: SourceRegistryEntry[];
    fetchImpl?: FetchLike;
    allowLiveFetch?: boolean;
    now?: () => string;
  } = {},
): Promise<Phase4DryRunPreview> {
  if (!options.fetchImpl && !options.allowLiveFetch) {
    throw new Error(
      'Phase 4 dry-run live fetch is disabled by default. Provide a fetch implementation or explicitly enable live fetch.',
    );
  }

  const sourceRegistry = options.sourceRegistry ?? getActiveEnglishRssSources();
  const selectedSources = resolveDryRunSources(payload.sourceIds, sourceRegistry);
  const discoveredAt = payload.discoveredAt ?? options.now?.() ?? new Date().toISOString();
  const now = payload.now ?? options.now?.() ?? discoveredAt;
  const maxItemsPerSource = Math.max(
    1,
    Math.min(payload.maxItemsPerSource ?? DEFAULT_MAX_ITEMS_PER_SOURCE, 20),
  );

  const feeds = await Promise.all(
    selectedSources.map(source => fetchSourceFeed(source, options.fetchImpl)),
  );
  const limitedFeeds = feeds.map(feed => ({
    ...feed,
    items: feed.items.slice(0, maxItemsPerSource),
  }));

  const normalizedItems = limitedFeeds.flatMap(feed =>
    feed.items.map(item => normalizeFeedItem(feed.source, item, discoveredAt)),
  );

  const rawItems = limitedFeeds.flatMap(feed =>
    feed.items.map(item =>
        mapFeedItemToRawSourceItem(
          feed.source,
          normalizeFeedItem(feed.source, item, discoveredAt),
          {
            discoveredAt,
            ingestionRunId: null,
          },
        ),
      ),
  );

  const dedupeRelationships: Phase4DryRunPreview['dedupe_relationships'] = [];
  for (let index = 0; index < rawItems.length; index += 1) {
    for (let compareIndex = index + 1; compareIndex < rawItems.length; compareIndex += 1) {
      dedupeRelationships.push({
        left_id: rawItems[index]!.id,
        right_id: rawItems[compareIndex]!.id,
        confidence: compareRawSourceItems(rawItems[index]!, rawItems[compareIndex]!),
      });
    }
  }

  const candidateSignals = generateCandidateSignals(rawItems, {
    sourceRegistry: selectedSources,
    now,
  });

  return {
    dry_run: true,
    writes_disabled: true,
    selected_source_ids: selectedSources.map(source => source.id),
    fetched_item_count: limitedFeeds.reduce((sum, feed) => sum + feed.items.length, 0),
    normalized_item_count: normalizedItems.length,
    raw_item_count: rawItems.length,
    dedupe_relationships: dedupeRelationships,
    candidate_signals: candidateSignals,
    source_previews: limitedFeeds.map(feed => ({
      source_id: feed.source.id,
      source_name: feed.source.name,
      fetched_count: feed.items.length,
      normalized_count: feed.items.length,
    })),
    write_steps: [
      {
        step: 'insert_raw_source_items',
        enabled: false,
      },
      {
        step: 'upsert_content_entities',
        enabled: false,
      },
      {
        step: 'insert_raw_source_item_entities',
        enabled: false,
      },
      {
        step: 'insert_intelligence_signals',
        enabled: false,
      },
      {
        step: 'insert_signal_source_items',
        enabled: false,
      },
      {
        step: 'insert_signal_entities',
        enabled: false,
      },
      {
        step: 'insert_signal_topics',
        enabled: false,
      },
    ],
  };
}

export function createPhase4DryRunHandler(options: {
  sourceRegistry?: SourceRegistryEntry[];
  fetchImpl?: FetchLike;
  allowLiveFetch?: boolean;
  now?: () => string;
} = {}) {
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
      const preview = await runPhase4DryRun(body, options);

      return new Response(JSON.stringify(preview), {
        status: 200,
        headers: {
          'content-type': 'application/json',
        },
      });
    } catch (error) {
      return new Response(
        JSON.stringify({
          error:
            error instanceof Error
              ? error.message
              : 'Phase 4 dry-run failed.',
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
