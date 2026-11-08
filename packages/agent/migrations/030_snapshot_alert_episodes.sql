-- Snapshot alerts fire once per episode instead of once per record.
--
-- The agent queues a record_quarantined or chapter_image_withheld alert on
-- every public snapshot render and relied on one unique row per record to
-- send a single email. Nothing ever cleared that row, so a record that was
-- fixed and broke the same way months later left the site with no alert.
--
-- resolved_at ends an episode. The agent sets it when a snapshot render no
-- longer finds the record quarantined or the image withheld. Only open rows
-- are unique now, so the next episode gets its own row and its own email.
-- Resolved rows stay as the alert history.
--
-- Every existing row starts open. The first snapshot render by an agent that
-- knows about episodes resolves the ones whose record is no longer affected.
-- An older agent keeps working against this schema: it never resolves a row,
-- which is how it behaved before.

alter table content.review_notifications
  add column if not exists resolved_at timestamptz;

-- Only snapshot alerts have episodes. The other kinds are one-off events.
alter table content.review_notifications
  drop constraint if exists content_review_notification_resolved_kind_check;
alter table content.review_notifications
  add constraint content_review_notification_resolved_kind_check
  check (resolved_at is null or kind in ('record_quarantined', 'chapter_image_withheld'));

-- One open alert per record: the agent enqueues on every snapshot render, so
-- inserts use on-conflict-do-nothing against these indexes. The agent also
-- finds the open alerts through them on every render.
--
-- They are the indexes from migrations 026 and 029, rebuilt to leave resolved
-- rows out. The names stay, so 026 and 029 find their index in place and
-- cannot bring the old definition back if they are ever applied after this.
drop index if exists content.content_review_notification_quarantine_idx;
create unique index content_review_notification_quarantine_idx
  on content.review_notifications (kind, record_collection, record_slug)
  where kind = 'record_quarantined' and resolved_at is null;

drop index if exists content.content_review_notification_image_withheld_idx;
create unique index content_review_notification_image_withheld_idx
  on content.review_notifications (record_slug)
  where kind = 'chapter_image_withheld' and resolved_at is null;
