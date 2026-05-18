-- Greenpill private map-node intake contract.
-- Private fields stay in intake base tables; public consumers read only
-- approved public projections.

create extension if not exists pgcrypto;
create extension if not exists citext;

create schema if not exists intake;
create schema if not exists impact;
create schema if not exists workspace;
create schema if not exists audit;

do $$
begin
  if to_regtype('intake.map_node_status') is null then
    if to_regtype('public.map_node_status') is not null then
      execute 'alter type public.map_node_status set schema intake';
    else
      execute 'create type intake.map_node_status as enum (''pending'', ''approved'', ''rejected'', ''archived'')';
    end if;
  end if;
end $$;

drop view if exists public.public_map_nodes;
drop view if exists intake.public_map_nodes;

do $$
begin
  if to_regclass('intake.map_node_submissions') is null and to_regclass('public.map_node_submissions') is not null then
    alter table public.map_node_submissions set schema intake;
  end if;

  if to_regclass('intake.map_node_private_contacts') is null and to_regclass('public.map_node_private_contacts') is not null then
    alter table public.map_node_private_contacts set schema intake;
  end if;

  if to_regclass('intake.map_node_reviews') is null and to_regclass('public.map_node_reviews') is not null then
    alter table public.map_node_reviews set schema intake;
  end if;
end $$;

create table if not exists intake.map_node_submissions (
  id uuid primary key default gen_random_uuid(),
  status intake.map_node_status not null default 'pending',
  display_name text not null,
  place_name text not null,
  city text,
  region text,
  country text,
  latitude numeric(9, 6) not null,
  longitude numeric(9, 6) not null,
  role text,
  themes text[] not null default '{}',
  public_note text,
  raw_note text,
  spam_score numeric(5, 2),
  spam_signals jsonb not null default '{}'::jsonb,
  rate_limit_key text,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  approved_at timestamptz,
  archived_at timestamptz,
  constraint map_node_submissions_public_note_length check (char_length(coalesce(public_note, '')) <= 500),
  constraint map_node_submissions_raw_note_length check (char_length(coalesce(raw_note, '')) <= 2000)
);

create table if not exists intake.map_node_private_contacts (
  submission_id uuid primary key references intake.map_node_submissions(id) on delete cascade,
  email citext not null,
  contact_consent boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists intake.map_node_reviews (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references intake.map_node_submissions(id) on delete cascade,
  reviewer_id text,
  review_status intake.map_node_status not null,
  review_notes text,
  created_at timestamptz not null default now(),
  constraint map_node_reviews_status_check check (review_status in ('approved', 'rejected', 'archived'))
);

create index if not exists map_node_submissions_status_created_at_idx
  on intake.map_node_submissions (status, created_at desc);

create or replace view intake.public_map_nodes as
select
  id,
  display_name as name,
  place_name as place,
  city,
  region,
  country,
  latitude as lat,
  longitude as long,
  role,
  themes,
  public_note,
  status,
  approved_at
from intake.map_node_submissions
where status = 'approved';

create or replace view public.public_map_nodes as
select * from intake.public_map_nodes;
