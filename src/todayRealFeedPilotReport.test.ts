import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

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
const reportScriptPath = resolve(
  process.cwd(),
  'scripts/phase4-today-real-feed-pilot-report.ts',
);

test('pilot report generator produces a markdown report for incomplete evidence', () => {
  const output = execFileSync(
    process.execPath,
    ['--import', 'tsx', reportScriptPath, incompleteExamplePath],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
    },
  );

  assert.match(output, /^# SignalDesk Today Real-Feed Pilot Report/m);
  assert.match(output, /continue_pilot/i);
  assert.match(output, /Next Action/i);
  assert.match(output, /Today is still mock-by-default/i);
});

test('pilot report generator produces a markdown report for passing evidence', () => {
  const output = execFileSync(
    process.execPath,
    ['--import', 'tsx', reportScriptPath, passingExamplePath],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
    },
  );

  assert.match(output, /ready_for_controlled_default_rollout/i);
  assert.match(output, /no default switch is made/i);
  assert.match(output, /Rollback Status/i);
  assert.match(output, /Enriched Summary Cases/i);
  assert.match(output, /Deterministic Fallback Cases/i);
  assert.match(output, /Freshness Notes/i);
  assert.match(output, /Source Coverage Notes/i);
});

test('pilot report generator produces a markdown report for blocked evidence', () => {
  const output = execFileSync(
    process.execPath,
    ['--import', 'tsx', reportScriptPath, blockedExamplePath],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
    },
  );

  assert.match(output, /blocked/i);
  assert.match(output, /Failed Critical Checks/i);
});

test('pilot report generator refuses overwrite by default', () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'signaldesk-pilot-report-overwrite-'));
  const outputPath = resolve(tempDir, 'docs/evidence/today-real-feed-pilot-report.local.md');

  mkdirSync(resolve(tempDir, 'docs/evidence'), { recursive: true });
  writeFileSync(outputPath, '# keep\n', 'utf8');

  const result = spawnSync(
    process.execPath,
    ['--import', 'tsx', reportScriptPath, incompleteExamplePath, '--out', outputPath],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
    },
  );

  assert.notEqual(result.status, 0);
  assert.equal(readFileSync(outputPath, 'utf8'), '# keep\n');
  assert.match(result.stderr || result.stdout, /already exists|--overwrite/i);
});

test('pilot report generator can write a local report file with explicit overwrite', () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'signaldesk-pilot-report-write-'));
  const outputPath = resolve(tempDir, 'docs/evidence/today-real-feed-pilot-report.local.md');

  const stdout = execFileSync(
    process.execPath,
    [
      '--import',
      'tsx',
      reportScriptPath,
      passingExamplePath,
      '--out',
      outputPath,
      '--overwrite',
    ],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
    },
  );

  const written = readFileSync(outputPath, 'utf8');
  assert.match(stdout, /wrote local pilot report/i);
  assert.match(written, /ready_for_controlled_default_rollout/i);
});

test('pilot report generator refuses a tracked-looking docs/evidence markdown path without explicit override', () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'signaldesk-pilot-report-unsafe-'));
  const outputPath = resolve(tempDir, 'docs/evidence/today-real-feed-pilot-report.md');

  mkdirSync(resolve(tempDir, 'docs/evidence'), { recursive: true });

  const result = spawnSync(
    process.execPath,
    ['--import', 'tsx', reportScriptPath, incompleteExamplePath, '--out', outputPath],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
    },
  );

  assert.notEqual(result.status, 0);
  assert.match(result.stderr || result.stdout, /non-gitignored report path/i);
});

test('pilot report generator allows an explicit tracked-looking report path only with --allow-any-path', () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'signaldesk-pilot-report-allow-any-path-'));
  const outputPath = resolve(tempDir, 'docs/evidence/today-real-feed-pilot-report.md');

  mkdirSync(resolve(tempDir, 'docs/evidence'), { recursive: true });

  const stdout = execFileSync(
    process.execPath,
    [
      '--import',
      'tsx',
      reportScriptPath,
      incompleteExamplePath,
      '--out',
      outputPath,
      '--allow-any-path',
    ],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
    },
  );

  assert.match(stdout, /wrote local pilot report/i);
  assert.match(readFileSync(outputPath, 'utf8'), /continue_pilot/i);
});

test('pilot report generator does not print secret-looking env values', () => {
  const output = execFileSync(
    process.execPath,
    ['--import', 'tsx', reportScriptPath, passingExamplePath],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
    },
  );

  assert.doesNotMatch(output, /DEEPSEEK_API_KEY|SUPABASE_SERVICE_ROLE_KEY|PHASE4_WRITE_AUTH_TOKEN/i);
  assert.doesNotMatch(output, /VITE_SUPABASE_ANON_KEY=/i);
});

test('pilot report generator redacts secret-looking operator notes from local evidence', () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'signaldesk-pilot-report-redaction-'));
  const evidencePath = resolve(tempDir, 'docs/evidence/today-real-feed-pilot-evidence.local.json');
  const evidence = JSON.parse(readFileSync(passingExamplePath, 'utf8')) as Record<string, unknown>;

  mkdirSync(resolve(tempDir, 'docs/evidence'), { recursive: true });
  evidence.reviewerNotes = ['PHASE4_WRITE_AUTH_TOKEN=super-secret'];
  evidence.screenshotsOrNotes = ['VITE_SUPABASE_URL=https://example.supabase.co'];
  writeFileSync(evidencePath, JSON.stringify(evidence, null, 2), 'utf8');

  const output = execFileSync(
    process.execPath,
    ['--import', 'tsx', reportScriptPath, evidencePath],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
    },
  );

  assert.doesNotMatch(output, /PHASE4_WRITE_AUTH_TOKEN=super-secret/i);
  assert.doesNotMatch(output, /https:\/\/example\.supabase\.co/i);
  assert.match(output, /PHASE4_WRITE_AUTH_TOKEN=\[redacted\]/i);
  assert.match(output, /VITE_SUPABASE_URL=\[redacted\]/i);
});

test('pilot report generator redacts secret-looking environment labels from local evidence', () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'signaldesk-pilot-report-redaction-env-'));
  const evidencePath = resolve(tempDir, 'docs/evidence/today-real-feed-pilot-evidence.local.json');
  const evidence = JSON.parse(readFileSync(passingExamplePath, 'utf8')) as Record<string, unknown>;

  mkdirSync(resolve(tempDir, 'docs/evidence'), { recursive: true });
  evidence.environmentLabel = 'PHASE4_WRITE_AUTH_TOKEN=super-secret';
  writeFileSync(evidencePath, JSON.stringify(evidence, null, 2), 'utf8');

  const output = execFileSync(
    process.execPath,
    ['--import', 'tsx', reportScriptPath, evidencePath],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
    },
  );

  assert.doesNotMatch(output, /PHASE4_WRITE_AUTH_TOKEN=super-secret/i);
  assert.match(output, /PHASE4_WRITE_AUTH_TOKEN=\[redacted\]/i);
});

test('pilot report generator includes rollback status and next action', () => {
  const output = execFileSync(
    process.execPath,
    ['--import', 'tsx', reportScriptPath, passingExamplePath],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
    },
  );

  assert.match(output, /Rollback Status/i);
  assert.match(output, /Next Action/i);
});
