import assert from 'node:assert/strict';
import test from 'node:test';

import { deriveSyncUiState } from './AppContext';

test('deriveSyncUiState returns not-configured when Supabase env is unavailable', () => {
  assert.deepEqual(
    deriveSyncUiState({
      isConfigured: false,
      hasLoadedSession: true,
      email: 'person@example.com',
    }),
    {
      mode: 'not-configured',
      email: null,
    },
  );
});

test('deriveSyncUiState returns loading while auth session is still resolving', () => {
  assert.deepEqual(
    deriveSyncUiState({
      isConfigured: true,
      hasLoadedSession: false,
      email: null,
    }),
    {
      mode: 'loading',
      email: null,
    },
  );
});

test('deriveSyncUiState returns signed-out when configured with no active session', () => {
  assert.deepEqual(
    deriveSyncUiState({
      isConfigured: true,
      hasLoadedSession: true,
      email: null,
    }),
    {
      mode: 'signed-out',
      email: null,
    },
  );
});

test('deriveSyncUiState returns signed-in with the session email when available', () => {
  assert.deepEqual(
    deriveSyncUiState({
      isConfigured: true,
      hasLoadedSession: true,
      email: 'person@example.com',
    }),
    {
      mode: 'signed-in',
      email: 'person@example.com',
    },
  );
});
