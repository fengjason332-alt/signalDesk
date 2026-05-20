import type { Phase4DryRunRequest } from './types';

export interface Phase4SmokeTestRequest extends Phase4DryRunRequest {
  dryRun: boolean;
  liveFetch: boolean;
  maxItemsPerSource: number;
}

export interface Phase4SmokeTestRequestOptions extends Phase4DryRunRequest {}

export const DEFAULT_PHASE4_SMOKE_TEST_REQUEST: Pick<
  Phase4SmokeTestRequest,
  'dryRun' | 'liveFetch' | 'maxItemsPerSource'
> = {
  dryRun: true,
  liveFetch: false,
  maxItemsPerSource: 3,
};

export function buildPhase4SmokeTestRequest(
  options: Phase4SmokeTestRequestOptions = {},
): Phase4SmokeTestRequest {
  return {
    dryRun: options.dryRun ?? DEFAULT_PHASE4_SMOKE_TEST_REQUEST.dryRun,
    liveFetch: options.liveFetch ?? DEFAULT_PHASE4_SMOKE_TEST_REQUEST.liveFetch,
    maxItemsPerSource:
      options.maxItemsPerSource ??
      DEFAULT_PHASE4_SMOKE_TEST_REQUEST.maxItemsPerSource,
    ...(options.sourceIds?.length ? { sourceIds: [...options.sourceIds] } : {}),
    ...(options.discoveredAt ? { discoveredAt: options.discoveredAt } : {}),
    ...(options.now ? { now: options.now } : {}),
  };
}
