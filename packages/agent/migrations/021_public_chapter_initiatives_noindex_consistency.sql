-- content.public_chapter_initiatives excluded every initiative whose chapter
-- carried seo.noindex, which is inconsistent with the rest of the projection:
-- content.public_chapters filters on publication_status only, so a noindexed
-- chapter still gets a public page, and the website marks that page with
-- <meta name="robots" content="noindex,nofollow"> in GpLayout.
--
-- Elsewhere noindex only removes a chapter from network-wide discovery
-- surfaces (map locations, impact source bindings), never from its own page.
-- Stripping a rendered chapter's own initiatives out of the data conflated an
-- SEO directive with publication state, so the Uncommons chapter page silently
-- lost its published "Publications and Learning Series" initiative.
--
-- Publication status remains the only visibility gate for initiatives.

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
  and chapter.publication_status = 'published';
