import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import {
  MAP_NODE_MODERATION_DECISION_ROUTE,
  MAP_NODE_MODERATION_SESSION_ROUTE,
  createMapNodeModerationToken,
  deliverQueuedMapNodeModerationNotifications,
  getMapNodeModerationSession,
  moderateMapNode,
} from '../packages/agent/src/map-node-moderation.ts';
import { createAgentApp } from '../packages/agent/src/app.ts';
import { containsPrivateMapNodeField } from '../packages/shared/src/map-nodes.ts';

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

const notificationRow = Object.freeze({
  id: 'c8e1fc85-5ca5-43f9-bd13-5069eb6c544f',
  kind: 'submission',
  attempts: 0,
  submissionId: '35cd495c-8043-4aa8-9cc0-5e5469b4fb70',
  displayName: 'Magic Link Member',
  placeName: 'Oakland',
  city: 'Oakland',
  region: 'California',
  country: 'United States',
  lat: 37.8044,
  long: -122.2712,
  themes: ['public', 'events'],
  publicNote: 'Growing a local network.',
  createdAt: '2026-07-11T16:00:00.000Z',
});

const linkSecret = 'moderation-test-secret-with-at-least-32-bytes';
const magicEnv = Object.freeze({
  RESEND_API_KEY: 'resend-secret',
  MAP_NODE_EMAIL_FROM: 'Greenpill Network <map@mail.greenpill.network>',
  MAP_NODE_MODERATION_RECIPIENTS: 'afo@example.org,matt@example.org',
  MAP_NODE_MODERATION_DIRECTUS_URL: 'https://admin.greenpill.network',
  MAP_NODE_MODERATION_MAGIC_LINK_ENABLED: 'true',
  MAP_NODE_MODERATION_BASE_URL: 'https://greenpill.network/map/moderate',
  MAP_NODE_MODERATION_LINK_SECRET: linkSecret,
});

function createMagicDeliverySql() {
  const expiry = new Date('2026-07-18T16:00:00.000Z');
  const accessLinks = [
    {
      id: '11111111-1111-4111-8111-111111111111',
      notificationId: notificationRow.id,
      submissionId: notificationRow.submissionId,
      recipientEmail: 'afo@example.org',
      tokenExpiresAt: expiry,
      deliveryStatus: 'queued',
      attempts: 0,
    },
    {
      id: '22222222-2222-4222-8222-222222222222',
      notificationId: notificationRow.id,
      submissionId: notificationRow.submissionId,
      recipientEmail: 'matt@example.org',
      tokenExpiresAt: expiry,
      deliveryStatus: 'queued',
      attempts: 0,
    },
  ];
  const statements = [];
  const sql: any = async (strings, ...values) => {
    const text = strings.join('?').replace(/\s+/g, ' ').trim();
    statements.push({ text, values });
    if (text.includes('cleanup_map_node_moderation_access_links')) return [{ count: 0 }];
    if (text.includes('from intake.map_node_moderation_notifications notification')) return [notificationRow];
    if (text.includes('update intake.map_node_moderation_notifications notification') && text.includes('returning attempts')) {
      return [{ attempts: 1 }];
    }
    if (text.includes('from intake.map_node_moderation_access_links access') && text.includes('recipient_email::text = any')) {
      return accessLinks;
    }
    if (text.includes('update intake.map_node_moderation_access_links access') && text.includes('returning attempts')) {
      const link = accessLinks.find((entry) => values.includes(entry.id));
      if (!link) return [];
      link.deliveryStatus = 'delivery_claimed';
      link.attempts += 1;
      return [{ attempts: link.attempts }];
    }
    if (text.includes("delivery_status = 'sent'")) {
      const link = accessLinks.find((entry) => values.includes(entry.id));
      if (link) link.deliveryStatus = 'sent';
      return [];
    }
    if (text.includes("delivery_status = 'retry_scheduled'")) {
      const link = accessLinks.find((entry) => values.includes(entry.id));
      if (link) link.deliveryStatus = 'retry_scheduled';
      return [];
    }
    if (text.includes('select delivery_status as status')) {
      return accessLinks.map((entry) => ({ status: entry.deliveryStatus, nextAttemptAt: new Date() }));
    }
    return [];
  };
  return { sql, statements, accessLinks };
}

test('magic-link moderation sends one stable private link to each configured recipient', async () => {
  const { sql } = createMagicDeliverySql();
  const calls = [];
  const result = await deliverQueuedMapNodeModerationNotifications(sql, {
    now: new Date('2026-07-11T16:00:00.000Z'),
    env: magicEnv,
    fetchImpl: async (_url, options) => {
      calls.push(options);
      return Response.json({ id: `email_${calls.length}` });
    },
  });

  assert.deepEqual(result, { queued: 1, delivered: 1, failed: 0, skipped: 0 });
  assert.equal(calls.length, 2);
  const payloads = calls.map((call) => JSON.parse(String(call.body)));
  assert.deepEqual(payloads.map((payload) => payload.to).sort(), ['afo@example.org', 'matt@example.org']);
  assert.equal(payloads.every((payload) => typeof payload.to === 'string'), true);
  assert.equal(payloads.every((payload) => payload.text.includes('/map/moderate#token=v1.')), true);
  assert.equal(payloads.every((payload) => !payload.text.includes('?token=')), true);
  assert.notEqual(payloads[0].text, payloads[1].text);
  assert.equal(calls[0].headers['Idempotency-Key'], `map-node-moderation-${notificationRow.id}-11111111-1111-4111-8111-111111111111`);
  assert.equal(calls[1].headers['Idempotency-Key'], `map-node-moderation-${notificationRow.id}-22222222-2222-4222-8222-222222222222`);
  assert.equal(payloads.every((payload) => !/private@example\.org|Never email this|203\.0\.113\.42/i.test(payload.text)), true);
});

test('magic-link delivery keeps successful recipients sent when another recipient needs retry', async () => {
  const { sql, accessLinks, statements } = createMagicDeliverySql();
  let callCount = 0;
  const result = await deliverQueuedMapNodeModerationNotifications(sql, {
    now: new Date('2026-07-11T16:00:00.000Z'),
    env: magicEnv,
    fetchImpl: async () => {
      callCount += 1;
      return callCount === 1
        ? Response.json({ id: 'email_success' })
        : Response.json({ message: 'temporary failure' }, { status: 503 });
    },
  });

  assert.deepEqual(result, { queued: 1, delivered: 0, failed: 1, skipped: 0 });
  assert.equal(accessLinks[0].deliveryStatus, 'sent');
  assert.equal(accessLinks[1].deliveryStatus, 'retry_scheduled');
  assert.equal(statements.some((statement) => (
    statement.text.includes("status = 'retry_scheduled'") &&
    statement.text.includes('recipient_delivery_retry_scheduled')
  )), true);
});

function createModerationAccessSql(row) {
  const statements = [];
  const sql: any = async (strings, ...values) => {
    const text = strings.join('?').replace(/\s+/g, ' ').trim();
    statements.push({ text, values });
    if (text.includes('from intake.map_node_moderation_access_links access') && text.includes('join intake.map_node_submissions')) {
      return [row];
    }
    if (text.includes('select id::text') && text.includes('from intake.map_node_submissions')) {
      return [{ id: row.submissionId }];
    }
    if (text.includes('update intake.map_node_submissions')) {
      row.submissionStatus = values[0];
      return [{ id: row.submissionId }];
    }
    if (text.includes('insert into intake.map_node_reviews')) {
      return [{ reviewedAt: new Date('2026-07-11T16:05:00.000Z') }];
    }
    if (text.includes('update intake.map_node_moderation_access_links')) {
      if (text.includes('set consumed_at = now()')) {
        row.consumedAt = new Date('2026-07-11T16:05:00.000Z');
      } else {
        row.resolvedAt = new Date('2026-07-11T16:05:00.000Z');
        row.decision = values[0];
      }
      return [];
    }
    return [];
  };
  sql.begin = async (callback) => callback(sql);
  return { sql, statements };
}

function pendingAccessRow() {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    notificationId: notificationRow.id,
    submissionId: notificationRow.submissionId,
    recipientEmail: 'afo@example.org',
    tokenExpiresAt: new Date('2026-07-18T16:00:00.000Z'),
    deliveryStatus: 'sent',
    submissionStatus: 'pending',
    submissionUpdatedAt: new Date('2026-07-11T16:00:00.000Z'),
    displayName: notificationRow.displayName,
    placeName: notificationRow.placeName,
    city: notificationRow.city,
    region: notificationRow.region,
    country: notificationRow.country,
    lat: notificationRow.lat,
    long: notificationRow.long,
    themes: notificationRow.themes,
    publicNote: notificationRow.publicNote,
    createdAt: new Date(notificationRow.createdAt),
  };
}

test('moderation tokens are deterministic, recipient-bound, expiring, and never persisted raw', async () => {
  const row = pendingAccessRow();
  const token = createMapNodeModerationToken(row, linkSecret);
  assert.equal(token, createMapNodeModerationToken(row, linkSecret));
  assert.match(token, /^v1\.[0-9a-f-]{36}\.\d+\.[A-Za-z0-9_-]{43}$/);

  const { sql } = createModerationAccessSql(row);
  const session = await getMapNodeModerationSession(sql, token, {
    env: magicEnv,
    now: new Date('2026-07-12T16:00:00.000Z'),
  });
  assert.equal(session.state, 'pending');
  if (session.state !== 'pending') throw new Error('expected pending session');
  assert.equal(session.node.id, notificationRow.submissionId);
  assert.equal(session.node.displayName, notificationRow.displayName);
  assert.equal(containsPrivateMapNodeField(session.node), false);
  assert.deepEqual(Object.keys(session).sort(), ['expiresAt', 'node', 'state']);
  assert.deepEqual(Object.keys(session.node).sort(), [
    'city', 'country', 'createdAt', 'displayName', 'id', 'lat', 'long',
    'placeName', 'publicNote', 'region', 'themes',
  ]);
  assert.equal(JSON.stringify(session).includes('afo@example.org'), false);

  await assert.rejects(
    getMapNodeModerationSession(sql, token, {
      env: { ...magicEnv, MAP_NODE_MODERATION_LINK_SECRET: `${linkSecret}-rotated` },
      now: new Date('2026-07-12T16:00:00.000Z'),
    }),
    (error: any) => error?.code === 'invalid_moderation_link'
  );
  await assert.rejects(
    getMapNodeModerationSession(sql, token, {
      env: { ...magicEnv, MAP_NODE_MODERATION_RECIPIENTS: 'matt@example.org' },
      now: new Date('2026-07-12T16:00:00.000Z'),
    }),
    (error: any) => error?.code === 'invalid_moderation_link'
  );
  await assert.rejects(
    getMapNodeModerationSession(sql, token, {
      env: magicEnv,
      now: new Date('2026-07-19T16:00:00.000Z'),
    }),
    (error: any) => error?.code === 'invalid_moderation_link'
  );
});

test('a magic-link decision updates the pending node, logs an opaque actor, and blocks replay', async () => {
  const row = pendingAccessRow();
  const token = createMapNodeModerationToken(row, linkSecret);
  const { sql, statements } = createModerationAccessSql(row);
  const result = await moderateMapNode(sql, row.submissionId, {
    token,
    decision: 'rejected',
    note: 'Clearly promotional duplicate.',
  }, {
    env: magicEnv,
    now: new Date('2026-07-12T16:00:00.000Z'),
  });

  assert.deepEqual(result, {
    state: 'resolved',
    decision: 'rejected',
    reviewedAt: '2026-07-11T16:05:00.000Z',
  });
  const review = statements.find((statement) => statement.text.includes('insert into intake.map_node_reviews'));
  assert.ok(review);
  assert.equal(review.values.includes('moderation-link:11111111-1111-4111-8111-111111111111'), true);
  assert.equal(review.values.includes('afo@example.org'), false);
  assert.equal(review.values.includes('Clearly promotional duplicate.'), true);
  const submissionLock = statements.findIndex((statement) => (
    statement.text.includes('from intake.map_node_submissions') && statement.text.includes('for update')
  ));
  const accessLock = statements.findIndex((statement) => (
    statement.text.includes('from intake.map_node_moderation_access_links access') &&
    statement.text.includes('for update of access')
  ));
  assert.ok(submissionLock >= 0 && accessLock > submissionLock);

  await assert.rejects(
    moderateMapNode(sql, row.submissionId, { token, decision: 'approved' }, {
      env: magicEnv,
      now: new Date('2026-07-12T16:01:00.000Z'),
    }),
    (error: any) => error?.code === 'moderation_already_resolved' && error?.status === 409
  );
});

test('a valid sibling link reports a Directus-first resolution without pending details', async () => {
  const row = pendingAccessRow();
  const token = createMapNodeModerationToken(row, linkSecret);
  row.submissionStatus = 'approved';
  row.submissionUpdatedAt = new Date('2026-07-12T18:00:00.000Z');
  const { sql } = createModerationAccessSql(row);
  const session = await getMapNodeModerationSession(sql, token, {
    env: magicEnv,
    now: new Date('2026-07-12T16:00:00.000Z'),
  });
  assert.deepEqual(session, {
    state: 'resolved',
    decision: 'approved',
    reviewedAt: '2026-07-12T18:00:00.000Z',
  });
  assert.equal(Object.hasOwn(session, 'node'), false);
});

test('moderation input limits decline notes and never accepts an approval note', async () => {
  const row = pendingAccessRow();
  const token = createMapNodeModerationToken(row, linkSecret);
  const { sql } = createModerationAccessSql(row);
  await assert.rejects(
    moderateMapNode(sql, row.submissionId, { token, decision: 'approved', note: 'Unexpected note' }, { env: magicEnv }),
    (error: any) => error?.code === 'invalid_moderation_note'
  );
  await assert.rejects(
    moderateMapNode(sql, row.submissionId, { token, decision: 'rejected', note: 'x'.repeat(501) }, { env: magicEnv }),
    (error: any) => error?.code === 'invalid_moderation_note'
  );
});

test('moderation access migration stores only signed-link metadata without constraining legacy reviews', async () => {
  const migration = await readFile(
    new URL('../packages/agent/migrations/020_map_node_moderation_access_links.sql', import.meta.url),
    'utf8'
  );
  assert.match(migration, /create table if not exists intake\.map_node_moderation_access_links/);
  assert.match(migration, /unique \(notification_id, recipient_email\)/);
  assert.match(migration, /cleanup_map_node_moderation_access_links/);
  assert.doesNotMatch(migration, /alter table intake\.map_node_reviews/);
  assert.doesNotMatch(migration, /raw_token|token_hash|token_secret/);
});

test('agent moderation routes require an allowed browser origin and disable caching', async () => {
  const calls = [];
  const app = createAgentApp({
    mapNodeRepository: {
      async getModerationSession(token) {
        calls.push(['session', token]);
        return { state: 'resolved', decision: 'approved', reviewedAt: '2026-07-11T16:05:00.000Z' };
      },
      async moderateNode(id, input) {
        calls.push(['decision', id, input]);
        return { state: 'resolved', decision: input.decision, reviewedAt: '2026-07-11T16:05:00.000Z' };
      },
    },
  });

  const forbidden = await app.request(MAP_NODE_MODERATION_SESSION_ROUTE, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'https://attacker.example' },
    body: JSON.stringify({ token: 'private-token' }),
  });
  assert.equal(forbidden.status, 403);
  assert.equal(calls.length, 0);

  const wrongContentType = await app.request(MAP_NODE_MODERATION_SESSION_ROUTE, {
    method: 'POST',
    headers: { 'content-type': 'text/plain', origin: 'https://greenpill.network' },
    body: JSON.stringify({ token: 'private-token' }),
  });
  assert.equal(wrongContentType.status, 415);

  const nonObjectJson = await app.request(MAP_NODE_MODERATION_SESSION_ROUTE, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'https://greenpill.network' },
    body: JSON.stringify(['private-token']),
  });
  assert.equal(nonObjectJson.status, 400);
  assert.equal(calls.length, 0);

  const session = await app.request(MAP_NODE_MODERATION_SESSION_ROUTE, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'https://greenpill.network' },
    body: JSON.stringify({ token: 'private-token' }),
  });
  assert.equal(session.status, 200);
  assert.equal(session.headers.get('cache-control'), 'no-store, max-age=0');
  assert.equal(session.headers.get('referrer-policy'), 'no-referrer');
  assert.equal(session.headers.get('x-content-type-options'), 'nosniff');

  const route = MAP_NODE_MODERATION_DECISION_ROUTE.replace(':id', notificationRow.submissionId);
  const decision = await app.request(route, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'https://greenpill.network' },
    body: JSON.stringify({ token: 'private-token', decision: 'approved' }),
  });
  assert.equal(decision.status, 200);
  assert.equal(decision.headers.get('cache-control'), 'no-store, max-age=0');
  assert.equal(calls.length, 2);
});
