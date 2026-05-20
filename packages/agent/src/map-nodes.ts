import { createHash, randomBytes } from 'node:crypto';
import { isIP } from 'node:net';
import {
  containsPrivateMapNodeField,
  createOptimisticPendingNode,
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

interface EditLinkEmailContext {
  attemptId: string;
  token: string;
  email: string;
  node: EditablePublicMapNode;
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
export const RESEND_EMAILS_ENDPOINT = 'https://api.resend.com/emails';

const cleanString = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');
const cleanIpAddress = (value: unknown): string => {
  const candidate = cleanString(value);
  return isIP(candidate) ? candidate : '';
};

const normalizeNumber = (value: unknown): number | null => {
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) ? number : null;
};

const normalizeThemes = (themes: unknown): string[] => (
  Array.isArray(themes)
    ? themes.map(cleanString).filter(Boolean)
    : []
);

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeOwnerEmail(value: unknown): string {
  return cleanString(value).toLowerCase();
}

export function isValidOwnerEmail(value: unknown): boolean {
  const email = normalizeOwnerEmail(value);
  return email.length > 3 && email.length <= 320 && EMAIL_PATTERN.test(email);
}

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

export class PublicInputError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.name = 'PublicInputError';
    this.code = code;
    this.status = status;
  }
}

export class AgentDataError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status = 503) {
    super(message);
    this.name = 'AgentDataError';
    this.code = code;
    this.status = status;
  }
}

export function publicErrorResponse(error: unknown): {
  status: number;
  body: { error: { code: string; message: string } };
} {
  if (error instanceof PublicInputError || error instanceof AgentDataError) {
    return {
      status: error.status,
      body: {
        error: {
          code: error.code,
          message: error.message,
        },
      },
    };
  }

  return {
    status: 500,
    body: {
      error: {
        code: 'agent_data_error',
        message: 'The agent service could not complete the request.',
      },
    },
  };
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
    themes: submission.themes,
    publicNote: submission.publicNote,
  }, submission.createdAt ?? new Date());

  return {
    ...node,
    status: 'pending',
    source: 'submitted-pending',
  };
}

export async function getMapNodeIntakeMode(sql: SqlLike): Promise<PublicMapIntakeMode> {
  const rows = await sql`
    select live_onboarding_enabled as "liveOnboardingEnabled"
    from intake.map_node_intake_settings
    where id = 1
    limit 1
  `;

  const enabled = rows[0]?.liveOnboardingEnabled === true
    || rows[0]?.liveOnboardingEnabled === 'true';
  return enabled ? 'live' : 'moderated';
}

function normalizeSubmissionInput(input: PublicMapNodeSubmissionInput = {}) {
  const displayName = cleanString(input.displayName ?? input.name);
  const placeName = cleanString(input.placeName ?? input.place);
  const lat = normalizeNumber(input.lat ?? input.latitude);
  const long = normalizeNumber(input.long ?? input.lng ?? input.longitude);
  const email = normalizeOwnerEmail(input.email ?? input.privateEmail ?? input.private_email);

  if (!displayName) {
    throw new PublicInputError('missing_display_name', 'Display name is required.');
  }

  if (!placeName) {
    throw new PublicInputError('missing_place', 'Place is required.');
  }

  if (lat === null || long === null) {
    throw new PublicInputError('invalid_coordinates', 'Latitude and longitude are required.');
  }

  if (!isValidOwnerEmail(email)) {
    throw new PublicInputError('invalid_email', 'A valid email is required.');
  }

  return {
    displayName,
    placeName,
    city: cleanString(input.city),
    region: cleanString(input.region),
    country: cleanString(input.country),
    lat,
    long,
    role: cleanString(input.role ?? input.intent),
    themes: normalizeThemes(input.themes),
    publicNote: cleanString(input.publicNote ?? input.public_note),
    rawNote: cleanString(input.rawNote ?? input.raw_note),
    email,
    contactConsent: input.contactConsent ?? input.contact_consent ?? Boolean(email),
  };
}

export function getRequestMeta(context: {
  req: { header(name: string): string | undefined };
}): RequestMeta {
  const forwardedFor = cleanString(context.req.header('x-forwarded-for'));
  const ipAddress = cleanIpAddress(context.req.header('fly-client-ip'))
    || cleanIpAddress(context.req.header('x-real-ip'))
    || cleanIpAddress(forwardedFor.split(',')[0]);

  return {
    ipAddress,
    userAgent: cleanString(context.req.header('user-agent')),
    rateLimitKey: ipAddress || 'anonymous',
  };
}

export async function createMapNodeSubmission(
  sql: SqlLike,
  input: PublicMapNodeSubmissionInput,
  requestMeta: RequestMeta = {}
): Promise<SubmittedMapNode> {
  const normalized = normalizeSubmissionInput(input);
  const meta = {
    ipAddress: cleanString(requestMeta.ipAddress),
    userAgent: cleanString(requestMeta.userAgent),
    rateLimitKey: cleanString(requestMeta.rateLimitKey),
  };

  return sql.begin(async (tx) => {
    const intakeMode = await getMapNodeIntakeMode(tx);
    const liveOnboarding = intakeMode === 'live';
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
        themes,
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
        ${normalized.placeName},
        ${normalized.city || null},
        ${normalized.region || null},
        ${normalized.country || null},
        ${normalized.lat},
        ${normalized.long},
        ${normalized.role || null},
        ${normalized.themes},
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
        themes,
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
    }

    const publicNode = liveOnboarding
      ? toPublicMapNode(submission)
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

    return publicNode;
  });
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
  return normalizeThemes(input.themes);
}

function normalizeUpdateRequestInput(input: PublicMapNodeUpdateRequestInput = {}) {
  const source = jsonObject(input);
  const proposed: UnknownRecord = {};

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

  const themes = normalizeUpdateThemes(source);
  if (themes !== undefined) proposed.themes = themes;

  const publicNote = normalizeUpdateText(source, ['public_note', 'publicNote']);
  if (publicNote !== undefined) {
    if (publicNote.length > 500) {
      throw new PublicInputError('invalid_update_field', 'Public note must be 500 characters or fewer.');
    }
    proposed.public_note = publicNote;
  }

  if (Object.keys(proposed).length === 0) {
    throw new PublicInputError('missing_update_fields', 'At least one editable field is required.');
  }

  return {
    proposedPublicFields: proposed,
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
}): Promise<{ status: string; error: string }> {
  const config = editLinkConfig(env);
  const editUrl = buildEditUrl(config.baseUrl, token);
  if (!config.apiKey || !config.from || !editUrl || typeof fetchImpl !== 'function') {
    return { status: 'provider_not_configured', error: '' };
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
      return { status: 'send_failed', error: `resend_http_${response.status}` };
    }
    return { status: 'sent', error: '' };
  } catch {
    return { status: 'send_failed', error: 'resend_fetch_failed' };
  }
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
  }: {
    env?: Record<string, string | undefined>;
    fetchImpl?: FetchLike;
  } = {}
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
  const providerConfigured = Boolean(
    editLinkConfig(env).apiKey &&
    editLinkConfig(env).from &&
    buildEditUrl(editLinkConfig(env).baseUrl, 'preview-token')
  );
  let sendContext: EditLinkEmailContext | null = null;

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
    const rawToken = !limited && submission && providerConfigured ? createRawEditToken() : '';
    const tokenHash = rawToken ? hashMapNodeEditToken(rawToken) : null;
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
        ${tokenHash},
        now() + interval '30 minutes',
        ${providerStatus},
        ${meta.ipAddress || null},
        ${meta.userAgent || null},
        ${meta.rateLimitKey || null},
        ${toSqlJson(tx, { source: 'public-edit-link-request' })}
      )
      returning id::text
    `;

    if (rawToken && attempt?.id && submission) {
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
          token: rawToken,
          email: normalizedEmail,
          node: publicNode,
        };
      }
    }
  });

  const contextToSend = sendContext as EditLinkEmailContext | null;
  if (contextToSend) {
    const result = await sendEditLinkEmail({
      email: contextToSend.email,
      node: contextToSend.node,
      token: contextToSend.token,
      env,
      fetchImpl,
    });
    await sql`
      update intake.map_node_edit_tokens
      set provider_status = ${result.status}, provider_error = ${result.error || null}
      where id = ${contextToSend.attemptId}::uuid
    `;
  }

  return MAP_NODE_EDIT_LINK_NEUTRAL_RESPONSE;
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
  requestMeta: RequestMeta = {}
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

    const proposal = normalizeUpdateRequestInput(input);
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

export async function listPublicMapNodes(sql: SqlLike): Promise<PublicMapNode[]> {
  const rows = await sql`
    select
      id::text,
      name,
      place,
      city,
      region,
      country,
      lat::float8,
      long::float8,
      role,
      themes,
      public_note as "publicNote",
      status::text,
      approved_at as "approvedAt"
    from intake.public_map_nodes
    order by approved_at desc nulls last
  `;

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
      return withSql(createSql, (sql) => createMapNodeSubmission(sql, input, requestMeta));
    },
    requestEditLink(nodeId, email, requestMeta) {
      return withSql(createSql, (sql) => createMapNodeEditLinkRequest(sql, nodeId, email, requestMeta, {
        env,
        fetchImpl,
      }));
    },
    getEditSession(token) {
      return withSql(createSql, (sql) => getMapNodeEditSession(sql, token));
    },
    createUpdateRequest(nodeId, input, requestMeta) {
      return withSql(createSql, (sql) => createMapNodeUpdateRequest(sql, nodeId, input, requestMeta));
    },
    cleanupEditFlow() {
      return withSql(createSql, cleanupMapNodeEditFlow);
    },
    listPublic() {
      return withSql(createSql, listPublicMapNodes);
    },
    getIntakeMode() {
      return withSql(createSql, getMapNodeIntakeMode);
    },
  };
}
