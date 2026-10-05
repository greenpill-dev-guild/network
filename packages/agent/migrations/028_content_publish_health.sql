-- Durable website publish-health state and alert delivery.
--
-- The public website exposes only static build timestamps. The agent compares
-- those timestamps with the latest operational-content update and the latest
-- completed GitHub Pages workflow, then records transitions here. Alerts reuse
-- content.review_notifications so provider retries and delivery audit stay in
-- the existing durable queue. No recipient addresses or private intake data are
-- stored in either table.

create table if not exists content.publish_health (
  id text primary key default 'website',
  content_watermark timestamptz,
  deployed_build_at timestamptz,
  deployed_snapshot_generated_at timestamptz,
  latest_pages_run_id text not null default '',
  latest_pages_run_url text not null default '',
  latest_pages_conclusion text not null default '',
  latest_pages_completed_at timestamptz,
  stale_threshold_ms bigint,
  checked_at timestamptz,
  stale_alert_active boolean not null default false,
  build_failed_alert_active boolean not null default false,
  stale_recovered_at timestamptz,
  build_failed_recovered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint content_publish_health_singleton_check check (id = 'website'),
  constraint content_publish_health_threshold_check check (
    stale_threshold_ms is null or stale_threshold_ms > 0
  )
);

insert into content.publish_health (id)
values ('website')
on conflict (id) do nothing;

create or replace function content.touch_publish_health_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists content_publish_health_touch_updated_at
  on content.publish_health;
create trigger content_publish_health_touch_updated_at
  before update on content.publish_health
  for each row execute function content.touch_publish_health_updated_at();

alter table content.review_notifications
  add column if not exists event_key text not null default '',
  add column if not exists publish_health_kind text not null default '',
  add column if not exists publish_health_status text not null default '',
  add column if not exists publish_health_details jsonb not null default '{}'::jsonb;

alter table content.review_notifications
  drop constraint if exists content_review_notification_kind_check;
alter table content.review_notifications
  add constraint content_review_notification_kind_check
  check (kind in (
    'update_request_pending',
    'update_request_decided',
    'initiative_pending',
    'record_quarantined',
    'publish_health'
  ));

alter table content.review_notifications
  drop constraint if exists content_review_notification_shape_check;
alter table content.review_notifications
  add constraint content_review_notification_shape_check
  check (
    (kind in ('update_request_pending', 'update_request_decided') and request_id is not null)
    or
    (kind = 'initiative_pending' and request_id is null and initiative_slug <> '')
    or
    (kind = 'record_quarantined' and request_id is null and record_collection <> '' and record_slug <> '')
    or
    (
      kind = 'publish_health'
      and request_id is null
      and event_key <> ''
      and publish_health_kind in ('stale', 'build_failed')
      and publish_health_status in ('active', 'recovered')
      and jsonb_typeof(publish_health_details) = 'object'
    )
  );

create unique index if not exists content_review_notification_event_key_idx
  on content.review_notifications (event_key)
  where event_key <> '';
