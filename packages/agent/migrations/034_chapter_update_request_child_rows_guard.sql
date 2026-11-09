-- Change-request links and proof signals stay on their request's chapter, and
-- a decided request takes no new ones (PRD-1443).
--
-- The child-row trigger from 027 copied chapter_slug from the parent request
-- over whatever the writer sent. It now fills chapter_slug only when the
-- writer left it empty (Data Studio's request form sends none), and keeps a
-- chapter the writer named, so the (update_request_id, chapter_slug) foreign
-- key from 016 refuses a row that names another chapter instead of the
-- trigger rewriting it.
--
-- It also refuses any new row on an accepted, declined or archived request.
-- Those record a decision, and an accepted one has already been applied to its
-- chapter. Stewards cannot edit them in Data Studio, but a direct API call
-- could still attach rows. Rows a request already holds stay.
--
-- Which requests a steward may attach rows to (their own chapters') is checked
-- by Directus, in the create validation that scripts/directus-content-access.ts
-- writes: the database does not know who is acting.

create or replace function content.fill_chapter_update_request_child_slug()
returns trigger
language plpgsql
as $$
declare
  parent_chapter text;
  parent_status text;
begin
  select chapter_slug, request_status
  into parent_chapter, parent_status
  from content.chapter_update_requests
  where id = new.update_request_id;

  if parent_status in ('accepted', 'declined', 'archived') then
    raise exception 'chapter_update_request_decided: change request % is %, so it takes no new rows.',
      new.update_request_id, parent_status
      using errcode = 'check_violation';
  end if;

  if nullif(new.chapter_slug, '') is null then
    new.chapter_slug := parent_chapter;
  end if;

  return new;
end;
$$;
