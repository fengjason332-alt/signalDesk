import { basename, resolve } from 'node:path';

import {
  parseTodayPilotEvidence,
  toTodayPilotEvidenceCanonicalRecord,
} from './todayRealFeedPilotEvidence';
import {
  TODAY_REAL_FEED_EVIDENCE_IGNORE_PATTERNS,
  TODAY_REAL_FEED_REPORT_IGNORE_PATTERNS,
} from './todayRealFeedEvidenceStarter';

export type TodayPilotQualityValue = 'acceptable' | 'needs_work' | 'not_tested';
export type TodayPilotObservedFeedModeValue =
  | 'mock'
  | 'real'
  | 'fallback_to_mock'
  | 'real_empty'
  | 'unknown';
export type TodayPilotRecommendationValue =
  | 'keep_mock_default'
  | 'continue_pilot'
  | 'ready_for_controlled_default_rollout'
  | 'blocked';

export interface UpdateTodayPilotEvidenceOptions {
  allowAnyPath?: boolean;
  pilotTimestamp?: string;
  environmentLabel?: string;
  pilotEnvironment?: string;
  tester?: string;
  appUrlOrLocalhost?: string;
  observedFeedMode?: string;
  realCardsRendered?: string;
  sourceCount?: string;
  realCardCount?: string;
  detailCheckedCount?: string;
  detailOpenedSafely?: string;
  provenanceVisible?: string;
  sourceLinksVisible?: string;
  noFakeArticleBody?: string;
  completedEnrichedTextObserved?: string;
  completedEnrichedTextWins?: string;
  blankEnrichmentFallback?: string;
  incompleteEnrichmentFallback?: string;
  aiOpenAiFilterWorks?: string;
  nonmatchingFilterEmpty?: string;
  realEmptyDistinct?: string;
  brokenPreviewFallback?: string;
  noSecretsInUi?: string;
  rollbackTested?: string;
  previewReadPoliciesConfirmed?: string;
  noFrontendWritesIntroduced?: string;
  noFrontendAiCallsIntroduced?: string;
  radarWatchlistLibraryUnchanged?: string;
  mobileQuality?: string;
  bilingualQuality?: string;
  freshness?: string;
  sourceCoverage?: string;
  finalRecommendation?: string;
  envFlags?: string[];
  sampleCards?: string[];
  enrichedSummaryCases?: string[];
  deterministicFallbackCases?: string[];
  filterChecks?: string[];
  emptyStateChecks?: string[];
  blockerNotes?: string[];
  mobileQualityNotes?: string[];
  bilingualQualityNotes?: string[];
  freshnessNotes?: string[];
  sourceCoverageNotes?: string[];
  operatorNotes?: string[];
  screenshotNotes?: string[];
}

type JsonRecord = Record<string, unknown>;

const DOCS_EVIDENCE_SEGMENTS = ['docs', 'evidence'] as const;
const DOCS_EXAMPLES_SEGMENTS = ['docs', 'examples'] as const;
const SAFE_EVIDENCE_SUFFIXES = TODAY_REAL_FEED_EVIDENCE_IGNORE_PATTERNS.map((pattern) =>
  pattern.replace('docs/evidence/*', ''),
);
const SAFE_REPORT_SUFFIXES = TODAY_REAL_FEED_REPORT_IGNORE_PATTERNS.map((pattern) =>
  pattern.replace('docs/evidence/*', ''),
);
const TODAY_PILOT_EVIDENCE_LEGACY_ALIAS_KEYS = [
  'environment_label',
  'pilot_environment',
  'tested_at',
  'pilot_timestamp',
  'app_url_or_localhost',
  'env_flags_checked',
  'observed_feed_mode',
  'source_count',
  'real_card_count',
  'sample_card_ids_or_titles',
  'detail_checked_count',
  'sourceLinksVisible',
  'source_links_visible',
  'noFakeArticleBody',
  'no_fake_article_body',
  'rollbackChecked',
  'rollback_checked',
  'rls_read_policy_confirmed',
  'no_secrets_or_raw_internals_in_ui',
  'no_frontend_writes_introduced',
  'no_frontend_ai_calls_introduced',
  'completed_blank_enriched_content_fallback_worked',
  'ai_or_openai_filter_matched_when_applicable',
  'enriched_summary_cases',
  'deterministic_fallback_cases',
  'filter_checks',
  'empty_state_checks',
  'blockerNotes',
  'blocker_notes',
  'reviewer_notes',
  'mobile_quality_notes',
  'bilingual_quality_notes',
  'freshness_notes',
  'source_coverage_notes',
  'screenshots_or_notes',
  'final_operator_recommendation',
] as const;

function hasSegmentPair(
  pathValue: string,
  firstSegment: string,
  secondSegment: string,
): boolean {
  const segments = resolve(pathValue)
    .split(/[\\/]+/)
    .filter((segment) => segment.length > 0);

  for (let index = 0; index < segments.length - 1; index += 1) {
    if (segments[index] === firstSegment && segments[index + 1] === secondSegment) {
      return true;
    }
  }

  return false;
}

function hasDocsEvidenceSegment(pathValue: string): boolean {
  return hasSegmentPair(pathValue, DOCS_EVIDENCE_SEGMENTS[0], DOCS_EVIDENCE_SEGMENTS[1]);
}

function hasDocsExamplesSegment(pathValue: string): boolean {
  return hasSegmentPair(pathValue, DOCS_EXAMPLES_SEGMENTS[0], DOCS_EXAMPLES_SEGMENTS[1]);
}

function matchesSafeSuffix(pathValue: string, suffixes: readonly string[]): boolean {
  return suffixes.some((suffix) => pathValue.endsWith(suffix));
}

function readBooleanFlag(flagName: string, value: string | undefined): boolean | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  throw new Error(`Invalid boolean value for ${flagName}: ${value}`);
}

function readIntegerFlag(flagName: string, value: string | undefined): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`Invalid numeric value for ${flagName}: ${value}`);
  }

  return parsed;
}

function readQualityFlag(
  flagName: string,
  value: string | undefined,
): boolean | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === 'acceptable') {
    return true;
  }

  if (value === 'needs_work') {
    return false;
  }

  if (value === 'not_tested') {
    return null;
  }

  throw new Error(`Invalid quality value for ${flagName}: ${value}`);
}

function readObservedFeedModeFlag(
  flagName: string,
  value: string | undefined,
): TodayPilotObservedFeedModeValue | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (
    value === 'mock' ||
    value === 'real' ||
    value === 'fallback_to_mock' ||
    value === 'real_empty' ||
    value === 'unknown'
  ) {
    return value;
  }

  throw new Error(`Invalid observed feed mode for ${flagName}: ${value}`);
}

function readRecommendationFlag(
  flagName: string,
  value: string | undefined,
): TodayPilotRecommendationValue | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (
    value === 'keep_mock_default' ||
    value === 'continue_pilot' ||
    value === 'ready_for_controlled_default_rollout' ||
    value === 'blocked'
  ) {
    return value;
  }

  throw new Error(`Invalid recommendation value for ${flagName}: ${value}`);
}

function readStringNote(flagName: string, value: string): string {
  if (value.trim().length === 0) {
    throw new Error(`Invalid empty note for ${flagName}.`);
  }

  return value.trim();
}

function appendNoteArray(raw: JsonRecord, key: string, notes: string[]) {
  if (notes.length === 0) {
    return;
  }

  const existing = raw[key];
  const normalized = Array.isArray(existing)
    ? existing.filter((item): item is string => typeof item === 'string')
    : [];

  raw[key] = [...normalized, ...notes];
}

function setIfDefined(raw: JsonRecord, key: string, value: unknown) {
  if (value !== undefined) {
    raw[key] = value;
  }
}

export function assertTodayPilotEvidencePathSafe(
  evidencePath: string,
  allowAnyPath = false,
  kind: 'evidence' | 'report' = 'evidence',
) {
  if (allowAnyPath) {
    return;
  }

  if (!hasDocsEvidenceSegment(evidencePath)) {
    throw new Error(
      'Refusing to update a file outside docs/evidence without --allow-any-path.',
    );
  }

  const safeSuffixes = kind === 'report' ? SAFE_REPORT_SUFFIXES : SAFE_EVIDENCE_SUFFIXES;
  if (!matchesSafeSuffix(evidencePath, safeSuffixes)) {
    throw new Error(
      `Refusing to use a non-gitignored ${kind} path. Use a docs/evidence/*${safeSuffixes
        .join(' or docs/evidence/*')
        .trim()} path, or pass --allow-any-path intentionally.`,
    );
  }
}

export function assertTodayPilotEvidenceReadPathSafe(
  evidencePath: string,
  allowAnyPath = false,
) {
  if (allowAnyPath) {
    return;
  }

  const filename = basename(resolve(evidencePath));
  if (
    hasDocsExamplesSegment(evidencePath) &&
    filename.startsWith('today-real-feed-pilot-evidence') &&
    filename.endsWith('.json')
  ) {
    return;
  }

  if (!hasDocsEvidenceSegment(evidencePath)) {
    throw new Error(
      'Refusing to read an evidence file outside docs/evidence or docs/examples without --allow-any-path.',
    );
  }

  if (!matchesSafeSuffix(evidencePath, SAFE_EVIDENCE_SUFFIXES)) {
    throw new Error(
      `Refusing to read a non-gitignored evidence path. Use a docs/evidence/*${SAFE_EVIDENCE_SUFFIXES
        .join(' or docs/evidence/*')
        .trim()} path, a shipped docs/examples/today-real-feed-pilot-evidence*.json file, or pass --allow-any-path intentionally.`,
    );
  }
}

export function applyTodayPilotEvidenceUpdates(
  raw: JsonRecord,
  options: UpdateTodayPilotEvidenceOptions,
): JsonRecord {
  const updated = {
    ...raw,
    ...toTodayPilotEvidenceCanonicalRecord(parseTodayPilotEvidence(raw)),
  };

  for (const aliasKey of TODAY_PILOT_EVIDENCE_LEGACY_ALIAS_KEYS) {
    delete updated[aliasKey];
  }

  setIfDefined(
    updated,
    'pilotTimestamp',
    options.pilotTimestamp?.trim()
      ? readStringNote('--pilot-timestamp', options.pilotTimestamp)
      : undefined,
  );
  setIfDefined(
    updated,
    'environmentLabel',
    options.environmentLabel?.trim()
      ? readStringNote('--environment-label', options.environmentLabel)
      : undefined,
  );
  setIfDefined(
    updated,
    'pilotEnvironment',
    options.pilotEnvironment?.trim()
      ? readStringNote('--pilot-environment', options.pilotEnvironment)
      : undefined,
  );
  setIfDefined(
    updated,
    'tester',
    options.tester?.trim() ? readStringNote('--tester', options.tester) : undefined,
  );
  setIfDefined(
    updated,
    'sourceCount',
    readIntegerFlag('--source-count', options.sourceCount),
  );
  setIfDefined(
    updated,
    'appUrlOrLocalhost',
    options.appUrlOrLocalhost?.trim()
      ? readStringNote('--app-url', options.appUrlOrLocalhost)
      : undefined,
  );
  setIfDefined(
    updated,
    'observedFeedMode',
    readObservedFeedModeFlag('--observed-feed-mode', options.observedFeedMode),
  );
  setIfDefined(
    updated,
    'realCardsRendered',
    readBooleanFlag('--real-cards-rendered', options.realCardsRendered),
  );
  setIfDefined(
    updated,
    'realCardsObservedCount',
    readIntegerFlag('--real-card-count', options.realCardCount),
  );
  setIfDefined(
    updated,
    'detailCheckedCount',
    readIntegerFlag('--detail-checked-count', options.detailCheckedCount),
  );
  setIfDefined(
    updated,
    'detailOpenedSafely',
    readBooleanFlag('--detail-opened-safely', options.detailOpenedSafely),
  );

  const provenanceVisible = readBooleanFlag(
    '--provenance-visible',
    options.provenanceVisible,
  );
  const sourceLinksVisible = readBooleanFlag(
    '--source-links-visible',
    options.sourceLinksVisible,
  );
  setIfDefined(
    updated,
    'provenanceOrSourceLinksVisible',
    sourceLinksVisible ?? provenanceVisible,
  );

  setIfDefined(
    updated,
    'fakeFullArticleBodyAbsent',
    readBooleanFlag('--no-fake-article-body', options.noFakeArticleBody),
  );
  setIfDefined(
    updated,
    'completedNonEmptyEnrichedContentObserved',
    readBooleanFlag(
      '--completed-enriched-text-observed',
      options.completedEnrichedTextObserved,
    ),
  );
  setIfDefined(
    updated,
    'completedNonEmptyEnrichedContentWon',
    readBooleanFlag(
      '--completed-enriched-text-wins',
      options.completedEnrichedTextWins,
    ),
  );
  setIfDefined(
    updated,
    'completedBlankEnrichedContentFallbackWorked',
    readBooleanFlag(
      '--blank-enrichment-fallback',
      options.blankEnrichmentFallback,
    ),
  );
  setIfDefined(
    updated,
    'incompleteEnrichmentDeterministicFallbackWorked',
    readBooleanFlag(
      '--incomplete-enrichment-fallback',
      options.incompleteEnrichmentFallback,
    ),
  );
  setIfDefined(
    updated,
    'aiOrOpenAiFilterMatchedWhenApplicable',
    readBooleanFlag('--ai-openai-filter-works', options.aiOpenAiFilterWorks),
  );
  setIfDefined(
    updated,
    'nonMatchingFiltersShowedNormalFilterEmptyState',
    readBooleanFlag(
      '--nonmatching-filter-empty',
      options.nonmatchingFilterEmpty,
    ),
  );
  setIfDefined(
    updated,
    'realEmptyDistinctFromFilterEmpty',
    readBooleanFlag('--real-empty-distinct', options.realEmptyDistinct),
  );
  setIfDefined(
    updated,
    'brokenPreviewReadsFellBackSafelyToMock',
    readBooleanFlag('--broken-preview-fallback', options.brokenPreviewFallback),
  );
  setIfDefined(
    updated,
    'noSecretsOrRawInternalsInUi',
    readBooleanFlag('--no-secrets-in-ui', options.noSecretsInUi),
  );
  setIfDefined(
    updated,
    'rollbackToMockVerified',
    readBooleanFlag('--rollback-tested', options.rollbackTested),
  );
  setIfDefined(
    updated,
    'rlsReadPolicyConfirmed',
    readBooleanFlag(
      '--preview-read-policies-confirmed',
      options.previewReadPoliciesConfirmed,
    ),
  );
  setIfDefined(
    updated,
    'noFrontendWritesIntroduced',
    readBooleanFlag(
      '--no-frontend-writes-introduced',
      options.noFrontendWritesIntroduced,
    ),
  );
  setIfDefined(
    updated,
    'noFrontendAiCallsIntroduced',
    readBooleanFlag(
      '--no-frontend-ai-calls-introduced',
      options.noFrontendAiCallsIntroduced,
    ),
  );
  setIfDefined(
    updated,
    'radarWatchlistLibraryUnchanged',
    readBooleanFlag(
      '--radar-watchlist-library-unchanged',
      options.radarWatchlistLibraryUnchanged,
    ),
  );
  setIfDefined(
    updated,
    'mobileQualityAcceptable',
    readQualityFlag('--mobile-quality', options.mobileQuality),
  );
  setIfDefined(
    updated,
    'bilingualQualityAcceptable',
    readQualityFlag('--bilingual-quality', options.bilingualQuality),
  );
  setIfDefined(
    updated,
    'dataFreshnessAcceptable',
    readQualityFlag('--freshness', options.freshness),
  );
  setIfDefined(
    updated,
    'sourceCoverageAcceptable',
    readQualityFlag('--source-coverage', options.sourceCoverage),
  );
  setIfDefined(
    updated,
    'finalRecommendation',
    readRecommendationFlag('--final-recommendation', options.finalRecommendation),
  );

  appendNoteArray(
    updated,
    'envFlagsChecked',
    (options.envFlags ?? []).map((flag) => readStringNote('--env-flag', flag)),
  );
  appendNoteArray(
    updated,
    'sampleCardIdsOrTitles',
    (options.sampleCards ?? []).map((sample) => readStringNote('--sample-card', sample)),
  );
  appendNoteArray(
    updated,
    'enrichedSummaryCases',
    (options.enrichedSummaryCases ?? []).map((value) =>
      readStringNote('--enriched-case', value),
    ),
  );
  appendNoteArray(
    updated,
    'deterministicFallbackCases',
    (options.deterministicFallbackCases ?? []).map((value) =>
      readStringNote('--deterministic-fallback-case', value),
    ),
  );
  appendNoteArray(
    updated,
    'filterChecks',
    (options.filterChecks ?? []).map((value) => readStringNote('--filter-check', value)),
  );
  appendNoteArray(
    updated,
    'emptyStateChecks',
    (options.emptyStateChecks ?? []).map((value) =>
      readStringNote('--empty-state-check', value),
    ),
  );
  appendNoteArray(
    updated,
    'blockersFound',
    (options.blockerNotes ?? []).map((value) => readStringNote('--blocker', value)),
  );
  appendNoteArray(
    updated,
    'mobileQualityNotes',
    (options.mobileQualityNotes ?? []).map((value) =>
      readStringNote('--mobile-note', value),
    ),
  );
  appendNoteArray(
    updated,
    'bilingualQualityNotes',
    (options.bilingualQualityNotes ?? []).map((value) =>
      readStringNote('--bilingual-note', value),
    ),
  );
  appendNoteArray(
    updated,
    'freshnessNotes',
    (options.freshnessNotes ?? []).map((value) =>
      readStringNote('--freshness-note', value),
    ),
  );
  appendNoteArray(
    updated,
    'sourceCoverageNotes',
    (options.sourceCoverageNotes ?? []).map((value) =>
      readStringNote('--source-coverage-note', value),
    ),
  );

  appendNoteArray(
    updated,
    'reviewerNotes',
    (options.operatorNotes ?? []).map((note) =>
      readStringNote('--operator-note', note),
    ),
  );
  appendNoteArray(
    updated,
    'screenshotsOrNotes',
    (options.screenshotNotes ?? []).map((note) =>
      readStringNote('--screenshot-note', note),
    ),
  );

  updated.updated_at = new Date().toISOString();

  parseTodayPilotEvidence(updated);

  return updated;
}
