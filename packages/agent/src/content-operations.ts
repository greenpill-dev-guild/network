// Operational-content operations owned by the agent: dispatch-on-publish,
// content-review notification delivery, and Live Onboarding expiry.
//
// Directus writes content rows directly, so (mirroring map-node moderation)
// triggers enqueue and the agent observes/delivers. Secrets (GitHub dispatch
// token, Resend key) stay on the agent; the CMS never holds them.

import { assertPublicWebsiteBuildMetadata } from '@greenpill-network/shared/public-content';
import { createDatabaseClient } from './db.js';

type SqlLike = any;
type FetchLike = typeof fetch;

const RESEND_EMAILS_ENDPOINT = 'https://api.resend.com/emails';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const CONTENT_REVIEW_NOTIFICATION_STALE_CLAIM_MINUTES = 10;
export const CONTENT_REVIEW_NOTIFICATION_MAX_ATTEMPTS = 4;
export const CONTENT_REVIEW_NOTIFICATION_RETRY_MINUTES = Object.freeze([5, 30, 120]);
export const CONTENT_DISPATCH_EVENT_TYPE = 'operational-content-updated';
export const CONTENT_DISPATCH_DEFAULT_REPO = 'greenpill-dev-guild/network';
export const CONTENT_DISPATCH_MIN_INTERVAL_MS = 5 * 60 * 1000;
export const CONTENT_PUBLISH_HEALTH_DEFAULT_WORKFLOW = 'github-pages.yml';
export const CONTENT_PUBLISH_HEALTH_DEFAULT_BRANCH = 'main';

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

function parseHttpUrl(value: unknown): string {
  try {
    const url = new URL(cleanString(value));
    return (url.protocol === 'http:' || url.protocol === 'https:') && !url.username && !url.password ? url.href : '';
  } catch {
    return '';
  }
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

export function getContentOperationsConfig(env: Record<string, string | undefined> = process.env) {
  const directusBaseUrl = cleanString(env.CONTENT_REVIEW_DIRECTUS_URL)
    || cleanString(env.MAP_NODE_MODERATION_DIRECTUS_URL);
  return {
    dispatchEnabled: cleanString(env.CONTENT_DISPATCH_ENABLED).toLowerCase() === 'true',
    dispatchToken: cleanString(env.CONTENT_DISPATCH_GITHUB_TOKEN),
    dispatchRepo: cleanString(env.CONTENT_DISPATCH_GITHUB_REPO) || CONTENT_DISPATCH_DEFAULT_REPO,
    dispatchMinIntervalMs: Number.parseInt(env.CONTENT_DISPATCH_MIN_INTERVAL_MS ?? '', 10) > 0
      ? Number.parseInt(env.CONTENT_DISPATCH_MIN_INTERVAL_MS ?? '', 10)
      : CONTENT_DISPATCH_MIN_INTERVAL_MS,
    publishHealthEnabled: cleanString(env.CONTENT_PUBLISH_HEALTH_ENABLED).toLowerCase() === 'true',
    publishHealthMetadataUrl: parseHttpUrl(env.CONTENT_PUBLISH_HEALTH_METADATA_URL),
    publishHealthStaleThresholdMs:
      Number.parseInt(env.CONTENT_PUBLISH_HEALTH_STALE_THRESHOLD_MS ?? '', 10) > 0
        ? Number.parseInt(env.CONTENT_PUBLISH_HEALTH_STALE_THRESHOLD_MS ?? '', 10)
        : 0,
    publishHealthWorkflow: cleanString(env.CONTENT_PUBLISH_HEALTH_WORKFLOW) || CONTENT_PUBLISH_HEALTH_DEFAULT_WORKFLOW,
    publishHealthBranch: cleanString(env.CONTENT_PUBLISH_HEALTH_BRANCH) || CONTENT_PUBLISH_HEALTH_DEFAULT_BRANCH,
    resendApiKey: cleanString(env.RESEND_API_KEY),
    emailFrom: cleanString(env.CONTENT_REVIEW_EMAIL_FROM) || cleanString(env.MAP_NODE_EMAIL_FROM),
    emailReplyTo: cleanString(env.CONTENT_REVIEW_EMAIL_REPLY_TO) || cleanString(env.MAP_NODE_EMAIL_REPLY_TO),
    reviewRecipients: parseRecipients(env.CONTENT_REVIEW_RECIPIENTS),
    requestUrl: (id: string) => buildDirectusUrl(
      directusBaseUrl,
      `/admin/content/chapter_update_requests/${encodeURIComponent(id)}`
    ),
    initiativeUrl: (slug: string) => buildDirectusUrl(
      directusBaseUrl,
      `/admin/content/chapter_initiatives/${encodeURIComponent(slug)}`
    ),
    recordUrl: (collection: string, slug: string) => buildDirectusUrl(
      directusBaseUrl,
      `/admin/content/${encodeURIComponent(collection)}/${encodeURIComponent(slug)}`
    ),
  };
}

// --- Dispatch-on-publish -----------------------------------------------------

export interface ContentDispatchState {
  watermark: string;
  lastDispatchAt: number;
}

export async function computeContentWatermark(sql: SqlLike): Promise<string> {
  const [row] = await sql`
    select jsonb_build_object(
      'themes', (select jsonb_build_array(count(*), max(updated_at)) from content.themes),
      'people', (select jsonb_build_array(count(*), max(updated_at)) from content.people),
      'chapters', (select jsonb_build_array(count(*), max(updated_at)) from content.chapters),
      'chapter_initiatives', (select jsonb_build_array(count(*), max(updated_at)) from content.chapter_initiatives),
      'guilds', (select jsonb_build_array(count(*), max(updated_at)) from content.guilds),
      'projects', (select jsonb_build_array(count(*), max(updated_at)) from content.projects)
    )::text as watermark
  `;
  return cleanString(row?.watermark);
}

export interface ContentDispatchResult {
  status: 'dispatched' | 'unchanged' | 'initialized' | 'coalesced' | 'disabled' | 'dispatch_failed';
  watermark?: string;
}

export async function maybeDispatchContentRebuild(
  sql: SqlLike,
  state: ContentDispatchState,
  {
    env = process.env,
    fetchImpl = globalThis.fetch,
    now = Date.now(),
  }: {
    env?: Record<string, string | undefined>;
    fetchImpl?: FetchLike;
    now?: number;
  } = {}
): Promise<ContentDispatchResult> {
  const config = getContentOperationsConfig(env);
  if (!config.dispatchEnabled || !config.dispatchToken || typeof fetchImpl !== 'function') {
    return { status: 'disabled' };
  }

  const watermark = await computeContentWatermark(sql);
  if (!watermark) return { status: 'unchanged' };

  if (!state.watermark) {
    // First observation after boot: baseline only. The hourly cron covers
    // changes that happened while the agent was down.
    state.watermark = watermark;
    return { status: 'initialized', watermark };
  }

  if (state.watermark === watermark) return { status: 'unchanged' };

  if (now - state.lastDispatchAt < config.dispatchMinIntervalMs) {
    // Change observed inside the coalescing window; keep the old watermark so
    // the next sweep past the window still sees the difference and dispatches.
    return { status: 'coalesced' };
  }

  try {
    const response = await fetchImpl(`https://api.github.com/repos/${config.dispatchRepo}/dispatches`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${config.dispatchToken}`,
        accept: 'application/vnd.github+json',
        'content-type': 'application/json',
        'user-agent': 'greenpill-network-agent',
      },
      body: JSON.stringify({ event_type: CONTENT_DISPATCH_EVENT_TYPE }),
    });
    if (response.status !== 204) {
      console.warn('content_dispatch_failed', { status: response.status });
      return { status: 'dispatch_failed', watermark };
    }
  } catch (error) {
    console.warn('content_dispatch_failed', {
      errorName: error instanceof Error ? error.name : 'UnknownError',
    });
    return { status: 'dispatch_failed', watermark };
  }

  state.watermark = watermark;
  state.lastDispatchAt = now;
  console.log('content_dispatch_sent', { repo: config.dispatchRepo });
  return { status: 'dispatched', watermark };
}

// --- Deployed publish health -------------------------------------------------

export interface ContentPublishHealthObservation {
  contentWatermark: string;
  deployedBuildAt: string;
  deployedSnapshotGeneratedAt: string;
  pagesRunId: string;
  pagesRunUrl: string;
  pagesConclusion: string;
  pagesCompletedAt: string;
  checkedAt: string;
  staleThresholdMs: number;
}

export interface ContentPublishHealthState {
  staleAlertActive: boolean;
  buildFailedAlertActive: boolean;
  staleRecoveredAt: string;
  buildFailedRecoveredAt: string;
}

export interface ContentPublishHealthTransition {
  kind: 'stale' | 'build_failed';
  status: 'active' | 'recovered';
}

export interface ContentPublishHealthEvaluation {
  status: 'healthy' | 'stale' | 'build_failed' | 'stale_and_build_failed';
  transitions: ContentPublishHealthTransition[];
  nextState: ContentPublishHealthState;
}

const toIsoOrEmpty = (value: unknown): string => {
  const cleaned = cleanString(value);
  const date = value instanceof Date ? value : new Date(cleaned);
  return (value instanceof Date || cleaned) && !Number.isNaN(date.valueOf()) ? date.toISOString() : '';
};

const toBoolean = (value: unknown): boolean => value === true || value === 'true';

export function evaluateContentPublishHealth(
  previous: ContentPublishHealthState,
  observation: ContentPublishHealthObservation
): ContentPublishHealthEvaluation {
  const contentWatermarkMs = new Date(observation.contentWatermark).valueOf();
  const deployedSnapshotMs = new Date(observation.deployedSnapshotGeneratedAt).valueOf();
  if (
    Number.isNaN(contentWatermarkMs) ||
    Number.isNaN(deployedSnapshotMs) ||
    !Number.isFinite(observation.staleThresholdMs) ||
    observation.staleThresholdMs <= 0
  ) {
    throw new Error('invalid_publish_health_observation');
  }

  const stale = contentWatermarkMs - deployedSnapshotMs > observation.staleThresholdMs;
  const buildFailed = cleanString(observation.pagesConclusion).toLowerCase() !== 'success';
  const transitions: ContentPublishHealthTransition[] = [];

  if (stale !== previous.staleAlertActive) {
    transitions.push({ kind: 'stale', status: stale ? 'active' : 'recovered' });
  }
  if (buildFailed !== previous.buildFailedAlertActive) {
    transitions.push({
      kind: 'build_failed',
      status: buildFailed ? 'active' : 'recovered',
    });
  }

  return {
    status: stale ? (buildFailed ? 'stale_and_build_failed' : 'stale') : buildFailed ? 'build_failed' : 'healthy',
    transitions,
    nextState: {
      staleAlertActive: stale,
      buildFailedAlertActive: buildFailed,
      staleRecoveredAt: previous.staleAlertActive && !stale ? observation.checkedAt : previous.staleRecoveredAt,
      buildFailedRecoveredAt:
        previous.buildFailedAlertActive && !buildFailed ? observation.checkedAt : previous.buildFailedRecoveredAt,
    },
  };
}

export async function computeContentUpdatedAtWatermark(sql: SqlLike): Promise<string> {
  const [row] = await sql`
    select greatest(
      coalesce((select max(updated_at) from content.themes), '-infinity'::timestamptz),
      coalesce((select max(updated_at) from content.people), '-infinity'::timestamptz),
      coalesce((select max(updated_at) from content.chapters), '-infinity'::timestamptz),
      coalesce((select max(updated_at) from content.chapter_initiatives), '-infinity'::timestamptz),
      coalesce((select max(updated_at) from content.guilds), '-infinity'::timestamptz),
      coalesce((select max(updated_at) from content.projects), '-infinity'::timestamptz)
    )::text as "contentWatermark"
  `;
  return toIsoOrEmpty(row?.contentWatermark);
}

function buildPagesWorkflowRunsUrl(repo: string, workflow: string, branch: string): string {
  const [owner, name, ...extra] = cleanString(repo).split('/');
  if (!owner || !name || extra.length > 0 || !cleanString(branch)) return '';
  return (
    `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}` +
    `/actions/workflows/${encodeURIComponent(workflow)}/runs` +
    `?branch=${encodeURIComponent(branch)}&status=completed&per_page=1`
  );
}

export async function fetchContentPublishHealthObservation(
  sql: SqlLike,
  {
    env = process.env,
    fetchImpl = globalThis.fetch,
    now = new Date(),
  }: {
    env?: Record<string, string | undefined>;
    fetchImpl?: FetchLike;
    now?: Date | string;
  } = {}
): Promise<ContentPublishHealthObservation> {
  const config = getContentOperationsConfig(env);
  const workflowRunsUrl = buildPagesWorkflowRunsUrl(
    config.dispatchRepo,
    config.publishHealthWorkflow,
    config.publishHealthBranch
  );
  if (
    !config.publishHealthMetadataUrl ||
    !config.publishHealthStaleThresholdMs ||
    !config.dispatchToken ||
    !workflowRunsUrl ||
    typeof fetchImpl !== 'function'
  ) {
    throw new Error('publish_health_not_configured');
  }

  const [contentWatermark, metadataResponse, workflowResponse] = await Promise.all([
    computeContentUpdatedAtWatermark(sql),
    fetchImpl(config.publishHealthMetadataUrl, {
      headers: { accept: 'application/json' },
    }),
    fetchImpl(workflowRunsUrl, {
      headers: {
        authorization: `Bearer ${config.dispatchToken}`,
        accept: 'application/vnd.github+json',
        'user-agent': 'greenpill-network-agent',
      },
    }),
  ]);

  if (!contentWatermark) throw new Error('publish_health_content_watermark_unavailable');
  if (!metadataResponse.ok) throw new Error(`publish_health_metadata_http_${metadataResponse.status}`);
  if (!workflowResponse.ok) throw new Error(`publish_health_workflow_http_${workflowResponse.status}`);

  const metadata = assertPublicWebsiteBuildMetadata(await metadataResponse.json());
  const workflowPayload = (await workflowResponse.json()) as {
    workflow_runs?: unknown[];
  };
  const run = Array.isArray(workflowPayload?.workflow_runs)
    ? (workflowPayload.workflow_runs[0] as Record<string, unknown> | undefined)
    : undefined;
  const pagesRunId = cleanString(run?.id === undefined || run?.id === null ? '' : String(run.id));
  const pagesConclusion = cleanString(run?.conclusion).toLowerCase();
  const pagesCompletedAt = toIsoOrEmpty(run?.updated_at);
  if (!run || !pagesRunId || !pagesConclusion || !pagesCompletedAt) {
    throw new Error('publish_health_workflow_run_unavailable');
  }

  return {
    contentWatermark,
    deployedBuildAt: metadata.builtAt,
    deployedSnapshotGeneratedAt: metadata.operationalSnapshot.generatedAt,
    pagesRunId,
    pagesRunUrl: parseHttpUrl(run.html_url),
    pagesConclusion,
    pagesCompletedAt,
    checkedAt: toIsoOrEmpty(now) || new Date().toISOString(),
    staleThresholdMs: config.publishHealthStaleThresholdMs,
  };
}

function publishHealthEventKey(
  transition: ContentPublishHealthTransition,
  observation: ContentPublishHealthObservation
): string {
  const marker =
    transition.kind === 'build_failed'
      ? observation.pagesRunId
      : `${observation.contentWatermark}:${observation.deployedSnapshotGeneratedAt}`;
  return `publish-health:${transition.kind}:${transition.status}:${marker}`;
}

export async function persistContentPublishHealthObservation(
  sql: SqlLike,
  observation: ContentPublishHealthObservation
): Promise<ContentPublishHealthEvaluation> {
  return sql.begin(async (tx: SqlLike) => {
    const [row] = await tx`
      select
        stale_alert_active as "staleAlertActive",
        build_failed_alert_active as "buildFailedAlertActive",
        stale_recovered_at::text as "staleRecoveredAt",
        build_failed_recovered_at::text as "buildFailedRecoveredAt"
      from content.publish_health
      where id = 'website'
      for update
    `;
    if (!row) throw new Error('publish_health_state_unavailable');

    const evaluation = evaluateContentPublishHealth(
      {
        staleAlertActive: toBoolean(row.staleAlertActive),
        buildFailedAlertActive: toBoolean(row.buildFailedAlertActive),
        staleRecoveredAt: toIsoOrEmpty(row.staleRecoveredAt),
        buildFailedRecoveredAt: toIsoOrEmpty(row.buildFailedRecoveredAt),
      },
      observation
    );

    const details = {
      contentWatermark: observation.contentWatermark,
      deployedBuildAt: observation.deployedBuildAt,
      deployedSnapshotGeneratedAt: observation.deployedSnapshotGeneratedAt,
      pagesRunId: observation.pagesRunId,
      pagesRunUrl: observation.pagesRunUrl,
      pagesConclusion: observation.pagesConclusion,
      pagesCompletedAt: observation.pagesCompletedAt,
      checkedAt: observation.checkedAt,
      staleThresholdMs: observation.staleThresholdMs,
    };

    for (const transition of evaluation.transitions) {
      await tx`
        insert into content.review_notifications (
          kind,
          event_key,
          publish_health_kind,
          publish_health_status,
          publish_health_details
        ) values (
          'publish_health',
          ${publishHealthEventKey(transition, observation)},
          ${transition.kind},
          ${transition.status},
          ${tx.json(details)}
        )
        on conflict do nothing
      `;
    }

    await tx`
      update content.publish_health
      set
        content_watermark = ${observation.contentWatermark}::timestamptz,
        deployed_build_at = ${observation.deployedBuildAt}::timestamptz,
        deployed_snapshot_generated_at = ${observation.deployedSnapshotGeneratedAt}::timestamptz,
        latest_pages_run_id = ${observation.pagesRunId},
        latest_pages_run_url = ${observation.pagesRunUrl},
        latest_pages_conclusion = ${observation.pagesConclusion},
        latest_pages_completed_at = ${observation.pagesCompletedAt}::timestamptz,
        stale_threshold_ms = ${observation.staleThresholdMs},
        checked_at = ${observation.checkedAt}::timestamptz,
        stale_alert_active = ${evaluation.nextState.staleAlertActive},
        build_failed_alert_active = ${evaluation.nextState.buildFailedAlertActive},
        stale_recovered_at = ${evaluation.nextState.staleRecoveredAt || null}::timestamptz,
        build_failed_recovered_at = ${evaluation.nextState.buildFailedRecoveredAt || null}::timestamptz
      where id = 'website'
    `;

    return evaluation;
  });
}

export async function checkContentPublishHealth(
  sql: SqlLike,
  {
    env = process.env,
    fetchImpl = globalThis.fetch,
    now = new Date(),
  }: {
    env?: Record<string, string | undefined>;
    fetchImpl?: FetchLike;
    now?: Date | string;
  } = {}
): Promise<{
  status: 'disabled' | 'checked' | 'check_failed';
  health?: ContentPublishHealthEvaluation['status'];
}> {
  const config = getContentOperationsConfig(env);
  if (!config.publishHealthEnabled) return { status: 'disabled' };

  try {
    const observation = await fetchContentPublishHealthObservation(sql, {
      env,
      fetchImpl,
      now,
    });
    const evaluation = await persistContentPublishHealthObservation(sql, observation);
    console.log('content_publish_health_checked', {
      health: evaluation.status,
      transitions: evaluation.transitions.length,
    });
    return { status: 'checked', health: evaluation.status };
  } catch (error) {
    console.warn('content_publish_health_check_failed', {
      errorName: error instanceof Error ? error.name : 'UnknownError',
    });
    return { status: 'check_failed' };
  }
}

// --- Content-review notifications -------------------------------------------

type ReviewNotificationKind =
  | 'update_request_pending'
  | 'update_request_decided'
  | 'initiative_pending'
  | 'record_quarantined'
  | 'publish_health';

interface ReviewNotificationRow {
  id: string;
  kind: ReviewNotificationKind;
  requestId?: string;
  chapterSlug?: string;
  initiativeSlug?: string;
  recordCollection?: string;
  recordSlug?: string;
  quarantineReason?: string;
  requestStatus?: string;
  requestTitle?: string;
  requestSummary?: string;
  reviewerNotes?: string;
  creatorEmail?: string;
  initiativeTitle?: string;
  publishHealthKind?: ContentPublishHealthTransition['kind'];
  publishHealthStatus?: ContentPublishHealthTransition['status'];
  publishHealthDetails?: Partial<ContentPublishHealthObservation>;
}

export interface QueuedContentReviewDeliveryResult {
  queued: number;
  delivered: number;
  failed: number;
  skipped: number;
}

function retryDelayMinutes(attempts: number): number | null {
  return CONTENT_REVIEW_NOTIFICATION_RETRY_MINUTES[attempts - 1] ?? null;
}

function pendingRequestEmailText(row: ReviewNotificationRow, requestUrl: string): string {
  return [
    'A Greenpill chapter update request is waiting for review.',
    '',
    `Chapter: ${toSafeEmailText(row.chapterSlug)}`,
    `Title: ${toSafeEmailText(row.requestTitle)}`,
    `Summary: ${toSafeEmailText(row.requestSummary)}`,
    '',
    `Review it in Directus: ${requestUrl}`,
    '',
    'Accepting the request applies its proposed fields to the live chapter record automatically.',
  ].join('\n');
}

function decidedRequestEmailText(row: ReviewNotificationRow, requestUrl: string): string {
  const decision = toSafeEmailText(row.requestStatus, 'updated');
  return [
    `Your Greenpill chapter update request was marked "${decision}".`,
    '',
    `Chapter: ${toSafeEmailText(row.chapterSlug)}`,
    `Title: ${toSafeEmailText(row.requestTitle)}`,
    `Reviewer notes: ${toSafeEmailText(row.reviewerNotes, 'None')}`,
    '',
    `Open it in Directus: ${requestUrl}`,
  ].join('\n');
}

function pendingInitiativeEmailText(row: ReviewNotificationRow, initiativeUrl: string): string {
  return [
    'A Greenpill chapter initiative is waiting for review.',
    '',
    `Chapter: ${toSafeEmailText(row.chapterSlug)}`,
    `Initiative: ${toSafeEmailText(row.initiativeTitle ?? row.initiativeSlug)}`,
    '',
    `Review it in Directus: ${initiativeUrl}`,
  ].join('\n');
}

function quarantinedRecordEmailText(row: ReviewNotificationRow, recordUrl: string): string {
  return [
    'A published record was QUARANTINED out of the Greenpill public snapshot.',
    '',
    `Collection: ${toSafeEmailText(row.recordCollection)}`,
    `Record: ${toSafeEmailText(row.recordSlug)}`,
    `Reason: ${toSafeEmailText(row.quarantineReason)}`,
    '',
    'The record is currently missing from the public website. Fix the flagged',
    'issue (approve the media review or remove the private field), and it',
    'returns on the next snapshot automatically.',
    '',
    `Open it in Directus: ${recordUrl}`,
  ].join('\n');
}

function publishHealthEmailText(row: ReviewNotificationRow): string {
  const details = row.publishHealthDetails ?? {};
  const recovered = row.publishHealthStatus === 'recovered';
  const heading =
    row.publishHealthKind === 'stale'
      ? `Greenpill website publish freshness ${recovered ? 'RECOVERED' : 'is STALE'}.`
      : `Greenpill GitHub Pages delivery ${recovered ? 'RECOVERED' : 'FAILED'}.`;
  return [
    heading,
    '',
    `Content watermark: ${toSafeEmailText(details.contentWatermark)}`,
    `Deployed build: ${toSafeEmailText(details.deployedBuildAt)}`,
    `Deployed snapshot: ${toSafeEmailText(details.deployedSnapshotGeneratedAt)}`,
    `Pages conclusion: ${toSafeEmailText(details.pagesConclusion)}`,
    `Checked at: ${toSafeEmailText(details.checkedAt)}`,
    ...(details.pagesRunUrl ? ['', `Open the Pages run: ${toSafeEmailText(details.pagesRunUrl)}`] : []),
  ].join('\n');
}

async function claimReviewNotification(sql: SqlLike, notificationId: string): Promise<{ attempts: number } | null> {
  const rows = await sql`
    update content.review_notifications notification
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
          and notification.delivery_claimed_at < now() - ${CONTENT_REVIEW_NOTIFICATION_STALE_CLAIM_MINUTES} * interval '1 minute'
        )
      )
    returning attempts
  `;
  return rows[0] ?? null;
}

async function completeReviewNotification({
  sql,
  notificationId,
  attempts,
  result,
}: {
  sql: SqlLike;
  notificationId: string;
  attempts: number;
  result: { status: 'sent' | 'send_failed' | 'skipped'; error: string; providerMessageId: string };
}): Promise<'sent' | 'failed' | 'skipped'> {
  if (result.status === 'sent') {
    await sql`
      update content.review_notifications
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

  if (result.status === 'skipped') {
    await sql`
      update content.review_notifications
      set
        status = 'skipped',
        delivery_claimed_at = null,
        provider_error = ${result.error || null}
      where id = ${notificationId}::uuid
    `;
    return 'skipped';
  }

  const retryDelay = retryDelayMinutes(attempts);
  if (retryDelay !== null) {
    await sql`
      update content.review_notifications
      set
        status = 'retry_scheduled',
        next_attempt_at = now() + ${retryDelay} * interval '1 minute',
        delivery_claimed_at = null,
        provider_error = ${result.error || 'send_failed'}
      where id = ${notificationId}::uuid
    `;
  } else {
    await sql`
      update content.review_notifications
      set
        status = 'failed',
        delivery_claimed_at = null,
        provider_error = ${result.error || 'send_failed'}
      where id = ${notificationId}::uuid
    `;
  }
  return 'failed';
}

async function sendReviewEmail({
  row,
  env = process.env,
  fetchImpl = globalThis.fetch,
}: {
  row: ReviewNotificationRow;
  env?: Record<string, string | undefined>;
  fetchImpl?: FetchLike;
}): Promise<{ status: 'sent' | 'send_failed' | 'skipped'; error: string; providerMessageId: string }> {
  const config = getContentOperationsConfig(env);
  if (!config.resendApiKey || !config.emailFrom || typeof fetchImpl !== 'function') {
    return { status: 'send_failed', error: 'provider_not_configured', providerMessageId: '' };
  }

  let to: string[] = [];
  let subject = '';
  let text = '';

  if (row.kind === 'update_request_pending') {
    const url = row.requestId ? config.requestUrl(row.requestId) : '';
    if (!url) return { status: 'send_failed', error: 'directus_url_not_configured', providerMessageId: '' };
    if (!config.reviewRecipients.length) {
      return { status: 'skipped', error: 'no_review_recipients_configured', providerMessageId: '' };
    }
    to = config.reviewRecipients;
    subject = 'Greenpill chapter update request awaiting review';
    text = pendingRequestEmailText(row, url);
  } else if (row.kind === 'initiative_pending') {
    const url = row.initiativeSlug ? config.initiativeUrl(row.initiativeSlug) : '';
    if (!url) return { status: 'send_failed', error: 'directus_url_not_configured', providerMessageId: '' };
    if (!config.reviewRecipients.length) {
      return { status: 'skipped', error: 'no_review_recipients_configured', providerMessageId: '' };
    }
    to = config.reviewRecipients;
    subject = 'Greenpill chapter initiative awaiting review';
    text = pendingInitiativeEmailText(row, url);
  } else if (row.kind === 'record_quarantined') {
    const url = row.recordCollection && row.recordSlug
      ? config.recordUrl(row.recordCollection, row.recordSlug)
      : '';
    if (!url) return { status: 'send_failed', error: 'directus_url_not_configured', providerMessageId: '' };
    if (!config.reviewRecipients.length) {
      return { status: 'skipped', error: 'no_review_recipients_configured', providerMessageId: '' };
    }
    to = config.reviewRecipients;
    subject = 'Greenpill public snapshot quarantined a record';
    text = quarantinedRecordEmailText(row, url);
  } else if (row.kind === 'publish_health') {
    if (!config.reviewRecipients.length) {
      return {
        status: 'send_failed',
        error: 'no_review_recipients_configured',
        providerMessageId: '',
      };
    }
    to = config.reviewRecipients;
    const recovered = row.publishHealthStatus === 'recovered';
    subject =
      row.publishHealthKind === 'stale'
        ? `Greenpill website freshness ${recovered ? 'recovered' : 'alert'}`
        : `Greenpill Pages delivery ${recovered ? 'recovered' : 'failed'}`;
    text = publishHealthEmailText(row);
  } else {
    const url = row.requestId ? config.requestUrl(row.requestId) : '';
    if (!url) return { status: 'send_failed', error: 'directus_url_not_configured', providerMessageId: '' };
    const creatorEmail = cleanString(row.creatorEmail).toLowerCase();
    if (!creatorEmail || !EMAIL_PATTERN.test(creatorEmail)) {
      return { status: 'skipped', error: 'creator_email_unavailable', providerMessageId: '' };
    }
    to = [creatorEmail];
    subject = 'Your Greenpill chapter update request was reviewed';
    text = decidedRequestEmailText(row, url);
  }

  try {
    const response = await fetchImpl(RESEND_EMAILS_ENDPOINT, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${config.resendApiKey}`,
        'content-type': 'application/json',
        'Idempotency-Key': `content-review-${row.id}`,
      },
      body: JSON.stringify({
        from: config.emailFrom,
        to,
        subject,
        text,
        ...(config.emailReplyTo ? { reply_to: config.emailReplyTo } : {}),
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

export async function deliverQueuedContentReviewNotifications(
  sql: SqlLike,
  {
    limit = 20,
    env = process.env,
    fetchImpl = globalThis.fetch,
  }: {
    limit?: number;
    env?: Record<string, string | undefined>;
    fetchImpl?: FetchLike;
  } = {}
): Promise<QueuedContentReviewDeliveryResult> {
  const result: QueuedContentReviewDeliveryResult = { queued: 0, delivered: 0, failed: 0, skipped: 0 };

  const due: ReviewNotificationRow[] = await sql`
    select
      notification.id::text,
      notification.kind,
      notification.request_id::text as "requestId",
      notification.chapter_slug as "chapterSlug",
      notification.initiative_slug as "initiativeSlug",
      notification.record_collection as "recordCollection",
      notification.record_slug as "recordSlug",
      notification.quarantine_reason as "quarantineReason",
      notification.request_status as "requestStatus",
      notification.publish_health_kind as "publishHealthKind",
      notification.publish_health_status as "publishHealthStatus",
      notification.publish_health_details as "publishHealthDetails",
      request.title as "requestTitle",
      request.summary as "requestSummary",
      request.reviewer_notes as "reviewerNotes",
      creator.email::text as "creatorEmail",
      initiative.title as "initiativeTitle"
    from content.review_notifications notification
    left join content.chapter_update_requests request on request.id = notification.request_id
    left join public.directus_users creator
      on creator.id = request.created_by and creator.status = 'active'
    left join content.chapter_initiatives initiative
      on notification.kind = 'initiative_pending' and initiative.slug = notification.initiative_slug
    where
      (
        notification.status in ('queued', 'retry_scheduled')
        and notification.next_attempt_at <= now()
      )
      or (
        notification.status = 'delivery_claimed'
        and notification.delivery_claimed_at < now() - ${CONTENT_REVIEW_NOTIFICATION_STALE_CLAIM_MINUTES} * interval '1 minute'
      )
    order by notification.created_at asc
    limit ${limit}
  `;

  result.queued = due.length;

  for (const row of due) {
    const claim = await claimReviewNotification(sql, row.id);
    if (!claim) continue;

    const sendResult = await sendReviewEmail({ row, env, fetchImpl });
    const outcome = await completeReviewNotification({
      sql,
      notificationId: row.id,
      attempts: claim.attempts,
      result: sendResult,
    });
    if (outcome === 'sent') result.delivered += 1;
    else if (outcome === 'skipped') result.skipped += 1;
    else result.failed += 1;
  }

  return result;
}

// --- Quarantine alerts --------------------------------------------------------

const QUARANTINE_COLLECTION_TO_DIRECTUS: Record<string, string> = {
  themes: 'themes',
  people: 'people',
  chapters: 'chapters',
  chapterInitiatives: 'chapter_initiatives',
  guilds: 'guilds',
  projects: 'projects',
};

export async function enqueueQuarantineAlerts(
  sql: SqlLike,
  records: Array<{ collection: string; slug: string; reason: string }>
): Promise<void> {
  for (const record of records) {
    const collection = QUARANTINE_COLLECTION_TO_DIRECTUS[record.collection] ?? cleanString(record.collection);
    const slug = cleanString(record.slug);
    if (!collection || !slug) continue;
    try {
      await sql`
        insert into content.review_notifications (kind, record_collection, record_slug, quarantine_reason)
        values ('record_quarantined', ${collection}, ${slug}, ${cleanString(record.reason)})
        on conflict do nothing
      `;
    } catch {
      // Pre-migration database: the console.warn from the snapshot builder
      // already surfaced the quarantine; alerting starts once 026 is applied.
    }
  }
}

// --- Live Onboarding expiry ---------------------------------------------------

export async function expireLiveOnboardingIfDue(sql: SqlLike): Promise<boolean> {
  try {
    const [row] = await sql`select intake.expire_live_onboarding() as changed`;
    const changed = row?.changed === true || row?.changed === 'true';
    if (changed) console.log('live_onboarding_expired_auto_off');
    return changed;
  } catch {
    // Databases that have not applied migration 025 yet have nothing to expire.
    return false;
  }
}

// --- Repository ---------------------------------------------------------------

async function withSql<T>(
  createSql: (options?: { max?: number }) => SqlLike | null,
  callback: (sql: SqlLike) => Promise<T> | T
): Promise<T | null> {
  const sql = createSql({ max: 1 });
  if (!sql) return null;
  try {
    return await callback(sql);
  } finally {
    await sql.end({ timeout: 3 }).catch(() => {});
  }
}

export function createContentOperationsRepository({
  createSql = createDatabaseClient,
  env = process.env,
  fetchImpl = globalThis.fetch,
}: {
  createSql?: (options?: { max?: number }) => SqlLike | null;
  env?: Record<string, string | undefined>;
  fetchImpl?: FetchLike;
} = {}) {
  const dispatchState: ContentDispatchState = { watermark: '', lastDispatchAt: 0 };

  return {
    maybeDispatchContentRebuild() {
      return withSql(createSql, (sql) => maybeDispatchContentRebuild(sql, dispatchState, { env, fetchImpl }));
    },
    checkPublishHealth() {
      return withSql(createSql, (sql) => checkContentPublishHealth(sql, { env, fetchImpl }));
    },
    deliverQueuedReviewNotifications(options?: { limit?: number }) {
      return withSql(createSql, (sql) => deliverQueuedContentReviewNotifications(sql, {
        env,
        fetchImpl,
        ...options,
      }));
    },
    expireLiveOnboardingIfDue() {
      return withSql(createSql, expireLiveOnboardingIfDue);
    },
  };
}
