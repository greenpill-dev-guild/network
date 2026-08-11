import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  ASSIGNED_EDITOR_POLICY_NAME,
  assertAssignmentAvailable,
  buildAssignedEditorPermissions,
  parseArgs,
  parseAssignments,
  readAssignmentsFromDirectus,
} from './directus-content-access.ts';
import {
  buildDirectusOperationalPermissionPlan,
  resolveSchemaCollectionNames,
} from './directus-operational-content-setup.ts';

test('parseAssignments reads chapter and guild assignment TSV rows', () => {
  const assignments = parseAssignments([
    'email\tkind\tslug',
    'alwynvanwyk@gmail.com\tchapter\tcape-town',
    'kitblake@infrae.com\tguild\tdev-guild',
  ].join('\n'));

  assert.deepEqual(assignments, [
    {
      email: 'alwynvanwyk@gmail.com',
      kind: 'chapter',
      slug: 'cape-town',
    },
    {
      email: 'kitblake@infrae.com',
      kind: 'guild',
      slug: 'dev-guild',
    },
  ]);
});

test('parseAssignments rejects invalid kinds and duplicate rows', () => {
  assert.throws(
    () => parseAssignments('afo@example.com\tproject\tgreen-goods'),
    /Invalid assignment kind/
  );

  assert.throws(
    () => parseAssignments('afo@example.com\tchapter\tnigeria\nafo@example.com\tchapter\tnigeria'),
    /Duplicate assignment/
  );

  assert.throws(
    () => parseAssignments('afo@example.com\tchapter\tnigeria\nafo@example.com\tchapter\tkenya'),
    /can only be assigned to one chapter/
  );
});

test('chapter assignment preflight rejects a different existing chapter', async () => {
  const client = {
    async request() {
      return { data: [{ id: 'assignment-1', chapter_slug: 'nigeria' }] };
    },
  };

  await assert.rejects(
    () => assertAssignmentAvailable(client, 'chapter_editor_assignments', 'user-1', 'chapter', 'kenya'),
    /already has a chapter assignment/
  );
});

test('parseArgs defaults to role sync with dry-run support', () => {
  const options = parseArgs(['assign', '--input', '/tmp/access.tsv', '--dry-run']);

  assert.equal(options.command, 'assign');
  assert.equal(options.input, '/tmp/access.tsv');
  assert.equal(options.role, 'Greenpill Steward Editor');
  assert.equal(options.operatorRole, 'Greenpill Operator');
  assert.equal(options.syncRole, true);
  assert.equal(options.dryRun, true);
});

test('parseArgs maps verify/sync/cleanup-legacy commands without TSV input', () => {
  const verify = parseArgs(['verify']);
  assert.equal(verify.command, 'verify');
  assert.equal(verify.input, undefined);
  assert.equal(verify.role, 'Greenpill Steward Editor');

  // Deprecated alias: sync now verifies (the dynamic model has no per-user
  // policies left to re-sync).
  assert.equal(parseArgs(['sync']).command, 'verify');
  assert.equal(parseArgs(['cleanup-legacy', '--dry-run']).command, 'cleanup-legacy');

  assert.throws(() => parseArgs(['assign']), /Missing --input/);
  assert.throws(() => parseArgs(['verify', '--input', '/tmp/access.tsv']), /does not accept --input/);
});

test('readAssignmentsFromDirectus derives assignments from live Directus rows', async () => {
  const client = {
    async request(path: string) {
      if (path.startsWith('/items/chapter_editor_assignments')) {
        return {
          data: [
            { chapter_slug: 'greensofa', directus_user_id: 'user-1' },
            { chapter_slug: 'nigeria', directus_user_id: 'user-2' },
            { chapter_slug: '', directus_user_id: 'user-3' },
          ],
        };
      }
      if (path.startsWith('/items/guild_editor_assignments')) {
        return { data: [{ guild_slug: 'dev-guild', directus_user_id: 'user-1' }] };
      }
      if (path.startsWith('/users/user-1')) return { data: { email: 'Steward.One@example.com' } };
      if (path.startsWith('/users/user-2')) return { data: { email: 'steward.two@example.com' } };
      throw new Error(`unexpected request: ${path}`);
    },
  };

  const assignments = await readAssignmentsFromDirectus(client, {
    chapterAssignments: 'chapter_editor_assignments',
    guildAssignments: 'guild_editor_assignments',
  });

  assert.deepEqual(assignments, [
    { email: 'steward.one@example.com', kind: 'chapter', slug: 'greensofa' },
    { email: 'steward.two@example.com', kind: 'chapter', slug: 'nigeria' },
    { email: 'steward.one@example.com', kind: 'guild', slug: 'dev-guild' },
  ]);
});

test('collection resolution skips a single pending collection but fails on a bad search path', () => {
  const available = ['intake.map_node_submissions', 'intake.map_node_reviews'];

  assert.deepEqual(
    resolveSchemaCollectionNames(available, 'intake', [
      'map_node_submissions',
      'map_node_moderation_access_links',
      'map_node_reviews',
    ]),
    ['intake.map_node_submissions', 'intake.map_node_reviews']
  );

  assert.throws(
    () => resolveSchemaCollectionNames(['content.chapters'], 'intake', ['map_node_submissions']),
    /No Directus collections resolved for schema "intake"/
  );
});

test('operational permission plan keeps base steward role read-only for operational content', () => {
  const plan = buildDirectusOperationalPermissionPlan(
    ['themes', 'people', 'chapters', 'chapter_initiatives', 'guilds', 'projects'],
    [],
    ['chapter_editor_assignments', 'guild_editor_assignments'],
    [
      'chapter_update_requests',
      'chapter_update_request_links',
      'chapter_update_request_proof_signals',
    ]
  );

  const stewardPermissions = plan.permissions.filter((permission) => permission.policy === 'Greenpill Steward Editor');
  assert.equal(stewardPermissions.some((permission) => permission.collection === 'people' && permission.action === 'update'), false);
  assert.equal(stewardPermissions.some((permission) => permission.collection === 'themes' && permission.action === 'create'), false);
  assert.equal(stewardPermissions.some((permission) => permission.collection === 'chapters' && permission.action === 'create'), false);
  assert.equal(stewardPermissions.some((permission) => permission.collection === 'chapters' && permission.action === 'update'), false);
  assert.equal(stewardPermissions.some((permission) => permission.collection === 'chapter_initiatives' && permission.action === 'create'), false);
  const stewardFileCreate = stewardPermissions.find(
    (permission) => permission.collection === 'directus_files' && permission.action === 'create'
  );
  const publicFileRead = plan.permissions.find(
    (permission) => permission.policy === '$t:public_label' &&
      permission.collection === 'directus_files' &&
      permission.action === 'read'
  );
  assert.deepEqual(stewardFileCreate?.validation, {
    _and: [
      { folder: { _eq: 'bd3c5b2d-8b70-4ee1-b8a8-bb78c36c928d' } },
      { type: { _in: ['image/avif', 'image/gif', 'image/jpeg', 'image/png', 'image/webp'] } },
    ],
  });
  assert.deepEqual(publicFileRead?.permissions, {
    _and: [
      { folder: { _eq: 'bd3c5b2d-8b70-4ee1-b8a8-bb78c36c928d' } },
      {
        published_chapter_image: {
          _some: {
            publication_status: { _eq: 'published' },
          },
        },
      },
    ],
  });
  assert.equal(publicFileRead?.fields.includes('uploaded_by'), false);

  const currentUserContext = stewardPermissions.find(
    (permission) => permission.collection === 'directus_users' && permission.action === 'read'
  );
  assert.deepEqual(currentUserContext?.permissions, {
    id: {
      _eq: '$CURRENT_USER',
    },
  });
  assert.deepEqual(currentUserContext?.fields, [
    'id',
    'email',
    'chapter_editor_assignments',
    'guild_editor_assignments',
  ]);

  const publisherRequestReview = plan.permissions.find(
    (permission) => permission.collection === 'chapter_update_requests' &&
      permission.action === 'update' &&
      permission.policy === 'Greenpill Trusted Publisher'
  );
  const publisherRequestCreate = plan.permissions.find(
    (permission) => permission.collection === 'chapter_update_requests' &&
      permission.action === 'create' &&
      permission.policy === 'Greenpill Trusted Publisher'
  );
  assert.deepEqual(publisherRequestCreate?.validation, {
    request_status: {
      _in: ['draft', 'pending_review'],
    },
  });
  assert.deepEqual(publisherRequestReview?.validation, {
    request_status: {
      _in: ['draft', 'pending_review', 'needs_changes', 'accepted', 'declined', 'archived'],
    },
  });

  const publisherLinkCreate = plan.permissions.find(
    (permission) => permission.collection === 'chapter_update_request_links' &&
      permission.action === 'create' &&
      permission.policy === 'Greenpill Trusted Publisher'
  );
  const publisherProofSignalDelete = plan.permissions.find(
    (permission) => permission.collection === 'chapter_update_request_proof_signals' &&
      permission.action === 'delete' &&
      permission.policy === 'Greenpill Trusted Publisher'
  );
  assert.deepEqual(publisherLinkCreate?.fields, [
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
  ]);
  assert.deepEqual(publisherProofSignalDelete?.fields, [
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
  ]);
});

test('assigned editor policy scopes every collection with dynamic $CURRENT_USER filters', () => {
  const collections = {
    chapters: 'chapters',
    chapterInitiatives: 'chapter_initiatives',
    chapterUpdateRequests: 'chapter_update_requests',
    chapterUpdateRequestLinks: 'chapter_update_request_links',
    chapterUpdateRequestProofSignals: 'chapter_update_request_proof_signals',
    guilds: 'guilds',
    projects: 'projects',
  };
  const permissions = buildAssignedEditorPermissions(collections);
  const assignedChapters = '$CURRENT_USER.chapter_editor_assignments.chapter_slug';
  const assignedGuilds = '$CURRENT_USER.guild_editor_assignments.guild_slug';

  assert.equal(permissions.every((permission) => permission.policy === ASSIGNED_EDITOR_POLICY_NAME), true);
  // Static slug literals are what made scoped policies go stale; none survive.
  assert.equal(JSON.stringify(permissions).includes('"_eq":"brasil"'), false);

  const chapterUpdate = permissions.find(
    (permission) => permission.collection === 'chapters' && permission.action === 'update'
  );
  assert.deepEqual(chapterUpdate?.permissions, {
    _and: [
      {
        publication_status: {
          _in: ['draft', 'pending_review', 'published'],
        },
      },
      {
        slug: {
          _in: assignedChapters,
        },
      },
    ],
  });
  assert.equal(chapterUpdate?.fields.includes('slug'), false);
  assert.equal(chapterUpdate?.fields.includes('image_file'), true);
  assert.deepEqual(chapterUpdate?.validation, {
    publication_status: {
      _in: ['draft', 'pending_review', 'published'],
    },
  });

  const initiativeCreate = permissions.find(
    (permission) => permission.collection === 'chapter_initiatives' && permission.action === 'create'
  );
  // No per-slug preset: the steward picks the chapter and the dynamic
  // validation only accepts assigned chapters.
  assert.equal(initiativeCreate?.fields.includes('chapter_slug'), true);
  assert.deepEqual(initiativeCreate?.presets, { publication_status: 'draft' });
  assert.deepEqual(initiativeCreate?.validation, {
    _and: [
      { publication_status: { _in: ['draft', 'pending_review', 'published'] } },
      { chapter_slug: { _in: assignedChapters } },
    ],
  });

  const updateRequestRead = permissions.find(
    (permission) => permission.collection === 'chapter_update_requests' && permission.action === 'read'
  );
  // Decided requests stay readable so review outcomes are visible to stewards.
  assert.deepEqual((updateRequestRead?.permissions as any)._and[0], {
    request_status: {
      _in: ['draft', 'pending_review', 'needs_changes', 'accepted', 'declined', 'archived'],
    },
  });
  assert.equal(updateRequestRead?.fields.includes('reviewer_notes'), true);

  const updateRequestCreate = permissions.find(
    (permission) => permission.collection === 'chapter_update_requests' && permission.action === 'create'
  );
  assert.equal(updateRequestCreate?.fields.includes('chapter_slug'), true);
  assert.deepEqual(updateRequestCreate?.presets, { request_status: 'draft' });
  assert.deepEqual(updateRequestCreate?.validation, {
    _and: [
      { request_status: { _in: ['draft', 'pending_review'] } },
      { chapter_slug: { _in: assignedChapters } },
    ],
  });

  const updateRequestUpdate = permissions.find(
    (permission) => permission.collection === 'chapter_update_requests' && permission.action === 'update'
  );
  assert.equal(updateRequestUpdate?.fields.includes('chapter_slug'), false);
  assert.deepEqual(updateRequestUpdate?.validation, {
    request_status: {
      _in: ['draft', 'pending_review', 'needs_changes'],
    },
  });

  const updateRequestLinkCreate = permissions.find(
    (permission) => permission.collection === 'chapter_update_request_links' && permission.action === 'create'
  );
  assert.deepEqual(updateRequestLinkCreate?.permissions, {
    _and: [
      {
        chapter_slug: {
          _in: assignedChapters,
        },
      },
      {
        update_request_id: {
          request_status: {
            _in: ['draft', 'pending_review', 'needs_changes'],
          },
        },
      },
    ],
  });
  assert.deepEqual(updateRequestLinkCreate?.validation, {
    update_request_id: {
      _nnull: true,
    },
  });
  // chapter_slug is filled by the migration-027 trigger, not a preset.
  assert.equal(updateRequestLinkCreate?.presets, null);
  assert.deepEqual(updateRequestLinkCreate?.fields, [
    'update_request_id',
    'sort_order',
    'label',
    'url',
    'subtext',
    'handle',
    'action',
    'icon',
    'kind',
  ]);

  const proofSignalUpdate = permissions.find(
    (permission) => (
      permission.collection === 'chapter_update_request_proof_signals' &&
      permission.action === 'update'
    )
  );
  assert.equal(proofSignalUpdate?.validation, null);
  assert.equal(proofSignalUpdate?.fields.includes('chapter_slug'), false);
  assert.equal(proofSignalUpdate?.fields.includes('update_request_id'), false);

  const guildUpdate = permissions.find(
    (permission) => permission.collection === 'guilds' && permission.action === 'update'
  );
  assert.deepEqual((guildUpdate?.permissions as any)._and[1], {
    slug: {
      _in: assignedGuilds,
    },
  });

  const projectCreate = permissions.find(
    (permission) => permission.collection === 'projects' && permission.action === 'create'
  );
  assert.equal(projectCreate?.fields.includes('guild_slug'), true);
  assert.deepEqual(projectCreate?.presets, { publication_status: 'draft' });
  assert.deepEqual(projectCreate?.validation, {
    _and: [
      { publication_status: { _in: ['draft', 'pending_review', 'published'] } },
      { guild_slug: { _in: assignedGuilds } },
    ],
  });
});

test('operational permission plan carries the assigned editor policy on the steward role', () => {
  const plan = buildDirectusOperationalPermissionPlan(
    ['themes', 'people', 'chapters', 'chapter_initiatives', 'guilds', 'projects'],
    [],
    ['chapter_editor_assignments', 'guild_editor_assignments'],
    [
      'chapter_update_requests',
      'chapter_update_request_links',
      'chapter_update_request_proof_signals',
    ]
  );

  assert.equal(plan.policies.some((policy) => policy.name === ASSIGNED_EDITOR_POLICY_NAME), true);
  assert.deepEqual(plan.rolePolicyAttachments, [
    { role: 'Greenpill Steward Editor', policy: ASSIGNED_EDITOR_POLICY_NAME },
  ]);

  const assignedPermissions = plan.permissions.filter(
    (permission) => permission.policy === ASSIGNED_EDITOR_POLICY_NAME
  );
  assert.equal(assignedPermissions.length, 21);
  assert.equal(
    assignedPermissions.some((permission) => permission.collection === 'chapters' && permission.action === 'update'),
    true
  );
  // A missing workflow collection (pending migration) drops only its rows.
  const planWithoutWorkflow = buildDirectusOperationalPermissionPlan(
    ['themes', 'people', 'chapters', 'chapter_initiatives', 'guilds', 'projects'],
    [],
    ['chapter_editor_assignments', 'guild_editor_assignments'],
    []
  );
  const assignedWithoutWorkflow = planWithoutWorkflow.permissions.filter(
    (permission) => permission.policy === ASSIGNED_EDITOR_POLICY_NAME
  );
  assert.equal(assignedWithoutWorkflow.length, 10);
});
