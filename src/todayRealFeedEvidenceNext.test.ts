import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { buildTodayPilotEvidenceNextPlan } from './lib/content/todayRealFeedEvidenceGuidance';
import {
  createEmptyTodayPilotEvidence,
  evaluateTodayPilotEvidence,
} from './lib/content/todayRealFeedPilotEvidence';

const nextScriptPath = resolve(
  process.cwd(),
  'scripts/phase4-today-real-feed-evidence-next.ts',
);
const templateExamplePath = resolve(
  process.cwd(),
  'docs/examples/today-real-feed-pilot-evidence.template.json',
);
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

test('evidence next command returns a friendly missing-file message with create guidance', () => {
  const result = spawnSync(
    process.execPath,
    ['--import', 'tsx', nextScriptPath, 'docs/evidence/does-not-exist.local.json'],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
    },
  );

  assert.notEqual(result.status, 0);
  assert.match(result.stderr || result.stdout, /create it with: npm run phase4:create-today-evidence/i);
});

test('evidence next command returns a friendly malformed-json error without a raw stack trace', () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'signaldesk-next-malformed-'));
  const invalidPath = resolve(tempDir, 'docs/evidence/today-real-feed-pilot-evidence.local.json');

  mkdirSync(resolve(tempDir, 'docs/evidence'), { recursive: true });
  writeFileSync(invalidPath, '{"environmentLabel":', 'utf8');

  const result = spawnSync(
    process.execPath,
    ['--import', 'tsx', nextScriptPath, invalidPath],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
    },
  );

  assert.notEqual(result.status, 0);
  assert.match(result.stderr || result.stdout, /could not be parsed safely/i);
  assert.doesNotMatch(result.stderr || result.stdout, /at .*:\d+:\d+/i);
});

test('evidence next command refuses unsafe evidence paths unless explicitly allowed', () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'signaldesk-next-unsafe-'));
  const unsafePath = resolve(tempDir, 'outside.json');

  writeFileSync(unsafePath, '{}', 'utf8');

  const result = spawnSync(
    process.execPath,
    ['--import', 'tsx', nextScriptPath, unsafePath],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
    },
  );

  assert.notEqual(result.status, 0);
  assert.match(
    result.stderr || result.stdout,
    /outside docs\/evidence or docs\/examples/i,
  );
});

test('evidence next command prints guided next steps for continue_pilot evidence', () => {
  const output = execFileSync(
    process.execPath,
    ['--import', 'tsx', nextScriptPath, incompleteExamplePath],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
    },
  );

  assert.match(output, /current recommendation:\s+continue_pilot/i);
  assert.match(output, /evidence completeness:/i);
  assert.match(output, /must collect before rollout:/i);
  assert.match(output, /completed non-empty enriched-content win evidence/i);
  assert.match(output, /mobile quality evidence/i);
  assert.match(output, /freshness evidence/i);
  assert.match(output, /source coverage evidence/i);
  assert.match(output, /exact next manual action:/i);
  assert.match(output, /exact commands to update evidence:/i);
  assert.match(
    output,
    /practice example detected: updater commands target docs\/evidence\/today-real-feed-pilot-evidence\.local\.json/i,
  );
  assert.match(output, /npm run phase4:create-today-evidence/i);
  assert.match(
    output,
    /phase4:update-today-evidence -- docs\/evidence\/today-real-feed-pilot-evidence\.local\.json --preset enriched-non-empty-wins/i,
  );
  assert.match(output, /phase4:update-today-evidence -- .*--preset mobile-acceptable/i);
  assert.match(output, /phase4:update-today-evidence -- .*--preset freshness-acceptable/i);
  assert.match(output, /phase4:update-today-evidence -- .*--preset source-coverage-acceptable --source-count 3/i);
  assert.match(output, /After this pass:/i);
  assert.match(output, /phase4:today-evidence-status -- docs\/evidence\/today-real-feed-pilot-evidence\.local\.json/i);
});

test('evidence next plan uses an actionable fallback message when only optional notes remain', () => {
  const review = evaluateTodayPilotEvidence({
    ...createEmptyTodayPilotEvidence({
      environmentLabel: 'preview-staging',
      observedFeedMode: 'real',
    }),
    realCardsRendered: true,
    realCardsObservedCount: 3,
    detailCheckedCount: 1,
    detailOpenedSafely: true,
    provenanceOrSourceLinksVisible: true,
    fakeFullArticleBodyAbsent: true,
    completedNonEmptyEnrichedContentObserved: true,
    completedNonEmptyEnrichedContentWon: true,
    completedBlankEnrichedContentFallbackWorked: true,
    incompleteEnrichmentDeterministicFallbackWorked: true,
    aiOrOpenAiFilterMatchedWhenApplicable: true,
    nonMatchingFiltersShowedNormalFilterEmptyState: true,
    realEmptyDistinctFromFilterEmpty: true,
    brokenPreviewReadsFellBackSafelyToMock: true,
    noSecretsOrRawInternalsInUi: true,
    bilingualQualityAcceptable: true,
    mobileQualityAcceptable: true,
    dataFreshnessAcceptable: true,
    sourceCoverageAcceptable: true,
    rlsReadPolicyConfirmed: true,
    noFrontendWritesIntroduced: true,
    noFrontendAiCallsIntroduced: true,
    radarWatchlistLibraryUnchanged: true,
    rollbackToMockVerified: true,
  });

  const nextPlan = buildTodayPilotEvidenceNextPlan(
    review,
    'docs/evidence/today-real-feed-pilot-evidence.local.json',
  );

  assert.equal(
    nextPlan.exactNextManualAction,
    'Record the remaining optional evidence notes and rerun the local review.',
  );
});

test('baseline-only evidence still receives a first real-feed observation bucket', () => {
  const review = evaluateTodayPilotEvidence({
    ...createEmptyTodayPilotEvidence({
      environmentLabel: 'baseline-only',
      observedFeedMode: 'mock',
    }),
    brokenPreviewReadsFellBackSafelyToMock: true,
    noSecretsOrRawInternalsInUi: true,
    noFrontendWritesIntroduced: true,
    noFrontendAiCallsIntroduced: true,
    radarWatchlistLibraryUnchanged: true,
    rollbackToMockVerified: true,
    rlsReadPolicyConfirmed: true,
    mobileQualityAcceptable: true,
    bilingualQualityAcceptable: true,
    dataFreshnessAcceptable: true,
    sourceCoverageAcceptable: true,
  });

  const nextPlan = buildTodayPilotEvidenceNextPlan(
    review,
    'docs/evidence/today-real-feed-pilot-evidence.local.json',
  );

  assert.equal(review.recommendation, 'keep_mock_default');
  assert.match(nextPlan.mustCollectBeforeRollout.join('\n'), /first real-feed observation evidence/i);
  assert.match(nextPlan.exactNextManualAction, /enable real-feed/i);
  assert.match(
    nextPlan.exactUpdateCommands.join('\n'),
    /--preset real-cards-rendered/i,
  );
});

test('evidence next command does not echo unsafe absolute evidence paths in updater commands', () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'signaldesk-next-path-redaction-'));
  const evidencePath = resolve(tempDir, 'outside.local.json');
  const template = JSON.parse(readFileSync(incompleteExamplePath, 'utf8')) as Record<string, unknown>;

  writeFileSync(evidencePath, JSON.stringify(template, null, 2), 'utf8');

  const output = execFileSync(
    process.execPath,
    ['--import', 'tsx', nextScriptPath, evidencePath, '--allow-any-path'],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
    },
  );

  assert.doesNotMatch(output, new RegExp(tempDir.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(output, /<path-to-local-evidence-json>/i);
});

test('evidence next command keeps private evidence follow-up reports on the matching private markdown path', () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'signaldesk-next-private-report-'));
  const evidencePath = resolve(
    tempDir,
    'docs/evidence/today-real-feed-pilot-evidence.private.json',
  );
  const template = JSON.parse(readFileSync(incompleteExamplePath, 'utf8')) as Record<string, unknown>;

  mkdirSync(resolve(tempDir, 'docs/evidence'), { recursive: true });
  writeFileSync(evidencePath, JSON.stringify(template, null, 2), 'utf8');

  const output = execFileSync(
    process.execPath,
    ['--import', 'tsx', nextScriptPath, evidencePath, '--allow-any-path'],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
    },
  );

  assert.match(output, /today-real-feed-pilot-report\.private\.md/i);
});

test('evidence next command does not treat arbitrary temp docs/examples paths as shipped practice examples', () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'signaldesk-next-fake-example-'));
  const fakeExamplePath = resolve(
    tempDir,
    'docs/examples/today-real-feed-pilot-evidence.sneaky.json',
  );
  const template = JSON.parse(readFileSync(incompleteExamplePath, 'utf8')) as Record<string, unknown>;

  mkdirSync(resolve(tempDir, 'docs/examples'), { recursive: true });
  writeFileSync(fakeExamplePath, JSON.stringify(template, null, 2), 'utf8');

  const output = execFileSync(
    process.execPath,
    ['--import', 'tsx', nextScriptPath, fakeExamplePath, '--allow-any-path'],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
    },
  );

  assert.doesNotMatch(output, /Practice example detected/i);
  assert.doesNotMatch(output, /npm run phase4:create-today-evidence/i);
  assert.match(output, /<path-to-local-evidence-json>/i);
});

test('evidence next command preserves blocked status and surfaces critical issues', () => {
  const output = execFileSync(
    process.execPath,
    ['--import', 'tsx', nextScriptPath, blockedExamplePath],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
    },
  );

  assert.match(output, /current recommendation:\s+blocked/i);
  assert.match(output, /failed critical checks:/i);
  assert.match(output, /Broken preview reads fell back safely to mock/i);
});

test('evidence next command preserves ready status and still prints rollback reminder', () => {
  const output = execFileSync(
    process.execPath,
    ['--import', 'tsx', nextScriptPath, passingExamplePath],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
    },
  );

  assert.match(output, /current recommendation:\s+ready_for_controlled_default_rollout/i);
  assert.match(output, /already satisfied:/i);
  assert.match(output, /rollback reminder:/i);
  assert.match(output, /Set VITE_USE_REAL_CONTENT_FEED=false/i);
});

test('evidence next command does not print secret-looking values', () => {
  const output = execFileSync(
    process.execPath,
    ['--import', 'tsx', nextScriptPath, templateExamplePath],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
    },
  );

  assert.doesNotMatch(output, /DEEPSEEK_API_KEY|SUPABASE_SERVICE_ROLE_KEY|PHASE4_WRITE_AUTH_TOKEN/i);
  assert.doesNotMatch(output, /VITE_SUPABASE_ANON_KEY=/i);
  assert.doesNotMatch(output, /https:\/\/[^ ]+supabase/i);
});

test('evidence next command does not echo secret-looking operator notes from local evidence', () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'signaldesk-next-redaction-'));
  const evidencePath = resolve(tempDir, 'docs/evidence/today-real-feed-pilot-evidence.local.json');
  const template = JSON.parse(readFileSync(incompleteExamplePath, 'utf8')) as Record<string, unknown>;

  mkdirSync(resolve(tempDir, 'docs/evidence'), { recursive: true });
  template.sourceCoverageNotes = ['PHASE4_WRITE_AUTH_TOKEN=super-secret'];
  template.freshnessNotes = ['https://example.supabase.co should never be echoed directly'];
  writeFileSync(evidencePath, JSON.stringify(template, null, 2), 'utf8');

  const output = execFileSync(
    process.execPath,
    ['--import', 'tsx', nextScriptPath, evidencePath],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
    },
  );

  assert.doesNotMatch(output, /PHASE4_WRITE_AUTH_TOKEN=super-secret/i);
  assert.doesNotMatch(output, /https:\/\/example\.supabase\.co/i);
  assert.match(output, /source coverage evidence:\s+source coverage notes captured:\s+1/i);
  assert.match(output, /freshness evidence:\s+freshness notes captured:\s+1/i);
});

test('package.json exposes the today evidence next command', () => {
  const packageJson = JSON.parse(
    readFileSync(resolve(process.cwd(), 'package.json'), 'utf8'),
  ) as {
    scripts?: Record<string, string>;
  };

  assert.equal(
    packageJson.scripts?.['phase4:today-evidence-next'],
    'node --import tsx scripts/phase4-today-real-feed-evidence-next.ts',
  );
});
