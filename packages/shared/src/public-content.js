import {
  CHAPTER_IMPACT_SOURCES_VERSION,
  normalizeImpactSources,
} from './chapter-impact.js';

export const PUBLIC_OPERATIONAL_CONTENT_VERSION = 1;

export const PUBLIC_OPERATIONAL_CONTENT_COLLECTIONS = Object.freeze([
  'themes',
  'people',
  'chapters',
  'guilds',
  'projects',
]);

const PRIVATE_OPERATIONAL_CONTENT_FIELD_PATTERNS = Object.freeze([
  'private',
  'raw',
  'review',
  'email',
  'contact',
  'ipaddress',
  'ratelimit',
  'spam',
  'useragent',
  'pending',
  'admin',
  'decodeddatajson',
]);

const PRIVATE_OPERATIONAL_CONTENT_EXACT_FIELD_KEYS = Object.freeze([
  'ip',
  'ips',
  'ipaddr',
]);

const WORKFLOW_FIELDS = Object.freeze([
  'publicationStatus',
  'publication_status',
  'reviewedAt',
  'reviewed_at',
  'reviewedBy',
  'reviewed_by',
  'createdBy',
  'created_by',
  'updatedBy',
  'updated_by',
]);

const cleanString = (value) => (typeof value === 'string' ? value.trim() : '');
const normalizeFieldKey = (key) => cleanString(key).toLowerCase().replace(/[^a-z0-9]/g, '');

const toIso = (value) => {
  if (!value) return new Date().toISOString();
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.valueOf()) ? new Date().toISOString() : date.toISOString();
};

const asArray = (value) => (Array.isArray(value) ? value : []);

const normalizeObject = (value) => (
  value && typeof value === 'object' && !Array.isArray(value) ? value : {}
);

const getPublicationStatus = (record) => cleanString(
  record?.publicationStatus ??
  record?.publication_status ??
  record?.data?.publicationStatus ??
  record?.data?.publication_status
);

const normalizeNumber = (value) => {
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) ? number : null;
};

const normalizeSlug = (record) => (
  cleanString(record?.slug) ||
  cleanString(record?.id) ||
  cleanString(record?.name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
);

function stripWorkflowFields(record) {
  const next = { ...record };
  for (const field of WORKFLOW_FIELDS) {
    delete next[field];
  }
  return next;
}

function normalizeRecord(record) {
  const source = stripWorkflowFields(normalizeObject(record?.data ?? record));
  const slug = normalizeSlug(record) || normalizeSlug(source);
  if (!slug) return null;

  return {
    ...source,
    slug,
    id: slug,
  };
}

function defaultsForCollection(collection) {
  if (collection === 'chapters') {
    return {
      status: 'active',
      stewards: [],
      stewardSlugs: [],
      themeSlugs: [],
      links: [],
      connectLinks: [],
      relatedChapterSlugs: [],
      featuredStorySlugs: [],
      authoredResourceSlugs: [],
      impactSources: {},
      proofSignals: [],
      media: {},
      seo: {},
    };
  }
  if (collection === 'guilds') {
    return {
      type: 'guild',
      status: 'active',
      stewards: [],
      stewardSlugs: [],
      memberSlugs: [],
      publicMembers: [],
      themeSlugs: [],
      links: [],
      connectLinks: [],
      proofSignals: [],
      media: {},
      seo: {},
    };
  }
  if (collection === 'projects') {
    return {
      status: 'active',
      techStack: [],
      stewardSlugs: [],
      themeSlugs: [],
      proofSignals: [],
      media: {},
      seo: {},
    };
  }
  if (collection === 'people') {
    return {
      themeSlugs: [],
      links: [],
      media: {},
      seo: {},
    };
  }
  return {};
}

function normalizeCollection(records, collection = '') {
  return asArray(records)
    .map(normalizeRecord)
    .filter(Boolean)
    .map((record) => ({
      ...defaultsForCollection(collection),
      ...record,
    }))
    .sort((a, b) => (
      Number(a.sortOrder ?? a.featuredWeight ?? 0) - Number(b.sortOrder ?? b.featuredWeight ?? 0) ||
      cleanString(a.name ?? a.displayName ?? a.title ?? a.slug)
        .localeCompare(cleanString(b.name ?? b.displayName ?? b.title ?? b.slug))
    ));
}

function assertPublishedOperationalInput(input = {}) {
  for (const collection of PUBLIC_OPERATIONAL_CONTENT_COLLECTIONS) {
    const nonPublished = asArray(input[collection]).find((record) => {
      const status = getPublicationStatus(record);
      return status && status !== 'published';
    });
    if (nonPublished) {
      throw new Error(`Public operational content snapshot contains non-published ${collection} record`);
    }
  }
}

export function toPublicOperationalLocations(chapters = []) {
  return normalizeCollection(chapters, 'chapters')
    .filter((chapter) => !chapter.seo?.noindex)
    .map((chapter) => {
      const lat = normalizeNumber(chapter.lat ?? chapter.latitude);
      const long = normalizeNumber(chapter.long ?? chapter.lng ?? chapter.longitude);
      if (lat === null || long === null) return null;

      return {
        id: chapter.slug,
        name: cleanString(chapter.name),
        lat,
        long,
        link: cleanString(chapter.link) || `/chapters/${chapter.slug}`,
        kind: 'chapter',
        status: cleanString(chapter.status) || 'active',
        themes: asArray(chapter.themeSlugs ?? chapter.themes).map(cleanString).filter(Boolean),
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function toPublicOperationalImpactSourceBindings(chapters = [], generatedAt = new Date()) {
  const bindings = normalizeCollection(chapters, 'chapters')
    .filter((chapter) => !chapter.seo?.noindex)
    .map((chapter) => {
      const sources = normalizeImpactSources(chapter.impactSources);
      const hasSource = Boolean(
        sources.greenGoodsGardenAddress ||
        sources.karmaProjectUID ||
        sources.karmaProjectSlug ||
        sources.karmaCommunitySlug
      );
      if (!sources.impactEnabled || !hasSource) return null;

      return {
        chapterSlug: chapter.slug,
        chapterName: cleanString(chapter.name),
        chapterPath: `/chapters/${chapter.slug}`,
        sources,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.chapterName.localeCompare(b.chapterName));

  return {
    version: CHAPTER_IMPACT_SOURCES_VERSION,
    generatedAt: toIso(generatedAt),
    chapters: bindings,
  };
}

export function toPublicOperationalContentSnapshot({
  themes = [],
  people = [],
  chapters = [],
  guilds = [],
  projects = [],
  generatedAt = new Date(),
} = {}) {
  assertPublishedOperationalInput({ themes, people, chapters, guilds, projects });

  const publicChapters = normalizeCollection(chapters, 'chapters');
  const snapshot = {
    version: PUBLIC_OPERATIONAL_CONTENT_VERSION,
    generatedAt: toIso(generatedAt),
    themes: normalizeCollection(themes, 'themes'),
    people: normalizeCollection(people, 'people'),
    chapters: publicChapters,
    guilds: normalizeCollection(guilds, 'guilds'),
    projects: normalizeCollection(projects, 'projects'),
    locations: toPublicOperationalLocations(publicChapters),
    impactSourceBindings: toPublicOperationalImpactSourceBindings(publicChapters, generatedAt),
  };

  return assertPublicOperationalContentSnapshot(snapshot);
}

export function containsPrivateOperationalContentField(value, seen = new Set()) {
  if (!value || typeof value !== 'object') return false;
  if (seen.has(value)) return false;
  seen.add(value);

  return Object.entries(value).some(([key, nestedValue]) => {
    const normalizedKey = normalizeFieldKey(key);
    if (
      PRIVATE_OPERATIONAL_CONTENT_EXACT_FIELD_KEYS.includes(normalizedKey) ||
      PRIVATE_OPERATIONAL_CONTENT_FIELD_PATTERNS.some((pattern) => normalizedKey.includes(pattern))
    ) {
      return true;
    }

    if (typeof nestedValue === 'string' && cleanString(nestedValue).toLowerCase().startsWith('mailto:')) {
      return true;
    }

    return containsPrivateOperationalContentField(nestedValue, seen);
  });
}

export function assertPublicOperationalContentSnapshot(payload) {
  if (containsPrivateOperationalContentField(payload)) {
    throw new Error('Public operational content snapshot contains private fields');
  }

  for (const collection of PUBLIC_OPERATIONAL_CONTENT_COLLECTIONS) {
    const records = asArray(payload?.[collection]);
    const nonPublished = records.find((record) => {
      const status = getPublicationStatus(record);
      return status && status !== 'published';
    });
    if (nonPublished) {
      throw new Error(`Public operational content snapshot contains non-published ${collection} record`);
    }
  }

  return payload;
}
