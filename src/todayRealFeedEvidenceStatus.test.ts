import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const statusScriptPath = resolve(
  process.cwd(),
  'scripts/phase4-today-real-feed-evidence-status.ts',
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

test('evidence status command shows missing evidence buckets and next commands for incomplete evidence', () => {
  const output = execFileSync(
    process.execPath,
    ['--import', 'tsx', statusScriptPath, incompleteExamplePath],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
    },
  );

  assert.match(output, /Current recommendation:\s+continue_pilot/i);
  assert.match(output, /Required evidence:\s+\d+\/\d+/i);
  assert.match(output, /Missing evidence buckets:/i);
  assert.match(output, /Next 3 exact commands to run:/i);
  assert.match(output, /Local evidence status:\s+continue_pilot/i);
  assert.match(output, /Local report exists:\s+no/i);
  assert.match(output, /Evidence path gitignored:\s+no/i);
  assert.match(output, /phase4:create-today-evidence/i);
  assert.match(output, /--preview-read-policies-confirmed true/i);
  assert.match(output, /phase4:today-evidence-review/i);
  assert.doesNotMatch(output, /phase4:today-evidence-status -- \[redacted-local-path\]/i);
  assert.match(output, /does not switch Today to real-feed by default/i);
});

test('evidence status command shows blocked state clearly', () => {
  const output = execFileSync(
    process.execPath,
    ['--import', 'tsx', statusScriptPath, blockedExamplePath],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
    },
  );

  assert.match(output, /Local evidence status:\s+blocked/i);
  assert.match(output, /Critical blockers:/i);
  assert.match(output, /Broken preview reads fell back safely to mock/i);
});

test('evidence status command shows ready evidence without implying a default switch', () => {
  const output = execFileSync(
    process.execPath,
    ['--import', 'tsx', statusScriptPath, passingExamplePath],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
    },
  );

  assert.match(output, /Local evidence status:\s+ready_for_controlled_default_rollout/i);
  assert.match(output, /Current recommendation:\s+ready_for_controlled_default_rollout/i);
  assert.match(output, /Reminder: this command does not switch Today default/i);
});

test('evidence status command reports gitignored local evidence paths and existing local report files', () => {
  const evidencePath = resolve(
    process.cwd(),
    'docs/evidence/today-real-feed-pilot-evidence.local.json',
  );
  const reportPath = resolve(
    process.cwd(),
    'docs/evidence/today-real-feed-pilot-report.local.md',
  );
  const previousEvidence = existsSync(evidencePath)
    ? readFileSync(evidencePath, 'utf8')
    : null;
  const previousReport = existsSync(reportPath)
    ? readFileSync(reportPath, 'utf8')
    : null;

  mkdirSync(resolve(process.cwd(), 'docs/evidence'), { recursive: true });
  writeFileSync(evidencePath, readFileSync(passingExamplePath, 'utf8'), 'utf8');
  writeFileSync(reportPath, '# local report\n', 'utf8');

  try {
    const output = execFileSync(
      process.execPath,
      ['--import', 'tsx', statusScriptPath, 'docs/evidence/today-real-feed-pilot-evidence.local.json'],
      {
        cwd: process.cwd(),
        encoding: 'utf8',
      },
    );

    assert.match(output, /Evidence path gitignored:\s+yes/i);
    assert.match(output, /Local report exists:\s+yes/i);
  } finally {
    if (previousEvidence === null) {
      unlinkSync(evidencePath);
    } else {
      writeFileSync(evidencePath, previousEvidence, 'utf8');
    }

    if (previousReport === null) {
      unlinkSync(reportPath);
    } else {
      writeFileSync(reportPath, previousReport, 'utf8');
    }
  }
});

test('evidence status command derives the matching private report path for private evidence files', () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'signaldesk-status-private-report-'));
  const evidencePath = resolve(
    tempDir,
    'docs/evidence/today-real-feed-pilot-evidence.private.json',
  );
  const reportPath = resolve(
    tempDir,
    'docs/evidence/today-real-feed-pilot-report.private.md',
  );

  mkdirSync(resolve(tempDir, 'docs/evidence'), { recursive: true });
  writeFileSync(evidencePath, readFileSync(passingExamplePath, 'utf8'), 'utf8');
  writeFileSync(reportPath, '# private report\n', 'utf8');

  const output = execFileSync(
    process.execPath,
    ['--import', 'tsx', statusScriptPath, evidencePath, '--allow-any-path'],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
    },
  );

  assert.match(output, /Local report exists:\s+yes/i);
  assert.match(output, /today-real-feed-pilot-report\.private\.md/i);
});

test('evidence status command for a local evidence file prioritizes one updater command plus review and status reruns', () => {
  const evidencePath = resolve(
    process.cwd(),
    'docs/evidence/today-real-feed-pilot-evidence.local.json',
  );
  const previousEvidence = existsSync(evidencePath)
    ? readFileSync(evidencePath, 'utf8')
    : null;

  mkdirSync(resolve(process.cwd(), 'docs/evidence'), { recursive: true });
  writeFileSync(evidencePath, readFileSync(incompleteExamplePath, 'utf8'), 'utf8');

  try {
    const output = execFileSync(
      process.execPath,
      ['--import', 'tsx', statusScriptPath, 'docs/evidence/today-real-feed-pilot-evidence.local.json'],
      {
        cwd: process.cwd(),
        encoding: 'utf8',
      },
    );

    assert.match(output, /--preview-read-policies-confirmed true/i);
    assert.match(output, /phase4:today-evidence-review -- docs\/evidence\/today-real-feed-pilot-evidence\.local\.json/i);
    assert.match(output, /phase4:today-evidence-status -- docs\/evidence\/today-real-feed-pilot-evidence\.local\.json/i);
  } finally {
    if (previousEvidence === null) {
      unlinkSync(evidencePath);
    } else {
      writeFileSync(evidencePath, previousEvidence, 'utf8');
    }
  }
});

test('evidence status command redacts secret-looking values', () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'signaldesk-status-redaction-'));
  const evidencePath = resolve(tempDir, 'docs/evidence/today-real-feed-pilot-evidence.local.json');
  const evidence = JSON.parse(readFileSync(passingExamplePath, 'utf8')) as Record<string, unknown>;

  mkdirSync(resolve(tempDir, 'docs/evidence'), { recursive: true });
  evidence.environmentLabel = 'PHASE4_WRITE_AUTH_TOKEN=super-secret';
  writeFileSync(evidencePath, JSON.stringify(evidence, null, 2), 'utf8');

  const output = execFileSync(
    process.execPath,
    ['--import', 'tsx', statusScriptPath, evidencePath, '--allow-any-path'],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
    },
  );

  assert.doesNotMatch(output, /PHASE4_WRITE_AUTH_TOKEN=super-secret/i);
  assert.match(output, /PHASE4_WRITE_AUTH_TOKEN=\[redacted\]/i);
});

test('evidence status command handles malformed evidence without a raw stack trace', () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'signaldesk-status-malformed-'));
  const evidencePath = resolve(tempDir, 'docs/evidence/today-real-feed-pilot-evidence.local.json');

  mkdirSync(resolve(tempDir, 'docs/evidence'), { recursive: true });
  writeFileSync(evidencePath, '{"broken":', 'utf8');

  const result = spawnSync(
    process.execPath,
    ['--import', 'tsx', statusScriptPath, evidencePath, '--allow-any-path'],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
    },
  );

  assert.notEqual(result.status, 0);
  assert.match(result.stderr || result.stdout, /could not be parsed safely|invalid/i);
  assert.doesNotMatch(result.stderr || result.stdout, /at .*:\d+:\d+/i);
});
