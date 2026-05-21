-- Phase 4 Task 12: additive enrichment-ready contract for intelligence_signals.
-- This migration is intentionally optional-friendly and does not enable AI calls.

do $$
begin
  create type enrichment_status_enum as enum (
    'not_requested',
    'pending',
    'completed',
    'failed',
    'skipped'
  );
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type enrichment_source_enum as enum (
    'deterministic',
    'manual',
    'unknown'
  );
exception
  when duplicate_object then null;
end
$$;

alter table public.intelligence_signals
  add column if not exists enrichment_status enrichment_status_enum not null default 'not_requested',
  add column if not exists enrichment_version integer null,
  add column if not exists enrichment_source enrichment_source_enum not null default 'unknown',
  add column if not exists summary_status enrichment_status_enum not null default 'not_requested',
  add column if not exists translation_status enrichment_status_enum not null default 'not_requested',
  add column if not exists source_language content_language_enum null,
  add column if not exists target_languages content_language_enum[] null,
  add column if not exists enriched_summary_en text null,
  add column if not exists enriched_summary_zh text null,
  add column if not exists enriched_why_it_matters_en text[] null,
  add column if not exists enriched_why_it_matters_zh text[] null,
  add column if not exists enrichment_error text null,
  add column if not exists last_enriched_at timestamptz null;

create index if not exists intelligence_signals_enrichment_status_idx
  on public.intelligence_signals (enrichment_status);

create index if not exists intelligence_signals_summary_status_idx
  on public.intelligence_signals (summary_status);

create index if not exists intelligence_signals_translation_status_idx
  on public.intelligence_signals (translation_status);

create index if not exists intelligence_signals_last_enriched_at_idx
  on public.intelligence_signals (last_enriched_at desc);
