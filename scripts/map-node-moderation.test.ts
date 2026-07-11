import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  deliverQueuedMapNodeModerationNotifications,
} from '../packages/agent/src/map-node-moderation.ts';

function createModerationSql(rows) {
  const statements = [];
  const sql = async (strings, ...values) => {
    const text = strings.join('?').replace(/\s+/g, ' ').trim();
    statements.push({ text, values });

    if (text.includes('from intake.map_node_moderation_notifications notification')) return rows;
    if (text.includes('returning attempts')) return [{ attempts: 1 }];
    return [];
  };
  return { sql, statements };
}

test('moderation alerts contain only safe submission fields and the exact Directus record URL', async () => {
  const submissionId = '35cd495c-8043-4aa8-9cc0-5e5469b4fb70';
  const { sql } = createModerationSql([{
    id: 'c8e1fc85-5ca5-43f9-bd13-5069eb6c544f',
    kind: 'submission',
    attempts: 0,
    submissionId,
    displayName: 'Map Member',
    placeName: 'Oakland',
    city: 'Oakland',
    region: 'California',
    country: 'United States',
    lat: 37.8044,
    long: -122.2712,
    themes: ['public', 'events'],
    publicNote: 'Growing a local network.',
    createdAt: '2026-07-11T16:00:00.000Z',
    email: 'private@example.org',
    rawNote: 'Never email this.',
    ipAddress: '203.0.113.42',
  }]);
  const calls = [];

  const result = await deliverQueuedMapNodeModerationNotifications(sql, {
    now: new Date('2026-07-11T14:00:00.000Z'),
    env: {
      RESEND_API_KEY: 'resend-secret',
      MAP_NODE_EMAIL_FROM: 'Greenpill Network <map@mail.greenpill.network>',
      MAP_NODE_MODERATION_RECIPIENTS: 'afo@example.org, matt@example.org',
      MAP_NODE_MODERATION_DIRECTUS_URL: 'https://admin.greenpill.network',
    },
    fetchImpl: async (_url, options) => {
      calls.push(options);
      return Response.json({ id: 'email_123' });
    },
  });

  assert.deepEqual(result, { queued: 1, delivered: 1, failed: 0, skipped: 0 });
  assert.equal(calls.length, 1);
  const payload = JSON.parse(String(calls[0]?.body));
  assert.deepEqual(payload.to, ['afo@example.org', 'matt@example.org']);
  assert.equal(payload.subject, 'Greenpill map node awaiting approval');
  assert.equal(calls[0]?.headers?.['Idempotency-Key'], 'map-node-moderation-c8e1fc85-5ca5-43f9-bd13-5069eb6c544f');
  assert.match(payload.text, new RegExp(`/admin/content/intake\\.map_node_submissions/${submissionId}`));
  assert.match(payload.text, /Map Member/);
  assert.doesNotMatch(payload.text, /private@example\.org|Never email this|203\.0\.113\.42/);
});
