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
  assert.match(sql, /alter table public\.user_topic_preferences enable row level security/i);
  assert.match(sql, /alter table public\.user_saved_items enable row level security/i);
  assert.match(sql, /alter table public\.user_watchlist_items enable row level security/i);
  assert.match(sql, /alter table public\.user_notes enable row level security/i);
  assert.match(sql, /alter table public\.user_feedback enable row level security/i);
  assert.match(sql, /alter table public\.canonical_topics enable row level security/i);

  assert.match(sql, /create or replace function public\.set_updated_at\(\)/i);
  assert.match(sql, /constraint user_topic_preferences_topic_shape_check check/i);

  assert.match(sql, /create trigger set_updated_at_user_profiles before update on public\.user_profiles/i);
  assert.match(
    sql,
    /create trigger set_updated_at_user_topic_preferences before update on public\.user_topic_preferences/i,
  );
  assert.match(sql, /create trigger set_updated_at_canonical_topics before update on public\.canonical_topics/i);
  assert.match(sql, /create trigger set_updated_at_user_saved_items before update on public\.user_saved_items/i);
  assert.match(
    sql,
    /create trigger set_updated_at_user_watchlist_items before update on public\.user_watchlist_items/i,
  );
  assert.match(sql, /create trigger set_updated_at_user_notes before update on public\.user_notes/i);
  assert.match(sql, /create trigger set_updated_at_user_feedback before update on public\.user_feedback/i);

  assert.match(sql, /drop policy if exists "user_profiles_select_own" on public\.user_profiles/i);
  assert.match(sql, /create policy "user_profiles_select_own" on public\.user_profiles for select using \(auth\.uid\(\) = user_id\)/i);
  assert.match(sql, /drop policy if exists "user_profiles_insert_own" on public\.user_profiles/i);
  assert.match(sql, /create policy "user_profiles_insert_own" on public\.user_profiles for insert with check \(auth\.uid\(\) = user_id\)/i);
  assert.match(sql, /drop policy if exists "user_profiles_update_own" on public\.user_profiles/i);
  assert.match(sql, /create policy "user_profiles_update_own" on public\.user_profiles for update using \(auth\.uid\(\) = user_id\) with check \(auth\.uid\(\) = user_id\)/i);
  assert.doesNotMatch(sql, /create policy "user_profiles_delete_own"/i);

  assert.match(sql, /drop policy if exists "user_topic_preferences_select_own" on public\.user_topic_preferences/i);
  assert.match(sql, /create policy "user_topic_preferences_select_own" on public\.user_topic_preferences for select using \(auth\.uid\(\) = user_id\)/i);
  assert.match(sql, /drop policy if exists "user_topic_preferences_insert_own" on public\.user_topic_preferences/i);
  assert.match(sql, /create policy "user_topic_preferences_insert_own" on public\.user_topic_preferences for insert with check \(auth\.uid\(\) = user_id\)/i);
  assert.match(sql, /drop policy if exists "user_topic_preferences_update_own" on public\.user_topic_preferences/i);
  assert.match(sql, /create policy "user_topic_preferences_update_own" on public\.user_topic_preferences for update using \(auth\.uid\(\) = user_id\) with check \(auth\.uid\(\) = user_id\)/i);
  assert.match(sql, /drop policy if exists "user_topic_preferences_delete_own" on public\.user_topic_preferences/i);
  assert.match(sql, /create policy "user_topic_preferences_delete_own" on public\.user_topic_preferences for delete using \(auth\.uid\(\) = user_id\)/i);

  assert.match(sql, /drop policy if exists "user_saved_items_select_own" on public\.user_saved_items/i);
  assert.match(sql, /create policy "user_saved_items_select_own" on public\.user_saved_items for select using \(auth\.uid\(\) = user_id\)/i);
  assert.match(sql, /drop policy if exists "user_saved_items_insert_own" on public\.user_saved_items/i);
  assert.match(sql, /create policy "user_saved_items_insert_own" on public\.user_saved_items for insert with check \(auth\.uid\(\) = user_id\)/i);
  assert.match(sql, /drop policy if exists "user_saved_items_update_own" on public\.user_saved_items/i);
  assert.match(sql, /create policy "user_saved_items_update_own" on public\.user_saved_items for update using \(auth\.uid\(\) = user_id\) with check \(auth\.uid\(\) = user_id\)/i);
  assert.match(sql, /drop policy if exists "user_saved_items_delete_own" on public\.user_saved_items/i);
  assert.match(sql, /create policy "user_saved_items_delete_own" on public\.user_saved_items for delete using \(auth\.uid\(\) = user_id\)/i);

  assert.match(sql, /drop policy if exists "user_watchlist_items_select_own" on public\.user_watchlist_items/i);
  assert.match(sql, /create policy "user_watchlist_items_select_own" on public\.user_watchlist_items for select using \(auth\.uid\(\) = user_id\)/i);
  assert.match(sql, /drop policy if exists "user_watchlist_items_insert_own" on public\.user_watchlist_items/i);
  assert.match(sql, /create policy "user_watchlist_items_insert_own" on public\.user_watchlist_items for insert with check \(auth\.uid\(\) = user_id\)/i);
  assert.match(sql, /drop policy if exists "user_watchlist_items_update_own" on public\.user_watchlist_items/i);
  assert.match(sql, /create policy "user_watchlist_items_update_own" on public\.user_watchlist_items for update using \(auth\.uid\(\) = user_id\) with check \(auth\.uid\(\) = user_id\)/i);
  assert.match(sql, /drop policy if exists "user_watchlist_items_delete_own" on public\.user_watchlist_items/i);
  assert.match(sql, /create policy "user_watchlist_items_delete_own" on public\.user_watchlist_items for delete using \(auth\.uid\(\) = user_id\)/i);

  assert.match(sql, /drop policy if exists "user_notes_select_own" on public\.user_notes/i);
  assert.match(sql, /create policy "user_notes_select_own" on public\.user_notes for select using \(auth\.uid\(\) = user_id\)/i);
  assert.match(sql, /drop policy if exists "user_notes_insert_own" on public\.user_notes/i);
  assert.match(sql, /create policy "user_notes_insert_own" on public\.user_notes for insert with check \(auth\.uid\(\) = user_id\)/i);
  assert.match(sql, /drop policy if exists "user_notes_update_own" on public\.user_notes/i);
  assert.match(sql, /create policy "user_notes_update_own" on public\.user_notes for update using \(auth\.uid\(\) = user_id\) with check \(auth\.uid\(\) = user_id\)/i);
  assert.match(sql, /drop policy if exists "user_notes_delete_own" on public\.user_notes/i);
  assert.match(sql, /create policy "user_notes_delete_own" on public\.user_notes for delete using \(auth\.uid\(\) = user_id\)/i);

  assert.match(sql, /drop policy if exists "user_feedback_select_own" on public\.user_feedback/i);
  assert.match(sql, /create policy "user_feedback_select_own" on public\.user_feedback for select using \(auth\.uid\(\) = user_id\)/i);
  assert.match(sql, /drop policy if exists "user_feedback_insert_own" on public\.user_feedback/i);
  assert.match(sql, /create policy "user_feedback_insert_own" on public\.user_feedback for insert with check \(auth\.uid\(\) = user_id\)/i);
  assert.match(sql, /drop policy if exists "user_feedback_update_own" on public\.user_feedback/i);
  assert.match(sql, /create policy "user_feedback_update_own" on public\.user_feedback for update using \(auth\.uid\(\) = user_id\) with check \(auth\.uid\(\) = user_id\)/i);
  assert.match(sql, /drop policy if exists "user_feedback_delete_own" on public\.user_feedback/i);
  assert.match(sql, /create policy "user_feedback_delete_own" on public\.user_feedback for delete using \(auth\.uid\(\) = user_id\)/i);

  assert.match(sql, /drop policy if exists "canonical_topics_select_authenticated" on public\.canonical_topics/i);
  assert.match(sql, /create policy "canonical_topics_select_authenticated" on public\.canonical_topics\s+for select to authenticated using \(true\)/i);

  assert.match(sql, /custom_topic_label_normalized text null/i);
  assert.match(
    sql,
    /nullif\(btrim\(custom_topic_label_normalized\), ''\) is not null/i,
  );
  assert.match(
    sql,
    /create unique index if not exists user_topic_preferences_user_preference_canonical_idx\s+on public\.user_topic_preferences \(user_id, preference_type, topic_id\)\s+where topic_kind = 'canonical'/i,
  );
  assert.match(
    sql,
    /create unique index if not exists user_topic_preferences_user_preference_custom_idx\s+on public\.user_topic_preferences \(user_id, preference_type, custom_topic_label_normalized\)\s+where topic_kind = 'custom'/i,
  );

  assert.match(sql, /create unique index if not exists user_saved_items_user_target_idx/i);
  assert.match(sql, /create unique index if not exists user_watchlist_items_user_entity_idx/i);
  assert.match(sql, /create unique index if not exists user_notes_user_target_idx/i);
  assert.match(sql, /create unique index if not exists user_feedback_user_target_idx/i);
});
