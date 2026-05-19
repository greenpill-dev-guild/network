-- Replay-safe Live Onboarding Mode settings.
-- This is intentionally separate from 001 because existing databases may have
-- already recorded the baseline map-node schema migration.

create schema if not exists intake;

create table if not exists intake.map_node_intake_settings (
  id integer primary key default 1,
  live_onboarding_enabled boolean not null default false,
  updated_by text,
  updated_at timestamptz not null default now(),
  constraint map_node_intake_settings_singleton check (id = 1)
);

insert into intake.map_node_intake_settings (id, live_onboarding_enabled)
values (1, false)
on conflict (id) do nothing;

create or replace function intake.touch_map_node_intake_settings_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists map_node_intake_settings_touch_updated_at
  on intake.map_node_intake_settings;

create trigger map_node_intake_settings_touch_updated_at
  before update on intake.map_node_intake_settings
  for each row
  execute function intake.touch_map_node_intake_settings_updated_at();
