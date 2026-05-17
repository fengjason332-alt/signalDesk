import { createHash } from 'node:crypto';

const TRACKING_QUERY_PARAMS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'fbclid',
  'gclid',
]);

const normalizeTypography = (value: string) =>
  value
    .normalize('NFKC')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u00A0/g, ' ');

const decodeEntities = (value: string) =>
  value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

const collapseWhitespace = (value: string) => value.replace(/\s+/g, ' ').trim();

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

export function canonicalizeUrl(value: string) {
  try {
    const url = new URL(value.trim());
    url.hostname = url.hostname.toLowerCase();
    url.hash = '';

    const keptEntries = Array.from(url.searchParams.entries()).filter(
      ([key]) => !TRACKING_QUERY_PARAMS.has(key.toLowerCase()),
    );

    url.search = '';
    for (const [key, paramValue] of keptEntries) {
      url.searchParams.append(key, paramValue);
    }

    if (url.pathname.length > 1 && url.pathname.endsWith('/')) {
      url.pathname = url.pathname.slice(0, -1);
    }

    return url.toString();
  } catch {
    return collapseWhitespace(value);
  }
}

export function normalizeTitle(value: string) {
  return collapseWhitespace(normalizeTypography(value));
}

export function createTitleFingerprint(value: string) {
  const fingerprintBase = collapseWhitespace(
    normalizeTitle(value)
      .toLowerCase()
      .replace(/["'`.,:;!?()[\]{}]/g, '')
      .replace(/[-/]/g, ' '),
  );

  return sha256(fingerprintBase);
}

export function createUrlFingerprint(value: string) {
  return sha256(canonicalizeUrl(value));
}

export function normalizeContentText(value: string | null | undefined) {
  if (!value) {
    return '';
  }

  return collapseWhitespace(
    normalizeTypography(decodeEntities(value.replace(/<[^>]+>/g, ' '))),
  );
}

export function createContentFingerprint(value: string | null | undefined) {
  return sha256(normalizeContentText(value).toLowerCase());
}
