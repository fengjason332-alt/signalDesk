import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  buildTodayRealFeedPilotCheck,
  TODAY_REAL_FEED_PILOT_BLOCKERS,
  TODAY_REAL_FEED_PILOT_BOUNDARIES,
  TODAY_REAL_FEED_PILOT_CHECKS,
  TODAY_REAL_FEED_PILOT_EVIDENCE_TO_COLLECT,
  TODAY_REAL_FEED_PILOT_NEXT_COMMANDS,
  TODAY_REAL_FEED_PILOT_PASS_CRITERIA,
  TODAY_REAL_FEED_PILOT_ROLLBACK_STEPS,
} from './lib/content/todayRealFeedPilot';

test('buildTodayRealFeedPilotCheck keeps Today mock-by-default when env flag is false or missing', () => {
  assert.deepEqual(
    buildTodayRealFeedPilotCheck({}),
    {
      mode: 'mock_default',
      shouldAttemptRealFeedRead: false,
      missingEnvKeys: [],
      requiredEnvKeys: [
        'VITE_USE_REAL_CONTENT_FEED',
        'VITE_SUPABASE_URL',
        'VITE_SUPABASE_ANON_KEY',
      ],
      nextCommands: TODAY_REAL_FEED_PILOT_NEXT_COMMANDS,
      rollbackEnv: {
        VITE_USE_REAL_CONTENT_FEED: 'false',
      },
      warnings: [
        'Today remains mock by default until VITE_USE_REAL_CONTENT_FEED=true is explicitly enabled.',
      ],
      checks: TODAY_REAL_FEED_PILOT_CHECKS,
      rollbackSteps: TODAY_REAL_FEED_PILOT_ROLLBACK_STEPS,
      passCriteria: TODAY_REAL_FEED_PILOT_PASS_CRITERIA,
      evidenceToCollect: TODAY_REAL_FEED_PILOT_EVIDENCE_TO_COLLECT,
      blockers: TODAY_REAL_FEED_PILOT_BLOCKERS,
      boundaries: TODAY_REAL_FEED_PILOT_BOUNDARIES,
    },
  );
});

test('buildTodayRealFeedPilotCheck marks the pilot ready only when explicit Supabase env is present', () => {
const result = buildTodayRealFeedPilotCheck({
    VITE_USE_REAL_CONTENT_FEED: 'true',
    VITE_SUPABASE_URL: 'https://example.supabase.co',
    VITE_SUPABASE_ANON_KEY: 'public-anon-key',
  });

  assert.equal(result.mode, 'pilot_ready');
  assert.equal(result.shouldAttemptRealFeedRead, true);
  assert.deepEqual(result.missingEnvKeys, []);
  assert.equal(result.warnings.length, 0);
  assert.deepEqual(result.nextCommands, TODAY_REAL_FEED_PILOT_NEXT_COMMANDS);
  assert.ok(result.passCriteria.includes('Real cards remain readable and useful.'));
  assert.ok(result.evidenceToCollect.includes('Capture whether Today loaded real cards, real_empty, or fallback_to_mock.'));
  assert.ok(
    result.checks.includes('Confirm real_empty is distinguishable from filter_empty.'),
  );
});

test('buildTodayRealFeedPilotCheck flags missing Supabase env and warns that the app should fallback safely', () => {
  const result = buildTodayRealFeedPilotCheck({
    VITE_USE_REAL_CONTENT_FEED: 'true',
    VITE_SUPABASE_URL: 'https://example.supabase.co',
  });

  assert.equal(result.mode, 'pilot_misconfigured');
  assert.equal(result.shouldAttemptRealFeedRead, false);
  assert.deepEqual(result.missingEnvKeys, ['VITE_SUPABASE_ANON_KEY']);
  assert.match(
    result.warnings.join('\n'),
    /Today real-feed is enabled but missing required Supabase env/i,
  );
  assert.match(
    result.warnings.join('\n'),
    /fallback to mock/i,
  );
  assert.deepEqual(result.rollbackSteps, TODAY_REAL_FEED_PILOT_ROLLBACK_STEPS);
});

test('local Today pilot helper script prints a bounded pilot-ready summary without calling network services', () => {
  const scriptPath = resolve(process.cwd(), 'scripts/phase4-today-real-feed-pilot.ts');
  const output = execFileSync(
    process.execPath,
    ['--import', 'tsx', scriptPath],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        VITE_USE_REAL_CONTENT_FEED: 'true',
        VITE_SUPABASE_URL: 'https://example.supabase.co',
        VITE_SUPABASE_ANON_KEY: 'public-anon-key',
      },
      encoding: 'utf8',
    },
  );

  assert.match(output, /mode: pilot_ready/i);
  assert.match(output, /sections:/i);
  assert.match(output, /shouldAttemptRealFeedRead: true/i);
  assert.match(output, /next commands:/i);
  assert.match(output, /phase4:create-today-evidence/i);
  assert.match(output, /phase4:update-today-evidence/i);
  assert.match(output, /phase4:today-evidence-review -- docs\/evidence\/today-real-feed-pilot-evidence\.local\.json/i);
  assert.match(output, /phase4:today-pilot-report -- docs\/evidence\/today-real-feed-pilot-evidence\.local\.json --out docs\/evidence\/today-real-feed-pilot-report\.local\.md/i);
  assert.match(output, /npm run dev/i);
  assert.match(output, /rollback steps:/i);
  assert.match(output, /pass criteria:/i);
  assert.match(output, /evidence to collect:/i);
  assert.match(output, /default-switch blockers:/i);
  assert.match(output, /no ai call/i);
  assert.match(output, /no content write/i);
  assert.match(output, /manual checks:/i);
  assert.match(output, /real_empty/i);
  assert.match(output, /no fake body content/i);
  assert.doesNotMatch(output, /DEEPSEEK_API_KEY/i);
  assert.doesNotMatch(output, /SUPABASE_SERVICE_ROLE_KEY/i);
  assert.doesNotMatch(output, /https:\/\/example\.supabase\.co/i);
  assert.doesNotMatch(output, /public-anon-key/i);
});

test('package.json exposes the bounded local Today pilot helper command', () => {
  const packageJson = JSON.parse(
    readFileSync(resolve(process.cwd(), 'package.json'), 'utf8'),
  ) as {
    scripts?: Record<string, string>;
  };

  assert.equal(
    packageJson.scripts?.['phase4:today-pilot-check'],
    'node --import tsx scripts/phase4-today-real-feed-pilot.ts',
  );
});

test('package.json exposes the local Today pilot update, report, and help commands', () => {
  const packageJson = JSON.parse(
    readFileSync(resolve(process.cwd(), 'package.json'), 'utf8'),
  ) as {
    scripts?: Record<string, string>;
  };

  assert.equal(
    packageJson.scripts?.['phase4:update-today-evidence'],
    'node --import tsx scripts/phase4-update-today-real-feed-evidence.ts',
  );
  assert.equal(
    packageJson.scripts?.['phase4:today-pilot-report'],
    'node --import tsx scripts/phase4-today-real-feed-pilot-report.ts',
  );
  assert.equal(
    packageJson.scripts?.['phase4:today-help'],
    'node --import tsx scripts/phase4-today-real-feed-help.ts',
  );
});

test('today real-feed pilot contract exposes bounded evidence, rollback, pass criteria, and blockers', () => {
  assert.ok(
    TODAY_REAL_FEED_PILOT_ROLLBACK_STEPS.includes(
      'Set VITE_USE_REAL_CONTENT_FEED=false.',
    ),
  );
  assert.ok(
    TODAY_REAL_FEED_PILOT_PASS_CRITERIA.includes(
      'Real cards remain readable and useful.',
    ),
  );
  assert.ok(
    TODAY_REAL_FEED_PILOT_EVIDENCE_TO_COLLECT.includes(
      'Capture whether Today loaded real cards, real_empty, or fallback_to_mock.',
    ),
  );
  assert.ok(
    TODAY_REAL_FEED_PILOT_BLOCKERS.includes(
      'Preview-read fallback is unreliable or confusing.',
    ),
  );
});

test('local Today help command prints the full bounded operator flow', () => {
  const scriptPath = resolve(process.cwd(), 'scripts/phase4-today-real-feed-help.ts');
  const output = execFileSync(
    process.execPath,
    ['--import', 'tsx', scriptPath],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
    },
  );

  assert.match(output, /phase4:create-today-evidence/i);
  assert.match(output, /phase4:today-pilot-check/i);
  assert.match(output, /phase4:update-today-evidence/i);
  assert.match(output, /phase4:today-evidence-review/i);
  assert.match(output, /phase4:today-pilot-report/i);
  assert.match(output, /rollback/i);
  assert.match(output, /do not commit local evidence or local pilot reports/i);
  assert.match(output, /no ai call/i);
  assert.match(output, /no content write/i);
  assert.match(output, /no supabase call unless the app is running separately/i);
});
