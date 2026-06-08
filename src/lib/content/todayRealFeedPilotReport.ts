import {
  evaluateTodayPilotEvidence,
  type TodayPilotEvidenceEvaluation,
} from './todayRealFeedPilotEvidence';

export const DEFAULT_TODAY_REAL_FEED_REPORT_OUTPUT_PATH =
  'docs/evidence/today-real-feed-pilot-report.local.md';

export const TODAY_REAL_FEED_REPORT_IGNORE_PATTERNS = [
  'docs/evidence/*.local.md',
  'docs/evidence/*.private.md',
] as const;

const CHECK_LABELS: Record<string, string> = {
  realCardsRendered: 'Real cards rendered',
  detailOpenedSafely: 'Detail opened safely',
  provenanceOrSourceLinksVisible: 'Provenance or source links were visible',
  fakeFullArticleBodyAbsent: 'No fake full article body was shown',
  completedNonEmptyEnrichedContentObserved:
    'Completed non-empty enriched content was observed',
  completedNonEmptyEnrichedContentWon:
    'Completed non-empty enriched content won over deterministic preview text',
  completedBlankEnrichedContentFallbackWorked:
    'Completed-but-blank enrichment fell back safely',
  incompleteEnrichmentDeterministicFallbackWorked:
    'Incomplete enrichment fell back safely',
  aiOrOpenAiFilterMatchedWhenApplicable:
    'AI/OpenAI filter matched when applicable',
  nonMatchingFiltersShowedNormalFilterEmptyState:
    'Nonmatching filters showed the normal filter-empty state',
  realEmptyDistinctFromFilterEmpty: 'real_empty stayed distinct from filter_empty',
  brokenPreviewReadsFellBackSafelyToMock:
    'Broken preview reads fell back safely to mock',
  noSecretsOrRawInternalsInUi: 'No secrets or raw internals appeared in UI',
  bilingualQualityAcceptable: 'Bilingual quality was acceptable',
  mobileQualityAcceptable: 'Mobile quality was acceptable',
  dataFreshnessAcceptable: 'Freshness was acceptable',
  sourceCoverageAcceptable: 'Source coverage was acceptable',
  rlsReadPolicyConfirmed: 'Preview read policies were confirmed',
  noFrontendWritesIntroduced: 'No frontend content writes were introduced',
  noFrontendAiCallsIntroduced: 'No frontend AI calls were introduced',
  radarWatchlistLibraryUnchanged:
    'Radar, Watchlist, and Library remained unchanged',
  rollbackToMockVerified: 'Rollback to mock was tested',
  blockersFound: 'Blockers were recorded',
  realFeedObservationConsistency: 'Real-feed observations were consistent',
  realCardsObservedCount: 'A positive real-card count was captured',
  detailCheckedCount: 'At least one real Detail view was checked',
};

function formatList(title: string, values: string[]): string[] {
  if (values.length === 0) {
    return [`## ${title}`, '', '- (none)', ''];
  }

  return [`## ${title}`, '', ...values.map((value) => `- ${value}`), ''];
}

function labelForCheck(checkName: string): string {
  return CHECK_LABELS[checkName] ?? checkName;
}

function buildPassedChecks(review: TodayPilotEvidenceEvaluation): string[] {
  const evidence = review.normalizedEvidence;
  const passedChecks: string[] = [];

  const truthyChecks: Array<[string, unknown]> = [
    ['realCardsRendered', evidence.realCardsRendered],
    ['detailOpenedSafely', evidence.detailOpenedSafely],
    ['provenanceOrSourceLinksVisible', evidence.provenanceOrSourceLinksVisible],
    ['fakeFullArticleBodyAbsent', evidence.fakeFullArticleBodyAbsent],
    [
      'completedNonEmptyEnrichedContentObserved',
      evidence.completedNonEmptyEnrichedContentObserved,
    ],
    ['completedNonEmptyEnrichedContentWon', evidence.completedNonEmptyEnrichedContentWon],
    [
      'completedBlankEnrichedContentFallbackWorked',
      evidence.completedBlankEnrichedContentFallbackWorked,
    ],
    [
      'incompleteEnrichmentDeterministicFallbackWorked',
      evidence.incompleteEnrichmentDeterministicFallbackWorked,
    ],
    [
      'aiOrOpenAiFilterMatchedWhenApplicable',
      evidence.aiOrOpenAiFilterMatchedWhenApplicable,
    ],
    [
      'nonMatchingFiltersShowedNormalFilterEmptyState',
      evidence.nonMatchingFiltersShowedNormalFilterEmptyState,
    ],
    ['realEmptyDistinctFromFilterEmpty', evidence.realEmptyDistinctFromFilterEmpty],
    [
      'brokenPreviewReadsFellBackSafelyToMock',
      evidence.brokenPreviewReadsFellBackSafelyToMock,
    ],
    ['noSecretsOrRawInternalsInUi', evidence.noSecretsOrRawInternalsInUi],
    ['bilingualQualityAcceptable', evidence.bilingualQualityAcceptable],
    ['mobileQualityAcceptable', evidence.mobileQualityAcceptable],
    ['dataFreshnessAcceptable', evidence.dataFreshnessAcceptable],
    ['sourceCoverageAcceptable', evidence.sourceCoverageAcceptable],
    ['rlsReadPolicyConfirmed', evidence.rlsReadPolicyConfirmed],
    ['noFrontendWritesIntroduced', evidence.noFrontendWritesIntroduced],
    ['noFrontendAiCallsIntroduced', evidence.noFrontendAiCallsIntroduced],
    ['radarWatchlistLibraryUnchanged', evidence.radarWatchlistLibraryUnchanged],
    ['rollbackToMockVerified', evidence.rollbackToMockVerified],
  ];

  for (const [key, value] of truthyChecks) {
    if (value === true || value === 'not_applicable') {
      passedChecks.push(labelForCheck(key));
    }
  }

  if (
    evidence.realCardsObservedCount !== null &&
    evidence.realCardsObservedCount > 0
  ) {
    passedChecks.push(labelForCheck('realCardsObservedCount'));
  }

  if (evidence.detailCheckedCount !== null && evidence.detailCheckedCount > 0) {
    passedChecks.push(labelForCheck('detailCheckedCount'));
  }

  return [...new Set(passedChecks)];
}

function buildEvidenceSummary(review: TodayPilotEvidenceEvaluation): string[] {
  const evidence = review.normalizedEvidence;

  return [
    `- Environment label: ${evidence.environmentLabel}`,
    `- Pilot timestamp: ${evidence.pilotTimestamp}`,
    `- Observed feed mode: ${evidence.observedFeedMode}`,
    `- Real card count: ${evidence.realCardsObservedCount ?? '(not captured)'}`,
    `- Detail checks: ${evidence.detailCheckedCount ?? '(not captured)'}`,
    `- Source count: ${evidence.sourceCount ?? '(not captured)'}`,
  ];
}

function buildRollbackStatus(review: TodayPilotEvidenceEvaluation): string {
  const rollback = review.normalizedEvidence.rollbackToMockVerified;
  if (rollback === true) {
    return 'Verified locally.';
  }

  if (rollback === false) {
    return 'Attempted but not verified.';
  }

  return 'Not captured yet.';
}

function buildNextActionLines(review: TodayPilotEvidenceEvaluation): string[] {
  const lines = [review.nextAction];

  if (review.failedCriticalChecks.length > 0) {
    for (const failed of review.failedCriticalChecks) {
      lines.push(`Resolve critical issue: ${labelForCheck(failed)}.`);
    }
    return lines;
  }

  if (review.missingRequiredChecks.length > 0) {
    for (const missing of review.missingRequiredChecks) {
      lines.push(`Capture missing evidence: ${labelForCheck(missing)}.`);
    }
  }

  return lines;
}

export function buildTodayRealFeedPilotMarkdownReport(
  review: TodayPilotEvidenceEvaluation,
): string {
  const normalizedReview = evaluateTodayPilotEvidence(review.normalizedEvidence);
  const evidence = normalizedReview.normalizedEvidence;
  const lines = [
    '# SignalDesk Today Real-Feed Pilot Report',
    '',
    '## Summary',
    '',
    `- Pilot environment label: ${evidence.environmentLabel}`,
    `- Tested timestamp: ${evidence.pilotTimestamp}`,
    `- Recommendation: ${normalizedReview.recommendation}`,
    `- Today is still mock-by-default unless intentionally enabled.`,
    `- This report does not switch defaults. No default switch is made by this report.`,
    `- This report does not call Supabase.`,
    `- This report does not call AI.`,
    `- This report should not include secrets.`,
    '',
    '## Rollback Status',
    '',
    `- ${buildRollbackStatus(normalizedReview)}`,
    '- Roll back by setting `VITE_USE_REAL_CONTENT_FEED=false`, then restart or rebuild/redeploy.',
    '',
    ...formatList('Passed Checks', buildPassedChecks(normalizedReview)),
    ...formatList(
      'Missing Required Checks',
      normalizedReview.missingRequiredChecks.map(labelForCheck),
    ),
    ...formatList(
      'Failed Critical Checks',
      normalizedReview.failedCriticalChecks.map(labelForCheck),
    ),
    ...formatList('Warnings', normalizedReview.warnings),
    '## Evidence Summary',
    '',
    ...buildEvidenceSummary(normalizedReview),
    '',
    '## Next Action',
    '',
    ...buildNextActionLines(normalizedReview).map((line) => `- ${line}`),
    '',
    ...formatList('Reviewer Notes', evidence.reviewerNotes),
    ...formatList('Screenshot Notes', evidence.screenshotsOrNotes),
  ];

  return `${lines.join('\n').trimEnd()}\n`;
}
