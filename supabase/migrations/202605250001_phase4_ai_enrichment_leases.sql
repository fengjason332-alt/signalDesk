-- Phase 4 Task 13D/13E: additive lease/retry bookkeeping for manual AI enrichment.
-- This migration is manual-only and does not enable scheduled execution.

alter table public.intelligence_signals
  add column if not exists enrichment_claim_id text null,
  add column if not exists enrichment_claimed_at timestamptz null,
  add column if not exists enrichment_claim_expires_at timestamptz null,
  add column if not exists enrichment_attempt_count integer not null default 0,
  add column if not exists enrichment_last_attempt_at timestamptz null,
  add column if not exists enrichment_next_retry_at timestamptz null,
  add column if not exists enrichment_last_run_id text null;

create index if not exists intelligence_signals_enrichment_claim_expires_at_idx
  on public.intelligence_signals (enrichment_claim_expires_at);

create index if not exists intelligence_signals_enrichment_next_retry_at_idx
  on public.intelligence_signals (enrichment_next_retry_at);

create index if not exists intelligence_signals_enrichment_last_run_id_idx
  on public.intelligence_signals (enrichment_last_run_id);

create or replace function public.claim_intelligence_signal_enrichment(
  p_signal_id uuid,
  p_claim_id text,
  p_target_enrichment_version integer,
  p_started_at timestamptz,
  p_claim_ttl_seconds integer default 600,
  p_force boolean default false,
  p_max_retry_attempts integer default 2,
  p_retry_backoff_minutes integer default 30
)
returns table (
  signal_id uuid,
  claim_status text,
  claim_token text,
  enrichment_status enrichment_status_enum,
  enrichment_version integer,
  summary_status enrichment_status_enum,
  translation_status enrichment_status_enum,
  last_enriched_at timestamptz,
  next_retry_at timestamptz,
  attempt_count integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.intelligence_signals%rowtype;
  v_started_at timestamptz := coalesce(p_started_at, now());
  v_claim_expires_at timestamptz :=
    coalesce(p_started_at, now()) +
    make_interval(secs => greatest(60, coalesce(p_claim_ttl_seconds, 600)));
begin
  select *
  into v_row
  from public.intelligence_signals
  where id = p_signal_id
  for update;

  if not found then
    return query
    select
      p_signal_id,
      'not_found'::text,
      null::text,
      'not_requested'::enrichment_status_enum,
      null::integer,
      'not_requested'::enrichment_status_enum,
      'not_requested'::enrichment_status_enum,
      null::timestamptz,
      null::timestamptz,
      0::integer;
    return;
  end if;

  if coalesce(v_row.lifecycle_stage, '') not in ('candidate_preview', 'candidate', 'draft') then
    return query
    select
      v_row.id,
      'not_preview_lifecycle'::text,
      v_row.enrichment_claim_id,
      coalesce(v_row.enrichment_status, 'not_requested'::enrichment_status_enum),
      v_row.enrichment_version,
      coalesce(v_row.summary_status, 'not_requested'::enrichment_status_enum),
      coalesce(v_row.translation_status, 'not_requested'::enrichment_status_enum),
      v_row.last_enriched_at,
      v_row.enrichment_next_retry_at,
      coalesce(v_row.enrichment_attempt_count, 0);
    return;
  end if;

  if coalesce(v_row.generation_status::text, '') = 'failed' then
    return query
    select
      v_row.id,
      'generation_failed'::text,
      v_row.enrichment_claim_id,
      coalesce(v_row.enrichment_status, 'not_requested'::enrichment_status_enum),
      v_row.enrichment_version,
      coalesce(v_row.summary_status, 'not_requested'::enrichment_status_enum),
      coalesce(v_row.translation_status, 'not_requested'::enrichment_status_enum),
      v_row.last_enriched_at,
      v_row.enrichment_next_retry_at,
      coalesce(v_row.enrichment_attempt_count, 0);
    return;
  end if;

  if
    v_row.enrichment_claim_id is not null
    and v_row.enrichment_claim_expires_at is not null
    and v_row.enrichment_claim_expires_at > v_started_at
  then
    return query
    select
      v_row.id,
      'skipped_claimed'::text,
      v_row.enrichment_claim_id,
      coalesce(v_row.enrichment_status, 'not_requested'::enrichment_status_enum),
      v_row.enrichment_version,
      coalesce(v_row.summary_status, 'not_requested'::enrichment_status_enum),
      coalesce(v_row.translation_status, 'not_requested'::enrichment_status_enum),
      v_row.last_enriched_at,
      v_row.enrichment_next_retry_at,
      coalesce(v_row.enrichment_attempt_count, 0);
    return;
  end if;

  if
    not coalesce(p_force, false)
    and v_row.enrichment_version = p_target_enrichment_version
    and coalesce(v_row.summary_status, 'not_requested'::enrichment_status_enum) = 'completed'
    and coalesce(v_row.translation_status, 'not_requested'::enrichment_status_enum) = 'completed'
  then
    return query
    select
      v_row.id,
      'skipped_existing_enrichment'::text,
      v_row.enrichment_claim_id,
      coalesce(v_row.enrichment_status, 'not_requested'::enrichment_status_enum),
      v_row.enrichment_version,
      coalesce(v_row.summary_status, 'not_requested'::enrichment_status_enum),
      coalesce(v_row.translation_status, 'not_requested'::enrichment_status_enum),
      v_row.last_enriched_at,
      v_row.enrichment_next_retry_at,
      coalesce(v_row.enrichment_attempt_count, 0);
    return;
  end if;

  if
    not coalesce(p_force, false)
    and v_row.enrichment_next_retry_at is not null
    and v_row.enrichment_next_retry_at > v_started_at
  then
    return query
    select
      v_row.id,
      'retry_backoff_active'::text,
      v_row.enrichment_claim_id,
      coalesce(v_row.enrichment_status, 'not_requested'::enrichment_status_enum),
      v_row.enrichment_version,
      coalesce(v_row.summary_status, 'not_requested'::enrichment_status_enum),
      coalesce(v_row.translation_status, 'not_requested'::enrichment_status_enum),
      v_row.last_enriched_at,
      v_row.enrichment_next_retry_at,
      coalesce(v_row.enrichment_attempt_count, 0);
    return;
  end if;

  if
    not coalesce(p_force, false)
    and coalesce(v_row.enrichment_status, 'not_requested'::enrichment_status_enum) = 'failed'
    and coalesce(v_row.enrichment_attempt_count, 0) >= greatest(1, coalesce(p_max_retry_attempts, 2))
  then
    return query
    select
      v_row.id,
      'retry_attempt_limit_reached'::text,
      v_row.enrichment_claim_id,
      coalesce(v_row.enrichment_status, 'not_requested'::enrichment_status_enum),
      v_row.enrichment_version,
      coalesce(v_row.summary_status, 'not_requested'::enrichment_status_enum),
      coalesce(v_row.translation_status, 'not_requested'::enrichment_status_enum),
      v_row.last_enriched_at,
      v_row.enrichment_next_retry_at,
      coalesce(v_row.enrichment_attempt_count, 0);
    return;
  end if;

  update public.intelligence_signals
  set
    enrichment_claim_id = p_claim_id,
    enrichment_claimed_at = v_started_at,
    enrichment_claim_expires_at = v_claim_expires_at,
    enrichment_attempt_count = coalesce(v_row.enrichment_attempt_count, 0) + 1,
    enrichment_last_attempt_at = v_started_at,
    enrichment_next_retry_at = null,
    enrichment_last_run_id = p_claim_id,
    enrichment_status = 'pending',
    summary_status = case
      when coalesce(v_row.summary_status, 'not_requested'::enrichment_status_enum) = 'completed'
        then v_row.summary_status
      else 'pending'::enrichment_status_enum
    end,
    translation_status = case
      when coalesce(v_row.translation_status, 'not_requested'::enrichment_status_enum) = 'completed'
        then v_row.translation_status
      else 'pending'::enrichment_status_enum
    end,
    enrichment_error = null,
    updated_at = v_started_at
  where id = p_signal_id;

  return query
  select
    signals.id,
    'claimed'::text,
    signals.enrichment_claim_id,
    coalesce(signals.enrichment_status, 'not_requested'::enrichment_status_enum),
    signals.enrichment_version,
    coalesce(signals.summary_status, 'not_requested'::enrichment_status_enum),
    coalesce(signals.translation_status, 'not_requested'::enrichment_status_enum),
    signals.last_enriched_at,
    signals.enrichment_next_retry_at,
    coalesce(signals.enrichment_attempt_count, 0)
  from public.intelligence_signals signals
  where signals.id = p_signal_id;
end;
$$;
