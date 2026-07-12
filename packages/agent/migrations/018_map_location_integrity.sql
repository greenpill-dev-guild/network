-- Public map locations are confirmed through a cached, rate-limited geocoder.
-- This migration adds new tables rather than altering already-applied baselines.

create schema if not exists intake;

create table if not exists intake.map_location_geocode_cache (
  lookup_key text primary key,
  lookup_kind text not null check (lookup_kind in ('search', 'reverse')),
  payload jsonb not null default '[]'::jsonb,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint map_location_geocode_cache_payload_array check (jsonb_typeof(payload) = 'array')
);

create table if not exists intake.map_location_geocode_throttle (
  id integer primary key default 1,
  next_request_at timestamptz not null default to_timestamp(0),
  constraint map_location_geocode_throttle_singleton check (id = 1)
);

insert into intake.map_location_geocode_throttle (id, next_request_at)
values (1, to_timestamp(0))
on conflict (id) do nothing;

create table if not exists intake.map_location_request_limits (
  rate_limit_key_hash text primary key,
  window_started_at timestamptz not null,
  request_count integer not null default 0,
  updated_at timestamptz not null default now(),
  constraint map_location_request_limits_request_count check (request_count >= 0)
);

create index if not exists map_location_geocode_cache_expiry_idx
  on intake.map_location_geocode_cache (expires_at);

create index if not exists map_location_request_limits_expiry_idx
  on intake.map_location_request_limits (window_started_at);

create table if not exists intake.map_location_confirmations (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  latitude numeric(9, 6) not null,
  longitude numeric(9, 6) not null,
  location_kind text not null check (location_kind in ('settlement', 'region', 'country')),
  attribution text not null,
  provider text not null,
  provider_place_id text not null,
  confirmation_method text not null check (confirmation_method in ('search', 'reverse')),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint map_location_confirmations_latitude_range check (latitude between -90 and 90),
  constraint map_location_confirmations_longitude_range check (longitude between -180 and 180)
);

create index if not exists map_location_confirmations_active_idx
  on intake.map_location_confirmations (expires_at, consumed_at);

create table if not exists intake.map_node_location_repairs (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null,
  submission_id uuid not null references intake.map_node_submissions(id) on delete cascade,
  previous_place_name text not null,
  previous_latitude numeric(9, 6) not null,
  previous_longitude numeric(9, 6) not null,
  next_place_name text not null,
  next_latitude numeric(9, 6) not null,
  next_longitude numeric(9, 6) not null,
  provider text not null,
  provider_place_id text not null,
  repair_rule text not null,
  reverted_at timestamptz,
  created_at timestamptz not null default now(),
  constraint map_node_location_repairs_previous_latitude_range check (previous_latitude between -90 and 90),
  constraint map_node_location_repairs_previous_longitude_range check (previous_longitude between -180 and 180),
  constraint map_node_location_repairs_next_latitude_range check (next_latitude between -90 and 90),
  constraint map_node_location_repairs_next_longitude_range check (next_longitude between -180 and 180)
);

create unique index if not exists map_node_location_repairs_run_submission_idx
  on intake.map_node_location_repairs (run_id, submission_id);

alter table intake.map_node_submissions
  add constraint map_node_submissions_latitude_range check (latitude between -90 and 90) not valid;

alter table intake.map_node_submissions
  add constraint map_node_submissions_longitude_range check (longitude between -180 and 180) not valid;
