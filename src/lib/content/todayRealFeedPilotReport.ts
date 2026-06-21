import {
  evaluateTodayPilotEvidence,
  type TodayPilotEvidenceEvaluation,
} from './todayRealFeedPilotEvidence';
import { labelTodayPilotCheck } from './todayRealFeedEvidenceGuidance';
import {
  sanitizeTodayPilotDisplayLines,
  sanitizeTodayPilotDisplayText,
} from './todayRealFeedEvidenceSanitizer';

export const DEFAULT_TODAY_REAL_FEED_REPORT_OUTPUT_PATH =
  'docs/evidence/today-real-feed-pilot-report.local.md';

export const TODAY_REAL_FEED_REPORT_IGNORE_PATTERNS = [
  'docs/evidence/*.local.md',
  'docs/evidence/*.private.md',
] as const;

function formatList(title: string, values: string[]): string[] {
  if (values.length === 0) {
    return [`## ${title}`, '', '- (none)', ''];
  }

  return [
    `## ${title}`,
    '',
    ...sanitizeTodayPilotDisplayLines(values).map((value) => `- ${value}`),
    '',
  ];
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
      passedChecks.push(labelTodayPilotCheck(key));
    }
  }

  if (
    evidence.realCardsObservedCount !== null &&
    evidence.realCardsObservedCount > 0
  ) {
    passedChecks.push(labelTodayPilotCheck('realCardsObservedCount'));
  }

  if (evidence.detailCheckedCount !== null && evidence.detailCheckedCount > 0) {
    passedChecks.push(labelTodayPilotCheck('detailCheckedCount'));
  }

  return [...new Set(passedChecks)];
}

function buildEvidenceSummary(review: TodayPilotEvidenceEvaluation): string[] {
  const evidence = review.normalizedEvidence;

  return sanitizeTodayPilotDisplayLines([
    `- Environment label: ${evidence.environmentLabel}`,
    `- Pilot timestamp: ${evidence.pilotTimestamp}`,
    `- Observed feed mode: ${evidence.observedFeedMode}`,
    `- Real card count: ${evidence.realCardsObservedCount ?? '(not captured)'}`,
    `- Detail checks: ${evidence.detailCheckedCount ?? '(not captured)'}`,
    `- Source count: ${evidence.sourceCount ?? '(not captured)'}`,
  ]);
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
      lines.push(`Resolve critical issue: ${labelTodayPilotCheck(failed)}.`);
    }
    return lines;
  }

  if (review.missingRequiredChecks.length > 0) {
    for (const missing of review.missingRequiredChecks) {
      lines.push(`Capture missing evidence: ${labelTodayPilotCheck(missing)}.`);
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
    `- Pilot environment label: ${sanitizeTodayPilotDisplayText(evidence.environmentLabel)}`,
    `- Tested timestamp: ${sanitizeTodayPilotDisplayText(evidence.pilotTimestamp)}`,
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
      normalizedReview.missingRequiredChecks.map(labelTodayPilotCheck),
    ),
    ...formatList(
      'Failed Critical Checks',
      normalizedReview.failedCriticalChecks.map(labelTodayPilotCheck),
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
    ...formatList('Enriched Summary Cases', evidence.enrichedSummaryCases),
    ...formatList('Deterministic Fallback Cases', evidence.deterministicFallbackCases),
    ...formatList('Filter Checks', evidence.filterChecks),
    ...formatList('Empty State Checks', evidence.emptyStateChecks),
    ...formatList('Mobile Quality Notes', evidence.mobileQualityNotes),
    ...formatList('Bilingual Quality Notes', evidence.bilingualQualityNotes),
    ...formatList('Freshness Notes', evidence.freshnessNotes),
    ...formatList('Source Coverage Notes', evidence.sourceCoverageNotes),
    ...formatList('Reviewer Notes', evidence.reviewerNotes),
    ...formatList('Screenshot Notes', evidence.screenshotsOrNotes),
  ];

  return `${lines.join('\n').trimEnd()}\n`;
}
