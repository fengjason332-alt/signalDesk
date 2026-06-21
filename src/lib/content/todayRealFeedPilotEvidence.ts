export type TodayPilotObservedFeedMode =
  | 'mock'
  | 'real'
  | 'fallback_to_mock'
  | 'real_empty'
  | 'unknown';

export type TodayPilotEvidenceRecommendation =
  | 'keep_mock_default'
  | 'continue_pilot'
  | 'ready_for_controlled_default_rollout'
  | 'blocked';

type NullableBoolean = boolean | null;

export interface TodayRealFeedPilotEvidence {
  pilotTimestamp: string;
  environmentLabel: string;
  pilotEnvironment: string | null;
  tester: string | null;
  appUrlOrLocalhost: string | null;
  envFlagsChecked: string[];
  observedFeedMode: TodayPilotObservedFeedMode;
  sourceCount: number | null;
  realCardsRendered: NullableBoolean;
  realCardsObservedCount: number | null;
  sampleCardIdsOrTitles: string[];
  detailCheckedCount: number | null;
  detailOpenedSafely: NullableBoolean;
  provenanceOrSourceLinksVisible: NullableBoolean;
  fakeFullArticleBodyAbsent: NullableBoolean;
  completedNonEmptyEnrichedContentObserved: NullableBoolean;
  completedNonEmptyEnrichedContentWon: NullableBoolean;
  completedBlankEnrichedContentFallbackWorked: NullableBoolean;
  incompleteEnrichmentDeterministicFallbackWorked: NullableBoolean;
  aiOrOpenAiFilterMatchedWhenApplicable: boolean | 'not_applicable' | null;
  nonMatchingFiltersShowedNormalFilterEmptyState: NullableBoolean;
  realEmptyDistinctFromFilterEmpty: NullableBoolean;
  brokenPreviewReadsFellBackSafelyToMock: NullableBoolean;
  noSecretsOrRawInternalsInUi: NullableBoolean;
  bilingualQualityAcceptable: NullableBoolean;
  mobileQualityAcceptable: NullableBoolean;
  dataFreshnessAcceptable: NullableBoolean;
  sourceCoverageAcceptable: NullableBoolean;
  rlsReadPolicyConfirmed: NullableBoolean;
  noFrontendWritesIntroduced: NullableBoolean;
  noFrontendAiCallsIntroduced: NullableBoolean;
  radarWatchlistLibraryUnchanged: NullableBoolean;
  rollbackToMockVerified: NullableBoolean;
  enrichedSummaryCases: string[];
  deterministicFallbackCases: string[];
  filterChecks: string[];
  emptyStateChecks: string[];
  blockersFound: string[];
  reviewerNotes: string[];
  mobileQualityNotes: string[];
  bilingualQualityNotes: string[];
  freshnessNotes: string[];
  sourceCoverageNotes: string[];
  screenshotsOrNotes: string[];
  finalRecommendation: TodayPilotEvidenceRecommendation | null;
}

export interface TodayPilotEvidenceEvaluation {
  recommendation: TodayPilotEvidenceRecommendation;
  missingRequiredChecks: string[];
  failedCriticalChecks: string[];
  warnings: string[];
  nextAction: string;
  completeness: TodayPilotEvidenceCompleteness;
  normalizedEvidence: TodayRealFeedPilotEvidence;
}

export interface TodayPilotEvidenceCompleteness {
  applicableRequiredChecks: string[];
  completedRequiredChecks: string[];
  optionalRecommendedChecks: string[];
  requiredChecksCompletedCount: number;
  requiredChecksMissingCount: number;
  requiredChecksTotalCount: number;
  criticalBlockersCount: number;
  warningsCount: number;
  progressPercent: number;
  guidanceOnly: true;
}

export interface CreateEmptyTodayPilotEvidenceOptions {
  pilotTimestamp?: string;
  environmentLabel: string;
  observedFeedMode?: TodayPilotObservedFeedMode;
}

const BOOLEAN_FIELDS = [
  'realCardsRendered',
  'detailOpenedSafely',
  'provenanceOrSourceLinksVisible',
  'fakeFullArticleBodyAbsent',
  'completedNonEmptyEnrichedContentObserved',
  'completedNonEmptyEnrichedContentWon',
  'completedBlankEnrichedContentFallbackWorked',
  'incompleteEnrichmentDeterministicFallbackWorked',
  'nonMatchingFiltersShowedNormalFilterEmptyState',
  'realEmptyDistinctFromFilterEmpty',
  'brokenPreviewReadsFellBackSafelyToMock',
  'noSecretsOrRawInternalsInUi',
  'bilingualQualityAcceptable',
  'mobileQualityAcceptable',
  'dataFreshnessAcceptable',
  'sourceCoverageAcceptable',
  'rlsReadPolicyConfirmed',
  'noFrontendWritesIntroduced',
  'noFrontendAiCallsIntroduced',
  'radarWatchlistLibraryUnchanged',
  'rollbackToMockVerified',
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function pickField(
  value: Record<string, unknown>,
  fieldNames: string[],
): unknown {
  for (const fieldName of fieldNames) {
    if (fieldName in value) {
      return value[fieldName];
    }
  }

  return undefined;
}

function readNullableBoolean(value: unknown, fieldName: string): NullableBoolean {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== 'boolean') {
    throw new Error(`Invalid Today pilot evidence boolean field: ${fieldName}`);
  }

  return value;
}

function readString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Invalid Today pilot evidence string field: ${fieldName}`);
  }

  return value;
}

function readNullableString(value: unknown, fieldName: string): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  return readString(value, fieldName);
}

function readStringArray(
  value: unknown,
  fieldName: string,
  options?: { allowMissing?: boolean },
): string[] {
  if ((value === null || value === undefined) && options?.allowMissing) {
    return [];
  }

  if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) {
    throw new Error(`Invalid Today pilot evidence string[] field: ${fieldName}`);
  }

  return [...value];
}

function readNullableNumber(value: unknown, fieldName: string): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== 'number' || Number.isNaN(value) || value < 0) {
    throw new Error(`Invalid Today pilot evidence number field: ${fieldName}`);
  }

  return value;
}

function readObservedFeedMode(value: unknown): TodayPilotObservedFeedMode {
  if (
    value === 'mock' ||
    value === 'real' ||
    value === 'fallback_to_mock' ||
    value === 'real_empty' ||
    value === 'unknown'
  ) {
    return value;
  }

  throw new Error('Invalid Today pilot evidence observedFeedMode field');
}

function readRecommendation(
  value: unknown,
): TodayPilotEvidenceRecommendation | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (
    value === 'keep_mock_default' ||
    value === 'continue_pilot' ||
    value === 'ready_for_controlled_default_rollout' ||
    value === 'blocked'
  ) {
    return value;
  }

  throw new Error('Invalid Today pilot evidence finalRecommendation field');
}

export function createEmptyTodayPilotEvidence(
  options: CreateEmptyTodayPilotEvidenceOptions,
): TodayRealFeedPilotEvidence {
  return {
    pilotTimestamp: options.pilotTimestamp ?? new Date().toISOString(),
    environmentLabel: options.environmentLabel,
    pilotEnvironment: options.environmentLabel,
    tester: null,
    appUrlOrLocalhost: null,
    envFlagsChecked: [],
    observedFeedMode: options.observedFeedMode ?? 'unknown',
    sourceCount: null,
    realCardsRendered: null,
    realCardsObservedCount: null,
    sampleCardIdsOrTitles: [],
    detailCheckedCount: null,
    detailOpenedSafely: null,
    provenanceOrSourceLinksVisible: null,
    fakeFullArticleBodyAbsent: null,
    completedNonEmptyEnrichedContentObserved: null,
    completedNonEmptyEnrichedContentWon: null,
    completedBlankEnrichedContentFallbackWorked: null,
    incompleteEnrichmentDeterministicFallbackWorked: null,
    aiOrOpenAiFilterMatchedWhenApplicable: null,
    nonMatchingFiltersShowedNormalFilterEmptyState: null,
    realEmptyDistinctFromFilterEmpty: null,
    brokenPreviewReadsFellBackSafelyToMock: null,
    noSecretsOrRawInternalsInUi: null,
    bilingualQualityAcceptable: null,
    mobileQualityAcceptable: null,
    dataFreshnessAcceptable: null,
    sourceCoverageAcceptable: null,
    rlsReadPolicyConfirmed: null,
    noFrontendWritesIntroduced: null,
    noFrontendAiCallsIntroduced: null,
    radarWatchlistLibraryUnchanged: null,
    rollbackToMockVerified: null,
    enrichedSummaryCases: [],
    deterministicFallbackCases: [],
    filterChecks: [],
    emptyStateChecks: [],
    blockersFound: [],
    reviewerNotes: [],
    mobileQualityNotes: [],
    bilingualQualityNotes: [],
    freshnessNotes: [],
    sourceCoverageNotes: [],
    screenshotsOrNotes: [],
    finalRecommendation: null,
  };
}

export function parseTodayPilotEvidence(
  value: unknown,
): TodayRealFeedPilotEvidence {
  if (!isRecord(value)) {
    throw new Error('Today pilot evidence must be a JSON object.');
  }

  const environmentLabel = readString(
    pickField(value, ['environmentLabel', 'environment_label', 'pilot_environment']),
    'environmentLabel',
  );

  const parsed = createEmptyTodayPilotEvidence({
    pilotTimestamp: readString(
      pickField(value, ['pilotTimestamp', 'tested_at', 'pilot_timestamp']),
      'pilotTimestamp',
    ),
    environmentLabel,
    observedFeedMode: readObservedFeedMode(
      pickField(value, ['observedFeedMode', 'observed_feed_mode']),
    ),
  });

  parsed.pilotEnvironment =
    readNullableString(
      pickField(value, ['pilotEnvironment', 'pilot_environment']),
      'pilotEnvironment',
    ) ?? environmentLabel;
  parsed.tester = readNullableString(pickField(value, ['tester']), 'tester');
  parsed.appUrlOrLocalhost = readNullableString(
    pickField(value, ['appUrlOrLocalhost', 'app_url_or_localhost']),
    'appUrlOrLocalhost',
  );
  parsed.envFlagsChecked = readStringArray(
    pickField(value, ['envFlagsChecked', 'env_flags_checked']),
    'envFlagsChecked',
    { allowMissing: true },
  );
  parsed.sourceCount = readNullableNumber(
    pickField(value, ['sourceCount', 'source_count']),
    'sourceCount',
  );
  parsed.realCardsObservedCount = readNullableNumber(
    pickField(value, ['realCardsObservedCount', 'real_card_count']),
    'realCardsObservedCount',
  );
  parsed.sampleCardIdsOrTitles = readStringArray(
    pickField(value, ['sampleCardIdsOrTitles', 'sample_card_ids_or_titles']),
    'sampleCardIdsOrTitles',
    { allowMissing: true },
  );
  parsed.detailCheckedCount = readNullableNumber(
    pickField(value, ['detailCheckedCount', 'detail_checked_count']),
    'detailCheckedCount',
  );

  for (const fieldName of BOOLEAN_FIELDS) {
    const aliases =
      fieldName === 'provenanceOrSourceLinksVisible'
        ? ['provenanceOrSourceLinksVisible', 'sourceLinksVisible', 'source_links_visible']
        : fieldName === 'fakeFullArticleBodyAbsent'
          ? ['fakeFullArticleBodyAbsent', 'noFakeArticleBody', 'no_fake_article_body']
          : fieldName === 'rollbackToMockVerified'
            ? ['rollbackToMockVerified', 'rollbackChecked', 'rollback_checked']
            : fieldName === 'rlsReadPolicyConfirmed'
              ? ['rlsReadPolicyConfirmed', 'rls_read_policy_confirmed']
              : fieldName === 'noSecretsOrRawInternalsInUi'
                ? ['noSecretsOrRawInternalsInUi', 'no_secrets_or_raw_internals_in_ui']
                : fieldName === 'noFrontendWritesIntroduced'
                  ? ['noFrontendWritesIntroduced', 'no_frontend_writes_introduced']
                  : fieldName === 'noFrontendAiCallsIntroduced'
                    ? ['noFrontendAiCallsIntroduced', 'no_frontend_ai_calls_introduced']
                    : fieldName === 'completedBlankEnrichedContentFallbackWorked'
                      ? [
                          'completedBlankEnrichedContentFallbackWorked',
                          'completed_blank_enriched_content_fallback_worked',
                        ]
                      : [fieldName];

    parsed[fieldName] = readNullableBoolean(pickField(value, aliases), fieldName);
  }

  const aiFilterValue = pickField(value, [
    'aiOrOpenAiFilterMatchedWhenApplicable',
    'ai_or_openai_filter_matched_when_applicable',
  ]);

  if (
    aiFilterValue !== null &&
    aiFilterValue !== undefined &&
    aiFilterValue !== 'not_applicable' &&
    typeof aiFilterValue !== 'boolean'
  ) {
    throw new Error(
      'Invalid Today pilot evidence aiOrOpenAiFilterMatchedWhenApplicable field',
    );
  }

  parsed.aiOrOpenAiFilterMatchedWhenApplicable =
    aiFilterValue === undefined
      ? null
      : (aiFilterValue as boolean | 'not_applicable' | null);

  parsed.enrichedSummaryCases = readStringArray(
    pickField(value, ['enrichedSummaryCases', 'enriched_summary_cases']),
    'enrichedSummaryCases',
    { allowMissing: true },
  );
  parsed.deterministicFallbackCases = readStringArray(
    pickField(value, ['deterministicFallbackCases', 'deterministic_fallback_cases']),
    'deterministicFallbackCases',
    { allowMissing: true },
  );
  parsed.filterChecks = readStringArray(
    pickField(value, ['filterChecks', 'filter_checks']),
    'filterChecks',
    { allowMissing: true },
  );
  parsed.emptyStateChecks = readStringArray(
    pickField(value, ['emptyStateChecks', 'empty_state_checks']),
    'emptyStateChecks',
    { allowMissing: true },
  );
  parsed.blockersFound = readStringArray(
    pickField(value, ['blockersFound', 'blockerNotes', 'blocker_notes']),
    'blockersFound',
    { allowMissing: true },
  );
  parsed.reviewerNotes = readStringArray(
    pickField(value, ['reviewerNotes', 'reviewer_notes']),
    'reviewerNotes',
    { allowMissing: true },
  );
  parsed.mobileQualityNotes = readStringArray(
    pickField(value, ['mobileQualityNotes', 'mobile_quality_notes']),
    'mobileQualityNotes',
    { allowMissing: true },
  );
  parsed.bilingualQualityNotes = readStringArray(
    pickField(value, ['bilingualQualityNotes', 'bilingual_quality_notes']),
    'bilingualQualityNotes',
    { allowMissing: true },
  );
  parsed.freshnessNotes = readStringArray(
    pickField(value, ['freshnessNotes', 'freshness_notes']),
    'freshnessNotes',
    { allowMissing: true },
  );
  parsed.sourceCoverageNotes = readStringArray(
    pickField(value, ['sourceCoverageNotes', 'source_coverage_notes']),
    'sourceCoverageNotes',
    { allowMissing: true },
  );
  parsed.screenshotsOrNotes = readStringArray(
    pickField(value, ['screenshotsOrNotes', 'screenshots_or_notes']),
    'screenshotsOrNotes',
    { allowMissing: true },
  );
  parsed.finalRecommendation = readRecommendation(
    pickField(value, ['finalRecommendation', 'final_operator_recommendation']),
  );

  return parsed;
}

export function toTodayPilotEvidenceCanonicalRecord(
  evidence: TodayRealFeedPilotEvidence,
): Record<string, unknown> {
  return {
    pilotTimestamp: evidence.pilotTimestamp,
    environmentLabel: evidence.environmentLabel,
    pilotEnvironment: evidence.pilotEnvironment ?? evidence.environmentLabel,
    tester: evidence.tester,
    appUrlOrLocalhost: evidence.appUrlOrLocalhost,
    envFlagsChecked: [...evidence.envFlagsChecked],
    observedFeedMode: evidence.observedFeedMode,
    sourceCount: evidence.sourceCount,
    realCardsRendered: evidence.realCardsRendered,
    realCardsObservedCount: evidence.realCardsObservedCount,
    sampleCardIdsOrTitles: [...evidence.sampleCardIdsOrTitles],
    detailCheckedCount: evidence.detailCheckedCount,
    detailOpenedSafely: evidence.detailOpenedSafely,
    provenanceOrSourceLinksVisible: evidence.provenanceOrSourceLinksVisible,
    fakeFullArticleBodyAbsent: evidence.fakeFullArticleBodyAbsent,
    completedNonEmptyEnrichedContentObserved:
      evidence.completedNonEmptyEnrichedContentObserved,
    completedNonEmptyEnrichedContentWon: evidence.completedNonEmptyEnrichedContentWon,
    completedBlankEnrichedContentFallbackWorked:
      evidence.completedBlankEnrichedContentFallbackWorked,
    incompleteEnrichmentDeterministicFallbackWorked:
      evidence.incompleteEnrichmentDeterministicFallbackWorked,
    aiOrOpenAiFilterMatchedWhenApplicable:
      evidence.aiOrOpenAiFilterMatchedWhenApplicable,
    nonMatchingFiltersShowedNormalFilterEmptyState:
      evidence.nonMatchingFiltersShowedNormalFilterEmptyState,
    realEmptyDistinctFromFilterEmpty: evidence.realEmptyDistinctFromFilterEmpty,
    brokenPreviewReadsFellBackSafelyToMock:
      evidence.brokenPreviewReadsFellBackSafelyToMock,
    noSecretsOrRawInternalsInUi: evidence.noSecretsOrRawInternalsInUi,
    bilingualQualityAcceptable: evidence.bilingualQualityAcceptable,
    mobileQualityAcceptable: evidence.mobileQualityAcceptable,
    dataFreshnessAcceptable: evidence.dataFreshnessAcceptable,
    sourceCoverageAcceptable: evidence.sourceCoverageAcceptable,
    rlsReadPolicyConfirmed: evidence.rlsReadPolicyConfirmed,
    noFrontendWritesIntroduced: evidence.noFrontendWritesIntroduced,
    noFrontendAiCallsIntroduced: evidence.noFrontendAiCallsIntroduced,
    radarWatchlistLibraryUnchanged: evidence.radarWatchlistLibraryUnchanged,
    rollbackToMockVerified: evidence.rollbackToMockVerified,
    enrichedSummaryCases: [...evidence.enrichedSummaryCases],
    deterministicFallbackCases: [...evidence.deterministicFallbackCases],
    filterChecks: [...evidence.filterChecks],
    emptyStateChecks: [...evidence.emptyStateChecks],
    blockersFound: [...evidence.blockersFound],
    reviewerNotes: [...evidence.reviewerNotes],
    mobileQualityNotes: [...evidence.mobileQualityNotes],
    bilingualQualityNotes: [...evidence.bilingualQualityNotes],
    freshnessNotes: [...evidence.freshnessNotes],
    sourceCoverageNotes: [...evidence.sourceCoverageNotes],
    screenshotsOrNotes: [...evidence.screenshotsOrNotes],
    finalRecommendation: evidence.finalRecommendation,
  };
}

function isTrue(value: NullableBoolean): value is true {
  return value === true;
}

const BASELINE_REQUIRED_CHECKS = [
  'brokenPreviewReadsFellBackSafelyToMock',
  'radarWatchlistLibraryUnchanged',
  'noSecretsOrRawInternalsInUi',
  'noFrontendWritesIntroduced',
  'noFrontendAiCallsIntroduced',
  'rlsReadPolicyConfirmed',
  'rollbackToMockVerified',
  'mobileQualityAcceptable',
  'bilingualQualityAcceptable',
  'dataFreshnessAcceptable',
  'sourceCoverageAcceptable',
] as const;

const REAL_CARD_REQUIRED_CHECKS = [
  'realCardsRendered',
  'realCardsObservedCount',
  'detailCheckedCount',
  'detailOpenedSafely',
  'provenanceOrSourceLinksVisible',
  'fakeFullArticleBodyAbsent',
  'completedNonEmptyEnrichedContentObserved',
  'completedNonEmptyEnrichedContentWon',
  'completedBlankEnrichedContentFallbackWorked',
  'incompleteEnrichmentDeterministicFallbackWorked',
  'aiOrOpenAiFilterMatchedWhenApplicable',
  'nonMatchingFiltersShowedNormalFilterEmptyState',
  'realEmptyDistinctFromFilterEmpty',
] as const;

type TodayPilotRequiredCheckName =
  | (typeof BASELINE_REQUIRED_CHECKS)[number]
  | (typeof REAL_CARD_REQUIRED_CHECKS)[number]
  | 'realEmptyDistinctFromFilterEmpty';

function hasPositiveCount(value: number | null): boolean {
  return value !== null && value > 0;
}

function hasRealCardEvidenceSignal(evidence: TodayRealFeedPilotEvidence): boolean {
  return (
    evidence.observedFeedMode === 'real' ||
    evidence.realCardsRendered === true ||
    hasPositiveCount(evidence.realCardsObservedCount) ||
    hasPositiveCount(evidence.detailCheckedCount) ||
    evidence.detailOpenedSafely !== null ||
    evidence.provenanceOrSourceLinksVisible !== null ||
    evidence.fakeFullArticleBodyAbsent !== null ||
    evidence.completedNonEmptyEnrichedContentObserved !== null ||
    evidence.completedNonEmptyEnrichedContentWon !== null ||
    evidence.completedBlankEnrichedContentFallbackWorked !== null ||
    evidence.incompleteEnrichmentDeterministicFallbackWorked !== null ||
    (evidence.aiOrOpenAiFilterMatchedWhenApplicable !== null &&
      evidence.aiOrOpenAiFilterMatchedWhenApplicable !== 'not_applicable') ||
    evidence.nonMatchingFiltersShowedNormalFilterEmptyState !== null
  );
}

function listApplicableRequiredChecks(
  evidence: TodayRealFeedPilotEvidence,
): TodayPilotRequiredCheckName[] {
  const checks = [...BASELINE_REQUIRED_CHECKS] as TodayPilotRequiredCheckName[];

  if (hasRealCardEvidenceSignal(evidence)) {
    checks.push(...REAL_CARD_REQUIRED_CHECKS);
  } else if (evidence.observedFeedMode === 'real_empty') {
    checks.push('realEmptyDistinctFromFilterEmpty');
  }

  return [...new Set(checks)];
}

function isRequiredCheckSatisfied(
  evidence: TodayRealFeedPilotEvidence,
  checkName: TodayPilotRequiredCheckName,
): boolean {
  switch (checkName) {
    case 'realCardsRendered':
      return evidence.realCardsRendered === true;
    case 'realCardsObservedCount':
      return hasPositiveCount(evidence.realCardsObservedCount);
    case 'detailCheckedCount':
      return hasPositiveCount(evidence.detailCheckedCount);
    case 'aiOrOpenAiFilterMatchedWhenApplicable':
      return (
        evidence.aiOrOpenAiFilterMatchedWhenApplicable === true ||
        evidence.aiOrOpenAiFilterMatchedWhenApplicable === 'not_applicable'
      );
    default:
      return evidence[checkName] === true;
  }
}

function buildTodayPilotEvidenceCompleteness(
  evidence: TodayRealFeedPilotEvidence,
  missingRequiredChecks: string[],
  failedCriticalChecks: string[],
  warnings: string[],
): TodayPilotEvidenceCompleteness {
  const applicableRequiredChecks = listApplicableRequiredChecks(evidence);
  const failedRequiredChecks = new Set(
    failedCriticalChecks.filter((checkName) =>
      applicableRequiredChecks.includes(checkName as TodayPilotRequiredCheckName),
    ),
  );
  const missingRequiredCheckSet = new Set(
    missingRequiredChecks.filter((checkName) =>
      applicableRequiredChecks.includes(checkName as TodayPilotRequiredCheckName),
    ),
  );
  const completedRequiredChecks = applicableRequiredChecks.filter(
    (checkName) =>
      !failedRequiredChecks.has(checkName) &&
      !missingRequiredCheckSet.has(checkName) &&
      isRequiredCheckSatisfied(evidence, checkName),
  );
  const optionalRecommendedChecks: string[] = [];

  if (evidence.envFlagsChecked.length === 0) {
    optionalRecommendedChecks.push('envFlagsChecked');
  }

  if (evidence.screenshotsOrNotes.length === 0) {
    optionalRecommendedChecks.push('screenshotsOrNotes');
  }

  const requiredChecksTotalCount = applicableRequiredChecks.length;
  const requiredChecksCompletedCount = completedRequiredChecks.length;
  const progressPercent =
    requiredChecksTotalCount === 0
      ? 0
      : Math.round((requiredChecksCompletedCount / requiredChecksTotalCount) * 100);

  return {
    applicableRequiredChecks,
    completedRequiredChecks,
    optionalRecommendedChecks,
    requiredChecksCompletedCount,
    requiredChecksMissingCount: missingRequiredCheckSet.size,
    requiredChecksTotalCount,
    criticalBlockersCount: failedCriticalChecks.length,
    warningsCount: warnings.length,
    progressPercent,
    guidanceOnly: true,
  };
}

function addMissingCheck(
  missingRequiredChecks: string[],
  evidence: TodayRealFeedPilotEvidence,
  fieldName: keyof TodayRealFeedPilotEvidence,
) {
  const value = evidence[fieldName];
  if (value !== true && value !== 'not_applicable') {
    missingRequiredChecks.push(String(fieldName));
  }
}

function addCriticalCheckIfFalse(
  failedCriticalChecks: string[],
  missingRequiredChecks: string[],
  evidence: TodayRealFeedPilotEvidence,
  fieldName: keyof TodayRealFeedPilotEvidence,
  options?: { treatNullAsMissing?: boolean },
) {
  const value = evidence[fieldName];

  if (value === false) {
    failedCriticalChecks.push(String(fieldName));
  } else if (value === null && options?.treatNullAsMissing !== false) {
    missingRequiredChecks.push(String(fieldName));
  }
}

export function evaluateTodayPilotEvidence(
  input: TodayRealFeedPilotEvidence,
): TodayPilotEvidenceEvaluation {
  const evidence = parseTodayPilotEvidence(input);
  const failedCriticalChecks: string[] = [];
  const missingRequiredChecks: string[] = [];
  const warnings: string[] = [];
  const hasPositiveRealCardCount = hasPositiveCount(evidence.realCardsObservedCount);
  const hasObservedRealCards =
    evidence.observedFeedMode === 'real' &&
    isTrue(evidence.realCardsRendered) &&
    hasPositiveRealCardCount;
  const isRealEmptyEvidence = evidence.observedFeedMode === 'real_empty';
  const isMockEvidence = evidence.observedFeedMode === 'mock';
  const hasSafeBaseline =
    isTrue(evidence.brokenPreviewReadsFellBackSafelyToMock) &&
    isTrue(evidence.radarWatchlistLibraryUnchanged) &&
    isTrue(evidence.noSecretsOrRawInternalsInUi) &&
    isTrue(evidence.noFrontendWritesIntroduced) &&
    isTrue(evidence.noFrontendAiCallsIntroduced) &&
    isTrue(evidence.rollbackToMockVerified);
  const hasContradictoryRealFeedObservation =
    (evidence.observedFeedMode === 'real' &&
      ((evidence.realCardsRendered === false && hasPositiveRealCardCount) ||
        (isTrue(evidence.realCardsRendered) && !hasPositiveRealCardCount))) ||
    (evidence.observedFeedMode === 'real_empty' &&
      (isTrue(evidence.realCardsRendered) || hasPositiveRealCardCount));

  for (const fieldName of [
    'brokenPreviewReadsFellBackSafelyToMock',
    'radarWatchlistLibraryUnchanged',
    'noSecretsOrRawInternalsInUi',
    'noFrontendWritesIntroduced',
    'noFrontendAiCallsIntroduced',
  ] as const) {
    addCriticalCheckIfFalse(
      failedCriticalChecks,
      missingRequiredChecks,
      evidence,
      fieldName,
    );
  }

  if (evidence.rlsReadPolicyConfirmed === false) {
    failedCriticalChecks.push('rlsReadPolicyConfirmed');
  } else if (evidence.rlsReadPolicyConfirmed === null) {
    missingRequiredChecks.push('rlsReadPolicyConfirmed');
  }

  if (evidence.blockersFound.length > 0) {
    failedCriticalChecks.push('blockersFound');
  }

  if (hasContradictoryRealFeedObservation) {
    failedCriticalChecks.push('realFeedObservationConsistency');
  }

  if (hasObservedRealCards) {
    for (const fieldName of [
      'detailOpenedSafely',
      'provenanceOrSourceLinksVisible',
      'fakeFullArticleBodyAbsent',
      'completedBlankEnrichedContentFallbackWorked',
      'incompleteEnrichmentDeterministicFallbackWorked',
    ] as const) {
      addCriticalCheckIfFalse(
        failedCriticalChecks,
        missingRequiredChecks,
        evidence,
        fieldName,
      );
    }

    for (const fieldName of [
      'completedNonEmptyEnrichedContentObserved',
      'completedNonEmptyEnrichedContentWon',
      'nonMatchingFiltersShowedNormalFilterEmptyState',
      'realEmptyDistinctFromFilterEmpty',
      'rollbackToMockVerified',
      'mobileQualityAcceptable',
      'bilingualQualityAcceptable',
      'dataFreshnessAcceptable',
      'sourceCoverageAcceptable',
    ] as const) {
      addMissingCheck(missingRequiredChecks, evidence, fieldName);
    }

    if (
      evidence.aiOrOpenAiFilterMatchedWhenApplicable !== true &&
      evidence.aiOrOpenAiFilterMatchedWhenApplicable !== 'not_applicable'
    ) {
      missingRequiredChecks.push('aiOrOpenAiFilterMatchedWhenApplicable');
    }

    if (
      evidence.realCardsObservedCount === null ||
      evidence.realCardsObservedCount <= 0
    ) {
      missingRequiredChecks.push('realCardsObservedCount');
    }

    if (
      evidence.detailCheckedCount === null ||
      evidence.detailCheckedCount <= 0
    ) {
      missingRequiredChecks.push('detailCheckedCount');
    }
  } else {
    addMissingCheck(missingRequiredChecks, evidence, 'rollbackToMockVerified');
    for (const fieldName of [
      'mobileQualityAcceptable',
      'bilingualQualityAcceptable',
      'dataFreshnessAcceptable',
      'sourceCoverageAcceptable',
    ] as const) {
      addMissingCheck(missingRequiredChecks, evidence, fieldName);
    }

    if (isRealEmptyEvidence) {
      if (evidence.realEmptyDistinctFromFilterEmpty === false) {
        failedCriticalChecks.push('realEmptyDistinctFromFilterEmpty');
      } else if (evidence.realEmptyDistinctFromFilterEmpty === null) {
        missingRequiredChecks.push('realEmptyDistinctFromFilterEmpty');
      }
    }
  }

  if (evidence.completedNonEmptyEnrichedContentObserved === false) {
    warnings.push(
      'Completed enriched summary content was not observed yet, so the rollout evidence is still incomplete.',
    );
  }

  if (evidence.completedNonEmptyEnrichedContentWon === false) {
    warnings.push(
      'Completed enriched summary content did not clearly win over deterministic preview text.',
    );
  }

  if (evidence.sourceCoverageAcceptable === false) {
    warnings.push(
      'Source coverage is not acceptable yet, so Today should stay mock-by-default.',
    );
  }

  if (evidence.dataFreshnessAcceptable === false) {
    warnings.push(
      'Data freshness is not acceptable yet, so Today should stay mock-by-default.',
    );
  }

  if (evidence.mobileQualityAcceptable === false) {
    warnings.push(
      'Mobile quality is not acceptable yet, so Today should stay mock-by-default.',
    );
  }

  if (evidence.bilingualQualityAcceptable === false) {
    warnings.push(
      'Bilingual quality is not acceptable yet, so Today should stay mock-by-default.',
    );
  }

  if (evidence.envFlagsChecked.length === 0) {
    warnings.push(
      'The evidence file does not record which local env flags were checked during the pilot.',
    );
  }

  if (evidence.screenshotsOrNotes.length === 0) {
    warnings.push(
      'No screenshots or operator notes were recorded yet for this pilot review.',
    );
  }

  if (
    (evidence.observedFeedMode === 'mock' ||
      evidence.observedFeedMode === 'unknown') &&
    !hasObservedRealCards &&
    !isRealEmptyEvidence
  ) {
    warnings.push(
      'No real-feed observation has been recorded yet, so the pilot still needs a first real or real_empty browser pass.',
    );
  }

  let recommendation: TodayPilotEvidenceRecommendation = 'continue_pilot';
  let nextAction =
    'Collect the missing pilot evidence and rerun the local evidence review before considering any default-switch decision.';

  if (failedCriticalChecks.length > 0) {
    recommendation = 'blocked';
    nextAction =
      'Keep Today mock-by-default, resolve the critical blockers, and rerun the bounded pilot before any rollout decision.';
  } else if (
    (isMockEvidence || isRealEmptyEvidence) &&
    hasSafeBaseline &&
    evidence.rlsReadPolicyConfirmed === true &&
    missingRequiredChecks.length === 0 &&
    missingRequiredChecks.every(
      (checkName) =>
        checkName === 'mobileQualityAcceptable' ||
        checkName === 'bilingualQualityAcceptable' ||
        checkName === 'dataFreshnessAcceptable' ||
        checkName === 'sourceCoverageAcceptable',
    )
  ) {
    recommendation = 'keep_mock_default';
    nextAction =
      'Keep Today mock-by-default and gather stronger real-feed evidence before preparing any default-rollout task.';
  } else if (missingRequiredChecks.length === 0) {
    if (
      evidence.sourceCoverageAcceptable === false ||
      evidence.dataFreshnessAcceptable === false ||
      evidence.mobileQualityAcceptable === false ||
      evidence.bilingualQualityAcceptable === false
    ) {
      recommendation = 'keep_mock_default';
      nextAction =
        'Keep Today mock-by-default and fix the rollout-quality gaps before preparing any default-rollout task.';
    } else if (hasObservedRealCards) {
      recommendation = 'ready_for_controlled_default_rollout';
      nextAction =
        'Keep Today mock-by-default for now, but the pilot evidence is strong enough to review a future controlled default-rollout task.';
    } else {
      recommendation = 'keep_mock_default';
      nextAction =
        'Keep Today mock-by-default and gather stronger real-feed evidence before preparing any default-rollout task.';
    }
  }

  const normalizedMissingRequiredChecks = [...new Set(missingRequiredChecks)];
  const normalizedFailedCriticalChecks = [...new Set(failedCriticalChecks)];
  const completeness = buildTodayPilotEvidenceCompleteness(
    evidence,
    normalizedMissingRequiredChecks,
    normalizedFailedCriticalChecks,
    warnings,
  );

  return {
    recommendation,
    missingRequiredChecks: normalizedMissingRequiredChecks,
    failedCriticalChecks: normalizedFailedCriticalChecks,
    warnings,
    nextAction,
    completeness,
    normalizedEvidence: {
      ...evidence,
      finalRecommendation: recommendation,
    },
  };
}
