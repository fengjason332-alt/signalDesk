import test from 'node:test';
import assert from 'node:assert/strict';

import { createFreshPersistedStateV2 } from './storage';
import { mergeUserStates } from './lib/persistence/mergeUserState';

test('merge imports local state when remote is empty and returns fresh copies', () => {
  const local = createFreshPersistedStateV2();
  local.profile.onboarding_completed = true;
  local.watchlist_items = [
    {
      entity_id: 'entity_msft',
      created_at: '2026-05-06T00:00:00.000Z',
      updated_at: '2026-05-06T00:00:00.000Z',
      sort_order: 4,
    },
    {
      entity_id: 'entity_nvda',
      created_at: '2026-05-06T00:00:00.000Z',
      updated_at: '2026-05-06T00:00:00.000Z',
      sort_order: 1,
    },
  ];
  local.saved_items = [
    {
      target_type: 'signal',
      target_id: 's1',
      created_at: '2026-05-06T00:00:00.000Z',
      updated_at: '2026-05-06T00:00:00.000Z',
    },
  ];

  const merged = mergeUserStates(local, null);

  assert.notEqual(merged, local);
  assert.notEqual(merged.profile, local.profile);
  assert.notEqual(merged.saved_items, local.saved_items);
  assert.notEqual(merged.watchlist_items, local.watchlist_items);
  assert.equal(merged.profile.onboarding_completed, true);
  assert.deepEqual(merged.saved_items.map(item => item.target_id), ['s1']);
  assert.deepEqual(merged.watchlist_items.map(item => item.entity_id), ['entity_nvda', 'entity_msft']);

  merged.saved_items[0].target_id = 'changed';
  assert.equal(local.saved_items[0].target_id, 's1');
});

test('merge keeps the newest profile by updated_at', () => {
  const local = createFreshPersistedStateV2();
  const remote = createFreshPersistedStateV2();

  local.profile.updated_at = '2026-05-05T00:00:00.000Z';
  remote.profile.updated_at = '2026-05-06T00:00:00.000Z';
  remote.profile.reading_mode = 'Original';

  const merged = mergeUserStates(local, remote);

  assert.equal(merged.profile.reading_mode, 'Original');
});

test('merge with remote state still returns fresh copies', () => {
  const local = createFreshPersistedStateV2();
  const remote = createFreshPersistedStateV2();

  remote.saved_items = [
    {
      target_type: 'signal',
      target_id: 's1',
      created_at: '2026-05-04T00:00:00.000Z',
      updated_at: '2026-05-06T00:00:00.000Z',
    },
  ];

  const merged = mergeUserStates(local, remote);

  assert.notEqual(merged, remote);
  assert.notEqual(merged.profile, remote.profile);
  assert.notEqual(merged.saved_items, remote.saved_items);

  merged.saved_items[0].target_id = 'changed';
  assert.equal(remote.saved_items[0].target_id, 's1');
});

test('merge de-duplicates canonical and custom topic preferences by identity and keeps the newest winner', () => {
  const local = createFreshPersistedStateV2();
  const remote = createFreshPersistedStateV2();

  local.topic_preferences = [
    {
      preference_type: 'followed',
      topic_kind: 'canonical',
      topic_id: 'topic_ai_inference',
      created_at: '2026-05-05T00:00:00.000Z',
      updated_at: '2026-05-05T00:00:00.000Z',
    },
    {
      preference_type: 'muted',
      topic_kind: 'custom',
      custom_topic_label: ' AI Agents ',
      source: 'legacy_localStorage',
      created_at: '2026-05-05T00:00:00.000Z',
      updated_at: '2026-05-05T00:00:00.000Z',
    },
  ];

  remote.topic_preferences = [
    {
      preference_type: 'followed',
      topic_kind: 'canonical',
      topic_id: 'topic_ai_inference',
      created_at: '2026-05-04T00:00:00.000Z',
      updated_at: '2026-05-06T00:00:00.000Z',
    },
    {
      preference_type: 'muted',
      topic_kind: 'custom',
      custom_topic_label: 'ai agents',
      source: 'user_created',
      created_at: '2026-05-04T00:00:00.000Z',
      updated_at: '2026-05-06T00:00:00.000Z',
    },
    {
      preference_type: 'muted',
      topic_kind: 'custom',
      custom_topic_label: 'AI-agents',
      source: 'user_created',
      created_at: '2026-05-04T00:00:00.000Z',
      updated_at: '2026-05-06T00:00:00.000Z',
    },
  ];

  const merged = mergeUserStates(local, remote);

  assert.equal(merged.topic_preferences.length, 3);
  assert.equal(
    merged.topic_preferences.filter(
      record =>
        record.preference_type === 'followed' &&
        record.topic_kind === 'canonical' &&
        record.topic_id === 'topic_ai_inference',
    )[0]?.updated_at,
    '2026-05-06T00:00:00.000Z',
  );
  assert.equal(
    merged.topic_preferences.filter(
      record =>
        record.preference_type === 'muted' &&
        record.topic_kind === 'custom' &&
        record.custom_topic_label === 'ai agents',
    )[0]?.updated_at,
    '2026-05-06T00:00:00.000Z',
  );
  assert.equal(
    merged.topic_preferences.filter(
      record =>
        record.preference_type === 'muted' &&
        record.topic_kind === 'custom' &&
        record.custom_topic_label === 'AI-agents',
    ).length,
    1,
  );
});

test('merge de-duplicates saved items, notes, and feedback by target identity using newest updated_at', () => {
  const local = createFreshPersistedStateV2();
  const remote = createFreshPersistedStateV2();

  local.saved_items = [
    {
      target_type: 'signal',
      target_id: 's1',
      created_at: '2026-05-05T00:00:00.000Z',
      updated_at: '2026-05-05T00:00:00.000Z',
    },
  ];
  remote.saved_items = [
    {
      target_type: 'signal',
      target_id: 's1',
      created_at: '2026-05-04T00:00:00.000Z',
      updated_at: '2026-05-06T00:00:00.000Z',
    },
  ];

  local.notes = [
    {
      target_type: 'signal',
      target_id: 's1',
      body: 'older local note',
      created_at: '2026-05-05T00:00:00.000Z',
      updated_at: '2026-05-05T00:00:00.000Z',
    },
  ];
  remote.notes = [
    {
      target_type: 'signal',
      target_id: 's1',
      body: 'newer remote note',
      created_at: '2026-05-04T00:00:00.000Z',
      updated_at: '2026-05-06T00:00:00.000Z',
    },
  ];

  local.feedback = [
    {
      target_type: 'signal',
      target_id: 's1',
      feedback_type: 'useful',
      created_at: '2026-05-05T00:00:00.000Z',
      updated_at: '2026-05-05T00:00:00.000Z',
    },
  ];
  remote.feedback = [
    {
      target_type: 'signal',
      target_id: 's1',
      feedback_type: 'not_useful',
      created_at: '2026-05-04T00:00:00.000Z',
      updated_at: '2026-05-06T00:00:00.000Z',
    },
  ];

  const merged = mergeUserStates(local, remote);

  assert.equal(merged.saved_items.length, 1);
  assert.equal(merged.saved_items[0].updated_at, '2026-05-06T00:00:00.000Z');
  assert.equal(merged.notes.length, 1);
  assert.equal(merged.notes[0].body, 'newer remote note');
  assert.equal(merged.feedback.length, 1);
  assert.equal(merged.feedback[0].feedback_type, 'not_useful');
});

test('merge de-duplicates watchlist items by entity and returns them sorted by sort_order', () => {
  const local = createFreshPersistedStateV2();
  const remote = createFreshPersistedStateV2();

  local.watchlist_items = [
    {
      entity_id: 'entity_tsla',
      created_at: '2026-05-05T00:00:00.000Z',
      updated_at: '2026-05-05T00:00:00.000Z',
      sort_order: 5,
    },
    {
      entity_id: 'entity_nvda',
      created_at: '2026-05-05T00:00:00.000Z',
      updated_at: '2026-05-05T00:00:00.000Z',
      sort_order: 1,
    },
  ];
  remote.watchlist_items = [
    {
      entity_id: 'entity_tsla',
      created_at: '2026-05-04T00:00:00.000Z',
      updated_at: '2026-05-06T00:00:00.000Z',
      sort_order: 0,
    },
    {
      entity_id: 'entity_msft',
      created_at: '2026-05-04T00:00:00.000Z',
      updated_at: '2026-05-06T00:00:00.000Z',
      sort_order: 3,
    },
  ];

  const merged = mergeUserStates(local, remote);

  assert.deepEqual(
    merged.watchlist_items.map(item => [item.entity_id, item.sort_order]),
    [
      ['entity_tsla', 0],
      ['entity_nvda', 1],
      ['entity_msft', 3],
    ],
  );
});
