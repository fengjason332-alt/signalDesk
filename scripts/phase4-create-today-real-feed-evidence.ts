import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import {
  buildTodayRealFeedEvidenceStarterPlan,
  DEFAULT_TODAY_REAL_FEED_EVIDENCE_OUTPUT_PATH,
} from '../src/lib/content/todayRealFeedEvidenceStarter';

function parseArgs(argv: string[]) {
  let outputPath = DEFAULT_TODAY_REAL_FEED_EVIDENCE_OUTPUT_PATH;
  let templatePath = 'docs/examples/today-real-feed-pilot-evidence.template.json';
  let overwrite = false;

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];

    if (current === '--overwrite') {
      overwrite = true;
      continue;
    }

    if (current === '--output' || current === '--out') {
      const nextValue = argv[index + 1];
      if (!nextValue) {
        process.stderr.write(`Error: ${current} requires a path value.\n`);
        process.exit(1);
      }
      outputPath = nextValue;
      index += 1;
      continue;
    }

    if (current === '--from-template') {
      const nextValue = argv[index + 1];
      if (!nextValue) {
        process.stderr.write('Error: --from-template requires a path value.\n');
        process.exit(1);
      }
      templatePath = nextValue;
      index += 1;
    }
  }

  return { outputPath, templatePath, overwrite };
}

const args = parseArgs(process.argv.slice(2));
const resolvedOutputPath = resolve(process.cwd(), args.outputPath);
const resolvedTemplatePath = resolve(process.cwd(), args.templatePath);
const fileAlreadyExists = existsSync(resolvedOutputPath);
const plan = buildTodayRealFeedEvidenceStarterPlan({
  fileAlreadyExists,
  outputPath: args.outputPath,
  templatePath: args.templatePath,
  overwrite: args.overwrite,
});

if (plan.shouldWrite) {
  let templateContents = '';

  try {
    templateContents = readFileSync(resolvedTemplatePath, 'utf8');
  } catch {
    process.stderr.write('Error: could not read the evidence template file.\n');
    process.exit(1);
  }

  mkdirSync(dirname(resolvedOutputPath), { recursive: true });
  writeFileSync(resolvedOutputPath, templateContents, 'utf8');
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

lines.push(`Template used: ${plan.templatePath}`);
lines.push('Next steps:');
for (const step of plan.nextSteps) {
  lines.push(`- ${step}`);
}

process.stdout.write(`${lines.join('\n')}\n`);
