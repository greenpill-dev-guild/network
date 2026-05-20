#!/usr/bin/env bun

import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import {
  DIRECTUS_STEWARD_ACCESS_COLLECTIONS,
  createDirectusClient,
} from './directus-operational-content-setup.ts';

type AssignmentKind = 'chapter' | 'guild';

type AssignmentInput = {
  email: string;
  kind: AssignmentKind;
  slug: string;
};

type AssignOptions = {
  input?: string;
  role: string;
  operatorRole: string;
  dryRun: boolean;
  syncRole: boolean;
};

const DEFAULT_STEWARD_ROLE = 'Greenpill Steward Editor';
const DEFAULT_OPERATOR_ROLE = 'Greenpill Operator';
const EDITOR_STATUSES = ['draft', 'pending_review'];

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

const statusFilter = (statuses) => ({
  publication_status: {
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
  const args = argv[0] === 'assign' ? argv.slice(1) : argv;
  const options: AssignOptions = {
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

  if (!options.input) {
    throw new Error(`Missing --input.\n\n${usage()}`);
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

  return {
    chapters: resolveSchemaCollectionName(available, 'content', 'chapters'),
    chapterInitiatives: resolveSchemaCollectionName(available, 'content', 'chapter_initiatives'),
    guilds: resolveSchemaCollectionName(available, 'content', 'guilds'),
    projects: resolveSchemaCollectionName(available, 'content', 'projects'),
    chapterAssignments: accessCollections.get('chapter_editor_assignments')!,
    guildAssignments: accessCollections.get('guild_editor_assignments')!,
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

async function ensureAssignment(client, collection: string, userId: string, kind: AssignmentKind, slug: string, dryRun: boolean) {
  const ownerField = kind === 'chapter' ? 'chapter_slug' : 'guild_slug';
  const params = new URLSearchParams();
  params.set(`filter[${ownerField}][_eq]`, slug);
  params.set('filter[directus_user_id][_eq]', userId);
  params.set('fields', 'id');
  params.set('limit', '1');

  const existing = await client.request(`/items/${encodeCollection(collection)}?${params.toString()}`);
  if (existing?.data?.[0]?.id) return 'already assigned';

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
  const results = [];

  for (const assignment of assignments) {
    const user = await getUserByEmail(client, assignment.email);
    const roleStatus = await ensureUserRole(client, user, stewardRoleId, operatorRoleId, options);
    const contentCollection = assignment.kind === 'chapter' ? collections.chapters : collections.guilds;
    const assignmentCollection = assignment.kind === 'chapter'
      ? collections.chapterAssignments
      : collections.guildAssignments;

    await ensureContentExists(client, contentCollection, assignment.slug, assignment.kind);
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

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const assignments = parseAssignments(await readFile(options.input!, 'utf8'));
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
