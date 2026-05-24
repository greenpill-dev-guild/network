-- Public map-node recovery: allow trusted steward submissions to carry their
-- chapter link, and reserve an optional public-safe bioregion display field
-- for future values backed by an approved polygon dataset.

alter table intake.map_node_submissions
  add column if not exists chapter_slug text,
  add column if not exists bioregion text;

create index if not exists map_node_submissions_chapter_slug_idx
  on intake.map_node_submissions (chapter_slug)
  where chapter_slug is not null;

drop view if exists public.public_map_nodes;
drop view if exists intake.public_map_nodes;

create or replace view intake.public_map_nodes as
select
  id,
  display_name as name,
  place_name as place,
  city,
  region,
  country,
  bioregion,
  latitude as lat,
  longitude as long,
  role,
  chapter_slug,
  themes,
  public_note,
  status,
  approved_at
from intake.map_node_submissions
where status = 'approved';

create or replace view public.public_map_nodes as
select * from intake.public_map_nodes;
