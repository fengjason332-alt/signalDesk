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

export interface TodayRealFeedPilotEvidence {
  pilotTimestamp: string;
  environmentLabel: string;
  observedFeedMode: TodayPilotObservedFeedMode;
  realCardsRendered: boolean | null;
  realCardsObservedCount: number | null;
  detailOpenedSafely: boolean | null;
  provenanceOrSourceLinksVisible: boolean | null;
  fakeFullArticleBodyAbsent: boolean | null;
  completedNonEmptyEnrichedContentObserved: boolean | null;
  completedNonEmptyEnrichedContentWon: boolean | null;
  incompleteEnrichmentDeterministicFallbackWorked: boolean | null;
  aiOrOpenAiFilterMatchedWhenApplicable: boolean | 'not_applicable' | null;
  nonMatchingFiltersShowedNormalFilterEmptyState: boolean | null;
  realEmptyDistinctFromFilterEmpty: boolean | null;
  brokenPreviewReadsFellBackSafelyToMock: boolean | null;
  radarWatchlistLibraryUnchanged: boolean | null;
  rollbackToMockVerified: boolean | null;
  blockersFound: string[];
  reviewerNotes: string[];
  finalRecommendation: TodayPilotEvidenceRecommendation | null;
}

export interface TodayPilotEvidenceEvaluation {
  recommendation: TodayPilotEvidenceRecommendation;
  missingRequiredChecks: string[];
  failedCriticalChecks: string[];
  warnings: string[];
  nextAction: string;
  normalizedEvidence: TodayRealFeedPilotEvidence;
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
  'incompleteEnrichmentDeterministicFallbackWorked',
  'nonMatchingFiltersShowedNormalFilterEmptyState',
  'realEmptyDistinctFromFilterEmpty',
  'brokenPreviewReadsFellBackSafelyToMock',
  'radarWatchlistLibraryUnchanged',
  'rollbackToMockVerified',
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readNullableBoolean(value: unknown, fieldName: string): boolean | null {
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

function readStringArray(value: unknown, fieldName: string): string[] {
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
    observedFeedMode: options.observedFeedMode ?? 'unknown',
    realCardsRendered: null,
    realCardsObservedCount: null,
    detailOpenedSafely: null,
    provenanceOrSourceLinksVisible: null,
    fakeFullArticleBodyAbsent: null,
    completedNonEmptyEnrichedContentObserved: null,
    completedNonEmptyEnrichedContentWon: null,
    incompleteEnrichmentDeterministicFallbackWorked: null,
    aiOrOpenAiFilterMatchedWhenApplicable: null,
    nonMatchingFiltersShowedNormalFilterEmptyState: null,
    realEmptyDistinctFromFilterEmpty: null,
    brokenPreviewReadsFellBackSafelyToMock: null,
    radarWatchlistLibraryUnchanged: null,
    rollbackToMockVerified: null,
    blockersFound: [],
    reviewerNotes: [],
    finalRecommendation: null,
  };
}

export function parseTodayPilotEvidence(
  value: unknown,
): TodayRealFeedPilotEvidence {
  if (!isRecord(value)) {
    throw new Error('Today pilot evidence must be a JSON object.');
  }

  const parsed = createEmptyTodayPilotEvidence({
    pilotTimestamp: readString(value.pilotTimestamp, 'pilotTimestamp'),
    environmentLabel: readString(value.environmentLabel, 'environmentLabel'),
    observedFeedMode: readObservedFeedMode(value.observedFeedMode),
  });

  parsed.realCardsObservedCount = readNullableNumber(
    value.realCardsObservedCount,
    'realCardsObservedCount',
  );

  for (const fieldName of BOOLEAN_FIELDS) {
    parsed[fieldName] = readNullableBoolean(value[fieldName], fieldName);
  }

  if (
    value.aiOrOpenAiFilterMatchedWhenApplicable !== null &&
    value.aiOrOpenAiFilterMatchedWhenApplicable !== undefined &&
    value.aiOrOpenAiFilterMatchedWhenApplicable !== 'not_applicable' &&
    typeof value.aiOrOpenAiFilterMatchedWhenApplicable !== 'boolean'
  ) {
    throw new Error(
      'Invalid Today pilot evidence aiOrOpenAiFilterMatchedWhenApplicable field',
    );
  }

  parsed.aiOrOpenAiFilterMatchedWhenApplicable =
    value.aiOrOpenAiFilterMatchedWhenApplicable === undefined
      ? null
      : (value.aiOrOpenAiFilterMatchedWhenApplicable as
          | boolean
          | 'not_applicable'
          | null);

  parsed.blockersFound = readStringArray(value.blockersFound, 'blockersFound');
  parsed.reviewerNotes = readStringArray(value.reviewerNotes, 'reviewerNotes');
  parsed.finalRecommendation = readRecommendation(value.finalRecommendation);

  return parsed;
}

function isTrue(value: boolean | null): value is true {
  return value === true;
}

export function evaluateTodayPilotEvidence(
  input: TodayRealFeedPilotEvidence,
): TodayPilotEvidenceEvaluation {
  const evidence = parseTodayPilotEvidence(input);
  const failedCriticalChecks: string[] = [];
  const missingRequiredChecks: string[] = [];
  const warnings: string[] = [];
  const hasObservedRealCards =
    evidence.observedFeedMode === 'real' &&
    isTrue(evidence.realCardsRendered) &&
    evidence.realCardsObservedCount !== null &&
    evidence.realCardsObservedCount > 0;
  const isRealEmptyEvidence = evidence.observedFeedMode === 'real_empty';
  const isMockEvidence = evidence.observedFeedMode === 'mock';

  const alwaysCriticalFields: Array<keyof TodayRealFeedPilotEvidence> = [
    'brokenPreviewReadsFellBackSafelyToMock',
    'radarWatchlistLibraryUnchanged',
  ];

  for (const fieldName of alwaysCriticalFields) {
    const value = evidence[fieldName];
    if (value === false) {
      failedCriticalChecks.push(fieldName);
    } else if (value === null) {
      missingRequiredChecks.push(fieldName);
    }
  }

  const realCardCriticalFields: Array<keyof TodayRealFeedPilotEvidence> = [
    'detailOpenedSafely',
    'provenanceOrSourceLinksVisible',
    'fakeFullArticleBodyAbsent',
  ];

  for (const fieldName of realCardCriticalFields) {
    const value = evidence[fieldName];
    if (value === false) {
      failedCriticalChecks.push(fieldName);
    } else if (value === null && hasObservedRealCards) {
      missingRequiredChecks.push(fieldName);
    }
  }

  if (evidence.blockersFound.length > 0) {
    failedCriticalChecks.push('blockersFound');
  }

  const requiredTruthyChecks: Array<keyof TodayRealFeedPilotEvidence> = [
    'rollbackToMockVerified',
  ];

  if (hasObservedRealCards) {
    requiredTruthyChecks.push(
      'realCardsRendered',
      'completedNonEmptyEnrichedContentObserved',
      'completedNonEmptyEnrichedContentWon',
      'incompleteEnrichmentDeterministicFallbackWorked',
      'nonMatchingFiltersShowedNormalFilterEmptyState',
      'realEmptyDistinctFromFilterEmpty',
    );
  } else if (isRealEmptyEvidence) {
    requiredTruthyChecks.push('realEmptyDistinctFromFilterEmpty');
  }

  for (const fieldName of requiredTruthyChecks) {
    const value = evidence[fieldName];
    if (!isTrue(value as boolean | null)) {
      missingRequiredChecks.push(fieldName);
    }
  }

  if (
    hasObservedRealCards &&
    evidence.aiOrOpenAiFilterMatchedWhenApplicable !== true &&
    evidence.aiOrOpenAiFilterMatchedWhenApplicable !== 'not_applicable'
  ) {
    missingRequiredChecks.push('aiOrOpenAiFilterMatchedWhenApplicable');
  }

  if (
    hasObservedRealCards &&
    evidence.realCardsObservedCount === null ||
    hasObservedRealCards &&
    evidence.realCardsObservedCount <= 0
  ) {
    missingRequiredChecks.push('realCardsObservedCount');
  }

  if (
    evidence.completedNonEmptyEnrichedContentObserved === false ||
    evidence.completedNonEmptyEnrichedContentWon === false
  ) {
    warnings.push(
      'Completed enriched content was not confirmed as both non-empty and preferred over deterministic preview.',
    );
  }

  let recommendation: TodayPilotEvidenceRecommendation = 'continue_pilot';
  let nextAction =
    'Collect the missing pilot evidence and rerun the local evidence review before considering any default-switch decision.';

  if (failedCriticalChecks.length > 0) {
    recommendation = 'blocked';
    nextAction =
      'Keep Today mock-by-default, resolve the critical blockers, and rerun the bounded pilot before any rollout decision.';
  } else if (missingRequiredChecks.length === 0) {
    if (isMockEvidence || isRealEmptyEvidence) {
      recommendation = 'keep_mock_default';
      nextAction =
        'Keep Today mock-by-default and gather stronger real-feed evidence before preparing any default-rollout task.';
    } else {
      recommendation = 'ready_for_controlled_default_rollout';
      nextAction =
        'Keep Today mock-by-default for now, but the pilot evidence is strong enough to review a future controlled default-rollout task.';
    }
  }

  return {
    recommendation,
    missingRequiredChecks: [...new Set(missingRequiredChecks)],
    failedCriticalChecks: [...new Set(failedCriticalChecks)],
    warnings,
    nextAction,
    normalizedEvidence: {
      ...evidence,
      finalRecommendation: recommendation,
    },
  };
}
