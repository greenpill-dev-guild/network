import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buildChapterImpactEndpoint,
  containsPrivateChapterImpactField,
  normalizeGreenGoodsImpactSnapshot,
  normalizeKarmaImpactSnapshot,
  shouldRenderChapterImpactUi,
  toPublicChapterImpactPayload,
  toPublicImpactSourceBinding,
} from '@greenpill-network/shared/chapter-impact';
import {
  decorateCachedImpactPayload,
} from '@greenpill-network/agent/impact-cache';
import {
  syncChapterImpactSnapshots,
} from '@greenpill-network/agent/green-goods-impact';

test('chapter impact source bindings are public and opt-in', () => {
  const binding = toPublicImpactSourceBinding({
    id: 'nigeria',
    data: {
      name: 'Nigeria',
      impactSources: {
        impactEnabled: true,
        greenGoodsGardenAddress: '0x35722eEdf3F7566A23FA871f0a04267AEe78E0dB',
        greenGoodsChainId: 42161,
        karmaProjectSlug: 'greenpill-nigeria',
        email: 'private@example.com',
      },
    },
  });

  assert.equal(binding.chapterSlug, 'nigeria');
  assert.equal(binding.sources.greenGoodsChainId, 42161);
  assert.equal(binding.sources.karmaProjectSlug, 'greenpill-nigeria');
  assert.equal(containsPrivateChapterImpactField(binding), false);

  const disabled = toPublicImpactSourceBinding({
    id: 'hidden',
    data: {
      name: 'Hidden',
      impactSources: {
        impactEnabled: false,
        greenGoodsGardenAddress: '0x0000000000000000000000000000000000000001',
      },
    },
  });
  assert.equal(disabled, null);
});

test('chapter impact endpoint targets the public agent contract', () => {
  assert.equal(
    buildChapterImpactEndpoint('côte d-ivoire', 'https://agent.greenpill.network/'),
    'https://agent.greenpill.network/impact/chapters/c%C3%B4te%20d-ivoire'
  );
});

test('chapter impact UI remains scaffold-gated until the agent is live', () => {
  const sources = {
    impactEnabled: true,
    greenGoodsGardenAddress: '0x35722eEdf3F7566A23FA871f0a04267AEe78E0dB',
  };

  assert.equal(shouldRenderChapterImpactUi(sources), false);
  assert.equal(shouldRenderChapterImpactUi(sources, true), true);
  assert.equal(shouldRenderChapterImpactUi({ ...sources, impactEnabled: false }, true), false);
});

test('privacy guard catches snake_case and raw upstream field names', () => {
  assert.equal(containsPrivateChapterImpactField({ user_agent: 'Mozilla' }), true);
  assert.equal(containsPrivateChapterImpactField({ decoded_data_json: 'raw EAS data' }), true);
  assert.equal(containsPrivateChapterImpactField({ raw_eas_feedback: 'raw feedback' }), true);
  assert.equal(containsPrivateChapterImpactField({ work_media: ['ipfs://private-ish'] }), true);
  assert.equal(containsPrivateChapterImpactField({ media_urls: ['ipfs://private-ish'] }), true);
  assert.equal(containsPrivateChapterImpactField({ public: { label: 'ok' } }), false);
});

test('karma snapshots normalize to public milestones, updates, grants, and indicators', () => {
  const karma = normalizeKarmaImpactSnapshot({
    project: {
      uid: '0xgap',
      slug: 'greenpill-nigeria',
      title: 'Greenpill Nigeria',
      url: 'https://gap.karmahq.xyz/project/greenpill-nigeria',
    },
    milestones: [
      {
        uid: 'milestone-1',
        title: 'Run chapter activation',
        status: 'completed',
        rawNote: 'private steward note',
      },
    ],
    updates: [{ id: 'update-1', title: 'Field update', decodedDataJson: '[private]' }],
    grants: [{ id: 'grant-1', title: 'Chapter grant' }],
    communityImpact: {
      summary: 'Public community impact summary',
      segments: [{ id: 'segment-1' }],
      indicators: [{ id: 'indicator-1' }],
    },
  });

  assert.equal(karma.project.uid, '0xgap');
  assert.equal(karma.milestones.length, 1);
  assert.equal(karma.updates.length, 1);
  assert.equal(karma.grants.length, 1);
  assert.equal(karma.communityImpact.segmentCount, 1);
  assert.equal(containsPrivateChapterImpactField(karma), false);
});

test('green goods snapshots expose aggregates without raw EAS work data', () => {
  const greenGoods = normalizeGreenGoodsImpactSnapshot({
    garden: {
      id: '0x35722eEdf3F7566A23FA871f0a04267AEe78E0dB',
      chainId: 42161,
      name: 'Greenpill Nigeria',
      location: 'Nigeria',
      gapProjectUID: null,
        gardeners: ['0x1', '0x2'],
        operators: ['0x2'],
        evaluators: ['0x4'],
    },
    actions: [{ id: 'action-1' }, { id: 'action-2' }],
    assessments: [{ id: 'assessment-1' }],
    works: [{ feedback: 'raw EAS feedback', media: ['ipfs://private-ish'] }],
  });

  assert.equal(greenGoods.garden.roleCounts.gardeners, 2);
  assert.equal(greenGoods.garden.memberCount, 3);
  assert.equal(greenGoods.activity.actionCount, 2);
  assert.equal(greenGoods.activity.assessmentCount, 1);
  assert.equal(Object.hasOwn(greenGoods, 'works'), false);
  assert.equal(containsPrivateChapterImpactField(greenGoods), false);
});

test('public chapter impact payload excludes private fields and reports source outages', () => {
  const payload = toPublicChapterImpactPayload({
    chapterSlug: 'nigeria',
    chapterName: 'Nigeria',
    generatedAt: '2026-05-16T18:00:00.000Z',
    sources: {
      impactEnabled: true,
      greenGoodsGardenAddress: '0x35722eEdf3F7566A23FA871f0a04267AEe78E0dB',
      greenGoodsChainId: 42161,
      karmaProjectSlug: 'greenpill-nigeria',
    },
    karma: {
      project: { slug: 'greenpill-nigeria', title: 'Greenpill Nigeria' },
      milestones: [{ id: 'm1', title: 'Milestone 1' }],
      updates: [{ id: 'u1', title: 'Update 1' }],
    },
    greenGoods: undefined,
  });

  assert.equal(payload.summary.milestoneCount, 1);
  assert.equal(payload.summary.updateCount, 1);
  assert.deepEqual(payload.sourceStatus, [
    { source: 'karma', configured: true, status: 'ok' },
    { source: 'green-goods', configured: true, status: 'unavailable' },
  ]);
  assert.equal(containsPrivateChapterImpactField(payload), false);
});

test('cached impact payload reports stale source status without raw upstream data', () => {
  const payload = decorateCachedImpactPayload({
    payload: toPublicChapterImpactPayload({
      chapterSlug: 'nigeria',
      chapterName: 'Nigeria',
      generatedAt: '2026-05-16T18:00:00.000Z',
      sources: {
        impactEnabled: true,
        greenGoodsGardenAddress: '0x35722eEdf3F7566A23FA871f0a04267AEe78E0dB',
      },
      greenGoods: {
        garden: {
          id: '0x35722eEdf3F7566A23FA871f0a04267AEe78E0dB',
          chainId: 42161,
          name: 'Greenpill Nigeria',
          location: 'Nigeria',
        },
        activity: {
          actionCount: 2,
          assessmentCount: 1,
          hypercertCount: 1,
        },
      },
    }),
    sourceStatus: [
      { source: 'karma', configured: false, status: 'missing' },
      { source: 'green-goods', configured: true, status: 'ok' },
    ],
    syncedAt: '2026-05-16T18:00:00.000Z',
    staleAfter: '2026-05-17T00:00:00.000Z',
  }, new Date('2026-05-17T00:00:01.000Z'));

  assert.equal(payload.cache.status, 'stale');
  assert.equal(payload.sourceStatus[1].status, 'ok');
  assert.equal(containsPrivateChapterImpactField(payload), false);
});

test('green goods sync saves normalized snapshots and leaves karma unfetched without IDs', async () => {
  const calls = [];
  const saved = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url, options });

    if (url === 'https://example.org/impact-sources.json') {
      return Response.json({
        chapters: [{
          chapterSlug: 'nigeria',
          chapterName: 'Nigeria',
          sources: {
            impactEnabled: true,
            greenGoodsGardenAddress: '0x35722eEdf3F7566A23FA871f0a04267AEe78E0dB',
            greenGoodsChainId: 42161,
          },
        }],
      });
    }

    if (url === 'https://example.org/greengoods/graphql') {
      return Response.json({
        data: {
          Garden: [{
            id: '0x35722eedf3f7566a23fa871f0a04267aee78e0db',
            chainId: 42161,
            name: 'Greenpill Nigeria',
            location: 'Nigeria',
            gardeners: ['0x1', '0x2'],
            operators: ['0x2'],
            evaluators: [],
            gapProjectUID: null,
          }],
          Hypercert: [{ id: 'hypercert-1' }],
        },
      });
    }

    throw new Error(`Unexpected fetch URL: ${url}`);
  };

  const result = await syncChapterImpactSnapshots({
    fetchImpl,
    repository: {
      async saveSnapshot(snapshot) {
        saved.push(snapshot);
      },
    },
    now: new Date('2026-05-16T18:00:00.000Z'),
    config: {
      impactSourcesUrl: 'https://example.org/impact-sources.json',
      greenGoodsIndexerUrl: 'https://example.org/greengoods/graphql',
      karmaApiBase: 'https://example.org/karma',
      cacheTtlSeconds: 3600,
      defaultChainId: 42161,
    },
  });

  assert.deepEqual(result, {
    checked: 1,
    saved: 1,
    failed: 0,
    failures: [],
  });
  assert.equal(calls.length, 2);
  assert.equal(saved.length, 1);
  assert.equal(saved[0].chapterSlug, 'nigeria');
  assert.equal(saved[0].payload.summary.gardenMemberCount, 2);
  assert.equal(saved[0].payload.summary.hypercertCount, 1);
  assert.equal(saved[0].payload.sourceStatus[0].status, 'missing');
  assert.equal(saved[0].payload.sourceStatus[1].status, 'ok');
  assert.equal(containsPrivateChapterImpactField(saved[0].payload), false);
});
