import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import {
  buildTodayRealFeedPilotMarkdownReport,
  DEFAULT_TODAY_REAL_FEED_REPORT_OUTPUT_PATH,
} from '../src/lib/content/todayRealFeedPilotReport';
import {
  evaluateTodayPilotEvidence,
  parseTodayPilotEvidence,
} from '../src/lib/content/todayRealFeedPilotEvidence';
import {
  assertTodayPilotEvidencePathSafe as assertTodayPilotReportPathSafe,
  assertTodayPilotEvidenceReadPathSafe,
} from '../src/lib/content/todayRealFeedEvidenceUpdater';

function parseArgs(argv: string[]) {
  let evidencePath = '';
  let outputPath: string | null = null;
  let overwrite = false;
  let allowAnyPath = false;

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];

    if (!current.startsWith('--') && evidencePath.length === 0) {
      evidencePath = current;
      continue;
    }

    if (current === '--overwrite') {
      overwrite = true;
      continue;
    }

    if (current === '--allow-any-path') {
      allowAnyPath = true;
      continue;
    }

    if (current === '--out') {
      const value = argv[index + 1];
      if (!value) {
        throw new Error('--out requires a path value.');
      }
      outputPath = value;
      index += 1;
      continue;
    }
  }

  return {
    evidencePath,
    outputPath,
    overwrite,
    allowAnyPath,
  };
}

let args;

try {
  args = parseArgs(process.argv.slice(2));
} catch (error) {
  process.stderr.write(
    `Error: ${error instanceof Error ? error.message : 'Invalid arguments.'}\n`,
  );
  process.exit(1);
}

if (!args.evidencePath) {
  process.stderr.write('Error: please provide an evidence JSON path.\n');
  process.exit(1);
}

const resolvedEvidencePath = resolve(process.cwd(), args.evidencePath);
let rawJson = '';

try {
  assertTodayPilotEvidenceReadPathSafe(resolvedEvidencePath, args.allowAnyPath);
} catch (error) {
  process.stderr.write(
    `Error: ${error instanceof Error ? error.message : 'Unsafe evidence path.'}\n`,
  );
  process.exit(1);
}

try {
  rawJson = readFileSync(resolvedEvidencePath, 'utf8');
} catch {
  process.stderr.write('Error: could not read evidence file.\n');
  process.exit(1);
}

let reportMarkdown = '';

try {
  const review = evaluateTodayPilotEvidence(
    parseTodayPilotEvidence(JSON.parse(rawJson)),
  );
  reportMarkdown = buildTodayRealFeedPilotMarkdownReport(review);
} catch (error) {
  process.stderr.write(
    `Error: evidence file is invalid. ${
      error instanceof Error ? error.message : 'Unknown error.'
    }\n`,
  );
  process.exit(1);
}

process.stdout.write(reportMarkdown);

if (args.outputPath) {
  const chosenOutputPath = args.outputPath || DEFAULT_TODAY_REAL_FEED_REPORT_OUTPUT_PATH;
  const resolvedOutputPath = resolve(process.cwd(), chosenOutputPath);

  try {
    assertTodayPilotReportPathSafe(resolvedOutputPath, args.allowAnyPath, 'report');
  } catch (error) {
    process.stderr.write(
      `Error: ${error instanceof Error ? error.message : 'Unsafe report path.'}\n`,
    );
    process.exit(1);
  }

  if (existsSync(resolvedOutputPath) && !args.overwrite) {
    process.stderr.write(
      'Error: report file already exists. Use --overwrite if you intentionally want to replace it.\n',
    );
    process.exit(1);
  }

  mkdirSync(dirname(resolvedOutputPath), { recursive: true });
  writeFileSync(resolvedOutputPath, reportMarkdown, 'utf8');
  process.stdout.write(`\nWrote local pilot report: ${chosenOutputPath}\n`);
}
