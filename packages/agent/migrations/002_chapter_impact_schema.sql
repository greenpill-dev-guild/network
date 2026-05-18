-- Greenpill public chapter impact cache.
-- The public API reads only normalized payload snapshots from impact.

create schema if not exists impact;
create schema if not exists audit;

do $$
begin
  if to_regclass('impact.chapter_impact_snapshots') is null and to_regclass('public.chapter_impact_snapshots') is not null then
    alter table public.chapter_impact_snapshots set schema impact;
  end if;
end $$;

create table if not exists impact.chapter_impact_snapshots (
  chapter_slug text primary key,
  payload jsonb not null,
  source_status jsonb not null default '[]'::jsonb,
  synced_at timestamptz not null default now(),
  stale_after timestamptz not null default now() + interval '6 hours',
  error_count integer not null default 0,
  last_error text
);

create index if not exists chapter_impact_snapshots_stale_after_idx
  on impact.chapter_impact_snapshots (stale_after);
