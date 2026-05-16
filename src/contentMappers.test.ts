import test from 'node:test';
import assert from 'node:assert/strict';

import { toDisplaySignalFromGeneratedSignal } from './lib/content/mappers';
import type { GeneratedSignalRecord } from './lib/content/types';

const generatedSignal: GeneratedSignalRecord = {
  id: 'signal_energy_001',
  primary_category: 'energy',
  categories: ['energy', 'ai'],
  headline_en: 'Microsoft secures nuclear power for AI data centers',
  headline_zh: '微软锁定核电以支持 AI 数据中心',
  summary_en: 'AI infrastructure operators are securing baseload generation capacity.',
  summary_zh: 'AI 基础设施运营商正在锁定基荷发电能力。',
  why_it_matters_en: [
    'Power has become a binding AI constraint.',
    'Dedicated supply improves planning certainty.',
  ],
  why_it_matters_zh: [
    '电力已成为 AI 扩张的关键约束。',
    '专属供给提高了规划确定性。',
  ],
  primary_source_name: 'Reuters',
  primary_source_item_id: 'raw_001',
  source_item_count: 2,
  published_at: '2026-05-17T00:10:00.000Z',
  generated_at: '2026-05-17T00:20:00.000Z',
  generation_status: 'generated',
  topic_ids: ['topic_ai_data_center_power', 'topic_nuclear_energy'],
  entity_names: ['Microsoft', 'Constellation Energy'],
  tags: ['MSFT', 'CleanEnergy'],
  scores: {
    importance_score: 91,
    urgency_score: 75,
    confidence_score: 84,
    relevance_score: 90,
    source_reliability_score: 88,
    overall_score: 89,
  },
  created_at: '2026-05-17T00:20:00.000Z',
  updated_at: '2026-05-17T00:20:00.000Z',
};

test('maps a generated signal into the current display Signal shape without changing current feed wiring', () => {
  const displaySignal = toDisplaySignalFromGeneratedSignal(generatedSignal);

  assert.equal(displaySignal.id, generatedSignal.id);
  assert.equal(displaySignal.category, 'energy');
  assert.deepEqual(displaySignal.categories, ['energy', 'ai']);
  assert.equal(displaySignal.titleZh, generatedSignal.headline_zh);
  assert.equal(displaySignal.titleEn, generatedSignal.headline_en);
  assert.equal(displaySignal.summaryZh, generatedSignal.summary_zh);
  assert.deepEqual(displaySignal.whyItMatters, generatedSignal.why_it_matters_en);
  assert.equal(displaySignal.importance, 8.9);
  assert.equal(displaySignal.source, 'Reuters');
  assert.equal(displaySignal.timestamp, generatedSignal.published_at);
  assert.deepEqual(displaySignal.topics, generatedSignal.topic_ids);
  assert.deepEqual(displaySignal.entities, generatedSignal.entity_names);
  assert.deepEqual(displaySignal.tags, generatedSignal.tags);
});

test('falls back safely when bilingual fields are partial', () => {
  const displaySignal = toDisplaySignalFromGeneratedSignal({
    ...generatedSignal,
    headline_zh: '',
    summary_zh: '',
    why_it_matters_zh: [],
    topic_ids: undefined,
    entity_names: undefined,
    tags: undefined,
  });

  assert.equal(displaySignal.titleZh, generatedSignal.headline_en);
  assert.equal(displaySignal.summaryZh, generatedSignal.summary_en);
  assert.deepEqual(displaySignal.topics, []);
  assert.deepEqual(displaySignal.entities, []);
  assert.deepEqual(displaySignal.tags, []);
});
