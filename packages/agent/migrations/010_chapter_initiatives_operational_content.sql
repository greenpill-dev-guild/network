-- Add chapter-owned initiatives as operational content.
-- Guild projects remain in content.projects; chapter initiatives are local
-- programs, events, campaigns, education series, and impact efforts.

create table if not exists content.chapter_initiatives (
  slug text primary key,
  chapter_slug text not null default '',
  title text not null,
  entity_status text not null default 'active',
  summary text not null default '',
  description text not null default '',
  theme_slugs text[] not null default '{}',
  links jsonb not null default '[]'::jsonb,
  proof_signals jsonb not null default '[]'::jsonb,
  impact_sources jsonb not null default '{}'::jsonb,
  related_story_slugs text[] not null default '{}',
  related_resource_slugs text[] not null default '{}',
  featured_weight integer not null default 0,
  publication_status content.publication_status not null default 'draft',
  published_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chapter_initiatives_published_requires_review check (
    publication_status <> 'published' or (published_at is not null and reviewed_at is not null)
  )
);

create index if not exists content_chapter_initiatives_publication_idx
  on content.chapter_initiatives (publication_status, chapter_slug, featured_weight desc, title);

drop trigger if exists chapter_initiatives_touch_updated_at on content.chapter_initiatives;
create trigger chapter_initiatives_touch_updated_at
  before update on content.chapter_initiatives
  for each row execute function content.touch_updated_at();

create or replace view content.public_chapter_initiatives as
select
  initiative.slug,
  initiative.chapter_slug,
  initiative.title,
  initiative.featured_weight,
  jsonb_strip_nulls(jsonb_build_object(
    'slug', initiative.slug,
    'id', initiative.slug,
    'chapterSlug', initiative.chapter_slug,
    'title', initiative.title,
    'status', initiative.entity_status,
    'summary', initiative.summary,
    'description', initiative.description,
    'themeSlugs', initiative.theme_slugs,
    'links', initiative.links,
    'proofSignals', initiative.proof_signals,
    'impactSources', jsonb_strip_nulls(jsonb_build_object(
      'impactEnabled', content.safe_jsonb_boolean(initiative.impact_sources, 'impactEnabled', false),
      'greenGoodsGardenAddress', nullif(initiative.impact_sources->>'greenGoodsGardenAddress', ''),
      'greenGoodsChainId', case
        when initiative.impact_sources->>'greenGoodsChainId' ~ '^[0-9]+$'
          then (initiative.impact_sources->>'greenGoodsChainId')::integer
        else 42161
      end,
      'karmaProjectUID', nullif(initiative.impact_sources->>'karmaProjectUID', ''),
      'karmaProjectSlug', nullif(initiative.impact_sources->>'karmaProjectSlug', ''),
      'karmaCommunitySlug', nullif(initiative.impact_sources->>'karmaCommunitySlug', '')
    )),
    'relatedStorySlugs', initiative.related_story_slugs,
    'relatedResourceSlugs', initiative.related_resource_slugs,
    'featuredWeight', initiative.featured_weight
  )) as data
from content.chapter_initiatives initiative
join content.chapters chapter on chapter.slug = initiative.chapter_slug
where initiative.publication_status = 'published'
  and chapter.publication_status = 'published'
  and content.safe_jsonb_boolean(chapter.seo, 'noindex', false) = false;

create or replace view content.public_projects as
select
  project.slug,
  project.name,
  jsonb_strip_nulls(jsonb_build_object(
    'slug', project.slug,
    'id', project.slug,
    'name', project.name,
    'status', project.entity_status,
    'guild', project.guild_slug,
    'summary', project.summary,
    'description', project.description,
    'image', project.image,
    'techStack', project.tech_stack,
    'repoUrl', project.repo_url,
    'liveUrl', project.live_url,
    'stewardSlugs', project.steward_slugs,
    'themeSlugs', project.theme_slugs,
    'featuredWeight', project.featured_weight,
    'proofSignals', project.proof_signals,
    'media', project.media,
    'seo', project.seo
  )) as data
from content.projects project
join content.guilds guild on guild.slug = project.guild_slug
where project.publication_status = 'published'
  and guild.publication_status = 'published';

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
  'chapterInitiatives', coalesce((
    select jsonb_agg(data order by chapter_slug, featured_weight desc, title)
    from content.public_chapter_initiatives
  ), '[]'::jsonb),
  'guilds', coalesce((
    select jsonb_agg(data order by name)
    from content.public_guilds
  ), '[]'::jsonb),
  'projects', coalesce((
    select jsonb_agg(data order by name)
    from content.public_projects
  ), '[]'::jsonb),
  'locations', coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', slug,
      'name', name,
      'lat', latitude,
      'long', longitude,
      'link', coalesce(nullif(primary_link, ''), '/chapters/' || slug),
      'kind', 'chapter',
      'status', entity_status,
      'themes', theme_slugs
    ) order by name)
    from content.chapters
    where publication_status = 'published'
      and latitude is not null
      and longitude is not null
      and content.safe_jsonb_boolean(seo, 'noindex', false) = false
  ), '[]'::jsonb),
  'impactSourceBindings', jsonb_build_object(
    'version', 1,
    'generatedAt', now(),
    'chapters', coalesce((
      select jsonb_agg(jsonb_build_object(
        'chapterSlug', slug,
        'chapterName', name,
        'chapterPath', '/chapters/' || slug,
        'sources', jsonb_strip_nulls(jsonb_build_object(
          'impactEnabled', true,
          'greenGoodsGardenAddress', nullif(impact_sources->>'greenGoodsGardenAddress', ''),
          'greenGoodsChainId', case
            when impact_sources->>'greenGoodsChainId' ~ '^[0-9]+$'
              then (impact_sources->>'greenGoodsChainId')::integer
            else 42161
          end,
          'karmaProjectUID', nullif(impact_sources->>'karmaProjectUID', ''),
          'karmaProjectSlug', nullif(impact_sources->>'karmaProjectSlug', ''),
          'karmaCommunitySlug', nullif(impact_sources->>'karmaCommunitySlug', '')
        ))
      ) order by name)
      from content.chapters
      where publication_status = 'published'
        and content.safe_jsonb_boolean(seo, 'noindex', false) = false
        and content.safe_jsonb_boolean(impact_sources, 'impactEnabled', false) = true
        and (
          nullif(impact_sources->>'greenGoodsGardenAddress', '') is not null
          or nullif(impact_sources->>'karmaProjectUID', '') is not null
          or nullif(impact_sources->>'karmaProjectSlug', '') is not null
          or nullif(impact_sources->>'karmaCommunitySlug', '') is not null
        )
    ), '[]'::jsonb)
  )
) as snapshot;
