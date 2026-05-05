import {
  CORE_DOMAINS,
  FOLLOWED_TOPIC_OPTIONS,
  MUTED_TOPIC_OPTIONS,
  SUGGESTED_TOPICS,
  TOPIC_MODAL_GROUPS,
} from './mockData';
import { AppSettings, Category, Signal } from './types';

export type TopicModalTab =
  | 'All'
  | 'Core Domains'
  | 'Policy'
  | 'Technology'
  | 'Markets'
  | 'Energy'
  | 'Followed Topics';

export const TOPIC_MODAL_TABS: TopicModalTab[] = [
  'All',
  'Core Domains',
  'Policy',
  'Technology',
  'Markets',
  'Energy',
  'Followed Topics',
];

export const DEFAULT_CORE_DOMAINS: Category[] = ['AI', 'Energy'];
export const DEFAULT_FOLLOWED_TOPICS: string[] = [];
export const DEFAULT_MUTED_TOPICS: string[] = [];

export const CORE_DOMAIN_SET = new Set<Category>(CORE_DOMAINS);
export const FOLLOWED_TOPIC_OPTION_SET = new Set(FOLLOWED_TOPIC_OPTIONS);
export const MUTED_TOPIC_OPTION_SET = new Set(MUTED_TOPIC_OPTIONS);

const normalizeText = (value: string) => value.trim().toLowerCase();

export const uniqueStrings = <T extends string>(values: T[]) => {
  const seen = new Set<string>();
  return values.filter(value => {
    const normalized = normalizeText(value);
    if (!normalized || seen.has(normalized)) {
      return false;
    }

    seen.add(normalized);
    return true;
  });
};

const matchesText = (left: string, right: string) => {
  const normalizedLeft = normalizeText(left);
  const normalizedRight = normalizeText(right);

  if (!normalizedLeft || !normalizedRight) {
    return false;
  }

  return (
    normalizedLeft === normalizedRight ||
    normalizedLeft.includes(normalizedRight) ||
    normalizedRight.includes(normalizedLeft)
  );
};

const signalTokens = (signal: Signal) =>
  uniqueStrings([
    ...signal.categories,
    ...signal.topics,
    ...signal.entities,
    ...signal.tags,
  ]);

export const sanitizeCoreDomains = (values: string[]) =>
  uniqueStrings(values).filter((value): value is Category => CORE_DOMAIN_SET.has(value as Category));

export const sanitizeFollowedTopics = (values: string[]) => uniqueStrings(values);

export const sanitizeMutedTopics = (values: string[]) => uniqueStrings(values);

export const getTodayFilterOptions = (coreDomains: Category[]) => [
  'All',
  ...sanitizeCoreDomains(coreDomains),
] as Array<'All' | Category>;

export const matchesSelectedTopics = (signal: Signal, selectedTopics: string[]) =>
  signalTokens(signal).some(token =>
    selectedTopics.some(selectedTopic => matchesText(token, selectedTopic))
  );

export const matchesMutedTopics = (signal: Signal, mutedTopics: string[]) =>
  matchesSelectedTopics(signal, mutedTopics);

export const getVisibleTodaySignals = (
  signals: Signal[],
  settings: AppSettings,
  activeFilter: 'All' | Category
) => {
  const selectedCoreDomains = sanitizeCoreDomains(settings.preferredTopics);
  const followedTopics = sanitizeFollowedTopics(settings.followedTopics);
  const mutedTopics = sanitizeMutedTopics(settings.mutedTopics);

  return signals.filter(signal => {
    if (matchesMutedTopics(signal, mutedTopics)) {
      return false;
    }

    if (activeFilter !== 'All') {
      return signal.categories.includes(activeFilter);
    }

    const matchesCoreDomain = signal.categories.some(category => selectedCoreDomains.includes(category));
    const matchesFollowedTopic =
      followedTopics.length > 0 && matchesSelectedTopics(signal, followedTopics);

    return matchesCoreDomain || matchesFollowedTopic;
  });
};

export const topicKindForValue = (value: string): 'core' | 'followed' | 'muted' => {
  if (CORE_DOMAIN_SET.has(value as Category)) {
    return 'core';
  }

  if (MUTED_TOPIC_OPTION_SET.has(value)) {
    return 'muted';
  }

  return 'followed';
};

export const getSuggestedTopics = () => SUGGESTED_TOPICS;

export const getTopicsForTab = (tab: TopicModalTab) => {
  switch (tab) {
    case 'Core Domains':
      return CORE_DOMAINS;
    case 'Policy':
      return TOPIC_MODAL_GROUPS.Policy;
    case 'Technology':
      return TOPIC_MODAL_GROUPS.Technology;
    case 'Markets':
      return TOPIC_MODAL_GROUPS.Markets;
    case 'Energy':
      return TOPIC_MODAL_GROUPS.Energy;
    case 'Followed Topics':
      return FOLLOWED_TOPIC_OPTIONS;
    case 'All':
    default:
      return uniqueStrings([...CORE_DOMAINS, ...FOLLOWED_TOPIC_OPTIONS]);
  }
};
