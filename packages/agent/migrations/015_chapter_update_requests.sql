-- Private steward workflow for requesting edits to published chapter profiles.
-- This keeps public chapter rows published while stewards draft changes for
-- trusted publisher review inside Directus.

create table if not exists content.chapter_update_requests (
  id uuid primary key default gen_random_uuid(),
  chapter_slug text not null references content.chapters(slug) on delete cascade,
  title text not null default '',
  summary text not null default '',
  requested_changes jsonb not null default '{}'::jsonb,
  request_status text not null default 'draft',
  reviewer_notes text not null default '',
  reviewed_by text not null default '',
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chapter_update_requests_status_check
    check (request_status in ('draft', 'pending_review', 'needs_changes', 'accepted', 'declined', 'archived'))
);

create index if not exists content_chapter_update_requests_chapter_idx
  on content.chapter_update_requests (chapter_slug, request_status, updated_at desc);

drop trigger if exists chapter_update_requests_touch_updated_at on content.chapter_update_requests;
create trigger chapter_update_requests_touch_updated_at
  before update on content.chapter_update_requests
  for each row execute function content.touch_updated_at();
