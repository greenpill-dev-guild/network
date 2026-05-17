-- Greenpill private map-node intake contract.
-- This is a scaffold contract, not a migration wired to production yet.
-- Private fields stay in base tables; public consumers read only public_map_nodes.

create extension if not exists pgcrypto;
create extension if not exists citext;

do $$
begin
  create type map_node_status as enum ('pending', 'approved', 'rejected', 'archived');
exception
  when duplicate_object then null;
end $$;

create table if not exists map_node_submissions (
  id uuid primary key default gen_random_uuid(),
  status map_node_status not null default 'pending',
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

create table if not exists map_node_private_contacts (
  submission_id uuid primary key references map_node_submissions(id) on delete cascade,
  email citext not null,
  contact_consent boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists map_node_reviews (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references map_node_submissions(id) on delete cascade,
  reviewer_id text,
  review_status map_node_status not null,
  review_notes text,
  created_at timestamptz not null default now(),
  constraint map_node_reviews_status_check check (review_status in ('approved', 'rejected', 'archived'))
);

create or replace view public_map_nodes as
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
from map_node_submissions
where status = 'approved';
