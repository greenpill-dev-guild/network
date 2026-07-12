#!/usr/bin/env bun

import { randomUUID } from 'node:crypto';
import { createDirectusClient } from './directus-operational-content-setup.ts';

function tokenValue() {
  return `${randomUUID().replaceAll('-', '')}${randomUUID().replaceAll('-', '')}`;
}

async function getRoleId(client, name: string) {
  const query = new URLSearchParams({
    'filter[name][_eq]': name,
    limit: '1',
  });
  const response = await client.request(`/roles?${query}`);
  const role = response?.data?.[0];
  if (!role?.id) throw new Error(`Directus role not found: ${name}`);
  return role.id;
}

async function expectForbidden(label: string, action: () => Promise<unknown>) {
  try {
    await action();
  } catch (error) {
    if (String(error).includes(' failed with 403:')) return;
    throw error;
  }
  throw new Error(`${label} unexpectedly succeeded.`);
}

const admin = await createDirectusClient();
const id = randomUUID().slice(0, 8);
const moderatorRoleId = await getRoleId(admin, 'Greenpill Steward Moderator');
const moderatorEmail = `map-moderation-smoke-${id}@greenpill.network`;
const moderatorToken = tokenValue();
let moderatorId = '';
let submissionId = '';

try {
  const moderator = await admin.request('/users', {
    method: 'POST',
    body: {
      email: moderatorEmail,
      first_name: 'Map Moderation',
      last_name: 'Smoke',
      status: 'active',
      role: moderatorRoleId,
      password: tokenValue(),
      token: moderatorToken,
    },
  });
  moderatorId = moderator?.data?.id ?? '';
  if (!moderatorId) throw new Error('Directus did not return a map moderation smoke user id.');

  const submission = await admin.request('/items/map_node_submissions', {
    method: 'POST',
    body: {
      status: 'pending',
      display_name: `Map moderation smoke ${id}`,
      place_name: 'Oakland',
      latitude: 37.8044,
      longitude: -122.2712,
      public_note: 'Temporary Directus moderation smoke record.',
    },
  });
  submissionId = submission?.data?.id ?? '';
  if (!submissionId) throw new Error('Directus did not return a map moderation smoke submission id.');

  const steward = await createDirectusClient({ url: admin.url, token: moderatorToken });
  const pending = await steward.request(`/items/map_node_submissions/${encodeURIComponent(submissionId)}`);
  if (pending?.data?.status !== 'pending') {
    throw new Error('Steward Moderator could not read the pending map-node submission.');
  }

  const approved = await steward.request(`/items/map_node_submissions/${encodeURIComponent(submissionId)}`, {
    method: 'PATCH',
    body: { status: 'approved' },
  });
  if (approved?.data?.status !== 'approved' || !approved?.data?.approved_at) {
    throw new Error('Steward Moderator approval did not set the approved status and timestamp.');
  }

  const notificationQueue = await steward.request(
    '/items/map_node_moderation_notifications?fields=id,status,provider_error,submission_id&limit=1'
  );
  if (!Array.isArray(notificationQueue?.data)) {
    throw new Error('Steward Moderator could not read the safe moderation delivery queue.');
  }

  await expectForbidden('private contact read', () => steward.request('/items/map_node_private_contacts?limit=1'));

  const activityQuery = new URLSearchParams({
    'filter[collection][_eq]': 'map_node_submissions',
    'filter[item][_eq]': submissionId,
    'filter[action][_eq]': 'update',
    fields: 'id,user,action,item',
    limit: '5',
  });
  const activity = await admin.request(`/activity?${activityQuery}`);
  const approvalActivity = (activity?.data ?? []).find((entry) => entry.user === moderatorId);
  if (!approvalActivity) {
    throw new Error('Directus did not record the moderator as the map-node approval actor.');
  }

  console.log(`Directus map moderation smoke passed at ${admin.url}`);
  console.log(`Approved temporary submission: ${submissionId}`);
  console.log(`Recorded moderator actor: ${moderatorId}`);
} finally {
  if (submissionId) {
    await admin.request(`/items/map_node_submissions/${encodeURIComponent(submissionId)}`, {
      method: 'DELETE',
      expected: [204, 404],
    });
  }
  if (moderatorId) {
    await admin.request(`/users/${encodeURIComponent(moderatorId)}`, {
      method: 'DELETE',
      expected: [204, 404],
    });
  }
}
