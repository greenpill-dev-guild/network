import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildScopedPolicyPermissions, parseArgs, parseAssignments } from './directus-content-access.ts';
import { buildDirectusOperationalPermissionPlan } from './directus-operational-content-setup.ts';

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
});

test('parseArgs defaults to role sync with dry-run support', () => {
  const options = parseArgs(['assign', '--input', '/tmp/access.tsv', '--dry-run']);

  assert.equal(options.input, '/tmp/access.tsv');
  assert.equal(options.role, 'Greenpill Steward Editor');
  assert.equal(options.operatorRole, 'Greenpill Operator');
  assert.equal(options.syncRole, true);
  assert.equal(options.dryRun, true);
});

test('operational permission plan keeps base steward role read-only for operational content', () => {
  const plan = buildDirectusOperationalPermissionPlan(
    ['themes', 'people', 'chapters', 'chapter_initiatives', 'guilds', 'projects'],
    [],
    ['chapter_editor_assignments', 'guild_editor_assignments']
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
});

test('scoped chapter and guild policies use static parent filters', () => {
  const collections = {
    chapters: 'chapters',
    chapterInitiatives: 'chapter_initiatives',
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
          _in: ['draft', 'pending_review'],
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
      _in: ['draft', 'pending_review'],
    },
  });

  const initiativeCreate = chapterPermissions.find(
    (permission) => permission.collection === 'chapter_initiatives' && permission.action === 'create'
  );
  assert.deepEqual(initiativeCreate?.permissions._and[1], {
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
      _in: ['draft', 'pending_review'],
    },
  });

  const initiativeUpdate = chapterPermissions.find(
    (permission) => permission.collection === 'chapter_initiatives' && permission.action === 'update'
  );
  assert.equal(initiativeUpdate?.fields.includes('chapter_slug'), false);
  assert.deepEqual(initiativeUpdate?.validation, {
    publication_status: {
      _in: ['draft', 'pending_review'],
    },
  });

  const projectCreate = guildPermissions.find(
    (permission) => permission.collection === 'projects' && permission.action === 'create'
  );
  assert.deepEqual(projectCreate?.permissions._and[1], {
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
      _in: ['draft', 'pending_review'],
    },
  });

  const projectUpdate = guildPermissions.find(
    (permission) => permission.collection === 'projects' && permission.action === 'update'
  );
  assert.equal(projectUpdate?.fields.includes('guild_slug'), false);
  assert.deepEqual(projectUpdate?.validation, {
    publication_status: {
      _in: ['draft', 'pending_review'],
    },
  });
});
