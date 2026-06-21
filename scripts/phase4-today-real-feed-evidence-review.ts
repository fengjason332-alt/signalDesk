import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  buildTodayPilotEvidenceNextPlan,
  labelTodayPilotCheck,
} from '../src/lib/content/todayRealFeedEvidenceGuidance';
import { assertTodayPilotEvidenceReadPathSafe } from '../src/lib/content/todayRealFeedEvidenceUpdater';
import {
  isTodayPilotRepoExamplePath,
  sanitizeTodayPilotDisplayPath,
  sanitizeTodayPilotDisplayText,
} from '../src/lib/content/todayRealFeedEvidenceSanitizer';
import { DEFAULT_TODAY_REAL_FEED_EVIDENCE_OUTPUT_PATH } from '../src/lib/content/todayRealFeedEvidenceStarter';
import {
  evaluateTodayPilotEvidence,
  parseTodayPilotEvidence,
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

const nextPlan = buildTodayPilotEvidenceNextPlan(review, evidencePathArg);
const nextStepHelperPath = isTodayPilotRepoExamplePath(evidencePathArg)
  ? DEFAULT_TODAY_REAL_FEED_EVIDENCE_OUTPUT_PATH
  : sanitizeTodayPilotDisplayPath(evidencePathArg);

const lines = [
  'SignalDesk Today real-feed evidence review',
  '',
  `Overall recommendation: ${review.recommendation}`,
  `Environment label: ${sanitizeTodayPilotDisplayText(review.normalizedEvidence.environmentLabel)}`,
  `Observed feed mode: ${sanitizeTodayPilotDisplayText(review.normalizedEvidence.observedFeedMode)}`,
  'Evidence completeness:',
  `- Required checks completed: ${review.completeness.requiredChecksCompletedCount}/${review.completeness.requiredChecksTotalCount}`,
  `- Required checks missing: ${review.completeness.requiredChecksMissingCount}`,
  `- Critical blockers: ${review.completeness.criticalBlockersCount}`,
  `- Warnings: ${review.completeness.warningsCount}`,
  `- Guidance-only progress score: ${review.completeness.progressPercent}%`,
  '- Guidance only: this score does not switch Today to real-feed by default.',
  formatList(
    'Missing required checks',
    review.missingRequiredChecks.map(labelTodayPilotCheck),
  ),
  formatList(
    'Failed critical checks',
    review.failedCriticalChecks.map(labelTodayPilotCheck),
  ),
  formatList('Warnings', review.warnings),
  formatList('Optional but recommended', nextPlan.optionalButRecommended),
  formatList('Already satisfied', nextPlan.alreadySatisfied),
  `Next action: ${review.nextAction}`,
  `Primary next manual action: ${nextPlan.exactNextManualAction}`,
  formatList('Exact commands to update evidence', nextPlan.exactUpdateCommands),
  `Next-step helper: npm run phase4:today-evidence-next -- ${nextStepHelperPath}`,
  'Rollback instruction:',
  '- Set VITE_USE_REAL_CONTENT_FEED=false',
  '- Restart locally with npm run dev, or rebuild/redeploy the target environment',
  '- Open Today and confirm the mock feed is back',
];

process.stdout.write(`${lines.join('\n')}\n`);
