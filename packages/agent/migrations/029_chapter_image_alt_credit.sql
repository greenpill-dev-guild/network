-- First-class alt text and credit for the chapter image.
--
-- Until now both lived inside the media JSON, so a steward who uploaded an
-- image could only describe it by hand-editing JSON, and an upload kept the
-- alt text and credit of the image it replaced.
--
-- A chapter shows one image: an uploaded file (image_file) or, without one,
-- the reviewed sourced image (image / media.image).
--
-- image_alt and image_credit describe the image the chapter shows right now,
-- so the edit form always shows what the public page shows. media.imageAlt and
-- media.imageCredit keep describing the sourced image, also while an upload
-- hides it, so removing the upload brings that description back.
--
-- Both columns are nullable and NULL is the one empty value: Directus sends
-- null for an emptied input and only treats null as missing when a field is
-- required.

alter table content.chapters
  add column if not exists image_alt text,
  add column if not exists image_credit text;

-- Backfill from the sourced image's description. Chapters that already show an
-- uploaded file are skipped: their JSON describes the image the upload hides.
-- This is a storage move, not a content edit, so updated_at stays untouched
-- and no site rebuild is dispatched for it.
alter table content.chapters disable trigger chapters_touch_updated_at;

update content.chapters
set
  image_alt = case
    when jsonb_typeof(media->'imageAlt') = 'string' then nullif(btrim(media->>'imageAlt'), '')
  end,
  image_credit = case
    when jsonb_typeof(media->'imageCredit') = 'string' then nullif(btrim(media->>'imageCredit'), '')
  end
where image_file is null
  and image_alt is null
  and image_credit is null
  and jsonb_typeof(media) = 'object'
  and (
    (jsonb_typeof(media->'imageAlt') = 'string' and btrim(media->>'imageAlt') <> '')
    or (jsonb_typeof(media->'imageCredit') = 'string' and btrim(media->>'imageCredit') <> '')
  );

alter table content.chapters enable trigger chapters_touch_updated_at;

-- Keeps image_alt and image_credit true to the image the chapter shows, for
-- every writer: Data Studio, the API, imports, and accepted update requests.
--
-- While an upload is attached:
--   a different file empties the text that did not arrive with it, because it
--   described the previous image. A first image on a chapter that had none
--   keeps what was already typed.
-- While the sourced image shows:
--   text edited in the columns is recorded with that image in media;
--   a description changed in media (a reviewed request, an import) or an
--   upload that was just removed brings media's description into the columns.
--
-- "Arrived with it" means the value changed in the same write. A write that
-- repeats the old text is indistinguishable from one that did not mention it.
--
-- A sourced image is any of image, media.image, or media.ogImage: the same
-- three the public projection shows as the chapter image.
create or replace function content.keep_chapter_image_description()
returns trigger
language plpgsql
as $$
declare
  new_media jsonb;
  old_media jsonb;
  media_alt text;
  media_credit text;
  old_media_alt text;
  old_media_credit text;
  has_sourced_image boolean;
  had_image boolean;
  upload_removed boolean;
  record_alt boolean := false;
  record_credit boolean := false;
begin
  new.image_alt := nullif(btrim(new.image_alt), '');
  new.image_credit := nullif(btrim(new.image_credit), '');

  new_media := case when jsonb_typeof(new.media) = 'object' then new.media else '{}'::jsonb end;
  media_alt := case
    when jsonb_typeof(new_media->'imageAlt') = 'string' then nullif(btrim(new_media->>'imageAlt'), '')
  end;
  media_credit := case
    when jsonb_typeof(new_media->'imageCredit') = 'string' then nullif(btrim(new_media->>'imageCredit'), '')
  end;
  has_sourced_image := btrim(coalesce(new.image, '')) <> ''
    or btrim(coalesce(new_media->>'image', '')) <> ''
    or btrim(coalesce(new_media->>'ogImage', '')) <> '';

  if tg_op = 'INSERT' then
    if new.image_file is null then
      if new.image_alt is null then
        new.image_alt := media_alt;
      else
        record_alt := true;
      end if;
      if new.image_credit is null then
        new.image_credit := media_credit;
      else
        record_credit := true;
      end if;
    end if;
  else
    old_media := case when jsonb_typeof(old.media) = 'object' then old.media else '{}'::jsonb end;
    old_media_alt := case
      when jsonb_typeof(old_media->'imageAlt') = 'string' then nullif(btrim(old_media->>'imageAlt'), '')
    end;
    old_media_credit := case
      when jsonb_typeof(old_media->'imageCredit') = 'string' then nullif(btrim(old_media->>'imageCredit'), '')
    end;

    if new.image_file is not null then
      had_image := old.image_file is not null
        or btrim(coalesce(old.image, '')) <> ''
        or btrim(coalesce(old_media->>'image', '')) <> ''
        or btrim(coalesce(old_media->>'ogImage', '')) <> '';
      if had_image and new.image_file is distinct from old.image_file then
        if new.image_alt is not distinct from old.image_alt then
          new.image_alt := null;
        end if;
        if new.image_credit is not distinct from old.image_credit then
          new.image_credit := null;
        end if;
      end if;
    else
      upload_removed := old.image_file is not null;

      if new.image_alt is distinct from old.image_alt then
        record_alt := true;
      elsif upload_removed or media_alt is distinct from old_media_alt then
        new.image_alt := media_alt;
      end if;

      if new.image_credit is distinct from old.image_credit then
        record_credit := true;
      elsif upload_removed or media_credit is distinct from old_media_credit then
        new.image_credit := media_credit;
      end if;
    end if;
  end if;

  if has_sourced_image then
    if record_alt and new.image_alt is distinct from media_alt then
      new_media := (new_media - 'imageAlt')
        || jsonb_strip_nulls(jsonb_build_object('imageAlt', new.image_alt));
      new.media := new_media;
    end if;
    if record_credit and new.image_credit is distinct from media_credit then
      new_media := (new_media - 'imageCredit')
        || jsonb_strip_nulls(jsonb_build_object('imageCredit', new.image_credit));
      new.media := new_media;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists chapters_keep_image_description on content.chapters;
create trigger chapters_keep_image_description
  before insert or update on content.chapters
  for each row execute function content.keep_chapter_image_description();

-- Project the new columns. The agent and shared contract decide which image
-- is public and fold these into the public media object.
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
    'imageAlt', nullif(btrim(image_alt), ''),
    'imageCredit', nullif(btrim(image_credit), ''),
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

-- Accepting an update request now lands on the same shape as a direct edit:
-- alt text and credit go to the columns, and an accepted image becomes the
-- chapter's one image.
create or replace function content.apply_accepted_chapter_update_request()
returns trigger
language plpgsql
as $$
declare
  target_chapter record;
  proposed_links jsonb;
  proposed_proofs jsonb;
  proposed_image text := btrim(new.proposed_image);
  proposed_image_alt text := nullif(btrim(new.proposed_image_alt), '');
  proposed_image_credit text := nullif(btrim(new.proposed_image_credit), '');
  current_media jsonb;
  current_seo jsonb;
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

    current_media := case
      when jsonb_typeof(target_chapter.media) = 'object' then target_chapter.media
      else '{}'::jsonb
    end;
    current_seo := case
      when jsonb_typeof(target_chapter.seo) = 'object' then target_chapter.seo
      else '{}'::jsonb
    end;

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
        when proposed_image <> '' then proposed_image
        else image
      end,
      -- The accepted image replaces whatever the chapter showed, an uploaded
      -- file included. Otherwise the upload would keep winning and the
      -- accepted image would never appear.
      image_file = case
        when proposed_image <> '' then null
        else image_file
      end,
      -- With a new image the proposal's alt text and credit are the whole
      -- truth, blank included. Without one they update the current image.
      image_alt = case
        when proposed_image <> '' then proposed_image_alt
        else coalesce(proposed_image_alt, image_alt)
      end,
      image_credit = case
        when proposed_image <> '' then proposed_image_credit
        else coalesce(proposed_image_credit, image_credit)
      end,
      links = coalesce(proposed_links, links),
      proof_signals = coalesce(proposed_proofs, proof_signals),
      -- Accepting a proposal that carries an image IS the media review, so
      -- reviewStatus moves to approved. The accepted image's description is
      -- recorded with it, and the previous sourced image's source link, alt
      -- text, and credit go.
      media = case
        when proposed_image <> '' then
          (current_media - 'imageSourceUrl' - 'imageAlt' - 'imageCredit')
            || jsonb_strip_nulls(jsonb_build_object(
                 'image', proposed_image,
                 'ogImage', proposed_image,
                 'imageAlt', proposed_image_alt,
                 'imageCredit', proposed_image_credit,
                 'reviewStatus', 'approved'
               ))
        else media
      end,
      -- A social image that was just a copy of the chapter image follows it.
      -- An independent social image is an editorial choice and stays.
      seo = case
        when proposed_image <> ''
             and coalesce(current_seo->>'ogImage', '') <> ''
             and current_seo->>'ogImage' in (
               target_chapter.image,
               current_media->>'image',
               current_media->>'ogImage'
             )
          then current_seo || jsonb_build_object('ogImage', proposed_image)
        else seo
      end,
      updated_at = now()
    where slug = new.chapter_slug;
  end if;

  return new;
end;
$$;

-- A withheld chapter image is its own alert. The chapter stays published, so
-- it must not use the one record_quarantined alert a chapter has: that slot is
-- for the day the chapter really is dropped from the site.
alter table content.review_notifications
  drop constraint if exists content_review_notification_kind_check;
alter table content.review_notifications
  add constraint content_review_notification_kind_check
  check (kind in (
    'update_request_pending',
    'update_request_decided',
    'initiative_pending',
    'record_quarantined',
    'publish_health',
    'chapter_image_withheld'
  ));

alter table content.review_notifications
  drop constraint if exists content_review_notification_shape_check;
alter table content.review_notifications
  add constraint content_review_notification_shape_check
  check (
    (kind in ('update_request_pending', 'update_request_decided') and request_id is not null)
    or
    (kind = 'initiative_pending' and request_id is null and initiative_slug <> '')
    or
    (kind = 'record_quarantined' and request_id is null and record_collection <> '' and record_slug <> '')
    or
    (
      kind = 'publish_health'
      and request_id is null
      and event_key <> ''
      and publish_health_kind in ('stale', 'build_failed')
      and publish_health_status in ('active', 'recovered')
      and jsonb_typeof(publish_health_details) = 'object'
    )
    or
    (kind = 'chapter_image_withheld' and request_id is null and record_collection = 'chapters' and record_slug <> '')
  );

-- One alert per chapter: the agent enqueues on every snapshot render, so
-- inserts use on-conflict-do-nothing against this index.
create unique index if not exists content_review_notification_image_withheld_idx
  on content.review_notifications (record_slug)
  where kind = 'chapter_image_withheld';
