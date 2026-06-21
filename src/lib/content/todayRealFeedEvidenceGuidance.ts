import type {
  TodayPilotEvidenceEvaluation,
  TodayRealFeedPilotEvidence,
} from './todayRealFeedPilotEvidence';
import { TODAY_REAL_FEED_PILOT_ROLLBACK_STEPS } from './todayRealFeedPilot';

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
};

export function labelTodayPilotCheck(checkName: string): string {
  return TODAY_REAL_FEED_CHECK_LABELS[checkName] ?? checkName;
}

type GuidanceAreaId =
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
  missingRequiredChecks: string[];
  failedCriticalChecks: string[];
  warnings: string[];
  nextAction: string;
  exactNextManualChecks: string[];
  suggestedUpdateCommands: string[];
  evidenceStatusLines: string[];
  rollbackReminder: readonly string[];
}

const GUIDANCE_AREAS: readonly GuidanceAreaDefinition[] = [
  {
    id: 'real_empty',
    title: 'Capture a genuine real_empty observation',
    checks: ['realEmptyDistinctFromFilterEmpty'],
    describeExistingEvidence: (evidence) =>
      `real_empty notes captured: ${evidence.emptyStateChecks.length}`,
    suggestedCommands: (evidencePath) => [
      `npm run phase4:update-today-evidence -- ${evidencePath} --observed-feed-mode real_empty --real-empty-distinct true --empty-state-check "Captured a genuine real_empty state that stayed distinct from filter_empty."`,
    ],
    manualChecks: [
      'Enable real-feed and capture a true real_empty state, not an invalid-env fallback or a normal filter-empty result.',
      'Record why the state was genuinely real_empty and how it differed from filter_empty.',
      'Take one screenshot or note that proves the distinction.',
    ],
  },
  {
    id: 'completed_enriched_win',
    title: 'Capture a completed non-empty enriched-content win',
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
    title: 'Capture a completed-but-blank enrichment fallback case',
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
    title: 'Capture filter-behavior evidence',
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
    title: 'Capture rollback verification',
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
    title: 'Capture preview-read policy confirmation',
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
    title: 'Capture bilingual quality evidence',
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
    title: 'Capture mobile quality evidence',
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
    title: 'Capture freshness evidence',
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
    title: 'Capture source coverage evidence',
    checks: ['sourceCoverageAcceptable'],
    describeExistingEvidence: (evidence) =>
      `source coverage notes captured: ${evidence.sourceCoverageNotes.length}`,
    suggestedCommands: (evidencePath) => [
      `npm run phase4:update-today-evidence -- ${evidencePath} --source-coverage acceptable --source-coverage-note "Observed a broad enough mix of stable sources for the pilot."`,
    ],
    manualChecks: [
      'Review whether the observed cards came from a broad enough set of stable sources.',
      'Record the source mix you actually saw and whether it felt sufficient.',
      'If the source mix is too narrow, record that explicitly instead of forcing a pass.',
    ],
  },
];

function areaForCheck(checkName: string): GuidanceAreaDefinition | null {
  return (
    GUIDANCE_AREAS.find((area) => area.checks.includes(checkName)) ?? null
  );
}

export function buildTodayPilotEvidenceNextPlan(
  review: TodayPilotEvidenceEvaluation,
  evidencePath: string,
): TodayPilotEvidenceNextPlan {
  const exactNextManualChecks: string[] = [];
  const suggestedUpdateCommands: string[] = [];
  const evidenceStatusLines: string[] = [];
  const seenAreas = new Set<GuidanceAreaId>();

  const relevantChecks = [
    ...review.failedCriticalChecks,
    ...review.missingRequiredChecks,
  ];

  for (const checkName of relevantChecks) {
    const area = areaForCheck(checkName);
    if (!area || seenAreas.has(area.id)) {
      continue;
    }

    seenAreas.add(area.id);
    evidenceStatusLines.push(`Next target: ${area.title}`);
    evidenceStatusLines.push(area.describeExistingEvidence(review.normalizedEvidence));
    exactNextManualChecks.push(...area.manualChecks);
    suggestedUpdateCommands.push(...area.suggestedCommands(evidencePath));
  }

  for (const warning of review.warnings) {
    if (
      warning.includes('Completed enriched summary content') ||
      warning.includes('Source coverage is not acceptable yet') ||
      warning.includes('Data freshness is not acceptable yet') ||
      warning.includes('Mobile quality is not acceptable yet')
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

    exactNextManualChecks.push(
      `Capture the missing check: ${labelTodayPilotCheck(missingCheck)}.`,
    );
  }

  return {
    recommendation: review.recommendation,
    missingRequiredChecks: review.missingRequiredChecks,
    failedCriticalChecks: review.failedCriticalChecks,
    warnings: review.warnings,
    nextAction: review.nextAction,
    exactNextManualChecks: [...new Set(exactNextManualChecks)],
    suggestedUpdateCommands: [...new Set(suggestedUpdateCommands)],
    evidenceStatusLines,
    rollbackReminder: TODAY_REAL_FEED_PILOT_ROLLBACK_STEPS,
  };
}
