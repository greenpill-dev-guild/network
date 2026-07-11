import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildDirectusStudioBookmarkPlan, buildDirectusStudioMetadataPlan } from './directus-studio-setup.ts';

test('Directus Studio metadata plan hides assignment collections and labels content collections', () => {
  const plan = buildDirectusStudioMetadataPlan(
    ['chapters', 'chapter_initiatives', 'guilds', 'projects'],
    ['chapter_editor_assignments', 'guild_editor_assignments'],
    [
      'chapter_update_requests',
      'chapter_update_request_links',
      'chapter_update_request_proof_signals',
    ],
    ['map_node_submissions', 'map_node_moderation_notifications']
  );

  const chapters = plan.collections.find((collection) => collection.collection === 'chapters');
  const assignments = plan.collections.find((collection) => collection.collection === 'chapter_editor_assignments');
  const updateRequests = plan.collections.find((collection) => collection.collection === 'chapter_update_requests');
  const updateRequestLinks = plan.collections.find((collection) => collection.collection === 'chapter_update_request_links');
  const updateRequestProofSignals = plan.collections.find((collection) => (
    collection.collection === 'chapter_update_request_proof_signals'
  ));
  const mapNodeSubmissions = plan.collections.find((collection) => (
    collection.collection === 'map_node_submissions'
  ));
  const mapNodeNotifications = plan.collections.find((collection) => (
    collection.collection === 'map_node_moderation_notifications'
  ));
  const chapterSummary = plan.fields.find((field) => field.collection === 'chapters' && field.field === 'summary');
  const initiativeChapter = plan.fields.find((field) => (
    field.collection === 'chapter_initiatives' &&
    field.field === 'chapter_slug'
  ));
  const updateRequestChapter = plan.fields.find((field) => (
    field.collection === 'chapter_update_requests' &&
    field.field === 'chapter_slug'
  ));
  const updateRequestTitle = plan.fields.find((field) => (
    field.collection === 'chapter_update_requests' &&
    field.field === 'title'
  ));
  const updateRequestStatus = plan.fields.find((field) => (
    field.collection === 'chapter_update_requests' &&
    field.field === 'request_status'
  ));
  const updateRequestLinksAlias = plan.fields.find((field) => (
    field.collection === 'chapter_update_requests' &&
    field.field === 'links'
  ));
  const updateRequestProofSignalsAlias = plan.fields.find((field) => (
    field.collection === 'chapter_update_requests' &&
    field.field === 'proof_signals'
  ));
  const updateRequestLinkLabel = plan.fields.find((field) => (
    field.collection === 'chapter_update_request_links' &&
    field.field === 'label'
  ));
  const updateRequestLinkChapter = plan.fields.find((field) => (
    field.collection === 'chapter_update_request_links' &&
    field.field === 'chapter_slug'
  ));
  const updateRequestProofSignalValue = plan.fields.find((field) => (
    field.collection === 'chapter_update_request_proof_signals' &&
    field.field === 'value'
  ));
  const projectGuild = plan.fields.find((field) => field.collection === 'projects' && field.field === 'guild_slug');
  const rawData = plan.fields.find((field) => field.collection === 'chapters' && field.field === 'data');
  const mapNodeStatus = plan.fields.find((field) => (
    field.collection === 'map_node_submissions' && field.field === 'status'
  ));
  const mapNotificationStatus = plan.fields.find((field) => (
    field.collection === 'map_node_moderation_notifications' && field.field === 'status'
  ));

  assert.equal(chapters?.meta.icon, 'location_city');
  assert.equal(chapters?.meta.display_template, '{{ name }}');
  assert.equal(chapters?.meta.archive_field, 'publication_status');
  assert.equal(chapters?.meta.preview_url, 'https://greenpill.network/chapters/{{ slug }}');
  assert.equal(assignments?.meta.hidden, true);
  assert.equal(updateRequests?.meta.icon, 'edit_document');
  assert.equal(updateRequests?.meta.archive_field, 'request_status');
  assert.equal(updateRequests?.meta.preview_url, 'https://greenpill.network/chapters/{{ chapter_slug }}');
  assert.equal(updateRequestLinks?.meta.hidden, true);
  assert.equal(updateRequestProofSignals?.meta.hidden, true);
  assert.equal(mapNodeSubmissions?.meta.icon, 'approval');
  assert.equal(mapNodeNotifications?.meta.icon, 'mark_email_unread');
  assert.equal((chapterSummary?.meta as any).interface, 'input-multiline');
  assert.equal((initiativeChapter?.meta as any).interface, 'select-dropdown-m2o');
  assert.deepEqual((initiativeChapter?.meta as any).special, ['m2o']);
  assert.equal((updateRequestChapter?.meta as any).required, true);
  assert.equal((updateRequestTitle?.meta as any).required, true);
  assert.equal((updateRequestStatus?.meta as any).interface, 'select-dropdown');
  assert.equal((updateRequestStatus?.meta as any).required, true);
  assert.equal((updateRequestLinksAlias?.meta as any).interface, 'list-o2m');
  assert.equal((updateRequestProofSignalsAlias?.meta as any).interface, 'list-o2m');
  assert.equal((updateRequestLinkChapter?.meta as any).hidden, true);
  assert.equal((updateRequestLinkLabel?.meta as any).required, true);
  assert.equal((updateRequestProofSignalValue?.meta as any).required, true);
  assert.equal((projectGuild?.meta as any).interface, 'select-dropdown-m2o');
  assert.equal((rawData?.meta as any).hidden, true);
  assert.equal((rawData?.meta as any).readonly, true);
  assert.equal((mapNodeStatus?.meta as any).interface, 'select-dropdown');
  assert.equal((mapNodeStatus?.meta as any).required, true);
  assert.equal((mapNotificationStatus?.meta as any).readonly, true);
});

test('Directus Studio bookmark plan adds steward and publisher working views', () => {
  const bookmarks = buildDirectusStudioBookmarkPlan([
    'chapters',
    'chapter_initiatives',
    'chapter_update_requests',
    'map_node_submissions',
    'map_node_moderation_notifications',
  ]);

  const stewardRequests = bookmarks.find((bookmark) => bookmark.bookmark === 'My chapter change requests');
  const publisherReviews = bookmarks.find((bookmark) => bookmark.bookmark === 'Pending chapter reviews');
  const mapApprovals = bookmarks.filter((bookmark) => bookmark.bookmark === 'Pending map node approvals');
  const failedAlerts = bookmarks.filter((bookmark) => bookmark.bookmark === 'Failed map moderation alerts');

  assert.equal(stewardRequests?.role, 'Greenpill Steward Editor');
  assert.equal(stewardRequests?.collection, 'chapter_update_requests');
  assert.deepEqual(stewardRequests?.filter, {
    request_status: {
      _in: ['draft', 'pending_review', 'needs_changes'],
    },
  });
  assert.equal(publisherReviews?.role, 'Greenpill Trusted Publisher');
  assert.deepEqual(publisherReviews?.filter, {
    request_status: {
      _eq: 'pending_review',
    },
  });
  assert.equal(mapApprovals.length, 2);
  assert.equal(mapApprovals.every((bookmark) => bookmark.collection === 'map_node_submissions'), true);
  assert.deepEqual(mapApprovals[0]?.filter, {
    status: {
      _eq: 'pending',
    },
  });
  assert.equal(failedAlerts.length, 2);
  assert.equal(failedAlerts.every((bookmark) => bookmark.collection === 'map_node_moderation_notifications'), true);
});
