import { createHash } from 'node:crypto';

import type { CategoryKey } from './types.ts';
import { compareRawSourceItems } from './dedupe.ts';
import { buildDeterministicScoringSeed } from './scoring.ts';
import { mapTopicsAndEntities } from './topicEntityMapping.ts';
import type {
  CandidateSignalRecord,
  CandidateSignalEntityMatch,
  CandidateSignalTopicMatch,
  RawItemDedupeConfidence,
  RawSourceItemRecord,
  SourceRegistryEntry,
  TopicEntityMappingResult,
} from './types.ts';

interface SignalGenerationContext {
  context_id: string;
  rawItem: RawSourceItemRecord;
  source: SourceRegistryEntry;
  mapping: TopicEntityMappingResult;
}

const DEDUPE_STRENGTH: Record<RawItemDedupeConfidence, number> = {
  exact: 4,
  high: 3,
  medium: 2,
  low: 1,
  none: 0,
};

const RELIABILITY_PAIR_BONUS: Record<SourceRegistryEntry['reliability_tier'], number> = {
  official: 0.75,
  tier_1: 0.5,
  specialist: 0.35,
  aggregator: 0,
};

const uniqueSorted = (values: string[]) => Array.from(new Set(values)).sort();

const sortCategories = (categoryScores: Map<CategoryKey, number>) =>
  Array.from(categoryScores.entries())
    .sort((left, right) => {
      if (right[1] !== left[1]) {
        return right[1] - left[1];
      }
      return left[0].localeCompare(right[0]);
    })
    .map(([category]) => category);

const getPublishedAtTime = (value: string) => Date.parse(value);

const hoursApart = (left: string, right: string) =>
  Math.abs(getPublishedAtTime(left) - getPublishedAtTime(right)) / (1000 * 60 * 60);

const intersect = (left: string[], right: string[]) => {
  const rightSet = new Set(right);
  return left.filter(value => rightSet.has(value));
};

const mergeEntityMatches = (items: SignalGenerationContext[]) => {
  const matchById = new Map<string, CandidateSignalEntityMatch>();

  for (const item of items) {
    for (const match of item.mapping.entities) {
      const existing = matchById.get(match.entity_id);
      if (!existing) {
        matchById.set(match.entity_id, {
          ...match,
          evidence_snippets: [...match.evidence_snippets],
          matched_aliases: [...match.matched_aliases],
          mention_count: 1,
          relevance_score: Math.min(100, match.confidence_score),
        });
        continue;
      }

      existing.mention_count += 1;
      if (match.confidence_score > existing.confidence_score) {
        existing.confidence_score = match.confidence_score;
      }
      existing.evidence_snippets = uniqueSorted([
        ...existing.evidence_snippets,
        ...match.evidence_snippets,
      ]);
      existing.matched_aliases = uniqueSorted([
        ...existing.matched_aliases,
        ...match.matched_aliases,
      ]);
      existing.relevance_score = Math.min(
        100,
        Math.max(existing.relevance_score, existing.confidence_score) + Math.min(12, (existing.mention_count - 1) * 6),
      );
    }
  }

  return Array.from(matchById.values()).sort((left, right) => {
    if (right.relevance_score !== left.relevance_score) {
      return right.relevance_score - left.relevance_score;
    }
    if (right.confidence_score !== left.confidence_score) {
      return right.confidence_score - left.confidence_score;
    }
    return left.entity_id.localeCompare(right.entity_id);
  });
};

const mergeTopicMatches = (items: SignalGenerationContext[]) => {
  const matchById = new Map<string, CandidateSignalTopicMatch>();

  for (const item of items) {
    for (const match of item.mapping.topics) {
      const existing = matchById.get(match.topic_id);
      if (!existing) {
        matchById.set(match.topic_id, {
          ...match,
          evidence_snippets: [...match.evidence_snippets],
          match_count: 1,
          relevance_score: Math.min(100, match.confidence_score),
        });
        continue;
      }

      existing.match_count += 1;
      if (match.confidence_score > existing.confidence_score) {
        existing.confidence_score = match.confidence_score;
      }
      existing.evidence_snippets = uniqueSorted([
        ...existing.evidence_snippets,
        ...match.evidence_snippets,
      ]);
      existing.relevance_score = Math.min(
        100,
        Math.max(existing.relevance_score, existing.confidence_score) + Math.min(10, (existing.match_count - 1) * 5),
      );
    }
  }

  return Array.from(matchById.values()).sort((left, right) => {
    if (right.relevance_score !== left.relevance_score) {
      return right.relevance_score - left.relevance_score;
    }
    if (right.confidence_score !== left.confidence_score) {
      return right.confidence_score - left.confidence_score;
    }
    return left.topic_id.localeCompare(right.topic_id);
  });
};

const selectPrimaryItem = (items: SignalGenerationContext[]) =>
  [...items].sort((left, right) => {
    const leftBonus = RELIABILITY_PAIR_BONUS[left.source.reliability_tier];
    const rightBonus = RELIABILITY_PAIR_BONUS[right.source.reliability_tier];
    if (rightBonus !== leftBonus) {
      return rightBonus - leftBonus;
    }

    const publishedAtDifference =
      getPublishedAtTime(right.rawItem.published_at) - getPublishedAtTime(left.rawItem.published_at);
    if (publishedAtDifference !== 0) {
      return publishedAtDifference;
    }

    return left.rawItem.id.localeCompare(right.rawItem.id);
  })[0];

const shouldGroupItems = (
  left: SignalGenerationContext,
  right: SignalGenerationContext,
) => {
  const dedupeConfidence = compareRawSourceItems(left.rawItem, right.rawItem);
  if (dedupeConfidence === 'exact' || dedupeConfidence === 'high') {
    return true;
  }

  const sharedTopics = intersect(
    left.mapping.topics.map(topic => topic.topic_id),
    right.mapping.topics.map(topic => topic.topic_id),
  );
  const sharedEntities = intersect(
    left.mapping.entities.map(entity => entity.canonical_name),
    right.mapping.entities.map(entity => entity.canonical_name),
  );
  const leftPrimaryCategory = left.mapping.primary_category ?? left.rawItem.category_keys[0];
  const rightPrimaryCategory = right.mapping.primary_category ?? right.rawItem.category_keys[0];
  const samePrimaryCategory = leftPrimaryCategory === rightPrimaryCategory;
  const within24Hours = hoursApart(left.rawItem.published_at, right.rawItem.published_at) <= 24;
  const within36Hours = hoursApart(left.rawItem.published_at, right.rawItem.published_at) <= 36;

  if (dedupeConfidence === 'medium') {
    return sharedTopics.length > 0 || sharedEntities.length > 0;
  }

  const reliabilityBonus =
    RELIABILITY_PAIR_BONUS[left.source.reliability_tier] +
    RELIABILITY_PAIR_BONUS[right.source.reliability_tier];

  const overlapScore =
    sharedTopics.length * 2 +
    sharedEntities.length * 1.25 +
    (samePrimaryCategory ? 1 : 0) +
    (within24Hours ? 1 : 0) +
    reliabilityBonus;

  if (sharedTopics.length >= 1 && sharedEntities.length >= 1 && within24Hours) {
    return overlapScore >= 4;
  }

  if (sharedTopics.length >= 2 && within36Hours) {
    return true;
  }

  return false;
};

const buildClusterCandidate = (
  items: SignalGenerationContext[],
  now: string,
): CandidateSignalRecord => {
  const primaryItem = selectPrimaryItem(items);
  const categoryScores = new Map<CategoryKey, number>();
  const topicMatches = mergeTopicMatches(items);
  const entityMatches = mergeEntityMatches(items);
  const topics = uniqueSorted(topicMatches.map(topic => topic.topic_id));
  const entities = uniqueSorted(entityMatches.map(entity => entity.canonical_name));

  for (const item of items) {
    for (const categoryKey of item.mapping.categories) {
      categoryScores.set(categoryKey, (categoryScores.get(categoryKey) ?? 0) + 1);
    }
    for (const categoryKey of item.rawItem.category_keys) {
      categoryScores.set(categoryKey, (categoryScores.get(categoryKey) ?? 0) + 2);
    }
  }

  const categories = sortCategories(categoryScores);
  const publishedAt = [...items]
    .map(item => item.rawItem.published_at)
    .sort((left, right) => getPublishedAtTime(right) - getPublishedAtTime(left))[0];

  const sourceItemIds = items.map(item => item.rawItem.id).sort();
  const duplicateConfidences: RawItemDedupeConfidence[] = [];

  for (let index = 0; index < items.length; index += 1) {
    for (let compareIndex = index + 1; compareIndex < items.length; compareIndex += 1) {
      duplicateConfidences.push(
        compareRawSourceItems(items[index]!.rawItem, items[compareIndex]!.rawItem),
      );
    }
  }

  const scoringSeed = buildDeterministicScoringSeed({
    reliabilityTiers: items.map(item => item.source.reliability_tier),
    publishedAt,
    now,
    entityNames: entities,
    topicIds: topics,
    categoryKeys: categories,
    sourceCount: items.length,
    duplicateConfidences,
  });

  const candidateId = createHash('sha256')
    .update(sourceItemIds.join('|'))
    .digest('hex')
    .slice(0, 16);

  return {
    candidate_id: `candidate_${candidateId}`,
    title_seed: primaryItem.rawItem.title,
    primary_category: categories[0] ?? primaryItem.rawItem.category_keys[0] ?? 'ai',
    categories,
    entities,
    topics,
    entity_matches: entityMatches,
    topic_matches: topicMatches,
    source_item_ids: sourceItemIds,
    source_count: items.length,
    source_ids: uniqueSorted(items.map(item => item.source.id)),
    source_names: uniqueSorted(items.map(item => item.source.name)),
    source_provenance: items
      .map(item => ({
        preview_raw_source_item_id: item.rawItem.id,
        source_id: item.source.id,
        source_name: item.source.name,
        ingestion_run_id: item.rawItem.ingestion_run_id,
        published_at: item.rawItem.published_at,
        reliability_tier: item.source.reliability_tier,
      }))
      .sort((left, right) => {
        const publishedDifference =
          getPublishedAtTime(right.published_at) - getPublishedAtTime(left.published_at);
        if (publishedDifference !== 0) {
          return publishedDifference;
        }
        if (left.preview_raw_source_item_id !== right.preview_raw_source_item_id) {
          return left.preview_raw_source_item_id.localeCompare(right.preview_raw_source_item_id);
        }
        return left.source_id.localeCompare(right.source_id);
      }),
    primary_preview_raw_source_item_id: primaryItem.rawItem.id,
    primary_source_name: primaryItem.source.name,
    published_at: publishedAt,
    status: 'candidate',
    lifecycle_stage: 'candidate_preview',
    scoring_seed: scoringSeed,
  };
};

export function generateCandidateSignals(
  rawItems: RawSourceItemRecord[],
  options: {
    sourceRegistry: SourceRegistryEntry[];
    now?: string;
  },
): CandidateSignalRecord[] {
  const sourceById = new Map(options.sourceRegistry.map(source => [source.id, source] as const));
  const contexts: SignalGenerationContext[] = rawItems
    .map((rawItem, index) => {
      const source = sourceById.get(rawItem.source_id);
      if (!source) {
        return null;
      }

      return {
        context_id: `${rawItem.id}:${index}`,
        rawItem,
        source,
        mapping: mapTopicsAndEntities({
          title: rawItem.title,
          dek: rawItem.dek,
          text: rawItem.normalized_text ?? rawItem.raw_text ?? '',
          categoryKeys: rawItem.category_keys,
        }),
      } satisfies SignalGenerationContext;
    })
    .filter((item): item is SignalGenerationContext => Boolean(item))
    .sort((left, right) => left.context_id.localeCompare(right.context_id));

  const visited = new Set<string>();
  const clusters: SignalGenerationContext[][] = [];

  for (const context of contexts) {
    if (visited.has(context.context_id)) {
      continue;
    }

    const queue = [context];
    const cluster: SignalGenerationContext[] = [];
    visited.add(context.context_id);

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) {
        continue;
      }

      cluster.push(current);

      for (const candidate of contexts) {
        if (visited.has(candidate.context_id)) {
          continue;
        }

        if (!shouldGroupItems(current, candidate)) {
          continue;
        }

        visited.add(candidate.context_id);
        queue.push(candidate);
      }
    }

    clusters.push(cluster);
  }

  const now = options.now ?? new Date().toISOString();

  return clusters
    .map(cluster => buildClusterCandidate(cluster, now))
    .sort((left, right) => {
      const publishedDifference =
        getPublishedAtTime(right.published_at) - getPublishedAtTime(left.published_at);
      if (publishedDifference !== 0) {
        return publishedDifference;
      }
      return left.candidate_id.localeCompare(right.candidate_id);
    });
}
