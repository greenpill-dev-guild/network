-- Durable, replayable delivery state for map-node edit-link email sends.
--
-- A public recovery request records a queued attempt before the HTTP response,
-- but raw edit tokens remain process-local and are never persisted. Delivery
-- workers claim a queued attempt, generate a raw token only for the email send,
-- and store only its hash here. Stale claims can be replayed if a worker exits
-- before it updates provider_status.

alter table intake.map_node_edit_tokens
  add column if not exists delivery_claimed_at timestamptz;

create index if not exists map_node_edit_tokens_delivery_queue_idx
  on intake.map_node_edit_tokens (provider_status, delivery_claimed_at, created_at)
  where consumed_at is null;
