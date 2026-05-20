import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { test } from 'node:test';
import {
  containsPrivateMapNodeField,
  EDITABLE_MAP_NODE_UPDATE_FIELDS,
  loadLocalPendingNodes,
  localPendingNodeSignature,
  PRIVATE_MAP_NODE_FIELDS,
  reconcileLocalPendingNodes,
  saveLocalPendingNode,
  toEditablePublicMapNode,
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

test('local pending nodes reconcile against approved nodes by name and coordinates', () => {
  const storage = new MemoryStorage();
  saveLocalPendingNode(storage, {
    id: 'local-approved-soon',
    name: 'Lagos Member',
    place: 'Lagos',
    lat: 6.5244,
    long: 3.3792,
    themes: ['public', 'events', 'trees', 'water'],
  });
  saveLocalPendingNode(storage, {
    id: 'local-still-pending',
    name: 'Nairobi Member',
    place: 'Nairobi',
    lat: -1.2921,
    long: 36.8219,
    themes: ['public', 'food', 'energy', 'gov'],
  });

  // Approved node carries /map/state shape (name + lat/long) and a slightly
  // nudged coordinate that still falls inside the two-decimal fingerprint.
  const result = reconcileLocalPendingNodes(storage, [
    { name: 'Lagos Member', lat: 6.5249, long: 3.3795, status: 'approved' },
  ]);

  assert.equal(result.removed.length, 1);
  assert.equal(result.removed[0].id, 'local-approved-soon');
  assert.equal(result.remaining.length, 1);
  assert.equal(result.remaining[0].id, 'local-still-pending');

  const stored = loadLocalPendingNodes(storage);
  assert.equal(stored.length, 1);
  assert.equal(stored[0].id, 'local-still-pending');
});

test('reconcile leaves pending nodes untouched when nothing matches', () => {
  const storage = new MemoryStorage();
  saveLocalPendingNode(storage, {
    id: 'local-unmatched',
    name: 'Lisbon Member',
    place: 'Lisbon',
    lat: 38.7223,
    long: -9.1393,
    themes: ['public', 'events', 'trees', 'water'],
  });

  // A distant node with the same name must not be reconciled away.
  const result = reconcileLocalPendingNodes(storage, [
    { name: 'Lisbon Member', lat: 40.0, long: -9.1393 },
  ]);

  assert.equal(result.removed.length, 0);
  assert.equal(loadLocalPendingNodes(storage).length, 1);
  // A node without enough public signal yields no signature and never matches.
  assert.equal(localPendingNodeSignature({ name: '', lat: 1, long: 2 }), '');
  assert.equal(
    localPendingNodeSignature({ name: 'A', lat: 1.239, long: -2.001 }),
    'a|1.24|-2.00'
  );
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
  assert.equal(payload.nodes.length, 1);
  assert.equal(payload.nodes[0].type, 'chapter');
  assert.equal(payload.nodes.some((node) => node.type === 'steward'), false);
  assert.equal(payload.counts.chapterNodes, 1);
  assert.equal(payload.counts.approvedSubmittedNodes, 0);
  assert.equal(payload.counts.byTheme.public, 1);
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
        themes: ['public'],
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
        themes: ['public', 'events'],
        status: 'approved',
        source: 'approved-submission',
      },
    ],
  });

  assert.equal(payload.edges.some((edge) => edge.kind === 'chapter-theme'), false);
  assert.equal(payload.nodes.some((node) => node.type === 'steward'), false);
  assert.equal(payload.edges.some((edge) => (
    edge.kind === 'member-member' &&
    [edge.from, edge.to].sort().join(':') === 'submission:member-1:submission:member-2'
  )), true);
  assert.equal(payload.edges.some((edge) => (
    edge.from.startsWith('chapter:') || edge.to.startsWith('chapter:')
  )), false);
});

test('public map-state excludes steward-only submissions from launch payloads', () => {
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

  const stewardEdges = payload.edges.filter((edge) => edge.kind === 'steward-steward');
  assert.equal(payload.nodes.some((node) => node.type === 'steward'), false);
  assert.equal(payload.counts.approvedSubmittedNodes, 0);
  assert.equal(stewardEdges.length, 0);
  assert.equal(payload.edges.some((edge) => (
    edge.from.startsWith('chapter:') || edge.to.startsWith('chapter:')
  )), false);
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
  assert.match(component, /future edit links/);
  assert.match(component, /email,\s*contactConsent: true/s);
  assert.doesNotMatch(component, /email:\s*email\s*\|\|\s*undefined/);
  assert.match(component, /<dialog class="gp-home-map-addnode-dialog"/);
  assert.match(homepage, /<Button type="button" data-home-map-open/);
  assert.doesNotMatch(component, /data-addnode-trigger/);
  assert.match(component, /showModal/);
  assert.match(component, /addDialog\?\.addEventListener\('cancel'/);
  assert.match(component, /closeAddDialogOnEscape/);
  assert.match(component, /event\.target === addDialog/);
  assert.doesNotMatch(component, /<details class="gp-home-map-addnode"/);

  // The HiFi flow is a multi-step walkthrough, not the previous raw checkbox
  // form embedded in the map controls.
  assert.match(component, /data-walkthrough-step="themes"/);
  assert.match(component, /data-walkthrough-step="identity"/);
  assert.match(component, /data-walkthrough-step="review"/);
  assert.match(component, /data-theme-choice/);
  assert.match(component, /data-location-map/);
  assert.match(component, /data-review-themes/);
  assert.doesNotMatch(component, /type="checkbox"|type='checkbox'/);

  // Email is validated client-side, and a local pending node is written ONLY
  // after the server accepts the submission (a 201 response). A rejected or
  // failed request must not leave a phantom local pending node behind.
  const addSubmitIndex = component.indexOf("addForm?.addEventListener('submit'");
  const emailValidationIndex = component.indexOf('emailInput?.checkValidity()', addSubmitIndex);
  const responseOkGuardIndex = component.indexOf('if (!response.ok)', addSubmitIndex);
  const localPendingIndex = component.indexOf('saveLocalPendingNode', addSubmitIndex);
  assert.ok(addSubmitIndex !== -1, 'home map must define the add-node submit handler');
  assert.ok(emailValidationIndex !== -1, 'add-node must validate the private email client-side');
  assert.ok(localPendingIndex !== -1, 'add-node must retain local pending behavior');
  assert.ok(
    emailValidationIndex < localPendingIndex,
    'add-node must validate the email before saving a local pending node'
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

test('home map enforces the exactly-four-theme activity rule', async () => {
  const component = await readFile(
    new URL('../packages/website/src/components/page-sections/HomeMap.astro', import.meta.url),
    'utf8'
  );

  // The form labels the rule and a live counter, and the submit handler refuses
  // anything other than four themes before it ever contacts the server.
  assert.match(component, /Choose exactly four themes/);
  assert.match(component, /data-home-map-theme-count/);
  assert.match(component, /REQUIRED_THEME_COUNT = 4/);
  assert.match(component, /themes\.length !== REQUIRED_THEME_COUNT/);

  // The exactly-four guard sits after the email check (so a local pending node
  // is still never written before the email is valid) and before the fetch.
  const submitIndex = component.indexOf("addForm?.addEventListener('submit'");
  const emailValidationIndex = component.indexOf('emailInput?.checkValidity()', submitIndex);
  const themeGuardIndex = component.indexOf('themes.length !== REQUIRED_THEME_COUNT', submitIndex);
  const fetchIndex = component.indexOf('await fetch(`${agentBaseUrl}/map-nodes`', submitIndex);
  assert.ok(emailValidationIndex !== -1 && themeGuardIndex !== -1 && fetchIndex !== -1);
  assert.ok(emailValidationIndex < themeGuardIndex, 'email validity is still checked first');
  assert.ok(themeGuardIndex < fetchIndex, 'exactly-four rule is enforced before the network call');
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

  // A successful submit re-pulls /map/state so server-generated relationship
  // edges redraw without a manual reload.
  const submitIndex = component.indexOf("addForm?.addEventListener('submit'");
  const redrawIndex = component.indexOf('void loadMapState();', submitIndex);
  assert.ok(redrawIndex !== -1, 'submit handler must refresh /map/state after a successful submit');

  // Live onboarding mode keeps already-open browsers fresh with a gentle,
  // visibility-aware poll (paused while the tab is hidden).
  assert.match(component, /intakeMode !== 'live'/);
  assert.match(component, /document\.visibilityState === 'visible'/);
  assert.match(component, /setInterval/);

  // /map/state stays the canonical public source, fetched no-store.
  assert.match(component, /\$\{agentBaseUrl\}\/map\/state`, \{ cache: 'no-store' \}/);
});

test('home map focus cards are anchored near nodes, not bottom-left panels', async () => {
  const component = await readFile(
    new URL('../packages/website/src/components/page-sections/HomeMap.astro', import.meta.url),
    'utf8'
  );

  assert.match(component, /data-focus-themes/);
  assert.match(component, /data-focus-connections/);
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

test('map-node edit flow has an operator cleanup command', async () => {
  const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  const cleanupScript = await readFile(
    new URL('../scripts/map-node-edit-flow-cleanup.ts', import.meta.url),
    'utf8'
  );

  assert.equal(
    packageJson.scripts['db:cleanup:map-node-edit-flow'],
    'bun run build:packages && bun --no-env-file --env-file-if-exists=.env.local scripts/map-node-edit-flow-cleanup.ts'
  );
  assert.equal(
    packageJson.scripts['test:map-edit:browser'],
    'bun run build:website && bun --no-env-file scripts/map-edit-browser-smoke.ts'
  );
  assert.match(cleanupScript, /cleanupEditFlow/);
  assert.match(cleanupScript, /DATABASE_URL is required/);
});
