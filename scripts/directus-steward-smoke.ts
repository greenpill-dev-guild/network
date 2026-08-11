#!/usr/bin/env bun

import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import {
  DIRECTUS_CHAPTER_IMAGE_FOLDER_ID,
  createDirectusClient,
} from './directus-operational-content-setup.ts';

type SmokeOptions = {
  chapter: string;
  unassignedChapter: string;
  guild: string;
  unassignedGuild: string;
  emailDomain: string;
  agentUrl: string;
  keep: boolean;
};

const DEFAULT_OPTIONS: SmokeOptions = Object.freeze({
  chapter: 'brasil',
  unassignedChapter: 'nigeria',
  guild: 'dev-guild',
  unassignedGuild: 'writers-guild',
  emailDomain: 'greenpill.network',
  agentUrl: 'http://localhost:3303',
  keep: false,
});

function usage() {
  return [
    'Usage: bun run directus:steward:smoke -- [options]',
    '',
    'Creates a temporary Steward Editor user, assigns it to one chapter and one guild,',
    'proves scoped create/read behavior with the temporary user token, then cleans up.',
    '',
    'Options:',
    `  --chapter <slug>              Assigned chapter. Defaults to "${DEFAULT_OPTIONS.chapter}".`,
    `  --unassigned-chapter <slug>   Chapter that should be forbidden. Defaults to "${DEFAULT_OPTIONS.unassignedChapter}".`,
    `  --guild <slug>                Assigned guild. Defaults to "${DEFAULT_OPTIONS.guild}".`,
    `  --unassigned-guild <slug>     Guild that should be forbidden. Defaults to "${DEFAULT_OPTIONS.unassignedGuild}".`,
    `  --email-domain <domain>       Temporary email domain. Defaults to "${DEFAULT_OPTIONS.emailDomain}".`,
    `  --agent-url <url>             Agent snapshot base URL. Defaults to "${DEFAULT_OPTIONS.agentUrl}".`,
    '  --keep                       Leave temporary records in place for manual inspection.',
  ].join('\n');
}

function takeValue(args: string[], index: number, flag: string) {
  const value = args[index + 1];
  if (!value || value.startsWith('--')) {
    throw new Error(`${flag} requires a value.`);
  }
  return value;
}

export function parseArgs(argv: string[]): SmokeOptions {
  const options = { ...DEFAULT_OPTIONS };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') {
      console.log(usage());
      process.exit(0);
    }
    if (arg === '--chapter') {
      options.chapter = takeValue(argv, index, arg);
      index += 1;
      continue;
    }
    if (arg === '--unassigned-chapter') {
      options.unassignedChapter = takeValue(argv, index, arg);
      index += 1;
      continue;
    }
    if (arg === '--guild') {
      options.guild = takeValue(argv, index, arg);
      index += 1;
      continue;
    }
    if (arg === '--unassigned-guild') {
      options.unassignedGuild = takeValue(argv, index, arg);
      index += 1;
      continue;
    }
    if (arg === '--email-domain') {
      options.emailDomain = takeValue(argv, index, arg);
      index += 1;
      continue;
    }
    if (arg === '--agent-url') {
      options.agentUrl = takeValue(argv, index, arg).replace(/\/+$/, '');
      index += 1;
      continue;
    }
    if (arg === '--keep') {
      options.keep = true;
      continue;
    }
    throw new Error(`Unknown option: ${arg}\n\n${usage()}`);
  }

  if (options.chapter === options.unassignedChapter) {
    throw new Error('--chapter and --unassigned-chapter must be different.');
  }
  if (options.guild === options.unassignedGuild) {
    throw new Error('--guild and --unassigned-guild must be different.');
  }

  return options;
}

function tokenValue() {
  return `${randomUUID().replaceAll('-', '')}${randomUUID().replaceAll('-', '')}`;
}

function filterByField(field: string, value: string) {
  const params = new URLSearchParams();
  params.set(`filter[${field}][_eq]`, value);
  params.set('limit', '1');
  return params.toString();
}

function encodePathSegment(segment: string) {
  return encodeURIComponent(segment);
}

async function getRoleId(client, name: string) {
  const response = await client.request(`/roles?${filterByField('name', name)}`);
  const role = response?.data?.[0];
  if (!role?.id) throw new Error(`Directus role not found: ${name}`);
  return role.id;
}

async function assertContentExists(client, collection: string, slug: string) {
  const response = await client.request(`/items/${collection}?${filterByField('slug', slug)}`);
  if (!response?.data?.[0]) {
    throw new Error(`Directus ${collection} record not found: ${slug}`);
  }
}

async function expectForbidden(label: string, action: () => Promise<unknown>) {
  try {
    await action();
  } catch (error) {
    const message = String(error instanceof Error ? error.message : error);
    if (message.includes(' failed with 403:')) return;
    throw error;
  }
  throw new Error(`${label} unexpectedly succeeded.`);
}

async function expectRejected(label: string, action: () => Promise<unknown>, statuses = [400, 403]) {
  try {
    await action();
  } catch (error) {
    const message = String(error instanceof Error ? error.message : error);
    if (statuses.some((status) => message.includes(` failed with ${status}:`))) return;
    throw error;
  }
  throw new Error(`${label} unexpectedly succeeded.`);
}

async function deleteIfPresent(client, path: string) {
  await client.request(path, {
    method: 'DELETE',
    expected: [204, 404],
  });
}

const ONE_PIXEL_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64'
);

async function uploadChapterImage(url: string, token: string, fileName: string) {
  const body = new FormData();
  body.append('folder', DIRECTUS_CHAPTER_IMAGE_FOLDER_ID);
  body.append('title', 'Directus steward upload smoke');
  body.append('file', new File([ONE_PIXEL_PNG], fileName, { type: 'image/png' }));

  const response = await fetch(`${url}/files`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}` },
    body,
  });
  const responseText = await response.text();
  if (!response.ok) {
    throw new Error(`chapter image upload failed with ${response.status}: ${responseText}`);
  }
  const payload = responseText ? JSON.parse(responseText) : null;
  const fileId = payload?.data?.id;
  if (!fileId) throw new Error('Directus did not return an uploaded chapter image id.');
  return fileId as string;
}

export async function runDirectusStewardSmoke(options: SmokeOptions) {
  const admin = await createDirectusClient();
  const roleId = await getRoleId(admin, 'Greenpill Steward Editor');
  const id = randomUUID().slice(0, 8);
  const email = `directus-smoke-${id}@${options.emailDomain}`;
  const token = tokenValue();
  const initiativeSlug = `directus-smoke-initiative-${id}`;
  const projectSlug = `directus-smoke-project-${id}`;
  let updateRequestId: string | null = null;
  let unassignedUpdateRequestId: string | null = null;
  let uploadedFileId: string | null = null;
  let originalImageFile: string | null = null;
  let chapterImageChanged = false;
  const cleanup = {
    userId: null,
    chapterAssignmentId: null,
    guildAssignmentId: null,
    initiativeCreated: false,
    projectCreated: false,
    updateRequestCreated: false,
  };

  await assertContentExists(admin, 'chapters', options.chapter);
  await assertContentExists(admin, 'chapters', options.unassignedChapter);
  await assertContentExists(admin, 'guilds', options.guild);
  await assertContentExists(admin, 'guilds', options.unassignedGuild);

  try {
    const user = await admin.request('/users', {
      method: 'POST',
      body: {
        email,
        first_name: 'Directus',
        last_name: 'Smoke',
        status: 'active',
        role: roleId,
        password: tokenValue(),
        token,
      },
    });
    cleanup.userId = user?.data?.id;
    if (!cleanup.userId) throw new Error('Directus did not return a smoke user id.');

    const chapterAssignment = await admin.request('/items/chapter_editor_assignments', {
      method: 'POST',
      body: {
        chapter_slug: options.chapter,
        directus_user_id: cleanup.userId,
        access_level: 'editor',
      },
    });
    cleanup.chapterAssignmentId = chapterAssignment?.data?.id;

    const guildAssignment = await admin.request('/items/guild_editor_assignments', {
      method: 'POST',
      body: {
        guild_slug: options.guild,
        directus_user_id: cleanup.userId,
        access_level: 'editor',
      },
    });
    cleanup.guildAssignmentId = guildAssignment?.data?.id;

    // Permissions v2: no per-user policy setup. The assignment rows above are
    // the entire grant - the role-level "Greenpill Assigned Editor" policy
    // scopes every steward dynamically via $CURRENT_USER.

    const steward = await createDirectusClient({ url: admin.url, token });
    await steward.request('/users/me?fields=id,email');

    const assignmentRead = await steward.request('/items/chapter_editor_assignments?fields=chapter_slug&limit=-1');
    const assignmentSlugs = new Set((assignmentRead?.data ?? []).map((record) => record.chapter_slug));
    if (!assignmentSlugs.has(options.chapter) || assignmentSlugs.has(options.unassignedChapter)) {
      throw new Error('Steward assignment read scope did not match the temporary chapter assignment.');
    }

    await expectForbidden('chapter create', () => steward.request('/items/chapters', {
      method: 'POST',
      body: {
        slug: `directus-smoke-chapter-${id}`,
        name: 'Directus Smoke Chapter',
        publication_status: 'draft',
      },
    }));

    // Scoped editors may edit their own chapter at any publication status,
    // including published. Re-writing the current summary proves the write is
    // permitted without changing live content.
    const assignedChapter = await admin.request(
      `/items/chapters/${encodePathSegment(options.chapter)}?fields=slug,summary,image_file,publication_status`
    );
    const assignedSummary = assignedChapter?.data?.summary ?? null;
    originalImageFile = assignedChapter?.data?.image_file ?? null;
    await steward.request(`/items/chapters/${encodePathSegment(options.chapter)}`, {
      method: 'PATCH',
      body: { summary: assignedSummary },
    });

    uploadedFileId = await uploadChapterImage(
      admin.url,
      token,
      `directus-steward-smoke-${id}.png`
    );
    const privateUnattachedAsset = await fetch(`${admin.url}/assets/${encodePathSegment(uploadedFileId)}`);
    if (![403, 404].includes(privateUnattachedAsset.status)) {
      throw new Error(`unattached chapter image was unexpectedly public with ${privateUnattachedAsset.status}`);
    }
    chapterImageChanged = true;
    await steward.request(`/items/chapters/${encodePathSegment(options.chapter)}`, {
      method: 'PATCH',
      body: { image_file: uploadedFileId },
    });

    const publicAsset = await fetch(`${admin.url}/assets/${encodePathSegment(uploadedFileId)}`);
    if (!publicAsset.ok || !String(publicAsset.headers.get('content-type')).startsWith('image/png')) {
      throw new Error(
        `public chapter image asset failed with ${publicAsset.status} and ${publicAsset.headers.get('content-type')}`
      );
    }
    await publicAsset.arrayBuffer();

    const snapshotResponse = await fetch(`${options.agentUrl}/content/public-snapshot`);
    if (!snapshotResponse.ok) {
      throw new Error(`agent chapter image snapshot failed with ${snapshotResponse.status}`);
    }
    const snapshot = await snapshotResponse.json();
    const snapshotChapter = snapshot?.chapters?.find((chapter) => chapter?.slug === options.chapter);
    const snapshotImagePath = typeof snapshotChapter?.image === 'string'
      ? new URL(snapshotChapter.image).pathname
      : '';
    const expectedImagePath = `/assets/${encodePathSegment(uploadedFileId)}`;
    if (snapshotImagePath !== expectedImagePath || Object.hasOwn(snapshotChapter ?? {}, 'imageFileId')) {
      throw new Error('agent snapshot did not project the uploaded chapter image as a public Directus asset URL.');
    }

    await expectForbidden('unassigned chapter update', () => steward.request(
      `/items/chapters/${encodePathSegment(options.unassignedChapter)}`,
      {
        method: 'PATCH',
        body: { summary: 'Blocked Directus smoke chapter summary.' },
      }
    ));

    // Permissions v2: there is no per-slug preset, so the steward names their
    // chapter explicitly and the dynamic validation checks the assignment.
    await steward.request('/items/chapter_initiatives', {
      method: 'POST',
      body: {
        slug: initiativeSlug,
        chapter_slug: options.chapter,
        title: 'Directus Smoke Initiative',
        summary: 'Temporary scoped access smoke test.',
        publication_status: 'draft',
      },
    });
    cleanup.initiativeCreated = true;

    await steward.request(`/items/chapter_initiatives/${encodePathSegment(initiativeSlug)}`, {
      method: 'PATCH',
      body: {
        summary: 'Temporary scoped access smoke test updated by Steward Editor.',
      },
    });

    // Under the dynamic model a cross-chapter create fails the $CURRENT_USER
    // validation (400) rather than a row-filter 403; both are denials.
    await expectRejected('unassigned chapter initiative create', () => steward.request('/items/chapter_initiatives', {
      method: 'POST',
      body: {
        slug: `${initiativeSlug}-blocked`,
        chapter_slug: options.unassignedChapter,
        title: 'Blocked Directus Smoke Initiative',
        publication_status: 'draft',
      },
    }));

    const updateRequest = await steward.request('/items/chapter_update_requests', {
      method: 'POST',
      body: {
        chapter_slug: options.chapter,
        title: 'Directus Smoke Chapter Update',
        summary: 'Temporary scoped chapter update request smoke test.',
        requested_changes: {
          summary: 'Temporary scoped update request.',
        },
        request_status: 'draft',
      },
    });
    updateRequestId = updateRequest?.data?.id;
    if (!updateRequestId) throw new Error('Directus did not return a chapter update request id.');
    cleanup.updateRequestCreated = true;

    await steward.request('/items/chapter_update_request_links', {
      method: 'POST',
      body: {
        update_request_id: updateRequestId,
        label: 'Directus smoke public link',
        url: 'https://greenpill.network',
        kind: 'website',
      },
    });

    await steward.request('/items/chapter_update_request_proof_signals', {
      method: 'POST',
      body: {
        update_request_id: updateRequestId,
        label: 'Directus smoke proof signal',
        value: '1 request',
        href: 'https://greenpill.network',
      },
    });

    const unassignedUpdateRequest = await admin.request('/items/chapter_update_requests', {
      method: 'POST',
      body: {
        chapter_slug: options.unassignedChapter,
        title: 'Directus Smoke Unassigned Chapter Update',
        summary: 'Temporary unassigned chapter update request smoke test.',
        request_status: 'draft',
      },
    });
    unassignedUpdateRequestId = unassignedUpdateRequest?.data?.id;
    if (!unassignedUpdateRequestId) {
      throw new Error('Directus did not return an unassigned chapter update request id.');
    }

    // Cross-chapter child attach: Directus cannot check parent ownership at
    // create time (relational create validation is unsupported), so the row
    // inserts - but the migration-027 trigger pins it to the PARENT's chapter,
    // which puts it outside the steward's dynamic scope: unreadable and
    // uneditable to them, chapter integrity intact. Assert exactly that.
    const strayLink = await steward.request('/items/chapter_update_request_links', {
      method: 'POST',
      body: {
        update_request_id: unassignedUpdateRequestId,
        label: 'Stray Directus smoke public link',
        url: 'https://greenpill.network',
        kind: 'website',
      },
    });
    const strayLinkId = strayLink?.data?.id;
    if (strayLinkId) {
      const strayAsAdmin = await admin.request(`/items/chapter_update_request_links/${encodePathSegment(strayLinkId)}?fields=chapter_slug`);
      if (strayAsAdmin?.data?.chapter_slug !== options.unassignedChapter) {
        throw new Error('cross-chapter link attach did not inherit the parent request chapter.');
      }
      await expectForbidden('stray link read-back', () => steward.request(
        `/items/chapter_update_request_links/${encodePathSegment(strayLinkId)}?fields=id`
      ));
      await deleteIfPresent(admin, `/items/chapter_update_request_links/${encodePathSegment(strayLinkId)}`);
    }

    await steward.request(`/items/chapter_update_requests/${encodePathSegment(updateRequestId)}`, {
      method: 'PATCH',
      body: {
        request_status: 'pending_review',
      },
    });

    await expectRejected('chapter update request needs_changes create', () => steward.request('/items/chapter_update_requests', {
      method: 'POST',
      body: {
        title: 'Blocked Directus Smoke Chapter Update Status',
        summary: 'Temporary blocked scoped chapter update request status.',
        request_status: 'needs_changes',
      },
    }));

    await expectRejected('unassigned chapter update request create', () => steward.request('/items/chapter_update_requests', {
      method: 'POST',
      body: {
        chapter_slug: options.unassignedChapter,
        title: 'Blocked Directus Smoke Chapter Update',
        summary: 'Temporary blocked scoped chapter update request.',
        request_status: 'draft',
      },
    }));

    await steward.request('/items/projects', {
      method: 'POST',
      body: {
        slug: projectSlug,
        guild_slug: options.guild,
        name: 'Directus Smoke Project',
        summary: 'Temporary scoped access smoke test.',
        publication_status: 'draft',
      },
    });
    cleanup.projectCreated = true;

    await expectRejected('unassigned guild project create', () => steward.request('/items/projects', {
      method: 'POST',
      body: {
        slug: `${projectSlug}-blocked`,
        name: 'Blocked Directus Smoke Project',
        guild_slug: options.unassignedGuild,
        publication_status: 'draft',
      },
    }));

    // Revocation is a pure data operation under permissions v2: deleting the
    // assignment row must remove chapter access immediately, with no policy
    // cleanup step.
    if (cleanup.chapterAssignmentId) {
      await admin.request(
        `/items/chapter_editor_assignments/${encodePathSegment(cleanup.chapterAssignmentId)}`,
        { method: 'DELETE', expected: [204] }
      );
      cleanup.chapterAssignmentId = null;
      await expectForbidden('revoked chapter update', () => steward.request(
        `/items/chapters/${encodePathSegment(options.chapter)}`,
        {
          method: 'PATCH',
          body: { summary: assignedSummary },
        }
      ));
    }

    return {
      url: admin.url,
      email,
      chapter: options.chapter,
      guild: options.guild,
      initiativeSlug,
      projectSlug,
      updateRequestId,
      uploadedFileId,
      agentUrl: options.agentUrl,
    };
  } finally {
    if (chapterImageChanged) {
      await admin.request(`/items/chapters/${encodePathSegment(options.chapter)}`, {
        method: 'PATCH',
        body: { image_file: originalImageFile },
      });
      chapterImageChanged = false;
    }
    if (!options.keep) {
      if (uploadedFileId) {
        await deleteIfPresent(admin, `/files/${encodePathSegment(uploadedFileId)}`);
      }
      if (unassignedUpdateRequestId) {
        await deleteIfPresent(admin, `/items/chapter_update_requests/${encodePathSegment(unassignedUpdateRequestId)}`);
      }
      if (updateRequestId) {
        await deleteIfPresent(admin, `/items/chapter_update_requests/${encodePathSegment(updateRequestId)}`);
      }
      await deleteIfPresent(admin, `/items/chapter_initiatives/${encodePathSegment(initiativeSlug)}`);
      await deleteIfPresent(admin, `/items/projects/${encodePathSegment(projectSlug)}`);
      if (cleanup.chapterAssignmentId) {
        await deleteIfPresent(admin, `/items/chapter_editor_assignments/${encodePathSegment(cleanup.chapterAssignmentId)}`);
      }
      if (cleanup.guildAssignmentId) {
        await deleteIfPresent(admin, `/items/guild_editor_assignments/${encodePathSegment(cleanup.guildAssignmentId)}`);
      }
      if (cleanup.userId) {
        await deleteIfPresent(admin, `/users/${encodePathSegment(cleanup.userId)}`);
      }
    }
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const result = await runDirectusStewardSmoke(options);
  console.log(`Directus steward smoke passed at ${result.url}`);
  console.log(`Temporary user: ${result.email}`);
  console.log(`Assigned chapter: ${result.chapter}`);
  console.log(`Assigned guild: ${result.guild}`);
  console.log(`Temporary initiative: ${result.initiativeSlug}`);
  console.log(`Temporary project: ${result.projectSlug}`);
  console.log(`Temporary chapter update request: ${result.updateRequestId}`);
  console.log(`Uploaded chapter image: ${result.uploadedFileId}`);
  console.log(`Agent snapshot: ${result.agentUrl}/content/public-snapshot`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
