-- Live Onboarding Mode auto-off. A forgotten toggle previously auto-approved
-- every public submission indefinitely; an expiry timestamp bounds it.
-- The agent reads intake.effective_live_onboarding_enabled() so an expired
-- toggle behaves as disabled even before anything flips the stored flag.

alter table intake.map_node_intake_settings
  add column if not exists live_onboarding_expires_at timestamptz;

create or replace function intake.effective_live_onboarding_enabled()
returns boolean
language sql
stable
as $$
  select coalesce(
    (
      select live_onboarding_enabled
        and (live_onboarding_expires_at is null or live_onboarding_expires_at > now())
      from intake.map_node_intake_settings
      where id = 1
    ),
    false
  );
$$;

-- Housekeeping helper for the agent sweep: flips the stored flag off once the
-- expiry passes, records the actor, and reports whether a change happened.
create or replace function intake.expire_live_onboarding(now_at timestamptz default now())
returns boolean
language plpgsql
as $$
declare
  changed boolean := false;
begin
  update intake.map_node_intake_settings
  set live_onboarding_enabled = false,
      updated_by = 'system:live-onboarding-expiry'
  where id = 1
    and live_onboarding_enabled
    and live_onboarding_expires_at is not null
    and live_onboarding_expires_at <= now_at;
  changed := found;
  return changed;
end;
$$;
