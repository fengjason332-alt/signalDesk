import { LibraryItem, Signal, Topic, WatchlistItem } from './types';

export interface DetailPayload {
  id: string;
  kind: 'signal' | 'library';
  titleZh: string;
  titleEn?: string;
  summaryZh: string;
  categories: string[];
  topics: string[];
  entities: string[];
  tags: string[];
  whyItMatters: string[];
  importance: number;
  source: string;
  timestamp: string;
  content?: {
    en: string;
    zh: string;
  }[];
  glossary?: {
    term: string;
    definition: string;
  }[];
  libraryMeta?: {
    title: string;
  };
}

const normalizeText = (value: string) => value.trim().toLowerCase();

const uniqueStrings = (values: string[]) => {
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

const hasOverlap = (left: string[], right: string[]) =>
  left.some(leftValue => right.some(rightValue => matchesText(leftValue, rightValue)));

const normalizeSignalCategories = (signal: Signal) => {
  const categories = Array.isArray(signal.categories) ? signal.categories : [];
  return uniqueStrings(categories);
};

const normalizeSignalTopics = (signal: Signal) =>
  uniqueStrings(Array.isArray(signal.topics) ? signal.topics : []);

const normalizeSignalEntities = (signal: Signal) =>
  uniqueStrings(Array.isArray(signal.entities) ? signal.entities : []);

const normalizeSignalTags = (signal: Signal) =>
  uniqueStrings(Array.isArray(signal.tags) ? signal.tags : []);

export function toDetailPayloadFromSignal(signal: Signal): DetailPayload {
  return {
    id: signal.id,
    kind: 'signal',
    titleZh: signal.titleZh,
    titleEn: signal.titleEn,
    summaryZh: signal.summaryZh,
    categories: normalizeSignalCategories(signal),
    topics: normalizeSignalTopics(signal),
    entities: normalizeSignalEntities(signal),
    tags: normalizeSignalTags(signal),
    whyItMatters: Array.isArray(signal.whyItMatters) ? signal.whyItMatters : [],
    importance: signal.importance,
    source: signal.source,
    timestamp: signal.timestamp,
    content: signal.content,
    glossary: signal.glossary,
  };
}

export function toDetailPayloadFromLibraryItem(item: LibraryItem): DetailPayload {
  return {
    id: item.id,
    kind: 'library',
    titleZh: item.title,
    summaryZh: item.summaryZh,
    categories: [],
    topics: [],
    entities: [],
    tags: Array.isArray(item.tags) ? uniqueStrings(item.tags) : [],
    whyItMatters: item.whyItMatters ? [item.whyItMatters] : [],
    importance: 0,
    source: item.source,
    timestamp: item.date,
    libraryMeta: {
      title: item.category,
    },
  };
}

export function isSignalRelatedToTopic(signal: Signal, topic: Topic) {
  return (
    normalizeSignalTopics(signal).some(signalTopic => matchesText(signalTopic, topic.name)) ||
    normalizeSignalCategories(signal).some(category => matchesText(category, topic.category)) ||
    hasOverlap(normalizeSignalTags(signal), topic.tags)
  );
}

export function isSignalRelatedToWatchlistItem(signal: Signal, item: WatchlistItem) {
  const candidates = [
    ...normalizeSignalEntities(signal),
    ...normalizeSignalTopics(signal),
    ...normalizeSignalCategories(signal),
    ...normalizeSignalTags(signal),
  ];

  return candidates.some(candidate => matchesText(candidate, item.name));
}
