import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  createAgentApp,
} from '@greenpill-network/agent/app';
import {
  assertPublicImpactPayload,
  buildChapterImpactPath,
  buildPublicChapterImpactUrl,
  CHAPTER_IMPACT_ROUTE,
  MAP_NODE_SUBMISSIONS_ROUTE,
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
  createMapNodeSubmission,
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
  assert.equal(PUBLIC_MAP_STATE_ROUTE, '/map/state');
  assert.equal(PUBLIC_COUNTS_ROUTE, '/public-counts');
  assert.equal(PUBLIC_OPERATIONAL_CONTENT_ROUTE, '/content/public-snapshot');
  assert.equal(CHAPTER_IMPACT_ROUTE, '/impact/chapters/:slug');
  assert.equal(buildChapterImpactPath('greenpill nigeria'), '/impact/chapters/greenpill%20nigeria');
  assert.equal(
    buildPublicChapterImpactUrl('nigeria', 'https://agent.greenpill.network/'),
    'https://agent.greenpill.network/impact/chapters/nigeria'
  );
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
