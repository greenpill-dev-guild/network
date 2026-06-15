-- Add steward-friendly structured authoring fields for chapter update requests.
-- The original requested_changes JSON remains as an advanced fallback, while
-- common steward edits can be captured in first-class fields and child rows.

alter table content.chapter_update_requests
  add column if not exists proposed_summary text not null default '',
  add column if not exists proposed_primary_link text not null default '',
  add column if not exists proposed_image text not null default '',
  add column if not exists proposed_image_alt text not null default '',
  add column if not exists proposed_image_credit text not null default '';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'chapter_update_requests_title_not_blank'
      and conrelid = 'content.chapter_update_requests'::regclass
  ) then
    alter table content.chapter_update_requests
      add constraint chapter_update_requests_title_not_blank
      check (length(btrim(title)) > 0) not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'chapter_update_requests_summary_not_blank'
      and conrelid = 'content.chapter_update_requests'::regclass
  ) then
    alter table content.chapter_update_requests
      add constraint chapter_update_requests_summary_not_blank
      check (length(btrim(summary)) > 0) not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'chapter_update_requests_changes_object'
      and conrelid = 'content.chapter_update_requests'::regclass
  ) then
    alter table content.chapter_update_requests
      add constraint chapter_update_requests_changes_object
      check (jsonb_typeof(requested_changes) = 'object') not valid;
  end if;
end $$;

create table if not exists content.chapter_update_request_links (
  id uuid primary key default gen_random_uuid(),
  update_request_id uuid not null references content.chapter_update_requests(id) on delete cascade,
  chapter_slug text not null default '',
  sort_order integer not null default 0,
  label text not null default '',
  url text not null default '',
  subtext text not null default '',
  handle text not null default '',
  action text not null default '',
  icon text not null default '',
  kind text not null default 'external',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists content.chapter_update_request_proof_signals (
  id uuid primary key default gen_random_uuid(),
  update_request_id uuid not null references content.chapter_update_requests(id) on delete cascade,
  chapter_slug text not null default '',
  sort_order integer not null default 0,
  label text not null default '',
  value text not null default '',
  source text not null default '',
  href text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table content.chapter_update_request_links
  add column if not exists chapter_slug text;

alter table content.chapter_update_request_proof_signals
  add column if not exists chapter_slug text;

update content.chapter_update_request_links links
set chapter_slug = requests.chapter_slug
from content.chapter_update_requests requests
where links.update_request_id = requests.id
  and (links.chapter_slug is null or links.chapter_slug = '');

update content.chapter_update_request_proof_signals signals
set chapter_slug = requests.chapter_slug
from content.chapter_update_requests requests
where signals.update_request_id = requests.id
  and (signals.chapter_slug is null or signals.chapter_slug = '');

alter table content.chapter_update_request_links
  alter column chapter_slug set default '',
  alter column chapter_slug set not null;

alter table content.chapter_update_request_proof_signals
  alter column chapter_slug set default '',
  alter column chapter_slug set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'chapter_update_requests_id_chapter_slug_key'
      and conrelid = 'content.chapter_update_requests'::regclass
  ) then
    alter table content.chapter_update_requests
      add constraint chapter_update_requests_id_chapter_slug_key
      unique (id, chapter_slug);
  end if;
end $$;

alter table content.chapter_update_request_links
  drop constraint if exists chapter_update_request_links_update_request_id_fkey,
  drop constraint if exists chapter_update_request_links_request_chapter_fkey,
  add constraint chapter_update_request_links_request_chapter_fkey
  foreign key (update_request_id, chapter_slug)
  references content.chapter_update_requests(id, chapter_slug) on delete cascade;

alter table content.chapter_update_request_proof_signals
  drop constraint if exists chapter_update_request_proof_signals_update_request_id_fkey,
  drop constraint if exists chapter_update_request_proof_signals_request_chapter_fkey,
  add constraint chapter_update_request_proof_signals_request_chapter_fkey
  foreign key (update_request_id, chapter_slug)
  references content.chapter_update_requests(id, chapter_slug) on delete cascade;

create index if not exists content_chapter_update_request_links_chapter_idx
  on content.chapter_update_request_links (chapter_slug, update_request_id);

create index if not exists content_chapter_update_request_proof_signals_chapter_idx
  on content.chapter_update_request_proof_signals (chapter_slug, update_request_id);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'chapter_update_request_links_label_not_blank'
      and conrelid = 'content.chapter_update_request_links'::regclass
  ) then
    alter table content.chapter_update_request_links
      add constraint chapter_update_request_links_label_not_blank
      check (length(btrim(label)) > 0) not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'chapter_update_request_links_url_not_blank'
      and conrelid = 'content.chapter_update_request_links'::regclass
  ) then
    alter table content.chapter_update_request_links
      add constraint chapter_update_request_links_url_not_blank
      check (length(btrim(url)) > 0) not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'chapter_update_request_proof_signals_label_not_blank'
      and conrelid = 'content.chapter_update_request_proof_signals'::regclass
  ) then
    alter table content.chapter_update_request_proof_signals
      add constraint chapter_update_request_proof_signals_label_not_blank
      check (length(btrim(label)) > 0) not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'chapter_update_request_proof_signals_value_not_blank'
      and conrelid = 'content.chapter_update_request_proof_signals'::regclass
  ) then
    alter table content.chapter_update_request_proof_signals
      add constraint chapter_update_request_proof_signals_value_not_blank
      check (length(btrim(value)) > 0) not valid;
  end if;
end $$;

create index if not exists content_chapter_update_request_links_request_idx
  on content.chapter_update_request_links (update_request_id, sort_order, label);

create index if not exists content_chapter_update_request_proof_signals_request_idx
  on content.chapter_update_request_proof_signals (update_request_id, sort_order, label);

drop trigger if exists chapter_update_request_links_touch_updated_at on content.chapter_update_request_links;
create trigger chapter_update_request_links_touch_updated_at
  before update on content.chapter_update_request_links
  for each row execute function content.touch_updated_at();

drop trigger if exists chapter_update_request_proof_signals_touch_updated_at on content.chapter_update_request_proof_signals;
create trigger chapter_update_request_proof_signals_touch_updated_at
  before update on content.chapter_update_request_proof_signals
  for each row execute function content.touch_updated_at();
