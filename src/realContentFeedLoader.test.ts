import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getTodayFeedEmptyStateMessage,
  loadTodaySignals,
  loadRealContentFeedPreview,
  type RealContentFeedLoaderClient,
} from './lib/content/realContentFeed';
import { MOCK_SIGNALS } from './mockData';

class FakeRealContentFeedLoaderClient implements RealContentFeedLoaderClient {
  public readonly filters: Array<{
    type: 'in' | 'or' | 'order';
    column: string;
    value: string | readonly string[] | { ascending: boolean };
  }> = [];

  constructor(
    private readonly rows: unknown[],
    private readonly error: { message?: string; code?: string | null } | null = null,
  ) {}

  from() {
    const self = this;
    return {
      select: () => ({
        in(column: string, values: readonly string[]) {
          self.filters.push({ type: 'in', column, value: values });
          return this;
        },
        or(filter: string) {
          self.filters.push({ type: 'or', column: 'or', value: filter });
          return this;
        },
        order(column: string, value: { ascending: boolean }) {
          self.filters.push({ type: 'order', column, value });
          return this;
        },
        limit: async () => ({
          data: self.rows,
          error: self.error,
        }),
      }),
    };
  }
}

class SequencedRealContentFeedLoaderClient implements RealContentFeedLoaderClient {
  public selectCalls = 0;

  constructor(
    private readonly responses: Array<{
      data: unknown[] | null;
      error: { message?: string; code?: string | null } | null;
    }>,
  ) {}

  from() {
    const self = this;
    return {
      select: () => ({
        in() {
          return this;
        },
        or() {
          return this;
        },
        order() {
          return this;
        },
        limit: async () => {
          const response = self.responses[self.selectCalls] ?? self.responses.at(-1) ?? {
            data: [],
            error: null,
          };
          self.selectCalls += 1;
          return response;
        },
      }),
    };
  }
}

class CountingRealContentFeedLoaderClient implements RealContentFeedLoaderClient {
  public selectCalls = 0;

  from() {
    const self = this;
    return {
      select: () => {
        self.selectCalls += 1;
        return {
          in() {
            return this;
          },
          or() {
            return this;
          },
          order() {
            return this;
          },
          limit: async () => ({
            data: [],
            error: null,
          }),
        };
      },
    };
  }
}

test('loadRealContentFeedPreview returns mapped signals from Supabase rows', async () => {
  const signals = await loadRealContentFeedPreview(
    new FakeRealContentFeedLoaderClient([
      {
        id: 'signal-real-2',
        primary_category: 'energy',
        categories: ['energy'],
        headline_en: 'Grid-scale nuclear restarts accelerate',
        headline_zh: '电网级核电重启加速',
        summary_en: 'Utilities are extending reactor operations.',
        summary_zh: '公用事业公司正延长反应堆运营周期。',
        why_it_matters_en: ['Power availability improves for AI infrastructure.'],
        why_it_matters_zh: [],
        primary_source_name: 'Reuters',
        published_at: '2026-05-18T08:00:00.000Z',
        overall_score: 91,
        signal_topics: [],
        signal_entities: [],
        signal_source_items: [],
      },
    ]) as never,
  );

  assert.equal(signals.length, 1);
  assert.equal(signals[0].titleZh, '电网级核电重启加速');
  assert.equal(signals[0].importance, 9.1);
});

test('loadRealContentFeedPreview falls back to the legacy select when enrichment columns are unavailable', async () => {
  const client = new SequencedRealContentFeedLoaderClient([
    {
      data: null,
      error: {
        message: 'column intelligence_signals.enrichment_status does not exist',
        code: '42703',
      },
    },
    {
      data: [
        {
          id: 'signal-real-legacy-compatible',
          primary_category: 'energy',
          categories: ['energy'],
          headline_en: 'Legacy preview row',
          headline_zh: null,
          summary_en: 'Legacy summary still works.',
          summary_zh: null,
          why_it_matters_en: [],
          why_it_matters_zh: [],
          primary_source_name: 'Reuters',
          published_at: '2026-05-21T08:00:00.000Z',
          overall_score: 79,
          signal_topics: [],
          signal_entities: [],
          signal_source_items: [],
        },
      ],
      error: null,
    },
  ]);

  const signals = await loadRealContentFeedPreview(client as never);

  assert.equal(client.selectCalls, 2);
  assert.equal(signals.length, 1);
  assert.equal(signals[0].summaryZh, 'Legacy summary still works.');
});

test('loadRealContentFeedPreview treats any missing optional enrichment column as a legacy-schema fallback signal', async () => {
  const client = new SequencedRealContentFeedLoaderClient([
    {
      data: null,
      error: {
        message: "Could not find the 'target_languages' column of 'intelligence_signals' in the schema cache",
        code: 'PGRST204',
      },
    },
    {
      data: [
        {
          id: 'signal-real-legacy-target-languages',
          primary_category: 'ai',
          categories: ['ai'],
          headline_en: 'Legacy target language fallback',
          headline_zh: null,
          summary_en: 'Preview still loads against an older schema.',
          summary_zh: null,
          why_it_matters_en: [],
          why_it_matters_zh: [],
          primary_source_name: 'OpenAI',
          published_at: '2026-05-21T09:00:00.000Z',
          overall_score: 82,
          signal_topics: [],
          signal_entities: [],
          signal_source_items: [],
        },
      ],
      error: null,
    },
  ]);

  const signals = await loadRealContentFeedPreview(client as never);

  assert.equal(client.selectCalls, 2);
  assert.equal(signals.length, 1);
  assert.equal(signals[0].titleZh, 'Legacy target language fallback');
});

test('loadRealContentFeedPreview sorts mapped signals deterministically by score then recency', async () => {
  const signals = await loadRealContentFeedPreview(
    new FakeRealContentFeedLoaderClient([
      {
        id: 'signal-low-score-newer',
        primary_category: 'ai',
        categories: ['ai'],
        headline_en: 'Lower score but newer',
        headline_zh: null,
        summary_en: 'Lower score.',
        summary_zh: null,
        why_it_matters_en: [],
        why_it_matters_zh: [],
        primary_source_name: 'OpenAI',
        published_at: '2026-05-20T12:00:00.000Z',
        created_at: '2026-05-20T12:00:00.000Z',
        overall_score: 75,
        signal_topics: [],
        signal_entities: [],
        signal_source_items: [],
      },
      {
        id: 'signal-high-score-older',
        primary_category: 'ai',
        categories: ['ai'],
        headline_en: 'Higher score older',
        headline_zh: null,
        summary_en: 'Higher score wins first.',
        summary_zh: null,
        why_it_matters_en: [],
        why_it_matters_zh: [],
        primary_source_name: 'OpenAI',
        published_at: '2026-05-19T12:00:00.000Z',
        created_at: '2026-05-19T12:00:00.000Z',
        overall_score: 90,
        signal_topics: [],
        signal_entities: [],
        signal_source_items: [],
      },
      {
        id: 'signal-score-tie-newer-published',
        primary_category: 'ai',
        categories: ['ai'],
        headline_en: 'Same score newer published',
        headline_zh: null,
        summary_en: 'Published_at tie-breaker.',
        summary_zh: null,
        why_it_matters_en: [],
        why_it_matters_zh: [],
        primary_source_name: 'OpenAI',
        published_at: '2026-05-20T10:00:00.000Z',
        created_at: '2026-05-20T09:00:00.000Z',
        overall_score: 80,
        signal_topics: [],
        signal_entities: [],
        signal_source_items: [],
      },
      {
        id: 'signal-score-tie-older-published',
        primary_category: 'ai',
        categories: ['ai'],
        headline_en: 'Same score older published',
        headline_zh: null,
        summary_en: 'Published_at tie-breaker.',
        summary_zh: null,
        why_it_matters_en: [],
        why_it_matters_zh: [],
        primary_source_name: 'OpenAI',
        published_at: '2026-05-20T08:00:00.000Z',
        created_at: '2026-05-20T11:00:00.000Z',
        overall_score: 80,
        signal_topics: [],
        signal_entities: [],
        signal_source_items: [],
      },
      {
        id: 'signal-created-tie-breaker-a',
        primary_category: 'ai',
        categories: ['ai'],
        headline_en: 'Same score and published, newer created',
        headline_zh: null,
        summary_en: 'Created_at tie-breaker.',
        summary_zh: null,
        why_it_matters_en: [],
        why_it_matters_zh: [],
        primary_source_name: 'OpenAI',
        published_at: '2026-05-20T07:00:00.000Z',
        created_at: '2026-05-20T11:30:00.000Z',
        overall_score: 70,
        signal_topics: [],
        signal_entities: [],
        signal_source_items: [],
      },
      {
        id: 'signal-created-tie-breaker-b',
        primary_category: 'ai',
        categories: ['ai'],
        headline_en: 'Same score and published, older created',
        headline_zh: null,
        summary_en: 'Created_at tie-breaker.',
        summary_zh: null,
        why_it_matters_en: [],
        why_it_matters_zh: [],
        primary_source_name: 'OpenAI',
        published_at: '2026-05-20T07:00:00.000Z',
        created_at: '2026-05-20T10:30:00.000Z',
        overall_score: 70,
        signal_topics: [],
        signal_entities: [],
        signal_source_items: [],
      },
    ]) as never,
  );

  assert.deepEqual(signals.map(signal => signal.id), [
    'signal-high-score-older',
    'signal-score-tie-newer-published',
    'signal-score-tie-older-published',
    'signal-low-score-newer',
    'signal-created-tie-breaker-a',
    'signal-created-tie-breaker-b',
  ]);
});

test('loadRealContentFeedPreview tolerates missing score and dates without crashing and applies a stable tie-breaker', async () => {
  const signals = await loadRealContentFeedPreview(
    new FakeRealContentFeedLoaderClient([
      {
        id: 'signal-missing-beta',
        primary_category: 'ai',
        categories: ['ai'],
        headline_en: 'Missing metadata beta',
        headline_zh: null,
        summary_en: 'Sparse row.',
        summary_zh: null,
        why_it_matters_en: [],
        why_it_matters_zh: [],
        primary_source_name: 'OpenAI',
        published_at: undefined,
        created_at: undefined,
        overall_score: undefined,
        signal_topics: [],
        signal_entities: [],
        signal_source_items: [],
      },
      {
        id: 'signal-missing-alpha',
        primary_category: 'ai',
        categories: ['ai'],
        headline_en: 'Missing metadata alpha',
        headline_zh: null,
        summary_en: 'Sparse row.',
        summary_zh: null,
        why_it_matters_en: [],
        why_it_matters_zh: [],
        primary_source_name: 'OpenAI',
        published_at: null,
        created_at: null,
        overall_score: null,
        signal_topics: [],
        signal_entities: [],
        signal_source_items: [],
      },
    ]) as never,
  );

  assert.deepEqual(signals.map(signal => signal.id), [
    'signal-missing-alpha',
    'signal-missing-beta',
  ]);
});

test('loadRealContentFeedPreview filters failed or ineligible rows and emits preview diagnostics', async () => {
  const originalConsoleInfo = console.info;
  const infoCalls: unknown[][] = [];
  console.info = (...args: unknown[]) => {
    infoCalls.push(args);
  };

  try {
    const signals = await loadRealContentFeedPreview(
      new FakeRealContentFeedLoaderClient([
        {
          id: 'signal-real-valid',
          primary_category: 'ai',
          categories: ['ai'],
          headline_en: 'Eligible preview signal',
          headline_zh: null,
          summary_en: 'Ready for preview.',
          summary_zh: null,
          why_it_matters_en: [],
          why_it_matters_zh: [],
          primary_source_name: 'OpenAI',
          published_at: '2026-05-20T08:00:00.000Z',
          lifecycle_stage: 'candidate',
          generation_status: 'drafted',
          overall_score: 88,
          signal_topics: [],
          signal_entities: [],
          signal_source_items: [],
        },
        {
          id: 'signal-real-failed',
          primary_category: 'ai',
          categories: ['ai'],
          headline_en: 'Failed generation should not render',
          headline_zh: null,
          summary_en: 'Should be filtered.',
          summary_zh: null,
          why_it_matters_en: [],
          why_it_matters_zh: [],
          primary_source_name: 'OpenAI',
          published_at: '2026-05-20T07:00:00.000Z',
          lifecycle_stage: 'candidate_preview',
          generation_status: 'failed',
          overall_score: 20,
          signal_topics: [],
          signal_entities: [],
          signal_source_items: [],
        },
        {
          id: 'signal-real-published',
          primary_category: 'ai',
          categories: ['ai'],
          headline_en: 'Published rows are not preview-eligible',
          headline_zh: null,
          summary_en: 'Should be filtered.',
          summary_zh: null,
          why_it_matters_en: [],
          why_it_matters_zh: [],
          primary_source_name: 'OpenAI',
          published_at: '2026-05-20T06:00:00.000Z',
          lifecycle_stage: 'published',
          generation_status: 'ready',
          overall_score: 60,
          signal_topics: [],
          signal_entities: [],
          signal_source_items: [],
        },
      ]) as never,
    );

    assert.deepEqual(signals.map(signal => signal.id), ['signal-real-valid']);
    assert.equal(infoCalls.length, 1);
    assert.match(String(infoCalls[0][0]), /rowsFetched=3/);
    assert.match(String(infoCalls[0][0]), /mappedCards=1/);
    assert.match(String(infoCalls[0][0]), /filteredCount=2/);
    assert.match(String(infoCalls[0][0]), /fallbackOccurred=false/);
  } finally {
    console.info = originalConsoleInfo;
  }
});

test('loadRealContentFeedPreview scopes reads to preview-safe lifecycle rows', async () => {
  const client = new FakeRealContentFeedLoaderClient([]);

  await loadRealContentFeedPreview(client as never);

  assert.deepEqual(client.filters, [
    {
      type: 'in',
      column: 'lifecycle_stage',
      value: ['candidate_preview', 'candidate', 'draft'],
    },
    {
      type: 'or',
      column: 'or',
      value: 'generation_status.is.null,generation_status.neq.failed',
    },
    {
      type: 'order',
      column: 'published_at',
      value: { ascending: false },
    },
  ]);
});

test('loadRealContentFeedPreview surfaces Supabase read failures', async () => {
  await assert.rejects(
    () =>
      loadRealContentFeedPreview(
        new FakeRealContentFeedLoaderClient([], {
          message: 'permission denied for table intelligence_signals',
          code: '42501',
        }) as never,
      ),
    /permission denied/i,
  );
});

test('loadRealContentFeedPreview skips malformed rows, logs diagnostics, and keeps valid rows', async () => {
  const originalConsoleInfo = console.info;
  const infoCalls: unknown[][] = [];
  console.info = (...args: unknown[]) => {
    infoCalls.push(args);
  };

  try {
    const signals = await loadRealContentFeedPreview(
      new FakeRealContentFeedLoaderClient([
        {
          id: 'signal-real-valid-openai',
          primary_category: 'ai',
          categories: ['ai'],
          headline_en: 'OpenAI launches a preview-safe update',
          headline_zh: null,
          summary_en: 'Valid row survives.',
          summary_zh: null,
          why_it_matters_en: [],
          why_it_matters_zh: [],
          primary_source_name: 'OpenAI',
          published_at: '2026-05-20T08:00:00.000Z',
          overall_score: 90,
          signal_topics: [],
          signal_entities: [],
          signal_source_items: [],
        },
        {
          id: 'signal-real-malformed',
          primary_category: 'not-a-category',
          categories: [],
          headline_en: 'Malformed row',
          headline_zh: null,
          summary_en: 'Should be skipped.',
          summary_zh: null,
          why_it_matters_en: [],
          why_it_matters_zh: [],
          primary_source_name: 'OpenAI',
          published_at: '2026-05-20T07:00:00.000Z',
          overall_score: 10,
          signal_topics: [],
          signal_entities: [],
          signal_source_items: [],
        },
      ]) as never,
    );

    assert.deepEqual(signals.map(signal => signal.id), ['signal-real-valid-openai']);
    assert.equal(infoCalls.length, 1);
    assert.match(String(infoCalls[0][0]), /rowsFetched=2/);
    assert.match(String(infoCalls[0][0]), /mappedCards=1/);
    assert.match(String(infoCalls[0][0]), /skippedRows=1/);
    assert.match(String(infoCalls[0][0]), /fallbackReason=none/);
  } finally {
    console.info = originalConsoleInfo;
  }
});

test('loadRealContentFeedPreview keeps rows with fallback categories even when primary_category is malformed', async () => {
  const signals = await loadRealContentFeedPreview(
    new FakeRealContentFeedLoaderClient([
      {
        id: 'signal-real-fallback-category',
        primary_category: 'not-a-category',
        categories: ['ai', 'macro'],
        headline_en: 'Fallback category row',
        headline_zh: null,
        summary_en: 'Uses categories fallback.',
        summary_zh: null,
        why_it_matters_en: [],
        why_it_matters_zh: [],
        primary_source_name: 'OpenAI',
        published_at: '2026-05-20T08:00:00.000Z',
        overall_score: 77,
        signal_topics: [],
        signal_entities: [],
        signal_source_items: [],
      },
    ]) as never,
  );

  assert.equal(signals.length, 1);
  assert.equal(signals[0].category, 'ai');
  assert.deepEqual(signals[0].categories, ['ai', 'macro']);
});

test('loadTodaySignals keeps mock feed as the default when preview mode is disabled', async () => {
  const client = new CountingRealContentFeedLoaderClient();
  const result = await loadTodaySignals({
    enableRealContentFeed: false,
    client: client as never,
    mockSignals: MOCK_SIGNALS,
  });

  assert.equal(client.selectCalls, 0);
  assert.equal(result.feedMode, 'mock');
  assert.equal(result.source, 'mock');
  assert.equal(result.usedFallback, false);
  assert.equal(result.errorMessage, null);
  assert.deepEqual(result.signals.map(signal => signal.id), MOCK_SIGNALS.map(signal => signal.id));
});

test('loadTodaySignals returns an explicit real feed mode when preview-safe rows are available', async () => {
  const result = await loadTodaySignals({
    enableRealContentFeed: true,
    client: new FakeRealContentFeedLoaderClient([
      {
        id: 'signal-real-openai-rollout',
        primary_category: 'ai',
        categories: ['ai'],
        headline_en: 'OpenAI rollout preview signal',
        headline_zh: null,
        summary_en: 'Preview-safe real content is available.',
        summary_zh: null,
        why_it_matters_en: [],
        why_it_matters_zh: [],
        primary_source_name: 'OpenAI',
        published_at: '2026-05-27T08:00:00.000Z',
        overall_score: 85,
        signal_topics: [],
        signal_entities: [],
        signal_source_items: [],
      },
    ]) as never,
    mockSignals: MOCK_SIGNALS,
  });

  assert.equal(result.feedMode, 'real');
  assert.equal(result.source, 'real');
  assert.equal(result.usedFallback, false);
  assert.equal(result.isEmpty, false);
  assert.deepEqual(result.signals.map(signal => signal.id), ['signal-real-openai-rollout']);
});

test('loadTodaySignals falls back to mock feed when Supabase is unavailable', async () => {
  const result = await loadTodaySignals({
    enableRealContentFeed: true,
    client: null,
    mockSignals: MOCK_SIGNALS,
  });

  assert.equal(result.feedMode, 'fallback_to_mock');
  assert.equal(result.source, 'mock');
  assert.equal(result.usedFallback, true);
  assert.match(result.errorMessage ?? '', /not configured/i);
  assert.deepEqual(result.signals.map(signal => signal.id), MOCK_SIGNALS.map(signal => signal.id));
});

test('loadTodaySignals keeps the read failure reason for preview-mode fallback logging', async () => {
  const result = await loadTodaySignals({
    enableRealContentFeed: true,
    client: new FakeRealContentFeedLoaderClient([], {
      message: 'permission denied for table intelligence_signals',
      code: '42501',
    }) as never,
    mockSignals: MOCK_SIGNALS,
  });

  assert.equal(result.feedMode, 'fallback_to_mock');
  assert.equal(result.source, 'mock');
  assert.equal(result.usedFallback, true);
  assert.match(result.errorMessage ?? '', /permission denied/i);
  assert.deepEqual(result.signals.map(signal => signal.id), MOCK_SIGNALS.map(signal => signal.id));
});

test('loadTodaySignals falls back to mock feed when all preview rows are malformed', async () => {
  const result = await loadTodaySignals({
    enableRealContentFeed: true,
    client: new FakeRealContentFeedLoaderClient([
      {
        id: 'signal-real-malformed-1',
        primary_category: 'invalid-category',
        categories: [],
        headline_en: 'Malformed one',
        headline_zh: null,
        summary_en: 'Should not render.',
        summary_zh: null,
        why_it_matters_en: [],
        why_it_matters_zh: [],
        primary_source_name: 'OpenAI',
        published_at: '2026-05-20T08:00:00.000Z',
        overall_score: 50,
        signal_topics: [],
        signal_entities: [],
        signal_source_items: [],
      },
      {
        id: 'signal-real-malformed-2',
        primary_category: 'still-invalid',
        categories: [],
        headline_en: 'Malformed two',
        headline_zh: null,
        summary_en: 'Should not render.',
        summary_zh: null,
        why_it_matters_en: [],
        why_it_matters_zh: [],
        primary_source_name: 'White House',
        published_at: '2026-05-20T07:00:00.000Z',
        overall_score: 40,
        signal_topics: [],
        signal_entities: [],
        signal_source_items: [],
      },
    ]) as never,
    mockSignals: MOCK_SIGNALS,
  });

  assert.equal(result.feedMode, 'fallback_to_mock');
  assert.equal(result.source, 'mock');
  assert.equal(result.usedFallback, true);
  assert.equal(result.isEmpty, false);
  assert.match(result.errorMessage ?? '', /all eligible preview rows failed mapping/i);
  assert.deepEqual(result.signals.map(signal => signal.id), MOCK_SIGNALS.map(signal => signal.id));
});

test('loadTodaySignals returns a real empty state without forcing a mock fallback', async () => {
  const result = await loadTodaySignals({
    enableRealContentFeed: true,
    client: new FakeRealContentFeedLoaderClient([]) as never,
    mockSignals: MOCK_SIGNALS,
  });

  assert.equal(result.feedMode, 'real_empty');
  assert.equal(result.source, 'real');
  assert.equal(result.usedFallback, false);
  assert.equal(result.isEmpty, true);
  assert.match(result.errorMessage ?? '', /returned 0 eligible preview rows/i);
  assert.deepEqual(result.signals, []);
});

test('getTodayFeedEmptyStateMessage explains the real preview-safe empty state without looking like a crash', () => {
  assert.equal(
    getTodayFeedEmptyStateMessage({
      feedMode: 'real_empty',
      totalFeedSignals: 0,
      filteredSignalCount: 0,
    }),
    'Real-content preview is enabled, but no preview-safe signals were found yet.',
  );
});

test('getTodayFeedEmptyStateMessage keeps the normal filter-miss copy for real feeds that loaded successfully', () => {
  assert.equal(
    getTodayFeedEmptyStateMessage({
      feedMode: 'real',
      totalFeedSignals: 2,
      filteredSignalCount: 0,
    }),
    'No real-content signals found matching your current filters yet.',
  );
});
