import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import {
  buildTodayRealFeedEvidenceStarterPlan,
  DEFAULT_TODAY_REAL_FEED_EVIDENCE_OUTPUT_PATH,
  TODAY_REAL_FEED_EVIDENCE_IGNORE_PATTERNS,
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
});

test('create evidence script generates a valid local evidence file that starts as continue_pilot', () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'signaldesk-today-evidence-'));
  const outputPath = resolve(tempDir, 'today-real-feed-pilot-evidence.local.json');

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
});

test('create evidence script does not overwrite an existing local evidence file without --overwrite', () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'signaldesk-today-evidence-no-overwrite-'));
  const outputPath = resolve(tempDir, 'today-real-feed-pilot-evidence.local.json');
  const originalContent = '{"keep":"my-notes"}\n';

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

test('package ignore patterns protect local and private evidence files', () => {
  assert.deepEqual(TODAY_REAL_FEED_EVIDENCE_IGNORE_PATTERNS, [
    'docs/evidence/*.local.json',
    'docs/evidence/*.private.json',
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
