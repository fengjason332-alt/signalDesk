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
  const envFlags: string[] = [];
  const sampleCards: string[] = [];
  const enrichedSummaryCases: string[] = [];
  const deterministicFallbackCases: string[] = [];
  const filterChecks: string[] = [];
  const emptyStateChecks: string[] = [];
  const blockerNotes: string[] = [];
  const mobileQualityNotes: string[] = [];
  const bilingualQualityNotes: string[] = [];
  const freshnessNotes: string[] = [];
  const sourceCoverageNotes: string[] = [];
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

    if (current === '--env-flag') {
      envFlags.push(readFlagValue(argv, index, current));
      index += 1;
      continue;
    }

    if (current === '--sample-card') {
      sampleCards.push(readFlagValue(argv, index, current));
      index += 1;
      continue;
    }

    if (current === '--enriched-case') {
      enrichedSummaryCases.push(readFlagValue(argv, index, current));
      index += 1;
      continue;
    }

    if (current === '--deterministic-fallback-case') {
      deterministicFallbackCases.push(readFlagValue(argv, index, current));
      index += 1;
      continue;
    }

    if (current === '--filter-check') {
      filterChecks.push(readFlagValue(argv, index, current));
      index += 1;
      continue;
    }

    if (current === '--empty-state-check') {
      emptyStateChecks.push(readFlagValue(argv, index, current));
      index += 1;
      continue;
    }

    if (current === '--blocker') {
      blockerNotes.push(readFlagValue(argv, index, current));
      index += 1;
      continue;
    }

    if (current === '--mobile-note') {
      mobileQualityNotes.push(readFlagValue(argv, index, current));
      index += 1;
      continue;
    }

    if (current === '--bilingual-note') {
      bilingualQualityNotes.push(readFlagValue(argv, index, current));
      index += 1;
      continue;
    }

    if (current === '--freshness-note') {
      freshnessNotes.push(readFlagValue(argv, index, current));
      index += 1;
      continue;
    }

    if (current === '--source-coverage-note') {
      sourceCoverageNotes.push(readFlagValue(argv, index, current));
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
    envFlags,
    sampleCards,
    enrichedSummaryCases,
    deterministicFallbackCases,
    filterChecks,
    emptyStateChecks,
    blockerNotes,
    mobileQualityNotes,
    bilingualQualityNotes,
    freshnessNotes,
    sourceCoverageNotes,
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
    pilotTimestamp: args.options['--pilot-timestamp'] as string | undefined,
    environmentLabel: args.options['--environment-label'] as string | undefined,
    pilotEnvironment: args.options['--pilot-environment'] as string | undefined,
    tester: args.options['--tester'] as string | undefined,
    appUrlOrLocalhost: args.options['--app-url'] as string | undefined,
    observedFeedMode: args.options['--observed-feed-mode'] as string | undefined,
    realCardsRendered: args.options['--real-cards-rendered'] as string | undefined,
    sourceCount: args.options['--source-count'] as string | undefined,
    realCardCount: args.options['--real-card-count'] as string | undefined,
    detailCheckedCount: args.options['--detail-checked-count'] as string | undefined,
    detailOpenedSafely: args.options['--detail-opened-safely'] as string | undefined,
    provenanceVisible: args.options['--provenance-visible'] as string | undefined,
    sourceLinksVisible: args.options['--source-links-visible'] as string | undefined,
    noFakeArticleBody: args.options['--no-fake-article-body'] as string | undefined,
    completedEnrichedTextObserved: args.options[
      '--completed-enriched-text-observed'
    ] as string | undefined,
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
    brokenPreviewFallback: args.options['--broken-preview-fallback'] as
      | string
      | undefined,
    noSecretsInUi: args.options['--no-secrets-in-ui'] as string | undefined,
    rollbackTested: args.options['--rollback-tested'] as string | undefined,
    previewReadPoliciesConfirmed: args.options[
      '--preview-read-policies-confirmed'
    ] as string | undefined,
    noFrontendWritesIntroduced: args.options[
      '--no-frontend-writes-introduced'
    ] as string | undefined,
    noFrontendAiCallsIntroduced: args.options[
      '--no-frontend-ai-calls-introduced'
    ] as string | undefined,
    radarWatchlistLibraryUnchanged: args.options[
      '--radar-watchlist-library-unchanged'
    ] as string | undefined,
    mobileQuality: args.options['--mobile-quality'] as string | undefined,
    bilingualQuality: args.options['--bilingual-quality'] as string | undefined,
    freshness: args.options['--freshness'] as string | undefined,
    sourceCoverage: args.options['--source-coverage'] as string | undefined,
    finalRecommendation: args.options['--final-recommendation'] as string | undefined,
    envFlags: args.envFlags,
    sampleCards: args.sampleCards,
    enrichedSummaryCases: args.enrichedSummaryCases,
    deterministicFallbackCases: args.deterministicFallbackCases,
    filterChecks: args.filterChecks,
    emptyStateChecks: args.emptyStateChecks,
    blockerNotes: args.blockerNotes,
    mobileQualityNotes: args.mobileQualityNotes,
    bilingualQualityNotes: args.bilingualQualityNotes,
    freshnessNotes: args.freshnessNotes,
    sourceCoverageNotes: args.sourceCoverageNotes,
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
