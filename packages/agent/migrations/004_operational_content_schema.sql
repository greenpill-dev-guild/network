-- Greenpill operational content schema.
-- Directus may edit these Greenpill-owned tables, but SQL migrations remain
-- the canonical schema source. Public consumers read only published views.

create schema if not exists content;

do $$
begin
  if to_regtype('content.publication_status') is null then
    create type content.publication_status as enum (
      'draft',
      'pending_review',
      'published',
      'archived'
    );
  end if;
end $$;

create or replace function content.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists content.themes (
  slug text primary key,
  name text not null,
  summary text not null default '',
  sort_order integer not null default 0,
  publication_status content.publication_status not null default 'draft',
  published_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint themes_published_requires_review check (
    publication_status <> 'published' or (published_at is not null and reviewed_at is not null)
  )
);

create table if not exists content.people (
  slug text primary key,
  display_name text not null,
  role text not null default '',
  avatar text not null default '',
  bio text not null default '',
  theme_slugs text[] not null default '{}',
  links jsonb not null default '[]'::jsonb,
  media jsonb not null default '{}'::jsonb,
  seo jsonb not null default '{}'::jsonb,
  publication_status content.publication_status not null default 'draft',
  published_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint people_published_requires_review check (
    publication_status <> 'published' or (published_at is not null and reviewed_at is not null)
  )
);

create table if not exists content.chapters (
  slug text primary key,
  name text not null,
  city text not null default '',
  country text not null default '',
  region text not null default '',
  entity_status text not null default 'active',
  summary text not null default '',
  intro_quote text not null default '',
  intro_quote_attribution text not null default '',
  image text not null default '',
  founded text not null default '',
  latitude numeric(9, 6),
  longitude numeric(9, 6),
  primary_link text not null default '',
  stewards jsonb not null default '[]'::jsonb,
  steward_slugs text[] not null default '{}',
  theme_slugs text[] not null default '{}',
  links jsonb not null default '[]'::jsonb,
  connect_links jsonb not null default '[]'::jsonb,
  related_chapter_slugs text[] not null default '{}',
  featured_story jsonb not null default '{}'::jsonb,
  featured_story_slugs text[] not null default '{}',
  authored_resource_slugs text[] not null default '{}',
  impact_sources jsonb not null default '{}'::jsonb,
  featured_weight integer not null default 0,
  proof_signals jsonb not null default '[]'::jsonb,
  media jsonb not null default '{}'::jsonb,
  seo jsonb not null default '{}'::jsonb,
  publication_status content.publication_status not null default 'draft',
  published_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chapters_published_requires_review check (
    publication_status <> 'published' or (published_at is not null and reviewed_at is not null)
  )
);

create table if not exists content.guilds (
  slug text primary key,
  name text not null,
  type text not null default 'guild',
  entity_status text not null default 'active',
  summary text not null default '',
  description text not null default '',
  founded_year integer,
  steward_slugs text[] not null default '{}',
  member_slugs text[] not null default '{}',
  theme_slugs text[] not null default '{}',
  links jsonb not null default '[]'::jsonb,
  connect_links jsonb not null default '[]'::jsonb,
  featured_weight integer not null default 0,
  media jsonb not null default '{}'::jsonb,
  seo jsonb not null default '{}'::jsonb,
  publication_status content.publication_status not null default 'draft',
  published_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint guilds_published_requires_review check (
    publication_status <> 'published' or (published_at is not null and reviewed_at is not null)
  )
);

create table if not exists content.projects (
  slug text primary key,
  name text not null,
  entity_status text not null default 'active',
  guild_slug text not null default '',
  summary text not null default '',
  description text not null default '',
  image text not null default '',
  tech_stack text[] not null default '{}',
  repo_url text not null default '',
  live_url text not null default '',
  steward_slugs text[] not null default '{}',
  theme_slugs text[] not null default '{}',
  featured_weight integer not null default 0,
  proof_signals jsonb not null default '[]'::jsonb,
  media jsonb not null default '{}'::jsonb,
  seo jsonb not null default '{}'::jsonb,
  publication_status content.publication_status not null default 'draft',
  published_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint projects_published_requires_review check (
    publication_status <> 'published' or (published_at is not null and reviewed_at is not null)
  )
);

create index if not exists content_themes_publication_idx
  on content.themes (publication_status, sort_order, name);
create index if not exists content_people_publication_idx
  on content.people (publication_status, display_name);
create index if not exists content_chapters_publication_idx
  on content.chapters (publication_status, name);
create index if not exists content_guilds_publication_idx
  on content.guilds (publication_status, type, name);
create index if not exists content_projects_publication_idx
  on content.projects (publication_status, name);

drop trigger if exists themes_touch_updated_at on content.themes;
create trigger themes_touch_updated_at
  before update on content.themes
  for each row execute function content.touch_updated_at();

drop trigger if exists people_touch_updated_at on content.people;
create trigger people_touch_updated_at
  before update on content.people
  for each row execute function content.touch_updated_at();

drop trigger if exists chapters_touch_updated_at on content.chapters;
create trigger chapters_touch_updated_at
  before update on content.chapters
  for each row execute function content.touch_updated_at();

drop trigger if exists guilds_touch_updated_at on content.guilds;
create trigger guilds_touch_updated_at
  before update on content.guilds
  for each row execute function content.touch_updated_at();

drop trigger if exists projects_touch_updated_at on content.projects;
create trigger projects_touch_updated_at
  before update on content.projects
  for each row execute function content.touch_updated_at();

create or replace view content.public_themes as
select
  slug,
  name,
  sort_order,
  data
    || jsonb_build_object(
      'slug', slug,
      'id', slug,
      'name', name,
      'summary', summary,
      'sortOrder', sort_order
    ) as data
from content.themes
where publication_status = 'published';

create or replace view content.public_people as
select
  slug,
  display_name,
  data
    || jsonb_build_object(
      'slug', slug,
      'id', slug,
      'displayName', display_name,
      'role', role,
      'avatar', avatar,
      'bio', bio,
      'themeSlugs', theme_slugs,
      'links', links,
      'media', media,
      'seo', seo
    ) as data
from content.people
where publication_status = 'published';

create or replace view content.public_chapters as
select
  slug,
  name,
  data
    || jsonb_build_object(
      'slug', slug,
      'id', slug,
      'name', name,
      'city', city,
      'country', country,
      'region', region,
      'status', entity_status,
      'summary', summary,
      'introQuote', intro_quote,
      'introQuoteAttribution', intro_quote_attribution,
      'image', image,
      'founded', founded,
      'lat', latitude,
      'long', longitude,
      'link', primary_link,
      'stewards', stewards,
      'stewardSlugs', steward_slugs,
      'themeSlugs', theme_slugs,
      'links', links,
      'connectLinks', connect_links,
      'relatedChapterSlugs', related_chapter_slugs,
      'featuredStory', featured_story,
      'featuredStorySlugs', featured_story_slugs,
      'authoredResourceSlugs', authored_resource_slugs,
      'impactSources', impact_sources,
      'featuredWeight', featured_weight,
      'proofSignals', proof_signals,
      'media', media,
      'seo', seo
    ) as data
from content.chapters
where publication_status = 'published';

create or replace view content.public_guilds as
select
  slug,
  name,
  data
    || jsonb_build_object(
      'slug', slug,
      'id', slug,
      'name', name,
      'type', type,
      'status', entity_status,
      'summary', summary,
      'description', description,
      'foundedYear', founded_year,
      'stewardSlugs', steward_slugs,
      'memberSlugs', member_slugs,
      'themeSlugs', theme_slugs,
      'links', links,
      'connectLinks', connect_links,
      'featuredWeight', featured_weight,
      'media', media,
      'seo', seo
    ) as data
from content.guilds
where publication_status = 'published';

create or replace view content.public_projects as
select
  slug,
  name,
  data
    || jsonb_build_object(
      'slug', slug,
      'id', slug,
      'name', name,
      'status', entity_status,
      'guild', guild_slug,
      'summary', summary,
      'description', description,
      'image', image,
      'techStack', tech_stack,
      'repoUrl', repo_url,
      'liveUrl', live_url,
      'stewardSlugs', steward_slugs,
      'themeSlugs', theme_slugs,
      'featuredWeight', featured_weight,
      'proofSignals', proof_signals,
      'media', media,
      'seo', seo
    ) as data
from content.projects
where publication_status = 'published';

create or replace view content.public_operational_content_snapshot as
select jsonb_build_object(
  'version', 1,
  'generatedAt', now(),
  'themes', coalesce((
    select jsonb_agg(data order by sort_order, name)
    from content.public_themes
  ), '[]'::jsonb),
  'people', coalesce((
    select jsonb_agg(data order by display_name)
    from content.public_people
  ), '[]'::jsonb),
  'chapters', coalesce((
    select jsonb_agg(data order by name)
    from content.public_chapters
  ), '[]'::jsonb),
  'guilds', coalesce((
    select jsonb_agg(data order by name)
    from content.public_guilds
  ), '[]'::jsonb),
  'projects', coalesce((
    select jsonb_agg(data order by name)
    from content.public_projects
  ), '[]'::jsonb)
) as snapshot;
