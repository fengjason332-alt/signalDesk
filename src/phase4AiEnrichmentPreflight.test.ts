import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

import {
  AI_ENRICHMENT_OPERATION_KINDS,
  AI_ENRICHMENT_TARGET_LANGUAGES,
  NOOP_ENRICHMENT_PROVIDER_NAME,
  NOOP_ENRICHMENT_PROVIDER_VERSION,
  NOOP_ENRICHMENT_REASON,
  type AiEnrichmentSignalInput,
  createNoopAiEnrichmentProvider,
} from '../supabase/functions/_shared/enrichmentProvider.ts';
import {
  PHASE4_AI_ENRICHMENT_READ_TABLES,
  PHASE4_AI_ENRICHMENT_WRITE_COLUMNS,
  PHASE4_AI_ENRICHMENT_WRITE_TABLES,
} from '../supabase/functions/_shared/enrichmentStore.ts';
import {
  DEFAULT_AI_ENRICHMENT_MAX_INPUT_CHARS,
  DEFAULT_AI_ENRICHMENT_MAX_RETRY_ATTEMPTS,
  DEFAULT_AI_ENRICHMENT_MAX_SIGNALS_PER_RUN,
  DEFAULT_AI_ENRICHMENT_MAX_SOURCE_ITEMS_PER_SIGNAL,
  DEFAULT_AI_ENRICHMENT_RETRY_BACKOFF_MINUTES,
  DEFAULT_AI_ENRICHMENT_VERSION,
  createAiEnrichmentJobPlan,
  evaluateAiEnrichmentWriteGate,
  shouldEnrichCandidateSignal,
} from '../supabase/functions/_shared/enrichmentPlanner.ts';

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

test('noop AI enrichment provider exposes provider-neutral server-only methods without fabricating output', async () => {
  const provider = createNoopAiEnrichmentProvider();

  assert.deepEqual(AI_ENRICHMENT_OPERATION_KINDS, [
    'enrich',
    'summarize',
    'translate',
    'why_it_matters',
    'detect_language',
  ]);
  assert.deepEqual(AI_ENRICHMENT_TARGET_LANGUAGES, ['en', 'zh']);
  assert.equal(provider.providerName, NOOP_ENRICHMENT_PROVIDER_NAME);
  assert.equal(provider.providerVersion, NOOP_ENRICHMENT_PROVIDER_VERSION);

  const input: AiEnrichmentSignalInput = {
    signal_id: 'signal-ai-preflight',
    primary_category: 'ai' as const,
    categories: ['ai'],
    headline_en: 'OpenAI education rollout',
    headline_zh: null,
    summary_en: 'Deterministic preview summary.',
    summary_zh: null,
    why_it_matters_en: ['Deterministic why-it-matters bullet.'],
    why_it_matters_zh: [],
    tags: ['OpenAI', 'Education'],
    source_language: 'en' as const,
    target_languages: ['zh'],
    source_item_count: 1,
    published_at: '2026-05-21T08:00:00.000Z',
    provenance_sources: [
      {
        raw_source_item_id: 'raw-openai-1',
        source_name: 'OpenAI News',
        source_url: 'https://openai.com/news/example',
        published_at: '2026-05-21T08:00:00.000Z',
        is_primary: true,
      },
    ],
    source_documents: [
      {
        raw_source_item_id: 'raw-openai-1',
        source_name: 'OpenAI News',
        source_url: 'https://openai.com/news/example',
        published_at: '2026-05-21T08:00:00.000Z',
        title: 'OpenAI education rollout',
        dek: 'Deterministic preview dek.',
        normalized_text: 'Deterministic preview body.',
        is_primary: true,
      },
    ],
    topics: ['OpenAI Education'],
    entities: ['OpenAI'],
  };

  const [enrich, summary, translation, whyItMatters, language] = await Promise.all([
    provider.enrich(input),
    provider.summarize(input),
    provider.translate(input),
    provider.generateWhyItMatters(input),
    provider.detectLanguage(input),
  ]);

  assert.equal(enrich.status, 'skipped');
  assert.equal(enrich.source, 'noop');
  assert.equal(enrich.payload?.enriched_summary_en, null);
  assert.equal(enrich.payload?.source_language, 'en');
  assert.equal(enrich.error_message, NOOP_ENRICHMENT_REASON);

  assert.equal(summary.status, 'skipped');
  assert.equal(summary.source, 'noop');
  assert.equal(summary.payload?.summary_en, null);
  assert.equal(summary.payload?.summary_zh, null);
  assert.equal(summary.error_message, NOOP_ENRICHMENT_REASON);

  assert.equal(translation.status, 'skipped');
  assert.equal(translation.source, 'noop');
  assert.deepEqual(translation.payload?.target_languages, ['zh']);
  assert.equal(translation.payload?.source_language, 'en');
  assert.equal(translation.error_message, NOOP_ENRICHMENT_REASON);

  assert.equal(whyItMatters.status, 'skipped');
  assert.equal(whyItMatters.source, 'noop');
  assert.deepEqual(whyItMatters.payload?.why_it_matters_en, []);
  assert.deepEqual(whyItMatters.payload?.why_it_matters_zh, []);

  assert.equal(language.status, 'skipped');
  assert.equal(language.source, 'noop');
  assert.equal(language.payload?.source_language, 'en');
});

test('AI enrichment job plan defaults to dry-run and blocks writes until explicit server-side enablement exists', () => {
  const defaultPlan = createAiEnrichmentJobPlan();

  assert.equal(defaultPlan.dryRun, true);
  assert.equal(defaultPlan.writesEnabled, false);
  assert.equal(defaultPlan.triggerMode, 'manual');
  assert.equal(defaultPlan.targetEnrichmentVersion, DEFAULT_AI_ENRICHMENT_VERSION);
  assert.deepEqual(defaultPlan.targetLanguages, ['zh']);
  assert.equal(
    defaultPlan.costControls.maxSignalsPerRun,
    DEFAULT_AI_ENRICHMENT_MAX_SIGNALS_PER_RUN,
  );
  assert.equal(
    defaultPlan.costControls.maxSourceItemsPerSignal,
    DEFAULT_AI_ENRICHMENT_MAX_SOURCE_ITEMS_PER_SIGNAL,
  );
  assert.equal(
    defaultPlan.costControls.maxInputChars,
    DEFAULT_AI_ENRICHMENT_MAX_INPUT_CHARS,
  );
  assert.equal(
    defaultPlan.retryPolicy.maxAttemptsPerSignal,
    DEFAULT_AI_ENRICHMENT_MAX_RETRY_ATTEMPTS,
  );
  assert.equal(
    defaultPlan.retryPolicy.backoffMinutes,
    DEFAULT_AI_ENRICHMENT_RETRY_BACKOFF_MINUTES,
  );
  assert.deepEqual(evaluateAiEnrichmentWriteGate(defaultPlan), {
    allowed: false,
    reason: 'dry_run',
  });

  const disabledWritePlan = createAiEnrichmentJobPlan({
    dryRun: false,
    allowWrites: false,
    requestedSignalIds: ['signal-ai-1'],
  });
  assert.deepEqual(evaluateAiEnrichmentWriteGate(disabledWritePlan), {
    allowed: false,
    reason: 'writes_disabled',
  });

  const missingSignalIdsPlan = createAiEnrichmentJobPlan({
    dryRun: false,
    allowWrites: true,
    requestedSignalIds: [],
  });
  assert.deepEqual(evaluateAiEnrichmentWriteGate(missingSignalIdsPlan), {
    allowed: false,
    reason: 'missing_signal_ids',
  });

  const allowedPlan = createAiEnrichmentJobPlan({
    dryRun: false,
    allowWrites: true,
    requestedSignalIds: ['signal-ai-1'],
    targetLanguages: ['en', 'zh', 'unknown'],
    maxSignalsPerRun: 99,
  });
  assert.equal(allowedPlan.dryRun, false);
  assert.equal(allowedPlan.writesEnabled, true);
  assert.deepEqual(allowedPlan.targetLanguages, ['en', 'zh']);
  assert.equal(allowedPlan.costControls.maxSignalsPerRun, 10);
  assert.deepEqual(evaluateAiEnrichmentWriteGate(allowedPlan), {
    allowed: true,
    reason: 'allowed',
  });
});

test('AI enrichment candidate selection stays deterministic and avoids repeat work by default', () => {
  const plan = createAiEnrichmentJobPlan({
    dryRun: true,
    now: '2026-05-21T10:00:00.000Z',
    targetEnrichmentVersion: 2,
    targetLanguages: ['zh'],
  });

  assert.deepEqual(
    shouldEnrichCandidateSignal(
      {
        id: 'signal-pending',
        lifecycle_stage: 'candidate',
        generation_status: 'generated',
        enrichment_status: 'pending',
        summary_status: 'pending',
        translation_status: 'pending',
      },
      plan,
    ),
    { shouldEnrich: false, reason: 'already_pending' },
  );

  assert.deepEqual(
    shouldEnrichCandidateSignal(
      {
        id: 'signal-complete',
        lifecycle_stage: 'candidate',
        generation_status: 'generated',
        enrichment_status: 'completed',
        enrichment_version: 2,
        summary_status: 'completed',
        translation_status: 'completed',
        target_languages: ['zh'],
      },
      plan,
    ),
    { shouldEnrich: false, reason: 'already_completed_for_version' },
  );

  assert.deepEqual(
    shouldEnrichCandidateSignal(
      {
        id: 'signal-backoff',
        lifecycle_stage: 'draft',
        generation_status: 'generated',
        enrichment_status: 'failed',
        summary_status: 'failed',
        translation_status: 'failed',
        last_enriched_at: '2026-05-21T09:45:00.000Z',
      },
      plan,
    ),
    { shouldEnrich: false, reason: 'retry_backoff_active' },
  );

  assert.deepEqual(
    shouldEnrichCandidateSignal(
      {
        id: 'signal-eligible',
        lifecycle_stage: 'candidate_preview',
        generation_status: 'generated',
        enrichment_status: 'not_requested',
        summary_status: 'not_requested',
        translation_status: 'not_requested',
      },
      plan,
    ),
    { shouldEnrich: true, reason: 'eligible' },
  );
});

test('AI enrichment preflight store contract keeps reads/writes server-side and narrowly scoped', () => {
  assert.deepEqual(PHASE4_AI_ENRICHMENT_READ_TABLES, [
    'intelligence_signals',
    'signal_source_items',
    'raw_source_items',
    'content_entities',
    'signal_entities',
    'signal_topics',
    'canonical_topics',
  ]);
  assert.deepEqual(PHASE4_AI_ENRICHMENT_WRITE_TABLES, ['intelligence_signals']);
  assert.deepEqual(PHASE4_AI_ENRICHMENT_WRITE_COLUMNS, [
    'enrichment_status',
    'enrichment_version',
    'enrichment_source',
    'summary_status',
    'translation_status',
    'source_language',
    'target_languages',
    'enriched_summary_en',
    'enriched_summary_zh',
    'enriched_why_it_matters_en',
    'enriched_why_it_matters_zh',
    'enrichment_error',
    'last_enriched_at',
  ]);
});

test('frontend runtime files do not import AI SDKs or server-only enrichment planner/provider modules', () => {
  const runtimeFiles = getRuntimeSourceFiles(srcRoot);
  const forbiddenPatterns = [
    /from\s+['"]@google\/genai['"]/,
    /from\s+['"]openai['"]/,
    /from\s+['"]@anthropic-ai\/sdk['"]/,
    /from\s+['"][^'"]*enrichmentProvider[^'"]*['"]/,
    /from\s+['"][^'"]*enrichmentPlanner[^'"]*['"]/,
    /from\s+['"][^'"]*enrichmentStore[^'"]*['"]/,
  ];

  for (const filePath of runtimeFiles) {
    const source = readFileSync(filePath, 'utf8');
    for (const pattern of forbiddenPatterns) {
      assert.doesNotMatch(
        source,
        pattern,
        `Frontend runtime file should not contain AI/provider imports: ${filePath}`,
      );
    }
  }
});

test('server-only AI preflight modules remain inert and contain no SDK imports, provider fetches, or direct writes', () => {
  const preflightFiles = [
    resolve(
      repoRoot,
      'supabase/functions/_shared/enrichmentProvider.ts',
    ),
    resolve(
      repoRoot,
      'supabase/functions/_shared/enrichmentPlanner.ts',
    ),
    resolve(
      repoRoot,
      'supabase/functions/_shared/enrichmentStore.ts',
    ),
  ];

  const forbiddenPatterns = [
    /from\s+['"]@google\/genai['"]/,
    /from\s+['"]openai['"]/,
    /from\s+['"]@anthropic-ai\/sdk['"]/,
    /\bfetch\s*\(/,
    /\.insert\(/,
    /\.update\(/,
    /\.upsert\(/,
    /\.delete\(/,
  ];

  for (const filePath of preflightFiles) {
    const source = readFileSync(filePath, 'utf8');
    for (const pattern of forbiddenPatterns) {
      assert.doesNotMatch(
        source,
        pattern,
        `Task 13-preflight module must stay inert: ${filePath}`,
      );
    }
  }
});
