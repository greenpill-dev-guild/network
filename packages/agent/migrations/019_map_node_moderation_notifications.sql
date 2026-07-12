-- Durable delivery queue for moderator alerts. Public map-node intake writes
-- directly through the agent, so Directus cannot be the notification source.

create extension if not exists pgcrypto;

create table if not exists intake.map_node_moderation_notifications (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  submission_id uuid references intake.map_node_submissions(id) on delete cascade,
  digest_date date,
  status text not null default 'queued',
  attempts integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  delivery_claimed_at timestamptz,
  provider_message_id text,
  provider_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint map_node_moderation_notification_kind_check
    check (kind in ('submission', 'daily_digest')),
  constraint map_node_moderation_notification_status_check
    check (status in ('queued', 'delivery_claimed', 'retry_scheduled', 'sent', 'failed', 'skipped')),
  constraint map_node_moderation_notification_attempts_check
    check (attempts >= 0),
  constraint map_node_moderation_notification_shape_check
    check (
      (kind = 'submission' and submission_id is not null and digest_date is null)
      or
      (kind = 'daily_digest' and submission_id is null and digest_date is not null)
    )
);

create unique index if not exists map_node_moderation_notification_submission_idx
  on intake.map_node_moderation_notifications (submission_id)
  where kind = 'submission';

create unique index if not exists map_node_moderation_notification_digest_idx
  on intake.map_node_moderation_notifications (digest_date)
  where kind = 'daily_digest';

create index if not exists map_node_moderation_notification_delivery_queue_idx
  on intake.map_node_moderation_notifications (status, next_attempt_at, created_at);

create or replace function intake.touch_map_node_moderation_notification_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists map_node_moderation_notification_touch_updated_at
  on intake.map_node_moderation_notifications;

create trigger map_node_moderation_notification_touch_updated_at
  before update on intake.map_node_moderation_notifications
  for each row
  execute function intake.touch_map_node_moderation_notification_updated_at();

create or replace function intake.apply_map_node_submission_moderation_transition()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'approved'::intake.map_node_status
     and old.status is distinct from 'approved'::intake.map_node_status
     and new.approved_at is null then
    new.approved_at = now();
  end if;

  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists map_node_submission_moderation_transition
  on intake.map_node_submissions;

create trigger map_node_submission_moderation_transition
  before update on intake.map_node_submissions
  for each row
  execute function intake.apply_map_node_submission_moderation_transition();
