import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  buildTodayPilotEvidenceNextPlan,
  labelTodayPilotCheck,
} from '../src/lib/content/todayRealFeedEvidenceGuidance';
import { assertTodayPilotEvidenceReadPathSafe } from '../src/lib/content/todayRealFeedEvidenceUpdater';
import {
  evaluateTodayPilotEvidence,
  parseTodayPilotEvidence,
} from '../src/lib/content/todayRealFeedPilotEvidence';
import { sanitizeTodayPilotDisplayLines } from '../src/lib/content/todayRealFeedEvidenceSanitizer';

function parseArgs(argv: string[]) {
  let evidencePath = '';
  let allowAnyPath = false;

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];

    if (!current.startsWith('--') && evidencePath.length === 0) {
      evidencePath = current;
      continue;
    }

    if (current === '--allow-any-path') {
      allowAnyPath = true;
      continue;
    }
  }

  return {
    evidencePath,
    allowAnyPath,
  };
}

const args = parseArgs(process.argv.slice(2));
const evidencePathArg = args.evidencePath;

if (!evidencePathArg) {
  process.stderr.write(
    'Error: please provide a local evidence JSON path.\nTry: npm run phase4:create-today-evidence\n',
  );
  process.exit(1);
}

const resolvedEvidencePath = resolve(process.cwd(), evidencePathArg);

try {
  assertTodayPilotEvidenceReadPathSafe(resolvedEvidencePath, args.allowAnyPath);
} catch (error) {
  process.stderr.write(
    `Error: ${error instanceof Error ? error.message : 'Unsafe evidence path.'}\n`,
  );
  process.exit(1);
}

if (!existsSync(resolvedEvidencePath)) {
  process.stderr.write(
    `Error: local evidence file not found.\nCreate it with: npm run phase4:create-today-evidence\nExpected default path: docs/evidence/today-real-feed-pilot-evidence.local.json\n`,
  );
  process.exit(1);
}

let rawJson = '';

try {
  rawJson = readFileSync(resolvedEvidencePath, 'utf8');
} catch {
  process.stderr.write('Error: could not read the local evidence file.\n');
  process.exit(1);
}

let review;

try {
  review = evaluateTodayPilotEvidence(parseTodayPilotEvidence(JSON.parse(rawJson)));
} catch (error) {
  process.stderr.write(
    `Error: local evidence JSON could not be parsed safely. ${
      error instanceof Error ? error.message : 'Unknown parse error.'
    }\n`,
  );
  process.exit(1);
}

const nextPlan = buildTodayPilotEvidenceNextPlan(review, evidencePathArg);

function formatList(label: string, values: string[]) {
  const safeValues = sanitizeTodayPilotDisplayLines(values);

  if (values.length === 0) {
    return `${label}: (none)`;
  }

  return `${label}:\n- ${safeValues.join('\n- ')}`;
}

const lines = [
  'SignalDesk Today real-feed next evidence step',
  '',
  `Current recommendation: ${nextPlan.recommendation}`,
  formatList(
    'Missing required evidence',
    nextPlan.missingRequiredChecks.map(labelTodayPilotCheck),
  ),
  formatList(
    'Failed critical checks',
    nextPlan.failedCriticalChecks.map(labelTodayPilotCheck),
  ),
  formatList('Warnings', nextPlan.warnings),
  `Next action: ${nextPlan.nextAction}`,
  formatList('Exact next manual checks to run', nextPlan.exactNextManualChecks),
  formatList('Suggested update commands', nextPlan.suggestedUpdateCommands),
  formatList('Existing evidence notes that already help', nextPlan.evidenceStatusLines),
  'Rollback reminder:',
  ...nextPlan.rollbackReminder.map((line) => `- ${line}`),
  'Boundaries:',
  '- Local-only helper.',
  '- No Supabase call.',
  '- No AI call.',
  '- No content write.',
  '- No secret values printed.',
];

process.stdout.write(`${lines.join('\n')}\n`);
