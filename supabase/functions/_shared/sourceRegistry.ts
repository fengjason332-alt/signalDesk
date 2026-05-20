import { CATEGORY_KEYS, type CategoryKey, type SourceRegistryEntry } from './types.ts';

export const CURATED_ENGLISH_RSS_SOURCES: SourceRegistryEntry[] = [
  {
    id: 'rss_openai_blog_ai',
    name: 'OpenAI News',
    url: 'https://openai.com/news/rss.xml',
    source_type: 'rss',
    language: 'en',
    reliability_tier: 'official',
    category_key: 'ai',
    active: true,
    notes: 'Official product and research updates from OpenAI.',
  },
  {
    id: 'rss_coindesk_crypto',
    name: 'CoinDesk',
    url: 'https://www.coindesk.com/arc/outboundfeeds/rss/',
    source_type: 'rss',
    language: 'en',
    reliability_tier: 'specialist',
    category_key: 'crypto',
    active: true,
    notes: 'Crypto-native reporting and market structure coverage.',
  },
  {
    id: 'rss_yahoo_finance_markets',
    name: 'Yahoo Finance News',
    url: 'https://finance.yahoo.com/news/rssindex',
    source_type: 'rss',
    language: 'en',
    reliability_tier: 'aggregator',
    category_key: 'stocks',
    active: true,
    notes: 'Broad markets feed for large-cap and earnings-related coverage.',
  },
  {
    id: 'rss_ieee_robotics',
    name: 'IEEE Spectrum Robotics',
    url: 'https://spectrum.ieee.org/rss/robotics/fulltext',
    source_type: 'rss',
    language: 'en',
    reliability_tier: 'specialist',
    category_key: 'robotics',
    active: true,
    notes: 'Specialist robotics coverage with engineering context.',
  },
  {
    id: 'rss_reuters_energy',
    name: 'Reuters Energy',
    url: 'https://feeds.reuters.com/reuters/USenergyNews',
    source_type: 'rss',
    language: 'en',
    reliability_tier: 'tier_1',
    category_key: 'energy',
    active: true,
    notes: 'Energy policy and infrastructure coverage from a global wire source.',
  },
  {
    id: 'rss_white_house_briefing',
    name: 'The White House Briefing Room',
    url: 'https://www.whitehouse.gov/briefing-room/feed/',
    source_type: 'rss',
    language: 'en',
    reliability_tier: 'official',
    category_key: 'us_policy',
    active: true,
    notes: 'Official US administration releases and policy announcements.',
  },
  {
    id: 'rss_reuters_china',
    name: 'Reuters China',
    url: 'https://feeds.reuters.com/reuters/ChinaNews',
    source_type: 'rss',
    language: 'en',
    reliability_tier: 'tier_1',
    category_key: 'china_policy',
    active: true,
    notes: 'English-language China coverage suitable for policy tracking.',
  },
  {
    id: 'rss_reuters_asia_pacific',
    name: 'Reuters Asia Pacific',
    url: 'https://feeds.reuters.com/reuters/worldNews',
    source_type: 'rss',
    language: 'en',
    reliability_tier: 'tier_1',
    category_key: 'australia_policy',
    active: true,
    notes: 'Regional wire coverage used initially for Australia-relevant policy developments.',
  },
  {
    id: 'rss_imf_news',
    name: 'IMF News',
    url: 'https://www.imf.org/en/News/RSS',
    source_type: 'rss',
    language: 'en',
    reliability_tier: 'official',
    category_key: 'macro',
    active: true,
    notes: 'Official macroeconomic commentary, speeches, and releases.',
  },
  {
    id: 'rss_reuters_world',
    name: 'Reuters World',
    url: 'https://feeds.reuters.com/Reuters/worldNews',
    source_type: 'rss',
    language: 'en',
    reliability_tier: 'tier_1',
    category_key: 'geopolitics',
    active: true,
    notes: 'Broad world and geopolitical developments from a global wire feed.',
  },
];

export function validateSourceRegistry(sources: SourceRegistryEntry[]) {
  const issues: string[] = [];
  const ids = new Set<string>();

  for (const source of sources) {
    if (!source.id.trim()) {
      issues.push('Source id is required.');
    }
    if (ids.has(source.id)) {
      issues.push(`Duplicate source id: ${source.id}`);
    }
    ids.add(source.id);

    if (source.source_type !== 'rss') {
      issues.push(`Unsupported source type for Task 1: ${source.source_type}`);
    }
    if (source.language !== 'en') {
      issues.push(`Task 1 sources must be English-first: ${source.id}`);
    }
    if (!CATEGORY_KEYS.includes(source.category_key as CategoryKey)) {
      issues.push(`Unsupported category key on source: ${source.id}`);
    }
    if (!source.url.startsWith('http')) {
      issues.push(`Source URL must be absolute: ${source.id}`);
    }
    if (!source.notes.trim()) {
      issues.push(`Source notes are required: ${source.id}`);
    }
  }

  return issues;
}

export function getActiveEnglishRssSources() {
  return CURATED_ENGLISH_RSS_SOURCES.filter(
    source => source.active && source.source_type === 'rss' && source.language === 'en',
  );
}
