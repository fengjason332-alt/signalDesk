import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { parseTodayPilotEvidence } from './lib/content/todayRealFeedPilotEvidence';

const createEvidenceScriptPath = resolve(
  process.cwd(),
  'scripts/phase4-create-today-real-feed-evidence.ts',
);
const updateEvidenceScriptPath = resolve(
  process.cwd(),
  'scripts/phase4-update-today-real-feed-evidence.ts',
);
const reviewScriptPath = resolve(
  process.cwd(),
  'scripts/phase4-today-real-feed-evidence-review.ts',
);

function createLocalEvidenceFile(tempDir: string) {
  const outputPath = resolve(tempDir, 'docs/evidence/today-real-feed-pilot-evidence.local.json');

  execFileSync(
    process.execPath,
    ['--import', 'tsx', createEvidenceScriptPath, '--output', outputPath],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
    },
  );

  return outputPath;
}

test('update evidence command can update a generated local evidence file', () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'signaldesk-update-evidence-'));
  const outputPath = createLocalEvidenceFile(tempDir);

  execFileSync(
    process.execPath,
    [
      '--import',
      'tsx',
      updateEvidenceScriptPath,
      outputPath,
      '--pilot-timestamp',
      '2026-06-08T00:00:00.000Z',
      '--environment-label',
      'localhost-preview-pilot',
      '--pilot-environment',
      'localhost-preview-pilot',
      '--tester',
      'codex-local-operator',
      '--app-url',
      'http://localhost:3000',
      '--real-cards-rendered',
      'true',
      '--observed-feed-mode',
      'real',
      '--source-count',
      '1',
      '--real-card-count',
      '3',
      '--detail-checked-count',
      '1',
      '--env-flag',
      'VITE_USE_REAL_CONTENT_FEED=true',
      '--sample-card',
      "The next phase of OpenAI's Education for Countries",
      '--broken-preview-fallback',
      'true',
      '--no-secrets-in-ui',
      'true',
      '--no-frontend-writes-introduced',
      'true',
      '--no-frontend-ai-calls-introduced',
      'true',
      '--radar-watchlist-library-unchanged',
      'true',
      '--final-recommendation',
      'continue_pilot',
      '--rollback-tested',
      'true',
      '--freshness-note',
      'Newest observed cards were published within an acceptable window.',
      '--source-coverage-note',
      'Observed cards came from OpenAI News and another stable source.',
      '--operator-note',
      'Observed three real cards.',
      '--screenshot-note',
      'Saved one safe Today screenshot.',
    ],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
    },
  );

  const raw = JSON.parse(readFileSync(outputPath, 'utf8')) as Record<string, unknown>;
  const parsed = parseTodayPilotEvidence(raw);

  assert.equal(parsed.realCardsRendered, true);
  assert.equal(parsed.pilotTimestamp, '2026-06-08T00:00:00.000Z');
  assert.equal(parsed.environmentLabel, 'localhost-preview-pilot');
  assert.equal(parsed.pilotEnvironment, 'localhost-preview-pilot');
  assert.equal(parsed.tester, 'codex-local-operator');
  assert.equal(parsed.appUrlOrLocalhost, 'http://localhost:3000');
  assert.equal(parsed.observedFeedMode, 'real');
  assert.equal(parsed.sourceCount, 1);
  assert.equal(parsed.realCardsObservedCount, 3);
  assert.equal(parsed.detailCheckedCount, 1);
  assert.ok(parsed.envFlagsChecked.includes('VITE_USE_REAL_CONTENT_FEED=true'));
  assert.deepEqual(parsed.sampleCardIdsOrTitles, [
    "The next phase of OpenAI's Education for Countries",
  ]);
  assert.equal(parsed.brokenPreviewReadsFellBackSafelyToMock, true);
  assert.equal(parsed.noSecretsOrRawInternalsInUi, true);
  assert.equal(parsed.noFrontendWritesIntroduced, true);
  assert.equal(parsed.noFrontendAiCallsIntroduced, true);
  assert.equal(parsed.radarWatchlistLibraryUnchanged, true);
  assert.equal(parsed.finalRecommendation, 'continue_pilot');
  assert.equal(parsed.rollbackToMockVerified, true);
  assert.ok(parsed.freshnessNotes.includes('Newest observed cards were published within an acceptable window.'));
  assert.ok(parsed.sourceCoverageNotes.includes('Observed cards came from OpenAI News and another stable source.'));
  assert.match(JSON.stringify(raw), /updated_at/i);
  assert.equal('source_count' in raw, false);
  assert.equal('real_card_count' in raw, false);
  assert.equal('rollback_checked' in raw, false);
  assert.ok(parsed.reviewerNotes.includes('Observed three real cards.'));
  assert.ok(parsed.screenshotsOrNotes.includes('Saved one safe Today screenshot.'));
});

test('update evidence command preserves unrelated fields', () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'signaldesk-update-evidence-preserve-'));
  const outputPath = createLocalEvidenceFile(tempDir);
  const original = JSON.parse(readFileSync(outputPath, 'utf8')) as Record<string, unknown>;
  original.custom_field = 'keep-me';
  writeFileSync(outputPath, JSON.stringify(original, null, 2), 'utf8');

  execFileSync(
    process.execPath,
    [
      '--import',
      'tsx',
      updateEvidenceScriptPath,
      outputPath,
      '--detail-opened-safely',
      'true',
    ],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
    },
  );

  const raw = JSON.parse(readFileSync(outputPath, 'utf8')) as Record<string, unknown>;
  assert.equal(raw.custom_field, 'keep-me');
});

test('update evidence command upgrades legacy snake_case evidence without dropping prior notes', () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'signaldesk-update-evidence-legacy-'));
  const outputPath = createLocalEvidenceFile(tempDir);
  const original = JSON.parse(readFileSync(outputPath, 'utf8')) as Record<string, unknown>;

  original.pilot_environment = 'legacy-preview';
  original.tested_at = '2026-06-05T00:00:00.000Z';
  original.observed_feed_mode = 'real';
  original.freshness_notes = ['Legacy freshness evidence was already captured.'];
  original.source_coverage_notes = ['Legacy source-coverage evidence was already captured.'];
  delete original.pilotEnvironment;
  delete original.pilotTimestamp;
  delete original.observedFeedMode;
  delete original.freshnessNotes;
  delete original.sourceCoverageNotes;

  writeFileSync(outputPath, JSON.stringify(original, null, 2), 'utf8');

  execFileSync(
    process.execPath,
    [
      '--import',
      'tsx',
      updateEvidenceScriptPath,
      outputPath,
      '--detail-opened-safely',
      'true',
    ],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
    },
  );

  const raw = JSON.parse(readFileSync(outputPath, 'utf8')) as Record<string, unknown>;
  const parsed = parseTodayPilotEvidence(raw);

  assert.equal(raw.pilot_environment, undefined);
  assert.equal(raw.tested_at, undefined);
  assert.equal(raw.observed_feed_mode, undefined);
  assert.equal(raw.freshness_notes, undefined);
  assert.equal(raw.source_coverage_notes, undefined);
  assert.equal(parsed.pilotEnvironment, 'legacy-preview');
  assert.equal(parsed.pilotTimestamp, '2026-06-05T00:00:00.000Z');
  assert.equal(parsed.observedFeedMode, 'real');
  assert.ok(parsed.freshnessNotes.includes('Legacy freshness evidence was already captured.'));
  assert.ok(
    parsed.sourceCoverageNotes.includes(
      'Legacy source-coverage evidence was already captured.',
    ),
  );
});

test('update evidence command rejects invalid boolean values', () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'signaldesk-update-evidence-bool-'));
  const outputPath = createLocalEvidenceFile(tempDir);

  const result = spawnSync(
    process.execPath,
    [
      '--import',
      'tsx',
      updateEvidenceScriptPath,
      outputPath,
      '--real-cards-rendered',
      'maybe',
    ],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
    },
  );

  assert.notEqual(result.status, 0);
  assert.match(result.stderr || result.stdout, /invalid boolean/i);
});

test('update evidence command rejects invalid enum values', () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'signaldesk-update-evidence-enum-'));
  const outputPath = createLocalEvidenceFile(tempDir);

  const result = spawnSync(
    process.execPath,
    [
      '--import',
      'tsx',
      updateEvidenceScriptPath,
      outputPath,
      '--mobile-quality',
      'great',
    ],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
    },
  );

  assert.notEqual(result.status, 0);
  assert.match(result.stderr || result.stdout, /invalid quality value/i);
});

test('update evidence command rejects invalid observed feed modes', () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'signaldesk-update-evidence-feed-mode-'));
  const outputPath = createLocalEvidenceFile(tempDir);

  const result = spawnSync(
    process.execPath,
    [
      '--import',
      'tsx',
      updateEvidenceScriptPath,
      outputPath,
      '--observed-feed-mode',
      'pilot_ready',
    ],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
    },
  );

  assert.notEqual(result.status, 0);
  assert.match(result.stderr || result.stdout, /invalid observed feed mode/i);
});

test('update evidence command refuses unsafe output paths unless explicitly allowed', () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'signaldesk-update-evidence-unsafe-'));
  const unsafePath = resolve(tempDir, 'outside.json');

  writeFileSync(unsafePath, '{}', 'utf8');

  const result = spawnSync(
    process.execPath,
    ['--import', 'tsx', updateEvidenceScriptPath, unsafePath, '--rollback-tested', 'true'],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
    },
  );

  assert.notEqual(result.status, 0);
  assert.match(result.stderr || result.stdout, /outside docs\/evidence/i);
});

test('update evidence command refuses tracked-looking docs/evidence json paths unless explicitly allowed', () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'signaldesk-update-evidence-tracked-'));
  const unsafePath = resolve(tempDir, 'docs/evidence/today-real-feed-pilot-evidence.json');

  mkdirSync(resolve(tempDir, 'docs/evidence'), { recursive: true });
  writeFileSync(unsafePath, '{}', 'utf8');

  const result = spawnSync(
    process.execPath,
    ['--import', 'tsx', updateEvidenceScriptPath, unsafePath, '--rollback-tested', 'true'],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
    },
  );

  assert.notEqual(result.status, 0);
  assert.match(result.stderr || result.stdout, /non-gitignored evidence path/i);
});

test('update evidence command allows an explicit tracked-looking docs/evidence json path only with --allow-any-path', () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'signaldesk-update-evidence-allow-any-path-'));
  const outputPath = resolve(tempDir, 'docs/evidence/today-real-feed-pilot-evidence.json');

  mkdirSync(resolve(tempDir, 'docs/evidence'), { recursive: true });
  writeFileSync(
    outputPath,
    JSON.stringify({
      environmentLabel: 'manual-pilot',
      pilotTimestamp: '2026-06-08T00:00:00.000Z',
      observedFeedMode: 'unknown',
    }),
    'utf8',
  );

  const output = execFileSync(
    process.execPath,
    [
      '--import',
      'tsx',
      updateEvidenceScriptPath,
      outputPath,
      '--allow-any-path',
      '--rollback-tested',
      'true',
    ],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
    },
  );

  const parsed = parseTodayPilotEvidence(
    JSON.parse(readFileSync(outputPath, 'utf8')),
  );

  assert.equal(parsed.rollbackToMockVerified, true);
  assert.match(output, /updated local today pilot evidence/i);
});

test('update evidence command sanitizes printed paths for allow-any-path dry runs', () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'signaldesk-update-evidence-sanitized-path-'));
  const outputPath = resolve(
    tempDir,
    'docs/evidence/today-real-feed-pilot-evidence.private.json',
  );

  mkdirSync(resolve(tempDir, 'docs/evidence'), { recursive: true });
  writeFileSync(
    outputPath,
    JSON.stringify({
      environmentLabel: 'manual-pilot',
      pilotTimestamp: '2026-06-08T00:00:00.000Z',
      observedFeedMode: 'unknown',
    }),
    'utf8',
  );

  const output = execFileSync(
    process.execPath,
    [
      '--import',
      'tsx',
      updateEvidenceScriptPath,
      outputPath,
      '--allow-any-path',
      '--preset',
      'rollback-tested',
      '--dry-run',
    ],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
    },
  );

  assert.match(output, /<path-to-local-evidence-json>/i);
  assert.doesNotMatch(output, new RegExp(tempDir.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});

test('update evidence command does not overwrite malformed JSON', () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'signaldesk-update-evidence-malformed-'));
  const outputPath = resolve(tempDir, 'docs/evidence/today-real-feed-pilot-evidence.local.json');

  mkdirSync(resolve(tempDir, 'docs/evidence'), { recursive: true });
  writeFileSync(outputPath, '{"broken":', 'utf8');

  const result = spawnSync(
    process.execPath,
    ['--import', 'tsx', updateEvidenceScriptPath, outputPath, '--rollback-tested', 'true'],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
    },
  );

  assert.notEqual(result.status, 0);
  assert.equal(readFileSync(outputPath, 'utf8'), '{"broken":');
  assert.match(result.stderr || result.stdout, /malformed json|invalid json/i);
});

test('update evidence command exposes a bounded local help output', () => {
  const output = execFileSync(
    process.execPath,
    ['--import', 'tsx', updateEvidenceScriptPath, '--help'],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
    },
  );

  assert.match(output, /SignalDesk Today real-feed evidence updater/i);
  assert.match(output, /--preset real-cards-rendered/i);
  assert.match(output, /--preset rollback-tested/i);
  assert.match(output, /--dry-run/i);
  assert.match(output, /--completed-enriched-text-observed/i);
  assert.match(output, /--mobile-quality acceptable\|needs_work\|not_tested/i);
  assert.match(output, /Local-only helper/i);
  assert.match(output, /No Supabase call/i);
  assert.match(output, /No AI call/i);
});

test('update evidence command rejects invalid presets without a raw stack trace', () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'signaldesk-update-evidence-bad-preset-'));
  const outputPath = createLocalEvidenceFile(tempDir);

  const result = spawnSync(
    process.execPath,
    [
      '--import',
      'tsx',
      updateEvidenceScriptPath,
      outputPath,
      '--preset',
      'not-a-real-preset',
    ],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
    },
  );

  const output = `${result.stderr ?? ''}${result.stdout ?? ''}`;

  assert.notEqual(result.status, 0);
  assert.match(output, /invalid preset value/i);
  assert.doesNotMatch(output, /at .*:\d+:\d+/i);
  assert.doesNotMatch(output, /node:internal|tsx\/dist/i);
});

test('update evidence command redacts secret-looking invalid preset values in bounded errors', () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'signaldesk-update-evidence-secret-preset-'));
  const outputPath = createLocalEvidenceFile(tempDir);

  const result = spawnSync(
    process.execPath,
    [
      '--import',
      'tsx',
      updateEvidenceScriptPath,
      outputPath,
      '--preset',
      'PHASE4_WRITE_AUTH_TOKEN=super-secret',
    ],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
    },
  );

  const output = `${result.stderr ?? ''}${result.stdout ?? ''}`;

  assert.notEqual(result.status, 0);
  assert.doesNotMatch(output, /PHASE4_WRITE_AUTH_TOKEN=super-secret/i);
  assert.match(output, /PHASE4_WRITE_AUTH_TOKEN=\[redacted\]/i);
});

test('update evidence command applies guided presets and preserves prior notes', () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'signaldesk-update-evidence-presets-'));
  const outputPath = createLocalEvidenceFile(tempDir);

  execFileSync(
    process.execPath,
    [
      '--import',
      'tsx',
      updateEvidenceScriptPath,
      outputPath,
      '--operator-note',
      'Existing note should remain.',
      '--preset',
      'real-cards-rendered',
      '--preset',
      'detail-safe',
      '--preset',
      'provenance-visible',
      '--preset',
      'rollback-tested',
    ],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
    },
  );

  const parsed = parseTodayPilotEvidence(
    JSON.parse(readFileSync(outputPath, 'utf8')),
  );

  assert.equal(parsed.observedFeedMode, 'real');
  assert.equal(parsed.realCardsRendered, true);
  assert.equal(parsed.realCardsObservedCount, 1);
  assert.equal(parsed.detailOpenedSafely, true);
  assert.equal(parsed.detailCheckedCount, 1);
  assert.equal(parsed.provenanceOrSourceLinksVisible, true);
  assert.equal(parsed.rollbackToMockVerified, true);
  assert.ok(parsed.reviewerNotes.includes('Existing note should remain.'));
});

test('update evidence real-empty preset preserves earlier real-card evidence in a shared local file', () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'signaldesk-update-evidence-real-empty-'));
  const outputPath = createLocalEvidenceFile(tempDir);

  execFileSync(
    process.execPath,
    [
      '--import',
      'tsx',
      updateEvidenceScriptPath,
      outputPath,
      '--preset',
      'real-cards-rendered',
    ],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
    },
  );

  execFileSync(
    process.execPath,
    [
      '--import',
      'tsx',
      updateEvidenceScriptPath,
      outputPath,
      '--preset',
      'real-empty-observed',
      '--empty-state-check',
      'Observed a genuine real_empty state in a later pass.',
    ],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
    },
  );

  const parsed = parseTodayPilotEvidence(
    JSON.parse(readFileSync(outputPath, 'utf8')),
  );

  assert.equal(parsed.observedFeedMode, 'real');
  assert.equal(parsed.realCardsRendered, true);
  assert.equal(parsed.realCardsObservedCount, 1);
  assert.equal(parsed.realEmptyDistinctFromFilterEmpty, true);
  assert.ok(
    parsed.emptyStateChecks.includes(
      'Observed a genuine real_empty state in a later pass.',
    ),
  );
});

test('update evidence real-empty preset records observed feed mode on a fresh local file', () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'signaldesk-update-evidence-real-empty-fresh-'));
  const outputPath = createLocalEvidenceFile(tempDir);

  execFileSync(
    process.execPath,
    [
      '--import',
      'tsx',
      updateEvidenceScriptPath,
      outputPath,
      '--preset',
      'real-empty-observed',
      '--empty-state-check',
      'Observed a genuine first-pass real_empty state.',
    ],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
    },
  );

  const parsed = parseTodayPilotEvidence(
    JSON.parse(readFileSync(outputPath, 'utf8')),
  );

  assert.equal(parsed.observedFeedMode, 'real_empty');
  assert.equal(parsed.realEmptyDistinctFromFilterEmpty, true);
  assert.ok(
    parsed.emptyStateChecks.includes('Observed a genuine first-pass real_empty state.'),
  );
});

test('update evidence command dry-run prints a summary and does not write the file', () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'signaldesk-update-evidence-dry-run-'));
  const outputPath = createLocalEvidenceFile(tempDir);
  const before = readFileSync(outputPath, 'utf8');

  const output = execFileSync(
    process.execPath,
    [
      '--import',
      'tsx',
      updateEvidenceScriptPath,
      outputPath,
      '--preset',
      'real-cards-rendered',
      '--dry-run',
    ],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
    },
  );

  const after = readFileSync(outputPath, 'utf8');

  assert.equal(after, before);
  assert.match(output, /Dry run only/i);
  assert.match(output, /real-cards-rendered/i);
  assert.match(output, /No file was written/i);
});

test('updated evidence can still be reviewed locally after operator notes are added', () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'signaldesk-update-evidence-review-'));
  const outputPath = createLocalEvidenceFile(tempDir);

  execFileSync(
    process.execPath,
    [
      '--import',
      'tsx',
      updateEvidenceScriptPath,
      outputPath,
      '--real-cards-rendered',
      'true',
      '--real-card-count',
      '2',
      '--detail-opened-safely',
      'true',
      '--provenance-visible',
      'true',
      '--source-links-visible',
      'true',
      '--no-fake-article-body',
      'true',
      '--completed-enriched-text-wins',
      'true',
      '--blank-enrichment-fallback',
      'true',
      '--incomplete-enrichment-fallback',
      'true',
      '--ai-openai-filter-works',
      'true',
      '--nonmatching-filter-empty',
      'true',
      '--real-empty-distinct',
      'true',
      '--rollback-tested',
      'true',
      '--preview-read-policies-confirmed',
      'true',
      '--mobile-quality',
      'acceptable',
      '--bilingual-quality',
      'acceptable',
      '--freshness',
      'acceptable',
      '--source-coverage',
      'acceptable',
      '--freshness-note',
      'Publish dates looked recent enough for the local pilot.',
      '--source-coverage-note',
      'Observed real cards came from multiple stable sources.',
      '--operator-note',
      'Real cards looked stable.',
    ],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
    },
  );

  const output = execFileSync(
    process.execPath,
    ['--import', 'tsx', reviewScriptPath, outputPath],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
    },
  );

  assert.match(output, /overall recommendation:/i);
  assert.doesNotMatch(output, /DEEPSEEK_API_KEY|SUPABASE_SERVICE_ROLE_KEY/i);
});
