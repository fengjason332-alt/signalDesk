import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const migrationPath = resolve(
  process.cwd(),
  'supabase/migrations/202605170001_phase4_content_foundation.sql',
);

test('phase 4 content foundation draft defines the expected additive content tables', () => {
  const sql = readFileSync(migrationPath, 'utf8');

  assert.match(sql, /create table if not exists public\.content_sources/i);
  assert.match(sql, /create table if not exists public\.content_ingestion_runs/i);
  assert.match(sql, /create table if not exists public\.raw_source_items/i);
  assert.match(sql, /create table if not exists public\.content_entities/i);
  assert.match(sql, /create table if not exists public\.raw_source_item_entities/i);
  assert.match(sql, /create table if not exists public\.intelligence_signals/i);
  assert.match(sql, /create table if not exists public\.signal_source_items/i);
  assert.match(sql, /create table if not exists public\.signal_entities/i);
  assert.match(sql, /create table if not exists public\.signal_topics/i);
  assert.match(sql, /create table if not exists public\.signal_translation_blocks/i);

  assert.match(sql, /create type content_source_type_enum as enum \('rss','api','manual'\)/i);
  assert.match(
    sql,
    /create type source_reliability_tier_enum as enum \('official','tier_1','specialist','aggregator'\)/i,
  );
  assert.match(
    sql,
    /create type ingestion_status_enum as enum \('queued','fetched','normalized','deduplicated','processed','failed'\)/i,
  );
  assert.match(sql, /create type content_language_enum as enum \('en','zh','mixed','unknown'\)/i);
  assert.match(
    sql,
    /create type content_entity_type_enum as enum \('company','organization','person','policy','asset','country','topic','macro_indicator'\)/i,
  );
  assert.match(
    sql,
    /create type signal_translation_block_kind_enum as enum \('headline','summary','analysis','bullet','quote'\)/i,
  );

  assert.match(sql, /canonical_url_hash text not null/i);
  assert.match(sql, /content_hash text not null/i);
  assert.match(sql, /candidate_key text not null/i);
  assert.match(sql, /lifecycle_stage text not null/i);
  assert.match(sql, /deterministic_seed_version text not null/i);
  assert.match(sql, /recency_score integer not null/i);
  assert.match(sql, /entity_importance_score integer not null/i);
  assert.match(sql, /topic_relevance_score integer not null/i);
  assert.match(sql, /source_count_score integer not null/i);
  assert.match(sql, /duplicate_confidence_score integer not null/i);
  assert.match(sql, /overall_score integer not null/i);
  assert.match(sql, /translated_text text null/i);
  assert.match(sql, /create unique index if not exists raw_source_items_source_external_id_idx/i);
  assert.match(sql, /create unique index if not exists raw_source_items_canonical_url_hash_idx/i);
  assert.match(sql, /create index if not exists raw_source_items_title_hash_idx/i);
  assert.match(sql, /create unique index if not exists intelligence_signals_candidate_key_idx/i);
  assert.match(sql, /create index if not exists raw_source_items_source_published_at_idx/i);
  assert.match(sql, /is_primary boolean not null default false/i);
  assert.match(sql, /create unique index if not exists signal_source_items_one_primary_per_signal_idx/i);
  assert.match(sql, /mention_count integer not null default 1/i);
  assert.match(sql, /signal_topics[\s\S]*relevance_score integer not null default 0/i);

  assert.doesNotMatch(sql, /create table if not exists public\.user_profiles/i);
  assert.doesNotMatch(sql, /create table if not exists public\.user_topic_preferences/i);
  assert.doesNotMatch(sql, /create table if not exists public\.user_saved_items/i);
  assert.doesNotMatch(sql, /create table if not exists public\.user_watchlist_items/i);
  assert.doesNotMatch(sql, /create table if not exists public\.user_notes/i);
  assert.doesNotMatch(sql, /create table if not exists public\.user_feedback/i);
  assert.doesNotMatch(sql, /enable row level security/i);
});
