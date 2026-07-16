import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createDatabaseClient } from '../packages/agent/src/db.ts';
import {
  cleanupMapNodeModerationAccessLinks,
  createMapNodeModerationToken,
  getMapNodeModerationSession,
  moderateMapNode,
} from '../packages/agent/src/map-node-moderation.ts';

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) throw new Error('DATABASE_URL is required for the moderation integration proof.');

const sql = createDatabaseClient({ url: databaseUrl, max: 8 });
if (!sql) throw new Error('Could not create the moderation integration database client.');

const secret = 'local-moderation-integration-secret-32-bytes';
const recipients = ['moderator-one@example.test', 'moderator-two@example.test'];
const env = {
  MAP_NODE_MODERATION_MAGIC_LINK_ENABLED: 'true',
  MAP_NODE_MODERATION_BASE_URL: 'http://127.0.0.1:3301/map/moderate',
  MAP_NODE_MODERATION_LINK_SECRET: secret,
  MAP_NODE_MODERATION_RECIPIENTS: recipients.join(','),
};
const fixtureSubmissionIds: string[] = [];

async function createFixture(label: string) {
  const [submission] = await sql`
    insert into intake.map_node_submissions (
      display_name,
      place_name,
      city,
      region,
      country,
      latitude,
      longitude,
      themes,
      public_note,
      raw_note,
      ip_address,
      user_agent,
      spam_signals
    )
    values (
      ${`Moderation integration ${label} ${randomUUID().slice(0, 8)}`},
      'Oakland',
      'Oakland',
      'California',
      'United States',
      37.8044,
      -122.2712,
      array['public', 'events']::text[],
      'Public integration note.',
      'Private integration note that must never leave the database.',
      '203.0.113.42'::inet,
      'private-integration-user-agent',
      '{"private":"spam metadata"}'::jsonb
    )
    returning id::text
  `;
  fixtureSubmissionIds.push(submission.id);

  const [notification] = await sql`
    insert into intake.map_node_moderation_notifications (kind, submission_id)
    values ('submission', ${submission.id}::uuid)
    returning id::text
  `;

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const accessLinks = [];
  for (const recipientEmail of recipients) {
    const [access] = await sql`
      insert into intake.map_node_moderation_access_links (
        notification_id,
        submission_id,
        recipient_email,
        token_expires_at,
        delivery_status,
        sent_at
      )
      values (
        ${notification.id}::uuid,
        ${submission.id}::uuid,
        ${recipientEmail},
        ${expiresAt},
        'sent',
        now()
      )
      returning id::text
    `;
    accessLinks.push({
      id: access.id,
      notificationId: notification.id,
      submissionId: submission.id,
      recipientEmail,
      tokenExpiresAt: expiresAt,
    });
  }

  return {
    submissionId: submission.id as string,
    notificationId: notification.id as string,
    accessLinks,
    tokens: accessLinks.map((access) => createMapNodeModerationToken(access, secret)),
  };
}

try {
  const approved = await createFixture('approve');
  const approvedSession = await getMapNodeModerationSession(sql, approved.tokens[0], { env });
  assert.equal(approvedSession.state, 'pending');
  if (approvedSession.state !== 'pending') throw new Error('Expected a pending approval fixture.');
  assert.equal(approvedSession.node.id, approved.submissionId);
  assert.equal(JSON.stringify(approvedSession).includes('Private integration note'), false);
  assert.equal(JSON.stringify(approvedSession).includes('203.0.113.42'), false);
  assert.equal(JSON.stringify(approvedSession).includes('private-integration-user-agent'), false);

  await moderateMapNode(sql, approved.submissionId, {
    token: approved.tokens[0],
    decision: 'approved',
  }, { env });

  const [approvedRow] = await sql`
    select status::text, approved_at as "approvedAt"
    from intake.map_node_submissions
    where id = ${approved.submissionId}::uuid
  `;
  assert.equal(approvedRow.status, 'approved');
  assert.ok(approvedRow.approvedAt instanceof Date);

  const approvedReviews = await sql`
    select
      reviewer_id as "reviewerId",
      review_status::text as "reviewStatus",
      review_notes as "reviewNotes"
    from intake.map_node_reviews
    where submission_id = ${approved.submissionId}::uuid
  `;
  assert.equal(approvedReviews.length, 1);
  assert.equal(approvedReviews[0].reviewerId, `moderation-link:${approved.accessLinks[0].id}`);
  assert.equal(approvedReviews[0].reviewStatus, 'approved');
  assert.equal(approvedReviews[0].reviewNotes, null);

  const approvedAccess = await sql`
    select id::text, decision::text, resolved_at as "resolvedAt", consumed_at as "consumedAt"
    from intake.map_node_moderation_access_links
    where submission_id = ${approved.submissionId}::uuid
    order by recipient_email
  `;
  assert.equal(approvedAccess.every((row) => row.decision === 'approved' && row.resolvedAt instanceof Date), true);
  assert.equal(approvedAccess.filter((row) => row.consumedAt instanceof Date).length, 1);

  const rejected = await createFixture('decline');
  await moderateMapNode(sql, rejected.submissionId, {
    token: rejected.tokens[1],
    decision: 'rejected',
    note: 'Duplicate local integration fixture.',
  }, { env });
  const [rejectedRow] = await sql`
    select status::text, approved_at as "approvedAt"
    from intake.map_node_submissions
    where id = ${rejected.submissionId}::uuid
  `;
  assert.equal(rejectedRow.status, 'rejected');
  assert.equal(rejectedRow.approvedAt, null);
  const [rejectedReview] = await sql`
    select review_notes as "reviewNotes"
    from intake.map_node_reviews
    where submission_id = ${rejected.submissionId}::uuid
  `;
  assert.equal(rejectedReview.reviewNotes, 'Duplicate local integration fixture.');

  const concurrent = await createFixture('concurrent');
  const concurrentResults = await Promise.allSettled([
    moderateMapNode(sql, concurrent.submissionId, {
      token: concurrent.tokens[0],
      decision: 'approved',
    }, { env }),
    moderateMapNode(sql, concurrent.submissionId, {
      token: concurrent.tokens[1],
      decision: 'rejected',
      note: 'Concurrent losing decision.',
    }, { env }),
  ]);
  assert.equal(concurrentResults.filter((result) => result.status === 'fulfilled').length, 1);
  const losingResult = concurrentResults.find((result) => result.status === 'rejected');
  assert.equal(losingResult?.status, 'rejected');
  if (losingResult?.status === 'rejected') {
    assert.equal(losingResult.reason?.code, 'moderation_already_resolved');
    assert.equal(losingResult.reason?.status, 409);
  }
  const [concurrentReviewCount] = await sql`
    select count(*)::int as count
    from intake.map_node_reviews
    where submission_id = ${concurrent.submissionId}::uuid
  `;
  assert.equal(concurrentReviewCount.count, 1);

  const directusFirst = await createFixture('directus-first');
  await sql`
    update intake.map_node_submissions
    set status = 'rejected'::intake.map_node_status
    where id = ${directusFirst.submissionId}::uuid
  `;
  const directusFirstSession = await getMapNodeModerationSession(sql, directusFirst.tokens[0], { env });
  assert.deepEqual(directusFirstSession.state, 'resolved');
  if (directusFirstSession.state !== 'resolved') throw new Error('Expected a resolved Directus-first fixture.');
  assert.equal(directusFirstSession.decision, 'rejected');
  assert.equal(Object.hasOwn(directusFirstSession, 'node'), false);

  const cleanupFixture = await createFixture('cleanup');
  await sql`
    update intake.map_node_moderation_access_links
    set
      created_at = now() - interval '16 days',
      token_expires_at = now() - interval '8 days'
    where id = ${cleanupFixture.accessLinks[0].id}::uuid
  `;
  const cleaned = await cleanupMapNodeModerationAccessLinks(sql);
  assert.ok(cleaned >= 1);

  console.log('Map moderation integration proof passed: approve, decline, concurrency, Directus-first resolution, and cleanup.');
} finally {
  if (fixtureSubmissionIds.length > 0) {
    await sql`
      delete from intake.map_node_submissions
      where id::text = any(${fixtureSubmissionIds}::text[])
    `;
  }
  await sql.end({ timeout: 3 });
}
