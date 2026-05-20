-- Scope steward editing to explicitly assigned chapter and guild records.
-- Directus owns the UI and permission metadata; Greenpill-owned assignment
-- tables live in the content schema with the rest of the operational model.

do $$
begin
  if to_regclass('public.directus_users') is null then
    raise notice 'Skipping Directus steward assignment tables because public.directus_users does not exist.';
  else
    create table if not exists content.chapter_editor_assignments (
      id uuid primary key default gen_random_uuid(),
      chapter_slug text not null references content.chapters(slug) on delete cascade,
      directus_user_id uuid not null references public.directus_users(id) on delete cascade,
      access_level text not null default 'editor',
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      constraint chapter_editor_assignments_access_level_check
        check (access_level in ('editor')),
      constraint chapter_editor_assignments_unique_user_chapter
        unique (chapter_slug, directus_user_id)
    );

    create table if not exists content.guild_editor_assignments (
      id uuid primary key default gen_random_uuid(),
      guild_slug text not null references content.guilds(slug) on delete cascade,
      directus_user_id uuid not null references public.directus_users(id) on delete cascade,
      access_level text not null default 'editor',
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      constraint guild_editor_assignments_access_level_check
        check (access_level in ('editor')),
      constraint guild_editor_assignments_unique_user_guild
        unique (guild_slug, directus_user_id)
    );

    create index if not exists content_chapter_editor_assignments_user_idx
      on content.chapter_editor_assignments (directus_user_id, chapter_slug);

    create index if not exists content_guild_editor_assignments_user_idx
      on content.guild_editor_assignments (directus_user_id, guild_slug);

    drop trigger if exists chapter_editor_assignments_touch_updated_at on content.chapter_editor_assignments;
    create trigger chapter_editor_assignments_touch_updated_at
      before update on content.chapter_editor_assignments
      for each row execute function content.touch_updated_at();

    drop trigger if exists guild_editor_assignments_touch_updated_at on content.guild_editor_assignments;
    create trigger guild_editor_assignments_touch_updated_at
      before update on content.guild_editor_assignments
      for each row execute function content.touch_updated_at();
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'chapter_initiatives_chapter_slug_fkey'
      and conrelid = 'content.chapter_initiatives'::regclass
  ) then
    alter table content.chapter_initiatives
      add constraint chapter_initiatives_chapter_slug_fkey
      foreign key (chapter_slug) references content.chapters(slug)
      on delete cascade not valid;
  end if;
end $$;

alter table content.chapter_initiatives
  validate constraint chapter_initiatives_chapter_slug_fkey;

-- The projects.guild_slug foreign key is applied by the follow-up migration
-- once legacy project rows with blank guild slugs are absent.
