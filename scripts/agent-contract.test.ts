import assert from 'node:assert/strict';
import { createHash, createHmac } from 'node:crypto';
import { test } from 'node:test';
import {
  createAgentApp,
} from '@greenpill-network/agent/app';
import {
  RESEND_WEBHOOK_ROUTE,
  recordResendWebhookEvent,
  signResendWebhookPayload,
} from '@greenpill-network/agent';
import {
  assertPublicImpactPayload,
  buildChapterImpactPath,
  buildPublicChapterImpactUrl,
  CHAPTER_IMPACT_ROUTE,
  MAP_NODE_EDIT_LINK_ROUTE,
  MAP_NODE_EDIT_SESSION_ROUTE,
  MAP_NODE_SUBMISSIONS_ROUTE,
  MAP_NODE_UPDATE_REQUESTS_ROUTE,
  PUBLIC_MAP_NODES_ROUTE,
} from '@greenpill-network/agent/impact';
import {
  containsPrivateMapNodeField,
} from '@greenpill-network/shared/map-nodes';
import {
  containsPrivateChapterImpactField,
} from '@greenpill-network/shared/chapter-impact';
import {
  getPublicMapState,
  PUBLIC_COUNTS_ROUTE,
  PUBLIC_MAP_STATE_ROUTE,
} from '@greenpill-network/agent/map-state';
import {
  PUBLIC_OPERATIONAL_CONTENT_ROUTE,
} from '@greenpill-network/agent/public-content';
import {
  AgentDataError,
  PublicInputError,
  MAP_NODE_EDIT_LINK_NEUTRAL_RESPONSE,
  MAP_NODE_INVALID_EDIT_LINK_ERROR,
  createMapNodeEditLinkRequest,
  createMapNodeSubmission,
  createMapNodeUpdateRequest,
  getMapNodeEditSession,
  hashMapNodeEditToken,
} from '@greenpill-network/agent/map-nodes';
import {
  containsPrivateMapStateField,
  toPublicAggregateCountsPayload,
  toPublicMapStatePayload,
} from '@greenpill-network/shared/map-state';
import {
  containsPrivateOperationalContentField,
  toPublicOperationalContentSnapshot,
} from '@greenpill-network/shared/public-content';

test('agent package exposes stable public route contracts', () => {
  assert.equal(MAP_NODE_SUBMISSIONS_ROUTE, '/map-nodes');
  assert.equal(PUBLIC_MAP_NODES_ROUTE, '/map-nodes/public');
  assert.equal(MAP_NODE_EDIT_LINK_ROUTE, '/map-nodes/:id/edit-link');
  assert.equal(MAP_NODE_EDIT_SESSION_ROUTE, '/map-nodes/edit-session');
  assert.equal(MAP_NODE_UPDATE_REQUESTS_ROUTE, '/map-nodes/:id/update-requests');
  assert.equal(PUBLIC_MAP_STATE_ROUTE, '/map/state');
  assert.equal(PUBLIC_COUNTS_ROUTE, '/public-counts');
  assert.equal(PUBLIC_OPERATIONAL_CONTENT_ROUTE, '/content/public-snapshot');
  assert.equal(CHAPTER_IMPACT_ROUTE, '/impact/chapters/:slug');
  assert.equal(RESEND_WEBHOOK_ROUTE, '/webhooks/resend');
  assert.equal(buildChapterImpactPath('greenpill nigeria'), '/impact/chapters/greenpill%20nigeria');
  assert.equal(
    buildPublicChapterImpactUrl('nigeria', 'https://agent.greenpill.network/'),
    'https://agent.greenpill.network/impact/chapters/nigeria'
  );
});

const RESEND_TEST_WEBHOOK_SECRET = `whsec_${Buffer.from('test-resend-webhook-secret').toString('base64')}`;
const RESEND_TEST_RECIPIENT_HASH_SECRET = 'test-recipient-hash-secret';

function signedResendWebhookRequest(payload, {
  secret = RESEND_TEST_WEBHOOK_SECRET,
  svixId = 'msg_test_webhook',
  timestamp = Math.floor(Date.now() / 1000).toString(),
} = {}) {
  const rawBody = JSON.stringify(payload);
  return {
    rawBody,
    headers: {
      'content-type': 'application/json',
      'svix-id': svixId,
      'svix-timestamp': timestamp,
      'svix-signature': signResendWebhookPayload({
        rawBody,
        secret,
        svixId,
        svixTimestamp: timestamp,
      }),
    },
  };
}

test('resend webhook route verifies signatures and records sanitized delivery metadata', async () => {
  const recorded = [];
  const app = createAgentApp({
    env: {
      RESEND_WEBHOOK_SECRET: RESEND_TEST_WEBHOOK_SECRET,
      RESEND_WEBHOOK_RECIPIENT_HASH_SECRET: RESEND_TEST_RECIPIENT_HASH_SECRET,
    },
    resendWebhookRepository: {
      async recordEvent(event) {
        recorded.push(event);
      },
    },
  });
  const request = signedResendWebhookRequest({
    type: 'email.bounced',
    created_at: '2026-05-20T02:00:00.000Z',
    data: {
      email_id: '1f3ab49b-c6ed-4790-b3f2-0b2550282120',
      from: 'Greenpill Network <map@mail.greenpill.network>',
      to: ['Person@Example.org'],
      subject: 'Private map-node owner message',
      bounce: {
        type: 'Permanent',
        subType: 'Suppressed',
        message: 'Recipient Person@Example.org is suppressed.',
      },
    },
  });

  const response = await app.request(RESEND_WEBHOOK_ROUTE, {
    method: 'POST',
    headers: request.headers,
    body: request.rawBody,
  });

  assert.equal(response.status, 202);
  assert.deepEqual(await response.json(), { ok: true });
  assert.equal(recorded.length, 1);
  assert.equal(recorded[0].eventType, 'email.bounced');
  assert.equal(recorded[0].providerMessageId, '1f3ab49b-c6ed-4790-b3f2-0b2550282120');
  assert.equal(recorded[0].providerStatus, 'bounced');
  assert.match(recorded[0].recipientHash, /^[a-f0-9]{64}$/);
  assert.equal(
    recorded[0].recipientHash,
    createHmac('sha256', RESEND_TEST_RECIPIENT_HASH_SECRET).update('person@example.org').digest('hex')
  );
  assert.notEqual(
    recorded[0].recipientHash,
    createHash('sha256').update('person@example.org').digest('hex')
  );
  assert.equal(recorded[0].reason, 'permanent: suppressed');
  assert.equal(recorded[0].metadata.bounceType, 'permanent');
  assert.equal(recorded[0].metadata.bounceSubType, 'suppressed');
  assert.doesNotMatch(JSON.stringify(recorded[0]), /Person@Example\.org/i);
  assert.doesNotMatch(JSON.stringify(recorded[0]), /Private map-node owner message/);
  assert.doesNotMatch(JSON.stringify(recorded[0]), /map@mail\.greenpill\.network/);
});

test('resend webhook route stores only safe provider reason codes', async () => {
  const recorded = [];
  const app = createAgentApp({
    env: {
      RESEND_WEBHOOK_SECRET: RESEND_TEST_WEBHOOK_SECRET,
      RESEND_WEBHOOK_RECIPIENT_HASH_SECRET: RESEND_TEST_RECIPIENT_HASH_SECRET,
    },
    resendWebhookRepository: {
      async recordEvent(event) {
        recorded.push(event);
      },
    },
  });
  const request = signedResendWebhookRequest({
    type: 'email.failed',
    created_at: '2026-05-20T02:00:00.000Z',
    data: {
      email_id: '1f3ab49b-c6ed-4790-b3f2-0b2550282120',
      to: ['Person@Example.org'],
      failed: { reason: 'Mailbox rejected this message' },
    },
  });

  const response = await app.request(RESEND_WEBHOOK_ROUTE, {
    method: 'POST',
    headers: request.headers,
    body: request.rawBody,
  });

  assert.equal(response.status, 202);
  assert.equal(recorded[0].reason, 'provider_diagnostic');
  assert.equal(recorded[0].metadata.reason, 'provider_diagnostic');
  assert.doesNotMatch(JSON.stringify(recorded[0]), /Person@Example\.org/i);
  assert.doesNotMatch(JSON.stringify(recorded[0]), /Mailbox rejected this message/i);

  const safeRequest = signedResendWebhookRequest({
    type: 'email.failed',
    created_at: '2026-05-20T02:01:00.000Z',
    data: {
      email_id: '2f3ab49b-c6ed-4790-b3f2-0b2550282120',
      to: ['Person@Example.org'],
      failed: { reason: 'reached_daily_quota' },
    },
  }, {
    svixId: 'msg_test_safe_reason',
  });

  const safeResponse = await app.request(RESEND_WEBHOOK_ROUTE, {
    method: 'POST',
    headers: safeRequest.headers,
    body: safeRequest.rawBody,
  });

  assert.equal(safeResponse.status, 202);
  assert.equal(recorded[1].reason, 'reached_daily_quota');
  assert.equal(recorded[1].metadata.reason, 'reached_daily_quota');
});

test('resend webhook route rejects invalid signatures before persistence', async () => {
  const recorded = [];
  const app = createAgentApp({
    env: {
      RESEND_WEBHOOK_SECRET: RESEND_TEST_WEBHOOK_SECRET,
      RESEND_WEBHOOK_RECIPIENT_HASH_SECRET: RESEND_TEST_RECIPIENT_HASH_SECRET,
    },
    resendWebhookRepository: {
      async recordEvent(event) {
        recorded.push(event);
      },
    },
  });
  const request = signedResendWebhookRequest({
    type: 'email.failed',
    created_at: '2026-05-20T02:00:00.000Z',
    data: {
      email_id: '1f3ab49b-c6ed-4790-b3f2-0b2550282120',
      to: ['person@example.org'],
      failed: { reason: 'reached_daily_quota' },
    },
  });

  const response = await app.request(RESEND_WEBHOOK_ROUTE, {
    method: 'POST',
    headers: {
      ...request.headers,
      'svix-signature': 'v1,invalid',
    },
    body: request.rawBody,
  });

  assert.equal(response.status, 400);
  assert.equal((await response.json()).error.code, 'invalid_webhook_signature');
  assert.deepEqual(recorded, []);
});

function createFakeResendWebhookSql() {
  const statements = [];
  const sql = async (strings, ...values) => {
    const text = strings.join('?').replace(/\s+/g, ' ').trim();
    statements.push({ text, values });
    if (text.includes('insert into intake.email_provider_events')) {
      return [{ id: '33333333-3333-4333-8333-333333333333', replayCount: 0 }];
    }
    return [];
  };
  sql.json = (value) => value;
  return { sql, statements };
}

test('resend webhook persistence links provider message ids without raw recipient storage', async () => {
  const { sql, statements } = createFakeResendWebhookSql();

  const result = await recordResendWebhookEvent(sql, {
    providerEventId: 'msg_test_event',
    providerMessageId: '1f3ab49b-c6ed-4790-b3f2-0b2550282120',
    eventType: 'email.failed',
    eventCreatedAt: '2026-05-20T02:00:00.000Z',
    recipientHash: 'a'.repeat(64),
    reason: 'reached_daily_quota',
    metadata: {
      source: 'resend-webhook',
      toCount: 1,
      reason: 'reached_daily_quota',
    },
    providerStatus: 'failed',
  });

  assert.equal(result.id, '33333333-3333-4333-8333-333333333333');
  const insert = statements.find((statement) => statement.text.includes('insert into intake.email_provider_events'));
  assert.ok(insert);
  assert.equal(insert.values.includes('1f3ab49b-c6ed-4790-b3f2-0b2550282120'), true);
  assert.equal(insert.values.includes('a'.repeat(64)), true);
  assert.equal(JSON.stringify(insert.values).includes('person@example.org'), false);
  const update = statements.find((statement) => statement.text.includes('update intake.map_node_edit_tokens'));
  assert.ok(update);
  assert.equal(update.values.includes('failed'), true);
  assert.equal(update.values.includes('reached_daily_quota'), true);
  assert.match(update.text, /case provider_status/);
});

test('agent package exposes a Hono app with data-backed public routes', async () => {
  const app = createAgentApp({
    checkDatabase: async () => ({
      configured: true,
      connected: true,
      status: 'ok',
    }),
    impactRepository: {
      async getChapterImpact(chapterSlug) {
        return {
          version: 1,
          chapterSlug,
          chapterName: 'Nigeria',
          generatedAt: '2026-05-16T18:00:00.000Z',
          sourceStatus: [
            { source: 'karma', configured: false, status: 'missing' },
            { source: 'green-goods', configured: true, status: 'ok' },
          ],
          summary: {
            milestoneCount: 0,
            updateCount: 0,
            grantCount: 0,
            gardenMemberCount: 2,
            actionCount: 3,
            assessmentCount: 1,
            hypercertCount: 1,
            proofLinkCount: 0,
          },
          karma: null,
          greenGoods: {
            garden: {
              address: '0x35722eedf3f7566a23fa871f0a04267aee78e0db',
              chainId: 42161,
              name: 'Greenpill Nigeria',
              location: 'Nigeria',
              gapProjectUID: '',
              roleCounts: {
                gardeners: 2,
                operators: 1,
                evaluators: 0,
              },
              memberCount: 2,
              url: '',
            },
            activity: {
              actionCount: 3,
              assessmentCount: 1,
              hypercertCount: 1,
            },
          },
          proofLinks: [],
          cache: {
            status: 'fresh',
            syncedAt: '2026-05-16T18:00:00.000Z',
            staleAfter: '2026-05-17T00:00:00.000Z',
          },
        };
      },
    },
    mapNodeRepository: {
      async createSubmission(input) {
        return {
          id: 'node-1',
          name: input.name,
          place: input.place,
          city: 'Oakland',
          region: 'California',
          country: 'United States',
          lat: Number(input.lat),
          long: Number(input.long),
          role: 'chapter organizer',
          themes: ['local-regeneration'],
          publicNote: 'Looking for local collaborators.',
          status: 'pending',
          source: 'submitted-pending',
          createdAt: '2026-05-16T18:00:00.000Z',
        };
      },
      async listPublic() {
        return [{
          id: 'node-approved-1',
          name: 'Approved Member',
          place: 'Lisbon',
          city: 'Lisbon',
          region: '',
          country: 'Portugal',
          lat: 38.7223,
          long: -9.1393,
          role: 'builder',
          themes: ['knowledge-commons'],
          publicNote: 'Running public-goods meetups.',
          status: 'approved',
          source: 'approved-submission',
        }];
      },
    },
    mapStateRepository: {
      async getMapState() {
        return toPublicMapStatePayload({
          generatedAt: '2026-05-17T12:00:00.000Z',
          chapterLocations: [{
            id: 'nigeria',
            name: 'Nigeria',
            lat: 9.082,
            long: 8.6753,
            link: '/chapters/nigeria',
            status: 'active',
            themes: ['public'],
            raw_note: 'private chapter context',
          }],
          publicMapNodes: [{
            id: 'node-approved-1',
            name: 'Approved Member',
            place: 'Lisbon',
            city: 'Lisbon',
            region: '',
            country: 'Portugal',
            lat: 38.7223,
            long: -9.1393,
            role: 'member',
            themes: ['public'],
            publicNote: 'Running public-goods meetups.',
            status: 'approved',
            source: 'approved-submission',
          }],
        });
      },
      async getPublicCounts() {
        return toPublicAggregateCountsPayload({
          generatedAt: '2026-05-17T12:00:00.000Z',
          chapters: { value: 1, status: 'ok', source: 'map-state' },
          members: { status: 'not_configured', source: 'private-admin-boundary' },
        });
      },
    },
    publicContentRepository: {
      async getSnapshot() {
        return toPublicOperationalContentSnapshot({
          generatedAt: '2026-05-19T18:00:00.000Z',
          themes: [{
            slug: 'public',
            name: 'Public Goods',
            summary: 'Public goods coordination.',
            sortOrder: 1,
          }],
          people: [{
            slug: 'afo',
            displayName: 'Afo',
            role: 'Steward',
          }],
          chapters: [{
            slug: 'nigeria',
            name: 'Nigeria',
            city: 'Awka',
            country: 'Nigeria',
            region: 'africa',
            status: 'active',
            summary: 'Greenpill Nigeria chapter.',
            lat: 9.082,
            long: 8.6753,
            themeSlugs: ['public'],
            impactSources: {
              impactEnabled: true,
              karmaProjectSlug: 'greenpill-nigeria',
            },
          }],
          guilds: [{
            slug: 'dev-guild',
            name: 'Dev Guild',
            type: 'guild',
            status: 'active',
          }],
          projects: [{
            slug: 'greenpill-v2-website',
            name: 'Greenpill V2 Website',
            status: 'active',
            guild: 'dev-guild',
          }],
        });
      },
    },
  });

  const health = await app.request('/health');
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), {
    ok: true,
    service: 'network-agent',
  });

  const ready = await app.request('/ready');
  assert.equal(ready.status, 200);
  assert.equal((await ready.json()).database.status, 'ok');

  const impact = await app.request('/impact/chapters/nigeria');
  assert.equal(impact.status, 200);
  const impactPayload = await impact.json();
  assert.equal(impactPayload.chapterSlug, 'nigeria');
  assert.equal(impactPayload.cache.status, 'fresh');
  assert.equal(Object.hasOwn(impactPayload, 'expectedCacheTable'), false);
  assert.equal(containsPrivateChapterImpactField(impactPayload), false);

  const submission = await app.request('/map-nodes', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': '127.0.0.1',
      'user-agent': 'node-test',
    },
    body: JSON.stringify({
      name: 'Afo',
      place: 'Oakland',
      lat: 37.8044,
      long: -122.2712,
      email: 'private@example.com',
      rawNote: 'steward-only context',
    }),
  });
  assert.equal(submission.status, 201);
  const submissionPayload = await submission.json();
  assert.equal(submissionPayload.node.status, 'pending');
  assert.equal(containsPrivateMapNodeField(submissionPayload), false);

  const publicNodes = await app.request('/map-nodes/public');
  assert.equal(publicNodes.status, 200);
  const publicNodesPayload = await publicNodes.json();
  assert.equal(publicNodesPayload.nodes.length, 1);
  assert.equal(publicNodesPayload.nodes[0].status, 'approved');
  assert.equal(containsPrivateMapNodeField(publicNodesPayload), false);

  const mapState = await app.request('/map/state');
  assert.equal(mapState.status, 200);
  assert.equal(mapState.headers.get('cache-control'), 'no-store, max-age=0');
  const mapStatePayload = await mapState.json();
  assert.equal(mapStatePayload.intakeMode, 'moderated');
  assert.equal(mapStatePayload.counts.chapterNodes, 1);
  assert.equal(mapStatePayload.counts.approvedSubmittedNodes, 1);
  assert.equal(mapStatePayload.edges.length, 1);
  assert.equal(containsPrivateMapStateField(mapStatePayload), false);

  const counts = await app.request('/public-counts');
  assert.equal(counts.status, 200);
  const countsPayload = await counts.json();
  const countsById = Object.fromEntries(countsPayload.counts.map((count) => [count.id, count]));
  assert.equal(countsById.chapters.value, 1);
  assert.equal(countsById.members.status, 'not_configured');
  assert.equal(containsPrivateMapStateField(countsPayload), false);

  const publicContent = await app.request('/content/public-snapshot');
  assert.equal(publicContent.status, 200);
  const publicContentPayload = await publicContent.json();
  assert.equal(publicContentPayload.chapters.length, 1);
  assert.equal(publicContentPayload.locations[0].id, 'nigeria');
  assert.equal(publicContentPayload.impactSourceBindings.chapters[0].chapterSlug, 'nigeria');
  assert.equal(containsPrivateOperationalContentField(publicContentPayload), false);

  const corsMapState = await app.request('/map/state', {
    headers: {
      origin: 'https://greenpill.network',
    },
  });
  assert.equal(corsMapState.headers.get('access-control-allow-origin'), 'https://greenpill.network');

  const blockedOrigin = await app.request('/map/state', {
    headers: {
      origin: 'https://example.com',
    },
  });
  assert.equal(blockedOrigin.headers.get('access-control-allow-origin'), null);

  const preflight = await app.request('/map-nodes', {
    method: 'OPTIONS',
    headers: {
      origin: 'https://greenpill.network',
      'access-control-request-method': 'POST',
      'access-control-request-headers': 'content-type',
    },
  });
  assert.equal(preflight.headers.get('access-control-allow-origin'), 'https://greenpill.network');
  assert.match(preflight.headers.get('access-control-allow-methods') ?? '', /POST/);
});

test('POST /map-nodes requires a valid owner email before creating a submission', async () => {
  let createCalls = 0;
  const app = createAgentApp({
    mapNodeRepository: {
      async createSubmission(input) {
        createCalls += 1;
        return {
          id: 'node-1',
          name: input.name,
          place: input.place,
          city: '',
          region: '',
          country: '',
          lat: Number(input.lat),
          long: Number(input.long),
          role: 'member',
          themes: [],
          publicNote: '',
          status: 'pending',
          source: 'submitted-pending',
          createdAt: '2026-05-19T18:00:00.000Z',
        };
      },
      async listPublic() {
        return [];
      },
    },
  });

  const missingEmail = await app.request('/map-nodes', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      name: 'Member',
      place: 'Lisbon',
      lat: 38.7223,
      long: -9.1393,
    }),
  });
  assert.equal(missingEmail.status, 400);
  assert.equal((await missingEmail.json()).error.code, 'invalid_email');

  const invalidEmail = await app.request('/map-nodes', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      name: 'Member',
      place: 'Lisbon',
      lat: 38.7223,
      long: -9.1393,
      email: 'not-an-email',
    }),
  });
  assert.equal(invalidEmail.status, 400);
  assert.equal((await invalidEmail.json()).error.code, 'invalid_email');
  assert.equal(createCalls, 0);

  const validEmail = await app.request('/map-nodes', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      name: 'Member',
      place: 'Lisbon',
      lat: 38.7223,
      long: -9.1393,
      email: 'person@example.org',
    }),
  });
  assert.equal(validEmail.status, 201);
  assert.equal(createCalls, 1);
  assert.equal(containsPrivateMapNodeField(await validEmail.json()), false);
});

test('edit-link route returns the same neutral response for valid public requests', async () => {
  const calls = [];
  const reportedFailures = [];
  const app = createAgentApp({
    reportEditLinkError(event) {
      reportedFailures.push(event);
    },
    mapNodeRepository: {
      async createSubmission() {
        throw new Error('not used');
      },
      async listPublic() {
        return [];
      },
      async requestEditLink(nodeId, email, requestMeta) {
        calls.push({ nodeId, email, requestMeta });
        if (nodeId === 'provider-failure') {
          throw new Error('resend failed');
        }
        return MAP_NODE_EDIT_LINK_NEUTRAL_RESPONSE;
      },
    },
  });

  for (const nodeId of [
    'matching-node',
    'missing-node',
    'ownerless-node',
    'cooldown-limited',
    'provider-failure',
  ]) {
    const response = await app.request(`/map-nodes/${nodeId}/edit-link`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-forwarded-for': '203.0.113.10',
      },
      body: JSON.stringify({ email: 'Person@Example.org' }),
    });
    assert.equal(response.status, 202);
    assert.deepEqual(await response.json(), MAP_NODE_EDIT_LINK_NEUTRAL_RESPONSE);
  }

  const invalidEmail = await app.request('/map-nodes/node-1/edit-link', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'not-an-email' }),
  });
  assert.equal(invalidEmail.status, 400);
  assert.equal((await invalidEmail.json()).error.code, 'invalid_email');
  assert.equal(calls[0].email, 'person@example.org');
  assert.equal(calls[0].requestMeta.rateLimitKey, '203.0.113.10');
  assert.deepEqual(reportedFailures, [{
    code: 'map_node_edit_link_request_failed',
    route: '/map-nodes/:id/edit-link',
    errorName: 'Error',
  }]);
  assert.equal(JSON.stringify(reportedFailures).includes('Person@Example.org'), false);
  assert.equal(JSON.stringify(reportedFailures).includes('provider-failure'), false);
  assert.equal(JSON.stringify(reportedFailures).includes('resend failed'), false);
});

test('edit-session and update-request routes expose generic token semantics', async () => {
  const validNode = {
    id: '11111111-1111-4111-8111-111111111111',
    display_name: 'Approved Member',
    place_name: 'Lisbon Hub',
    city: 'Lisbon',
    region: '',
    country: 'Portugal',
    latitude: 38.7223,
    longitude: -9.1393,
    themes: ['public'],
    public_note: 'Running meetups.',
  };
  const app = createAgentApp({
    mapNodeRepository: {
      async createSubmission() {
        throw new Error('not used');
      },
      async listPublic() {
        return [];
      },
      async getEditSession(token) {
        if (token !== 'valid-token') {
          throw new PublicInputError(
            MAP_NODE_INVALID_EDIT_LINK_ERROR.error.code,
            MAP_NODE_INVALID_EDIT_LINK_ERROR.error.message
          );
        }
        return validNode;
      },
      async createUpdateRequest(nodeId, input) {
        if (input.token !== 'valid-token') {
          throw new PublicInputError(
            MAP_NODE_INVALID_EDIT_LINK_ERROR.error.code,
            MAP_NODE_INVALID_EDIT_LINK_ERROR.error.message
          );
        }
        assert.equal(nodeId, validNode.id);
        return { id: 'update-request-1', status: 'pending' };
      },
    },
  });

  const session = await app.request('/map-nodes/edit-session', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ token: 'valid-token' }),
  });
  assert.equal(session.status, 200);
  const sessionPayload = await session.json();
  assert.deepEqual(sessionPayload.node, validNode);
  assert.equal(Object.hasOwn(sessionPayload.node, 'role'), false);
  assert.equal(containsPrivateMapNodeField(sessionPayload), false);

  const invalidSession = await app.request('/map-nodes/edit-session', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ token: 'expired-token' }),
  });
  assert.equal(invalidSession.status, 400);
  assert.deepEqual(await invalidSession.json(), MAP_NODE_INVALID_EDIT_LINK_ERROR);

  const update = await app.request(`/map-nodes/${validNode.id}/update-requests`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      token: 'valid-token',
      display_name: 'Approved Member Updated',
    }),
  });
  assert.equal(update.status, 201);
  assert.deepEqual(await update.json(), {
    updateRequest: { id: 'update-request-1', status: 'pending' },
  });

  const invalidUpdate = await app.request(`/map-nodes/${validNode.id}/update-requests`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ token: 'consumed-token', display_name: 'Ignored' }),
  });
  assert.equal(invalidUpdate.status, 400);
  assert.deepEqual(await invalidUpdate.json(), MAP_NODE_INVALID_EDIT_LINK_ERROR);
});

function createFakeSubmissionSql({ liveOnboardingEnabled }) {
  const statements = [];
  const tx = async (strings, ...values) => {
    const text = strings.join('?').replace(/\s+/g, ' ').trim();
    statements.push({ text, values });

    if (text.includes('from intake.map_node_intake_settings')) {
      return [{ liveOnboardingEnabled }];
    }

    if (text.includes('insert into intake.map_node_submissions')) {
      return [{
        id: liveOnboardingEnabled ? 'node-live' : 'node-pending',
        status: liveOnboardingEnabled ? 'approved' : 'pending',
        displayName: 'Session Member',
        placeName: 'Oakland',
        city: 'Oakland',
        region: 'California',
        country: 'United States',
        lat: 37.8044,
        long: -122.2712,
        role: 'member',
        themes: ['public', 'events'],
        publicNote: 'Joining during onboarding.',
        createdAt: '2026-05-19T18:00:00.000Z',
        approvedAt: liveOnboardingEnabled ? '2026-05-19T18:00:00.000Z' : null,
      }];
    }

    return [];
  };

  tx.begin = async (callback) => callback(tx);
  return { sql: tx, statements };
}

test('map-node submissions stay pending unless live onboarding is enabled', async () => {
  const { sql, statements } = createFakeSubmissionSql({ liveOnboardingEnabled: false });
  const node = await createMapNodeSubmission(sql, {
    name: 'Session Member',
    place: 'Oakland',
    lat: 37.8044,
    long: -122.2712,
    themes: ['public', 'events'],
    email: 'private@example.com',
  });

  assert.equal(node.status, 'pending');
  assert.equal(node.source, 'submitted-pending');
  assert.equal(containsPrivateMapNodeField(node), false);
  assert.equal(
    statements.some((statement) => statement.text.includes('insert into intake.map_node_reviews')),
    false
  );
});

test('map-node steward role can only be set by an allowlisted owner email', async () => {
  const regular = createFakeSubmissionSql({ liveOnboardingEnabled: false });
  await createMapNodeSubmission(regular.sql, {
    name: 'Public Claimed Steward',
    place: 'Oakland',
    lat: 37.8044,
    long: -122.2712,
    role: 'chapter steward',
    email: 'person@example.org',
  });

  const regularInsert = regular.statements.find((statement) => (
    statement.text.includes('insert into intake.map_node_submissions')
  ));
  assert.ok(regularInsert);
  assert.equal(regularInsert.values.includes('chapter steward'), false);
  assert.equal(regularInsert.values.includes('member'), true);

  const steward = createFakeSubmissionSql({ liveOnboardingEnabled: false });
  await createMapNodeSubmission(steward.sql, {
    name: 'Allowlisted Steward',
    place: 'Lagos',
    lat: 6.5244,
    long: 3.3792,
    role: 'member',
    email: 'Steward@Example.org',
  }, {}, {
    env: {
      MAP_NODE_STEWARD_EMAIL_ALLOWLIST: 'steward@example.org, other@example.org',
    },
  });

  const stewardInsert = steward.statements.find((statement) => (
    statement.text.includes('insert into intake.map_node_submissions')
  ));
  assert.ok(stewardInsert);
  assert.equal(stewardInsert.values.includes('steward'), true);
});

test('live onboarding auto-approves submissions and appends private audit row', async () => {
  const { sql, statements } = createFakeSubmissionSql({ liveOnboardingEnabled: true });
  const node = await createMapNodeSubmission(sql, {
    name: 'Session Member',
    place: 'Oakland',
    lat: 37.8044,
    long: -122.2712,
    role: 'member',
    themes: ['public', 'events'],
    publicNote: 'Joining during onboarding.',
    email: 'private@example.com',
  });

  assert.equal(node.status, 'approved');
  assert.equal(node.source, 'approved-submission');
  assert.equal(containsPrivateMapNodeField(node), false);
  assert.equal(
    statements.some((statement) => (
      statement.text.includes('insert into intake.map_node_reviews') &&
      statement.text.includes('system:live-onboarding')
    )),
    true
  );
});

function createFakeEditSessionSql(row) {
  const statements = [];
  const sql = async (strings, ...values) => {
    const text = strings.join('?').replace(/\s+/g, ' ').trim();
    statements.push({ text, values });
    if (text.includes('from intake.map_node_edit_tokens')) {
      return row ? [row] : [];
    }
    return [];
  };
  return { sql, statements };
}

test('edit-session validation does not consume a token and stays editable-field-only', async () => {
  const { sql, statements } = createFakeEditSessionSql({
    id: '11111111-1111-4111-8111-111111111111',
    displayName: 'Approved Member',
    placeName: 'Lisbon Hub',
    city: 'Lisbon',
    region: '',
    country: 'Portugal',
    lat: 38.7223,
    long: -9.1393,
    themes: ['public'],
    publicNote: 'Running meetups.',
    role: 'steward',
    token_hash: 'private',
  });

  const node = await getMapNodeEditSession(sql, 'valid-token');

  assert.deepEqual(Object.keys(node), [
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
  assert.equal(containsPrivateMapNodeField(node), false);
  assert.equal(statements.some((statement) => statement.text.includes('set consumed_at')), false);
});

test('invalid, expired, consumed, or unknown edit tokens share the generic error', async () => {
  const { sql } = createFakeEditSessionSql(null);

  await assert.rejects(
    () => getMapNodeEditSession(sql, 'unknown-token'),
    (error) => (
      error instanceof PublicInputError &&
      error.code === MAP_NODE_INVALID_EDIT_LINK_ERROR.error.code &&
      error.message === MAP_NODE_INVALID_EDIT_LINK_ERROR.error.message
    )
  );

  const nodeId = '11111111-1111-4111-8111-111111111111';
  const { sql: updateSql, statements } = createFakeUpdateRequestSql();
  await assert.rejects(
    () => createMapNodeUpdateRequest(updateSql, nodeId, {
      token: 'unknown-token',
      role: 'steward',
    }),
    (error) => (
      error instanceof PublicInputError &&
      error.code === MAP_NODE_INVALID_EDIT_LINK_ERROR.error.code &&
      error.message === MAP_NODE_INVALID_EDIT_LINK_ERROR.error.message
    )
  );
  assert.equal(
    statements.some((statement) => statement.text.includes('from intake.map_node_edit_tokens')),
    true
  );
  assert.equal(
    statements.some((statement) => statement.text.includes('insert into intake.map_node_update_requests')),
    false
  );
});

function createFakeUpdateRequestSql({
  tokenRow,
  existingPending = false,
  consumeToken = true,
}: {
  tokenRow?: any;
  existingPending?: boolean;
  consumeToken?: boolean;
} = {}) {
  const statements = [];
  const tx = async (strings, ...values) => {
    const text = strings.join('?').replace(/\s+/g, ' ').trim();
    statements.push({ text, values });

    if (text.includes('from intake.map_node_edit_tokens')) {
      return tokenRow ? [tokenRow] : [];
    }
    if (text.includes('from intake.map_node_update_requests')) {
      return existingPending ? [{ id: 'existing-pending' }] : [];
    }
    if (text.includes('insert into intake.map_node_update_requests')) {
      return [{ id: 'update-request-1', status: 'pending' }];
    }
    if (text.includes('update intake.map_node_edit_tokens')) {
      return consumeToken ? [{ id: tokenRow?.tokenId ?? 'token-1' }] : [];
    }
    return [];
  };
  tx.json = (value) => value;
  tx.begin = async (callback) => callback(tx);
  return { sql: tx, statements };
}

test('creating an update request consumes the token only after the pending request is written', async () => {
  const nodeId = '11111111-1111-4111-8111-111111111111';
  const { sql, statements } = createFakeUpdateRequestSql({
    tokenRow: {
      tokenId: '22222222-2222-4222-8222-222222222222',
      normalizedEmail: 'person@example.org',
      submissionId: nodeId,
      displayName: 'Approved Member',
      placeName: 'Lisbon Hub',
      city: 'Lisbon',
      region: '',
      country: 'Portugal',
      lat: 38.7223,
      long: -9.1393,
      themes: ['public'],
      publicNote: 'Running meetups.',
      currentSubmissionUpdatedAt: '2026-05-19T18:00:00.000Z',
    },
  });

  const updateRequest = await createMapNodeUpdateRequest(sql, nodeId, {
    token: 'valid-token',
    display_name: 'Approved Member Updated',
    latitude: 38.73,
    longitude: -9.14,
    themes: ['public', 'events'],
    public_note: 'Updated note.',
  }, {
    ipAddress: '203.0.113.10',
    userAgent: 'node-test',
    rateLimitKey: '203.0.113.10',
  });

  assert.deepEqual(updateRequest, { id: 'update-request-1', status: 'pending' });
  const insertIndex = statements.findIndex((statement) => statement.text.includes('insert into intake.map_node_update_requests'));
  const consumeIndex = statements.findIndex((statement) => statement.text.includes('update intake.map_node_edit_tokens'));
  assert.equal(insertIndex > -1, true);
  assert.equal(consumeIndex > insertIndex, true);
  assert.equal(statements.some((statement) => statement.text.includes('map_node_intake_settings')), false);
  assert.equal(statements.some((statement) => statement.text.includes('proposed_role')), false);
});

test('owner update requests validate the token before rejecting role and type changes', async () => {
  const nodeId = '11111111-1111-4111-8111-111111111111';
  const { sql, statements } = createFakeUpdateRequestSql({
    tokenRow: {
      tokenId: '22222222-2222-4222-8222-222222222222',
      normalizedEmail: 'person@example.org',
      submissionId: nodeId,
    },
  });

  await assert.rejects(
    () => createMapNodeUpdateRequest(sql, nodeId, {
      token: 'valid-token',
      display_name: 'Approved Member Updated',
      role: 'steward',
    }),
    (error) => error instanceof PublicInputError && error.code === 'unsupported_update_field'
  );

  assert.equal(
    statements.some((statement) => statement.text.includes('from intake.map_node_edit_tokens')),
    true
  );
  assert.equal(
    statements.some((statement) => statement.text.includes('insert into intake.map_node_update_requests')),
    false
  );
  assert.equal(
    statements.some((statement) => statement.text.includes('update intake.map_node_edit_tokens')),
    false
  );
});

test('pending update conflicts do not consume the edit token', async () => {
  const nodeId = '11111111-1111-4111-8111-111111111111';
  const { sql, statements } = createFakeUpdateRequestSql({
    existingPending: true,
    tokenRow: {
      tokenId: '22222222-2222-4222-8222-222222222222',
      normalizedEmail: 'person@example.org',
      submissionId: nodeId,
      displayName: 'Approved Member',
      placeName: 'Lisbon Hub',
      city: 'Lisbon',
      region: '',
      country: 'Portugal',
      lat: 38.7223,
      long: -9.1393,
      themes: ['public'],
      publicNote: 'Running meetups.',
      currentSubmissionUpdatedAt: '2026-05-19T18:00:00.000Z',
    },
  });

  await assert.rejects(
    () => createMapNodeUpdateRequest(sql, nodeId, {
      token: 'valid-token',
      display_name: 'Approved Member Updated',
    }),
    (error) => error instanceof PublicInputError && error.code === 'pending_update_exists'
  );

  assert.equal(
    statements.some((statement) => statement.text.includes('update intake.map_node_edit_tokens')),
    false
  );
});

function createFakeEditLinkSql({ match = true, cooldown = false, ipCount = 0, emailCount = 0 } = {}) {
  const statements = [];
  const submissionId = '11111111-1111-4111-8111-111111111111';
  const tx = async (strings, ...values) => {
    const text = strings.join('?').replace(/\s+/g, ' ').trim();
    statements.push({ text, values });

    if (text.includes('created_at >= now() - interval') && text.includes('limit 1')) {
      return cooldown ? [{ id: 'recent-attempt' }] : [];
    }
    if (text.includes('count(*)::int as count') && text.includes('rate_limit_key')) {
      return [{ count: ipCount }];
    }
    if (text.includes('count(*)::int as count') && text.includes('normalized_email')) {
      return [{ count: emailCount }];
    }
    if (text.includes('from intake.map_node_submissions')) {
      return match ? [{
        id: submissionId,
        displayName: 'Approved Member',
        placeName: 'Lisbon Hub',
        city: 'Lisbon',
        region: '',
        country: 'Portugal',
        lat: 38.7223,
        long: -9.1393,
        themes: ['public'],
        publicNote: 'Running meetups.',
      }] : [];
    }
    if (text.includes('insert into intake.map_node_edit_tokens')) {
      return [{ id: '22222222-2222-4222-8222-222222222222' }];
    }
    if (text.includes('update intake.map_node_edit_tokens')) {
      return [];
    }
    return [];
  };
  tx.json = (value) => value;
  tx.begin = async (callback) => callback(tx);
  return { sql: tx, statements, submissionId };
}

test('edit-link requests store token hashes only and preserve neutral provider failure behavior', async () => {
  let resendCalls = 0;
  const { sql, statements, submissionId } = createFakeEditLinkSql();

  const response = await createMapNodeEditLinkRequest(sql, `submission:${submissionId}`, 'Person@Example.org', {
    ipAddress: '203.0.113.10',
    userAgent: 'node-test',
    rateLimitKey: '203.0.113.10',
  }, {
    env: {
      RESEND_API_KEY: 'resend-secret',
      MAP_NODE_EMAIL_FROM: 'Greenpill Network <map@mail.greenpill.network>',
      MAP_NODE_EMAIL_REPLY_TO: 'Greenpill Network <map@mail.greenpill.network>',
      MAP_NODE_EDIT_BASE_URL: 'https://greenpill.network/map/edit',
    },
    fetchImpl: async (url, options) => {
      resendCalls += 1;
      assert.equal(url, 'https://api.resend.com/emails');
      const payload = JSON.parse(options.body);
      assert.equal(payload.reply_to, 'Greenpill Network <map@mail.greenpill.network>');
      assert.match(payload.text, /token=/);
      return new Response('{}', { status: 500 });
    },
  });

  assert.deepEqual(response, MAP_NODE_EDIT_LINK_NEUTRAL_RESPONSE);
  assert.equal(resendCalls, 1);
  const insert = statements.find((statement) => statement.text.includes('insert into intake.map_node_edit_tokens'));
  assert.ok(insert);
  assert.equal(insert.values.includes(submissionId), true);
  assert.equal(insert.values.includes(`submission:${submissionId}`), false);
  assert.equal(insert.values.includes('Person@Example.org'), false);
  assert.equal(insert.values.includes('person@example.org'), true);
  assert.equal(insert.values.some((value) => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value)), true);
  assert.equal(insert.values.some((value) => typeof value === 'string' && value.includes('token=')), false);
  const providerUpdate = statements.find((statement) => statement.text.includes('set provider_status'));
  assert.ok(providerUpdate);
  assert.equal(providerUpdate.values.includes('send_failed'), true);
});

test('edit-link requests persist Resend message ids for webhook correlation', async () => {
  const { sql, statements, submissionId } = createFakeEditLinkSql();

  const response = await createMapNodeEditLinkRequest(sql, `submission:${submissionId}`, 'person@example.org', {
    ipAddress: '203.0.113.10',
    userAgent: 'node-test',
    rateLimitKey: '203.0.113.10',
  }, {
    env: {
      RESEND_API_KEY: 'resend-secret',
      MAP_NODE_EMAIL_FROM: 'Greenpill Network <map@mail.greenpill.network>',
      MAP_NODE_EMAIL_REPLY_TO: 'Greenpill Network <map@mail.greenpill.network>',
      MAP_NODE_EDIT_BASE_URL: 'https://greenpill.network/map/edit',
    },
    fetchImpl: async () => Response.json({ id: '1f3ab49b-c6ed-4790-b3f2-0b2550282120' }),
  });

  assert.deepEqual(response, MAP_NODE_EDIT_LINK_NEUTRAL_RESPONSE);
  const providerUpdate = statements.find((statement) => statement.text.includes('set provider_status'));
  assert.ok(providerUpdate);
  assert.equal(providerUpdate.values.includes('sent'), true);
  assert.equal(providerUpdate.values.includes('1f3ab49b-c6ed-4790-b3f2-0b2550282120'), true);
});

test('edit-link cooldown and daily buckets record neutral attempts without sending email', async () => {
  for (const fake of [
    createFakeEditLinkSql({ cooldown: true }),
    createFakeEditLinkSql({ ipCount: 30 }),
    createFakeEditLinkSql({ emailCount: 10 }),
  ]) {
    let resendCalls = 0;
    const response = await createMapNodeEditLinkRequest(fake.sql, fake.submissionId, 'person@example.org', {
      ipAddress: '203.0.113.10',
      userAgent: 'node-test',
      rateLimitKey: '203.0.113.10',
    }, {
      env: {
        RESEND_API_KEY: 'resend-secret',
        MAP_NODE_EMAIL_FROM: 'Greenpill Network <map@mail.greenpill.network>',
        MAP_NODE_EDIT_BASE_URL: 'https://greenpill.network/map/edit',
      },
      fetchImpl: async () => {
        resendCalls += 1;
        return Response.json({});
      },
    });

    assert.deepEqual(response, MAP_NODE_EDIT_LINK_NEUTRAL_RESPONSE);
    assert.equal(resendCalls, 0);
    const insert = fake.statements.find((statement) => statement.text.includes('insert into intake.map_node_edit_tokens'));
    assert.ok(insert);
    assert.equal(insert.values.some((value) => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value)), false);
  }
});

test('edit-link cooldown stores and checks the canonical node id', async () => {
  const { sql, statements, submissionId } = createFakeEditLinkSql({ cooldown: true });
  let resendCalls = 0;

  const response = await createMapNodeEditLinkRequest(sql, `submission:${submissionId}`, 'person@example.org', {
    ipAddress: '203.0.113.10',
    userAgent: 'node-test',
    rateLimitKey: '203.0.113.10',
  }, {
    env: {
      RESEND_API_KEY: 'resend-secret',
      MAP_NODE_EMAIL_FROM: 'Greenpill Network <map@mail.greenpill.network>',
      MAP_NODE_EDIT_BASE_URL: 'https://greenpill.network/map/edit',
    },
    fetchImpl: async () => {
      resendCalls += 1;
      return Response.json({});
    },
  });

  assert.deepEqual(response, MAP_NODE_EDIT_LINK_NEUTRAL_RESPONSE);
  assert.equal(resendCalls, 0);
  const cooldownQuery = statements.find((statement) => (
    statement.text.includes('from intake.map_node_edit_tokens') &&
    statement.text.includes('created_at >= now() - interval')
  ));
  assert.ok(cooldownQuery);
  assert.equal(cooldownQuery.values.includes(submissionId), true);
  assert.equal(cooldownQuery.values.includes(`submission:${submissionId}`), false);
  const insert = statements.find((statement) => statement.text.includes('insert into intake.map_node_edit_tokens'));
  assert.ok(insert);
  assert.equal(insert.values.includes(submissionId), true);
  assert.equal(insert.values.includes(`submission:${submissionId}`), false);
  assert.equal(insert.values.some((value) => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value)), false);
});

test('default map-state repository reports partial public source availability', async () => {
  const payload = await getPublicMapState({
    fetchImpl: async () => Response.json([{
      id: 'nigeria',
      name: 'Nigeria',
      lat: 9.082,
      long: 8.6753,
      status: 'active',
      themes: ['public'],
      private_notes: 'must not leak',
    }]),
    mapNodeRepository: {
      async listPublic() {
        throw new AgentDataError('database_not_configured', 'missing database');
      },
    },
    now: '2026-05-17T12:00:00.000Z',
  });

  assert.equal(payload.counts.chapterNodes, 1);
  assert.equal(payload.intakeMode, 'moderated');
  assert.equal(payload.counts.approvedSubmittedNodes, 0);
  assert.deepEqual(payload.counts.sources, [
    { source: 'chapter-locations', status: 'ok', count: 1, message: '' },
    {
      source: 'approved-map-nodes',
      status: 'not_configured',
      count: 0,
      message: 'Approved map-node source is not configured.',
    },
  ]);
  assert.equal(containsPrivateMapStateField(payload), false);
});

test('chapter impact route reports cache misses without leaking internals', async () => {
  const app = createAgentApp({
    impactRepository: {
      async getChapterImpact() {
        return null;
      },
    },
    mapNodeRepository: {
      async createSubmission() {
        throw new Error('not used');
      },
      async listPublic() {
        return [];
      },
    },
  });

  const impact = await app.request('/impact/chapters/nigeria');
  assert.equal(impact.status, 404);
  const payload = await impact.json();
  assert.equal(payload.error.code, 'impact_cache_miss');
  assert.equal(payload.chapterSlug, 'nigeria');
  assert.equal(containsPrivateChapterImpactField(payload), false);
});

test('agent public impact guard rejects private upstream fields', () => {
  assert.throws(
    () => assertPublicImpactPayload({ raw_eas_feedback: 'private upstream payload' }),
    /private fields/
  );
  assert.deepEqual(assertPublicImpactPayload({ summary: { actionCount: 1 } }), {
    summary: { actionCount: 1 },
  });
});
