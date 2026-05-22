import type { ContentLanguage } from './types.ts';
import {
  AI_ENRICHMENT_TARGET_LANGUAGES,
  type AiCombinedEnrichmentPayload,
  type AiEnrichmentOperationResult,
  type AiEnrichmentProvider,
  type AiEnrichmentSignalInput,
  type AiEnrichmentTargetLanguage,
  type AiEnrichmentTokenUsage,
  type AiLanguageDetectionPayload,
  type AiSummaryPayload,
  type AiTranslationPayload,
  type AiWhyItMattersPayload,
} from './enrichmentProvider.ts';

export const DEFAULT_DEEPSEEK_BASE_URL = 'https://api.deepseek.com';
export const DEFAULT_DEEPSEEK_MODEL = 'deepseek-chat';
const DEFAULT_DEEPSEEK_TIMEOUT_MS = 20_000;
const DEFAULT_DEEPSEEK_MAX_ATTEMPTS = 2;
const DEFAULT_DEEPSEEK_RETRY_BACKOFF_MS = 500;
const MAX_SOURCE_DOCUMENT_CHARS = 1_600;

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

export interface DeepSeekProviderOptions {
  apiKey: string;
  baseUrl?: string;
  model?: string;
  fetchImpl?: FetchLike;
  timeoutMs?: number;
  maxAttempts?: number;
  retryBackoffMs?: number;
  maxInputChars?: number;
}

export interface DeepSeekRequestBuildOptions {
  model: string;
  maxInputChars: number;
}

interface DeepSeekChatCompletionBody {
  model: string;
  response_format: {
    type: 'json_object';
  };
  temperature: number;
  messages: Array<{
    role: 'system' | 'user';
    content: string;
  }>;
}

interface DeepSeekResponsePayload {
  choices?: Array<{
    message?: {
      content?: string | null;
    } | null;
  } | null> | null;
  usage?: {
    prompt_tokens?: number | null;
    completion_tokens?: number | null;
    total_tokens?: number | null;
  } | null;
}

interface ParsedDeepSeekPayload {
  payload: AiCombinedEnrichmentPayload;
  tokenUsage: AiEnrichmentTokenUsage;
}

class NonRetryableDeepSeekError extends Error {}

const TARGET_LANGUAGE_SET = new Set<AiEnrichmentTargetLanguage>(
  AI_ENRICHMENT_TARGET_LANGUAGES,
);

const normalizeText = (value: string | null | undefined) => value?.trim() ?? '';

const normalizeStringArray = (values: unknown): string[] =>
  Array.isArray(values)
    ? values
        .map(value => (typeof value === 'string' ? normalizeText(value) : ''))
        .filter(Boolean)
    : [];

const toApproximateTokenCount = (text: string) =>
  Math.max(1, Math.ceil(text.length / 4));

const isContentLanguage = (value: string | null | undefined): value is ContentLanguage =>
  value === 'en' || value === 'zh' || value === 'mixed' || value === 'unknown';

const normalizeTargetLanguages = (
  values: unknown,
): AiEnrichmentTargetLanguage[] => {
  const deduped = new Set<AiEnrichmentTargetLanguage>();
  for (const value of Array.isArray(values) ? values : []) {
    if (typeof value === 'string' && TARGET_LANGUAGE_SET.has(value as AiEnrichmentTargetLanguage)) {
      deduped.add(value as AiEnrichmentTargetLanguage);
    }
  }

  return [...deduped];
};

const stripCodeFence = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed.startsWith('```')) {
    return trimmed;
  }

  return trimmed
    .replace(/^```[a-zA-Z0-9_-]*\s*/u, '')
    .replace(/\s*```$/u, '')
    .trim();
};

const truncateText = (value: string | null | undefined, maxChars: number) => {
  const normalized = normalizeText(value);
  if (!normalized) {
    return null;
  }

  if (normalized.length <= maxChars) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(0, maxChars - 1)).trimEnd()}…`;
};

const buildSourceDocumentPayload = (
  input: AiEnrichmentSignalInput,
  maxInputChars: number,
) => {
  let remainingChars = Math.max(1, maxInputChars);

  return input.source_documents.map(sourceDocument => {
    const title = truncateText(sourceDocument.title, 240);
    const dek = truncateText(sourceDocument.dek, 320);
    const normalizedTextBudget = Math.min(MAX_SOURCE_DOCUMENT_CHARS, remainingChars);
    const normalizedText = truncateText(
      sourceDocument.normalized_text,
      normalizedTextBudget,
    );

    remainingChars = Math.max(
      0,
      remainingChars -
        (title?.length ?? 0) -
        (dek?.length ?? 0) -
        (normalizedText?.length ?? 0),
    );

    return {
      raw_source_item_id: sourceDocument.raw_source_item_id ?? null,
      source_name: sourceDocument.source_name,
      source_url: sourceDocument.source_url ?? null,
      published_at: sourceDocument.published_at ?? null,
      is_primary: sourceDocument.is_primary === true,
      title,
      dek,
      normalized_text: normalizedText,
    };
  });
};

export function buildDeepSeekChatCompletionBody(
  input: AiEnrichmentSignalInput,
  options: DeepSeekRequestBuildOptions,
): DeepSeekChatCompletionBody {
  const promptPayload = {
    signal: {
      signal_id: input.signal_id,
      primary_category: input.primary_category,
      categories: [...input.categories],
      headline_en: input.headline_en,
      headline_zh: input.headline_zh,
      deterministic_summary_en: input.summary_en,
      deterministic_summary_zh: input.summary_zh,
      deterministic_why_it_matters_en: [...input.why_it_matters_en],
      deterministic_why_it_matters_zh: [...input.why_it_matters_zh],
      tags: [...input.tags],
      topics: [...input.topics],
      entities: [...input.entities],
      published_at: input.published_at,
      source_language: input.source_language,
      target_languages: [...input.target_languages],
      source_item_count: input.source_item_count,
    },
    sources: buildSourceDocumentPayload(input, options.maxInputChars),
  };

  return {
    model: options.model,
    response_format: {
      type: 'json_object',
    },
    temperature: 0.2,
    messages: [
      {
        role: 'system',
        content:
          'You enrich SignalDesk preview signals. Return only valid JSON. Do not wrap the JSON in markdown. Preserve uncertainty instead of inventing facts.',
      },
      {
        role: 'user',
        content: JSON.stringify({
          task:
            'Generate structured enrichment for a signal. Use only the provided deterministic preview and source excerpts. Do not fabricate article body text.',
          required_output_schema: {
            enriched_summary_en: 'string',
            enriched_summary_zh: 'string',
            enriched_why_it_matters_en: ['string'],
            enriched_why_it_matters_zh: ['string'],
            source_language: 'en | zh | mixed | unknown',
            target_languages: ['en | zh'],
            confidence_notes: 'string | null',
          },
          input: promptPayload,
        }),
      },
    ],
  };
}

const buildTokenUsage = (
  requestBody: DeepSeekChatCompletionBody,
  usage: DeepSeekResponsePayload['usage'],
  responseContent: string | null,
): AiEnrichmentTokenUsage => {
  const serializedRequest = JSON.stringify(requestBody);
  const approximatePromptTokens = toApproximateTokenCount(serializedRequest);
  const approximateCompletionTokens =
    responseContent && responseContent.length > 0
      ? toApproximateTokenCount(responseContent)
      : null;

  return {
    prompt_tokens:
      typeof usage?.prompt_tokens === 'number' ? usage.prompt_tokens : null,
    completion_tokens:
      typeof usage?.completion_tokens === 'number' ? usage.completion_tokens : null,
    total_tokens:
      typeof usage?.total_tokens === 'number' ? usage.total_tokens : null,
    approximate_prompt_tokens: approximatePromptTokens,
    approximate_completion_tokens: approximateCompletionTokens,
    approximate_total_tokens:
      approximateCompletionTokens === null
        ? approximatePromptTokens
        : approximatePromptTokens + approximateCompletionTokens,
  };
};

const parseDeepSeekEnrichmentPayload = (
  requestBody: DeepSeekChatCompletionBody,
  rawContent: string,
  usage: DeepSeekResponsePayload['usage'],
): ParsedDeepSeekPayload => {
  const strippedContent = stripCodeFence(rawContent);

  let parsed: unknown;
  try {
    parsed = JSON.parse(strippedContent);
  } catch {
    throw new NonRetryableDeepSeekError('Invalid JSON returned by DeepSeek.');
  }

  const record = parsed as Record<string, unknown>;
  const enrichedSummaryEn = normalizeText(
    typeof record.enriched_summary_en === 'string'
      ? record.enriched_summary_en
      : null,
  );
  const enrichedSummaryZh = normalizeText(
    typeof record.enriched_summary_zh === 'string'
      ? record.enriched_summary_zh
      : null,
  );
  const enrichedWhyItMattersEn = normalizeStringArray(
    record.enriched_why_it_matters_en,
  );
  const enrichedWhyItMattersZh = normalizeStringArray(
    record.enriched_why_it_matters_zh,
  );
  const sourceLanguage = isContentLanguage(
    typeof record.source_language === 'string' ? record.source_language : null,
  )
    ? (record.source_language as ContentLanguage)
    : null;
  const targetLanguages = normalizeTargetLanguages(record.target_languages);

  if (
    !enrichedSummaryEn ||
    !enrichedSummaryZh ||
    enrichedWhyItMattersEn.length === 0 ||
    enrichedWhyItMattersZh.length === 0 ||
    sourceLanguage === null ||
    targetLanguages.length === 0
  ) {
    throw new NonRetryableDeepSeekError(
      'DeepSeek response is missing required enrichment fields.',
    );
  }

  return {
    payload: {
      enriched_summary_en: enrichedSummaryEn,
      enriched_summary_zh: enrichedSummaryZh,
      enriched_why_it_matters_en: enrichedWhyItMattersEn,
      enriched_why_it_matters_zh: enrichedWhyItMattersZh,
      source_language: sourceLanguage,
      target_languages: targetLanguages,
      confidence_notes:
        typeof record.confidence_notes === 'string'
          ? normalizeText(record.confidence_notes)
          : null,
    },
    tokenUsage: buildTokenUsage(requestBody, usage, strippedContent),
  };
};

const isRetryableStatus = (status: number) => status === 408 || status === 429 || status >= 500;

const delay = async (milliseconds: number) => {
  if (milliseconds <= 0) {
    return;
  }

  await new Promise(resolve => setTimeout(resolve, milliseconds));
};

async function runDeepSeekRequest(
  requestBody: DeepSeekChatCompletionBody,
  options: Required<Omit<DeepSeekProviderOptions, 'fetchImpl'>> & {
    fetchImpl: FetchLike;
  },
): Promise<ParsedDeepSeekPayload> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= options.maxAttempts; attempt += 1) {
    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), options.timeoutMs);

    try {
      const response = await options.fetchImpl(
        `${options.baseUrl.replace(/\/+$/u, '')}/chat/completions`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${options.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
          signal: abortController.signal,
        },
      );

      clearTimeout(timeout);

      if (!response.ok) {
        const errorText = await response.text();
        if (!isRetryableStatus(response.status) || attempt === options.maxAttempts) {
          throw new NonRetryableDeepSeekError(
            `DeepSeek request failed with status ${response.status}: ${truncateText(
              errorText,
              180,
            ) ?? 'Unknown provider error.'}`,
          );
        }

        await delay(options.retryBackoffMs * attempt);
        continue;
      }

      const payload = (await response.json()) as DeepSeekResponsePayload;
      const rawContent =
        payload.choices?.[0]?.message?.content && typeof payload.choices[0]?.message?.content === 'string'
          ? payload.choices[0]!.message!.content!
          : '';

      return parseDeepSeekEnrichmentPayload(requestBody, rawContent, payload.usage);
    } catch (error) {
      clearTimeout(timeout);
      lastError = error instanceof Error ? error : new Error('Unknown DeepSeek error.');

      if (error instanceof NonRetryableDeepSeekError) {
        break;
      }

      if (attempt === options.maxAttempts) {
        break;
      }

      await delay(options.retryBackoffMs * attempt);
    }
  }

  throw lastError ?? new Error('DeepSeek request failed.');
}

const buildFailedResult = <TPayload>(
  operation: 'enrich' | 'summarize' | 'translate' | 'why_it_matters' | 'detect_language',
  message: string,
  tokenUsage: AiEnrichmentTokenUsage | null = null,
): AiEnrichmentOperationResult<TPayload> => ({
  operation,
  status: 'failed',
  source: 'deepseek',
  payload: null,
  error_message: message,
  token_usage: tokenUsage,
});

export function createDeepSeekAiEnrichmentProvider(
  options: DeepSeekProviderOptions,
): AiEnrichmentProvider {
  const resolvedOptions = {
    apiKey: options.apiKey,
    baseUrl: options.baseUrl?.trim() || DEFAULT_DEEPSEEK_BASE_URL,
    model: options.model?.trim() || DEFAULT_DEEPSEEK_MODEL,
    fetchImpl: options.fetchImpl ?? (globalThis.fetch as FetchLike | undefined),
    timeoutMs: options.timeoutMs ?? DEFAULT_DEEPSEEK_TIMEOUT_MS,
    maxAttempts: options.maxAttempts ?? DEFAULT_DEEPSEEK_MAX_ATTEMPTS,
    retryBackoffMs:
      options.retryBackoffMs ?? DEFAULT_DEEPSEEK_RETRY_BACKOFF_MS,
    maxInputChars: options.maxInputChars ?? 12_000,
  };

  if (!resolvedOptions.fetchImpl) {
    throw new Error('DeepSeek provider requires fetch support in the server runtime.');
  }

  const runCombinedEnrichment = async (
    input: AiEnrichmentSignalInput,
  ): Promise<AiEnrichmentOperationResult<AiCombinedEnrichmentPayload>> => {
    const requestBody = buildDeepSeekChatCompletionBody(input, {
      model: resolvedOptions.model,
      maxInputChars: resolvedOptions.maxInputChars,
    });

    try {
      const parsed = await runDeepSeekRequest(requestBody, {
        apiKey: resolvedOptions.apiKey,
        baseUrl: resolvedOptions.baseUrl,
        model: resolvedOptions.model,
        fetchImpl: resolvedOptions.fetchImpl,
        timeoutMs: resolvedOptions.timeoutMs,
        maxAttempts: resolvedOptions.maxAttempts,
        retryBackoffMs: resolvedOptions.retryBackoffMs,
        maxInputChars: resolvedOptions.maxInputChars,
      });

      return {
        operation: 'enrich',
        status: 'completed',
        source: 'deepseek',
        payload: parsed.payload,
        error_message: null,
        token_usage: parsed.tokenUsage,
      };
    } catch (error) {
      return buildFailedResult(
        'enrich',
        error instanceof Error ? error.message : 'DeepSeek enrichment failed.',
      );
    }
  };

  return {
    providerName: 'deepseek',
    providerVersion: 'phase4_task13b_v1',
    modelName: resolvedOptions.model,
    enrich: runCombinedEnrichment,
    async summarize(input) {
      const result = await runCombinedEnrichment(input);
      if (result.status !== 'completed' || !result.payload) {
        return buildFailedResult(
          'summarize',
          result.error_message ?? 'DeepSeek summarize failed.',
          result.token_usage,
        ) as AiEnrichmentOperationResult<AiSummaryPayload>;
      }

      return {
        operation: 'summarize',
        status: 'completed',
        source: 'deepseek',
        payload: {
          summary_en: result.payload.enriched_summary_en,
          summary_zh: result.payload.enriched_summary_zh,
        },
        error_message: null,
        token_usage: result.token_usage,
      };
    },
    async translate(input) {
      const result = await runCombinedEnrichment(input);
      if (result.status !== 'completed' || !result.payload) {
        return buildFailedResult(
          'translate',
          result.error_message ?? 'DeepSeek translate failed.',
          result.token_usage,
        ) as AiEnrichmentOperationResult<AiTranslationPayload>;
      }

      return {
        operation: 'translate',
        status: 'completed',
        source: 'deepseek',
        payload: {
          source_language: result.payload.source_language,
          target_languages: [...result.payload.target_languages],
          summary_en: result.payload.enriched_summary_en,
          summary_zh: result.payload.enriched_summary_zh,
          why_it_matters_en: [...result.payload.enriched_why_it_matters_en],
          why_it_matters_zh: [...result.payload.enriched_why_it_matters_zh],
        },
        error_message: null,
        token_usage: result.token_usage,
      };
    },
    async generateWhyItMatters(input) {
      const result = await runCombinedEnrichment(input);
      if (result.status !== 'completed' || !result.payload) {
        return buildFailedResult(
          'why_it_matters',
          result.error_message ?? 'DeepSeek why-it-matters generation failed.',
          result.token_usage,
        ) as AiEnrichmentOperationResult<AiWhyItMattersPayload>;
      }

      return {
        operation: 'why_it_matters',
        status: 'completed',
        source: 'deepseek',
        payload: {
          why_it_matters_en: [...result.payload.enriched_why_it_matters_en],
          why_it_matters_zh: [...result.payload.enriched_why_it_matters_zh],
        },
        error_message: null,
        token_usage: result.token_usage,
      };
    },
    async detectLanguage(input) {
      const result = await runCombinedEnrichment(input);
      if (result.status !== 'completed' || !result.payload) {
        return buildFailedResult(
          'detect_language',
          result.error_message ?? 'DeepSeek language detection failed.',
          result.token_usage,
        ) as AiEnrichmentOperationResult<AiLanguageDetectionPayload>;
      }

      return {
        operation: 'detect_language',
        status: 'completed',
        source: 'deepseek',
        payload: {
          source_language: result.payload.source_language,
        },
        error_message: null,
        token_usage: result.token_usage,
      };
    },
  };
}
