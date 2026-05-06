import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import {
  normalizeSupabaseEnvValue,
  resolveSupabaseClientConfig,
} from './lib/supabase/client.ts';

test('env example includes the required Supabase client variables', () => {
  const envExample = readFileSync(resolve(process.cwd(), '.env.example'), 'utf8');

  assert.match(envExample, /VITE_SUPABASE_URL=/);
  assert.match(envExample, /VITE_SUPABASE_ANON_KEY=/);
});

test('normalizeSupabaseEnvValue trims configured values and drops blanks', () => {
  assert.equal(normalizeSupabaseEnvValue(' https://example.supabase.co '), 'https://example.supabase.co');
  assert.equal(normalizeSupabaseEnvValue('   '), undefined);
  assert.equal(normalizeSupabaseEnvValue(undefined), undefined);
});

test('resolveSupabaseClientConfig marks config as enabled only when both env vars are present', () => {
  assert.deepEqual(
    resolveSupabaseClientConfig({
      url: ' https://example.supabase.co ',
      anonKey: ' anon-key ',
    }),
    {
      url: 'https://example.supabase.co',
      anonKey: 'anon-key',
      isConfigured: true,
    },
  );

  assert.deepEqual(
    resolveSupabaseClientConfig({
      url: 'https://example.supabase.co',
      anonKey: '   ',
    }),
    {
      url: 'https://example.supabase.co',
      anonKey: undefined,
      isConfigured: false,
    },
  );
});

test('supabase client module keeps stable runtime exports', async () => {
  const module = await import('./lib/supabase/client.ts');

  assert.equal(typeof module.isSupabaseConfigured, 'boolean');
  assert.equal(module.supabase === null || typeof module.supabase === 'object', true);
});
