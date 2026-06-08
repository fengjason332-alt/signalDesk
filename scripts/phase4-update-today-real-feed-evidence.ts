import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { mkdirSync } from 'node:fs';

import {
  applyTodayPilotEvidenceUpdates,
  assertTodayPilotEvidencePathSafe,
} from '../src/lib/content/todayRealFeedEvidenceUpdater';

function readFlagValue(argv: string[], index: number, flagName: string): string {
  const value = argv[index + 1];
  if (!value) {
    throw new Error(`${flagName} requires a value.`);
  }
  return value;
}

function parseArgs(argv: string[]) {
  let evidencePath = '';
  let allowAnyPath = false;
  const operatorNotes: string[] = [];
  const screenshotNotes: string[] = [];
  const options: Record<string, string | string[] | boolean> = {};

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

    if (current === '--operator-note') {
      operatorNotes.push(readFlagValue(argv, index, current));
      index += 1;
      continue;
    }

    if (current === '--screenshot-note') {
      screenshotNotes.push(readFlagValue(argv, index, current));
      index += 1;
      continue;
    }

    const value = readFlagValue(argv, index, current);
    options[current] = value;
    index += 1;
  }

  return {
    evidencePath,
    allowAnyPath,
    operatorNotes,
    screenshotNotes,
    options,
  };
}

const args = parseArgs(process.argv.slice(2));

if (!args.evidencePath) {
  process.stderr.write(
    'Error: please provide a local evidence JSON path to update.\n',
  );
  process.exit(1);
}

const resolvedEvidencePath = resolve(process.cwd(), args.evidencePath);

try {
  assertTodayPilotEvidencePathSafe(resolvedEvidencePath, args.allowAnyPath);
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
  process.stderr.write('Error: could not read the evidence file.\n');
  process.exit(1);
}

let parsedRaw: Record<string, unknown>;

try {
  parsedRaw = JSON.parse(rawJson) as Record<string, unknown>;
} catch {
  process.stderr.write('Error: evidence file contains malformed JSON.\n');
  process.exit(1);
}

let updated: Record<string, unknown>;

try {
  updated = applyTodayPilotEvidenceUpdates(parsedRaw, {
    allowAnyPath: args.allowAnyPath,
    realCardsRendered: args.options['--real-cards-rendered'] as string | undefined,
    realCardCount: args.options['--real-card-count'] as string | undefined,
    detailOpenedSafely: args.options['--detail-opened-safely'] as string | undefined,
    provenanceVisible: args.options['--provenance-visible'] as string | undefined,
    sourceLinksVisible: args.options['--source-links-visible'] as string | undefined,
    noFakeArticleBody: args.options['--no-fake-article-body'] as string | undefined,
    completedEnrichedTextWins: args.options[
      '--completed-enriched-text-wins'
    ] as string | undefined,
    blankEnrichmentFallback: args.options[
      '--blank-enrichment-fallback'
    ] as string | undefined,
    incompleteEnrichmentFallback: args.options[
      '--incomplete-enrichment-fallback'
    ] as string | undefined,
    aiOpenAiFilterWorks: args.options['--ai-openai-filter-works'] as
      | string
      | undefined,
    nonmatchingFilterEmpty: args.options['--nonmatching-filter-empty'] as
      | string
      | undefined,
    realEmptyDistinct: args.options['--real-empty-distinct'] as string | undefined,
    rollbackTested: args.options['--rollback-tested'] as string | undefined,
    previewReadPoliciesConfirmed: args.options[
      '--preview-read-policies-confirmed'
    ] as string | undefined,
    mobileQuality: args.options['--mobile-quality'] as string | undefined,
    bilingualQuality: args.options['--bilingual-quality'] as string | undefined,
    freshness: args.options['--freshness'] as string | undefined,
    sourceCoverage: args.options['--source-coverage'] as string | undefined,
    operatorNotes: args.operatorNotes,
    screenshotNotes: args.screenshotNotes,
  });
} catch (error) {
  process.stderr.write(
    `Error: ${error instanceof Error ? error.message : 'Could not update evidence.'}\n`,
  );
  process.exit(1);
}

mkdirSync(dirname(resolvedEvidencePath), { recursive: true });
writeFileSync(resolvedEvidencePath, `${JSON.stringify(updated, null, 2)}\n`, 'utf8');

process.stdout.write(
  `Updated local Today pilot evidence: ${args.evidencePath}\nNo Supabase call. No AI call. No content write.\n`,
);
