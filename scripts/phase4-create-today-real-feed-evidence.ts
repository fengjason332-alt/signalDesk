import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import {
  buildTodayRealFeedEvidenceStarterPlan,
  DEFAULT_TODAY_REAL_FEED_EVIDENCE_OUTPUT_PATH,
} from '../src/lib/content/todayRealFeedEvidenceStarter';

const TEMPLATE_PATH = 'docs/examples/today-real-feed-pilot-evidence.template.json';

function parseArgs(argv: string[]) {
  let outputPath = DEFAULT_TODAY_REAL_FEED_EVIDENCE_OUTPUT_PATH;
  let overwrite = false;

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];

    if (current === '--overwrite') {
      overwrite = true;
      continue;
    }

    if (current === '--output') {
      const nextValue = argv[index + 1];
      if (!nextValue) {
        process.stderr.write('Error: --output requires a path value.\n');
        process.exit(1);
      }
      outputPath = nextValue;
      index += 1;
    }
  }

  return { outputPath, overwrite };
}

const args = parseArgs(process.argv.slice(2));
const templatePath = resolve(process.cwd(), TEMPLATE_PATH);
const resolvedOutputPath = resolve(process.cwd(), args.outputPath);
const fileAlreadyExists = existsSync(resolvedOutputPath);
const plan = buildTodayRealFeedEvidenceStarterPlan({
  fileAlreadyExists,
  outputPath: args.outputPath,
  overwrite: args.overwrite,
});

if (plan.shouldWrite) {
  mkdirSync(dirname(resolvedOutputPath), { recursive: true });
  writeFileSync(resolvedOutputPath, readFileSync(templatePath, 'utf8'), 'utf8');
}

const lines = [
  'SignalDesk Today real-feed evidence starter',
  '',
  plan.shouldWrite
    ? `Created local evidence file: ${plan.outputPath}`
    : `Local evidence file already exists and was not overwritten: ${plan.outputPath}`,
];

if (!plan.shouldWrite) {
  lines.push('Use --overwrite only if you intentionally want to replace your local notes.');
}

lines.push('Next steps:');
for (const step of plan.nextSteps) {
  lines.push(`- ${step}`);
}

process.stdout.write(`${lines.join('\n')}\n`);
