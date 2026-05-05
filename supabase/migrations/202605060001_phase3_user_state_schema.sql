create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'category_key_enum') then
    create type category_key_enum as enum (
      'ai','crypto','stocks','robotics','energy',
      'us_policy','china_policy','australia_policy','macro','geopolitics'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'reading_mode_enum') then
    create type reading_mode_enum as enum ('Chinese Only','Bilingual','Original');
  end if;
  if not exists (select 1 from pg_type where typname = 'translation_style_enum') then
    create type translation_style_enum as enum (
      'Professional Analysis','Simple Chinese','Accurate Translation','Student-Friendly Explanation'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'topic_preference_type_enum') then
    create type topic_preference_type_enum as enum ('followed','muted');
  end if;
  if not exists (select 1 from pg_type where typname = 'topic_kind_enum') then
    create type topic_kind_enum as enum ('canonical','custom');
  end if;
  if not exists (select 1 from pg_type where typname = 'saved_item_target_type_enum') then
    create type saved_item_target_type_enum as enum ('signal','library_item','topic','watchlist_item');
  end if;
  if not exists (select 1 from pg_type where typname = 'feedback_type_enum') then
    create type feedback_type_enum as enum ('useful','not_useful');
  end if;
end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  onboarding_completed boolean not null default false,
  reading_mode reading_mode_enum not null default 'Bilingual',
  translation_style translation_style_enum not null default 'Professional Analysis',
  core_domains category_key_enum[] not null default array['ai','energy']::category_key_enum[],
  critical_alerts boolean not null default true,
  dark_mode boolean not null default true,
  local_schema_version smallint not null default 2,
  local_v2_migrated_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.canonical_topics (
  id text primary key,
  category_key category_key_enum not null,
  name text not null,
  aliases text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_topic_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  preference_type topic_preference_type_enum not null,
  topic_kind topic_kind_enum not null,
  topic_id text null references public.canonical_topics(id),
  custom_topic_label text null,
  custom_topic_label_normalized text null,
  source text null check (source in ('legacy_localStorage','user_created')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_topic_preferences_topic_shape_check check (
    (topic_kind = 'canonical' and topic_id is not null and custom_topic_label is null)
    or
    (topic_kind = 'custom' and topic_id is null and custom_topic_label is not null)
  )
);

create table if not exists public.user_saved_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  target_type saved_item_target_type_enum not null,
  target_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_watchlist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entity_id text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  target_type saved_item_target_type_enum not null,
  target_id text not null,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  target_type saved_item_target_type_enum not null,
  target_id text not null,
  feedback_type feedback_type_enum not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists user_saved_items_user_target_idx
  on public.user_saved_items (user_id, target_type, target_id);
create unique index if not exists user_watchlist_items_user_entity_idx
  on public.user_watchlist_items (user_id, entity_id);
create unique index if not exists user_notes_user_target_idx
  on public.user_notes (user_id, target_type, target_id);
create unique index if not exists user_feedback_user_target_idx
  on public.user_feedback (user_id, target_type, target_id);
create index if not exists user_watchlist_items_user_sort_idx
  on public.user_watchlist_items (user_id, sort_order);
create index if not exists user_topic_preferences_user_updated_idx
  on public.user_topic_preferences (user_id, updated_at desc);
create index if not exists user_saved_items_user_updated_idx
  on public.user_saved_items (user_id, updated_at desc);

drop trigger if exists set_updated_at_user_profiles on public.user_profiles;
create trigger set_updated_at_user_profiles before update on public.user_profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_canonical_topics on public.canonical_topics;
create trigger set_updated_at_canonical_topics before update on public.canonical_topics
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_user_topic_preferences on public.user_topic_preferences;
create trigger set_updated_at_user_topic_preferences before update on public.user_topic_preferences
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_user_saved_items on public.user_saved_items;
create trigger set_updated_at_user_saved_items before update on public.user_saved_items
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_user_watchlist_items on public.user_watchlist_items;
create trigger set_updated_at_user_watchlist_items before update on public.user_watchlist_items
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_user_notes on public.user_notes;
create trigger set_updated_at_user_notes before update on public.user_notes
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_user_feedback on public.user_feedback;
create trigger set_updated_at_user_feedback before update on public.user_feedback
for each row execute function public.set_updated_at();

alter table public.user_profiles enable row level security;
alter table public.user_topic_preferences enable row level security;
alter table public.user_saved_items enable row level security;
alter table public.user_watchlist_items enable row level security;
alter table public.user_notes enable row level security;
alter table public.user_feedback enable row level security;
alter table public.canonical_topics enable row level security;

create policy "user_profiles_select_own" on public.user_profiles for select using (auth.uid() = user_id);
create policy "user_profiles_insert_own" on public.user_profiles for insert with check (auth.uid() = user_id);
create policy "user_profiles_update_own" on public.user_profiles for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "user_topic_preferences_select_own" on public.user_topic_preferences for select using (auth.uid() = user_id);
create policy "user_topic_preferences_insert_own" on public.user_topic_preferences for insert with check (auth.uid() = user_id);
create policy "user_topic_preferences_update_own" on public.user_topic_preferences for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "user_topic_preferences_delete_own" on public.user_topic_preferences for delete using (auth.uid() = user_id);

create policy "user_saved_items_select_own" on public.user_saved_items for select using (auth.uid() = user_id);
create policy "user_saved_items_insert_own" on public.user_saved_items for insert with check (auth.uid() = user_id);
create policy "user_saved_items_update_own" on public.user_saved_items for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "user_saved_items_delete_own" on public.user_saved_items for delete using (auth.uid() = user_id);

create policy "user_watchlist_items_select_own" on public.user_watchlist_items for select using (auth.uid() = user_id);
create policy "user_watchlist_items_insert_own" on public.user_watchlist_items for insert with check (auth.uid() = user_id);
create policy "user_watchlist_items_update_own" on public.user_watchlist_items for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "user_watchlist_items_delete_own" on public.user_watchlist_items for delete using (auth.uid() = user_id);

create policy "user_notes_select_own" on public.user_notes for select using (auth.uid() = user_id);
create policy "user_notes_insert_own" on public.user_notes for insert with check (auth.uid() = user_id);
create policy "user_notes_update_own" on public.user_notes for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "user_notes_delete_own" on public.user_notes for delete using (auth.uid() = user_id);

create policy "user_feedback_select_own" on public.user_feedback for select using (auth.uid() = user_id);
create policy "user_feedback_insert_own" on public.user_feedback for insert with check (auth.uid() = user_id);
create policy "user_feedback_update_own" on public.user_feedback for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "user_feedback_delete_own" on public.user_feedback for delete using (auth.uid() = user_id);

create policy "canonical_topics_select_authenticated" on public.canonical_topics
for select to authenticated using (true);
