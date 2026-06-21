import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { assertTodayPilotEvidenceReadPathSafe } from '../src/lib/content/todayRealFeedEvidenceUpdater';
import { sanitizeTodayPilotDisplayText } from '../src/lib/content/todayRealFeedEvidenceSanitizer';
import {
  evaluateTodayPilotEvidence,
  parseTodayPilotEvidence,
  type TodayPilotEvidenceEvaluation,
} from '../src/lib/content/todayRealFeedPilotEvidence';

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
    'Error: could not read evidence file because no path argument was provided.\n',
  );
  process.exit(1);
}

try {
  assertTodayPilotEvidenceReadPathSafe(
    resolve(process.cwd(), evidencePathArg),
    args.allowAnyPath,
  );
} catch (error) {
  process.stderr.write(
    `Error: ${error instanceof Error ? error.message : 'Unsafe evidence path.'}\n`,
  );
  process.exit(1);
}

let rawJson = '';

try {
  rawJson = readFileSync(resolve(process.cwd(), evidencePathArg), 'utf8');
} catch {
  process.stderr.write('Error: could not read evidence file.\n');
  process.exit(1);
}

let review;

try {
  review = evaluateTodayPilotEvidence(parseTodayPilotEvidence(JSON.parse(rawJson)));
} catch (error) {
  process.stderr.write(
    `Error: evidence file is invalid. ${
      error instanceof Error ? error.message : 'Unknown error.'
    }\n`,
  );
  process.exit(1);
}

function formatList(label: string, values: string[]) {
  if (values.length === 0) {
    return `${label}: (none)`;
  }

  return `${label}:\n- ${values.join('\n- ')}`;
}

function buildWhatToFixNext(review: TodayPilotEvidenceEvaluation) {
  if (review.failedCriticalChecks.length > 0) {
    return review.failedCriticalChecks.map(
      fieldName => `Resolve the critical check: ${fieldName}.`,
    );
  }

  if (review.missingRequiredChecks.length > 0) {
    return review.missingRequiredChecks.map(
      fieldName => `Capture and confirm the missing check: ${fieldName}.`,
    );
  }

  if (review.warnings.length > 0) {
    return review.warnings.map(warning => `Follow up on the warning: ${warning}`);
  }

  return [
    'No immediate fixes are required. Keep Today mock-by-default until the rollout evidence is explicitly accepted.',
  ];
}

const whatToFixNext = buildWhatToFixNext(review);

const lines = [
  'SignalDesk Today real-feed evidence review',
  '',
  `Overall recommendation: ${review.recommendation}`,
  `Environment label: ${sanitizeTodayPilotDisplayText(review.normalizedEvidence.environmentLabel)}`,
  `Observed feed mode: ${sanitizeTodayPilotDisplayText(review.normalizedEvidence.observedFeedMode)}`,
  formatList('Missing required checks', review.missingRequiredChecks),
  formatList('Failed critical checks', review.failedCriticalChecks),
  formatList('Warnings', review.warnings),
  `Next action: ${review.nextAction}`,
  formatList('What to fix next', whatToFixNext),
  `Next-step helper: npm run phase4:today-evidence-next -- ${evidencePathArg}`,
  'Rollback instruction:',
  '- Set VITE_USE_REAL_CONTENT_FEED=false',
  '- Restart locally with npm run dev, or rebuild/redeploy the target environment',
  '- Open Today and confirm the mock feed is back',
];

process.stdout.write(`${lines.join('\n')}\n`);
