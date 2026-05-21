import test from 'node:test';
import assert from 'node:assert/strict';

import { getRealContentSummarySupportMessage } from './views/DetailView';

test('getRealContentSummarySupportMessage returns null for non-preview or enriched detail payloads', () => {
  assert.equal(
    getRealContentSummarySupportMessage({
      previewMode: undefined,
      usesEnrichedSummary: false,
      summaryStatus: 'not_requested',
      enrichmentStatus: 'not_requested',
    }),
    null,
  );

  assert.equal(
    getRealContentSummarySupportMessage({
      previewMode: 'real_content',
      usesEnrichedSummary: true,
      summaryStatus: 'completed',
      enrichmentStatus: 'completed',
    }),
    null,
  );
});

test('getRealContentSummarySupportMessage is honest about pending failed skipped and not-requested enrichment states', () => {
  assert.equal(
    getRealContentSummarySupportMessage({
      previewMode: 'real_content',
      usesEnrichedSummary: false,
      summaryStatus: 'pending',
      enrichmentStatus: 'pending',
    }),
    'Enrichment pending. Showing the available preview summary for now.',
  );

  assert.equal(
    getRealContentSummarySupportMessage({
      previewMode: 'real_content',
      usesEnrichedSummary: false,
      summaryStatus: 'failed',
      enrichmentStatus: 'failed',
    }),
    'Enrichment failed. Showing the available preview summary for now.',
  );

  assert.equal(
    getRealContentSummarySupportMessage({
      previewMode: 'real_content',
      usesEnrichedSummary: false,
      summaryStatus: 'skipped',
      enrichmentStatus: 'skipped',
    }),
    'Enrichment skipped. Showing the available preview summary for now.',
  );

  assert.equal(
    getRealContentSummarySupportMessage({
      previewMode: 'real_content',
      usesEnrichedSummary: false,
      summaryStatus: 'not_requested',
      enrichmentStatus: 'not_requested',
    }),
    'Enrichment not generated yet. Showing the available preview summary for now.',
  );
});

test('getRealContentSummarySupportMessage uses enrichment status when it is more informative than not_requested summary status', () => {
  assert.equal(
    getRealContentSummarySupportMessage({
      previewMode: 'real_content',
      usesEnrichedSummary: false,
      summaryStatus: 'not_requested',
      enrichmentStatus: 'failed',
    }),
    'Enrichment failed. Showing the available preview summary for now.',
  );

  assert.equal(
    getRealContentSummarySupportMessage({
      previewMode: 'real_content',
      usesEnrichedSummary: false,
      summaryStatus: 'not_requested',
      enrichmentStatus: 'completed',
    }),
    'Enrichment completed without a richer summary. Showing the available preview summary for now.',
  );
});
