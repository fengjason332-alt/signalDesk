import type { Phase4DryRunRequest } from './types';

export const MAX_PHASE4_SCHEDULED_INGESTION_SOURCES = 4;
export const DEFAULT_PHASE4_SCHEDULED_INGESTION_MAX_ITEMS_PER_SOURCE = 2;
export const MAX_PHASE4_SCHEDULED_INGESTION_MAX_ITEMS_PER_SOURCE = 3;
export const DEFAULT_PHASE4_SCHEDULED_INGESTION_CADENCE_MINUTES = 30;

export interface Phase4ScheduledIngestionRequest extends Phase4DryRunRequest {
  intent: 'ingestion';
  triggerMode: 'scheduled';
  dryRun: boolean;
  liveFetch: boolean;
  maxItemsPerSource: number;
  sourceIds: string[];
}

export interface Phase4ScheduledIngestionRequestOptions
  extends Pick<
    Phase4DryRunRequest,
    'sourceIds' | 'dryRun' | 'liveFetch' | 'maxItemsPerSource' | 'discoveredAt' | 'now'
  > {}

export const DEFAULT_PHASE4_SCHEDULED_INGESTION_REQUEST: Pick<
  Phase4ScheduledIngestionRequest,
  'intent' | 'triggerMode' | 'dryRun' | 'liveFetch' | 'maxItemsPerSource'
> = {
  intent: 'ingestion',
  triggerMode: 'scheduled',
  dryRun: true,
  liveFetch: true,
  maxItemsPerSource: DEFAULT_PHASE4_SCHEDULED_INGESTION_MAX_ITEMS_PER_SOURCE,
};

const uniqueSourceIds = (sourceIds: string[]) => {
  const seen = new Set<string>();
  const values: string[] = [];

  for (const sourceId of sourceIds) {
    const normalizedSourceId = sourceId.trim();
    if (!normalizedSourceId || seen.has(normalizedSourceId)) {
      continue;
    }

    seen.add(normalizedSourceId);
    values.push(normalizedSourceId);
  }

  return values;
};

export function buildPhase4ScheduledIngestionRequest(
  options: Phase4ScheduledIngestionRequestOptions,
): Phase4ScheduledIngestionRequest {
  const sourceIds = uniqueSourceIds(options.sourceIds ?? []).slice(
    0,
    MAX_PHASE4_SCHEDULED_INGESTION_SOURCES,
  );

  if (sourceIds.length === 0) {
    throw new Error(
      'buildPhase4ScheduledIngestionRequest requires at least one explicit sourceId for operator-safe recurring runs.',
    );
  }

  return {
    intent: 'ingestion',
    triggerMode: 'scheduled',
    dryRun: options.dryRun ?? DEFAULT_PHASE4_SCHEDULED_INGESTION_REQUEST.dryRun,
    liveFetch:
      options.liveFetch ?? DEFAULT_PHASE4_SCHEDULED_INGESTION_REQUEST.liveFetch,
    maxItemsPerSource: Math.max(
      1,
      Math.min(
        options.maxItemsPerSource ??
          DEFAULT_PHASE4_SCHEDULED_INGESTION_REQUEST.maxItemsPerSource,
        MAX_PHASE4_SCHEDULED_INGESTION_MAX_ITEMS_PER_SOURCE,
      ),
    ),
    sourceIds,
    ...(options.discoveredAt ? { discoveredAt: options.discoveredAt } : {}),
    ...(options.now ? { now: options.now } : {}),
  };
}
