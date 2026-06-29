import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { basename, dirname, resolve } from 'node:path';

import {
  buildTodayPilotEvidenceNextPlan,
  labelTodayPilotCheck,
} from '../src/lib/content/todayRealFeedEvidenceGuidance';
import {
  sanitizeTodayPilotDisplayLines,
  sanitizeTodayPilotDisplayPath,
  sanitizeTodayPilotDisplayText,
  isTodayPilotRepoExamplePath,
} from '../src/lib/content/todayRealFeedEvidenceSanitizer';
import { assertTodayPilotEvidenceReadPathSafe } from '../src/lib/content/todayRealFeedEvidenceUpdater';
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
    }
  }

  return {
    evidencePath,
    allowAnyPath,
  };
}

function formatList(label: string, values: string[]) {
  const safeValues = sanitizeTodayPilotDisplayLines(values);
  if (safeValues.length === 0) {
    return `${label}: (none)`;
  }

  return `${label}:\n- ${safeValues.join('\n- ')}`;
}

function readGitIgnoredStatus(pathValue: string): 'yes' | 'no' {
  const result = spawnSync('git', ['check-ignore', '-q', pathValue], {
    cwd: process.cwd(),
    stdio: 'ignore',
  });

  return result.status === 0 ? 'yes' : 'no';
}

function buildNextThreeCommands(
  evidencePath: string,
  exactUpdateCommands: readonly string[],
  localReportPath: string | null,
): string[] {
  const reviewCommand = `npm run phase4:today-evidence-review -- ${evidencePath}`;
  const statusCommand = `npm run phase4:today-evidence-status -- ${evidencePath}`;
  const reportCommand =
    localReportPath === null
      ? null
      : `npm run phase4:today-pilot-report -- ${evidencePath} --out ${localReportPath}`;

  if (isTodayPilotRepoExamplePath(evidencePath)) {
    const createCommand = 'npm run phase4:create-today-evidence';
    const firstPostCreateCommand = exactUpdateCommands.find(
      (command) => command !== createCommand,
    );

    return [
      ...new Set(
        [
          createCommand,
          firstPostCreateCommand,
          reviewCommand,
          reportCommand,
          statusCommand,
        ].filter((value): value is string => typeof value === 'string' && value.length > 0),
      ),
    ].slice(0, 3);
  }

  return [
    ...new Set(
      [
        exactUpdateCommands[0],
        reviewCommand,
        statusCommand,
        reportCommand,
      ].filter((value): value is string => typeof value === 'string' && value.length > 0),
    ),
  ].slice(0, 3);
}

function resolveLocalReportPathForEvidence(evidencePath: string): string | null {
  if (isTodayPilotRepoExamplePath(evidencePath)) {
    return null;
  }

  const resolvedEvidencePath = resolve(process.cwd(), evidencePath);
  const filename = basename(resolvedEvidencePath);
  const normalizedSegments = resolvedEvidencePath
    .split(/[\\/]+/)
    .filter((segment) => segment.length > 0);

  const containsDocsEvidenceDir = normalizedSegments.some(
    (_, index) =>
      normalizedSegments[index] === 'docs' &&
      normalizedSegments[index + 1] === 'evidence',
  );

  if (
    containsDocsEvidenceDir &&
    filename.startsWith('today-real-feed-pilot-evidence') &&
    filename.endsWith('.json')
  ) {
    return resolve(
      dirname(resolvedEvidencePath),
      filename.replace('evidence', 'report').replace(/\.json$/i, '.md'),
    );
  }

  return null;
}

function sanitizeLocalReportDisplayPath(reportPath: string): string {
  const resolvedReportPath = resolve(process.cwd(), reportPath);
  const filename = basename(resolvedReportPath);
  const normalizedSegments = resolvedReportPath
    .split(/[\\/]+/)
    .filter((segment) => segment.length > 0);

  const containsDocsEvidenceDir = normalizedSegments.some(
    (_, index) =>
      normalizedSegments[index] === 'docs' &&
      normalizedSegments[index + 1] === 'evidence',
  );

  if (
    containsDocsEvidenceDir &&
    filename.startsWith('today-real-feed-pilot-report') &&
    filename.endsWith('.md')
  ) {
    return `docs/evidence/${filename}`;
  }

  return '<path-to-local-pilot-report-markdown>';
}

const args = parseArgs(process.argv.slice(2));

if (!args.evidencePath) {
  process.stderr.write(
    'Error: please provide a local evidence JSON path.\nTry: npm run phase4:create-today-evidence\n',
  );
  process.exit(1);
}

const resolvedEvidencePath = resolve(process.cwd(), args.evidencePath);

try {
  assertTodayPilotEvidenceReadPathSafe(resolvedEvidencePath, args.allowAnyPath);
} catch (error) {
  process.stderr.write(
    `Error: ${error instanceof Error ? error.message : 'Unsafe evidence path.'}\n`,
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

const nextPlan = buildTodayPilotEvidenceNextPlan(review, args.evidencePath);
const localReportPath = resolveLocalReportPathForEvidence(args.evidencePath);
const nextCommands = buildNextThreeCommands(
  args.evidencePath,
  nextPlan.exactUpdateCommands,
  localReportPath === null ? null : sanitizeLocalReportDisplayPath(localReportPath),
);

const lines = [
  'SignalDesk Today real-feed evidence status',
  '',
  `Evidence path: ${sanitizeTodayPilotDisplayPath(args.evidencePath)}`,
  `Current recommendation: ${review.recommendation}`,
  `Local evidence status: ${review.recommendation}`,
  `Environment label: ${sanitizeTodayPilotDisplayText(review.normalizedEvidence.environmentLabel)}`,
  `Observed feed mode: ${sanitizeTodayPilotDisplayText(review.normalizedEvidence.observedFeedMode)}`,
  `Required evidence: ${review.completeness.requiredChecksCompletedCount}/${review.completeness.requiredChecksTotalCount}`,
  `Required evidence missing: ${review.completeness.requiredChecksMissingCount}`,
  `Guidance-only progress score: ${review.completeness.progressPercent}%`,
  `Local report exists: ${localReportPath !== null && existsSync(localReportPath) ? 'yes' : 'no'}`,
  `Evidence path gitignored: ${readGitIgnoredStatus(args.evidencePath)}`,
  formatList('Missing evidence buckets', nextPlan.mustCollectBeforeRollout),
  formatList(
    'Critical blockers',
    review.failedCriticalChecks.map(labelTodayPilotCheck),
  ),
  formatList('Warnings', review.warnings),
  formatList('Next 3 exact commands to run', nextCommands),
  'Reminder: this command does not switch Today default.',
  'Reminder: this command does not switch Today to real-feed by default.',
  'Boundaries:',
  '- Local-only helper.',
  '- No Supabase call.',
  '- No AI call.',
  '- No content write.',
  '- No secret values printed.',
];

process.stdout.write(`${lines.join('\n')}\n`);
