import { existsSync, readFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';

import {
  buildTodayPilotEvidenceNextPlan,
  labelTodayPilotCheck,
} from '../src/lib/content/todayRealFeedEvidenceGuidance';
import { assertTodayPilotEvidenceReadPathSafe } from '../src/lib/content/todayRealFeedEvidenceUpdater';
import {
  evaluateTodayPilotEvidence,
  parseTodayPilotEvidence,
} from '../src/lib/content/todayRealFeedPilotEvidence';
import {
  isTodayPilotRepoExamplePath,
  sanitizeTodayPilotDisplayLines,
  sanitizeTodayPilotDisplayPath,
} from '../src/lib/content/todayRealFeedEvidenceSanitizer';

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
const safeEvidencePathArg = isTodayPilotRepoExamplePath(evidencePathArg)
  ? 'docs/evidence/today-real-feed-pilot-evidence.local.json'
  : sanitizeTodayPilotDisplayPath(evidencePathArg);

function deriveSuggestedReportPath(evidencePath: string): string {
  const resolvedEvidencePath = resolve(process.cwd(), evidencePath);
  const filename = basename(resolvedEvidencePath);

  if (
    filename.startsWith('today-real-feed-pilot-evidence') &&
    filename.endsWith('.json')
  ) {
    return `docs/evidence/${filename.replace('evidence', 'report').replace(/\.json$/i, '.md')}`;
  }

  return 'docs/evidence/today-real-feed-pilot-report.local.md';
}

const suggestedReportPath = deriveSuggestedReportPath(
  isTodayPilotRepoExamplePath(evidencePathArg)
    ? 'docs/evidence/today-real-feed-pilot-evidence.local.json'
    : evidencePathArg,
);

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
  'Evidence completeness:',
  `- Required checks completed: ${nextPlan.completeness.requiredChecksCompletedCount}/${nextPlan.completeness.requiredChecksTotalCount}`,
  `- Required checks missing: ${nextPlan.completeness.requiredChecksMissingCount}`,
  `- Critical blockers: ${nextPlan.completeness.criticalBlockersCount}`,
  `- Warnings: ${nextPlan.completeness.warningsCount}`,
  `- Guidance-only progress score: ${nextPlan.completeness.progressPercent}%`,
  '- Guidance only: this score does not switch Today to real-feed by default.',
  formatList(
    'Missing required evidence',
    nextPlan.missingRequiredChecks.map(labelTodayPilotCheck),
  ),
  formatList(
    'Failed critical checks',
    nextPlan.failedCriticalChecks.map(labelTodayPilotCheck),
  ),
  formatList('Warnings', nextPlan.warnings),
  formatList('Must collect before rollout', nextPlan.mustCollectBeforeRollout),
  formatList('Optional but recommended', nextPlan.optionalButRecommended),
  formatList('Blocked or contradictory', nextPlan.blockedOrContradictory),
  formatList('Already satisfied', nextPlan.alreadySatisfied),
  `Next action: ${nextPlan.nextAction}`,
  `Exact next manual action: ${nextPlan.exactNextManualAction}`,
  formatList('Exact next manual checks to run', nextPlan.exactNextManualChecks),
  formatList('Exact commands to update evidence', nextPlan.exactUpdateCommands),
  formatList('Existing evidence notes that already help', nextPlan.evidenceStatusLines),
  'After this pass:',
  `- Rerun review: npm run phase4:today-evidence-review -- ${safeEvidencePathArg}`,
  `- Rerun status: npm run phase4:today-evidence-status -- ${safeEvidencePathArg}`,
  `- Rerun sanitized report: npm run phase4:today-pilot-report -- ${safeEvidencePathArg} --out ${suggestedReportPath}`,
  '- Keep Today mock-by-default unless a separate explicit rollout task approves otherwise.',
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
