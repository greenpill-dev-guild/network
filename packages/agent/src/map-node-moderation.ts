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

const RESEND_EMAILS_ENDPOINT = 'https://api.resend.com/emails';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
  return {
    apiKey: cleanString(env.RESEND_API_KEY),
    from: cleanString(env.MAP_NODE_EMAIL_FROM),
    replyTo: cleanString(env.MAP_NODE_EMAIL_REPLY_TO),
    recipients: parseRecipients(env.MAP_NODE_MODERATION_RECIPIENTS),
    recordUrl: (id: string) => buildDirectusUrl(
      directusBaseUrl,
      `/admin/content/intake.map_node_submissions/${encodeURIComponent(id)}`
    ),
    queueUrl: buildDirectusUrl(directusBaseUrl, '/admin/content/intake.map_node_submissions'),
  };
}

function canSendModerationEmail(env: Record<string, string | undefined> = process.env): boolean {
  const config = moderationConfig(env);
  return Boolean(config.apiKey && config.from && config.recipients.length && config.queueUrl);
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
