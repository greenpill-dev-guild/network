#!/usr/bin/env bun

import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import {
  DIRECTUS_STEWARD_ACCESS_COLLECTIONS,
  DIRECTUS_STEWARD_WORKFLOW_COLLECTIONS,
  createDirectusClient,
} from './directus-operational-content-setup.ts';

type AssignmentKind = 'chapter' | 'guild';

type AssignmentInput = {
  email: string;
  kind: AssignmentKind;
  slug: string;
};

type AssignCommand = 'assign' | 'sync';

type AssignOptions = {
  command: AssignCommand;
  input?: string;
  role: string;
  operatorRole: string;
  dryRun: boolean;
  syncRole: boolean;
};

const DEFAULT_STEWARD_ROLE = 'Greenpill Steward Editor';
const DEFAULT_OPERATOR_ROLE = 'Greenpill Operator';
// Scoped editors are trusted to edit their own live records directly, so a
// published row stays public while they update it. The chapter update request
// workflow remains available for changes a steward wants reviewed first.
// Reaching the public website still requires a snapshot refresh + site build.
const EDITOR_STATUSES = ['draft', 'pending_review', 'published'];
const CHAPTER_UPDATE_REQUEST_CREATE_STATUSES = ['draft', 'pending_review'];
const CHAPTER_UPDATE_REQUEST_UPDATE_STATUSES = ['draft', 'pending_review', 'needs_changes'];

const OPERATIONAL_COLLECTION_FIELDS = Object.freeze({
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

const WORKFLOW_READ_FIELDS = ['publication_status', 'published_at', 'reviewed_at', 'reviewed_by', 'created_at', 'updated_at', 'data'];
const SCOPED_EDITOR_IMMUTABLE_UPDATE_FIELDS = ['slug', 'chapter_slug', 'guild_slug'];
const CHAPTER_UPDATE_REQUEST_READ_FIELDS = [
  'id',
  'chapter_slug',
  'title',
  'summary',
  'proposed_summary',
  'proposed_primary_link',
  'proposed_image',
  'proposed_image_alt',
  'proposed_image_credit',
  'requested_changes',
  'request_status',
  'reviewer_notes',
  'reviewed_by',
  'reviewed_at',
  'created_at',
  'updated_at',
];
const CHAPTER_UPDATE_REQUEST_WRITE_FIELDS = [
  'chapter_slug',
  'title',
  'summary',
  'proposed_summary',
  'proposed_primary_link',
  'proposed_image',
  'proposed_image_alt',
  'proposed_image_credit',
  'requested_changes',
  'request_status',
];
const CHAPTER_UPDATE_REQUEST_LINK_FIELDS = [
  'id',
  'update_request_id',
  'chapter_slug',
  'sort_order',
  'label',
  'url',
  'subtext',
  'handle',
  'action',
  'icon',
  'kind',
  'created_at',
  'updated_at',
];
const CHAPTER_UPDATE_REQUEST_PROOF_SIGNAL_FIELDS = [
  'id',
  'update_request_id',
  'chapter_slug',
  'sort_order',
  'label',
  'value',
  'source',
  'href',
  'created_at',
  'updated_at',
];
const SYSTEM_MANAGED_CHILD_FIELDS = ['id', 'created_at', 'updated_at'];
const CHILD_CREATE_PRESET_FIELDS = ['chapter_slug'];
const CHILD_IMMUTABLE_UPDATE_FIELDS = ['chapter_slug', 'update_request_id'];

function contentFields(collection: string, { read = false, update = false } = {}) {
  const fields = OPERATIONAL_COLLECTION_FIELDS[baseCollectionName(collection)] ?? [];
  const workflow = read ? WORKFLOW_READ_FIELDS : ['publication_status'];
  const all = [...new Set([...fields, ...workflow])];
  return update
    ? all.filter((field) => !SCOPED_EDITOR_IMMUTABLE_UPDATE_FIELDS.includes(field))
    : all;
}

function contentCreateFields(collection: string, lockedFields: string[] = []) {
  return contentFields(collection).filter((field) => !lockedFields.includes(field));
}

function chapterUpdateRequestFields({ read = false, update = false } = {}) {
  const fields = read ? CHAPTER_UPDATE_REQUEST_READ_FIELDS : CHAPTER_UPDATE_REQUEST_WRITE_FIELDS;
  return update
    ? fields.filter((field) => field !== 'chapter_slug')
    : fields;
}

function chapterUpdateRequestChildFields(collection: string, { read = false, update = false } = {}) {
  const fields = baseCollectionName(collection) === 'chapter_update_request_proof_signals'
    ? CHAPTER_UPDATE_REQUEST_PROOF_SIGNAL_FIELDS
    : CHAPTER_UPDATE_REQUEST_LINK_FIELDS;
  if (read) return fields;

  const blocked = new Set([
    ...SYSTEM_MANAGED_CHILD_FIELDS,
    ...CHILD_CREATE_PRESET_FIELDS,
    ...(update ? CHILD_IMMUTABLE_UPDATE_FIELDS : []),
  ]);
  return fields.filter((field) => !blocked.has(field));
}

const statusFilter = (statuses) => ({
  publication_status: {
    _in: statuses,
  },
});

const requestStatusFilter = (statuses) => ({
  request_status: {
    _in: statuses,
  },
});

const andFilter = (...filters) => ({
  _and: filters,
});

function cleanString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function cleanEmail(value: unknown) {
  return cleanString(value).toLowerCase();
}

function usage() {
  return [
    'Usage: bun run directus:content-access -- assign --input assignments.tsv [options]',
    '       bun run directus:content-access -- sync [options]',
    '',
    'Commands:',
    '  assign   Apply assignments from a TSV file.',
    '  sync     Re-apply scoped policies for every assignment already in Directus.',
    '           Use after changing the scoped permission shape so no steward is',
    '           left on a stale policy. Needs no TSV and is safe to re-run.',
    '',
    'Input TSV columns:',
    '  email<TAB>kind<TAB>slug',
    '',
    'Kinds:',
    '  chapter, guild',
    '',
    'Options:',
    `  --role <name>           Role to sync assigned users to. Defaults to "${DEFAULT_STEWARD_ROLE}".`,
    `  --operator-role <name>  Operator role that should not be downgraded. Defaults to "${DEFAULT_OPERATOR_ROLE}".`,
    '  --no-role-sync         Do not update user roles.',
    '  --dry-run              Resolve users/content without mutating Directus.',
  ].join('\n');
}

function takeValue(args: string[], index: number, flag: string) {
  const value = args[index + 1];
  if (!value || value.startsWith('--')) {
    throw new Error(`${flag} requires a value.`);
  }
  return value;
}

export function parseArgs(argv: string[]): AssignOptions {
  const command: AssignCommand = argv[0] === 'sync' ? 'sync' : 'assign';
  const args = argv[0] === 'assign' || argv[0] === 'sync' ? argv.slice(1) : argv;
  const options: AssignOptions = {
    command,
    role: DEFAULT_STEWARD_ROLE,
    operatorRole: DEFAULT_OPERATOR_ROLE,
    dryRun: false,
    syncRole: true,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--help' || arg === '-h') {
      console.log(usage());
      process.exit(0);
    }
    if (arg === '--input' || arg === '-i') {
      options.input = takeValue(args, index, arg);
      index += 1;
      continue;
    }
    if (arg === '--role') {
      options.role = takeValue(args, index, arg);
      index += 1;
      continue;
    }
    if (arg === '--operator-role') {
      options.operatorRole = takeValue(args, index, arg);
      index += 1;
      continue;
    }
    if (arg === '--no-role-sync') {
      options.syncRole = false;
      continue;
    }
    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }
    throw new Error(`Unknown option: ${arg}\n\n${usage()}`);
  }

  if (options.command === 'assign' && !options.input) {
    throw new Error(`Missing --input.\n\n${usage()}`);
  }
  if (options.command === 'sync' && options.input) {
    throw new Error(`sync reads assignments from Directus and does not accept --input.\n\n${usage()}`);
  }

  return options;
}

export function parseAssignments(text: string): AssignmentInput[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));

  const dataLines = lines[0]?.toLowerCase().startsWith('email\t') ? lines.slice(1) : lines;
  const seen = new Set<string>();

  const chapterByEmail = new Map<string, string>();

  return dataLines.map((line) => {
    const [email, kind, slug] = line.split('\t').map((part) => part.trim());
    const cleanKind = kind as AssignmentKind;
    const cleanSlug = cleanString(slug);
    const cleanUserEmail = cleanEmail(email);

    if (!cleanUserEmail || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cleanUserEmail)) {
      throw new Error(`Invalid assignment email: ${cleanUserEmail || '(blank)'}`);
    }
    if (cleanKind !== 'chapter' && cleanKind !== 'guild') {
      throw new Error(`Invalid assignment kind for ${cleanUserEmail}: ${kind || '(blank)'}`);
    }
    if (!cleanSlug) {
      throw new Error(`Missing ${cleanKind} slug for ${cleanUserEmail}`);
    }

    const key = `${cleanUserEmail}:${cleanKind}:${cleanSlug}`;
    if (seen.has(key)) {
      throw new Error(`Duplicate assignment: ${key}`);
    }
    seen.add(key);

    if (cleanKind === 'chapter') {
      const existingChapter = chapterByEmail.get(cleanUserEmail);
      if (existingChapter && existingChapter !== cleanSlug) {
        throw new Error(`A steward can only be assigned to one chapter: ${cleanUserEmail}`);
      }
      chapterByEmail.set(cleanUserEmail, cleanSlug);
    }

    return {
      email: cleanUserEmail,
      kind: cleanKind,
      slug: cleanSlug,
    };
  });
}

function encodeCollection(collection: string) {
  return encodeURIComponent(collection);
}

function filterByField(field: string, value: string) {
  const params = new URLSearchParams();
  params.set(`filter[${field}][_eq]`, value);
  params.set('limit', '1');
  return params.toString();
}

async function getAvailableCollectionNames(client) {
  const response = await client.request('/collections?limit=-1');
  return (response?.data ?? []).map((collection) => collection.collection).filter(Boolean);
}

function baseCollectionName(collection: string) {
  return collection.replace(/^(content|intake)[._]/, '');
}

function resolveSchemaCollectionName(availableCollectionNames: string[], schema: string, collection: string) {
  const names = new Set(availableCollectionNames);
  const candidates = [
    collection,
    `${schema}.${collection}`,
    `${schema}_${collection}`,
  ];
  const match = candidates.find((candidate) => names.has(candidate));
  if (!match) {
    throw new Error(`Directus collection for ${schema}.${collection} was not found.`);
  }
  return match;
}

async function resolveCollections(client) {
  const available = await getAvailableCollectionNames(client);
  const accessCollections = new Map(
    DIRECTUS_STEWARD_ACCESS_COLLECTIONS.map((collection) => [
      collection,
      resolveSchemaCollectionName(available, 'content', collection),
    ])
  );
  const workflowCollections = new Map(
    DIRECTUS_STEWARD_WORKFLOW_COLLECTIONS.map((collection) => [
      collection,
      resolveSchemaCollectionName(available, 'content', collection),
    ])
  );

  return {
    chapters: resolveSchemaCollectionName(available, 'content', 'chapters'),
    chapterInitiatives: resolveSchemaCollectionName(available, 'content', 'chapter_initiatives'),
    guilds: resolveSchemaCollectionName(available, 'content', 'guilds'),
    projects: resolveSchemaCollectionName(available, 'content', 'projects'),
    chapterAssignments: accessCollections.get('chapter_editor_assignments')!,
    guildAssignments: accessCollections.get('guild_editor_assignments')!,
    chapterUpdateRequests: workflowCollections.get('chapter_update_requests')!,
    chapterUpdateRequestLinks: workflowCollections.get('chapter_update_request_links')!,
    chapterUpdateRequestProofSignals: workflowCollections.get('chapter_update_request_proof_signals')!,
  };
}

async function getRoleId(client, name: string) {
  const response = await client.request(`/roles?${filterByField('name', name)}`);
  const role = response?.data?.[0];
  if (!role?.id) throw new Error(`Directus role not found: ${name}`);
  return role.id as string;
}

async function getUserByEmail(client, email: string) {
  const params = new URLSearchParams(filterByField('email', email));
  params.set('fields', 'id,email,role');
  const response = await client.request(`/users?${params.toString()}`);
  const user = response?.data?.[0];
  if (!user?.id) throw new Error(`Directus user not found: ${email}`);
  return user;
}

async function ensureUserRole(client, user: any, roleId: string, operatorRoleId: string, options: AssignOptions) {
  const existingRoleId = typeof user.role === 'object' ? user.role?.id : user.role;
  if (!options.syncRole || existingRoleId === roleId || existingRoleId === operatorRoleId) {
    return existingRoleId === operatorRoleId ? 'kept operator role' : 'role ok';
  }

  if (!options.dryRun) {
    await client.request(`/users/${user.id}`, {
      method: 'PATCH',
      body: { role: roleId },
    });
  }

  return options.dryRun ? 'would update role' : 'updated role';
}

async function ensureContentExists(client, collection: string, slug: string, kind: AssignmentKind) {
  const response = await client.request(`/items/${encodeCollection(collection)}?${filterByField('slug', slug)}`);
  if (!response?.data?.[0]) {
    throw new Error(`Directus ${kind} not found: ${slug}`);
  }
}

async function getUserAssignments(client, collection: string, userId: string, kind: AssignmentKind) {
  const ownerField = kind === 'chapter' ? 'chapter_slug' : 'guild_slug';
  const params = new URLSearchParams();
  params.set('filter[directus_user_id][_eq]', userId);
  params.set('fields', `id,${ownerField}`);
  params.set('limit', '-1');

  const existing = await client.request(`/items/${encodeCollection(collection)}?${params.toString()}`);
  return { ownerField, rows: existing?.data ?? [] };
}

export async function assertAssignmentAvailable(
  client,
  collection: string,
  userId: string,
  kind: AssignmentKind,
  slug: string
) {
  const { ownerField, rows } = await getUserAssignments(client, collection, userId, kind);
  const matching = rows.find((row) => row?.[ownerField] === slug);
  if (kind === 'chapter' && rows.some((row) => row?.[ownerField] !== slug)) {
    throw new Error(`Directus user ${userId} already has a chapter assignment.`);
  }
  return Boolean(matching?.id);
}

async function ensureAssignment(client, collection: string, userId: string, kind: AssignmentKind, slug: string, dryRun: boolean) {
  const ownerField = kind === 'chapter' ? 'chapter_slug' : 'guild_slug';
  const alreadyAssigned = await assertAssignmentAvailable(client, collection, userId, kind, slug);
  if (alreadyAssigned) return 'already assigned';

  if (!dryRun) {
    await client.request(`/items/${encodeCollection(collection)}`, {
      method: 'POST',
      body: {
        [ownerField]: slug,
        directus_user_id: userId,
        access_level: 'editor',
      },
    });
  }

  return dryRun ? 'would assign' : 'assigned';
}

function scopedPolicyName(kind: AssignmentKind, slug: string) {
  return kind === 'chapter'
    ? `Greenpill Chapter Editor: ${slug}`
    : `Greenpill Guild Editor: ${slug}`;
}

function scopedPolicyDescription(kind: AssignmentKind, slug: string) {
  return kind === 'chapter'
    ? `Scoped Directus editing access for chapter:${slug}.`
    : `Scoped Directus editing access for guild:${slug}.`;
}

async function upsertNamed(client, resource: string, payload: Record<string, unknown>, dryRun: boolean) {
  const existing = await client.request(`/${resource}?${filterByField('name', String(payload.name))}`);
  const item = existing?.data?.[0];
  if (dryRun) return item ?? { id: `dry-run-${payload.name}` };

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

async function upsertPermission(client, permission, dryRun: boolean) {
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
  if (dryRun) return item ?? { id: `dry-run-${permission.collection}-${permission.action}` };

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

async function ensureUserPolicyAccess(client, userId: string, policyId: string, dryRun: boolean) {
  const params = new URLSearchParams();
  params.set('filter[user][_eq]', userId);
  params.set('filter[policy][_eq]', policyId);
  params.set('limit', '1');

  const existing = await client.request(`/access?${params.toString()}`);
  if (existing?.data?.[0]?.id) return 'policy ok';
  if (dryRun) return 'would attach policy';

  await client.request('/access', {
    method: 'POST',
    body: {
      user: userId,
      policy: policyId,
    },
  });
  return 'attached policy';
}

export function buildScopedPolicyPermissions(collections, kind: AssignmentKind, slug: string, policyId: string) {
  if (kind === 'chapter') {
    const chapterScope = { slug: { _eq: slug } };
    const initiativeScope = { chapter_slug: { _eq: slug } };
    const updateRequestScope = { chapter_slug: { _eq: slug } };
    const updateRequestChildScope = {
      _and: [
        {
          chapter_slug: {
            _eq: slug,
          },
        },
        {
          update_request_id: {
            request_status: {
              _in: CHAPTER_UPDATE_REQUEST_UPDATE_STATUSES,
            },
          },
        },
      ],
    };
    const updateRequestChildCreateScope = {
      _and: [
        {
          chapter_slug: {
            _eq: slug,
          },
        },
        {
          update_request_id: {
            request_status: {
              _in: CHAPTER_UPDATE_REQUEST_UPDATE_STATUSES,
            },
          },
        },
      ],
    };
    // Directus cannot evaluate relational filters as create validation (the FK
    // arrives as a plain UUID), so validation only requires the parent id.
    // Same-chapter integrity is enforced by the chapter_slug preset plus the
    // composite (update_request_id, chapter_slug) foreign key from migration
    // 016; a cross-chapter attach fails there with a 400 invalid-foreign-key.
    const updateRequestChildCreateValidation = {
      update_request_id: {
        _nnull: true,
      },
    };
    return [
      {
        policy: policyId,
        collection: collections.chapters,
        action: 'read',
        permissions: andFilter(statusFilter(EDITOR_STATUSES), chapterScope),
        validation: null,
        presets: null,
        fields: contentFields(collections.chapters, { read: true }),
      },
      {
        policy: policyId,
        collection: collections.chapters,
        action: 'update',
        permissions: andFilter(statusFilter(EDITOR_STATUSES), chapterScope),
        validation: statusFilter(EDITOR_STATUSES),
        presets: null,
        fields: contentFields(collections.chapters, { update: true }),
      },
      {
        policy: policyId,
        collection: collections.chapterInitiatives,
        action: 'read',
        permissions: andFilter(statusFilter(EDITOR_STATUSES), initiativeScope),
        validation: null,
        presets: null,
        fields: contentFields(collections.chapterInitiatives, { read: true }),
      },
      {
        policy: policyId,
        collection: collections.chapterInitiatives,
        action: 'create',
        permissions: andFilter(statusFilter(EDITOR_STATUSES), initiativeScope),
        validation: statusFilter(EDITOR_STATUSES),
        presets: { publication_status: 'draft', chapter_slug: slug },
        fields: contentCreateFields(collections.chapterInitiatives, ['chapter_slug']),
      },
      {
        policy: policyId,
        collection: collections.chapterInitiatives,
        action: 'update',
        permissions: andFilter(statusFilter(EDITOR_STATUSES), initiativeScope),
        validation: statusFilter(EDITOR_STATUSES),
        presets: null,
        fields: contentFields(collections.chapterInitiatives, { update: true }),
      },
      {
        policy: policyId,
        collection: collections.chapterUpdateRequests,
        action: 'read',
        permissions: andFilter(requestStatusFilter(CHAPTER_UPDATE_REQUEST_UPDATE_STATUSES), updateRequestScope),
        validation: null,
        presets: null,
        fields: chapterUpdateRequestFields({ read: true }),
      },
      {
        policy: policyId,
        collection: collections.chapterUpdateRequests,
        action: 'create',
        permissions: andFilter(requestStatusFilter(CHAPTER_UPDATE_REQUEST_CREATE_STATUSES), updateRequestScope),
        validation: requestStatusFilter(CHAPTER_UPDATE_REQUEST_CREATE_STATUSES),
        presets: { request_status: 'draft', chapter_slug: slug },
        fields: chapterUpdateRequestFields().filter((field) => field !== 'chapter_slug'),
      },
      {
        policy: policyId,
        collection: collections.chapterUpdateRequests,
        action: 'update',
        permissions: andFilter(requestStatusFilter(CHAPTER_UPDATE_REQUEST_UPDATE_STATUSES), updateRequestScope),
        validation: requestStatusFilter(CHAPTER_UPDATE_REQUEST_UPDATE_STATUSES),
        presets: null,
        fields: chapterUpdateRequestFields({ update: true }),
      },
      ...[collections.chapterUpdateRequestLinks, collections.chapterUpdateRequestProofSignals].filter(Boolean).flatMap((collection) => {
        const readFields = chapterUpdateRequestChildFields(collection, { read: true });
        const createFields = chapterUpdateRequestChildFields(collection);
        const updateFields = chapterUpdateRequestChildFields(collection, { update: true });
        return [
          {
            policy: policyId,
            collection,
            action: 'read',
            permissions: updateRequestChildScope,
            validation: null,
            presets: null,
            fields: readFields,
          },
          {
            policy: policyId,
            collection,
            action: 'create',
            permissions: updateRequestChildCreateScope,
            validation: updateRequestChildCreateValidation,
            presets: { chapter_slug: slug },
            fields: createFields,
          },
          {
            policy: policyId,
            collection,
            action: 'update',
            permissions: updateRequestChildScope,
            validation: null,
            presets: null,
            fields: updateFields,
          },
          {
            policy: policyId,
            collection,
            action: 'delete',
            permissions: updateRequestChildScope,
            validation: null,
            presets: null,
            fields: readFields,
          },
        ];
      }),
    ];
  }

  const guildScope = { slug: { _eq: slug } };
  const projectScope = { guild_slug: { _eq: slug } };
  return [
    {
      policy: policyId,
      collection: collections.guilds,
      action: 'read',
      permissions: andFilter(statusFilter(EDITOR_STATUSES), guildScope),
      validation: null,
      presets: null,
      fields: contentFields(collections.guilds, { read: true }),
    },
    {
      policy: policyId,
      collection: collections.guilds,
      action: 'update',
      permissions: andFilter(statusFilter(EDITOR_STATUSES), guildScope),
      validation: statusFilter(EDITOR_STATUSES),
      presets: null,
      fields: contentFields(collections.guilds, { update: true }),
    },
    {
      policy: policyId,
      collection: collections.projects,
      action: 'read',
      permissions: andFilter(statusFilter(EDITOR_STATUSES), projectScope),
      validation: null,
      presets: null,
      fields: contentFields(collections.projects, { read: true }),
    },
      {
        policy: policyId,
        collection: collections.projects,
        action: 'create',
        permissions: andFilter(statusFilter(EDITOR_STATUSES), projectScope),
        validation: statusFilter(EDITOR_STATUSES),
        presets: { publication_status: 'draft', guild_slug: slug },
        fields: contentCreateFields(collections.projects, ['guild_slug']),
      },
    {
      policy: policyId,
      collection: collections.projects,
      action: 'update',
      permissions: andFilter(statusFilter(EDITOR_STATUSES), projectScope),
      validation: statusFilter(EDITOR_STATUSES),
      presets: null,
      fields: contentFields(collections.projects, { update: true }),
    },
  ];
}

async function ensureScopedPolicyAccess(client, collections, userId: string, kind: AssignmentKind, slug: string, dryRun: boolean) {
  const policy = await upsertNamed(client, 'policies', {
    name: scopedPolicyName(kind, slug),
    icon: 'edit_note',
    description: scopedPolicyDescription(kind, slug),
    app_access: false,
    admin_access: false,
    enforce_tfa: false,
  }, dryRun);
  const policyId = policy?.id;
  if (!policyId) throw new Error(`Directus policy was not created for ${kind}:${slug}`);

  for (const permission of buildScopedPolicyPermissions(collections, kind, slug, policyId)) {
    await upsertPermission(client, permission, dryRun);
  }

  return ensureUserPolicyAccess(client, userId, policyId, dryRun);
}

export async function ensureScopedContentPolicy(client, userId: string, kind: AssignmentKind, slug: string, dryRun = false) {
  const collections = await resolveCollections(client);
  return ensureScopedPolicyAccess(client, collections, userId, kind, slug, dryRun);
}

async function assignContentAccess(assignments: AssignmentInput[], options: AssignOptions) {
  const client = await createDirectusClient();
  const collections = await resolveCollections(client);
  const stewardRoleId = await getRoleId(client, options.role);
  const operatorRoleId = await getRoleId(client, options.operatorRole);
  const prepared = [];

  for (const assignment of assignments) {
    const user = await getUserByEmail(client, assignment.email);
    const contentCollection = assignment.kind === 'chapter' ? collections.chapters : collections.guilds;
    const assignmentCollection = assignment.kind === 'chapter'
      ? collections.chapterAssignments
      : collections.guildAssignments;

    await ensureContentExists(client, contentCollection, assignment.slug, assignment.kind);
    await assertAssignmentAvailable(
      client,
      assignmentCollection,
      user.id,
      assignment.kind,
      assignment.slug
    );

    prepared.push({
      assignment,
      user,
      assignmentCollection,
    });
  }

  const results = [];
  for (const { assignment, user, assignmentCollection } of prepared) {
    const roleStatus = await ensureUserRole(client, user, stewardRoleId, operatorRoleId, options);
    const assignmentStatus = await ensureAssignment(
      client,
      assignmentCollection,
      user.id,
      assignment.kind,
      assignment.slug,
      options.dryRun
    );
    const policyStatus = await ensureScopedPolicyAccess(
      client,
      collections,
      user.id,
      assignment.kind,
      assignment.slug,
      options.dryRun
    );

    results.push({
      ...assignment,
      roleStatus,
      assignmentStatus,
      policyStatus,
    });
  }

  return {
    url: client.url,
    results,
  };
}

export async function readAssignmentsFromDirectus(client, collections): Promise<AssignmentInput[]> {
  const sources = [
    { collection: collections.chapterAssignments, kind: 'chapter' as const, ownerField: 'chapter_slug' },
    { collection: collections.guildAssignments, kind: 'guild' as const, ownerField: 'guild_slug' },
  ];
  const emailByUserId = new Map<string, string>();
  const assignments: AssignmentInput[] = [];

  for (const { collection, kind, ownerField } of sources) {
    const params = new URLSearchParams();
    params.set('fields', `${ownerField},directus_user_id`);
    params.set('limit', '-1');
    const rows = await client.request(`/items/${encodeCollection(collection)}?${params.toString()}`);

    for (const row of rows?.data ?? []) {
      const userId = cleanString(row?.directus_user_id);
      const slug = cleanString(row?.[ownerField]);
      if (!userId || !slug) continue;

      if (!emailByUserId.has(userId)) {
        const user = await client.request(`/users/${encodeURIComponent(userId)}?fields=email`)
          .catch(() => null);
        const email = cleanEmail(user?.data?.email);
        if (!email) {
          console.warn(`Skipped ${kind}:${slug} because Directus user ${userId} has no readable email.`);
          continue;
        }
        emailByUserId.set(userId, email);
      }

      assignments.push({ email: emailByUserId.get(userId)!, kind, slug });
    }
  }

  return assignments;
}

async function readSyncAssignments(): Promise<AssignmentInput[]> {
  const client = await createDirectusClient();
  const collections = await resolveCollections(client);
  return readAssignmentsFromDirectus(client, collections);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const assignments = options.command === 'sync'
    ? await readSyncAssignments()
    : parseAssignments(await readFile(options.input!, 'utf8'));

  if (options.command === 'sync') {
    console.log(`Syncing ${assignments.length} live Directus assignment(s).`);
  }

  const result = await assignContentAccess(assignments, options);

  console.log(`Directus target: ${result.url}`);
  for (const assignment of result.results) {
    console.log(
      `${assignment.assignmentStatus}: ${assignment.email} -> ${assignment.kind}:${assignment.slug} (${assignment.roleStatus}, ${assignment.policyStatus})`
    );
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
