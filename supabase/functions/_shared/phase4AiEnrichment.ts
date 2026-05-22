import {
  createNoopAiEnrichmentProvider,
  type AiCombinedEnrichmentPayload,
  type AiEnrichmentProvider,
  type AiEnrichmentProviderName,
  type AiEnrichmentSignalInput,
  type AiEnrichmentTargetLanguage,
} from './enrichmentProvider.ts';
import {
  createAiEnrichmentJobPlan,
  shouldEnrichCandidateSignal,
  type AiEnrichmentJobPlan,
} from './enrichmentPlanner.ts';
import {
  type Phase4AiEnrichmentCandidateRecord,
  type Phase4AiEnrichmentStore,
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
}

export interface Phase4AiEnrichmentRequestEnvelope {
  dryRun?: boolean;
  aiEnrichment?: Phase4AiEnrichmentRequest | null;
}

export interface Phase4AiEnrichmentServerConfig {
  provider: AiEnrichmentProviderName | 'deepseek';
  enabled: boolean;
  dryRunOnly: boolean;
  deepseekApiKey?: string;
  deepseekBaseUrl: string;
  deepseekModel: string;
}

export interface Phase4AiEnrichmentDryRunSignalResult {
  signal_id: string;
  status: 'completed' | 'skipped' | 'failed';
  reason:
    | 'proposed'
    | 'provider_not_configured'
    | 'provider_disabled'
    | 'unsupported_provider'
    | 'already_pending'
    | 'already_completed_for_version'
    | 'retry_backoff_active'
    | 'not_preview_lifecycle'
    | 'generation_failed'
    | 'invalid_output'
    | 'provider_failed';
  provider: AiEnrichmentProviderName | 'deepseek';
  model: string | null;
  proposed_output: AiCombinedEnrichmentPayload | null;
  token_usage: {
    prompt_tokens: number | null;
    completion_tokens: number | null;
    total_tokens: number | null;
    approximate_prompt_tokens: number;
    approximate_completion_tokens: number | null;
    approximate_total_tokens: number | null;
  } | null;
  error_message: string | null;
}

export interface Phase4AiEnrichmentDryRunResponse {
  dry_run: true;
  provider: AiEnrichmentProviderName | 'deepseek';
  model: string | null;
  code?:
    | 'provider_not_configured'
    | 'ai_enrichment_disabled'
    | 'ai_dry_run_only'
    | 'ai_store_not_configured'
    | 'unsupported_provider';
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

export interface Phase4AiEnrichmentRuntimeOptions {
  aiEnrichmentStore?: Phase4AiEnrichmentStore | null;
  aiConfig?: Phase4AiEnrichmentServerConfig | null;
  fetchImpl?: FetchLike;
  now?: () => string;
}

const DEFAULT_DEEPSEEK_BASE_URL = 'https://api.deepseek.com';
const DEFAULT_DEEPSEEK_MODEL = 'deepseek-chat';

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
): value is AiEnrichmentProviderName | 'deepseek' =>
  value === 'noop' || value === 'deepseek';

const getRequestConfig = (request: Phase4AiEnrichmentRequestEnvelope) => ({
  provider:
    isAiEnrichmentProvider(request.aiEnrichment?.provider)
      ? request.aiEnrichment?.provider
      : 'noop',
  signalIds: [...(request.aiEnrichment?.signalIds ?? [])],
  maxSignals: request.aiEnrichment?.maxSignals,
  targetLanguages: normalizeTargetLanguages(request.aiEnrichment?.targetLanguages),
  force: request.aiEnrichment?.force === true,
});

const buildErrorResponse = (
  provider: AiEnrichmentProviderName | 'deepseek',
  model: string | null,
  code: NonNullable<Phase4AiEnrichmentDryRunResponse['code']>,
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
});

const toSkippedReason = (
  reason:
    | 'eligible'
    | 'not_preview_lifecycle'
    | 'generation_failed'
    | 'already_pending'
    | 'already_completed_for_version'
    | 'translation_complete_for_targets'
    | 'retry_backoff_active',
): Phase4AiEnrichmentDryRunSignalResult['reason'] => {
  switch (reason) {
    case 'not_preview_lifecycle':
      return 'not_preview_lifecycle';
    case 'generation_failed':
      return 'generation_failed';
    case 'already_pending':
      return 'already_pending';
    case 'already_completed_for_version':
      return 'already_completed_for_version';
    case 'retry_backoff_active':
      return 'retry_backoff_active';
    case 'translation_complete_for_targets':
      return 'already_completed_for_version';
    case 'eligible':
    default:
      return 'provider_failed';
  }
};

const selectProvider = (
  requestProvider: AiEnrichmentProviderName | 'deepseek',
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
    return buildErrorResponse(
      requestConfig.provider,
      requestConfig.provider === 'deepseek' ? config?.deepseekModel ?? null : null,
      'ai_dry_run_only',
      'Task 13B only supports AI enrichment dry-run mode. Keep dryRun: true.',
      requestConfig.signalIds,
    );
  }

  if (!options.aiEnrichmentStore) {
    return buildErrorResponse(
      requestConfig.provider,
      requestConfig.provider === 'deepseek' ? config?.deepseekModel ?? null : null,
      'ai_store_not_configured',
      'AI enrichment dry-run requires a server-side Supabase enrichment store.',
      requestConfig.signalIds,
    );
  }

  if (!config || !config.enabled) {
    return buildErrorResponse(
      requestConfig.provider,
      requestConfig.provider === 'deepseek' ? config?.deepseekModel ?? null : null,
      'ai_enrichment_disabled',
      'AI enrichment dry-run is disabled on this server.',
      requestConfig.signalIds,
    );
  }

  if (requestConfig.provider === 'deepseek' && !config.deepseekApiKey) {
    return buildErrorResponse(
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
    return buildErrorResponse(
      requestConfig.provider,
      requestConfig.provider === 'deepseek' ? config.deepseekModel : null,
      'unsupported_provider',
      `Provider ${requestConfig.provider} is not available in this server configuration.`,
      requestConfig.signalIds,
    );
  }

  const candidates = await options.aiEnrichmentStore.listCandidateSignals(
    requestConfig.signalIds,
  );
  const candidateDecisions = candidates.map(candidate => ({
    candidate,
    decision: shouldEnrichCandidateSignal(toPlannerCandidateRow(candidate), plan),
  }));
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
  };
}
