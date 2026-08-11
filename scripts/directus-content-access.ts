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

type AssignCommand = 'assign' | 'verify' | 'cleanup-legacy';

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
// Stewards keep READ access to decided requests so review outcomes and
// reviewer notes stay visible; write access stays limited to the lists above.
const CHAPTER_UPDATE_REQUEST_READ_STATUSES = [
  'draft',
  'pending_review',
  'needs_changes',
  'accepted',
  'declined',
  'archived',
];

// Permissions v2: one role-level policy with dynamic $CURRENT_USER filters
// over the assignment junction tables replaces the per-slug snapshot
// policies. Assignment rows grant access the moment they exist and revoke it
// the moment they are deleted - no per-user policy sync.
export const ASSIGNED_EDITOR_POLICY_NAME = 'Greenpill Assigned Editor';
const ASSIGNED_CHAPTER_SLUGS = '$CURRENT_USER.chapter_editor_assignments.chapter_slug';
const ASSIGNED_GUILD_SLUGS = '$CURRENT_USER.guild_editor_assignments.guild_slug';
const LEGACY_SCOPED_POLICY_PATTERN = /^Greenpill (Chapter|Guild) Editor: /;
// Roles that must never be downgraded by assign/verify role syncing.
const PROTECTED_ROLE_NAMES = Object.freeze([
  'Administrator',
  'Greenpill Trusted Publisher',
  'Greenpill Steward Moderator',
]);

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
    'image_file',
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
    '       bun run directus:content-access -- verify [options]',
    '       bun run directus:content-access -- cleanup-legacy [options]',
    '',
    'Commands:',
    '  assign          Apply assignments from a TSV file. The junction row is the',
    '                  grant: the role-level "Greenpill Assigned Editor" policy',
    '                  (from directus:content:setup) scopes access dynamically,',
    '                  and deleting a row revokes access immediately.',
    '  verify          Read-only report: assignment rows, steward role status,',
    '                  and any leftover legacy per-slug scoped policies.',
    '                  ("sync" is accepted as a deprecated alias - the dynamic',
    '                  model has no per-user policies left to re-sync.)',
    '  cleanup-legacy  Delete legacy "Greenpill Chapter/Guild Editor: <slug>"',
    '                  policies after the dynamic model is verified.',
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
  const rawCommand = argv[0];
  const command: AssignCommand = rawCommand === 'sync' || rawCommand === 'verify'
    ? 'verify'
    : rawCommand === 'cleanup-legacy'
      ? 'cleanup-legacy'
      : 'assign';
  const args = ['assign', 'sync', 'verify', 'cleanup-legacy'].includes(rawCommand) ? argv.slice(1) : argv;
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
  if (options.command !== 'assign' && options.input) {
    throw new Error(`${options.command} reads state from Directus and does not accept --input.\n\n${usage()}`);
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
  // Tolerates absent collections (pending migrations): rows built for them
  // carry an undefined collection and are filtered out of the final plan.
  return (collection ?? '').replace(/^(content|intake)[._]/, '');
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

async function ensureUserRole(client, user: any, roleId: string, protectedRoleIds: Set<string>, options: AssignOptions) {
  const existingRoleId = typeof user.role === 'object' ? user.role?.id : user.role;
  if (!options.syncRole || existingRoleId === roleId) return 'role ok';
  if (existingRoleId && protectedRoleIds.has(existingRoleId)) return 'kept protected role';

  if (!options.dryRun) {
    await client.request(`/users/${user.id}`, {
      method: 'PATCH',
      body: { role: roleId },
    });
  }

  return options.dryRun ? 'would update role' : 'updated role';
}

async function resolveProtectedRoleIds(client, operatorRole: string): Promise<Set<string>> {
  const ids = new Set<string>();
  for (const name of new Set([operatorRole, ...PROTECTED_ROLE_NAMES])) {
    try {
      ids.add(await getRoleId(client, name));
    } catch {
      // A protected role that does not exist cannot be downgraded anyway.
    }
  }
  return ids;
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

async function listLegacyScopedPolicies(client) {
  const params = new URLSearchParams();
  params.set('fields', 'id,name');
  params.set('limit', '-1');
  const response = await client.request(`/policies?${params.toString()}`);
  return (response?.data ?? []).filter((policy) => LEGACY_SCOPED_POLICY_PATTERN.test(cleanString(policy?.name)));
}

export function buildAssignedEditorPermissions(collections) {
  const assignedChapterScope = { slug: { _in: ASSIGNED_CHAPTER_SLUGS } };
  const assignedChapterChildScope = { chapter_slug: { _in: ASSIGNED_CHAPTER_SLUGS } };
  const assignedGuildScope = { slug: { _in: ASSIGNED_GUILD_SLUGS } };
  const assignedProjectScope = { guild_slug: { _in: ASSIGNED_GUILD_SLUGS } };
  const updateRequestChildScope = {
    _and: [
      assignedChapterChildScope,
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
  // The child chapter_slug is filled server-side by the migration-027 trigger
  // from the parent request, so cross-chapter rows land outside the steward's
  // dynamic scope and stay invisible/uneditable to them.
  const updateRequestChildCreateValidation = {
    update_request_id: {
      _nnull: true,
    },
  };

  const permissions = [
    {
      policy: ASSIGNED_EDITOR_POLICY_NAME,
      collection: collections.chapters,
      action: 'read',
      permissions: andFilter(statusFilter(EDITOR_STATUSES), assignedChapterScope),
      validation: null,
      presets: null,
      fields: contentFields(collections.chapters, { read: true }),
    },
    {
      policy: ASSIGNED_EDITOR_POLICY_NAME,
      collection: collections.chapters,
      action: 'update',
      permissions: andFilter(statusFilter(EDITOR_STATUSES), assignedChapterScope),
      validation: statusFilter(EDITOR_STATUSES),
      presets: null,
      fields: contentFields(collections.chapters, { update: true }),
    },
    {
      policy: ASSIGNED_EDITOR_POLICY_NAME,
      collection: collections.chapterInitiatives,
      action: 'read',
      permissions: andFilter(statusFilter(EDITOR_STATUSES), assignedChapterChildScope),
      validation: null,
      presets: null,
      fields: contentFields(collections.chapterInitiatives, { read: true }),
    },
    {
      policy: ASSIGNED_EDITOR_POLICY_NAME,
      collection: collections.chapterInitiatives,
      action: 'create',
      permissions: andFilter(statusFilter(EDITOR_STATUSES), assignedChapterChildScope),
      // The steward picks the chapter on create; the dynamic validation only
      // accepts chapters they hold an assignment row for.
      validation: andFilter(statusFilter(EDITOR_STATUSES), assignedChapterChildScope),
      presets: { publication_status: 'draft' },
      fields: contentCreateFields(collections.chapterInitiatives),
    },
    {
      policy: ASSIGNED_EDITOR_POLICY_NAME,
      collection: collections.chapterInitiatives,
      action: 'update',
      permissions: andFilter(statusFilter(EDITOR_STATUSES), assignedChapterChildScope),
      validation: statusFilter(EDITOR_STATUSES),
      presets: null,
      fields: contentFields(collections.chapterInitiatives, { update: true }),
    },
    {
      policy: ASSIGNED_EDITOR_POLICY_NAME,
      collection: collections.chapterUpdateRequests,
      action: 'read',
      permissions: andFilter(requestStatusFilter(CHAPTER_UPDATE_REQUEST_READ_STATUSES), assignedChapterChildScope),
      validation: null,
      presets: null,
      fields: chapterUpdateRequestFields({ read: true }),
    },
    {
      policy: ASSIGNED_EDITOR_POLICY_NAME,
      collection: collections.chapterUpdateRequests,
      action: 'create',
      permissions: andFilter(requestStatusFilter(CHAPTER_UPDATE_REQUEST_CREATE_STATUSES), assignedChapterChildScope),
      validation: andFilter(requestStatusFilter(CHAPTER_UPDATE_REQUEST_CREATE_STATUSES), assignedChapterChildScope),
      presets: { request_status: 'draft' },
      fields: chapterUpdateRequestFields(),
    },
    {
      policy: ASSIGNED_EDITOR_POLICY_NAME,
      collection: collections.chapterUpdateRequests,
      action: 'update',
      permissions: andFilter(requestStatusFilter(CHAPTER_UPDATE_REQUEST_UPDATE_STATUSES), assignedChapterChildScope),
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
          policy: ASSIGNED_EDITOR_POLICY_NAME,
          collection,
          action: 'read',
          permissions: updateRequestChildScope,
          validation: null,
          presets: null,
          fields: readFields,
        },
        {
          policy: ASSIGNED_EDITOR_POLICY_NAME,
          collection,
          action: 'create',
          permissions: updateRequestChildScope,
          validation: updateRequestChildCreateValidation,
          presets: null,
          fields: createFields,
        },
        {
          policy: ASSIGNED_EDITOR_POLICY_NAME,
          collection,
          action: 'update',
          permissions: updateRequestChildScope,
          validation: null,
          presets: null,
          fields: updateFields,
        },
        {
          policy: ASSIGNED_EDITOR_POLICY_NAME,
          collection,
          action: 'delete',
          permissions: updateRequestChildScope,
          validation: null,
          presets: null,
          fields: readFields,
        },
      ];
    }),
    {
      policy: ASSIGNED_EDITOR_POLICY_NAME,
      collection: collections.guilds,
      action: 'read',
      permissions: andFilter(statusFilter(EDITOR_STATUSES), assignedGuildScope),
      validation: null,
      presets: null,
      fields: contentFields(collections.guilds, { read: true }),
    },
    {
      policy: ASSIGNED_EDITOR_POLICY_NAME,
      collection: collections.guilds,
      action: 'update',
      permissions: andFilter(statusFilter(EDITOR_STATUSES), assignedGuildScope),
      validation: statusFilter(EDITOR_STATUSES),
      presets: null,
      fields: contentFields(collections.guilds, { update: true }),
    },
    {
      policy: ASSIGNED_EDITOR_POLICY_NAME,
      collection: collections.projects,
      action: 'read',
      permissions: andFilter(statusFilter(EDITOR_STATUSES), assignedProjectScope),
      validation: null,
      presets: null,
      fields: contentFields(collections.projects, { read: true }),
    },
    {
      policy: ASSIGNED_EDITOR_POLICY_NAME,
      collection: collections.projects,
      action: 'create',
      permissions: andFilter(statusFilter(EDITOR_STATUSES), assignedProjectScope),
      validation: andFilter(statusFilter(EDITOR_STATUSES), assignedProjectScope),
      presets: { publication_status: 'draft' },
      fields: contentCreateFields(collections.projects),
    },
    {
      policy: ASSIGNED_EDITOR_POLICY_NAME,
      collection: collections.projects,
      action: 'update',
      permissions: andFilter(statusFilter(EDITOR_STATUSES), assignedProjectScope),
      validation: statusFilter(EDITOR_STATUSES),
      presets: null,
      fields: contentFields(collections.projects, { update: true }),
    },
  ];

  return permissions.filter((permission) => Boolean(permission.collection));
}

async function assignContentAccess(assignments: AssignmentInput[], options: AssignOptions) {
  const client = await createDirectusClient();
  const collections = await resolveCollections(client);
  const stewardRoleId = await getRoleId(client, options.role);
  const protectedRoleIds = await resolveProtectedRoleIds(client, options.operatorRole);
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
    const roleStatus = await ensureUserRole(client, user, stewardRoleId, protectedRoleIds, options);
    // Permissions v2: the assignment row IS the grant. The role-level
    // "Greenpill Assigned Editor" policy (applied by directus:content:setup)
    // scopes access dynamically via $CURRENT_USER, so no per-user policy is
    // created and deleting the row revokes access immediately.
    const assignmentStatus = await ensureAssignment(
      client,
      assignmentCollection,
      user.id,
      assignment.kind,
      assignment.slug,
      options.dryRun
    );

    results.push({
      ...assignment,
      roleStatus,
      assignmentStatus,
    });
  }

  return {
    url: client.url,
    results,
  };
}

export interface VerifyReport {
  url: string;
  assignments: number;
  usersOnStewardRole: number;
  usersOnProtectedRole: number;
  usersOnUnexpectedRole: Array<{ email: string; role: string }>;
  legacyScopedPolicies: string[];
}

async function verifyContentAccess(options: AssignOptions): Promise<VerifyReport> {
  const client = await createDirectusClient();
  const collections = await resolveCollections(client);
  const assignments = await readAssignmentsFromDirectus(client, collections);
  const stewardRoleId = await getRoleId(client, options.role);
  const protectedRoleIds = await resolveProtectedRoleIds(client, options.operatorRole);

  let usersOnStewardRole = 0;
  let usersOnProtectedRole = 0;
  const usersOnUnexpectedRole: Array<{ email: string; role: string }> = [];
  const checkedEmails = new Set<string>();
  for (const assignment of assignments) {
    if (checkedEmails.has(assignment.email)) continue;
    checkedEmails.add(assignment.email);
    const user = await getUserByEmail(client, assignment.email);
    const roleId = typeof user.role === 'object' ? user.role?.id : user.role;
    if (roleId === stewardRoleId) usersOnStewardRole += 1;
    else if (roleId && protectedRoleIds.has(roleId)) usersOnProtectedRole += 1;
    else usersOnUnexpectedRole.push({ email: assignment.email, role: String(roleId ?? 'none') });
  }

  const legacyScopedPolicies = (await listLegacyScopedPolicies(client)).map((policy) => policy.name);

  return {
    url: client.url,
    assignments: assignments.length,
    usersOnStewardRole,
    usersOnProtectedRole,
    usersOnUnexpectedRole,
    legacyScopedPolicies,
  };
}

async function cleanupLegacyScopedPolicies(options: AssignOptions) {
  const client = await createDirectusClient();
  const legacy = await listLegacyScopedPolicies(client);
  const removed: string[] = [];

  for (const policy of legacy) {
    if (!options.dryRun) {
      await client.request(`/policies/${policy.id}`, {
        method: 'DELETE',
        expected: [204],
      });
    }
    removed.push(policy.name);
  }

  return { url: client.url, removed, dryRun: options.dryRun };
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

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.command === 'verify') {
    const report = await verifyContentAccess(options);
    console.log(`Directus target: ${report.url}`);
    console.log(`Assignment rows: ${report.assignments}`);
    console.log(`Assigned users on steward role: ${report.usersOnStewardRole}`);
    console.log(`Assigned users on protected roles: ${report.usersOnProtectedRole}`);
    for (const user of report.usersOnUnexpectedRole) {
      console.warn(`Unexpected role for ${user.email}: ${user.role}`);
    }
    if (report.legacyScopedPolicies.length > 0) {
      console.warn(
        `Legacy scoped policies still present (${report.legacyScopedPolicies.length}): ` +
        `${report.legacyScopedPolicies.join(', ')}. ` +
        'Run "cleanup-legacy" after verifying dynamic access with directus:steward:smoke.'
      );
    } else {
      console.log('No legacy scoped policies remain.');
    }
    return;
  }

  if (options.command === 'cleanup-legacy') {
    const result = await cleanupLegacyScopedPolicies(options);
    console.log(`Directus target: ${result.url}`);
    if (result.removed.length === 0) {
      console.log('No legacy scoped policies to remove.');
    }
    for (const name of result.removed) {
      console.log(`${result.dryRun ? 'Would remove' : 'Removed'} legacy policy: ${name}`);
    }
    return;
  }

  const assignments = parseAssignments(await readFile(options.input!, 'utf8'));
  const result = await assignContentAccess(assignments, options);

  console.log(`Directus target: ${result.url}`);
  for (const assignment of result.results) {
    console.log(
      `${assignment.assignmentStatus}: ${assignment.email} -> ${assignment.kind}:${assignment.slug} (${assignment.roleStatus})`
    );
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
