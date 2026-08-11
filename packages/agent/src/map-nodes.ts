import { createHash, randomBytes } from 'node:crypto';
import { isIP } from 'node:net';
import {
  containsPrivateMapNodeField,
  createOptimisticPendingNode,
  derivePublicBioregionFromCoordinates,
  normalizePublicMapThemeSlugs,
  toEditablePublicMapNode,
  toPublicMapNode,
} from '@greenpill-network/shared/map-nodes';
import type {
  EditablePublicMapNode,
  OptimisticPendingMapNode,
  PublicMapNode,
} from '@greenpill-network/shared/map-nodes';
import type { PublicMapIntakeMode } from '@greenpill-network/shared/map-state';
import { createDatabaseClient } from './db.js';
import {
  AgentDataError,
  PublicInputError,
  publicErrorResponse,
} from './errors.js';
import { consumeMapLocationConfirmation } from './map-locations.js';

export {
  AgentDataError,
  PublicInputError,
  publicErrorResponse,
} from './errors.js';
import {
  deliverQueuedMapNodeModerationNotifications,
  getMapNodeModerationSession,
  moderateMapNode,
  queueMapNodeModerationNotification,
  scheduleMapNodeModerationNotificationDelivery,
} from './map-node-moderation.js';

type SqlLike = any;
type UnknownRecord = Record<string, any>;
type FetchLike = typeof fetch;

export interface RequestMeta {
  ipAddress?: string;
  userAgent?: string;
  rateLimitKey?: string;
}

export interface PublicMapNodeSubmissionInput extends UnknownRecord {
  displayName?: string;
  name?: string;
  placeName?: string;
  place?: string;
  city?: string;
  region?: string;
  country?: string;
  lat?: number | string;
  latitude?: number | string;
  long?: number | string;
  lng?: number | string;
  longitude?: number | string;
  role?: string;
  intent?: string;
  themes?: string[];
  publicNote?: string;
  public_note?: string;
  rawNote?: string;
  raw_note?: string;
  email?: string;
  privateEmail?: string;
  private_email?: string;
  contactConsent?: boolean;
  contact_consent?: boolean;
  website?: string;
  locationConfirmationId?: string;
  location_confirmation_id?: string;
}

export interface PublicMapNodeUpdateRequestInput extends UnknownRecord {
  token?: string;
}

export interface PublicMapNodeUpdateRequestResponse {
  id: string;
  status: 'pending';
}

export type SubmittedPendingMapNode = Omit<OptimisticPendingMapNode, 'source'> & {
  source: 'submitted-pending';
};

export type SubmittedMapNode = SubmittedPendingMapNode | PublicMapNode;

interface QueuedEditLinkEmailContext {
  attemptId: string;
  email: string;
  node: EditablePublicMapNode;
}

interface EditLinkEmailContext extends QueuedEditLinkEmailContext {
  token: string;
}

type EditLinkRequestOptions = {
  env?: Record<string, string | undefined>;
  fetchImpl?: FetchLike;
  deferProviderSend?: boolean;
  createSqlForDeferredDelivery?: (options?: { max?: number }) => SqlLike | null;
};

type MapNodeSubmissionOptions = {
  env?: Record<string, string | undefined>;
  fetchImpl?: FetchLike;
  deferProviderSend?: boolean;
  createSqlForDeferredDelivery?: (options?: { max?: number }) => SqlLike | null;
};

type MapNodeUpdateRequestOptions = {
  env?: Record<string, string | undefined>;
};

export interface QueuedMapNodeEditLinkDeliveryResult {
  queued: number;
  delivered: number;
  failed: number;
  skipped: number;
}

export const MAP_NODE_EDIT_LINK_NEUTRAL_RESPONSE = Object.freeze({
  ok: true,
  message: 'If this email can update the node, we will send an edit link.',
});
export const MAP_NODE_INVALID_EDIT_LINK_ERROR = Object.freeze({
  error: {
    code: 'invalid_edit_link',
    message: 'This edit link is invalid or expired. Request a new edit link to update this node.',
  },
});
export const MAP_NODE_EDIT_TOKEN_TTL_MINUTES = 30;
export const MAP_NODE_EDIT_LINK_COOLDOWN_MINUTES = 15;
export const MAP_NODE_EDIT_LINK_DAILY_IP_LIMIT = 30;
export const MAP_NODE_EDIT_LINK_DAILY_EMAIL_LIMIT = 10;
export const MAP_NODE_EDIT_LINK_STALE_DELIVERY_CLAIM_MINUTES = 10;
export const MAP_NODE_SUBMISSION_DAILY_IP_LIMIT = 5;
export const RESEND_EMAILS_ENDPOINT = 'https://api.resend.com/emails';
export const MAP_NODE_THEME_MIN_COUNT = 1;
export const MAP_NODE_THEME_MAX_COUNT = 4;

const cleanString = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');
const cleanIpAddress = (value: unknown): string => {
  const candidate = cleanString(value);
  return isIP(candidate) ? candidate : '';
};

const normalizeNumber = (value: unknown): number | null => {
  if (typeof value !== 'number' && (typeof value !== 'string' || !value.trim())) return null;
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) ? number : null;
};

const normalizeThemes = normalizePublicMapThemeSlugs;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeOwnerEmail(value: unknown): string {
  return cleanString(value).toLowerCase();
}

export function isValidOwnerEmail(value: unknown): boolean {
  const email = normalizeOwnerEmail(value);
  return email.length > 3 && email.length <= 320 && EMAIL_PATTERN.test(email);
}

// Keep confirmation enforcement secure by default. A short, explicit false
// window lets the agent deploy before the static website during a coordinated
// rollout; the rollout guide requires switching it back on immediately after.
export function isMapLocationConfirmationRequired(
  env: Record<string, string | undefined> = process.env
): boolean {
  return cleanString(env.MAP_LOCATION_CONFIRMATION_REQUIRED).toLowerCase() !== 'false';
}

// Steward status is resolved privately from active Directus chapter access when
// a node is projected. Public submission input can never self-assign a role.
const normalizeSubmittedRole = (): 'member' => 'member';

type StewardMapNodeResolution = {
  role: 'member' | 'steward';
  chapterSlug: string;
};

const MEMBER_MAP_NODE_RESOLUTION: StewardMapNodeResolution = Object.freeze({
  role: 'member',
  chapterSlug: '',
});

function normalizeLookupNodeId(value: unknown): string {
  const cleaned = cleanString(value).replace(/^submission:/, '');
  return UUID_PATTERN.test(cleaned) ? cleaned : '';
}

function createRawEditToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashMapNodeEditToken(token: string): string {
  return createHash('sha256').update(cleanString(token), 'utf8').digest('hex');
}

function publicInputInvalidEditLink(): PublicInputError {
  return new PublicInputError(
    MAP_NODE_INVALID_EDIT_LINK_ERROR.error.code,
    MAP_NODE_INVALID_EDIT_LINK_ERROR.error.message
  );
}

function jsonObject(value: unknown): UnknownRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as UnknownRecord : {};
}

async function withSql<T>(createSql: (options?: { max?: number }) => SqlLike | null, callback: (sql: SqlLike) => Promise<T> | T): Promise<T> {
  const sql = createSql({ max: 1 });
  if (!sql) {
    throw new AgentDataError(
      'database_not_configured',
      'The agent database is not configured.'
    );
  }

  try {
    return await callback(sql);
  } finally {
    await sql.end({ timeout: 3 }).catch(() => {});
  }
}

const toSqlJson = (sql: SqlLike, value: unknown): unknown => (typeof sql.json === 'function' ? sql.json(value) : value);

function toPublicPendingMapNode(submission: UnknownRecord): SubmittedPendingMapNode {
  const node = createOptimisticPendingNode({
    id: submission.id,
    displayName: submission.displayName,
    placeName: submission.placeName,
    city: submission.city,
    region: submission.region,
    country: submission.country,
    lat: submission.lat,
    long: submission.long,
    role: submission.role,
    chapterSlug: submission.chapterSlug ?? submission.chapter_slug,
    themes: submission.themes,
    bioregion: submission.bioregion,
    publicNote: submission.publicNote,
  }, submission.createdAt ?? new Date());

  return {
    ...node,
    status: 'pending',
    source: 'submitted-pending',
  };
}

export async function getMapNodeIntakeMode(sql: SqlLike): Promise<PublicMapIntakeMode> {
  let rows: Array<{ liveOnboardingEnabled?: unknown }> = [];
  try {
    // Migration 025: expiry-aware read, so a forgotten Live Onboarding toggle
    // stops auto-approving as soon as live_onboarding_expires_at passes.
    rows = await sql`
      select intake.effective_live_onboarding_enabled() as "liveOnboardingEnabled"
    `;
  } catch {
    rows = [];
  }

  if (rows?.[0]?.liveOnboardingEnabled === undefined || rows?.[0]?.liveOnboardingEnabled === null) {
    // Fallback for databases that have not applied migration 025 yet.
    rows = await sql`
      select live_onboarding_enabled as "liveOnboardingEnabled"
      from intake.map_node_intake_settings
      where id = 1
      limit 1
    `;
  }

  const enabled = rows?.[0]?.liveOnboardingEnabled === true
    || rows?.[0]?.liveOnboardingEnabled === 'true';
  return enabled ? 'live' : 'moderated';
}

function normalizeSubmissionInput(
  input: PublicMapNodeSubmissionInput = {},
  { requireLocationConfirmation = true }: { requireLocationConfirmation?: boolean } = {}
) {
  if (cleanString(input.website)) {
    throw new PublicInputError('spam_detected', 'Unable to accept this map-node submission.', 400);
  }
  const displayName = cleanString(input.displayName ?? input.name);
  const locationConfirmationId = cleanString(input.locationConfirmationId ?? input.location_confirmation_id);
  const hasLegacyLocation = [
    'placeName', 'place', 'city', 'region', 'country', 'lat', 'latitude', 'long', 'lng', 'longitude',
  ].some((key) => Object.hasOwn(input, key));
  const email = normalizeOwnerEmail(input.email ?? input.privateEmail ?? input.private_email);

  if (!displayName) {
    throw new PublicInputError('missing_display_name', 'Display name is required.');
  }

  if (locationConfirmationId && hasLegacyLocation) {
    throw new PublicInputError('invalid_location_input', 'Submit either a confirmed place or legacy location fields, not both.');
  }

  const legacyPlaceName = cleanString(input.placeName ?? input.place);
  const legacyLat = normalizeNumber(input.lat ?? input.latitude);
  const legacyLong = normalizeNumber(input.long ?? input.lng ?? input.longitude);
  const legacyLocation = !locationConfirmationId && !requireLocationConfirmation
    ? {
      placeName: legacyPlaceName,
      city: cleanString(input.city),
      region: cleanString(input.region),
      country: cleanString(input.country),
      lat: legacyLat,
      long: legacyLong,
    }
    : null;

  if (requireLocationConfirmation && !locationConfirmationId) {
    throw new PublicInputError('location_confirmation_required', 'Find and confirm your place before submitting.');
  }

  if (!locationConfirmationId && (!legacyLocation?.placeName || legacyLocation.lat === null || legacyLocation.long === null
    || legacyLocation.lat < -90 || legacyLocation.lat > 90 || legacyLocation.long < -180 || legacyLocation.long > 180)) {
    throw new PublicInputError('invalid_coordinates', 'A valid place, latitude, and longitude are required during the rollout window.');
  }

  if (!isValidOwnerEmail(email)) {
    throw new PublicInputError('invalid_email', 'A valid email is required.');
  }

  const themes = normalizeThemes(input.themes);
  if (themes.length < MAP_NODE_THEME_MIN_COUNT || themes.length > MAP_NODE_THEME_MAX_COUNT) {
    throw new PublicInputError(
      'invalid_themes',
      `Pick ${MAP_NODE_THEME_MIN_COUNT} to ${MAP_NODE_THEME_MAX_COUNT} themes.`
    );
  }

  return {
    displayName,
    locationConfirmationId,
    legacyLocation,
    role: normalizeSubmittedRole(),
    chapterSlug: '',
    themes,
    publicNote: cleanString(input.publicNote ?? input.public_note),
    rawNote: cleanString(input.rawNote ?? input.raw_note),
    email,
    contactConsent: input.contactConsent ?? input.contact_consent ?? Boolean(email),
  };
}

export function getRequestMeta(context: {
  req: { header(name: string): string | undefined };
}): RequestMeta {
  const ipAddress = cleanIpAddress(context.req.header('fly-client-ip'));

  return {
    ipAddress,
    userAgent: cleanString(context.req.header('user-agent')),
    rateLimitKey: ipAddress || 'anonymous',
  };
}

async function assertMapNodeSubmissionRateLimit(tx: SqlLike, rateLimitKey: string): Promise<void> {
  const normalizedRateLimitKey = cleanString(rateLimitKey) || 'anonymous';
  await tx`select pg_advisory_xact_lock(hashtext(${normalizedRateLimitKey}))`;
  const [bucket] = await tx`
    select count(*)::int as count
    from intake.map_node_submissions
    where rate_limit_key = ${normalizedRateLimitKey}
      and created_at >= now() - interval '24 hours'
  `;
  if ((bucket?.count ?? 0) >= MAP_NODE_SUBMISSION_DAILY_IP_LIMIT) {
    throw new PublicInputError(
      'rate_limited',
      'Too many map-node submissions came from this network. Please try again tomorrow.',
      429
    );
  }
}

export async function createMapNodeSubmission(
  sql: SqlLike,
  input: PublicMapNodeSubmissionInput,
  requestMeta: RequestMeta = {},
  {
    env = process.env,
    fetchImpl = globalThis.fetch,
    deferProviderSend = false,
    createSqlForDeferredDelivery,
  }: MapNodeSubmissionOptions = {}
): Promise<SubmittedMapNode> {
  const normalized = normalizeSubmissionInput(input, {
    requireLocationConfirmation: isMapLocationConfirmationRequired(env),
  });
  const meta = {
    ipAddress: cleanString(requestMeta.ipAddress),
    userAgent: cleanString(requestMeta.userAgent),
    rateLimitKey: cleanString(requestMeta.rateLimitKey),
  };

  const result = await sql.begin(async (tx) => {
    const confirmedLocation = normalized.locationConfirmationId
      ? await consumeMapLocationConfirmation(tx, normalized.locationConfirmationId)
      : null;
    const location = confirmedLocation
      ? {
        placeName: confirmedLocation.label,
        city: '',
        region: '',
        country: '',
        lat: confirmedLocation.lat,
        long: confirmedLocation.long,
      }
      : normalized.legacyLocation;
    if (!location || location.lat === null || location.long === null) {
      throw new PublicInputError('location_confirmation_required', 'Find and confirm your place before submitting.');
    }
    const intakeMode = await getMapNodeIntakeMode(tx);
    const liveOnboarding = intakeMode === 'live';
    if (!liveOnboarding) {
      await assertMapNodeSubmissionRateLimit(tx, meta.rateLimitKey);
    }
    const submissionStatus = liveOnboarding ? 'approved' : 'pending';
    const approvedAt = liveOnboarding ? new Date() : null;
    const [submission] = await tx`
      insert into intake.map_node_submissions (
        status,
        display_name,
        place_name,
        city,
        region,
        country,
        latitude,
        longitude,
        role,
        chapter_slug,
        themes,
        bioregion,
        public_note,
        raw_note,
        rate_limit_key,
        ip_address,
        user_agent,
        approved_at
      )
      values (
        ${submissionStatus}::intake.map_node_status,
        ${normalized.displayName},
        ${location.placeName},
        ${location.city || null},
        ${location.region || null},
        ${location.country || null},
        ${location.lat},
        ${location.long},
        ${normalized.role || null},
        ${normalized.chapterSlug || null},
        ${normalized.themes},
        ${derivePublicBioregionFromCoordinates(location.lat, location.long) || null},
        ${normalized.publicNote || null},
        ${normalized.rawNote || null},
        ${meta.rateLimitKey || null},
        ${meta.ipAddress || null},
        ${meta.userAgent || null},
        ${approvedAt}
      )
      returning
        id::text,
        status::text,
        display_name as "displayName",
        place_name as "placeName",
        city,
        region,
        country,
        latitude::float8 as lat,
        longitude::float8 as long,
        role,
        chapter_slug as "chapterSlug",
        themes,
        bioregion,
        public_note as "publicNote",
        created_at as "createdAt",
        approved_at as "approvedAt"
    `;

    if (normalized.email) {
      await tx`
        insert into intake.map_node_private_contacts (
          submission_id,
          email,
          contact_consent
        )
        values (
          ${submission.id},
          ${normalized.email},
          ${Boolean(normalized.contactConsent)}
        )
      `;
    }

    let moderationNotificationQueued = false;
    if (liveOnboarding) {
      await tx`
        insert into intake.map_node_reviews (
          submission_id,
          reviewer_id,
          review_status,
          review_notes
        )
        values (
          ${submission.id},
          'system:live-onboarding',
          'approved'::intake.map_node_status,
          'Auto-approved while live onboarding mode was enabled.'
        )
      `;
    } else {
      moderationNotificationQueued = await queueMapNodeModerationNotification(tx, submission.id);
    }

    const steward = liveOnboarding
      ? await resolveActiveChapterSteward(tx, normalized.email)
      : MEMBER_MAP_NODE_RESOLUTION;
    const publicNode = liveOnboarding
      ? toPublicMapNode({
        ...submission,
        role: steward.role,
        chapterSlug: steward.chapterSlug,
      })
      : toPublicPendingMapNode(submission);
    if (!publicNode) {
      throw new AgentDataError(
        'map_node_projection_error',
        'Map-node response could not be projected publicly.',
        500
      );
    }
    if (containsPrivateMapNodeField(publicNode)) {
      throw new AgentDataError(
        'private_field_projection_error',
        'Map-node response contains private fields.',
        500
      );
    }

    return { node: publicNode, moderationNotificationQueued };
  });

  if (result.moderationNotificationQueued && !deferProviderSend) {
    scheduleMapNodeModerationNotificationDelivery({
      sql,
      env,
      fetchImpl,
      createSqlForDeferredDelivery,
    });
  }

  return result.node;
}

function normalizeUpdateText(input: UnknownRecord, keys: string[]): string | undefined {
  for (const key of keys) {
    if (Object.hasOwn(input, key)) return cleanString(input[key]);
  }
  return undefined;
}

function normalizeUpdateNumber(
  input: UnknownRecord,
  keys: string[],
  { min, max, label }: { min: number; max: number; label: string }
): number | undefined {
  for (const key of keys) {
    if (!Object.hasOwn(input, key)) continue;
    const value = normalizeNumber(input[key]);
    if (value === null || value < min || value > max) {
      throw new PublicInputError('invalid_update_field', `${label} is invalid.`);
    }
    return value;
  }
  return undefined;
}

function normalizeUpdateThemes(input: UnknownRecord): string[] | undefined {
  if (!Object.hasOwn(input, 'themes')) return undefined;
  if (!Array.isArray(input.themes)) {
    throw new PublicInputError('invalid_update_field', 'Themes must be an array.');
  }
  const themes = normalizeThemes(input.themes);
  if (themes.length < MAP_NODE_THEME_MIN_COUNT || themes.length > MAP_NODE_THEME_MAX_COUNT) {
    throw new PublicInputError(
      'invalid_update_field',
      `Pick ${MAP_NODE_THEME_MIN_COUNT} to ${MAP_NODE_THEME_MAX_COUNT} themes.`
    );
  }
  return themes;
}

function normalizeUpdateRequestInput(
  input: PublicMapNodeUpdateRequestInput = {},
  { requireLocationConfirmation = true }: { requireLocationConfirmation?: boolean } = {}
) {
  const source = jsonObject(input);
  const proposed: UnknownRecord = {};
  const locationConfirmationId = cleanString(source.locationConfirmationId ?? source.location_confirmation_id);

  for (const key of ['role', 'type', 'nodeType', 'node_type', 'intent']) {
    if (Object.hasOwn(source, key)) {
      throw new PublicInputError(
        'unsupported_update_field',
        'Role and type changes require steward review.'
      );
    }
  }

  const displayName = normalizeUpdateText(source, ['display_name', 'displayName', 'name']);
  if (displayName !== undefined) {
    if (!displayName) throw new PublicInputError('invalid_update_field', 'Display name cannot be empty.');
    proposed.display_name = displayName;
  }

  const hasRawLocationField = [
    'place_name', 'placeName', 'place', 'city', 'region', 'country', 'latitude', 'lat', 'longitude', 'long', 'lng',
  ].some((key) => Object.hasOwn(source, key));
  if (locationConfirmationId && hasRawLocationField) {
    throw new PublicInputError(
      'invalid_location_input',
      'Submit either a confirmed place or legacy location fields, not both.',
    );
  }
  if (hasRawLocationField && requireLocationConfirmation) {
    throw new PublicInputError(
      'location_confirmation_required',
      'Find and confirm the updated place before submitting.',
    );
  }
  if (hasRawLocationField && !requireLocationConfirmation) {
    const placeName = normalizeUpdateText(source, ['place_name', 'placeName', 'place']);
    if (placeName !== undefined) {
      if (!placeName) throw new PublicInputError('invalid_update_field', 'Place name cannot be empty.');
      proposed.place_name = placeName;
    }
    for (const field of ['city', 'region', 'country']) {
      const value = normalizeUpdateText(source, [field]);
      if (value !== undefined) proposed[field] = value;
    }
    const latitude = normalizeUpdateNumber(source, ['latitude', 'lat'], {
      min: -90,
      max: 90,
      label: 'Latitude',
    });
    if (latitude !== undefined) proposed.latitude = latitude;
    const longitude = normalizeUpdateNumber(source, ['longitude', 'long', 'lng'], {
      min: -180,
      max: 180,
      label: 'Longitude',
    });
    if (longitude !== undefined) proposed.longitude = longitude;
  }

  const themes = normalizeUpdateThemes(source);
  if (themes !== undefined) proposed.themes = themes;

  const publicNote = normalizeUpdateText(source, ['public_note', 'publicNote']);
  if (publicNote !== undefined) {
    if (publicNote.length > 500) {
      throw new PublicInputError('invalid_update_field', 'Public note must be 500 characters or fewer.');
    }
    proposed.public_note = publicNote;
  }

  if (Object.keys(proposed).length === 0 && !locationConfirmationId) {
    throw new PublicInputError('missing_update_fields', 'At least one editable field is required.');
  }

  return {
    proposedPublicFields: proposed,
    locationConfirmationId,
    proposedDisplayName: Object.hasOwn(proposed, 'display_name') ? proposed.display_name : null,
    proposedPlaceName: Object.hasOwn(proposed, 'place_name') ? proposed.place_name : null,
    proposedCity: Object.hasOwn(proposed, 'city') ? proposed.city || null : null,
    proposedRegion: Object.hasOwn(proposed, 'region') ? proposed.region || null : null,
    proposedCountry: Object.hasOwn(proposed, 'country') ? proposed.country || null : null,
    proposedLatitude: Object.hasOwn(proposed, 'latitude') ? proposed.latitude : null,
    proposedLongitude: Object.hasOwn(proposed, 'longitude') ? proposed.longitude : null,
    proposedThemes: Object.hasOwn(proposed, 'themes') ? proposed.themes : null,
    proposedPublicNote: Object.hasOwn(proposed, 'public_note') ? proposed.public_note || null : null,
  };
}

function buildCurrentPublicFields(row: UnknownRecord) {
  return {
    display_name: cleanString(row.displayName),
    place_name: cleanString(row.placeName),
    city: cleanString(row.city),
    region: cleanString(row.region),
    country: cleanString(row.country),
    latitude: normalizeNumber(row.lat),
    longitude: normalizeNumber(row.long),
    themes: normalizeThemes(row.themes),
    public_note: cleanString(row.publicNote),
  };
}

function editLinkConfig(env: Record<string, string | undefined> = process.env) {
  return {
    apiKey: cleanString(env.RESEND_API_KEY),
    from: cleanString(env.MAP_NODE_EMAIL_FROM),
    replyTo: cleanString(env.MAP_NODE_EMAIL_REPLY_TO),
    baseUrl: cleanString(env.MAP_NODE_EDIT_BASE_URL),
  };
}

function canSendEditLinkEmail(env: Record<string, string | undefined> = process.env): boolean {
  const config = editLinkConfig(env);
  return Boolean(config.apiKey && config.from && buildEditUrl(config.baseUrl, 'preview-token'));
}

function buildEditUrl(baseUrl: string, token: string): string {
  try {
    const url = new URL(baseUrl);
    url.searchParams.set('token', token);
    return url.href;
  } catch {
    return '';
  }
}

async function sendEditLinkEmail({
  email,
  node,
  token,
  env = process.env,
  fetchImpl = globalThis.fetch,
}: {
  email: string;
  node: EditablePublicMapNode;
  token: string;
  env?: Record<string, string | undefined>;
  fetchImpl?: FetchLike;
}): Promise<{ status: string; error: string; providerMessageId: string }> {
  const config = editLinkConfig(env);
  const editUrl = buildEditUrl(config.baseUrl, token);
  if (!config.apiKey || !config.from || !editUrl || typeof fetchImpl !== 'function') {
    return { status: 'provider_not_configured', error: '', providerMessageId: '' };
  }

  const subject = 'Update your Greenpill Network map node';
  const text = [
    `Use this private link to update ${node.display_name} on the Greenpill Network map:`,
    editUrl,
    '',
    'This link expires in 30 minutes and can be used once.',
    'If you did not request this, you can ignore this email.',
  ].join('\n');

  try {
    const response = await fetchImpl(RESEND_EMAILS_ENDPOINT, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${config.apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        from: config.from,
        to: email,
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
      providerMessageId = '';
    }
    return { status: 'sent', error: '', providerMessageId };
  } catch {
    return { status: 'send_failed', error: 'resend_fetch_failed', providerMessageId: '' };
  }
}

async function recordEditLinkEmailDelivery(
  sql: SqlLike,
  queuedContext: QueuedEditLinkEmailContext,
  {
    env,
    fetchImpl,
  }: {
    env: Record<string, string | undefined>;
    fetchImpl: FetchLike;
  }
): Promise<'sent' | 'failed' | 'skipped'> {
  const rawToken = createRawEditToken();
  const tokenHash = hashMapNodeEditToken(rawToken);
  const [claimed] = await sql`
    update intake.map_node_edit_tokens
    set
      token_hash = ${tokenHash},
      expires_at = now() + interval '30 minutes',
      provider_status = 'delivery_claimed',
      provider_error = null,
      provider_message_id = null,
      delivery_claimed_at = now()
    where id = ${queuedContext.attemptId}::uuid
      and (
        provider_status = 'queued'
        or (
          provider_status = 'delivery_claimed'
          and delivery_claimed_at < now() - ${MAP_NODE_EDIT_LINK_STALE_DELIVERY_CLAIM_MINUTES} * interval '1 minute'
        )
      )
      and normalized_email = ${queuedContext.email}
      and consumed_at is null
      and expires_at > now()
    returning id::text
  `;
  if (!claimed?.id) return 'skipped';

  const contextToSend: EditLinkEmailContext = {
    ...queuedContext,
    token: rawToken,
  };
  const result = await sendEditLinkEmail({
    email: contextToSend.email,
    node: contextToSend.node,
    token: contextToSend.token,
    env,
    fetchImpl,
  });
  await sql`
    update intake.map_node_edit_tokens
    set
      provider_status = ${result.status},
      provider_error = ${result.error || null},
      provider_message_id = ${result.providerMessageId || null},
      delivery_claimed_at = null
    where id = ${contextToSend.attemptId}::uuid
  `;
  return result.status === 'sent' ? 'sent' : 'failed';
}

async function recordEditLinkEmailDeliveries(
  sql: SqlLike,
  sendContexts: QueuedEditLinkEmailContext[],
  {
    env,
    fetchImpl,
  }: {
    env: Record<string, string | undefined>;
    fetchImpl: FetchLike;
  }
): Promise<QueuedMapNodeEditLinkDeliveryResult> {
  const result = {
    queued: sendContexts.length,
    delivered: 0,
    failed: 0,
    skipped: 0,
  };
  for (const contextToSend of sendContexts) {
    const status = await recordEditLinkEmailDelivery(sql, contextToSend, { env, fetchImpl });
    if (status === 'sent') result.delivered += 1;
    else if (status === 'failed') result.failed += 1;
    else result.skipped += 1;
  }
  return result;
}

function reportDeferredEditLinkDeliveryError(error: unknown): void {
  console.warn('map_node_edit_link_delivery_failed', {
    errorName: error instanceof Error ? error.name : 'UnknownError',
  });
}

function scheduleEditLinkEmailDeliveries(
  sql: SqlLike,
  sendContexts: QueuedEditLinkEmailContext[],
  {
    env,
    fetchImpl,
    createSqlForDeferredDelivery,
  }: {
    env: Record<string, string | undefined>;
    fetchImpl: FetchLike;
    createSqlForDeferredDelivery?: (options?: { max?: number }) => SqlLike | null;
  }
) {
  if (sendContexts.length === 0) return;

  const run = async () => {
    let deliverySql = sql;
    let shouldEndDeliverySql = false;
    if (createSqlForDeferredDelivery) {
      const freshSql = createSqlForDeferredDelivery({ max: 1 });
      if (!freshSql) return;
      deliverySql = freshSql;
      shouldEndDeliverySql = freshSql !== sql;
    }

    try {
      await recordEditLinkEmailDeliveries(deliverySql, sendContexts, { env, fetchImpl });
    } catch (error) {
      reportDeferredEditLinkDeliveryError(error);
    } finally {
      if (shouldEndDeliverySql) {
        await deliverySql.end({ timeout: 3 }).catch(() => {});
      }
    }
  };

  setTimeout(() => {
    void run();
  }, 0);
}

function providerStatusForAttempt({
  limited,
  matched,
  providerConfigured,
}: {
  limited: string;
  matched: boolean;
  providerConfigured: boolean;
}): string {
  if (limited) return limited;
  if (!matched) return 'no_match';
  if (!providerConfigured) return 'provider_not_configured';
  return 'queued';
}

async function getEditLinkLimitStatus(
  tx: SqlLike,
  { canonicalNodeId, normalizedEmail, rateLimitKey }: {
    canonicalNodeId: string;
    normalizedEmail: string;
    rateLimitKey: string;
  }
): Promise<string> {
  const cooldownRows = await tx`
    select id
    from intake.map_node_edit_tokens
    where requested_node_id = ${canonicalNodeId}
      and normalized_email = ${normalizedEmail}
      and rate_limit_key = ${rateLimitKey}
      and created_at >= now() - interval '15 minutes'
    limit 1
  `;
  if (cooldownRows.length > 0) return 'cooldown';

  const [ipBucket] = await tx`
    select count(*)::int as count
    from intake.map_node_edit_tokens
    where rate_limit_key = ${rateLimitKey}
      and created_at >= now() - interval '24 hours'
  `;
  if ((ipBucket?.count ?? 0) >= MAP_NODE_EDIT_LINK_DAILY_IP_LIMIT) return 'rate_limited';

  const [emailBucket] = await tx`
    select count(*)::int as count
    from intake.map_node_edit_tokens
    where normalized_email = ${normalizedEmail}
      and created_at >= now() - interval '24 hours'
  `;
  if ((emailBucket?.count ?? 0) >= MAP_NODE_EDIT_LINK_DAILY_EMAIL_LIMIT) return 'rate_limited';

  return '';
}

async function findEditableSubmissionByOwner(
  tx: SqlLike,
  { lookupNodeId, normalizedEmail }: { lookupNodeId: string; normalizedEmail: string }
): Promise<UnknownRecord | null> {
  if (!lookupNodeId) return null;
  const [row] = await tx`
    select
      s.id::text,
      s.display_name as "displayName",
      s.place_name as "placeName",
      s.city,
      s.region,
      s.country,
      s.latitude::float8 as lat,
      s.longitude::float8 as long,
      s.themes,
      s.public_note as "publicNote",
      s.updated_at as "updatedAt"
    from intake.map_node_submissions s
    join intake.map_node_private_contacts c on c.submission_id = s.id
    where s.id = ${lookupNodeId}::uuid
      and s.status = 'approved'
      and lower(c.email::text) = ${normalizedEmail}
    limit 1
  `;
  return row ?? null;
}

export async function createMapNodeEditLinkRequest(
  sql: SqlLike,
  nodeId: string,
  email: string,
  requestMeta: RequestMeta = {},
  {
    env = process.env,
    fetchImpl = globalThis.fetch,
    deferProviderSend = true,
    createSqlForDeferredDelivery,
  }: EditLinkRequestOptions = {}
): Promise<typeof MAP_NODE_EDIT_LINK_NEUTRAL_RESPONSE> {
  const normalizedEmail = normalizeOwnerEmail(email);
  if (!isValidOwnerEmail(normalizedEmail)) {
    throw new PublicInputError('invalid_email', 'A valid email is required.');
  }

  const requestedNodeId = cleanString(nodeId);
  if (!requestedNodeId) {
    throw new PublicInputError('missing_node_id', 'Map-node id is required.');
  }

  const meta = {
    ipAddress: cleanString(requestMeta.ipAddress),
    userAgent: cleanString(requestMeta.userAgent),
    rateLimitKey: cleanString(requestMeta.rateLimitKey) || 'anonymous',
  };
  const providerConfigured = canSendEditLinkEmail(env);
  let sendContext: QueuedEditLinkEmailContext | null = null;

  await sql.begin(async (tx) => {
    const lookupNodeId = normalizeLookupNodeId(requestedNodeId);
    const canonicalRequestedNodeId = lookupNodeId || requestedNodeId;
    const limited = await getEditLinkLimitStatus(tx, {
      canonicalNodeId: canonicalRequestedNodeId,
      normalizedEmail,
      rateLimitKey: meta.rateLimitKey,
    });
    const submission = limited ? null : await findEditableSubmissionByOwner(tx, {
      lookupNodeId,
      normalizedEmail,
    });
    const queuedForDelivery = Boolean(!limited && submission && providerConfigured);
    const providerStatus = providerStatusForAttempt({
      limited,
      matched: Boolean(submission),
      providerConfigured,
    });
    const [attempt] = await tx`
      insert into intake.map_node_edit_tokens (
        requested_node_id,
        submission_id,
        normalized_email,
        token_hash,
        expires_at,
        provider_status,
        request_ip,
        request_user_agent,
        rate_limit_key,
        request_metadata
      )
        values (
          ${canonicalRequestedNodeId},
          ${submission?.id ?? null},
          ${normalizedEmail},
          ${null},
          now() + interval '30 minutes',
          ${providerStatus},
        ${meta.ipAddress || null},
        ${meta.userAgent || null},
        ${meta.rateLimitKey || null},
        ${toSqlJson(tx, { source: 'public-edit-link-request' })}
      )
      returning id::text
    `;

    if (queuedForDelivery && attempt?.id && submission) {
      const publicNode = toEditablePublicMapNode({
        id: submission.id,
        displayName: submission.displayName,
        placeName: submission.placeName,
        city: submission.city,
        region: submission.region,
        country: submission.country,
        lat: submission.lat,
        long: submission.long,
        themes: submission.themes,
        publicNote: submission.publicNote,
      });
      if (publicNode && !containsPrivateMapNodeField(publicNode)) {
        sendContext = {
          attemptId: attempt.id,
          email: normalizedEmail,
          node: publicNode,
        };
      }
    }
  });

  const sendContexts = sendContext ? [sendContext] : [];
  if (deferProviderSend) {
    scheduleEditLinkEmailDeliveries(sql, sendContexts, {
      env,
      fetchImpl,
      createSqlForDeferredDelivery,
    });
  } else {
    await recordEditLinkEmailDeliveries(sql, sendContexts, { env, fetchImpl });
  }

  return MAP_NODE_EDIT_LINK_NEUTRAL_RESPONSE;
}

// Standalone recovery intentionally sends at most one link. That keeps the
// public request write envelope fixed whether an email matches zero, one, or
// several approved nodes.
export const MAP_NODE_EDIT_LINK_REQUEST_MAX_MATCHES = 1;

// Email-keyed rate limit for the standalone (no node id) recovery path. The
// cooldown keys on email + IP (the per-node path keys the cooldown on node id);
// the daily IP and email buckets are shared with the per-node path, so this is
// at least as strict.
async function getEditLinkRequestLimitStatus(
  tx: SqlLike,
  { normalizedEmail, rateLimitKey }: { normalizedEmail: string; rateLimitKey: string }
): Promise<string> {
  const cooldownRows = await tx`
    select id
    from intake.map_node_edit_tokens
    where normalized_email = ${normalizedEmail}
      and rate_limit_key = ${rateLimitKey}
      and created_at >= now() - interval '15 minutes'
    limit 1
  `;
  if (cooldownRows.length > 0) return 'cooldown';

  const [ipBucket] = await tx`
    select count(*)::int as count
    from intake.map_node_edit_tokens
    where rate_limit_key = ${rateLimitKey}
      and created_at >= now() - interval '24 hours'
  `;
  if ((ipBucket?.count ?? 0) >= MAP_NODE_EDIT_LINK_DAILY_IP_LIMIT) return 'rate_limited';

  const [emailBucket] = await tx`
    select count(*)::int as count
    from intake.map_node_edit_tokens
    where normalized_email = ${normalizedEmail}
      and created_at >= now() - interval '24 hours'
  `;
  if ((emailBucket?.count ?? 0) >= MAP_NODE_EDIT_LINK_DAILY_EMAIL_LIMIT) return 'rate_limited';

  return '';
}

// Approved/public submissions only, looked up by owner email alone. Never
// touches pending or private rows.
async function findEditableSubmissionsByEmail(
  tx: SqlLike,
  { normalizedEmail, limit }: { normalizedEmail: string; limit: number }
): Promise<UnknownRecord[]> {
  const rows = await tx`
    select
      s.id::text,
      s.display_name as "displayName",
      s.place_name as "placeName",
      s.city,
      s.region,
      s.country,
      s.latitude::float8 as lat,
      s.longitude::float8 as long,
      s.themes,
      s.public_note as "publicNote",
      s.updated_at as "updatedAt"
    from intake.map_node_submissions s
    join intake.map_node_private_contacts c on c.submission_id = s.id
    where s.status = 'approved'
      and lower(c.email::text) = ${normalizedEmail}
    order by s.updated_at desc
    limit ${limit}
  `;
  return Array.isArray(rows) ? rows : [];
}

// Standalone email-keyed recovery. Looks up the most recently updated approved
// public node by owner email and queues one manage link. The response is ALWAYS
// the same neutral message — it never reveals whether the email matched, how
// many nodes exist, or any node detail. A no-match request still records one
// attempt row so the write path does not fork. Tokens stay hash-only; delivery
// generates the same 30-minute edit tokens as the per-node path.
export async function createMapNodeEditLinkRequestByEmail(
  sql: SqlLike,
  email: string,
  requestMeta: RequestMeta = {},
  {
    env = process.env,
    fetchImpl = globalThis.fetch,
    deferProviderSend = true,
    createSqlForDeferredDelivery,
  }: EditLinkRequestOptions = {}
): Promise<typeof MAP_NODE_EDIT_LINK_NEUTRAL_RESPONSE> {
  const normalizedEmail = normalizeOwnerEmail(email);
  if (!isValidOwnerEmail(normalizedEmail)) {
    throw new PublicInputError('invalid_email', 'A valid email is required.');
  }

  const meta = {
    ipAddress: cleanString(requestMeta.ipAddress),
    userAgent: cleanString(requestMeta.userAgent),
    rateLimitKey: cleanString(requestMeta.rateLimitKey) || 'anonymous',
  };
  const providerConfigured = canSendEditLinkEmail(env);
  let sendContext: QueuedEditLinkEmailContext | null = null;

  await sql.begin(async (tx) => {
    const limited = await getEditLinkRequestLimitStatus(tx, {
      normalizedEmail,
      rateLimitKey: meta.rateLimitKey,
    });
    const submissions = limited
      ? []
      : await findEditableSubmissionsByEmail(tx, {
        normalizedEmail,
        limit: MAP_NODE_EDIT_LINK_REQUEST_MAX_MATCHES,
      });
    // Record an attempt even when nothing matched, so a no-match request writes
    // the same kind of row a match does and does not become observable by its
    // absence.
    const submission = submissions[0] ?? null;
    const queuedForDelivery = Boolean(!limited && submission && providerConfigured);
    const providerStatus = providerStatusForAttempt({
      limited,
      matched: Boolean(submission),
      providerConfigured,
    });
    const [attempt] = await tx`
      insert into intake.map_node_edit_tokens (
        requested_node_id,
        submission_id,
        normalized_email,
        token_hash,
        expires_at,
        provider_status,
        request_ip,
        request_user_agent,
        rate_limit_key,
        request_metadata
      )
      values (
        ${submission?.id ?? ''},
        ${submission?.id ?? null},
        ${normalizedEmail},
        ${null},
        now() + interval '30 minutes',
        ${providerStatus},
        ${meta.ipAddress || null},
        ${meta.userAgent || null},
        ${meta.rateLimitKey || null},
        ${toSqlJson(tx, { source: 'public-edit-link-email-request' })}
      )
      returning id::text
    `;

    if (queuedForDelivery && attempt?.id && submission) {
      const publicNode = toEditablePublicMapNode({
        id: submission.id,
        displayName: submission.displayName,
        placeName: submission.placeName,
        city: submission.city,
        region: submission.region,
        country: submission.country,
        lat: submission.lat,
        long: submission.long,
        themes: submission.themes,
        publicNote: submission.publicNote,
      });
      if (publicNode && !containsPrivateMapNodeField(publicNode)) {
        sendContext = {
          attemptId: attempt.id,
          email: normalizedEmail,
          node: publicNode,
        };
      }
    }
  });

  const sendContexts = sendContext ? [sendContext] : [];
  if (deferProviderSend) {
    scheduleEditLinkEmailDeliveries(sql, sendContexts, {
      env,
      fetchImpl,
      createSqlForDeferredDelivery,
    });
  } else {
    await recordEditLinkEmailDeliveries(sql, sendContexts, { env, fetchImpl });
  }

  return MAP_NODE_EDIT_LINK_NEUTRAL_RESPONSE;
}

function queuedEditLinkEmailContextFromRow(row: UnknownRecord): QueuedEditLinkEmailContext | null {
  const attemptId = cleanString(row.attemptId);
  const email = normalizeOwnerEmail(row.email ?? row.normalizedEmail ?? row.normalized_email);
  if (!attemptId || !isValidOwnerEmail(email)) return null;

  const publicNode = toEditablePublicMapNode({
    id: row.submissionId ?? row.id,
    displayName: row.displayName,
    placeName: row.placeName,
    city: row.city,
    region: row.region,
    country: row.country,
    lat: row.lat,
    long: row.long,
    themes: row.themes,
    publicNote: row.publicNote,
  });
  if (!publicNode || containsPrivateMapNodeField(publicNode)) return null;

  return { attemptId, email, node: publicNode };
}

export async function deliverQueuedMapNodeEditLinks(
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
): Promise<QueuedMapNodeEditLinkDeliveryResult> {
  if (!canSendEditLinkEmail(env)) {
    return { queued: 0, delivered: 0, failed: 0, skipped: 0 };
  }

  const numericLimit = Number(limit);
  const cappedLimit = Math.min(
    100,
    Math.max(1, Number.isFinite(numericLimit) ? Math.trunc(numericLimit) : 20)
  );
  const rows = await sql`
    select
      t.id::text as "attemptId",
      t.normalized_email::text as email,
      s.id::text as "submissionId",
      s.display_name as "displayName",
      s.place_name as "placeName",
      s.city,
      s.region,
      s.country,
      s.latitude::float8 as lat,
      s.longitude::float8 as long,
      s.themes,
      s.public_note as "publicNote"
    from intake.map_node_edit_tokens t
    join intake.map_node_submissions s on s.id = t.submission_id
    where (
        t.provider_status = 'queued'
        or (
          t.provider_status = 'delivery_claimed'
          and t.delivery_claimed_at < now() - ${MAP_NODE_EDIT_LINK_STALE_DELIVERY_CLAIM_MINUTES} * interval '1 minute'
        )
      )
      and t.normalized_email is not null
      and t.consumed_at is null
      and t.expires_at > now()
      and s.status = 'approved'
    order by t.created_at asc
    limit ${cappedLimit}
  `;
  const sendContexts = rows
    .map((row) => queuedEditLinkEmailContextFromRow(row))
    .filter((context): context is QueuedEditLinkEmailContext => Boolean(context));
  return recordEditLinkEmailDeliveries(sql, sendContexts, { env, fetchImpl });
}

export async function getMapNodeEditSession(sql: SqlLike, token: string): Promise<EditablePublicMapNode> {
  const tokenValue = cleanString(token);
  if (!tokenValue) throw publicInputInvalidEditLink();

  const tokenHash = hashMapNodeEditToken(tokenValue);
  const [row] = await sql`
    select
      s.id::text,
      s.display_name as "displayName",
      s.place_name as "placeName",
      s.city,
      s.region,
      s.country,
      s.latitude::float8 as lat,
      s.longitude::float8 as long,
      s.themes,
      s.public_note as "publicNote"
    from intake.map_node_edit_tokens t
    join intake.map_node_submissions s on s.id = t.submission_id
    where t.token_hash = ${tokenHash}
      and t.consumed_at is null
      and t.expires_at > now()
      and s.status = 'approved'
    limit 1
  `;

  const node = toEditablePublicMapNode(row);
  if (!node || containsPrivateMapNodeField(node)) {
    throw publicInputInvalidEditLink();
  }
  return node;
}

export async function createMapNodeUpdateRequest(
  sql: SqlLike,
  nodeId: string,
  input: PublicMapNodeUpdateRequestInput = {},
  requestMeta: RequestMeta = {},
  { env = process.env }: MapNodeUpdateRequestOptions = {}
): Promise<PublicMapNodeUpdateRequestResponse> {
  const tokenValue = cleanString(input.token);
  if (!tokenValue) throw publicInputInvalidEditLink();

  const requestedNodeId = normalizeLookupNodeId(nodeId);
  if (!requestedNodeId) throw publicInputInvalidEditLink();

  const tokenHash = hashMapNodeEditToken(tokenValue);
  const meta = {
    ipAddress: cleanString(requestMeta.ipAddress),
    userAgent: cleanString(requestMeta.userAgent),
    rateLimitKey: cleanString(requestMeta.rateLimitKey) || 'anonymous',
  };

  return sql.begin(async (tx) => {
    const [tokenRow] = await tx`
      select
        t.id::text as "tokenId",
        t.normalized_email::text as "normalizedEmail",
        s.id::text as "submissionId",
        s.display_name as "displayName",
        s.place_name as "placeName",
        s.city,
        s.region,
        s.country,
        s.latitude::float8 as lat,
        s.longitude::float8 as long,
        s.themes,
        s.public_note as "publicNote",
        s.updated_at as "currentSubmissionUpdatedAt"
      from intake.map_node_edit_tokens t
      join intake.map_node_submissions s on s.id = t.submission_id
      where t.token_hash = ${tokenHash}
        and t.consumed_at is null
        and t.expires_at > now()
        and s.status = 'approved'
      limit 1
      for update of t
    `;

    if (!tokenRow || tokenRow.submissionId !== requestedNodeId) {
      throw publicInputInvalidEditLink();
    }

    const proposal = normalizeUpdateRequestInput(input, {
      requireLocationConfirmation: isMapLocationConfirmationRequired(env),
    });
    if (proposal.locationConfirmationId) {
      const confirmedLocation = await consumeMapLocationConfirmation(tx, proposal.locationConfirmationId);
      proposal.proposedPublicFields.place_name = confirmedLocation.label;
      proposal.proposedPublicFields.latitude = confirmedLocation.lat;
      proposal.proposedPublicFields.longitude = confirmedLocation.long;
      proposal.proposedPlaceName = confirmedLocation.label;
      proposal.proposedLatitude = confirmedLocation.lat;
      proposal.proposedLongitude = confirmedLocation.long;
    }
    const existingPending = await tx`
      select id
      from intake.map_node_update_requests
      where submission_id = ${tokenRow.submissionId}::uuid
        and status = 'pending'
      limit 1
    `;
    if (existingPending.length > 0) {
      throw new PublicInputError(
        'pending_update_exists',
        'A pending update request already exists for this node.',
        409
      );
    }

    const [updateRequest] = await tx`
      insert into intake.map_node_update_requests (
        submission_id,
        edit_token_id,
        status,
        proposed_display_name,
        proposed_place_name,
        proposed_city,
        proposed_region,
        proposed_country,
        proposed_latitude,
        proposed_longitude,
        proposed_themes,
        proposed_public_note,
        current_submission_updated_at,
        current_public_fields,
        proposed_public_fields,
        request_email,
        requester_ip,
        requester_user_agent,
        rate_limit_key,
        request_metadata
      )
      values (
        ${tokenRow.submissionId}::uuid,
        ${tokenRow.tokenId}::uuid,
        'pending'::intake.map_node_update_request_status,
        ${proposal.proposedDisplayName},
        ${proposal.proposedPlaceName},
        ${proposal.proposedCity},
        ${proposal.proposedRegion},
        ${proposal.proposedCountry},
        ${proposal.proposedLatitude},
        ${proposal.proposedLongitude},
        ${proposal.proposedThemes},
        ${proposal.proposedPublicNote},
        ${tokenRow.currentSubmissionUpdatedAt},
        ${toSqlJson(tx, buildCurrentPublicFields(tokenRow))},
        ${toSqlJson(tx, proposal.proposedPublicFields)},
        ${tokenRow.normalizedEmail || null},
        ${meta.ipAddress || null},
        ${meta.userAgent || null},
        ${meta.rateLimitKey || null},
        ${toSqlJson(tx, { source: 'public-update-request' })}
      )
      returning id::text, status::text
    `;

    const consumed = await tx`
      update intake.map_node_edit_tokens
      set consumed_at = now()
      where id = ${tokenRow.tokenId}::uuid
        and consumed_at is null
      returning id::text
    `;
    if (consumed.length !== 1) {
      throw publicInputInvalidEditLink();
    }

    return {
      id: updateRequest.id,
      status: updateRequest.status,
    };
  });
}

export async function cleanupMapNodeEditFlow(sql: SqlLike): Promise<{
  expiredTokensDeleted: number;
  tokenMetadataScrubbed: number;
  requestMetadataScrubbed: number;
}> {
  const [result] = await sql`
    select *
    from intake.cleanup_map_node_edit_flow()
  `;
  return {
    expiredTokensDeleted: result?.expiredTokensDeleted ?? result?.expired_tokens_deleted ?? 0,
    tokenMetadataScrubbed: result?.tokenMetadataScrubbed ?? result?.token_metadata_scrubbed ?? 0,
    requestMetadataScrubbed: result?.requestMetadataScrubbed ?? result?.request_metadata_scrubbed ?? 0,
  };
}

function isDirectusStewardSourceUnavailable(error: unknown): boolean {
  const code = cleanString((error as { code?: unknown } | null)?.code);
  if (code === '42P01') return true;
  const message = error instanceof Error ? error.message : '';
  return /relation .+ does not exist/i.test(message) && (
    message.includes('directus_users') || message.includes('chapter_editor_assignments')
  );
}

export async function resolveActiveChapterSteward(
  sql: SqlLike,
  ownerEmail: unknown
): Promise<StewardMapNodeResolution> {
  const email = normalizeOwnerEmail(ownerEmail);
  if (!isValidOwnerEmail(email)) return MEMBER_MAP_NODE_RESOLUTION;

  try {
    const [assignment] = await sql`
      select cea.chapter_slug as "chapterSlug"
      from public.directus_users u
      join content.chapter_editor_assignments cea on cea.directus_user_id = u.id
      where lower(u.email::text) = ${email}
        and u.status = 'active'
      limit 1
    `;
    const chapterSlug = cleanString(assignment?.chapterSlug ?? assignment?.chapter_slug);
    return chapterSlug
      ? { role: 'steward', chapterSlug }
      : MEMBER_MAP_NODE_RESOLUTION;
  } catch (error) {
    // Directus can be initialized after the local agent schema. The public map
    // must remain available and should never infer stewardship without that data.
    if (isDirectusStewardSourceUnavailable(error)) return MEMBER_MAP_NODE_RESOLUTION;
    throw error;
  }
}

async function listPublicMapNodeRowsWithoutDirectus(sql: SqlLike): Promise<UnknownRecord[]> {
  return sql`
    select
      id::text,
      name,
      place,
      city,
      region,
      country,
      lat::float8,
      long::float8,
      'member'::text as role,
      ''::text as "chapterSlug",
      themes,
      bioregion,
      public_note as "publicNote",
      status::text,
      approved_at as "approvedAt"
    from intake.public_map_nodes
    order by approved_at desc nulls last
  `;
}

export async function listPublicMapNodes(sql: SqlLike): Promise<PublicMapNode[]> {
  let rows: UnknownRecord[];
  try {
    rows = await sql`
      select
        n.id::text,
        n.name,
        n.place,
        n.city,
        n.region,
        n.country,
        n.lat::float8,
        n.long::float8,
        case when cea.directus_user_id is null then 'member' else 'steward' end as role,
        coalesce(cea.chapter_slug, '') as "chapterSlug",
        n.themes,
        n.bioregion,
        n.public_note as "publicNote",
        n.status::text,
        n.approved_at as "approvedAt"
      from intake.public_map_nodes n
      left join intake.map_node_private_contacts c on c.submission_id = n.id
      left join public.directus_users u on lower(u.email::text) = lower(c.email::text)
        and u.status = 'active'
      left join content.chapter_editor_assignments cea on cea.directus_user_id = u.id
      order by n.approved_at desc nulls last
    `;
  } catch (error) {
    if (!isDirectusStewardSourceUnavailable(error)) throw error;
    rows = await listPublicMapNodeRowsWithoutDirectus(sql);
  }

  return rows
    .map((row) => toPublicMapNode(row))
    .filter((node): node is PublicMapNode => Boolean(node))
    .map((node) => {
      if (containsPrivateMapNodeField(node)) {
        throw new AgentDataError(
          'private_field_projection_error',
          'Public map-node projection contains private fields.',
          500
        );
      }
      return node;
    });
}

export function createMapNodeRepository({
  createSql = createDatabaseClient,
  env = process.env,
  fetchImpl = globalThis.fetch,
}: {
  createSql?: (options?: { max?: number }) => SqlLike | null;
  env?: Record<string, string | undefined>;
  fetchImpl?: FetchLike;
} = {}) {
  return {
    createSubmission(input, requestMeta) {
      return withSql(createSql, (sql) => createMapNodeSubmission(sql, input, requestMeta, {
        env,
        fetchImpl,
        createSqlForDeferredDelivery: createSql,
      }));
    },
    requestEditLink(nodeId, email, requestMeta) {
      return withSql(createSql, (sql) => createMapNodeEditLinkRequest(sql, nodeId, email, requestMeta, {
        env,
        fetchImpl,
        createSqlForDeferredDelivery: createSql,
      }));
    },
    requestEditLinkByEmail(email, requestMeta) {
      return withSql(createSql, (sql) => createMapNodeEditLinkRequestByEmail(sql, email, requestMeta, {
        env,
        fetchImpl,
        createSqlForDeferredDelivery: createSql,
      }));
    },
    getEditSession(token) {
      return withSql(createSql, (sql) => getMapNodeEditSession(sql, token));
    },
    createUpdateRequest(nodeId, input, requestMeta) {
      return withSql(createSql, (sql) => createMapNodeUpdateRequest(sql, nodeId, input, requestMeta, { env }));
    },
    cleanupEditFlow() {
      return withSql(createSql, cleanupMapNodeEditFlow);
    },
    deliverQueuedEditLinks(options?: { limit?: number }) {
      return withSql(createSql, (sql) => deliverQueuedMapNodeEditLinks(sql, {
        env,
        fetchImpl,
        ...options,
      }));
    },
    deliverQueuedModerationNotifications(options?: { limit?: number; now?: Date }) {
      return withSql(createSql, (sql) => deliverQueuedMapNodeModerationNotifications(sql, {
        env,
        fetchImpl,
        ...options,
      }));
    },
    getModerationSession(token) {
      return withSql(createSql, (sql) => getMapNodeModerationSession(sql, token, { env }));
    },
    moderateNode(nodeId, input) {
      return withSql(createSql, (sql) => moderateMapNode(sql, nodeId, input, { env }));
    },
    listPublic() {
      return withSql(createSql, listPublicMapNodes);
    },
    getIntakeMode() {
      return withSql(createSql, getMapNodeIntakeMode);
    },
  };
}
