#!/usr/bin/env bun

import { pathToFileURL } from 'node:url';

export const DIRECTUS_OPERATIONAL_COLLECTIONS = Object.freeze([
  'themes',
  'people',
  'chapters',
  'chapter_initiatives',
  'guilds',
  'projects',
]);

export const DIRECTUS_INTAKE_COLLECTIONS = Object.freeze([
  'map_node_submissions',
  'map_node_private_contacts',
  'map_node_reviews',
  'map_node_intake_settings',
  'map_node_edit_tokens',
  'map_node_update_requests',
]);

export const DIRECTUS_STEWARD_ACCESS_COLLECTIONS = Object.freeze([
  'chapter_editor_assignments',
  'guild_editor_assignments',
]);

const WORKFLOW_FIELDS = Object.freeze([
  'publication_status',
  'published_at',
  'reviewed_at',
  'reviewed_by',
]);

const SYSTEM_READONLY_FIELDS = Object.freeze([
  'created_at',
  'updated_at',
  'data',
]);

const OPERATIONAL_COLLECTION_FIELDS = Object.freeze({
  themes: [
    'slug',
    'name',
    'summary',
    'sort_order',
  ],
  people: [
    'slug',
    'display_name',
    'role',
    'avatar',
    'bio',
    'theme_slugs',
    'links',
    'media',
    'seo',
  ],
  chapters: [
    'slug',
    'name',
    'city',
    'country',
    'region',
    'entity_status',
    'summary',
    'intro_quote',
    'intro_quote_attribution',
    'image',
    'founded',
    'latitude',
    'longitude',
    'primary_link',
    'stewards',
    'steward_slugs',
    'theme_slugs',
    'links',
    'connect_links',
    'related_chapter_slugs',
    'featured_story',
    'featured_story_slugs',
    'authored_resource_slugs',
    'impact_sources',
    'featured_weight',
    'proof_signals',
    'media',
    'seo',
  ],
  chapter_initiatives: [
    'slug',
    'chapter_slug',
    'title',
    'entity_status',
    'summary',
    'description',
    'theme_slugs',
    'links',
    'proof_signals',
    'impact_sources',
    'related_story_slugs',
    'related_resource_slugs',
    'featured_weight',
  ],
  guilds: [
    'slug',
    'name',
    'type',
    'entity_status',
    'summary',
    'description',
    'founded_year',
    'oneliner',
    'image',
    'cadence',
    'stewards',
    'steward_slugs',
    'member_slugs',
    'public_members',
    'theme_slugs',
    'links',
    'connect_links',
    'mandate_paragraphs',
    'outputs',
    'principles',
    'featured_weight',
    'proof_signals',
    'media',
    'seo',
  ],
  projects: [
    'slug',
    'name',
    'entity_status',
    'guild_slug',
    'summary',
    'description',
    'image',
    'tech_stack',
    'repo_url',
    'live_url',
    'steward_slugs',
    'theme_slugs',
    'featured_weight',
    'proof_signals',
    'media',
    'seo',
  ],
});

const collectionFields = (collection, { publisher = false, read = false } = {}) => {
  const baseCollection = collection.replace(/^content[._]/, '');
  const editable = OPERATIONAL_COLLECTION_FIELDS[baseCollection] ?? [];
  const workflow = publisher || read ? WORKFLOW_FIELDS : ['publication_status'];
  const readonly = read ? SYSTEM_READONLY_FIELDS : [];
  return [...new Set([...editable, ...workflow, ...readonly])];
};

const SCOPED_EDITOR_IMMUTABLE_UPDATE_FIELDS = Object.freeze([
  'slug',
  'chapter_slug',
  'guild_slug',
]);

const scopedEditorFields = (collection, { create = false, read = false } = {}) => {
  if (read || create) return collectionFields(collection, { read });
  return collectionFields(collection).filter((field) => !SCOPED_EDITOR_IMMUTABLE_UPDATE_FIELDS.includes(field));
};

const statusFilter = (statuses) => ({
  publication_status: {
    _in: statuses,
  },
});

const andFilter = (...filters) => ({
  _and: filters,
});

const orFilter = (...filters) => ({
  _or: filters,
});

const currentUserEditorAssignmentFilter = {
  directus_user_id: {
    _eq: '$CURRENT_USER',
  },
};

const intakeStatusFilter = (statuses) => ({
  status: {
    _in: statuses,
  },
});

const reviewStatusFilter = (statuses) => ({
  review_status: {
    _in: statuses,
  },
});

const baseCollectionName = (collection) => collection.replace(/^(content|intake)[._]/, '');

const MAP_NODE_SUBMISSION_REVIEW_FIELDS = Object.freeze([
  'id',
  'status',
  'display_name',
  'place_name',
  'city',
  'region',
  'country',
  'bioregion',
  'latitude',
  'longitude',
  'role',
  'chapter_slug',
  'themes',
  'public_note',
  'created_at',
  'updated_at',
  'approved_at',
  'archived_at',
]);

const MAP_NODE_SUBMISSION_TRUSTED_FIELDS = Object.freeze([
  ...MAP_NODE_SUBMISSION_REVIEW_FIELDS,
  'raw_note',
]);

const MAP_NODE_SUBMISSION_UPDATE_FIELDS = Object.freeze([
  'status',
  'public_note',
  'approved_at',
  'archived_at',
]);

const MAP_NODE_REVIEW_READ_FIELDS = Object.freeze([
  'id',
  'submission_id',
  'reviewer_id',
  'review_status',
  'review_notes',
  'created_at',
]);

const MAP_NODE_REVIEW_WRITE_FIELDS = Object.freeze([
  'submission_id',
  'reviewer_id',
  'review_status',
  'review_notes',
]);

const MAP_NODE_PRIVATE_CONTACT_READ_FIELDS = Object.freeze([
  'submission_id',
  'email',
  'contact_consent',
  'created_at',
]);

const MAP_NODE_SETTINGS_READ_FIELDS = Object.freeze([
  'id',
  'live_onboarding_enabled',
  'updated_by',
  'updated_at',
]);

const MAP_NODE_UPDATE_REQUEST_REVIEW_FIELDS = Object.freeze([
  'id',
  'submission_id',
  'status',
  'proposed_display_name',
  'proposed_place_name',
  'proposed_city',
  'proposed_region',
  'proposed_country',
  'proposed_latitude',
  'proposed_longitude',
  'proposed_themes',
  'proposed_public_note',
  'current_submission_updated_at',
  'current_public_fields',
  'proposed_public_fields',
  'reviewed_by',
  'reviewed_at',
  'review_notes',
  'created_at',
  'updated_at',
]);

const MAP_NODE_UPDATE_REQUEST_TRUSTED_FIELDS = Object.freeze([
  ...MAP_NODE_UPDATE_REQUEST_REVIEW_FIELDS,
  'edit_token_id',
  'request_email',
  'requester_ip',
  'requester_user_agent',
  'rate_limit_key',
  'request_metadata',
]);

const MAP_NODE_UPDATE_REQUEST_REVIEW_UPDATE_FIELDS = Object.freeze([
  'status',
  'reviewed_by',
  'reviewed_at',
  'review_notes',
]);

const MAP_NODE_EDIT_TOKEN_TRUSTED_FIELDS = Object.freeze([
  'id',
  'requested_node_id',
  'submission_id',
  'normalized_email',
  'token_hash',
  'expires_at',
  'consumed_at',
  'provider_status',
  'provider_error',
  'request_ip',
  'request_user_agent',
  'rate_limit_key',
  'request_metadata',
  'created_at',
]);

function assignmentFields(collection) {
  const baseCollection = baseCollectionName(collection);
  const ownerField = baseCollection === 'guild_editor_assignments' ? 'guild_slug' : 'chapter_slug';
  return [
    'id',
    ownerField,
    'directus_user_id',
    'access_level',
    'created_at',
    'updated_at',
  ];
}

function assignmentOwnerFilter(collection) {
  const baseCollection = baseCollectionName(collection);
  if (baseCollection === 'chapter_editor_assignments') {
    return {
      directus_user_id: {
        _eq: '$CURRENT_USER',
      },
    };
  }
  if (baseCollection === 'guild_editor_assignments') {
    return {
      directus_user_id: {
        _eq: '$CURRENT_USER',
      },
    };
  }
  return null;
}

function buildStewardAccessAssignmentPermissions(collectionNames = []) {
  const permissions = [];
  for (const collection of collectionNames) {
    const ownerFilter = assignmentOwnerFilter(collection);
    permissions.push(
      {
        role: 'Greenpill Steward Editor',
        policy: 'Greenpill Steward Editor',
        collection,
        action: 'read',
        permissions: ownerFilter,
        validation: null,
        presets: null,
        fields: assignmentFields(collection),
      },
      {
        role: 'Greenpill Trusted Publisher',
        policy: 'Greenpill Trusted Publisher',
        collection,
        action: 'read',
        permissions: null,
        validation: null,
        presets: null,
        fields: assignmentFields(collection),
      },
      {
        role: 'Greenpill Trusted Publisher',
        policy: 'Greenpill Trusted Publisher',
        collection,
        action: 'create',
        permissions: null,
        validation: null,
        presets: { access_level: 'editor' },
        fields: assignmentFields(collection),
      },
      {
        role: 'Greenpill Trusted Publisher',
        policy: 'Greenpill Trusted Publisher',
        collection,
        action: 'update',
        permissions: null,
        validation: null,
        presets: null,
        fields: assignmentFields(collection),
      },
      {
        role: 'Greenpill Trusted Publisher',
        policy: 'Greenpill Trusted Publisher',
        collection,
        action: 'delete',
        permissions: null,
        validation: null,
        presets: null,
        fields: assignmentFields(collection),
      }
    );
  }
  return permissions;
}

function buildStewardUserContextPermissions() {
  return [
    {
      role: 'Greenpill Steward Editor',
      policy: 'Greenpill Steward Editor',
      collection: 'directus_users',
      action: 'read',
      permissions: {
        id: {
          _eq: '$CURRENT_USER',
        },
      },
      validation: null,
      presets: null,
      fields: [
        'id',
        'email',
        'chapter_editor_assignments',
        'guild_editor_assignments',
      ],
    },
  ];
}

function buildIntakeModerationPermissions(collectionNames = []) {
  const collections = new Map(collectionNames.map((collection) => [baseCollectionName(collection), collection]));
  const submission = collections.get('map_node_submissions');
  const privateContacts = collections.get('map_node_private_contacts');
  const reviews = collections.get('map_node_reviews');
  const settings = collections.get('map_node_intake_settings');
  const editTokens = collections.get('map_node_edit_tokens');
  const updateRequests = collections.get('map_node_update_requests');
  const submissionStatuses = ['pending', 'approved', 'rejected', 'archived'];
  const reviewStatuses = ['approved', 'rejected', 'archived'];
  const updateRequestStatuses = ['pending', 'approved', 'rejected', 'archived'];
  const permissions = [];

  if (submission) {
    permissions.push(
      {
        role: 'Greenpill Steward Moderator',
        policy: 'Greenpill Steward Moderator',
        collection: submission,
        action: 'read',
        permissions: intakeStatusFilter(submissionStatuses),
        validation: null,
        presets: null,
        fields: MAP_NODE_SUBMISSION_REVIEW_FIELDS,
      },
      {
        role: 'Greenpill Steward Moderator',
        policy: 'Greenpill Steward Moderator',
        collection: submission,
        action: 'update',
        permissions: intakeStatusFilter(submissionStatuses),
        validation: intakeStatusFilter(submissionStatuses),
        presets: null,
        fields: MAP_NODE_SUBMISSION_UPDATE_FIELDS,
      },
      {
        role: 'Greenpill Trusted Publisher',
        policy: 'Greenpill Trusted Publisher',
        collection: submission,
        action: 'read',
        permissions: intakeStatusFilter(submissionStatuses),
        validation: null,
        presets: null,
        fields: MAP_NODE_SUBMISSION_TRUSTED_FIELDS,
      },
      {
        role: 'Greenpill Trusted Publisher',
        policy: 'Greenpill Trusted Publisher',
        collection: submission,
        action: 'update',
        permissions: intakeStatusFilter(submissionStatuses),
        validation: intakeStatusFilter(submissionStatuses),
        presets: null,
        fields: MAP_NODE_SUBMISSION_UPDATE_FIELDS,
      }
    );
  }

  if (reviews) {
    permissions.push(
      {
        role: 'Greenpill Steward Moderator',
        policy: 'Greenpill Steward Moderator',
        collection: reviews,
        action: 'read',
        permissions: null,
        validation: null,
        presets: null,
        fields: MAP_NODE_REVIEW_READ_FIELDS,
      },
      {
        role: 'Greenpill Steward Moderator',
        policy: 'Greenpill Steward Moderator',
        collection: reviews,
        action: 'create',
        permissions: null,
        validation: reviewStatusFilter(reviewStatuses),
        presets: null,
        fields: MAP_NODE_REVIEW_WRITE_FIELDS,
      },
      {
        role: 'Greenpill Trusted Publisher',
        policy: 'Greenpill Trusted Publisher',
        collection: reviews,
        action: 'read',
        permissions: null,
        validation: null,
        presets: null,
        fields: MAP_NODE_REVIEW_READ_FIELDS,
      },
      {
        role: 'Greenpill Trusted Publisher',
        policy: 'Greenpill Trusted Publisher',
        collection: reviews,
        action: 'create',
        permissions: null,
        validation: reviewStatusFilter(reviewStatuses),
        presets: null,
        fields: MAP_NODE_REVIEW_WRITE_FIELDS,
      }
    );
  }

  if (privateContacts) {
    permissions.push({
      role: 'Greenpill Trusted Publisher',
      policy: 'Greenpill Trusted Publisher',
      collection: privateContacts,
      action: 'read',
      permissions: null,
      validation: null,
      presets: null,
      fields: MAP_NODE_PRIVATE_CONTACT_READ_FIELDS,
    });
  }

  if (settings) {
    permissions.push(
      {
        role: 'Greenpill Steward Moderator',
        policy: 'Greenpill Steward Moderator',
        collection: settings,
        action: 'read',
        permissions: null,
        validation: null,
        presets: null,
        fields: MAP_NODE_SETTINGS_READ_FIELDS,
      },
      {
        role: 'Greenpill Trusted Publisher',
        policy: 'Greenpill Trusted Publisher',
        collection: settings,
        action: 'read',
        permissions: null,
        validation: null,
        presets: null,
        fields: MAP_NODE_SETTINGS_READ_FIELDS,
      }
    );
  }

  if (updateRequests) {
    permissions.push(
      {
        role: 'Greenpill Steward Moderator',
        policy: 'Greenpill Steward Moderator',
        collection: updateRequests,
        action: 'read',
        permissions: null,
        validation: null,
        presets: null,
        fields: MAP_NODE_UPDATE_REQUEST_REVIEW_FIELDS,
      },
      {
        role: 'Greenpill Steward Moderator',
        policy: 'Greenpill Steward Moderator',
        collection: updateRequests,
        action: 'update',
        permissions: {
          status: {
            _eq: 'pending',
          },
        },
        validation: {
          status: {
            _in: updateRequestStatuses,
          },
        },
        presets: null,
        fields: MAP_NODE_UPDATE_REQUEST_REVIEW_UPDATE_FIELDS,
      },
      {
        role: 'Greenpill Trusted Publisher',
        policy: 'Greenpill Trusted Publisher',
        collection: updateRequests,
        action: 'read',
        permissions: null,
        validation: null,
        presets: null,
        fields: MAP_NODE_UPDATE_REQUEST_TRUSTED_FIELDS,
      },
      {
        role: 'Greenpill Trusted Publisher',
        policy: 'Greenpill Trusted Publisher',
        collection: updateRequests,
        action: 'update',
        permissions: null,
        validation: {
          status: {
            _in: updateRequestStatuses,
          },
        },
        presets: null,
        fields: MAP_NODE_UPDATE_REQUEST_REVIEW_UPDATE_FIELDS,
      }
    );
  }

  if (editTokens) {
    permissions.push({
      role: 'Greenpill Trusted Publisher',
      policy: 'Greenpill Trusted Publisher',
      collection: editTokens,
      action: 'read',
      permissions: null,
      validation: null,
      presets: null,
      fields: MAP_NODE_EDIT_TOKEN_TRUSTED_FIELDS,
    });
  }

  return permissions;
}

export function buildDirectusOperationalPermissionPlan(
  collectionNames = DIRECTUS_OPERATIONAL_COLLECTIONS,
  intakeCollectionNames = [],
  stewardAccessCollectionNames = []
) {
  const collections = [...collectionNames];
  const editorStatuses = ['draft', 'pending_review'];
  const publisherStatuses = ['draft', 'pending_review', 'published', 'archived'];

  const permissions = [];
  for (const collection of collections) {
    permissions.push(
      {
        role: 'Greenpill Steward Editor',
        policy: 'Greenpill Steward Editor',
        collection,
        action: 'read',
        permissions: statusFilter(['published']),
        validation: null,
        presets: null,
        fields: collectionFields(collection, { read: true }),
      },
      {
        role: 'Greenpill Trusted Publisher',
        policy: 'Greenpill Trusted Publisher',
        collection,
        action: 'read',
        permissions: null,
        validation: null,
        presets: null,
        fields: collectionFields(collection, { publisher: true, read: true }),
      },
      {
        role: 'Greenpill Trusted Publisher',
        policy: 'Greenpill Trusted Publisher',
        collection,
        action: 'create',
        permissions: null,
        validation: statusFilter(publisherStatuses),
        presets: { publication_status: 'draft' },
        fields: collectionFields(collection, { publisher: true }),
      },
      {
        role: 'Greenpill Trusted Publisher',
        policy: 'Greenpill Trusted Publisher',
        collection,
        action: 'update',
        permissions: null,
        validation: statusFilter(publisherStatuses),
        presets: null,
        fields: collectionFields(collection, { publisher: true }),
      }
    );
  }

  return {
    roles: [
      {
        name: 'Greenpill Steward Editor',
        icon: 'edit_note',
        description: 'Draft and edit scoped operational content without publish access.',
      },
      {
        name: 'Greenpill Steward Moderator',
        icon: 'rule',
        description: 'Moderate map-node submissions without private contact or request metadata.',
      },
      {
        name: 'Greenpill Trusted Publisher',
        icon: 'verified',
        description: 'Approve, publish, archive, moderate, and view submission contact details.',
      },
      {
        name: 'Greenpill Operator',
        icon: 'admin_panel_settings',
        description: 'Emergency operator role for Directus configuration and correction.',
      },
    ],
    policies: [
      {
        name: 'Greenpill Steward Editor',
        icon: 'edit_note',
        description: 'Data Studio access for draft operational content editing.',
        app_access: true,
        admin_access: false,
        enforce_tfa: false,
      },
      {
        name: 'Greenpill Steward Moderator',
        icon: 'rule',
        description: 'Data Studio access for review-safe map-node moderation.',
        app_access: true,
        admin_access: false,
        enforce_tfa: false,
      },
      {
        name: 'Greenpill Trusted Publisher',
        icon: 'verified',
        description: 'Data Studio access for trusted publish, moderation, and contact review work.',
        app_access: true,
        admin_access: false,
        enforce_tfa: false,
      },
      {
        name: 'Greenpill Operator',
        icon: 'admin_panel_settings',
        description: 'Admin access for Directus configuration and emergency correction.',
        app_access: true,
        admin_access: true,
        enforce_tfa: true,
      },
    ],
    permissions: [
      ...permissions,
      ...buildIntakeModerationPermissions(intakeCollectionNames),
      ...buildStewardAccessAssignmentPermissions(stewardAccessCollectionNames),
      ...buildStewardUserContextPermissions(),
    ],
  };
}

function cleanString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function directusUrlFromEnv(env = process.env) {
  return cleanString(env.DIRECTUS_ADMIN_URL || env.DIRECTUS_URL || env.DIRECTUS_PUBLIC_URL)
    .replace(/\/+$/, '') || 'http://127.0.0.1:3302';
}

type DirectusRequestOptions = {
  method?: string;
  body?: unknown;
  expected?: number[];
};

export async function createDirectusClient({
  url = directusUrlFromEnv(),
  token = cleanString(process.env.DIRECTUS_ADMIN_TOKEN),
  email = cleanString(process.env.DIRECTUS_ADMIN_EMAIL) || 'admin@greenpill.network',
  password = cleanString(process.env.DIRECTUS_ADMIN_PASSWORD) || 'directus-local-password',
  timeoutMs = Number(process.env.DIRECTUS_REQUEST_TIMEOUT_MS || 60000),
}: {
  url?: string;
  token?: string;
  email?: string;
  password?: string;
  timeoutMs?: number;
  [key: string]: any;
} = {}) {
  let accessToken = token;

  async function request(path: string, { method = 'GET', body, expected = [200, 201, 204] }: DirectusRequestOptions = {}) {
    const controller = new AbortController();
    const timeout = timeoutMs > 0
      ? setTimeout(() => controller.abort(), timeoutMs)
      : null;
    let response;

    try {
      response = await fetch(`${url}${path}`, {
        method,
        headers: {
          ...(body ? { 'content-type': 'application/json' } : {}),
          ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`${method} ${path} timed out after ${timeoutMs}ms`);
      }
      throw error;
    } finally {
      if (timeout) clearTimeout(timeout);
    }

    if (!expected.includes(response.status)) {
      const text = await response.text().catch(() => '');
      throw new Error(`${method} ${path} failed with ${response.status}: ${text}`);
    }

    if (response.status === 204) return null;

    const text = await response.text();
    if (!text) return null;
    return JSON.parse(text);
  }

  if (!accessToken) {
    const login = await request('/auth/login', {
      method: 'POST',
      body: { email, password, mode: 'json' },
    });
    accessToken = login?.data?.access_token;
    if (!accessToken) {
      throw new Error('Directus login did not return an access token.');
    }
  }

  return { request, url };
}

const filterByName = (name) => {
  const params = new URLSearchParams();
  params.set('filter[name][_eq]', name);
  params.set('limit', '1');
  return params.toString();
};

async function upsertNamed(client, resource, payload) {
  const existing = await client.request(`/${resource}?${filterByName(payload.name)}`);
  const item = existing?.data?.[0];
  if (item?.id) {
    const updated = await client.request(`/${resource}/${item.id}`, {
      method: 'PATCH',
      body: payload,
    });
    return updated?.data ?? item;
  }

  const created = await client.request(`/${resource}`, {
    method: 'POST',
    body: payload,
  });
  return created?.data;
}

async function ensureRolePolicyAccess(client, roleId, policyId) {
  const params = new URLSearchParams();
  params.set('filter[role][_eq]', roleId);
  params.set('filter[policy][_eq]', policyId);
  params.set('limit', '1');

  const existing = await client.request(`/access?${params.toString()}`);
  if (existing?.data?.[0]?.id) return existing.data[0];

  const created = await client.request('/access', {
    method: 'POST',
    body: {
      role: roleId,
      policy: policyId,
    },
  });
  return created?.data;
}

async function upsertPermission(client, permission) {
  const params = new URLSearchParams();
  params.set('filter[policy][_eq]', permission.policy);
  params.set('filter[collection][_eq]', permission.collection);
  params.set('filter[action][_eq]', permission.action);
  params.set('limit', '1');

  const payload = {
    policy: permission.policy,
    collection: permission.collection,
    action: permission.action,
    permissions: permission.permissions,
    validation: permission.validation,
    presets: permission.presets,
    fields: permission.fields,
  };

  const existing = await client.request(`/permissions?${params.toString()}`);
  const item = existing?.data?.[0];
  if (item?.id) {
    const updated = await client.request(`/permissions/${item.id}`, {
      method: 'PATCH',
      body: payload,
    });
    return updated?.data ?? item;
  }

  const created = await client.request('/permissions', {
    method: 'POST',
    body: payload,
  });
  return created?.data;
}

async function pruneManagedPermissions(client, policyMap, managedCollections, expectedKeys) {
  for (const [policyName, policy] of policyMap) {
    if (!policy?.id) continue;

    const response = await client.request(`/permissions?filter[policy][_eq]=${policy.id}&limit=-1`);
    for (const permission of response?.data ?? []) {
      if (!managedCollections.has(permission.collection)) continue;

      const key = `${permission.policy}:${permission.collection}:${permission.action}`;
      if (expectedKeys.has(key)) continue;

      await client.request(`/permissions/${permission.id}`, {
        method: 'DELETE',
        expected: [204],
      });
      console.log(`Removed obsolete Directus permission for ${policyName}: ${permission.collection}:${permission.action}`);
    }
  }
}

function resolveSchemaCollectionNames(availableCollectionNames, schema, collectionNames) {
  const names = new Set(availableCollectionNames);
  return collectionNames.map((collection) => {
    const candidates = [
      collection,
      `${schema}.${collection}`,
      `${schema}_${collection}`,
    ];
    const match = candidates.find((candidate) => names.has(candidate));
    if (!match) {
      throw new Error(
        `Directus collection for ${schema}.${collection} was not found. ` +
        'Verify DB_SEARCH_PATH includes public,content,intake,impact,workspace,audit.'
      );
    }
    return match;
  });
}

function resolveOperationalCollectionNames(availableCollectionNames) {
  return resolveSchemaCollectionNames(
    availableCollectionNames,
    'content',
    DIRECTUS_OPERATIONAL_COLLECTIONS
  );
}

function resolveIntakeCollectionNames(availableCollectionNames) {
  return resolveSchemaCollectionNames(
    availableCollectionNames,
    'intake',
    DIRECTUS_INTAKE_COLLECTIONS
  );
}

function resolveStewardAccessCollectionNames(availableCollectionNames) {
  return resolveSchemaCollectionNames(
    availableCollectionNames,
    'content',
    DIRECTUS_STEWARD_ACCESS_COLLECTIONS
  );
}

async function getAvailableCollectionNames(client) {
  const response = await client.request('/collections?limit=-1');
  return (response?.data ?? []).map((collection) => collection.collection).filter(Boolean);
}

async function ensureRelation(client, relation) {
  const params = new URLSearchParams();
  params.set('filter[collection][_eq]', relation.collection_many);
  params.set('filter[field][_eq]', relation.field_many);
  params.set('limit', '1');

  const existing = await client.request(`/relations?${params.toString()}`);
  const item = existing?.data?.[0];
  const payload = {
    collection_many: relation.collection_many,
    field_many: relation.field_many,
    collection_one: relation.collection_one,
    field_one: relation.field_one,
    junction_field: relation.junction_field ?? null,
  };

  if (item) {
    const currentMeta = item.meta ?? {};
    if (
      currentMeta.one_collection !== relation.collection_one ||
      currentMeta.one_field !== relation.field_one ||
      currentMeta.junction_field !== (relation.junction_field ?? null)
    ) {
      const updated = await client.request(`/relations/${encodeURIComponent(relation.collection_many)}/${encodeURIComponent(relation.field_many)}`, {
        method: 'PATCH',
        body: {
          collection: relation.collection_many,
          field: relation.field_many,
          related_collection: relation.collection_one,
          meta: {
            many_collection: relation.collection_many,
            many_field: relation.field_many,
            one_collection: relation.collection_one,
            one_field: relation.field_one,
            one_allowed_collections: null,
            one_collection_field: null,
            one_deselect_action: 'delete',
            junction_field: relation.junction_field ?? null,
            sort_field: null,
          },
        },
      });
      return updated?.data ?? item;
    }
    return item;
  }

  const created = await client.request('/relations', {
    method: 'POST',
    body: payload,
  });
  return created?.data;
}

async function fieldExists(client, collection, field) {
  const params = new URLSearchParams();
  params.set('fields', 'field');
  params.set('limit', '-1');
  const response = await client.request(`/fields/${encodeURIComponent(collection)}?${params.toString()}`);
  return (response?.data ?? []).some((item) => item.field === field);
}

async function ensureAliasField(client, collection, field, meta) {
  const payload = {
    field,
    type: 'alias',
    meta: {
      collection,
      field,
      special: ['o2m'],
      interface: 'list-o2m',
      display: 'related-values',
      readonly: true,
      hidden: true,
      sort: 1000,
      width: 'full',
      ...meta,
    },
    schema: null,
  };

  if (await fieldExists(client, collection, field)) {
    const updated = await client.request(`/fields/${encodeURIComponent(collection)}/${encodeURIComponent(field)}`, {
      method: 'PATCH',
      body: { meta: payload.meta },
    });
    return updated?.data;
  }

  const created = await client.request(`/fields/${encodeURIComponent(collection)}`, {
    method: 'POST',
    body: payload,
  });
  return created?.data;
}

async function ensureStewardAccessRelations(client, collectionNames) {
  const collections = new Map(collectionNames.map((collection) => [baseCollectionName(collection), collection]));
  const chapters = collections.get('chapters');
  const chapterInitiatives = collections.get('chapter_initiatives');
  const chapterAssignments = collections.get('chapter_editor_assignments');
  const guilds = collections.get('guilds');
  const projects = collections.get('projects');
  const guildAssignments = collections.get('guild_editor_assignments');

  if (chapters && chapterAssignments) {
    await ensureRelation(client, {
      collection_many: chapterAssignments,
      field_many: 'chapter_slug',
      collection_one: chapters,
      field_one: 'editor_assignments',
    });
    await ensureAliasField(client, chapters, 'editor_assignments', {
      options: { template: '{{ directus_user_id.email }}' },
      display_options: { template: '{{ directus_user_id.email }}' },
    });
    await ensureRelation(client, {
      collection_many: chapterAssignments,
      field_many: 'directus_user_id',
      collection_one: 'directus_users',
      field_one: 'chapter_editor_assignments',
    });
    await ensureAliasField(client, 'directus_users', 'chapter_editor_assignments', {
      options: { template: '{{ chapter_slug.name }}' },
      display_options: { template: '{{ chapter_slug.name }}' },
    });
  }

  if (chapters && chapterInitiatives) {
    await ensureRelation(client, {
      collection_many: chapterInitiatives,
      field_many: 'chapter_slug',
      collection_one: chapters,
      field_one: 'initiatives',
    });
  }

  if (guilds && guildAssignments) {
    await ensureRelation(client, {
      collection_many: guildAssignments,
      field_many: 'guild_slug',
      collection_one: guilds,
      field_one: 'editor_assignments',
    });
    await ensureAliasField(client, guilds, 'editor_assignments', {
      options: { template: '{{ directus_user_id.email }}' },
      display_options: { template: '{{ directus_user_id.email }}' },
    });
    await ensureRelation(client, {
      collection_many: guildAssignments,
      field_many: 'directus_user_id',
      collection_one: 'directus_users',
      field_one: 'guild_editor_assignments',
    });
    await ensureAliasField(client, 'directus_users', 'guild_editor_assignments', {
      options: { template: '{{ guild_slug.name }}' },
      display_options: { template: '{{ guild_slug.name }}' },
    });
  }

  if (guilds && projects) {
    try {
      await ensureRelation(client, {
        collection_many: projects,
        field_many: 'guild_slug',
        collection_one: guilds,
        field_one: 'projects',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes('doesn\'t have a relationship')) {
        throw error;
      }
      console.warn('Skipped Directus projects.guild_slug relation metadata until the database foreign key exists.');
    }
  }
}

export async function applyDirectusOperationalContentAccess(options: {
  client?: Awaited<ReturnType<typeof createDirectusClient>>;
  [key: string]: any;
} = {}) {
  const client = options.client ?? await createDirectusClient(options);
  const available = await getAvailableCollectionNames(client);
  const operationalCollections = resolveOperationalCollectionNames(available);
  const intakeCollections = resolveIntakeCollectionNames(available);
  const stewardAccessCollections = resolveStewardAccessCollectionNames(available);
  await ensureStewardAccessRelations(client, [
    ...operationalCollections,
    ...stewardAccessCollections,
  ]);
  const plan = buildDirectusOperationalPermissionPlan(
    operationalCollections,
    intakeCollections,
    stewardAccessCollections
  );

  const roles = new Map();
  for (const role of plan.roles) {
    roles.set(role.name, await upsertNamed(client, 'roles', role));
  }

  const policies = new Map();
  for (const policy of plan.policies) {
    policies.set(policy.name, await upsertNamed(client, 'policies', policy));
  }

  for (const [name, role] of roles) {
    const policy = policies.get(name);
    if (role?.id && policy?.id) {
      await ensureRolePolicyAccess(client, role.id, policy.id);
    }
  }

  const expectedPermissionKeys = new Set();
  const managedCollections = new Set([
    ...operationalCollections,
    ...intakeCollections,
    ...stewardAccessCollections,
  ]);

  for (const permission of plan.permissions) {
    const policy = policies.get(permission.policy);
    if (!policy?.id) {
      throw new Error(`Missing Directus policy for ${permission.policy}`);
    }
    expectedPermissionKeys.add(`${policy.id}:${permission.collection}:${permission.action}`);
    await upsertPermission(client, {
      ...permission,
      policy: policy.id,
    });
  }

  await pruneManagedPermissions(client, policies, managedCollections, expectedPermissionKeys);

  return {
    url: client.url,
    collections: [
      ...operationalCollections,
      ...intakeCollections,
      ...stewardAccessCollections,
    ],
    roles: [...roles.keys()],
    policies: [...policies.keys()],
    permissions: plan.permissions.length,
  };
}

async function main() {
  const result = await applyDirectusOperationalContentAccess();
  console.log(`Configured Directus operational content access at ${result.url}`);
  console.log(`Collections: ${result.collections.join(', ')}`);
  console.log(`Roles: ${result.roles.join(', ')}`);
  console.log(`Policies: ${result.policies.join(', ')}`);
  console.log(`Permissions: ${result.permissions}`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
