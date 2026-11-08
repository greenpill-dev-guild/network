import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ASSIGNED_EDITOR_POLICY_NAME, formReadAliases } from './directus-content-access.ts';
import { FIELD_GROUPS_BY_COLLECTION, formGroupAliases, withFormGroups } from './directus-form-groups.ts';
import {
  DIRECTUS_CONTENT_OPS_COLLECTIONS,
  DIRECTUS_IMPACT_COLLECTIONS,
  DIRECTUS_INTAKE_COLLECTIONS,
  DIRECTUS_OPERATIONAL_COLLECTIONS,
  DIRECTUS_STEWARD_ACCESS_COLLECTIONS,
  DIRECTUS_STEWARD_WORKFLOW_COLLECTIONS,
  buildDirectusOperationalPermissionPlan,
} from './directus-operational-content-setup.ts';
import { assertStewardFormsReadable } from './directus-steward-smoke.ts';
import { buildDirectusStudioMetadataPlan } from './directus-studio-setup.ts';

const permissions = buildDirectusOperationalPermissionPlan(
  [...DIRECTUS_OPERATIONAL_COLLECTIONS],
  [...DIRECTUS_INTAKE_COLLECTIONS],
  [...DIRECTUS_STEWARD_ACCESS_COLLECTIONS],
  [...DIRECTUS_STEWARD_WORKFLOW_COLLECTIONS],
  [...DIRECTUS_CONTENT_OPS_COLLECTIONS],
  [...DIRECTUS_IMPACT_COLLECTIONS]
).permissions;

const studio = buildDirectusStudioMetadataPlan(
  [...DIRECTUS_OPERATIONAL_COLLECTIONS],
  [...DIRECTUS_STEWARD_ACCESS_COLLECTIONS],
  [...DIRECTUS_STEWARD_WORKFLOW_COLLECTIONS],
  ['map_node_submissions', 'map_node_moderation_notifications', 'map_node_moderation_access_links'],
  [...DIRECTUS_CONTENT_OPS_COLLECTIONS, ...DIRECTUS_IMPACT_COLLECTIONS]
);

// A role reads the union of its policies' read grants.
const ROLES = Object.freeze({
  'Steward Editor': ['Greenpill Steward Editor', ASSIGNED_EDITOR_POLICY_NAME],
  'Trusted Publisher': ['Greenpill Trusted Publisher'],
});
const FORM_COLLECTIONS = ['chapters', 'guilds', 'chapter_update_requests'];

function readable(policies: readonly string[], collection: string) {
  return new Set(permissions
    .filter((permission) => policies.includes(permission.policy) && permission.collection === collection && permission.action === 'read')
    .flatMap((permission) => permission.fields));
}

// Every field the Studio setup puts in a form group, with its group.
function groupedFields(collection: string) {
  return [...studio.fields, ...studio.extraGroupMembers]
    .filter((field) => field.collection === collection && typeof field.meta.group === 'string')
    .map((field) => ({ field: field.field, group: field.meta.group as string }));
}

test('every form group a role can read a field in is readable by that role', () => {
  // Data Studio leaves out every field whose group the viewer cannot read.
  for (const [role, policies] of Object.entries(ROLES)) {
    for (const collection of FORM_COLLECTIONS) {
      const fields = readable(policies, collection);
      for (const { field, group } of groupedFields(collection)) {
        if (!fields.has(field)) continue;
        assert.ok(fields.has(group), `${role} reads ${collection}.${field} but not its group ${group}`);
      }
    }
  }
  // The groups the Studio setup creates are the ones granted, so a new group
  // cannot leave its fields hidden.
  for (const collection of ['chapters', 'guilds']) {
    const planned = studio.groupFields.filter((group) => group.collection === collection).map((group) => group.field);
    assert.ok(planned.length > 0, collection);
    for (const group of planned) assert.ok(formReadAliases(collection).includes(group), `${collection}.${group}`);
  }
});

test('stewards and publishers can read the lists on chapter, guild and change request forms', () => {
  const lists = { chapters: ['initiatives'], guilds: ['projects'], chapter_update_requests: ['links', 'proof_signals'] };
  for (const [role, policies] of Object.entries(ROLES)) {
    for (const [collection, fields] of Object.entries(lists)) {
      const granted = readable(policies, collection);
      for (const field of fields) assert.ok(granted.has(field), `${role} cannot read ${collection}.${field}`);
    }
  }
});

// Alias fields of a collection as the Studio setup knows them: form groups,
// one-to-many lists it configures, and the relation aliases content:setup owns.
function aliasFields(collection: string) {
  return new Set([
    ...studio.groupFields.filter((group) => group.collection === collection).map((group) => group.field),
    ...studio.fields
      .filter((field) => field.collection === collection && (field.meta.special as string[] | null)?.some((kind) => ['o2m', 'alias'].includes(kind)))
      .map((field) => field.field),
    ...studio.extraGroupMembers.filter((member) => member.collection === collection).map((member) => member.field),
  ]);
}

const writeGrants = () => permissions.filter((permission) => ['create', 'update'].includes(permission.action));

test('the form grants are alias fields: every name they add is a form group or a list', () => {
  for (const collection of FORM_COLLECTIONS) {
    const aliases = aliasFields(collection);
    for (const field of formReadAliases(collection)) {
      assert.ok(aliases.has(field), `${collection}.${field} is not an alias field`);
    }
    // The form groups are no-data alias fields, so granting one reaches no column.
    for (const group of studio.groupFields.filter((candidate) => candidate.collection === collection)) {
      assert.deepEqual(group.meta.special, ['alias', 'no-data', 'group'], `${collection}.${group.field}`);
    }
  }
});

test('a write grant holds no alias except the form groups of fields it already writes', () => {
  for (const permission of writeGrants()) {
    const aliases = aliasFields(permission.collection);
    const groups = new Set(formGroupAliases(permission.collection));
    const fields = permission.fields ?? [];
    for (const field of fields.filter((name) => aliases.has(name))) {
      // Lists (initiatives, projects, links, proof signals) stay read-only.
      assert.ok(groups.has(field), `${permission.policy} ${permission.action} ${permission.collection}.${field}: only form groups may be written`);
      // No new write reach: the group holds a field this grant already writes.
      const members = FIELD_GROUPS_BY_COLLECTION[permission.collection][field].fields;
      assert.ok(members.some((member) => fields.includes(member)), `${permission.policy} ${permission.action} ${permission.collection}.${field} holds no field the grant writes`);
    }
    // And a grant that writes a grouped field carries its group, or Data
    // Studio shows the field disabled.
    for (const group of formGroupAliases(permission.collection)) {
      const members = FIELD_GROUPS_BY_COLLECTION[permission.collection][group].fields;
      if (members.some((member) => fields.includes(member))) {
        assert.ok(fields.includes(group), `${permission.policy} ${permission.action} ${permission.collection} writes into ${group} without it`);
      }
    }
  }
});

test('adding the form groups to a write grant adds group aliases and nothing else', () => {
  for (const permission of writeGrants()) {
    const fields = permission.fields ?? [];
    const groups = new Set(formGroupAliases(permission.collection));
    const columns = fields.filter((field) => !groups.has(field));
    const added = withFormGroups(permission.collection, columns).filter((field) => !columns.includes(field));
    assert.ok(added.every((field) => groups.has(field)), `${permission.policy} ${permission.action} ${permission.collection}`);
    assert.deepEqual(new Set(withFormGroups(permission.collection, columns)), new Set(fields), `${permission.policy} ${permission.action} ${permission.collection}`);
  }
});

test('the smoke refuses a steward who cannot read a form group, a list, or update a group they write into', async () => {
  const steward = (
    fieldsByCollection: Record<string, Array<{ field: string; meta?: { group: string | null } }>>,
    updatable: Record<string, string[]> = { guilds: ['name', 'group_identity'] }
  ) => ({
    request: async (path: string) => {
      if (path === '/permissions/me') {
        return { data: Object.fromEntries(Object.entries(updatable).map(([collection, fields]) => [collection, { update: { access: 'partial', fields } }])) };
      }
      return { data: fieldsByCollection[path.replace('/fields/', '')] ?? [] };
    },
  });
  const complete = {
    chapters: [{ field: 'group_story', meta: { group: null } }, { field: 'summary', meta: { group: 'group_story' } }, { field: 'initiatives', meta: { group: 'group_story' } }],
    guilds: [{ field: 'group_identity', meta: { group: null } }, { field: 'name', meta: { group: 'group_identity' } }, { field: 'projects', meta: { group: 'group_identity' } }],
    chapter_update_requests: [{ field: 'links' }, { field: 'proof_signals' }],
  };
  await assertStewardFormsReadable(steward(complete));
  await assert.rejects(
    assertStewardFormsReadable(steward({ ...complete, guilds: complete.guilds.filter((field) => field.field !== 'group_identity') })),
    /guilds form group\(s\) group_identity/
  );
  await assert.rejects(
    assertStewardFormsReadable(steward({ ...complete, chapter_update_requests: [{ field: 'links' }] })),
    /chapter_update_requests list field\(s\) proof_signals/
  );
  // Updatable name without its group: Data Studio would show it disabled.
  await assert.rejects(
    assertStewardFormsReadable(steward(complete, { guilds: ['name'] })),
    /can update guilds fields in group_identity but not the group itself/
  );
});
