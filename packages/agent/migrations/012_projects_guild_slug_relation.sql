-- Add the guild relation for projects once legacy rows have been backfilled or
-- removed. The constraint is intentionally skipped on stale databases so
-- migrations do not strand older local dev environments.

do $$
begin
  if exists (
    select 1
    from content.projects project
    left join content.guilds guild on guild.slug = project.guild_slug
    where nullif(project.guild_slug, '') is null
      or guild.slug is null
  ) then
    raise notice 'Skipping projects.guild_slug foreign key because project rows have blank or unknown guild slugs.';
  else
    if not exists (
      select 1
      from pg_constraint
      where conname = 'projects_guild_slug_fkey'
        and conrelid = 'content.projects'::regclass
    ) then
      alter table content.projects
        add constraint projects_guild_slug_fkey
        foreign key (guild_slug) references content.guilds(slug)
        on delete cascade not valid;
    end if;
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'projects_guild_slug_fkey'
      and conrelid = 'content.projects'::regclass
      and not convalidated
  ) then
    alter table content.projects
      validate constraint projects_guild_slug_fkey;
  end if;
end $$;
