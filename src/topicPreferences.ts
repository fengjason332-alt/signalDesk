import { AppSettings, CATEGORY_KEYS, CategoryKey, getCategoryLabel, Signal } from './types';
import {
  findCanonicalTopicByValue,
  canonicalTopicMatchTokens,
  getAllCanonicalTopicNames,
  getSuggestedTopicNames,
  getTopicNamesForGroup,
} from './topicRegistry';

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

export const DEFAULT_CORE_DOMAINS: CategoryKey[] = ['ai', 'energy'];
export const DEFAULT_FOLLOWED_TOPICS: string[] = [];
export const DEFAULT_MUTED_TOPICS: string[] = [];

export const MUTED_TOPIC_OPTIONS = [
  'Meme Coins',
  'Celebrity Drama',
  'Low-quality Rumors',
];

export const CORE_DOMAIN_SET = new Set<CategoryKey>(CATEGORY_KEYS);
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

const normalizeSignalCategories = (signal: Signal) =>
  uniqueStrings(Array.isArray(signal.categories) ? signal.categories : []);

const signalTokens = (signal: Signal) =>
  uniqueStrings([
    ...normalizeSignalCategories(signal),
    ...normalizeSignalCategories(signal).map(getCategoryLabel),
    ...(Array.isArray(signal.topics) ? signal.topics : []),
    ...(Array.isArray(signal.entities) ? signal.entities : []),
    ...(Array.isArray(signal.tags) ? signal.tags : []),
  ]);

const matchesCanonicalTopic = (signal: Signal, selectedTopic: string) => {
  const canonicalTopic = findCanonicalTopicByValue(selectedTopic);
  if (!canonicalTopic) {
    return false;
  }

  const topicTokens = signalTokens(signal);
  return topicTokens.some(token =>
    canonicalTopicMatchTokens(canonicalTopic).some(matchToken => matchesText(token, matchToken)),
  );
};

const matchesCustomTopic = (
  signal: Signal,
  selectedTopic: string,
  mode: 'followed' | 'muted',
) => {
  const normalizedSelectedTopic = normalizeText(selectedTopic);
  if (!normalizedSelectedTopic || normalizedSelectedTopic.length < 3) {
    return false;
  }

  const topicTokens = signalTokens(signal).map(normalizeText);
  const exactMatch = topicTokens.some(token => token === normalizedSelectedTopic);
  if (exactMatch) {
    return true;
  }

  if (mode === 'muted') {
    if (normalizedSelectedTopic.length < 6) {
      return false;
    }

    return topicTokens.some(token => token.includes(normalizedSelectedTopic));
  }

  if (normalizedSelectedTopic.length < 4) {
    return false;
  }

  return topicTokens.some(
    token =>
      token.includes(normalizedSelectedTopic) ||
      normalizedSelectedTopic.includes(token),
  );
};

export const sanitizeCoreDomains = (values: string[]) =>
  uniqueStrings(values).filter((value): value is CategoryKey =>
    CORE_DOMAIN_SET.has(value as CategoryKey),
  );

export const sanitizeFollowedTopics = (values: string[]) => uniqueStrings(values);

export const sanitizeMutedTopics = (values: string[]) => uniqueStrings(values);

export const getTodayFilterOptions = (coreDomains: CategoryKey[]) => [
  'All',
  ...sanitizeCoreDomains(coreDomains),
] as Array<'All' | CategoryKey>;

export const matchesSelectedTopics = (signal: Signal, selectedTopics: string[]) =>
  selectedTopics.some(selectedTopic => {
    if (matchesCanonicalTopic(signal, selectedTopic)) {
      return true;
    }

    return matchesCustomTopic(signal, selectedTopic, 'followed');
  });

export const matchesMutedTopics = (signal: Signal, mutedTopics: string[]) =>
  mutedTopics.some(selectedTopic => {
    if (matchesCanonicalTopic(signal, selectedTopic)) {
      return true;
    }

    return matchesCustomTopic(signal, selectedTopic, 'muted');
  });

export const getVisibleTodaySignals = (
  signals: Signal[],
  settings: AppSettings,
  activeFilter: 'All' | CategoryKey,
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
  if (CORE_DOMAIN_SET.has(value as CategoryKey)) {
    return 'core';
  }

  if (MUTED_TOPIC_OPTION_SET.has(value)) {
    return 'muted';
  }

  return 'followed';
};

export const getSuggestedTopics = () => getSuggestedTopicNames();

export const getTopicsForTab = (tab: TopicModalTab) => {
  switch (tab) {
    case 'Core Domains':
      return CATEGORY_KEYS;
    case 'Policy':
      return getTopicNamesForGroup('Policy');
    case 'Technology':
      return getTopicNamesForGroup('Technology');
    case 'Markets':
      return getTopicNamesForGroup('Markets');
    case 'Energy':
      return getTopicNamesForGroup('Energy');
    case 'Followed Topics':
      return getAllCanonicalTopicNames();
    case 'All':
    default:
      return uniqueStrings([...CATEGORY_KEYS, ...getAllCanonicalTopicNames()]);
  }
};
