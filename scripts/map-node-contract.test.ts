import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { test } from 'node:test';
import * as sharedMapNodes from '@greenpill-network/shared/map-nodes';
import {
  containsPrivateMapNodeField,
  EDITABLE_MAP_NODE_UPDATE_FIELDS,
  normalizePublicMapThemeSlugs,
  PRIVATE_MAP_NODE_FIELDS,
  toEditablePublicMapNode,
  toPublicMapNode,
} from '@greenpill-network/shared/map-nodes';
import {
  getMapCoordinateProblem,
  isMapEdgeCoordinate,
  isPublicMapCoordinate,
  MAP_COORDINATE_PROBLEM_MESSAGES,
  MAP_EDGE_COORDINATE_MESSAGE,
  parseStoredMapCoordinate,
  toStoredMapCoordinate,
} from '@greenpill-network/shared/map-locations';
import { toPublicOperationalLocations } from '@greenpill-network/shared/public-content';
import {
  fanHasRoomForTargets,
  groupOverlappingPins,
  layoutFan,
  pickerPointToLocation,
  separateLabels,
} from '../packages/website/src/lib/home-map-layout.ts';
import {
  createMapNodeSubmission,
  createMapNodeUpdateRequest,
  listPublicMapNodes,
  PublicInputError,
} from '@greenpill-network/agent/map-nodes';
import {
  consumeMapLocationConfirmation,
  createMapLocationRepository,
} from '@greenpill-network/agent/map-locations';
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
  // D2 (2026-11-06): no ecoregion is derived or published for a node.
  assert.equal(publicNode.bioregion, '');
  assert.equal(Object.hasOwn(publicNode, 'bioregionId'), false);
  assert.equal(Object.hasOwn(publicNode, 'bioregionSource'), false);
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
  // D2 (2026-11-06): neither people nor chapters carry ecoregion data.
  for (const node of payload.nodes) {
    assert.equal(node.bioregion ?? '', '');
    assert.equal(Object.hasOwn(node, 'bioregionId'), false);
    assert.equal(Object.hasOwn(node, 'bioregionSource'), false);
  }
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
  // D2 (2026-11-06): a stored region label is not published, so threads carry
  // no region either, even when both people share one.
  assert.equal(payload.edges.some((edge) => (
    Object.hasOwn(edge, 'bioregion') || Object.hasOwn(edge, 'bioregionId') || Object.hasOwn(edge, 'bioregionSource')
  )), false);
  assert.equal(JSON.stringify(payload).includes('West African Coast'), false);

  // Two lines per person (Afo, 2026-11-07, PRD-1423). Asked which rule the
  // map's connections should use after the live map measured 31 lines for 17
  // people, 12 of them at the old cap of four, he picked "Cap 2 per person"
  // over two shared themes or a stronger distance weight. Here the Accra
  // steward and both members fill their two lines with the pairs that share
  // two themes, so the Lagos steward's only candidates are all taken. Nobody
  // is left without a line: the Lagos steward still gets their strongest one
  // (the Lagos member, beside them), and that member goes one over the cap,
  // never more.
  const linesByPerson = new Map<string, number>();
  payload.edges.forEach((edge) => {
    linesByPerson.set(edge.from, (linesByPerson.get(edge.from) ?? 0) + 1);
    linesByPerson.set(edge.to, (linesByPerson.get(edge.to) ?? 0) + 1);
  });
  assert.deepEqual(
    payload.edges.map((edge) => [edge.from, edge.to].sort().join(' ')).sort(),
    [
      'submission:member-1 submission:member-2',
      'submission:member-1 submission:steward-1',
      'submission:member-1 submission:steward-2',
      'submission:member-2 submission:steward-2',
    ]
  );
  assert.equal(linesByPerson.get('submission:steward-1'), 1);
  assert.equal(linesByPerson.get('submission:steward-2'), 2);
  assert.equal(linesByPerson.get('submission:member-1'), 3);
  assert.equal(linesByPerson.get('submission:member-2'), 2);

  // Stewards connect to each other like anyone else who shares a theme.
  const twoStewards = toPublicMapStatePayload({
    generatedAt: '2026-11-07T12:00:00.000Z',
    publicMapNodes: [
      { id: 'steward-a', name: 'Steward A', place: 'Lagos', lat: 6.5244, long: 3.3792, role: 'steward', themes: ['water'], status: 'approved', source: 'approved-submission' },
      { id: 'steward-b', name: 'Steward B', place: 'Accra', lat: 5.6037, long: -0.187, role: 'steward', themes: ['water', 'events'], status: 'approved', source: 'approved-submission' },
    ],
  });
  assert.deepEqual(
    twoStewards.edges.map((edge) => [edge.from, edge.to].sort().join(' ')),
    ['submission:steward-a submission:steward-b']
  );
});

test('public map-state keeps two lines per person, and nobody becomes a hub', () => {
  const person = (id: string, lat: number, long: number, themes: string[]) => ({
    id, name: id, place: id, lat, long, role: 'member', themes, status: 'approved', source: 'approved-submission',
  });
  // Eight people who share four themes fill their two lines among themselves.
  const crowd = Array.from({ length: 8 }, (_, index) => (
    person(`crowd-${index + 1}`, 40 + index, -74 + index * 2, ['water', 'events', 'food', 'trees'])
  ));
  // Four newcomers, each with one theme no other newcomer has, all standing
  // beside crowd-1. Their only matches are the full crowd, so each is left
  // alone until the last pass, and crowd-1 is everyone's strongest match.
  const newcomers = ['water', 'events', 'food', 'trees'].map((theme, index) => (
    person(`newcomer-${index + 1}`, 40.1 + index * 0.1, -74.1, [theme])
  ));
  const payload = toPublicMapStatePayload({ generatedAt: '2026-11-07T12:00:00.000Z', publicMapNodes: [...crowd, ...newcomers] });

  const linesByPerson = new Map<string, number>();
  payload.edges.forEach((edge) => {
    linesByPerson.set(edge.from, (linesByPerson.get(edge.from) ?? 0) + 1);
    linesByPerson.set(edge.to, (linesByPerson.get(edge.to) ?? 0) + 1);
  });
  const lines = (id: string) => linesByPerson.get(`submission:${id}`) ?? 0;
  crowd.forEach((member) => assert.ok(lines(member.id) >= 2 && lines(member.id) <= 3, `${member.id}: ${lines(member.id)} lines`));
  newcomers.forEach((member) => assert.equal(lines(member.id), 1, `${member.id} gets exactly one line`));
  // Without the cap on that last pass, crowd-1 would take all four newcomers
  // and connect to six people: the PRD-619 "one node connects to everyone".
  assert.equal(lines('crowd-1'), 3);
  assert.equal(payload.edges.length, 8 + newcomers.length);
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
      lat: 5.6037,
      long: -0.187,
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

test('D2: the shared package no longer ships or looks up ecoregions', async () => {
  const sharedSourceFiles = await readdir(new URL('../packages/shared/src/', import.meta.url));
  assert.equal(sharedSourceFiles.some((file) => file.startsWith('public-ecoregions')), false);

  const sharedPackage = JSON.parse(await readFile(new URL('../packages/shared/package.json', import.meta.url), 'utf8'));
  assert.equal(Object.hasOwn(sharedPackage.exports, './public-ecoregions'), false);
  const sharedIndex = await readFile(new URL('../packages/shared/src/index.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(sharedIndex, /public-ecoregions/);

  for (const removed of [
    'PUBLIC_ECOREGIONS',
    'findPublicEcoregionById',
    'lookupPublicBioregionFromCoordinates',
    'derivePublicBioregionMetadataFromCoordinates',
    'derivePublicBioregionFromCoordinates',
  ]) {
    assert.equal(Object.hasOwn(sharedMapNodes, removed), false, `${removed} should be gone`);
  }

  // A region label already stored on a row (the agent wrote ecoregion names at
  // intake until this change) is not published either.
  const node = toPublicMapNode({
    id: 'stored-region',
    status: 'approved',
    displayName: 'Stored Region',
    placeName: 'Rio de Janeiro',
    lat: -22.9068,
    long: -43.1729,
    bioregion: 'Serra do Mar coastal forests',
    bioregion_id: '500',
  });
  assert.equal(node?.bioregion, '');
  assert.equal(JSON.stringify(node).includes('Serra do Mar'), false);
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
    { id: 'chapter:nigeria', type: 'chapter', status: 'approved', source: 'chapter-content', lat: 9.082, long: 8.6753 },
    { id: 'submission:member-1', type: 'member', status: 'approved', source: 'approved-submission', lat: 6.5244, long: 3.3792 },
    { id: 'submission:member-2', type: 'member', status: 'approved', source: 'approved-submission', lat: 5.6037, long: -0.187 },
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

test('location integrity migration keeps confirmations and repairs auditable and reversible', async () => {
  const migration = await readFile(
    new URL('../packages/agent/migrations/018_map_location_integrity.sql', import.meta.url),
    'utf8'
  );
  const repairTool = await readFile(
    new URL('./map-node-location-repair.ts', import.meta.url),
    'utf8'
  );
  const packageJson = await readFile(new URL('../package.json', import.meta.url), 'utf8');

  assert.match(migration, /create table if not exists intake\.map_location_geocode_cache/);
  assert.match(migration, /create table if not exists intake\.map_location_geocode_throttle/);
  assert.match(migration, /create table if not exists intake\.map_location_request_limits/);
  assert.match(migration, /create table if not exists intake\.map_location_confirmations/);
  assert.match(migration, /create table if not exists intake\.map_node_location_repairs/);
  assert.match(migration, /map_location_geocode_cache_expiry_idx/);
  assert.match(migration, /map_location_request_limits_expiry_idx/);
  assert.match(migration, /map_node_submissions_latitude_range check \(latitude between -90 and 90\) not valid/);
  assert.match(migration, /map_node_submissions_longitude_range check \(longitude between -180 and 180\) not valid/);
  assert.match(repairTool, /mode: 'dry-run'/);
  assert.match(repairTool, /--apply/);
  assert.match(repairTool, /--revert/);
  assert.match(repairTool, /exact_place_label_with_context_unique_match/);
  assert.match(repairTool, /--after/);
  assert.match(repairTool, /nextCursor/);
  assert.match(repairTool, /const queryLimit = limit \+ 1/);
  assert.match(repairTool, /fetchedRows\.slice\(0, limit\)/);
  assert.match(repairTool, /context\.every/);
  assert.match(repairTool, /candidate\.kind === 'country'/);
  assert.match(repairTool, /MAP_LOCATION_RATE_LIMIT_MS/);
  assert.match(repairTool, /MAX_PROVIDER_THROTTLE_RETRIES/);
  assert.match(repairTool, /await sleep\(MAP_LOCATION_RATE_LIMIT_MS\)/);
  assert.match(repairTool, /map_node_location_repairs/);
  assert.match(packageJson, /db:repair:map-node-locations/);
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
  // Entries: the hero's primary action browses the map, and joining it starts
  // from the "Join the map" pill in the map's own control row.
  assert.doesNotMatch(homepage, /data-home-map-open/);
  assert.match(homepage, /data-home-map-browse=\{primaryBrowsesMap \? '' : undefined\}/);
  assert.match(component, /<figure class="gp-home-map" id="network-map"/);
  assert.match(
    component,
    /<button type="button" class="gp-home-map-join" data-home-map-open aria-haspopup="dialog">Join the map<\/button>/
  );
  assert.match(component, /querySelectorAll\('\[data-home-map-browse\]'\)[\s\S]*?addEventListener\('click', \(\) => openNodeList\(trigger\)\)/);
  // Closing the list gives focus back to whatever opened it (the hero link or
  // the List toggle), not always to the toggle.
  assert.match(component, /const openNodeList = \(\s*opener: HTMLElement \| null = listToggle,\s*subset: [^)]*?\) => \{[\s\S]*?listOpener = opener \?\? listToggle;/);
  assert.equal(component.match(/if \(restoreListFocusOnClose\) restoreListFocus\(\);/g)?.length, 2);
  assert.match(component, /const restoreListFocus = \(\) => \{\s*if \(listOpener\?\.isConnected\) \{\s*listOpener\.focus\(\{ preventScroll: true \}\);/);
  assert.doesNotMatch(component, /restoreListFocusOnClose\) listToggle\??\.focus/);

  // Filtering always offers a way back, and hover never outlives the pointer.
  assert.match(component, /<button type="button" class="gp-home-map-legend-reset" data-home-map-filter-reset hidden>Show all<\/button>/);
  assert.match(component, /const resetMapFilters = \(\) => \{[\s\S]*?activeTypeFilter = '';[\s\S]*?activeThemes\.add\(theme\)[\s\S]*?applyMapFilters\(\);/);
  assert.match(component, /syncFilterStatus\(visibleNodeIds\.size, nodeTypeById\.size\)/);
  assert.match(component, /filterNote\.dataset\.empty = visibleCount === 0 \? 'true' : 'false'/);
  assert.match(component, /const dropPointerFocus = \(\) => \{[\s\S]*?pointerFocusTarget = null;[\s\S]*?hoveredStackKey = '';[\s\S]*?if \(selectedFocusTarget\) return;/);
  assert.match(component, /root\.addEventListener\('mouseleave', dropPointerFocus\)/);
  assert.match(component, /window\.addEventListener\('scroll', \(\) => \{[\s\S]*?dropPointerFocus\(\);[\s\S]*?\{ passive: true \}\)/);
  // Hover resolves from geometry, over the map only: never from the element
  // under the pointer, whose hit circle can lie over a neighbouring pin.
  assert.match(component, /const hoverTargetAtPointer = [\s\S]*?if \(isGestureBlocked\(event\.target\)\) return \{\};[\s\S]*?targetAtPointer\(event\)/);
  assert.doesNotMatch(component, /addEventListener\('mouseenter'/);
  assert.doesNotMatch(component, /addEventListener\('mouseleave', clearFocus\)/);
  // A panel, the list or the join dialog opening clears the selection, any
  // open fan and hover, so no stale card or coloured web stays under them.
  assert.match(component, /const clearMapSurfaces = \(\) => \{[\s\S]*?closeSelected\(\);[\s\S]*?closeFanNow\(\);[\s\S]*?dropPointerFocus\(\);/);
  assert.match(component, /const setFilterPanel = [\s\S]*?if \(openFilterPanel\) \{[\s\S]*?clearMapSurfaces\(\);/);
  assert.match(component, /const openNodeList = \(\s*opener: HTMLElement \| null = listToggle,\s*subset: [^)]*?\) => \{[\s\S]*?clearMapSurfaces\(\);/);
  assert.match(component, /const openAddDialog = \(trigger\?: HTMLElement\) => \{[\s\S]*?clearMapSurfaces\(\);/);
  assert.match(homepage, /min-block-size: calc\(100dvh - var\(--gp-header-height\)\)/);
  assert.match(homepage, /<Text variant="display" class="gp-home-hero-title">/);
  assert.doesNotMatch(homepage, /font-size:\s*clamp\(40px, calc\(30\.1px \+ 2\.65vw\), 64px\)/);
  // The map sizes itself from its container. Viewport height only caps it, and
  // the cap's floor keeps a short viewport out of the compact container query.
  assert.doesNotMatch(homepage, /128dvh/);
  assert.match(component, /--gp-map-aspect:\s*200 \/ 88/);
  assert.match(component, /--gp-map-max-block:\s*max\(56\.25svh, calc\(100svh - 22\.5rem\), 25rem\)/);
  assert.match(component, /width:\s*min\(100%, calc\(var\(--gp-map-max-block\) \* var\(--gp-map-aspect\)\)\)/);
  assert.doesNotMatch(homepage, /width:\s*min\(100%, clamp\(1100px, 82cqw, 1680px\)\)/);
  assert.match(homepage, /class="gp-home-lib-guild-pair"/);
  assert.match(homepage, /\.gp-home-eco-grid\s*{[\s\S]*?display:\s*flex;[\s\S]*?justify-content:\s*center/);
  assert.match(component, /const MAP_VIEW_H = 88/);
  assert.match(component, /viewBox=\{`0 0 \$\{VIEW_W\} \$\{MAP_VIEW_H\}`\}/);
  assert.match(component, /aspect-ratio:\s*var\(--gp-map-aspect\)/);
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
    identityStepMarkup.indexOf('data-location-query') !== -1 &&
      identityStepMarkup.indexOf('data-location-map') !== -1 &&
      identityStepMarkup.indexOf('data-location-query') < identityStepMarkup.indexOf('data-location-map'),
    'identity step should place the place search above the mini map'
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
  const addNodeCssStart = component.indexOf('/* Join-the-map walkthrough', selectedCssStart);
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
  // Compact maps keep their chrome off the drawing: the canvas adds a band
  // below the map for the legend row and the controls row, and the band grows
  // to fit the selected node's bar, which takes the controls' place.
  const compactCss = component.match(/@container \(max-width: 720px\) \{([\s\S]*?)\n  \}\n/)?.[1] ?? '';
  assert.match(compactCss, /\.gp-home-map-canvas\s*{[\s\S]*?aspect-ratio:\s*auto;[\s\S]*?block-size:\s*calc\(44cqw \+ var\(--gp-map-edge\) \* 4 \+ var\(--gp-map-row\) \+ var\(--gp-map-lower\)\)/);
  assert.match(compactCss, /\.gp-home-map-canvas\.has-selected-node\s*{[\s\S]*?--gp-map-lower:\s*max\(var\(--gp-map-row\), calc\(var\(--gp-map-selected-clearance, 186px\) - 18px\)\)/);
  assert.match(compactCss, /\.gp-home-map-svg\s*{[\s\S]*?inset:\s*var\(--gp-map-edge\) 0 auto;[\s\S]*?aspect-ratio:\s*var\(--gp-map-aspect\)/);
  assert.match(compactCss, /\.gp-home-map-legend,\s*\.gp-home-map-canvas\.has-selected-node \.gp-home-map-legend\s*{[\s\S]*?inset-block-end:\s*calc\(var\(--gp-map-edge\) \* 2 \+ var\(--gp-map-lower\)\)/);
  assert.match(compactCss, /\.gp-home-map-canvas\.has-selected-node \.gp-home-map-controls\s*{\s*display:\s*none;/);
  assert.doesNotMatch(compactCss, /aspect-ratio:\s*4 \/ 3/);
  // Narrow maps show legend dots and counts only (DESIGN.md), keeping the
  // label for assistive technology, and the Show all chip ends the row.
  assert.match(component, /@container \(max-width: 520px\) \{\s*\.gp-home-map-legend-label\s*{[\s\S]*?clip:\s*rect\(0 0 0 0\)/);
  assert.match(compactCss, /\.gp-home-map-legend-reset\s*{\s*order:\s*1;/);
  assert.match(compactCss, /\.gp-home-map-filter-note\[data-empty='true'\]:not\(\[hidden\]\)\s*{[\s\S]*?display:\s*flex/);
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
  assert.match(component, /const setFilterPanel = \(panelName: string\) => \{[\s\S]*?if \(openFilterPanel\) \{\s*closeNodeList\(\);[\s\S]*?syncFilterPanels\(\)/);
  assert.match(component, /const openNodeList = \(\s*opener: HTMLElement \| null = listToggle,\s*subset: [^)]*?\) => \{[\s\S]*?closeFilterPanels\(\);[\s\S]*?listDrawer\.hidden = false/);
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
  const moderationDeliveryScript = await readFile(
    new URL('../scripts/map-node-moderation-delivery.ts', import.meta.url),
    'utf8'
  );
  const moderationSql = await readFile(
    new URL('../packages/agent/migrations/019_map_node_moderation_notifications.sql', import.meta.url),
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
    packageJson.scripts['db:deliver:map-node-moderation'],
    'bun run build:packages && bun --no-env-file --env-file-if-exists=.env.local scripts/map-node-moderation-delivery.ts'
  );
  assert.equal(
    packageJson.scripts['test:agent'],
    'bun run build:packages && bun test scripts/agent-contract.test.ts && bun test scripts/map-node-moderation.test.ts'
  );
  assert.equal(
    packageJson.scripts['directus:map-moderation:smoke'],
    'bun --no-env-file scripts/directus-map-moderation-smoke.ts'
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
  assert.match(moderationDeliveryScript, /deliverQueuedModerationNotifications/);
  assert.match(moderationDeliveryScript, /DATABASE_URL is required/);
  assert.match(moderationSql, /create table if not exists intake\.map_node_moderation_notifications/);
  assert.match(moderationSql, /map_node_moderation_notification_submission_idx/);
  assert.match(moderationSql, /map_node_submission_moderation_transition/);
  assert.match(moderationSql, /new\.approved_at = now\(\)/);
  assert.doesNotMatch(moderationSql, /recipient|owner_email|raw_note|ip_address/i);
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

test('home map location picker searches, confirms, then reverse-confirms a dragged pin', async () => {
  const component = await readFile(
    new URL('../packages/website/src/components/page-sections/HomeMap.astro', import.meta.url),
    'utf8'
  );

  // Search results come from the agent and hold a short-lived confirmation id.
  // The browser never chooses authoritative coordinates or labels by itself.
  assert.match(component, /data-location-search/);
  assert.match(component, /\$\{agentBaseUrl\}\/map-locations\/search/);
  assert.match(component, /data-location-confirmation-id/);
  assert.match(component, /locationConfirmationId/);
  assert.match(component, /Find and choose a place to confirm your pin/);
  assert.match(component, /data-location-coordinate-lat/);
  assert.match(component, /data-location-coordinate-long/);
  assert.match(component, /data-location-coordinate-confirm/);

  // The mini map keeps its direct-manipulation affordance, but uses proper SVG
  // coordinate conversion and asks the server to reverse-confirm the final pin.
  assert.match(component, /DOMPoint/);
  assert.match(component, /getScreenCTM\(\)/);
  assert.match(component, /matrix\.inverse\(\)/);
  assert.match(component, /addEventListener\('pointerdown'/);
  assert.match(component, /addEventListener\('pointermove'/);
  assert.match(component, /\$\{agentBaseUrl\}\/map-locations\/reverse/);
  assert.match(component, /confirmDraggedLocation/);
  assert.match(component, /let locationSearchVersion = 0/);
  assert.match(component, /const invalidateLocationRequests/);
  assert.match(component, /locationRequestVersion \+= 1/);
  assert.match(component, /searchVersion !== locationSearchVersion/);
  assert.match(component, /locationQuery\?\.addEventListener\('input',[\s\S]*?invalidateLocationRequests\(\)[\s\S]*?clearLocationSelection\(\)/);
  assert.match(component, /const clearLocationConfirmation[\s\S]*?locationConfirmationInput\.value = ''/);
  // Keep the ordering check inside this function so later pin resets cannot satisfy it,
  // and compare against the first pin hide so an earlier hide cannot slip through.
  const clearLocationSelection = component.match(/const clearLocationSelection = \(\) => \{([\s\S]*?)\n    \};/)?.[1] ?? '';
  const confirmationClearedAt = clearLocationSelection.search(/clearLocationConfirmation\(\)/);
  const firstPinHideAt = clearLocationSelection.search(/locationPin(?:\.setAttribute\(['"]hidden['"],\s*['"][^'"]*['"]\)|\.hidden\s*=\s*true\b)/);
  assert.ok(confirmationClearedAt >= 0, 'clearLocationSelection should clear the location confirmation');
  assert.ok(firstPinHideAt >= 0, 'clearLocationSelection should hide the location pin');
  assert.ok(firstPinHideAt > confirmationClearedAt, 'clearLocationSelection should clear the confirmation before it first hides the pin');
  assert.match(component, /resetWalkthrough[\s\S]*?invalidateLocationRequests\(\)/);
  assert.match(component, /pointerdown[\s\S]*?invalidateLocationRequests\(\)/);
  assert.match(component, /pointercancel[\s\S]*?Pin adjustment canceled/);
  assert.match(component, /confirmEnteredCoordinates/);
  assert.match(component, /tap or drag, or enter coordinates below/);
  assert.doesNotMatch(component, /Find a place first, then adjust its pin/);

  // The old bundled city list and free-text label override are intentionally gone.
  assert.doesNotMatch(component, /data-location-datalist/);
  assert.doesNotMatch(component, /gp-home-map-cities/);
  assert.doesNotMatch(component, /placeIndex/);
  // The either/or mode toggle is gone — search and mini map show together.
  assert.doesNotMatch(component, /data-location-mode-toggle/);
});

test('home map stacks overlapping pins across node types, counts them, and fans them out', async () => {
  const component = await readFile(
    new URL('../packages/website/src/components/page-sections/HomeMap.astro', import.meta.url),
    'utf8'
  );

  // Only pins that sit on top of each other stack (about one pin apart, in map
  // units, so the rule holds at every zoom); merely near pins stay separate,
  // and broad zoom-level cluster bubbles are not drawn.
  assert.match(component, /data-home-map-clusters/);
  assert.match(component, /const OVERLAP_STACK_RADIUS = 1\.4;/);
  assert.match(component, /const groupPins = \(pins: ClusterMember\[\]\): ClusterMember\[\]\[\] => groupOverlappingPins\(pins, OVERLAP_STACK_RADIUS\);/);
  assert.doesNotMatch(component, /overlapKeyFor/);
  assert.doesNotMatch(component, /renderClusterBubble/);
  assert.doesNotMatch(component, /gp-home-map-cluster-count/);
  assert.doesNotMatch(component, /framePoints\(members\.map\(\(m\) => m\.center\)/);
  assert.doesNotMatch(component, /groupIsCoincident/);

  // Chapters and people are grouped together. Chapters never hide: people on a
  // chapter become a badge placed beside it, where it covers no other pin.
  const recompute = component.match(/const recomputeClustersNow = \(\) => \{([\s\S]*?)\n    \};/)?.[1] ?? '';
  assert.match(recompute, /groupPins\(\[\.\.\.visibleChapterPins\(\), \.\.\.visiblePeoplePins\(\)\]\)/);
  assert.match(recompute, /people\.length >= \(chapters\.length \? 1 : 2\)/);
  assert.match(recompute, /people\.forEach\(\(pin\) => setPinClustered\(pin\.el, true\)\)/);
  assert.doesNotMatch(recompute, /chapters\.forEach\(\(pin\) => setPinClustered/);
  assert.match(recompute, /badgeCenterFor\(anchors, radius, taken\)/);
  assert.match(component, /const BADGE_DIRECTIONS = \[-45, -135, 45, 135, 0, 180, -90, 90\]/);

  // A marker for several people shows how many, in their colour: members,
  // stewards, or members with a steward ring. The old three-dot glyph painted a
  // gold dot whether or not a steward was there.
  assert.match(component, /count\.textContent = String\(members\.length\)/);
  assert.match(component, /const tone = stewards === members\.length \? ' is-stewards' : stewards > 0 \? ' has-steward' : ''/);
  assert.doesNotMatch(component, /gp-home-map-overlap-dot/);
  assert.match(component, /\.gp-home-map-overlap-count\s*{[\s\S]*?font-family:\s*var\(--gp-font-mono\)/);

  // Markers are real labelled controls that say who is there and what
  // activating them does, and keyboard focus previews them like hover.
  assert.match(component, /group\.setAttribute\('role', 'button'\)/);
  assert.match(component, /Activate to choose one\./);
  assert.match(component, /const stackWhere = /);
  assert.match(component, /const showStackFocus = \(stack: OverlapStack\) => \{/);
  assert.match(component, /event\.key === 'Enter' \|\| event\.key === ' '/);

  // Hidden pins leave the tab order, the accessibility tree and the pointer
  // (their hit circle opts back into pointer events, so it is switched off
  // too). The selected node stays drawn.
  assert.match(component, /const shouldCluster = clustered && el !== selectedFocusTarget/);
  assert.match(component, /el\.classList\.toggle\('is-clustered', shouldCluster\)/);
  assert.match(component, /el\.setAttribute\('tabindex', shouldCluster \? '-1' : '0'\)/);
  assert.match(component, /setAttribute\('aria-hidden', 'true'\)/);
  assert.match(component, /\.gp-home-map-node-link\.is-clustered \.gp-home-map-node-hit\s*{\s*pointer-events:\s*none;/);

  // Fans: leader lines, satellites sized in screen px, and each satellite's
  // name beside it, so a touch can choose without hovering. Picking rebuilds
  // the stacks right after the click, not on the 90 ms debounce, so a quick
  // second click finds its marker again; and not during it, because handlers
  // further along still ask where the click landed.
  assert.match(component, /fanOutCluster\(members, fanCenter, viaKeyboard, group\)/);
  assert.match(component, /gp-home-map-cluster-leader/);
  assert.match(component, /gp-home-map-cluster-sat-label/);
  assert.match(component, /const pick = \(vk: boolean\) => \{[\s\S]*?collapseFan\(\);[\s\S]*?activateMapNode\(m\.el, vk\);[\s\S]*?window\.setTimeout\(recomputeClustersNow, 0\);/);
  // A press on a satellite's name keeps the fan open for the pick.
  assert.match(component, /if \(targetAtPointer\(event\)\.satellite\) return;/);
  // A click on a satellite or a marker ends there: the root's touch fallback,
  // which opens the nearest pin within 44px, must never see it.
  assert.match(component, /sat\.addEventListener\('click', \(event\) => \{\s*event\.stopPropagation\(\);\s*pick\(/);
  assert.match(component, /group\.addEventListener\('click', \(event\) => \{\s*event\.stopPropagation\(\);\s*expand\(/);
  assert.match(component, /if \(resolved\.satellite\) \{\s*takeOver\(\);\s*resolved\.satellite\.pick\(false\);\s*return;\s*\}/);

  // Pointer rules: geometry decides. A mouse is asked to choose only between
  // pins on the same spot; a touch is asked when more than one pin falls inside
  // its 44px target.
  assert.match(component, /const POINTER_TARGET_RADIUS_PX = 22;/);
  assert.match(component, /const SAME_SPOT_PX = 3;/);
  assert.match(component, /const pinsContestingPointer = /);
  assert.match(component, /if \(contested\.length > 1\) \{[\s\S]*?fanOutCluster\(contested, centroidOf\(contested\), false\)/);
  // The handler that closes a card on an outside click counts the fan as
  // inside, by the event's path, which still holds a satellite removed by the
  // pick it made.
  assert.match(component, /const insideMap = event\.composedPath\(\)\.some\(\(node\) => \([\s\S]*?node\.matches\('\.gp-home-map-node-link, \.gp-home-map-clusters, \.gp-home-map-selected/);

  // Astro-scope every JS-created styled element, or the scoped CSS misses it.
  assert.match(component, /makeCircle\('gp-home-map-overlap-disc'/);
  assert.match(component, /applyScope\(count\)/);
  assert.match(component, /applyScope\(label\)/);
  assert.match(component, /applyScope\(leader\)/);

  // One-shot motion only: no idle or looping stack animation; reduced-motion safe.
  assert.match(component, /@keyframes gpMapClusterPop/);
  assert.doesNotMatch(component, /gpMapClusterPop[^;]*infinite/);
  assert.match(component, /reducedMotionPref\(\)/);
});

test('home map location picker ignores a pin dragged off the map instead of clamping it to the edge', async () => {
  const component = await readFile(
    new URL('../packages/website/src/components/page-sections/HomeMap.astro', import.meta.url),
    'utf8'
  );
  const picker = component.match(/const pointFromLocationPointer = \(event: PointerEvent\) => \{([\s\S]*?)\n    \};/)?.[1] ?? '';
  assert.ok(picker, 'pointFromLocationPointer must exist');
  // The June client clamped a drag to the mini-map edge and saved latitude 90
  // or longitude -180 (qa-map-data handoff). Off the map is now no point at all.
  assert.doesNotMatch(picker, /Math\.min\(VIEW_W, Math\.max\(0, point\.x\)\)/);
  assert.doesNotMatch(picker, /Math\.min\(MAP_VIEW_H, Math\.max\(0, point\.y\)\)/);
  assert.match(picker, /return pickerPointToLocation\(\{ x: point\.x, y: point\.y \}, \{ width: VIEW_W, height: MAP_VIEW_H, worldHeight: VIEW_H \}\);/);
  // The rule itself: a point on the drawn map (200 x 88 of a 200 x 100 world)
  // is a place, and a point past any edge is none. Only the exact boundary
  // reads as an edge value, which the agent refuses as raw coordinates.
  const picker200 = { width: 200, height: 88, worldHeight: 100 };
  assert.deepEqual(pickerPointToLocation({ x: 100, y: 50 }, picker200), { lat: 0, long: 0 });
  assert.deepEqual(pickerPointToLocation({ x: 0, y: 0 }, picker200), { lat: 90, long: -180 });
  assert.equal(pickerPointToLocation({ x: 100, y: -0.01 }, picker200), null);
  assert.equal(pickerPointToLocation({ x: -3, y: 40 }, picker200), null);
  assert.equal(pickerPointToLocation({ x: 200.5, y: 40 }, picker200), null);
  assert.equal(pickerPointToLocation({ x: 100, y: 88.2 }, picker200), null);
  assert.equal(pickerPointToLocation({ x: Number.NaN, y: 40 }, picker200), null);
  // A drag that leaves the map keeps the last point it had on the map: the
  // move is ignored, so the pending point stays, and release confirms it.
  assert.match(component, /const updateDraggedPin = \(event: PointerEvent\) => \{\s*const point = pointFromLocationPointer\(event\);\s*if \(!point\) return;\s*pendingLocationPoint = point;/);
  assert.match(component, /const endLocationDrag = \(event: PointerEvent\) => \{[\s\S]*?if \(pendingLocationPoint\) void confirmDraggedLocation\(pendingLocationPoint\);/);
});

test('home map stack and fan geometry: grouping, in-bounds fans and readable names', () => {
  type Pin = { key: string; center: { x: number; y: number } };
  const pin = (key: string, x: number, y: number): Pin => ({ key, center: { x, y } });
  const keysOf = (groups: Pin[][]) => groups.map((group) => group.map((p) => p.key).sort().join('+')).sort();

  // A chapter and a person on the same spot group together; a pin just past
  // the radius stays alone; neighbours chain (a-b and b-c group a, b, c).
  assert.deepEqual(
    keysOf(groupOverlappingPins([pin('chapter', 50, 30), pin('person', 50, 30), pin('far', 51.5, 30)], 1.4)),
    ['chapter+person', 'far']
  );
  assert.deepEqual(keysOf(groupOverlappingPins([pin('a', 10, 10), pin('b', 11.2, 10), pin('c', 12.4, 10)], 1.4)), ['a+b+c']);
  assert.deepEqual(keysOf(groupOverlappingPins([pin('a', 10, 10), pin('b', 10, 11.5)], 1.4)), ['a', 'b']);

  // A small fan is a circle around its pins, its satellites about one touch
  // target apart.
  const wideView = { x: 0, y: 0, width: 200, height: 88 };
  const small = layoutFan({ count: 3, center: { x: 100, y: 44 }, view: wideView, spacing: 8.8, minRadius: 6.8, reach: 4.4 });
  assert.equal(small.radiusX, small.radiusY);
  assert.equal(small.points.length, 3);

  // At phone size (about 1.6 px per map unit) a stack of 12 needs a ring
  // taller than the 88-unit map. It flattens into an ellipse so every
  // satellite and its touch target stay on the map, still about 44px apart.
  const scale = 1.625;
  const phone = { count: 12, center: { x: 60, y: 30 }, view: wideView, spacing: 44 / scale, minRadius: 34 / scale, reach: 22 / scale };
  const big = layoutFan(phone);
  assert.equal(big.points.length, 12);
  assert.ok(big.radiusY < big.radiusX, 'a ring too tall for the map should flatten');
  for (const point of big.points) {
    assert.ok(point.x - phone.reach >= wideView.x - 1e-6 && point.x + phone.reach <= wideView.x + wideView.width + 1e-6, `x ${point.x} must keep its target on the map`);
    assert.ok(point.y - phone.reach >= wideView.y - 1e-6 && point.y + phone.reach <= wideView.y + wideView.height + 1e-6, `y ${point.y} must keep its target on the map`);
  }
  const gaps = big.points.map((point, i) => {
    const next = big.points[(i + 1) % big.points.length];
    return Math.hypot(next.x - point.x, next.y - point.y);
  });
  assert.ok(Math.min(...gaps) >= phone.spacing * 0.9, `neighbouring satellites should stay about 44px apart: ${Math.min(...gaps)}`);
  assert.ok(big.hitRadius * 2 <= Math.min(...gaps) + 1e-6, 'hit areas must not overlap');
  assert.equal(fanHasRoomForTargets(big, phone.reach), true, '12 people still get full touch targets');
  // Forty people on the same phone-sized map would shrink every target well
  // below a finger's width, so the map offers them as a list instead.
  const huge = layoutFan({ ...phone, count: 40 });
  assert.equal(fanHasRoomForTargets(huge, phone.reach), false, '40 people should go to the list');

  // Names that collide step apart and stay on the map, including when a name
  // pushed up from the bottom edge would land on one already placed.
  const bounds = { top: 0, bottom: 40 };
  const boxes = [
    { x: 0, y: 20, width: 30, height: 6 },
    { x: 10, y: 22, width: 30, height: 6 },
    { x: 5, y: 33, width: 30, height: 6 },
    { x: 8, y: 34, width: 30, height: 6 },
  ];
  const { shifts, clear } = separateLabels(boxes, bounds, 1);
  assert.equal(clear, true);
  const moved = boxes.map((box, i) => ({ ...box, y: box.y + shifts[i] }));
  moved.forEach((box, i) => {
    assert.ok(box.y >= bounds.top && box.y + box.height <= bounds.bottom, `label ${i} must stay on the map`);
    moved.slice(i + 1).forEach((other, j) => {
      const overlap = box.x < other.x + other.width && other.x < box.x + box.width
        && box.y < other.y + other.height && other.y < box.y + box.height;
      assert.equal(overlap, false, `labels ${i} and ${i + j + 1} must not overlap`);
    });
  });
  assert.equal(shifts[0], 0, 'a label with room stays where it is');
  // More names than the map has rows for cannot all end apart; the result
  // says so, and the map then offers a list instead of ambiguous names.
  const crowded = Array.from({ length: 6 }, (_, i) => ({ x: 0, y: 2 * i, width: 30, height: 8 }));
  assert.equal(separateLabels(crowded, { top: 0, bottom: 24 }, 1).clear, false);
});

test('home map keeps focus, hover and selection honest when stacks rebuild', async () => {
  const component = await readFile(
    new URL('../packages/website/src/components/page-sections/HomeMap.astro', import.meta.url),
    'utf8'
  );
  // The filter note is chrome: a touch on its Show all button must reach the
  // button instead of starting a map gesture.
  assert.match(component, /const isGestureBlocked = [\s\S]*?\.gp-home-map-legend, \.gp-home-map-filter-note,/);
  // A selection the filter closed does not get its coloured threads back.
  assert.match(component, /const selectedId = selectedFocusTarget\?\.getAttribute\('data-node-id'\) \|\| '';/);
  assert.doesNotMatch(component, /const selectedId = selectedNode\?\.getAttribute/);
  // Closing a card rebuilds the stacks, so a person drawn while selected goes
  // back into their badge.
  assert.match(component, /const closeSelected = \(\) => \{[\s\S]*?clusterDirty\(\);[\s\S]*?\n    \};/);
  // Rebuilding keeps keyboard focus on what stands for the same people, and a
  // hovered pin that is now hidden gives up the hover card.
  const recompute = component.match(/const recomputeClustersNow = \(\) => \{([\s\S]*?)\n    \};/)?.[1] ?? '';
  assert.match(recompute, /const focusKeys = keysForControl\(active\);/);
  assert.match(recompute, /if \(active && \(!active\.isConnected \|\| active\.classList\.contains\('is-clustered'\)\) && !focusControlFor\(focusKeys\)\) \{/);
  assert.match(recompute, /if \(pointerFocusTarget\?\.classList\.contains\('is-clustered'\)\) \{\s*pointerFocusTarget = null;\s*clearFocus\(\);/);
  // Escape hands focus to whatever stands for any of the fan's people.
  assert.match(component, /const fanKeys = activeFan\.map\(\(member\) => member\.key\);[\s\S]*?if \(!root\.contains\(document\.activeElement\) && !focusControlFor\(fanKeys\)\)/);
  // A mouse click on a stack opens that stack; only touch asks about every pin
  // inside its target.
  assert.match(component, /const contested = viaTouch \|\| !resolved\.stack \? pinsContestingPointer\(event, viaTouch\) : \[\];/);
  // When an update removes everyone a focused control stood for, the legend
  // takes focus rather than the page.
  assert.match(recompute, /&& !focusControlFor\(focusKeys\)\) \{\s*legendItems\[0\]\?\.focus\(\{ preventScroll: true \}\);/);
  assert.match(component, /if \(!root\.contains\(document\.activeElement\) && !focusControlFor\(fanKeys\)\) legendItems\[0\]\?\.focus/);
  // A stack too large to fan out with full touch targets, or whose names
  // cannot be told apart, opens the map list with just its people.
  assert.match(component, /if \(!fanHasRoomForTargets\(\{ hitRadius \}, reach\)\) \{\s*openStackList\(members, opener\);\s*return;/);
  assert.match(component, /if \(!labelsClear\) \{\s*openStackList\(members, opener\);\s*return;/);
  assert.match(component, /const nodes = visibleMapNodes\(\)\.filter\(\(node\) => !listSubset \|\| listSubset\.keys\.has\(node\.dataset\.nodeId \|\| ''\)\);/);
  assert.match(component, /<p class="gp-home-map-list-kicker" data-home-map-list-kicker>Visible nodes<\/p>/);
  // Scrolling keeps the preview of a marker or satellite that has keyboard focus.
  assert.match(component, /active\.matches\('\.gp-home-map-node-link:focus-visible, \[data-home-map-cluster\]:focus-visible, \.gp-home-map-cluster-sat:focus-visible'\)/);
  // New map controls and the compact band use spacing tokens; heights derive
  // from the 44px touch target.
  assert.match(component, /--gp-map-edge: var\(--gp-space-sm\);/);
  assert.match(component, /--gp-map-row: calc\(44px \+ var\(--gp-space-xs\) \* 2 \+ 2px\);/);
  assert.match(component, /\.gp-home-map-join \{[\s\S]*?min-height: calc\(40px \+ var\(--gp-space-xs\) \* 2 \+ 2px\);\s*padding: 0 var\(--gp-space-md\);/);
});

test('home map no longer reads ecoregion names into its cards or thread tooltips', async () => {
  const component = await readFile(
    new URL('../packages/website/src/components/page-sections/HomeMap.astro', import.meta.url),
    'utf8'
  );
  // D2 removed the ecoregion layer, so `bioregion` is always empty in the
  // public payload; the selected card, hover card and thread tooltip that
  // printed it are gone.
  assert.doesNotMatch(component, /bioregion/i);
  assert.match(component, /edgeTooltipMeta\.textContent = edge\.themeLabel;/);
});

test('home map list heading follows the page h1', async () => {
  const component = await readFile(
    new URL('../packages/website/src/components/page-sections/HomeMap.astro', import.meta.url),
    'utf8'
  );
  // The home page's h1 is the hero title; the map list is the next level.
  assert.match(component, /<h2 id="gp-home-map-list-title">Map list<\/h2>/);
  assert.doesNotMatch(component, /<h3 id="gp-home-map-list-title">/);
});

// ---------------------------------------------------------------------------
// PRD-1409 (qa-map-data): nodes saved at impossible coordinates.
// Live /map/state on 2026-11-06 held these public points. The June 2026
// add-node client produced them: a pin drag clamped to the mini-map edge gave
// latitude 90 or longitude -180, and a place typed with no pin read the empty
// latitude and longitude fields as 0. Out-of-range, non-numeric and 0,0 points
// are always refused. An exact edge point is refused from raw coordinates but
// accepted from a confirmed place, because real places sit on the 180th
// meridian (Fiji). Evidence: .plans/archive/website-qa-2026-11/handoffs/qa-map-data.md
// ---------------------------------------------------------------------------
const LIVE_EDGE_POINTS = Object.freeze([
  { place: 'Florida', lat: 90, long: 97.76261 },
  { place: 'Taiwan', lat: 90, long: 176.912492 },
  { place: 'Awka', lat: 56.462976, long: -180 },
]);
const LIVE_NULL_ISLAND_POINTS = Object.freeze([
  { place: 'Port Harcourt', lat: 0, long: 0 },
  { place: 'Rotterdam, Netherlands', lat: 0, long: 0 },
]);
// A real place on the 180th meridian, as a geocoder would confirm it.
const FIJI_MERIDIAN_POINT = Object.freeze({ place: 'Taveuni, Fiji', lat: -16.8, long: 180 });
const LEGACY_LOCATION_ENV = Object.freeze({ MAP_LOCATION_CONFIRMATION_REQUIRED: 'false' });
const TEST_CONFIRMATION_ID = '11111111-1111-4111-8111-111111111111';
const EM_DASH = String.fromCharCode(0x2014);

function createRecordingSql(respond: (text: string, values: unknown[]) => unknown[] | undefined = () => []) {
  const statements: Array<{ text: string; values: unknown[] }> = [];
  const sql: any = async (strings: TemplateStringsArray, ...values: unknown[]) => {
    const text = strings.join('?').replace(/\s+/g, ' ').trim();
    statements.push({ text, values });
    return respond(text, values) ?? [];
  };
  sql.json = (value: unknown) => value;
  sql.begin = async (callback: (tx: any) => unknown) => callback(sql);
  sql.end = async () => {};
  return { sql, statements };
}

const wroteTo = (statements: Array<{ text: string }>, table: string) => (
  statements.some((statement) => statement.text.includes(`insert into ${table}`))
);

const insertedInto = (statements: Array<{ text: string; values: unknown[] }>, table: string) => (
  statements.find((statement) => statement.text.includes(`insert into ${table}`))
);

const approvedRow = (point: { place: string; lat: unknown; long: unknown }, index: number) => ({
  id: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
  status: 'approved',
  displayName: `Person ${index}`,
  placeName: point.place,
  lat: point.lat,
  long: point.long,
  themes: ['public'],
});

test('map coordinates refuse out-of-range, non-numeric and 0,0 values, and flag exact edge points', () => {
  const cases: Array<[unknown, unknown, string | null]> = [
    [90.5, 10, 'latitude_out_of_range'],
    [-91, 10, 'latitude_out_of_range'],
    [10, 180.5, 'longitude_out_of_range'],
    [10, -181, 'longitude_out_of_range'],
    [0, 0, 'null_island'],
    ['0', '0.000000', 'null_island'],
    [null, 3.3792, 'missing'],
    ['', '', 'missing'],
    ['   ', 3.3792, 'missing'],
    [true, 3.3792, 'missing'],
    ['north', 3.3792, 'missing'],
    [Number.NaN, 3.3792, 'missing'],
    [Number.POSITIVE_INFINITY, 3.3792, 'missing'],
    // In range: the edges themselves, the equator and the prime meridian.
    [90, 97.76261, null],
    [-90, 0, null],
    [56.462976, -180, null],
    [-16.8, 180, null],
    [0, 3.3792, null],
    [51.4779, 0, null],
    ['6.5244', '3.3792', null],
  ];
  for (const [lat, long, expected] of cases) {
    assert.equal(getMapCoordinateProblem(lat, long), expected, `${String(lat)}, ${String(long)}`);
    assert.equal(isPublicMapCoordinate(lat, long), expected === null, `${String(lat)}, ${String(long)}`);
  }

  const edgeCases: Array<[unknown, unknown, boolean]> = [
    [90, 97.76261, true],
    [-90, 0, true],
    [56.462976, -180, true],
    [-16.8, 180, true],
    [89.999999, 179.999999, false],
    [6.5244, 3.3792, false],
    ['', '', false],
  ];
  for (const [lat, long, edge] of edgeCases) {
    assert.equal(isMapEdgeCoordinate(lat, long), edge, `${String(lat)}, ${String(long)}`);
  }

  for (const message of [...Object.values(MAP_COORDINATE_PROBLEM_MESSAGES), MAP_EDGE_COORDINATE_MESSAGE]) {
    assert.equal(message.includes(EM_DASH), false);
  }
});

test('nodes at 0,0 or out of range stay off the public map, while edge points and Fiji stay on', () => {
  for (const [index, point] of LIVE_NULL_ISLAND_POINTS.entries()) {
    assert.equal(toPublicMapNode(approvedRow(point, index)), null, point.place);
  }
  // Null and blank values used to read as 0 and project to 0,0.
  assert.equal(toPublicMapNode(approvedRow({ place: 'Port Harcourt', lat: null, long: null }, 7)), null);
  assert.equal(toPublicMapNode(approvedRow({ place: 'Port Harcourt', lat: '', long: '' }, 8)), null);
  assert.equal(toPublicMapNode(approvedRow({ place: 'Nowhere', lat: 95, long: 10 }, 9)), null);
  // An edge point may be a real place, so the projection keeps it. The
  // clamped live rows are fixed by the approved data repair, not hidden.
  for (const [index, point] of [...LIVE_EDGE_POINTS, FIJI_MERIDIAN_POINT].entries()) {
    assert.ok(toPublicMapNode(approvedRow(point, 20 + index)), point.place);
  }

  const payload = toPublicMapStatePayload({
    generatedAt: '2026-11-06T22:58:27.831Z',
    chapterLocations: [
      { id: 'brasil', name: 'Greenpill Brasil', lat: -22.9068, long: -43.1729, status: 'active' },
      { id: 'placeholder', name: 'Placeholder Chapter', lat: 0, long: 0, status: 'active' },
    ],
    publicMapNodes: [...LIVE_NULL_ISLAND_POINTS.map(approvedRow), approvedRow(FIJI_MERIDIAN_POINT, 30)],
    sourceStatus: [
      { source: 'chapter-locations', status: 'ok', count: 2 },
      { source: 'approved-map-nodes', status: 'ok', count: 3 },
    ],
  });
  assert.deepEqual(payload.nodes.map((node) => node.name).sort(), ['Greenpill Brasil', 'Person 30']);
  assert.equal(payload.nodes.find((node) => node.name === 'Person 30')?.long, 180);
  assert.equal(payload.counts.chapterNodes, 1);
  assert.equal(payload.counts.approvedSubmittedNodes, 1);

  // The payload guard refuses a payload that still carries 0,0 or an
  // out-of-range point, and accepts the meridian.
  for (const bad of [{ lat: 0, long: 0 }, { lat: 95, long: 10 }]) {
    assert.throws(
      () => assertPublicMapStatePayload({
        ...payload,
        nodes: [...payload.nodes, { ...payload.nodes[0], id: 'chapter:bad', ...bad }],
      }),
      /impossible coordinates/
    );
  }
  assert.doesNotThrow(() => assertPublicMapStatePayload(payload));
});

test('the agent lists edge nodes, leaves 0,0 rows off the public list and reports only their ids', async () => {
  const row = (point: { place: string; lat: number; long: number }, id: string) => ({
    id,
    name: `Person ${id.slice(-2)}`,
    place: point.place,
    city: '',
    region: '',
    country: '',
    lat: point.lat,
    long: point.long,
    role: 'member',
    chapterSlug: '',
    themes: ['public'],
    bioregion: 'Serra do Mar coastal forests',
    publicNote: '',
    status: 'approved',
  });
  const rows = [
    ...LIVE_EDGE_POINTS.map((point, index) => row(point, `00000000-0000-4000-8000-00000000002${index}`)),
    ...LIVE_NULL_ISLAND_POINTS.map((point, index) => row(point, `00000000-0000-4000-8000-00000000003${index}`)),
    row({ place: 'Toronto', lat: 43.6532, long: -79.3832 }, '00000000-0000-4000-8000-000000000099'),
  ];
  const { sql } = createRecordingSql((text) => (text.includes('from intake.public_map_nodes') ? rows : []));
  const reports: Array<Array<{ id: string; problem: string }>> = [];
  const nodes = await listPublicMapNodes(sql, { reportHiddenNodes: (hidden) => reports.push(hidden) });

  assert.deepEqual(nodes.map((node) => node.place), ['Florida', 'Taiwan', 'Awka', 'Toronto']);
  assert.equal(nodes.every((node) => node.bioregion === ''), true);
  assert.equal(reports.length, 1);
  assert.deepEqual(reports[0], [
    { id: '00000000-0000-4000-8000-000000000030', problem: 'null_island' },
    { id: '00000000-0000-4000-8000-000000000031', problem: 'null_island' },
  ]);
});

test('raw coordinates: out-of-range and 0,0 are refused, and an edge point needs a confirmed place', async () => {
  const refused = [
    ...LIVE_EDGE_POINTS.map((point) => ({ ...point, message: MAP_EDGE_COORDINATE_MESSAGE })),
    { ...FIJI_MERIDIAN_POINT, message: MAP_EDGE_COORDINATE_MESSAGE },
    ...LIVE_NULL_ISLAND_POINTS.map((point) => ({ ...point, message: MAP_COORDINATE_PROBLEM_MESSAGES.null_island })),
    { place: 'Port Harcourt', lat: '0', long: '0', message: MAP_COORDINATE_PROBLEM_MESSAGES.null_island },
    { place: 'Nowhere', lat: 90.5, long: 10, message: MAP_COORDINATE_PROBLEM_MESSAGES.latitude_out_of_range },
  ];
  for (const point of refused) {
    const { sql, statements } = createRecordingSql((text) => (
      text.includes('from intake.map_node_intake_settings') ? [{ liveOnboardingEnabled: false }] : []
    ));
    await assert.rejects(
      () => createMapNodeSubmission(sql, {
        name: 'Legacy Browser Member',
        place: point.place,
        lat: point.lat,
        long: point.long,
        themes: ['public'],
        email: 'legacy@example.org',
      }, {}, { env: LEGACY_LOCATION_ENV }),
      (error) => error instanceof PublicInputError
        && error.code === 'invalid_coordinates'
        && error.status === 400
        && error.message === point.message,
      `${point.place} ${String(point.lat)}, ${String(point.long)}`
    );
    assert.equal(wroteTo(statements, 'intake.map_node_submissions'), false);
  }

  // A raw point just inside the meridian is an ordinary location.
  const { sql, statements } = createRecordingSql((text) => {
    if (text.includes('from intake.map_node_intake_settings')) return [{ liveOnboardingEnabled: false }];
    if (text.includes('insert into intake.map_node_submissions')) {
      return [{ id: '00000000-0000-4000-8000-000000000124', status: 'pending', displayName: 'Raw Fiji', placeName: 'Taveuni, Fiji', lat: -16.8, long: 179.99, themes: ['public'], createdAt: '2026-11-06T12:00:00.000Z' }];
    }
    if (text.includes('insert into intake.map_node_moderation_notifications')) return [{ id: 'notification-1' }];
    return [];
  });
  await createMapNodeSubmission(sql, {
    name: 'Raw Fiji',
    place: 'Taveuni, Fiji',
    lat: -16.8,
    long: 179.99,
    themes: ['public'],
    email: 'raw@example.org',
  }, {}, { env: LEGACY_LOCATION_ENV, deferProviderSend: true });
  assert.equal(wroteTo(statements, 'intake.map_node_submissions'), true);
});

test('D2: the agent no longer stores a derived ecoregion name at intake', async () => {
  const { sql, statements } = createRecordingSql((text) => {
    if (text.includes('from intake.map_node_intake_settings')) return [{ liveOnboardingEnabled: false }];
    if (text.includes('insert into intake.map_node_submissions')) {
      return [{
        id: '00000000-0000-4000-8000-000000000123',
        status: 'pending',
        displayName: 'Legacy Browser Member',
        placeName: 'Oakland',
        lat: 37.8044,
        long: -122.2712,
        themes: ['public'],
        createdAt: '2026-11-06T12:00:00.000Z',
      }];
    }
    if (text.includes('insert into intake.map_node_moderation_notifications')) return [{ id: 'notification-1' }];
    return [];
  });
  await createMapNodeSubmission(sql, {
    name: 'Legacy Browser Member',
    place: 'Oakland',
    lat: 37.8044,
    long: -122.2712,
    themes: ['public'],
    email: 'legacy@example.org',
  }, {}, { env: LEGACY_LOCATION_ENV, deferProviderSend: true });
  const insert = insertedInto(statements, 'intake.map_node_submissions');
  assert.ok(insert);
  assert.equal(insert.values.includes('California interior chaparral and woodlands'), false);
  assert.doesNotMatch(insert.text.split('returning')[0], /bioregion/);
});

test('a confirmed place on the 180th meridian saves, and a confirmation at 0,0 is refused before anything is written', async () => {
  const submissionSql = (confirmation: { label: string; lat: number; long: number }) => createRecordingSql((text) => {
    if (text.includes('update intake.map_location_confirmations')) {
      return [{ ...confirmation, kind: 'settlement', provider: 'nominatim', providerPlaceId: 'node:1' }];
    }
    if (text.includes('from intake.map_node_intake_settings')) return [{ liveOnboardingEnabled: false }];
    if (text.includes('insert into intake.map_node_submissions')) {
      return [{ id: '00000000-0000-4000-8000-000000000125', status: 'pending', displayName: 'Confirmed Member', placeName: confirmation.label, lat: confirmation.lat, long: confirmation.long, themes: ['public'], createdAt: '2026-11-06T12:00:00.000Z' }];
    }
    if (text.includes('insert into intake.map_node_moderation_notifications')) return [{ id: 'notification-1' }];
    return [];
  });
  const input = { name: 'Confirmed Member', locationConfirmationId: TEST_CONFIRMATION_ID, themes: ['public'], email: 'member@example.org' };

  const fiji = submissionSql({ label: FIJI_MERIDIAN_POINT.place, lat: FIJI_MERIDIAN_POINT.lat, long: FIJI_MERIDIAN_POINT.long });
  await createMapNodeSubmission(fiji.sql, input, {}, { deferProviderSend: true });
  const insert = insertedInto(fiji.statements, 'intake.map_node_submissions');
  assert.ok(insert);
  assert.equal(insert.values.includes(180), true);

  const zero = submissionSql({ label: 'Null Island', lat: 0, long: 0 });
  await assert.rejects(
    () => createMapNodeSubmission(zero.sql, input, {}, { deferProviderSend: true }),
    (error) => error instanceof PublicInputError && error.code === 'invalid_location_confirmation'
  );
  assert.equal(wroteTo(zero.statements, 'intake.map_node_submissions'), false);
  await assert.rejects(
    () => consumeMapLocationConfirmation(zero.sql, TEST_CONFIRMATION_ID),
    (error) => error instanceof PublicInputError && error.code === 'invalid_location_confirmation'
  );
});

test('owner edits: raw coordinates cannot create or keep an edge or 0,0 point, and a confirmed edge place can', async () => {
  const nodeId = '33333333-3333-4333-8333-333333333333';
  const tokenRow = {
    tokenId: '22222222-2222-4222-8222-222222222222',
    normalizedEmail: 'owner@example.org',
    submissionId: nodeId,
    displayName: 'Owner',
    placeName: 'Awka',
    city: '',
    region: '',
    country: '',
    lat: 56.462976,
    long: -180,
    themes: ['public'],
    publicNote: '',
    currentSubmissionUpdatedAt: '2026-06-17T12:00:00.000Z',
  };
  const updateSql = () => createRecordingSql((text) => {
    if (text.includes('update intake.map_location_confirmations')) {
      return [{ label: FIJI_MERIDIAN_POINT.place, lat: FIJI_MERIDIAN_POINT.lat, long: FIJI_MERIDIAN_POINT.long, kind: 'settlement', provider: 'nominatim', providerPlaceId: 'node:2' }];
    }
    if (text.includes('from intake.map_node_edit_tokens')) return [tokenRow];
    if (text.includes('insert into intake.map_node_update_requests')) return [{ id: 'update-request-1', status: 'pending' }];
    if (text.includes('update intake.map_node_edit_tokens')) return [{ id: tokenRow.tokenId }];
    return [];
  });
  const refused: Array<[Record<string, unknown>, string]> = [
    [{ lat: 90, long: 7.0661 }, MAP_EDGE_COORDINATE_MESSAGE],
    [{ lat: 0, long: 0 }, MAP_COORDINATE_PROBLEM_MESSAGES.null_island],
    // Only latitude changes, so the stored longitude of -180 would remain.
    [{ lat: 6.2104 }, MAP_EDGE_COORDINATE_MESSAGE],
  ];
  for (const [change, message] of refused) {
    const { sql, statements } = updateSql();
    await assert.rejects(
      () => createMapNodeUpdateRequest(sql, nodeId, { token: 'valid-token', ...change }, {}, { env: LEGACY_LOCATION_ENV }),
      (error) => error instanceof PublicInputError && error.code === 'invalid_coordinates' && error.message === message,
      JSON.stringify(change)
    );
    assert.equal(wroteTo(statements, 'intake.map_node_update_requests'), false);
  }

  const raw = updateSql();
  await createMapNodeUpdateRequest(raw.sql, nodeId, { token: 'valid-token', lat: 6.2104, long: 7.0661 }, {}, {
    env: LEGACY_LOCATION_ENV,
  });
  assert.equal(wroteTo(raw.statements, 'intake.map_node_update_requests'), true);

  const confirmed = updateSql();
  await createMapNodeUpdateRequest(confirmed.sql, nodeId, { token: 'valid-token', locationConfirmationId: TEST_CONFIRMATION_ID });
  const insert = insertedInto(confirmed.statements, 'intake.map_node_update_requests');
  assert.ok(insert);
  assert.equal(insert.values.includes(180), true);
});

function createLocationSql() {
  const cache = new Map();
  const limits = new Map();
  let confirmations = 0;
  return createRecordingSql((text, values) => {
    if (text.includes('from intake.map_location_geocode_cache')) {
      const row = cache.get(values[0]);
      return row ? [row] : [];
    }
    if (text.includes('insert into intake.map_location_request_limits')) {
      if (!limits.has(values[0])) limits.set(values[0], { windowStartedAt: values[1], requestCount: 0 });
      return [];
    }
    if (text.includes('from intake.map_location_request_limits')) {
      const state = limits.get(values[0]);
      return state ? [state] : [];
    }
    if (text.includes('select next_request_at')) return [{ nextRequestAt: new Date(0) }];
    if (text.includes('insert into intake.map_location_geocode_cache')) {
      cache.set(values[0], { payload: values[2], expiresAt: values[3] });
      return [];
    }
    if (text.includes('insert into intake.map_location_confirmations')) {
      confirmations += 1;
      return [{ confirmationId: `00000000-0000-4000-8000-${String(confirmations).padStart(12, '0')}` }];
    }
    return [];
  });
}

test('place search keeps a place on the 180th meridian and drops 0,0; reverse refuses bad pins before the provider and lets it judge edge pins', async () => {
  const providerCalls: string[] = [];
  const nullIsland = { display_name: 'Null Island', lat: '0', lon: '0', addresstype: 'island', osm_type: 'node', osm_id: 1 };
  const taveuni = { display_name: 'Taveuni, Fiji', lat: '-16.8', lon: '180', addresstype: 'island', osm_type: 'relation', osm_id: 2 };
  const awka = { display_name: 'Awka, Anambra, Nigeria', lat: '6.2104', lon: '7.0661', addresstype: 'city', osm_type: 'relation', osm_id: 3 };
  const svalbard = { display_name: 'Longyearbyen, Svalbard', lat: '78.2232', lon: '15.6267', addresstype: 'town', osm_type: 'node', osm_id: 4 };
  const { sql } = createLocationSql();
  const repository = createMapLocationRepository({
    createSql: () => sql,
    env: { MAP_GEOCODER_BASE_URL: 'https://geocoder.example.test' },
    now: () => new Date('2026-11-06T12:00:00.000Z'),
    fetchImpl: async (url) => {
      const href = String(url);
      providerCalls.push(href);
      if (href.includes('/search')) return Response.json([nullIsland, taveuni, awka]);
      return Response.json(new URL(href).searchParams.get('lat') === '-16.8' ? taveuni : svalbard);
    },
  });

  const search = await repository.search('Taveuni', { rateLimitKey: '198.51.100.20' });
  assert.deepEqual(search.results.map((result) => result.label), ['Taveuni, Fiji', 'Awka, Anambra, Nigeria']);

  const callsBeforeReverse = providerCalls.length;
  const refusedPins: Array<[unknown, unknown, string]> = [
    [0, 0, MAP_COORDINATE_PROBLEM_MESSAGES.null_island],
    [95, 10, MAP_COORDINATE_PROBLEM_MESSAGES.latitude_out_of_range],
    ['', '', MAP_COORDINATE_PROBLEM_MESSAGES.missing],
  ];
  for (const [lat, long, message] of refusedPins) {
    await assert.rejects(
      () => repository.reverse(lat, long, { rateLimitKey: '198.51.100.20' }),
      (error) => error instanceof PublicInputError && error.code === 'invalid_coordinates' && error.message === message
    );
  }
  assert.equal(providerCalls.length, callsBeforeReverse);

  // A pin clamped to the top edge reaches the geocoder, which finds nothing near.
  await assert.rejects(
    () => repository.reverse(90, 10, { rateLimitKey: '198.51.100.20' }),
    (error) => error instanceof PublicInputError && error.code === 'location_not_confirmed'
  );
  // A pin on the meridian in Fiji confirms the real place.
  const fiji = await repository.reverse(-16.8, 180, { rateLimitKey: '198.51.100.20' });
  assert.equal(fiji.confirmation.label, 'Taveuni, Fiji');
  assert.equal(fiji.confirmation.long, 180);
});

test('local pending nodes the June client left at 0,0 or with empty fields are dropped on load', () => {
  const storage = new MemoryStorage();
  storage.setItem('greenpill.pendingMapNodes.v1', JSON.stringify([
    { id: 'local-1', name: 'Pasted Place', place: 'Port Harcourt', lat: 0, long: 0, createdAt: '2026-06-17T12:00:00.000Z' },
    { id: 'local-3', name: 'Empty Fields', place: 'Rotterdam', lat: '', long: '', createdAt: '2026-06-17T12:00:00.000Z' },
    { id: 'local-4', name: 'Real Place', place: 'Lagos', lat: 6.5244, long: 3.3792, createdAt: '2026-06-17T12:00:00.000Z' },
    { id: 'local-5', name: 'Meridian Place', place: 'Taveuni, Fiji', lat: -16.8, long: 180, createdAt: '2026-11-06T12:00:00.000Z' },
  ]));
  assert.deepEqual(loadStoredLocalPendingNodes(storage).map((node) => node.id), ['local-4', 'local-5']);
  assert.deepEqual(sharedMapNodes.loadLocalPendingNodes(storage).map((node) => node.id), ['local-4', 'local-5']);
});

test('D2: the home map and footer drop the ecoregion layer and its credit', async () => {
  const component = await readFile(
    new URL('../packages/website/src/components/page-sections/HomeMap.astro', import.meta.url),
    'utf8'
  );
  assert.doesNotMatch(component, /public-ecoregions/);
  assert.doesNotMatch(component, /Ecoregion/);
  assert.doesNotMatch(component, /bioregion-outline|BioregionOutline/);
  assert.doesNotMatch(component, /derivePublicBioregion/);

  const footer = await readFile(
    new URL('../packages/website/src/components/shell/SiteFooter.astro', import.meta.url),
    'utf8'
  );
  assert.doesNotMatch(footer, /Ecoregion|RESOLVE/);

  const scriptFiles = await readdir(new URL('./', import.meta.url));
  assert.equal(scriptFiles.includes('generate-public-ecoregions.ts'), false);
});

// PRD-1409 review follow-ups: PostgreSQL rounding and chapter anchors.
// ---------------------------------------------------------------------------

test('coordinates are judged at the six decimal places PostgreSQL stores', () => {
  // numeric(9, 6) rounds anything finer, so the rule judges the rounded value.
  assert.equal(toStoredMapCoordinate(89.9999999), 90);
  assert.equal(toStoredMapCoordinate(-179.9999996), -180);
  assert.equal(toStoredMapCoordinate(51.9244424), 51.924442);
  assert.equal(Object.is(toStoredMapCoordinate(-0.0000004), 0), true);
  assert.equal(parseStoredMapCoordinate('0.0000001'), 0);
  assert.equal(parseStoredMapCoordinate(''), null);

  const cases: Array<[unknown, unknown, string | null, boolean]> = [
    // [latitude, longitude, problem, edge point once stored]
    [0, 0.0000001, 'null_island', false],
    ['-0.0000004', '0.0000004', 'null_island', false],
    [0.000001, 0, null, false],
    [89.9999999, 10, null, true],
    [10, -179.9999996, null, true],
    [90.0000004, 10, null, true],
    [90.000001, 10, 'latitude_out_of_range', false],
    [10, 180.000001, 'longitude_out_of_range', false],
  ];
  for (const [lat, long, problem, edge] of cases) {
    assert.equal(getMapCoordinateProblem(lat, long), problem, `${String(lat)}, ${String(long)}`);
    assert.equal(isMapEdgeCoordinate(lat, long), edge, `${String(lat)}, ${String(long)}`);
  }
});

test('the agent saves the six-decimal point it judged, so rounding cannot turn a raw point into an edge or 0,0', async () => {
  const refused = [
    { place: 'Longyearbyen', lat: 89.9999999, long: 10, message: MAP_EDGE_COORDINATE_MESSAGE },
    { place: 'Port Harcourt', lat: 0, long: 0.0000001, message: MAP_COORDINATE_PROBLEM_MESSAGES.null_island },
  ];
  for (const point of refused) {
    const { sql, statements } = createRecordingSql((text) => (
      text.includes('from intake.map_node_intake_settings') ? [{ liveOnboardingEnabled: false }] : []
    ));
    await assert.rejects(
      () => createMapNodeSubmission(sql, {
        name: 'Legacy Browser Member',
        place: point.place,
        lat: point.lat,
        long: point.long,
        themes: ['public'],
        email: 'legacy@example.org',
      }, {}, { env: LEGACY_LOCATION_ENV }),
      (error) => error instanceof PublicInputError
        && error.code === 'invalid_coordinates'
        && error.message === point.message,
      point.place
    );
    assert.equal(wroteTo(statements, 'intake.map_node_submissions'), false);
  }

  const { sql, statements } = createRecordingSql((text) => {
    if (text.includes('from intake.map_node_intake_settings')) return [{ liveOnboardingEnabled: false }];
    if (text.includes('insert into intake.map_node_submissions')) {
      return [{ id: '00000000-0000-4000-8000-000000000126', status: 'pending', displayName: 'Rotterdam Member', placeName: 'Rotterdam, Netherlands', lat: 51.924442, long: 4.47775, themes: ['public'], createdAt: '2026-11-07T12:00:00.000Z' }];
    }
    if (text.includes('insert into intake.map_node_moderation_notifications')) return [{ id: 'notification-1' }];
    return [];
  });
  await createMapNodeSubmission(sql, {
    name: 'Rotterdam Member',
    place: 'Rotterdam, Netherlands',
    lat: 51.9244424,
    long: '4.4777504',
    themes: ['public'],
    email: 'member@example.org',
  }, {}, { env: LEGACY_LOCATION_ENV, deferProviderSend: true });
  const insert = insertedInto(statements, 'intake.map_node_submissions');
  assert.ok(insert);
  assert.equal(insert.values.includes(51.924442), true);
  assert.equal(insert.values.includes(4.47775), true);
  assert.equal(insert.values.includes(51.9244424), false);

  // Owner edits round the same way before the pair is judged.
  const nodeId = '44444444-4444-4444-8444-444444444444';
  const tokenRow = {
    tokenId: '55555555-5555-4555-8555-555555555555',
    normalizedEmail: 'owner@example.org',
    submissionId: nodeId,
    displayName: 'Owner',
    placeName: 'Awka',
    city: '',
    region: '',
    country: '',
    lat: 6.2104,
    long: 7.0661,
    themes: ['public'],
    publicNote: '',
    currentSubmissionUpdatedAt: '2026-06-17T12:00:00.000Z',
  };
  const updateSql = () => createRecordingSql((text) => {
    if (text.includes('from intake.map_node_edit_tokens')) return [tokenRow];
    if (text.includes('insert into intake.map_node_update_requests')) return [{ id: 'update-request-2', status: 'pending' }];
    if (text.includes('update intake.map_node_edit_tokens')) return [{ id: tokenRow.tokenId }];
    return [];
  });
  const nearNullIsland = updateSql();
  await assert.rejects(
    () => createMapNodeUpdateRequest(nearNullIsland.sql, nodeId, { token: 'valid-token', lat: 0.0000001, long: -0.0000004 }, {}, {
      env: LEGACY_LOCATION_ENV,
    }),
    (error) => error instanceof PublicInputError
      && error.code === 'invalid_coordinates'
      && error.message === MAP_COORDINATE_PROBLEM_MESSAGES.null_island
  );
  assert.equal(wroteTo(nearNullIsland.statements, 'intake.map_node_update_requests'), false);

  const finer = updateSql();
  await createMapNodeUpdateRequest(finer.sql, nodeId, { token: 'valid-token', lat: 6.21040049, long: 7.06610049 }, {}, {
    env: LEGACY_LOCATION_ENV,
  });
  const update = insertedInto(finer.statements, 'intake.map_node_update_requests');
  assert.ok(update);
  assert.equal(update.values.includes(6.2104), true);
  assert.equal(update.values.includes(7.0661), true);
});

test('place search confirms the six-decimal point it stores, and a pin that rounds to 0,0 never reaches the provider', async () => {
  const providerCalls: string[] = [];
  const nearNullIsland = { display_name: 'Null Island', lat: '0.0000001', lon: '-0.0000004', addresstype: 'island', osm_type: 'node', osm_id: 1 };
  const nearEquator = { display_name: 'Equator Marker', lat: '0.000002', lon: '0.0000004', addresstype: 'island', osm_type: 'node', osm_id: 5 };
  const rotterdam = { display_name: 'Rotterdam, South Holland, Netherlands', lat: '51.9244424', lon: '4.4777500', addresstype: 'city', osm_type: 'relation', osm_id: 1411101 };
  const { sql, statements } = createLocationSql();
  const repository = createMapLocationRepository({
    createSql: () => sql,
    env: { MAP_GEOCODER_BASE_URL: 'https://geocoder.example.test' },
    now: () => new Date('2026-11-07T12:00:00.000Z'),
    fetchImpl: async (url) => {
      providerCalls.push(String(url));
      return Response.json([nearNullIsland, nearEquator, rotterdam]);
    },
  });

  const search = await repository.search('Rotterdam', { rateLimitKey: '198.51.100.21' });
  assert.deepEqual(search.results.map((result) => [result.label, result.lat, result.long]), [
    ['Equator Marker', 0.000002, 0],
    ['Rotterdam, South Holland, Netherlands', 51.924442, 4.47775],
  ]);
  const confirmations = statements.filter((statement) => statement.text.includes('insert into intake.map_location_confirmations'));
  assert.equal(confirmations.some((statement) => statement.values.includes(51.924442) && statement.values.includes(4.47775)), true);
  assert.equal(confirmations.some((statement) => statement.values.includes(51.9244424)), false);

  const callsBeforeReverse = providerCalls.length;
  await assert.rejects(
    () => repository.reverse(0.0000001, -0.0000004, { rateLimitKey: '198.51.100.21' }),
    (error) => error instanceof PublicInputError
      && error.code === 'invalid_coordinates'
      && error.message === MAP_COORDINATE_PROBLEM_MESSAGES.null_island
  );
  assert.equal(providerCalls.length, callsBeforeReverse);
});

test('chapter anchors follow the map rule on the server-rendered home map and in /locations.json', async () => {
  const component = await readFile(
    new URL('../packages/website/src/components/page-sections/HomeMap.astro', import.meta.url),
    'utf8'
  );
  const projectionStart = component.indexOf('const chapterNodes');
  const chapterFilter = component.slice(projectionStart, component.indexOf('.map((c) =>', projectionStart));
  assert.match(chapterFilter, /isPublicMapCoordinate\(c\.data\.lat, c\.data\.long\)/);

  const locations = toPublicOperationalLocations([
    { slug: 'greenpill-brasil', name: 'Greenpill Brasil', lat: -22.9068, long: -43.1729 },
    { slug: 'placeholder', name: 'Placeholder Chapter', lat: 0, long: 0 },
    // Null used to read as 0, which published this chapter at 0,0.
    { slug: 'blank', name: 'Blank Chapter', latitude: null, longitude: null },
    { slug: 'nowhere', name: 'Nowhere Chapter', lat: 95, long: 10 },
    { slug: 'greenpill-fiji', name: 'Greenpill Fiji', lat: -16.8, long: 180 },
  ]);
  assert.deepEqual(locations.map((location) => location.id), ['greenpill-brasil', 'greenpill-fiji']);
});
