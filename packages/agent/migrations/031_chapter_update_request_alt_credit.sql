-- Alt text and credit on a chapter update request become nullable, with NULL
-- as the one empty value, the same as chapters.image_alt and
-- chapters.image_credit (migration 029).
--
-- Both columns were `not null default ''`, so a field a steward never touched
-- held ''. Data Studio only treats NULL as missing when a field is required,
-- and that let a request with a proposed image save without alt text.

alter table content.chapter_update_requests
  alter column proposed_image_alt drop default,
  alter column proposed_image_alt drop not null,
  alter column proposed_image_credit drop default,
  alter column proposed_image_credit drop not null;

-- Keeps NULL the one empty value for every writer: Data Studio, the API,
-- scripts, and the content agent. A blank string from any of them would pass
-- the required check again.
create or replace function content.normalize_chapter_update_request_image_description()
returns trigger
language plpgsql
as $$
begin
  new.proposed_image_alt := nullif(btrim(new.proposed_image_alt), '');
  new.proposed_image_credit := nullif(btrim(new.proposed_image_credit), '');
  return new;
end;
$$;

drop trigger if exists chapter_update_requests_normalize_image_description
  on content.chapter_update_requests;
create trigger chapter_update_requests_normalize_image_description
  before insert or update on content.chapter_update_requests
  for each row execute function content.normalize_chapter_update_request_image_description();

-- Existing requests. This is a storage move, not an edit, so updated_at stays
-- untouched. No status changes here, so nothing is applied to a chapter and no
-- review email is queued.
alter table content.chapter_update_requests disable trigger chapter_update_requests_touch_updated_at;

update content.chapter_update_requests
set
  proposed_image_alt = nullif(btrim(proposed_image_alt), ''),
  proposed_image_credit = nullif(btrim(proposed_image_credit), '')
where proposed_image_alt is distinct from nullif(btrim(proposed_image_alt), '')
   or proposed_image_credit is distinct from nullif(btrim(proposed_image_credit), '');

alter table content.chapter_update_requests enable trigger chapter_update_requests_touch_updated_at;

-- content.apply_accepted_chapter_update_request() (migration 029) already
-- reads both columns through nullif(btrim(...), ''), so it needs no change.
