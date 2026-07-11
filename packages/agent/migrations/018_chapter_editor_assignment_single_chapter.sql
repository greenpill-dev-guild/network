-- A public map steward is the active Directus editor of exactly one chapter.
-- Stop conflicting assignments at the source before the live map resolves them.

do $$
begin
  if exists (
    select 1
    from content.chapter_editor_assignments
    group by directus_user_id
    having count(*) > 1
  ) then
    raise exception 'chapter_editor_assignments cannot contain more than one chapter per Directus user';
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'chapter_editor_assignments_unique_directus_user'
      and conrelid = 'content.chapter_editor_assignments'::regclass
  ) then
    alter table content.chapter_editor_assignments
      add constraint chapter_editor_assignments_unique_directus_user
      unique (directus_user_id);
  end if;
end $$;
