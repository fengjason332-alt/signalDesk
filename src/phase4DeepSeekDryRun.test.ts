import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

import {
  SAMPLE_AI_RSS_FEED_XML,
  SAMPLE_AI_RSS_SOURCE,
} from './lib/content/rssFixtures';
import type { AiEnrichmentSignalInput } from '../supabase/functions/_shared/enrichmentProvider.ts';
import {
  DEFAULT_DEEPSEEK_BASE_URL,
  DEFAULT_DEEPSEEK_MODEL,
  buildDeepSeekChatCompletionBody,
  createDeepSeekAiEnrichmentProvider,
} from '../supabase/functions/_shared/deepseekProvider.ts';
import {
  createPhase4AiEnrichmentDryRun,
  resolvePhase4AiEnrichmentServerConfig,
} from '../supabase/functions/_shared/phase4AiEnrichment.ts';
import { createPhase4IngestionHandler } from '../supabase/functions/_shared/phase4DryRun.ts';
import type {
  Phase4AiEnrichmentCandidateRecord,
  Phase4AiEnrichmentClaimInput,
  Phase4AiEnrichmentClaimResult,
  Phase4AiEnrichmentFailurePatch,
  Phase4AiEnrichmentStore,
  Phase4AiEnrichmentWritePatch,
} from '../supabase/functions/_shared/enrichmentStore.ts';

const repoRoot = process.cwd();
const srcRoot = resolve(repoRoot, 'src');

const getRuntimeSourceFiles = (root: string): string[] => {
  const files: string[] = [];

  for (const entry of readdirSync(root)) {
    const fullPath = join(root, entry);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      files.push(...getRuntimeSourceFiles(fullPath));
      continue;
    }

    if (!/\.(ts|tsx)$/.test(entry) || /\.test\.(ts|tsx)$/.test(entry)) {
      continue;
    }

    files.push(fullPath);
  }

  return files;
};

const LONG_TEXT = `${'OpenAI expanded data-center planning. '.repeat(240)}This sentence should be truncated before request dispatch.`;

const SAMPLE_SIGNAL_INPUT: AiEnrichmentSignalInput = {
  signal_id: 'signal-deepseek-1',
  primary_category: 'ai',
  categories: ['ai'],
  headline_en: 'OpenAI expands education and reasoning rollout',
  headline_zh: null,
  summary_en: 'Deterministic summary for dry-run testing.',
  summary_zh: null,
  why_it_matters_en: ['Deterministic why-it-matters fallback.'],
  why_it_matters_zh: [],
  tags: ['OpenAI', 'Reasoning'],
  source_language: 'en',
  target_languages: ['zh'],
  source_item_count: 1,
  published_at: '2026-05-22T08:00:00.000Z',
  provenance_sources: [
    {
      raw_source_item_id: 'raw-deepseek-1',
      source_name: 'OpenAI News',
      source_url: 'https://openai.com/news/education-for-countries',
      published_at: '2026-05-22T08:00:00.000Z',
      is_primary: true,
    },
  ],
  source_documents: [
    {
      raw_source_item_id: 'raw-deepseek-1',
      source_name: 'OpenAI News',
      source_url: 'https://openai.com/news/education-for-countries',
      published_at: '2026-05-22T08:00:00.000Z',
      title: 'The next phase of OpenAI’s Education for Countries',
      dek: 'A compact dek for the AI education rollout.',
      normalized_text: LONG_TEXT,
      is_primary: true,
    },
  ],
  topics: ['OpenAI Education'],
  entities: ['OpenAI'],
};

const makeCandidateRecord = (
  signalId: string,
  overrides: Partial<Phase4AiEnrichmentCandidateRecord> = {},
): Phase4AiEnrichmentCandidateRecord => ({
  signal_id: signalId,
  lifecycle_stage: 'candidate',
  generation_status: 'generated',
  primary_category: 'ai',
  categories: ['ai'],
  headline_en: `Headline for ${signalId}`,
  headline_zh: null,
  summary_en: 'Deterministic preview summary.',
  summary_zh: null,
  why_it_matters_en: ['Deterministic why-it-matters preview.'],
  why_it_matters_zh: [],
  tags: ['OpenAI'],
  primary_source_name: 'OpenAI News',
  primary_source_item_id: `${signalId}-raw-1`,
  source_item_count: 1,
  published_at: '2026-05-22T08:00:00.000Z',
  enrichment_status: 'not_requested',
  enrichment_version: null,
  enrichment_source: 'unknown',
  summary_status: 'not_requested',
  translation_status: 'not_requested',
  source_language: 'en',
  target_languages: ['zh'],
  last_enriched_at: null,
  enrichment_claim_id: null,
  enrichment_claimed_at: null,
  enrichment_claim_expires_at: null,
  enrichment_attempt_count: 0,
  enrichment_last_attempt_at: null,
  enrichment_next_retry_at: null,
  enrichment_last_run_id: null,
  source_rows: [
    {
      raw_source_item_id: `${signalId}-raw-1`,
      source_id: 'rss_openai_blog_ai',
      source_name: 'OpenAI News',
      canonical_url: 'https://openai.com/news/education-for-countries',
      published_at: '2026-05-22T08:00:00.000Z',
      title: 'The next phase of OpenAI’s Education for Countries',
      dek: 'A compact dek for the AI education rollout.',
      normalized_text: LONG_TEXT,
      is_primary: true,
    },
  ],
  topic_rows: [
    {
      topic_id: 'topic_openai_reasoning',
      topic_name: 'OpenAI Reasoning Models',
      relevance_score: 93,
    },
  ],
  entity_rows: [
    {
      entity_id: 'entity-openai',
      canonical_name: 'OpenAI',
      relevance_score: 95,
      mention_count: 3,
    },
  ],
  ...overrides,
});

class FakeAiEnrichmentStore implements Phase4AiEnrichmentStore {
  public claimCalls = 0;
  public writeCalls = 0;
  private readonly rows: Phase4AiEnrichmentCandidateRecord[];

  constructor(rows: Phase4AiEnrichmentCandidateRecord[]) {
    this.rows = rows;
  }

  async listCandidateSignals(signalIds?: string[]) {
    if (!signalIds?.length) {
      return this.rows.map(row => ({ ...row }));
    }

    const requested = new Set(signalIds);
    return this.rows.filter(row => requested.has(row.signal_id)).map(row => ({ ...row }));
  }

  async claimSignalForEnrichment(
    _input: Phase4AiEnrichmentClaimInput,
  ): Promise<Phase4AiEnrichmentClaimResult> {
    this.claimCalls += 1;
    return {
      signal_id: 'unused-dry-run-claim',
      claim_status: 'claimed',
      claim_token: 'unused-dry-run-claim-token',
      enrichment_status: 'pending',
      enrichment_version: null,
      summary_status: 'pending',
      translation_status: 'pending',
      last_enriched_at: null,
      next_retry_at: null,
      attempt_count: 1,
    };
  }

  async writeEnrichmentResult(
    _signalId: string,
    _claimToken: string,
    _patch: Phase4AiEnrichmentWritePatch,
  ) {
    this.writeCalls += 1;
  }

  async recordEnrichmentFailure(
    _signalId: string,
    _claimToken: string,
    _patch: Phase4AiEnrichmentFailurePatch,
  ) {
    this.writeCalls += 1;
  }

  async readEnrichmentResult() {
    return null;
  }
}

test('resolvePhase4AiEnrichmentServerConfig reads only server-side DeepSeek env names with safe defaults', () => {
  const env = new Map<string, string>([
    ['AI_PROVIDER', 'deepseek'],
    ['DEEPSEEK_API_KEY', 'server-secret-key'],
    ['PHASE4_ENABLE_AI_ENRICHMENT', 'true'],
  ]);

  const config = resolvePhase4AiEnrichmentServerConfig(key => env.get(key));

  assert.equal(config.provider, 'deepseek');
  assert.equal(config.enabled, true);
  assert.equal(config.dryRunOnly, true);
  assert.equal(config.deepseekApiKey, 'server-secret-key');
  assert.equal(config.deepseekBaseUrl, DEFAULT_DEEPSEEK_BASE_URL);
  assert.equal(config.deepseekModel, DEFAULT_DEEPSEEK_MODEL);
});

test('buildDeepSeekChatCompletionBody excludes raw_html and truncates long normalized_text inputs', () => {
  const request = buildDeepSeekChatCompletionBody(SAMPLE_SIGNAL_INPUT, {
    model: DEFAULT_DEEPSEEK_MODEL,
    maxInputChars: 1200,
  });

  const serialized = JSON.stringify(request);

  assert.match(serialized, /OpenAI News/);
  assert.doesNotMatch(serialized, /raw_html/i);
  assert.ok(serialized.length < LONG_TEXT.length);
});

test('DeepSeek provider maps valid JSON into proposed enrichment output', async () => {
  const provider = createDeepSeekAiEnrichmentProvider({
    apiKey: 'server-secret-key',
    baseUrl: DEFAULT_DEEPSEEK_BASE_URL,
    model: DEFAULT_DEEPSEEK_MODEL,
    fetchImpl: async (_url, init) => {
      assert.match(String(init?.headers && (init.headers as Record<string, string>).Authorization), /^Bearer /);
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  enriched_summary_en: 'OpenAI expanded a country-facing education and reasoning initiative.',
                  enriched_summary_zh: 'OpenAI 扩展了面向国家级教育和推理能力的计划。',
                  enriched_why_it_matters_en: [
                    'This broadens OpenAI’s policy-facing distribution strategy.',
                  ],
                  enriched_why_it_matters_zh: [
                    '这表明 OpenAI 正在扩大其面向政策与教育场景的分发策略。',
                  ],
                  source_language: 'en',
                  target_languages: ['zh'],
                  confidence_notes: 'Single-source dry-run output.',
                }),
              },
            },
          ],
          usage: {
            prompt_tokens: 321,
            completion_tokens: 111,
            total_tokens: 432,
          },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    },
  });

  const result = await provider.enrich(SAMPLE_SIGNAL_INPUT);

  assert.equal(result.status, 'completed');
  assert.equal(result.source, 'deepseek');
  assert.equal(
    result.payload?.enriched_summary_en,
    'OpenAI expanded a country-facing education and reasoning initiative.',
  );
  assert.equal(result.payload?.source_language, 'en');
  assert.deepEqual(result.payload?.target_languages, ['zh']);
  assert.equal(result.token_usage?.total_tokens, 432);
});

test('DeepSeek provider returns failed result for invalid JSON output', async () => {
  let calls = 0;
  const provider = createDeepSeekAiEnrichmentProvider({
    apiKey: 'server-secret-key',
    baseUrl: DEFAULT_DEEPSEEK_BASE_URL,
    model: DEFAULT_DEEPSEEK_MODEL,
    fetchImpl: async () => {
      calls += 1;
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: '{not valid json',
              },
            },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    },
  });

  const result = await provider.enrich(SAMPLE_SIGNAL_INPUT);

  assert.equal(result.status, 'failed');
  assert.equal(result.payload, null);
  assert.match(result.error_message ?? '', /invalid json/i);
  assert.equal(calls, 1);
});

test('AI enrichment dry-run returns provider_not_configured instead of crashing when DeepSeek env is missing', async () => {
  const store = new FakeAiEnrichmentStore([makeCandidateRecord('signal-one')]);

  const result = await createPhase4AiEnrichmentDryRun(
    {
      dryRun: true,
      aiEnrichment: {
        provider: 'deepseek',
        maxSignals: 1,
      },
    },
    {
      aiEnrichmentStore: store,
      aiConfig: {
        provider: 'deepseek',
        enabled: true,
        dryRunOnly: true,
        deepseekApiKey: undefined,
        deepseekBaseUrl: DEFAULT_DEEPSEEK_BASE_URL,
        deepseekModel: DEFAULT_DEEPSEEK_MODEL,
      },
    },
  );

  assert.equal(result.dry_run, true);
  assert.equal(result.no_writes_performed, true);
  assert.equal(result.code, 'provider_not_configured');
  assert.equal(store.writeCalls, 0);
});

test('AI enrichment dry-run does not write to the store and respects maxSignals cap', async () => {
  const store = new FakeAiEnrichmentStore(
    Array.from({ length: 12 }, (_, index) => makeCandidateRecord(`signal-${index + 1}`)),
  );

  const result = await createPhase4AiEnrichmentDryRun(
    {
      dryRun: true,
      aiEnrichment: {
        provider: 'noop',
        maxSignals: 99,
      },
    },
    {
      aiEnrichmentStore: store,
      aiConfig: {
        provider: 'noop',
        enabled: true,
        dryRunOnly: true,
        deepseekApiKey: undefined,
        deepseekBaseUrl: DEFAULT_DEEPSEEK_BASE_URL,
        deepseekModel: DEFAULT_DEEPSEEK_MODEL,
      },
    },
  );

  assert.equal(result.dry_run, true);
  assert.equal(result.provider, 'noop');
  assert.equal(result.no_writes_performed, true);
  assert.equal(result.selected_signal_count, 10);
  assert.equal(result.proposed_outputs.length, 10);
  assert.equal(store.claimCalls, 0);
  assert.equal(store.writeCalls, 0);
});

test('AI enrichment dry-run reports planner-level skipped reasons for ineligible signals', async () => {
  const store = new FakeAiEnrichmentStore([
    makeCandidateRecord('signal-pending', {
      enrichment_status: 'pending',
      summary_status: 'pending',
      translation_status: 'pending',
    }),
  ]);

  const result = await createPhase4AiEnrichmentDryRun(
    {
      dryRun: true,
      aiEnrichment: {
        provider: 'noop',
        signalIds: ['signal-pending'],
        maxSignals: 1,
      },
    },
    {
      aiEnrichmentStore: store,
      aiConfig: {
        provider: 'noop',
        enabled: true,
        dryRunOnly: true,
        deepseekApiKey: undefined,
        deepseekBaseUrl: DEFAULT_DEEPSEEK_BASE_URL,
        deepseekModel: DEFAULT_DEEPSEEK_MODEL,
      },
    },
  );

  assert.equal(result.selected_signal_count, 0);
  assert.equal(result.skipped_count, 1);
  assert.equal(result.proposed_outputs[0]?.status, 'skipped');
  assert.equal(result.proposed_outputs[0]?.reason, 'already_pending');
});

test('AI enrichment dry-run rejects dryRun false explicitly and still performs no writes', async () => {
  const store = new FakeAiEnrichmentStore([makeCandidateRecord('signal-no-write')]);

  const result = await createPhase4AiEnrichmentDryRun(
    {
      dryRun: false,
      aiEnrichment: {
        provider: 'noop',
        signalIds: ['signal-no-write'],
        maxSignals: 1,
      },
    },
    {
      aiEnrichmentStore: store,
      aiConfig: {
        provider: 'noop',
        enabled: true,
        dryRunOnly: true,
        deepseekApiKey: undefined,
        deepseekBaseUrl: DEFAULT_DEEPSEEK_BASE_URL,
        deepseekModel: DEFAULT_DEEPSEEK_MODEL,
      },
    },
  );

  assert.equal(result.code, 'ai_dry_run_only');
  assert.equal(result.no_writes_performed, true);
  assert.equal(store.writeCalls, 0);
});

test('phase4 ingestion handler routes aiEnrichment requests through the server-only dry-run branch', async () => {
  const store = new FakeAiEnrichmentStore([makeCandidateRecord('signal-handler-1')]);
  const handler = createPhase4IngestionHandler({
    aiEnrichmentStore: store,
    aiConfig: {
      provider: 'deepseek',
      enabled: true,
      dryRunOnly: true,
      deepseekApiKey: undefined,
      deepseekBaseUrl: DEFAULT_DEEPSEEK_BASE_URL,
      deepseekModel: DEFAULT_DEEPSEEK_MODEL,
    },
  });

  const response = await handler(
    new Request('http://localhost/phase4-dry-run', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        dryRun: true,
        aiEnrichment: {
          provider: 'deepseek',
          signalIds: ['signal-handler-1'],
          maxSignals: 1,
        },
      }),
    }),
  );

  assert.equal(response.status, 503);
  const payload = await response.json();
  assert.equal(payload.code, 'provider_not_configured');
  assert.equal(payload.no_writes_performed, true);
  assert.equal(store.writeCalls, 0);
});

test('phase4 ingestion handler rejects mixed ingestion and aiEnrichment payloads before any provider call', async () => {
  let aiFetchCalls = 0;
  const store = new FakeAiEnrichmentStore([makeCandidateRecord('signal-mixed-1')]);
  const handler = createPhase4IngestionHandler({
    sourceRegistry: [SAMPLE_AI_RSS_SOURCE],
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      text: async () => SAMPLE_AI_RSS_FEED_XML,
    }),
    aiEnrichmentStore: store,
    aiConfig: {
      provider: 'deepseek',
      enabled: true,
      dryRunOnly: true,
      deepseekApiKey: 'server-only-secret',
      deepseekBaseUrl: DEFAULT_DEEPSEEK_BASE_URL,
      deepseekModel: DEFAULT_DEEPSEEK_MODEL,
    },
    aiFetchImpl: async () => {
      aiFetchCalls += 1;
      throw new Error('AI provider should not be called for mixed requests');
    },
  });

  const response = await handler(
    new Request('http://localhost/phase4-dry-run', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        intent: 'ingestion',
        triggerMode: 'scheduled',
        dryRun: true,
        sourceIds: [SAMPLE_AI_RSS_SOURCE.id],
        aiEnrichment: {
          provider: 'deepseek',
          maxSignals: 1,
        },
      }),
    }),
  );

  assert.equal(response.status, 400);
  const payload = await response.json();
  assert.equal(payload.code, 'phase4_mixed_intent_not_allowed');
  assert.equal(aiFetchCalls, 0);
  assert.equal(store.claimCalls, 0);
  assert.equal(store.writeCalls, 0);
});

test('phase4 ingestion handler keeps non-AI ingestion requests away from the AI provider path entirely', async () => {
  let aiFetchCalls = 0;
  const handler = createPhase4IngestionHandler({
    sourceRegistry: [SAMPLE_AI_RSS_SOURCE],
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      text: async () => SAMPLE_AI_RSS_FEED_XML,
    }),
    aiConfig: {
      provider: 'deepseek',
      enabled: true,
      dryRunOnly: true,
      deepseekApiKey: 'server-only-secret',
      deepseekBaseUrl: DEFAULT_DEEPSEEK_BASE_URL,
      deepseekModel: DEFAULT_DEEPSEEK_MODEL,
    },
    aiFetchImpl: async () => {
      aiFetchCalls += 1;
      throw new Error('AI provider should not run during non-AI ingestion');
    },
  });

  const response = await handler(
    new Request('http://localhost/phase4-dry-run', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        intent: 'ingestion',
        dryRun: true,
        sourceIds: [SAMPLE_AI_RSS_SOURCE.id],
        maxItemsPerSource: 1,
      }),
    }),
  );

  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.request_kind, 'ingestion');
  assert.equal(payload.dry_run, true);
  assert.equal(aiFetchCalls, 0);
});

test('AI enrichment rejects scheduled trigger mode so manual-only execution remains enforced', async () => {
  const store = new FakeAiEnrichmentStore([makeCandidateRecord('signal-scheduled-ai')]);

  const response = await createPhase4AiEnrichmentDryRun(
    {
      intent: 'ai_enrichment',
      triggerMode: 'scheduled',
      dryRun: true,
      aiEnrichment: {
        provider: 'deepseek',
        signalIds: ['signal-scheduled-ai'],
        maxSignals: 1,
      },
    },
    {
      aiEnrichmentStore: store,
      aiConfig: {
        provider: 'deepseek',
        enabled: true,
        dryRunOnly: true,
        deepseekApiKey: 'server-only-secret',
        deepseekBaseUrl: DEFAULT_DEEPSEEK_BASE_URL,
        deepseekModel: DEFAULT_DEEPSEEK_MODEL,
      },
    },
  );

  assert.equal(response.code, 'ai_scheduled_trigger_not_allowed');
  assert.equal(response.no_writes_performed, true);
  assert.equal(store.claimCalls, 0);
  assert.equal(store.writeCalls, 0);
});

test('frontend runtime files do not import DeepSeek provider modules or server-side AI env names', () => {
  const runtimeFiles = getRuntimeSourceFiles(srcRoot);
  const forbiddenPatterns = [
    /deepseekProvider/i,
    /phase4AiEnrichment/i,
    /DEEPSEEK_API_KEY/,
    /AI_PROVIDER/,
  ];

  for (const filePath of runtimeFiles) {
    const source = readFileSync(filePath, 'utf8');
    for (const pattern of forbiddenPatterns) {
      assert.doesNotMatch(
        source,
        pattern,
        `Frontend runtime file should not contain DeepSeek/provider code: ${filePath}`,
      );
    }
  }
});
