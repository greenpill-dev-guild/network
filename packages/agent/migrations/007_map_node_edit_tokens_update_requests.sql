-- Email magic-link update flow for approved public map-node submissions.
-- Raw tokens are never persisted; only hashes are stored. Owner edits stay
-- pending until a steward or trusted publisher approves the update request.

create extension if not exists pgcrypto;
create extension if not exists citext;

create schema if not exists intake;

do $$
begin
  if to_regtype('intake.map_node_update_request_status') is null then
    create type intake.map_node_update_request_status as enum (
      'pending',
      'approved',
      'rejected',
      'archived'
    );
  end if;
end $$;

create table if not exists intake.map_node_edit_tokens (
  id uuid primary key default gen_random_uuid(),
  requested_node_id text not null,
  submission_id uuid references intake.map_node_submissions(id) on delete cascade,
  normalized_email citext,
  token_hash text,
  expires_at timestamptz not null default now() + interval '30 minutes',
  consumed_at timestamptz,
  provider_status text not null default 'recorded',
  provider_error text,
  request_ip inet,
  request_user_agent text,
  rate_limit_key text,
  request_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint map_node_edit_tokens_hash_shape check (
    token_hash is null or token_hash ~ '^[a-f0-9]{64}$'
  ),
  constraint map_node_edit_tokens_expire_after_create check (expires_at > created_at),
  constraint map_node_edit_tokens_metadata_object check (jsonb_typeof(request_metadata) = 'object')
);

create unique index if not exists map_node_edit_tokens_token_hash_idx
  on intake.map_node_edit_tokens (token_hash)
  where token_hash is not null;

create index if not exists map_node_edit_tokens_cooldown_idx
  on intake.map_node_edit_tokens (requested_node_id, normalized_email, rate_limit_key, created_at desc);

create index if not exists map_node_edit_tokens_email_bucket_idx
  on intake.map_node_edit_tokens (normalized_email, created_at desc);

create index if not exists map_node_edit_tokens_rate_limit_bucket_idx
  on intake.map_node_edit_tokens (rate_limit_key, created_at desc);

create index if not exists map_node_edit_tokens_expiry_idx
  on intake.map_node_edit_tokens (expires_at, consumed_at);

create table if not exists intake.map_node_update_requests (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references intake.map_node_submissions(id) on delete cascade,
  edit_token_id uuid references intake.map_node_edit_tokens(id) on delete set null,
  status intake.map_node_update_request_status not null default 'pending',
  proposed_display_name text,
  proposed_place_name text,
  proposed_city text,
  proposed_region text,
  proposed_country text,
  proposed_latitude numeric(9, 6),
  proposed_longitude numeric(9, 6),
  proposed_themes text[],
  proposed_public_note text,
  current_submission_updated_at timestamptz not null,
  current_public_fields jsonb not null default '{}'::jsonb,
  proposed_public_fields jsonb not null default '{}'::jsonb,
  request_email citext,
  requester_ip inet,
  requester_user_agent text,
  rate_limit_key text,
  request_metadata jsonb not null default '{}'::jsonb,
  reviewed_by text,
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint map_node_update_requests_public_note_length check (
    char_length(coalesce(proposed_public_note, '')) <= 500
  ),
  constraint map_node_update_requests_current_fields_object check (
    jsonb_typeof(current_public_fields) = 'object'
  ),
  constraint map_node_update_requests_proposed_fields_object check (
    jsonb_typeof(proposed_public_fields) = 'object'
  ),
  constraint map_node_update_requests_metadata_object check (
    jsonb_typeof(request_metadata) = 'object'
  ),
  constraint map_node_update_requests_display_name_required check (
    not (proposed_public_fields ? 'display_name')
    or nullif(proposed_display_name, '') is not null
  ),
  constraint map_node_update_requests_place_name_required check (
    not (proposed_public_fields ? 'place_name')
    or nullif(proposed_place_name, '') is not null
  ),
  constraint map_node_update_requests_latitude_range check (
    proposed_latitude is null or proposed_latitude between -90 and 90
  ),
  constraint map_node_update_requests_longitude_range check (
    proposed_longitude is null or proposed_longitude between -180 and 180
  )
);

create unique index if not exists map_node_update_requests_one_pending_per_node_idx
  on intake.map_node_update_requests (submission_id)
  where status = 'pending';

create index if not exists map_node_update_requests_status_created_idx
  on intake.map_node_update_requests (status, created_at desc);

create index if not exists map_node_update_requests_submission_idx
  on intake.map_node_update_requests (submission_id, created_at desc);

create or replace function intake.touch_map_node_update_requests_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists map_node_update_requests_touch_updated_at
  on intake.map_node_update_requests;

create trigger map_node_update_requests_touch_updated_at
  before update on intake.map_node_update_requests
  for each row
  execute function intake.touch_map_node_update_requests_updated_at();

create or replace function intake.apply_approved_map_node_update_request()
returns trigger
language plpgsql
as $$
declare
  current_submission record;
begin
  if new.status in (
       'approved'::intake.map_node_update_request_status,
       'rejected'::intake.map_node_update_request_status,
       'archived'::intake.map_node_update_request_status
     )
     and old.status is distinct from new.status
     and new.reviewed_at is null then
    new.reviewed_at = now();
  end if;

  if new.status = 'approved'::intake.map_node_update_request_status
     and old.status is distinct from 'approved'::intake.map_node_update_request_status then
    select *
    into current_submission
    from intake.map_node_submissions
    where id = new.submission_id
    for update;

    if not found then
      raise exception 'map_node_update_request_missing_submission'
        using errcode = '23503';
    end if;

    if current_submission.updated_at is distinct from new.current_submission_updated_at then
      raise exception 'map_node_update_request_stale_state'
        using errcode = '40001';
    end if;

    update intake.map_node_submissions
    set
      display_name = case
        when new.proposed_public_fields ? 'display_name' then new.proposed_display_name
        else display_name
      end,
      place_name = case
        when new.proposed_public_fields ? 'place_name' then new.proposed_place_name
        else place_name
      end,
      city = case
        when new.proposed_public_fields ? 'city' then new.proposed_city
        else city
      end,
      region = case
        when new.proposed_public_fields ? 'region' then new.proposed_region
        else region
      end,
      country = case
        when new.proposed_public_fields ? 'country' then new.proposed_country
        else country
      end,
      latitude = case
        when new.proposed_public_fields ? 'latitude' then new.proposed_latitude
        else latitude
      end,
      longitude = case
        when new.proposed_public_fields ? 'longitude' then new.proposed_longitude
        else longitude
      end,
      themes = case
        when new.proposed_public_fields ? 'themes' then coalesce(new.proposed_themes, '{}'::text[])
        else themes
      end,
      public_note = case
        when new.proposed_public_fields ? 'public_note' then new.proposed_public_note
        else public_note
      end,
      updated_at = now()
    where id = new.submission_id;
  end if;

  return new;
end;
$$;

drop trigger if exists map_node_update_requests_apply_approved
  on intake.map_node_update_requests;

create trigger map_node_update_requests_apply_approved
  before update on intake.map_node_update_requests
  for each row
  execute function intake.apply_approved_map_node_update_request();

create or replace function intake.cleanup_map_node_edit_flow(
  now_at timestamptz default now(),
  expired_token_grace interval default interval '7 days',
  private_metadata_retention interval default interval '90 days'
)
returns table (
  expired_tokens_deleted integer,
  token_metadata_scrubbed integer,
  request_metadata_scrubbed integer
)
language plpgsql
as $$
begin
  delete from intake.map_node_edit_tokens
  where expires_at < now_at - expired_token_grace;
  get diagnostics expired_tokens_deleted = row_count;

  update intake.map_node_edit_tokens
  set
    normalized_email = null,
    request_ip = null,
    request_user_agent = null,
    rate_limit_key = null,
    request_metadata = '{}'::jsonb
  where created_at < now_at - private_metadata_retention
    and (
      normalized_email is not null
      or request_ip is not null
      or request_user_agent is not null
      or rate_limit_key is not null
      or request_metadata <> '{}'::jsonb
    );
  get diagnostics token_metadata_scrubbed = row_count;

  update intake.map_node_update_requests
  set
    request_email = null,
    requester_ip = null,
    requester_user_agent = null,
    rate_limit_key = null,
    request_metadata = '{}'::jsonb
  where created_at < now_at - private_metadata_retention
    and (
      request_email is not null
      or requester_ip is not null
      or requester_user_agent is not null
      or rate_limit_key is not null
      or request_metadata <> '{}'::jsonb
    );
  get diagnostics request_metadata_scrubbed = row_count;

  return next;
end;
$$;
