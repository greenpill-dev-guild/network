#!/usr/bin/env bun

import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import {
  DIRECTUS_CHAPTER_IMAGE_FOLDER_ID,
  createDirectusClient,
} from './directus-operational-content-setup.ts';
import { formGroupAliases } from './directus-form-groups.ts';

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

// Data Studio's required check only counts null as missing. An alt text field
// it requires has to reach it nullable and with no default, or a field left
// untouched passes the check. Directus caches the column shape, so after a
// migration it serves the old one, and this fails, until the Studio setup is
// re-applied, the system cache is cleared, or Directus restarts.
const REQUIRED_ALT_TEXT_FIELDS = Object.freeze([
  ['chapters', 'image_alt'],
  ['chapter_update_requests', 'proposed_image_alt'],
]);

export async function assertAltTextCanBeRequired(client) {
  for (const [collection, field] of REQUIRED_ALT_TEXT_FIELDS) {
    const response = await client.request(`/fields/${encodePathSegment(collection)}/${encodePathSegment(field)}`);
    const schema = response?.data?.schema;
    if (schema?.is_nullable !== true || (schema?.default_value ?? null) !== null) {
      throw new Error(
        `Directus sees ${collection}.${field} as not nullable or with a default, so Data Studio cannot require it. Apply the database migrations, then re-run directus:studio:setup or clear the Directus system cache (POST /utils/cache/clear?system).`
      );
    }
  }
}

// The steward landing bookmarks, run as the steward with their stored filters:
// each "My ..." view must open on the steward's own assigned records and on
// nothing outside them. Bookmarks without an assignment filter (reference and
// status views) are left to the read permissions checked elsewhere.
const STEWARD_LANDING_SCOPES: Readonly<Record<string, { field: string; scope: 'chapter' | 'guild' }>> = Object.freeze({
  chapters: { field: 'slug', scope: 'chapter' },
  chapter_initiatives: { field: 'chapter_slug', scope: 'chapter' },
  chapter_impact_snapshots: { field: 'chapter_slug', scope: 'chapter' },
  guilds: { field: 'slug', scope: 'guild' },
  projects: { field: 'guild_slug', scope: 'guild' },
});
const STEWARD_LANDING_ENTRY_POINTS = Object.freeze(['My chapter', 'My guild']);

export async function assertStewardLandingBookmarks(
  steward,
  options: Pick<SmokeOptions, 'chapter' | 'guild'>
) {
  const presets = await steward.request('/presets?fields=bookmark,collection,filter&filter[bookmark][_nnull]=true&limit=-1');
  const bookmarks = (presets?.data ?? []) as Array<{ bookmark: string; collection: string; filter: unknown }>;
  const names = new Set(bookmarks.map((bookmark) => bookmark.bookmark));
  for (const name of STEWARD_LANDING_ENTRY_POINTS) {
    if (!names.has(name)) throw new Error(`Steward landing bookmark "${name}" is missing. Re-run directus:studio:setup.`);
  }

  for (const bookmark of bookmarks) {
    const target = STEWARD_LANDING_SCOPES[bookmark.collection.replace(/^content[._]|^impact[._]/, '')];
    const scoped = JSON.stringify(bookmark.filter ?? {}).includes('$CURRENT_USER');
    // Without the assignment filter, My chapter and My guild would open on
    // every published record the steward can read.
    if (!scoped && STEWARD_LANDING_ENTRY_POINTS.includes(bookmark.bookmark)) {
      throw new Error(`Steward landing bookmark "${bookmark.bookmark}" does not filter by the steward's assignments.`);
    }
    if (!target || !scoped) continue;
    const params = new URLSearchParams();
    params.set('filter', JSON.stringify(bookmark.filter));
    params.set('fields', target.field);
    params.set('limit', '-1');
    const rows = (await steward.request(`/items/${encodePathSegment(bookmark.collection)}?${params.toString()}`))?.data ?? [];
    const expected = target.scope === 'chapter' ? options.chapter : options.guild;
    const outside = rows.filter((row) => row[target.field] !== expected);
    if (outside.length > 0) {
      throw new Error(`Steward bookmark "${bookmark.bookmark}" shows ${outside.length} record(s) outside the steward's ${target.scope}.`);
    }
    if (STEWARD_LANDING_ENTRY_POINTS.includes(bookmark.bookmark) && rows.length === 0) {
      throw new Error(`Steward bookmark "${bookmark.bookmark}" does not show the steward's assigned ${target.scope}.`);
    }
  }
}

// Data Studio leaves out every field whose form group the viewer cannot read,
// and disables every field whose group the viewer cannot update. Without the
// group aliases a steward opens their guild to an empty form and their chapter
// to its first group only, read-only. The lists are the one-to-many fields the
// steward guide sends them to. A steward edits the links and proof signals of
// their own change request in place (PRD-1443); the other lists are read-only.
const STEWARD_FORM_LISTS: Readonly<Record<string, readonly string[]>> = Object.freeze({
  chapters: ['initiatives'],
  guilds: ['projects'],
  chapter_update_requests: ['links', 'proof_signals'],
});
const STEWARD_EDITABLE_FORM_LISTS: Readonly<Record<string, readonly string[]>> = Object.freeze({
  chapter_update_requests: ['links', 'proof_signals'],
});

export async function assertStewardFormsReadable(steward) {
  const own = (await steward.request('/permissions/me'))?.data ?? {};
  for (const [collection, lists] of Object.entries(STEWARD_FORM_LISTS)) {
    const fields = ((await steward.request(`/fields/${encodePathSegment(collection)}`))?.data ?? []) as Array<{
      field: string;
      meta?: { group?: string | null } | null;
    }>;
    const readable = new Set(fields.map((field) => field.field));
    // Every group the Studio setup creates, and any group a readable field
    // names: a group hidden together with all its members leaves no trace in
    // the fields the steward can read.
    const unreadableGroups = [...new Set([
      ...formGroupAliases(collection),
      ...fields.map((field) => field.meta?.group).filter((group): group is string => Boolean(group)),
    ])].filter((group) => !readable.has(group));
    if (unreadableGroups.length > 0) {
      throw new Error(
        `Stewards cannot read the ${collection} form group(s) ${unreadableGroups.join(', ')}, so Data Studio hides the fields in them. Re-run directus:content:setup.`
      );
    }
    const missingLists = lists.filter((field) => !readable.has(field));
    if (missingLists.length > 0) {
      throw new Error(`Stewards cannot read the ${collection} list field(s) ${missingLists.join(', ')}. Re-run directus:content:setup.`);
    }
    const writable = new Set<string>(own?.[collection]?.update?.fields ?? []);
    if (writable.has('*')) continue;
    const readOnlyLists = (STEWARD_EDITABLE_FORM_LISTS[collection] ?? []).filter((field) => !writable.has(field));
    if (readOnlyLists.length > 0) {
      throw new Error(
        `Stewards cannot edit the ${collection} list field(s) ${readOnlyLists.join(', ')}, so Data Studio shows them read-only. Re-run directus:content:setup.`
      );
    }
    const disabledGroups = [...new Set(fields
      .filter((field) => field.meta?.group && writable.has(field.field) && !writable.has(field.meta.group))
      .map((field) => field.meta?.group as string))];
    if (disabledGroups.length > 0) {
      throw new Error(
        `Stewards can update ${collection} fields in ${disabledGroups.join(', ')} but not the group itself, so Data Studio shows them disabled. Re-run directus:content:setup.`
      );
    }
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

// Links and proof signals on a change request, as an admin sees them.
async function changeRequestChildRowCount(admin, requestId: string) {
  let count = 0;
  for (const collection of ['chapter_update_request_links', 'chapter_update_request_proof_signals']) {
    const params = new URLSearchParams({ 'filter[update_request_id][_eq]': requestId, fields: 'id', limit: '-1' });
    count += ((await admin.request(`/items/${collection}?${params.toString()}`))?.data ?? []).length;
  }
  return count;
}

async function deleteIfPresent(client, path: string) {
  await client.request(path, {
    method: 'DELETE',
    expected: [204, 404],
  });
}

const RAW_FETCH_TIMEOUT_MS = 30_000;

function fetchWithDeadline(url: string, init: RequestInit = {}) {
  return fetch(url, { ...init, signal: AbortSignal.timeout(RAW_FETCH_TIMEOUT_MS) });
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

  const response = await fetchWithDeadline(`${url}/files`, {
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
  // Ctrl-C stops the run at its next step, never in the middle of one. The
  // request in flight finishes and records what it created; only then does the
  // cleanup put the chapter back, so a late write cannot land after the restore.
  let interruptedBy: NodeJS.Signals | null = null;
  const onInterrupt = (signal: NodeJS.Signals) => {
    if (interruptedBy) return;
    interruptedBy = signal;
    console.error('Interrupted. Finishing the current request, then restoring the chapter and removing temporary records.');
  };
  const stopIfInterrupted = () => {
    if (interruptedBy) throw new Error(`Directus steward smoke interrupted by ${interruptedBy}.`);
  };
  const asStep = <Client extends { request: (...args: any[]) => Promise<any> }>(client: Client): Client => ({
    ...client,
    request: (...args: any[]) => {
      stopIfInterrupted();
      return client.request(...args);
    },
  });
  const fetchStep = (url: string) => {
    stopIfInterrupted();
    return fetchWithDeadline(url);
  };
  // The cleanup must keep working after an interrupt, so it uses this client directly.
  const cleanupAdmin = await createDirectusClient();
  const admin = asStep(cleanupAdmin);
  const roleId = await getRoleId(admin, 'Greenpill Steward Editor');
  const id = randomUUID().slice(0, 8);
  const email = `directus-smoke-${id}@${options.emailDomain}`;
  const token = tokenValue();
  const initiativeSlug = `directus-smoke-initiative-${id}`;
  const projectSlug = `directus-smoke-project-${id}`;
  let updateRequestId: string | null = null;
  let unassignedUpdateRequestId: string | null = null;
  let decidedUpdateRequestId: string | null = null;
  let uploadedFileId: string | null = null;
  let originalImageFile: string | null = null;
  let originalImageAlt: string | null = null;
  let originalImageCredit: string | null = null;
  let chapterImageChanged = false;
  const chapterImageFields = async () => {
    const chapter = await cleanupAdmin.request(
      `/items/chapters/${encodePathSegment(options.chapter)}?fields=image_file,image_alt,image_credit`
    );
    return {
      file: chapter?.data?.image_file ?? null,
      alt: chapter?.data?.image_alt ?? null,
      credit: chapter?.data?.image_credit ?? null,
    };
  };
  const restoreChapterImage = async () => {
    await cleanupAdmin.request(`/items/chapters/${encodePathSegment(options.chapter)}`, {
      method: 'PATCH',
      body: {
        image_file: originalImageFile,
        image_alt: originalImageAlt,
        image_credit: originalImageCredit,
      },
    });
    const restored = await chapterImageFields();
    if (
      restored.file !== originalImageFile ||
      restored.alt !== originalImageAlt ||
      restored.credit !== originalImageCredit
    ) {
      throw new Error(
        `Chapter ${options.chapter} did not return to its original image, alt text, and credit. Check it in Directus.`
      );
    }
    chapterImageChanged = false;
  };
  const cleanup = {
    userId: null,
    chapterAssignmentId: null,
    guildAssignmentId: null,
    initiativeCreated: false,
    projectCreated: false,
    updateRequestCreated: false,
  };

  const restoreAndRemoveTemporaryRecords = async () => {
    // A failed restore must not stop the temporary user, file, and rows from
    // being removed; it is reported once they are gone.
    let restoreError: unknown = null;
    if (chapterImageChanged) {
      try {
        await restoreChapterImage();
      } catch (error) {
        restoreError = error;
      }
    }
    if (!options.keep) {
      if (uploadedFileId) {
        await deleteIfPresent(cleanupAdmin, `/files/${encodePathSegment(uploadedFileId)}`);
      }
      if (unassignedUpdateRequestId) {
        await deleteIfPresent(cleanupAdmin, `/items/chapter_update_requests/${encodePathSegment(unassignedUpdateRequestId)}`);
      }
      if (decidedUpdateRequestId) {
        await deleteIfPresent(cleanupAdmin, `/items/chapter_update_requests/${encodePathSegment(decidedUpdateRequestId)}`);
      }
      if (updateRequestId) {
        await deleteIfPresent(cleanupAdmin, `/items/chapter_update_requests/${encodePathSegment(updateRequestId)}`);
      }
      await deleteIfPresent(cleanupAdmin, `/items/chapter_initiatives/${encodePathSegment(initiativeSlug)}`);
      await deleteIfPresent(cleanupAdmin, `/items/projects/${encodePathSegment(projectSlug)}`);
      if (cleanup.chapterAssignmentId) {
        await deleteIfPresent(cleanupAdmin, `/items/chapter_editor_assignments/${encodePathSegment(cleanup.chapterAssignmentId)}`);
      }
      if (cleanup.guildAssignmentId) {
        await deleteIfPresent(cleanupAdmin, `/items/guild_editor_assignments/${encodePathSegment(cleanup.guildAssignmentId)}`);
      }
      if (cleanup.userId) {
        await deleteIfPresent(cleanupAdmin, `/users/${encodePathSegment(cleanup.userId)}`);
      }
    }
    if (restoreError) throw restoreError;
  };
  // Stays installed until the cleanup is done, so a second Ctrl-C cannot cut
  // the restore short.
  process.on('SIGINT', onInterrupt);
  process.on('SIGTERM', onInterrupt);

  await assertContentExists(admin, 'chapters', options.chapter);
  await assertContentExists(admin, 'chapters', options.unassignedChapter);
  await assertContentExists(admin, 'guilds', options.guild);
  await assertContentExists(admin, 'guilds', options.unassignedGuild);
  await assertAltTextCanBeRequired(admin);

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

    const steward = asStep(await createDirectusClient({ url: admin.url, token }));
    await steward.request('/users/me?fields=id,email');

    // Data Studio cannot render its chapter selector when Directus filters out
    // this relation (including when the inverse alias is not readable).
    const chapterRelation = await steward.request('/relations/chapter_update_requests/chapter_slug');
    if (chapterRelation?.data?.related_collection !== 'chapters') {
      throw new Error('The steward chapter selector relation is unavailable. Re-run directus:content:setup.');
    }
    const chapterFields = (await steward.request('/fields/chapters'))?.data ?? [];
    for (const field of ['slug', 'name']) {
      const identityField = chapterFields.find((candidate) => candidate.field === field);
      const group = identityField?.meta?.group;
      if (!identityField || (group && !chapterFields.some((candidate) => candidate.field === group))) {
        throw new Error('The chapter picker identity fields or their group are unavailable. Re-run directus:content:setup.');
      }
    }
    await assertStewardFormsReadable(steward);

    const assignmentRead = await steward.request('/items/chapter_editor_assignments?fields=chapter_slug&limit=-1');
    const assignmentSlugs = new Set((assignmentRead?.data ?? []).map((record) => record.chapter_slug));
    if (!assignmentSlugs.has(options.chapter) || assignmentSlugs.has(options.unassignedChapter)) {
      throw new Error('Steward assignment read scope did not match the temporary chapter assignment.');
    }

    // The operator dashboard and the publish-health row are for Trusted
    // Publishers. Without dashboard read access Data Studio shows a steward no
    // Insights module at all.
    await expectForbidden('operator dashboard read', () => steward.request('/dashboards?fields=id&limit=1'));
    await expectForbidden('dashboard panel read', () => steward.request('/panels?fields=id&limit=1'));
    await expectForbidden('publish health read', () => steward.request('/items/publish_health?fields=id&limit=1'));
    await assertStewardLandingBookmarks(steward, options);

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
      `/items/chapters/${encodePathSegment(options.chapter)}?fields=slug,summary,image_file,image_alt,image_credit,publication_status`
    );
    const assignedSummary = assignedChapter?.data?.summary ?? null;
    originalImageFile = assignedChapter?.data?.image_file ?? null;
    originalImageAlt = assignedChapter?.data?.image_alt ?? null;
    originalImageCredit = assignedChapter?.data?.image_credit ?? null;
    await steward.request(`/items/chapters/${encodePathSegment(options.chapter)}`, {
      method: 'PATCH',
      body: { summary: assignedSummary },
    });

    stopIfInterrupted();
    uploadedFileId = await uploadChapterImage(
      admin.url,
      token,
      `directus-steward-smoke-${id}.png`
    );
    const privateUnattachedAsset = await fetchStep(`${admin.url}/assets/${encodePathSegment(uploadedFileId)}`);
    if (![403, 404].includes(privateUnattachedAsset.status)) {
      throw new Error(`unattached chapter image was unexpectedly public with ${privateUnattachedAsset.status}`);
    }
    // A steward attaches the upload together with its alt text and credit.
    const smokeImageAlt = `Directus steward smoke image ${id}`;
    const smokeImageCredit = 'Directus steward smoke';
    chapterImageChanged = true;
    await steward.request(`/items/chapters/${encodePathSegment(options.chapter)}`, {
      method: 'PATCH',
      body: {
        image_file: uploadedFileId,
        image_alt: smokeImageAlt,
        image_credit: smokeImageCredit,
      },
    });

    const publicAsset = await fetchStep(`${admin.url}/assets/${encodePathSegment(uploadedFileId)}`);
    if (!publicAsset.ok || !String(publicAsset.headers.get('content-type')).startsWith('image/png')) {
      throw new Error(
        `public chapter image asset failed with ${publicAsset.status} and ${publicAsset.headers.get('content-type')}`
      );
    }
    await publicAsset.arrayBuffer();

    const snapshotResponse = await fetchStep(`${options.agentUrl}/content/public-snapshot`);
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
    if (
      snapshotChapter?.media?.imageAlt !== smokeImageAlt ||
      snapshotChapter?.media?.imageCredit !== smokeImageCredit ||
      snapshotChapter?.media?.imageSourceUrl
    ) {
      throw new Error('agent snapshot did not pair the uploaded chapter image with its own alt text and credit.');
    }

    // Taking the upload off without sending any text must not leave its
    // description behind. A chapter that showed a sourced image gets that
    // image's own description back; one that had another upload shows that
    // file with nothing describing it yet.
    await steward.request(`/items/chapters/${encodePathSegment(options.chapter)}`, {
      method: 'PATCH',
      body: { image_file: originalImageFile },
    });
    const reverted = await chapterImageFields();
    const expectedAlt = originalImageFile ? null : originalImageAlt;
    const expectedCredit = originalImageFile ? null : originalImageCredit;
    if (reverted.alt !== expectedAlt || reverted.credit !== expectedCredit) {
      throw new Error('removing the uploaded chapter image left the wrong alt text or credit behind.');
    }

    // Put the real image and its metadata back before the slower checks below:
    // a publish-triggered site build must not capture the smoke image.
    await restoreChapterImage();

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

    // The request form adds rows through the request itself (PRD-1443).
    await steward.request(`/items/chapter_update_requests/${encodePathSegment(updateRequestId)}`, {
      method: 'PATCH',
      body: {
        links: {
          create: [{ label: 'Directus smoke form link', url: 'https://greenpill.network/form', kind: 'website' }],
          update: [],
          delete: [],
        },
      },
    });
    if (await changeRequestChildRowCount(admin, updateRequestId) !== 3) {
      throw new Error('The steward could not add a link and a proof signal to their own change request, directly and through the form.');
    }
    // Removing a row in the form deletes it: the relation's deselect action
    // must be delete, since clearing the NOT NULL link to the request fails.
    const formLinks = await admin.request(`/items/chapter_update_request_links?${new URLSearchParams({
      'filter[update_request_id][_eq]': updateRequestId,
      'filter[label][_eq]': 'Directus smoke form link',
      fields: 'id',
      limit: '-1',
    }).toString()}`);
    const formLinkId = formLinks?.data?.[0]?.id;
    if (!formLinkId) throw new Error('The link added through the request form is missing.');
    await steward.request(`/items/chapter_update_requests/${encodePathSegment(updateRequestId)}`, {
      method: 'PATCH',
      body: { links: { create: [], update: [], delete: [formLinkId] } },
    });
    if (await changeRequestChildRowCount(admin, updateRequestId) !== 2) {
      throw new Error('Removing a link in the request form did not delete it. Re-run directus:content:setup.');
    }

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

    // Making the inverse alias readable must not expose another chapter's
    // private requests through a published chapter reference.
    const nestedRequests = await steward.request(
      `/items/chapters?${filterByField('slug', options.unassignedChapter)}&fields=slug,update_requests.id`
    );
    if ((nestedRequests?.data ?? []).some((chapter) => (
      (chapter.update_requests ?? []).some((request) => request.id === unassignedUpdateRequestId)
    ))) {
      throw new Error('The chapter relation exposed an unassigned update request.');
    }

    // A steward attaches links and proof signals only to requests of their own
    // chapters (PRD-1443). Directus checks that at create time against the
    // steward's own request ids; nothing reaches the other chapter's request.
    const strayRows = [
      ['chapter_update_request_links', { label: 'Stray Directus smoke public link', url: 'https://greenpill.network', kind: 'website' }],
      ['chapter_update_request_proof_signals', { label: 'Stray Directus smoke proof signal', value: '1 request' }],
    ] as const;
    for (const [collection, row] of strayRows) {
      await expectRejected(`cross-chapter ${collection} create`, () => steward.request(`/items/${collection}`, {
        method: 'POST',
        body: { ...row, update_request_id: unassignedUpdateRequestId },
      }));
    }
    if (await changeRequestChildRowCount(admin, unassignedUpdateRequestId) > 0) {
      throw new Error('A steward attached a link or proof signal to another chapter\'s change request. Re-run directus:content:setup.');
    }

    // A decided request takes no new rows, even on the steward's own chapter
    // (migration 034). Created as archived, it queues no review notification.
    const decidedUpdateRequest = await admin.request('/items/chapter_update_requests', {
      method: 'POST',
      body: {
        chapter_slug: options.chapter,
        title: 'Directus Smoke Decided Chapter Update',
        summary: 'Temporary decided chapter update request smoke test.',
        request_status: 'archived',
      },
    });
    decidedUpdateRequestId = decidedUpdateRequest?.data?.id;
    if (!decidedUpdateRequestId) throw new Error('Directus did not return a decided chapter update request id.');
    for (const [collection, row] of strayRows) {
      // The database refuses the row; Directus reports that to a non-admin as a 500.
      await expectRejected(`decided request ${collection} create`, () => steward.request(`/items/${collection}`, {
        method: 'POST',
        body: { ...row, update_request_id: decidedUpdateRequestId },
      }), [400, 403, 500]);
    }
    if (await changeRequestChildRowCount(admin, decidedUpdateRequestId) > 0) {
      throw new Error('A decided change request took a new link or proof signal. Apply migration 034.');
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
    try {
      await restoreAndRemoveTemporaryRecords();
    } finally {
      process.off('SIGINT', onInterrupt);
      process.off('SIGTERM', onInterrupt);
    }
    if (interruptedBy) process.exit(interruptedBy === 'SIGINT' ? 130 : 143);
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
