import test from 'node:test';
import assert from 'node:assert/strict';

import {
  canonicalizeUrl,
  createContentFingerprint,
  createTitleFingerprint,
  normalizeContentText,
  normalizeTitle,
} from './lib/content/normalization';
import {
  SIMILAR_NOT_DUPLICATE_ITEMS,
  TRACKING_VARIANT_ITEMS,
  TYPOGRAPHIC_TITLE_VARIANT_ITEMS,
} from './lib/content/rssFixtures';

test('canonicalizeUrl removes tracking params, lowercases host, and preserves meaningful params', () => {
  assert.equal(
    canonicalizeUrl(
      'HTTPS://Example.COM/path/to/story/?utm_source=rss&gclid=abc123&id=42&b=2#section',
    ),
    'https://example.com/path/to/story?id=42&b=2',
  );
});

test('normalizeTitle trims whitespace, collapses spaces, and normalizes safe punctuation variants', () => {
  assert.equal(
    normalizeTitle('  “OpenAI”   expands  power  agreements — for new data centers  '),
    '"OpenAI" expands power agreements - for new data centers',
  );
});

test('title fingerprint stays stable across safe punctuation-only differences', () => {
  const first = createTitleFingerprint(TRACKING_VARIANT_ITEMS[0].title);
  const second = createTitleFingerprint(TYPOGRAPHIC_TITLE_VARIANT_ITEMS[1].title);

  assert.equal(first.length, 64);
  assert.equal(first, second);
});

test('normalizeContentText strips HTML, decodes entities, and collapses whitespace', () => {
  assert.equal(
    normalizeContentText('<div>Hello&nbsp; world &amp; markets<br/> are  moving.</div>'),
    'Hello world & markets are moving.',
  );
});

test('content fingerprint stays stable for same content excerpt with different markup', () => {
  const first = createContentFingerprint(
    '<p>OpenAI and Microsoft are securing additional energy capacity.</p>',
  );
  const second = createContentFingerprint(
    'OpenAI and Microsoft are securing additional energy capacity.',
  );

  assert.equal(first.length, 64);
  assert.equal(first, second);
});

test('similar but different articles do not collapse to the same title fingerprint', () => {
  const first = createTitleFingerprint(SIMILAR_NOT_DUPLICATE_ITEMS[0].title);
  const second = createTitleFingerprint(SIMILAR_NOT_DUPLICATE_ITEMS[1].title);

  assert.notEqual(first, second);
});
