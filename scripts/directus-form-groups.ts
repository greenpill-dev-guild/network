// The form groups of the chapter and guild forms in Data Studio, and the fields
// each one holds.
//
// The Studio setup creates each group as an alias field and puts its members
// in it. Content setup grants the group aliases next to the members, because
// Data Studio leaves out every field whose group the viewer cannot read and
// disables every field whose group the viewer cannot write. A group alias
// holds no data, so granting it adds no reach of its own.

export interface FieldGroup {
  label: string;
  sort: number;
  fields: readonly string[];
}

// Form groups: members get meta.group; the group alias fields are created by
// ensureGroupField during apply. Field names not listed stay ungrouped.
export const FIELD_GROUPS_BY_COLLECTION: Readonly<Record<string, Readonly<Record<string, FieldGroup>>>> = Object.freeze({
  chapters: {
    group_identity: {
      label: 'Identity & Location',
      sort: 1,
      fields: ['slug', 'name', 'city', 'country', 'region', 'entity_status', 'founded', 'latitude', 'longitude'],
    },
    group_story: {
      label: 'Story',
      sort: 2,
      fields: [
        'summary', 'intro_quote', 'intro_quote_attribution', 'stewards', 'steward_slugs', 'theme_slugs',
        'related_chapter_slugs', 'featured_story', 'featured_story_slugs', 'authored_resource_slugs',
        'featured_weight', 'initiatives',
      ],
    },
    group_links_media: {
      label: 'Links & Media',
      sort: 3,
      fields: [
        'primary_link', 'links', 'connect_links', 'image_file', 'image_alt', 'image_credit', 'image', 'media',
        'proof_signals', 'seo',
      ],
    },
    group_impact: {
      label: 'Impact',
      sort: 4,
      fields: ['impact_sources'],
    },
    group_workflow: {
      label: 'Publishing & Workflow',
      sort: 5,
      fields: [
        'publication_status', 'published_at', 'reviewed_at', 'reviewed_by', 'created_at', 'updated_at', 'data',
        'editor_assignments', 'update_requests',
      ],
    },
  },
  guilds: {
    group_identity: {
      label: 'Identity',
      sort: 1,
      fields: ['slug', 'name', 'type', 'entity_status', 'founded_year', 'oneliner', 'cadence'],
    },
    group_story: {
      label: 'Story & Members',
      sort: 2,
      fields: [
        'summary', 'description', 'mandate_paragraphs', 'outputs', 'principles', 'stewards', 'steward_slugs',
        'member_slugs', 'public_members', 'theme_slugs', 'featured_weight', 'projects',
      ],
    },
    group_links_media: {
      label: 'Links & Media',
      sort: 3,
      fields: ['links', 'connect_links', 'image', 'media', 'proof_signals', 'seo'],
    },
    group_workflow: {
      label: 'Publishing & Workflow',
      sort: 4,
      fields: [
        'publication_status', 'published_at', 'reviewed_at', 'reviewed_by', 'created_at', 'updated_at', 'data',
        'editor_assignments',
      ],
    },
  },
});

// A plan built for some collections asks about the others as undefined.
function baseCollection(collection: string | undefined) {
  return String(collection ?? '').replace(/^(content|intake|impact)[._]/, '');
}

// Every form group alias of a collection.
export function formGroupAliases(collection: string): string[] {
  return Object.keys(FIELD_GROUPS_BY_COLLECTION[baseCollection(collection)] ?? {});
}

// The groups holding at least one of the given fields: the group aliases a
// grant on those fields needs, and no others.
export function formGroupsHolding(collection: string, fields: readonly string[]): string[] {
  const granted = new Set(fields);
  return Object.entries(FIELD_GROUPS_BY_COLLECTION[baseCollection(collection)] ?? {})
    .filter(([, group]) => group.fields.some((field) => granted.has(field)))
    .map(([alias]) => alias);
}

// A write grant's fields with the group aliases it needs for Data Studio to
// enable them. Only group aliases are ever added, never a column.
export function withFormGroups(collection: string, fields: readonly string[]): string[] {
  return [...new Set([...fields, ...formGroupsHolding(collection, fields)])];
}
