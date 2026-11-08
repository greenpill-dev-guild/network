-- PRD-1417: refuse to approve a map node at a point the public map can't show.
--
-- Stewards approve pending submissions and owner update requests in Directus,
-- which writes straight to Postgres, so the agent's coordinate checks (PR #35)
-- never run for those approvals. This trigger applies the same rule in the
-- database: a row that is, or becomes, `approved` must have a point.
--
-- The rule mirrors getMapCoordinateProblem in packages/shared/src/map-locations.ts
-- and is checked in the same order:
-- - missing: no latitude or longitude (NaN counts as missing, as a non-number
--   does there);
-- - latitude_out_of_range: |latitude| > 90;
-- - longitude_out_of_range: |longitude| > 180;
-- - null_island: exactly 0,0, an empty field read as 0, never a place someone
--   gave.
-- The columns are numeric(9, 6), so NEW already holds the rounded value that
-- will be stored: (0.0000001, 0) reaches this trigger as 0,0 and is refused.
--
-- Edge points (latitude ±90, longitude ±180) stay allowed. A confirmed place
-- can sit there (Fiji spans the 180th meridian), and the database can't tell
-- one from a pin a broken client clamped to the edge of the map.
--
-- A trigger, not a CHECK: a CHECK would also refuse declining or archiving a
-- row saved at 0,0. Only a write that names status, latitude or longitude runs
-- it, so other edits to an old row (scrubbing private metadata, for example)
-- still work.
--
-- Migration 007 applies an approved owner update request by updating the
-- submission inside the same statement, and that update sets latitude and
-- longitude every time. When the node would end up at a bad point, this
-- trigger refuses the update, the whole approval rolls back, and the request
-- stays pending.
--
-- Directus shows a trigger's message only to admins. Everyone else sees
-- "An unexpected error occurred." (packages/admin/README.md, map moderation).
--
-- Safe to run again: the function is replaced and the trigger recreated.

create or replace function intake.map_node_approval_guard()
returns trigger
language plpgsql
as $$
declare
  problem text;
begin
  if new.status is distinct from 'approved'::intake.map_node_status then
    return new;
  end if;

  problem := case
    when new.latitude is null
      or new.longitude is null
      or new.latitude = 'NaN'::numeric
      or new.longitude = 'NaN'::numeric then 'missing'
    when abs(new.latitude) > 90 then 'latitude_out_of_range'
    when abs(new.longitude) > 180 then 'longitude_out_of_range'
    when new.latitude = 0 and new.longitude = 0 then 'null_island'
  end;

  if problem is null then
    return new;
  end if;

  raise exception using
    errcode = 'check_violation',
    message = format(
      'Map node %s can''t be approved: %s, so the public map can''t show it.',
      new.id,
      case problem
        when 'missing' then 'it has no saved latitude and longitude'
        when 'latitude_out_of_range' then 'its saved latitude is outside -90 to 90'
        when 'longitude_out_of_range' then 'its saved longitude is outside -180 to 180'
        else 'its saved point is latitude 0, longitude 0, a placeholder rather than a place'
      end
    ),
    detail = 'map_node_invalid_coordinates: ' || problem,
    hint = 'Decline or archive the node, or correct its location before approving it. '
      || 'If an owner update request would move it there, decline the request.';
end;
$$;

drop trigger if exists map_node_submissions_approval_guard
  on intake.map_node_submissions;

create trigger map_node_submissions_approval_guard
  before insert or update of status, latitude, longitude
  on intake.map_node_submissions
  for each row
  execute function intake.map_node_approval_guard();
