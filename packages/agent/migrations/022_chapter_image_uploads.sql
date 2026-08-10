-- Allow chapter images to be uploaded through Directus while preserving the
-- legacy external URL field for existing content and rollback safety.

alter table content.chapters
  add column if not exists image_file uuid;

create index if not exists content_chapters_image_file_idx
  on content.chapters (image_file)
  where image_file is not null;

do $$
begin
  if to_regclass('public.directus_files') is not null and not exists (
    select 1
    from pg_constraint
    where conname = 'chapters_image_file_fkey'
      and conrelid = 'content.chapters'::regclass
  ) then
    alter table content.chapters
      add constraint chapters_image_file_fkey
      foreign key (image_file) references public.directus_files(id)
      on delete set null not valid;

    alter table content.chapters
      validate constraint chapters_image_file_fkey;
  end if;
end $$;

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
    'imageFileId', image_file,
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
