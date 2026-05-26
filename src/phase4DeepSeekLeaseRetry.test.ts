import test from 'node:test';
import assert from 'node:assert/strict';

import { createPhase4IngestionHandler } from '../supabase/functions/_shared/phase4DryRun.ts';
import type {
  Phase4AiEnrichmentCandidateRecord,
  Phase4AiEnrichmentClaimInput,
  Phase4AiEnrichmentClaimResult,
  Phase4AiEnrichmentFailurePatch,
  Phase4AiEnrichmentReadbackRecord,
  Phase4AiEnrichmentStore,
  Phase4AiEnrichmentWritePatch,
} from '../supabase/functions/_shared/enrichmentStore.ts';
import {
  DEFAULT_DEEPSEEK_BASE_URL,
  DEFAULT_DEEPSEEK_MODEL,
} from '../supabase/functions/_shared/deepseekProvider.ts';

const LONG_TEXT = `${'OpenAI expanded country-level education planning. '.repeat(120)}This tail should stay server-only.`;

const CLAIM_TTL_MS = 5 * 60 * 1000;
const RETRY_BACKOFF_MS = 30 * 60 * 1000;

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
  published_at: '2026-05-24T08:00:00.000Z',
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
      canonical_url: `https://openai.com/news/${signalId}`,
      published_at: '2026-05-24T08:00:00.000Z',
      title: `The next phase for ${signalId}`,
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

type ClaimState = {
  claimId: string | null;
  claimedAt: string | null;
  claimExpiresAt: string | null;
  attemptCount: number;
  lastAttemptAt: string | null;
  nextRetryAt: string | null;
  lastRunId: string | null;
};

class LeaseAwareFakeAiEnrichmentStore implements Phase4AiEnrichmentStore {
  public writeCalls = 0;
  public failureCalls = 0;
  public claimCalls = 0;
  public claimHistory: Array<{ signalId: string; startedAt: string }> = [];
  public writeHistory: Array<{ signalId: string; patch: Phase4AiEnrichmentWritePatch }> = [];
  public failureHistory: Array<{ signalId: string; patch: Phase4AiEnrichmentFailurePatch }> = [];
  public simulatedFailures = new Set<string>();
  public simulatedReadbackFailures = new Set<string>();
  public currentTime = '2026-05-25T10:00:00.000Z';
  private readonly rows = new Map<string, Phase4AiEnrichmentCandidateRecord>();
  private readonly readbacks = new Map<string, Phase4AiEnrichmentReadbackRecord>();
  private readonly claims = new Map<string, ClaimState>();

  constructor(rows: Phase4AiEnrichmentCandidateRecord[]) {
    for (const row of rows) {
      this.rows.set(row.signal_id, structuredClone(row));
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
        enrichment_claim_id: row.enrichment_claim_id,
        enrichment_claimed_at: row.enrichment_claimed_at,
        enrichment_claim_expires_at: row.enrichment_claim_expires_at,
        enrichment_attempt_count: row.enrichment_attempt_count,
        enrichment_last_attempt_at: row.enrichment_last_attempt_at,
        enrichment_next_retry_at: row.enrichment_next_retry_at,
        enrichment_last_run_id: row.enrichment_last_run_id,
      });
      this.claims.set(row.signal_id, {
        claimId: null,
        claimedAt: null,
        claimExpiresAt: null,
        attemptCount: 0,
        lastAttemptAt: null,
        nextRetryAt: null,
        lastRunId: null,
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

    return rows.map(row => structuredClone(row));
  }

  async claimSignalForEnrichment(
    input: Phase4AiEnrichmentClaimInput,
  ): Promise<Phase4AiEnrichmentClaimResult> {
    this.claimCalls += 1;
    this.claimHistory.push({
      signalId: input.signal_id,
      startedAt: input.started_at,
    });

    const row = this.rows.get(input.signal_id);
    const claim = this.claims.get(input.signal_id);
    assert.ok(row);
    assert.ok(claim);

    const startedAt = Date.parse(input.started_at);
    const claimExpiresAt = claim.claimExpiresAt ? Date.parse(claim.claimExpiresAt) : null;
    const nextRetryAt = claim.nextRetryAt ? Date.parse(claim.nextRetryAt) : null;

    if (
      row.enrichment_status === 'completed' &&
      row.enrichment_version === input.target_enrichment_version &&
      row.summary_status === 'completed' &&
      row.translation_status === 'completed'
    ) {
      return {
        signal_id: input.signal_id,
        claim_status: 'skipped_existing_enrichment',
        claim_token: null,
        enrichment_status: row.enrichment_status,
        enrichment_version: row.enrichment_version,
        summary_status: row.summary_status,
        translation_status: row.translation_status,
        last_enriched_at: row.last_enriched_at,
        next_retry_at: claim.nextRetryAt,
        attempt_count: claim.attemptCount,
      };
    }

    if (claim.claimId && claimExpiresAt !== null && claimExpiresAt > startedAt) {
      return {
        signal_id: input.signal_id,
        claim_status: 'skipped_claimed',
        claim_token: claim.claimId,
        enrichment_status: row.enrichment_status,
        enrichment_version: row.enrichment_version,
        summary_status: row.summary_status,
        translation_status: row.translation_status,
        last_enriched_at: row.last_enriched_at,
        next_retry_at: claim.nextRetryAt,
        attempt_count: claim.attemptCount,
      };
    }

    if (nextRetryAt !== null && nextRetryAt > startedAt) {
      return {
        signal_id: input.signal_id,
        claim_status: 'retry_backoff_active',
        claim_token: null,
        enrichment_status: row.enrichment_status,
        enrichment_version: row.enrichment_version,
        summary_status: row.summary_status,
        translation_status: row.translation_status,
        last_enriched_at: row.last_enriched_at,
        next_retry_at: claim.nextRetryAt,
        attempt_count: claim.attemptCount,
      };
    }

    claim.claimId = input.claim_token;
    claim.claimedAt = input.started_at;
    claim.claimExpiresAt = new Date(startedAt + CLAIM_TTL_MS).toISOString();
    claim.attemptCount += 1;
    claim.lastAttemptAt = input.started_at;
    claim.lastRunId = input.claim_token;
    row.enrichment_claim_id = input.claim_token;
    row.enrichment_claimed_at = input.started_at;
    row.enrichment_claim_expires_at = claim.claimExpiresAt;
    row.enrichment_attempt_count = claim.attemptCount;
    row.enrichment_last_attempt_at = input.started_at;
    row.enrichment_next_retry_at = null;
    row.enrichment_last_run_id = input.claim_token;
    row.enrichment_status = 'pending';
    row.summary_status = 'pending';
    row.translation_status = 'pending';
    return {
      signal_id: input.signal_id,
      claim_status: 'claimed',
      claim_token: input.claim_token,
      enrichment_status: row.enrichment_status,
      enrichment_version: row.enrichment_version,
      summary_status: row.summary_status,
      translation_status: row.translation_status,
      last_enriched_at: row.last_enriched_at,
      next_retry_at: null,
      attempt_count: claim.attemptCount,
    };
  }

  async writeEnrichmentResult(
    signalId: string,
    claimToken: string,
    patch: Phase4AiEnrichmentWritePatch,
  ) {
    this.writeCalls += 1;
    this.writeHistory.push({
      signalId,
      patch: structuredClone(patch),
    });

    if (this.simulatedFailures.has(signalId)) {
      throw new Error(`Simulated write failure for ${signalId}`);
    }

    const row = this.rows.get(signalId);
    const claim = this.claims.get(signalId);
    assert.ok(row);
    assert.ok(claim);

    if (claim.claimId !== claimToken) {
      throw new Error(`Stale claim for ${signalId}`);
    }

    row.enrichment_status = patch.enrichment_status;
    row.enrichment_version = patch.enrichment_version;
    row.enrichment_source = patch.enrichment_source;
    row.summary_status = patch.summary_status;
    row.translation_status = patch.translation_status;
    row.source_language = patch.source_language;
    row.target_languages = [...patch.target_languages];
    row.last_enriched_at = patch.last_enriched_at;
    row.enrichment_claim_id = null;
    row.enrichment_claimed_at = null;
    row.enrichment_claim_expires_at = null;
    row.enrichment_last_attempt_at = patch.last_enriched_at;
    row.enrichment_next_retry_at = null;

    claim.claimId = null;
    claim.claimedAt = null;
    claim.claimExpiresAt = null;
    claim.nextRetryAt = null;

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
      enrichment_claim_id: null,
      enrichment_claimed_at: null,
      enrichment_claim_expires_at: null,
      enrichment_attempt_count: claim.attemptCount,
      enrichment_last_attempt_at: patch.last_enriched_at,
      enrichment_next_retry_at: null,
      enrichment_last_run_id: claim.lastRunId,
    });
  }

  async recordEnrichmentFailure(
    signalId: string,
    claimToken: string,
    patch: Phase4AiEnrichmentFailurePatch,
  ) {
    this.failureCalls += 1;
    this.failureHistory.push({
      signalId,
      patch: structuredClone(patch),
    });

    const row = this.rows.get(signalId);
    const claim = this.claims.get(signalId);
    assert.ok(row);
    assert.ok(claim);

    if (claim.claimId !== claimToken) {
      throw new Error(`Stale claim for ${signalId}`);
    }

    row.enrichment_status = patch.enrichment_status;
    row.enrichment_version = patch.enrichment_version;
    row.enrichment_source = patch.enrichment_source;
    row.summary_status = patch.summary_status;
    row.translation_status = patch.translation_status;
    row.source_language = patch.source_language;
    row.target_languages = [...patch.target_languages];
    row.enrichment_claim_id = null;
    row.enrichment_claimed_at = null;
    row.enrichment_claim_expires_at = null;
    row.enrichment_next_retry_at = patch.next_retry_at;

    claim.claimId = null;
    claim.claimedAt = null;
    claim.claimExpiresAt = null;
    claim.nextRetryAt = patch.next_retry_at;

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
      last_enriched_at: row.last_enriched_at,
      enrichment_claim_id: null,
      enrichment_claimed_at: null,
      enrichment_claim_expires_at: null,
      enrichment_attempt_count: claim.attemptCount,
      enrichment_last_attempt_at: patch.updated_at ?? null,
      enrichment_next_retry_at: patch.next_retry_at,
      enrichment_last_run_id: claim.lastRunId,
    });
  }

  async readEnrichmentResult(signalId: string) {
    if (this.simulatedReadbackFailures.has(signalId)) {
      throw new Error(`Simulated readback failure for ${signalId}`);
    }

    const readback = this.readbacks.get(signalId);
    return readback ? structuredClone(readback) : null;
  }

  markFailedAttempt(signalId: string, startedAt: string) {
    const row = this.rows.get(signalId);
    const claim = this.claims.get(signalId);
    assert.ok(row);
    assert.ok(claim);

    row.enrichment_status = 'failed';
    row.summary_status = 'failed';
    row.translation_status = 'failed';
    row.last_enriched_at = startedAt;

    claim.claimId = null;
    claim.claimedAt = null;
    claim.claimExpiresAt = null;
    claim.lastAttemptAt = startedAt;
    claim.nextRetryAt = new Date(Date.parse(startedAt) + RETRY_BACKOFF_MS).toISOString();

    this.readbacks.set(signalId, {
      signal_id: signalId,
      enrichment_status: 'failed',
      enrichment_version: row.enrichment_version,
      enrichment_source: row.enrichment_source,
      summary_status: 'failed',
      translation_status: 'failed',
      source_language: row.source_language,
      target_languages: [...row.target_languages],
      enrichment_error: 'provider_failed',
      last_enriched_at: startedAt,
      enrichment_claim_id: null,
      enrichment_claimed_at: null,
      enrichment_claim_expires_at: null,
      enrichment_attempt_count: claim.attemptCount,
      enrichment_last_attempt_at: startedAt,
      enrichment_next_retry_at: claim.nextRetryAt,
      enrichment_last_run_id: claim.lastRunId,
    });
  }

  setActiveClaim(signalId: string, now: string) {
    const claim = this.claims.get(signalId);
    assert.ok(claim);
    claim.claimId = `active-${signalId}`;
    claim.claimedAt = now;
    claim.claimExpiresAt = new Date(Date.parse(now) + CLAIM_TTL_MS).toISOString();
  }

  setExpiredClaim(signalId: string, now: string) {
    const claim = this.claims.get(signalId);
    assert.ok(claim);
    claim.claimId = `expired-${signalId}`;
    claim.claimedAt = new Date(Date.parse(now) - CLAIM_TTL_MS - 1000).toISOString();
    claim.claimExpiresAt = new Date(Date.parse(now) - 1000).toISOString();
  }

  setRetryBlocked(signalId: string, now: string) {
    const row = this.rows.get(signalId);
    const claim = this.claims.get(signalId);
    assert.ok(row);
    assert.ok(claim);
    row.enrichment_status = 'failed';
    row.summary_status = 'failed';
    row.translation_status = 'failed';
    row.last_enriched_at = now;
    row.enrichment_next_retry_at = new Date(Date.parse(now) + RETRY_BACKOFF_MS).toISOString();
    claim.nextRetryAt = new Date(Date.parse(now) + RETRY_BACKOFF_MS).toISOString();
  }

  setRetryAllowed(signalId: string, now: string) {
    const row = this.rows.get(signalId);
    const claim = this.claims.get(signalId);
    assert.ok(row);
    assert.ok(claim);
    row.enrichment_status = 'failed';
    row.summary_status = 'failed';
    row.translation_status = 'failed';
    row.last_enriched_at = new Date(Date.parse(now) - RETRY_BACKOFF_MS - 1000).toISOString();
    row.enrichment_next_retry_at = new Date(Date.parse(now) - 1000).toISOString();
    claim.nextRetryAt = new Date(Date.parse(now) - 1000).toISOString();
  }
}

const buildAiConfig = (
  overrides: Record<string, unknown> = {},
) => ({
  provider: 'deepseek' as const,
  enabled: true,
  dryRunOnly: false,
  deepseekApiKey: 'server-secret-key',
  deepseekBaseUrl: DEFAULT_DEEPSEEK_BASE_URL,
  deepseekModel: DEFAULT_DEEPSEEK_MODEL,
  ...overrides,
});

const createValidDeepSeekResponse = (signalId: string) =>
  new Response(
    JSON.stringify({
      choices: [
        {
          message: {
            content: JSON.stringify({
              enriched_summary_en: `Enriched summary for ${signalId}.`,
              enriched_summary_zh: `${signalId} 的增强摘要。`,
              enriched_why_it_matters_en: [
                `Why ${signalId} matters.`,
              ],
              enriched_why_it_matters_zh: [
                `${signalId} 为什么重要。`,
              ],
              source_language: 'en',
              target_languages: ['zh'],
              confidence_notes: 'Manual batch test output.',
            }),
          },
        },
      ],
      usage: {
        prompt_tokens: 110,
        completion_tokens: 70,
        total_tokens: 180,
      },
    }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  );

const createHandler = (
  store: LeaseAwareFakeAiEnrichmentStore,
  {
    aiConfig = buildAiConfig(),
    fetchImpl,
    now = () => store.currentTime,
  }: {
    aiConfig?: ReturnType<typeof buildAiConfig>;
    fetchImpl: (url: string, init?: RequestInit) => Promise<Response>;
    now?: () => string;
  },
) =>
  createPhase4IngestionHandler({
    aiEnrichmentStore: store,
    aiConfig,
    writeAuthToken: 'phase4-write-token',
    aiFetchImpl: fetchImpl,
    now,
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
        writeMode: true,
        maxSignals: 1,
        signalIds: ['signal-lease-1'],
        ...overrides,
      },
    }),
  });

test('write mode claims a signal before the provider call', async () => {
  const store = new LeaseAwareFakeAiEnrichmentStore([
    makeCandidateRecord('signal-lease-1'),
  ]);
  let claimSeenBeforeFetch = false;
  const handler = createHandler(store, {
    fetchImpl: async () => {
      claimSeenBeforeFetch = store.claimCalls > 0;
      return createValidDeepSeekResponse('signal-lease-1');
    },
  });

  const response = await handler(buildWriteRequest());
  assert.equal(response.status, 200);
  assert.equal(claimSeenBeforeFetch, true);
});

test('actively claimed signals are skipped safely', async () => {
  const store = new LeaseAwareFakeAiEnrichmentStore([
    makeCandidateRecord('signal-lease-1'),
  ]);
  store.setActiveClaim('signal-lease-1', store.currentTime);
  let fetchCalls = 0;
  const handler = createHandler(store, {
    fetchImpl: async () => {
      fetchCalls += 1;
      return createValidDeepSeekResponse('signal-lease-1');
    },
  });

  const response = await handler(buildWriteRequest());
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.skipped_count, 1);
  assert.equal(payload.written_count, 0);
  assert.equal(fetchCalls, 0);
  assert.equal(
    payload.proposed_outputs[0]?.skipped_reason ?? payload.proposed_outputs[0]?.reason,
    'skipped_claimed',
  );
});

test('expired claims can be reclaimed', async () => {
  const store = new LeaseAwareFakeAiEnrichmentStore([
    makeCandidateRecord('signal-lease-1'),
  ]);
  store.setExpiredClaim('signal-lease-1', store.currentTime);
  const handler = createHandler(store, {
    fetchImpl: async () => createValidDeepSeekResponse('signal-lease-1'),
  });

  const response = await handler(buildWriteRequest());
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.written_count, 1);
  assert.equal(store.claimCalls, 1);
});

test('retry backoff blocks immediate retry after a failed attempt', async () => {
  const store = new LeaseAwareFakeAiEnrichmentStore([
    makeCandidateRecord('signal-lease-1'),
  ]);
  store.setRetryBlocked('signal-lease-1', store.currentTime);
  let fetchCalls = 0;
  const handler = createHandler(store, {
    fetchImpl: async () => {
      fetchCalls += 1;
      return createValidDeepSeekResponse('signal-lease-1');
    },
  });

  const response = await handler(buildWriteRequest());
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(fetchCalls, 0);
  assert.equal(payload.skipped_count, 1);
  assert.equal(
    payload.proposed_outputs[0]?.skipped_reason ?? payload.proposed_outputs[0]?.reason,
    'retry_backoff_active',
  );
});

test('retry is allowed after next_retry_at has passed', async () => {
  const store = new LeaseAwareFakeAiEnrichmentStore([
    makeCandidateRecord('signal-lease-1'),
  ]);
  store.setRetryAllowed('signal-lease-1', store.currentTime);
  const handler = createHandler(store, {
    fetchImpl: async () => createValidDeepSeekResponse('signal-lease-1'),
  });

  const response = await handler(buildWriteRequest());
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.written_count, 1);
});

test('failed provider output records a safe failure and does not write enriched text', async () => {
  const store = new LeaseAwareFakeAiEnrichmentStore([
    makeCandidateRecord('signal-lease-1'),
  ]);
  const handler = createHandler(store, {
    fetchImpl: async () =>
      new Response('upstream temporarily unavailable', {
        status: 503,
        headers: { 'content-type': 'text/plain' },
      }),
  });

  const response = await handler(buildWriteRequest());
  const payload = await response.json();

  assert.equal(response.status, 500);
  assert.equal(payload.written_count, 0);
  assert.equal(payload.failed_count, 1);
  assert.equal(store.writeCalls, 0);
  assert.equal(store.failureCalls, 1);
  assert.equal(payload.proposed_outputs[0]?.provider_status, 'failed');
  assert.equal(payload.proposed_outputs[0]?.write_status, 'failed');
  assert.equal(payload.proposed_outputs[0]?.readback_status, 'loaded');
});

test('invalid provider output records validation failure and does not write enriched text', async () => {
  const store = new LeaseAwareFakeAiEnrichmentStore([
    makeCandidateRecord('signal-lease-1'),
  ]);
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
  assert.equal(store.writeCalls, 0);
  assert.equal(store.failureCalls, 1);
  assert.equal(payload.proposed_outputs[0]?.validation_status, 'failed');
  assert.equal(payload.proposed_outputs[0]?.write_status, 'failed');
});

test('a batch of 3 signals is processed sequentially', async () => {
  const store = new LeaseAwareFakeAiEnrichmentStore([
    makeCandidateRecord('signal-lease-1'),
    makeCandidateRecord('signal-lease-2'),
    makeCandidateRecord('signal-lease-3'),
  ]);
  const fetchOrder: string[] = [];
  const handler = createHandler(store, {
    fetchImpl: async (_url, init) => {
      const body = JSON.parse(String(init?.body ?? '{}'));
      const signalId = body?.messages?.[1]?.content
        ? JSON.parse(body.messages[1].content).input.signal.signal_id
        : 'unknown';
      fetchOrder.push(signalId);
      return createValidDeepSeekResponse(signalId);
    },
  });

  const response = await handler(
    buildWriteRequest({
      maxSignals: 3,
      signalIds: ['signal-lease-1', 'signal-lease-2', 'signal-lease-3'],
    }),
  );
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(fetchOrder, [
    'signal-lease-1',
    'signal-lease-2',
    'signal-lease-3',
  ]);
  assert.equal(payload.overall_status, 'completed');
  assert.equal(payload.selected_signal_count, 3);
  assert.equal(payload.written_count, 3);
});

test('a batch partial failure does not collapse the whole request', async () => {
  const store = new LeaseAwareFakeAiEnrichmentStore([
    makeCandidateRecord('signal-lease-1'),
    makeCandidateRecord('signal-lease-2'),
    makeCandidateRecord('signal-lease-3'),
  ]);
  const handler = createHandler(store, {
    fetchImpl: async (_url, init) => {
      const body = JSON.parse(String(init?.body ?? '{}'));
      const signalId = JSON.parse(body.messages[1].content).input.signal.signal_id;
      if (signalId === 'signal-lease-2') {
        return new Response('upstream temporarily unavailable', {
          status: 503,
          headers: { 'content-type': 'text/plain' },
        });
      }
      return createValidDeepSeekResponse(signalId);
    },
  });

  const response = await handler(
    buildWriteRequest({
      maxSignals: 3,
      signalIds: ['signal-lease-1', 'signal-lease-2', 'signal-lease-3'],
    }),
  );
  const payload = await response.json();

  assert.equal(response.status, 207);
  assert.equal(payload.overall_status, 'partial_success');
  assert.equal(payload.written_count, 2);
  assert.equal(payload.failed_count, 1);
  assert.equal(store.failureCalls, 1);
});

test('signalIds longer than 3 are rejected even if maxSignals is within range', async () => {
  const store = new LeaseAwareFakeAiEnrichmentStore([
    makeCandidateRecord('signal-lease-1'),
    makeCandidateRecord('signal-lease-2'),
    makeCandidateRecord('signal-lease-3'),
    makeCandidateRecord('signal-lease-4'),
  ]);
  let fetchCalls = 0;
  const handler = createHandler(store, {
    fetchImpl: async () => {
      fetchCalls += 1;
      return createValidDeepSeekResponse('signal-lease-1');
    },
  });

  const response = await handler(
    buildWriteRequest({
      maxSignals: 3,
      signalIds: [
        'signal-lease-1',
        'signal-lease-2',
        'signal-lease-3',
        'signal-lease-4',
      ],
    }),
  );
  const payload = await response.json();

  assert.equal(response.status, 400);
  assert.equal(payload.code, 'ai_write_signal_ids_limit_exceeded');
  assert.equal(fetchCalls, 0);
  assert.match(String(payload.error ?? ''), /3/i);
});
