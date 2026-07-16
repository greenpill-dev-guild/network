import { createHmac, timingSafeEqual } from 'node:crypto';
import {
  toAuthenticatedMapNodeModerationNode,
} from '@greenpill-network/shared/map-nodes';
import type {
  AuthenticatedMapNodeModerationResult,
  AuthenticatedMapNodeModerationSession,
  MapNodeModerationDecision,
} from '@greenpill-network/shared/map-nodes';
import { PublicInputError } from './errors.js';

type SqlLike = any;
type FetchLike = typeof fetch;

type ModerationNotificationKind = 'submission' | 'daily_digest';

interface ModerationNotificationRow {
  id: string;
  kind: ModerationNotificationKind;
  attempts: number;
  submissionId?: string;
  displayName?: string;
  placeName?: string;
  city?: string;
  region?: string;
  country?: string;
  lat?: number;
  long?: number;
  themes?: string[];
  publicNote?: string;
  createdAt?: string | Date;
}

interface ModerationAccessLinkRow {
  id: string;
  notificationId: string;
  submissionId: string;
  recipientEmail: string;
  tokenExpiresAt: string | Date;
  deliveryStatus?: string;
  attempts?: number;
  resolvedAt?: string | Date;
  decision?: string;
  consumedAt?: string | Date;
  submissionStatus?: string;
  submissionUpdatedAt?: string | Date;
  displayName?: string;
  placeName?: string;
  city?: string;
  region?: string;
  country?: string;
  lat?: number;
  long?: number;
  themes?: string[];
  publicNote?: string;
  createdAt?: string | Date;
}

export interface QueuedMapNodeModerationDeliveryResult {
  queued: number;
  delivered: number;
  failed: number;
  skipped: number;
}

export const MAP_NODE_MODERATION_NOTIFICATION_STALE_CLAIM_MINUTES = 10;
export const MAP_NODE_MODERATION_NOTIFICATION_MAX_ATTEMPTS = 4;
export const MAP_NODE_MODERATION_NOTIFICATION_RETRY_MINUTES = Object.freeze([5, 30, 120]);
export const MAP_NODE_MODERATION_DIGEST_HOUR_PACIFIC = 9;
export const MAP_NODE_MODERATION_LINK_TTL_DAYS = 7;
export const MAP_NODE_MODERATION_REVIEW_NOTE_MAX_LENGTH = 500;
export const MAP_NODE_MODERATION_SESSION_ROUTE = '/map-nodes/moderation-session';
export const MAP_NODE_MODERATION_DECISION_ROUTE = '/map-nodes/:id/moderation';

export const MAP_NODE_INVALID_MODERATION_LINK_ERROR = Object.freeze({
  error: {
    code: 'invalid_moderation_link',
    message: 'This moderation link is invalid or expired.',
  },
});

const RESEND_EMAILS_ENDPOINT = 'https://api.resend.com/emails';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const cleanString = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');
const toSafeEmailText = (value: unknown, fallback = 'Not provided'): string => {
  const cleaned = cleanString(value).replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim();
  return (cleaned || fallback).slice(0, 500);
};

function parseRecipients(value: unknown): string[] {
  return [...new Set(
    cleanString(value)
      .split(/[\s,;]+/)
      .map((entry) => entry.toLowerCase())
      .filter((entry) => entry.length <= 320 && EMAIL_PATTERN.test(entry))
  )];
}

function buildDirectusUrl(baseUrl: string, path: string): string {
  try {
    const url = new URL(baseUrl);
    url.pathname = `${url.pathname.replace(/\/$/, '')}${path}`;
    url.search = '';
    url.hash = '';
    return url.href;
  } catch {
    return '';
  }
}

function moderationConfig(env: Record<string, string | undefined> = process.env) {
  const directusBaseUrl = cleanString(env.MAP_NODE_MODERATION_DIRECTUS_URL);
  const magicLinkEnabled = cleanString(env.MAP_NODE_MODERATION_MAGIC_LINK_ENABLED).toLowerCase() === 'true';
  return {
    apiKey: cleanString(env.RESEND_API_KEY),
    from: cleanString(env.MAP_NODE_EMAIL_FROM),
    replyTo: cleanString(env.MAP_NODE_EMAIL_REPLY_TO),
    recipients: parseRecipients(env.MAP_NODE_MODERATION_RECIPIENTS),
    magicLinkEnabled,
    linkBaseUrl: cleanString(env.MAP_NODE_MODERATION_BASE_URL),
    linkSecret: cleanString(env.MAP_NODE_MODERATION_LINK_SECRET),
    recordUrl: (id: string) => buildDirectusUrl(
      directusBaseUrl,
      `/admin/content/intake.map_node_submissions/${encodeURIComponent(id)}`
    ),
    queueUrl: buildDirectusUrl(directusBaseUrl, '/admin/content/intake.map_node_submissions'),
  };
}

function magicLinkConfigured(env: Record<string, string | undefined> = process.env): boolean {
  const config = moderationConfig(env);
  return Boolean(
    config.magicLinkEnabled &&
    config.linkSecret.length >= 32 &&
    buildModerationUrl(config.linkBaseUrl, 'preview-token')
  );
}

function canSendModerationEmail(env: Record<string, string | undefined> = process.env): boolean {
  const config = moderationConfig(env);
  return Boolean(config.apiKey && config.from && config.recipients.length && config.queueUrl);
}

function moderationLinkExpiry(now = new Date()): Date {
  return new Date(now.getTime() + MAP_NODE_MODERATION_LINK_TTL_DAYS * 24 * 60 * 60 * 1000);
}

function moderationTokenPayload(row: ModerationAccessLinkRow, expiresAtSeconds: number): string {
  return [
    'v1',
    cleanString(row.id),
    cleanString(row.submissionId),
    cleanString(row.recipientEmail).toLowerCase(),
    String(expiresAtSeconds),
  ].join('\n');
}

export function createMapNodeModerationToken(
  row: ModerationAccessLinkRow,
  secret: string
): string {
  const expiresAt = row.tokenExpiresAt instanceof Date
    ? row.tokenExpiresAt
    : new Date(row.tokenExpiresAt);
  const expiresAtSeconds = Math.floor(expiresAt.getTime() / 1000);
  if (!UUID_PATTERN.test(cleanString(row.id)) || !Number.isFinite(expiresAtSeconds) || cleanString(secret).length < 32) {
    return '';
  }
  const signature = createHmac('sha256', secret)
    .update(moderationTokenPayload(row, expiresAtSeconds), 'utf8')
    .digest('base64url');
  return `v1.${row.id}.${expiresAtSeconds}.${signature}`;
}

function parseModerationToken(token: unknown): {
  accessLinkId: string;
  expiresAtSeconds: number;
  signature: string;
} | null {
  const [version, accessLinkId, expiresAt, signature, ...extra] = cleanString(token).split('.');
  const expiresAtSeconds = Number(expiresAt);
  if (
    version !== 'v1' ||
    !UUID_PATTERN.test(accessLinkId) ||
    !Number.isInteger(expiresAtSeconds) ||
    expiresAtSeconds <= 0 ||
    !/^[A-Za-z0-9_-]{43}$/.test(signature) ||
    extra.length
  ) return null;
  return { accessLinkId, expiresAtSeconds, signature };
}

function verifyModerationToken({
  token,
  row,
  env,
  now = new Date(),
}: {
  token: unknown;
  row: ModerationAccessLinkRow;
  env: Record<string, string | undefined>;
  now?: Date;
}): boolean {
  const parsed = parseModerationToken(token);
  const config = moderationConfig(env);
  if (!parsed || !magicLinkConfigured(env) || parsed.accessLinkId !== cleanString(row.id)) return false;
  const rowExpiry = row.tokenExpiresAt instanceof Date ? row.tokenExpiresAt : new Date(row.tokenExpiresAt);
  const rowExpirySeconds = Math.floor(rowExpiry.getTime() / 1000);
  if (
    !Number.isFinite(rowExpirySeconds) ||
    parsed.expiresAtSeconds !== rowExpirySeconds ||
    parsed.expiresAtSeconds <= Math.floor(now.getTime() / 1000) ||
    !config.recipients.includes(cleanString(row.recipientEmail).toLowerCase())
  ) return false;
  const expected = createMapNodeModerationToken(row, config.linkSecret).split('.').at(-1) ?? '';
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(parsed.signature);
  return expectedBuffer.length === actualBuffer.length && timingSafeEqual(expectedBuffer, actualBuffer);
}

function buildModerationUrl(baseUrl: string, token: string): string {
  try {
    const url = new URL(baseUrl);
    const localHost = ['localhost', '127.0.0.1', '0.0.0.0', '::1'].includes(url.hostname);
    if (url.protocol !== 'https:' && !(localHost && url.protocol === 'http:')) return '';
    url.search = '';
    url.hash = `token=${encodeURIComponent(token)}`;
    return url.href;
  } catch {
    return '';
  }
}

function invalidModerationLink(): PublicInputError {
  return new PublicInputError(
    MAP_NODE_INVALID_MODERATION_LINK_ERROR.error.code,
    MAP_NODE_INVALID_MODERATION_LINK_ERROR.error.message,
    401
  );
}

function pacificDigestBucket(now: Date): { date: string; hour: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return {
    date: `${value('year')}-${value('month')}-${value('day')}`,
    hour: Number(value('hour')),
  };
}

function retryDelayMinutes(attempts: number): number | null {
  if (attempts >= MAP_NODE_MODERATION_NOTIFICATION_MAX_ATTEMPTS) return null;
  return MAP_NODE_MODERATION_NOTIFICATION_RETRY_MINUTES[attempts - 1] ?? null;
}

function submissionEmailText(row: ModerationNotificationRow, recordUrl: string): string {
  const place = [row.placeName, row.city, row.region, row.country]
    .map((part) => toSafeEmailText(part, ''))
    .filter(Boolean)
    .join(', ');
  const coordinates = Number.isFinite(Number(row.lat)) && Number.isFinite(Number(row.long))
    ? `${Number(row.lat)}, ${Number(row.long)}`
    : 'Not provided';
  const themes = Array.isArray(row.themes)
    ? row.themes.map((theme) => toSafeEmailText(theme, '')).filter(Boolean).join(', ')
    : '';

  return [
    'A new Greenpill Network map node is awaiting approval.',
    '',
    `Name: ${toSafeEmailText(row.displayName)}`,
    `Place: ${place || 'Not provided'}`,
    `Coordinates: ${coordinates}`,
    `Themes: ${themes || 'Not provided'}`,
    `Public note: ${toSafeEmailText(row.publicNote)}`,
    `Submitted: ${toSafeEmailText(row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt)}`,
    '',
    'Review and approve or reject it in Directus:',
    recordUrl,
    '',
    'The submission owner email, raw notes, IP address, and spam metadata are intentionally not included here.',
  ].join('\n');
}

function submissionMagicLinkEmailText(
  row: ModerationNotificationRow,
  reviewUrl: string,
  expiresAt: Date
): string {
  const place = [row.placeName, row.city, row.region, row.country]
    .map((part) => toSafeEmailText(part, ''))
    .filter(Boolean)
    .join(', ');
  const coordinates = Number.isFinite(Number(row.lat)) && Number.isFinite(Number(row.long))
    ? `${Number(row.lat)}, ${Number(row.long)}`
    : 'Not provided';
  const themes = Array.isArray(row.themes)
    ? row.themes.map((theme) => toSafeEmailText(theme, '')).filter(Boolean).join(', ')
    : '';

  return [
    'A new Greenpill Network map node is awaiting approval.',
    '',
    `Name: ${toSafeEmailText(row.displayName)}`,
    `Place: ${place || 'Not provided'}`,
    `Coordinates: ${coordinates}`,
    `Themes: ${themes || 'Not provided'}`,
    `Public note: ${toSafeEmailText(row.publicNote)}`,
    `Submitted: ${toSafeEmailText(row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt)}`,
    '',
    'Review and approve or decline without signing in to Directus:',
    reviewUrl,
    '',
    `This recipient-specific link expires ${expiresAt.toISOString()} and can decide only this node.`,
    'Directus remains available as the emergency fallback moderation queue.',
    '',
    'The submission owner email, raw notes, IP address, and spam metadata are intentionally not included here.',
  ].join('\n');
}

function digestEmailText(pendingCount: number, queueUrl: string): string {
  return [
    'Greenpill Network map moderation reminder.',
    '',
    `${pendingCount} map node${pendingCount === 1 ? '' : 's'} await approval.`,
    '',
    'Open the pending map-node queue in Directus:',
    queueUrl,
  ].join('\n');
}

async function sendModerationEmail({
  row,
  pendingCount,
  env = process.env,
  fetchImpl = globalThis.fetch,
}: {
  row: ModerationNotificationRow;
  pendingCount: number;
  env?: Record<string, string | undefined>;
  fetchImpl?: FetchLike;
}): Promise<{ status: 'sent' | 'send_failed'; error: string; providerMessageId: string }> {
  const config = moderationConfig(env);
  const isSubmission = row.kind === 'submission';
  const submissionId = cleanString(row.submissionId);
  const recordUrl = isSubmission && submissionId ? config.recordUrl(submissionId) : '';
  if (
    !config.apiKey ||
    !config.from ||
    !config.recipients.length ||
    !config.queueUrl ||
    (isSubmission && !recordUrl) ||
    typeof fetchImpl !== 'function'
  ) {
    return { status: 'send_failed', error: 'provider_not_configured', providerMessageId: '' };
  }

  const subject = row.kind === 'submission'
    ? 'Greenpill map node awaiting approval'
    : 'Greenpill map moderation reminder';
  const text = row.kind === 'submission'
    ? submissionEmailText(row, recordUrl)
    : digestEmailText(pendingCount, config.queueUrl);

  try {
    const response = await fetchImpl(RESEND_EMAILS_ENDPOINT, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${config.apiKey}`,
        'content-type': 'application/json',
        'Idempotency-Key': `map-node-moderation-${row.id}`,
      },
      body: JSON.stringify({
        from: config.from,
        to: config.recipients,
        subject,
        text,
        ...(config.replyTo ? { reply_to: config.replyTo } : {}),
      }),
    });
    if (!response.ok) {
      return { status: 'send_failed', error: `resend_http_${response.status}`, providerMessageId: '' };
    }
    let providerMessageId = '';
    try {
      const payload = await response.json();
      providerMessageId = cleanString(payload?.id);
    } catch {
      // Sending succeeded even if the provider response body was unavailable.
    }
    return { status: 'sent', error: '', providerMessageId };
  } catch {
    return { status: 'send_failed', error: 'resend_fetch_failed', providerMessageId: '' };
  }
}

async function ensureModerationAccessLinks({
  sql,
  row,
  recipients,
  now,
}: {
  sql: SqlLike;
  row: ModerationNotificationRow;
  recipients: string[];
  now: Date;
}): Promise<ModerationAccessLinkRow[]> {
  const submissionId = cleanString(row.submissionId);
  if (!submissionId || recipients.length === 0) return [];
  const expiresAt = moderationLinkExpiry(now);

  for (const recipient of recipients) {
    await sql`
      insert into intake.map_node_moderation_access_links (
        notification_id,
        submission_id,
        recipient_email,
        token_expires_at
      )
      values (
        ${row.id}::uuid,
        ${submissionId}::uuid,
        ${recipient},
        ${expiresAt}
      )
      on conflict (notification_id, recipient_email) do nothing
    `;
  }


  await sql`
    update intake.map_node_moderation_access_links
    set delivery_status = 'skipped', delivery_claimed_at = null
    where notification_id = ${row.id}::uuid
      and not (recipient_email::text = any(${recipients}::text[]))
      and delivery_status in ('queued', 'delivery_claimed', 'retry_scheduled')
  `;

  return sql`
    select
      access.id::text,
      access.notification_id::text as "notificationId",
      access.submission_id::text as "submissionId",
      access.recipient_email::text as "recipientEmail",
      access.token_expires_at as "tokenExpiresAt",
      access.delivery_status as "deliveryStatus",
      access.attempts
    from intake.map_node_moderation_access_links access
    where access.notification_id = ${row.id}::uuid
      and access.recipient_email::text = any(${recipients}::text[])
    order by access.created_at asc
  `;
}

async function claimModerationAccessLink(
  sql: SqlLike,
  accessLinkId: string
): Promise<{ attempts: number } | null> {
  const rows = await sql`
    update intake.map_node_moderation_access_links access
    set
      delivery_status = 'delivery_claimed',
      attempts = access.attempts + 1,
      delivery_claimed_at = now(),
      provider_error = null
    where access.id = ${accessLinkId}::uuid
      and access.resolved_at is null
      and access.token_expires_at > now()
      and (
        access.delivery_status <> 'retry_scheduled'
        or access.next_attempt_at <= now()
      )
      and (
        access.delivery_status in ('queued', 'retry_scheduled')
        or (
          access.delivery_status = 'delivery_claimed'
          and access.delivery_claimed_at < now() - ${MAP_NODE_MODERATION_NOTIFICATION_STALE_CLAIM_MINUTES} * interval '1 minute'
        )
      )
    returning attempts
  `;
  return rows[0] ?? null;
}

async function completeModerationAccessLink({
  sql,
  accessLinkId,
  attempts,
  result,
}: {
  sql: SqlLike;
  accessLinkId: string;
  attempts: number;
  result: { status: 'sent' | 'send_failed'; error: string; providerMessageId: string };
}): Promise<void> {
  if (result.status === 'sent') {
    await sql`
      update intake.map_node_moderation_access_links
      set
        delivery_status = 'sent',
        sent_at = now(),
        delivery_claimed_at = null,
        provider_error = null,
        provider_message_id = ${result.providerMessageId || null}
      where id = ${accessLinkId}::uuid
    `;
    return;
  }

  const retryDelay = retryDelayMinutes(attempts);
  if (retryDelay !== null) {
    await sql`
      update intake.map_node_moderation_access_links
      set
        delivery_status = 'retry_scheduled',
        next_attempt_at = now() + ${retryDelay} * interval '1 minute',
        delivery_claimed_at = null,
        provider_error = ${result.error || 'send_failed'}
      where id = ${accessLinkId}::uuid
    `;
    return;
  }

  await sql`
    update intake.map_node_moderation_access_links
    set
      delivery_status = 'failed',
      delivery_claimed_at = null,
      provider_error = ${result.error || 'send_failed'}
    where id = ${accessLinkId}::uuid
  `;
}

async function sendMagicLinkEmail({
  row,
  accessLink,
  env,
  fetchImpl,
}: {
  row: ModerationNotificationRow;
  accessLink: ModerationAccessLinkRow;
  env: Record<string, string | undefined>;
  fetchImpl: FetchLike;
}): Promise<{ status: 'sent' | 'send_failed'; error: string; providerMessageId: string }> {
  const config = moderationConfig(env);
  const token = createMapNodeModerationToken(accessLink, config.linkSecret);
  const reviewUrl = buildModerationUrl(config.linkBaseUrl, token);
  const expiresAt = accessLink.tokenExpiresAt instanceof Date
    ? accessLink.tokenExpiresAt
    : new Date(accessLink.tokenExpiresAt);
  if (!config.apiKey || !config.from || !reviewUrl || !token || !config.recipients.includes(accessLink.recipientEmail)) {
    return { status: 'send_failed', error: 'provider_not_configured', providerMessageId: '' };
  }

  try {
    const response = await fetchImpl(RESEND_EMAILS_ENDPOINT, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${config.apiKey}`,
        'content-type': 'application/json',
        'Idempotency-Key': `map-node-moderation-${row.id}-${accessLink.id}`,
      },
      body: JSON.stringify({
        from: config.from,
        to: accessLink.recipientEmail,
        subject: 'Greenpill map node awaiting approval',
        text: submissionMagicLinkEmailText(row, reviewUrl, expiresAt),
        ...(config.replyTo ? { reply_to: config.replyTo } : {}),
      }),
    });
    if (!response.ok) {
      return { status: 'send_failed', error: `resend_http_${response.status}`, providerMessageId: '' };
    }
    let providerMessageId = '';
    try {
      providerMessageId = cleanString((await response.json())?.id);
    } catch {
      // The provider accepted the stable-idempotency request.
    }
    return { status: 'sent', error: '', providerMessageId };
  } catch {
    return { status: 'send_failed', error: 'resend_fetch_failed', providerMessageId: '' };
  }
}

async function completeMagicLinkNotification(sql: SqlLike, notificationId: string): Promise<'sent' | 'failed'> {
  const rows = await sql`
    select
      delivery_status as status,
      next_attempt_at as "nextAttemptAt"
    from intake.map_node_moderation_access_links
    where notification_id = ${notificationId}::uuid
  `;
  if (rows.length > 0 && rows.every((row) => row.status === 'sent' || row.status === 'skipped')) {
    await sql`
      update intake.map_node_moderation_notifications
      set
        status = 'sent',
        sent_at = now(),
        delivery_claimed_at = null,
        provider_error = null,
        provider_message_id = null
      where id = ${notificationId}::uuid
    `;
    return 'sent';
  }

  const retryable = rows.filter((row) => ['queued', 'retry_scheduled', 'delivery_claimed'].includes(row.status));
  if (retryable.length > 0) {
    const nextAttempt = retryable
      .map((row) => row.nextAttemptAt)
      .filter(Boolean)
      .sort((left, right) => new Date(left).getTime() - new Date(right).getTime())[0] ?? new Date();
    await sql`
      update intake.map_node_moderation_notifications
      set
        status = 'retry_scheduled',
        next_attempt_at = ${nextAttempt},
        delivery_claimed_at = null,
        provider_error = 'recipient_delivery_retry_scheduled'
      where id = ${notificationId}::uuid
    `;
    return 'failed';
  }

  const failedCount = rows.filter((row) => row.status === 'failed').length;
  await sql`
    update intake.map_node_moderation_notifications
    set
      status = 'failed',
      delivery_claimed_at = null,
      provider_error = ${`${failedCount}_recipient_deliveries_failed`},
      provider_message_id = null
    where id = ${notificationId}::uuid
  `;
  return 'failed';
}

export async function queueMapNodeModerationNotification(
  sql: SqlLike,
  submissionId: string
): Promise<boolean> {
  const rows = await sql`
    insert into intake.map_node_moderation_notifications (
      kind,
      submission_id
    )
    values (
      'submission',
      ${submissionId}::uuid
    )
    on conflict do nothing
    returning id::text
  `;
  return Boolean(rows[0]?.id);
}

async function retireResolvedSubmissionNotifications(sql: SqlLike): Promise<void> {
  await sql`
    update intake.map_node_moderation_notifications notification
    set
      status = 'skipped',
      delivery_claimed_at = null
    where notification.kind = 'submission'
      and notification.status in ('queued', 'retry_scheduled', 'delivery_claimed')
      and not exists (
        select 1
        from intake.map_node_submissions submission
        where submission.id = notification.submission_id
          and submission.status = 'pending'::intake.map_node_status
      )
  `;
}

async function queueDailyDigestIfDue(sql: SqlLike, now: Date): Promise<void> {
  const bucket = pacificDigestBucket(now);
  if (!Number.isFinite(bucket.hour) || bucket.hour < MAP_NODE_MODERATION_DIGEST_HOUR_PACIFIC) return;

  const [pending] = await sql`
    select count(*)::int as count
    from intake.map_node_submissions
    where status = 'pending'::intake.map_node_status
  `;
  if ((pending?.count ?? 0) <= 0) return;

  await sql`
    insert into intake.map_node_moderation_notifications (
      kind,
      digest_date
    )
    values (
      'daily_digest',
      ${bucket.date}::date
    )
    on conflict do nothing
  `;
}

async function claimModerationNotification(
  sql: SqlLike,
  notificationId: string
): Promise<{ attempts: number } | null> {
  const rows = await sql`
    update intake.map_node_moderation_notifications notification
    set
      status = 'delivery_claimed',
      attempts = notification.attempts + 1,
      delivery_claimed_at = now(),
      provider_error = null
    where notification.id = ${notificationId}::uuid
      and (
        notification.status in ('queued', 'retry_scheduled')
        or (
          notification.status = 'delivery_claimed'
          and notification.delivery_claimed_at < now() - ${MAP_NODE_MODERATION_NOTIFICATION_STALE_CLAIM_MINUTES} * interval '1 minute'
        )
      )
      and (
        notification.kind = 'daily_digest'
        or exists (
          select 1
          from intake.map_node_submissions submission
          where submission.id = notification.submission_id
            and submission.status = 'pending'::intake.map_node_status
        )
      )
    returning attempts
  `;
  return rows[0] ?? null;
}

async function pendingSubmissionCount(sql: SqlLike): Promise<number> {
  const [pending] = await sql`
    select count(*)::int as count
    from intake.map_node_submissions
    where status = 'pending'::intake.map_node_status
  `;
  return Number(pending?.count ?? 0);
}

async function completeModerationNotification({
  sql,
  notificationId,
  attempts,
  result,
}: {
  sql: SqlLike;
  notificationId: string;
  attempts: number;
  result: { status: 'sent' | 'send_failed'; error: string; providerMessageId: string };
}): Promise<'sent' | 'failed'> {
  if (result.status === 'sent') {
    await sql`
      update intake.map_node_moderation_notifications
      set
        status = 'sent',
        sent_at = now(),
        delivery_claimed_at = null,
        provider_error = null,
        provider_message_id = ${result.providerMessageId || null}
      where id = ${notificationId}::uuid
    `;
    return 'sent';
  }

  const retryDelay = retryDelayMinutes(attempts);
  if (retryDelay !== null) {
    await sql`
      update intake.map_node_moderation_notifications
      set
        status = 'retry_scheduled',
        next_attempt_at = now() + ${retryDelay} * interval '1 minute',
        delivery_claimed_at = null,
        provider_error = ${result.error || 'send_failed'}
      where id = ${notificationId}::uuid
    `;
  } else {
    await sql`
      update intake.map_node_moderation_notifications
      set
        status = 'failed',
        delivery_claimed_at = null,
        provider_error = ${result.error || 'send_failed'}
      where id = ${notificationId}::uuid
    `;
  }
  return 'failed';
}

export async function deliverQueuedMapNodeModerationNotifications(
  sql: SqlLike,
  {
    limit = 20,
    env = process.env,
    fetchImpl = globalThis.fetch,
    now = new Date(),
  }: {
    limit?: number;
    env?: Record<string, string | undefined>;
    fetchImpl?: FetchLike;
    now?: Date;
  } = {}
): Promise<QueuedMapNodeModerationDeliveryResult> {
  if (!canSendModerationEmail(env)) {
    return { queued: 0, delivered: 0, failed: 0, skipped: 0 };
  }

  if (magicLinkConfigured(env)) await cleanupMapNodeModerationAccessLinks(sql);
  await retireResolvedSubmissionNotifications(sql);
  await queueDailyDigestIfDue(sql, now);

  const numericLimit = Number(limit);
  const cappedLimit = Math.min(100, Math.max(1, Number.isFinite(numericLimit) ? Math.trunc(numericLimit) : 20));
  const rows = await sql`
    select
      notification.id::text,
      notification.kind,
      notification.attempts,
      notification.submission_id::text as "submissionId",
      submission.display_name as "displayName",
      submission.place_name as "placeName",
      submission.city,
      submission.region,
      submission.country,
      submission.latitude::float8 as lat,
      submission.longitude::float8 as long,
      submission.themes,
      submission.public_note as "publicNote",
      submission.created_at as "createdAt"
    from intake.map_node_moderation_notifications notification
    left join intake.map_node_submissions submission on submission.id = notification.submission_id
    where (
      (
        notification.status in ('queued', 'retry_scheduled')
        and notification.next_attempt_at <= now()
      )
      or (
        notification.status = 'delivery_claimed'
        and notification.delivery_claimed_at < now() - ${MAP_NODE_MODERATION_NOTIFICATION_STALE_CLAIM_MINUTES} * interval '1 minute'
      )
    )
      and (
        notification.kind = 'daily_digest'
        or submission.status = 'pending'::intake.map_node_status
      )
    order by notification.created_at asc
    limit ${cappedLimit}
  `;

  const delivery = {
    queued: rows.length,
    delivered: 0,
    failed: 0,
    skipped: 0,
  };

  for (const row of rows as ModerationNotificationRow[]) {
    const claim = await claimModerationNotification(sql, cleanString(row.id));
    if (!claim) {
      delivery.skipped += 1;
      continue;
    }

    const pendingCount = row.kind === 'daily_digest' ? await pendingSubmissionCount(sql) : 0;
    if (row.kind === 'daily_digest' && pendingCount === 0) {
      await sql`
        update intake.map_node_moderation_notifications
        set status = 'skipped', delivery_claimed_at = null
        where id = ${row.id}::uuid
      `;
      delivery.skipped += 1;
      continue;
    }

    if (row.kind === 'submission' && magicLinkConfigured(env)) {
      const config = moderationConfig(env);
      const accessLinks = await ensureModerationAccessLinks({
        sql,
        row,
        recipients: config.recipients,
        now,
      });
      for (const accessLink of accessLinks) {
        const accessClaim = await claimModerationAccessLink(sql, accessLink.id);
        if (!accessClaim) continue;
        const result = await sendMagicLinkEmail({ row, accessLink, env, fetchImpl });
        await completeModerationAccessLink({
          sql,
          accessLinkId: accessLink.id,
          attempts: Number(accessClaim.attempts ?? accessLink.attempts ?? 0),
          result,
        });
      }
      const status = await completeMagicLinkNotification(sql, cleanString(row.id));
      if (status === 'sent') delivery.delivered += 1;
      else delivery.failed += 1;
      continue;
    }

    const result = await sendModerationEmail({ row, pendingCount, env, fetchImpl });
    const status = await completeModerationNotification({
      sql,
      notificationId: cleanString(row.id),
      attempts: Number(claim.attempts ?? row.attempts ?? 0),
      result,
    });
    if (status === 'sent') delivery.delivered += 1;
    else delivery.failed += 1;
  }

  return delivery;
}

export async function cleanupMapNodeModerationAccessLinks(sql: SqlLike): Promise<number> {
  const [result] = await sql`
    select intake.cleanup_map_node_moderation_access_links() as count
  `;
  return Number(result?.count ?? 0);
}

async function selectModerationAccessLink(
  sql: SqlLike,
  accessLinkId: string,
  { forUpdate = false }: { forUpdate?: boolean } = {}
): Promise<ModerationAccessLinkRow | null> {
  const rows = forUpdate
    ? await sql`
        select
          access.id::text,
          access.notification_id::text as "notificationId",
          access.submission_id::text as "submissionId",
          access.recipient_email::text as "recipientEmail",
          access.token_expires_at as "tokenExpiresAt",
          access.delivery_status as "deliveryStatus",
          access.consumed_at as "consumedAt",
          access.resolved_at as "resolvedAt",
          access.decision::text,
          submission.status::text as "submissionStatus",
          submission.updated_at as "submissionUpdatedAt",
          submission.display_name as "displayName",
          submission.place_name as "placeName",
          submission.city,
          submission.region,
          submission.country,
          submission.latitude::float8 as lat,
          submission.longitude::float8 as long,
          submission.themes,
          submission.public_note as "publicNote",
          submission.created_at as "createdAt"
        from intake.map_node_moderation_access_links access
        join intake.map_node_submissions submission on submission.id = access.submission_id
        where access.id = ${accessLinkId}::uuid
        limit 1
        for update of access
      `
    : await sql`
        select
          access.id::text,
          access.notification_id::text as "notificationId",
          access.submission_id::text as "submissionId",
          access.recipient_email::text as "recipientEmail",
          access.token_expires_at as "tokenExpiresAt",
          access.delivery_status as "deliveryStatus",
          access.consumed_at as "consumedAt",
          access.resolved_at as "resolvedAt",
          access.decision::text,
          submission.status::text as "submissionStatus",
          submission.updated_at as "submissionUpdatedAt",
          submission.display_name as "displayName",
          submission.place_name as "placeName",
          submission.city,
          submission.region,
          submission.country,
          submission.latitude::float8 as lat,
          submission.longitude::float8 as long,
          submission.themes,
          submission.public_note as "publicNote",
          submission.created_at as "createdAt"
        from intake.map_node_moderation_access_links access
        join intake.map_node_submissions submission on submission.id = access.submission_id
        where access.id = ${accessLinkId}::uuid
        limit 1
      `;
  return rows[0] ?? null;
}

function resolvedModerationSession(row: ModerationAccessLinkRow): AuthenticatedMapNodeModerationSession | null {
  const decision = cleanString(row.decision || row.submissionStatus);
  if (decision !== 'approved' && decision !== 'rejected') return null;
  const reviewedAtValue = row.resolvedAt ?? row.submissionUpdatedAt;
  const reviewedAt = reviewedAtValue instanceof Date
    ? reviewedAtValue.toISOString()
    : cleanString(reviewedAtValue);
  if (!reviewedAt) return null;
  return { state: 'resolved', decision, reviewedAt };
}

export async function getMapNodeModerationSession(
  sql: SqlLike,
  token: unknown,
  {
    env = process.env,
    now = new Date(),
  }: {
    env?: Record<string, string | undefined>;
    now?: Date;
  } = {}
): Promise<AuthenticatedMapNodeModerationSession> {
  const parsed = parseModerationToken(token);
  if (!parsed) throw invalidModerationLink();
  const row = await selectModerationAccessLink(sql, parsed.accessLinkId);
  if (!row || !verifyModerationToken({ token, row, env, now })) throw invalidModerationLink();

  if (row.submissionStatus !== 'pending' || row.resolvedAt || row.consumedAt) {
    const resolved = resolvedModerationSession(row);
    if (!resolved) throw invalidModerationLink();
    return resolved;
  }

  const node = toAuthenticatedMapNodeModerationNode({
    ...row,
    id: row.submissionId,
  });
  const expiresAt = row.tokenExpiresAt instanceof Date
    ? row.tokenExpiresAt.toISOString()
    : new Date(row.tokenExpiresAt).toISOString();
  if (!node || !expiresAt) throw invalidModerationLink();
  return { state: 'pending', node, expiresAt };
}

export async function moderateMapNode(
  sql: SqlLike,
  nodeId: unknown,
  input: { token?: unknown; decision?: unknown; note?: unknown } = {},
  {
    env = process.env,
    now = new Date(),
  }: {
    env?: Record<string, string | undefined>;
    now?: Date;
  } = {}
): Promise<AuthenticatedMapNodeModerationResult> {
  const token = cleanString(input.token);
  const parsed = parseModerationToken(token);
  const requestedNodeId = cleanString(nodeId);
  if (!parsed || !UUID_PATTERN.test(requestedNodeId)) throw invalidModerationLink();

  const decision = cleanString(input.decision) as MapNodeModerationDecision;
  if (decision !== 'approved' && decision !== 'rejected') {
    throw new PublicInputError('invalid_moderation_decision', 'Choose approve or decline.');
  }
  const note = cleanString(input.note).replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (note.length > MAP_NODE_MODERATION_REVIEW_NOTE_MAX_LENGTH) {
    throw new PublicInputError(
      'invalid_moderation_note',
      `Decline notes must be ${MAP_NODE_MODERATION_REVIEW_NOTE_MAX_LENGTH} characters or fewer.`
    );
  }
  if (decision === 'approved' && note) {
    throw new PublicInputError('invalid_moderation_note', 'A decline note can only accompany a declined node.');
  }

  return sql.begin(async (tx) => {
    const candidate = await selectModerationAccessLink(tx, parsed.accessLinkId);
    if (
      !candidate ||
      candidate.submissionId !== requestedNodeId ||
      !verifyModerationToken({ token, row: candidate, env, now })
    ) throw invalidModerationLink();

    // All sibling recipient links serialize on the submission before locking
    // their own access row. This gives concurrent decisions one lock order.
    const lockedSubmissions = await tx`
      select id::text
      from intake.map_node_submissions
      where id = ${requestedNodeId}::uuid
      for update
    `;
    if (lockedSubmissions.length !== 1) throw invalidModerationLink();

    const row = await selectModerationAccessLink(tx, parsed.accessLinkId, { forUpdate: true });
    if (
      !row ||
      row.submissionId !== requestedNodeId ||
      !verifyModerationToken({ token, row, env, now })
    ) throw invalidModerationLink();

    if (row.submissionStatus !== 'pending' || row.resolvedAt || row.consumedAt) {
      throw new PublicInputError(
        'moderation_already_resolved',
        'This map node has already been reviewed.',
        409
      );
    }

    const updated = await tx`
      update intake.map_node_submissions
      set status = ${decision}::intake.map_node_status
      where id = ${requestedNodeId}::uuid
        and status = 'pending'::intake.map_node_status
      returning id::text
    `;
    if (updated.length !== 1) {
      throw new PublicInputError(
        'moderation_already_resolved',
        'This map node has already been reviewed.',
        409
      );
    }

    const [review] = await tx`
      insert into intake.map_node_reviews (
        submission_id,
        reviewer_id,
        review_status,
        review_notes
      )
      values (
        ${requestedNodeId}::uuid,
        ${`moderation-link:${row.id}`},
        ${decision}::intake.map_node_status,
        ${decision === 'rejected' && note ? note : null}
      )
      returning created_at as "reviewedAt"
    `;

    await tx`
      update intake.map_node_moderation_access_links
      set
        resolved_at = now(),
        decision = ${decision}::intake.map_node_status
      where submission_id = ${requestedNodeId}::uuid
        and resolved_at is null
    `;

    await tx`
      update intake.map_node_moderation_access_links
      set consumed_at = now()
      where id = ${row.id}::uuid
    `;

    const reviewedAtValue = review?.reviewedAt ?? now;
    const reviewedAt = reviewedAtValue instanceof Date
      ? reviewedAtValue.toISOString()
      : new Date(reviewedAtValue).toISOString();
    return { state: 'resolved', decision, reviewedAt };
  });
}

export function scheduleMapNodeModerationNotificationDelivery({
  sql,
  env,
  fetchImpl,
  createSqlForDeferredDelivery,
}: {
  sql: SqlLike;
  env: Record<string, string | undefined>;
  fetchImpl: FetchLike;
  createSqlForDeferredDelivery?: (options?: { max?: number }) => SqlLike | null;
}): void {
  if (!canSendModerationEmail(env)) return;

  setTimeout(() => {
    void (async () => {
      const deliverySql = createSqlForDeferredDelivery?.({ max: 1 }) ?? sql;
      if (!deliverySql) return;
      const shouldEnd = deliverySql !== sql;
      try {
        await deliverQueuedMapNodeModerationNotifications(deliverySql, { env, fetchImpl });
      } catch (error) {
        console.warn('map_node_moderation_notification_delivery_failed', {
          errorName: error instanceof Error ? error.name : 'UnknownError',
        });
      } finally {
        if (shouldEnd) await deliverySql.end({ timeout: 3 }).catch(() => {});
      }
    })();
  }, 0);
}
