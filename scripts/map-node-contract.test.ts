import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { test } from 'node:test';
import {
  containsPrivateMapNodeField,
  derivePublicBioregionFromCoordinates,
  lookupPublicBioregionFromCoordinates,
  EDITABLE_MAP_NODE_UPDATE_FIELDS,
  normalizePublicMapThemeSlugs,
  PRIVATE_MAP_NODE_FIELDS,
  toEditablePublicMapNode,
  toPublicMapNode,
} from '@greenpill-network/shared/map-nodes';
import {
  loadLocalPendingNodes as loadStoredLocalPendingNodes,
  localPendingNodeSignature as storedLocalPendingNodeSignature,
  reconcileLocalPendingNodes as reconcileStoredLocalPendingNodes,
  removeLocalPendingNode as removeStoredLocalPendingNode,
  saveLocalPendingNode as saveStoredLocalPendingNode,
} from '@greenpill-network/shared/map-node-storage';
import {
  assertPublicMapStatePayload,
  containsPrivateMapStateField,
  PUBLIC_MAP_THEMES,
  toPublicAggregateCountsPayload,
  toPublicMapStatePayload,
} from '@greenpill-network/shared/map-state';

class MemoryStorage {
  #values = new Map();

  getItem(key) {
    return this.#values.get(key) ?? null;
  }

  setItem(key, value) {
    this.#values.set(key, String(value));
  }
}

class FlakyStorage {
  #values = new Map();

  blocked = false;

  getItem(key) {
    return this.#values.get(key) ?? null;
  }

  setItem(key, value) {
    if (this.blocked) throw new Error('storage unavailable');
    this.#values.set(key, String(value));
  }
}

async function readPublicContentSeedFixture() {
  const raw = await readFile(new URL('../packages/agent/fixtures/public-content-seed.json', import.meta.url), 'utf8');
  return JSON.parse(raw);
}

test('approved public projection removes private submission fields', () => {
  const publicNode = toPublicMapNode({
    id: 'node-1',
    status: 'approved',
    displayName: 'Afo',
    placeName: 'Oakland',
    city: 'Oakland',
    country: 'United States',
    lat: 37.8044,
    long: -122.2712,
    intent: 'starting a chapter',
    themes: ['local-regeneration'],
    publicNote: 'Interested in local regen work.',
    email: 'private@example.com',
    rawNote: 'private context',
    reviewNotes: 'steward only',
    ipAddress: '127.0.0.1',
  });

  assert.equal(publicNode.status, 'approved');
  assert.equal(publicNode.name, 'Afo');
  assert.equal(publicNode.bioregion, 'California interior chaparral and woodlands');
  assert.equal(publicNode.bioregionId, '423');
  assert.equal(publicNode.bioregionSource, 'resolve-ecoregions-2017');
  assert.equal(containsPrivateMapNodeField(publicNode), false);
  for (const field of PRIVATE_MAP_NODE_FIELDS) {
    assert.equal(Object.hasOwn(publicNode, field), false);
  }
});

test('public map theme normalization keeps legacy slugs compatible', () => {
  assert.deepEqual(
    normalizePublicMapThemeSlugs([
      'currency',
      'mutual',
      'opensource',
      'open-source',
      'coordination-tools',
      'knowledge-commons',
      'local-regeneration',
      'public-goods',
    ]),
    ['mutual', 'opensrc', 'education', 'trees', 'public']
  );
});

test('pending submissions do not project to the public map', () => {
  const publicNode = toPublicMapNode({
    id: 'node-2',
    status: 'pending',
    displayName: 'Pending Person',
    placeName: 'Lisbon',
    lat: 38.7223,
    long: -9.1393,
  });

  assert.equal(publicNode, null);
});

test('owner edit-session projection exposes only editable public node fields', () => {
  const editableNode = toEditablePublicMapNode({
    id: 'node-approved-1',
    displayName: 'Approved Member',
    placeName: 'Lisbon Hub',
    city: 'Lisbon',
    region: '',
    country: 'Portugal',
    lat: 38.7223,
    long: -9.1393,
    role: 'steward',
    type: 'member',
    themes: ['public', 'events'],
    publicNote: 'Running public-goods meetups.',
    owner_email: 'private@example.com',
    token_hash: 'private-token-hash',
    pending_update_request: { status: 'pending' },
    review_notes: 'private review',
  });

  assert.deepEqual(Object.keys(editableNode), [
    'id',
    'display_name',
    'place_name',
    'city',
    'region',
    'country',
    'latitude',
    'longitude',
    'themes',
    'public_note',
  ]);
  assert.deepEqual(EDITABLE_MAP_NODE_UPDATE_FIELDS, [
    'display_name',
    'place_name',
    'city',
    'region',
    'country',
    'latitude',
    'longitude',
    'themes',
    'public_note',
  ]);
  assert.equal(Object.hasOwn(editableNode, 'role'), false);
  assert.equal(Object.hasOwn(editableNode, 'type'), false);
  assert.equal(containsPrivateMapNodeField(editableNode), false);
});

test('local optimistic node storage stays public-safe', () => {
  const storage = new MemoryStorage();
  const node = saveStoredLocalPendingNode(storage, {
    name: 'Local Pending',
    place: 'Lisbon',
    lat: 38.7223,
    long: -9.1393,
    role: 'curious',
    themes: ['knowledge-commons'],
    publicNote: 'Looking for nearby Greenpill people.',
    email: 'private@example.com',
    rawNote: 'this should not be stored locally',
  }, new Date('2026-05-16T12:00:00.000Z'));

  assert.equal(node.status, 'pending');
  const stored = JSON.parse(storage.getItem('greenpill.pendingMapNodes.v1'));
  assert.equal(stored.length, 1);
  assert.equal(containsPrivateMapNodeField(stored), false);
});

test('local pending nodes reconcile against approved nodes by name and coordinates', () => {
  const storage = new MemoryStorage();
  saveStoredLocalPendingNode(storage, {
    id: 'local-approved-soon',
    name: 'Lagos Member',
    place: 'Lagos',
    lat: 6.5244,
    long: 3.3792,
    themes: ['public', 'events', 'trees', 'water'],
  });
  saveStoredLocalPendingNode(storage, {
    id: 'local-still-pending',
    name: 'Nairobi Member',
    place: 'Nairobi',
    lat: -1.2921,
    long: 36.8219,
    themes: ['public', 'food', 'energy', 'gov'],
  });

  // Approved node carries /map/state shape (name + lat/long) and a slightly
  // nudged coordinate that still falls inside the two-decimal fingerprint.
  const result = reconcileStoredLocalPendingNodes(storage, [
    { name: 'Lagos Member', lat: 6.5249, long: 3.3795, status: 'approved' },
  ]);

  assert.equal(result.removed.length, 1);
  assert.equal(result.removed[0].id, 'local-approved-soon');
  assert.equal(result.remaining.length, 1);
  assert.equal(result.remaining[0].id, 'local-still-pending');

  const stored = loadStoredLocalPendingNodes(storage);
  assert.equal(stored.length, 1);
  assert.equal(stored[0].id, 'local-still-pending');
});

test('reconcile leaves pending nodes untouched when nothing matches', () => {
  const storage = new MemoryStorage();
  saveStoredLocalPendingNode(storage, {
    id: 'local-unmatched',
    name: 'Lisbon Member',
    place: 'Lisbon',
    lat: 38.7223,
    long: -9.1393,
    themes: ['public', 'events', 'trees', 'water'],
  });

  // A distant node with the same name must not be reconciled away.
  const result = reconcileStoredLocalPendingNodes(storage, [
    { name: 'Lisbon Member', lat: 40.0, long: -9.1393 },
  ]);

  assert.equal(result.removed.length, 0);
  assert.equal(loadStoredLocalPendingNodes(storage).length, 1);
  // A node without enough public signal yields no signature and never matches.
  assert.equal(storedLocalPendingNodeSignature({ name: '', lat: 1, long: 2 }), '');
  assert.equal(
    storedLocalPendingNodeSignature({ name: 'A', lat: 1.239, long: -2.001 }),
    'a|1.24|-2.00'
  );
});

test('local pending storage write failures do not throw or drop pending nodes', () => {
  const storage = new FlakyStorage();
  saveStoredLocalPendingNode(storage, {
    id: 'local-storage-failure',
    name: 'Storage Failure Member',
    place: 'Lisbon',
    lat: 38.7223,
    long: -9.1393,
    themes: ['public'],
  });

  storage.blocked = true;
  assert.doesNotThrow(() => removeStoredLocalPendingNode(storage, 'local-storage-failure'));
  assert.equal(loadStoredLocalPendingNodes(storage).length, 1);

  const result = reconcileStoredLocalPendingNodes(storage, [
    { name: 'Storage Failure Member', lat: 38.7223, long: -9.1393 },
  ]);
  assert.deepEqual(result.removed, []);
  assert.equal(result.remaining.length, 1);
  assert.equal(loadStoredLocalPendingNodes(storage).length, 1);
});

test('privacy guard catches snake_case private map-node fields', () => {
  assert.equal(containsPrivateMapNodeField({ raw_note: 'private context' }), true);
  assert.equal(containsPrivateMapNodeField({ review_notes: 'steward only' }), true);
  assert.equal(containsPrivateMapNodeField({ ip_address: '127.0.0.1' }), true);
  assert.equal(containsPrivateMapNodeField({ spam_signals: { score: 10 } }), true);
  assert.equal(containsPrivateMapNodeField({ token_hash: 'private token hash' }), true);
  assert.equal(containsPrivateMapNodeField({ pending_update_request: { status: 'pending' } }), true);
  assert.equal(containsPrivateMapNodeField({ proposed_public_fields: { city: 'Lisbon' } }), true);
  assert.equal(containsPrivateMapNodeField({ public: { label: 'ok' } }), false);
});

test('public map-state combines chapter anchors and approved submitted nodes safely', () => {
  const payload = toPublicMapStatePayload({
    generatedAt: '2026-05-17T12:00:00.000Z',
    intakeMode: 'live',
    chapterLocations: [{
      id: 'nigeria',
      name: 'Nigeria',
      lat: 9.082,
      long: 8.6753,
      link: '/chapters/nigeria',
      status: 'active',
      themes: ['public', 'funding'],
      email: 'private@example.com',
      review_notes: 'private review context',
    }],
    publicMapNodes: [{
      id: 'node-approved-1',
      name: 'Approved Steward',
      place: 'Lagos',
      city: 'Lagos',
      country: 'Nigeria',
      lat: 6.5244,
      long: 3.3792,
      role: 'chapter steward',
      chapterSlug: 'nigeria',
      themes: ['public', 'events'],
      publicNote: 'Running public-goods meetups.',
      status: 'approved',
      source: 'approved-submission',
      raw_note: 'private submission context',
      user_agent: 'node-test',
    }],
  });

  assert.equal(payload.version, 1);
  assert.equal(payload.intakeMode, 'live');
  assert.equal(payload.nodes.some((node) => node.type === 'chapter'), true);
  assert.equal(payload.nodes.some((node) => node.type === 'steward'), true);
  assert.equal(payload.nodes.some((node) => String(node.source) === 'generated-density'), false);
  assert.equal(payload.nodes.find((node) => node.type === 'steward')?.bioregion, 'Nigerian lowland forests');
  assert.equal(payload.nodes.find((node) => node.type === 'steward')?.bioregionId, '23');
  assert.equal(payload.nodes.find((node) => node.type === 'steward')?.bioregionSource, 'resolve-ecoregions-2017');
  assert.equal(payload.counts.chapterNodes, 1);
  assert.equal(payload.counts.approvedSubmittedNodes, 1);
  assert.equal(payload.counts.byType.steward, 1);
  assert.equal(payload.counts.byTheme.public > 1, true);
  // Relationships are person-to-person only: a lone steward with no peers has no
  // edges, and chapters never carry relationship threads (no steward-chapter edge).
  assert.equal(payload.edges.length, 0);
  assert.equal(containsPrivateMapStateField(payload), false);
  assert.equal(JSON.stringify(payload).includes('private@example.com'), false);
  assert.equal(JSON.stringify(payload).includes('private submission context'), false);
});

test('public map-state generates person-first relationship edges', () => {
  const payload = toPublicMapStatePayload({
    generatedAt: '2026-05-20T12:00:00.000Z',
    chapterLocations: [
      {
        id: 'nigeria',
        name: 'Nigeria',
        lat: 9.082,
        long: 8.6753,
        link: '/chapters/nigeria',
        status: 'active',
        themes: ['public'],
      },
      {
        id: 'kenya',
        name: 'Kenya',
        lat: -1.2921,
        long: 36.8219,
        link: '/chapters/kenya',
        status: 'active',
        themes: ['public'],
      },
    ],
    publicMapNodes: [
      {
        id: 'steward-1',
        name: 'Lagos Steward',
        place: 'Lagos',
        lat: 6.5244,
        long: 3.3792,
        role: 'steward',
        chapterSlug: 'nigeria',
        themes: ['public'],
        status: 'approved',
        source: 'approved-submission',
      },
      {
        id: 'steward-2',
        name: 'Accra Steward',
        place: 'Accra',
        lat: 5.6037,
        long: -0.187,
        role: 'steward',
        chapterSlug: 'nigeria',
        themes: ['public', 'events'],
        status: 'approved',
        source: 'approved-submission',
      },
      {
        id: 'member-1',
        name: 'Lagos Member',
        place: 'Lagos',
        lat: 6.6,
        long: 3.45,
        role: 'member',
        bioregion: 'West African Coast',
        themes: ['public', 'events'],
        status: 'approved',
        source: 'approved-submission',
      },
      {
        id: 'member-2',
        name: 'Berlin Member',
        place: 'Berlin',
        lat: 52.52,
        long: 13.405,
        role: 'member',
        bioregion: 'West African Coast',
        themes: ['public', 'events'],
        status: 'approved',
        source: 'approved-submission',
      },
    ],
  });

  assert.equal(payload.edges.some((edge) => edge.kind === 'chapter-theme'), false);
  assert.equal(payload.nodes.some((node) => node.type === 'steward'), true);
  // No edge ever connects to a chapter anchor — the relationship web is person-to-person.
  assert.equal(payload.edges.some((edge) => (
    edge.from.startsWith('chapter:') || edge.to.startsWith('chapter:')
  )), false);
  assert.equal(payload.edges.some((edge) => (
    edge.kind === 'shared-theme' &&
    [edge.from, edge.to].sort().join(':') === 'submission:member-1:submission:member-2'
  )), true);
  assert.equal(payload.edges.find((edge) => (
    edge.kind === 'shared-theme' &&
    [edge.from, edge.to].sort().join(':') === 'submission:member-1:submission:member-2'
  ))?.bioregion, 'West African Coast');

  const typeByNodeId = new Map(payload.nodes.map((node) => [node.id, node.type]));
  assert.equal(payload.edges.some((edge) => (
    edge.kind === 'shared-theme' &&
    typeByNodeId.get(edge.from) === 'steward' &&
    typeByNodeId.get(edge.to) === 'steward'
  )), true);
});

test('public map-state includes real opt-in stewards without anonymous density', () => {
  const stewardNodes = Array.from({ length: 8 }, (_, index) => ({
    id: `steward-${index + 1}`,
    name: `Steward ${index + 1}`,
    place: `Place ${index + 1}`,
    lat: 5 + index,
    long: -70 + index * 8,
    role: 'steward',
    themes: ['public', index % 2 === 0 ? 'events' : 'funding'],
    status: 'approved',
    source: 'approved-submission',
  }));
  const payload = toPublicMapStatePayload({
    generatedAt: '2026-05-20T12:30:00.000Z',
    chapterLocations: [{
      id: 'anchor-chapter',
      name: 'Anchor Chapter',
      lat: 0,
      long: 0,
      link: '/chapters/anchor-chapter',
      status: 'active',
      themes: ['public'],
    }],
    publicMapNodes: stewardNodes,
  });

  const stewardEdges = payload.edges.filter((edge) => edge.kind === 'shared-theme');
  assert.equal(payload.nodes.filter((node) => node.type === 'steward').length, stewardNodes.length);
  assert.equal(payload.nodes.some((node) => String(node.source) === 'generated-density'), false);
  assert.equal(payload.counts.approvedSubmittedNodes, stewardNodes.length);
  assert.equal(stewardEdges.length > 0, true);
  assert.equal(payload.edges.some((edge) => edge.kind === 'steward-steward'), false);
  assert.equal(payload.edges.some((edge) => (
    edge.from.startsWith('chapter:') || edge.to.startsWith('chapter:')
  )), false);
});

test('public bioregion field resolves from checked-in RESOLVE polygons', () => {
  assert.deepEqual(lookupPublicBioregionFromCoordinates(37.8044, -122.2712), {
    id: '423',
    name: 'California interior chaparral and woodlands',
    source: 'resolve-ecoregions-2017',
  });
  assert.equal(derivePublicBioregionFromCoordinates(37.8044, -122.2712), 'California interior chaparral and woodlands');
  assert.equal(derivePublicBioregionFromCoordinates(37.8044, -122.2712, 'Bay Delta'), 'Bay Delta');
});

test('public content seed map nodes are approved-only projection fixtures', async () => {
  const fixture = await readPublicContentSeedFixture();
  const publicMapNodes = fixture.publicMapNodes.map((node) => ({
    ...node,
    status: 'approved',
  }));

  assert.equal(containsPrivateMapNodeField(publicMapNodes), false);

  const projectedNodes = publicMapNodes
    .map((node) => toPublicMapNode(node))
    .filter(Boolean);
  assert.equal(projectedNodes.length, publicMapNodes.length);

  const payload = toPublicMapStatePayload({
    generatedAt: fixture.generatedAt,
    publicMapNodes,
    sourceStatus: [
      { source: 'approved-map-nodes', status: 'ok', count: publicMapNodes.length },
    ],
  });

  assert.equal(payload.counts.approvedSubmittedNodes, publicMapNodes.length);
  assert.equal(payload.counts.byStatus.approved, publicMapNodes.length);
  assert.equal(containsPrivateMapStateField(payload), false);
  assertPublicMapStatePayload(payload);
});

test('public map-state guard rejects pending and private route payloads', () => {
  assert.throws(
    () => assertPublicMapStatePayload({
      nodes: [{ status: 'pending', source: 'submitted-pending' }],
    }),
    /pending nodes/
  );
  assert.throws(
    () => assertPublicMapStatePayload({
      nodes: [{ status: 'approved', raw_note: 'private' }],
    }),
    /private fields/
  );
  assert.throws(
    () => assertPublicMapStatePayload({
      nodes: [{ status: 'approved', tokenHash: 'private' }],
    }),
    /private fields/
  );
  assert.throws(
    () => assertPublicMapStatePayload({
      nodes: [{ status: 'approved', pendingUpdateRequest: { id: 'request-1' } }],
    }),
    /private fields/
  );
});

test('public map-state guard rejects non-person relationship edge endpoints', () => {
  const nodes = [
    { id: 'chapter:nigeria', type: 'chapter', status: 'approved', source: 'chapter-content' },
    { id: 'submission:member-1', type: 'member', status: 'approved', source: 'approved-submission' },
    { id: 'submission:member-2', type: 'member', status: 'approved', source: 'approved-submission' },
  ];

  assert.throws(
    () => assertPublicMapStatePayload({
      nodes,
      edges: [{
        id: 'edge:chapter:nigeria:submission:member-1',
        from: 'chapter:nigeria',
        to: 'submission:member-1',
        kind: 'shared-theme',
        theme: 'public',
        weight: 1,
        source: 'generated-theme-match',
      }],
    }),
    /non-person edge endpoint/
  );

  assert.throws(
    () => assertPublicMapStatePayload({
      nodes,
      edges: [{
        id: 'edge:missing:submission:member-1',
        from: 'submission:missing',
        to: 'submission:member-1',
        kind: 'shared-theme',
        theme: 'public',
        weight: 1,
        source: 'generated-theme-match',
      }],
    }),
    /unknown endpoint/
  );

  assert.doesNotThrow(() => assertPublicMapStatePayload({
    nodes,
    edges: [{
      id: 'edge:submission:member-1:submission:member-2',
      from: 'submission:member-1',
      to: 'submission:member-2',
      kind: 'shared-theme',
      theme: 'public',
      weight: 1,
      source: 'generated-theme-match',
    }],
  }));
});

test('public map-state normalizes unsafe intake mode values', () => {
  const payload = toPublicMapStatePayload({
    intakeMode: 'review-bypass',
  });

  assert.equal(payload.intakeMode, 'moderated');
  assert.equal(containsPrivateMapStateField(payload), false);
});

test('public map-state source counts reflect normalized public nodes', () => {
  const payload = toPublicMapStatePayload({
    generatedAt: '2026-05-17T12:00:00.000Z',
    chapterLocations: [{
      id: 'missing-coordinates',
      name: 'Missing Coordinates',
      status: 'active',
      themes: ['public'],
    }],
    publicMapNodes: [],
    sourceStatus: [
      { source: 'chapter-locations', status: 'ok', count: 1 },
      { source: 'approved-map-nodes', status: 'ok', count: 0 },
    ],
  });

  assert.equal(payload.nodes.length, 0);
  assert.deepEqual(payload.counts.sources, [
    { source: 'chapter-locations', status: 'empty', count: 0, message: '' },
    { source: 'approved-map-nodes', status: 'empty', count: 0, message: '' },
  ]);
});

test('public aggregate counts prefer not configured over fake counts', () => {
  const payload = toPublicAggregateCountsPayload({
    generatedAt: '2026-05-17T12:00:00.000Z',
    chapters: { value: 14, status: 'ok', source: 'map-state' },
    members: {
      status: 'not_configured',
      source: 'private-admin-boundary',
      message: 'Member aggregate source is not configured.',
    },
  });

  const byId = Object.fromEntries(payload.counts.map((count) => [count.id, count]));
  assert.equal(byId.chapters.value, 14);
  assert.equal(byId.chapters.status, 'ok');
  assert.equal(byId.members.value, null);
  assert.equal(byId.members.status, 'not_configured');
  assert.equal(byId.guilds.status, 'not_configured');
  assert.equal(containsPrivateMapStateField(payload), false);
});

test('public SQL view is approved-only and excludes private fields', async () => {
  const sql = await readFile(new URL('../packages/agent/migrations/001_private_map_node_schema.sql', import.meta.url), 'utf8');

  const viewStart = sql.indexOf('create or replace view intake.public_map_nodes as');
  assert.notEqual(viewStart, -1);

  const compatibilityViewStart = sql.indexOf('create or replace view public.public_map_nodes as');
  assert.notEqual(compatibilityViewStart, -1);

  const viewSql = sql.slice(viewStart, compatibilityViewStart);
  assert.match(viewSql, /where status = 'approved'/);
  for (const field of ['email', 'raw_note', 'review_notes', 'ip_address', 'rate_limit_key', 'spam_signals', 'user_agent']) {
    assert.equal(viewSql.includes(field), false, `${field} must not be exposed by public_map_nodes`);
  }
});

test('map-node recovery migration exposes only public chapter and bioregion fields', async () => {
  const sql = await readFile(
    new URL('../packages/agent/migrations/013_map_node_steward_chapter_bioregion.sql', import.meta.url),
    'utf8'
  );

  assert.match(sql, /add column if not exists chapter_slug text/);
  assert.match(sql, /add column if not exists bioregion text/);
  assert.doesNotMatch(sql, /Bioregion pending/);
  assert.match(sql, /chapter_slug/);
  assert.match(sql, /bioregion/);
  for (const field of ['email', 'raw_note', 'review_notes', 'ip_address', 'rate_limit_key', 'spam_signals', 'user_agent']) {
    assert.equal(sql.includes(field), false, `${field} must not be exposed by recovered public_map_nodes`);
  }
});

test('chapter editor assignments enforce one chapter per Directus user', async () => {
  const sql = await readFile(
    new URL('../packages/agent/migrations/018_chapter_editor_assignment_single_chapter.sql', import.meta.url),
    'utf8'
  );

  assert.match(sql, /group by directus_user_id/);
  assert.match(sql, /having count\(\*\) > 1/);
  assert.match(sql, /chapter_editor_assignments_unique_directus_user/);
  assert.match(sql, /unique \(directus_user_id\)/);
});

test('map-node intake settings use a replay-safe dedicated migration', async () => {
  const baselineSql = await readFile(new URL('../packages/agent/migrations/001_private_map_node_schema.sql', import.meta.url), 'utf8');
  const settingsSql = await readFile(new URL('../packages/agent/migrations/003_map_node_intake_settings.sql', import.meta.url), 'utf8');

  assert.equal(
    baselineSql.includes('map_node_intake_settings'),
    false,
    'new schema added after 001 must not be hidden inside the already-applied baseline migration'
  );
  assert.match(settingsSql, /create table if not exists intake\.map_node_intake_settings/);
  assert.match(settingsSql, /live_onboarding_enabled boolean not null default false/);
  assert.match(settingsSql, /map_node_intake_settings_singleton check \(id = 1\)/);
  assert.match(settingsSql, /on conflict \(id\) do nothing/);
});

test('edit-token and update-request migration is replay-safe and public/private aware', async () => {
  const migrationFiles = (await readdir(new URL('../packages/agent/migrations', import.meta.url)))
    .filter((file) => file.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b));
  const editSql = await readFile(
    new URL('../packages/agent/migrations/007_map_node_edit_tokens_update_requests.sql', import.meta.url),
    'utf8'
  );

  assert.equal(migrationFiles.includes('007_map_node_edit_tokens_update_requests.sql'), true);
  assert.match(editSql, /create table if not exists intake\.map_node_edit_tokens/);
  assert.match(editSql, /create table if not exists intake\.map_node_update_requests/);
  assert.match(editSql, /token_hash text/);
  assert.doesNotMatch(editSql, /\braw_token\b/);
  assert.doesNotMatch(editSql, /\btoken text\b/);
  assert.match(editSql, /expires_at timestamptz not null default now\(\) \+ interval '30 minutes'/);
  assert.match(editSql, /consumed_at timestamptz/);
  assert.match(editSql, /map_node_edit_tokens_cooldown_idx/);
  assert.match(editSql, /map_node_edit_tokens_email_bucket_idx/);
  assert.match(editSql, /map_node_edit_tokens_rate_limit_bucket_idx/);
  assert.match(editSql, /map_node_update_requests_one_pending_per_node_idx/);
  assert.match(editSql, /where status = 'pending'/);
  assert.match(editSql, /current_submission_updated_at/);
  assert.match(editSql, /map_node_update_request_stale_state/);
  assert.match(editSql, /apply_approved_map_node_update_request/);
  assert.match(editSql, /update intake\.map_node_submissions/);
  assert.doesNotMatch(editSql, /proposed_role/);
  assert.match(editSql, /cleanup_map_node_edit_flow/);
  assert.match(editSql, /expired_tokens_deleted/);
  assert.match(editSql, /private_metadata_retention interval default interval '90 days'/);
});

test('resend webhook migration stores delivery metadata without raw message content', async () => {
  const migrationFiles = (await readdir(new URL('../packages/agent/migrations', import.meta.url)))
    .filter((file) => file.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b));
  const webhookSql = await readFile(
    new URL('../packages/agent/migrations/008_resend_webhook_events.sql', import.meta.url),
    'utf8'
  );
  const rekeySql = await readFile(
    new URL('../packages/agent/migrations/009_rekey_resend_recipient_hashes.sql', import.meta.url),
    'utf8'
  );

  const webhookMigrationIndex = migrationFiles.indexOf('008_resend_webhook_events.sql');
  const rekeyMigrationIndex = migrationFiles.indexOf('009_rekey_resend_recipient_hashes.sql');
  assert.notEqual(webhookMigrationIndex, -1);
  assert.notEqual(rekeyMigrationIndex, -1);
  assert.ok(rekeyMigrationIndex > webhookMigrationIndex);
  assert.match(webhookSql, /add column if not exists provider_message_id text/);
  assert.match(webhookSql, /map_node_edit_tokens_provider_message_idx/);
  assert.match(webhookSql, /create table if not exists intake\.email_provider_events/);
  assert.match(webhookSql, /provider_event_id text not null/);
  assert.match(webhookSql, /provider_message_id text/);
  assert.match(webhookSql, /recipient_hash text/);
  assert.match(webhookSql, /related_edit_token_id uuid references intake\.map_node_edit_tokens/);
  assert.match(webhookSql, /replay_count integer not null default 0/);
  assert.doesNotMatch(webhookSql, /subject text/);
  assert.doesNotMatch(webhookSql, /raw_recipient/);
  assert.doesNotMatch(webhookSql, /message_body/);
  assert.doesNotMatch(webhookSql, /\bhtml\b/);
  assert.match(webhookSql, /free-form provider diagnostic/);
  assert.match(rekeySql, /RESEND_WEBHOOK_RECIPIENT_HASH_SECRET/);
  assert.match(rekeySql, /set recipient_hash = null/);
  assert.doesNotMatch(rekeySql, /raw_recipient/);
});

test('home map intake requires a valid email and stores local pending only after server accept', async () => {
  // The interactive public map lives on the home page now; ChapterMap.astro and
  // scripts/map.ts were retired so there is a single map implementation.
  const component = await readFile(
    new URL('../packages/website/src/components/page-sections/HomeMap.astro', import.meta.url),
    'utf8'
  );
  const homepage = await readFile(
    new URL('../packages/website/src/pages/index.astro', import.meta.url),
    'utf8'
  );

  // Add-node form requires a private owner email and explains its use.
  assert.match(component, /<input name="contact"[^>]*type="email"[^>]*required[^>]*>/);
  assert.match(component, /<input name="publicNote"[^>]*required[^>]*maxlength="72"[^>]*>/);
  assert.doesNotMatch(component, /<textarea name="publicNote"/);
  assert.match(component, /future edit links/);
  assert.match(component, /data-review-email/);
  assert.match(component, /email,\s*contactConsent: true/s);
  assert.doesNotMatch(component, /email:\s*email\s*\|\|\s*undefined/);
  assert.match(component, /<dialog class="gp-home-map-addnode-dialog"/);
  assert.match(homepage, /<Button type="button" data-home-map-open/);
  assert.doesNotMatch(component, /<button[^>]*data-home-map-open/);
  assert.match(homepage, /min-block-size: calc\(100dvh - var\(--gp-header-height\)\)/);
  assert.match(homepage, /<Text variant="display" class="gp-home-hero-title">/);
  assert.doesNotMatch(homepage, /font-size:\s*clamp\(40px, calc\(30\.1px \+ 2\.65vw\), 64px\)/);
  assert.match(homepage, /width:\s*min\(100%, 128dvh\)/);
  assert.doesNotMatch(homepage, /width:\s*min\(100%, clamp\(1100px, 82cqw, 1680px\)\)/);
  assert.match(homepage, /class="gp-home-lib-guild-pair"/);
  assert.match(homepage, /\.gp-home-eco-grid\s*{[\s\S]*?display:\s*flex;[\s\S]*?justify-content:\s*center/);
  assert.match(component, /const MAP_VIEW_H = 88/);
  assert.match(component, /viewBox=\{`0 0 \$\{VIEW_W\} \$\{MAP_VIEW_H\}`\}/);
  assert.match(component, /aspect-ratio:\s*200 \/ 88/);
  assert.doesNotMatch(component, /data-addnode-trigger/);
  assert.match(component, /showModal/);
  assert.match(component, /addDialog\?\.addEventListener\('cancel'/);
  assert.match(component, /event\.preventDefault\(\)/);
  assert.doesNotMatch(component, /closeAddDialogOnEscape/);
  assert.match(component, /lockAddDialogPageScroll/);
  assert.match(component, /unlockAddDialogPageScroll/);
  assert.match(component, /document\.body\.style\.position = 'fixed'/);
  assert.match(component, /document\.documentElement\.classList\.add\('gp-home-map-addnode-scroll-locked'\)/);
  assert.match(component, /window\.scrollTo\(0, addDialogScrollY\)/);
  assert.match(component, /event\.target === addDialog[\s\S]*?event\.preventDefault\(\);[\s\S]*?event\.stopPropagation\(\);/);
  assert.doesNotMatch(component, /if \(event\.target === addDialog\) closeAddDialog\(\)/);
  assert.doesNotMatch(component, /<details class="gp-home-map-addnode"/);

  // The HiFi flow is a multi-step walkthrough, not the previous raw checkbox
  // form embedded in the map controls.
  assert.match(component, /data-walkthrough-step="themes"/);
  assert.match(component, /data-walkthrough-step="identity"/);
  assert.match(component, /data-walkthrough-step="review"/);
  assert.doesNotMatch(component, /gp-home-map-addnode-kicker/);
  assert.doesNotMatch(component, /Step · what you care about|Step · who & where|Step · join the network/);
  assert.match(component, /data-theme-choice/);
  assert.match(component, /data-location-map/);
  assert.match(component, /data-review-themes/);
  assert.match(component, /data-home-map-mode-copy[\s\S]*?In moderated mode/);
  assert.doesNotMatch(component, /type="checkbox"|type='checkbox'/);
  const identityStepMarkup = component.match(/<section class="gp-home-map-addnode-step" data-walkthrough-step="identity" hidden>([\s\S]*?)<\/section>/)?.[1] ?? '';
  assert.ok(
    identityStepMarkup.indexOf('data-location-text') !== -1 &&
      identityStepMarkup.indexOf('data-location-map') !== -1 &&
      identityStepMarkup.indexOf('data-location-text') < identityStepMarkup.indexOf('data-location-map'),
    'identity step should place the city/place selector above the mini map'
  );

  // Email is validated client-side, and a local pending node is written ONLY
  // after the server accepts the submission (a 201 response). A rejected or
  // failed request must not leave a phantom local pending node behind.
  const addSubmitIndex = component.indexOf("addForm?.addEventListener('submit'");
  const emailValidationIndex = component.indexOf('emailInput?.checkValidity()', addSubmitIndex);
  const taglineValidationIndex = component.indexOf('!publicNote', addSubmitIndex);
  const responseOkGuardIndex = component.indexOf('if (!response.ok)', addSubmitIndex);
  const localPendingIndex = component.indexOf('saveLocalPendingNode', addSubmitIndex);
  assert.ok(addSubmitIndex !== -1, 'home map must define the add-node submit handler');
  assert.ok(emailValidationIndex !== -1, 'add-node must validate the private email client-side');
  assert.ok(taglineValidationIndex !== -1, 'add-node must require a one-line public tagline');
  assert.ok(localPendingIndex !== -1, 'add-node must retain local pending behavior');
  assert.ok(
    emailValidationIndex < localPendingIndex,
    'add-node must validate the email before saving a local pending node'
  );
  assert.ok(
    taglineValidationIndex < localPendingIndex,
    'add-node must validate the tagline before saving a local pending node'
  );
  assert.ok(
    responseOkGuardIndex !== -1 && responseOkGuardIndex < localPendingIndex,
    'add-node must save a local pending node only after the server accepts the submission'
  );

  // The owner update flow requests a neutral edit-link by node id and never
  // reveals match status. Token handling stays on /map/edit only.
  assert.match(component, /\/map-nodes\/\$\{encodeURIComponent\(sourceId\)\}\/edit-link/);
  assert.match(component, /If this email matches the node owner, we'll send an edit link\./);
  assert.doesNotMatch(component, /edit-session/);
  assert.doesNotMatch(component, /update-requests/);
});

test('home map enforces the up-to-four-theme activity rule', async () => {
  const component = await readFile(
    new URL('../packages/website/src/components/page-sections/HomeMap.astro', import.meta.url),
    'utf8'
  );

  // The form labels the rule and a live counter, and the submit handler refuses
  // zero themes or more than four themes before it ever contacts the server.
  assert.equal(PUBLIC_MAP_THEMES.length, 16, 'public add-node picker should expose the full canonical theme set');
  assert.match(component, /mapThemes\.map\(\(theme\) => \(/);
  assert.match(component, /Choose 1 to 4 themes to continue/);
  assert.match(component, /Deselect one to choose another/);
  assert.match(component, /data-home-map-theme-count/);
  assert.match(component, /aria-describedby="gp-home-map-addnode-theme-count"/);
  assert.match(component, /MAX_THEME_COUNT = 4/);
  assert.match(component, /themes\.length < 1 \|\| themes\.length > MAX_THEME_COUNT/);

  const themeOptionsCss = component.match(/\.gp-home-map-addnode-theme-options\s*{([\s\S]*?)\n  }/)?.[1] ?? '';
  assert.match(themeOptionsCss, /width:\s*min\(100%, 620px\)/);
  assert.match(themeOptionsCss, /grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/);
  assert.doesNotMatch(themeOptionsCss, /overflow/, 'desktop/tablet theme grid must not rely on an internal scroller');
  assert.match(component, /@container \(max-width: 860px\) \{[\s\S]*?\.gp-home-map-addnode-theme-options\s*{[\s\S]*?grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(component, /@container \(max-width: 480px\) \{[\s\S]*?\.gp-home-map-addnode-theme-options\s*{[\s\S]*?grid-template-columns:\s*1fr/);
  const themeStepCss = component.match(/\.gp-home-map-addnode-step\[data-walkthrough-step='themes'\]\s*{([\s\S]*?)\n  }/)?.[1] ?? '';
  assert.match(themeStepCss, /align-items:\s*center/);
  assert.match(themeStepCss, /padding-block-end:\s*24px/);
  assert.match(themeStepCss, /text-align:\s*center/);
  assert.doesNotMatch(themeStepCss, /justify-content:\s*center/, 'theme step header must stay top-anchored');
  assert.match(component, /\.gp-home-map-addnode-step\s*{[\s\S]*?scrollbar-width:\s*none/);
  assert.match(component, /\.gp-home-map-addnode-step::-webkit-scrollbar\s*{[\s\S]*?display:\s*none/);
  assert.match(component, /\.gp-home-map-addnode-dialog h2\s*{[\s\S]*?align-self:\s*center;[\s\S]*?text-align:\s*center/);
  assert.match(component, /\.gp-home-map-addnode-copy\s*{[\s\S]*?align-self:\s*center;[\s\S]*?text-align:\s*center/);
  assert.match(themeOptionsCss, /margin-block:\s*auto 4px/);
  assert.match(component, /\.gp-home-map-addnode-footer\s*{[\s\S]*?position:\s*sticky;[\s\S]*?bottom:\s*0;[\s\S]*?display:\s*grid;[\s\S]*?grid-template-columns:\s*minmax\(0, 1fr\) auto;[\s\S]*?env\(safe-area-inset-bottom, 0px\)[\s\S]*?border:\s*0;[\s\S]*?background:\s*transparent/);
  assert.match(component, /\.gp-home-map-addnode-actions\s*{[\s\S]*?justify-content:\s*flex-end/);
  assert.match(component, /<div class="gp-home-map-addnode-footer">[\s\S]*?<div class="gp-home-map-addnode-manage"[\s\S]*?<div class="gp-home-map-addnode-actions">/);
  assert.match(component, /class="gp-home-map-addnode-back" data-walkthrough-back hidden aria-label="Go back"/);
  const addNodeActionsMarkup = component.match(/<div class="gp-home-map-addnode-actions">([\s\S]*?)<\/div>/)?.[1] ?? '';
  assert.doesNotMatch(addNodeActionsMarkup, /data-walkthrough-back/);
  assert.doesNotMatch(component, /\.gp-home-map-addnode-next,[\s\S]*?\.gp-home-map-addnode-submit\s*{[\s\S]*?margin-left:\s*auto/);
  assert.match(component, /\.gp-home-map-addnode-form label\s*{[\s\S]*?text-align:\s*start/);
  assert.match(component, /\.gp-home-map-addnode-form input,[\s\S]*?\.gp-home-map-addnode-form textarea\s*{[\s\S]*?text-align:\s*start/);
  assert.match(component, /\.gp-home-map-addnode-next,[\s\S]*?\.gp-home-map-addnode-submit\s*{[\s\S]*?min-height:\s*48px;[\s\S]*?padding:\s*0 28px/);
  assert.match(component, /\.gp-home-map-addnode-next,[\s\S]*?\.gp-home-map-addnode-submit\s*{[\s\S]*?background:\s*var\(--gp-primary\)/);

  // The up-to-four guard sits after the email check (so a local pending node
  // is still never written before the email is valid) and before the fetch.
  const submitIndex = component.indexOf("addForm?.addEventListener('submit'");
  const emailValidationIndex = component.indexOf('emailInput?.checkValidity()', submitIndex);
  const themeGuardIndex = component.indexOf('themes.length < 1 || themes.length > MAX_THEME_COUNT', submitIndex);
  const fetchIndex = component.indexOf('await fetch(`${agentBaseUrl}/map-nodes`', submitIndex);
  assert.ok(emailValidationIndex !== -1 && themeGuardIndex !== -1 && fetchIndex !== -1);
  assert.ok(emailValidationIndex < themeGuardIndex, 'email validity is still checked first');
  assert.ok(themeGuardIndex < fetchIndex, 'up-to-four rule is enforced before the network call');
});

test('home map grows live: reconciles, polls visibly, and redraws after submit', async () => {
  const component = await readFile(
    new URL('../packages/website/src/components/page-sections/HomeMap.astro', import.meta.url),
    'utf8'
  );

  // Local pending nodes reconcile against approved server nodes to avoid
  // post-approval duplicates, using the shared (testable) helper.
  assert.match(component, /reconcileLocalPendingNodes/);
  assert.match(component, /removeInjectedMember/);
  assert.match(component, /const approvedKeys = new Set<string>\(\)/);
  assert.match(component, /member\.approved && !approvedKeys\.has\(member\.key\)/);

  // A successful submit re-pulls /map/state so server-generated relationship
  // edges redraw without a manual reload.
  const submitIndex = component.indexOf("addForm?.addEventListener('submit'");
  const redrawIndex = component.indexOf('void loadMapState();', submitIndex);
  assert.ok(redrawIndex !== -1, 'submit handler must refresh /map/state after a successful submit');

  // Already-open browsers keep watching for live mode, then tighten to the live
  // cadence once the agent reports intakeMode: live.
  assert.match(component, /const LIVE_POLL_INTERVAL_MS = 2000/);
  assert.match(component, /const WATCH_POLL_INTERVAL_MS = 5000/);
  assert.match(component, /nextPollIntervalMs = intakeMode === 'live' \? LIVE_POLL_INTERVAL_MS : WATCH_POLL_INTERVAL_MS/);
  assert.match(component, /document\.visibilityState === 'visible'/);
  assert.match(component, /setInterval/);

  // /map/state stays the canonical public source, fetched no-store with an abort
  // signal so a stalled fetch can be timed out.
  assert.match(component, /\$\{agentBaseUrl\}\/map\/state`, \{ cache: 'no-store', signal: controller\.signal \}/);

  // The poll is hardened: an in-flight guard stops overlapping loads from stacking
  // against the agent, and a timeout aborts a stalled fetch (cleared on settle).
  assert.match(component, /if \(mapStateInFlight\) \{[\s\S]*?if \(options\.replay\) replayAfterCurrentLoad = true;[\s\S]*?return;[\s\S]*?\}\s*mapStateInFlight = true;/);
  assert.match(component, /new AbortController\(\)/);
  assert.match(component, /setTimeout\(\(\) => controller\.abort\(\), MAP_STATE_TIMEOUT_MS\)/);
  assert.match(component, /window\.clearTimeout\(abortTimer\);\s*mapStateInFlight = false;\s*startPolling\(nextPollIntervalMs\);/);

  // Returning to a visible map refetches state and replays the connection reveal
  // once. Reduced-motion users still get the refresh, but no animation replay.
  assert.match(component, /loadMapState = async \(options: \{ replay\?: boolean \} = \{\}\)/);
  assert.match(component, /replayVisibleMapReturn/);
  assert.match(component, /reducedMotionPref\(\)/);
  assert.match(component, /new IntersectionObserver/);
  assert.match(component, /void loadMapState\(\{ replay: true \}\)/);

  // Visible legend counts are also type filter buttons: one active type isolates
  // that node class, clicking it again restores the combined view.
  assert.match(component, /data-legend-filter=\{type\.id\}/);
  assert.match(component, /aria-pressed="false"/);
  assert.match(component, /let activeTypeFilter: '' \| 'chapter' \| 'steward' \| 'member' = ''/);
  assert.match(component, /if \(activeTypeFilter && type !== activeTypeFilter\) return false/);
  assert.match(component, /activeTypeFilter = activeTypeFilter === type \? '' : type/);
  assert.match(component, /data-home-map-type-count=\{type\.id\}/);
  assert.match(component, /legendCounts: Record<string, number>/);
  assert.match(component, /nodeMatchesThemeFilters\(node\)/);
  assert.match(component, /count\.textContent = String\(countValue\)/);
  assert.match(component, /is-type-filter-match/);
});

test('home map thread motion is one-shot and poll-stable', async () => {
  const component = await readFile(
    new URL('../packages/website/src/components/page-sections/HomeMap.astro', import.meta.url),
    'utf8'
  );
  const cssRule = (selector: string) => {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return component.match(new RegExp(`${escaped}\\s*{([\\s\\S]*?)\\n  }`))?.[1] ?? '';
  };

  const baseThreadRule = cssRule('.gp-home-map-thread');
  const enteringThreadRule = cssRule('.gp-home-map-thread.is-entering');
  const adjacentThreadRule = cssRule('.gp-home-map-thread.is-adj');
  const revealingThreadRule = cssRule('.gp-home-map-thread.is-adj.is-revealing');

  assert.match(baseThreadRule, /stroke-dashoffset:\s*0/);
  assert.match(baseThreadRule, /animation:\s*none/);
  assert.doesNotMatch(baseThreadRule, /gpMapThreadGrow/);
  assert.match(enteringThreadRule, /gpMapThreadGrow/);
  assert.match(adjacentThreadRule, /animation:\s*none/);
  assert.doesNotMatch(adjacentThreadRule, /gpMapAdjacentThread/);
  assert.match(revealingThreadRule, /gpMapAdjacentThread/);
  assert.doesNotMatch(component, /gpMapNodeRipple/);
  assert.doesNotMatch(component, /gp-home-map-node-ripple/);
  assert.doesNotMatch(component, /animation:\s*[^;{}]*infinite/);

  assert.match(component, /let lastDynamicThreadSignature = ''/);
  assert.match(component, /if \(signature === lastDynamicThreadSignature\) return/);
  assert.match(component, /animationName === 'gpMapThreadGrow'/);
  assert.match(component, /animationName === 'gpMapAdjacentThread'/);
  assert.match(component, /activeFocusNodeId !== id/);
  assert.match(component, /markThreadRevealing/);
  assert.match(component, /data-home-map-dynamic-thread-hits/);
  assert.match(component, /registerEdgeHit/);
  assert.match(component, /edgeMetaById/);
  assert.match(component, /data-home-map-edge-tooltip/);

  const renderStart = component.indexOf('const renderDynamicThreads =');
  const renderEnd = component.indexOf('const renderLocalPending =', renderStart);
  const renderBlock = component.slice(renderStart, renderEnd);
  const appendIndex = renderBlock.indexOf('dynamicThreadsGroup.append(path)');
  const newPathGuardIndex = renderBlock.lastIndexOf('if (!existingPath)', appendIndex);
  assert.ok(appendIndex !== -1, 'new dynamic threads must still append once');
  assert.ok(newPathGuardIndex !== -1, 'dynamic threads should append only inside the new-path branch');
  assert.match(renderBlock, /const existingPath = existingThreads\.get\(spec\.edgeId\)/);
  assert.doesNotMatch(renderBlock.slice(appendIndex + 1), /dynamicThreadsGroup\.append\(path\)/);
  assert.match(renderBlock, /dynamicThreadHitsGroup\.append\(hit\)/);
  assert.match(renderBlock, /data-kind/);
  assert.match(renderBlock, /data-source/);
});

test('home map focus cards are anchored near nodes, not bottom-left panels', async () => {
  const component = await readFile(
    new URL('../packages/website/src/components/page-sections/HomeMap.astro', import.meta.url),
    'utf8'
  );

  assert.match(component, /data-focus-themes/);
  // The hover card is informational only — the connection summary was removed.
  // Relationship detail comes from hovering edges/nodes and the on-map web.
  assert.doesNotMatch(component, /data-focus-connections/);
  assert.doesNotMatch(component, /relationshipSummary/);
  assert.match(component, /focusEl\.style\.left = `\$\{xPct\}%`/);
  assert.match(component, /focusEl\.style\.top = `\$\{yPct\}%`/);
  assert.match(component, /focusEl\.style\.transform = `translate/);
  assert.match(component, /root\.addEventListener\('pointermove'/);
  assert.match(component, /nodeAtPointer/);

  const focusCssStart = component.indexOf('/* Focus card */');
  const controlsCssStart = component.indexOf('/* Embedded HiFi-style map controls */');
  const focusCss = component.slice(focusCssStart, controlsCssStart);
  assert.doesNotMatch(focusCss, /bottom:\s*12px/);
  assert.doesNotMatch(focusCss, /left:\s*12px/);
});

test('home map selected nodes stay on the map without scroll jumps', async () => {
  const component = await readFile(
    new URL('../packages/website/src/components/page-sections/HomeMap.astro', import.meta.url),
    'utf8'
  );

  const canvasStart = component.indexOf('<div class="gp-home-map-canvas"');
  const controlsStart = component.indexOf('<div class="gp-home-map-controls"', canvasStart);
  const selectedStart = component.indexOf('class="gp-home-map-selected" data-home-map-selected', canvasStart);
  assert.ok(canvasStart !== -1, 'HomeMap must render the map canvas');
  assert.ok(selectedStart > canvasStart && selectedStart < controlsStart, 'selected-node region must live inside the map canvas');
  assert.match(component, /role="region" aria-label="Selected map node"/);
  assert.doesNotMatch(component, /scrollIntoView/);
  assert.match(component, /positionSelectedCard/);
  assert.match(component, /syncSelectedOverlay/);
  assert.match(component, /root\.classList\.add\('has-selected-node'\)/);
  assert.match(component, /root\.addEventListener\('click'/);
  assert.match(component, /focusTarget as HTMLElement\)\.focus\(\{ preventScroll: true \}\)/);
  assert.match(component, /if \(selectedFocusTarget\) return/);
  assert.match(component, /if \(!selectedFocusTarget \|\| selectedFocusTarget === link\) setFocus\(link\)/);
  assert.match(component, /clusterDirty\(\)/);
  assert.match(component, /const clampNumber = \(value: number, min: number, max: number\)/);
  assert.match(component, /rootRect\.width - cardRect\.width - inset/);
  assert.match(component, /rootRect\.height - cardRect\.height - inset/);
  assert.match(component, /selectedEl\.style\.setProperty\('--gp-selected-transform', 'none'\)/);

  const styleStart = component.indexOf('<style>');
  const selectedCssStart = component.indexOf('/* Selected-node card', styleStart);
  const addNodeCssStart = component.indexOf('/* Find-your-people walkthrough', selectedCssStart);
  const selectedCss = component.slice(selectedCssStart, addNodeCssStart);
  assert.ok(selectedCssStart !== -1, 'selected-node floating-card CSS must be present');
  assert.match(selectedCss, /position:\s*absolute/);
  assert.match(selectedCss, /inset-inline-start:\s*var\(--gp-selected-x/);
  assert.match(selectedCss, /width:\s*min\(var\(--gp-map-card-width\), calc\(100% - 24px\)\)/);
  assert.match(selectedCss, /transform:\s*var\(--gp-selected-transform/);
  assert.doesNotMatch(component, /--gp-map-inspector-width/);
  assert.doesNotMatch(component, /--gp-map-pane-end/);
  assert.match(component, /\.gp-home-map-canvas\.has-selected-node \.gp-home-map-svg\s*{[^}]*width:\s*100%/);
  assert.doesNotMatch(component, /\.gp-home-map-canvas\.has-selected-node \.gp-home-map-svg\s*{[^}]*width:\s*calc\(100% - var\(--gp-map-pane-end\)\)/);
  assert.doesNotMatch(selectedCss, /position:\s*relative/);
});

test('home map mobile touch mode supports bounded zoom and compact connection rows', async () => {
  const component = await readFile(
    new URL('../packages/website/src/components/page-sections/HomeMap.astro', import.meta.url),
    'utf8'
  );

  assert.match(component, /data-home-map-zoom-controls/);
  assert.match(component, /const VISIBLE_VIEW_H = 88/);
  assert.match(component, /const FULL_VIEW_BOX: MapViewBox = \{ x: 0, y: 0, width: VIEW_W, height: VISIBLE_VIEW_H \}/);
  assert.match(component, /const MIN_VIEW_BOX_WIDTH = 46/);
  assert.match(component, /const clampViewBox = \(box: MapViewBox\)/);
  assert.match(component, /setMapViewBoxCentered/);
  assert.match(component, /resetMapView/);
  assert.match(component, /gesturePointers = new Map<number, PointerEvent>/);
  assert.match(component, /pointerDistance/);
  assert.match(component, /suppressNextNodeClick/);
  assert.match(component, /data-selected-edge-list/);
  assert.match(component, /renderSelectedEdgeList/);
  assert.doesNotMatch(component, /frameConnectedNode/);
  assert.doesNotMatch(component, /frameNodeNeighbourhood/);
  assert.doesNotMatch(component, /selectedBottomPaddingForView/);
  assert.doesNotMatch(component, /cursor:\s*help/);
  assert.match(component, /@container \(max-width: 720px\)/);
  assert.match(component, /\.gp-home-map-thread\.is-entering\s*{[\s\S]*?animation:\s*none/);
  assert.match(component, /\.gp-home-map-selected-edge-list:not\(\[hidden\]\)\s*{[\s\S]*?display:\s*block/);
  assert.match(component, /\.gp-home-map-canvas\.has-selected-node \.gp-home-map-controls\s*{[\s\S]*?--gp-map-selected-clearance/);
  assert.match(component, /\.gp-home-map-selected-edge-items\s*{[\s\S]*?overflow-x:\s*auto/);
  assert.match(component, /new ResizeObserver\(scheduleMapResizeSync\)\.observe\(root\)/);
  assert.doesNotMatch(component, /data-filter-toggle="type"/);
  assert.doesNotMatch(component, /data-type-filter/);
  assert.doesNotMatch(component, /data-legend-all/);
  assert.doesNotMatch(component, /data-legend-filter="all"/);
  assert.doesNotMatch(component, /<span class="gp-home-map-legend-label">All<\/span>/);
  assert.match(component, /<div class="gp-home-map-filter-tabs">[\s\S]*data-filter-toggle="theme"[\s\S]*data-home-map-list-toggle[\s\S]*<div class="gp-home-map-zoom-controls"/);
  const mapThemePanelCss = component.match(/\.gp-home-map-filter-panel\.is-themes\s*{([\s\S]*?)\n  }/)?.[1] ?? '';
  assert.match(mapThemePanelCss, /grid-template-columns:\s*repeat\(4, minmax\(0, 1fr\)\)/);
  assert.match(mapThemePanelCss, /max-height:\s*none/);
  assert.match(mapThemePanelCss, /overflow:\s*visible/);
  assert.match(component, /@container \(max-width: 720px\) \{[\s\S]*?\.gp-home-map-filter-panel\.is-themes\s*{[\s\S]*?position:\s*fixed;[\s\S]*?inset-block-end:\s*calc\(var\(--gp-space-3xl\) \+ env\(safe-area-inset-bottom, 0px\)\);[\s\S]*?grid-template-columns:\s*repeat\(4, minmax\(0, 1fr\)\);[\s\S]*?max-height:\s*none;[\s\S]*?overflow:\s*visible/);
  assert.match(component, /\.gp-home-map-canvas\.has-selected-node \.gp-home-map-filter-panel\.is-themes\s*{[\s\S]*?--gp-map-selected-clearance/);
  assert.match(component, /\.gp-home-map-filter-panel\.is-themes \.gp-home-map-filter-option\s*{[\s\S]*?font-size:\s*var\(--gp-caption\)/);
  assert.match(component, /\.gp-home-map-control-row\s*{[\s\S]*?flex-wrap:\s*nowrap/);
  assert.match(component, /const closeFilterPanels = \(\) => \{[\s\S]*?openFilterPanel = ''[\s\S]*?syncFilterPanels\(\)/);
  assert.match(component, /const setFilterPanel = \(panelName: string\) => \{[\s\S]*?if \(openFilterPanel\) closeNodeList\(\);[\s\S]*?syncFilterPanels\(\)/);
  assert.match(component, /const openNodeList = \(\) => \{[\s\S]*?closeFilterPanels\(\);[\s\S]*?listDrawer\.hidden = false/);
  assert.match(component, /document\.addEventListener\('pointerdown', \(event\) => \{[\s\S]*?target\.closest\('\.gp-home-map-controls'\)[\s\S]*?closeFilterPanels\(\)[\s\S]*?\.gp-home-map-list-drawer, \[data-home-map-list-toggle\][\s\S]*?closeNodeList\(\)/);
  assert.match(component, /if \(event\.key !== 'Escape'\) return;[\s\S]*?closeFilterPanels\(\);[\s\S]*?closeNodeList\(\)/);
  assert.match(component, /const openAddDialog = \(trigger\?: HTMLElement\) => \{[\s\S]*?closeFilterPanels\(\);[\s\S]*?closeNodeList\(\)/);
  assert.match(component, /const visibleThemeSlugs = themeSlugs\.slice\(0, 2\)/);
  assert.match(component, /const themeCompactLabel = \(slug: string\)/);
  assert.match(component, /chip\.textContent = themeCompactLabel\(slug\)/);
  assert.match(component, /chip\.title = label/);
  assert.match(component, /chip\.setAttribute\('aria-label', label\)/);
  assert.match(component, /const hiddenThemeCount = themeSlugs\.length - visibleThemeSlugs\.length/);
  assert.match(component, /more\.textContent = `\+\$\{hiddenThemeCount\}`/);
  assert.match(component, /more\.setAttribute\('aria-label', `\$\{hiddenThemeCount\} more/);
  assert.doesNotMatch(component, /gp-home-map-list-action['"]/);
  assert.match(component, /\.gp-home-map-list-name\s*{[\s\S]*?overflow-wrap:\s*anywhere/);
  assert.match(component, /\.gp-home-map-list-meta\s*{[\s\S]*?overflow-wrap:\s*anywhere/);
  assert.match(component, /\.gp-home-map-list-themes\s*{[\s\S]*?flex-wrap:\s*nowrap/);
  assert.doesNotMatch(component, /\.gp-home-map-list-themes\s*{[^}]*overflow:\s*hidden/);
  assert.doesNotMatch(component, /\.gp-home-map-list-themes span\s*{[^}]*text-overflow:\s*ellipsis/);
  assert.match(component, /\.gp-home-map-list-themes span\s*{[\s\S]*?white-space:\s*nowrap/);
});

test('home map uses shared semantic theme colours and derived aliases', async () => {
  const component = await readFile(
    new URL('../packages/website/src/components/page-sections/HomeMap.astro', import.meta.url),
    'utf8'
  );

  assert.deepEqual(
    PUBLIC_MAP_THEMES.map((theme) => [theme.id, theme.color]),
    [
      ['water', '#2BA7FF'],
      ['waste', '#8E6CFF'],
      ['opensrc', '#00D5E8'],
      ['impact', '#34D399'],
      ['trees', '#75D063'],
      ['food', '#C6D84F'],
      ['energy', '#FFD84D'],
      ['education', '#1A9CFF'],
      ['events', '#FF9F1C'],
      ['funding', '#FF6B35'],
      ['mutual', '#F472B6'],
      ['stories', '#D946EF'],
      ['ai', '#B067FF'],
      ['desci', '#536DFE'],
      ['gov', '#7C9CFF'],
      ['public', '#B9A6C9'],
    ]
  );
  assert.match(component, /const canonicalThemeInfo = Object\.fromEntries/);
  assert.match(component, /mapThemes\.map\(\(theme\) => \[theme\.id, \{ label: theme\.label, color: theme\.color \}\]\)/);
  assert.match(component, /'public-goods': \{ target: 'public'/);
  assert.match(component, /'local-regeneration': \{ target: 'trees'/);
  assert.match(component, /'knowledge-commons': \{ target: 'education'/);
  assert.match(component, /'coordination-tools': \{ target: 'opensrc'/);
  assert.match(component, /currency: \{ target: 'mutual'/);
  assert.match(component, /opensource: \{ target: 'opensrc'/);
});

test('home map land silhouette comes from derived Natural Earth rings', async () => {
  const component = await readFile(
    new URL('../packages/website/src/components/page-sections/HomeMap.astro', import.meta.url),
    'utf8'
  );
  const landData = await readFile(
    new URL('../packages/website/src/data/world-land-rings.ts', import.meta.url),
    'utf8'
  );

  assert.match(component, /WORLD_LAND_RINGS/);
  assert.doesNotMatch(component, /const CONTINENTS/);
  assert.match(component, /const COLS = 160/);
  assert.match(component, /const ROWS = 80/);
  assert.match(landData, /Natural Earth 110m Land v4\.0\.0/);
  assert.match(landData, /public domain/);
});

test('map-node edit flow has an operator cleanup command', async () => {
  const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  const cleanupScript = await readFile(
    new URL('../scripts/map-node-edit-flow-cleanup.ts', import.meta.url),
    'utf8'
  );
  const deliveryScript = await readFile(
    new URL('../scripts/map-node-edit-link-delivery.ts', import.meta.url),
    'utf8'
  );
  const deliveryClaimSql = await readFile(
    new URL('../packages/agent/migrations/017_map_node_edit_link_delivery_claims.sql', import.meta.url),
    'utf8'
  );

  assert.equal(
    packageJson.scripts['db:cleanup:map-node-edit-flow'],
    'bun run build:packages && bun --no-env-file --env-file-if-exists=.env.local scripts/map-node-edit-flow-cleanup.ts'
  );
  assert.equal(
    packageJson.scripts['db:deliver:map-node-edit-links'],
    'bun run build:packages && bun --no-env-file --env-file-if-exists=.env.local scripts/map-node-edit-link-delivery.ts'
  );
  assert.equal(
    packageJson.scripts['test:map-edit:browser'],
    'bun run build:website && bun --no-env-file scripts/map-edit-browser-smoke.ts'
  );
  assert.match(cleanupScript, /cleanupEditFlow/);
  assert.match(cleanupScript, /DATABASE_URL is required/);
  assert.match(deliveryScript, /deliverQueuedEditLinks/);
  assert.match(deliveryScript, /DATABASE_URL is required/);
  assert.match(deliveryClaimSql, /add column if not exists delivery_claimed_at timestamptz/);
  assert.match(deliveryClaimSql, /map_node_edit_tokens_delivery_queue_idx/);
});

test('home map tints resting lines faintly and reserves full theme colour for selection', async () => {
  const component = await readFile(
    new URL('../packages/website/src/components/page-sections/HomeMap.astro', import.meta.url),
    'utf8'
  );
  const cssRule = (selector: string) => {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return component.match(new RegExp(`${escaped}\\s*{([\\s\\S]*?)\\n  }`))?.[1] ?? '';
  };

  // Resting lines carry a faint MUTED theme tint — the per-edge --thread-color
  // mixed toward the neutral base and held at low opacity, so the map is alive
  // but calm rather than fully grey.
  const restThread = cssRule('.gp-home-map-thread');
  assert.match(component, /--gp-map-thread:/);
  assert.match(restThread, /color-mix\([^;]*--thread-color/);
  assert.match(restThread, /--gp-map-thread/);

  // Hover/focus brightens the SAME tint (still rides --thread-color, lifted toward
  // off-white) rather than desaturating to white — but stays short of full colour.
  const adjThread = cssRule('.gp-home-map-thread.is-adj');
  assert.match(adjThread, /color-mix\([^;]*--thread-color/);
  assert.match(adjThread, /--gp-off-white/);

  // Full saturation only rides the selection-specific class, pinned at select time
  // and cleared on deselect (so hovering another node never fully colourises).
  assert.match(cssRule('.gp-home-map-thread.is-selected-adj'), /stroke:\s*var\(--thread-color/);
  assert.match(component, /markSelectedThreads/);
  assert.match(component, /classList\.toggle\('is-selected-adj'/);

  // New live connections still arrive as a one-shot comet, then settle.
  const entering = cssRule('.gp-home-map-thread.is-entering');
  assert.match(entering, /gpMapThreadGrow/);
});

test('home map renders selected multi-theme strands in a separate one-shot overlay', async () => {
  const component = await readFile(
    new URL('../packages/website/src/components/page-sections/HomeMap.astro', import.meta.url),
    'utf8'
  );

  // Strands derive shared themes client-side (no payload change) and live in
  // their own SVG group so they cannot affect the base thread / edge-hit sets.
  assert.match(component, /data-home-map-selection-strands/);
  assert.match(component, /renderSelectionStrands/);
  assert.match(component, /sharedThemesForEdge/);
  assert.match(component, /buildSelectionStrandSpecs/);
  // One-shot grow only — no idle loop anywhere on the map.
  assert.match(component, /@keyframes gpMapStrandGrow/);
  assert.doesNotMatch(component, /animation:\s*[^;{}]*infinite/);
  // A signature guard stops polls/filter passes from re-triggering the grow.
  assert.match(component, /lastSelectionStrandSignature/);
});

test('home map selected surface carries public links and no connection summary', async () => {
  const component = await readFile(
    new URL('../packages/website/src/components/page-sections/HomeMap.astro', import.meta.url),
    'utf8'
  );

  // Public profile/chapter links are consumed from existing public node fields.
  assert.match(component, /data-selected-links/);
  assert.match(component, /renderNodeLinks/);
  assert.match(component, /const cleanHref/);
  assert.match(component, /chapterHref/);
  assert.match(component, /data-node-profile-url/);
  // External profile links open safely in a new tab.
  assert.match(component, /rel = 'noopener noreferrer'/);

  // Hover and selected cards share a stable floating footprint instead of
  // squeezing the map into a side inspector on desktop.
  assert.match(component, /--gp-map-card-width/);
  assert.match(component, /\.gp-home-map-focus\s*{[\s\S]*?width:\s*min\(var\(--gp-map-card-width\), calc\(100% - 24px\)\)/);
  assert.match(component, /\.gp-home-map-selected\s*{[\s\S]*?width:\s*min\(var\(--gp-map-card-width\), calc\(100% - 24px\)\)/);
  assert.match(component, /--gp-map-card-offset/);
  assert.match(component, /var\(--gp-map-card-offset\)/);
  assert.doesNotMatch(component, /\.gp-home-map-canvas\.has-selected-node \.gp-home-map-svg\s*{[^}]*inset-inline-end/);

  // No connection-summary text on any surface (desktop discovers via hover).
  assert.doesNotMatch(component, /data-selected-connections/);
  assert.doesNotMatch(component, /No public connections yet/);

  // Mobile connection rows gain an open-link control + non-wrapping theme carousel.
  assert.match(component, /gp-home-map-selected-edge-open/);
  assert.match(component, /gp-home-map-selected-edge-themes/);
  assert.match(component, /peekCarousel/);
});

test('home map chapters open an inspect card and carry one link (progressive enhancement)', async () => {
  const component = await readFile(
    new URL('../packages/website/src/components/page-sections/HomeMap.astro', import.meta.url),
    'utf8'
  );

  // Chapters keep their <a href> so they still navigate with JS disabled...
  assert.match(component, /class="gp-home-map-node-link is-chapter"/);
  assert.match(component, /href=\{c\.href\}/);
  // ...but with JS the activation is intercepted to open the inspect card instead
  // of navigating the whole page away (kinder to stray taps on touch).
  assert.match(component, /classList\.contains\('is-chapter'\)/);
  assert.match(component, /openChapterNode/);

  // One external link per node: a chapter's single link is its own page; a steward's
  // chapter affiliation is an in-map jump button (selectChapterBySlug), not a link.
  assert.match(component, /Visit chapter/);
  assert.match(component, /is-chapter-jump/);
  assert.match(component, /selectChapterBySlug/);

  // Chapters are geographic anchors in the live map: no invented theme chips,
  // no redundant "Chapter node" label, no relationship/edit rows.
  assert.match(component, /themes:\s*\[\]/);
  assert.match(component, /if \(filterTypeFor\(node\.getAttribute\('data-node-type'\)\) === 'chapter'\) return true/);
  assert.match(component, /selectedEl\.dataset\.selectedType = member\.type/);
  assert.match(component, /data-selected-type='chapter'/);
  assert.match(component, /selectedKicker\.hidden = isChapter/);
  assert.match(component, /selectedThemesEl\.hidden = isChapter/);
  assert.match(component, /if \(selectedEdgeList\) selectedEdgeList\.hidden = true/);
  assert.match(component, /if \(updateWrap\) updateWrap\.hidden = isChapter \|\| !member\.approved/);
  assert.match(component, /selectedKicker\.textContent = member\.owned/);
  assert.match(component, /\? \(member\.pending \? 'Your pending node' : 'Your node'\)/);
  assert.match(component, /: member\.pending \? `Pending \$\{member\.type\}` : typeLabel/);
  assert.doesNotMatch(component, /selectedKicker\.textContent\s*=\s*['"`]Chapter node/);
});

test('home map defers live arrivals while a node is selected and re-reveals on deselect', async () => {
  const component = await readFile(
    new URL('../packages/website/src/components/page-sections/HomeMap.astro', import.meta.url),
    'utf8'
  );

  // Connections that poll in while a node is selected are held back (invisible)
  // rather than flashed across the focused view.
  assert.match(component, /is-pending-reveal/);
  assert.match(component, /deferReveal = Boolean\(selectedFocusTarget\)/);

  // On deselect the held-back lines comet in and the resting web softly re-reveals.
  assert.match(component, /revealDefaultState\(\)/);
  assert.match(component, /markThreadEntering/);
  assert.match(component, /is-resettling/);
  assert.match(component, /@keyframes gpMapThreadResettle/);

  // The re-reveal is one-shot — no idle loop anywhere.
  assert.doesNotMatch(component, /gpMapThreadResettle[\s\S]*?infinite/);
});

test('home map location picker is pin-first with a bundled city autocomplete', async () => {
  const component = await readFile(
    new URL('../packages/website/src/components/page-sections/HomeMap.astro', import.meta.url),
    'utf8'
  );

  // The pin (coordinates) is placed by tap/drag — pointer-driven, not a lone click.
  assert.match(component, /placeFromPointer/);
  assert.match(component, /addEventListener\('pointerdown'/);
  assert.match(component, /addEventListener\('pointermove'/);

  // A native datalist suggests bundled cities, and the list spans continents.
  assert.match(component, /data-location-datalist/);
  assert.match(component, /list="gp-home-map-cities"/);
  assert.match(component, /label: 'Manila'/);
  assert.match(component, /label: 'Mexico City'/);

  // Free-text override: any typed place becomes the label once a pin gives coords,
  // so a diverse set of locations all work (no force-match to a tiny list).
  assert.match(component, /placeInput\.value = raw/);
  // The either/or mode toggle is gone — pin map and city field show together.
  assert.doesNotMatch(component, /data-location-mode-toggle/);
});

test('home map uses exact-overlap fan-out instead of broad cluster bubbles', async () => {
  const component = await readFile(
    new URL('../packages/website/src/components/page-sections/HomeMap.astro', import.meta.url),
    'utf8'
  );

  // A fan-out layer exists, but broad count bubbles are not rendered.
  assert.match(component, /data-home-map-clusters/);
  assert.match(component, /const recomputeClustersNow = \(\)/);
  assert.match(component, /const groupPins =/);
  assert.match(component, /overlapKeyFor/);
  assert.match(component, /renderOverlapStack/);
  assert.match(component, /gp-home-map-overlap-stack/);
  assert.doesNotMatch(component, /renderClusterBubble/);
  assert.doesNotMatch(component, /gp-home-map-cluster-count/);
  assert.doesNotMatch(component, /members\.length\}\s*people/);

  // Exact-overlap stack affordances are real labelled controls.
  assert.match(component, /group\.setAttribute\('role', 'button'\)/);
  assert.match(component, /People\$\{place \? ` near \$\{place\}` : ' at this location'\}/);
  assert.match(component, /Activate to fan out/);
  assert.match(component, /event\.key === 'Enter' \|\| event\.key === ' '/);

  // Hidden stacked pins leave the tab order/accessibility tree, but the selected
  // node is explicitly exempt so active selection remains visible while zooming.
  assert.match(component, /const shouldCluster = clustered && el !== selectedFocusTarget/);
  assert.match(component, /el\.classList\.toggle\('is-clustered', shouldCluster\)/);
  assert.match(component, /el\.setAttribute\('tabindex', shouldCluster \? '-1' : '0'\)/);
  assert.match(component, /setAttribute\('aria-hidden', 'true'\)/);

  // Exact overlaps fan out with leaders and satellite pins; no spread-out zoom
  // cluster path remains.
  assert.match(component, /expandCluster\(members, markerCenter, viaKeyboard\)/);
  assert.match(component, /gp-home-map-cluster-leader/);
  assert.match(component, /gp-home-map-cluster-sat/);
  assert.doesNotMatch(component, /framePoints\(members\.map\(\(m\) => m\.center\)/);
  assert.doesNotMatch(component, /groupIsCoincident/);

  // Astro-scope every JS-created styled element, or the scoped CSS misses it.
  assert.match(component, /makeCircle\('gp-home-map-overlap-dot is-a'/);
  assert.match(component, /applyScope\(leader\)/);

  // One-shot motion only — no idle/looping stack animation; reduced-motion safe.
  assert.match(component, /@keyframes gpMapClusterPop/);
  assert.doesNotMatch(component, /gpMapClusterPop[^;]*infinite/);
  assert.match(component, /reducedMotionPref\(\)/);
});
