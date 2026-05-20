-- Legacy Resend webhook rows used an unkeyed SHA-256 recipient hash before
-- RESEND_WEBHOOK_RECIPIENT_HASH_SECRET existed. Raw recipients are intentionally
-- not stored, so old hashes cannot be re-keyed. Clear them; future rows use
-- keyed HMAC-SHA256 hashes from the agent webhook handler.

update intake.email_provider_events
set recipient_hash = null
where provider = 'resend'
  and recipient_hash is not null;
