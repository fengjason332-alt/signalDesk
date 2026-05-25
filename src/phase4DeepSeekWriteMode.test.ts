import test from 'node:test';
import assert from 'node:assert/strict';

import { createPhase4IngestionHandler } from '../supabase/functions/_shared/phase4DryRun.ts';
import type {
  Phase4AiEnrichmentCandidateRecord,
  Phase4AiEnrichmentReadbackRecord,
  Phase4AiEnrichmentStore,
  Phase4AiEnrichmentWritePatch,
} from '../supabase/functions/_shared/enrichmentStore.ts';
import {
  DEFAULT_DEEPSEEK_BASE_URL,
  DEFAULT_DEEPSEEK_MODEL,
} from '../supabase/functions/_shared/deepseekProvider.ts';

const LONG_TEXT = `${'OpenAI expanded country-level education planning. '.repeat(120)}This tail should stay server-only.`;

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
      topic_id: 'topic_ai',
      topic_name: 'Artificial Intelligence',
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

class FakeWritableAiEnrichmentStore implements Phase4AiEnrichmentStore {
  public writeCalls = 0;
  public patches: Array<{ signalId: string; patch: Phase4AiEnrichmentWritePatch }> = [];
  private readonly rows = new Map<string, Phase4AiEnrichmentCandidateRecord>();
  private readonly readbacks = new Map<string, Phase4AiEnrichmentReadbackRecord>();

  constructor(rows: Phase4AiEnrichmentCandidateRecord[]) {
    for (const row of rows) {
      this.rows.set(row.signal_id, {
        ...row,
        categories: [...row.categories],
        why_it_matters_en: [...row.why_it_matters_en],
        why_it_matters_zh: [...row.why_it_matters_zh],
        tags: [...row.tags],
        target_languages: [...row.target_languages],
        source_rows: row.source_rows.map(sourceRow => ({ ...sourceRow })),
        topic_rows: row.topic_rows.map(topicRow => ({ ...topicRow })),
        entity_rows: row.entity_rows.map(entityRow => ({ ...entityRow })),
      });
      this.readbacks.set(row.signal_id, {
        signal_id: row.signal_id,
        enrichment_status: row.enrichment_status,
        enrichment_version: row.enrichment_version,
        enrichment_source: row.enrichment_source,
        summary_status: row.summary_status,
        translation_status: row.translation_status,
        source_language: row.source_language,
        target_languages: [...row.target_languages],
        enrichment_error: null,
        last_enriched_at: row.last_enriched_at,
      });
    }
  }

  async listCandidateSignals(signalIds?: string[]) {
    const rows =
      signalIds && signalIds.length > 0
        ? signalIds
            .map(signalId => this.rows.get(signalId))
            .filter((value): value is Phase4AiEnrichmentCandidateRecord => value !== undefined)
        : [...this.rows.values()];

    return rows.map(row => ({
      ...row,
      categories: [...row.categories],
      why_it_matters_en: [...row.why_it_matters_en],
      why_it_matters_zh: [...row.why_it_matters_zh],
      tags: [...row.tags],
      target_languages: [...row.target_languages],
      source_rows: row.source_rows.map(sourceRow => ({ ...sourceRow })),
      topic_rows: row.topic_rows.map(topicRow => ({ ...topicRow })),
      entity_rows: row.entity_rows.map(entityRow => ({ ...entityRow })),
    }));
  }

  async claimSignalForEnrichment() {
    return false;
  }

  async writeEnrichmentResult(signalId: string, patch: Phase4AiEnrichmentWritePatch) {
    this.writeCalls += 1;
    this.patches.push({
      signalId,
      patch: {
        ...patch,
        target_languages: [...patch.target_languages],
        enriched_why_it_matters_en: [...patch.enriched_why_it_matters_en],
        enriched_why_it_matters_zh: [...patch.enriched_why_it_matters_zh],
      },
    });

    const row = this.rows.get(signalId);
    if (row) {
      row.enrichment_status = patch.enrichment_status;
      row.enrichment_version = patch.enrichment_version;
      row.enrichment_source = patch.enrichment_source;
      row.summary_status = patch.summary_status;
      row.translation_status = patch.translation_status;
      row.source_language = patch.source_language;
      row.target_languages = [...patch.target_languages];
      row.last_enriched_at = patch.last_enriched_at;
    }

    this.readbacks.set(signalId, {
      signal_id: signalId,
      enrichment_status: patch.enrichment_status,
      enrichment_version: patch.enrichment_version,
      enrichment_source: patch.enrichment_source,
      summary_status: patch.summary_status,
      translation_status: patch.translation_status,
      source_language: patch.source_language,
      target_languages: [...patch.target_languages],
      enrichment_error: patch.enrichment_error,
      last_enriched_at: patch.last_enriched_at,
    });
  }

  async readEnrichmentResult(signalId: string) {
    const readback = this.readbacks.get(signalId);
    return readback
      ? {
          ...readback,
          target_languages: [...readback.target_languages],
        }
      : null;
  }
}

const buildAiConfig = (overrides: Partial<Parameters<typeof createPhase4IngestionHandler>[0]['aiConfig']> = {}) => ({
  provider: 'deepseek' as const,
  enabled: true,
  dryRunOnly: false,
  deepseekApiKey: 'server-secret-key',
  deepseekBaseUrl: DEFAULT_DEEPSEEK_BASE_URL,
  deepseekModel: DEFAULT_DEEPSEEK_MODEL,
  ...overrides,
});

const createValidDeepSeekResponse = () =>
  new Response(
    JSON.stringify({
      choices: [
        {
          message: {
            content: JSON.stringify({
              enriched_summary_en:
                'OpenAI expanded a country-facing education and reasoning initiative.',
              enriched_summary_zh:
                'OpenAI 扩展了面向国家级教育和推理能力的计划。',
              enriched_why_it_matters_en: [
                'This broadens OpenAI’s policy-facing distribution strategy.',
              ],
              enriched_why_it_matters_zh: [
                '这表明 OpenAI 正在扩大其面向政策与教育场景的分发策略。',
              ],
              source_language: 'en',
              target_languages: ['zh'],
              confidence_notes: 'Single-source manual write-mode output.',
            }),
          },
        },
      ],
      usage: {
        prompt_tokens: 120,
        completion_tokens: 80,
        total_tokens: 200,
      },
    }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  );

const createHandler = (
  store: FakeWritableAiEnrichmentStore,
  {
    aiConfig = buildAiConfig(),
    writeAuthToken = 'phase4-write-token',
    fetchImpl,
  }: {
    aiConfig?: ReturnType<typeof buildAiConfig>;
    writeAuthToken?: string | null;
    fetchImpl?: (url: string, init?: RequestInit) => Promise<Response>;
  } = {},
) =>
  createPhase4IngestionHandler({
    aiEnrichmentStore: store,
    aiConfig,
    writeAuthToken,
    aiFetchImpl: fetchImpl,
  });

const buildWriteRequest = (overrides: Record<string, unknown> = {}) =>
  new Request('http://localhost/phase4-dry-run', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-phase4-write-token': 'phase4-write-token',
    },
    body: JSON.stringify({
      dryRun: false,
      aiEnrichment: {
        provider: 'deepseek',
        maxSignals: 1,
        signalIds: ['signal-write-1'],
        writeMode: true,
        ...overrides,
      },
    }),
  });

test('AI enrichment dry-run still writes nothing when writeMode is not requested', async () => {
  const store = new FakeWritableAiEnrichmentStore([makeCandidateRecord('signal-write-1')]);
  const handler = createHandler(store);

  const response = await handler(
    new Request('http://localhost/phase4-dry-run', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        dryRun: true,
        aiEnrichment: {
          provider: 'noop',
          signalIds: ['signal-write-1'],
          maxSignals: 1,
        },
      }),
    }),
  );

  const payload = await response.json();
  assert.equal(response.status, 200);
  assert.equal(payload.dry_run, true);
  assert.equal(payload.no_writes_performed, true);
  assert.equal(store.writeCalls, 0);
});

test('AI enrichment write mode is blocked when dryRun is omitted', async () => {
  const store = new FakeWritableAiEnrichmentStore([makeCandidateRecord('signal-write-1')]);
  const handler = createHandler(store);

  const response = await handler(
    new Request('http://localhost/phase4-dry-run', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-phase4-write-token': 'phase4-write-token',
      },
      body: JSON.stringify({
        aiEnrichment: {
          provider: 'deepseek',
          signalIds: ['signal-write-1'],
          maxSignals: 1,
          writeMode: true,
        },
      }),
    }),
  );

  const payload = await response.json();
  assert.equal(response.status, 403);
  assert.equal(payload.code, 'ai_write_requires_dry_run_false');
  assert.equal(store.writeCalls, 0);
});

test('AI enrichment write mode is blocked when dryRun is true', async () => {
  const store = new FakeWritableAiEnrichmentStore([makeCandidateRecord('signal-write-1')]);
  const handler = createHandler(store);

  const response = await handler(
    new Request('http://localhost/phase4-dry-run', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-phase4-write-token': 'phase4-write-token',
      },
      body: JSON.stringify({
        dryRun: true,
        aiEnrichment: {
          provider: 'deepseek',
          signalIds: ['signal-write-1'],
          maxSignals: 1,
          writeMode: true,
        },
      }),
    }),
  );

  const payload = await response.json();
  assert.equal(response.status, 403);
  assert.equal(payload.code, 'ai_write_requires_dry_run_false');
  assert.equal(store.writeCalls, 0);
});

test('AI enrichment write mode is blocked while PHASE4_AI_DRY_RUN_ONLY remains true', async () => {
  const store = new FakeWritableAiEnrichmentStore([makeCandidateRecord('signal-write-1')]);
  let fetchCalls = 0;
  const handler = createHandler(store, {
    aiConfig: buildAiConfig({
      dryRunOnly: true,
    }),
    fetchImpl: async () => {
      fetchCalls += 1;
      return createValidDeepSeekResponse();
    },
  });

  const response = await handler(buildWriteRequest());
  const payload = await response.json();

  assert.equal(response.status, 403);
  assert.equal(payload.code, 'ai_dry_run_only');
  assert.equal(fetchCalls, 0);
  assert.equal(store.writeCalls, 0);
});

test('AI enrichment write mode is blocked without x-phase4-write-token', async () => {
  const store = new FakeWritableAiEnrichmentStore([makeCandidateRecord('signal-write-1')]);
  let fetchCalls = 0;
  const handler = createHandler(store, {
    fetchImpl: async () => {
      fetchCalls += 1;
      return createValidDeepSeekResponse();
    },
  });

  const request = buildWriteRequest();
  request.headers.delete('x-phase4-write-token');

  const response = await handler(request);
  const payload = await response.json();

  assert.equal(response.status, 403);
  assert.equal(payload.code, 'ai_write_token_missing');
  assert.equal(fetchCalls, 0);
  assert.equal(store.writeCalls, 0);
});

test('AI enrichment write mode is blocked with the wrong write token', async () => {
  const store = new FakeWritableAiEnrichmentStore([makeCandidateRecord('signal-write-1')]);
  let fetchCalls = 0;
  const handler = createHandler(store, {
    fetchImpl: async () => {
      fetchCalls += 1;
      return createValidDeepSeekResponse();
    },
  });

  const request = buildWriteRequest();
  request.headers.set('x-phase4-write-token', 'wrong-token');

  const response = await handler(request);
  const payload = await response.json();

  assert.equal(response.status, 403);
  assert.equal(payload.code, 'ai_write_token_mismatch');
  assert.equal(fetchCalls, 0);
  assert.equal(store.writeCalls, 0);
});

test('AI enrichment write mode rejects requests above the hard maxSignals cap of 3', async () => {
  const store = new FakeWritableAiEnrichmentStore([makeCandidateRecord('signal-write-1')]);
  let fetchCalls = 0;
  const handler = createHandler(store, {
    fetchImpl: async () => {
      fetchCalls += 1;
      return createValidDeepSeekResponse();
    },
  });

  const response = await handler(
    buildWriteRequest({
      maxSignals: 4,
    }),
  );
  const payload = await response.json();

  assert.equal(response.status, 400);
  assert.equal(payload.code, 'ai_write_signal_limit_exceeded');
  assert.equal(fetchCalls, 0);
  assert.equal(store.writeCalls, 0);
});

test('AI enrichment write mode persists only approved enrichment fields and returns readback', async () => {
  const candidate = makeCandidateRecord('signal-write-1');
  const store = new FakeWritableAiEnrichmentStore([candidate]);
  const handler = createHandler(store, {
    fetchImpl: async () => createValidDeepSeekResponse(),
  });

  const response = await handler(buildWriteRequest());
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.dry_run, false);
  assert.equal(payload.write_mode_enabled, true);
  assert.equal(payload.written_count, 1);
  assert.equal(payload.failed_count, 0);
  assert.equal(store.writeCalls, 1);
  assert.deepEqual(Object.keys(store.patches[0]!.patch).sort(), [
    'enriched_summary_en',
    'enriched_summary_zh',
    'enriched_why_it_matters_en',
    'enriched_why_it_matters_zh',
    'enrichment_error',
    'enrichment_source',
    'enrichment_status',
    'enrichment_version',
    'last_enriched_at',
    'source_language',
    'summary_status',
    'target_languages',
    'translation_status',
    'updated_at',
  ]);
  assert.equal(store.patches[0]!.patch.enrichment_source, 'deepseek');
  assert.equal(candidate.headline_en, 'Headline for signal-write-1');
  assert.equal(candidate.summary_en, 'Deterministic preview summary.');
  assert.equal(candidate.primary_source_name, 'OpenAI News');
  assert.equal(payload.proposed_outputs[0]?.readback_status, 'loaded');
  assert.equal(payload.proposed_outputs[0]?.readback?.enrichment_status, 'completed');
  assert.equal(payload.proposed_outputs[0]?.enrichment_status_after_write, 'completed');
  assert.ok(payload.proposed_outputs[0]?.last_enriched_at_after_write);
});

test('AI enrichment write mode skips current-version completed enrichment unless force=true', async () => {
  const alreadyEnriched = makeCandidateRecord('signal-write-1', {
    enrichment_status: 'completed',
    enrichment_version: 1,
    enrichment_source: 'deepseek',
    summary_status: 'completed',
    translation_status: 'completed',
    last_enriched_at: '2026-05-23T08:00:00.000Z',
  });
  const store = new FakeWritableAiEnrichmentStore([alreadyEnriched]);
  const handler = createHandler(store, {
    fetchImpl: async () => createValidDeepSeekResponse(),
  });

  const skippedResponse = await handler(buildWriteRequest());
  const skippedPayload = await skippedResponse.json();
  assert.equal(skippedResponse.status, 200);
  assert.equal(skippedPayload.written_count, 0);
  assert.equal(skippedPayload.skipped_count, 1);
  assert.equal(skippedPayload.proposed_outputs[0]?.reason, 'skipped_existing_enrichment');
  assert.equal(store.writeCalls, 0);

  const forcedResponse = await handler(
    buildWriteRequest({
      force: true,
    }),
  );
  const forcedPayload = await forcedResponse.json();
  assert.equal(forcedResponse.status, 200);
  assert.equal(forcedPayload.written_count, 1);
  assert.equal(store.writeCalls, 1);
});

test('AI enrichment write mode does not write when provider output is invalid', async () => {
  const store = new FakeWritableAiEnrichmentStore([makeCandidateRecord('signal-write-1')]);
  const handler = createHandler(store, {
    fetchImpl: async () =>
      new Response(
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
      ),
  });

  const response = await handler(buildWriteRequest());
  const payload = await response.json();

  assert.equal(response.status, 500);
  assert.equal(payload.written_count, 0);
  assert.equal(payload.failed_count, 1);
  assert.equal(payload.proposed_outputs[0]?.validation_status, 'failed');
  assert.equal(payload.proposed_outputs[0]?.write_status, 'not_attempted');
  assert.equal(store.writeCalls, 0);
});

test('AI enrichment write mode defaults to a single eligible signal when signalIds are omitted', async () => {
  const store = new FakeWritableAiEnrichmentStore([
    makeCandidateRecord('signal-write-1'),
    makeCandidateRecord('signal-write-2'),
  ]);
  const handler = createHandler(store, {
    fetchImpl: async () => createValidDeepSeekResponse(),
  });

  const response = await handler(
    buildWriteRequest({
      signalIds: undefined,
      maxSignals: undefined,
    }),
  );
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.selected_signal_count, 1);
  assert.equal(payload.written_count, 1);
  assert.equal(store.writeCalls, 1);
});
