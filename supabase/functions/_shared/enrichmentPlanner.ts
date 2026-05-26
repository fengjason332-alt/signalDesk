import type { ContentLanguage, EnrichmentStatus } from './types.ts';

export const AI_ENRICHMENT_TRIGGER_MODES = ['manual', 'scheduled'] as const;
export type AiEnrichmentTriggerMode =
  (typeof AI_ENRICHMENT_TRIGGER_MODES)[number];

export const DEFAULT_AI_ENRICHMENT_VERSION = 1;
export const DEFAULT_AI_ENRICHMENT_MAX_SIGNALS_PER_RUN = 5;
export const MAX_AI_ENRICHMENT_SIGNALS_PER_RUN = 10;
export const DEFAULT_AI_ENRICHMENT_MAX_SOURCE_ITEMS_PER_SIGNAL = 3;
export const DEFAULT_AI_ENRICHMENT_MAX_INPUT_CHARS = 12000;
export const DEFAULT_AI_ENRICHMENT_MAX_RETRY_ATTEMPTS = 2;
export const DEFAULT_AI_ENRICHMENT_RETRY_BACKOFF_MINUTES = 30;

const PREVIEW_SIGNAL_LIFECYCLE_STAGES = new Set([
  'candidate_preview',
  'candidate',
  'draft',
] as const);
const TARGET_LANGUAGE_SET = new Set<ContentLanguage>(['en', 'zh']);

export interface AiEnrichmentCandidateSignalRow {
  id: string;
  lifecycle_stage: string | null;
  generation_status: string | null;
  enrichment_status?: EnrichmentStatus | null;
  enrichment_version?: number | null;
  summary_status?: EnrichmentStatus | null;
  translation_status?: EnrichmentStatus | null;
  source_language?: ContentLanguage | null;
  target_languages?: ContentLanguage[] | null;
  last_enriched_at?: string | null;
  enrichment_claim_expires_at?: string | null;
  enrichment_attempt_count?: number | null;
  enrichment_next_retry_at?: string | null;
}

export interface AiEnrichmentJobPlanOptions {
  dryRun?: boolean;
  allowWrites?: boolean;
  triggerMode?: AiEnrichmentTriggerMode;
  targetEnrichmentVersion?: number;
  targetLanguages?: ContentLanguage[];
  maxSignalsPerRun?: number;
  maxSourceItemsPerSignal?: number;
  maxInputChars?: number;
  maxRetryAttempts?: number;
  retryBackoffMinutes?: number;
  requestedSignalIds?: string[];
  force?: boolean;
  now?: string;
}

export interface AiEnrichmentSelectionPolicy {
  allowedLifecycleStages: string[];
  excludeGenerationStatus: string[];
  skipPendingSignals: boolean;
  skipAlreadyCompletedVersion: boolean;
  requiresExplicitSignalIdsForWriteMode: boolean;
}

export interface AiEnrichmentRetryPolicy {
  maxAttemptsPerSignal: number;
  backoffMinutes: number;
  retryableStatuses: EnrichmentStatus[];
}

export interface AiEnrichmentCostControls {
  maxSignalsPerRun: number;
  maxSourceItemsPerSignal: number;
  maxInputChars: number;
}

export interface AiEnrichmentJobPlan {
  dryRun: boolean;
  writesEnabled: boolean;
  currentTimeIso: string;
  triggerMode: AiEnrichmentTriggerMode;
  targetEnrichmentVersion: number;
  targetLanguages: ContentLanguage[];
  requestedSignalIds: string[];
  force: boolean;
  selectionPolicy: AiEnrichmentSelectionPolicy;
  retryPolicy: AiEnrichmentRetryPolicy;
  costControls: AiEnrichmentCostControls;
}

export interface AiEnrichmentCandidateDecision {
  shouldEnrich: boolean;
  reason:
    | 'eligible'
    | 'not_preview_lifecycle'
    | 'generation_failed'
    | 'already_claimed'
    | 'already_pending'
    | 'already_completed_for_version'
    | 'translation_complete_for_targets'
    | 'retry_backoff_active'
    | 'retry_attempt_limit_reached';
}

export interface AiEnrichmentWriteGateResult {
  allowed: boolean;
  reason: 'allowed' | 'dry_run' | 'writes_disabled' | 'missing_signal_ids';
}

const normalizeText = (value: string | null | undefined) => value?.trim() ?? '';

const normalizeTargetLanguages = (values: ContentLanguage[] | null | undefined) => {
  const deduped = new Set<ContentLanguage>();
  for (const value of values ?? []) {
    if (TARGET_LANGUAGE_SET.has(value)) {
      deduped.add(value);
    }
  }

  return [...deduped];
};

const normalizeMaxSignalsPerRun = (value: number | undefined) => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return DEFAULT_AI_ENRICHMENT_MAX_SIGNALS_PER_RUN;
  }

  return Math.min(
    Math.max(1, Math.trunc(value)),
    MAX_AI_ENRICHMENT_SIGNALS_PER_RUN,
  );
};

const normalizePositiveInteger = (value: number | undefined, fallback: number) => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return fallback;
  }

  return Math.max(1, Math.trunc(value));
};

const parseTimestamp = (value: string | null | undefined) => {
  const normalized = normalizeText(value);
  if (!normalized) {
    return null;
  }

  const timestamp = Date.parse(normalized);
  return Number.isFinite(timestamp) ? timestamp : null;
};

export function createAiEnrichmentJobPlan(
  options: AiEnrichmentJobPlanOptions = {},
): AiEnrichmentJobPlan {
  const dryRun = options.dryRun !== false;

  return {
    dryRun,
    writesEnabled: !dryRun && Boolean(options.allowWrites),
    currentTimeIso: options.now ?? new Date().toISOString(),
    triggerMode: options.triggerMode ?? 'manual',
    targetEnrichmentVersion:
      options.targetEnrichmentVersion ?? DEFAULT_AI_ENRICHMENT_VERSION,
    targetLanguages: normalizeTargetLanguages(options.targetLanguages ?? ['zh']),
    requestedSignalIds: [...(options.requestedSignalIds ?? [])],
    force: options.force === true,
    selectionPolicy: {
      allowedLifecycleStages: [...PREVIEW_SIGNAL_LIFECYCLE_STAGES],
      excludeGenerationStatus: ['failed'],
      skipPendingSignals: true,
      skipAlreadyCompletedVersion: true,
      requiresExplicitSignalIdsForWriteMode: true,
    },
    retryPolicy: {
      maxAttemptsPerSignal: normalizePositiveInteger(
        options.maxRetryAttempts,
        DEFAULT_AI_ENRICHMENT_MAX_RETRY_ATTEMPTS,
      ),
      backoffMinutes: normalizePositiveInteger(
        options.retryBackoffMinutes,
        DEFAULT_AI_ENRICHMENT_RETRY_BACKOFF_MINUTES,
      ),
      retryableStatuses: ['failed', 'skipped'],
    },
    costControls: {
      maxSignalsPerRun: normalizeMaxSignalsPerRun(options.maxSignalsPerRun),
      maxSourceItemsPerSignal: normalizePositiveInteger(
        options.maxSourceItemsPerSignal,
        DEFAULT_AI_ENRICHMENT_MAX_SOURCE_ITEMS_PER_SIGNAL,
      ),
      maxInputChars: normalizePositiveInteger(
        options.maxInputChars,
        DEFAULT_AI_ENRICHMENT_MAX_INPUT_CHARS,
      ),
    },
  };
}

export function evaluateAiEnrichmentWriteGate(
  plan: AiEnrichmentJobPlan,
): AiEnrichmentWriteGateResult {
  if (plan.dryRun) {
    return { allowed: false, reason: 'dry_run' };
  }

  if (!plan.writesEnabled) {
    return { allowed: false, reason: 'writes_disabled' };
  }

  if (plan.requestedSignalIds.length === 0) {
    return { allowed: false, reason: 'missing_signal_ids' };
  }

  return { allowed: true, reason: 'allowed' };
}

const hasCompletedTargets = (
  row: AiEnrichmentCandidateSignalRow,
  targetLanguages: ContentLanguage[],
) => {
  if ((row.translation_status ?? 'not_requested') !== 'completed') {
    return false;
  }

  const completedTargets = normalizeTargetLanguages(row.target_languages);
  return targetLanguages.every(language => completedTargets.includes(language));
};

export function shouldEnrichCandidateSignal(
  row: AiEnrichmentCandidateSignalRow,
  plan: AiEnrichmentJobPlan,
): AiEnrichmentCandidateDecision {
  if (!PREVIEW_SIGNAL_LIFECYCLE_STAGES.has(row.lifecycle_stage as never)) {
    return { shouldEnrich: false, reason: 'not_preview_lifecycle' };
  }

  if (normalizeText(row.generation_status).toLowerCase() === 'failed') {
    return { shouldEnrich: false, reason: 'generation_failed' };
  }

  if (!plan.force) {
    const claimExpiresAt = parseTimestamp(row.enrichment_claim_expires_at);
    const now = parseTimestamp(plan.currentTimeIso);
    if (claimExpiresAt !== null && now !== null && claimExpiresAt > now) {
      return { shouldEnrich: false, reason: 'already_claimed' };
    }
  }

  if (!plan.force && row.enrichment_status === 'pending') {
    return { shouldEnrich: false, reason: 'already_pending' };
  }

  if (
    !plan.force &&
    row.enrichment_version === plan.targetEnrichmentVersion &&
    row.summary_status === 'completed' &&
    hasCompletedTargets(row, plan.targetLanguages)
  ) {
    return { shouldEnrich: false, reason: 'already_completed_for_version' };
  }

  if (!plan.force && row.enrichment_status === 'failed') {
    const now = parseTimestamp(plan.currentTimeIso);
    const nextRetryAt = parseTimestamp(row.enrichment_next_retry_at);
    if (nextRetryAt !== null && now !== null && nextRetryAt > now) {
      return { shouldEnrich: false, reason: 'retry_backoff_active' };
    }

    const attemptCount =
      typeof row.enrichment_attempt_count === 'number'
        ? row.enrichment_attempt_count
        : 0;
    if (attemptCount >= plan.retryPolicy.maxAttemptsPerSignal) {
      return { shouldEnrich: false, reason: 'retry_attempt_limit_reached' };
    }

    const lastEnrichedAt = parseTimestamp(row.last_enriched_at);
    if (lastEnrichedAt !== null && now !== null) {
      const backoffWindowMs = plan.retryPolicy.backoffMinutes * 60 * 1000;
      if (now - lastEnrichedAt < backoffWindowMs) {
        return { shouldEnrich: false, reason: 'retry_backoff_active' };
      }
    }
  }

  return { shouldEnrich: true, reason: 'eligible' };
}
