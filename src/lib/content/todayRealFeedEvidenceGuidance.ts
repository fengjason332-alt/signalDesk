import type {
  TodayPilotEvidenceEvaluation,
  TodayRealFeedPilotEvidence,
} from './todayRealFeedPilotEvidence';
import { TODAY_REAL_FEED_PILOT_ROLLBACK_STEPS } from './todayRealFeedPilot';
import {
  isTodayPilotRepoExamplePath,
  sanitizeTodayPilotDisplayPath,
} from './todayRealFeedEvidenceSanitizer';
import { DEFAULT_TODAY_REAL_FEED_EVIDENCE_OUTPUT_PATH } from './todayRealFeedEvidenceStarter';

export const TODAY_REAL_FEED_CHECK_LABELS: Record<string, string> = {
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
  envFlagsChecked: 'Local env flags were recorded',
  screenshotsOrNotes: 'Screenshot or operator notes were recorded',
};

export function labelTodayPilotCheck(checkName: string): string {
  return TODAY_REAL_FEED_CHECK_LABELS[checkName] ?? checkName;
}

type GuidanceAreaId =
  | 'first_real_feed_observation'
  | 'safety_baseline'
  | 'real_card_rendering'
  | 'detail_safety'
  | 'incomplete_enrichment_fallback'
  | 'real_empty'
  | 'completed_enriched_win'
  | 'blank_enrichment_fallback'
  | 'filter_behavior'
  | 'rollback'
  | 'rls'
  | 'bilingual_quality'
  | 'mobile_quality'
  | 'freshness'
  | 'source_coverage';

interface GuidanceAreaDefinition {
  id: GuidanceAreaId;
  title: string;
  checks: string[];
  describeExistingEvidence: (evidence: TodayRealFeedPilotEvidence) => string;
  suggestedCommands: (evidencePath: string) => string[];
  manualChecks: string[];
}

export interface TodayPilotEvidenceNextPlan {
  recommendation: string;
  completeness: TodayPilotEvidenceEvaluation['completeness'];
  missingRequiredChecks: string[];
  failedCriticalChecks: string[];
  warnings: string[];
  nextAction: string;
  mustCollectBeforeRollout: string[];
  optionalButRecommended: string[];
  blockedOrContradictory: string[];
  alreadySatisfied: string[];
  exactNextManualAction: string;
  exactNextManualChecks: string[];
  exactUpdateCommands: string[];
  evidenceStatusLines: string[];
  rollbackReminder: readonly string[];
}

const GUIDANCE_AREAS: readonly GuidanceAreaDefinition[] = [
  {
    id: 'first_real_feed_observation',
    title: 'first real-feed observation evidence',
    checks: [],
    describeExistingEvidence: (evidence) =>
      `observed feed mode: ${evidence.observedFeedMode}`,
    suggestedCommands: (evidencePath) => [
      `npm run phase4:update-today-evidence -- ${evidencePath} --observed-feed-mode real --real-cards-rendered true --real-card-count 1 --sample-card "Add one sampled real card title here."`,
    ],
    manualChecks: [
      'Enable real-feed and run one real browser pass instead of staying in mock or unknown mode.',
      'Capture either one real card, a genuine real_empty state, or a safe fallback_to_mock observation.',
      'Record the first observed feed mode and at least one supporting note in the evidence file.',
    ],
  },
  {
    id: 'safety_baseline',
    title: 'baseline safety evidence',
    checks: [
      'brokenPreviewReadsFellBackSafelyToMock',
      'noSecretsOrRawInternalsInUi',
      'noFrontendWritesIntroduced',
      'noFrontendAiCallsIntroduced',
      'radarWatchlistLibraryUnchanged',
    ],
    describeExistingEvidence: (evidence) =>
      `reviewer notes captured: ${evidence.reviewerNotes.length}`,
    suggestedCommands: (evidencePath) => [
      `npm run phase4:update-today-evidence -- ${evidencePath} --broken-preview-fallback true --no-secrets-in-ui true --no-frontend-writes-introduced true --no-frontend-ai-calls-introduced true --radar-watchlist-library-unchanged true --operator-note "Confirmed fallback safety, no secret leakage, no frontend writes/AI calls, and no Radar/Watchlist/Library changes."`,
    ],
    manualChecks: [
      'Confirm broken preview reads still fall back safely to mock.',
      'Confirm no secrets or raw internal errors appear in UI.',
      'Confirm no frontend writes or frontend AI calls were introduced.',
      'Confirm Radar, Watchlist, and Library remained unchanged during the pilot.',
    ],
  },
  {
    id: 'real_card_rendering',
    title: 'real card rendering evidence',
    checks: ['realCardsRendered', 'realCardsObservedCount'],
    describeExistingEvidence: (evidence) =>
      `sample cards captured: ${evidence.sampleCardIdsOrTitles.length}`,
    suggestedCommands: (evidencePath) => [
      `npm run phase4:update-today-evidence -- ${evidencePath} --observed-feed-mode real --real-cards-rendered true --real-card-count 1 --sample-card "Add one sampled real card title here."`,
    ],
    manualChecks: [
      'Enable real-feed and confirm real cards actually render in Today.',
      'Capture at least one sampled real card title or id.',
      'Record the observed real-card count from that pass.',
    ],
  },
  {
    id: 'detail_safety',
    title: 'detail safety and provenance evidence',
    checks: [
      'detailCheckedCount',
      'detailOpenedSafely',
      'provenanceOrSourceLinksVisible',
      'fakeFullArticleBodyAbsent',
    ],
    describeExistingEvidence: (evidence) =>
      `detail checks captured: ${evidence.detailCheckedCount ?? 0}`,
    suggestedCommands: (evidencePath) => [
      `npm run phase4:update-today-evidence -- ${evidencePath} --detail-checked-count 1 --detail-opened-safely true --provenance-visible true --no-fake-article-body true --operator-note "Checked one real Detail view with visible provenance and no fake full article body."`,
    ],
    manualChecks: [
      'Open at least one real card in Detail.',
      'Confirm Detail opened safely and source provenance stayed visible.',
      'Confirm Detail did not fabricate a full article body.',
    ],
  },
  {
    id: 'incomplete_enrichment_fallback',
    title: 'incomplete enrichment fallback evidence',
    checks: ['incompleteEnrichmentDeterministicFallbackWorked'],
    describeExistingEvidence: (evidence) =>
      `deterministic fallback cases captured: ${evidence.deterministicFallbackCases.length}`,
    suggestedCommands: (evidencePath) => [
      `npm run phase4:update-today-evidence -- ${evidencePath} --incomplete-enrichment-fallback true --deterministic-fallback-case "Observed pending/failed/skipped/not-requested enrichment fallback to deterministic preview text."`,
    ],
    manualChecks: [
      'Find one card where enrichment is pending, failed, skipped, or not requested.',
      'Confirm deterministic preview text remained visible and useful.',
      'Record the fallback case in the evidence file.',
    ],
  },
  {
    id: 'real_empty',
    title: 'real_empty distinction evidence',
    checks: ['realEmptyDistinctFromFilterEmpty'],
    describeExistingEvidence: (evidence) =>
      `real_empty notes captured: ${evidence.emptyStateChecks.length}`,
    suggestedCommands: (evidencePath) => [
      `npm run phase4:update-today-evidence -- ${evidencePath} --observed-feed-mode real_empty --real-cards-rendered false --real-card-count 0 --real-empty-distinct true --empty-state-check "Captured a genuine real_empty state that stayed distinct from filter_empty."`,
    ],
    manualChecks: [
      'Enable real-feed and capture a true real_empty state, not an invalid-env fallback or a normal filter-empty result.',
      'Record why the state was genuinely real_empty and how it differed from filter_empty.',
      'Take one screenshot or note that proves the distinction.',
    ],
  },
  {
    id: 'completed_enriched_win',
    title: 'completed non-empty enriched-content win evidence',
    checks: [
      'completedNonEmptyEnrichedContentObserved',
      'completedNonEmptyEnrichedContentWon',
    ],
    describeExistingEvidence: (evidence) =>
      `enriched-content cases captured: ${evidence.enrichedSummaryCases.length}`,
    suggestedCommands: (evidencePath) => [
      `npm run phase4:update-today-evidence -- ${evidencePath} --completed-enriched-text-observed true --completed-enriched-text-wins true --enriched-case "Observed one completed non-empty enriched summary that clearly beat the deterministic preview text."`,
    ],
    manualChecks: [
      'Find one real card where enrichment is completed and the enriched text is visibly non-empty.',
      'Confirm the enriched text clearly beats the deterministic preview text for that card.',
      'Record which card was used and what improved.',
    ],
  },
  {
    id: 'blank_enrichment_fallback',
    title: 'completed-but-blank enrichment fallback evidence',
    checks: ['completedBlankEnrichedContentFallbackWorked'],
    describeExistingEvidence: (evidence) =>
      `deterministic fallback cases captured: ${evidence.deterministicFallbackCases.length}`,
    suggestedCommands: (evidencePath) => [
      `npm run phase4:update-today-evidence -- ${evidencePath} --blank-enrichment-fallback true --deterministic-fallback-case "Observed a completed-but-blank enrichment case that fell back to deterministic preview text safely."`,
    ],
    manualChecks: [
      'Find one case where enrichment is marked completed but the enriched text is blank.',
      'Confirm deterministic preview text remained visible and readable instead of showing a broken empty summary.',
      'Record which card was used and what fallback text remained visible.',
    ],
  },
  {
    id: 'filter_behavior',
    title: 'filter behavior evidence',
    checks: [
      'aiOrOpenAiFilterMatchedWhenApplicable',
      'nonMatchingFiltersShowedNormalFilterEmptyState',
    ],
    describeExistingEvidence: (evidence) =>
      `filter-behavior notes captured: ${evidence.filterChecks.length}`,
    suggestedCommands: (evidencePath) => [
      `npm run phase4:update-today-evidence -- ${evidencePath} --ai-openai-filter-works true --nonmatching-filter-empty true --filter-check "AI/OpenAI filter matched a real card and a nonmatching filter still showed the normal filter-empty state."`,
    ],
    manualChecks: [
      'Run the AI/OpenAI filter against a matching real card when that content is available.',
      'Run one clearly nonmatching filter and confirm it still shows the normal filter-empty state.',
      'Record both observations in one filter-behavior note.',
    ],
  },
  {
    id: 'rollback',
    title: 'rollback verification',
    checks: ['rollbackToMockVerified'],
    describeExistingEvidence: (evidence) =>
      `rollback captured: ${evidence.rollbackToMockVerified === true ? 'yes' : 'no'}`,
    suggestedCommands: (evidencePath) => [
      `npm run phase4:update-today-evidence -- ${evidencePath} --rollback-tested true --operator-note "Set VITE_USE_REAL_CONTENT_FEED=false and confirmed Today returned to the mock feed."`,
    ],
    manualChecks: [
      'Set VITE_USE_REAL_CONTENT_FEED=false and restart locally or rebuild/redeploy the tested environment.',
      'Confirm Today returns to the mock feed and no real preview read is attempted.',
      'Record the rollback confirmation in the evidence file.',
    ],
  },
  {
    id: 'rls',
    title: 'preview-read policy confirmation',
    checks: ['rlsReadPolicyConfirmed'],
    describeExistingEvidence: () =>
      'preview-read policy confirmation captured: check evidence flags',
    suggestedCommands: (evidencePath) => [
      `npm run phase4:update-today-evidence -- ${evidencePath} --preview-read-policies-confirmed true --operator-note "Confirmed preview-read policies and anon reads for the tested environment."`,
    ],
    manualChecks: [
      'Confirm the tested environment still has the preview-read policy SQL applied.',
      'Confirm anon preview reads are working as expected for the target environment.',
      'Record that policy confirmation in the evidence file.',
    ],
  },
  {
    id: 'bilingual_quality',
    title: 'bilingual quality evidence',
    checks: ['bilingualQualityAcceptable'],
    describeExistingEvidence: (evidence) =>
      `bilingual notes captured: ${evidence.bilingualQualityNotes.length}`,
    suggestedCommands: (evidencePath) => [
      `npm run phase4:update-today-evidence -- ${evidencePath} --bilingual-quality acceptable --bilingual-note "Checked Chinese-first and bilingual text rendering; the sampled cards stayed understandable."`,
    ],
    manualChecks: [
      'Check at least one sampled real card and Detail view where bilingual or Chinese-first text is visible.',
      'Confirm the text still feels readable and understandable in the tested environment.',
      'Record one bilingual-quality note with what you observed.',
    ],
  },
  {
    id: 'mobile_quality',
    title: 'mobile quality evidence',
    checks: ['mobileQualityAcceptable'],
    describeExistingEvidence: (evidence) =>
      `mobile notes captured: ${evidence.mobileQualityNotes.length}`,
    suggestedCommands: (evidencePath) => [
      `npm run phase4:update-today-evidence -- ${evidencePath} --mobile-quality acceptable --mobile-note "Checked Today and Detail on a narrow/mobile viewport; cards, chips, and provenance stayed readable."`,
    ],
    manualChecks: [
      'Check Today and Detail on at least one narrow/mobile viewport.',
      'Confirm cards, chips, provenance, and fallback copy remain readable.',
      'Record the viewport/device note you used.',
    ],
  },
  {
    id: 'freshness',
    title: 'freshness evidence',
    checks: ['dataFreshnessAcceptable'],
    describeExistingEvidence: (evidence) =>
      `freshness notes captured: ${evidence.freshnessNotes.length}`,
    suggestedCommands: (evidencePath) => [
      `npm run phase4:update-today-evidence -- ${evidencePath} --freshness acceptable --freshness-note "Observed publish dates or recency that felt acceptable for the tested pilot environment."`,
    ],
    manualChecks: [
      'Review the publish dates or recency of the real cards you observed.',
      'Decide whether the feed felt fresh enough for the tested pilot environment.',
      'Record the date-based reasoning, not just the boolean.',
    ],
  },
  {
    id: 'source_coverage',
    title: 'source coverage evidence',
    checks: ['sourceCoverageAcceptable'],
    describeExistingEvidence: (evidence) =>
      `source coverage notes captured: ${evidence.sourceCoverageNotes.length}`,
    suggestedCommands: (evidencePath) => [
      `npm run phase4:update-today-evidence -- ${evidencePath} --source-count 3 --source-coverage acceptable --source-coverage-note "Observed a broad enough mix of stable sources for the pilot."`,
    ],
    manualChecks: [
      'Review whether the observed cards came from a broad enough set of stable sources.',
      'Record the source mix you actually saw and whether it felt sufficient.',
      'If the source mix is too narrow, record that explicitly instead of forcing a pass.',
    ],
  },
];

function areaForCheck(checkName: string): GuidanceAreaDefinition | null {
  return GUIDANCE_AREAS.find((area) => area.checks.includes(checkName)) ?? null;
}

function needsFirstRealFeedObservation(evidence: TodayRealFeedPilotEvidence): boolean {
  return (
    (evidence.observedFeedMode === 'mock' ||
      evidence.observedFeedMode === 'unknown' ||
      evidence.observedFeedMode === 'fallback_to_mock') &&
    evidence.realCardsRendered !== true &&
    (evidence.realCardsObservedCount ?? 0) <= 0 &&
    evidence.detailCheckedCount === null
  );
}

function resolveTodayPilotUpdaterPath(evidencePath: string): string {
  if (isTodayPilotRepoExamplePath(evidencePath)) {
    return DEFAULT_TODAY_REAL_FEED_EVIDENCE_OUTPUT_PATH;
  }

  return sanitizeTodayPilotDisplayPath(evidencePath);
}

export function buildTodayPilotEvidenceNextPlan(
  review: TodayPilotEvidenceEvaluation,
  evidencePath: string,
): TodayPilotEvidenceNextPlan {
  const safeEvidencePath = resolveTodayPilotUpdaterPath(evidencePath);
  const mustCollectBeforeRollout: string[] = [];
  const optionalButRecommended = review.completeness.optionalRecommendedChecks.map(
    labelTodayPilotCheck,
  );
  const blockedOrContradictory = review.failedCriticalChecks.map(labelTodayPilotCheck);
  const alreadySatisfied: string[] = [];
  const exactNextManualChecks: string[] = [];
  const exactUpdateCommands: string[] = [];
  const evidenceStatusLines: string[] = [];
  const seenAreas = new Set<GuidanceAreaId>();
  const completedRequiredChecks = new Set(review.completeness.completedRequiredChecks);
  const applicableRequiredChecks = new Set(review.completeness.applicableRequiredChecks);

  const relevantChecks = [
    ...review.failedCriticalChecks,
    ...review.missingRequiredChecks,
  ];

  if (isTodayPilotRepoExamplePath(evidencePath)) {
    evidenceStatusLines.push(
      `Practice example detected: updater commands target ${DEFAULT_TODAY_REAL_FEED_EVIDENCE_OUTPUT_PATH}.`,
    );
    exactUpdateCommands.push('npm run phase4:create-today-evidence');
  }

  if (
    relevantChecks.length === 0 &&
    review.recommendation !== 'blocked' &&
    review.recommendation !== 'ready_for_controlled_default_rollout' &&
    needsFirstRealFeedObservation(review.normalizedEvidence)
  ) {
    const firstObservationArea = GUIDANCE_AREAS.find(
      (area) => area.id === 'first_real_feed_observation',
    );

    if (firstObservationArea) {
      mustCollectBeforeRollout.push(firstObservationArea.title);
      evidenceStatusLines.push(
        `${firstObservationArea.title}: ${firstObservationArea.describeExistingEvidence(
          review.normalizedEvidence,
        )}`,
      );
      exactNextManualChecks.push(...firstObservationArea.manualChecks);
      exactUpdateCommands.push(
        ...firstObservationArea.suggestedCommands(safeEvidencePath),
      );
    }
  }

  for (const checkName of relevantChecks) {
    const area = areaForCheck(checkName);
    if (!area || seenAreas.has(area.id)) {
      continue;
    }

    seenAreas.add(area.id);
    mustCollectBeforeRollout.push(area.title);
    evidenceStatusLines.push(
      `${area.title}: ${area.describeExistingEvidence(review.normalizedEvidence)}`,
    );
    exactNextManualChecks.push(...area.manualChecks);
    exactUpdateCommands.push(...area.suggestedCommands(safeEvidencePath));
  }

  for (const warning of review.warnings) {
    if (
      warning.includes('Completed enriched summary content') ||
      warning.includes('Source coverage is not acceptable yet') ||
      warning.includes('Data freshness is not acceptable yet') ||
      warning.includes('Mobile quality is not acceptable yet') ||
      warning.includes('Bilingual quality is not acceptable yet')
    ) {
      evidenceStatusLines.push(`Warning context: ${warning}`);
    }
  }

  for (const failedCheck of review.failedCriticalChecks) {
    if (areaForCheck(failedCheck)) {
      continue;
    }

    exactNextManualChecks.push(
      `Resolve the critical issue: ${labelTodayPilotCheck(failedCheck)}.`,
    );
  }

  for (const missingCheck of review.missingRequiredChecks) {
    if (areaForCheck(missingCheck)) {
      continue;
    }

    mustCollectBeforeRollout.push(labelTodayPilotCheck(missingCheck));
    exactNextManualChecks.push(
      `Capture the missing check: ${labelTodayPilotCheck(missingCheck)}.`,
    );
  }

  for (const area of GUIDANCE_AREAS) {
    if (area.checks.length === 0) {
      continue;
    }

    const areaFailed = area.checks.some((checkName) =>
      review.failedCriticalChecks.includes(checkName),
    );
    const areaMissing = area.checks.some((checkName) =>
      review.missingRequiredChecks.includes(checkName),
    );
    const areaApplicable = area.checks.every((checkName) =>
      applicableRequiredChecks.has(checkName),
    );
    const areaCompleted = area.checks.every((checkName) =>
      completedRequiredChecks.has(checkName),
    );

    if (areaApplicable && areaCompleted && !areaFailed && !areaMissing) {
      alreadySatisfied.push(area.title);
    }
  }

  const exactNextManualAction =
    exactNextManualChecks[0] ??
    (optionalButRecommended.length > 0
      ? 'Record the remaining optional evidence notes and rerun the local review.'
      : review.nextAction);

  const coveredByArea = new Set<string>();
  for (const area of GUIDANCE_AREAS) {
    for (const checkName of area.checks) {
      coveredByArea.add(checkName);
    }
  }

  if (
    mustCollectBeforeRollout.length === 0 &&
    blockedOrContradictory.length === 0 &&
    optionalButRecommended.length === 0
  ) {
    alreadySatisfied.push('All currently-applicable pilot evidence checks');
  }

  for (const completedCheck of review.completeness.completedRequiredChecks) {
    if (!coveredByArea.has(completedCheck)) {
      alreadySatisfied.push(labelTodayPilotCheck(completedCheck));
    }
  }

  return {
    recommendation: review.recommendation,
    completeness: review.completeness,
    missingRequiredChecks: review.missingRequiredChecks,
    failedCriticalChecks: review.failedCriticalChecks,
    warnings: review.warnings,
    nextAction: review.nextAction,
    mustCollectBeforeRollout: [...new Set(mustCollectBeforeRollout)],
    optionalButRecommended: [...new Set(optionalButRecommended)],
    blockedOrContradictory: [...new Set(blockedOrContradictory)],
    alreadySatisfied: [...new Set(alreadySatisfied)],
    exactNextManualAction,
    exactNextManualChecks: [...new Set(exactNextManualChecks)],
    exactUpdateCommands: [...new Set(exactUpdateCommands)],
    evidenceStatusLines: [...new Set(evidenceStatusLines)],
    rollbackReminder: TODAY_REAL_FEED_PILOT_ROLLBACK_STEPS,
  };
}
