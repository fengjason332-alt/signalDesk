import type {
  RawItemDedupeConfidence,
  RawSourceItemRecord,
} from './types';

type RawItemComparable = Pick<
  RawSourceItemRecord,
  | 'source_id'
  | 'external_id'
  | 'canonical_url_hash'
  | 'title_hash'
  | 'content_hash'
  | 'published_at'
>;

const hasValue = (value: string | null | undefined): value is string =>
  typeof value === 'string' && value.length > 0;

export function buildRawItemDedupeKeys(item: RawItemComparable) {
  const keys: string[] = [];

  if (hasValue(item.external_id)) {
    keys.push(`external:${item.source_id}:${item.external_id}`);
  }

  keys.push(`url:${item.canonical_url_hash}`);
  keys.push(`title:${item.title_hash}`);
  keys.push(`content:${item.content_hash}`);
  keys.push(`fallback:${item.source_id}:${item.published_at}`);

  return keys;
}

export function compareRawSourceItems(
  left: RawItemComparable,
  right: RawItemComparable,
): RawItemDedupeConfidence {
  if (
    hasValue(left.external_id) &&
    hasValue(right.external_id) &&
    left.source_id === right.source_id &&
    left.external_id === right.external_id
  ) {
    return 'exact';
  }

  const sameCanonicalUrl = left.canonical_url_hash === right.canonical_url_hash;
  const sameTitle = left.title_hash === right.title_hash;
  const sameContent = left.content_hash === right.content_hash;
  const sameFallback =
    left.source_id === right.source_id && left.published_at === right.published_at;

  if (sameCanonicalUrl && (sameTitle || sameContent)) {
    return 'exact';
  }

  if (sameTitle && sameContent) {
    return 'high';
  }

  if (sameCanonicalUrl || sameContent) {
    return 'medium';
  }

  if (sameTitle || sameFallback) {
    return 'low';
  }

  return 'none';
}
