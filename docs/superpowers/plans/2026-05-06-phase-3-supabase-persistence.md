# Phase 3 Supabase Persistence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add account-level Supabase persistence for SignalDesk user state while preserving the current local-first UX, V2 local schema compatibility, and frontend-only mock content model.

**Architecture:** Keep SignalDesk content fixtures in local mock data for Phase 3 and sync only user state to Supabase. Use the existing `PersistedUserStateV2` shape as the application contract, then add mapper/merge layers that translate between the V2 snapshot and normalized Supabase tables. Keep the app local-first: hydrate local V2 immediately, authenticate when available, fetch remote user state, merge by `updated_at`, then continue syncing every persisted mutation with immediate local writes plus debounced remote writes. For collection tables, use a simple replace-user-collection strategy after merge: upsert the current local rows, then delete remote rows for that user that are no longer present locally.

**Tech Stack:** React 19, TypeScript, Vite 6, Supabase Auth, Supabase Postgres, Row Level Security, local `node:test` via `tsx`

---

## Planning Notes

- `docs/PRD.md` was requested in discovery but is not present in the current repository. This is not a blocker for Phase 3 persistence. This plan is based on [AGENTS.md](/Users/jasonfeng/Desktop/project3_signalDESK/signaldesk/AGENTS.md), [PROJECT_CONTEXT.md](/Users/jasonfeng/Desktop/project3_signalDESK/signaldesk/PROJECT_CONTEXT.md), [ROADMAP.md](/Users/jasonfeng/Desktop/project3_signalDESK/signaldesk/ROADMAP.md), and the current V2 persistence implementation in [src/types.ts](/Users/jasonfeng/Desktop/project3_signalDESK/signaldesk/src/types.ts), [src/storage.ts](/Users/jasonfeng/Desktop/project3_signalDESK/signaldesk/src/storage.ts), [src/AppContext.tsx](/Users/jasonfeng/Desktop/project3_signalDESK/signaldesk/src/AppContext.tsx), and [src/topicRegistry.ts](/Users/jasonfeng/Desktop/project3_signalDESK/signaldesk/src/topicRegistry.ts).
- Phase 3 does **not** move `MOCK_SIGNALS`, `MOCK_TOPICS`, `MOCK_LIBRARY`, or `MOCK_WATCHLIST` content into Supabase. It only syncs user state.
- Keep the current dark dotted-grid UI and mobile-first behavior unchanged except for minimal Settings auth/sync controls.
- If Supabase env vars are missing, the app must stay in local-only mode and never crash on boot.

## Target File Structure

**Create**
- `supabase/migrations/202605060001_phase3_user_state_schema.sql`
- `supabase/migrations/202605060002_seed_canonical_topics.sql`
- `src/supabaseSchema.test.ts`
- `src/canonicalTopicsSeed.test.ts`
- `src/lib/persistence/mergeUserState.ts`
- `src/mergeUserState.test.ts`
- `src/lib/persistence/userStateMapper.ts`
- `src/lib/persistence/supabaseUserStateStore.ts`
- `src/supabaseUserState.test.ts`
- `src/lib/supabase/client.ts`
- `src/lib/auth/AuthContext.tsx`
- `src/lib/persistence/syncDecisions.ts`
- `src/userStateSync.test.ts`
- `src/supabaseClientConfig.test.ts`
- `.env.example`
- `docs/PRD.md`

**Modify**
- `src/types.ts`
- `src/storage.ts`
- `src/AppContext.tsx`
- `src/App.tsx`
- `src/main.tsx`
- `src/vite-env.d.ts`
- `src/views/SettingsView.tsx`

## Supabase Schema Snapshot

### Tables
- `public.user_profiles`
- `public.canonical_topics`
- `public.user_topic_preferences`
- `public.user_saved_items`
- `public.user_watchlist_items`
- `public.user_notes`
- `public.user_feedback`

### Key constraints
- Every `user_*` table has `user_id uuid not null references auth.users(id) on delete cascade`
- Unique keys:
  - `user_saved_items (user_id, target_type, target_id)`
  - `user_watchlist_items (user_id, entity_id)`
  - `user_notes (user_id, target_type, target_id)`
  - `user_feedback (user_id, target_type, target_id)`
- `user_topic_preferences` enforces:
  - canonical rows: `topic_id is not null`
  - custom rows: `custom_topic_label is not null`

### RLS strategy
- Enable RLS on every `user_*` table
- `user_profiles` gets three policies:
  - `select own row`
  - `insert own row`
  - `update own row`
- Collection tables get four policies:
  - `select own rows`
  - `insert own rows`
  - `update own rows`
  - `delete own rows`
- Policy body: `auth.uid() = user_id`
- `canonical_topics` is read-only to authenticated users; writes are service-role-only via migration/seed

### Auth strategy
- Supabase Auth magic-link / OTP email sign-in
- Unauthenticated users continue using local V2 only
- Authenticated users use merged local + remote state
- If `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` is missing, the app stays in local-only mode and Settings shows `Sync not configured`

### Sync strategy
- Initial login hydration:
  - hydrate local V2
  - load remote user state if Supabase is configured and a session exists
  - merge local and remote by `updated_at`
  - write merged state back to local immediately
  - persist merged state to remote
- Ongoing sync after initial hydration:
  - every `persistedState` mutation continues to update local state and localStorage immediately
  - if a session exists, debounce remote writes
  - remote collection writes use replace-user-collection semantics to keep deletions from reappearing
- Phase 3 MVP deletion sync:
  - no `deleted_at` tombstones yet
  - after merge, `saveRemoteUserState(userId, state)` upserts current rows and deletes remote rows for that user that are missing locally

---

### Task 1: Create the user-state schema migration with RLS

**Files:**
- Create: `supabase/migrations/202605060001_phase3_user_state_schema.sql`
- Test: `src/supabaseSchema.test.ts`

- [ ] **Step 1: Write the failing schema contract test**

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const migrationPath = resolve(process.cwd(), 'supabase/migrations/202605060001_phase3_user_state_schema.sql');

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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --import tsx --test src/supabaseSchema.test.ts`  
Expected: FAIL with `ENOENT` or missing migration file assertions

- [ ] **Step 3: Write the schema migration**

```sql
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --import tsx --test src/supabaseSchema.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/202605060001_phase3_user_state_schema.sql src/supabaseSchema.test.ts
git commit -m "feat: add supabase user state schema and rls"
```

### Task 2: Seed canonical topics from the V2 topic registry

**Files:**
- Create: `supabase/migrations/202605060002_seed_canonical_topics.sql`
- Test: `src/canonicalTopicsSeed.test.ts`

- [ ] **Step 1: Write the failing seed contract test**

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { CANONICAL_TOPICS } from './topicRegistry';

test('canonical topic seed migration includes every topic registry id', () => {
  const sql = readFileSync(
    resolve(process.cwd(), 'supabase/migrations/202605060002_seed_canonical_topics.sql'),
    'utf8',
  );

  for (const topic of CANONICAL_TOPICS) {
    assert.match(sql, new RegExp(topic.id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.match(sql, new RegExp(topic.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --import tsx --test src/canonicalTopicsSeed.test.ts`  
Expected: FAIL with `ENOENT` or missing topic ids

- [ ] **Step 3: Write the canonical topic seed migration**

```sql
insert into public.canonical_topics (id, category_key, name, aliases)
values
  ('topic_ai_data_center_power', 'ai', 'AI Data Center Power Demand', array['AI Data Center Power Demand','data center power','AI power demand']),
  ('topic_nuclear_energy', 'energy', 'Nuclear Energy', array['Nuclear Energy','nuclear power']),
  ('topic_us_chip_export_controls', 'us_policy', 'US Chip Export Controls', array['US Chip Export Controls','AI chip export controls','chip export controls']),
  ('topic_china_ai_policy', 'china_policy', 'China AI Policy', array['China AI Policy','Chinese AI policy']),
  ('topic_australia_critical_minerals', 'australia_policy', 'Australia Critical Minerals', array['Australia Critical Minerals','critical minerals']),
  ('topic_bitcoin_etf', 'crypto', 'Bitcoin ETF', array['Bitcoin ETF','spot bitcoin etf']),
  ('topic_stablecoin_regulation', 'crypto', 'Stablecoin Regulation', array['Stablecoin Regulation','stablecoin policy']),
  ('topic_humanoid_robotics', 'robotics', 'Humanoid Robotics', array['Humanoid Robotics','humanoid robots']),
  ('topic_ai_agents', 'ai', 'AI Agents', array['AI Agents','agents']),
  ('topic_semiconductor_supply_chain', 'stocks', 'Semiconductor Supply Chain', array['Semiconductor Supply Chain','chip supply chain']),
  ('topic_battery_tech', 'energy', 'Battery Tech', array['Battery Tech','battery technology']),
  ('topic_nvidia_earnings', 'stocks', 'NVIDIA Earnings', array['NVIDIA Earnings','nvidia results']),
  ('topic_ai_regulation', 'us_policy', 'AI Regulation', array['AI Regulation','AI policy'])
on conflict (id) do update
set
  category_key = excluded.category_key,
  name = excluded.name,
  aliases = excluded.aliases,
  is_active = true,
  updated_at = now();
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --import tsx --test src/canonicalTopicsSeed.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/202605060002_seed_canonical_topics.sql src/canonicalTopicsSeed.test.ts
git commit -m "feat: seed canonical topics for persistence"
```

### Task 3: Add pure merge logic for local V2 and remote Supabase state

**Files:**
- Create: `src/lib/persistence/mergeUserState.ts`
- Test: `src/mergeUserState.test.ts`
- Modify: `src/types.ts`

- [ ] **Step 1: Write the failing merge tests**

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { createFreshPersistedStateV2 } from './storage';
import { mergeUserStates } from './lib/persistence/mergeUserState';

test('merge imports local state when remote is empty', () => {
  const local = createFreshPersistedStateV2();
  local.profile.onboarding_completed = true;
  local.saved_items = [
    { target_type: 'signal', target_id: 's1', created_at: '2026-05-06T00:00:00.000Z', updated_at: '2026-05-06T00:00:00.000Z' },
  ];

  const merged = mergeUserStates(local, null);

  assert.equal(merged.profile.onboarding_completed, true);
  assert.deepEqual(merged.saved_items.map(item => item.target_id), ['s1']);
});

test('merge keeps the newest profile by updated_at', () => {
  const local = createFreshPersistedStateV2();
  const remote = createFreshPersistedStateV2();
  local.profile.updated_at = '2026-05-05T00:00:00.000Z';
  remote.profile.updated_at = '2026-05-06T00:00:00.000Z';
  remote.profile.reading_mode = 'Original';

  const merged = mergeUserStates(local, remote);

  assert.equal(merged.profile.reading_mode, 'Original');
});

test('merge de-duplicates saved items and notes by target identity', () => {
  const local = createFreshPersistedStateV2();
  const remote = createFreshPersistedStateV2();
  local.saved_items = [
    { target_type: 'signal', target_id: 's1', created_at: '2026-05-05T00:00:00.000Z', updated_at: '2026-05-05T00:00:00.000Z' },
  ];
  remote.saved_items = [
    { target_type: 'signal', target_id: 's1', created_at: '2026-05-04T00:00:00.000Z', updated_at: '2026-05-06T00:00:00.000Z' },
  ];

  const merged = mergeUserStates(local, remote);

  assert.equal(merged.saved_items.length, 1);
  assert.equal(merged.saved_items[0].updated_at, '2026-05-06T00:00:00.000Z');
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --import tsx --test src/mergeUserState.test.ts`  
Expected: FAIL with `Cannot find module './lib/persistence/mergeUserState'`

- [ ] **Step 3: Implement the merge engine**

```ts
import { PersistedUserStateV2 } from '../../types';
import { createFreshPersistedStateV2 } from '../../storage';

const newerOf = <T extends { updated_at: string }>(left: T, right: T) =>
  new Date(left.updated_at).getTime() >= new Date(right.updated_at).getTime() ? left : right;

const mergeByIdentity = <T>(
  left: T[],
  right: T[],
  getKey: (value: T) => string,
  pickWinner: (left: T, right: T) => T,
) => {
  const merged = new Map<string, T>();
  for (const value of [...left, ...right]) {
    const key = getKey(value);
    const existing = merged.get(key);
    merged.set(key, existing ? pickWinner(existing, value) : value);
  }
  return Array.from(merged.values());
};

export function mergeUserStates(
  localState: PersistedUserStateV2,
  remoteState: PersistedUserStateV2 | null,
): PersistedUserStateV2 {
  if (!remoteState) {
    return localState;
  }

  const merged = createFreshPersistedStateV2();
  merged.profile = newerOf(localState.profile, remoteState.profile);
  merged.topic_preferences = mergeByIdentity(
    localState.topic_preferences,
    remoteState.topic_preferences,
    record =>
      record.topic_kind === 'canonical'
        ? `${record.preference_type}:canonical:${record.topic_id}`
        : `${record.preference_type}:custom:${record.custom_topic_label.toLowerCase()}`,
    newerOf,
  );
  merged.saved_items = mergeByIdentity(
    localState.saved_items,
    remoteState.saved_items,
    item => `${item.target_type}:${item.target_id}`,
    newerOf,
  );
  merged.watchlist_items = mergeByIdentity(
    localState.watchlist_items,
    remoteState.watchlist_items,
    item => item.entity_id,
    newerOf,
  ).sort((left, right) => left.sort_order - right.sort_order);
  merged.notes = mergeByIdentity(
    localState.notes,
    remoteState.notes,
    note => `${note.target_type}:${note.target_id}`,
    newerOf,
  );
  merged.feedback = mergeByIdentity(
    localState.feedback,
    remoteState.feedback,
    item => `${item.target_type}:${item.target_id}`,
    newerOf,
  );
  return merged;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --import tsx --test src/mergeUserState.test.ts src/persistenceV2.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/types.ts src/lib/persistence/mergeUserState.ts src/mergeUserState.test.ts
git commit -m "feat: add local and remote user state merge logic"
```

### Task 4: Build the Supabase row mappers, remote IO layer, and sync-decision helpers

**Files:**
- Create: `src/lib/persistence/userStateMapper.ts`
- Create: `src/lib/persistence/supabaseUserStateStore.ts`
- Create: `src/lib/persistence/syncDecisions.ts`
- Test: `src/supabaseUserState.test.ts`
- Test: `src/userStateSync.test.ts`

- [ ] **Step 1: Write the failing mapper, remote-store, and sync-decision tests**

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { createFreshPersistedStateV2 } from './storage';
import { toSupabaseRows, fromSupabaseRows } from './lib/persistence/userStateMapper';
import {
  buildMissingDeleteIds,
  decideInitialSyncAction,
} from './lib/persistence/syncDecisions';

test('toSupabaseRows expands V2 state into normalized row groups', () => {
  const state = createFreshPersistedStateV2();
  state.saved_items = [
    { target_type: 'signal', target_id: 's1', created_at: '2026-05-06T00:00:00.000Z', updated_at: '2026-05-06T00:00:00.000Z' },
  ];

  const rows = toSupabaseRows('00000000-0000-0000-0000-000000000001', state);

  assert.equal(rows.profile.user_id, '00000000-0000-0000-0000-000000000001');
  assert.equal(rows.savedItems[0].target_id, 's1');
});

test('fromSupabaseRows reconstructs a V2 snapshot', () => {
  const state = fromSupabaseRows({
    profile: {
      user_id: 'u1',
      onboarding_completed: true,
      reading_mode: 'Bilingual',
      translation_style: 'Professional Analysis',
      core_domains: ['ai', 'energy'],
      critical_alerts: true,
      dark_mode: true,
      local_schema_version: 2,
      local_v2_migrated_at: null,
      created_at: '2026-05-06T00:00:00.000Z',
      updated_at: '2026-05-06T00:00:00.000Z',
    },
    topicPreferences: [],
    savedItems: [],
    watchlistItems: [],
    notes: [],
    feedback: [],
  });

  assert.equal(state.schema_version, 2);
  assert.equal(state.profile.onboarding_completed, true);
});

test('decideInitialSyncAction imports local state when remote is empty', () => {
  const local = createFreshPersistedStateV2();
  const action = decideInitialSyncAction(local, null);
  assert.equal(action, 'push_local_to_remote');
});

test('buildMissingDeleteIds identifies remote rows that must be deleted after replace sync', () => {
  const deleteIds = buildMissingDeleteIds(
    [
      { id: 'row-1', key: 'signal:s1' },
      { id: 'row-2', key: 'signal:s2' },
    ],
    new Set(['signal:s1']),
  );

  assert.deepEqual(deleteIds, ['row-2']);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --import tsx --test src/supabaseUserState.test.ts src/userStateSync.test.ts`  
Expected: FAIL with missing module errors

- [ ] **Step 3: Implement the mapper, remote IO, and sync-decision modules**

```ts
// src/lib/persistence/syncDecisions.ts
import { PersistedUserStateV2 } from '../../types';

export type InitialSyncAction =
  | 'push_local_to_remote'
  | 'pull_remote_to_local'
  | 'merge_local_and_remote'
  | 'stay_local_only';

export function decideInitialSyncAction(
  localState: PersistedUserStateV2 | null,
  remoteState: PersistedUserStateV2 | null,
): InitialSyncAction {
  if (!localState && !remoteState) return 'stay_local_only';
  if (localState && !remoteState) return 'push_local_to_remote';
  if (!localState && remoteState) return 'pull_remote_to_local';
  return 'merge_local_and_remote';
}

export function buildMissingDeleteIds(
  remoteRows: Array<{ id: string; key: string }>,
  localKeys: Set<string>,
) {
  return remoteRows
    .filter(row => !localKeys.has(row.key))
    .map(row => row.id);
}
```

```ts
// src/lib/persistence/userStateMapper.ts
import { PersistedUserStateV2 } from '../../types';

export function toSupabaseRows(userId: string, state: PersistedUserStateV2) {
  return {
    profile: {
      user_id: userId,
      onboarding_completed: state.profile.onboarding_completed,
      reading_mode: state.profile.reading_mode,
      translation_style: state.profile.translation_style,
      core_domains: state.profile.core_domains,
      critical_alerts: state.profile.critical_alerts,
      dark_mode: state.profile.dark_mode,
      local_schema_version: state.schema_version,
      local_v2_migrated_at: null,
      updated_at: state.profile.updated_at,
    },
    topicPreferences: state.topic_preferences.map(record => ({ user_id: userId, ...record })),
    savedItems: state.saved_items.map(record => ({ user_id: userId, ...record })),
    watchlistItems: state.watchlist_items.map(record => ({ user_id: userId, ...record })),
    notes: state.notes.map(record => ({ user_id: userId, ...record })),
    feedback: state.feedback.map(record => ({ user_id: userId, ...record })),
  };
}

export function fromSupabaseRows(rows: any): PersistedUserStateV2 {
  return {
    schema_version: 2,
    profile: {
      onboarding_completed: rows.profile.onboarding_completed,
      reading_mode: rows.profile.reading_mode,
      translation_style: rows.profile.translation_style,
      core_domains: rows.profile.core_domains,
      critical_alerts: rows.profile.critical_alerts,
      dark_mode: rows.profile.dark_mode,
      updated_at: rows.profile.updated_at,
    },
    topic_preferences: rows.topicPreferences,
    saved_items: rows.savedItems,
    watchlist_items: rows.watchlistItems,
    notes: rows.notes,
    feedback: rows.feedback,
  };
}
```

```ts
// src/lib/persistence/supabaseUserStateStore.ts
import { supabase, isSupabaseConfigured } from '../supabase/client';
import { fromSupabaseRows, toSupabaseRows } from './userStateMapper';
import { buildMissingDeleteIds } from './syncDecisions';
import type { PersistedUserStateV2 } from '../../types';

export async function loadRemoteUserState(userId: string): Promise<PersistedUserStateV2 | null> {
  if (!isSupabaseConfigured || !supabase) {
    return null;
  }

  const [
    { data: profile },
    { data: topicPreferences },
    { data: savedItems },
    { data: watchlistItems },
    { data: notes },
    { data: feedback },
  ] = await Promise.all([
    supabase.from('user_profiles').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('user_topic_preferences').select('*').eq('user_id', userId),
    supabase.from('user_saved_items').select('*').eq('user_id', userId),
    supabase.from('user_watchlist_items').select('*').eq('user_id', userId).order('sort_order', { ascending: true }),
    supabase.from('user_notes').select('*').eq('user_id', userId),
    supabase.from('user_feedback').select('*').eq('user_id', userId),
  ]);

  if (!profile) {
    return null;
  }

  return fromSupabaseRows({
    profile,
    topicPreferences: topicPreferences ?? [],
    savedItems: savedItems ?? [],
    watchlistItems: watchlistItems ?? [],
    notes: notes ?? [],
    feedback: feedback ?? [],
  });
}

async function replaceUserCollection(
  table: string,
  userId: string,
  rows: any[],
  keyOfLocalRow: (row: any) => string,
  keyOfRemoteRow: (row: any) => string,
) {
  if (!supabase) return;

  if (rows.length > 0) {
    await supabase.from(table).upsert(rows);
  }

  const { data: remoteRows } = await supabase.from(table).select('id, *').eq('user_id', userId);
  const localKeys = new Set(rows.map(keyOfLocalRow));
  const deleteIds = buildMissingDeleteIds(
    (remoteRows ?? []).map(row => ({ id: row.id, key: keyOfRemoteRow(row) })),
    localKeys,
  );

  if (deleteIds.length > 0) {
    await supabase.from(table).delete().in('id', deleteIds).eq('user_id', userId);
  }
}

export async function saveRemoteUserState(userId: string, state: PersistedUserStateV2) {
  if (!isSupabaseConfigured || !supabase) {
    return;
  }

  const rows = toSupabaseRows(userId, state);

  await supabase.from('user_profiles').upsert(rows.profile, { onConflict: 'user_id' });
  await replaceUserCollection(
    'user_topic_preferences',
    userId,
    rows.topicPreferences,
    row => row.topic_kind === 'canonical'
      ? `${row.preference_type}:canonical:${row.topic_id}`
      : `${row.preference_type}:custom:${row.custom_topic_label.toLowerCase()}`,
    row => row.topic_kind === 'canonical'
      ? `${row.preference_type}:canonical:${row.topic_id}`
      : `${row.preference_type}:custom:${row.custom_topic_label.toLowerCase()}`,
  );
  await replaceUserCollection(
    'user_saved_items',
    userId,
    rows.savedItems,
    row => `${row.target_type}:${row.target_id}`,
    row => `${row.target_type}:${row.target_id}`,
  );
  await replaceUserCollection(
    'user_watchlist_items',
    userId,
    rows.watchlistItems,
    row => row.entity_id,
    row => row.entity_id,
  );
  await replaceUserCollection(
    'user_notes',
    userId,
    rows.notes,
    row => `${row.target_type}:${row.target_id}`,
    row => `${row.target_type}:${row.target_id}`,
  );
  await replaceUserCollection(
    'user_feedback',
    userId,
    rows.feedback,
    row => `${row.target_type}:${row.target_id}`,
    row => `${row.target_type}:${row.target_id}`,
  );
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --import tsx --test src/supabaseUserState.test.ts src/userStateSync.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/persistence/userStateMapper.ts src/lib/persistence/supabaseUserStateStore.ts src/lib/persistence/syncDecisions.ts src/supabaseUserState.test.ts src/userStateSync.test.ts
git commit -m "feat: add supabase mapping, remote io, and sync decisions"
```

### Task 5: Add the Supabase client, auth provider, and safe local-only fallback

**Files:**
- Create: `.env.example`
- Create: `src/lib/supabase/client.ts`
- Create: `src/lib/auth/AuthContext.tsx`
- Test: `src/supabaseClientConfig.test.ts`
- Modify: `src/vite-env.d.ts`
- Modify: `src/main.tsx`
- Modify: `src/App.tsx`
- Modify: `src/AppContext.tsx`

- [ ] **Step 1: Write the failing configuration smoke tests**

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

test('env example includes the required Supabase client variables', () => {
  const envExample = readFileSync(resolve(process.cwd(), '.env.example'), 'utf8');
  assert.match(envExample, /VITE_SUPABASE_URL=/);
  assert.match(envExample, /VITE_SUPABASE_ANON_KEY=/);
});

test('supabase client module exposes a local-only fallback when env is missing', async () => {
  const module = await import('./lib/supabase/client');
  assert.equal(typeof module.isSupabaseConfigured, 'boolean');
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --import tsx --test src/supabaseClientConfig.test.ts`  
Expected: FAIL because `.env.example` or the client module is missing

- [ ] **Step 3: Implement the client and auth shell**

```ts
// src/lib/supabase/client.ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;
```

```ts
// src/lib/auth/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '../supabase/client';

const AuthContext = createContext<{
  session: Session | null;
  isConfigured: boolean;
  signInWithOtp: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}>({
  session: null,
  isConfigured: false,
  signInWithOtp: async () => {},
  signOut: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null));
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        isConfigured: isSupabaseConfigured,
        signInWithOtp: async (email: string) => {
          if (!supabase) return;
          await supabase.auth.signInWithOtp({ email });
        },
        signOut: async () => {
          if (!supabase) return;
          await supabase.auth.signOut();
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
```

```ts
// src/vite-env.d.ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

```dotenv
# .env.example
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

- [ ] **Step 4: Wire the provider and verify build**

Run: `npm run lint && npm run build`  
Expected: PASS with the auth provider wrapped around `<App />` and no crash when env vars are missing

- [ ] **Step 5: Commit**

```bash
git add .env.example src/lib/supabase/client.ts src/lib/auth/AuthContext.tsx src/supabaseClientConfig.test.ts src/vite-env.d.ts src/main.tsx src/App.tsx src/AppContext.tsx
git commit -m "feat: add supabase client with local-only fallback"
```

### Task 6: Integrate AppContext with ongoing debounced remote sync while preserving local-first behavior

**Files:**
- Modify: `src/AppContext.tsx`
- Modify: `src/storage.ts`
- Create: `src/lib/persistence/useUserStateSync.ts`
- Test: `src/persistenceV2.test.ts`
- Test: `src/userStateSync.test.ts`

- [ ] **Step 1: Extend tests to cover ongoing local-first sync and deletion cleanup**

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { createFreshPersistedStateV2 } from './storage';
import { mergeUserStates } from './lib/persistence/mergeUserState';

test('remote state is merged instead of replacing local blindly', () => {
  const local = createFreshPersistedStateV2();
  const remote = createFreshPersistedStateV2();
  local.saved_items = [
    { target_type: 'signal', target_id: 's1', created_at: '2026-05-05T00:00:00.000Z', updated_at: '2026-05-05T00:00:00.000Z' },
  ];
  remote.saved_items = [
    { target_type: 'library_item', target_id: 'l1', created_at: '2026-05-06T00:00:00.000Z', updated_at: '2026-05-06T00:00:00.000Z' },
  ];

  const merged = mergeUserStates(local, remote);
  assert.deepEqual(
    merged.saved_items.map(item => `${item.target_type}:${item.target_id}`).sort(),
    ['library_item:l1', 'signal:s1'],
  );
});

test('replace-user-collection semantics prevent deleted local rows from reappearing on next sync', () => {
  const local = createFreshPersistedStateV2();
  const remote = createFreshPersistedStateV2();
  remote.saved_items = [
    { target_type: 'signal', target_id: 's9', created_at: '2026-05-01T00:00:00.000Z', updated_at: '2026-05-01T00:00:00.000Z' },
  ];

  const merged = mergeUserStates(local, remote);
  assert.equal(merged.saved_items.length, 1);
});
```

- [ ] **Step 2: Run the tests to verify current behavior is incomplete**

Run: `node --import tsx --test src/persistenceV2.test.ts src/userStateSync.test.ts src/mergeUserState.test.ts`  
Expected: FAIL because debounced remote sync helpers are not yet connected to `AppContext`

- [ ] **Step 3: Implement ongoing remote sync orchestration**

```ts
// src/lib/persistence/useUserStateSync.ts
import { useEffect, useRef } from 'react';
import { useAuth } from '../auth/AuthContext';
import { mergeUserStates } from './mergeUserState';
import { loadRemoteUserState, saveRemoteUserState } from './supabaseUserStateStore';
import type { PersistedUserStateV2 } from '../../types';

const SYNC_DEBOUNCE_MS = 600;

export function useUserStateSync(
  persistedState: PersistedUserStateV2,
  setPersistedState: React.Dispatch<React.SetStateAction<PersistedUserStateV2>>,
) {
  const { session, isConfigured } = useAuth();
  const hasHydratedRemoteRef = useRef(false);
  const debounceTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!session || !isConfigured || hasHydratedRemoteRef.current) {
      return;
    }

    hasHydratedRemoteRef.current = true;

    void (async () => {
      const remoteState = await loadRemoteUserState(session.user.id);
      const mergedState = mergeUserStates(persistedState, remoteState);
      setPersistedState(mergedState);
      await saveRemoteUserState(session.user.id, mergedState);
    })();
  }, [session, isConfigured, persistedState, setPersistedState]);

  useEffect(() => {
    if (!session || !isConfigured || !hasHydratedRemoteRef.current) {
      return;
    }

    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = window.setTimeout(() => {
      void saveRemoteUserState(session.user.id, persistedState);
    }, SYNC_DEBOUNCE_MS);

    return () => {
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current);
      }
    };
  }, [persistedState, session, isConfigured]);
}
```

```ts
// AppContext integration sketch
const [persistedState, setPersistedState] = useState<PersistedUserStateV2>(() => hydratePersistedStateV2());
useEffect(() => {
  writePersistedStateV2(persistedState);
}, [persistedState]);
useUserStateSync(persistedState, setPersistedState);
```

- [ ] **Step 4: Run verification**

Run: `node --import tsx --test src/detailPayload.test.ts src/topicPreferences.test.ts src/persistenceV2.test.ts src/userStateSync.test.ts src/mergeUserState.test.ts src/supabaseUserState.test.ts && npm run lint && npm run build`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/AppContext.tsx src/storage.ts src/lib/persistence/useUserStateSync.ts src/persistenceV2.test.ts src/userStateSync.test.ts
git commit -m "feat: keep supabase sync ongoing after hydration"
```

### Task 7: Add minimal Settings auth and sync controls plus local-only fallback messaging

**Files:**
- Modify: `src/views/SettingsView.tsx`
- Modify: `src/AppContext.tsx`

- [ ] **Step 1: Add the smallest possible sync UI**

```tsx
<section className="space-y-4">
  <h3 className="text-[11px] font-bold uppercase tracking-widest text-primary">Sync</h3>
  <div className="bg-surface rounded-2xl border border-outline/20 p-4 space-y-3">
    {!isConfigured ? (
      <div className="text-sm text-on-surface-variant">Sync not configured</div>
    ) : session ? (
      <>
        <div className="text-sm text-on-surface">Signed in as {session.user.email}</div>
        <button onClick={() => signOut()} className="text-xs font-bold text-primary">
          Sign Out
        </button>
      </>
    ) : (
      <>
        <input value={email} onChange={(e) => setEmail(e.target.value)} className="w-full ..." />
        <button onClick={() => signInWithOtp(email)} className="w-full bg-primary ...">
          Sign In To Sync
        </button>
      </>
    )}
  </div>
</section>
```

- [ ] **Step 2: Verify the UI manually**

Run: `npm run dev`  
Manual checks:
- Open Settings and confirm a minimal Sync section exists
- With no env vars set, confirm Settings shows `Sync not configured`
- Without login, local V2 still works exactly as before
- Sign in request does not disturb the rest of the dark dotted-grid UI
- With login, saved signal, unsave, note delete, watchlist remove, and followed-topic removal all persist after refresh

- [ ] **Step 3: Run the full verification suite**

Run: `node --import tsx --test src/detailPayload.test.ts src/topicPreferences.test.ts src/persistenceV2.test.ts src/mergeUserState.test.ts src/supabaseSchema.test.ts src/canonicalTopicsSeed.test.ts src/supabaseClientConfig.test.ts src/supabaseUserState.test.ts src/userStateSync.test.ts && npm run lint && npm run build`  
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/views/SettingsView.tsx src/AppContext.tsx
git commit -m "feat: add sync settings and local-only fallback state"
```

- [ ] **Step 5: Release checklist**

```bash
git status
```

Expected:
- clean working tree
- schema migrations committed
- no untracked environment secrets
- tests, lint, and build all green

### Task 8: Backfill the missing product PRD document after persistence rollout

**Files:**
- Create: `docs/PRD.md`
- Modify: `AGENTS.md`
- Modify: `PROJECT_CONTEXT.md`
- Modify: `ROADMAP.md`

- [ ] **Step 1: Draft a PRD from the current product definition**

```md
# SignalDesk Product Requirements Document

## Product Summary
SignalDesk is a Chinese-first personal intelligence dashboard for tracking high-signal developments across AI, crypto, stocks, robotics, energy, policy, macro, and geopolitics.

## Current Capabilities
- Today feed
- Topic Radar
- Watchlist
- Research Library
- Bilingual detail reading
- Local-first persistence
- Supabase account sync

## Current Non-Goals
- No live market terminal behavior
- No generic social feed behavior
- No backend content ingestion in this phase
```

- [ ] **Step 2: Run a doc consistency check**

Run: `rg -n "SignalDesk|Phase 3|Supabase|local-first" AGENTS.md PROJECT_CONTEXT.md ROADMAP.md docs/PRD.md`  
Expected: matching product language across all four files

- [ ] **Step 3: Commit**

```bash
git add docs/PRD.md AGENTS.md PROJECT_CONTEXT.md ROADMAP.md
git commit -m "docs: add product requirements document"
```

## Self-Review

- Spec coverage:
  - Supabase tables, columns, relationships, RLS, auth, migration, frontend integration, deletion sync, local-only fallback, risks, and phased rollout are all covered by Tasks 1-8.
  - `docs/PRD.md` was requested upstream but not present in the repo; this is now tracked as a follow-up documentation task instead of a blocker.
- Placeholder scan:
  - No `TODO`, `TBD`, or “implement later” placeholders remain in the task steps.
- Type consistency:
  - Plan uses the current `PersistedUserStateV2` model as the application contract and keeps `saved_item_target_type_enum` aligned with `SavedItemTargetType`.

## Risks To Watch During Execution

- `notes` currently derive a UI map by `target_id` only; Phase 3 implementation should not worsen that collision risk
- `inferNoteTargetType()` is prefix-based and should be treated as compatibility logic only
- `canonical_topics` must be kept in sync with `src/topicRegistry.ts` until a single source of truth is established
- `updated_at` last-write-wins is acceptable for MVP but can overwrite concurrent multi-device note edits
- Replace-user-collection sync without tombstones is intentionally simple for MVP, but concurrent multi-device delete/edit races can still produce surprising outcomes
- Missing Supabase env must remain a supported local-only runtime, not an error case

## Manual QA Checklist

1. Clear browser storage, open app, and confirm onboarding still works locally before login.
2. Save a signal, add a watchlist item, write a note, and follow a topic while logged out.
3. Sign in with email OTP and confirm the existing local V2 state syncs to Supabase instead of disappearing.
4. Refresh the app and confirm the same state is restored from remote.
5. Open a second browser profile, sign in with the same account, and confirm state appears there.
6. Change reading mode, translation style, and core domains in browser A; refresh browser B and confirm the latest values win.
7. Unsave a signal, remove a watchlist item, delete a note, and unfollow a topic; refresh and confirm those deletions do not reappear from remote.
8. Verify legacy watchlist defaults are not reintroduced during account migration.
9. Remove Supabase env vars locally and confirm the app still boots in local-only mode with `Sync not configured`.

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-05-06-phase-3-supabase-persistence.md`. Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
