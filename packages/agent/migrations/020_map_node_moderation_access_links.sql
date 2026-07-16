-- Recipient-specific, retry-safe moderation capability links. The signed token
-- is derived by the agent and is never persisted. Recipient identity remains
-- private and this technical collection is hidden from steward-facing Studio.

create extension if not exists pgcrypto;
create extension if not exists citext;

create table if not exists intake.map_node_moderation_access_links (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references intake.map_node_moderation_notifications(id) on delete cascade,
  submission_id uuid not null references intake.map_node_submissions(id) on delete cascade,
  recipient_email citext not null,
  token_expires_at timestamptz not null,
  delivery_status text not null default 'queued',
  attempts integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  delivery_claimed_at timestamptz,
  provider_message_id text,
  provider_error text,
  sent_at timestamptz,
  consumed_at timestamptz,
  resolved_at timestamptz,
  decision intake.map_node_status,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint map_node_moderation_access_links_recipient_check
    check (recipient_email::text = lower(recipient_email::text) and char_length(recipient_email::text) <= 320),
  constraint map_node_moderation_access_links_expiry_check
    check (token_expires_at > created_at),
  constraint map_node_moderation_access_links_delivery_status_check
    check (delivery_status in ('queued', 'delivery_claimed', 'retry_scheduled', 'sent', 'failed', 'skipped')),
  constraint map_node_moderation_access_links_attempts_check
    check (attempts >= 0),
  constraint map_node_moderation_access_links_decision_check
    check (decision is null or decision in ('approved', 'rejected')),
  constraint map_node_moderation_access_links_resolution_shape_check
    check (
      (resolved_at is null and decision is null)
      or
      (resolved_at is not null and decision is not null)
    ),
  constraint map_node_moderation_access_links_notification_recipient_unique
    unique (notification_id, recipient_email)
);

create index if not exists map_node_moderation_access_links_delivery_queue_idx
  on intake.map_node_moderation_access_links (delivery_status, next_attempt_at, created_at);

create index if not exists map_node_moderation_access_links_submission_idx
  on intake.map_node_moderation_access_links (submission_id, token_expires_at);

create index if not exists map_node_moderation_access_links_expiry_idx
  on intake.map_node_moderation_access_links (token_expires_at);

create or replace function intake.touch_map_node_moderation_access_link_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists map_node_moderation_access_link_touch_updated_at
  on intake.map_node_moderation_access_links;

create trigger map_node_moderation_access_link_touch_updated_at
  before update on intake.map_node_moderation_access_links
  for each row
  execute function intake.touch_map_node_moderation_access_link_updated_at();

create or replace function intake.cleanup_map_node_moderation_access_links(
  now_at timestamptz default now()
)
returns integer
language plpgsql
as $$
declare
  deleted_count integer;
begin
  delete from intake.map_node_moderation_access_links
  where token_expires_at < now_at - interval '7 days';

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;
