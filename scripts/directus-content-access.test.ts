import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  assertAssignmentAvailable,
  buildScopedPolicyPermissions,
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

test('parseArgs supports sync without a TSV input', () => {
  const options = parseArgs(['sync']);

  assert.equal(options.command, 'sync');
  assert.equal(options.input, undefined);
  assert.equal(options.role, 'Greenpill Steward Editor');

  assert.throws(() => parseArgs(['assign']), /Missing --input/);
  assert.throws(() => parseArgs(['sync', '--input', '/tmp/access.tsv']), /does not accept --input/);
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

test('scoped chapter and guild policies use static parent filters', () => {
  const collections = {
    chapters: 'chapters',
    chapterInitiatives: 'chapter_initiatives',
    chapterUpdateRequests: 'chapter_update_requests',
    chapterUpdateRequestLinks: 'chapter_update_request_links',
    chapterUpdateRequestProofSignals: 'chapter_update_request_proof_signals',
    guilds: 'guilds',
    projects: 'projects',
  };
  const chapterPermissions = buildScopedPolicyPermissions(collections, 'chapter', 'brasil', 'policy-chapter');
  const guildPermissions = buildScopedPolicyPermissions(collections, 'guild', 'dev-guild', 'policy-guild');

  const chapterUpdate = chapterPermissions.find(
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
          _eq: 'brasil',
        },
      },
    ],
  });
  assert.equal(chapterUpdate?.fields.includes('slug'), false);
  assert.deepEqual(chapterUpdate?.validation, {
    publication_status: {
      _in: ['draft', 'pending_review', 'published'],
    },
  });

  const chapterRead = chapterPermissions.find(
    (permission) => permission.collection === 'chapters' && permission.action === 'read'
  );
  assert.equal(
    ((chapterRead?.permissions as any)._and[0].publication_status._in as string[]).includes('published'),
    true
  );

  const initiativeCreate = chapterPermissions.find(
    (permission) => permission.collection === 'chapter_initiatives' && permission.action === 'create'
  );
  assert.deepEqual((initiativeCreate?.permissions as any)._and[1], {
    chapter_slug: {
      _eq: 'brasil',
    },
  });
  assert.equal(initiativeCreate?.fields.includes('chapter_slug'), false);
  assert.deepEqual(initiativeCreate?.presets, {
    publication_status: 'draft',
    chapter_slug: 'brasil',
  });
  assert.deepEqual(initiativeCreate?.validation, {
    publication_status: {
      _in: ['draft', 'pending_review', 'published'],
    },
  });

  const initiativeUpdate = chapterPermissions.find(
    (permission) => permission.collection === 'chapter_initiatives' && permission.action === 'update'
  );
  assert.equal(initiativeUpdate?.fields.includes('chapter_slug'), false);
  assert.deepEqual(initiativeUpdate?.validation, {
    publication_status: {
      _in: ['draft', 'pending_review', 'published'],
    },
  });

  const updateRequestCreate = chapterPermissions.find(
    (permission) => permission.collection === 'chapter_update_requests' && permission.action === 'create'
  );
  assert.deepEqual((updateRequestCreate?.permissions as any)._and[1], {
    chapter_slug: {
      _eq: 'brasil',
    },
  });
  assert.equal(updateRequestCreate?.fields.includes('chapter_slug'), false);
  assert.deepEqual(updateRequestCreate?.presets, {
    request_status: 'draft',
    chapter_slug: 'brasil',
  });
  assert.deepEqual(updateRequestCreate?.validation, {
    request_status: {
      _in: ['draft', 'pending_review'],
    },
  });

  const updateRequestUpdate = chapterPermissions.find(
    (permission) => permission.collection === 'chapter_update_requests' && permission.action === 'update'
  );
  assert.equal(updateRequestUpdate?.fields.includes('chapter_slug'), false);
  assert.deepEqual(updateRequestUpdate?.validation, {
    request_status: {
      _in: ['draft', 'pending_review', 'needs_changes'],
    },
  });

  const updateRequestLinkCreate = chapterPermissions.find(
    (permission) => permission.collection === 'chapter_update_request_links' && permission.action === 'create'
  );
  assert.deepEqual(updateRequestLinkCreate?.permissions, {
    _and: [
      {
        chapter_slug: {
          _eq: 'brasil',
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
  assert.deepEqual(updateRequestLinkCreate?.presets, {
    chapter_slug: 'brasil',
  });
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

  const updateRequestProofSignalUpdate = chapterPermissions.find(
    (permission) => (
      permission.collection === 'chapter_update_request_proof_signals' &&
      permission.action === 'update'
    )
  );
  assert.deepEqual(updateRequestProofSignalUpdate?.permissions, {
    _and: [
      {
        chapter_slug: {
          _eq: 'brasil',
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
  assert.equal(updateRequestProofSignalUpdate?.validation, null);
  assert.equal(updateRequestProofSignalUpdate?.fields.includes('chapter_slug'), false);
  assert.equal(updateRequestProofSignalUpdate?.fields.includes('update_request_id'), false);

  const projectCreate = guildPermissions.find(
    (permission) => permission.collection === 'projects' && permission.action === 'create'
  );
  assert.deepEqual((projectCreate?.permissions as any)._and[1], {
    guild_slug: {
      _eq: 'dev-guild',
    },
  });
  assert.equal(projectCreate?.fields.includes('guild_slug'), false);
  assert.deepEqual(projectCreate?.presets, {
    publication_status: 'draft',
    guild_slug: 'dev-guild',
  });
  assert.deepEqual(projectCreate?.validation, {
    publication_status: {
      _in: ['draft', 'pending_review', 'published'],
    },
  });

  const projectUpdate = guildPermissions.find(
    (permission) => permission.collection === 'projects' && permission.action === 'update'
  );
  assert.equal(projectUpdate?.fields.includes('guild_slug'), false);
  assert.deepEqual(projectUpdate?.validation, {
    publication_status: {
      _in: ['draft', 'pending_review', 'published'],
    },
  });
});
