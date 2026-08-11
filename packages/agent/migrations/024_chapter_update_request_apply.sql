-- Give the chapter update request workflow a terminus: accepting a request
-- applies its proposed fields to the live chapter row, mirroring the proven
-- intake.apply_approved_map_node_update_request pattern from migration 007.
--
-- Also adds:
-- - created_by: Directus fills this via the user-created field special so the
--   agent can notify the requesting steward about decisions (email resolution
--   happens server-side; the value is never exposed to steward roles beyond
--   their own).
-- - chapter_updated_at_snapshot: captured at request creation for an
--   optimistic-concurrency staleness check at accept time.

alter table content.chapter_update_requests
  add column if not exists created_by uuid,
  add column if not exists chapter_updated_at_snapshot timestamptz;

-- Optional FK: directus_users only exists after Directus first boots, so the
-- constraint is added when possible and skipped (with a notice) otherwise.
do $$
begin
  if to_regclass('public.directus_users') is not null then
    if not exists (
      select 1
      from pg_constraint
      where conname = 'chapter_update_requests_created_by_fkey'
        and conrelid = 'content.chapter_update_requests'::regclass
    ) then
      alter table content.chapter_update_requests
        add constraint chapter_update_requests_created_by_fkey
        foreign key (created_by) references public.directus_users(id)
        on delete set null
        not valid;
    end if;
  else
    raise notice 'public.directus_users missing; skipping chapter_update_requests_created_by_fkey';
  end if;
end $$;

create index if not exists content_chapter_update_requests_created_by_idx
  on content.chapter_update_requests (created_by)
  where created_by is not null;

-- Capture the chapter's updated_at when a request is drafted.
create or replace function content.capture_chapter_update_request_snapshot()
returns trigger
language plpgsql
as $$
begin
  if new.chapter_updated_at_snapshot is null then
    select updated_at
    into new.chapter_updated_at_snapshot
    from content.chapters
    where slug = new.chapter_slug;
  end if;
  return new;
end;
$$;

drop trigger if exists chapter_update_requests_capture_snapshot
  on content.chapter_update_requests;
create trigger chapter_update_requests_capture_snapshot
  before insert on content.chapter_update_requests
  for each row execute function content.capture_chapter_update_request_snapshot();

-- Apply an accepted request to the live chapter row.
create or replace function content.apply_accepted_chapter_update_request()
returns trigger
language plpgsql
as $$
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
$$;

drop trigger if exists chapter_update_requests_apply_accepted
  on content.chapter_update_requests;
create trigger chapter_update_requests_apply_accepted
  before update on content.chapter_update_requests
  for each row execute function content.apply_accepted_chapter_update_request();
