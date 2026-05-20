-- Manual-only Phase 4 preview read policies.
-- Run this only in a non-production environment after:
-- 1. 202605170001_phase4_content_foundation.sql
-- 2. 202605060002_seed_canonical_topics.sql (if canonical_topics is empty)
-- 3. phase4_content_sources_smoke_seed.sql (optional but recommended for smoke tests)
--
-- Purpose:
-- - allow read-only Today preview access through the frontend publishable key
-- - keep writes server-side only
-- - scope preview content to non-failed candidate/draft style signal rows

alter table public.intelligence_signals enable row level security;
alter table public.signal_source_items enable row level security;
alter table public.raw_source_items enable row level security;
alter table public.signal_entities enable row level security;
alter table public.signal_topics enable row level security;
alter table public.content_entities enable row level security;
alter table public.canonical_topics enable row level security;

drop policy if exists "intelligence_signals_select_preview_public" on public.intelligence_signals;
create policy "intelligence_signals_select_preview_public" on public.intelligence_signals
  for select
  to anon, authenticated
  using (
    lifecycle_stage in ('candidate_preview', 'candidate', 'draft')
    and (
      generation_status is null
      or generation_status::text <> 'failed'
    )
  );

drop policy if exists "signal_source_items_select_preview_public" on public.signal_source_items;
create policy "signal_source_items_select_preview_public" on public.signal_source_items
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.intelligence_signals signals
      where signals.id = signal_source_items.signal_id
        and signals.lifecycle_stage in ('candidate_preview', 'candidate', 'draft')
        and (
          signals.generation_status is null
          or signals.generation_status::text <> 'failed'
        )
    )
  );

drop policy if exists "raw_source_items_select_preview_public" on public.raw_source_items;
create policy "raw_source_items_select_preview_public" on public.raw_source_items
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.signal_source_items signal_links
      join public.intelligence_signals signals
        on signals.id = signal_links.signal_id
      where signal_links.raw_source_item_id = raw_source_items.id
        and signals.lifecycle_stage in ('candidate_preview', 'candidate', 'draft')
        and (
          signals.generation_status is null
          or signals.generation_status::text <> 'failed'
        )
    )
  );

drop policy if exists "signal_entities_select_preview_public" on public.signal_entities;
create policy "signal_entities_select_preview_public" on public.signal_entities
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.intelligence_signals signals
      where signals.id = signal_entities.signal_id
        and signals.lifecycle_stage in ('candidate_preview', 'candidate', 'draft')
        and (
          signals.generation_status is null
          or signals.generation_status::text <> 'failed'
        )
    )
  );

drop policy if exists "content_entities_select_preview_public" on public.content_entities;
create policy "content_entities_select_preview_public" on public.content_entities
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.signal_entities signal_entity_links
      join public.intelligence_signals signals
        on signals.id = signal_entity_links.signal_id
      where signal_entity_links.entity_id = content_entities.id
        and signals.lifecycle_stage in ('candidate_preview', 'candidate', 'draft')
        and (
          signals.generation_status is null
          or signals.generation_status::text <> 'failed'
        )
    )
  );

drop policy if exists "signal_topics_select_preview_public" on public.signal_topics;
create policy "signal_topics_select_preview_public" on public.signal_topics
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.intelligence_signals signals
      where signals.id = signal_topics.signal_id
        and signals.lifecycle_stage in ('candidate_preview', 'candidate', 'draft')
        and (
          signals.generation_status is null
          or signals.generation_status::text <> 'failed'
        )
    )
  );

drop policy if exists "canonical_topics_select_preview_public" on public.canonical_topics;
create policy "canonical_topics_select_preview_public" on public.canonical_topics
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.signal_topics signal_topic_links
      join public.intelligence_signals signals
        on signals.id = signal_topic_links.signal_id
      where signal_topic_links.topic_id = canonical_topics.id
        and signals.lifecycle_stage in ('candidate_preview', 'candidate', 'draft')
        and (
          signals.generation_status is null
          or signals.generation_status::text <> 'failed'
        )
    )
  );
