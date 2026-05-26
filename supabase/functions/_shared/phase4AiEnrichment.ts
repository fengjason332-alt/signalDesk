import {
  createNoopAiEnrichmentProvider,
  type AiCombinedEnrichmentPayload,
  type AiEnrichmentProvider,
  type AiEnrichmentProviderName,
  type AiEnrichmentSignalInput,
  type AiEnrichmentTargetLanguage,
  type AiEnrichmentTokenUsage,
} from './enrichmentProvider.ts';
import {
  createAiEnrichmentJobPlan,
  shouldEnrichCandidateSignal,
  type AiEnrichmentJobPlan,
} from './enrichmentPlanner.ts';
import {
  type Phase4AiEnrichmentCandidateRecord,
  type Phase4AiEnrichmentClaimResult,
  type Phase4AiEnrichmentReadbackRecord,
  type Phase4AiEnrichmentFailurePatch,
  type Phase4AiEnrichmentStore,
  type Phase4AiEnrichmentWritePatch,
} from './enrichmentStore.ts';
import { createDeepSeekAiEnrichmentProvider } from './deepseekProvider.ts';
import type { ContentLanguage } from './types.ts';

interface FetchResponseLike {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
  text: () => Promise<string>;
}

type FetchLike = (
  url: string,
  init?: RequestInit,
) => Promise<FetchResponseLike>;

export interface Phase4AiEnrichmentRequest {
  provider?: AiEnrichmentProviderName;
  signalIds?: string[];
  maxSignals?: number;
  targetLanguages?: ContentLanguage[];
  force?: boolean;
  writeMode?: boolean;
}

export interface Phase4AiEnrichmentRequestEnvelope {
  dryRun?: boolean;
  aiEnrichment?: Phase4AiEnrichmentRequest | null;
}

export interface Phase4AiEnrichmentServerConfig {
  provider: AiEnrichmentProviderName;
  enabled: boolean;
  dryRunOnly: boolean;
  deepseekApiKey?: string;
  deepseekBaseUrl: string;
  deepseekModel: string;
}

type Phase4AiEnrichmentErrorCode =
  | 'provider_not_configured'
  | 'ai_enrichment_disabled'
  | 'ai_dry_run_only'
  | 'ai_store_not_configured'
  | 'unsupported_provider'
  | 'ai_write_requires_dry_run_false'
  | 'ai_write_mode_required'
  | 'ai_write_token_not_configured'
  | 'ai_write_token_missing'
  | 'ai_write_token_mismatch'
  | 'ai_write_signal_limit_exceeded'
  | 'ai_write_signal_ids_limit_exceeded';

type Phase4AiEnrichmentSkippedReason =
  | 'proposed'
  | 'written'
  | 'provider_not_configured'
  | 'provider_disabled'
  | 'unsupported_provider'
  | 'skipped_claimed'
  | 'already_pending'
  | 'already_completed_for_version'
  | 'retry_backoff_active'
  | 'retry_attempt_limit_reached'
  | 'not_preview_lifecycle'
  | 'generation_failed'
  | 'invalid_output'
  | 'provider_failed'
  | 'skipped_existing_enrichment';

type Phase4AiClaimStatus =
  | 'claimed'
  | 'skipped_claimed'
  | 'skipped_existing_enrichment'
  | 'retry_backoff_active'
  | 'retry_attempt_limit_reached'
  | 'not_preview_lifecycle'
  | 'generation_failed'
  | 'not_attempted'
  | 'claim_failed';

export interface Phase4AiEnrichmentDryRunSignalResult {
  signal_id: string;
  status: 'completed' | 'skipped' | 'failed';
  reason: Phase4AiEnrichmentSkippedReason;
  provider: AiEnrichmentProviderName;
  model: string | null;
  proposed_output: AiCombinedEnrichmentPayload | null;
  token_usage: AiEnrichmentTokenUsage | null;
  error_message: string | null;
}

export interface Phase4AiEnrichmentDryRunResponse {
  dry_run: true;
  provider: AiEnrichmentProviderName;
  model: string | null;
  code?: Phase4AiEnrichmentErrorCode;
  error?: string;
  no_writes_performed: true;
  write_mode_enabled: false;
  requested_signal_ids: string[];
  selected_signal_count: number;
  proposed_outputs: Phase4AiEnrichmentDryRunSignalResult[];
  proposed_count: number;
  skipped_count: number;
  failed_count: number;
  approximate_prompt_tokens: number;
  approximate_completion_tokens: number;
  approximate_total_tokens: number;
}

type Phase4AiValidationStatus = 'passed' | 'failed' | 'not_attempted';
type Phase4AiWriteStatus =
  | 'written'
  | 'skipped_existing_enrichment'
  | 'not_attempted'
  | 'failed';
type Phase4AiReadbackStatus = 'loaded' | 'missing' | 'not_attempted' | 'failed';
type Phase4AiWriteOverallStatus =
  | 'completed'
  | 'partial_success'
  | 'failed'
  | 'skipped';
type Phase4AiWriteReason = Phase4AiEnrichmentSkippedReason | 'written';

export interface Phase4AiEnrichmentWriteSignalResult {
  signal_id: string;
  status: 'completed' | 'skipped' | 'failed';
  reason: Phase4AiWriteReason;
  skipped_reason: Phase4AiEnrichmentSkippedReason | null;
  provider: AiEnrichmentProviderName;
  model: string | null;
  claim_status: Phase4AiClaimStatus;
  provider_status: 'completed' | 'failed' | 'skipped' | 'not_called';
  validation_status: Phase4AiValidationStatus;
  write_status: Phase4AiWriteStatus;
  readback_status: Phase4AiReadbackStatus;
  error_code: string | null;
  enrichment_status_after_write: string | null;
  last_enriched_at_after_write: string | null;
  readback: Phase4AiEnrichmentReadbackRecord | null;
  proposed_output: AiCombinedEnrichmentPayload | null;
  token_usage: AiEnrichmentTokenUsage | null;
  error_message: string | null;
}

export interface Phase4AiEnrichmentWriteResponse {
  dry_run: false;
  run_id: string;
  overall_status: Phase4AiWriteOverallStatus;
  provider: AiEnrichmentProviderName;
  model: string | null;
  code?: Phase4AiEnrichmentErrorCode;
  error?: string;
  no_writes_performed: boolean;
  write_mode_enabled: true;
  requested_signal_ids: string[];
  selected_signal_count: number;
  proposed_outputs: Phase4AiEnrichmentWriteSignalResult[];
  proposed_count: number;
  written_count: number;
  skipped_count: number;
  failed_count: number;
  approximate_prompt_tokens: number;
  approximate_completion_tokens: number;
  approximate_total_tokens: number;
}

export type Phase4AiEnrichmentResponse =
  | Phase4AiEnrichmentDryRunResponse
  | Phase4AiEnrichmentWriteResponse;

export interface Phase4AiEnrichmentRuntimeOptions {
  aiEnrichmentStore?: Phase4AiEnrichmentStore | null;
  aiConfig?: Phase4AiEnrichmentServerConfig | null;
  fetchImpl?: FetchLike;
  now?: () => string;
  writeAuthToken?: string | null;
  requestWriteToken?: string | null;
}

const DEFAULT_DEEPSEEK_BASE_URL = 'https://api.deepseek.com';
const DEFAULT_DEEPSEEK_MODEL = 'deepseek-chat';
const MAX_AI_WRITE_MODE_SIGNALS = 3;
const DEFAULT_AI_ENRICHMENT_CLAIM_TTL_SECONDS = 10 * 60;

const normalizeText = (value: string | null | undefined) => value?.trim() ?? '';

const normalizeStringArray = (values: string[] | null | undefined) =>
  Array.isArray(values)
    ? values
        .map(value => normalizeText(value))
        .filter(Boolean)
    : [];

const normalizeTargetLanguages = (
  values: ContentLanguage[] | undefined,
): ContentLanguage[] => {
  const deduped = new Set<ContentLanguage>();
  for (const value of values ?? []) {
    if (value === 'en' || value === 'zh') {
      deduped.add(value);
    }
  }

  return [...deduped];
};

const isAiEnrichmentProvider = (
  value: string | null | undefined,
): value is AiEnrichmentProviderName => value === 'noop' || value === 'deepseek';

const getRequestConfig = (request: Phase4AiEnrichmentRequestEnvelope) => ({
  provider:
    isAiEnrichmentProvider(request.aiEnrichment?.provider)
      ? request.aiEnrichment.provider
      : 'noop',
  signalIds: [...(request.aiEnrichment?.signalIds ?? [])],
  maxSignals: request.aiEnrichment?.maxSignals,
  targetLanguages: normalizeTargetLanguages(request.aiEnrichment?.targetLanguages),
  force: request.aiEnrichment?.force === true,
  writeMode: request.aiEnrichment?.writeMode === true,
});

const buildDryRunErrorResponse = (
  provider: AiEnrichmentProviderName,
  model: string | null,
  code: Phase4AiEnrichmentErrorCode,
  error: string,
  requestedSignalIds: string[],
): Phase4AiEnrichmentDryRunResponse => ({
  dry_run: true,
  provider,
  model,
  code,
  error,
  no_writes_performed: true,
  write_mode_enabled: false,
  requested_signal_ids: requestedSignalIds,
  selected_signal_count: 0,
  proposed_outputs: [],
  proposed_count: 0,
  skipped_count: 0,
  failed_count: 1,
  approximate_prompt_tokens: 0,
  approximate_completion_tokens: 0,
  approximate_total_tokens: 0,
});

const buildWriteErrorResponse = (
  runId: string,
  provider: AiEnrichmentProviderName,
  model: string | null,
  code: Phase4AiEnrichmentErrorCode,
  error: string,
  requestedSignalIds: string[],
): Phase4AiEnrichmentWriteResponse => ({
  dry_run: false,
  run_id: runId,
  overall_status: 'failed',
  provider,
  model,
  code,
  error,
  no_writes_performed: true,
  write_mode_enabled: true,
  requested_signal_ids: requestedSignalIds,
  selected_signal_count: 0,
  proposed_outputs: [],
  proposed_count: 0,
  written_count: 0,
  skipped_count: 0,
  failed_count: 1,
  approximate_prompt_tokens: 0,
  approximate_completion_tokens: 0,
  approximate_total_tokens: 0,
});

const buildSignalInput = (
  record: Phase4AiEnrichmentCandidateRecord,
  plan: AiEnrichmentJobPlan,
): AiEnrichmentSignalInput => ({
  signal_id: record.signal_id,
  primary_category: record.primary_category,
  categories: [...record.categories],
  headline_en: record.headline_en,
  headline_zh: record.headline_zh,
  summary_en: record.summary_en,
  summary_zh: record.summary_zh,
  why_it_matters_en: [...record.why_it_matters_en],
  why_it_matters_zh: [...record.why_it_matters_zh],
  tags: [...record.tags],
  source_language: record.source_language,
  target_languages: (plan.targetLanguages.length
    ? plan.targetLanguages
    : ['zh']) as AiEnrichmentTargetLanguage[],
  source_item_count: record.source_item_count,
  published_at: record.published_at,
  provenance_sources: record.source_rows
    .slice(0, plan.costControls.maxSourceItemsPerSignal)
    .map(sourceRow => ({
      raw_source_item_id: sourceRow.raw_source_item_id,
      source_name: sourceRow.source_name ?? sourceRow.source_id ?? 'Unknown source',
      source_url: sourceRow.canonical_url,
      published_at: sourceRow.published_at,
      is_primary: sourceRow.is_primary,
    })),
  source_documents: record.source_rows
    .slice(0, plan.costControls.maxSourceItemsPerSignal)
    .map(sourceRow => ({
      raw_source_item_id: sourceRow.raw_source_item_id,
      source_name: sourceRow.source_name ?? sourceRow.source_id ?? 'Unknown source',
      source_url: sourceRow.canonical_url,
      published_at: sourceRow.published_at,
      is_primary: sourceRow.is_primary,
      title: sourceRow.title,
      dek: sourceRow.dek,
      normalized_text: sourceRow.normalized_text,
    })),
  topics: record.topic_rows
    .map(topicRow => normalizeText(topicRow.topic_name))
    .filter(Boolean),
  entities: record.entity_rows
    .map(entityRow => normalizeText(entityRow.canonical_name))
    .filter(Boolean),
});

const toPlannerCandidateRow = (
  record: Phase4AiEnrichmentCandidateRecord,
) => ({
  id: record.signal_id,
  lifecycle_stage: record.lifecycle_stage,
  generation_status: record.generation_status,
  enrichment_status: record.enrichment_status,
  enrichment_version: record.enrichment_version,
  summary_status: record.summary_status,
  translation_status: record.translation_status,
  source_language: record.source_language,
  target_languages: record.target_languages,
  last_enriched_at: record.last_enriched_at,
  enrichment_claim_expires_at: record.enrichment_claim_expires_at,
  enrichment_attempt_count: record.enrichment_attempt_count,
  enrichment_next_retry_at: record.enrichment_next_retry_at,
});

const toSkippedReason = (
  reason:
    | 'eligible'
    | 'not_preview_lifecycle'
    | 'generation_failed'
    | 'already_claimed'
    | 'already_pending'
    | 'already_completed_for_version'
    | 'translation_complete_for_targets'
    | 'retry_backoff_active'
    | 'retry_attempt_limit_reached',
): Phase4AiEnrichmentSkippedReason => {
  switch (reason) {
    case 'not_preview_lifecycle':
      return 'not_preview_lifecycle';
    case 'generation_failed':
      return 'generation_failed';
    case 'already_claimed':
      return 'skipped_claimed';
    case 'already_pending':
      return 'already_pending';
    case 'already_completed_for_version':
      return 'already_completed_for_version';
    case 'retry_backoff_active':
      return 'retry_backoff_active';
    case 'retry_attempt_limit_reached':
      return 'retry_attempt_limit_reached';
    case 'translation_complete_for_targets':
      return 'already_completed_for_version';
    case 'eligible':
    default:
      return 'provider_failed';
  }
};

const selectProvider = (
  requestProvider: AiEnrichmentProviderName,
  config: Phase4AiEnrichmentServerConfig,
  fetchImpl?: FetchLike,
  maxInputChars?: number,
): AiEnrichmentProvider | null => {
  if (requestProvider === 'noop') {
    return createNoopAiEnrichmentProvider();
  }

  if (
    requestProvider !== 'deepseek' ||
    config.provider !== 'deepseek' ||
    !config.deepseekApiKey
  ) {
    return null;
  }

  return createDeepSeekAiEnrichmentProvider({
    apiKey: config.deepseekApiKey,
    baseUrl: config.deepseekBaseUrl,
    model: config.deepseekModel,
    fetchImpl,
    maxInputChars,
  });
};

const getTotals = (
  results: Array<{
    token_usage: AiEnrichmentTokenUsage | null;
  }>,
) => ({
  approximate_prompt_tokens: results.reduce(
    (sum, result) => sum + (result.token_usage?.approximate_prompt_tokens ?? 0),
    0,
  ),
  approximate_completion_tokens: results.reduce(
    (sum, result) => sum + (result.token_usage?.approximate_completion_tokens ?? 0),
    0,
  ),
  approximate_total_tokens: results.reduce(
    (sum, result) => sum + (result.token_usage?.approximate_total_tokens ?? 0),
    0,
  ),
});

const isNonEmptyString = (value: string | null | undefined) =>
  normalizeText(value).length > 0;

const validateCombinedEnrichmentPayload = (
  payload: AiCombinedEnrichmentPayload | null,
): { valid: boolean; error: string | null } => {
  if (!payload) {
    return {
      valid: false,
      error: 'Provider returned no enrichment payload.',
    };
  }

  if (
    !isNonEmptyString(payload.enriched_summary_en) ||
    !isNonEmptyString(payload.enriched_summary_zh) ||
    !Array.isArray(payload.enriched_why_it_matters_en) ||
    payload.enriched_why_it_matters_en.every(value => !isNonEmptyString(value)) ||
    !Array.isArray(payload.enriched_why_it_matters_zh) ||
    payload.enriched_why_it_matters_zh.every(value => !isNonEmptyString(value)) ||
    !payload.source_language ||
    !Array.isArray(payload.target_languages) ||
    payload.target_languages.length === 0
  ) {
    return {
      valid: false,
      error: 'Provider payload is missing required enrichment fields.',
    };
  }

  return {
    valid: true,
    error: null,
  };
};

const buildWritePatch = (
  payload: AiCombinedEnrichmentPayload,
  plan: AiEnrichmentJobPlan,
  timestamp: string,
): Phase4AiEnrichmentWritePatch => ({
  enrichment_status: 'completed',
  enrichment_version: plan.targetEnrichmentVersion,
  enrichment_source: 'deepseek',
  summary_status: 'completed',
  translation_status: 'completed',
  source_language: payload.source_language,
  target_languages: [...payload.target_languages],
  enriched_summary_en: normalizeText(payload.enriched_summary_en) || null,
  enriched_summary_zh: normalizeText(payload.enriched_summary_zh) || null,
  enriched_why_it_matters_en: normalizeStringArray(payload.enriched_why_it_matters_en),
  enriched_why_it_matters_zh: normalizeStringArray(payload.enriched_why_it_matters_zh),
  enrichment_error: null,
  last_enriched_at: timestamp,
  updated_at: timestamp,
});

const buildClaimToken = (runId: string, signalId: string) =>
  `${runId}:${signalId}`;

const addMinutes = (timestamp: string, minutes: number) =>
  new Date(Date.parse(timestamp) + minutes * 60 * 1000).toISOString();

const sanitizeErrorDetail = (value: string | null | undefined) => {
  const normalized = normalizeText(value);
  if (!normalized) {
    return null;
  }

  return normalized.replace(/\s+/gu, ' ').slice(0, 160);
};

const buildStoredEnrichmentError = (
  errorCode: string,
  errorMessage: string | null | undefined,
) => {
  const detail = sanitizeErrorDetail(errorMessage);
  return detail ? `${errorCode}:${detail}` : errorCode;
};

const buildFailurePatch = (
  record: Phase4AiEnrichmentCandidateRecord,
  plan: AiEnrichmentJobPlan,
  errorCode: string,
  errorMessage: string | null | undefined,
  timestamp: string,
): Phase4AiEnrichmentFailurePatch => ({
  enrichment_status: 'failed',
  enrichment_version: plan.targetEnrichmentVersion,
  enrichment_source: 'deepseek',
  summary_status:
    record.summary_status === 'completed' ? 'completed' : 'failed',
  translation_status:
    record.translation_status === 'completed' ? 'completed' : 'failed',
  source_language: record.source_language,
  target_languages:
    plan.targetLanguages.length > 0
      ? [...plan.targetLanguages]
      : [...record.target_languages],
  enrichment_error: buildStoredEnrichmentError(errorCode, errorMessage),
  next_retry_at: addMinutes(timestamp, plan.retryPolicy.backoffMinutes),
  updated_at: timestamp,
});

const getClaimRejectedSkippedReason = (
  result: Phase4AiEnrichmentClaimResult,
): Phase4AiEnrichmentSkippedReason => {
  switch (result.claim_status) {
    case 'skipped_claimed':
      return 'skipped_claimed';
    case 'skipped_existing_enrichment':
      return 'skipped_existing_enrichment';
    case 'retry_backoff_active':
      return 'retry_backoff_active';
    case 'retry_attempt_limit_reached':
      return 'retry_attempt_limit_reached';
    case 'not_preview_lifecycle':
      return 'not_preview_lifecycle';
    case 'generation_failed':
      return 'generation_failed';
    case 'claimed':
    case 'not_found':
    default:
      return 'provider_failed';
  }
};

const getOverallWriteStatus = (
  results: Phase4AiEnrichmentWriteSignalResult[],
): Phase4AiWriteOverallStatus => {
  const writtenCount = results.filter(result => result.write_status === 'written').length;
  const failedCount = results.filter(result => result.status === 'failed').length;
  const skippedCount = results.filter(result => result.status === 'skipped').length;

  if (writtenCount > 0 && failedCount === 0 && skippedCount === 0) {
    return 'completed';
  }

  if (writtenCount > 0) {
    return 'partial_success';
  }

  if (failedCount > 0 && skippedCount === 0) {
    return 'failed';
  }

  if (failedCount > 0 && skippedCount > 0) {
    return 'partial_success';
  }

  return 'skipped';
};

const getWriteModeMaxSignals = (
  signalIds: string[],
  maxSignals: number | undefined,
): number => {
  if (signalIds.length === 0) {
    return 1;
  }

  if (typeof maxSignals !== 'number' || Number.isNaN(maxSignals)) {
    return Math.min(signalIds.length, MAX_AI_WRITE_MODE_SIGNALS);
  }

  return Math.min(Math.max(1, Math.trunc(maxSignals)), MAX_AI_WRITE_MODE_SIGNALS);
};

const getWriteErrorModel = (
  requestProvider: AiEnrichmentProviderName,
  config: Phase4AiEnrichmentServerConfig | null,
) => (requestProvider === 'deepseek' ? config?.deepseekModel ?? null : null);

const resolveEligibleCandidates = (
  candidates: Phase4AiEnrichmentCandidateRecord[],
  plan: AiEnrichmentJobPlan,
) =>
  candidates.map(candidate => ({
    candidate,
    decision: shouldEnrichCandidateSignal(toPlannerCandidateRow(candidate), plan),
  }));

export const isAiEnrichmentRequest = (
  request: unknown,
): request is Phase4AiEnrichmentRequestEnvelope =>
  Boolean(
    request &&
      typeof request === 'object' &&
      'aiEnrichment' in (request as Record<string, unknown>) &&
      (request as Record<string, unknown>).aiEnrichment,
  );

export function resolvePhase4AiEnrichmentServerConfig(
  getEnv: (key: string) => string | undefined,
): Phase4AiEnrichmentServerConfig {
  const provider = normalizeText(getEnv('AI_PROVIDER')).toLowerCase();

  return {
    provider: provider === 'deepseek' ? 'deepseek' : 'noop',
    enabled: normalizeText(getEnv('PHASE4_ENABLE_AI_ENRICHMENT')).toLowerCase() === 'true',
    dryRunOnly:
      normalizeText(getEnv('PHASE4_AI_DRY_RUN_ONLY')).toLowerCase() !== 'false',
    deepseekApiKey: normalizeText(getEnv('DEEPSEEK_API_KEY')) || undefined,
    deepseekBaseUrl:
      normalizeText(getEnv('DEEPSEEK_BASE_URL')) || DEFAULT_DEEPSEEK_BASE_URL,
    deepseekModel:
      normalizeText(getEnv('DEEPSEEK_MODEL')) || DEFAULT_DEEPSEEK_MODEL,
  };
}

export async function createPhase4AiEnrichmentDryRun(
  request: Phase4AiEnrichmentRequestEnvelope,
  options: Phase4AiEnrichmentRuntimeOptions = {},
): Promise<Phase4AiEnrichmentDryRunResponse> {
  const requestConfig = getRequestConfig(request);
  const config = options.aiConfig ?? null;

  if (request.dryRun === false) {
    return buildDryRunErrorResponse(
      requestConfig.provider,
      getWriteErrorModel(requestConfig.provider, config),
      'ai_dry_run_only',
      'Task 13B only supports AI enrichment dry-run mode. Keep dryRun: true.',
      requestConfig.signalIds,
    );
  }

  if (!options.aiEnrichmentStore) {
    return buildDryRunErrorResponse(
      requestConfig.provider,
      getWriteErrorModel(requestConfig.provider, config),
      'ai_store_not_configured',
      'AI enrichment dry-run requires a server-side Supabase enrichment store.',
      requestConfig.signalIds,
    );
  }

  if (!config || !config.enabled) {
    return buildDryRunErrorResponse(
      requestConfig.provider,
      getWriteErrorModel(requestConfig.provider, config),
      'ai_enrichment_disabled',
      'AI enrichment dry-run is disabled on this server.',
      requestConfig.signalIds,
    );
  }

  if (requestConfig.provider === 'deepseek' && !config.deepseekApiKey) {
    return buildDryRunErrorResponse(
      'deepseek',
      config.deepseekModel,
      'provider_not_configured',
      'DeepSeek dry-run requested, but DEEPSEEK_API_KEY is not configured on the server.',
      requestConfig.signalIds,
    );
  }

  const plan = createAiEnrichmentJobPlan({
    dryRun: true,
    allowWrites: false,
    targetLanguages:
      requestConfig.targetLanguages.length > 0
        ? requestConfig.targetLanguages
        : ['zh'],
    requestedSignalIds: requestConfig.signalIds,
    maxSignalsPerRun: requestConfig.maxSignals,
    force: requestConfig.force,
    now: options.now?.(),
  });

  const provider = selectProvider(
    requestConfig.provider,
    config,
    options.fetchImpl,
    plan.costControls.maxInputChars,
  );

  if (!provider) {
    return buildDryRunErrorResponse(
      requestConfig.provider,
      getWriteErrorModel(requestConfig.provider, config),
      'unsupported_provider',
      `Provider ${requestConfig.provider} is not available in this server configuration.`,
      requestConfig.signalIds,
    );
  }

  const candidates = await options.aiEnrichmentStore.listCandidateSignals(
    requestConfig.signalIds,
  );
  const candidateDecisions = resolveEligibleCandidates(candidates, plan);
  const selectedSignalIds = new Set(
    candidateDecisions
      .filter(entry => entry.decision.shouldEnrich)
      .slice(0, plan.costControls.maxSignalsPerRun)
      .map(entry => entry.candidate.signal_id),
  );

  const results: Phase4AiEnrichmentDryRunSignalResult[] = [];

  for (const entry of candidateDecisions) {
    if (!entry.decision.shouldEnrich) {
      results.push({
        signal_id: entry.candidate.signal_id,
        status: 'skipped',
        reason: toSkippedReason(entry.decision.reason),
        provider: provider.providerName,
        model: provider.modelName,
        proposed_output: null,
        token_usage: null,
        error_message: null,
      });
      continue;
    }

    if (!selectedSignalIds.has(entry.candidate.signal_id)) {
      continue;
    }

    const input = buildSignalInput(entry.candidate, plan);
    const result = await provider.enrich(input);

    results.push({
      signal_id: entry.candidate.signal_id,
      status:
        result.status === 'completed'
          ? 'completed'
          : result.status === 'failed'
            ? 'failed'
            : 'skipped',
      reason:
        result.status === 'completed'
          ? 'proposed'
          : result.error_message?.match(/invalid json|required enrichment fields/i)
            ? 'invalid_output'
            : 'provider_failed',
      provider: provider.providerName,
      model: provider.modelName,
      proposed_output: result.payload,
      token_usage: result.token_usage,
      error_message: result.error_message,
    });
  }

  const totals = getTotals(results);
  const proposedCount = results.filter(result => result.status === 'completed').length;
  const skippedCount = results.filter(result => result.status === 'skipped').length;
  const failedCount = results.filter(result => result.status === 'failed').length;

  return {
    dry_run: true,
    provider: provider.providerName,
    model: provider.modelName,
    no_writes_performed: true,
    write_mode_enabled: false,
    requested_signal_ids: requestConfig.signalIds,
    selected_signal_count: selectedSignalIds.size,
    proposed_outputs: results,
    proposed_count: proposedCount,
    skipped_count: skippedCount,
    failed_count: failedCount,
    ...totals,
  };
}

export async function runPhase4AiEnrichment(
  request: Phase4AiEnrichmentRequestEnvelope,
  options: Phase4AiEnrichmentRuntimeOptions = {},
): Promise<Phase4AiEnrichmentResponse> {
  const requestConfig = getRequestConfig(request);
  const config = options.aiConfig ?? null;
  const runId =
    globalThis.crypto?.randomUUID?.() ??
    `phase4-ai-${Date.now().toString(36)}`;
  const writeModeRequested =
    requestConfig.writeMode || request.dryRun === false;

  if (!writeModeRequested) {
    return createPhase4AiEnrichmentDryRun(request, options);
  }

  if (request.dryRun !== false) {
    return buildWriteErrorResponse(
      runId,
      requestConfig.provider,
      getWriteErrorModel(requestConfig.provider, config),
      'ai_write_requires_dry_run_false',
      'AI enrichment write mode requires dryRun: false.',
      requestConfig.signalIds,
    );
  }

  if (!requestConfig.writeMode) {
    return buildWriteErrorResponse(
      runId,
      requestConfig.provider,
      getWriteErrorModel(requestConfig.provider, config),
      'ai_write_mode_required',
      'AI enrichment write mode requires aiEnrichment.writeMode: true.',
      requestConfig.signalIds,
    );
  }

  if (!options.aiEnrichmentStore) {
    return buildWriteErrorResponse(
      runId,
      requestConfig.provider,
      getWriteErrorModel(requestConfig.provider, config),
      'ai_store_not_configured',
      'AI enrichment write mode requires a server-side Supabase enrichment store.',
      requestConfig.signalIds,
    );
  }

  if (!config || !config.enabled) {
    return buildWriteErrorResponse(
      runId,
      requestConfig.provider,
      getWriteErrorModel(requestConfig.provider, config),
      'ai_enrichment_disabled',
      'AI enrichment write mode is disabled on this server.',
      requestConfig.signalIds,
    );
  }

  if (config.dryRunOnly) {
    return buildWriteErrorResponse(
      runId,
      requestConfig.provider,
      getWriteErrorModel(requestConfig.provider, config),
      'ai_dry_run_only',
      'AI enrichment write mode is disabled while PHASE4_AI_DRY_RUN_ONLY remains true.',
      requestConfig.signalIds,
    );
  }

  if (requestConfig.provider !== 'deepseek' || config.provider !== 'deepseek') {
    return buildWriteErrorResponse(
      runId,
      requestConfig.provider,
      getWriteErrorModel(requestConfig.provider, config),
      'unsupported_provider',
      'AI enrichment write mode currently supports DeepSeek only.',
      requestConfig.signalIds,
    );
  }

  if (!config.deepseekApiKey) {
    return buildWriteErrorResponse(
      runId,
      'deepseek',
      config.deepseekModel,
      'provider_not_configured',
      'DeepSeek write mode requested, but DEEPSEEK_API_KEY is not configured on the server.',
      requestConfig.signalIds,
    );
  }

  if (!options.writeAuthToken) {
    return buildWriteErrorResponse(
      runId,
      'deepseek',
      config.deepseekModel,
      'ai_write_token_not_configured',
      'AI enrichment write mode requires PHASE4_WRITE_AUTH_TOKEN on the server.',
      requestConfig.signalIds,
    );
  }

  if (!options.requestWriteToken) {
    return buildWriteErrorResponse(
      runId,
      'deepseek',
      config.deepseekModel,
      'ai_write_token_missing',
      'AI enrichment write mode requires the x-phase4-write-token header.',
      requestConfig.signalIds,
    );
  }

  if (options.requestWriteToken !== options.writeAuthToken) {
    return buildWriteErrorResponse(
      runId,
      'deepseek',
      config.deepseekModel,
      'ai_write_token_mismatch',
      'Provided AI enrichment write token does not match server configuration.',
      requestConfig.signalIds,
    );
  }

  if (
    typeof requestConfig.maxSignals === 'number' &&
    Number.isFinite(requestConfig.maxSignals) &&
    Math.trunc(requestConfig.maxSignals) > MAX_AI_WRITE_MODE_SIGNALS
  ) {
    return buildWriteErrorResponse(
      runId,
      'deepseek',
      config.deepseekModel,
      'ai_write_signal_limit_exceeded',
      `AI enrichment write mode is capped at ${MAX_AI_WRITE_MODE_SIGNALS} signals per request.`,
      requestConfig.signalIds,
    );
  }

  if (requestConfig.signalIds.length > MAX_AI_WRITE_MODE_SIGNALS) {
    return buildWriteErrorResponse(
      runId,
      'deepseek',
      config.deepseekModel,
      'ai_write_signal_ids_limit_exceeded',
      `AI enrichment write mode accepts at most ${MAX_AI_WRITE_MODE_SIGNALS} explicit signalIds per request.`,
      requestConfig.signalIds,
    );
  }

  const effectiveMaxSignals = getWriteModeMaxSignals(
    requestConfig.signalIds,
    requestConfig.maxSignals,
  );

  const plan = createAiEnrichmentJobPlan({
    dryRun: false,
    allowWrites: true,
    targetLanguages:
      requestConfig.targetLanguages.length > 0
        ? requestConfig.targetLanguages
        : ['zh'],
    requestedSignalIds: requestConfig.signalIds,
    maxSignalsPerRun: effectiveMaxSignals,
    force: requestConfig.force,
    now: options.now?.(),
  });

  const provider = selectProvider(
    'deepseek',
    config,
    options.fetchImpl,
    plan.costControls.maxInputChars,
  );

  if (!provider) {
    return buildWriteErrorResponse(
      runId,
      'deepseek',
      config.deepseekModel,
      'provider_not_configured',
      'DeepSeek provider is not available in this server configuration.',
      requestConfig.signalIds,
    );
  }

  const candidates = await options.aiEnrichmentStore.listCandidateSignals(
    requestConfig.signalIds.length > 0 ? requestConfig.signalIds : undefined,
  );
  const candidateDecisions = resolveEligibleCandidates(candidates, plan);
  const selectedCandidates = candidateDecisions
    .filter(entry => entry.decision.shouldEnrich)
    .slice(0, effectiveMaxSignals);
  const selectedSignalIds = new Set(
    selectedCandidates.map(entry => entry.candidate.signal_id),
  );

  const results: Phase4AiEnrichmentWriteSignalResult[] = [];
  let mutationCount = 0;

  const loadReadback = async (
    signalId: string,
  ): Promise<{
    readback: Phase4AiEnrichmentReadbackRecord | null;
    readbackStatus: Phase4AiReadbackStatus;
    readbackError: string | null;
  }> => {
    try {
      const readback = await options.aiEnrichmentStore!.readEnrichmentResult(signalId);
      return {
        readback,
        readbackStatus: readback ? 'loaded' : 'missing',
        readbackError: null,
      };
    } catch (error) {
      return {
        readback: null,
        readbackStatus: 'failed',
        readbackError:
          sanitizeErrorDetail(
            error instanceof Error
              ? error.message
              : 'AI enrichment readback failed.',
          ) ?? 'AI enrichment readback failed.',
      };
    }
  };

  for (const entry of candidateDecisions) {
    if (!entry.decision.shouldEnrich) {
      const skippedExisting =
        entry.decision.reason === 'already_completed_for_version';

      results.push({
        signal_id: entry.candidate.signal_id,
        status: 'skipped',
        reason: skippedExisting
          ? 'skipped_existing_enrichment'
          : toSkippedReason(entry.decision.reason),
        skipped_reason: skippedExisting
          ? 'skipped_existing_enrichment'
          : toSkippedReason(entry.decision.reason),
        provider: provider.providerName,
        model: provider.modelName,
        claim_status: 'not_attempted',
        provider_status: 'not_called',
        validation_status: 'not_attempted',
        write_status: skippedExisting ? 'skipped_existing_enrichment' : 'not_attempted',
        readback_status: 'not_attempted',
        error_code: null,
        enrichment_status_after_write: entry.candidate.enrichment_status,
        last_enriched_at_after_write: entry.candidate.last_enriched_at,
        readback: null,
        proposed_output: null,
        token_usage: null,
        error_message: null,
      });
      continue;
    }

    if (!selectedSignalIds.has(entry.candidate.signal_id)) {
      continue;
    }

    const startedAt = options.now?.() ?? new Date().toISOString();
    const claimToken = buildClaimToken(runId, entry.candidate.signal_id);
    let claimResult: Phase4AiEnrichmentClaimResult;

    try {
      claimResult = await options.aiEnrichmentStore.claimSignalForEnrichment({
        signal_id: entry.candidate.signal_id,
        target_enrichment_version: plan.targetEnrichmentVersion,
        claim_token: claimToken,
        started_at: startedAt,
        claim_ttl_seconds: DEFAULT_AI_ENRICHMENT_CLAIM_TTL_SECONDS,
        max_retry_attempts: plan.retryPolicy.maxAttemptsPerSignal,
        retry_backoff_minutes: plan.retryPolicy.backoffMinutes,
        force: requestConfig.force,
      });
    } catch (error) {
      results.push({
        signal_id: entry.candidate.signal_id,
        status: 'failed',
        reason: 'provider_failed',
        skipped_reason: null,
        provider: provider.providerName,
        model: provider.modelName,
        claim_status: 'claim_failed',
        provider_status: 'not_called',
        validation_status: 'not_attempted',
        write_status: 'failed',
        readback_status: 'not_attempted',
        error_code: 'claim_failed',
        enrichment_status_after_write: entry.candidate.enrichment_status,
        last_enriched_at_after_write: entry.candidate.last_enriched_at,
        readback: null,
        proposed_output: null,
        token_usage: null,
        error_message:
          sanitizeErrorDetail(
            error instanceof Error ? error.message : 'AI enrichment claim failed.',
          ) ?? 'AI enrichment claim failed.',
      });
      continue;
    }

    if (claimResult.claim_status !== 'claimed') {
      const skippedReason = getClaimRejectedSkippedReason(claimResult);
      const skippedExisting = skippedReason === 'skipped_existing_enrichment';

      results.push({
        signal_id: entry.candidate.signal_id,
        status: 'skipped',
        reason: skippedReason,
        skipped_reason: skippedReason,
        provider: provider.providerName,
        model: provider.modelName,
        claim_status:
          claimResult.claim_status === 'not_found'
            ? 'claim_failed'
            : claimResult.claim_status,
        provider_status: 'not_called',
        validation_status: 'not_attempted',
        write_status: skippedExisting ? 'skipped_existing_enrichment' : 'not_attempted',
        readback_status: 'not_attempted',
        error_code:
          claimResult.claim_status === 'not_found' ? 'claim_not_found' : null,
        enrichment_status_after_write: claimResult.enrichment_status,
        last_enriched_at_after_write: claimResult.last_enriched_at,
        readback: null,
        proposed_output: null,
        token_usage: null,
        error_message: null,
      });
      continue;
    }

    const input = buildSignalInput(entry.candidate, plan);
    const providerResult = await provider.enrich(input);

    if (providerResult.status !== 'completed') {
      const providerFailureCode =
        providerResult.error_message?.match(/invalid json|required enrichment fields/i)
          ? 'invalid_output'
          : 'provider_failed';
      const failureTimestamp = options.now?.() ?? new Date().toISOString();
      const failurePatch = buildFailurePatch(
        entry.candidate,
        plan,
        providerFailureCode,
        providerResult.error_message,
        failureTimestamp,
      );
      let readback: Phase4AiEnrichmentReadbackRecord | null = null;
      let readbackStatus: Phase4AiReadbackStatus = 'not_attempted';
      let readbackError: string | null = null;
      let writeStatus: Phase4AiWriteStatus = 'not_attempted';

      try {
        await options.aiEnrichmentStore.recordEnrichmentFailure(
          entry.candidate.signal_id,
          claimToken,
          failurePatch,
        );
        mutationCount += 1;
        writeStatus = 'failed';
        const readbackResult = await loadReadback(entry.candidate.signal_id);
        readback = readbackResult.readback;
        readbackStatus = readbackResult.readbackStatus;
        readbackError = readbackResult.readbackError;
      } catch (error) {
        writeStatus = 'failed';
        readbackError =
          sanitizeErrorDetail(
            error instanceof Error
              ? error.message
              : 'AI enrichment failure state could not be recorded.',
          ) ?? 'AI enrichment failure state could not be recorded.';
      }

      results.push({
        signal_id: entry.candidate.signal_id,
        status: 'failed',
        reason: providerFailureCode,
        skipped_reason: null,
        provider: provider.providerName,
        model: provider.modelName,
        claim_status: 'claimed',
        provider_status:
          providerResult.status === 'failed'
            ? 'failed'
            : providerResult.status === 'skipped'
              ? 'skipped'
              : 'not_called',
        validation_status:
          providerFailureCode === 'invalid_output' ? 'failed' : 'not_attempted',
        write_status: writeStatus,
        readback_status: readbackStatus,
        error_code: providerFailureCode,
        enrichment_status_after_write:
          readback?.enrichment_status ?? failurePatch.enrichment_status,
        last_enriched_at_after_write:
          readback?.last_enriched_at ?? entry.candidate.last_enriched_at,
        readback,
        proposed_output: null,
        token_usage: providerResult.token_usage,
        error_message:
          readbackError ??
          sanitizeErrorDetail(providerResult.error_message) ??
          'AI enrichment provider call failed.',
      });
      continue;
    }

    const validation = validateCombinedEnrichmentPayload(providerResult.payload);
    if (!validation.valid || !providerResult.payload) {
      const failureTimestamp = options.now?.() ?? new Date().toISOString();
      const failurePatch = buildFailurePatch(
        entry.candidate,
        plan,
        'invalid_output',
        validation.error,
        failureTimestamp,
      );
      let readback: Phase4AiEnrichmentReadbackRecord | null = null;
      let readbackStatus: Phase4AiReadbackStatus = 'not_attempted';
      let readbackError: string | null = null;
      let writeStatus: Phase4AiWriteStatus = 'not_attempted';

      try {
        await options.aiEnrichmentStore.recordEnrichmentFailure(
          entry.candidate.signal_id,
          claimToken,
          failurePatch,
        );
        mutationCount += 1;
        writeStatus = 'failed';
        const readbackResult = await loadReadback(entry.candidate.signal_id);
        readback = readbackResult.readback;
        readbackStatus = readbackResult.readbackStatus;
        readbackError = readbackResult.readbackError;
      } catch (error) {
        writeStatus = 'failed';
        readbackError =
          sanitizeErrorDetail(
            error instanceof Error
              ? error.message
              : 'AI enrichment validation failure could not be recorded.',
          ) ?? 'AI enrichment validation failure could not be recorded.';
      }

      results.push({
        signal_id: entry.candidate.signal_id,
        status: 'failed',
        reason: 'invalid_output',
        skipped_reason: null,
        provider: provider.providerName,
        model: provider.modelName,
        claim_status: 'claimed',
        provider_status: 'completed',
        validation_status: 'failed',
        write_status: writeStatus,
        readback_status: readbackStatus,
        error_code: 'invalid_output',
        enrichment_status_after_write:
          readback?.enrichment_status ?? failurePatch.enrichment_status,
        last_enriched_at_after_write:
          readback?.last_enriched_at ?? entry.candidate.last_enriched_at,
        readback,
        proposed_output: null,
        token_usage: providerResult.token_usage,
        error_message:
          readbackError ??
          sanitizeErrorDetail(validation.error) ??
          'Provider payload failed validation.',
      });
      continue;
    }

    const completedAt = options.now?.() ?? new Date().toISOString();
    const patch = buildWritePatch(providerResult.payload, plan, completedAt);

    try {
      await options.aiEnrichmentStore.writeEnrichmentResult(
        entry.candidate.signal_id,
        claimToken,
        patch,
      );
      mutationCount += 1;
    } catch (error) {
      results.push({
        signal_id: entry.candidate.signal_id,
        status: 'failed',
        reason: 'provider_failed',
        skipped_reason: null,
        provider: provider.providerName,
        model: provider.modelName,
        claim_status: 'claimed',
        provider_status: 'completed',
        validation_status: 'passed',
        write_status: 'failed',
        readback_status: 'not_attempted',
        error_code: 'write_failed',
        enrichment_status_after_write: null,
        last_enriched_at_after_write: null,
        readback: null,
        proposed_output: providerResult.payload,
        token_usage: providerResult.token_usage,
        error_message:
          sanitizeErrorDetail(
            error instanceof Error ? error.message : 'AI enrichment write failed.',
          ) ?? 'AI enrichment write failed.',
      });
      continue;
    }

    const {
      readback,
      readbackStatus,
      readbackError,
    } = await loadReadback(entry.candidate.signal_id);

    results.push({
      signal_id: entry.candidate.signal_id,
      status: readbackStatus === 'failed' ? 'failed' : 'completed',
      reason: 'written',
      skipped_reason: null,
      provider: provider.providerName,
      model: provider.modelName,
      claim_status: 'claimed',
      provider_status: 'completed',
      validation_status: 'passed',
      write_status: 'written',
      readback_status: readbackStatus,
      error_code: readbackStatus === 'failed' ? 'readback_failed' : null,
      enrichment_status_after_write: readback?.enrichment_status ?? patch.enrichment_status,
      last_enriched_at_after_write: readback?.last_enriched_at ?? patch.last_enriched_at,
      readback,
      proposed_output: providerResult.payload,
      token_usage: providerResult.token_usage,
      error_message: readbackError,
    });
  }

  const totals = getTotals(results);
  const proposedCount = results.filter(result => result.provider_status === 'completed').length;
  const writtenCount = results.filter(result => result.write_status === 'written').length;
  const skippedCount = results.filter(result => result.status === 'skipped').length;
  const failedCount = results.filter(result => result.status === 'failed').length;
  const overallStatus = getOverallWriteStatus(results);

  return {
    dry_run: false,
    run_id: runId,
    overall_status: overallStatus,
    provider: provider.providerName,
    model: provider.modelName,
    no_writes_performed: mutationCount === 0,
    write_mode_enabled: true,
    requested_signal_ids: requestConfig.signalIds,
    selected_signal_count: selectedCandidates.length,
    proposed_outputs: results,
    proposed_count: proposedCount,
    written_count: writtenCount,
    skipped_count: skippedCount,
    failed_count: failedCount,
    ...totals,
  };
}
