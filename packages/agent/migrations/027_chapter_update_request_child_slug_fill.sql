-- Fill chapter_update_request child-row chapter_slug from the parent request.
-- Under permissions v2 the per-slug create preset is gone (dynamic policies
-- cannot preset a per-user value), so the database derives the denormalized
-- slug deterministically. This also removes the confusing composite-FK 400:
-- a child row always lands on its parent's chapter, and a row attached to a
-- request outside the steward's assignments is simply invisible to them.

create or replace function content.fill_chapter_update_request_child_slug()
returns trigger
language plpgsql
as $$
begin
  select chapter_slug
  into new.chapter_slug
  from content.chapter_update_requests
  where id = new.update_request_id;
  return new;
end;
$$;

drop trigger if exists chapter_update_request_links_fill_slug
  on content.chapter_update_request_links;
create trigger chapter_update_request_links_fill_slug
  before insert on content.chapter_update_request_links
  for each row execute function content.fill_chapter_update_request_child_slug();

drop trigger if exists chapter_update_request_proof_signals_fill_slug
  on content.chapter_update_request_proof_signals;
create trigger chapter_update_request_proof_signals_fill_slug
  before insert on content.chapter_update_request_proof_signals
  for each row execute function content.fill_chapter_update_request_child_slug();
