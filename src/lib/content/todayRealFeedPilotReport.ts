import {
  evaluateTodayPilotEvidence,
  type TodayPilotEvidenceEvaluation,
} from './todayRealFeedPilotEvidence';
import {
  buildTodayPilotEvidenceNextPlan,
  labelTodayPilotCheck,
} from './todayRealFeedEvidenceGuidance';
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

function buildWhatWasTested(review: TodayPilotEvidenceEvaluation): string[] {
  const evidence = review.normalizedEvidence;

  return sanitizeTodayPilotDisplayLines([
    `Observed feed mode: ${evidence.observedFeedMode}`,
    `Real card count captured: ${evidence.realCardsObservedCount ?? '(not captured)'}`,
    `Detail checks captured: ${evidence.detailCheckedCount ?? '(not captured)'}`,
    `Enriched-content cases captured: ${evidence.enrichedSummaryCases.length}`,
    `Deterministic fallback cases captured: ${evidence.deterministicFallbackCases.length}`,
    `Filter checks captured: ${evidence.filterChecks.length}`,
    `Empty-state checks captured: ${evidence.emptyStateChecks.length}`,
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
      lines.push(
        `Resolve critical issue: ${labelTodayPilotCheck(failed)} is not satisfied.`,
      );
    }
    return lines;
  }

  if (review.missingRequiredChecks.length > 0) {
    for (const missing of review.missingRequiredChecks) {
      lines.push(
        `Capture missing evidence for: ${labelTodayPilotCheck(missing)}.`,
      );
    }
  }

  return lines;
}

function buildRiskSummary(review: TodayPilotEvidenceEvaluation): string[] {
  const lines: string[] = [];

  for (const failedCheck of review.failedCriticalChecks) {
    lines.push(
      `Critical blocker: ${labelTodayPilotCheck(failedCheck)} is not satisfied.`,
    );
  }

  for (const missingCheck of review.missingRequiredChecks) {
    lines.push(
      `Still missing evidence for: ${labelTodayPilotCheck(missingCheck)}.`,
    );
  }

  lines.push(...review.warnings);

  return lines;
}

function buildBoundaries(): string[] {
  return [
    'No secrets should appear in this report.',
    'Today remains mock-by-default after this report.',
    'No frontend writes were introduced.',
    'No frontend AI runtime was introduced.',
    'No X/Grok runtime was introduced.',
    'No Radar, Watchlist, or Library rollout is approved here.',
  ];
}

function buildNextRecommendedTask(review: TodayPilotEvidenceEvaluation): string {
  if (review.recommendation === 'blocked') {
    return 'Fix the blocked pilot evidence items and rerun the local review before any rollout discussion.';
  }

  if (review.recommendation === 'ready_for_controlled_default_rollout') {
    return 'Open a separate explicit controlled default-rollout review task while keeping Today mock-by-default.';
  }

  if (review.recommendation === 'keep_mock_default') {
    return 'Keep Today mock-by-default and gather stronger real-feed evidence before considering any default switch.';
  }

  return 'Run the next-evidence helper, capture the first missing bucket, and rerun the local review.';
}

export function buildTodayRealFeedPilotMarkdownReport(
  review: TodayPilotEvidenceEvaluation,
  options?: {
    evidencePath?: string;
  },
): string {
  const normalizedReview = evaluateTodayPilotEvidence(review.normalizedEvidence);
  const evidencePath =
    options?.evidencePath ?? 'docs/evidence/today-real-feed-pilot-evidence.local.json';
  const nextPlan = buildTodayPilotEvidenceNextPlan(normalizedReview, evidencePath);
  const evidence = normalizedReview.normalizedEvidence;
  const lines = [
    '# SignalDesk Today Real-Feed Pilot Report',
    '',
    '## Project State',
    '',
    `- Pilot environment label: ${sanitizeTodayPilotDisplayText(evidence.environmentLabel)}`,
    `- Tested timestamp: ${sanitizeTodayPilotDisplayText(evidence.pilotTimestamp)}`,
    `- Recommendation: ${normalizedReview.recommendation}`,
    '- Today is still mock-by-default unless intentionally enabled.',
    '- This report does not switch defaults. No default switch is made by this report.',
    '- This report does not call Supabase.',
    '- This report does not call AI.',
    '- This report should not include secrets.',
    '',
    '## Completeness Summary',
    '',
    `- Required checks completed: ${normalizedReview.completeness.requiredChecksCompletedCount}/${normalizedReview.completeness.requiredChecksTotalCount}`,
    `- Required checks missing: ${normalizedReview.completeness.requiredChecksMissingCount}`,
    `- Critical blockers: ${normalizedReview.completeness.criticalBlockersCount}`,
    `- Warnings: ${normalizedReview.completeness.warningsCount}`,
    `- Guidance-only progress score: ${normalizedReview.completeness.progressPercent}%`,
    '- Guidance only: this score does not trigger rollout automatically.',
    '',
    '## Rollback Status',
    '',
    `- ${buildRollbackStatus(normalizedReview)}`,
    '- Roll back by setting `VITE_USE_REAL_CONTENT_FEED=false`, then restart or rebuild/redeploy.',
    '',
    ...formatList('What Was Tested', buildWhatWasTested(normalizedReview)),
    ...formatList('Passed Checks', buildPassedChecks(normalizedReview)),
    ...formatList(
      'Missing Required Checks',
      normalizedReview.missingRequiredChecks.map(labelTodayPilotCheck),
    ),
    ...formatList(
      'Failed Critical Checks',
      normalizedReview.failedCriticalChecks.map(labelTodayPilotCheck),
    ),
    ...formatList('Optional But Recommended', nextPlan.optionalButRecommended),
    ...formatList('Warnings', normalizedReview.warnings),
    ...formatList('Risk / Blocker Summary', buildRiskSummary(normalizedReview)),
    '## Evidence Summary',
    '',
    ...buildEvidenceSummary(normalizedReview),
    '',
    '## Current Recommendation',
    '',
    `- ${normalizedReview.recommendation}`,
    '',
    '## Next Action',
    '',
    ...buildNextActionLines(normalizedReview).map((line) => `- ${line}`),
    '',
    '## Exact Next Manual Action',
    '',
    `- ${nextPlan.exactNextManualAction}`,
    '',
    ...formatList('Exact Commands To Update Evidence', nextPlan.exactUpdateCommands),
    ...formatList('Enriched Summary Cases', evidence.enrichedSummaryCases),
    ...formatList('Deterministic Fallback Cases', evidence.deterministicFallbackCases),
    ...formatList('Filter Checks', evidence.filterChecks),
    ...formatList('Empty State Checks', evidence.emptyStateChecks),
    ...formatList('Mobile Quality Notes', evidence.mobileQualityNotes),
    ...formatList('Bilingual Quality Notes', evidence.bilingualQualityNotes),
    ...formatList('Freshness Notes', evidence.freshnessNotes),
    ...formatList('Source Coverage Notes', evidence.sourceCoverageNotes),
    ...formatList('Reviewer Notes', evidence.reviewerNotes),
    ...formatList(
      'Screenshots Or Notes',
      evidence.screenshotsOrNotes.length > 0
        ? evidence.screenshotsOrNotes
        : ['Add local screenshot or operator-note placeholders here.'],
    ),
    ...formatList('Explicit Boundaries', buildBoundaries()),
    '## Next Recommended Task',
    '',
    `- ${buildNextRecommendedTask(normalizedReview)}`,
  ];

  return `${lines.join('\n').trimEnd()}\n`;
}
