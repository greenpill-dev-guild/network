-- A decided change request takes no new link or proof-signal rows (PRD-1443).
--
-- Accepted, declined and archived requests record a decision, and an accepted
-- one has already been applied to its chapter. Stewards cannot edit them in
-- Data Studio, but a direct API call could still attach rows to one. The
-- child-row trigger from 027 therefore now refuses an insert whose parent
-- request is decided, and still fills chapter_slug from the parent as before.
--
-- Which requests a steward may attach rows to (their own chapters') is checked
-- by Directus, in the create validation that scripts/directus-content-access.ts
-- writes: the database does not know who is acting.

create or replace function content.fill_chapter_update_request_child_slug()
returns trigger
language plpgsql
as $$
declare
  parent_status text;
begin
  select chapter_slug, request_status
  into new.chapter_slug, parent_status
  from content.chapter_update_requests
  where id = new.update_request_id;

  if parent_status in ('accepted', 'declined', 'archived') then
    raise exception 'chapter_update_request_decided: change request % is %, so it takes no new rows.',
      new.update_request_id, parent_status
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;
