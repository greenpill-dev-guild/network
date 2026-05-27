-- Recover steward assignment tables when migration 011 ran before Directus
-- created public.directus_users. The tables are needed for local Directus
-- setup and scoped steward editing metadata.

create table if not exists content.chapter_editor_assignments (
  id uuid primary key default gen_random_uuid(),
  chapter_slug text not null references content.chapters(slug) on delete cascade,
  directus_user_id uuid not null,
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
  directus_user_id uuid not null,
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

do $$
begin
  if to_regclass('public.directus_users') is not null and not exists (
    select 1
    from pg_constraint
    where conname = 'chapter_editor_assignments_directus_user_id_fkey'
      and conrelid = 'content.chapter_editor_assignments'::regclass
  ) then
    alter table content.chapter_editor_assignments
      add constraint chapter_editor_assignments_directus_user_id_fkey
      foreign key (directus_user_id) references public.directus_users(id)
      on delete cascade not valid;

    alter table content.chapter_editor_assignments
      validate constraint chapter_editor_assignments_directus_user_id_fkey;
  end if;

  if to_regclass('public.directus_users') is not null and not exists (
    select 1
    from pg_constraint
    where conname = 'guild_editor_assignments_directus_user_id_fkey'
      and conrelid = 'content.guild_editor_assignments'::regclass
  ) then
    alter table content.guild_editor_assignments
      add constraint guild_editor_assignments_directus_user_id_fkey
      foreign key (directus_user_id) references public.directus_users(id)
      on delete cascade not valid;

    alter table content.guild_editor_assignments
      validate constraint guild_editor_assignments_directus_user_id_fkey;
  end if;
end $$;
