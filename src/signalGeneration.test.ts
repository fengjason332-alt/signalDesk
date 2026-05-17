import test from 'node:test';
import assert from 'node:assert/strict';

import { generateCandidateSignals } from './lib/content/signalGeneration';
import { mapFeedItemToRawSourceItem, normalizeFeedItem } from './lib/content/rss';
import {
  SAMPLE_AI_RSS_SOURCE,
  SIMILAR_NOT_DUPLICATE_ITEMS,
  TRACKING_VARIANT_ITEMS,
} from './lib/content/rssFixtures';
import type { ParsedRssFeedItem, SourceRegistryEntry } from './lib/content/types';

const OPENAI_OFFICIAL_SOURCE: SourceRegistryEntry = {
  ...SAMPLE_AI_RSS_SOURCE,
  id: 'rss_openai_fixture_official',
  name: 'OpenAI Fixture Official',
  url: 'https://example.com/feeds/openai.xml',
  reliability_tier: 'official',
};

const CRYPTO_SOURCE: SourceRegistryEntry = {
  ...SAMPLE_AI_RSS_SOURCE,
  id: 'rss_fixture_crypto',
  name: 'SignalDesk Fixture Crypto Feed',
  url: 'https://example.com/feeds/crypto.xml',
  reliability_tier: 'specialist',
  category_key: 'crypto',
};

const POLICY_SOURCE: SourceRegistryEntry = {
  ...SAMPLE_AI_RSS_SOURCE,
  id: 'rss_fixture_policy',
  name: 'SignalDesk Fixture Policy Feed',
  url: 'https://example.com/feeds/policy.xml',
  reliability_tier: 'official',
  category_key: 'australia_policy',
};

const toRawItem = (
  source: SourceRegistryEntry,
  item: ParsedRssFeedItem,
  ingestionRunId: string,
  discoveredAt = '2026-05-17T12:00:00.000Z',
) =>
  mapFeedItemToRawSourceItem(source, normalizeFeedItem(source, item, discoveredAt), {
    discoveredAt,
    ingestionRunId,
  });

test('generateCandidateSignals groups related multi-source articles into one candidate signal seed', () => {
  const rawItems = [
    toRawItem(SAMPLE_AI_RSS_SOURCE, TRACKING_VARIANT_ITEMS[0], 'run_ai'),
    toRawItem(
      OPENAI_OFFICIAL_SOURCE,
      {
        guid: 'openai-official-001',
        title: 'OpenAI details new power planning for AI data centers',
        link: 'https://example.com/openai/power-planning',
        pubDate: 'Sat, 17 May 2026 01:15:00 GMT',
        description:
          '<p>OpenAI says data center expansion will require new power capacity and long-term infrastructure planning.</p>',
        contentEncoded:
          '<div><p>OpenAI says data center expansion will require new power capacity and long-term infrastructure planning.</p></div>',
        author: 'OpenAI',
      },
      'run_openai',
    ),
  ];

  const candidates = generateCandidateSignals(rawItems, {
    sourceRegistry: [SAMPLE_AI_RSS_SOURCE, OPENAI_OFFICIAL_SOURCE],
    now: '2026-05-17T12:00:00.000Z',
  });

  assert.equal(candidates.length, 1);
  assert.equal(candidates[0]?.source_count, 2);
  assert.deepEqual(candidates[0]?.source_item_ids, rawItems.map(item => item.id).sort());
  assert.equal(candidates[0]?.primary_category, 'ai');
  assert.equal(candidates[0]?.entities.includes('OpenAI'), true);
  assert.equal(candidates[0]?.topics.includes('topic_ai_data_center_power'), true);
  assert.equal(candidates[0]?.status, 'candidate');
  assert.equal(candidates[0]?.lifecycle_stage, 'candidate_preview');
  assert.equal(candidates[0]?.primary_preview_raw_source_item_id, rawItems[1]?.id);
  assert.equal(candidates[0]?.primary_source_name, OPENAI_OFFICIAL_SOURCE.name);
  assert.equal(candidates[0]?.topic_matches.some(match => match.topic_id === 'topic_ai_data_center_power'), true);
  assert.equal(candidates[0]?.entity_matches.some(match => match.entity_id === 'entity_openai'), true);
  assert.equal(
    candidates[0]?.entity_matches.every(
      match =>
        Number.isInteger(match.relevance_score) &&
        match.relevance_score >= match.confidence_score &&
        match.mention_count >= 1,
    ),
    true,
  );
  assert.equal(
    candidates[0]?.topic_matches.every(
      match =>
        Number.isInteger(match.relevance_score) &&
        match.relevance_score >= match.confidence_score &&
        match.match_count >= 1,
    ),
    true,
  );
  assert.equal(candidates[0]?.source_provenance.length, 2);
  assert.equal(
    candidates[0]?.source_provenance.every(entry => typeof entry.preview_raw_source_item_id === 'string'),
    true,
  );
});

test('generateCandidateSignals keeps unrelated items in separate candidates', () => {
  const candidates = generateCandidateSignals(
    [
      toRawItem(
        CRYPTO_SOURCE,
        {
          guid: 'crypto-001',
          title: 'Bitcoin ETF inflows accelerate after SEC filing update',
          link: 'https://example.com/crypto/bitcoin-etf',
          pubDate: 'Sat, 17 May 2026 02:00:00 GMT',
          description: '<p>Bitcoin investors are tracking fresh ETF-related filings.</p>',
          contentEncoded:
            '<div><p>Bitcoin investors are tracking fresh ETF-related filings.</p></div>',
          author: 'Crypto Desk',
        },
        'run_crypto',
      ),
      toRawItem(
        POLICY_SOURCE,
        {
          guid: 'policy-001',
          title: 'Australia reviews tariff settings for critical minerals processing',
          link: 'https://example.com/policy/australia-tariffs',
          pubDate: 'Sat, 17 May 2026 03:00:00 GMT',
          description:
            '<p>Australian officials are reviewing tariff settings around critical minerals and refining policy.</p>',
          contentEncoded:
            '<div><p>Australian officials are reviewing tariff settings around critical minerals and refining policy.</p></div>',
          author: 'Policy Desk',
        },
        'run_policy',
      ),
    ],
    {
      sourceRegistry: [CRYPTO_SOURCE, POLICY_SOURCE],
      now: '2026-05-17T12:00:00.000Z',
    },
  );

  assert.equal(candidates.length, 2);
  assert.deepEqual(
    candidates.map(candidate => candidate.primary_category),
    ['australia_policy', 'crypto'],
  );
});

test('generateCandidateSignals dedupes duplicate article variants into one candidate while preserving provenance ids', () => {
  const rawItems = [
    toRawItem(SAMPLE_AI_RSS_SOURCE, TRACKING_VARIANT_ITEMS[0], 'run_1'),
    toRawItem(SAMPLE_AI_RSS_SOURCE, TRACKING_VARIANT_ITEMS[1], 'run_2'),
  ];

  const candidates = generateCandidateSignals(rawItems, {
    sourceRegistry: [SAMPLE_AI_RSS_SOURCE],
    now: '2026-05-17T12:00:00.000Z',
  });

  assert.equal(candidates.length, 1);
  assert.equal(candidates[0]?.source_count, 2);
  assert.deepEqual(candidates[0]?.source_item_ids, rawItems.map(item => item.id).sort());
  assert.equal(candidates[0]?.scoring_seed.duplicate_confidence_score >= 95, true);
  assert.equal(candidates[0]?.source_provenance.length, 2);
});

test('generateCandidateSignals does not over-cluster weakly related articles that only share a company mention', () => {
  const rawItems = [
    toRawItem(SAMPLE_AI_RSS_SOURCE, SIMILAR_NOT_DUPLICATE_ITEMS[0], 'run_1'),
    toRawItem(SAMPLE_AI_RSS_SOURCE, SIMILAR_NOT_DUPLICATE_ITEMS[1], 'run_2'),
  ];

  const candidates = generateCandidateSignals(rawItems, {
    sourceRegistry: [SAMPLE_AI_RSS_SOURCE],
    now: '2026-05-17T12:00:00.000Z',
  });

  assert.equal(candidates.length, 2);
});

test('generateCandidateSignals does not over-cluster medium-dedupe generic same-category items with no mapped overlap', () => {
  const genericSource: SourceRegistryEntry = {
    ...SAMPLE_AI_RSS_SOURCE,
    id: 'rss_fixture_generic_ai',
    name: 'SignalDesk Fixture Generic AI Feed',
    url: 'https://example.com/feeds/generic-ai.xml',
  };

  const repeatedExcerpt = '<p>Operators are moving carefully as procurement cycles continue.</p>';

  const rawItems = [
    toRawItem(
      genericSource,
      {
        guid: 'generic-001',
        title: 'AI builders weigh infrastructure financing options',
        link: 'https://example.com/ai/infra-financing-a',
        pubDate: 'Sat, 17 May 2026 07:00:00 GMT',
        description: repeatedExcerpt,
        contentEncoded: repeatedExcerpt,
        author: 'Generic Desk',
      },
      'run_generic_1',
    ),
    toRawItem(
      genericSource,
      {
        guid: 'generic-999',
        title: 'New cloud contracts reshape AI expansion planning',
        link: 'https://example.com/ai/infra-financing-b',
        pubDate: 'Sat, 17 May 2026 08:00:00 GMT',
        description: repeatedExcerpt,
        contentEncoded: `<div>${repeatedExcerpt}</div>`,
        author: 'Generic Desk',
      },
      'run_generic_2',
    ),
  ];

  const candidates = generateCandidateSignals(rawItems, {
    sourceRegistry: [genericSource],
    now: '2026-05-17T12:00:00.000Z',
  });

  assert.equal(candidates.length, 2);
});
