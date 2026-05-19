-- Keep public operational projections resilient to malformed Directus JSON.
-- JSON editor fields may contain strings, booleans, numbers, or bad values;
-- public snapshot queries should coerce known boolean values and fall back
-- instead of failing the route/build.

create or replace function content.safe_jsonb_boolean(
  source jsonb,
  key text,
  fallback boolean default false
)
returns boolean
language sql
immutable
as $$
  select case lower(nullif(trim(source->>key), ''))
    when 'true' then true
    when 't' then true
    when '1' then true
    when 'yes' then true
    when 'y' then true
    when 'on' then true
    when 'false' then false
    when 'f' then false
    when '0' then false
    when 'no' then false
    when 'n' then false
    when 'off' then false
    else fallback
  end;
$$;

create or replace view content.public_chapters as
select
  slug,
  name,
  jsonb_strip_nulls(jsonb_build_object(
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
    'impactSources', jsonb_strip_nulls(jsonb_build_object(
      'impactEnabled', content.safe_jsonb_boolean(impact_sources, 'impactEnabled', false),
      'greenGoodsGardenAddress', nullif(impact_sources->>'greenGoodsGardenAddress', ''),
      'greenGoodsChainId', case
        when impact_sources->>'greenGoodsChainId' ~ '^[0-9]+$'
          then (impact_sources->>'greenGoodsChainId')::integer
        else 42161
      end,
      'karmaProjectUID', nullif(impact_sources->>'karmaProjectUID', ''),
      'karmaProjectSlug', nullif(impact_sources->>'karmaProjectSlug', ''),
      'karmaCommunitySlug', nullif(impact_sources->>'karmaCommunitySlug', '')
    )),
    'featuredWeight', featured_weight,
    'proofSignals', proof_signals,
    'media', media,
    'seo', seo
  )) as data
from content.chapters
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
