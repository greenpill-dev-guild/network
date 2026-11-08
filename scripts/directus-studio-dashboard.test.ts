import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ASSIGNED_EDITOR_POLICY_NAME } from './directus-content-access.ts';
import {
  DIRECTUS_CONTENT_OPS_COLLECTIONS,
  DIRECTUS_IMPACT_COLLECTIONS,
  DIRECTUS_INTAKE_COLLECTIONS,
  DIRECTUS_OPERATIONAL_COLLECTIONS,
  DIRECTUS_OPERATOR_DASHBOARD_ID,
  DIRECTUS_STEWARD_ACCESS_COLLECTIONS,
  DIRECTUS_STEWARD_WORKFLOW_COLLECTIONS,
  buildDirectusOperationalPermissionPlan,
} from './directus-operational-content-setup.ts';
import {
  applyDirectusOperatorDashboard,
  buildDirectusOperatorDashboardPlan,
  operatorPanelFields,
} from './directus-studio-dashboard.ts';
import { assertStewardLandingBookmarks } from './directus-steward-smoke.ts';
import { buildDirectusStudioBookmarkPlan, buildDirectusStudioMetadataPlan } from './directus-studio-setup.ts';

const DASHBOARD_COLLECTIONS = Object.freeze([
  ...DIRECTUS_OPERATIONAL_COLLECTIONS,
  ...DIRECTUS_STEWARD_WORKFLOW_COLLECTIONS,
  'map_node_submissions',
  'map_node_moderation_notifications',
  ...DIRECTUS_CONTENT_OPS_COLLECTIONS,
  ...DIRECTUS_IMPACT_COLLECTIONS,
]);

const permissionPlan = () => buildDirectusOperationalPermissionPlan(
  [...DIRECTUS_OPERATIONAL_COLLECTIONS],
  [...DIRECTUS_INTAKE_COLLECTIONS],
  [...DIRECTUS_STEWARD_ACCESS_COLLECTIONS],
  [...DIRECTUS_STEWARD_WORKFLOW_COLLECTIONS],
  [...DIRECTUS_CONTENT_OPS_COLLECTIONS],
  [...DIRECTUS_IMPACT_COLLECTIONS]
);

// What a role can read in a collection: the union of its policies' read grants.
function readableFields(plan, policies: string[], collection: string) {
  const grants = plan.permissions.filter((permission) => (
    policies.includes(permission.policy) && permission.collection === collection && permission.action === 'read'
  ));
  return grants.length === 0 ? null : new Set(grants.flatMap((permission) => permission.fields));
}

test('every operator dashboard panel reads only fields Trusted Publishers can read', () => {
  const plan = buildDirectusOperatorDashboardPlan(DASHBOARD_COLLECTIONS);
  const permissions = permissionPlan();

  for (const panel of plan.panels) {
    const collection = panel.options.collection;
    const readable = readableFields(permissions, ['Greenpill Trusted Publisher'], collection);
    assert.ok(readable, `Trusted Publishers cannot read ${collection} (panel "${panel.name}")`);
    for (const field of operatorPanelFields(panel)) {
      assert.ok(readable.has(field), `panel "${panel.name}" reads ${collection}.${field}, which Trusted Publishers cannot read`);
    }
  }
});

test('every metric panel counts a named field, which GraphQL can ask for', () => {
  // Without a field Data Studio sends `count { * }`, a GraphQL syntax error,
  // and the one request that carries every panel fails (seen in 11.17.4).
  const metrics = buildDirectusOperatorDashboardPlan(DASHBOARD_COLLECTIONS).panels
    .filter((panel) => panel.type === 'metric');
  assert.ok(metrics.length > 0);
  for (const panel of metrics) {
    assert.equal(panel.options.function, 'count', panel.name);
    assert.equal(typeof panel.options.field, 'string', panel.name);
    assert.match(panel.options.field, /^\w+$/, panel.name);
  }
});

test('the operator dashboard covers reviews, failed alerts, snapshot freshness and impact sync', () => {
  const plan = buildDirectusOperatorDashboardPlan(DASHBOARD_COLLECTIONS);
  const panelsOn = (collection: string) => plan.panels.filter((panel) => panel.options.collection === collection);

  assert.equal(plan.dashboard.id, DIRECTUS_OPERATOR_DASHBOARD_ID);
  assert.ok(panelsOn('chapter_update_requests').length > 0, 'pending chapter reviews');
  assert.ok(panelsOn('chapter_initiatives').length > 0, 'pending initiative reviews');
  assert.ok(panelsOn('review_notifications').some((panel) => panel.options.filter?.status?._eq === 'failed'), 'failed content alerts');
  assert.ok(panelsOn('map_node_moderation_notifications').some((panel) => panel.options.filter?.status?._eq === 'failed'), 'failed map alerts');
  const freshness = panelsOn('publish_health').find((panel) => panel.type === 'list');
  assert.match(String(freshness?.options.displayTemplate), /deployed_snapshot_generated_at/);
  assert.match(String(freshness?.options.displayTemplate), /content_watermark/);
  assert.match(String(freshness?.options.displayTemplate), /checked_at/);
  assert.ok(panelsOn('chapter_impact_snapshots').length > 0, 'impact sync health');

  // Private intake is counted, never listed: no submission content reaches the page.
  for (const panel of panelsOn('map_node_submissions')) {
    assert.equal(panel.type, 'metric');
    assert.deepEqual(operatorPanelFields(panel), ['id', 'status']);
  }
  // Panels are read-only views.
  for (const panel of plan.panels.filter((candidate) => candidate.type === 'list')) {
    assert.equal(panel.options.linkToItem, false);
  }
  assert.equal(new Set(plan.panels.map((panel) => panel.id)).size, plan.panels.length);
});

test('a panel whose collection is missing here is left off the dashboard', () => {
  const withoutPublishHealth = DASHBOARD_COLLECTIONS.filter((collection) => collection !== 'publish_health');
  const plan = buildDirectusOperatorDashboardPlan(withoutPublishHealth);
  assert.equal(plan.panels.some((panel) => panel.options.collection === 'publish_health'), false);
  assert.ok(plan.panels.length > 0);
});

test('only Trusted Publishers get the operator dashboard and the publish-health row', () => {
  const permissions = permissionPlan().permissions;
  const dashboardRead = permissions.filter((permission) => (
    ['directus_dashboards', 'directus_panels', 'publish_health'].includes(permission.collection)
  ));

  assert.deepEqual(
    [...new Set(dashboardRead.map((permission) => permission.policy))],
    ['Greenpill Trusted Publisher']
  );
  assert.ok(dashboardRead.every((permission) => permission.action === 'read'));
  const dashboards = dashboardRead.find((permission) => permission.collection === 'directus_dashboards');
  const panels = dashboardRead.find((permission) => permission.collection === 'directus_panels');
  assert.deepEqual(dashboards?.permissions, { id: { _eq: DIRECTUS_OPERATOR_DASHBOARD_ID } });
  assert.deepEqual(panels?.permissions, { dashboard: { _eq: DIRECTUS_OPERATOR_DASHBOARD_ID } });
  const publishHealth = dashboardRead.find((permission) => permission.collection === 'publish_health');
  for (const technical of ['latest_pages_run_id', 'stale_threshold_ms', 'created_at', 'updated_at']) {
    assert.equal(publishHealth?.fields.includes(technical), false, technical);
  }
});

// An in-memory stand-in for the Directus routes the dashboard apply uses.
function fakeDirectus() {
  const dashboards = new Map<string, Record<string, unknown>>();
  const panels = new Map<string, Record<string, unknown>>();
  // Every field the panels read, so no panel is skipped unless a test removes one.
  const fields = new Map<string, Set<string>>();
  for (const panel of buildDirectusOperatorDashboardPlan(DASHBOARD_COLLECTIONS).panels) {
    const known = fields.get(panel.options.collection) ?? new Set<string>();
    operatorPanelFields(panel).forEach((field) => known.add(field));
    fields.set(panel.options.collection, known);
  }
  const calls: string[] = [];
  const request = async (path: string, { method = 'GET', body }: { method?: string; body?: any } = {}) => {
    calls.push(`${method} ${path.split('?')[0]}`);
    const url = new URL(path, 'http://directus.test');
    const [, resource, id] = url.pathname.split('/');
    if (resource === 'fields') {
      return { data: [...(fields.get(decodeURIComponent(id)) ?? [])].map((field) => ({ field })) };
    }
    const store = resource === 'dashboards' ? dashboards : panels;
    if (method === 'GET') {
      const byId = url.searchParams.get('filter[id][_eq]');
      const byIds = url.searchParams.get('filter[id][_in]')?.split(',');
      const byDashboard = url.searchParams.get('filter[dashboard][_eq]');
      const rows = [...store.values()].filter((row) => (
        (!byId || row.id === byId) &&
        (!byIds || byIds.includes(String(row.id))) &&
        (!byDashboard || row.dashboard === byDashboard)
      ));
      return { data: rows.map((row) => ({ id: row.id })) };
    }
    if (method === 'POST') {
      if (store.has(body.id)) throw new Error(`POST /${resource} failed with 400: duplicate id`);
      store.set(body.id, { ...body });
      return { data: body };
    }
    if (method === 'PATCH') {
      store.set(id, { ...store.get(id), ...body, id });
      return { data: store.get(id) };
    }
    if (method === 'DELETE') {
      store.delete(id);
      return null;
    }
    throw new Error(`unexpected ${method} ${path}`);
  };
  return { client: { request }, dashboards, panels, fields, calls };
}

test('rerunning the dashboard setup restores the one dashboard in place and removes stray panels', async () => {
  const directus = fakeDirectus();
  const log = console.log;
  console.log = () => {};
  try {
    const first = await applyDirectusOperatorDashboard(directus.client, DASHBOARD_COLLECTIONS);
    const created = directus.calls.filter((call) => call.startsWith('POST')).length;
    assert.equal(created, 1 + first.panels);
    const planned = buildDirectusOperatorDashboardPlan(DASHBOARD_COLLECTIONS);
    const [edited, moved] = planned.panels;

    // Hand edits since the last run: a renamed dashboard, a changed panel, a
    // managed panel moved to another dashboard, and a panel added by hand.
    directus.dashboards.set(DIRECTUS_OPERATOR_DASHBOARD_ID, { ...directus.dashboards.get(DIRECTUS_OPERATOR_DASHBOARD_ID), name: 'Renamed' });
    directus.panels.set(edited.id, { ...directus.panels.get(edited.id), options: { collection: 'chapters' } });
    directus.panels.set(moved.id, { ...directus.panels.get(moved.id), dashboard: 'another-dashboard' });
    directus.panels.set('stray', { id: 'stray', dashboard: DIRECTUS_OPERATOR_DASHBOARD_ID, name: 'Hand-made' });
    directus.calls.length = 0;
    const second = await applyDirectusOperatorDashboard(directus.client, DASHBOARD_COLLECTIONS);

    assert.equal(directus.calls.some((call) => call.startsWith('POST')), false);
    assert.equal(second.removed, 1);
    assert.equal(directus.dashboards.size, 1);
    assert.equal(directus.dashboards.get(DIRECTUS_OPERATOR_DASHBOARD_ID)?.name, planned.dashboard.name);
    assert.deepEqual(directus.panels.get(edited.id)?.options, edited.options);
    assert.equal(directus.panels.get(moved.id)?.dashboard, DIRECTUS_OPERATOR_DASHBOARD_ID);
    assert.equal(directus.panels.size, first.panels);
    assert.deepEqual(
      [...directus.panels.values()].map((panel) => panel.dashboard),
      Array(first.panels).fill(DIRECTUS_OPERATOR_DASHBOARD_ID)
    );
  } finally {
    console.log = log;
  }
});

test('a panel naming a field the instance does not have yet is left off until a rerun', async () => {
  // review_notifications before migration 030: no resolved_at column.
  const directus = fakeDirectus();
  directus.fields.get('review_notifications')?.delete('resolved_at');
  const log = console.log;
  const warn = console.warn;
  const warnings: string[] = [];
  console.log = () => {};
  console.warn = (message) => { warnings.push(String(message)); };
  try {
    const result = await applyDirectusOperatorDashboard(directus.client, DASHBOARD_COLLECTIONS);
    const names = [...directus.panels.values()].map((panel) => panel.name);
    assert.equal(result.skipped, 2);
    assert.equal(names.includes('Records dropped') || names.includes('Images withheld'), false);
    assert.ok(names.includes('Failed CMS emails'));
    assert.match(warnings.join('\n'), /review_notifications has no resolved_at/);

    // After the migration the next run adds them.
    directus.fields.get('review_notifications')?.add('resolved_at');
    const rerun = await applyDirectusOperatorDashboard(directus.client, DASHBOARD_COLLECTIONS);
    assert.equal(rerun.skipped, 0);
    assert.equal(directus.panels.size, rerun.panels);
  } finally {
    console.log = log;
    console.warn = warn;
  }
});

test('the steward landing set opens on each steward\'s own records through fields they can read', () => {
  const bookmarks = buildDirectusStudioBookmarkPlan([
    ...DIRECTUS_OPERATIONAL_COLLECTIONS,
    ...DIRECTUS_STEWARD_WORKFLOW_COLLECTIONS,
    ...DIRECTUS_IMPACT_COLLECTIONS,
  ]).filter((bookmark) => bookmark.role === 'Greenpill Steward Editor');
  const byName = new Map(bookmarks.map((bookmark) => [bookmark.bookmark, bookmark]));

  const ownScope = {
    'My chapter': ['chapters', { slug: { _in: '$CURRENT_USER.chapter_editor_assignments.chapter_slug' } }],
    'My chapter initiatives': ['chapter_initiatives', { chapter_slug: { _in: '$CURRENT_USER.chapter_editor_assignments.chapter_slug' } }],
    'My chapter impact sync': ['chapter_impact_snapshots', { chapter_slug: { _in: '$CURRENT_USER.chapter_editor_assignments.chapter_slug' } }],
    'My guild': ['guilds', { slug: { _in: '$CURRENT_USER.guild_editor_assignments.guild_slug' } }],
    'My guild projects': ['projects', { guild_slug: { _in: '$CURRENT_USER.guild_editor_assignments.guild_slug' } }],
  };
  for (const [name, [collection, filter]] of Object.entries(ownScope)) {
    assert.equal(byName.get(name)?.collection, collection, name);
    assert.deepEqual(byName.get(name)?.filter, filter, name);
  }
  assert.ok(byName.has('My chapter change requests'));

  // Directus refuses a filter or a column on a field the role cannot read.
  const permissions = permissionPlan();
  for (const bookmark of bookmarks) {
    const readable = readableFields(permissions, ['Greenpill Steward Editor', ASSIGNED_EDITOR_POLICY_NAME], bookmark.collection);
    assert.ok(readable, `stewards cannot read ${bookmark.collection}`);
    const filterFields = Object.keys(bookmark.filter);
    for (const field of [...filterFields, ...bookmark.layout_query.tabular.fields]) {
      assert.ok(readable.has(field), `"${bookmark.bookmark}" uses ${bookmark.collection}.${field}, which stewards cannot read`);
    }
  }
});

test('the smoke check refuses a landing bookmark that shows another steward\'s records', async () => {
  const presets = [
    { bookmark: 'My chapter', collection: 'chapters', filter: { slug: { _in: '$CURRENT_USER.chapter_editor_assignments.chapter_slug' } } },
    { bookmark: 'My guild', collection: 'guilds', filter: { slug: { _in: '$CURRENT_USER.guild_editor_assignments.guild_slug' } } },
  ];
  const steward = (rows: Record<string, Array<Record<string, string>>>) => ({
    request: async (path: string) => {
      if (path.startsWith('/presets')) return { data: presets };
      return { data: rows[path.split('?')[0].replace('/items/', '')] ?? [] };
    },
  });
  const options = { chapter: 'brasil', guild: 'dev-guild' };

  await assertStewardLandingBookmarks(steward({ chapters: [{ slug: 'brasil' }], guilds: [{ slug: 'dev-guild' }] }), options);
  await assert.rejects(
    assertStewardLandingBookmarks(steward({ chapters: [{ slug: 'brasil' }, { slug: 'nigeria' }], guilds: [{ slug: 'dev-guild' }] }), options),
    /outside the steward's chapter/
  );
  await assert.rejects(
    assertStewardLandingBookmarks(steward({ chapters: [], guilds: [{ slug: 'dev-guild' }] }), options),
    /does not show the steward's assigned chapter/
  );

  // A My chapter bookmark that lost its assignment filter would open on every
  // published chapter; the check refuses it instead of skipping it.
  presets[0] = { ...presets[0], filter: {} as any };
  await assert.rejects(
    assertStewardLandingBookmarks(steward({ chapters: [{ slug: 'brasil' }], guilds: [{ slug: 'dev-guild' }] }), options),
    /does not filter by the steward's assignments/
  );
});

test('a new steward lands on Chapters, where the My chapter bookmark is', () => {
  const plan = buildDirectusStudioMetadataPlan(
    [...DIRECTUS_OPERATIONAL_COLLECTIONS],
    [...DIRECTUS_STEWARD_ACCESS_COLLECTIONS],
    [...DIRECTUS_STEWARD_WORKFLOW_COLLECTIONS],
    ['map_node_submissions', 'map_node_moderation_notifications', 'map_node_moderation_access_links'],
    [...DIRECTUS_CONTENT_OPS_COLLECTIONS, ...DIRECTUS_IMPACT_COLLECTIONS]
  );
  const permissions = permissionPlan();
  const stewardSidebar = plan.collections
    .filter((collection) => collection.meta.hidden !== true)
    .filter((collection) => readableFields(permissions, ['Greenpill Steward Editor', ASSIGNED_EDITOR_POLICY_NAME], collection.collection))
    // Data Studio orders the sidebar by sort, then name, with unsorted last,
    // and opens a new user on its first collection.
    .sort((a, b) => (
      (a.meta.sort ?? Infinity) - (b.meta.sort ?? Infinity) || a.collection.localeCompare(b.collection)
    ))
    .map((collection) => collection.collection);

  assert.deepEqual(stewardSidebar.slice(0, 3), ['chapters', 'chapter_initiatives', 'chapter_update_requests']);
  // A sort set by hand elsewhere cannot outrank these: every other managed
  // collection is written with no sort.
  const sorted = new Set(['chapters', 'chapter_initiatives', 'chapter_update_requests', 'guilds', 'projects', 'people', 'themes', 'chapter_impact_snapshots']);
  for (const collection of plan.collections.filter((candidate) => !sorted.has(candidate.collection))) {
    assert.equal(collection.meta.sort, null, collection.collection);
  }
  assert.ok(stewardSidebar.includes('chapter_impact_snapshots'));
  assert.equal(stewardSidebar.includes('publish_health'), false);
});

test('every bookmark a panel note points to exists for Trusted Publishers, and every alert count names one', () => {
  const plan = buildDirectusOperatorDashboardPlan(DASHBOARD_COLLECTIONS);
  const publisherBookmarks = new Set(buildDirectusStudioBookmarkPlan([...DASHBOARD_COLLECTIONS])
    .filter((bookmark) => bookmark.role === 'Greenpill Trusted Publisher')
    .map((bookmark) => bookmark.bookmark));

  for (const panel of plan.panels) {
    for (const [, name] of panel.note.matchAll(/the ([A-Z][\w ]+?) bookmark/g)) {
      assert.ok(publisherBookmarks.has(name), `panel "${panel.name}" points to a missing bookmark: ${name}`);
    }
  }
  // An alert count is only useful if the operator can find the records behind it.
  for (const panel of plan.panels.filter((candidate) => candidate.options.collection.endsWith('notifications'))) {
    assert.match(panel.note, /bookmark/, `panel "${panel.name}" names no bookmark`);
  }
  // The new bookmark lists exactly the alerts the panel counts.
  const withheld = buildDirectusStudioBookmarkPlan([...DASHBOARD_COLLECTIONS]).find((bookmark) => bookmark.bookmark === 'Withheld chapter images');
  const withheldPanel = plan.panels.find((panel) => panel.name === 'Images withheld');
  assert.deepEqual(withheld?.filter, withheldPanel?.options.filter);
});
