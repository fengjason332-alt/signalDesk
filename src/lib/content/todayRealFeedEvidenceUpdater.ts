import { resolve } from 'node:path';

import { parseTodayPilotEvidence } from './todayRealFeedPilotEvidence';

export type TodayPilotQualityValue = 'acceptable' | 'needs_work' | 'not_tested';

export interface UpdateTodayPilotEvidenceOptions {
  allowAnyPath?: boolean;
  realCardsRendered?: string;
  realCardCount?: string;
  detailOpenedSafely?: string;
  provenanceVisible?: string;
  sourceLinksVisible?: string;
  noFakeArticleBody?: string;
  completedEnrichedTextWins?: string;
  blankEnrichmentFallback?: string;
  incompleteEnrichmentFallback?: string;
  aiOpenAiFilterWorks?: string;
  nonmatchingFilterEmpty?: string;
  realEmptyDistinct?: string;
  rollbackTested?: string;
  previewReadPoliciesConfirmed?: string;
  mobileQuality?: string;
  bilingualQuality?: string;
  freshness?: string;
  sourceCoverage?: string;
  operatorNotes?: string[];
  screenshotNotes?: string[];
}

type JsonRecord = Record<string, unknown>;

const DOCS_EVIDENCE_SEGMENTS = ['docs', 'evidence'] as const;

function hasDocsEvidenceSegment(pathValue: string): boolean {
  const segments = resolve(pathValue)
    .split(/[\\/]+/)
    .filter((segment) => segment.length > 0);

  for (let index = 0; index < segments.length - 1; index += 1) {
    if (
      segments[index] === DOCS_EVIDENCE_SEGMENTS[0] &&
      segments[index + 1] === DOCS_EVIDENCE_SEGMENTS[1]
    ) {
      return true;
    }
  }

  return false;
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
) {
  if (allowAnyPath) {
    return;
  }

  if (!hasDocsEvidenceSegment(evidencePath)) {
    throw new Error(
      'Refusing to update a file outside docs/evidence without --allow-any-path.',
    );
  }
}

export function applyTodayPilotEvidenceUpdates(
  raw: JsonRecord,
  options: UpdateTodayPilotEvidenceOptions,
): JsonRecord {
  const updated = { ...raw };

  setIfDefined(
    updated,
    'realCardsRendered',
    readBooleanFlag('--real-cards-rendered', options.realCardsRendered),
  );
  setIfDefined(
    updated,
    'real_card_count',
    readIntegerFlag('--real-card-count', options.realCardCount),
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
    'source_links_visible',
    sourceLinksVisible ?? provenanceVisible,
  );

  setIfDefined(
    updated,
    'no_fake_article_body',
    readBooleanFlag('--no-fake-article-body', options.noFakeArticleBody),
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
    'completed_blank_enriched_content_fallback_worked',
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
    'ai_or_openai_filter_matched_when_applicable',
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
    'rollback_checked',
    readBooleanFlag('--rollback-tested', options.rollbackTested),
  );
  setIfDefined(
    updated,
    'rls_read_policy_confirmed',
    readBooleanFlag(
      '--preview-read-policies-confirmed',
      options.previewReadPoliciesConfirmed,
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

  appendNoteArray(
    updated,
    'reviewerNotes',
    (options.operatorNotes ?? []).map((note) =>
      readStringNote('--operator-note', note),
    ),
  );
  appendNoteArray(
    updated,
    'screenshots_or_notes',
    (options.screenshotNotes ?? []).map((note) =>
      readStringNote('--screenshot-note', note),
    ),
  );

  updated.updated_at = new Date().toISOString();

  parseTodayPilotEvidence(updated);

  return updated;
}
