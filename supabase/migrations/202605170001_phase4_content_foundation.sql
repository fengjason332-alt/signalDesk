do $$
begin
  if not exists (select 1 from pg_type where typname = 'content_source_type_enum') then
    create type content_source_type_enum as enum ('rss','api','manual');
  end if;
  if not exists (select 1 from pg_type where typname = 'source_reliability_tier_enum') then
    create type source_reliability_tier_enum as enum ('official','tier_1','specialist','aggregator');
  end if;
  if not exists (select 1 from pg_type where typname = 'ingestion_status_enum') then
    create type ingestion_status_enum as enum ('queued','fetched','normalized','deduplicated','processed','failed');
  end if;
  if not exists (select 1 from pg_type where typname = 'ingestion_run_status_enum') then
    create type ingestion_run_status_enum as enum ('running','succeeded','partial','failed');
  end if;
  if not exists (select 1 from pg_type where typname = 'content_language_enum') then
    create type content_language_enum as enum ('en','zh','mixed','unknown');
  end if;
  if not exists (select 1 from pg_type where typname = 'content_entity_type_enum') then
    create type content_entity_type_enum as enum ('company','organization','person','policy','asset','country','topic','macro_indicator');
  end if;
  if not exists (select 1 from pg_type where typname = 'signal_generation_status_enum') then
    create type signal_generation_status_enum as enum ('pending','generated','reviewed','failed');
  end if;
  if not exists (select 1 from pg_type where typname = 'signal_translation_block_kind_enum') then
    create type signal_translation_block_kind_enum as enum ('headline','summary','analysis','bullet','quote');
  end if;
  if not exists (select 1 from pg_type where typname = 'translation_status_enum') then
    create type translation_status_enum as enum ('pending','completed','failed');
  end if;
end $$;

create table if not exists public.content_sources (
  id text primary key,
  name text not null,
  source_type content_source_type_enum not null,
  category_key category_key_enum not null,
  publisher text not null,
  base_url text null,
  feed_url text null,
  reliability_tier source_reliability_tier_enum not null,
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.content_ingestion_runs (
  id uuid primary key default gen_random_uuid(),
  source_id text not null references public.content_sources(id) on delete cascade,
  run_status ingestion_run_status_enum not null default 'running',
  started_at timestamptz not null default now(),
  completed_at timestamptz null,
  fetched_count integer not null default 0,
  inserted_count integer not null default 0,
  skipped_count integer not null default 0,
  failed_count integer not null default 0,
  error_summary text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.raw_source_items (
  id uuid primary key default gen_random_uuid(),
  source_id text not null references public.content_sources(id) on delete cascade,
  ingestion_run_id uuid null references public.content_ingestion_runs(id) on delete set null,
  external_id text null,
  canonical_url text not null,
  title text not null,
  dek text null,
  author text null,
  published_at timestamptz not null,
  discovered_at timestamptz not null default now(),
  language content_language_enum not null default 'unknown',
  category_keys category_key_enum[] not null default '{}'::category_key_enum[],
  raw_html text null,
  raw_text text null,
  normalized_text text null,
  title_hash text not null,
  canonical_url_hash text not null,
  content_hash text not null,
  ingestion_status ingestion_status_enum not null default 'queued',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists raw_source_items_source_external_id_idx
  on public.raw_source_items (source_id, external_id)
  where external_id is not null;
create unique index if not exists raw_source_items_canonical_url_hash_idx
  on public.raw_source_items (canonical_url_hash);
create index if not exists raw_source_items_title_hash_idx
  on public.raw_source_items (title_hash);
create index if not exists raw_source_items_content_hash_idx
  on public.raw_source_items (content_hash);
create index if not exists raw_source_items_source_published_at_idx
  on public.raw_source_items (source_id, published_at desc);
create index if not exists raw_source_items_published_at_idx
  on public.raw_source_items (published_at desc);

create table if not exists public.content_entities (
  id text primary key,
  canonical_name text not null,
  entity_type content_entity_type_enum not null,
  aliases text[] not null default '{}',
  ticker text null,
  country_code text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.raw_source_item_entities (
  id uuid primary key default gen_random_uuid(),
  raw_source_item_id uuid not null references public.raw_source_items(id) on delete cascade,
  entity_id text not null references public.content_entities(id) on delete cascade,
  match_text text not null,
  confidence_score integer not null default 0,
  created_at timestamptz not null default now(),
  unique (raw_source_item_id, entity_id)
);

create table if not exists public.intelligence_signals (
  id uuid primary key default gen_random_uuid(),
  candidate_key text not null,
  lifecycle_stage text not null default 'candidate'
    check (lifecycle_stage in ('candidate', 'draft')),
  deterministic_seed_version text not null default 'phase4_det_v1',
  primary_category category_key_enum not null,
  categories category_key_enum[] not null default '{}'::category_key_enum[],
  headline_en text not null,
  headline_zh text null,
  summary_en text not null,
  summary_zh text null,
  why_it_matters_en text[] not null default '{}',
  why_it_matters_zh text[] not null default '{}',
  primary_source_name text not null,
  primary_source_item_id uuid null references public.raw_source_items(id) on delete set null,
  source_item_count integer not null default 1,
  published_at timestamptz not null,
  generated_at timestamptz not null default now(),
  generation_status signal_generation_status_enum not null default 'pending',
  tags text[] not null default '{}',
  importance_score integer not null default 0,
  urgency_score integer not null default 0,
  confidence_score integer not null default 0,
  relevance_score integer not null default 0,
  source_reliability_score integer not null default 0,
  recency_score integer not null default 0,
  entity_importance_score integer not null default 0,
  topic_relevance_score integer not null default 0,
  source_count_score integer not null default 0,
  duplicate_confidence_score integer not null default 0,
  overall_score integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint intelligence_signals_score_bounds_check check (
    importance_score between 0 and 100
    and urgency_score between 0 and 100
    and confidence_score between 0 and 100
    and relevance_score between 0 and 100
    and source_reliability_score between 0 and 100
    and recency_score between 0 and 100
    and entity_importance_score between 0 and 100
    and topic_relevance_score between 0 and 100
    and source_count_score between 0 and 100
    and duplicate_confidence_score between 0 and 100
    and overall_score between 0 and 100
  )
);

create unique index if not exists intelligence_signals_candidate_key_idx
  on public.intelligence_signals (candidate_key);
create index if not exists intelligence_signals_primary_category_idx
  on public.intelligence_signals (primary_category, published_at desc);
create index if not exists intelligence_signals_overall_score_idx
  on public.intelligence_signals (overall_score desc, published_at desc);

create table if not exists public.signal_source_items (
  signal_id uuid not null references public.intelligence_signals(id) on delete cascade,
  raw_source_item_id uuid not null references public.raw_source_items(id) on delete cascade,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (signal_id, raw_source_item_id)
);

create unique index if not exists signal_source_items_one_primary_per_signal_idx
  on public.signal_source_items (signal_id)
  where is_primary = true;

create table if not exists public.signal_entities (
  signal_id uuid not null references public.intelligence_signals(id) on delete cascade,
  entity_id text not null references public.content_entities(id) on delete cascade,
  relevance_score integer not null default 0,
  mention_count integer not null default 1,
  created_at timestamptz not null default now(),
  primary key (signal_id, entity_id)
);

create table if not exists public.signal_topics (
  signal_id uuid not null references public.intelligence_signals(id) on delete cascade,
  topic_id text not null references public.canonical_topics(id) on delete cascade,
  relevance_score integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (signal_id, topic_id)
);

create table if not exists public.signal_translation_blocks (
  id uuid primary key default gen_random_uuid(),
  signal_id uuid not null references public.intelligence_signals(id) on delete cascade,
  block_order integer not null,
  block_kind signal_translation_block_kind_enum not null,
  source_language content_language_enum not null,
  target_language content_language_enum not null,
  original_text text not null,
  translated_text text null,
  translation_status translation_status_enum not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (signal_id, block_order, block_kind, target_language)
);
