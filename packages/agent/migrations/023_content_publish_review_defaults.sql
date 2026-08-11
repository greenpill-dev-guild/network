-- Default publish/review bookkeeping on publish transitions.
-- The *_published_requires_review check constraints demand published_at and
-- reviewed_at before a row can be published, but nothing set them, so
-- publishing a new record from Directus failed with an unexplained 400.
-- Stamp them on the publish transition when the actor did not provide them;
-- explicitly provided values always win.

create or replace function content.default_publish_review_fields()
returns trigger
language plpgsql
as $$
begin
  if new.publication_status = 'published'::content.publication_status
     and (tg_op = 'INSERT' or old.publication_status is distinct from new.publication_status) then
    new.published_at = coalesce(new.published_at, now());
    new.reviewed_at = coalesce(new.reviewed_at, now());
    new.reviewed_by = coalesce(nullif(btrim(coalesce(new.reviewed_by, '')), ''), 'system:auto-publish');
  end if;
  return new;
end;
$$;

drop trigger if exists themes_default_publish_review on content.themes;
create trigger themes_default_publish_review
  before insert or update on content.themes
  for each row execute function content.default_publish_review_fields();

drop trigger if exists people_default_publish_review on content.people;
create trigger people_default_publish_review
  before insert or update on content.people
  for each row execute function content.default_publish_review_fields();

drop trigger if exists chapters_default_publish_review on content.chapters;
create trigger chapters_default_publish_review
  before insert or update on content.chapters
  for each row execute function content.default_publish_review_fields();

drop trigger if exists chapter_initiatives_default_publish_review on content.chapter_initiatives;
create trigger chapter_initiatives_default_publish_review
  before insert or update on content.chapter_initiatives
  for each row execute function content.default_publish_review_fields();

drop trigger if exists guilds_default_publish_review on content.guilds;
create trigger guilds_default_publish_review
  before insert or update on content.guilds
  for each row execute function content.default_publish_review_fields();

drop trigger if exists projects_default_publish_review on content.projects;
create trigger projects_default_publish_review
  before insert or update on content.projects
  for each row execute function content.default_publish_review_fields();
