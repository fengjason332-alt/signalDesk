import type {
  DeterministicScoringSeed,
  RawItemDedupeConfidence,
  SourceReliabilityTier,
  CategoryKey,
} from './types.ts';
import { ENTITY_IMPORTANCE_SEEDS } from './topicEntityMapping.ts';

const RELIABILITY_TIER_SCORES: Record<SourceReliabilityTier, number> = {
  official: 95,
  tier_1: 88,
  specialist: 80,
  aggregator: 65,
};

const DUPLICATE_CONFIDENCE_SCORES: Record<RawItemDedupeConfidence, number> = {
  exact: 95,
  high: 82,
  medium: 68,
  low: 52,
  none: 35,
};

const DEFAULT_ENTITY_IMPORTANCE_SCORE = 60;

const roundInteger = (value: number) => Math.round(value);

export function getReliabilityTierScore(tier: SourceReliabilityTier) {
  return RELIABILITY_TIER_SCORES[tier];
}

export function getDeterministicRecencyScore(publishedAt: string, now: string) {
  const ageMs = Math.max(0, Date.parse(now) - Date.parse(publishedAt));
  const ageHours = ageMs / (1000 * 60 * 60);

  if (ageHours <= 6) {
    return 95;
  }
  if (ageHours <= 24) {
    return 85;
  }
  if (ageHours <= 48) {
    return 70;
  }
  if (ageHours <= 72) {
    return 55;
  }
  if (ageHours <= 168) {
    return 35;
  }

  return 15;
}

export function getDeterministicEntityImportanceScore(entityNames: string[]) {
  if (entityNames.length === 0) {
    return DEFAULT_ENTITY_IMPORTANCE_SCORE;
  }

  const scores = entityNames.map(
    entityName => ENTITY_IMPORTANCE_SEEDS[entityName] ?? DEFAULT_ENTITY_IMPORTANCE_SCORE,
  );

  return roundInteger(scores.reduce((sum, score) => sum + score, 0) / scores.length);
}

export function getDeterministicTopicRelevanceScore(
  topicIds: string[],
  categoryKeys: CategoryKey[],
) {
  const uniqueTopics = new Set(topicIds).size;
  const uniqueCategories = new Set(categoryKeys).size;
  const rawScore = 62 + uniqueTopics * 9 + uniqueCategories * 3;
  return Math.min(95, rawScore);
}

export function getDeterministicSourceCountScore(sourceCount: number) {
  if (sourceCount <= 1) {
    return 45;
  }
  if (sourceCount === 2) {
    return 65;
  }
  if (sourceCount === 3) {
    return 78;
  }
  if (sourceCount === 4) {
    return 86;
  }

  return 92;
}

export function getDeterministicDuplicateConfidenceScore(
  confidences: RawItemDedupeConfidence[],
) {
  if (confidences.length === 0) {
    return DUPLICATE_CONFIDENCE_SCORES.none;
  }

  const strongestConfidence = confidences.reduce((strongest, current) =>
    DUPLICATE_CONFIDENCE_SCORES[current] > DUPLICATE_CONFIDENCE_SCORES[strongest]
      ? current
      : strongest,
  );

  return DUPLICATE_CONFIDENCE_SCORES[strongestConfidence];
}

export function buildDeterministicScoringSeed(input: {
  reliabilityTiers: SourceReliabilityTier[];
  publishedAt: string;
  now: string;
  entityNames: string[];
  topicIds: string[];
  categoryKeys: CategoryKey[];
  sourceCount: number;
  duplicateConfidences: RawItemDedupeConfidence[];
}): DeterministicScoringSeed {
  const sourceReliabilityScore =
    input.reliabilityTiers.length === 0
      ? RELIABILITY_TIER_SCORES.aggregator
      : roundInteger(
          input.reliabilityTiers
            .map(getReliabilityTierScore)
            .reduce((sum, score) => sum + score, 0) / input.reliabilityTiers.length,
        );

  const recencyScore = getDeterministicRecencyScore(input.publishedAt, input.now);
  const entityImportanceScore = getDeterministicEntityImportanceScore(input.entityNames);
  const topicRelevanceScore = getDeterministicTopicRelevanceScore(
    input.topicIds,
    input.categoryKeys,
  );
  const sourceCountScore = getDeterministicSourceCountScore(input.sourceCount);
  const duplicateConfidenceScore = getDeterministicDuplicateConfidenceScore(
    input.duplicateConfidences,
  );
  const overallSeedScore = roundInteger(
    [
      sourceReliabilityScore,
      recencyScore,
      entityImportanceScore,
      topicRelevanceScore,
      sourceCountScore,
      duplicateConfidenceScore,
    ].reduce((sum, score) => sum + score, 0) / 6,
  );

  return {
    seed_version: 'phase4_det_v1',
    source_reliability_score: sourceReliabilityScore,
    recency_score: recencyScore,
    entity_importance_score: entityImportanceScore,
    topic_relevance_score: topicRelevanceScore,
    source_count_score: sourceCountScore,
    duplicate_confidence_score: duplicateConfidenceScore,
    overall_seed_score: overallSeedScore,
  };
}
