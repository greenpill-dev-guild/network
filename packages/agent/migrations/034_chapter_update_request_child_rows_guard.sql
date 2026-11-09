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
-- An accepted, declined or archived request records a decision, and an
-- accepted one has already been applied to its chapter, so its rows are now
-- fixed: no row is inserted on it, moved onto or off it, edited or deleted
-- (the 027 trigger also runs when update_request_id changes, and a second
-- trigger guards edits and deletes). Stewards cannot edit decided requests in
-- Data Studio, but a direct API call could. Deleting a whole request still
-- removes its rows: by the time its foreign key cascades, the request row is
-- gone and nothing is locked or refused.
--
-- Both triggers read the request FOR SHARE, which conflicts with the row lock a
-- status change takes (the foreign key's KEY SHARE lock does not), so any row
-- change and a decision on the same request run one after the other: an
-- acceptance applies the rows as they stand once every open change is
-- committed, and a change that waited on a decision sees it and is refused.
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
  where id = new.update_request_id
  for share;

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

-- The 027 insert triggers already call this function. A row moved to another
-- request goes through the same checks.
drop trigger if exists chapter_update_request_links_move_guard
  on content.chapter_update_request_links;
create trigger chapter_update_request_links_move_guard
  before update of update_request_id on content.chapter_update_request_links
  for each row
  when (old.update_request_id is distinct from new.update_request_id)
  execute function content.fill_chapter_update_request_child_slug();

drop trigger if exists chapter_update_request_proof_signals_move_guard
  on content.chapter_update_request_proof_signals;
create trigger chapter_update_request_proof_signals_move_guard
  before update of update_request_id on content.chapter_update_request_proof_signals
  for each row
  when (old.update_request_id is distinct from new.update_request_id)
  execute function content.fill_chapter_update_request_child_slug();

-- Edits and deletes of a row are checked against the request it is on now.
create or replace function content.guard_chapter_update_request_child_change()
returns trigger
language plpgsql
as $$
declare
  parent_status text;
begin
  select request_status
  into parent_status
  from content.chapter_update_requests
  where id = old.update_request_id
  for share;

  if parent_status in ('accepted', 'declined', 'archived') then
    raise exception 'chapter_update_request_decided: change request % is %, so its rows can no longer change.',
      old.update_request_id, parent_status
      using errcode = 'check_violation';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists chapter_update_request_links_change_guard
  on content.chapter_update_request_links;
create trigger chapter_update_request_links_change_guard
  before update or delete on content.chapter_update_request_links
  for each row execute function content.guard_chapter_update_request_child_change();

drop trigger if exists chapter_update_request_proof_signals_change_guard
  on content.chapter_update_request_proof_signals;
create trigger chapter_update_request_proof_signals_change_guard
  before update or delete on content.chapter_update_request_proof_signals
  for each row execute function content.guard_chapter_update_request_child_change();
