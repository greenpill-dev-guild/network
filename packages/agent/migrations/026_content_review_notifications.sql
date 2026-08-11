-- Durable delivery queue for content-review notifications, mirroring the
-- intake.map_node_moderation_notifications pattern from migration 019.
-- Directus writes content rows directly, so triggers enqueue and the agent
-- delivers (Resend) with claim/retry semantics. Recipient addresses are
-- resolved at send time and never stored here.

create extension if not exists pgcrypto;

create table if not exists content.review_notifications (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  request_id uuid references content.chapter_update_requests(id) on delete cascade,
  chapter_slug text not null default '',
  initiative_slug text not null default '',
  record_collection text not null default '',
  record_slug text not null default '',
  quarantine_reason text not null default '',
  request_status text not null default '',
  status text not null default 'queued',
  attempts integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  delivery_claimed_at timestamptz,
  provider_message_id text,
  provider_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint content_review_notification_kind_check
    check (kind in ('update_request_pending', 'update_request_decided', 'initiative_pending', 'record_quarantined')),
  constraint content_review_notification_status_check
    check (status in ('queued', 'delivery_claimed', 'retry_scheduled', 'sent', 'failed', 'skipped')),
  constraint content_review_notification_attempts_check
    check (attempts >= 0),
  constraint content_review_notification_shape_check
    check (
      (kind in ('update_request_pending', 'update_request_decided') and request_id is not null)
      or
      (kind = 'initiative_pending' and request_id is null and initiative_slug <> '')
      or
      (kind = 'record_quarantined' and request_id is null and record_collection <> '' and record_slug <> '')
    )
);

create index if not exists content_review_notification_delivery_queue_idx
  on content.review_notifications (status, next_attempt_at, created_at);

create index if not exists content_review_notification_request_idx
  on content.review_notifications (request_id)
  where request_id is not null;

-- One quarantine alert per record: the agent enqueues on every snapshot
-- render, so inserts use on-conflict-do-nothing against this index.
create unique index if not exists content_review_notification_quarantine_idx
  on content.review_notifications (kind, record_collection, record_slug)
  where kind = 'record_quarantined';

create or replace function content.touch_review_notification_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists content_review_notification_touch_updated_at
  on content.review_notifications;
create trigger content_review_notification_touch_updated_at
  before update on content.review_notifications
  for each row execute function content.touch_review_notification_updated_at();

-- Enqueue on review-relevant transitions.
create or replace function content.queue_chapter_update_request_notifications()
returns trigger
language plpgsql
as $$
begin
  if (tg_op = 'INSERT' and new.request_status = 'pending_review')
     or (
       tg_op = 'UPDATE'
       and new.request_status = 'pending_review'
       and old.request_status is distinct from new.request_status
     ) then
    insert into content.review_notifications (kind, request_id, chapter_slug, request_status)
    values ('update_request_pending', new.id, new.chapter_slug, new.request_status);
  end if;

  if tg_op = 'UPDATE'
     and new.request_status in ('accepted', 'declined', 'needs_changes')
     and old.request_status is distinct from new.request_status then
    insert into content.review_notifications (kind, request_id, chapter_slug, request_status)
    values ('update_request_decided', new.id, new.chapter_slug, new.request_status);
  end if;

  return new;
end;
$$;

drop trigger if exists chapter_update_requests_queue_notifications
  on content.chapter_update_requests;
create trigger chapter_update_requests_queue_notifications
  after insert or update on content.chapter_update_requests
  for each row execute function content.queue_chapter_update_request_notifications();

create or replace function content.queue_chapter_initiative_notifications()
returns trigger
language plpgsql
as $$
begin
  if (tg_op = 'INSERT' and new.publication_status = 'pending_review'::content.publication_status)
     or (
       tg_op = 'UPDATE'
       and new.publication_status = 'pending_review'::content.publication_status
       and old.publication_status is distinct from new.publication_status
     ) then
    insert into content.review_notifications (kind, chapter_slug, initiative_slug, request_status)
    values ('initiative_pending', new.chapter_slug, new.slug, new.publication_status::text);
  end if;

  return new;
end;
$$;

drop trigger if exists chapter_initiatives_queue_notifications
  on content.chapter_initiatives;
create trigger chapter_initiatives_queue_notifications
  after insert or update on content.chapter_initiatives
  for each row execute function content.queue_chapter_initiative_notifications();
