import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const migrationPath = resolve(
  process.cwd(),
  'supabase/migrations/202605060001_phase3_user_state_schema.sql',
);

test('phase 3 schema migration defines the required tables, indexes, and RLS policies', () => {
  const sql = readFileSync(migrationPath, 'utf8');

  assert.match(sql, /create table if not exists public\.user_profiles/i);
  assert.match(sql, /create table if not exists public\.canonical_topics/i);
  assert.match(sql, /create table if not exists public\.user_topic_preferences/i);
  assert.match(sql, /create table if not exists public\.user_saved_items/i);
  assert.match(sql, /create table if not exists public\.user_watchlist_items/i);
  assert.match(sql, /create table if not exists public\.user_notes/i);
  assert.match(sql, /create table if not exists public\.user_feedback/i);
  assert.match(sql, /alter table public\.user_profiles enable row level security/i);
  assert.match(sql, /create policy "user_profiles_select_own"/i);
  assert.match(sql, /create unique index if not exists user_saved_items_user_target_idx/i);
  assert.match(sql, /create unique index if not exists user_watchlist_items_user_entity_idx/i);
  assert.match(sql, /create unique index if not exists user_notes_user_target_idx/i);
});
