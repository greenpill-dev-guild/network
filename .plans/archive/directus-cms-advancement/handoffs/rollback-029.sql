-- Generated on 2026-10-09 from production's own definitions, captured the moment migration 029 was
-- applied. The same procedure was rehearsed on a scratch database, which ended identical to its
-- starting point. It is valid only while no later migration has changed these objects.
--
-- Rollback for 029_chapter_image_alt_credit.sql, built from the definitions it replaced.
-- First unregister the Directus fields chapters.image_alt and chapters.image_credit (delete their
-- directus_fields rows and clear the Directus cache), or they will point at missing columns.
-- The agent does not need rolling back: it tolerates the view without the two keys, and it
-- swallows the failed insert of a withheld-image alert.
-- Text that stewards saved in the two columns while 029 was live is lost with the columns; for a
-- sourced image it also lives on in media.imageAlt / media.imageCredit.
begin;
set local lock_timeout = '5s';

drop trigger if exists chapters_keep_image_description on content.chapters;
drop function if exists content.keep_chapter_image_description();

create or replace view content.public_chapters as
SELECT slug,
    name,
    jsonb_strip_nulls(jsonb_build_object('slug', slug, 'id', slug, 'name', name, 'city', city, 'country', country, 'region', region, 'status', entity_status, 'summary', summary, 'introQuote', intro_quote, 'introQuoteAttribution', intro_quote_attribution, 'image', image, 'imageFileId', image_file, 'founded', founded, 'lat', latitude, 'long', longitude, 'link', primary_link, 'stewards', stewards, 'stewardSlugs', steward_slugs, 'themeSlugs', theme_slugs, 'links', links, 'connectLinks', connect_links, 'relatedChapterSlugs', related_chapter_slugs, 'featuredStory', featured_story, 'featuredStorySlugs', featured_story_slugs, 'authoredResourceSlugs', authored_resource_slugs, 'impactSources', jsonb_strip_nulls(jsonb_build_object('impactEnabled', content.safe_jsonb_boolean(impact_sources, 'impactEnabled'::text, false), 'greenGoodsGardenAddress', NULLIF(impact_sources ->> 'greenGoodsGardenAddress'::text, ''::text), 'greenGoodsChainId',
        CASE
            WHEN (impact_sources ->> 'greenGoodsChainId'::text) ~ '^[0-9]+$'::text THEN (impact_sources ->> 'greenGoodsChainId'::text)::integer
            ELSE 42161
        END, 'karmaProjectUID', NULLIF(impact_sources ->> 'karmaProjectUID'::text, ''::text), 'karmaProjectSlug', NULLIF(impact_sources ->> 'karmaProjectSlug'::text, ''::text), 'karmaCommunitySlug', NULLIF(impact_sources ->> 'karmaCommunitySlug'::text, ''::text))), 'featuredWeight', featured_weight, 'proofSignals', proof_signals, 'media', media, 'seo', seo)) AS data
   FROM content.chapters
  WHERE publication_status = 'published'::content.publication_status;

CREATE OR REPLACE FUNCTION content.apply_accepted_chapter_update_request()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
declare
  target_chapter record;
  proposed_links jsonb;
  proposed_proofs jsonb;
begin
  if new.request_status in ('accepted', 'declined', 'needs_changes', 'archived')
     and old.request_status is distinct from new.request_status
     and new.reviewed_at is null then
    new.reviewed_at = now();
  end if;

  if new.request_status = 'accepted'
     and old.request_status is distinct from 'accepted' then
    select *
    into target_chapter
    from content.chapters
    where slug = new.chapter_slug
    for update;

    if not found then
      raise exception 'chapter_update_request_missing_chapter'
        using errcode = '23503';
    end if;

    if new.chapter_updated_at_snapshot is not null
       and target_chapter.updated_at > new.chapter_updated_at_snapshot then
      raise exception 'chapter_update_request_stale_chapter: the chapter changed after this request was drafted. Compare the proposal against the current chapter, set chapter_updated_at_snapshot to the chapter''s current updated_at, and accept again.'
        using errcode = '40001';
    end if;

    select jsonb_agg(
             jsonb_strip_nulls(jsonb_build_object(
               'label', nullif(btrim(l.label), ''),
               'url', nullif(btrim(l.url), ''),
               'subtext', nullif(btrim(l.subtext), ''),
               'handle', nullif(btrim(l.handle), ''),
               'action', nullif(btrim(l.action), ''),
               'icon', nullif(btrim(l.icon), ''),
               'kind', nullif(btrim(l.kind), '')
             ))
             order by l.sort_order, l.label
           )
    into proposed_links
    from content.chapter_update_request_links l
    where l.update_request_id = new.id;

    select jsonb_agg(
             jsonb_strip_nulls(jsonb_build_object(
               'label', nullif(btrim(p.label), ''),
               'value', nullif(btrim(p.value), ''),
               'source', nullif(btrim(p.source), ''),
               'href', nullif(btrim(p.href), '')
             ))
             order by p.sort_order, p.label
           )
    into proposed_proofs
    from content.chapter_update_request_proof_signals p
    where p.update_request_id = new.id;

    update content.chapters
    set
      summary = case
        when btrim(new.proposed_summary) <> '' then btrim(new.proposed_summary)
        else summary
      end,
      primary_link = case
        when btrim(new.proposed_primary_link) <> '' then btrim(new.proposed_primary_link)
        else primary_link
      end,
      image = case
        when btrim(new.proposed_image) <> '' then btrim(new.proposed_image)
        else image
      end,
      links = coalesce(proposed_links, links),
      proof_signals = coalesce(proposed_proofs, proof_signals),
      -- Accepting a proposal that touches the image IS the media review, so
      -- reviewStatus moves to approved alongside the applied image fields.
      media = case when jsonb_typeof(media) = 'object' then media else '{}'::jsonb end
        || case
             when btrim(new.proposed_image) <> ''
             then jsonb_build_object('image', btrim(new.proposed_image), 'reviewStatus', 'approved')
             else '{}'::jsonb
           end
        || case
             when btrim(new.proposed_image_alt) <> ''
             then jsonb_build_object('imageAlt', btrim(new.proposed_image_alt))
             else '{}'::jsonb
           end
        || case
             when btrim(new.proposed_image_credit) <> ''
             then jsonb_build_object('imageCredit', btrim(new.proposed_image_credit))
             else '{}'::jsonb
           end,
      updated_at = now()
    where slug = new.chapter_slug;
  end if;

  return new;
end;
$function$;

alter table content.chapters
  drop column if exists image_alt,
  drop column if exists image_credit;

-- Rows of the new alert kind would violate the restored constraints.
delete from content.review_notifications where kind = 'chapter_image_withheld';
drop index if exists content.content_review_notification_image_withheld_idx;
alter table content.review_notifications drop constraint if exists content_review_notification_kind_check;
alter table content.review_notifications add constraint content_review_notification_kind_check CHECK ((kind = ANY (ARRAY['update_request_pending'::text, 'update_request_decided'::text, 'initiative_pending'::text, 'record_quarantined'::text, 'publish_health'::text])));
alter table content.review_notifications drop constraint if exists content_review_notification_shape_check;
alter table content.review_notifications add constraint content_review_notification_shape_check CHECK ((((kind = ANY (ARRAY['update_request_pending'::text, 'update_request_decided'::text])) AND (request_id IS NOT NULL)) OR ((kind = 'initiative_pending'::text) AND (request_id IS NULL) AND (initiative_slug <> ''::text)) OR ((kind = 'record_quarantined'::text) AND (request_id IS NULL) AND (record_collection <> ''::text) AND (record_slug <> ''::text)) OR ((kind = 'publish_health'::text) AND (request_id IS NULL) AND (event_key <> ''::text) AND (publish_health_kind = ANY (ARRAY['stale'::text, 'build_failed'::text])) AND (publish_health_status = ANY (ARRAY['active'::text, 'recovered'::text])) AND (jsonb_typeof(publish_health_details) = 'object'::text))));

delete from audit.agent_schema_migrations where version = '029_chapter_image_alt_credit.sql';
commit;
