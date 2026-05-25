-- Phase 4 Task 13C: allow persisted AI enrichment rows to record DeepSeek provenance.
-- Additive only. This migration does not enable writes by itself.

do $$
begin
  alter type public.enrichment_source_enum add value if not exists 'deepseek';
exception
  when undefined_object then
    raise exception
      'enrichment_source_enum must exist before applying 202605230001_phase4_enrichment_source_deepseek.sql';
end
$$;
