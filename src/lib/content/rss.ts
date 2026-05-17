import type {
  FetchedSourceFeed,
  NormalizedFeedItem,
  ParsedRssFeedItem,
  RawItemHashes,
  RawSourceItemRecord,
  SourceRegistryEntry,
} from './types';
import {
  canonicalizeUrl,
  createContentFingerprint,
  createTitleFingerprint,
  createUrlFingerprint,
  normalizeContentText,
  normalizeTitle,
} from './normalization';

interface FetchResponseLike {
  ok: boolean;
  status: number;
  text: () => Promise<string>;
}

type FetchLike = (url: string) => Promise<FetchResponseLike>;

const decodeEntities = (value: string) =>
  value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

const stripCdata = (value: string) =>
  value.replace(/^<!\[CDATA\[/, '').replace(/\]\]>$/, '');

const extractTagValue = (input: string, tagName: string) => {
  const pattern = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)</${tagName}>`, 'i');
  const match = input.match(pattern);
  if (!match) {
    return null;
  }

  return stripCdata(match[1].trim());
};

const parseRssItems = (xml: string): ParsedRssFeedItem[] => {
  const itemBlocks = xml.match(/<item\b[\s\S]*?<\/item>/gi) ?? [];

  return itemBlocks.map(itemXml => ({
    guid: extractTagValue(itemXml, 'guid'),
    title: decodeEntities(extractTagValue(itemXml, 'title') ?? ''),
    link: decodeEntities(extractTagValue(itemXml, 'link') ?? ''),
    pubDate: extractTagValue(itemXml, 'pubDate'),
    description: extractTagValue(itemXml, 'description'),
    contentEncoded: extractTagValue(itemXml, 'content:encoded'),
    author: extractTagValue(itemXml, 'author'),
  }));
};

const normalizePublishedAt = (value: string | null) => {
  const parsed = value ? Date.parse(value) : NaN;
  if (Number.isNaN(parsed)) {
    return new Date(0).toISOString();
  }

  return new Date(parsed).toISOString();
};

export async function fetchSourceFeed(
  source: SourceRegistryEntry,
  fetchImpl: FetchLike = async url => {
    if (typeof fetch !== 'function') {
      throw new Error(`No fetch implementation available for ${url}`);
    }

    const response = await fetch(url);
    return {
      ok: response.ok,
      status: response.status,
      text: () => response.text(),
    };
  },
): Promise<FetchedSourceFeed> {
  const response = await fetchImpl(source.url);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch RSS feed for ${source.id}: HTTP ${response.status}`,
    );
  }

  const rawXml = await response.text();
  return {
    source,
    fetchedAt: new Date().toISOString(),
    rawXml,
    items: parseRssItems(rawXml),
  };
}

export function normalizeFeedItem(
  source: SourceRegistryEntry,
  item: ParsedRssFeedItem,
  discoveredAt = new Date().toISOString(),
): NormalizedFeedItem {
  const rawHtml = item.contentEncoded ?? item.description;
  const rawText = rawHtml ? normalizeContentText(rawHtml) : '';
  const dekText = item.description ? normalizeContentText(item.description) : '';

  return {
    source_id: source.id,
    external_id: item.guid ?? item.link ?? null,
    canonical_url: canonicalizeUrl(item.link),
    title: normalizeTitle(item.title),
    dek: dekText || null,
    author: item.author,
    published_at: normalizePublishedAt(item.pubDate),
    discovered_at: discoveredAt,
    language: source.language,
    category_keys: [source.category_key],
    raw_html: rawHtml,
    raw_text: rawText || null,
    normalized_text: rawText || null,
    metadata: {
      feed_item_guid: item.guid,
      source_name: source.name,
    },
  };
}

export function computeRawItemHashes(item: NormalizedFeedItem): RawItemHashes {
  return {
    title_hash: createTitleFingerprint(item.title),
    canonical_url_hash: createUrlFingerprint(item.canonical_url),
    content_hash: createContentFingerprint(item.normalized_text ?? item.raw_text ?? ''),
  };
}

export function mapFeedItemToRawSourceItem(
  source: SourceRegistryEntry,
  item: NormalizedFeedItem,
  options: {
    discoveredAt?: string;
    ingestionRunId?: string | null;
  } = {},
): RawSourceItemRecord {
  const discoveredAt = options.discoveredAt ?? item.discovered_at;
  const hashes = computeRawItemHashes(item);

  return {
    id: `raw_${source.id}_${hashes.canonical_url_hash.slice(0, 16)}`,
    source_id: source.id,
    ingestion_run_id: options.ingestionRunId ?? null,
    external_id: item.external_id,
    canonical_url: item.canonical_url,
    title: item.title,
    dek: item.dek,
    author: item.author,
    published_at: item.published_at,
    discovered_at: discoveredAt,
    language: item.language,
    category_keys: [...item.category_keys],
    raw_html: item.raw_html,
    raw_text: item.raw_text,
    normalized_text: item.normalized_text,
    content_hash: hashes.content_hash,
    title_hash: hashes.title_hash,
    canonical_url_hash: hashes.canonical_url_hash,
    ingestion_status: 'normalized',
    metadata: {
      ...item.metadata,
      source_url: source.url,
    },
    created_at: discoveredAt,
    updated_at: discoveredAt,
  };
}
