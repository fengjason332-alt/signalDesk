import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import {
  buildTodayRealFeedEvidenceStarterPlan,
  DEFAULT_TODAY_REAL_FEED_EVIDENCE_OUTPUT_PATH,
  TODAY_REAL_FEED_EVIDENCE_IGNORE_PATTERNS,
  TODAY_REAL_FEED_REPORT_IGNORE_PATTERNS,
} from './lib/content/todayRealFeedEvidenceStarter';
import {
  evaluateTodayPilotEvidence,
  parseTodayPilotEvidence,
} from './lib/content/todayRealFeedPilotEvidence';

const createEvidenceScriptPath = resolve(
  process.cwd(),
  'scripts/phase4-create-today-real-feed-evidence.ts',
);

test('buildTodayRealFeedEvidenceStarterPlan uses the expected default local evidence path and next steps', () => {
  const plan = buildTodayRealFeedEvidenceStarterPlan({
    fileAlreadyExists: false,
  });

  assert.equal(plan.outputPath, DEFAULT_TODAY_REAL_FEED_EVIDENCE_OUTPUT_PATH);
  assert.equal(plan.shouldWrite, true);
  assert.match(plan.nextSteps.join('\n'), /VITE_USE_REAL_CONTENT_FEED=true/i);
  assert.match(plan.nextSteps.join('\n'), /npm run phase4:today-pilot-check/i);
  assert.match(
    plan.nextSteps.join('\n'),
    /npm run phase4:today-evidence-review -- docs\/evidence\/today-real-feed-pilot-evidence\.local\.json/i,
  );
  assert.match(
    plan.nextSteps.join('\n'),
    /npm run phase4:today-evidence-next -- docs\/evidence\/today-real-feed-pilot-evidence\.local\.json/i,
  );
});

test('create evidence script generates a valid local evidence file that starts as continue_pilot', () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'signaldesk-today-evidence-'));
  const outputPath = resolve(
    tempDir,
    'docs/evidence/today-real-feed-pilot-evidence.local.json',
  );

  const output = execFileSync(
    process.execPath,
    ['--import', 'tsx', createEvidenceScriptPath, '--output', outputPath],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
    },
  );

  const parsed = parseTodayPilotEvidence(
    JSON.parse(readFileSync(outputPath, 'utf8')),
  );
  const review = evaluateTodayPilotEvidence(parsed);

  assert.equal(review.recommendation, 'continue_pilot');
  assert.match(output, /created local evidence file/i);
  assert.match(output, /npm run phase4:today-pilot-check/i);
  assert.match(output, /npm run phase4:today-evidence-review/i);
  assert.match(output, /npm run phase4:today-evidence-next/i);
});

test('create evidence script supports --out as a custom output path alias', () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'signaldesk-today-evidence-out-'));
  const outputPath = resolve(tempDir, 'docs/evidence/custom-evidence.local.json');

  execFileSync(
    process.execPath,
    ['--import', 'tsx', createEvidenceScriptPath, '--out', outputPath],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
    },
  );

  const parsed = parseTodayPilotEvidence(
    JSON.parse(readFileSync(outputPath, 'utf8')),
  );

  assert.equal(parsed.environmentLabel, 'fill-me-target-environment');
});

test('create evidence script does not overwrite an existing local evidence file without --overwrite', () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'signaldesk-today-evidence-no-overwrite-'));
  const outputPath = resolve(
    tempDir,
    'docs/evidence/today-real-feed-pilot-evidence.local.json',
  );
  const originalContent = '{"keep":"my-notes"}\n';

  mkdirSync(resolve(tempDir, 'docs/evidence'), { recursive: true });
  writeFileSync(outputPath, originalContent, 'utf8');

  const output = execFileSync(
    process.execPath,
    ['--import', 'tsx', createEvidenceScriptPath, '--output', outputPath],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
    },
  );

  assert.equal(readFileSync(outputPath, 'utf8'), originalContent);
  assert.match(output, /already exists/i);
  assert.match(output, /--overwrite/i);
});

test('create evidence script overwrites an existing local evidence file only with --overwrite', () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'signaldesk-today-evidence-overwrite-'));
  const outputPath = resolve(
    tempDir,
    'docs/evidence/today-real-feed-pilot-evidence.local.json',
  );

  mkdirSync(resolve(tempDir, 'docs/evidence'), { recursive: true });
  writeFileSync(outputPath, '{"keep":"old-notes"}\n', 'utf8');

  execFileSync(
    process.execPath,
    ['--import', 'tsx', createEvidenceScriptPath, '--output', outputPath, '--overwrite'],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
    },
  );

  const parsed = parseTodayPilotEvidence(
    JSON.parse(readFileSync(outputPath, 'utf8')),
  );
  assert.equal(parsed.environmentLabel, 'fill-me-target-environment');
});

test('create evidence script supports a custom template file with --from-template', () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'signaldesk-today-evidence-template-'));
  const outputPath = resolve(
    tempDir,
    'docs/evidence/today-real-feed-pilot-evidence.local.json',
  );
  const customTemplatePath = resolve(tempDir, 'custom-template.json');

  writeFileSync(
    customTemplatePath,
    JSON.stringify({
      pilot_environment: 'custom-template-env',
      tested_at: '2026-06-04T00:00:00.000Z',
      observed_feed_mode: 'unknown',
    }),
    'utf8',
  );

  execFileSync(
    process.execPath,
    [
      '--import',
      'tsx',
      createEvidenceScriptPath,
      '--output',
      outputPath,
      '--from-template',
      customTemplatePath,
    ],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
    },
  );

  const parsed = parseTodayPilotEvidence(
    JSON.parse(readFileSync(outputPath, 'utf8')),
  );
  assert.equal(parsed.environmentLabel, 'custom-template-env');
});

test('create evidence script refuses a tracked-looking docs/evidence json path without explicit override', () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'signaldesk-today-evidence-unsafe-'));
  const outputPath = resolve(tempDir, 'docs/evidence/today-real-feed-pilot-evidence.json');

  const result = spawnSync(
    process.execPath,
    ['--import', 'tsx', createEvidenceScriptPath, '--output', outputPath],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
    },
  );

  assert.notEqual(result.status, 0);
  assert.match(result.stderr || result.stdout, /non-gitignored evidence path/i);
});

test('create evidence script allows an explicit tracked-looking docs/evidence json path only with --allow-any-path', () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'signaldesk-today-evidence-allow-any-path-'));
  const outputPath = resolve(tempDir, 'docs/evidence/today-real-feed-pilot-evidence.json');

  const output = execFileSync(
    process.execPath,
    [
      '--import',
      'tsx',
      createEvidenceScriptPath,
      '--output',
      outputPath,
      '--allow-any-path',
    ],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
    },
  );

  const parsed = parseTodayPilotEvidence(
    JSON.parse(readFileSync(outputPath, 'utf8')),
  );

  assert.equal(parsed.environmentLabel, 'fill-me-target-environment');
  assert.match(output, /created local evidence file/i);
});

test('package ignore patterns protect local and private evidence files', () => {
  assert.deepEqual(TODAY_REAL_FEED_EVIDENCE_IGNORE_PATTERNS, [
    'docs/evidence/*.local.json',
    'docs/evidence/*.private.json',
  ]);
  assert.deepEqual(TODAY_REAL_FEED_REPORT_IGNORE_PATTERNS, [
    'docs/evidence/*.local.md',
    'docs/evidence/*.private.md',
  ]);
});

test('package.json exposes the local evidence starter command', () => {
  const packageJson = JSON.parse(
    readFileSync(resolve(process.cwd(), 'package.json'), 'utf8'),
  ) as {
    scripts?: Record<string, string>;
  };

  assert.equal(
    packageJson.scripts?.['phase4:create-today-evidence'],
    'node --import tsx scripts/phase4-create-today-real-feed-evidence.ts',
  );
});
