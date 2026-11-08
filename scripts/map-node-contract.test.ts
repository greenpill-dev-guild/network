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
  ATLANTIC_CENTER_X,
  badgeFallbackCenter,
  circleFitsInside,
  clampMapView,
  clampMapViewBeside,
  clampPinToDrawing,
  defaultMapView,
  fanHasRoomForTargets,
  formatPickerCoordinate,
  groupOverlappingPins,
  LABEL_SIDES,
  labelBoxOnSide,
  largestMapView,
  layoutFan,
  MAP_DRAWING,
  panMapView,
  panPointIntoOpenArea,
  keepCircleInside,
  pickerPointToLocation,
  PIN_HIT_RADIUS,
  placeMapLabels,
  pointsBeyondView,
  separateLabels,
} from '../packages/website/src/lib/home-map-layout.ts';
import {
  ALL_THEMES_NAME,
  chipsThatFit,
  nodeThemesAreShown,
  pickState,
  stripThemeOrder,
  themeChipName,
  themeIsShown,
  togglePick,
  typeIsShown,
  typePillName,
  type MapNodeType,
} from '../packages/website/src/lib/home-map-filters.ts';
import {
  entryMatchesSearch,
  groupListEntries,
  listSearchAnnouncement,
  rowToFocusAfterRebuild,
  searchWords,
} from '../packages/website/src/lib/home-map-list.ts';
import {
  describeMapStateFeed,
  formatUpdatedAgo,
  LIVE_POLL_INTERVAL_MS,
  MAP_STATE_STALE_MESSAGE,
  MAP_STATE_UNAVAILABLE_MESSAGE,
  mapStateAnnouncement,
  mapStateHasPeopleLayer,
  MAX_RETRY_INTERVAL_MS,
  nextMapStatePollDelay,
  recordMapStateFailure,
  recordMapStateSuccess,
  startMapStateFeed,
  WATCH_POLL_INTERVAL_MS,
} from '../packages/website/src/lib/home-map-live.ts';
import {
  AgentDataError,
  createMapNodeSubmission,
  createMapNodeUpdateRequest,
  listPublicMapNodes,
  PublicInputError,
} from '@greenpill-network/agent/map-nodes';
import { getPublicMapState } from '@greenpill-network/agent/map-state';
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
  generatePublicMapEdges,
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
  // two themes, so the Lagos steward's only candidates are all taken. A last
  // pass gives a person left without a line their strongest one to someone
  // with fewer than three: here the Lagos member, beside them, who goes one
  // over the cap. Three is a hard limit (see the next two tests).
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

test('public map-state: no hub wins over everyone having a line (Codex on #50)', () => {
  // The last pass cannot promise everyone a line. One person themed a, b, c
  // and d (here water, events, food and trees) and four people who each share
  // just one of those themes and nothing else: the first pass links the hub
  // to the two nearest, the last pass a third, and the fourth stays without a
  // line, because the hub already has three. The limit of three is kept on
  // purpose (PRD-619), and this pins that choice.
  const person = (id: string, lat: number, long: number, themes: string[]) => ({
    id, name: id, place: id, lat, long, role: 'member', themes, status: 'approved', source: 'approved-submission',
  });
  const hub = person('hub', 10, 10, ['water', 'events', 'food', 'trees']);
  const leaves = ['water', 'events', 'food', 'trees'].map((theme, index) => person(`leaf-${index + 1}`, 10 + (index + 1) * 2, 10, [theme]));
  const payload = toPublicMapStatePayload({ generatedAt: '2026-11-07T12:00:00.000Z', publicMapNodes: [hub, ...leaves] });

  const linesByPerson = new Map<string, number>();
  payload.edges.forEach((edge) => {
    linesByPerson.set(edge.from, (linesByPerson.get(edge.from) ?? 0) + 1);
    linesByPerson.set(edge.to, (linesByPerson.get(edge.to) ?? 0) + 1);
  });
  const lines = (id: string) => linesByPerson.get(`submission:${id}`) ?? 0;
  assert.equal(lines('hub'), 3, 'the hub stops at three');
  assert.deepEqual(leaves.map((leaf) => lines(leaf.id)), [1, 1, 1, 0], 'the farthest leaf stays without a line');
  assert.equal(payload.edges.length, 3);

  // A caller's cap of zero means no lines: the last pass does not run
  // (CodeRabbit on #50). A cap of one still lets it add one over the cap.
  assert.deepEqual(generatePublicMapEdges(payload.nodes, { perNodeLimit: 0 }), []);
  const capOne = generatePublicMapEdges(payload.nodes, { perNodeLimit: 1 });
  assert.equal(capOne.filter((edge) => edge.from === 'submission:hub' || edge.to === 'submission:hub').length, 2, 'the hub gets one line plus one from the last pass');
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

// PRD-1417. The behaviour is proven on a real database by
// `bun run test:map-node-approval-guard:db`; these checks keep the migration
// text in step with the shared rule.
test('approval guard migration refuses approving a node at a point the map cannot show, and is safe to rerun', async () => {
  const migrationFiles = (await readdir(new URL('../packages/agent/migrations', import.meta.url)))
    .filter((file) => file.endsWith('.sql'));
  const guardSql = await readFile(
    new URL('../packages/agent/migrations/032_map_node_approval_guard.sql', import.meta.url),
    'utf8'
  );
  const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  const code = guardSql.replace(/^\s*--.*$/gm, '');

  assert.equal(migrationFiles.includes('032_map_node_approval_guard.sql'), true);

  // A trigger on the submissions table, run for every write that can leave an
  // approved node somewhere new: an insert, or an update naming status,
  // latitude or longitude (migration 007 applies update requests that way).
  assert.match(code, /create or replace function intake\.map_node_approval_guard\(\)/);
  assert.match(code, /drop trigger if exists map_node_submissions_approval_guard\s+on intake\.map_node_submissions;/);
  assert.match(
    code,
    /create trigger map_node_submissions_approval_guard\s+before insert or update of status, latitude, longitude\s+on intake\.map_node_submissions\s+for each row\s+execute function intake\.map_node_approval_guard\(\);/
  );
  assert.ok(
    code.indexOf('drop trigger if exists map_node_submissions_approval_guard') < code.indexOf('create trigger map_node_submissions_approval_guard')
  );
  assert.match(code, /if new\.status is distinct from 'approved'::intake\.map_node_status then\s+return new;/);

  // Not a CHECK, which would also refuse declining or archiving a 0,0 row.
  assert.doesNotMatch(code, /\badd constraint\b/i);
  assert.doesNotMatch(code, /\bcheck\s*\(/i);

  // The same problems as the shared rule, judged in the same order.
  assert.match(code, /when new\.latitude is null\s+or new\.longitude is null/);
  assert.match(code, /when abs\(new\.latitude\) > 90 then 'latitude_out_of_range'/);
  assert.match(code, /when abs\(new\.longitude\) > 180 then 'longitude_out_of_range'/);
  assert.match(code, /when new\.latitude = 0 and new\.longitude = 0 then 'null_island'/);
  const sharedProblems = Object.keys(MAP_COORDINATE_PROBLEM_MESSAGES);
  assert.deepEqual(sharedProblems, ['missing', 'latitude_out_of_range', 'longitude_out_of_range', 'null_island']);
  const positions = sharedProblems.map((problem) => code.indexOf(`then '${problem}'`));
  assert.equal(positions.every((position) => position >= 0), true, 'the guard names every shared coordinate problem');
  assert.deepEqual([...positions].sort((a, b) => a - b), positions, 'the guard checks the problems in the shared order');
  assert.equal(getMapCoordinateProblem(0.0000001, 0), 'null_island');

  // Edge points stay allowed: the database can't tell a confirmed place on the
  // 180th meridian from a pin clamped to the edge.
  assert.doesNotMatch(code, />=\s*(90|180)\b/);
  assert.doesNotMatch(code, /abs\(new\.(latitude|longitude)\)\s*=\s*(90|180)\b/);
  assert.equal(getMapCoordinateProblem(-16.8, 180), null);

  // A readable refusal that names the node and the problem, never its stored point.
  assert.match(code, /errcode = 'check_violation'/);
  assert.match(code, /detail = 'map_node_invalid_coordinates: ' \|\| problem/);
  assert.match(code, /'Map node %s can''t be approved: %s, so the public map can''t show it\.'/);
  assert.doesNotMatch(code, /format\([^;]*new\.(latitude|longitude)/s);

  assert.equal(
    packageJson.scripts['test:map-node-approval-guard:db'],
    'bun run build:packages && bun --no-env-file scripts/map-node-approval-guard.integration.ts'
  );
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
  // The legend's Show all is the shared Chip (CodeRabbit on #50, carried into
  // PRD-1438's chrome step), still hidden until a filter narrows the map.
  assert.match(component, /<Chip as="button" class="gp-home-map-legend-reset" data-home-map-filter-reset hidden>Show all<\/Chip>/);
  // Reversed on purpose (map-polish-audit.md § 5): "Under narrow-then-add, a
  // reset empties the picked set." June's reset switched every theme back on.
  assert.match(component, /const resetMapFilters = \(\) => \{[\s\S]*?pickedTypes = new Set\(\);[\s\S]*?pickedThemes = new Set\(\);[\s\S]*?applyMapFilters\(\);/);
  assert.doesNotMatch(component, /activeThemes\.add\(theme\)/);
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

test('home map walkthrough: no hover lift, a visible focus ring, and a title clear of the close button at 375', async () => {
  const component = await readFile(
    new URL('../packages/website/src/components/page-sections/HomeMap.astro', import.meta.url),
    'utf8'
  );
  const cssRule = (selector: string) => {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return component.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`))?.[1] ?? '';
  };
  // DESIGN.md: hover and focus change colour, never position. The theme
  // choices and the Next and Submit pills lifted 1px (qa-system-pass).
  assert.doesNotMatch(component, /translateY\(-1px\)/);
  assert.doesNotMatch(cssRule('.gp-home-map-addnode-theme'), /transform/);
  assert.match(cssRule('.gp-home-map-addnode-theme:hover,\n  .gp-home-map-addnode-theme:focus-visible'), /border-color:/);
  // Both kept a focus style only through the lift once their own shadows hid
  // the global ring, so the ring is put back explicitly.
  assert.match(cssRule(".gp-home-map-addnode-theme[aria-pressed='true']:focus-visible"), /box-shadow: var\(--gp-shadow-focus\);/);
  assert.match(cssRule('.gp-home-map-addnode-next:focus-visible,\n  .gp-home-map-addnode-submit:focus-visible'), /box-shadow: var\(--gp-shadow-focus\), var\(--gp-shadow-pill\);/);
  // At 375 the first step's title ran under the close button: its own
  // max-width rule outranked the compact one that leaves room for the buttons.
  assert.match(component, /\.gp-home-map-addnode-dialog h2,\n    \.gp-home-map-addnode-step\[data-walkthrough-step='themes'\] h2 \{\n      max-width: calc\(100% - 96px\);/);
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
  // cadence once the agent reports intakeMode: live. The cadence and the
  // backoff after failures come from lib/home-map-live.ts (tested below,
  // PRD-1423); the map polls only while its page is visible.
  assert.equal(nextMapStatePollDelay(startMapStateFeed(), 'moderated'), WATCH_POLL_INTERVAL_MS);
  assert.equal(nextMapStatePollDelay(startMapStateFeed(), 'live'), LIVE_POLL_INTERVAL_MS);
  assert.equal(WATCH_POLL_INTERVAL_MS, 5000);
  assert.equal(LIVE_POLL_INTERVAL_MS, 2000);
  assert.match(component, /from '\.\.\/\.\.\/lib\/home-map-live'/);
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

  // Failures are no longer silent (PRD-1423; until then a refused response
  // returned quietly and the catch was empty). A refused or unreachable
  // request counts toward the map's error and the backoff, and the next poll
  // waits as long as the feed says. A fault while drawing a good response is
  // the page's own bug and is rethrown, not blamed on the agent.
  const loadStart = component.indexOf('const loadMapState = async');
  const loadBlock = component.slice(loadStart, component.indexOf('\n    };\n', loadStart));
  assert.match(loadBlock, /if \(!response\.ok\) throw new Error\(/);
  assert.match(loadBlock, /responseLoaded = true;[\s\S]*?mapStateFeed = recordMapStateSuccess\(Date\.now\(\)\);/);
  assert.match(loadBlock, /catch \(error\) \{[\s\S]*?if \(responseLoaded\) throw error;[\s\S]*?mapStateFeed = recordMapStateFailure\(mapStateFeed\);\s*renderMapStateStatus\(\);/);
  assert.match(loadBlock, /window\.clearTimeout\(abortTimer\);\s*mapStateInFlight = false;\s*startPolling\(nextMapStatePollDelay\(mapStateFeed, intakeMode\)\);/);
  assert.doesNotMatch(loadBlock, /No-op/);
  assert.doesNotMatch(component, /renderMapMode/);

  // Returning to a visible map refetches state and replays the connection reveal
  // once. Reduced-motion users still get the refresh, but no animation replay.
  assert.match(component, /loadMapState = async \(options: \{ replay\?: boolean \} = \{\}\)/);
  assert.match(component, /replayVisibleMapReturn/);
  assert.match(component, /reducedMotionPref\(\)/);
  assert.match(component, /new IntersectionObserver/);
  assert.match(component, /void loadMapState\(\{ replay: true \}\)/);

  // Visible legend counts are also type filter buttons. Reversed on purpose
  // (map-polish-audit.md § 5): "the first press on a type or a theme shows
  // only that one, more presses add to it (Stewards and Members together),
  // pressing a pressed pill removes it", so "The type filter becomes a set."
  // June kept one active type at a time. The rule lives in
  // lib/home-map-filters.ts, tested in "home map filters narrow, then add".
  assert.match(component, /data-legend-filter=\{type\.id\}/);
  assert.match(component, /aria-pressed="false"/);
  assert.match(component, /let pickedTypes = new Set<MapNodeType>\(\);/);
  assert.match(component, /if \(!typeIsShown\(pickedTypes, type\)\) return false;/);
  assert.match(component, /pickedTypes = togglePick\(pickedTypes, type\);/);
  assert.doesNotMatch(component, /activeTypeFilter/);
  assert.match(component, /data-home-map-type-count=\{type\.id\}/);
  assert.match(component, /legendCounts: Record<string, number>/);
  assert.match(component, /nodeMatchesThemeFilters\(node\)/);
  assert.match(component, /count\.textContent = String\(countValue\)/);
  assert.match(component, /is-type-filter-match/);
});

test('home map live feed: the Live pill tells freshness, failures show on the map, and retries back off', async () => {
  const at = Date.UTC(2026, 10, 7, 12, 0, 0);
  const minutes = (n: number) => n * 60_000;

  // Ages read at minute steps.
  assert.equal(formatUpdatedAgo(0), 'just now');
  assert.equal(formatUpdatedAgo(59_999), 'just now');
  assert.equal(formatUpdatedAgo(minutes(1)), '1 min ago');
  assert.equal(formatUpdatedAgo(minutes(59)), '59 min ago');
  assert.equal(formatUpdatedAgo(minutes(60)), '1 hour ago');
  assert.equal(formatUpdatedAgo(minutes(150)), '2 hours ago');
  assert.equal(formatUpdatedAgo(minutes(60 * 24)), '1 day ago');
  assert.equal(formatUpdatedAgo(minutes(60 * 72)), '3 days ago');
  assert.equal(formatUpdatedAgo(-5_000), 'just now', 'a clock that runs behind never reads as the future');

  // Before the first answer there is nothing to say yet.
  const fresh = startMapStateFeed();
  assert.deepEqual(describeMapStateFeed(fresh, 'moderated', at).problem, null);
  assert.equal(describeMapStateFeed(fresh, 'moderated', at).pill.visible, false);

  // A first load that fails is an error at once: the map is missing a layer.
  const neverLoaded = recordMapStateFailure(fresh);
  assert.deepEqual(describeMapStateFeed(neverLoaded, 'moderated', at).problem, { kind: 'unavailable', message: MAP_STATE_UNAVAILABLE_MESSAGE });
  assert.equal(describeMapStateFeed(neverLoaded, 'live', at).pill.visible, false, 'no Live claim before anything loaded');

  // Loaded: moderated intake keeps the pill hidden, as it always has; live
  // intake shows Live with the age.
  const loaded = recordMapStateSuccess(at);
  assert.deepEqual(describeMapStateFeed(loaded, 'moderated', at), { pill: { visible: false, tone: 'live', label: 'Live', age: '' }, problem: null });
  assert.deepEqual(describeMapStateFeed(loaded, 'live', at + 20_000), { pill: { visible: true, tone: 'live', label: 'Live', age: 'Updated just now' }, problem: null });

  // One failed refresh after a load is a blip; the second is an error, the
  // pill drops its Live claim and shows the age of what is on the map.
  const blip = recordMapStateFailure(loaded);
  assert.equal(describeMapStateFeed(blip, 'live', at + minutes(1)).problem, null);
  const stale = recordMapStateFailure(blip);
  for (const mode of ['live', 'moderated'] as const) {
    assert.deepEqual(describeMapStateFeed(stale, mode, at + minutes(3.5)), {
      pill: { visible: true, tone: 'stale', label: '', age: 'Updated 3 min ago' },
      problem: { kind: 'stale', message: MAP_STATE_STALE_MESSAGE },
    });
  }
  assert.equal(recordMapStateSuccess(at + minutes(4)).consecutiveFailures, 0, 'a success clears the failures');

  // Retries back off from the mode's cadence, doubling up to a minute. With
  // jitter at its middle (random 0.5) the delays are exact; at its ends they
  // stay within 20 per cent and never pass the minute.
  const afterFailures = (count: number) => Array.from({ length: count }).reduce<ReturnType<typeof startMapStateFeed>>(
    (feed) => recordMapStateFailure(feed),
    recordMapStateSuccess(at)
  );
  const middle = () => 0.5;
  assert.deepEqual([1, 2, 3, 4, 5, 6].map((count) => nextMapStatePollDelay(afterFailures(count), 'moderated', middle)), [5000, 10000, 20000, 40000, 60000, 60000]);
  assert.deepEqual([1, 2, 3, 4, 5, 6, 7].map((count) => nextMapStatePollDelay(afterFailures(count), 'live', middle)), [2000, 4000, 8000, 16000, 32000, 60000, 60000]);
  assert.equal(nextMapStatePollDelay(afterFailures(1), 'moderated', () => 0), 4000);
  assert.equal(nextMapStatePollDelay(afterFailures(1), 'moderated', () => 0.999999), 6000);
  assert.equal(nextMapStatePollDelay(afterFailures(12), 'moderated', () => 0.999999), MAX_RETRY_INTERVAL_MS);
  assert.equal(nextMapStatePollDelay(afterFailures(400), 'live', middle), MAX_RETRY_INTERVAL_MS, 'a long outage still retries once a minute');

  // A 200 is not always a load (Codex on #50). While its database is down the
  // agent still answers 200, with the people source marked unavailable (or
  // not configured), no people, and moderated intake. The map counts that as
  // a failed refresh: the people already drawn stay, and the error and the
  // backoff carry on. A layer that is empty because nobody is approved yet is
  // a load.
  const chapterSource = async () => Response.json([{ id: 'kenya', name: 'Kenya', lat: -1.28639, long: 36.81722, status: 'active', themes: ['water'] }]);
  const agentAnswer = (listPublic: () => Promise<unknown[]>) => getPublicMapState({
    fetchImpl: chapterSource,
    mapNodeRepository: { listPublic },
    now: '2026-11-07T12:00:00.000Z',
  });
  const outage = await agentAnswer(async () => { throw new Error('connection refused'); });
  const notConfigured = await agentAnswer(async () => { throw new AgentDataError('database_not_configured', 'missing database'); });
  const nobodyYet = await agentAnswer(async () => []);
  assert.equal(outage.counts.sources.find((source) => source.source === 'approved-map-nodes')?.status, 'unavailable');
  assert.equal(outage.counts.chapterNodes, 1, 'the outage answer still carries chapters');
  assert.equal(mapStateHasPeopleLayer(outage), false);
  assert.equal(mapStateHasPeopleLayer(notConfigured), false);
  assert.equal(mapStateHasPeopleLayer(nobodyYet), true);
  assert.equal(mapStateHasPeopleLayer(null), false, 'an answer that is no map state fails too');
  assert.equal(mapStateHasPeopleLayer('maintenance'), false);
  // A 200 carrying an error instead of a map state must not clear the people
  // (CodeRabbit on #50): without a list of nodes it is a failed refresh.
  assert.equal(mapStateHasPeopleLayer({ error: 'maintenance' }), false);
  assert.equal(mapStateHasPeopleLayer({ error: { message: 'maintenance' }, counts: { sources: [] } }), false);
  assert.equal(mapStateHasPeopleLayer({ nodes: 'none' }), false);
  assert.equal(mapStateHasPeopleLayer({ nodes: [] }), true, 'a map state without source statuses is taken as it comes');

  // A screen reader hears the changes that matter, once each; the age ticking
  // up is not one of them.
  const status = (feed: ReturnType<typeof startMapStateFeed>, mode: 'live' | 'moderated', now = at) => describeMapStateFeed(feed, mode, now);
  assert.equal(mapStateAnnouncement(null, status(neverLoaded, 'moderated')), MAP_STATE_UNAVAILABLE_MESSAGE);
  assert.equal(mapStateAnnouncement(status(neverLoaded, 'moderated'), status(recordMapStateFailure(neverLoaded), 'moderated')), '');
  assert.equal(mapStateAnnouncement(status(neverLoaded, 'moderated'), status(loaded, 'moderated')), 'Stewards and members are up to date.');
  assert.equal(mapStateAnnouncement(status(loaded, 'moderated'), status(loaded, 'live')), 'The map is live: new stewards and members appear as they join.');
  assert.equal(mapStateAnnouncement(status(loaded, 'live'), status(loaded, 'live', at + minutes(5))), '');
  assert.equal(mapStateAnnouncement(status(loaded, 'live'), status(stale, 'live')), MAP_STATE_STALE_MESSAGE);

  // The component draws what the feed says: the pill is no live region any
  // more (its age changes every minute), the error note sits on the map with
  // Try again, and Try again asks at once.
  const component = await readFile(
    new URL('../packages/website/src/components/page-sections/HomeMap.astro', import.meta.url),
    'utf8'
  );
  const pill = component.match(/<div class="gp-home-map-freshness"[^>]*>/)?.[0] ?? '';
  assert.ok(pill, 'the Live pill must exist');
  assert.doesNotMatch(pill, /aria-live|role="status"/);
  // Try again is DESIGN.md's error action, the shared ghost Button
  // (CodeRabbit on #50, carried into PRD-1438's chrome step).
  assert.match(component, /<div class="gp-home-map-state-error" data-home-map-state-error hidden>\s*<span data-home-map-state-error-text><\/span>\s*<Button variant="ghost" class="gp-home-map-state-retry" data-home-map-state-retry>Try again<\/Button>/);
  assert.match(component, /<p class="gp-home-map-sr" data-home-map-state-live aria-live="polite"><\/p>/);
  assert.match(component, /mapStateRetry\?\.addEventListener\('click', \(\) => \{\s*void loadMapState\(\);/);
  // The people check runs before anything from the answer is used: intake
  // mode, the success record, or the people and threads drawn.
  const loadStart = component.indexOf('const loadMapState = async');
  const loadBlock = component.slice(loadStart, component.indexOf('\n    };\n', loadStart));
  const peopleCheck = loadBlock.indexOf('if (!mapStateHasPeopleLayer(state)) throw new Error(');
  assert.ok(peopleCheck !== -1, 'loadMapState must check the people layer');
  for (const later of ['responseLoaded = true;', 'intakeMode = state?.intakeMode', 'recordMapStateSuccess(', 'const approvedKeys', 'renderDynamicThreads(']) {
    assert.ok(loadBlock.indexOf(later) > peopleCheck, `${later} must come after the people check`);
  }
  // Try again is a full touch target at every width, not only on the
  // compact map (Codex on #50): the shared Button is 48px tall, and the map's
  // rule for it sets its width and padding, never its height.
  const buttonPrimitive = await readFile(
    new URL('../packages/website/src/components/ui/Button.astro', import.meta.url),
    'utf8'
  );
  assert.match(buttonPrimitive, /\.gp-button \{[^}]*min-height: 48px;/);
  const retryRule = component.match(/\.gp-home-map-state-error \.gp-button \{([^}]*)\}/)?.[1] ?? '';
  assert.ok(retryRule, 'the map styles Try again beside its message');
  assert.doesNotMatch(retryRule, /height/);
  assert.doesNotMatch(component, /\.gp-home-map-state-error button \{/);
  assert.match(component, /const status = describeMapStateFeed\(mapStateFeed, intakeMode, Date\.now\(\)\);/);
  assert.match(component, /root\.classList\.toggle\('has-map-state-problem', Boolean\(status\.problem\)\)/);
  // DESIGN.md (Error): a 1px error border, and the error stays on the map.
  assert.match(component, /\.gp-home-map-state-error \{[\s\S]*?border: 1px solid var\(--gp-error\);/);
  // The error is part of the map's chrome, not the drawing: no gesture or
  // outside click starts on it.
  assert.match(component, /target\.closest\('[^']*\.gp-home-map-state-error[^']*'\)/);
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

test('home map clips every thread to the drawing', async () => {
  const component = await readFile(
    new URL('../packages/website/src/components/page-sections/HomeMap.astro', import.meta.url),
    'utf8'
  );
  // Threads bow out between their nodes, so a long one could leave the map
  // (the July audit saw strands exit the top-right corner). One clip path the
  // size of the drawing holds every thread layer, the hover hit lines too.
  assert.match(component, /<clipPath id="gp-home-map-drawing" clipPathUnits="userSpaceOnUse">\s*<rect x="0" y="0" width=\{VIEW_W\} height=\{MAP_VIEW_H\} \/>/);
  const layerStart = component.indexOf('<g class="gp-home-map-thread-layer" clip-path="url(#gp-home-map-drawing)"');
  const layerEnd = component.indexOf('<g class="gp-home-map-chapters">', layerStart);
  assert.ok(layerStart !== -1 && layerEnd !== -1, 'the clipped thread layer must sit before the chapters');
  const layer = component.slice(layerStart, layerEnd);
  for (const group of [
    '<g class="gp-home-map-threads" aria-hidden="true">',
    'data-home-map-dynamic-threads',
    'data-home-map-selection-strands',
    'data-home-map-dynamic-thread-hits',
  ]) {
    assert.ok(layer.includes(group), `${group} must be inside the clipped layer`);
  }
  // Pins are not clipped: chapters and people sit outside the layer.
  assert.equal(layer.includes('data-home-map-members'), false);
});

test('home map focus cards are anchored near nodes, not bottom-left panels', async () => {
  const component = await readFile(
    new URL('../packages/website/src/components/page-sections/HomeMap.astro', import.meta.url),
    'utf8'
  );

  // Reversed on purpose (map-polish-audit.md § 5): "Hover and keyboard focus
  // show a compact tooltip: the name, then `TYPE · PLACE` in mono. No note
  // and no theme chips." June's card listed the themes; the inspector does.
  assert.doesNotMatch(component, /data-focus-themes|focusThemes/);
  assert.match(component, /<span class="gp-home-map-focus-name" data-focus-name><\/span>\s*<span class="gp-home-map-focus-role" data-focus-role><\/span>/);
  assert.match(component, /focusRole\.textContent = placeLabel \? `\$\{roleLabel\} · \$\{placeLabel\}` : roleLabel;\s*\/\/[^\n]*\n\s*focusMeta\.textContent = '';/);
  // The hover card is informational only — the connection summary was removed.
  // Relationship detail comes from hovering edges/nodes and the on-map web.
  assert.doesNotMatch(component, /data-focus-connections/);
  assert.doesNotMatch(component, /relationshipSummary/);
  // Still anchored at its node: "It flips below the node when there is no
  // room above", and it keeps inside the open part of the stage.
  assert.match(component, /focusEl\.style\.left = `\$\{xPct\}%`/);
  assert.match(component, /focusEl\.style\.top = `\$\{yPct\}%`/);
  assert.match(component, /focusEl\.style\.transform = `translate/);
  const placeTip = component.match(/const placeFocusCard = \(cx: number, cy: number\) => \{([\s\S]*?)\n    \};\n/)?.[1] ?? '';
  assert.match(placeTip, /const roomAbove = anchorY - offset - tip\.height >= inset;/);
  assert.match(placeTip, /const roomBelow = anchorY \+ offset \+ tip\.height <= maxY - inset;/);
  assert.match(placeTip, /const below = !roomAbove && roomBelow;/);
  assert.match(placeTip, /const maxX = covered\?\.side === 'east' \? covered\.rect\.minX : stage\.width;/);
  assert.match(component, /--gp-map-tip-offset: 14px;/);
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
  assert.match(component, /syncSelectedOverlay/);
  assert.match(component, /root\.classList\.add\('has-selected-node'\)/);
  assert.match(component, /root\.addEventListener\('click'/);
  assert.match(component, /focusTarget as HTMLElement\)\.focus\(\{ preventScroll: true \}\)/);
  assert.match(component, /if \(selectedFocusTarget\) return/);
  assert.match(component, /if \(!selectedFocusTarget \|\| selectedFocusTarget === link\) setFocus\(link\)/);
  assert.match(component, /clusterDirty\(\)/);
  assert.match(component, /const clampNumber = \(value: number, min: number, max: number\)/);
  // Reversed on purpose (map-polish-audit.md § 5): "Selecting a node opens
  // it in a dock inside the stage: inset 12px, the stage's full height,
  // about 340px wide ... June's floating card goes." The card's placement
  // beside its node, its clamping inside the stage and its transform go
  // with it.
  assert.doesNotMatch(component, /positionSelectedCard/);
  assert.doesNotMatch(component, /rootRect\.width - cardRect\.width - inset|rootRect\.height - cardRect\.height - inset/);
  assert.doesNotMatch(component, /--gp-selected-x|--gp-selected-y|--gp-selected-transform/);

  const styleStart = component.indexOf('<style>');
  const selectedCssStart = component.indexOf('/* The inspector (§ 5).', styleStart);
  const addNodeCssStart = component.indexOf('/* Join-the-map walkthrough', selectedCssStart);
  const selectedCss = component.slice(selectedCssStart, addNodeCssStart);
  assert.ok(selectedCssStart !== -1, 'the inspector CSS must be present');
  assert.match(selectedCss, /position:\s*absolute/);
  // The dock shares the list's place and size (§ 5: "one right-hand dock
  // ... that holds either the list or the selected node"), so it needs no
  // inspector width of its own; June's ban on one goes with the card.
  const inspectorCss = selectedCss.match(/\n  \.gp-home-map-selected \{([^}]*)\}/)?.[1] ?? '';
  assert.match(inspectorCss, /inset-block: var\(--gp-map-inset\);/);
  assert.match(inspectorCss, /inset-inline-end: var\(--gp-map-inset\);/);
  assert.match(inspectorCss, /width: min\(var\(--gp-map-dock-width\), calc\(100% - var\(--gp-map-inset\) \* 2\)\);/);
  assert.doesNotMatch(selectedCss, /--gp-selected-x|--gp-map-card-width/);
  // "While the dock is open, both bars end at its edge."
  assert.match(selectedCss, /\.gp-home-map-canvas\.has-selected-node \{\s*--gp-map-end: calc\(var\(--gp-map-inset\) \* 2 \+ var\(--gp-map-dock-width\)\);/);
  // "The dock's head (kicker, name and close) stays put while its body
  // scrolls (`overflow-y: auto`)".
  assert.match(component, /<header class="gp-home-map-selected-head">[\s\S]*?data-selected-kicker[\s\S]*?data-selected-name[\s\S]*?data-selected-close[\s\S]*?<\/header>\s*<div class="gp-home-map-selected-body" data-selected-body>/);
  assert.match(selectedCss, /\.gp-home-map-selected-body \{[\s\S]*?min-height: 0;[\s\S]*?overflow-y: auto;/);
  // "Containers from 521 to 860px: ... The inspector and the list open as a
  // bottom sheet inside the stage", and on phones "A selected node opens a
  // bottom sheet with a handle ... It rises to about half the screen".
  assert.match(selectedCss, /@container \(max-width: 860px\) \{[\s\S]*?\.gp-home-map-selected \{\s*inset-block: auto var\(--gp-map-inset\);\s*inset-inline: var\(--gp-map-inset\);\s*width: auto;\s*max-block-size: 60%;/);
  assert.match(selectedCss, /\.gp-home-map-selected-handle \{\s*display: block;/);
  assert.match(component, /<span class="gp-home-map-selected-handle" aria-hidden="true"><\/span>/);
  const phoneSheetCss = component.match(/@container \(max-width: 520px\) \{([\s\S]*?)\n  \}\n/)?.[1] ?? '';
  assert.match(phoneSheetCss, /\.gp-home-map-selected \{\s*inset-inline: var\(--gp-space-sm\);\s*inset-block-end: var\(--gp-space-sm\);\s*max-block-size: 55%;/);
  // A sheet rises over the bottom bars, so they step aside: nothing
  // focusable is left beneath it.
  assert.match(selectedCss, /\.gp-home-map-canvas\.has-selected-node \.gp-home-map-list-toggle,\s*\.gp-home-map-canvas\.has-selected-node \.gp-home-map-end-group,\s*\.gp-home-map-canvas\.has-selected-node \.gp-home-map-controls > \.gp-home-map-freshness \{\s*visibility: hidden;/);
  // "When the node would sit under the dock, the map pans it into the open
  // area", and "The map pans the node above the sheet": the view may slide
  // under the inspector (lib/home-map-layout.ts), and goes back on close.
  assert.match(component, /const clampViewBox = \(box: MapViewBox\): MapViewBox => \{\s*const covered = inspectorPanel\(\);\s*return clampMapViewBeside\(box, stageAspect\(\), MAX_VIEW_ZOOM, covered\?\.panel \?\? null, covered\?\.clearance \?\? 0, FULL_VIEW_BOX\);/);
  assert.match(component, /const next = panPointIntoOpenArea\(currentViewBox, point, covered\.panel, covered\.clearance, FULL_VIEW_BOX\);/);
  assert.match(component, /clearance: pxToViewBox\(POINTER_TARGET_RADIUS_PX \+ cssPx\('--gp-map-inset', 12\)\),/);
  const openInspector = component.match(/const openSelected = \(member: DynamicMapNode, link: Element, viaKeyboard = false\) => \{([\s\S]*?)\n    \};\n/)?.[1] ?? '';
  assert.match(openInspector, /layoutThemeStrip\(\);\s*scheduleChapterLabels\(\);\s*panSelectedIntoView\(\);/);
  const closeInspector = component.match(/const closeSelected = \(\{ returnFocus = true \}: \{ returnFocus\?: boolean \} = \{\}\) => \{([\s\S]*?)\n    \};\n/)?.[1] ?? '';
  assert.match(closeInspector, /settleViewAfterInspector\(\);\s*layoutThemeStrip\(\);\s*scheduleChapterLabels\(\);/);
  assert.match(component, /if \(before && sameView\(currentViewBox, before\.moved\)\) setMapViewBox\(before\.view, \{ isDefault: before\.wasDefault \}\);\s*else setMapViewBox\(currentViewBox\);/);
  // "Closing returns focus to the node, and a closed dock leaves no
  // focusable or pressed controls behind": a hidden dock is display: none,
  // and the way back to the list hides with it.
  assert.match(closeInspector, /listBehindInspector = null;\s*if \(selectedBack\) selectedBack\.hidden = true;/);
  assert.match(closeInspector, /\} else \{\s*focusControlFor\(\[focusTarget\.getAttribute\('data-node-id'\) \|\| ''\]\);/);
  assert.match(selectedCss, /\.gp-home-map-selected\[hidden\] \{\s*display: none;/);
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
  // Reversed on purpose (map-polish-audit.md § 5): "DESIGN.md:403 wins. The
  // map's compact layout starts at a 520px container instead of 720px." June's
  // 720px query and its band under a 44cqw drawing go: the canvas grew below
  // the map for the legend row and the controls row, and grew again to fit
  // the selected node's bar, which hid the controls. PRD-1423's error row
  // lived in that band. A phone's stage is "at least 60svh" and frames the
  // drawing's full height, "never a letterbox", with "One row of controls
  // along the bottom of the stage"; the error note moves to the stage's top,
  // over the far north, where it covers no pin.
  assert.doesNotMatch(component, /@container \(max-width: 720px\)/);
  assert.doesNotMatch(component, /44cqw|--gp-map-lower|--gp-map-alert/);
  const phoneCss = component.match(/@container \(max-width: 520px\) \{([\s\S]*?)\n  \}\n/)?.[1] ?? '';
  assert.match(phoneCss, /\.gp-home-map-canvas\s*{[\s\S]*?--gp-map-layout:\s*phone;[\s\S]*?aspect-ratio:\s*auto;\s*block-size:\s*60svh;/);
  assert.doesNotMatch(phoneCss, /aspect-ratio:\s*4 \/ 3/);
  assert.match(phoneCss, /\.gp-home-map-thread\.is-entering\s*{[\s\S]*?animation:\s*none/);
  assert.match(phoneCss, /\.gp-home-map-state-error\s*{\s*inset-block-start:\s*var\(--gp-map-edge\);/);
  // Reversed on purpose (map-polish-audit.md § 5): the phone's bar of
  // connections in a sideways scroller goes. "A selected node opens a bottom
  // sheet with a handle, close, `TYPE · PLACE`, the name, the note, a
  // scrolling row of theme tags and the connections ... its handle, head and
  // close stay put while its body scrolls, so a node with many connections
  // never pushes the close out of reach." The rows stack in that body.
  assert.doesNotMatch(component, /\.gp-home-map-selected-edge-list:not\(\[hidden\]\)\s*{[\s\S]*?display:\s*block/);
  assert.match(component, /\.gp-home-map-selected-edge-items \{\s*display: grid;/);
  assert.doesNotMatch(component, /\.gp-home-map-selected-edge-items\s*{[^}]*overflow-x:\s*auto/);
  assert.match(phoneCss, /\.gp-home-map-selected-themes \{\s*flex-wrap: nowrap;\s*overflow-x: auto;/);
  // Narrow maps show legend dots and counts only (DESIGN.md), keeping the
  // label for assistive technology, and the Show all chip ends the counts.
  assert.match(component, /@container \(max-width: 520px\) \{\s*\.gp-home-map-legend-label\s*{[\s\S]*?clip:\s*rect\(0 0 0 0\)/);
  assert.match(phoneCss, /\.gp-home-map-legend-reset\s*{\s*order:\s*1;/);
  assert.match(phoneCss, /\.gp-home-map-filter-note\[data-empty='true'\]:not\(\[hidden\]\)\s*{[\s\S]*?display:\s*flex/);
  assert.match(component, /new ResizeObserver\(scheduleMapResizeSync\)\.observe\(root\)/);
  assert.doesNotMatch(component, /data-filter-toggle="type"/);
  assert.doesNotMatch(component, /data-type-filter/);
  assert.doesNotMatch(component, /data-legend-all/);
  assert.doesNotMatch(component, /data-legend-filter="all"/);
  assert.doesNotMatch(component, /<span class="gp-home-map-legend-label">All<\/span>/);
  // The control row's order, updated on purpose (map-polish-audit.md § 5):
  // "on desktop the strip's '+N' opens the theme editor, so the 'Themes'
  // toggle leaves the desktop bars, but the phone row keeps a 'Themes' button
  // that opens it". The phone's row, in § 5's order: "the type counts", "a
  // 'Show all' chip", "Themes", "List", "a reset button (an icon with the
  // accessible name 'Reset the map view')", "and Join the map".
  assert.match(
    component,
    /<div class="gp-home-map-control-row">[\s\S]*?<div class="gp-home-map-legend"[\s\S]*?data-home-map-filter-reset hidden>Show all[\s\S]*?class="gp-home-map-themes-toggle" data-filter-toggle="theme"[\s\S]*?data-home-map-list-toggle[\s\S]*?<div class="gp-home-map-zoom-controls"[\s\S]*?data-home-map-zoom="reset" aria-label="Reset the map view"[\s\S]*?data-home-map-open/
  );
  const mapThemePanelCss = component.match(/\.gp-home-map-filter-panel\.is-themes\s*{([\s\S]*?)\n  }/)?.[1] ?? '';
  assert.match(mapThemePanelCss, /grid-template-columns:\s*repeat\(4, minmax\(0, 1fr\)\)/);
  assert.match(mapThemePanelCss, /max-height:\s*none/);
  assert.match(mapThemePanelCss, /overflow:\s*visible/);
  // Reversed on purpose (§ 5): "the theme panel's fixed position inside that
  // query" and "the theme panel's clearance for a selected node (...the
  // editor and a selection can no longer be open together)". On a phone the
  // editor is a sheet inside the stage.
  assert.doesNotMatch(component, /\.gp-home-map-filter-panel\.is-themes\s*{[^}]*position:\s*fixed/);
  assert.doesNotMatch(component, /\.gp-home-map-canvas\.has-selected-node \.gp-home-map-filter-panel/);
  assert.match(phoneCss, /\.gp-home-map-theme-editor\s*{\s*inset-block-start:\s*auto;\s*inset-block-end:\s*0;/);
  assert.match(component, /\.gp-home-map-filter-panel\.is-themes \.gp-home-map-filter-option\s*{[\s\S]*?font-size:\s*var\(--gp-caption\)/);
  assert.match(component, /\.gp-home-map-control-row\s*{[\s\S]*?flex-wrap:\s*nowrap/);
  assert.match(component, /const closeFilterPanels = \(\) => \{[\s\S]*?openFilterPanel = ''[\s\S]*?syncFilterPanels\(\)/);
  assert.match(component, /const setFilterPanel = \(panelName: string\) => \{[\s\S]*?if \(openFilterPanel\) \{\s*closeNodeList\(\);[\s\S]*?syncFilterPanels\(\)/);
  assert.match(component, /const openNodeList = \(\s*opener: HTMLElement \| null = listToggle,\s*subset: [^)]*?\) => \{[\s\S]*?closeFilterPanels\(\);[\s\S]*?listDrawer\.hidden = false/);
  // Changed on purpose (map-polish-audit.md § 5): "the outside click (1294)
  // keeps closing the theme editor but no longer closes the list". The list
  // is non-modal on a wide map: "the map stays usable, and a click on empty
  // map no longer closes it."
  const outsidePress = component.match(/document\.addEventListener\('pointerdown', \(event\) => \{([\s\S]*?)\n    \}\);/)?.[1] ?? '';
  assert.match(outsidePress, /if \(openFilterPanel && !target\.closest\('\.gp-home-map-controls'\)\) \{\s*closeFilterPanels\(\);/);
  assert.doesNotMatch(outsidePress, /closeNodeList/);
  assert.match(component, /if \(event\.key !== 'Escape'\) return;[\s\S]*?closeFilterPanels\(\);[\s\S]*?closeNodeList\(\)/);
  assert.match(component, /const openAddDialog = \(trigger\?: HTMLElement\) => \{[\s\S]*?closeFilterPanels\(\);[\s\S]*?closeNodeList\(\)/);
  // Reversed on purpose (§ 5): "the list rows' two theme chips with +N (1297
  // to 1304) and their wrapping rules (1306 to 1311), since compact rows show
  // the name and place on one line". A row is the mark, the name and the
  // place, which gives way first with an ellipsis.
  assert.doesNotMatch(component, /themeCompactLabel|visibleThemeSlugs|hiddenThemeCount|gp-home-map-list-themes|gp-home-map-list-meta/);
  assert.doesNotMatch(component, /gp-home-map-list-action['"]/);
  assert.match(component, /row\.append\(mark, makeListPart\('span', 'gp-home-map-list-name', name\), makeListPart\('span', 'gp-home-map-list-place', place\)\);/);
  assert.match(component, /\.gp-home-map-list-name,\s*\.gp-home-map-list-place \{[\s\S]*?text-overflow: ellipsis;\s*white-space: nowrap;/);
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

  // Replaced on purpose (map-polish-audit.md § 5): the hover card and the
  // selected card no longer share a floating footprint. Instead "a compact
  // tooltip offset from its node, and a dock of fixed width inside the
  // stage", which never squeezes the map: it overlays the stage.
  assert.doesNotMatch(component, /--gp-map-card-width|--gp-map-card-offset/);
  const tipCss = component.match(/\n  \.gp-home-map-focus \{([^}]*)\}/)?.[1] ?? '';
  assert.match(tipCss, /width: max-content;/);
  assert.match(tipCss, /pointer-events: none;/);
  assert.match(component, /`translate\(\$\{shiftX\.toFixed\(1\)\}px, \$\{below \? 'var\(--gp-map-tip-offset\)' : 'calc\(-100% - var\(--gp-map-tip-offset\)\)'\}\)`/);
  assert.match(component, /\n  \.gp-home-map-selected \{[^}]*width: min\(var\(--gp-map-dock-width\), calc\(100% - var\(--gp-map-inset\) \* 2\)\);/);
  assert.doesNotMatch(component, /\.gp-home-map-canvas\.has-selected-node \.gp-home-map-svg\s*{[^}]*inset-inline-end/);

  // No connection-summary text on any surface (desktop discovers via hover).
  assert.doesNotMatch(component, /data-selected-connections/);
  assert.doesNotMatch(component, /No public connections yet/);

  // Reversed on purpose (§ 5): "connections as rows of at least 44px (mark,
  // name, place, shared-theme tag) that select that node". June's rows lit
  // the line and carried an open-profile link and a sideways carousel of
  // every shared theme; a row now selects its node, whose inspector carries
  // its public link.
  assert.doesNotMatch(component, /gp-home-map-selected-edge-open|gp-home-map-selected-edge-themes|peekCarousel/);
  const edgeRows = component.match(/const renderSelectedEdgeList = \(nodeId: string\) => \{([\s\S]*?)\n    \};\n/)?.[1] ?? '';
  assert.match(edgeRows, /mark\.className = 'gp-home-map-selected-edge-mark';/);
  assert.match(edgeRows, /nameEl\.className = 'gp-home-map-selected-edge-name';/);
  assert.match(edgeRows, /placeEl\.className = 'gp-home-map-selected-edge-place';/);
  assert.match(edgeRows, /tag\.className = 'gp-home-map-selected-edge-theme';/);
  assert.match(edgeRows, /`Select \$\{name\}\$\{place \? `, \$\{place\}` : ''\}/);
  assert.match(edgeRows, /row\.addEventListener\('click', \(event\) => \{\s*activateMapNode\(connectedEl, event\.detail === 0 \|\| row\.matches\(':focus-visible'\)\);/);
  // Hovering or focusing a row previews its node as a list row does.
  assert.match(edgeRows, /const preview = \(\) => \{\s*previewListNode\(connectedEl\);\s*applyEdgeHighlight\(edge\.edgeId\);/);
  assert.doesNotMatch(edgeRows, /aria-pressed/);
  assert.match(component, /\.gp-home-map-selected-edge-row \{[\s\S]*?min-block-size: var\(--gp-map-target\);/);
  assert.match(component, /<ul class="gp-home-map-selected-edge-items" data-selected-edge-items><\/ul>/);
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

  // Chapters join the theme filters with the themes stewards set in Directus.
  // This changes June's rule on purpose: chapters then carried `themes: []`
  // and passed every theme filter. Afo, asked on 2026-11-07 "Should chapters
  // join the map's theme filters using the themes stewards set in Directus?",
  // answered "Yes, use Directus themes" (PRD-1423). The build reads each
  // chapter's approved themeSlugs the way the agent does; a chapter without
  // themes shows under all themes only, like anyone else.
  assert.doesNotMatch(component, /themes:\s*\[\]/);
  assert.match(component, /themes: normalizePublicMapThemeSlugs\(c\.data\.themeSlugs\)/);
  assert.match(component, /data-node-themes=\{c\.themes\.join\(' '\)\}/);
  assert.doesNotMatch(component, /=== 'chapter'\) return true/);
  // The same rule for every node, now over the picked set (map-polish-audit.md
  // § 5, narrow-then-add: "a reset empties the picked set"): nothing picked
  // shows every node, and a node without themes shows only then.
  assert.match(component, /const nodeMatchesThemeFilters = \(node: Element\) => nodeThemesAreShown\(pickedThemes, nodeThemes\(node\)\);/);
  assert.equal(nodeThemesAreShown(new Set<string>(), []), true);
  assert.equal(nodeThemesAreShown(new Set(['water']), []), false, 'a chapter without themes shows under all themes only');
  assert.equal(nodeThemesAreShown(new Set(['water']), ['trees', 'water']), true);
  assert.equal(nodeThemesAreShown(new Set(['water']), ['trees']), false);
  assert.deepEqual(normalizePublicMapThemeSlugs(['currency', 'public', 'events']), ['mutual', 'public', 'events'], 'Directus slugs read as map themes');
  // A chapter's card lists all its themes, since any of them can be why a
  // filter kept it; a person's card keeps its four.
  assert.match(component, /themes: nodeThemes\(link\),/);
  assert.match(component, /const shownThemes = isChapter \? member\.themes : member\.themes\.slice\(0, 4\);/);
  assert.match(component, /selectedThemesEl\.hidden = selectedThemesEl\.childElementCount === 0;/);
  assert.doesNotMatch(component, /\[data-selected-type='chapter'\] \.gp-home-map-selected-themes/);

  // A steward's card jumps to their chapter. Since chapters follow the theme
  // filters, a filter can hide that chapter (CodeRabbit on #50), so the jump
  // widens the filters just enough to show it first, with the pills in step.
  const jump = component.match(/const selectChapterBySlug = \(slug: string, viaKeyboard = false\) => \{([\s\S]*?)\n    \};/)?.[1] ?? '';
  assert.match(jump, /if \(!chapterEl\) return;\s*revealFilteredNode\(chapterEl\);\s*openChapterNode\(chapterEl, viaKeyboard\);/);
  const reveal = component.match(/const revealFilteredNode = \(node: Element\) => \{([\s\S]*?)\n    \};/)?.[1] ?? '';
  assert.match(reveal, /if \(!node\.classList\.contains\('is-filtered-out'\)\) return;/, 'a visible chapter leaves the filters alone');
  // Under narrow-then-add (§ 5: "The type filter becomes a set") widening
  // adds: the chapter's type joins the picked types, so the steward whose card
  // made the jump stays drawn, and one of the chapter's own themes (one with a
  // toggle) joins the picked themes; a chapter without themes clears the theme
  // picks, which shows every theme. applyMapFilters sets every pill's
  // aria-pressed from the picked sets, so the pills stay in step.
  assert.match(reveal, /if \(!typeIsShown\(pickedTypes, type\)\) pickedTypes = new Set\(\[\.\.\.pickedTypes, type\]\);/);
  assert.match(reveal, /const ownTheme = nodeThemes\(node\)\.find\(\(theme\) => themeIds\.includes\(theme\)\);/);
  assert.match(reveal, /pickedThemes = ownTheme \? new Set\(\[\.\.\.pickedThemes, ownTheme\]\) : new Set\(\);/);
  assert.match(reveal, /applyMapFilters\(\);\s*$/);
  assert.match(component, /button\.setAttribute\('aria-pressed', pickedThemes\.has\(theme\) \? 'true' : 'false'\);/);
  assert.match(component, /item\.setAttribute\('aria-pressed', selected \? 'true' : 'false'\);/);

  // Still no redundant "Chapter node" label and no relationship/edit rows.
  assert.match(component, /selectedEl\.dataset\.selectedType = member\.type/);
  assert.match(component, /data-selected-type='chapter'/);
  // Reversed on purpose (map-polish-audit.md § 5, after map-p2): "P1 then
  // shows a chapter's themes and its `TYPE · PLACE` kicker in the dock,
  // reversing `selectedKicker.hidden = isChapter`". Every kicker reads
  // TYPE · PLACE, as in "Chapter · Nairobi".
  assert.doesNotMatch(component, /selectedKicker\.hidden = isChapter/);
  assert.match(component, /selectedKicker\.textContent = member\.place \? `\$\{role\} · \$\{member\.place\}` : role;/);
  assert.match(component, /if \(selectedEdgeList\) selectedEdgeList\.hidden = true/);
  assert.match(component, /if \(updateWrap\) updateWrap\.hidden = isChapter \|\| !member\.approved/);
  assert.match(component, /const role = member\.owned/);
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
  assert.match(recompute, /badgeCenterFor\(anchors, radius, taken, corner\)/);
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

test('home map location picker writes zero without a sign on the prime meridian and the equator', async () => {
  // A pin a hair west of Greenwich read "-0.000000" (qa-map-polish handoff).
  assert.equal(formatPickerCoordinate(-0.0000004), '0.000000');
  assert.equal(formatPickerCoordinate(-0), '0.000000');
  assert.equal(formatPickerCoordinate(-0.0000004 * 1e3), '-0.000400', 'a real western value keeps its sign');
  assert.equal(formatPickerCoordinate(0.0000004), '0.000000');
  assert.equal(formatPickerCoordinate(-0.12775), '-0.127750');
  assert.equal(formatPickerCoordinate(51.5072), '51.507200');
  // A drag across the picker's middle lands on longitude zero within floating
  // point, and the form shows and sends it unsigned.
  const nearMeridian = pickerPointToLocation({ x: 99.99999999, y: 40 }, { width: 200, height: 88, worldHeight: 100 });
  assert.ok(nearMeridian && nearMeridian.long < 0);
  assert.equal(formatPickerCoordinate(nearMeridian!.long), '0.000000');

  const component = await readFile(
    new URL('../packages/website/src/components/page-sections/HomeMap.astro', import.meta.url),
    'utf8'
  );
  assert.doesNotMatch(component, /\.toFixed\(6\)/, 'every picker coordinate goes through formatPickerCoordinate');
  assert.match(component, /locationCoordinateLong\.value = formatPickerCoordinate\(long\)/);
  assert.match(component, /longInput\.value = formatPickerCoordinate\(location\.long\)/);
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
  // The stacks are rebuilt before focus returns, so it lands on the marker
  // that stands for a person, not on a pin about to be hidden (Codex on #63).
  const closeCard = component.match(/const closeSelected = \(\{ returnFocus = true \}: \{ returnFocus\?: boolean \} = \{\}\) => \{([\s\S]*?)\n    \};\n/)?.[1] ?? '';
  assert.match(closeCard, /recomputeClustersNow\(\);\s*if \(!restoreFocus \|\| !focusTarget\) return;/);
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
  // from the 44px touch target, which step 3 names once as --gp-map-target
  // (§ 5: "Icon-only controls (zoom, close, reset) are 44 by 44px").
  assert.match(component, /--gp-map-edge: var\(--gp-space-sm\);/);
  assert.match(component, /--gp-map-row: calc\(var\(--gp-map-target\) \+ var\(--gp-space-xs\) \* 2 \+ 2px\);/);
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

test('home map filters narrow, then add (map-polish-audit.md § 5)', () => {
  // Afo picked "Narrow, then add": "the first press on a type or a theme
  // shows only that one, more presses add to it (Stewards and Members
  // together), pressing a pressed pill removes it, 'All' resets the themes
  // and 'Show all' resets both."
  const none = new Set<MapNodeType>();
  const stewards = togglePick(none, 'steward');
  assert.deepEqual([...stewards], ['steward'], 'the first press shows only that type');
  const both = togglePick(stewards, 'member');
  assert.deepEqual([...both].sort(), ['member', 'steward'], 'a second press adds a type');
  assert.deepEqual([...togglePick(both, 'steward')], ['member'], 'pressing a picked type removes it');
  assert.equal(togglePick(stewards, 'steward').size, 0, 'removing the last pick shows everything');
  assert.equal(none.size, 0, 'a press returns a new set and leaves the old one alone');
  assert.equal(typeIsShown(none, 'chapter'), true);
  assert.equal(typeIsShown(both, 'chapter'), false);
  assert.equal(typeIsShown(both, 'member'), true);
  assert.equal(themeIsShown(new Set<string>(), 'water'), true, 'every theme draws its threads while none is picked');
  assert.equal(themeIsShown(new Set(['water']), 'trees'), false);
  assert.equal(pickState(new Set<string>(), 'water'), 'none-picked');
  assert.equal(pickState(new Set(['trees']), 'water'), 'others-picked');
  assert.equal(pickState(new Set(['trees', 'water']), 'water'), 'picked-with-others');
  assert.equal(pickState(new Set(['water']), 'water'), 'only-picked');

  // "Each pill's accessible name says what pressing it will do, with
  // aria-pressed carrying the state" (§ 5), in § 5's words.
  const stewardName = (picked: Set<MapNodeType>, themesNarrow = false) => typePillName({
    label: 'Stewards',
    count: 2,
    type: 'steward',
    picked,
    themesNarrow,
  });
  assert.equal(stewardName(none), 'Show only Stewards; 2 match current filters');
  assert.equal(stewardName(new Set<MapNodeType>(['member'])), 'Add Stewards; 2 match current filters');
  assert.equal(stewardName(new Set<MapNodeType>(['member', 'steward'])), 'Remove Stewards');
  // § 5: "While it is the only one picked: 'Show all map nodes'". The name
  // keeps the pill's visible label too, so a speech user can say "Stewards"
  // (WCAG 2.5.3, CodeRabbit on #56).
  assert.equal(stewardName(new Set<MapNodeType>(['steward'])), 'Remove Stewards to show all map nodes');
  // Pressing the only picked type clears the type filter. While a theme still
  // narrows the map that is not every node, so the name says what it is.
  assert.equal(stewardName(new Set<MapNodeType>(['steward']), true), 'Remove Stewards to show every node type');
  assert.equal(
    typePillName({ label: 'Stewards', count: 1, type: 'steward', picked: none, themesNarrow: false }),
    'Show only Stewards; 1 matches current filters'
  );
  // "Theme chips follow the same pattern ('Show only Water', 'Add Water',
  // 'Remove Water', and 'All' named 'Show every theme')."
  const waterName = (picked: Set<string>) => themeChipName({ label: 'Water', count: 7, theme: 'water', picked });
  assert.equal(waterName(new Set<string>()), 'Show only Water; 7 match current filters');
  assert.equal(waterName(new Set(['trees'])), 'Add Water; 7 match current filters');
  assert.equal(waterName(new Set(['trees', 'water'])), 'Remove Water');
  assert.equal(waterName(new Set(['water'])), 'Remove Water to show every theme', 'pressing the only picked theme shows every theme');
  // "All" named "Show every theme", with its visible label first.
  assert.equal(ALL_THEMES_NAME, 'All, show every theme');

  // The strip: "the most-used themes (picked ones first, as many as fit)".
  const tallies = [
    { id: 'public', count: 16 },
    { id: 'education', count: 15 },
    { id: 'water', count: 7 },
    { id: 'waste', count: 1 },
    { id: 'desci', count: 2 },
  ];
  assert.deepEqual(stripThemeOrder(tallies, new Set<string>()), ['public', 'education', 'water', 'desci', 'waste']);
  assert.deepEqual(stripThemeOrder(tallies, new Set(['waste'])), ['waste', 'public', 'education', 'water', 'desci']);
  assert.deepEqual(stripThemeOrder([{ id: 'a', count: 2 }, { id: 'b', count: 2 }], new Set<string>()), ['a', 'b'], 'ties keep the canonical order');
  assert.equal(chipsThatFit([100, 90, 80], 200, 4), 2, '100 + 4 + 90 fits in 200, and the third chip does not');
  assert.equal(chipsThatFit([100, 90], 194, 4), 2, 'a chip that ends exactly at the edge fits');
  assert.equal(chipsThatFit([120], 100, 4), 0);
  assert.equal(chipsThatFit([], 100, 4), 0);
});

test('home map phone view: the full height, centred on the Atlantic, never letterboxed', () => {
  // § 5: "The default view frames on height, as Afo's phone frame did: the
  // map's full height (the desktop crop, 90°N to about 68°S) fills the stage,
  // centred on the Atlantic, and the width shows whatever longitude that
  // leaves. On a 375 by 812 phone that is about 88°W to 23°E, the Great Lakes
  // to Cape Town; a 375 by 667 phone shows about 135° of longitude."
  const longitudeAt = (x: number) => (x / 200) * 360 - 180;
  const close = (a: number, b: number, tolerance = 1e-9) => Math.abs(a - b) <= tolerance;
  const wide = defaultMapView(200 / 88, ATLANTIC_CENTER_X);
  assert.deepEqual(wide, { x: 0, y: 0, width: 200, height: 88 }, "a stage in the drawing's shape shows the whole map");
  assert.deepEqual(MAP_DRAWING, wide);
  // Afo's phone frame: a 343 by 487 stage (60svh of 812).
  const tall = defaultMapView(343 / 487, ATLANTIC_CENTER_X);
  assert.equal(tall.height, 88, 'the full height');
  assert.ok(close(tall.width, 88 * (343 / 487)), "in the stage's shape, so nothing is letterboxed");
  assert.ok(Math.abs(longitudeAt(tall.x) + 88) < 1.5, `the west edge sits near 88°W: ${longitudeAt(tall.x)}`);
  assert.ok(Math.abs(longitudeAt(tall.x + tall.width) - 23) < 1.5, `the east edge sits near 23°E: ${longitudeAt(tall.x + tall.width)}`);
  // A 375 by 667 phone: 60svh is 400.2px.
  const shorter = defaultMapView(343 / 400.2, ATLANTIC_CENTER_X);
  assert.ok(Math.abs(shorter.width * 1.8 - 135) < 2, `about 135° of longitude: ${shorter.width * 1.8}`);
  // A stage wider than the drawing shows all of its width and less of its
  // height, centred: still no letterbox.
  const short = largestMapView(4, MAP_DRAWING);
  assert.deepEqual(short, { x: 0, y: 19, width: 200, height: 50 });
  // Zoom bounds: the same factor on every stage, 46 units wide on a wide one.
  assert.ok(close(clampMapView({ x: 50, y: 10, width: 10, height: 4.4 }, 200 / 88, 200 / 46).width, 46));
  const phoneClosest = clampMapView({ x: 60, y: 10, width: 1, height: 1 }, 343 / 487, 200 / 46);
  assert.ok(close(phoneClosest.width, tall.width * (46 / 200)));
  assert.equal(clampMapView({ x: -40, y: -9, width: 300, height: 300 }, 343 / 487, 200 / 46).x, 0, 'a view never leaves the drawing');

  // § 5: "A pill on each edge that has nodes beyond it pans that way ('5 more
  // east' with today's data). After a pan, the pill on the other edge leads
  // back, so the pills work in both directions."
  const points = [
    { x: 55, y: 25 },
    { x: 120.4, y: 50.7 },
    { x: 155.6, y: 44.6 },
    { x: 167.2, y: 36.8 },
    { x: 119.2, y: 32.4 },
    { x: 120.5, y: 50 },
  ];
  assert.deepEqual(pointsBeyondView(tall, points), { west: 0, east: 5 });
  const east = panMapView(tall, 'east');
  assert.ok(east.x > tall.x && east.x < tall.x + tall.width, 'a pan keeps a sliver of what was on screen');
  assert.equal(east.width, tall.width);
  const eastAgain = panMapView(east, 'east');
  assert.ok(close(eastAgain.x + eastAgain.width, 200), "a pan stops at the drawing's edge");
  assert.ok(pointsBeyondView(eastAgain, points).west > 0, 'the west pill leads back');
  assert.equal(panMapView({ ...tall, x: 0 }, 'west').x, 0);
});

test('home map chrome: bars in the stage, a theme strip toolbar, one phone row, and filled pressed chips', async () => {
  const component = await readFile(
    new URL('../packages/website/src/components/page-sections/HomeMap.astro', import.meta.url),
    'utf8'
  );
  const webmcp = await readFile(new URL('../packages/website/src/scripts/webmcp.ts', import.meta.url), 'utf8');

  // § 5: "Bars inside the stage. Top left: the theme strip (role="toolbar")
  // with 'All' (pressed while no theme narrows the map), the most-used themes
  // (picked ones first, as many as fit) and '+N', which opens the theme
  // editor. Top right: the type legend as today, with 'Show all' while any
  // filter narrows the map. Bottom left: 'List' with the visible count
  // (aria-expanded). Bottom right: the live status, zoom and 'Join the map'."
  const controlsCss = component.match(/\n  \.gp-home-map-controls \{([^}]*)\}/)?.[1] ?? '';
  assert.match(controlsCss, /grid-template-areas:\s*'strip legend legend'\s*'\. \. \.'\s*'list status end';/);
  assert.match(controlsCss, /pointer-events: none;/, 'the map takes every press between the bars');
  assert.match(component, /<div class="gp-home-map-theme-strip" role="toolbar" aria-label="Filter by theme" data-home-map-theme-strip>/);
  assert.match(component, /<Chip as="button" class="gp-home-map-strip-chip is-all" data-home-map-theme-all aria-pressed="true" aria-label="All, show every theme">All<\/Chip>/);
  assert.match(component, /data-home-map-theme-more\s+aria-expanded="false"\s+aria-controls="gp-home-map-theme-editor"/);
  // The overlay wrappers carry roles (the audit's § 2.5 a11y item, carried
  // into the chrome step): bare labelled divs were dropped by assistive tech.
  assert.match(component, /<div class="gp-home-map-legend" role="group" aria-label="Filter by node type">/);
  assert.match(component, /<div class="gp-home-map-zoom-controls" data-home-map-zoom-controls role="group" aria-label="Map zoom">/);
  for (const [tag] of component.matchAll(/<div class="gp-home-map-[^"]*"[^>]*\saria-label="[^"]*"[^>]*>/g)) {
    assert.match(tag, /\srole="(?:group|toolbar|region)"/, `${tag} needs a role, or assistive tech drops its label`);
  }
  assert.match(component, /class="gp-home-map-list-toggle" data-home-map-list-toggle aria-expanded="false" aria-controls="gp-home-map-node-list">[\s\S]*?data-home-map-list-toggle-count/);
  assert.match(component, /if \(listToggleCount\) listToggleCount\.textContent = String\(visibleCount\);/);
  // The live status stands before zoom and Join the map, in its own grid
  // cell, outside the phone row, whose edge fade would mask it.
  assert.match(controlsCss, /'list status end';/);
  assert.match(component, /\.gp-home-map-freshness \{\s*grid-area: status;/);
  const rowMarkup = component.match(/<div class="gp-home-map-control-row">([\s\S]*?)\n      <\/div>\n\n      \{\/\* The Live pill/)?.[1] ?? '';
  assert.ok(rowMarkup.includes('data-home-map-open'), 'the row holds the controls');
  assert.ok(!rowMarkup.includes('data-home-map-freshness'), 'the live pill is not in the row');

  // "The theme editor, opened from '+N', is the only place that lists all 16
  // themes: toggles with counts in four columns, plus 'Clear' and 'Done'."
  const editor = component.match(/<section\s+class="gp-home-map-theme-editor"[\s\S]*?<\/section>/)?.[0] ?? '';
  assert.match(editor, /data-filter-panel="theme"/);
  assert.match(editor, /mapThemes\.map\(\(theme\) => \([\s\S]*?data-theme-filter=\{theme\.id\}[\s\S]*?data-theme-filter-count/);
  assert.match(editor, /<Button variant="ghost" class="gp-home-map-theme-editor-action" data-theme-editor-clear>Clear<\/Button>/);
  assert.match(editor, /<Button variant="ghost" class="gp-home-map-theme-editor-action" data-theme-editor-done>Done<\/Button>/);
  // The strip is one tab stop; the arrow keys, Home and End move along it.
  assert.match(component, /themeStrip\?\.addEventListener\('keydown'/);
  assert.match(component, /button\.setAttribute\('tabindex', button === stripTabStop \? '0' : '-1'\)/);
  // A press on the strip never moves the chip it pressed: the strip re-sorts
  // only while nobody is on it, and the legend's room counts its Show all chip
  // even while that is hidden.
  assert.match(component, /const interacting = themeStrip\.matches\(':hover, :focus-within'\);/);
  assert.match(component, /if \(legendResetChip\) legendResetChip\.hidden = false;\s*const width = legendEl\.offsetWidth;/);
  // Where the legend's labels would leave the strip no theme at all, the
  // legend shows dots and numbers only, DESIGN.md:403's compact rule.
  assert.match(component, /if \(fit === 0 && chips\.length > 0\) \{\s*root\.classList\.add\('has-compact-legend'\);/);
  assert.match(component, /\.gp-home-map-canvas\.has-compact-legend \.gp-home-map-legend-label \{[\s\S]*?clip: rect\(0 0 0 0\);/);
  // Closing the editor from inside gives focus back to what opened it.
  assert.match(component, /if \(!focusWasInside\) return;[\s\S]*?const opener = \[filterPanelOpener, \.\.\.filterToggleButtons\]/);
  // A sort put off while the strip was in use happens once it is not.
  assert.match(component, /themeStrip\?\.addEventListener\('focusout', sortStripWhenFree\);/);

  // Pressed versus focus (the audit's § 2.4, carried into the chrome step): a
  // pressed chip is filled, hover only tints its border, and focus keeps the
  // site's focus ring, so neither looks pressed.
  const pressed = component.match(/\.gp-home-map \.gp-chip\[aria-pressed='true'\] \{([^}]*)\}/)?.[1] ?? '';
  assert.match(pressed, /background:/);
  const hover = component.match(/\.gp-home-map \.gp-chip:hover \{([^}]*)\}/)?.[1] ?? '';
  assert.match(hover, /border-color:/);
  assert.doesNotMatch(hover, /background/);
  assert.doesNotMatch(component, /\.gp-home-map-legend-item:focus-visible|\.gp-home-map-legend-item\.is-active/);
  assert.doesNotMatch(component, /\.gp-home-map-zoom-controls button:focus-visible|\.gp-home-map-join:focus-visible/);
  // The shared primitives (CodeRabbit on #50): both Show all chips are the
  // Chip, Try again is the ghost Button, and the local chip rule is gone.
  assert.match(component, /<Chip as="button" class="gp-home-map-filter-note-reset" data-home-map-filter-reset>Show all<\/Chip>/);
  assert.doesNotMatch(component, /\.gp-home-map-legend-reset,\s*\.gp-home-map-filter-note button/);
  assert.match(component, /import Button from '\.\.\/ui\/Button\.astro';/);
  assert.match(component, /import Chip from '\.\.\/ui\/Chip\.astro';/);

  // Hit targets (DESIGN.md:431 to 441, § 5): text buttons reach 48px, chips
  // are 30px under a fine pointer and 44px under a coarse one and in the
  // phone row, and icon-only controls are 44 by 44px. Step 3 names the 44px
  // target once as --gp-map-target; the sizes are unchanged.
  assert.match(component, /\.gp-home-map-list-toggle,\s*\.gp-home-map-themes-toggle \{[\s\S]*?min-height: calc\(40px \+ var\(--gp-space-xs\) \* 2 \+ 2px\);/);
  assert.match(component, /--gp-map-chip: 30px;/);
  assert.match(component, /@media \(pointer: coarse\) \{\s*\.gp-home-map-canvas \{\s*--gp-map-chip: var\(--gp-map-target\);/);
  assert.match(component, /\.gp-home-map \.gp-chip \{\s*min-height: var\(--gp-map-chip\);/);
  assert.match(component, /\.gp-home-map-zoom-controls button \{\s*min-width: var\(--gp-map-target\);\s*min-height: var\(--gp-map-target\);/);
  assert.match(component, /\.gp-home-map-theme-editor-close \{\s*width: var\(--gp-map-target\);\s*height: var\(--gp-map-target\);/);
  const phoneCss = component.match(/@container \(max-width: 520px\) \{([\s\S]*?)\n  \}\n/)?.[1] ?? '';
  assert.match(phoneCss, /\.gp-home-map-list-toggle,\s*\.gp-home-map-themes-toggle,\s*\.gp-home-map-join \{\s*min-height: var\(--gp-map-row\);/);
  assert.match(phoneCss, /\.gp-home-map \.gp-chip\.gp-home-map-legend-item,\s*\.gp-home-map \.gp-chip\.gp-home-map-legend-reset \{\s*min-height: var\(--gp-map-target\);/);
  // § 5: "the row scrolls behind a mask-image edge fade", on one line, and a
  // phone opens the editor from Themes, not from the strip.
  assert.match(phoneCss, /\.gp-home-map-control-row \{[\s\S]*?flex-wrap: nowrap;[\s\S]*?overflow-x: auto;[\s\S]*?mask-image: var\(--gp-map-edge-fade\);/);
  assert.match(phoneCss, /\.gp-home-map-theme-strip \{\s*display: none;/);
  assert.match(phoneCss, /\.gp-home-map-controls > \.gp-home-map-edge-pills \{\s*display: block;/);
  assert.match(phoneCss, /\.gp-home-map-themes-toggle \{\s*display: inline-flex;/);
  // "Layout follows the container's width only; the kind of pointer never
  // picks it": the script reads the layout the CSS picked.
  assert.match(component, /const mapLayout = \(\): 'phone' \| 'sheet' \| 'dock' => \{\s*const layout = window\.getComputedStyle\(root\)\.getPropertyValue\('--gp-map-layout'\)/);
  // The phone's stage pans and resets without dragging: the edge pills, and
  // "Reset the map view", which "returns to the default view and leaves the
  // filters alone".
  assert.match(component, /const resetMapView = \(\) => setMapViewBox\(defaultViewBox\(\), \{ isDefault: true \}\);/);
  assert.match(component, /setMapViewBox\(panMapView\(currentViewBox, edgeOf\(pill\), FULL_VIEW_BOX\)\);/);
  assert.match(component, /if \(label\) label\.textContent = `\$\{count\} more \$\{edgeOf\(pill\)\}`;/);
  assert.match(component, /preserveAspectRatio="xMidYMid slice"/, 'before the script runs, a phone crops the map rather than letterboxing it');
  // At the opening view an up or down swipe still scrolls the page, on every
  // touch map: zoomed in, the map takes every gesture (CodeRabbit on #56).
  assert.match(component, /\n  \.gp-home-map-svg \{[^}]*touch-action: pan-y;/);
  assert.match(component, /\n  \.gp-home-map-canvas\.is-zoomed \.gp-home-map-svg \{\s*touch-action: none;/);

  // Answers to the #56 reviews.
  // One open surface however a node is reached (Codex, CodeRabbit).
  assert.match(component, /const openSelected = \(member: DynamicMapNode, link: Element, viaKeyboard = false\) => \{\s*if \(!selectedEl\) return;[\s\S]*?closeFilterPanels\(\);[\s\S]*?resetUpdateState\(\);/);
  // A pick queues the strip's picked-first sort for when the strip is let go;
  // a mouse leaving or focus moving runs it, a lifted finger does not.
  assert.match(component, /pickedThemes = togglePick\(pickedThemes, theme\);\s*\/\/[^\n]*\n\s*stripSortPending = true;/);
  assert.match(component, /themeStrip\?\.addEventListener\('pointerleave', \(event\) => \{\s*if \(event\.pointerType !== 'touch'\) sortStripWhenFree\(\);/);
  // Chips move only when their order changed, and keep focus (CodeRabbit).
  assert.match(component, /if \(domOrder\.join\(' '\) !== stripOrder\.join\(' '\)\) \{[\s\S]*?focused\?\.focus\(\{ preventScroll: true \}\);/);
  // The end bar shares the strip's grid column with the legend (CodeRabbit).
  assert.match(component, /controlsEl\.clientWidth - Math\.max\(room, endBar\) - controlsGap - fixed/);
  // A move that ends at the opening view keeps it the opening view (Codex),
  // and a zoom clamps its width before it centres (CodeRabbit).
  assert.match(component, /viewIsDefault = Boolean\(options\.isDefault\) \|\| sameView\(currentViewBox, defaultViewBox\(\)\);/);
  assert.match(component, /const \{ width: clampedWidth, height \} = clampViewBox\(\{ x: 0, y: 0, width, height: width \/ stageAspect\(\) \}\);/);
  // The floating card was placed by layout, not by pointer (CodeRabbit). It
  // went in step 4 (map-polish-audit.md § 5: "June's floating card goes"):
  // the container's width picks the dock or the sheet in CSS, and nothing
  // that opens, closes or pans the inspector reads the pointer.
  assert.doesNotMatch(component, /if \(!selectedEl \|\| selectedEl\.hidden \|\| !target \|\| mapLayout\(\) === 'phone'\) return;/);
  const inspectorScript = component.slice(
    component.indexOf('    // ---- Selected-node panel + owner edit-link request'),
    component.indexOf('    // Chapters keep their <a href> for no-JS navigation')
  );
  assert.ok(inspectorScript.length > 0, 'the inspector script must be present');
  assert.doesNotMatch(inspectorScript, /coarsePointer|pointer: coarse/);
  // The editor's toggles and the edge pills are the shared Chip (CodeRabbit),
  // the toggles' labels stay on one line, and the pills keep the map's sides.
  assert.match(component, /<Chip\s+as="button"\s+class="gp-home-map-filter-option is-theme"\s+data-theme-filter=\{theme\.id\}/);
  assert.match(component, /<div class="gp-home-map-edge-pills" dir="ltr">\s*<Chip as="button" mono class="gp-home-map-edge-pill is-west" data-home-map-pan="west" hidden>/);
  assert.match(component, /\.gp-home-map-filter-option-label \{[^}]*white-space: nowrap;/);
  assert.match(component, /@container gp-theme-editor \(width < 53\.5rem\) \{\s*\.gp-home-map-filter-panel\.is-themes \{\s*grid-template-columns: repeat\(auto-fill, minmax\(13rem, 1fr\)\);/);
  // At 860px and narrower the live pill keeps its dot and Live, so the bottom
  // bars fit beside List (CodeRabbit); on a phone it sits over the South
  // Atlantic, clear of the edge pills, which move below a wrapped error note.
  assert.match(component, /@container \(max-width: 860px\) \{\s*\.gp-home-map-freshness-sep,\s*\.gp-home-map-freshness-age,\s*\.gp-home-map-freshness\[data-state='stale'\] \{\s*display: none;/);
  assert.match(phoneCss, /\.gp-home-map-freshness \{\s*position: absolute;\s*inset-block-end: calc\(var\(--gp-map-row\) \+ var\(--gp-space-sm\)\);/);
  assert.match(component, /const height = mapStateError && !mapStateError\.hidden && mapLayout\(\) === 'phone' \? mapStateError\.offsetHeight : 0;/);
  // A layout change never strands keyboard focus (Codex on #56): crossing
  // 520px while a strip chip has focus moves it to Themes before the 80ms
  // resize debounce, and back again; a control remembers its focus only
  // when it blurred because it hid.
  assert.match(component, /const scheduleMapResizeSync = \(\) => \{\s*\/\/[^\n]*\n\s*keepChromeFocus\(\);/);
  assert.match(component, /if \(themeStrip\?\.contains\(el\)\) return \[themesToggle, stripTabStop, themeAllChip, themeMoreChip\];/);
  assert.match(component, /if \(el === themesToggle\) return \[stripTabStop, themeAllChip, themeMoreChip\];/);
  assert.match(component, /if \(target && target\.getClientRects\(\)\.length > 0\) lastChromeFocus = null;/);
  assert.match(component, /const next = counterpartsOf\(held\)\.find\(\(candidate\) => candidate && candidate\.getClientRects\(\)\.length > 0\);\s*next\?\.focus\(\{ preventScroll: true \}\);/);

  // WebMCP stays read-only and reads the new rule: no picked theme means
  // every theme shows.
  assert.match(webmcp, /activeThemes: \(pickedThemes\.length \? pickedThemes : themeFilters\)/);
  assert.doesNotMatch(webmcp, /\.click\(|dispatchEvent|setAttribute/);
});

test('home map list: search matches names and places, and groups follow the legend', () => {
  // map-polish-audit.md § 5: "Search matches names and places, and one polite
  // live region announces the count once typing pauses. Rows ... grouped by
  // type with counts".
  assert.deepEqual(searchWords("  Côte  D'IVOIRE "), ['cote', "d'ivoire"]);
  assert.equal(entryMatchesSearch({ name: "Greenpill Côte d'Ivoire", place: 'Abidjan' }, searchWords('cote')), true, 'accents do not matter');
  assert.equal(entryMatchesSearch({ name: 'Greenpill Nigeria', place: 'Awka' }, searchWords('awka')), true, 'places match');
  assert.equal(entryMatchesSearch({ name: 'Greenpill Nigeria', place: 'Awka' }, searchWords('greenpill awka')), true, 'every word matches, in the name or the place');
  assert.equal(entryMatchesSearch({ name: 'Greenpill Nigeria', place: 'Awka' }, searchWords('greenpill kenya')), false);
  assert.equal(entryMatchesSearch({ name: 'Anyone', place: '' }, searchWords('   ')), true, 'an empty search keeps every row');
  const groups = groupListEntries([
    { type: 'member', name: 'zed', place: '' },
    { type: 'chapter', name: 'Greenpill NYC', place: 'New York City' },
    { type: 'member', name: 'Ash', place: 'Florida' },
    { type: 'chapter', name: 'Greenpill Brasil', place: 'Rio de Janeiro' },
  ]);
  assert.deepEqual(
    groups.map((group) => [group.type, group.entries.map((entry) => entry.name)]),
    [['chapter', ['Greenpill Brasil', 'Greenpill NYC']], ['member', ['Ash', 'zed']]],
    "the legend's order, names sorted, and no empty group"
  );
  assert.equal(listSearchAnnouncement(3, 29, 'awka '), '3 of 29 nodes match "awka".');
  assert.equal(listSearchAnnouncement(1, 29, 'awka'), '1 of 29 nodes matches "awka".');
  assert.equal(listSearchAnnouncement(0, 29, 'xyz'), 'No nodes match "xyz".');
  assert.equal(listSearchAnnouncement(29, 29, ''), '29 nodes in the list.');
  // A rebuild keeps focus on the same node's row; when an update removed it,
  // on the next row that remains; with nothing after it, on no row, and the
  // list's first control takes it (Codex on #59).
  const before = ['chapter:a', 'chapter:b', 'steward:c', 'member:d', 'member:e'];
  assert.equal(rowToFocusAfterRebuild(before, 'steward:c', before), 'steward:c');
  assert.equal(rowToFocusAfterRebuild(before, 'steward:c', ['chapter:a', 'chapter:b', 'member:d', 'member:e']), 'member:d');
  assert.equal(rowToFocusAfterRebuild(before, 'steward:c', ['chapter:a', 'chapter:b', 'member:e']), 'member:e');
  assert.equal(rowToFocusAfterRebuild(before, 'member:e', ['chapter:a', 'chapter:b', 'steward:c', 'member:d']), null);
  assert.equal(rowToFocusAfterRebuild(before, 'steward:c', ['chapter:a', 'chapter:b']), null);
  assert.equal(rowToFocusAfterRebuild(before, '', before), null);
  // A node that arrives with the update is never the "next" row.
  assert.equal(rowToFocusAfterRebuild(before, 'member:d', ['chapter:a', 'member:new', 'member:e']), 'member:e');
});

test('home map list: a dock beside the map, a sheet inside the stage, a modal sheet on phones', async () => {
  const component = await readFile(
    new URL('../packages/website/src/components/page-sections/HomeMap.astro', import.meta.url),
    'utf8'
  );
  // § 5: "The list opens in the same dock: the kicker 'Visible nodes', the
  // heading 'Map list' (an h2, as today), a count, and a search field labelled
  // 'Search the map' with the placeholder 'Name or place'."
  assert.match(component, /<p class="gp-home-map-list-kicker" data-home-map-list-kicker>Visible nodes<\/p>\s*<h2 id="gp-home-map-list-title">Map list<\/h2>/);
  assert.match(component, /<span class="gp-home-map-list-count" data-home-map-list-count>0<\/span>/);
  assert.match(component, /<label class="gp-home-map-sr" for="gp-home-map-list-search">Search the map<\/label>/);
  assert.match(component, /id="gp-home-map-list-search"\s+type="search"\s+data-home-map-list-search\s+placeholder="Name or place"/);
  // "one polite live region announces the count once typing pauses"
  assert.match(component, /<p class="gp-home-map-sr" data-home-map-list-live aria-live="polite"><\/p>/);
  assert.match(component, /window\.clearTimeout\(listAnnounceTimer\);\s*listAnnounceTimer = window\.setTimeout\(\(\) => \{[\s\S]*?listSearchAnnouncement\(/);
  // Each opening clears the last announcement along with the search, so a
  // reopened list never reads out an old count (Codex on #59).
  assert.match(component, /listQuery = '';\s*if \(listSearch\) listSearch\.value = '';\s*if \(listLive\) listLive\.textContent = '';/);
  // "Rows are at least 44px tall (mark, name, place cut with an ellipsis),
  // grouped by type with counts".
  // The list's sizes are set once as map properties (CodeRabbit on #59):
  // a 44px target for rows, the search field and Close, a 16px icon and a
  // 10px mark, with the shared pill radius and spacing tokens beside them.
  assert.match(component, /--gp-map-target: 44px;\s*--gp-map-icon: 16px;\s*--gp-map-mark: 10px;/);
  assert.match(component, /\.gp-home-map-list-row \{[\s\S]*?min-block-size: var\(--gp-map-target\);/);
  assert.match(component, /\.gp-home-map-list-close \{\s*width: var\(--gp-map-target\);\s*height: var\(--gp-map-target\);/);
  assert.match(component, /\.gp-home-map-list-search input \{[\s\S]*?min-height: var\(--gp-map-target\);/);
  assert.match(component, /\.gp-home-map-list-mark \{\s*width: var\(--gp-map-mark\);\s*height: var\(--gp-map-mark\);\s*border-radius: var\(--gp-radius-pill\);/);
  const listCss = component.match(/\n  \.gp-home-map-list-drawer \{[\s\S]*?\n  \.gp-home-map-list-mark\.is-chapter \{/)?.[0] ?? '';
  assert.ok(listCss.length > 0, 'list CSS block found');
  assert.doesNotMatch(listCss, /\b(?:44|16|10|2)px;|999px/);
  assert.match(component, /groupListEntries\(entries\)\.forEach\(\(group\) => \{[\s\S]*?makeListPart\('h3', 'gp-home-map-list-group-title'\)[\s\S]*?makeListPart\('span', 'gp-home-map-list-group-count', String\(group\.entries\.length\)\)[\s\S]*?makeListPart\('ul', 'gp-home-map-list-rows'\)/);
  // "Hovering or focusing a row rings its pin and shows its tooltip." The
  // hovered row and the keyboard-focused row are tracked apart, the latest
  // in front: when the pointer leaves, a row that keeps focus previews
  // again, and on blur a row still under the pointer does (Codex on #59).
  // The focus a click leaves previews nothing, as on the map's pins.
  assert.match(component, /row\.addEventListener\('pointerenter', \(\) => \{\s*hoveredListNode = node;\s*previewListNode\(node\);\s*\}\);/);
  assert.match(component, /row\.addEventListener\('pointerleave', \(\) => \{\s*hoveredListNode = null;\s*restoreListPreview\(\);\s*\}\);/);
  assert.match(component, /row\.addEventListener\('focus', \(\) => \{\s*if \(!row\.matches\(':focus-visible'\)\) return;\s*focusedListNode = node;\s*previewListNode\(node\);\s*\}\);/);
  assert.match(component, /row\.addEventListener\('blur', \(\) => \{\s*if \(focusedListNode !== node\) return;\s*focusedListNode = null;\s*restoreListPreview\(\);\s*\}\);/);
  assert.match(component, /const restoreListPreview = \(\) => \{\s*const node = hoveredListNode \?\? focusedListNode;\s*if \(node\) previewListNode\(node\);\s*else clearListTarget\(\);\s*\};/);
  assert.doesNotMatch(component, /row\.addEventListener\('(?:pointerleave|blur)', clearListTarget\)/);
  // A row previews beside a selected node too, and the selection's state
  // comes back when the preview ends (Codex on #59). The selected node stays
  // lit meanwhile, and a selected chapter's state is the map at rest.
  assert.match(component, /const previewListNode = \(node: HTMLElement\) => \{[\s\S]*?ringListTarget\(node\);\s*setFocus\(node\);\s*\};/);
  assert.doesNotMatch(component, /if \(!selectedFocusTarget\) setFocus\(node\);/);
  assert.match(component, /const clearListTarget = \(\) => \{\s*if \(!listTargetNode\) return;\s*ringListTarget\(null\);\s*if \(pointerFocusTarget \|\| hoveredStackKey\) return;\s*clearFocus\(\);\s*\};/);
  assert.match(component, /const selectedId = selectedFocusTarget\?\.getAttribute\('data-node-id'\);\s*if \(selectedId\) adjacentIds\.add\(selectedId\);/);
  assert.match(component, /if \(target === selectedFocusTarget && target\.classList\.contains\('is-chapter'\)\) \{\s*clearFocusState\(\);\s*return;\s*\}/);
  // Rebuilt stack markers take the ring over from the ones they replace,
  // and a resize keeps the preview in front of the selection (Codex on #59).
  const recomputeClusters = component.match(/const recomputeClustersNow = \(\) => \{([\s\S]*?)\n    \};\n/)?.[1] ?? '';
  assert.match(recomputeClusters, /if \(listTargetNode\) previewListNode\(listTargetNode\);/);
  assert.match(component, /const activeFocusTarget = listTargetNode \?\? selectedFocusTarget \?\? pointerFocusTarget;/);
  assert.match(component, /\.gp-home-map-node-link\.is-list-target \.gp-home-map-node-ring \{/);
  assert.match(component, /\.gp-home-map-overlap-stack\.is-list-target \.gp-home-map-overlap-disc \{/);
  // A live update rebuilding the rows keeps keyboard focus on the same node.
  // When the update removed that node, focus moves to the next row that
  // remains, else to the list's first control, also when no row is left:
  // it never drops out of the list or a phone's modal sheet (Codex on #59).
  const renderList = component.match(/\n    renderNodeList = \(\) => \{([\s\S]*?)\n    \};\n/)?.[1] ?? '';
  assert.match(renderList, /const focusId = active\s*\? rowToFocusAfterRebuild\(previousIds, clean\(active\.dataset\.listNodeId\), entries\.map\(\(entry\) => clean\(entry\.node\.dataset\.nodeId\)\)\)\s*: null;/);
  assert.match(renderList, /if \(focusId && row\.dataset\.listNodeId === focusId\) focusRow = row;/);
  assert.match(renderList, /if \(keepFocusOn\) keepFocusOn\.focus\(\{ preventScroll: true \}\);\s*else if \(active\) listEntryControl\(\)\?\.focus\(\{ preventScroll: true \}\);/);
  assert.match(renderList, /'No visible nodes match these filters\.'\s*\)\);\s*if \(active\) listEntryControl\(\)\?\.focus\(\{ preventScroll: true \}\);\s*return;/);
  assert.match(renderList, /hoveredListNode = null;\s*focusedListNode = null;\s*clearListTarget\(\);\s*listItems\.textContent = '';/);
  // The first control is the search, or Close on a touch screen, as when
  // the list opens.
  assert.match(component, /const listEntryControl = \(\) => \{\s*const typing = !window\.matchMedia\('\(pointer: coarse\)'\)\.matches;\s*return \(typing \? listSearch : listClose\)/);
  assert.match(component, /window\.requestAnimationFrame\(\(\) => listEntryControl\(\)\?\.focus\(\{ preventScroll: true \}\)\);/);
  // "The list is non-modal on desktop: the map stays usable" and on phones
  // "The list opens as a full-height sheet, modal on phones as today". Width
  // picks the layout, never the pointer.
  const showList = component.match(/const showNodeListForLayout = \(\) => \{([\s\S]*?)\n    \};\n/)?.[1] ?? '';
  assert.match(showList, /const modal = mapLayout\(\) === 'phone';/);
  assert.match(showList, /if \(modal\) listDrawer\.showModal\(\);\s*else listDrawer\.show\(\);/);
  assert.match(component, /renderNodeList\(\);\s*showNodeListForLayout\(\);/);
  assert.doesNotMatch(component, /listDrawer\.setAttribute\('aria-modal', isTouchMap\(\)/);
  // An open list that crosses 520px reopens in the new mode, keeping its
  // search, scroll and focus, and the close event that follows changes
  // nothing (Codex on #59).
  assert.match(showList, /if \(listDrawer\.open && listShownModal === modal\) return;/);
  assert.match(showList, /if \(listDrawer\.open\) listDrawer\.close\(\);/);
  assert.match(showList, /if \(listItems\) listItems\.scrollTop = scrollTop;\s*focused\?\.focus\(\{ preventScroll: true \}\);/);
  assert.match(component, /const scheduleMapResizeSync = \(\) => \{[\s\S]*?if \(listDrawer\?\.open && !listDrawer\.hidden\) showNodeListForLayout\(\);[\s\S]*?window\.clearTimeout\(mapResizeTimer\);/);
  // Changed on purpose (map-polish-audit.md § 5): the list and a selected
  // node no longer share the map: "one right-hand dock that holds either
  // the list or the selected node", and "Picking a row swaps
  // the dock to that node, with a way back to the list". So the list never
  // has to give way to a card when the layout leaves the dock (Codex on
  // #59): opening the inspector closes the list in every layout, keeping
  // what it showed for Back.
  assert.doesNotMatch(component, /yieldListToSelection/);
  const openInspector = component.match(/const openSelected = \(member: DynamicMapNode, link: Element, viaKeyboard = false\) => \{([\s\S]*?)\n    \};\n/)?.[1] ?? '';
  assert.match(openInspector, /const fromList = Boolean\(listDrawer && !listDrawer\.hidden\);\s*if \(fromList\) \{\s*listBehindInspector = \{\s*opener: listOpener,\s*subset: listSubset \? \{ keys: \[\.\.\.listSubset\.keys\], label: listSubset\.label \} : null,\s*query: listQuery,\s*scrollTop: listItems\?\.scrollTop \?\? 0,\s*\};\s*closeNodeList\(\);/);
  assert.match(openInspector, /if \(selectedBack\) selectedBack\.hidden = !listBehindInspector;/);
  // A pick from the list moves focus into the inspector, since its row goes
  // with the list: to Back first.
  assert.match(openInspector, /if \(viaKeyboard \|\| fromList \|\| focusWasInInspector\) inspectorEntryControl\(\)\?\.focus\(\{ preventScroll: true \}\);/);
  assert.match(component, /const inspectorEntryControl = \(\) => \(selectedBack && !selectedBack\.hidden \? selectedBack : selectedClose\);/);
  // Back brings the list back as it was, with focus on the row just shown.
  const back = component.match(/selectedBack\?\.addEventListener\('click', \(\) => \{([\s\S]*?)\n    \}\);\n/)?.[1] ?? '';
  assert.match(back, /closeSelected\(\{ returnFocus: false \}\);\s*openNodeList\(behind\.opener, behind\.subset\);/);
  assert.match(back, /listSearch\.value = behind\.query;\s*listQuery = behind\.query;\s*renderNodeList\(\);/);
  assert.match(back, /if \(listItems\) listItems\.scrollTop = behind\.scrollTop;/);
  assert.match(back, /\(row \?\? listEntryControl\(\)\)\?\.focus\(\{ preventScroll: true \}\);/);
  assert.match(component, /<button type="button" class="gp-home-map-selected-back" data-selected-back aria-label="Back to the map list" hidden>/);
  assert.match(component, /listDrawer\?\.addEventListener\('close', \(\) => \{\s*if \(listDrawer\.open\) return;\s*syncNodeListClosed\(\);/);
  // The dock: "inset 12px, the stage's full height, about 340px wide", and
  // "While the dock is open, both bars end at its edge."
  const drawerCss = component.match(/\n  \.gp-home-map-list-drawer \{([^}]*)\}/)?.[1] ?? '';
  assert.match(drawerCss, /inset-block: var\(--gp-map-inset\);/);
  assert.match(drawerCss, /inset-inline-end: var\(--gp-map-inset\);/);
  assert.match(drawerCss, /width: min\(var\(--gp-map-dock-width\), calc\(100% - var\(--gp-map-inset\) \* 2\)\);/);
  assert.match(component, /--gp-map-dock-width: 340px;/);
  assert.match(component, /\.gp-home-map-canvas\.has-list-drawer \{\s*--gp-map-end: calc\(var\(--gp-map-inset\) \* 2 \+ var\(--gp-map-dock-width\)\);/);
  assert.match(component, /\.gp-home-map-controls \{[\s\S]*?inset-inline-end: var\(--gp-map-end\);/);
  // "Containers from 521 to 860px: ... the list open[s] as a bottom sheet
  // inside the stage, because a 340px dock would cover most of the map."
  assert.match(component, /@container \(max-width: 860px\) \{\s*\.gp-home-map-canvas \{\s*--gp-map-layout: sheet;/);
  const phoneCss = component.match(/@container \(max-width: 520px\) \{([\s\S]*?)\n  \}\n/)?.[1] ?? '';
  assert.match(phoneCss, /\.gp-home-map-list-drawer \{\s*position: fixed;[\s\S]*?height: calc\(100dvh - var\(--gp-space-2xl\)\);/);
  // "The list scrolls the same way under its search field".
  assert.match(component, /\.gp-home-map-list-items \{[\s\S]*?min-height: 0;[\s\S]*?overflow-y: auto;/);
  // Picking a row selects its node, and the inspector takes the list's place
  // in every layout (§ 5: "Picking a row swaps the dock to that node, with a
  // way back to the list"); step 2's docked list stayed open beside it.
  assert.match(component, /const activateListNode = \(node: HTMLElement, viaKeyboard: boolean\) => \{\s*clearListTarget\(\);\s*activateMapNode\(node, viaKeyboard\);\s*\};/);
  assert.match(component, /row\.addEventListener\('click', \(event\) => activateListNode\(node, event\.detail === 0 \|\| row\.matches\(':focus-visible'\)\)\);/);
  // Escape empties a search before it closes the list, wherever focus is in
  // the list, a row included (CodeRabbit on #59).
  assert.match(component, /listDrawer\?\.addEventListener\('keydown', \(event\) => \{\s*if \(event\.key !== 'Escape' \|\| !listSearch\?\.value\) return;\s*event\.preventDefault\(\);\s*event\.stopPropagation\(\);/);
  assert.doesNotMatch(component, /listSearch\?\.addEventListener\('keydown'/);
  // Step 2 kept a selected node's card to the map's side of a docked list
  // until "step 4 moves the card into the dock itself" (CodeRabbit on #59).
  // Reversed on purpose (§ 5): the inspector is that dock, so the card's
  // placement beside the list goes.
  assert.doesNotMatch(component, /const dockRect = mapLayout\(\) === 'dock' && listDrawer/);
  assert.match(component, /const syncNodeListClosed = \(\) => \{[\s\S]*?layoutThemeStrip\(\);\s*\/\/[^\n]*\n\s*\/\/[^\n]*\n\s*syncSelectedOverlay\(\);\s*scheduleChapterLabels\(\);\s*\};/);
  // A touch screen opens the list at Close, so no on-screen keyboard rises.
  assert.match(component, /const typing = !window\.matchMedia\('\(pointer: coarse\)'\)\.matches;/);
});

test('home map edge pins and labels at rest: the clamp and the placement rules', () => {
  // § 5, "Edge pins": "the rendered pin and its hover and focus target sit
  // inside the drawable inset, and the data keeps the true coordinate."
  assert.equal(PIN_HIT_RADIUS, 4.8);
  assert.deepEqual(clampPinToDrawing({ x: 100, y: 40 }), { x: 100, y: 40 });
  const lonToX = (lon: number) => ((lon + 180) / 360) * 200;
  const latToY = (lat: number) => ((90 - lat) / 180) * 100;
  // A confirmed place on the 180th meridian, and the -180 that clipped Amio.
  assert.deepEqual(clampPinToDrawing({ x: lonToX(180), y: latToY(-17.7) }), { x: 200 - PIN_HIT_RADIUS, y: latToY(-17.7) });
  assert.deepEqual(clampPinToDrawing({ x: lonToX(-180), y: latToY(0) }), { x: PIN_HIT_RADIUS, y: latToY(0) });
  // The far north, and a point in the crop's bottom band (65°S), move in to
  // the inset. A point south of the crop, which ends at about 68.4°S, is not
  // on the map's edge (Codex on #60): it stays where it is, off the map, as
  // it did before the clamp, rather than drawn near 60°S.
  assert.equal(clampPinToDrawing({ x: 100, y: latToY(90) }).y, PIN_HIT_RADIUS);
  assert.equal(clampPinToDrawing({ x: 100, y: latToY(-65) }).y, MAP_DRAWING.height - PIN_HIT_RADIUS);
  assert.deepEqual(clampPinToDrawing({ x: 100, y: latToY(-75) }), { x: 100, y: latToY(-75) });
  assert.deepEqual(
    clampPinToDrawing({ x: lonToX(180), y: latToY(-77.8) }, 8.5, MAP_DRAWING, 12),
    { x: lonToX(180), y: latToY(-77.8) }
  );
  // Only the drawing moves: the point passed in is left as it was.
  const truePoint = { x: 200, y: 0 };
  clampPinToDrawing(truePoint);
  assert.deepEqual(truePoint, { x: 200, y: 0 });
  // On a small map the 44px hit circle is wider than 4.8 map units, and the
  // inset follows it (Codex on #60): at a 521px sheet, about 8.5 units.
  assert.deepEqual(clampPinToDrawing({ x: lonToX(180), y: 40 }, 8.5), { x: 191.5, y: 40 });
  // The stage clips to rounded corners (Codex on #60). In a corner's square
  // the centre stays within `cornerRadius - inset` of the arc's centre, so
  // the whole circle fits inside the curve; along an edge nothing changes,
  // and a corner rounder than the inset changes nothing.
  const cornered = clampPinToDrawing({ x: 200, y: 88 }, 4.8, MAP_DRAWING, 12);
  const arc = { x: 200 - 12, y: 88 - 12 };
  assert.ok(Math.abs(Math.hypot(cornered.x - arc.x, cornered.y - arc.y) - (12 - 4.8)) < 1e-9);
  assert.ok(cornered.x > arc.x && cornered.y > arc.y, 'the pin stays toward its corner');
  assert.ok(cornered.x <= 200 - 4.8 && cornered.y <= 88 - 4.8, 'and inside the rectangular inset');
  assert.deepEqual(clampPinToDrawing({ x: 200, y: 40 }, 4.8, MAP_DRAWING, 12), { x: 195.2, y: 40 });
  assert.deepEqual(clampPinToDrawing({ x: 200, y: 88 }, 4.8, MAP_DRAWING, 4), { x: 195.2, y: 83.2 });
  // Every corner keeps the circle inside: no point of it lies beyond the curve.
  for (const corner of [{ x: 0, y: 0 }, { x: 200, y: 0 }, { x: 0, y: 88 }, { x: 200, y: 88 }]) {
    const pin = clampPinToDrawing(corner, 4.8, MAP_DRAWING, 12);
    const arcCenter = { x: corner.x === 0 ? 12 : 188, y: corner.y === 0 ? 12 : 76 };
    assert.ok(Math.hypot(pin.x - arcCenter.x, pin.y - arcCenter.y) + 4.8 <= 12 + 1e-9, `circle inside the curve at ${corner.x},${corner.y}`);
  }
  // The geometry under the clamp, which the badges share: a circle moved in
  // just enough to lie inside a box with rounded corners.
  const roundBox = { x: 10, y: 10, width: 100, height: 50 };
  assert.deepEqual(keepCircleInside({ x: 50, y: 30 }, 4, roundBox, 8), { x: 50, y: 30 });
  assert.deepEqual(keepCircleInside({ x: 5, y: 30 }, 4, roundBox, 8), { x: 14, y: 30 });
  const inCorner = keepCircleInside({ x: 10, y: 10 }, 4, roundBox, 8);
  assert.ok(Math.abs(Math.hypot(inCorner.x - 18, inCorner.y - 18) - 4) < 1e-9, 'a corner keeps the circle on its curve');
  assert.equal(circleFitsInside({ x: 50, y: 30 }, 4, roundBox, 8), true);
  assert.equal(circleFitsInside({ x: 13, y: 30 }, 4, roundBox, 8), false);
  // Inside the rectangle, but its circle crosses the curve.
  assert.equal(circleFitsInside({ x: 14.5, y: 14.5 }, 4, roundBox, 8), false);
  assert.equal(circleFitsInside({ x: 14.5, y: 14.5 }, 4, roundBox, 0), true);
  // A badge with no side that fits (CodeRabbit on #60): beside an anchor in
  // view it moves in until its target is whole and clear of the corner's
  // curve. Beside an anchor out of view (a zoomed map, or a spot south of the
  // crop) it stays put, rather than drawn at the view's edge, far from its pin.
  const badgeView = { x: 0, y: 0, width: 100, height: 50 };
  const movedIn = badgeFallbackCenter({ x: 96, y: 4 }, { x: 99, y: 1 }, 3, badgeView, 6);
  assert.ok(circleFitsInside(movedIn, 3, badgeView, 6), 'the moved badge keeps its target inside the curve');
  assert.ok(movedIn.x > 90 && movedIn.y < 10, 'and stays in its corner');
  assert.deepEqual(badgeFallbackCenter({ x: 120, y: 20 }, { x: 123, y: 17 }, 3, badgeView, 6), { x: 123, y: 17 });
  assert.deepEqual(badgeFallbackCenter({ x: 50, y: 70 }, { x: 53, y: 67 }, 3, badgeView, 6), { x: 53, y: 67 });

  // § 5: "Each label tries right, left, above and below its dot, and hides
  // when it would touch another label, a pin, a badge, a bar or the dock."
  assert.deepEqual([...LABEL_SIDES], ['right', 'left', 'above', 'below']);
  const request = { anchor: { x: 50, y: 40 }, gap: 2, width: 10, height: 3 };
  assert.deepEqual(labelBoxOnSide(request, 'right'), { x: 52, y: 38.5, width: 10, height: 3 });
  assert.deepEqual(labelBoxOnSide(request, 'left'), { x: 38, y: 38.5, width: 10, height: 3 });
  assert.deepEqual(labelBoxOnSide(request, 'above'), { x: 45, y: 35, width: 10, height: 3 });
  assert.deepEqual(labelBoxOnSide(request, 'below'), { x: 45, y: 42, width: 10, height: 3 });
  const bounds = { x: 0, y: 0, width: 200, height: 88 };
  const none = { circles: [], boxes: [] };
  assert.equal(placeMapLabels([request], none, bounds)[0]?.side, 'right');
  // Off the map in view on the right: the left side.
  assert.equal(placeMapLabels([request], none, { x: 0, y: 0, width: 60, height: 88 })[0]?.side, 'left');
  // A pin on the right, then a bar on the left: above; all four blocked: hidden.
  const pinRight = { center: { x: 56, y: 40 }, radius: 1 };
  assert.equal(placeMapLabels([request], { circles: [pinRight], boxes: [] }, bounds)[0]?.side, 'left');
  const barLeft = { x: 30, y: 30, width: 12, height: 20 };
  assert.equal(placeMapLabels([request], { circles: [pinRight], boxes: [barLeft] }, bounds)[0]?.side, 'above');
  const dockAboveAndBelow = { x: 40, y: 30, width: 20, height: 30 };
  assert.equal(placeMapLabels([request], { circles: [], boxes: [dockAboveAndBelow] }, bounds)[0], null);
  // Touching counts: a box that shares the right label's edge blocks it.
  const touching = { x: 62, y: 38.5, width: 5, height: 3 };
  assert.equal(placeMapLabels([request], { circles: [], boxes: [touching] }, bounds)[0]?.side, 'left');
  // The first label is placed first; the next keeps clear of it.
  const second = { anchor: { x: 50, y: 42 }, gap: 2, width: 10, height: 3 };
  const placed = placeMapLabels([request, second], none, bounds);
  assert.deepEqual(placed.map((label) => label?.side), ['right', 'left']);
  // A label's own dot never blocks it: the gap clears the dot's circle.
  const ownDot = { center: request.anchor, radius: 1.5 };
  assert.equal(placeMapLabels([request], { circles: [ownDot], boxes: [] }, bounds)[0]?.side, 'right');

  // Bounds (CodeRabbit on #60): a label never leaves the map in view. A dot
  // on the top edge sends its label below; one in the bottom right corner,
  // left; a name wider than the map in view hides.
  const topEdge = { anchor: { x: 100, y: 1 }, gap: 2, width: 10, height: 3 };
  assert.equal(placeMapLabels([topEdge], none, bounds)[0]?.side, 'below');
  const bottomRight = { anchor: { x: 195, y: 87 }, gap: 2, width: 10, height: 3 };
  assert.equal(placeMapLabels([bottomRight], none, bounds)[0]?.side, 'above');
  const tooWide = { anchor: { x: 100, y: 40 }, gap: 2, width: 210, height: 3 };
  assert.equal(placeMapLabels([tooWide], none, bounds)[0], null);
  // Every label placed anywhere on a grid of dots, edges and corners
  // included, lies wholly inside the bounds.
  const view = { x: 20, y: 10, width: 120, height: 60 };
  // A view away from the origin still places labels (CodeRabbit on #60), so
  // the grid below cannot pass by placing none.
  assert.equal(placeMapLabels([request], none, view)[0]?.side, 'right');
  let gridPlaced = 0;
  for (let x = view.x; x <= view.x + view.width; x += 6) {
    for (let y = view.y; y <= view.y + view.height; y += 5) {
      const placedLabel = placeMapLabels([{ anchor: { x, y }, gap: 2, width: 14, height: 3 }], none, view)[0];
      if (!placedLabel) continue;
      gridPlaced += 1;
      const { box } = placedLabel;
      assert.ok(
        box.x >= view.x && box.y >= view.y && box.x + box.width <= view.x + view.width && box.y + box.height <= view.y + view.height,
        `label at ${x},${y} placed ${placedLabel.side} outside the view`
      );
    }
  }
  assert.ok(gridPlaced > 0, 'labels are placed in an offset view');
});

test('home map labels and hit targets: chapter labels at rest, 44px pins and badges, 48px text buttons', async () => {
  const component = await readFile(
    new URL('../packages/website/src/components/page-sections/HomeMap.astro', import.meta.url),
    'utf8'
  );
  // Edge pins: chapters and people are drawn through the clamp, and their
  // lines end where the pins are drawn; the data keeps its true coordinate.
  assert.match(component, /const mapPoint = \{ x: lonToX\(c\.data\.long\), y: latToY\(c\.data\.lat\) \};\s*const pin = clampPinToDrawing\(mapPoint\);/);
  assert.match(component, /x: pin\.x,\s*y: pin\.y,\s*mapX: mapPoint\.x,\s*mapY: mapPoint\.y,/);
  assert.match(component, /const mapPoint = \{ x: lonToX\(member\.long\), y: latToY\(member\.lat\) \};\s*const \{ x, y \} = clampPinToDrawing\(mapPoint\);/);
  assert.match(component, /const drawn = clampPinToDrawing\(\{ x: lonToX\(long\), y: latToY\(lat\) \}\);\s*nodeById\.set\(id, \{\s*x: existing\?\.x \?\? drawn\.x,\s*y: existing\?\.y \?\? drawn\.y,/);
  assert.match(component, /<circle class="gp-home-map-node-hit" cx=\{c\.x\} cy=\{c\.y\} r=\{PIN_HIT_RADIUS\} \/>/);
  assert.match(component, /const NODE_HIT_RADIUS = PIN_HIT_RADIUS;/);
  // The inset grows with the hit circle on a small map (Codex on #60): every
  // pin carries its true point, each stacks rebuild first moves edge pins in
  // by the scaled hit radius, and their lines are drawn again to meet them.
  assert.match(component, /data-map-x=\{c\.mapX\.toFixed\(3\)\}\s*data-map-y=\{c\.mapY\.toFixed\(3\)\}/);
  assert.match(component, /group\.dataset\.mapX = mapPoint\.x\.toFixed\(3\);\s*group\.dataset\.mapY = mapPoint\.y\.toFixed\(3\);/);
  const placePins = component.match(/const placePinsInsideDrawing = \(\) => \{([\s\S]*?)\n    \};\n/)?.[1] ?? '';
  assert.match(placePins, /const inset = pinHitRadius\(\);\s*const corner = stageCornerRadius\(\);/);
  const stageCorner = component.match(/const stageCornerRadius = \(\) => \{([\s\S]*?)\n    \};\n/)?.[1] ?? '';
  assert.match(stageCorner, /const clipRadius = \(Number\.parseFloat\(stage\.borderTopLeftRadius\) \|\| 0\) - \(Number\.parseFloat\(stage\.borderTopWidth\) \|\| 0\);\s*return pxToViewBox\(Math\.max\(0, clipRadius\)\);/);
  assert.match(placePins, /const widest = largestMapView\(stageAspect\(\), FULL_VIEW_BOX\);\s*const shownDrawing = \{ x: FULL_VIEW_BOX\.x, y: widest\.y, width: FULL_VIEW_BOX\.width, height: widest\.height \};/);
  assert.match(placePins, /const drawn = clampPinToDrawing\(\{ x, y \}, inset, shownDrawing, corner\);/);
  // Every circle of a pin is brought to it, not just the dot, so an owner
  // ring added after a claim follows a moved pin too (CodeRabbit on #60).
  assert.match(placePins, /pin\.querySelectorAll\(PIN_CIRCLES\)\.forEach\(\(circle\) => \{\s*if \(close\(circle, 'cx', drawn\.x\) && close\(circle, 'cy', drawn\.y\)\) return;/);
  assert.match(component, /const drawn = nodeCenter\(existing\) \?\? \{ x, y \};\s*existing\.insertBefore\(\s*makeCircle\('gp-home-map-node-owner-ring', drawn\.x, drawn\.y,/);
  assert.match(placePins, /if \(!moved\) return;\s*if \(lastThreadInputs\) renderDynamicThreads\(lastThreadInputs\.nodes, lastThreadInputs\.edges\);/);
  // What is drawn at a moved pin follows it: the selected web and card, and
  // the tooltip of the node it shows (Codex on #60).
  assert.match(placePins, /if \(selectedId\) markSelectedThreads\(selectedId\);\s*syncSelectedOverlay\(\);/);
  assert.match(placePins, /const shown = activeFocusNodeId\s*\? root\.querySelector\([^\n]*\)\s*: null;\s*if \(shown\) setFocus\(shown\);/);
  assert.match(component, /if \(!dynamicThreadsGroup\) return;\s*lastThreadInputs = \{ nodes: rawNodes, edges: rawEdges \};/);

  // § 5: "pins and badges stay at least 44px at every map size (their hit
  // circles scale with the map)".
  assert.match(component, /const POINTER_TARGET_RADIUS_PX = 22;/);
  assert.match(component, /const minTargetRadius = \(\) => pxToViewBox\(POINTER_TARGET_RADIUS_PX\);/);
  assert.match(component, /const pinHitRadius = \(\) => Math\.max\(NODE_HIT_RADIUS, minTargetRadius\(\)\);/);
  assert.match(component, /const hitRadius = Math\.max\(pinRadius, r \+ 3\.2, minViewRadius\);/);
  assert.match(component, /const badgeHitRadius = \(markerRadius: number\) => Math\.max\(markerRadius \+ pxToViewBox\(3\), minTargetRadius\(\)\);/);
  assert.match(component, /const hitRadius = badgeHitRadius\(markerRadius\);/);
  // A badge set beside its pins keeps its whole 44px target in view, not
  // just its disc, and a badge with no such side moves in (Codex on #60),
  // both clear of the stage's rounded corners; an anchor out of view keeps
  // its badge beside it (CodeRabbit on #60).
  const badgeCenter = component.match(/const badgeCenterFor = \([\s\S]*?\) => \{([\s\S]*?)\n    \};\n/)?.[1] ?? '';
  assert.match(badgeCenter, /const target = badgeHitRadius\(radius\);/);
  assert.match(badgeCenter, /if \(!circleFitsInside\(center, target, box, corner\)\) continue;/);
  assert.match(badgeCenter, /return badgeFallbackCenter\(anchor, beside, target, box, corner\);/);
  assert.doesNotMatch(badgeCenter, /clampNumber\(/);
  // The live pill and the error note are label blockers: a status render
  // lays the labels out again (Codex on #60).
  const statusRender = component.match(/const renderMapStateStatus = \(\) => \{([\s\S]*?)\n    \};\n/)?.[1] ?? '';
  assert.match(statusRender, /syncAlertBlock\(\);\s*\/\/[^\n]*\n\s*\/\/[^\n]*\n\s*scheduleChapterLabels\(\);/);
  const recomputeClusters = component.match(/const recomputeClustersNow = \(\) => \{([\s\S]*?)\n    \};\n/)?.[1] ?? '';
  assert.match(recomputeClusters, /^\s*if \(!clustersGroup \|\| !membersGroup\) return;\s*\/\/[^\n]*\n\s*placePinsInsideDrawing\(\);/);
  assert.match(recomputeClusters, /syncPinHitTargets\(\);\s*layoutChapterLabels\(\);/);
  assert.match(recomputeClusters, /const corner = stageCornerRadius\(\);/);

  // § 5: "Chapter labels at rest: Manrope 600 at 12px in --gp-fg-muted with
  // a dark halo, without the leading 'Greenpill ' ... The highest
  // featuredWeight goes first ... People never get labels at rest. Labels dim
  // while a node is selected." Phones: "No labels at rest."
  assert.match(component, /data-featured-weight=\{c\.featuredWeight\}/);
  assert.match(component, /<g class="gp-home-map-members" data-home-map-members><\/g>[\s\S]*?<g class="gp-home-map-chapter-labels" data-home-map-chapter-labels aria-hidden="true"><\/g>[\s\S]*?<g class="gp-home-map-clusters" data-home-map-clusters><\/g>/);
  assert.match(component, /\.gp-home-map-chapter-label \{\s*fill: var\(--gp-fg-muted\);\s*font-family: var\(--gp-font-body\);\s*font-weight: 600;\s*paint-order: stroke;\s*stroke: var\(--gp-green-950\);/);
  assert.match(component, /\.gp-home-map-canvas\.has-selected-node \.gp-home-map-chapter-label,\s*\.gp-home-map-canvas\.is-focused \.gp-home-map-chapter-label \{\s*opacity: 0\.35;/);
  const phoneCss = component.match(/@container \(max-width: 520px\) \{([\s\S]*?)\n  \}\n/)?.[1] ?? '';
  assert.match(phoneCss, /\.gp-home-map-chapter-labels \{\s*display: none;/);
  const layoutLabels = component.match(/const layoutChapterLabels = \(\) => \{([\s\S]*?)\n    \};\n/)?.[1] ?? '';
  assert.match(layoutLabels, /if \(mapLayout\(\) === 'phone'\) return;/);
  assert.match(layoutLabels, /\.filter\(\(pin\) => pin\.classList\.contains\('is-chapter'\)\)/);
  assert.match(layoutLabels, /\.sort\(\(a, b\) => b\.weight - a\.weight \|\| a\.name\.localeCompare\(b\.name, 'en'\)\);/);
  assert.match(layoutLabels, /const fontSize = cssPx\('--gp-label-sm', 12\) \* px;/);
  assert.match(layoutLabels, /placeMapLabels\(/);
  assert.match(layoutLabels, /\.\.\.overlapStacks\.map\(/);
  // The bounds are the map in view, 4px in from each edge.
  assert.match(layoutLabels, /\{ x: view\.x \+ 4 \* px, y: view\.y \+ 4 \* px, width: view\.width - 8 \* px, height: view\.height - 8 \* px \}/);
  // The placement box takes in the halo, so the outline never paints over a
  // bar, a pin or the dock (CodeRabbit on #60).
  assert.match(layoutLabels, /const halo = 1\.5 \* px;[\s\S]*?width: measured\.width \+ halo \* 2,\s*height: measured\.height \+ halo \* 2,/);
  // A stack says its people are "at" a chapter only when their true points
  // share its spot; pins the drawing's edge moved together are not "at" one
  // another (CodeRabbit on #60).
  assert.match(component, /type ClusterMember = \{ el: Element; key: string; center: MapPoint; truePoint: MapPoint \};/);
  assert.match(component, /out\.push\(\{ el, key, center, truePoint: mapX !== null && mapY !== null \? \{ x: mapX, y: mapY \} : center \}\);/);
  // The stack is "at" only the chapters every one of its people shares a
  // spot with; people who each share a different chapter's spot are not
  // "at" both (Codex on #60, twice).
  assert.match(component, /const sharedChapters = chapters\.filter\(\(chapter\) => members\.every\(\(member\) => sharesSpot\(member, chapter\)\)\);/);
  // Hover is drawn from the pin or badge geometry picked, never from :hover,
  // which an overlapping 44px hit circle can give to a neighbour (Codex on #60).
  // What is drawn hovered is the satellite or marker under the pointer, even
  // for a marker that stands for one person, and it follows the pointer while
  // a card is open (CodeRabbit on #60).
  assert.match(component, /const markPointerTarget = \(target: Element \| null\) => \{/);
  assert.match(component, /if \(satellite\) return \{ pin: satellite\.member\.el, mark: satellite\.el \};/);
  assert.match(component, /\? \{ pin: stack\.members\[0\]\.el, mark: stack\.marker \}\s*: \{ stack, mark: stack\.marker \};/);
  assert.match(component, /return pin \? \{ pin, mark: pin \} : \{\};/);
  assert.match(component, /const \{ pin, stack, mark \} = hoverTargetAtPointer\(event\);\s*(?:\/\/[^\n]*\n\s*)*markPointerTarget\(mark \?\? null\);\s*if \(selectedFocusTarget\) return;/);
  assert.doesNotMatch(component, /\.gp-home-map-node-link[^{]*:hover|\.gp-home-map-overlap-stack:hover|\.gp-home-map-cluster-sat:hover/);
  assert.match(component, /\.gp-home-map-cluster-sat\.is-pointer-target \.gp-home-map-cluster-sat-label,/);
  assert.match(component, /\.gp-home-map-node-link\.is-chapter\.is-pointer-target \.gp-home-map-node-halo,/);
  assert.match(component, /\.gp-home-map-overlap-stack\.is-pointer-target \.gp-home-map-overlap-disc,/);
  assert.match(component, /return sameSpot \? 'at the same spot' : 'close together';/);
  assert.match(component, /const chapterLabelText = \(name: string\) => name\.replace\(\/\^Greenpill\\s\+\/i, ''\) \|\| name;/);
  assert.match(component, /'\.gp-home-map-theme-strip',[\s\S]*?'\.gp-home-map-legend',[\s\S]*?'\.gp-home-map-end-group',[\s\S]*?'\.gp-home-map-list-drawer',/);
  // The dock and the bars move without a stacks rebuild: one layout a frame.
  assert.match(component, /scheduleChapterLabels = \(\) => \{\s*window\.cancelAnimationFrame\(chapterLabelFrame\);\s*chapterLabelFrame = window\.requestAnimationFrame\(layoutChapterLabels\);/);

  // Sizes, set once on the map's figure so the join walkthrough shares them.
  const mapRule = component.match(/\n  \.gp-home-map \{([\s\S]*?)\n  \}\n/)?.[1] ?? '';
  assert.match(mapRule, /--gp-map-target: 44px;\s*--gp-map-icon: 16px;\s*--gp-map-mark: 10px;\s*--gp-map-button: 48px;/);
  // § 5: "Every text button under 48px goes to 48px, and the contract test
  // asserts that minimum." List, Themes and Join the map are 50px; the edge
  // pills 48px; Try again, Clear and Done are the 48px Button; the card's
  // Edit this node and its form's buttons now reach 48px too.
  assert.match(component, /\.gp-home-map-join \{[\s\S]*?min-height: calc\(40px \+ var\(--gp-space-xs\) \* 2 \+ 2px\);/);
  assert.match(component, /\.gp-home-map \.gp-chip\.gp-home-map-edge-pill \{[\s\S]*?min-height: 48px;/);
  assert.match(component, /\.gp-home-map-update-trigger \{\s*min-height: var\(--gp-map-button\);/);
  assert.match(component, /\.gp-home-map-update-actions button \{\s*min-height: var\(--gp-map-button\);/);
  assert.doesNotMatch(component, /\.gp-home-map-update-trigger \{\s*min-height: (?:36|40)px;/);
  // The join walkthrough's text buttons too (Codex on #60): Find place, the
  // place results, Confirm coordinate, the review's Edit buttons, and the
  // manage-link toggle and Send. Its theme toggles are chips.
  assert.match(component, /\.gp-home-map-location-search-row button,\s*\.gp-home-map-location-results button,\s*\.gp-home-map-location-coordinate-row button \{\s*min-height: var\(--gp-map-button\);/);
  assert.match(component, /\.gp-home-map-location-results button \{\s*width: 100%;\s*min-height: var\(--gp-map-button\);/);
  // The result buttons are made by the script, so they take the component's
  // scope, or the scoped 48px rule never reaches them (CodeRabbit on #60).
  const searchResults = component.match(/const renderSearchResults = \([\s\S]*?\) => \{([\s\S]*?)\n    \};\n/)?.[1] ?? '';
  assert.match(searchResults, /applyScope\(item\);\s*applyScope\(button\);/);
  assert.match(component, /\.gp-home-map-location-coordinate-row button \{\s*min-height: var\(--gp-map-button\);/);
  assert.match(component, /\.gp-home-map-addnode-location-head button,\s*\.gp-home-map-addnode-review button \{\s*display: inline-flex;\s*align-items: center;\s*min-height: var\(--gp-map-button\);/);
  assert.match(component, /\.gp-home-map-addnode-manage-toggle \{\s*min-height: var\(--gp-map-button\);/);
  assert.match(component, /\.gp-home-map-addnode-manage-submit \{[\s\S]*?min-height: var\(--gp-map-button\);/);
  assert.match(component, /\.gp-home-map-addnode-next,[\s\S]*?\.gp-home-map-addnode-submit\s*\{[\s\S]*?min-height:\s*48px;/);
  // "Icon-only controls (zoom, close, reset) are 44 by 44px".
  // The inspector's Back and Close sit in its head (step 4), at 44 by 44;
  // the connection rows' open-profile icons went with June's rows.
  assert.match(component, /\.gp-home-map-selected-back,\s*\.gp-home-map-selected-close \{\s*width: var\(--gp-map-target\);\s*height: var\(--gp-map-target\);/);
  assert.doesNotMatch(component, /gp-home-map-selected-edge-open/);
  assert.match(component, /\.gp-home-map-addnode-close \{[\s\S]*?width: var\(--gp-map-target\);\s*height: var\(--gp-map-target\);/);
  assert.match(component, /\.gp-home-map-addnode-back \{[\s\S]*?width: var\(--gp-map-target\);\s*height: var\(--gp-map-target\);/);
  assert.doesNotMatch(component, /width: (?:34|38)px;\s*height: (?:34|38)px;/);
  // Pill links follow the chip rule: 30px under a fine pointer, 44px under a
  // coarse one and on a phone.
  assert.match(component, /\.gp-home-map-selected-link \{\s*appearance: none;\s*display: inline-flex;\s*align-items: center;\s*min-height: var\(--gp-map-chip\);/);
  assert.match(phoneCss, /\.gp-home-map-selected-link \{\s*min-height: var\(--gp-map-target\);/);
});

test('home map inspector: the dock, the sheets and the compact tooltip (map-polish-audit.md § 5)', async () => {
  // § 5: "When the node would sit under the dock, the map pans it into the
  // open area", and "The map pans the node above the sheet." The map never
  // resizes, so the view may slide under the panel, past the drawing's edge
  // there, by as much as the panel covers and the clearance more.
  const rest = { x: 0, y: 0, width: 200, height: 88 };
  const aspect = 200 / 88;
  const asked = { x: 70, y: 0, width: 200, height: 88 };
  assert.deepEqual(clampMapViewBeside(asked, aspect, 4, null), clampMapView(asked, aspect, 4));
  assert.deepEqual(clampMapViewBeside(asked, aspect, 4, { side: 'east', share: 0.3 }, 5), { x: 65, y: 0, width: 200, height: 88 });
  assert.deepEqual(clampMapViewBeside({ ...asked, x: -70 }, aspect, 4, { side: 'west', share: 0.3 }, 5), { x: -65, y: 0, width: 200, height: 88 });
  assert.deepEqual(clampMapViewBeside({ ...asked, x: 0, y: 50 }, aspect, 4, { side: 'south', share: 0.5 }, 4), { x: 0, y: 48, width: 200, height: 88 });
  // Away from the panel the drawing still ends the view.
  assert.equal(clampMapViewBeside({ ...asked, x: -10 }, aspect, 4, { side: 'east', share: 0.3 }, 5).x, 0);
  assert.equal(clampMapViewBeside({ ...asked, y: -10 }, aspect, 4, { side: 'south', share: 0.5 }, 4).y, 0);

  // A node under a dock covering a quarter of the stage moves to the open
  // part's edge, its clearance inside; one already in the open stays put.
  const panned = panPointIntoOpenArea(rest, { x: 170, y: 40 }, { side: 'east', share: 0.25 }, 5);
  assert.deepEqual(panned, { x: 25, y: 0, width: 200, height: 88 });
  assert.equal(panPointIntoOpenArea(rest, { x: 100, y: 40 }, { side: 'east', share: 0.25 }, 5), rest);
  // A phone's sheet over half the stage: the node goes above it.
  const phoneView = { x: 52, y: 0, width: 59, height: 88 };
  assert.deepEqual(panPointIntoOpenArea(phoneView, { x: 80, y: 70 }, { side: 'south', share: 0.5 }, 4), { x: 52, y: 30, width: 59, height: 88 });
  // A zoomed view brings a node from beyond its other side, inside the
  // drawing; the far north stops at the drawing's top.
  const zoomed = { x: 100, y: 20, width: 80, height: 35.2 };
  assert.equal(panPointIntoOpenArea(zoomed, { x: 60, y: 40 }, { side: 'east', share: 0.3 }, 3).x, 57);
  assert.equal(panPointIntoOpenArea({ x: 0, y: 20, width: 100, height: 44 }, { x: 50, y: 1 }, { side: 'south', share: 0.5 }, 2).y, 0);
  // Every pan leaves the node clear of the panel where the bounds allow.
  for (let x = 0; x <= 200; x += 10) {
    const view = panPointIntoOpenArea(rest, { x, y: 44 }, { side: 'east', share: 0.3 }, 5);
    assert.ok(x <= view.x + view.width * 0.7 - 5 + 1e-9, `a node at ${x} stays under the dock`);
  }

  const component = await readFile(
    new URL('../packages/website/src/components/page-sections/HomeMap.astro', import.meta.url),
    'utf8'
  );
  // § 5, the dock from the top: "TYPE · PLACE, the name in Spectral, the
  // public note, themes as tags, connections as rows ... the node's public
  // link (`Visit chapter →` for a chapter), and, for an approved steward or
  // member submission only, `Edit this node`".
  assert.match(
    component,
    /data-selected-kicker>Network node<\/p>\s*<h2 class="gp-home-map-selected-name" data-selected-name><\/h2>[\s\S]*?data-selected-note[\s\S]*?data-selected-themes[\s\S]*?data-selected-edge-list[\s\S]*?data-selected-links[\s\S]*?data-home-map-update hidden>\s*<button type="button" class="gp-home-map-update-trigger" data-update-trigger>Edit this node<\/button>/
  );
  assert.match(component, /\.gp-home-map-selected-name \{\s*margin: 0;\s*color: var\(--gp-secondary\);\s*font-family: var\(--gp-font-display\);/);
  // The body is a column whose parts keep their height, so a phone's row
  // of themes cannot shrink to nothing under a long body, and a row that
  // scrolls takes keyboard focus (axe's scrollable-region-focusable).
  assert.match(component, /\.gp-home-map-selected-body > \* \{\s*flex: none;/);
  assert.match(component, /data-selected-themes role="group" aria-label="Themes"/);
  assert.match(component, /const scrolls = !selectedThemesEl\.hidden && selectedThemesEl\.scrollWidth > selectedThemesEl\.clientWidth \+ 1;\s*if \(scrolls\) selectedThemesEl\.tabIndex = 0;\s*else selectedThemesEl\.removeAttribute\('tabindex'\);/);
  // The selected node's tooltip would repeat the inspector, so it hides.
  assert.match(component, /const shown = target !== selectedFocusTarget;\s*focusEl\.setAttribute\('aria-hidden', shown \? 'false' : 'true'\);/);
  // Labels give way to the inspector as they do to the list.
  assert.match(component, /'\.gp-home-map-list-drawer',\s*'\.gp-home-map-selected',\s*\]\.join\(', '\);/);

  // § 5: "Layout follows the container's width only; the kind of pointer
  // never picks it ... The build splits it: a width check picks the layout
  // ... and `(pointer: coarse)` keeps choosing only the input behaviour."
  assert.doesNotMatch(component, /isTouchMap/);
  assert.match(component, /const coarsePointer = \(\) => window\.matchMedia\('\(pointer: coarse\)'\)\.matches;/);
  assert.doesNotMatch(component, /getBoundingClientRect\(\)\.width <= 520/);
  // The input matters it keeps: no hover tooltips from a finger, the tap's
  // fallback, drag and pinch on touch, and "Tap" or "Click" in a stack's
  // hint. Each event says what made it, so a hybrid laptop's touchscreen
  // pans and pinches though its primary pointer is fine (Codex on #63); the
  // primary pointer answers only where there is no event.
  assert.match(component, /const isTouchEvent = \(event: Event\) => \(\s*'pointerType' in event \? \(event as PointerEvent\)\.pointerType === 'touch' : coarsePointer\(\)\s*\);/);
  assert.match(component, /if \(event\.pointerType === 'touch' \|\| \(coarsePointer\(\) && event\.pointerType !== 'mouse'\)\) return;/);
  assert.match(component, /\} else if \(event\.pointerType !== 'touch' && !coarsePointer\(\)\) \{\s*return;/);
  assert.match(component, /if \(event\.pointerType !== 'mouse' && event\.pointerType !== 'touch' && !coarsePointer\(\)\) return;/);
  assert.match(component, /if \(!isRecentTouchMapClick\(\) \|\| !eventTarget/);
  assert.match(component, /if \(isRecentTouchMapClick\(\) && nodeAtPointer\(event as MouseEvent, 44\)\) return;/);
  assert.match(component, /lastMapPointerWasTouch = event\.pointerType !== 'mouse';/);
  assert.match(component, /\$\{coarsePointer\(\) \? 'Tap' : 'Click'\} to choose one\./);
  // The layout matters read the container: the list's mode and the
  // inspector's dock or sheet.
  assert.match(component, /const modal = mapLayout\(\) === 'phone';/);
  // A resize, and an inspector that grows (the Edit form) or moves to a
  // sheet, brings the node out from under it again (Codex on #63).
  assert.match(component, /if \(selectedEl && !selectedEl\.hidden\) \{\s*panSelectedIntoView\(\);\s*syncThemesScroller\(\);/);
  assert.match(component, /new ResizeObserver\(\(\) => \{\s*if \(!selectedEl\.hidden\) panSelectedIntoView\(\);\s*\}\)\.observe\(selectedEl\);/);
  // A move by hand since the inspector's last pan becomes the view to go
  // back to: a later pan never erases it (Codex on #63).
  assert.match(component, /const untouched = viewBeforeInspector && sameView\(currentViewBox, viewBeforeInspector\.moved\);\s*const before = untouched && viewBeforeInspector\s*\? viewBeforeInspector\s*: \{ view: \{ \.\.\.currentViewBox \}, wasDefault: viewIsDefault \};/);
  // A tooltip names a point that can be seen: one under the dock or a sheet
  // gets none, and the list as a sheet inside the stage counts as one, while
  // a phone's full-page list does not (Codex on #63).
  assert.match(component, /: layout !== 'phone' && listDrawer && !listDrawer\.hidden \? listDrawer : null;/);
  assert.match(component, /anchorY >= covered\.rect\.minY && anchorY <= covered\.rect\.maxY\s*\) \{\s*focusEl\.setAttribute\('aria-hidden', 'true'\);\s*return;/);
  // Opening a node clears the hover the click left behind, so a connection
  // row's preview ends back on the selection (Codex on #63); and a pick from
  // inside the inspector keeps focus in it, mouse or keyboard, since its row
  // is replaced.
  const openNode = component.match(/const openSelected = \(member: DynamicMapNode, link: Element, viaKeyboard = false\) => \{([\s\S]*?)\n    \};\n/)?.[1] ?? '';
  assert.match(openNode, /const focusWasInInspector = !selectedEl\.hidden && selectedEl\.contains\(document\.activeElement\);/);
  assert.match(openNode, /pointerFocusTarget = null;\s*hoveredStackKey = '';/);
  assert.match(openNode, /if \(viaKeyboard \|\| fromList \|\| focusWasInInspector\) inspectorEntryControl\(\)\?\.focus\(\{ preventScroll: true \}\);/);
  // June's phone recovery reset the view on every close; the inspector puts
  // back the view it moved instead.
  assert.doesNotMatch(component, /shouldRecoverMobileView/);
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
