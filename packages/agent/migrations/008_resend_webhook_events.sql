-- Resend webhook delivery telemetry for map magic-link email operations.
-- Store provider metadata only; do not persist message bodies, subjects,
-- sender addresses, raw recipient addresses, or free-form provider diagnostic
-- messages in this operational log.

create extension if not exists pgcrypto;

create schema if not exists intake;

alter table intake.map_node_edit_tokens
  add column if not exists provider_message_id text;

create unique index if not exists map_node_edit_tokens_provider_message_idx
  on intake.map_node_edit_tokens (provider_message_id)
  where provider_message_id is not null;

create table if not exists intake.email_provider_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'resend',
  provider_event_id text not null,
  provider_message_id text,
  related_edit_token_id uuid references intake.map_node_edit_tokens(id) on delete set null,
  event_type text not null,
  event_created_at timestamptz,
  recipient_hash text,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default now(),
  replay_count integer not null default 0,
  constraint email_provider_events_metadata_object check (
    jsonb_typeof(metadata) = 'object'
  ),
  constraint email_provider_events_recipient_hash_shape check (
    recipient_hash is null or recipient_hash ~ '^[a-f0-9]{64}$'
  )
);

create unique index if not exists email_provider_events_provider_event_idx
  on intake.email_provider_events (provider, provider_event_id);

create index if not exists email_provider_events_provider_message_idx
  on intake.email_provider_events (provider_message_id, received_at desc)
  where provider_message_id is not null;

create index if not exists email_provider_events_type_received_idx
  on intake.email_provider_events (event_type, received_at desc);
