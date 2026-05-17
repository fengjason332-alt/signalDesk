import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildDeterministicScoringSeed,
  getDeterministicDuplicateConfidenceScore,
  getDeterministicRecencyScore,
  getDeterministicSourceCountScore,
  getReliabilityTierScore,
} from './lib/content/scoring';

test('deterministic scoring helpers expose stable seed values for core heuristics', () => {
  assert.equal(getReliabilityTierScore('official'), 95);
  assert.equal(getReliabilityTierScore('tier_1'), 88);
  assert.equal(getReliabilityTierScore('specialist'), 80);
  assert.equal(getReliabilityTierScore('aggregator'), 65);

  assert.equal(
    getDeterministicRecencyScore('2026-05-17T10:00:00.000Z', '2026-05-17T12:00:00.000Z'),
    95,
  );
  assert.equal(getDeterministicSourceCountScore(1), 45);
  assert.equal(getDeterministicSourceCountScore(3), 78);
  assert.equal(getDeterministicDuplicateConfidenceScore(['exact', 'high']), 95);
  assert.equal(getDeterministicDuplicateConfidenceScore([]), 35);
});

test('buildDeterministicScoringSeed combines reliability, recency, entities, topics, and duplicate signals without AI scoring', () => {
  const seed = buildDeterministicScoringSeed({
    reliabilityTiers: ['official', 'tier_1'],
    publishedAt: '2026-05-17T10:00:00.000Z',
    now: '2026-05-17T12:00:00.000Z',
    entityNames: ['OpenAI', 'Microsoft', 'nuclear energy'],
    topicIds: ['topic_ai_data_center_power', 'topic_nuclear_energy'],
    categoryKeys: ['ai', 'energy'],
    sourceCount: 3,
    duplicateConfidences: ['high'],
  });

  assert.deepEqual(seed, {
    seed_version: 'phase4_det_v1',
    source_reliability_score: 92,
    recency_score: 95,
    entity_importance_score: 90,
    topic_relevance_score: 86,
    source_count_score: 78,
    duplicate_confidence_score: 82,
    overall_seed_score: 87,
  });
});
