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
