import test from 'node:test';
import assert from 'node:assert/strict';

import { mapTopicsAndEntities } from './lib/content/topicEntityMapping';

test('mapTopicsAndEntities deterministically matches entities, canonical topics, and categories with evidence', () => {
  const result = mapTopicsAndEntities({
    title:
      'OpenAI and Microsoft pursue nuclear energy for new data centers as US weighs chip export controls',
    dek: 'The companies are racing to secure power while policymakers review semiconductor restrictions.',
    text: 'OpenAI and Microsoft are evaluating nuclear power for AI infrastructure buildout. Officials are also discussing export controls on advanced chips.',
    categoryKeys: ['ai'],
  });

  assert.deepEqual([...result.categories].sort(), ['ai', 'energy', 'stocks', 'us_policy']);
  const entityNames = result.entities.map(entity => entity.canonical_name);
  for (const requiredEntity of [
    'OpenAI',
    'Microsoft',
    'nuclear energy',
    'data centers',
    'chips',
    'export controls',
  ]) {
    assert.equal(entityNames.includes(requiredEntity), true);
  }
  assert.deepEqual(
    [...result.topics.map(topic => topic.topic_id)].sort(),
    [
      'topic_ai_data_center_power',
      'topic_nuclear_energy',
      'topic_semiconductor_supply_chain',
      'topic_us_chip_export_controls',
    ],
  );
  assert.equal(result.primary_category, 'ai');
  assert.equal(
    result.entities.every(
      entity =>
        Number.isInteger(entity.confidence_score) &&
        entity.confidence_score >= 60 &&
        entity.confidence_score <= 100,
    ),
    true,
  );
  assert.equal(
    result.topics.every(
      topic =>
        Number.isInteger(topic.confidence_score) &&
        topic.confidence_score >= 60 &&
        topic.confidence_score <= 100,
    ),
    true,
  );
  assert.equal(
    result.topics.some(
      topic =>
        topic.topic_id === 'topic_nuclear_energy' &&
        topic.evidence_snippets.some(snippet => snippet.includes('nuclear energy')),
    ),
    true,
  );
});

test('mapTopicsAndEntities stays deterministic for repeated crypto-policy inputs', () => {
  const input = {
    title: 'Bitcoin and Ethereum rise as the SEC revisits stablecoin policy',
    dek: 'Traders are watching US policy signals around digital assets.',
    text: 'Bitcoin, Ethereum, and the SEC remain central to the stablecoin regulation debate.',
    categoryKeys: ['crypto'],
  } as const;

  const first = mapTopicsAndEntities(input);
  const second = mapTopicsAndEntities(input);

  assert.deepEqual(first, second);
  assert.deepEqual([...first.categories].sort(), ['crypto', 'us_policy']);
  assert.deepEqual(
    first.entities.map(entity => entity.canonical_name),
    ['Bitcoin', 'Ethereum', 'SEC'],
  );
  assert.deepEqual(first.topics.map(topic => topic.topic_id), [
    'topic_stablecoin_regulation',
  ]);
  assert.equal(first.entities.every(entity => Number.isInteger(entity.confidence_score)), true);
  assert.equal(first.topics.every(topic => Number.isInteger(topic.confidence_score)), true);
});
