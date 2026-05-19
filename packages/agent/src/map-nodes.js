import { isIP } from 'node:net';
import {
  containsPrivateMapNodeField,
  createOptimisticPendingNode,
  toPublicMapNode,
} from '@greenpill-network/shared/map-nodes';
import { createDatabaseClient } from './db.js';

const cleanString = (value) => (typeof value === 'string' ? value.trim() : '');
const cleanIpAddress = (value) => {
  const candidate = cleanString(value);
  return isIP(candidate) ? candidate : '';
};

const normalizeNumber = (value) => {
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) ? number : null;
};

const normalizeThemes = (themes) => (
  Array.isArray(themes)
    ? themes.map(cleanString).filter(Boolean)
    : []
);

export class PublicInputError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.name = 'PublicInputError';
    this.code = code;
    this.status = status;
  }
}

export class AgentDataError extends Error {
  constructor(code, message, status = 503) {
    super(message);
    this.name = 'AgentDataError';
    this.code = code;
    this.status = status;
  }
}

export function publicErrorResponse(error) {
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

async function withSql(createSql, callback) {
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

function toPublicPendingMapNode(submission) {
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

export async function getMapNodeIntakeMode(sql) {
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

function normalizeSubmissionInput(input = {}) {
  const displayName = cleanString(input.displayName ?? input.name);
  const placeName = cleanString(input.placeName ?? input.place);
  const lat = normalizeNumber(input.lat ?? input.latitude);
  const long = normalizeNumber(input.long ?? input.lng ?? input.longitude);
  const email = cleanString(input.email ?? input.privateEmail ?? input.private_email);

  if (!displayName) {
    throw new PublicInputError('missing_display_name', 'Display name is required.');
  }

  if (!placeName) {
    throw new PublicInputError('missing_place', 'Place is required.');
  }

  if (lat === null || long === null) {
    throw new PublicInputError('invalid_coordinates', 'Latitude and longitude are required.');
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

export function getRequestMeta(context) {
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

export async function createMapNodeSubmission(sql, input, requestMeta = {}) {
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

export async function listPublicMapNodes(sql) {
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
    .filter(Boolean)
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

export function createMapNodeRepository({ createSql = createDatabaseClient } = {}) {
  return {
    createSubmission(input, requestMeta) {
      return withSql(createSql, (sql) => createMapNodeSubmission(sql, input, requestMeta));
    },
    listPublic() {
      return withSql(createSql, listPublicMapNodes);
    },
    getIntakeMode() {
      return withSql(createSql, getMapNodeIntakeMode);
    },
  };
}
