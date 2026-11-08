import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { buildDirectusOperationalPermissionPlan } from './directus-operational-content-setup.ts';
import {
  DIRECTUS_STUDIO_OPTIONAL_COLLECTIONS,
  applyExtraGroupMembers,
  buildDirectusStudioBookmarkPlan,
  buildDirectusStudioMetadataPlan,
  nonBlankValidation,
  textFieldStorageProblems,
} from './directus-studio-setup.ts';

test('group assignment skips only a field Directus confirms missing, and stops on any other failure', async () => {
  const member = { collection: 'chapters', field: 'initiatives', meta: { group: 'group_story' } };
  // fieldRead: what GET /fields/chapters/initiatives does; listed: the fields
  // GET /fields/chapters returns.
  const directus = (fieldRead: () => unknown, listed: string[] = []) => {
    const patches: string[] = [];
    return {
      patches,
      request: async (path: string, init: { method?: string } = {}) => {
        if (init.method === 'PATCH') {
          patches.push(path);
          return { data: {} };
        }
        if (path.startsWith('/fields/chapters?')) return { data: listed.map((field) => ({ field })) };
        return fieldRead();
      },
    };
  };
  const failing = (message: string) => () => { throw new Error(message); };

  // Directus answers 403 for a field that does not exist: skipped once the field list agrees.
  const missing = directus(failing('GET /fields/chapters/initiatives failed with 403: forbidden'));
  await applyExtraGroupMembers(missing, [member]);
  assert.deepEqual(missing.patches, []);

  // A 403 on a field that exists is a permission problem, not a missing field.
  await assert.rejects(
    applyExtraGroupMembers(directus(failing('GET /fields/chapters/initiatives failed with 403: forbidden'), ['initiatives']), [member]),
    /failed with 403/
  );
  // A server error or a network failure stops the setup instead of skipping labels.
  await assert.rejects(applyExtraGroupMembers(directus(failing('GET /fields/chapters/initiatives failed with 503: unavailable')), [member]), /503/);
  await assert.rejects(applyExtraGroupMembers(directus(failing('fetch failed')), [member]), /fetch failed/);

  // A readable field gets its group.
  const present = directus(() => ({ data: { meta: { translations: null } } }));
  await applyExtraGroupMembers(present, [member]);
  assert.deepEqual(present.patches, ['/fields/chapters/initiatives']);
});

test('Directus Studio metadata plan hides assignment collections and labels content collections', () => {
  const plan = buildDirectusStudioMetadataPlan(
    ['chapters', 'chapter_initiatives', 'guilds', 'projects'],
    ['chapter_editor_assignments', 'guild_editor_assignments'],
    [
      'chapter_update_requests',
      'chapter_update_request_links',
      'chapter_update_request_proof_signals',
    ],
    ['map_node_submissions', 'map_node_moderation_notifications', 'map_node_moderation_access_links']
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
  const mapNodeAccessLinks = plan.collections.find((collection) => (
    collection.collection === 'map_node_moderation_access_links'
  ));
  const chapterSummary = plan.fields.find((field) => field.collection === 'chapters' && field.field === 'summary');
  const chapterImage = plan.fields.find((field) => field.collection === 'chapters' && field.field === 'image_file');
  const legacyChapterImage = plan.fields.find((field) => field.collection === 'chapters' && field.field === 'image');
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
  assert.equal(mapNodeAccessLinks?.meta.hidden, true);
  assert.equal((chapterSummary?.meta as any).interface, 'input-multiline');
  assert.equal((chapterImage?.meta as any).interface, 'file-image');
  assert.deepEqual((chapterImage?.meta as any).special, ['file']);
  assert.equal((legacyChapterImage?.meta as any).hidden, true);
  assert.equal((legacyChapterImage?.meta as any).readonly, true);
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

test('chapter image alt text and credit sit under the upload and alt text is required with it', () => {
  const plan = buildDirectusStudioMetadataPlan();
  const chapterField = (name: string) => plan.fields.find((field) => (
    field.collection === 'chapters' && field.field === name
  ));
  const imageFile = chapterField('image_file');
  const imageAlt = chapterField('image_alt');
  const imageCredit = chapterField('image_credit');

  for (const field of [imageFile, imageAlt, imageCredit]) {
    assert.equal(field?.meta.group, 'group_links_media');
    assert.equal(field?.meta.hidden, false);
  }
  assert.equal(Number(imageFile?.meta.sort) < Number(imageAlt?.meta.sort), true);
  assert.equal(Number(imageAlt?.meta.sort) < Number(imageCredit?.meta.sort), true);
  const english = (field) => (field?.meta.translations ?? []).filter((entry) => entry.language === 'en-US');
  assert.deepEqual(english(imageAlt), [{ language: 'en-US', translation: 'Image alt text' }]);
  assert.deepEqual(english(imageCredit), [{ language: 'en-US', translation: 'Image credit' }]);
  assert.deepEqual(imageAlt?.meta.conditions, [
    {
      name: 'Alt text required with an uploaded image',
      rule: { image_file: { _nnull: true } },
      required: true,
    },
  ]);
});

// How Data Studio 11.17 reads a field condition: every field the rule names
// must be present, `_nnull` refuses only null, and `_nempty` refuses only ''.
function conditionMatches(rule: Record<string, any>, item: Record<string, unknown>): boolean {
  const [key, value] = Object.entries(rule)[0];
  if (key === '_and') return (value as Array<Record<string, any>>).every((part) => conditionMatches(part, item));
  const [operator, operand] = Object.entries(value as Record<string, unknown>)[0];
  const actual = item[key];
  if (actual === undefined) return false;
  if (operator === '_nnull') return actual !== null;
  if (operator === '_nempty') return actual !== '';
  if (operator === '_nin') return !(operand as unknown[]).includes(actual);
  throw new Error(`conditionMatches does not know ${operator}`);
}

test('a proposed image needs alt text unless a reviewer is sending the request back', () => {
  const plan = buildDirectusStudioMetadataPlan();
  const requestField = (name: string) => plan.fields.find((field) => (
    field.collection === 'chapter_update_requests' && field.field === name
  ));
  const conditions = requestField('proposed_image_alt')?.meta.conditions as Array<{
    rule: Record<string, any>;
    required: boolean;
  }>;
  assert.equal(conditions.length, 1);
  const [{ rule, required }] = conditions;
  assert.equal(required, true);
  // Data Studio skips a condition whose rule has more than one top-level key.
  assert.equal(Object.keys(rule).length, 1);

  const image = 'https://example.org/photo.jpg';
  const needsAlt = (item: Record<string, unknown>) => conditionMatches(rule, item);
  for (const request_status of ['draft', 'pending_review', 'accepted']) {
    assert.equal(needsAlt({ proposed_image: image, request_status }), true, request_status);
  }
  for (const request_status of ['needs_changes', 'declined', 'archived']) {
    assert.equal(needsAlt({ proposed_image: image, request_status }), false, request_status);
  }
  // No image proposed: '' is the stored empty value, and null is what an
  // emptied input holds when it does not save an empty string.
  assert.equal(needsAlt({ proposed_image: '', request_status: 'draft' }), false);
  assert.equal(needsAlt({ proposed_image: null, request_status: 'draft' }), false);

  // Emptying the image saves '', which the column accepts. Directus refuses null.
  assert.deepEqual(requestField('proposed_image')?.meta.options, { iconRight: 'link', clear: true });
});

test('every content notification kind has a Data Studio label', async () => {
  // The newest migration that defines the kind constraint is the authority.
  const migrationsDir = resolve(dirname(fileURLToPath(import.meta.url)), '../packages/agent/migrations');
  let allowedKinds: string[] = [];
  for (const file of (await readdir(migrationsDir)).filter((name) => name.endsWith('.sql')).sort()) {
    const migration = await readFile(resolve(migrationsDir, file), 'utf8');
    const constraint = [...migration.matchAll(/content_review_notification_kind_check\s+check \(kind in \(([^)]*)\)\)/g)].at(-1);
    if (constraint) allowedKinds = [...constraint[1].matchAll(/'([a-z_]+)'/g)].map((match) => match[1]);
  }
  assert.ok(allowedKinds.includes('chapter_image_withheld'));

  const plan = buildDirectusStudioMetadataPlan(['review_notifications'], [], [], []);
  const kind = plan.fields.find((field) => field.collection === 'review_notifications' && field.field === 'kind');
  const labelled = (kind?.meta.options as { choices: Array<{ value: string }> }).choices.map((choice) => choice.value);

  assert.deepEqual([...labelled].sort(), [...allowedKinds].sort());
});

test('the quarantine bookmark lists records still missing from the site, through fields publishers can read', () => {
  const plan = buildDirectusStudioMetadataPlan(['review_notifications'], [], [], []);
  const resolvedAt = plan.fields.find((field) => field.collection === 'review_notifications' && field.field === 'resolved_at');
  assert.equal(resolvedAt?.meta.interface, 'datetime');
  assert.equal(resolvedAt?.meta.readonly, true);

  const quarantined = buildDirectusStudioBookmarkPlan(['review_notifications'])
    .find((bookmark) => bookmark.bookmark === 'Quarantined records');
  // A resolved alert is history. The working list is what is missing right now.
  assert.deepEqual(quarantined?.filter, {
    _and: [{ kind: { _eq: 'record_quarantined' } }, { resolved_at: { _null: true } }],
  });

  // Directus refuses a filter or a column on a field the role cannot read.
  const publisherRead = buildDirectusOperationalPermissionPlan(undefined, [], [], [], ['review_notifications'])
    .permissions.find((permission) => (
      permission.role === quarantined?.role &&
      permission.collection === 'review_notifications' &&
      permission.action === 'read'
    ));
  const filteredFields = (quarantined?.filter as { _and: Array<Record<string, unknown>> })._and
    .flatMap((rule) => Object.keys(rule));
  for (const field of [...filteredFields, ...(quarantined?.layout_query.tabular.fields ?? [])]) {
    assert.ok(publisherRead?.fields.includes(field), `publishers cannot read review_notifications.${field}`);
  }
});

// How Data Studio 11.17 decides that a required field is missing (validateItem
// in the app). The form starts from the column default. On a new item it wants
// the field present only when the column has no default, and it refuses only
// null, so a blank string or spaces count as filled in.
function dataStudioFindsMissing(
  meta: { required?: boolean },
  columnDefault: unknown,
  edits: { value?: unknown },
  isNew: boolean
): boolean {
  if (meta.required !== true) return false;
  const item = { ...(columnDefault === null ? {} : { value: columnDefault }), ...edits };
  if (isNew && columnDefault === null && item.value === undefined) return true;
  return item.value === null;
}

test('Data Studio misses an untouched required field whenever its column defaults to blank', () => {
  const required = { required: true };

  // The defect: the column default fills the field, so the form lets it through.
  assert.equal(dataStudioFindsMissing(required, '', {}, true), false);
  assert.equal(dataStudioFindsMissing(required, '', { value: '   ' }, true), false);
  // Without a default, an untouched or emptied field is caught before saving.
  assert.equal(dataStudioFindsMissing(required, null, {}, true), true);
  assert.equal(dataStudioFindsMissing(required, null, { value: null }, true), true);
  assert.equal(dataStudioFindsMissing(required, null, { value: null }, false), true);
  assert.equal(dataStudioFindsMissing(required, null, { value: 'Refresh links' }, true), false);
  // Spaces still count as filled in, which is why required text also refuses them.
  assert.equal(dataStudioFindsMissing(required, null, { value: '   ' }, true), false);
});

const studioField = (plan: ReturnType<typeof buildDirectusStudioMetadataPlan>, collection: string, field: string) => (
  plan.fields.find((planned) => planned.collection === collection && planned.field === field)?.meta as
    Record<string, any> | undefined
);

test('required text fields refuse a missing, emptied, or blank value', () => {
  const plan = buildDirectusStudioMetadataPlan();
  const required = [
    // A blank default let these through untouched (migration 033 drops it).
    ['chapter_update_requests', 'title'],
    ['chapter_update_requests', 'summary'],
    ['chapter_update_request_links', 'label'],
    ['chapter_update_request_links', 'url'],
    ['chapter_update_request_proof_signals', 'label'],
    ['chapter_update_request_proof_signals', 'value'],
    // NOT NULL with no default all along, now marked required in the form.
    ['themes', 'slug'],
    ['themes', 'name'],
    ['people', 'slug'],
    ['people', 'display_name'],
    ['chapters', 'slug'],
    ['chapters', 'name'],
    ['chapter_initiatives', 'slug'],
    ['chapter_initiatives', 'title'],
    ['guilds', 'slug'],
    ['guilds', 'name'],
    ['guilds', 'type'],
    ['projects', 'slug'],
    ['projects', 'name'],
  ];
  for (const [collection, field] of required) {
    const meta = studioField(plan, collection, field);
    assert.equal(meta?.required, true, `${collection}.${field} is not required`);
    assert.notEqual(meta?.options?.clear, true, `${collection}.${field} saves an emptied field as ''`);
    assert.deepEqual(
      { validation: meta?.validation, validation_message: meta?.validation_message },
      nonBlankValidation(field),
      `${collection}.${field} accepts spaces alone`
    );
  }

  // Every required field a person types text into gets the same treatment.
  for (const { collection, field, meta } of plan.fields) {
    const typed = ['input', 'input-multiline'].includes(meta.interface as string) &&
      (meta.options as Record<string, unknown> | null)?.type !== 'number' &&
      meta.hidden !== true &&
      meta.readonly !== true;
    if (meta.required !== true || !typed) continue;
    assert.ok(meta.validation, `${collection}.${field} is required but accepts spaces alone`);
    assert.notEqual((meta.options as Record<string, unknown> | null)?.clear, true, `${collection}.${field}`);
  }
});

test('the non-blank rule refuses spaces alone and accepts any visible text', () => {
  const { validation } = nonBlankValidation('title');
  // Data Studio applies a field's validation itself only through its `_and` parts.
  assert.deepEqual(Object.keys(validation), ['_and']);
  const pattern = new RegExp(validation._and[0].title._regex);
  for (const blank of [' ', '   ', '\t', '\n \t']) assert.equal(pattern.test(blank), false, JSON.stringify(blank));
  for (const text of ['Refresh links', ' x ', 'é', '1']) assert.equal(pattern.test(text), true, text);
});

test('a relation a record cannot exist without is required', () => {
  const plan = buildDirectusStudioMetadataPlan();
  for (const [collection, field] of [
    ['chapter_initiatives', 'chapter_slug'],
    ['projects', 'guild_slug'],
    ['chapter_update_requests', 'chapter_slug'],
    ['chapter_update_request_links', 'update_request_id'],
    ['chapter_update_request_proof_signals', 'update_request_id'],
    ['chapter_editor_assignments', 'chapter_slug'],
    ['chapter_editor_assignments', 'directus_user_id'],
    ['guild_editor_assignments', 'guild_slug'],
    ['guild_editor_assignments', 'directus_user_id'],
  ]) {
    const meta = studioField(plan, collection, field);
    assert.deepEqual(meta?.special, ['m2o'], `${collection}.${field}`);
    assert.equal(meta?.required, true, `${collection}.${field} is not required`);
  }
});

test("emptying an optional text field saves its column's empty value", () => {
  const plan = buildDirectusStudioMetadataPlan(
    undefined, undefined, undefined, undefined,
    [...DIRECTUS_STUDIO_OPTIONAL_COLLECTIONS]
  );
  // `not null default ''` columns: without `clear` Data Studio sends null,
  // which Directus refuses, so a saved value could never be removed.
  const savesBlank = {
    themes: ['summary'],
    people: ['role', 'avatar', 'bio'],
    chapters: ['city', 'country', 'region', 'summary', 'intro_quote', 'intro_quote_attribution', 'founded', 'primary_link'],
    chapter_initiatives: ['summary', 'description'],
    guilds: ['summary', 'description', 'oneliner', 'image'],
    projects: ['summary', 'description', 'image', 'repo_url', 'live_url'],
    chapter_update_requests: ['proposed_summary', 'proposed_primary_link', 'proposed_image', 'reviewer_notes', 'reviewed_by'],
    chapter_update_request_links: ['kind', 'subtext', 'handle', 'action', 'icon'],
    chapter_update_request_proof_signals: ['source', 'href'],
  };
  // Nullable columns: NULL is the empty value, so an emptied field sends it.
  const savesNull = {
    themes: ['reviewed_by'],
    people: ['reviewed_by'],
    chapters: ['image_alt', 'image_credit', 'reviewed_by'],
    chapter_initiatives: ['reviewed_by'],
    guilds: ['reviewed_by'],
    projects: ['reviewed_by'],
    chapter_update_requests: ['proposed_image_alt', 'proposed_image_credit'],
    map_node_submissions: ['public_note'],
  };
  for (const [collection, fields] of Object.entries(savesBlank)) {
    for (const field of fields) {
      const meta = studioField(plan, collection, field);
      assert.equal(meta?.options?.clear, true, `${collection}.${field} sends null when emptied`);
      assert.notEqual(meta?.required, true, `${collection}.${field}`);
    }
  }
  for (const [collection, fields] of Object.entries(savesNull)) {
    for (const field of fields) {
      const meta = studioField(plan, collection, field);
      assert.ok(meta, `${collection}.${field} is not in the plan`);
      assert.notEqual(meta?.options?.clear, true, `${collection}.${field} saves '' instead of NULL`);
    }
  }
});

test('the text field check names each way a field and its column disagree', () => {
  const text = (is_nullable: boolean, default_value: unknown) => ({ data_type: 'text', is_nullable, default_value });
  const problems = (meta: Record<string, unknown>, column: ReturnType<typeof text> | Record<string, unknown>) => (
    textFieldStorageProblems(meta, column as Parameters<typeof textFieldStorageProblems>[1])
  );
  const required = { interface: 'input', required: true };
  const sometimesRequired = {
    interface: 'input-multiline',
    conditions: [{ name: 'Alt text required with an image', rule: { image: { _nnull: true } }, required: true }],
  };

  // Required fields.
  assert.match(problems(required, text(false, ''))[0], /defaults to ''/);
  assert.deepEqual(problems(required, text(false, null)), []);
  // A default that is a real value fills the field in.
  assert.deepEqual(problems(required, text(false, 'guild')), []);
  assert.match(problems({ ...required, options: { clear: true } }, text(false, null))[0], /Remove `clear`/);
  assert.match(problems(required, text(true, null))[0], /accepts NULL/);

  // Fields required only sometimes.
  assert.deepEqual(problems(sometimesRequired, text(true, null)), []);
  assert.equal(problems(sometimesRequired, text(false, '')).length, 2);
  assert.match(problems({ ...sometimesRequired, options: { clear: true } }, text(true, null)).join(' '), /Remove `clear`/);

  // Optional fields.
  assert.match(problems({ interface: 'input-multiline' }, text(false, ''))[0], /Set `clear`/);
  assert.deepEqual(problems({ interface: 'input-multiline', options: { clear: true } }, text(false, '')), []);
  assert.deepEqual(problems({ interface: 'input', options: { clear: true } }, text(false, 'external')), []);
  assert.deepEqual(problems({ interface: 'input' }, text(true, null)), []);
  assert.match(problems({ interface: 'input', options: { clear: true } }, text(true, null))[0], /empty value is NULL/);
  assert.match(problems({ interface: 'input' }, text(false, null))[0], /Mark it required/);
  assert.match(problems({ interface: 'select-dropdown-m2o', special: ['m2o'] }, text(false, ''))[0], /optional relation/);
  // A dropdown without an empty choice cannot be emptied.
  assert.deepEqual(problems({ interface: 'select-dropdown' }, text(false, 'active')), []);

  // Not editable text: nothing to check.
  assert.deepEqual(problems({ interface: 'input', required: true, hidden: true, readonly: true }, text(false, '')), []);
  assert.deepEqual(problems({ interface: 'input', readonly: true }, text(false, null)), []);
  assert.deepEqual(problems({ interface: 'input' }, { data_type: 'jsonb', is_nullable: false, default_value: {} }), []);
  assert.deepEqual(problems({ interface: 'input' }, { data_type: 'integer', is_nullable: false, default_value: 0 }), []);
  assert.deepEqual(problems({ interface: 'input' }, null as unknown as Record<string, unknown>), []);
});
