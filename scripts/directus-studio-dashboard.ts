// The operator Insights dashboard in the steward CMS.
//
// One dashboard with a fixed id, so `directus:studio:setup` updates it in place
// on every run instead of adding a copy, and the Trusted Publisher read grant in
// `directus:content:setup` can name it. Panels have fixed ids too: a rerun
// updates them and removes any other panel on this dashboard.
//
// Data Studio loads every panel of a dashboard in one GraphQL request, built
// from the viewer's own schema. A panel that names a field the viewer cannot
// read fails that request, and every panel on the dashboard comes up empty. So
// each panel uses only fields the Trusted Publisher policy reads (a test holds
// this), counts rather than lists private intake, and leaves hidden technical
// fields such as payloads and delivery tokens out.

import { DIRECTUS_OPERATOR_DASHBOARD_ID } from './directus-operational-content-setup.ts';

type DirectusClient = {
  request: (path: string, options?: { method?: string; body?: unknown; expected?: number[] }) => Promise<any>;
};

type PanelFilter = Record<string, unknown>;

interface PanelPlan {
  id: string;
  // Base collection name; resolved to the instance's name when applied.
  collection: string;
  name: string;
  icon: string;
  note: string;
  type: 'metric' | 'list';
  position: { x: number; y: number; width: number; height: number };
  filter: PanelFilter;
  // metric: count matching rows, coloured when there is something to do.
  attentionColor?: string;
  // list: one line per row.
  displayTemplate?: string;
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
  limit?: number;
}

// A metric panel counts its collection's primary key. With no field, Data
// Studio asks GraphQL for `count { * }`, which is a syntax error, and the
// request that fails is the one carrying every panel. A list panel also reads
// the primary key of each row.
const PRIMARY_KEY_BY_COLLECTION: Readonly<Record<string, string>> = Object.freeze({
  chapter_update_requests: 'id',
  chapter_initiatives: 'slug',
  map_node_submissions: 'id',
  map_node_moderation_notifications: 'id',
  review_notifications: 'id',
  publish_health: 'id',
  chapter_impact_snapshots: 'chapter_slug',
});

const COLOR = Object.freeze({
  review: '#005c8a',
  failed: '#b42318',
  warning: '#7d4f00',
  healthy: '#2f7d32',
});

export const OPERATOR_DASHBOARD = Object.freeze({
  id: DIRECTUS_OPERATOR_DASHBOARD_ID,
  name: 'Operator overview',
  icon: 'monitor_heart',
  color: COLOR.healthy,
  note: 'What needs attention: reviews waiting, alerts that failed to send, whether the public site is current, and the impact sync. Each panel shows only what your role can read, and each count says in its note where to find the records behind it.',
});

const pendingReview = { request_status: { _eq: 'pending_review' } };
const openAlert = (kind: string) => ({ _and: [{ kind: { _eq: kind } }, { resolved_at: { _null: true } }] });
const impactErrors = { error_count: { _gt: 0 } };

// Rows of panels: reviews, alerts, publish health, impact sync. Grid units in
// four columns of 11, so the 44-unit width fits a 1440px screen with Data
// Studio's sidebar open. The waiting-longest list is one unit under Data
// Studio's list minimum, which only limits resizing by hand.
const OPERATOR_PANELS: readonly PanelPlan[] = Object.freeze([
  {
    id: '0c88184d-a558-4cf7-ac93-9ed46a8ae53e',
    collection: 'chapter_update_requests',
    name: 'Requests to review',
    icon: 'rate_review',
    note: 'Chapter change requests stewards sent for review. Decide them from the Pending chapter reviews bookmark.',
    type: 'metric',
    position: { x: 1, y: 1, width: 11, height: 9 },
    filter: pendingReview,
    attentionColor: COLOR.review,
  },
  {
    id: '316d50b9-701f-46cb-971b-ccee77e13816',
    collection: 'chapter_initiatives',
    name: 'Initiatives to review',
    icon: 'local_activity',
    note: 'Initiatives a steward set to Pending Review. Open the Pending initiative reviews bookmark.',
    type: 'metric',
    position: { x: 12, y: 1, width: 11, height: 9 },
    filter: { publication_status: { _eq: 'pending_review' } },
    attentionColor: COLOR.review,
  },
  {
    id: '36c95ed2-cdc8-4ddf-9500-fc41c25a29de',
    collection: 'map_node_submissions',
    name: 'Map approvals',
    icon: 'approval',
    note: 'Map pins waiting for approval. A count only: submissions stay in the moderation queue. Open the Pending map node approvals bookmark.',
    type: 'metric',
    position: { x: 23, y: 1, width: 11, height: 9 },
    filter: { status: { _eq: 'pending' } },
    attentionColor: COLOR.review,
  },
  {
    id: 'ddb63bd8-7562-4d33-842c-66c967469f05',
    collection: 'chapter_update_requests',
    name: 'Waiting longest',
    icon: 'hourglass_top',
    note: 'The five chapter change requests that have waited longest since their last change. Decide them from the Pending chapter reviews bookmark.',
    type: 'list',
    position: { x: 34, y: 1, width: 11, height: 9 },
    filter: pendingReview,
    displayTemplate: '{{ title }}',
    sortField: 'updated_at',
    sortDirection: 'asc',
    limit: 5,
  },
  {
    id: '73016a91-17a0-4fd5-ada0-5cebe3666f32',
    collection: 'review_notifications',
    name: 'Failed CMS emails',
    icon: 'notification_important',
    note: 'Review, quarantine and publish-health emails that gave up after their retries. The Failed content notifications bookmark lists them with the provider error.',
    type: 'metric',
    position: { x: 1, y: 10, width: 11, height: 7 },
    filter: { status: { _eq: 'failed' } },
    attentionColor: COLOR.failed,
  },
  {
    id: '6e9e8376-e39c-4017-9862-a74e9d0f529b',
    collection: 'map_node_moderation_notifications',
    name: 'Failed map alerts',
    icon: 'mark_email_unread',
    note: 'Map moderation emails that gave up after their retries. Open the Failed map moderation alerts bookmark.',
    type: 'metric',
    position: { x: 12, y: 10, width: 11, height: 7 },
    filter: { status: { _eq: 'failed' } },
    attentionColor: COLOR.failed,
  },
  {
    id: '0af24ad1-0657-4060-b80b-491fa3a67f66',
    collection: 'review_notifications',
    name: 'Records dropped',
    icon: 'report',
    note: 'Records missing from the public site right now because the snapshot drops them. The Quarantined records bookmark has the reasons.',
    type: 'metric',
    position: { x: 23, y: 10, width: 11, height: 7 },
    filter: openAlert('record_quarantined'),
    attentionColor: COLOR.failed,
  },
  {
    id: 'f1107b3c-7263-44fc-bb61-ea1276bb316b',
    collection: 'review_notifications',
    name: 'Images withheld',
    icon: 'hide_image',
    note: 'Published chapters shown without their image because it is not cleared. The chapter stays on the site. The Withheld chapter images bookmark lists them.',
    type: 'metric',
    position: { x: 34, y: 10, width: 11, height: 7 },
    filter: openAlert('chapter_image_withheld'),
    attentionColor: COLOR.warning,
  },
  {
    id: 'afe6eadc-7c72-42e7-a4e7-527394b9764e',
    collection: 'publish_health',
    name: 'Open publish alerts',
    icon: 'sync_problem',
    note: 'One while the watchdog holds a stale-site or failed-build alert, zero when the deployed site is current. The freshness line beside it shows the times behind it.',
    type: 'metric',
    position: { x: 1, y: 17, width: 11, height: 6 },
    filter: { _or: [{ stale_alert_active: { _eq: true } }, { build_failed_alert_active: { _eq: true } }] },
    attentionColor: COLOR.failed,
  },
  {
    id: '36cc6cf4-a106-4499-a0d4-9ebe8a8e5e39',
    collection: 'publish_health',
    name: 'Deployed snapshot freshness',
    icon: 'cloud_done',
    note: 'From the publish-health watchdog. The site is behind while the last edit is newer than the deployed snapshot. A failed Pages build shows under Open publish alerts. If the check time stops moving, the watchdog has stopped.',
    type: 'list',
    position: { x: 12, y: 17, width: 33, height: 6 },
    filter: {},
    displayTemplate: 'Snapshot {{ deployed_snapshot_generated_at }} · last edit {{ content_watermark }} · checked {{ checked_at }}',
    limit: 1,
  },
  {
    id: 'b6c26533-45a0-4321-a536-7be30d0dd108',
    collection: 'chapter_impact_snapshots',
    name: 'Impact sync errors',
    icon: 'error',
    note: 'Chapters whose latest impact sync failed. A wrong garden address or Karma slug in the impact sources is the usual cause. The list beside it has each error.',
    type: 'metric',
    position: { x: 1, y: 23, width: 11, height: 9 },
    filter: impactErrors,
    attentionColor: COLOR.failed,
  },
  {
    id: '6fdad3e4-0624-41fd-812e-2fc74db7e978',
    collection: 'chapter_impact_snapshots',
    name: 'Stale impact data',
    icon: 'update',
    note: 'Impact snapshots older than their refresh time. Many at once usually means the impact sync is not running. Chapter Impact Snapshots shows each one.',
    type: 'metric',
    position: { x: 12, y: 23, width: 11, height: 9 },
    filter: { stale_after: { _lt: '$NOW' } },
    attentionColor: COLOR.warning,
  },
  {
    id: '761976bf-c7d6-4c44-8c78-f4367f3ad6ca',
    collection: 'chapter_impact_snapshots',
    name: 'Impact sync errors by chapter',
    icon: 'insights',
    note: 'The latest error per chapter, most repeated first.',
    type: 'list',
    position: { x: 23, y: 23, width: 22, height: 9 },
    filter: impactErrors,
    displayTemplate: '{{ chapter_slug }}: {{ last_error }}',
    sortField: 'error_count',
    sortDirection: 'desc',
    limit: 5,
  },
]);

function cleanCollectionName(collection: string) {
  return collection.replace(/^(content|intake|impact)[._]/, '');
}

// Panel options in the shape Data Studio's metric and list panels read.
function panelOptions(panel: PanelPlan, collection: string): Record<string, any> {
  if (panel.type === 'metric') {
    return {
      collection,
      field: PRIMARY_KEY_BY_COLLECTION[panel.collection],
      function: 'count',
      filter: panel.filter,
      conditionalFormatting: panel.attentionColor
        ? [{ operator: '>', value: '0', color: panel.attentionColor }]
        : [],
    };
  }
  return {
    collection,
    filter: panel.filter,
    displayTemplate: panel.displayTemplate,
    limit: panel.limit,
    ...(panel.sortField ? { sortField: panel.sortField, sortDirection: panel.sortDirection ?? 'desc' } : {}),
    linkToItem: false,
  };
}

// Field names a filter reads, through `_and` / `_or` and operator objects.
function filterFields(filter: unknown): string[] {
  if (Array.isArray(filter)) return filter.flatMap(filterFields);
  if (!filter || typeof filter !== 'object') return [];
  return Object.entries(filter as Record<string, unknown>).flatMap(([key, value]) => (
    key.startsWith('_') ? filterFields(value) : [key]
  ));
}

// Every field of its collection a panel reads. The viewer needs read access to
// each one, or the dashboard's single GraphQL request fails.
export function operatorPanelFields(panel: { type: string; options: Record<string, any> }): string[] {
  const { collection, field, filter, sortField, displayTemplate } = panel.options;
  const primaryKey = panel.type === 'list' ? [PRIMARY_KEY_BY_COLLECTION[cleanCollectionName(collection)]] : [];
  const templateFields = [...String(displayTemplate ?? '').matchAll(/{{\s*([\w.]+)\s*}}/g)].map((match) => match[1]);
  return [...new Set([
    ...(field ? [field] : []),
    ...primaryKey,
    ...filterFields(filter),
    ...(sortField ? [sortField] : []),
    ...templateFields,
  ])];
}

// `fieldsByCollection` lists the fields each collection has in the instance.
// A panel naming a field the instance does not have yet is left off, because
// it would fail the dashboard's one GraphQL request and empty every panel. A
// rerun after the migration adds it.
export function buildDirectusOperatorDashboardPlan(
  collectionNames: readonly string[],
  fieldsByCollection?: ReadonlyMap<string, ReadonlySet<string>>
) {
  const collectionByBase = new Map(collectionNames.map((collection) => [cleanCollectionName(collection), collection]));
  const panels = OPERATOR_PANELS
    .filter((panel) => collectionByBase.has(panel.collection))
    .map((panel) => {
      const collection = collectionByBase.get(panel.collection) as string;
      return {
        id: panel.id,
        dashboard: OPERATOR_DASHBOARD.id,
        name: panel.name,
        icon: panel.icon,
        color: null,
        show_header: true,
        note: panel.note,
        type: panel.type,
        position_x: panel.position.x,
        position_y: panel.position.y,
        width: panel.position.width,
        height: panel.position.height,
        options: panelOptions(panel, collection),
      };
    });
  const missingFields = (panel: (typeof panels)[number]) => {
    const available = fieldsByCollection?.get(panel.options.collection);
    return fieldsByCollection ? operatorPanelFields(panel).filter((field) => !available?.has(field)) : [];
  };
  return {
    dashboard: {
      id: OPERATOR_DASHBOARD.id,
      name: OPERATOR_DASHBOARD.name,
      icon: OPERATOR_DASHBOARD.icon,
      color: OPERATOR_DASHBOARD.color,
      note: OPERATOR_DASHBOARD.note,
    },
    panels: panels.filter((panel) => missingFields(panel).length === 0),
    skipped: panels
      .map((panel) => ({ name: panel.name, collection: panel.options.collection as string, missing: missingFields(panel) }))
      .filter((panel) => panel.missing.length > 0),
  };
}

async function readFieldsByCollection(client: DirectusClient, collectionNames: readonly string[]) {
  const wanted = new Set(OPERATOR_PANELS.map((panel) => panel.collection));
  const fieldsByCollection = new Map<string, Set<string>>();
  for (const collection of collectionNames.filter((name) => wanted.has(cleanCollectionName(name)))) {
    const response = await client.request(`/fields/${encodeURIComponent(collection)}?limit=-1`);
    fieldsByCollection.set(collection, new Set((response?.data ?? []).map((field) => field.field)));
  }
  return fieldsByCollection;
}

export async function applyDirectusOperatorDashboard(client: DirectusClient, collectionNames: readonly string[]) {
  const plan = buildDirectusOperatorDashboardPlan(collectionNames, await readFieldsByCollection(client, collectionNames));
  for (const panel of plan.skipped) {
    console.warn(
      `Skipped dashboard panel "${panel.name}": ${panel.collection} has no ${panel.missing.join(', ')} yet. ` +
      'Apply the pending database migration, then re-run this setup.'
    );
  }
  const id = encodeURIComponent(plan.dashboard.id);

  const existing = await client.request(`/dashboards?filter[id][_eq]=${id}&fields=id&limit=1`);
  if (existing?.data?.[0]?.id) {
    const { id: _id, ...changes } = plan.dashboard;
    await client.request(`/dashboards/${id}`, { method: 'PATCH', body: changes });
  } else {
    await client.request('/dashboards', { method: 'POST', body: plan.dashboard });
  }

  // Panels are found by id on any dashboard: one moved elsewhere by hand is
  // moved back rather than created a second time, which Directus would refuse.
  const plannedIds = plan.panels.map((panel) => panel.id);
  const found = plannedIds.length === 0
    ? null
    : await client.request(`/panels?filter[id][_in]=${plannedIds.map(encodeURIComponent).join(',')}&fields=id&limit=-1`);
  const existingIds = new Set<string>((found?.data ?? []).map((panel) => panel.id));
  for (const panel of plan.panels) {
    if (existingIds.has(panel.id)) {
      const { id: panelId, ...changes } = panel;
      await client.request(`/panels/${encodeURIComponent(panelId)}`, { method: 'PATCH', body: changes });
    } else {
      await client.request('/panels', { method: 'POST', body: panel });
    }
    console.log(`Dashboard panel: ${plan.dashboard.name} / ${panel.name}`);
  }

  const current = await client.request(`/panels?filter[dashboard][_eq]=${id}&fields=id&limit=-1`);
  const planned = new Set(plannedIds);
  let removed = 0;
  for (const panel of current?.data ?? []) {
    if (planned.has(panel.id)) continue;
    await client.request(`/panels/${encodeURIComponent(panel.id)}`, { method: 'DELETE', expected: [204] });
    removed += 1;
  }
  if (removed > 0) console.log(`Removed ${removed} panel(s) no longer on ${plan.dashboard.name}.`);

  return { dashboard: plan.dashboard.name, panels: plan.panels.length, removed, skipped: plan.skipped.length };
}
