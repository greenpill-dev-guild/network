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

test('agent package exposes stable public route contracts', () => {
  assert.equal(MAP_NODE_SUBMISSIONS_ROUTE, '/map-nodes');
  assert.equal(PUBLIC_MAP_NODES_ROUTE, '/map-nodes/public');
  assert.equal(CHAPTER_IMPACT_ROUTE, '/impact/chapters/:slug');
  assert.equal(buildChapterImpactPath('greenpill nigeria'), '/impact/chapters/greenpill%20nigeria');
  assert.equal(
    buildPublicChapterImpactUrl('nigeria', 'https://agent.greenpill.network/'),
    'https://agent.greenpill.network/impact/chapters/nigeria'
  );
});

test('agent package exposes a Hono app with scaffolded routes', async () => {
  const app = createAgentApp({
    checkDatabase: async () => ({
      configured: true,
      connected: true,
      status: 'ok',
    }),
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
  assert.equal(impact.status, 501);
  const impactPayload = await impact.json();
  assert.equal(impactPayload.chapterSlug, 'nigeria');
  assert.equal(Object.hasOwn(impactPayload, 'expectedCacheTable'), false);
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
