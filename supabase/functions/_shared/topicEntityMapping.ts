import { CATEGORY_KEYS, type CategoryKey } from './types.ts';
import { CANONICAL_TOPICS, getCanonicalTopicById } from './topicRegistry.ts';
import type {
  ContentEntityType,
  DeterministicEntityMatch,
  DeterministicTopicMatch,
  TopicEntityMappingInput,
  TopicEntityMappingResult,
} from './types.ts';

interface EntityDefinition {
  id: string;
  canonical_name: string;
  entity_type: ContentEntityType;
  aliases: string[];
  categoryKeys: CategoryKey[];
  sort_order: number;
}

interface TopicRule {
  topic_id: string;
  category_key: CategoryKey;
  aliases: string[];
  required_groups?: string[][];
  sort_order: number;
}

const CATEGORY_KEYWORDS: Record<CategoryKey, string[]> = {
  ai: ['artificial intelligence', 'ai', 'model', 'models', 'inference', 'compute'],
  crypto: ['bitcoin', 'ethereum', 'crypto', 'digital asset', 'stablecoin', 'token'],
  stocks: ['stock', 'stocks', 'equity', 'earnings', 'chip', 'chips', 'semiconductor'],
  robotics: ['robot', 'robots', 'robotics', 'humanoid'],
  energy: ['energy', 'power', 'grid', 'electricity', 'nuclear', 'battery'],
  us_policy: ['white house', 'u.s.', 'us policy', 'sec', 'fed', 'export controls'],
  china_policy: ['china policy', 'beijing', 'chinese policy', 'china'],
  australia_policy: ['australia', 'australian', 'canberra', 'critical minerals'],
  macro: ['inflation', 'rates', 'gdp', 'macro', 'central bank', 'fed'],
  geopolitics: ['tariff', 'tariffs', 'sanctions', 'geopolitics', 'geopolitical'],
};

const ENTITY_DEFINITIONS: EntityDefinition[] = [
  {
    id: 'entity_openai',
    canonical_name: 'OpenAI',
    entity_type: 'company',
    aliases: ['openai'],
    categoryKeys: ['ai'],
    sort_order: 10,
  },
  {
    id: 'entity_microsoft',
    canonical_name: 'Microsoft',
    entity_type: 'company',
    aliases: ['microsoft', 'msft'],
    categoryKeys: ['ai'],
    sort_order: 20,
  },
  {
    id: 'entity_nvidia',
    canonical_name: 'Nvidia',
    entity_type: 'company',
    aliases: ['nvidia', 'nvda'],
    categoryKeys: ['ai', 'stocks'],
    sort_order: 30,
  },
  {
    id: 'entity_bitcoin',
    canonical_name: 'Bitcoin',
    entity_type: 'asset',
    aliases: ['bitcoin', 'btc'],
    categoryKeys: ['crypto'],
    sort_order: 40,
  },
  {
    id: 'entity_ethereum',
    canonical_name: 'Ethereum',
    entity_type: 'asset',
    aliases: ['ethereum', 'eth'],
    categoryKeys: ['crypto'],
    sort_order: 50,
  },
  {
    id: 'entity_google',
    canonical_name: 'Google',
    entity_type: 'company',
    aliases: ['google', 'alphabet'],
    categoryKeys: ['ai', 'stocks'],
    sort_order: 60,
  },
  {
    id: 'entity_tesla',
    canonical_name: 'Tesla',
    entity_type: 'company',
    aliases: ['tesla', 'tsla'],
    categoryKeys: ['stocks', 'energy', 'robotics'],
    sort_order: 70,
  },
  {
    id: 'entity_sec',
    canonical_name: 'SEC',
    entity_type: 'organization',
    aliases: ['sec', 'securities and exchange commission'],
    categoryKeys: ['us_policy', 'crypto'],
    sort_order: 80,
  },
  {
    id: 'entity_fed',
    canonical_name: 'Fed',
    entity_type: 'macro_indicator',
    aliases: ['fed', 'federal reserve'],
    categoryKeys: ['macro', 'us_policy'],
    sort_order: 90,
  },
  {
    id: 'entity_china',
    canonical_name: 'China',
    entity_type: 'country',
    aliases: ['china', 'chinese'],
    categoryKeys: ['china_policy', 'geopolitics'],
    sort_order: 100,
  },
  {
    id: 'entity_australia',
    canonical_name: 'Australia',
    entity_type: 'country',
    aliases: ['australia', 'australian'],
    categoryKeys: ['australia_policy', 'geopolitics'],
    sort_order: 110,
  },
  {
    id: 'entity_nuclear_energy',
    canonical_name: 'nuclear energy',
    entity_type: 'topic',
    aliases: ['nuclear energy', 'nuclear power'],
    categoryKeys: ['energy'],
    sort_order: 120,
  },
  {
    id: 'entity_data_centers',
    canonical_name: 'data centers',
    entity_type: 'topic',
    aliases: ['data centers', 'data center', 'data-centers', 'data-center'],
    categoryKeys: ['ai', 'energy'],
    sort_order: 130,
  },
  {
    id: 'entity_robotics',
    canonical_name: 'robotics',
    entity_type: 'topic',
    aliases: ['robotics', 'robots', 'robot'],
    categoryKeys: ['robotics'],
    sort_order: 140,
  },
  {
    id: 'entity_semiconductors',
    canonical_name: 'semiconductors',
    entity_type: 'topic',
    aliases: ['semiconductors', 'semiconductor'],
    categoryKeys: ['stocks', 'ai'],
    sort_order: 150,
  },
  {
    id: 'entity_chips',
    canonical_name: 'chips',
    entity_type: 'topic',
    aliases: ['chips', 'chip'],
    categoryKeys: ['stocks', 'us_policy'],
    sort_order: 160,
  },
  {
    id: 'entity_tariffs',
    canonical_name: 'tariffs',
    entity_type: 'policy',
    aliases: ['tariffs', 'tariff'],
    categoryKeys: ['geopolitics', 'australia_policy'],
    sort_order: 170,
  },
  {
    id: 'entity_export_controls',
    canonical_name: 'export controls',
    entity_type: 'policy',
    aliases: ['export controls', 'export control', 'export restrictions'],
    categoryKeys: ['us_policy'],
    sort_order: 180,
  },
];

export const ENTITY_IMPORTANCE_SEEDS: Record<string, number> = {
  OpenAI: 95,
  Nvidia: 94,
  Bitcoin: 92,
  Ethereum: 88,
  Microsoft: 88,
  Google: 86,
  Tesla: 84,
  SEC: 82,
  Fed: 84,
  China: 80,
  Australia: 72,
  'nuclear energy': 86,
  'data centers': 80,
  robotics: 76,
  semiconductors: 84,
  chips: 82,
  tariffs: 70,
  'export controls': 85,
};

const TOPIC_RULES: TopicRule[] = [
  {
    topic_id: 'topic_ai_data_center_power',
    category_key: 'ai',
    aliases: ['ai data center power', 'power planning for ai data centers'],
    required_groups: [
      ['data center', 'data centers', 'data-center', 'data-centers'],
      ['power', 'energy', 'electricity', 'grid'],
    ],
    sort_order: 10,
  },
  {
    topic_id: 'topic_nuclear_energy',
    category_key: 'energy',
    aliases: ['nuclear energy', 'nuclear power'],
    sort_order: 20,
  },
  {
    topic_id: 'topic_us_chip_export_controls',
    category_key: 'us_policy',
    aliases: ['us chip export controls', 'chip export controls', 'ai chip export controls'],
    required_groups: [
      ['chip', 'chips', 'semiconductor', 'semiconductors'],
      ['export controls', 'export control', 'export restrictions'],
    ],
    sort_order: 30,
  },
  {
    topic_id: 'topic_semiconductor_supply_chain',
    category_key: 'stocks',
    aliases: ['semiconductor supply chain', 'chip supply chain', 'semiconductors', 'chips'],
    sort_order: 40,
  },
  {
    topic_id: 'topic_stablecoin_regulation',
    category_key: 'crypto',
    aliases: ['stablecoin regulation', 'stablecoin policy', 'stablecoins'],
    sort_order: 50,
  },
  {
    topic_id: 'topic_bitcoin_etf',
    category_key: 'crypto',
    aliases: ['bitcoin etf', 'spot bitcoin etf', 'etf inflows'],
    sort_order: 60,
  },
  {
    topic_id: 'topic_humanoid_robotics',
    category_key: 'robotics',
    aliases: ['humanoid robotics', 'humanoid robots', 'humanoid robot'],
    sort_order: 70,
  },
  {
    topic_id: 'topic_china_ai_policy',
    category_key: 'china_policy',
    aliases: ['china ai policy', 'chinese ai policy'],
    sort_order: 80,
  },
  {
    topic_id: 'topic_australia_critical_minerals',
    category_key: 'australia_policy',
    aliases: ['australia critical minerals', 'critical minerals'],
    sort_order: 90,
  },
  {
    topic_id: 'topic_nvidia_earnings',
    category_key: 'stocks',
    aliases: ['nvidia earnings', 'nvidia results'],
    sort_order: 100,
  },
  {
    topic_id: 'topic_ai_regulation',
    category_key: 'us_policy',
    aliases: ['ai regulation', 'ai policy'],
    sort_order: 110,
  },
];

const normalizeValue = (value: string) =>
  value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();

const toIntegerConfidenceScore = (value: number) =>
  Math.max(0, Math.min(100, Math.round(value * 100)));

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildAliasPattern = (alias: string) =>
  new RegExp(`(^|[^a-z0-9])${escapeRegExp(normalizeValue(alias))}($|[^a-z0-9])`);

const containsAlias = (normalizedValue: string, alias: string) =>
  buildAliasPattern(alias).test(normalizedValue);

const getNormalizedFragments = (input: TopicEntityMappingInput) => {
  const fragments = [
    { key: 'title', value: input.title ?? '' },
    { key: 'dek', value: input.dek ?? '' },
    { key: 'text', value: input.text ?? '' },
  ].filter(fragment => fragment.value.trim().length > 0);

  return fragments.map(fragment => ({
    ...fragment,
    normalized: normalizeValue(fragment.value),
  }));
};

const findEvidenceSnippets = (
  fragments: Array<{ value: string; normalized: string }>,
  aliases: string[],
) => {
  const snippets: string[] = [];

  for (const alias of aliases) {
    for (const fragment of fragments) {
      if (!containsAlias(fragment.normalized, alias)) {
        continue;
      }

      const index = fragment.value.toLowerCase().indexOf(alias.toLowerCase());
      if (index === -1) {
        continue;
      }

      const start = Math.max(0, index - 24);
      const end = Math.min(fragment.value.length, index + alias.length + 40);
      const snippet = fragment.value.slice(start, end).trim();
      if (snippet && !snippets.includes(snippet)) {
        snippets.push(snippet);
      }
    }
  }

  return snippets.slice(0, 3);
};

const countAliasMatches = (
  fragments: Array<{ key: string; normalized: string }>,
  aliases: string[],
) => {
  let totalMatches = 0;
  let titleMatches = 0;
  let dekMatches = 0;
  let textMatches = 0;
  const matchedAliases = new Set<string>();

  for (const alias of aliases) {
    for (const fragment of fragments) {
      if (!containsAlias(fragment.normalized, alias)) {
        continue;
      }

      matchedAliases.add(alias);
      totalMatches += 1;
      if (fragment.key === 'title') {
        titleMatches += 1;
      } else if (fragment.key === 'dek') {
        dekMatches += 1;
      } else {
        textMatches += 1;
      }
    }
  }

  return {
    matchedAliases: Array.from(matchedAliases),
    totalMatches,
    titleMatches,
    dekMatches,
    textMatches,
  };
};

const matchesRequiredGroups = (
  fragments: Array<{ normalized: string }>,
  requiredGroups: string[][],
) =>
  requiredGroups.every(group =>
    group.some(term => fragments.some(fragment => containsAlias(fragment.normalized, term))),
  );

const sortCategories = (scores: Map<CategoryKey, number>) =>
  Array.from(scores.entries())
    .filter(([, score]) => score > 0)
    .sort((left, right) => {
      if (right[1] !== left[1]) {
        return right[1] - left[1];
      }
      return CATEGORY_KEYS.indexOf(left[0]) - CATEGORY_KEYS.indexOf(right[0]);
    })
    .map(([category]) => category);

export function mapTopicsAndEntities(
  input: TopicEntityMappingInput,
): TopicEntityMappingResult {
  const fragments = getNormalizedFragments(input);
  const categoryScores = new Map<CategoryKey, number>();

  for (const categoryKey of input.categoryKeys ?? []) {
    categoryScores.set(categoryKey, (categoryScores.get(categoryKey) ?? 0) + 6);
  }

  const entities: DeterministicEntityMatch[] = [];

  for (const definition of ENTITY_DEFINITIONS) {
    const counts = countAliasMatches(fragments, definition.aliases);
    if (counts.totalMatches === 0) {
      continue;
    }

    const confidence =
      0.55 +
      Math.min(counts.titleMatches, 1) * 0.2 +
      Math.min(counts.dekMatches, 1) * 0.08 +
      Math.min(counts.textMatches, 2) * 0.06 +
      Math.min(counts.matchedAliases.length - 1, 2) * 0.04;

    const evidenceSnippets = findEvidenceSnippets(fragments, definition.aliases);

    entities.push({
      entity_id: definition.id,
      canonical_name: definition.canonical_name,
      entity_type: definition.entity_type,
      confidence_score: toIntegerConfidenceScore(Math.min(0.98, confidence)),
      evidence_snippets: evidenceSnippets,
      matched_aliases: counts.matchedAliases,
    });

    for (const categoryKey of definition.categoryKeys) {
      categoryScores.set(
        categoryKey,
        (categoryScores.get(categoryKey) ?? 0) + 1 + Math.round(confidence * 2),
      );
    }
  }

  const topics: DeterministicTopicMatch[] = [];

  for (const rule of TOPIC_RULES) {
    const counts = countAliasMatches(fragments, rule.aliases);
    const hasRequiredGroups = rule.required_groups
      ? matchesRequiredGroups(fragments, rule.required_groups)
      : false;

    if (counts.totalMatches === 0 && !hasRequiredGroups) {
      continue;
    }

    const canonicalTopic = getCanonicalTopicById(rule.topic_id);
    const confidence =
      0.58 +
      Math.min(counts.titleMatches, 1) * 0.18 +
      Math.min(counts.dekMatches, 1) * 0.07 +
      Math.min(counts.textMatches, 2) * 0.06 +
      (hasRequiredGroups ? 0.12 : 0);

    const topicAliases = [
      ...rule.aliases,
      canonicalTopic?.name ?? '',
      ...(canonicalTopic?.aliases ?? []),
    ].filter(Boolean);

    topics.push({
      topic_id: rule.topic_id,
      topic_name: canonicalTopic?.name ?? rule.topic_id,
      category_key: rule.category_key,
      confidence_score: toIntegerConfidenceScore(Math.min(0.99, confidence)),
      evidence_snippets: findEvidenceSnippets(fragments, topicAliases),
    });

    categoryScores.set(
      rule.category_key,
      (categoryScores.get(rule.category_key) ?? 0) + 2 + Math.round(confidence * 3),
    );
  }

  for (const [categoryKey, keywords] of Object.entries(CATEGORY_KEYWORDS) as Array<
    [CategoryKey, string[]]
  >) {
    const matches = countAliasMatches(fragments, keywords).totalMatches;
    if (matches === 0) {
      continue;
    }

    categoryScores.set(categoryKey, (categoryScores.get(categoryKey) ?? 0) + matches);
  }

  const sortedCategories = sortCategories(categoryScores);
  const primaryCategory = sortedCategories[0] ?? null;

  entities.sort((left, right) => {
    if (right.confidence_score !== left.confidence_score) {
      return right.confidence_score - left.confidence_score;
    }

    const leftDefinition = ENTITY_DEFINITIONS.find(item => item.id === left.entity_id);
    const rightDefinition = ENTITY_DEFINITIONS.find(item => item.id === right.entity_id);
    return (leftDefinition?.sort_order ?? 0) - (rightDefinition?.sort_order ?? 0);
  });

  topics.sort((left, right) => {
    if (right.confidence_score !== left.confidence_score) {
      return right.confidence_score - left.confidence_score;
    }

    const leftRule = TOPIC_RULES.find(item => item.topic_id === left.topic_id);
    const rightRule = TOPIC_RULES.find(item => item.topic_id === right.topic_id);
    return (leftRule?.sort_order ?? 0) - (rightRule?.sort_order ?? 0);
  });

  return {
    primary_category: primaryCategory,
    categories: sortedCategories,
    topics,
    entities,
  };
}

export const CONTENT_ENTITY_CATALOG = ENTITY_DEFINITIONS.map(entity => ({
  ...entity,
}));

export const DETERMINISTIC_TOPIC_RULES = TOPIC_RULES.map(rule => ({
  topic_id: rule.topic_id,
  category_key: rule.category_key,
  aliases: [...rule.aliases],
  required_groups: rule.required_groups?.map(group => [...group]),
}));

export const CANONICAL_TOPIC_ALIAS_LOOKUP = new Map(
  CANONICAL_TOPICS.map(topic => [topic.id, [topic.name, ...topic.aliases]] as const),
);
