import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  createEmptyTodayPilotEvidence,
  evaluateTodayPilotEvidence,
  parseTodayPilotEvidence,
} from './lib/content/todayRealFeedPilotEvidence';

const incompleteExamplePath = resolve(
  process.cwd(),
  'docs/examples/today-real-feed-pilot-evidence.example.json',
);
const passingExamplePath = resolve(
  process.cwd(),
  'docs/examples/today-real-feed-pilot-evidence.passing.example.json',
);
const blockedExamplePath = resolve(
  process.cwd(),
  'docs/examples/today-real-feed-pilot-evidence.blocked.example.json',
);
const reviewScriptPath = resolve(
  process.cwd(),
  'scripts/phase4-today-real-feed-evidence-review.ts',
);

function buildPassingEvidence() {
  return {
    ...createEmptyTodayPilotEvidence({
      environmentLabel: 'preview-staging',
      observedFeedMode: 'real',
    }),
    realCardsRendered: true,
    realCardsObservedCount: 4,
    detailOpenedSafely: true,
    provenanceOrSourceLinksVisible: true,
    fakeFullArticleBodyAbsent: true,
    completedNonEmptyEnrichedContentObserved: true,
    completedNonEmptyEnrichedContentWon: true,
    incompleteEnrichmentDeterministicFallbackWorked: true,
    aiOrOpenAiFilterMatchedWhenApplicable: true,
    nonMatchingFiltersShowedNormalFilterEmptyState: true,
    realEmptyDistinctFromFilterEmpty: true,
    brokenPreviewReadsFellBackSafelyToMock: true,
    radarWatchlistLibraryUnchanged: true,
    rollbackToMockVerified: true,
    blockersFound: [],
    reviewerNotes: ['Pilot looked stable.'],
  };
}

test('complete passing evidence returns ready_for_controlled_default_rollout', () => {
  const review = evaluateTodayPilotEvidence(buildPassingEvidence());

  assert.equal(review.recommendation, 'ready_for_controlled_default_rollout');
  assert.deepEqual(review.failedCriticalChecks, []);
  assert.deepEqual(review.missingRequiredChecks, []);
});

test('missing evidence returns continue_pilot', () => {
  const review = evaluateTodayPilotEvidence(
    createEmptyTodayPilotEvidence({
      environmentLabel: 'preview-staging',
      observedFeedMode: 'real',
    }),
  );

  assert.equal(review.recommendation, 'continue_pilot');
  assert.ok(review.missingRequiredChecks.length > 0);
});

test('failed critical checks return blocked', () => {
  const review = evaluateTodayPilotEvidence({
    ...buildPassingEvidence(),
    brokenPreviewReadsFellBackSafelyToMock: false,
  });

  assert.equal(review.recommendation, 'blocked');
  assert.ok(review.failedCriticalChecks.includes('brokenPreviewReadsFellBackSafelyToMock'));
});

test('fake full article body present should block', () => {
  const review = evaluateTodayPilotEvidence({
    ...buildPassingEvidence(),
    fakeFullArticleBodyAbsent: false,
  });

  assert.equal(review.recommendation, 'blocked');
  assert.ok(review.failedCriticalChecks.includes('fakeFullArticleBodyAbsent'));
});

test('missing rollback verification should not pass', () => {
  const review = evaluateTodayPilotEvidence({
    ...buildPassingEvidence(),
    rollbackToMockVerified: null,
  });

  assert.notEqual(review.recommendation, 'ready_for_controlled_default_rollout');
  assert.ok(review.missingRequiredChecks.includes('rollbackToMockVerified'));
});

test('Radar Watchlist Library changed should block', () => {
  const review = evaluateTodayPilotEvidence({
    ...buildPassingEvidence(),
    radarWatchlistLibraryUnchanged: false,
  });

  assert.equal(review.recommendation, 'blocked');
  assert.ok(review.failedCriticalChecks.includes('radarWatchlistLibraryUnchanged'));
});

test('blank enriched content should not count as successful enriched content', () => {
  const review = evaluateTodayPilotEvidence({
    ...buildPassingEvidence(),
    completedNonEmptyEnrichedContentObserved: false,
    completedNonEmptyEnrichedContentWon: false,
  });

  assert.notEqual(review.recommendation, 'ready_for_controlled_default_rollout');
  assert.ok(review.missingRequiredChecks.includes('completedNonEmptyEnrichedContentObserved'));
});

test('real-empty pilot evidence can conservatively keep Today mock-by-default', () => {
  const review = evaluateTodayPilotEvidence({
    ...createEmptyTodayPilotEvidence({
      environmentLabel: 'preview-real-empty',
      observedFeedMode: 'real_empty',
    }),
    realCardsRendered: false,
    realCardsObservedCount: 0,
    brokenPreviewReadsFellBackSafelyToMock: true,
    radarWatchlistLibraryUnchanged: true,
    rollbackToMockVerified: true,
    realEmptyDistinctFromFilterEmpty: true,
    aiOrOpenAiFilterMatchedWhenApplicable: 'not_applicable',
    blockersFound: [],
    reviewerNotes: ['Preview-safe rows were absent in this environment.'],
  });

  assert.equal(review.recommendation, 'keep_mock_default');
  assert.deepEqual(review.failedCriticalChecks, []);
});

test('example evidence json files exist and parse locally', () => {
  assert.equal(existsSync(incompleteExamplePath), true);
  assert.equal(existsSync(passingExamplePath), true);
  assert.equal(existsSync(blockedExamplePath), true);

  assert.equal(
    parseTodayPilotEvidence(JSON.parse(readFileSync(incompleteExamplePath, 'utf8'))).environmentLabel,
    'target-preview-incomplete',
  );
  assert.equal(
    parseTodayPilotEvidence(JSON.parse(readFileSync(passingExamplePath, 'utf8'))).environmentLabel,
    'target-preview-passing',
  );
  assert.equal(
    parseTodayPilotEvidence(JSON.parse(readFileSync(blockedExamplePath, 'utf8'))).environmentLabel,
    'target-preview-blocked',
  );
});

test('evidence review script prints a recommendation for a valid example JSON file', () => {
  const output = execFileSync(
    process.execPath,
    ['--import', 'tsx', reviewScriptPath, passingExamplePath],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
    },
  );

  assert.match(output, /recommendation: ready_for_controlled_default_rollout/i);
  assert.match(output, /next action:/i);
  assert.match(output, /failed critical checks:/i);
  assert.doesNotMatch(output, /DEEPSEEK_API_KEY/i);
  assert.doesNotMatch(output, /SUPABASE_SERVICE_ROLE_KEY/i);
  assert.doesNotMatch(output, /https:\/\/[^ ]+supabase/i);
});

test('evidence review script returns a clear error for a missing file', () => {
  const result = spawnSync(
    process.execPath,
    ['--import', 'tsx', reviewScriptPath, 'docs/examples/does-not-exist.json'],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
    },
  );

  assert.notEqual(result.status, 0);
  assert.match(result.stderr || result.stdout, /could not read evidence file/i);
});
