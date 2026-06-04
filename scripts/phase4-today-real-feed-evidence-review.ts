import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  evaluateTodayPilotEvidence,
  parseTodayPilotEvidence,
} from '../src/lib/content/todayRealFeedPilotEvidence';

const evidencePathArg = process.argv[2];

if (!evidencePathArg) {
  process.stderr.write(
    'Error: could not read evidence file because no path argument was provided.\n',
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

const lines = [
  'SignalDesk Today real-feed evidence review',
  '',
  `Overall recommendation: ${review.recommendation}`,
  `Environment label: ${review.normalizedEvidence.environmentLabel}`,
  `Observed feed mode: ${review.normalizedEvidence.observedFeedMode}`,
  formatList('Missing required checks', review.missingRequiredChecks),
  formatList('Failed critical checks', review.failedCriticalChecks),
  formatList('Warnings', review.warnings),
  `Next action: ${review.nextAction}`,
  'Rollback instruction:',
  '- Set VITE_USE_REAL_CONTENT_FEED=false',
  '- Restart locally with npm run dev, or rebuild/redeploy the target environment',
  '- Open Today and confirm the mock feed is back',
];

process.stdout.write(`${lines.join('\n')}\n`);
