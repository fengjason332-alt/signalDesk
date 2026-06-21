import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

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
  assert.match(output, /Capture a completed non-empty enriched-content win/i);
  assert.match(output, /Capture mobile quality evidence/i);
  assert.match(output, /Capture freshness evidence/i);
  assert.match(output, /Capture source coverage evidence/i);
  assert.match(output, /phase4:update-today-evidence -- .*--completed-enriched-text-observed true/i);
  assert.match(output, /phase4:update-today-evidence -- .*--mobile-quality acceptable/i);
  assert.match(output, /phase4:update-today-evidence -- .*--freshness acceptable/i);
  assert.match(output, /phase4:update-today-evidence -- .*--source-coverage acceptable/i);
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
  assert.match(output, /source coverage notes captured:\s+1/i);
  assert.match(output, /freshness notes captured:\s+1/i);
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
