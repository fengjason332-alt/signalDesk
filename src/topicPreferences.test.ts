import test from 'node:test';
import assert from 'node:assert/strict';

import { MOCK_SIGNALS } from './mockData';
import {
  getTodayFilterOptions,
  getVisibleTodaySignals,
  matchesMutedTopics,
  matchesSelectedTopics,
} from './topicPreferences';
import { AppSettings, Category } from './types';

const buildSettings = (overrides: Partial<AppSettings> = {}): AppSettings => ({
  readingMode: 'Bilingual',
  translationStyle: 'Professional Analysis',
  preferredTopics: ['AI', 'Energy'],
  followedTopics: [],
  mutedTopics: [],
  criticalAlerts: true,
  darkMode: true,
  ...overrides,
});

test('builds Today filter chips from selected core domains only', () => {
  assert.deepEqual(getTodayFilterOptions(['AI', 'Energy']), ['All', 'AI', 'Energy']);
  assert.deepEqual(getTodayFilterOptions(['US Policy', 'Macro']), ['All', 'US Policy', 'Macro']);
});

test('shows signals matching selected core domains on the All feed', () => {
  const settings = buildSettings({
    preferredTopics: ['AI', 'Energy'],
  });

  const visibleSignals = getVisibleTodaySignals(MOCK_SIGNALS, settings, 'All').map(signal => signal.id);

  assert.deepEqual(visibleSignals, ['s1', 's3', 's4']);
});

test('includes followed topics in the All feed even when their category is not selected', () => {
  const settings = buildSettings({
    preferredTopics: ['AI', 'Energy'],
    followedTopics: ['US Chip Export Controls'],
  });

  const visibleSignals = getVisibleTodaySignals(MOCK_SIGNALS, settings, 'All').map(signal => signal.id);

  assert.deepEqual(visibleSignals, ['s1', 's3', 's4', 's5']);
});

test('category chips still filter by category', () => {
  const settings = buildSettings({
    preferredTopics: ['AI', 'Energy', 'US Policy'],
    followedTopics: ['US Chip Export Controls'],
  });

  const visibleSignals = getVisibleTodaySignals(MOCK_SIGNALS, settings, 'US Policy').map(signal => signal.id);

  assert.deepEqual(visibleSignals, ['s1', 's2', 's5']);
});

test('muted topics hide matching signals', () => {
  const settings = buildSettings({
    preferredTopics: ['Crypto', 'US Policy'],
    mutedTopics: ['Stablecoin Regulation'],
  });

  const visibleSignals = getVisibleTodaySignals(MOCK_SIGNALS, settings, 'All').map(signal => signal.id);

  assert.deepEqual(visibleSignals, ['s1', 's5']);
  assert.equal(matchesMutedTopics(MOCK_SIGNALS[1], settings.mutedTopics), true);
});

test('topic matching uses structured fields consistently', () => {
  assert.equal(matchesSelectedTopics(MOCK_SIGNALS[2], ['AI Data Center Power Demand']), true);
  assert.equal(matchesSelectedTopics(MOCK_SIGNALS[4], ['Semiconductor Supply Chain']), true);
  assert.equal(matchesSelectedTopics(MOCK_SIGNALS[0], ['Nuclear Energy']), false);
});
