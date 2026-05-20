-- Manual Phase 4 readiness checks.
-- Expected state for Task 7:
-- - canonical_topics row security remains enabled with its Phase 3 authenticated read policy
-- - Phase 4 content tables exist, but do not yet ship client-facing RLS/policy rollout
-- - the smoke-test content_sources subset has been inserted manually

select
  table_name,
  case when table_name is null then false else true end as table_exists
from unnest(
  array[
    'content_sources',
    'content_ingestion_runs',
    'raw_source_items',
    'content_entities',
    'raw_source_item_entities',
    'intelligence_signals',
    'signal_source_items',
    'signal_entities',
    'signal_topics',
    'signal_translation_blocks'
  ]::text[]
) as expected(table_name)
left join information_schema.tables tables
  on tables.table_schema = 'public'
 and tables.table_name = expected.table_name
order by expected.table_name;

select
  id,
  category_key,
  feed_url,
  active
from public.content_sources
where id in (
  'rss_openai_blog_ai',
  'rss_yahoo_finance_markets',
  'rss_coindesk_crypto',
  'rss_white_house_briefing'
)
order by id;

select
  count(*) as canonical_topics_row_count
from public.canonical_topics;

select
  indexname,
  indexdef
from pg_indexes
where schemaname = 'public'
  and indexname in (
    'raw_source_items_source_external_id_idx',
    'raw_source_items_canonical_url_hash_idx',
    'raw_source_items_title_hash_idx',
    'raw_source_items_content_hash_idx',
    'raw_source_items_source_published_at_idx',
    'raw_source_items_published_at_idx',
    'intelligence_signals_candidate_key_idx',
    'intelligence_signals_primary_category_idx',
    'intelligence_signals_overall_score_idx',
    'signal_source_items_one_primary_per_signal_idx'
  )
order by indexname;

select
  cls.relname as table_name,
  cls.relrowsecurity as row_security
from pg_class cls
join pg_namespace ns
  on ns.oid = cls.relnamespace
where ns.nspname = 'public'
  and cls.relname in (
    'canonical_topics',
    'content_sources',
    'content_ingestion_runs',
    'raw_source_items',
    'content_entities',
    'raw_source_item_entities',
    'intelligence_signals',
    'signal_source_items',
    'signal_entities',
    'signal_topics',
    'signal_translation_blocks'
  )
order by cls.relname;

select
  tablename,
  policyname,
  permissive,
  roles,
  cmd
from pg_policies
where schemaname = 'public'
  and tablename in (
    'canonical_topics',
    'content_sources',
    'content_ingestion_runs',
    'raw_source_items',
    'content_entities',
    'raw_source_item_entities',
    'intelligence_signals',
    'signal_source_items',
    'signal_entities',
    'signal_topics',
    'signal_translation_blocks'
  )
order by tablename, policyname;
