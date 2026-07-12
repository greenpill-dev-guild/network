#!/usr/bin/env bun

import { pathToFileURL } from 'node:url';
import {
  DIRECTUS_OPERATIONAL_COLLECTIONS,
  DIRECTUS_STEWARD_ACCESS_COLLECTIONS,
  DIRECTUS_STEWARD_WORKFLOW_COLLECTIONS,
  createDirectusClient,
} from './directus-operational-content-setup.ts';

const OPERATIONAL_COLLECTION_META = Object.freeze({
  themes: {
    hidden: false,
    singleton: false,
    icon: 'sell',
    note: 'Reference themes used to group chapters, initiatives, people, guilds, and projects.',
    display_template: '{{ name }}',
  },
  people: {
    hidden: false,
    singleton: false,
    icon: 'person',
    note: 'Public steward and contributor profiles referenced by operational content.',
    display_template: '{{ display_name }}',
  },
  chapters: {
    hidden: false,
    singleton: false,
    icon: 'location_city',
    note: 'Chapter profiles. Stewards can edit assigned draft or review-ready records.',
    display_template: '{{ name }}',
    preview_url: 'https://greenpill.network/chapters/{{ slug }}',
  },
  chapter_initiatives: {
    hidden: false,
    singleton: false,
    icon: 'local_activity',
    note: 'Chapter-owned programs, events, campaigns, education series, and impact efforts.',
    display_template: '{{ title }}',
  },
  guilds: {
    hidden: false,
    singleton: false,
    icon: 'groups',
    note: 'Guild profiles and working groups. Stewards can edit assigned draft or review-ready records.',
    display_template: '{{ name }}',
  },
  projects: {
    hidden: false,
    singleton: false,
    icon: 'construction',
    note: 'Guild-owned tools, products, and workstreams.',
    display_template: '{{ name }}',
  },
});

const ACCESS_COLLECTION_META = Object.freeze({
  chapter_editor_assignments: {
    hidden: true,
    singleton: false,
    icon: 'assignment_ind',
    note: 'Internal mapping from Directus users to chapters they can edit.',
    display_template: '{{ directus_user_id.email }} -> {{ chapter_slug.name }}',
  },
  guild_editor_assignments: {
    hidden: true,
    singleton: false,
    icon: 'assignment_ind',
    note: 'Internal mapping from Directus users to guilds they can edit.',
    display_template: '{{ directus_user_id.email }} -> {{ guild_slug.name }}',
  },
});

const STEWARD_WORKFLOW_COLLECTION_META = Object.freeze({
  chapter_update_requests: {
    hidden: false,
    singleton: false,
    icon: 'edit_document',
    note: 'Steward-requested edits to live chapter profiles. Use this when a published chapter should stay online during review.',
    display_template: '{{ title }}',
    preview_url: 'https://greenpill.network/chapters/{{ chapter_slug }}',
    archive_field: 'request_status',
    archive_value: 'archived',
    unarchive_value: 'draft',
  },
  chapter_update_request_links: {
    hidden: true,
    singleton: false,
    icon: 'link',
    note: 'Structured public links attached to chapter update requests.',
    display_template: '{{ label }}',
  },
  chapter_update_request_proof_signals: {
    hidden: true,
    singleton: false,
    icon: 'fact_check',
    note: 'Structured public proof signals attached to chapter update requests.',
    display_template: '{{ label }}',
  },
});

const MAP_NODE_MODERATION_COLLECTIONS = Object.freeze([
  'map_node_submissions',
  'map_node_moderation_notifications',
]);

const MAP_NODE_MODERATION_COLLECTION_META = Object.freeze({
  map_node_submissions: {
    hidden: false,
    singleton: false,
    icon: 'approval',
    note: 'Private map-node intake. Review the submission, then set its moderation status.',
    display_template: '{{ display_name }} · {{ place_name }}',
  },
  map_node_moderation_notifications: {
    hidden: false,
    singleton: false,
    icon: 'mark_email_unread',
    note: 'Private delivery audit for map moderation alerts. Failed alerts are retained here for operator follow-up.',
    display_template: '{{ kind }} · {{ status }}',
  },
});

const PUBLICATION_STATUS_CHOICES = Object.freeze([
  { text: 'Draft', value: 'draft' },
  { text: 'Pending Review', value: 'pending_review' },
  { text: 'Published', value: 'published' },
  { text: 'Archived', value: 'archived' },
]);

const REQUEST_STATUS_CHOICES = Object.freeze([
  { text: 'Draft', value: 'draft' },
  { text: 'Pending Review', value: 'pending_review' },
  { text: 'Needs Changes', value: 'needs_changes' },
  { text: 'Accepted', value: 'accepted' },
  { text: 'Declined', value: 'declined' },
  { text: 'Archived', value: 'archived' },
]);

const MAP_NODE_STATUS_CHOICES = Object.freeze([
  { text: 'Pending approval', value: 'pending' },
  { text: 'Approved', value: 'approved' },
  { text: 'Rejected', value: 'rejected' },
  { text: 'Archived', value: 'archived' },
]);

const MAP_NODE_MODERATION_NOTIFICATION_STATUS_CHOICES = Object.freeze([
  { text: 'Queued', value: 'queued' },
  { text: 'Delivery claimed', value: 'delivery_claimed' },
  { text: 'Retry scheduled', value: 'retry_scheduled' },
  { text: 'Sent', value: 'sent' },
  { text: 'Failed', value: 'failed' },
  { text: 'Skipped', value: 'skipped' },
]);

const ENTITY_STATUS_CHOICES = Object.freeze([
  { text: 'Active', value: 'active' },
  { text: 'Forming', value: 'forming' },
  { text: 'Inactive', value: 'inactive' },
  { text: 'Archived', value: 'archived' },
]);

const fieldMeta = ({
  sort,
  width = 'full',
  note = null,
  interface: interfaceName = 'input',
  options = null,
  display = null,
  display_options = null,
  hidden = false,
  readonly = false,
  required = false,
  searchable = true,
  special = null,
}: {
  sort: number;
  width?: string;
  note?: string | null;
  interface?: string;
  options?: unknown;
  display?: string | null;
  display_options?: unknown;
  hidden?: boolean;
  readonly?: boolean;
  required?: boolean;
  searchable?: boolean;
  special?: string[] | null;
}) => ({
  interface: interfaceName,
  options,
  display,
  display_options,
  readonly,
  hidden,
  sort,
  width,
  note,
  required,
  searchable,
  special,
});

const input = (sort, note = null, width = 'half', options = null) => fieldMeta({ sort, note, width, options });
const requiredInput = (sort, note = null, width = 'half', options = null) => fieldMeta({
  sort,
  note,
  width,
  options,
  required: true,
});
const textarea = (sort, note = null) => fieldMeta({ sort, note, interface: 'input-multiline' });
const requiredTextarea = (sort, note = null) => fieldMeta({
  sort,
  note,
  interface: 'input-multiline',
  required: true,
});
const tags = (sort, note = null, width = 'full') => fieldMeta({
  sort,
  note,
  width,
  interface: 'tags',
  display: 'labels',
});
const json = (sort, note = null) => fieldMeta({
  sort,
  note,
  interface: 'input-code',
  options: { language: 'json' },
  display: 'formatted-json-value',
});
const number = (sort, note = null, width = 'half') => fieldMeta({
  sort,
  note,
  width,
  interface: 'input',
  options: { type: 'number' },
});
const url = (sort, note = null, width = 'half') => fieldMeta({
  sort,
  note,
  width,
  interface: 'input',
  options: { iconRight: 'link' },
});
const relation = (sort, note, template = '{{ name }}', required = false) => fieldMeta({
  sort,
  note,
  width: 'half',
  interface: 'select-dropdown-m2o',
  options: { template },
  display: 'related-values',
  display_options: { template },
  special: ['m2o'],
  required,
});
const workflow = (sort = 900) => ({
  publication_status: fieldMeta({
    sort,
    width: 'half',
    note: 'Draft and pending review are editable by assigned stewards. Publishing is reserved for trusted publishers.',
    interface: 'select-dropdown',
    options: { choices: PUBLICATION_STATUS_CHOICES },
    display: 'labels',
  }),
  published_at: fieldMeta({
    sort: sort + 1,
    width: 'half',
    note: 'Set when a trusted publisher publishes the record.',
    interface: 'datetime',
  }),
  reviewed_at: fieldMeta({
    sort: sort + 2,
    width: 'half',
    note: 'Set when a trusted publisher completes review.',
    interface: 'datetime',
  }),
  reviewed_by: input(sort + 3, 'Reviewer or publisher identifier.', 'half'),
  created_at: fieldMeta({ sort: sort + 4, width: 'half', interface: 'datetime', readonly: true, hidden: true }),
  updated_at: fieldMeta({ sort: sort + 5, width: 'half', interface: 'datetime', readonly: true, hidden: true }),
  data: fieldMeta({
    sort: sort + 6,
    note: 'Generated compatibility payload. Edit the structured fields instead.',
    interface: 'input-code',
    options: { language: 'json' },
    readonly: true,
    hidden: true,
  }),
});

const FIELD_META_BY_COLLECTION = Object.freeze({
  themes: {
    slug: input(1, 'Stable identifier used in URLs and snapshots. Set once, then avoid changing.', 'half'),
    name: input(2, 'Public theme name.', 'half'),
    summary: textarea(3, 'Short public description of this theme.'),
    sort_order: number(4, 'Lower numbers appear first.', 'half'),
    ...workflow(),
  },
  people: {
    slug: input(1, 'Stable public profile identifier. Set once, then avoid changing.', 'half'),
    display_name: input(2, 'Public display name.', 'half'),
    role: input(3, 'Short public role or affiliation.', 'half'),
    avatar: url(4, 'Public avatar image URL.', 'half'),
    bio: textarea(5, 'Public bio. Keep it concise.'),
    theme_slugs: tags(6, 'Theme slugs connected to this person.'),
    links: json(7, 'Array of public links.'),
    media: json(8, 'Optional public media metadata.'),
    seo: json(9, 'Optional SEO controls.'),
    ...workflow(),
  },
  chapters: {
    slug: input(1, 'Stable chapter identifier used in URLs and assignments. Set once, then avoid changing.', 'half'),
    name: input(2, 'Public chapter name.', 'half'),
    city: input(3, 'Primary city or place.', 'half'),
    country: input(4, 'Country.', 'half'),
    region: input(5, 'Optional region, province, or state.', 'half'),
    entity_status: fieldMeta({ sort: 6, width: 'half', interface: 'select-dropdown', options: { choices: ENTITY_STATUS_CHOICES } }),
    summary: textarea(7, 'Short public summary for cards and chapter listings.'),
    intro_quote: textarea(8, 'Optional quote shown on the chapter detail page.'),
    intro_quote_attribution: input(9, 'Attribution for the intro quote.', 'half'),
    image: url(10, 'Primary public image URL.', 'half'),
    founded: input(11, 'Founding date or year as public text.', 'half'),
    latitude: number(12, 'Map latitude.', 'half'),
    longitude: number(13, 'Map longitude.', 'half'),
    primary_link: url(14, 'Main public link for the chapter.', 'half'),
    stewards: json(15, 'Public steward cards for this chapter.'),
    steward_slugs: tags(16, 'Person slugs for public steward references.'),
    theme_slugs: tags(17, 'Theme slugs connected to this chapter.'),
    links: json(18, 'Array of public chapter links.'),
    connect_links: json(19, 'Public ways to connect with the chapter.'),
    related_chapter_slugs: tags(20, 'Related chapter slugs.'),
    featured_story: json(21, 'Optional featured story object.'),
    featured_story_slugs: tags(22, 'Story slugs to feature for this chapter.'),
    authored_resource_slugs: tags(23, 'Resource slugs authored by this chapter.'),
    impact_sources: json(24, 'Public impact source configuration.'),
    featured_weight: number(25, 'Higher numbers appear earlier in featured placements.', 'half'),
    proof_signals: json(26, 'Array of public proof signals.'),
    media: json(27, 'Optional public media metadata.'),
    seo: json(28, 'Optional SEO controls.'),
    ...workflow(),
  },
  chapter_initiatives: {
    slug: input(1, 'Stable initiative identifier. Set once, then avoid changing.', 'half'),
    chapter_slug: relation(2, 'Owning chapter. Assigned stewards can create initiatives only under their chapter.'),
    title: input(3, 'Public initiative title.', 'half'),
    entity_status: fieldMeta({ sort: 4, width: 'half', interface: 'select-dropdown', options: { choices: ENTITY_STATUS_CHOICES } }),
    summary: textarea(5, 'Short public summary for cards and chapter pages.'),
    description: textarea(6, 'Longer public description.'),
    theme_slugs: tags(7, 'Theme slugs connected to this initiative.'),
    links: json(8, 'Array of public initiative links.'),
    proof_signals: json(9, 'Array of public proof signals.'),
    impact_sources: json(10, 'Public impact source configuration.'),
    related_story_slugs: tags(11, 'Related story slugs.'),
    related_resource_slugs: tags(12, 'Related resource slugs.'),
    featured_weight: number(13, 'Higher numbers appear earlier in featured placements.', 'half'),
    ...workflow(),
  },
  guilds: {
    slug: input(1, 'Stable guild identifier used in URLs and assignments. Set once, then avoid changing.', 'half'),
    name: input(2, 'Public guild name.', 'half'),
    type: input(3, 'Guild type.', 'half'),
    entity_status: fieldMeta({ sort: 4, width: 'half', interface: 'select-dropdown', options: { choices: ENTITY_STATUS_CHOICES } }),
    summary: textarea(5, 'Short public summary for cards and listings.'),
    description: textarea(6, 'Longer public guild description.'),
    founded_year: number(7, 'Founding year.', 'half'),
    oneliner: input(8, 'One-line public description.', 'half'),
    image: url(9, 'Primary public image URL.', 'half'),
    cadence: input(10, 'Public meeting or working cadence.', 'half'),
    stewards: json(11, 'Public steward cards for this guild.'),
    steward_slugs: tags(12, 'Person slugs for public steward references.'),
    member_slugs: tags(13, 'Person slugs for public member references.'),
    public_members: json(14, 'Public member cards.'),
    theme_slugs: tags(15, 'Theme slugs connected to this guild.'),
    links: json(16, 'Array of public guild links.'),
    connect_links: json(17, 'Public ways to connect with the guild.'),
    mandate_paragraphs: json(18, 'Public mandate paragraphs.'),
    outputs: json(19, 'Public guild outputs.'),
    principles: json(20, 'Public guild principles.'),
    featured_weight: number(21, 'Higher numbers appear earlier in featured placements.', 'half'),
    proof_signals: json(22, 'Array of public proof signals.'),
    media: json(23, 'Optional public media metadata.'),
    seo: json(24, 'Optional SEO controls.'),
    ...workflow(),
  },
  projects: {
    slug: input(1, 'Stable project identifier. Set once, then avoid changing.', 'half'),
    name: input(2, 'Public project name.', 'half'),
    entity_status: fieldMeta({ sort: 3, width: 'half', interface: 'select-dropdown', options: { choices: ENTITY_STATUS_CHOICES } }),
    guild_slug: relation(4, 'Owning guild. Assigned guild stewards can create projects only under their guild.'),
    summary: textarea(5, 'Short public summary for cards and listings.'),
    description: textarea(6, 'Longer public project description.'),
    image: url(7, 'Primary public image URL.', 'half'),
    tech_stack: tags(8, 'Public technology labels.'),
    repo_url: url(9, 'Public repository URL.', 'half'),
    live_url: url(10, 'Public live app or website URL.', 'half'),
    steward_slugs: tags(11, 'Person slugs for public steward references.'),
    theme_slugs: tags(12, 'Theme slugs connected to this project.'),
    featured_weight: number(13, 'Higher numbers appear earlier in featured placements.', 'half'),
    proof_signals: json(14, 'Array of public proof signals.'),
    media: json(15, 'Optional public media metadata.'),
    seo: json(16, 'Optional SEO controls.'),
    ...workflow(),
  },
  chapter_update_requests: {
    id: fieldMeta({ sort: 1, width: 'half', interface: 'input', readonly: true, hidden: true }),
    chapter_slug: relation(2, 'Chapter this request changes. Assigned stewards can create requests only for their chapter.', '{{ name }}', true),
    title: requiredInput(3, 'Short internal review title, for example "Refresh Nigeria chapter links".', 'half'),
    request_status: fieldMeta({
      sort: 4,
      width: 'half',
      note: 'Stewards use Draft while editing and Pending Review when ready. Publishers use Needs Changes, Accepted, Declined, or Archived.',
      interface: 'select-dropdown',
      options: { choices: REQUEST_STATUS_CHOICES },
      display: 'labels',
      required: true,
    }),
    summary: requiredTextarea(5, 'Plain-language summary of what should change and why.'),
    proposed_summary: textarea(6, 'Optional replacement text for the public chapter summary. Leave blank if the current summary should stay.'),
    proposed_primary_link: url(7, 'Optional replacement main public link for the chapter.', 'half'),
    proposed_image: url(8, 'Optional replacement public image URL.', 'half'),
    proposed_image_alt: textarea(9, 'Required if proposing a new image. Describe the image for screen readers.'),
    proposed_image_credit: input(10, 'Optional public credit for the proposed image.', 'half'),
    links: fieldMeta({
      sort: 11,
      note: 'Add public links one row at a time. Prefer this over raw JSON for website, social, program, and contact links.',
      interface: 'list-o2m',
      display: 'related-values',
      display_options: { template: '{{ label }}' },
      options: { template: '{{ label }}' },
      readonly: false,
      hidden: false,
      width: 'full',
      special: ['o2m'],
    }),
    proof_signals: fieldMeta({
      sort: 12,
      note: 'Add public proof signals one row at a time, such as program count, active members, cohorts, or public source-backed impact.',
      interface: 'list-o2m',
      display: 'related-values',
      display_options: { template: '{{ label }}' },
      options: { template: '{{ label }}' },
      readonly: false,
      hidden: false,
      width: 'full',
      special: ['o2m'],
    }),
    requested_changes: json(13, 'Advanced fallback JSON for unusual changes that do not fit the structured fields above. Keep private notes out.'),
    reviewer_notes: textarea(14, 'Publisher review notes. Use this for requested changes or final review context.'),
    reviewed_by: input(15, 'Reviewer or publisher identifier.', 'half'),
    reviewed_at: fieldMeta({ sort: 16, width: 'half', interface: 'datetime' }),
    created_at: fieldMeta({ sort: 17, width: 'half', interface: 'datetime', readonly: true, hidden: true }),
    updated_at: fieldMeta({ sort: 18, width: 'half', interface: 'datetime', readonly: true, hidden: true }),
  },
  chapter_update_request_links: {
    id: fieldMeta({ sort: 1, width: 'half', interface: 'input', readonly: true, hidden: true }),
    update_request_id: relation(2, 'Parent chapter update request.', '{{ title }}', true),
    chapter_slug: fieldMeta({ sort: 3, width: 'half', interface: 'input', readonly: true, hidden: true, required: true }),
    sort_order: number(4, 'Lower numbers appear first.', 'half'),
    label: requiredInput(5, 'Public label, for example "Chapter website" or "Water Cup updates".', 'half'),
    url: fieldMeta({
      sort: 6,
      width: 'half',
      note: 'Public URL. Use a complete https:// link.',
      interface: 'input',
      options: { iconRight: 'link' },
      required: true,
    }),
    kind: input(7, 'Optional link type, for example website, social, event, program, or contact.', 'half'),
    subtext: input(8, 'Optional supporting text shown near the link.', 'half'),
    handle: input(9, 'Optional public social handle.', 'half'),
    action: input(10, 'Optional action label, for example "Join" or "Learn more".', 'half'),
    icon: input(11, 'Optional icon token if the website supports one.', 'half'),
    created_at: fieldMeta({ sort: 12, width: 'half', interface: 'datetime', readonly: true, hidden: true }),
    updated_at: fieldMeta({ sort: 13, width: 'half', interface: 'datetime', readonly: true, hidden: true }),
  },
  chapter_update_request_proof_signals: {
    id: fieldMeta({ sort: 1, width: 'half', interface: 'input', readonly: true, hidden: true }),
    update_request_id: relation(2, 'Parent chapter update request.', '{{ title }}', true),
    chapter_slug: fieldMeta({ sort: 3, width: 'half', interface: 'input', readonly: true, hidden: true, required: true }),
    sort_order: number(4, 'Lower numbers appear first.', 'half'),
    label: requiredInput(5, 'Public label, for example "Education program" or "Active contributors".', 'half'),
    value: requiredInput(6, 'Public value, for example "10 weeks" or "25 contributors".', 'half'),
    source: input(7, 'Optional public source name.', 'half'),
    href: url(8, 'Optional public source URL.', 'half'),
    created_at: fieldMeta({ sort: 9, width: 'half', interface: 'datetime', readonly: true, hidden: true }),
    updated_at: fieldMeta({ sort: 10, width: 'half', interface: 'datetime', readonly: true, hidden: true }),
  },
  chapter_editor_assignments: {
    id: fieldMeta({ sort: 1, width: 'half', interface: 'input', readonly: true, hidden: true }),
    chapter_slug: relation(2, 'Chapter this user can edit.'),
    directus_user_id: relation(3, 'Directus user who receives chapter editing access.', '{{ email }}'),
    access_level: fieldMeta({
      sort: 4,
      width: 'half',
      interface: 'select-dropdown',
      options: { choices: [{ text: 'Editor', value: 'editor' }] },
    }),
    created_at: fieldMeta({ sort: 5, width: 'half', interface: 'datetime', readonly: true, hidden: true }),
    updated_at: fieldMeta({ sort: 6, width: 'half', interface: 'datetime', readonly: true, hidden: true }),
  },
  guild_editor_assignments: {
    id: fieldMeta({ sort: 1, width: 'half', interface: 'input', readonly: true, hidden: true }),
    guild_slug: relation(2, 'Guild this user can edit.'),
    directus_user_id: relation(3, 'Directus user who receives guild editing access.', '{{ email }}'),
    access_level: fieldMeta({
      sort: 4,
      width: 'half',
      interface: 'select-dropdown',
      options: { choices: [{ text: 'Editor', value: 'editor' }] },
    }),
    created_at: fieldMeta({ sort: 5, width: 'half', interface: 'datetime', readonly: true, hidden: true }),
    updated_at: fieldMeta({ sort: 6, width: 'half', interface: 'datetime', readonly: true, hidden: true }),
  },
  map_node_submissions: {
    id: fieldMeta({ sort: 1, width: 'half', interface: 'input', readonly: true, hidden: true }),
    status: fieldMeta({
      sort: 2,
      width: 'half',
      note: 'Approve only after reviewing the submission. Directus records the actor and status transition.',
      interface: 'select-dropdown',
      options: { choices: MAP_NODE_STATUS_CHOICES },
      display: 'labels',
      required: true,
    }),
    display_name: fieldMeta({ sort: 3, width: 'half', interface: 'input', readonly: true }),
    place_name: fieldMeta({ sort: 4, width: 'half', interface: 'input', readonly: true }),
    city: fieldMeta({ sort: 5, width: 'half', interface: 'input', readonly: true }),
    region: fieldMeta({ sort: 6, width: 'half', interface: 'input', readonly: true }),
    country: fieldMeta({ sort: 7, width: 'half', interface: 'input', readonly: true }),
    latitude: fieldMeta({ sort: 8, width: 'half', interface: 'input', options: { type: 'number' }, readonly: true }),
    longitude: fieldMeta({ sort: 9, width: 'half', interface: 'input', options: { type: 'number' }, readonly: true }),
    role: fieldMeta({ sort: 10, width: 'half', interface: 'input', readonly: true }),
    chapter_slug: fieldMeta({ sort: 11, width: 'half', interface: 'input', readonly: true }),
    themes: fieldMeta({
      sort: 12,
      note: 'Public themes selected by the submitter.',
      width: 'full',
      interface: 'tags',
      display: 'labels',
      readonly: true,
    }),
    public_note: textarea(13, 'Public tagline submitted for the map.'),
    approved_at: fieldMeta({ sort: 14, width: 'half', interface: 'datetime', readonly: true }),
    created_at: fieldMeta({ sort: 15, width: 'half', interface: 'datetime', readonly: true }),
    updated_at: fieldMeta({ sort: 16, width: 'half', interface: 'datetime', readonly: true }),
  },
  map_node_moderation_notifications: {
    id: fieldMeta({ sort: 1, width: 'half', interface: 'input', readonly: true, hidden: true }),
    kind: fieldMeta({ sort: 2, width: 'half', interface: 'select-dropdown', readonly: true }),
    submission_id: fieldMeta({ sort: 3, width: 'half', interface: 'input', readonly: true }),
    digest_date: fieldMeta({ sort: 4, width: 'half', interface: 'datetime', readonly: true }),
    status: fieldMeta({
      sort: 5,
      width: 'half',
      note: 'Delivery status is maintained by the agent. A failed alert remains visible here for operator follow-up.',
      interface: 'select-dropdown',
      options: { choices: MAP_NODE_MODERATION_NOTIFICATION_STATUS_CHOICES },
      display: 'labels',
      readonly: true,
    }),
    attempts: fieldMeta({ sort: 6, width: 'half', interface: 'input', readonly: true }),
    next_attempt_at: fieldMeta({ sort: 7, width: 'half', interface: 'datetime', readonly: true }),
    delivery_claimed_at: fieldMeta({ sort: 8, width: 'half', interface: 'datetime', readonly: true }),
    provider_message_id: fieldMeta({ sort: 9, width: 'full', interface: 'input', readonly: true }),
    provider_error: fieldMeta({ sort: 10, width: 'full', interface: 'input', readonly: true }),
    sent_at: fieldMeta({ sort: 11, width: 'half', interface: 'datetime', readonly: true }),
    created_at: fieldMeta({ sort: 12, width: 'half', interface: 'datetime', readonly: true }),
    updated_at: fieldMeta({ sort: 13, width: 'half', interface: 'datetime', readonly: true }),
  },
});

function cleanCollectionName(collection) {
  return collection.replace(/^(content|intake)[._]/, '');
}

function resolveSchemaCollectionNames(availableCollectionNames, schema, collectionNames) {
  const names = new Set(availableCollectionNames);
  return collectionNames.map((collection) => {
    const candidates = [
      collection,
      `${schema}.${collection}`,
      `${schema}_${collection}`,
    ];
    const match = candidates.find((candidate) => names.has(candidate));
    if (!match) {
      throw new Error(`Directus collection for ${schema}.${collection} was not found.`);
    }
    return match;
  });
}

function encodePathSegment(segment) {
  return encodeURIComponent(segment);
}

export function buildDirectusStudioMetadataPlan(
  operationalCollectionNames = DIRECTUS_OPERATIONAL_COLLECTIONS,
  accessCollectionNames = DIRECTUS_STEWARD_ACCESS_COLLECTIONS,
  workflowCollectionNames = DIRECTUS_STEWARD_WORKFLOW_COLLECTIONS,
  mapModerationCollectionNames = MAP_NODE_MODERATION_COLLECTIONS
) {
  const collections = [
    ...operationalCollectionNames,
    ...accessCollectionNames,
    ...workflowCollectionNames,
    ...mapModerationCollectionNames,
  ];

  return {
    collections: collections.map((collection) => {
      const base = cleanCollectionName(collection);
      const meta = OPERATIONAL_COLLECTION_META[base] ??
        ACCESS_COLLECTION_META[base] ??
        STEWARD_WORKFLOW_COLLECTION_META[base] ??
        MAP_NODE_MODERATION_COLLECTION_META[base];
      if (!meta) throw new Error(`Missing Directus Studio collection metadata for ${base}.`);
      return {
        collection,
        meta: {
          collection,
          accountability: 'all',
          ...(base in OPERATIONAL_COLLECTION_META
            ? {
              archive_field: 'publication_status',
              archive_value: 'archived',
              unarchive_value: 'draft',
            }
            : {}),
          ...meta,
        },
      };
    }),
    fields: collections.flatMap((collection) => {
      const base = cleanCollectionName(collection);
      const fields = FIELD_META_BY_COLLECTION[base];
      if (!fields) throw new Error(`Missing Directus Studio field metadata for ${base}.`);
      return Object.entries(fields as Record<string, Record<string, unknown>>).map(([field, meta]) => ({
        collection,
        field,
        meta: {
          collection,
          field,
          ...meta,
        },
      }));
    }),
  };
}

const STUDIO_BOOKMARKS = Object.freeze([
  {
    role: 'Greenpill Steward Editor',
    collection: 'chapters',
    bookmark: 'Published chapter reference',
    icon: 'visibility',
    color: '#2f7d32',
    filter: { publication_status: { _eq: 'published' } },
    fields: ['name', 'city', 'country', 'publication_status', 'updated_at'],
  },
  {
    role: 'Greenpill Steward Editor',
    collection: 'chapter_initiatives',
    bookmark: 'My draft initiatives',
    icon: 'local_activity',
    color: '#6a6a00',
    filter: { publication_status: { _in: ['draft', 'pending_review'] } },
    fields: ['title', 'chapter_slug', 'publication_status', 'updated_at'],
  },
  {
    role: 'Greenpill Steward Editor',
    collection: 'chapter_update_requests',
    bookmark: 'My chapter change requests',
    icon: 'edit_document',
    color: '#7d4f00',
    filter: { request_status: { _in: ['draft', 'pending_review', 'needs_changes'] } },
    fields: ['title', 'chapter_slug', 'request_status', 'updated_at'],
  },
  {
    role: 'Greenpill Trusted Publisher',
    collection: 'chapter_update_requests',
    bookmark: 'Pending chapter reviews',
    icon: 'rate_review',
    color: '#005c8a',
    filter: { request_status: { _eq: 'pending_review' } },
    fields: ['title', 'chapter_slug', 'request_status', 'updated_at'],
  },
  {
    role: 'Greenpill Steward Moderator',
    collection: 'map_node_submissions',
    bookmark: 'Pending map node approvals',
    icon: 'approval',
    color: '#005c8a',
    filter: { status: { _eq: 'pending' } },
    fields: ['display_name', 'place_name', 'themes', 'status', 'created_at'],
  },
  {
    role: 'Greenpill Trusted Publisher',
    collection: 'map_node_submissions',
    bookmark: 'Pending map node approvals',
    icon: 'approval',
    color: '#005c8a',
    filter: { status: { _eq: 'pending' } },
    fields: ['display_name', 'place_name', 'themes', 'status', 'created_at'],
  },
  {
    role: 'Greenpill Steward Moderator',
    collection: 'map_node_moderation_notifications',
    bookmark: 'Failed map moderation alerts',
    icon: 'mark_email_unread',
    color: '#b42318',
    filter: { status: { _eq: 'failed' } },
    fields: ['submission_id', 'kind', 'attempts', 'provider_error', 'updated_at'],
  },
  {
    role: 'Greenpill Trusted Publisher',
    collection: 'map_node_moderation_notifications',
    bookmark: 'Failed map moderation alerts',
    icon: 'mark_email_unread',
    color: '#b42318',
    filter: { status: { _eq: 'failed' } },
    fields: ['submission_id', 'kind', 'attempts', 'provider_error', 'updated_at'],
  },
]);

export function buildDirectusStudioBookmarkPlan(collectionNames = [
  ...DIRECTUS_OPERATIONAL_COLLECTIONS,
  ...DIRECTUS_STEWARD_WORKFLOW_COLLECTIONS,
  ...MAP_NODE_MODERATION_COLLECTIONS,
]) {
  const collectionByBase = new Map(collectionNames.map((collection) => [cleanCollectionName(collection), collection]));

  return STUDIO_BOOKMARKS
    .filter((bookmark) => collectionByBase.has(bookmark.collection))
    .map((bookmark) => ({
      role: bookmark.role,
      collection: collectionByBase.get(bookmark.collection),
      bookmark: bookmark.bookmark,
      icon: bookmark.icon,
      color: bookmark.color,
      filter: bookmark.filter,
      layout: 'tabular',
      layout_query: {
        tabular: {
          fields: bookmark.fields,
        },
      },
      layout_options: {
        tabular: {
          widths: {},
        },
      },
    }));
}

async function getAvailableCollectionNames(client) {
  const response = await client.request('/collections?limit=-1');
  return (response?.data ?? []).map((collection) => collection.collection).filter(Boolean);
}

async function getRelationKeys(client) {
  const response = await client.request('/relations?limit=-1&fields=collection,field');
  return new Set((response?.data ?? []).map((relation) => `${relation.collection}:${relation.field}`));
}

function fallbackScalarRelationMeta(meta) {
  if (meta?.special?.includes('m2o')) {
    return {
      ...meta,
      special: null,
      interface: 'input',
      options: null,
      display: null,
      display_options: null,
      note: `${meta.note ?? 'Related record slug.'} Run database migrations before this field becomes a dropdown.`,
    };
  }
  return meta;
}

async function patchCollectionMeta(client, collectionPlan) {
  const current = await client.request(`/collections/${encodePathSegment(collectionPlan.collection)}`);
  const meta = {
    ...(current?.data?.meta ?? {}),
    ...collectionPlan.meta,
  };

  await client.request(`/collections/${encodePathSegment(collectionPlan.collection)}`, {
    method: 'PATCH',
    body: { meta },
  });
}

async function patchFieldMeta(client, fieldPlan, relationKeys) {
  const key = `${fieldPlan.collection}:${fieldPlan.field}`;
  const current = await client.request(`/fields/${encodePathSegment(fieldPlan.collection)}/${encodePathSegment(fieldPlan.field)}`);
  const plannedMeta = relationKeys.has(key) ? fieldPlan.meta : fallbackScalarRelationMeta(fieldPlan.meta);
  const meta = {
    ...(current?.data?.meta ?? {}),
    ...plannedMeta,
  };

  await client.request(`/fields/${encodePathSegment(fieldPlan.collection)}/${encodePathSegment(fieldPlan.field)}`, {
    method: 'PATCH',
    body: { meta },
  });
}

async function getRoleIdsByName(client, roleNames) {
  const response = await client.request('/roles?limit=-1&fields=id,name');
  const roleIds = new Map();
  const wanted = new Set(roleNames);
  for (const role of response?.data ?? []) {
    if (wanted.has(role.name)) {
      roleIds.set(role.name, role.id);
    }
  }
  return roleIds;
}

async function upsertBookmarkPreset(client, bookmarkPlan, roleIds) {
  const roleId = roleIds.get(bookmarkPlan.role);
  if (!roleId) {
    console.warn(`Skipped Directus bookmark "${bookmarkPlan.bookmark}" because role was not found: ${bookmarkPlan.role}`);
    return null;
  }

  const params = new URLSearchParams();
  params.set('filter[role][_eq]', roleId);
  params.set('filter[collection][_eq]', bookmarkPlan.collection);
  params.set('filter[bookmark][_eq]', bookmarkPlan.bookmark);
  params.set('limit', '1');

  const payload = {
    bookmark: bookmarkPlan.bookmark,
    role: roleId,
    user: null,
    collection: bookmarkPlan.collection,
    search: null,
    layout: bookmarkPlan.layout,
    layout_query: bookmarkPlan.layout_query,
    layout_options: bookmarkPlan.layout_options,
    refresh_interval: null,
    filter: bookmarkPlan.filter,
    icon: bookmarkPlan.icon,
    color: bookmarkPlan.color,
  };

  const existing = await client.request(`/presets?${params.toString()}`);
  const item = existing?.data?.[0];
  if (item?.id) {
    const updated = await client.request(`/presets/${encodePathSegment(item.id)}`, {
      method: 'PATCH',
      body: payload,
    });
    return updated?.data ?? item;
  }

  const created = await client.request('/presets', {
    method: 'POST',
    body: payload,
  });
  return created?.data;
}

async function applyDirectusStudioBookmarks(client, collectionNames) {
  const bookmarks = buildDirectusStudioBookmarkPlan(collectionNames);
  const roleIds = await getRoleIdsByName(client, [...new Set(bookmarks.map((bookmark) => bookmark.role))]);
  let applied = 0;

  for (const bookmark of bookmarks) {
    const result = await upsertBookmarkPreset(client, bookmark, roleIds);
    if (result) {
      applied += 1;
      console.log(`Bookmark: ${bookmark.role} / ${bookmark.collection} / ${bookmark.bookmark}`);
    }
  }

  return applied;
}

export async function applyDirectusStudioMetadata(options: {
  client?: Awaited<ReturnType<typeof createDirectusClient>>;
  [key: string]: any;
} = {}) {
  const client = options.client ?? await createDirectusClient(options);
  const available = await getAvailableCollectionNames(client);
  const operationalCollections = resolveSchemaCollectionNames(available, 'content', DIRECTUS_OPERATIONAL_COLLECTIONS);
  const accessCollections = resolveSchemaCollectionNames(available, 'content', DIRECTUS_STEWARD_ACCESS_COLLECTIONS);
  const workflowCollections = resolveSchemaCollectionNames(available, 'content', DIRECTUS_STEWARD_WORKFLOW_COLLECTIONS);
  const mapModerationCollections = resolveSchemaCollectionNames(available, 'intake', MAP_NODE_MODERATION_COLLECTIONS);
  const plan = buildDirectusStudioMetadataPlan(
    operationalCollections,
    accessCollections,
    workflowCollections,
    mapModerationCollections
  );
  const relationKeys = await getRelationKeys(client);

  for (const collection of plan.collections) {
    await patchCollectionMeta(client, collection);
    console.log(`Collection metadata: ${collection.collection}`);
  }

  for (const field of plan.fields) {
    await patchFieldMeta(client, field, relationKeys);
    console.log(`Field metadata: ${field.collection}.${field.field}`);
  }

  const bookmarks = await applyDirectusStudioBookmarks(client, [
    ...operationalCollections,
    ...workflowCollections,
    ...mapModerationCollections,
  ]);

  return {
    url: client.url,
    collections: plan.collections.length,
    fields: plan.fields.length,
    bookmarks,
  };
}

async function main() {
  const result = await applyDirectusStudioMetadata();
  console.log(`Configured Directus Studio metadata at ${result.url}`);
  console.log(`Collections: ${result.collections}`);
  console.log(`Fields: ${result.fields}`);
  console.log(`Bookmarks: ${result.bookmarks}`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
