import { createHmac, timingSafeEqual } from 'node:crypto';
import { createDatabaseClient } from './db.js';

export const RESEND_WEBHOOK_ROUTE = '/webhooks/resend';
export const RESEND_WEBHOOK_SIGNATURE_TOLERANCE_SECONDS = 300;

export const RESEND_WEBHOOK_EVENT_TYPES = Object.freeze([
  'email.sent',
  'email.delivered',
  'email.delivery_delayed',
  'email.failed',
  'email.bounced',
  'email.complained',
  'email.suppressed',
  'email.received',
]);

const OUTBOUND_STATUS_BY_EVENT = Object.freeze({
  'email.sent': 'sent',
  'email.delivered': 'delivered',
  'email.delivery_delayed': 'delivery_delayed',
  'email.failed': 'failed',
  'email.bounced': 'bounced',
  'email.complained': 'complained',
  'email.suppressed': 'suppressed',
});

const STATUS_RANK = Object.freeze({
  recorded: 0,
  queued: 1,
  sent: 2,
  delivery_delayed: 3,
  delivered: 4,
  failed: 5,
  bounced: 5,
  complained: 5,
  suppressed: 5,
});

type UnknownRecord = Record<string, any>;
type SqlLike = any;

export interface ResendWebhookHeaders {
  svixId?: string | null;
  svixTimestamp?: string | null;
  svixSignature?: string | null;
}

export interface ResendWebhookEvent {
  providerEventId: string;
  providerMessageId: string;
  eventType: string;
  eventCreatedAt: string;
  recipientHash: string;
  reason: string;
  metadata: UnknownRecord;
  providerStatus: string;
}

export interface ResendWebhookRepository {
  recordEvent(event: ResendWebhookEvent): Promise<unknown>;
}

const cleanString = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');
const isRecord = (value: unknown): value is UnknownRecord => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
);
const truncate = (value: string, max = 240): string => value.length > max ? value.slice(0, max) : value;
const providerStatusRank = (status: string): number => (
  (STATUS_RANK as Record<string, number>)[status] ?? 0
);

function toSqlJson(sql: SqlLike, value: unknown): unknown {
  return typeof sql.json === 'function' ? sql.json(value) : JSON.stringify(value);
}

async function withSql<T>(
  createSql: (options?: { max?: number }) => SqlLike | null,
  callback: (sql: SqlLike) => Promise<T> | T
): Promise<T> {
  const sql = createSql({ max: 1 });
  if (!sql) throw new Error('DATABASE_URL is required.');

  try {
    return await callback(sql);
  } finally {
    await sql.end?.({ timeout: 1 }).catch(() => {});
  }
}

function decodeSvixSecret(secret: string): Buffer {
  const cleanSecret = cleanString(secret);
  const encoded = cleanSecret.startsWith('whsec_') ? cleanSecret.slice('whsec_'.length) : cleanSecret;
  return Buffer.from(encoded, 'base64');
}

function parseSvixSignatures(value: string): Buffer[] {
  return cleanString(value)
    .split(/\s+/)
    .flatMap((part) => part.split(';'))
    .map((part) => part.trim())
    .filter((part) => part.startsWith('v1,'))
    .map((part) => Buffer.from(part.slice('v1,'.length), 'base64'))
    .filter((signature) => signature.length > 0);
}

export function signResendWebhookPayload({
  rawBody,
  secret,
  svixId,
  svixTimestamp,
}: {
  rawBody: string;
  secret: string;
  svixId: string;
  svixTimestamp: string;
}): string {
  const key = decodeSvixSecret(secret);
  const signedPayload = `${svixId}.${svixTimestamp}.${rawBody}`;
  const signature = createHmac('sha256', key).update(signedPayload).digest('base64');
  return `v1,${signature}`;
}

export function verifyResendWebhookSignature({
  rawBody,
  secret,
  headers,
  now = Date.now(),
}: {
  rawBody: string;
  secret: string;
  headers: ResendWebhookHeaders;
  now?: number;
}): boolean {
  const webhookSecret = cleanString(secret);
  const svixId = cleanString(headers.svixId);
  const svixTimestamp = cleanString(headers.svixTimestamp);
  const svixSignature = cleanString(headers.svixSignature);
  if (!webhookSecret || !svixId || !svixTimestamp || !svixSignature) return false;

  const timestampSeconds = Number.parseInt(svixTimestamp, 10);
  if (!Number.isFinite(timestampSeconds)) return false;
  const ageSeconds = Math.abs(Math.floor(now / 1000) - timestampSeconds);
  if (ageSeconds > RESEND_WEBHOOK_SIGNATURE_TOLERANCE_SECONDS) return false;

  const expected = Buffer.from(signResendWebhookPayload({
    rawBody,
    secret: webhookSecret,
    svixId,
    svixTimestamp,
  }).slice('v1,'.length), 'base64');
  if (expected.length === 0) return false;

  return parseSvixSignatures(svixSignature).some((signature) => (
    signature.length === expected.length && timingSafeEqual(signature, expected)
  ));
}

function normalizedEmailAddress(value: unknown): string {
  const email = cleanString(value);
  const bracketMatch = email.match(/<([^>]+)>/);
  return (bracketMatch?.[1] ?? email).trim().toLowerCase();
}

function hashRecipient(value: unknown, secret: string): string {
  const email = normalizedEmailAddress(value);
  const key = cleanString(secret);
  return email && key ? createHmac('sha256', key).update(email).digest('hex') : '';
}

function firstRecipient(value: unknown): string {
  if (Array.isArray(value)) return cleanString(value[0]);
  return cleanString(value);
}

function safeProviderCode(value: unknown, fallback = 'provider_diagnostic'): string {
  const raw = cleanString(value);
  if (!raw) return '';
  if (!/^[a-z0-9_.:-]+$/i.test(raw) || raw.includes('@')) return fallback;
  return truncate(raw.toLowerCase(), 80);
}

function reasonForEvent(eventType: string, data: UnknownRecord): string {
  if (eventType === 'email.failed' && isRecord(data.failed)) {
    return safeProviderCode(data.failed.reason);
  }
  if (eventType === 'email.bounced' && isRecord(data.bounce)) {
    return truncate([
      safeProviderCode(data.bounce.type),
      safeProviderCode(data.bounce.subType),
    ].filter(Boolean).join(': '));
  }
  if (eventType === 'email.suppressed' && isRecord(data.suppressed)) {
    return safeProviderCode(data.suppressed.reason);
  }
  if (eventType === 'email.delivery_delayed' && isRecord(data.delivery_delayed)) {
    return safeProviderCode(data.delivery_delayed.reason);
  }
  if (eventType === 'email.complained') return 'spam_complaint';
  return '';
}

function metadataForEvent(eventType: string, data: UnknownRecord, reason: string): UnknownRecord {
  const toCount = Array.isArray(data.to) ? data.to.length : (cleanString(data.to) ? 1 : 0);
  const attachments = Array.isArray(data.attachments) ? data.attachments : [];
  const metadata: UnknownRecord = {
    source: 'resend-webhook',
    toCount,
    hasAttachments: attachments.length > 0,
  };

  if (reason) metadata.reason = reason;
  if (eventType === 'email.bounced' && isRecord(data.bounce)) {
    metadata.bounceType = safeProviderCode(data.bounce.type);
    metadata.bounceSubType = safeProviderCode(data.bounce.subType);
  }
  if (eventType === 'email.received') {
    metadata.attachmentCount = attachments.length;
  }
  return metadata;
}

export function toResendWebhookEvent(
  payload: unknown,
  providerEventId: string,
  { recipientHashSecret }: { recipientHashSecret: string }
): ResendWebhookEvent | null {
  if (!isRecord(payload)) return null;
  const eventType = cleanString(payload.type);
  if (!RESEND_WEBHOOK_EVENT_TYPES.includes(eventType)) return null;
  const data = isRecord(payload.data) ? payload.data : {};
  const providerMessageId = cleanString(data.email_id);
  const recipient = firstRecipient(data.to);
  const reason = reasonForEvent(eventType, data);

  return {
    providerEventId: cleanString(providerEventId),
    providerMessageId,
    eventType,
    eventCreatedAt: cleanString(payload.created_at),
    recipientHash: hashRecipient(recipient, recipientHashSecret),
    reason,
    metadata: metadataForEvent(eventType, data, reason),
    providerStatus: cleanString(OUTBOUND_STATUS_BY_EVENT[eventType]),
  };
}

export async function recordResendWebhookEvent(sql: SqlLike, event: ResendWebhookEvent): Promise<{
  id: string;
  replayCount: number;
}> {
  const [row] = await sql`
    insert into intake.email_provider_events (
      provider,
      provider_event_id,
      provider_message_id,
      related_edit_token_id,
      event_type,
      event_created_at,
      recipient_hash,
      reason,
      metadata
    )
    values (
      'resend',
      ${event.providerEventId},
      ${event.providerMessageId || null},
      (
        select id
        from intake.map_node_edit_tokens
        where provider_message_id = ${event.providerMessageId || null}
        limit 1
      ),
      ${event.eventType},
      ${event.eventCreatedAt || null},
      ${event.recipientHash || null},
      ${event.reason || null},
      ${toSqlJson(sql, event.metadata)}
    )
    on conflict (provider, provider_event_id) do update
    set
      replay_count = intake.email_provider_events.replay_count + 1,
      received_at = now()
    returning id::text, replay_count as "replayCount"
  `;

  if (event.providerMessageId && event.providerStatus) {
    await sql`
      update intake.map_node_edit_tokens
      set
        provider_status = ${event.providerStatus},
        provider_error = ${event.reason || null}
      where provider_message_id = ${event.providerMessageId}
        and case provider_status
          when 'recorded' then 0
          when 'queued' then 1
          when 'sent' then 2
          when 'delivery_delayed' then 3
          when 'delivered' then 4
          when 'failed' then 5
          when 'bounced' then 5
          when 'complained' then 5
          when 'suppressed' then 5
          else 0
        end <= ${providerStatusRank(event.providerStatus)}
    `;
  }

  return {
    id: cleanString(row?.id),
    replayCount: Number(row?.replayCount ?? 0),
  };
}

export function createResendWebhookRepository({ createSql = createDatabaseClient }: {
  createSql?: (options?: { max?: number }) => SqlLike | null;
} = {}): ResendWebhookRepository {
  return {
    recordEvent(event) {
      return withSql(createSql, (sql) => recordResendWebhookEvent(sql, event));
    },
  };
}

export async function handleResendWebhookRequest({
  rawBody,
  headers,
  webhookSecret,
  recipientHashSecret,
  repository,
  now = Date.now(),
}: {
  rawBody: string;
  headers: ResendWebhookHeaders;
  webhookSecret: string;
  recipientHashSecret?: string;
  repository: ResendWebhookRepository;
  now?: number;
}): Promise<{ status: number; body: UnknownRecord }> {
  if (!cleanString(webhookSecret)) {
    return { status: 503, body: { ok: false, error: { code: 'webhook_not_configured' } } };
  }
  if (!verifyResendWebhookSignature({ rawBody, secret: webhookSecret, headers, now })) {
    return { status: 400, body: { ok: false, error: { code: 'invalid_webhook_signature' } } };
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return { status: 400, body: { ok: false, error: { code: 'invalid_webhook_payload' } } };
  }

  const event = toResendWebhookEvent(payload, cleanString(headers.svixId), {
    recipientHashSecret: cleanString(recipientHashSecret) || webhookSecret,
  });
  if (!event) return { status: 202, body: { ok: true, ignored: true } };

  await repository.recordEvent(event);
  return { status: 202, body: { ok: true } };
}
