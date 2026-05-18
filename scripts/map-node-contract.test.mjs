import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import {
  containsPrivateMapNodeField,
  PRIVATE_MAP_NODE_FIELDS,
  saveLocalPendingNode,
  toPublicMapNode,
} from '@greenpill-network/shared/map-nodes';
import {
  assertPublicMapStatePayload,
  containsPrivateMapStateField,
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
  assert.equal(containsPrivateMapNodeField(publicNode), false);
  for (const field of PRIVATE_MAP_NODE_FIELDS) {
    assert.equal(Object.hasOwn(publicNode, field), false);
  }
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

test('local optimistic node storage stays public-safe', () => {
  const storage = new MemoryStorage();
  const node = saveLocalPendingNode(storage, {
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

test('privacy guard catches snake_case private map-node fields', () => {
  assert.equal(containsPrivateMapNodeField({ raw_note: 'private context' }), true);
  assert.equal(containsPrivateMapNodeField({ review_notes: 'steward only' }), true);
  assert.equal(containsPrivateMapNodeField({ ip_address: '127.0.0.1' }), true);
  assert.equal(containsPrivateMapNodeField({ spam_signals: { score: 10 } }), true);
  assert.equal(containsPrivateMapNodeField({ public: { label: 'ok' } }), false);
});

test('public map-state combines chapter anchors and approved submitted nodes safely', () => {
  const payload = toPublicMapStatePayload({
    generatedAt: '2026-05-17T12:00:00.000Z',
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
      themes: ['public', 'events'],
      publicNote: 'Running public-goods meetups.',
      status: 'approved',
      source: 'approved-submission',
      raw_note: 'private submission context',
      user_agent: 'node-test',
    }],
  });

  assert.equal(payload.version, 1);
  assert.equal(payload.nodes.length, 2);
  assert.equal(payload.nodes[0].type, 'chapter');
  assert.equal(payload.nodes[1].type, 'steward');
  assert.equal(payload.counts.chapterNodes, 1);
  assert.equal(payload.counts.approvedSubmittedNodes, 1);
  assert.equal(payload.counts.byTheme.public, 2);
  assert.equal(payload.edges.length, 1);
  assert.equal(payload.edges[0].source, 'generated-theme-match');
  assert.equal(containsPrivateMapStateField(payload), false);
  assert.equal(JSON.stringify(payload).includes('private@example.com'), false);
  assert.equal(JSON.stringify(payload).includes('private submission context'), false);
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
