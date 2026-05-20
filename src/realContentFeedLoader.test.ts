import test from 'node:test';
import assert from 'node:assert/strict';

import {
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

test('loadTodaySignals keeps mock feed as the default when preview mode is disabled', async () => {
  const result = await loadTodaySignals({
    enableRealContentFeed: false,
    client: null,
    mockSignals: MOCK_SIGNALS,
  });

  assert.equal(result.source, 'mock');
  assert.equal(result.usedFallback, false);
  assert.equal(result.errorMessage, null);
  assert.deepEqual(result.signals.map(signal => signal.id), MOCK_SIGNALS.map(signal => signal.id));
});

test('loadTodaySignals falls back to mock feed when Supabase is unavailable', async () => {
  const result = await loadTodaySignals({
    enableRealContentFeed: true,
    client: null,
    mockSignals: MOCK_SIGNALS,
  });

  assert.equal(result.source, 'mock');
  assert.equal(result.usedFallback, true);
  assert.match(result.errorMessage ?? '', /not configured/i);
  assert.deepEqual(result.signals.map(signal => signal.id), MOCK_SIGNALS.map(signal => signal.id));
});

test('loadTodaySignals returns a real empty state without forcing a mock fallback', async () => {
  const result = await loadTodaySignals({
    enableRealContentFeed: true,
    client: new FakeRealContentFeedLoaderClient([]) as never,
    mockSignals: MOCK_SIGNALS,
  });

  assert.equal(result.source, 'real');
  assert.equal(result.usedFallback, false);
  assert.equal(result.isEmpty, true);
  assert.deepEqual(result.signals, []);
});
