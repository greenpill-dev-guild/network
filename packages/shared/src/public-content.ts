import {
  CHAPTER_IMPACT_SOURCES_VERSION,
  normalizeImpactSources,
} from './chapter-impact.js';
import type { PublicImpactSourceBinding } from './chapter-impact.js';

type UnknownRecord = Record<string, any>;

export type PublicOperationalContentCollection =
  | 'themes'
  | 'people'
  | 'chapters'
  | 'chapterInitiatives'
  | 'guilds'
  | 'projects';

export interface PublicOperationalRecord {
  slug: string;
  id: string;
  [key: string]: any;
}

export interface PublicOperationalLocation {
  id: string;
  name: string;
  lat: number;
  long: number;
  link: string;
  kind: 'chapter';
  status: string;
  themes: string[];
}

export interface PublicOperationalImpactSourcePayload {
  version: 1;
  generatedAt: string;
  chapters: PublicImpactSourceBinding[];
}

export interface PublicOperationalContentSnapshot {
  version: 1;
  generatedAt: string;
  themes: PublicOperationalRecord[];
  people: PublicOperationalRecord[];
  chapters: PublicOperationalRecord[];
  chapterInitiatives: PublicOperationalRecord[];
  guilds: PublicOperationalRecord[];
  projects: PublicOperationalRecord[];
  locations: PublicOperationalLocation[];
  impactSourceBindings: PublicOperationalImpactSourcePayload;
}

export interface PublicWebsiteBuildMetadata {
  version: 1;
  builtAt: string;
  operationalSnapshot: {
    generatedAt: string;
  };
}

export const PUBLIC_OPERATIONAL_CONTENT_VERSION = 1;
export const PUBLIC_WEBSITE_BUILD_METADATA_VERSION = 1;
export const PUBLIC_WEBSITE_BUILD_METADATA_ROUTE = '/build-metadata.json';

export const PUBLIC_OPERATIONAL_CONTENT_COLLECTIONS: readonly PublicOperationalContentCollection[] = Object.freeze([
  'themes',
  'people',
  'chapters',
  'chapterInitiatives',
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

const PUBLIC_OPERATIONAL_CONTENT_EXACT_FIELD_KEY_ALLOWLIST = Object.freeze([
  'reviewstatus',
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

const cleanString = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');
const normalizeFieldKey = (key: unknown): string => cleanString(key).toLowerCase().replace(/[^a-z0-9]/g, '');
const isPresent = <T>(value: T | null | undefined): value is T => value !== null && value !== undefined;

const toIso = (value: Date | string | null | undefined): string => {
  if (!value) return new Date().toISOString();
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.valueOf()) ? new Date().toISOString() : date.toISOString();
};

const requireIso = (value: unknown, field: string): string => {
  const date = value instanceof Date ? value : new Date(cleanString(value));
  if (Number.isNaN(date.valueOf())) {
    throw new Error(`Public website build metadata has invalid ${field}`);
  }
  return date.toISOString();
};

const asArray = (value: unknown): any[] => (Array.isArray(value) ? value : []);

const normalizeObject = (value: unknown): UnknownRecord => (
  value && typeof value === 'object' && !Array.isArray(value) ? value as UnknownRecord : {}
);

const getPublicationStatus = (record: UnknownRecord): string => cleanString(
  record?.publicationStatus ??
  record?.publication_status ??
  record?.data?.publicationStatus ??
  record?.data?.publication_status
);

const normalizeNumber = (value: unknown): number | null => {
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) ? number : null;
};

const normalizeSlug = (record: UnknownRecord): string => (
  cleanString(record?.slug) ||
  cleanString(record?.id) ||
  cleanString(record?.name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
);

function stripWorkflowFields(record: UnknownRecord): UnknownRecord {
  const next = { ...record };
  for (const field of WORKFLOW_FIELDS) {
    delete next[field];
  }
  return next;
}

function normalizeRecord(record: UnknownRecord): PublicOperationalRecord | null {
  const source = stripWorkflowFields(normalizeObject(record?.data ?? record));
  const slug = normalizeSlug(record) || normalizeSlug(source);
  if (!slug) return null;

  return {
    ...source,
    slug,
    id: slug,
  };
}

function defaultsForCollection(collection: PublicOperationalContentCollection | ''): UnknownRecord {
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
  if (collection === 'chapterInitiatives') {
    return {
      status: 'active',
      themeSlugs: [],
      links: [],
      proofSignals: [],
      impactSources: {},
      relatedStorySlugs: [],
      relatedResourceSlugs: [],
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

function normalizeCollection(
  records: UnknownRecord[],
  collection: PublicOperationalContentCollection | '' = ''
): PublicOperationalRecord[] {
  return asArray(records)
    .map(normalizeRecord)
    .filter(isPresent)
    .map((record) => ({
      ...defaultsForCollection(collection),
      ...record,
    }))
    .sort((a, b) => (
      (
        collection === 'chapterInitiatives'
          ? Number(b.featuredWeight ?? 0) - Number(a.featuredWeight ?? 0)
          : Number(a.sortOrder ?? a.featuredWeight ?? 0) - Number(b.sortOrder ?? b.featuredWeight ?? 0)
      ) ||
      cleanString(a.name ?? a.displayName ?? a.title ?? a.slug)
        .localeCompare(cleanString(b.name ?? b.displayName ?? b.title ?? b.slug))
    ));
}

function assertPublishedOperationalInput(
  input: Partial<Record<PublicOperationalContentCollection, UnknownRecord[]>> = {}
): void {
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

export function toPublicOperationalLocations(chapters: UnknownRecord[] = []): PublicOperationalLocation[] {
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
        kind: 'chapter' as const,
        status: cleanString(chapter.status) || 'active',
        themes: asArray(chapter.themeSlugs ?? chapter.themes).map(cleanString).filter(Boolean),
      };
    })
    .filter(isPresent)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function toPublicOperationalImpactSourceBindings(
  chapters: UnknownRecord[] = [],
  generatedAt: Date | string = new Date()
): PublicOperationalImpactSourcePayload {
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
    .filter(isPresent)
    .sort((a, b) => a.chapterName.localeCompare(b.chapterName));

  return {
    version: CHAPTER_IMPACT_SOURCES_VERSION,
    generatedAt: toIso(generatedAt),
    chapters: bindings,
  };
}

export interface QuarantinedOperationalRecord {
  collection: string;
  slug: string;
  reason: 'private_field';
}

export interface WithheldChapterImage {
  slug: string;
  reason: 'unapproved_media';
}

function quarantineUnsafeRecords(
  records: ReturnType<typeof normalizeCollection>,
  collection: string,
  quarantined: QuarantinedOperationalRecord[]
) {
  return records.filter((record) => {
    const slug = cleanString((record as UnknownRecord).slug) || 'unknown';
    if (containsPrivateOperationalContentField(record)) {
      quarantined.push({ collection, slug, reason: 'private_field' });
      return false;
    }
    return true;
  });
}

// Decides which chapter image is public and which metadata travels with it.
//
// A chapter shows one image. An uploaded file wins over the sourced image URL.
// The editor who attaches an upload publishes it, like any other direct edit.
// A sourced image URL is public only while media.reviewStatus is approved.
// An image that is not cleared is withheld; the chapter itself always stays.
//
// uploadedImageUrl is the public URL of the chapter's uploaded file. It comes
// from the caller that owns the upload store, never from the record: an upload
// is published without a media review, so a record must not be able to declare
// one for itself.
//
// Input-only record fields, consumed here and never published:
// - imageAlt, imageCredit: the chapter's first-class alt text and credit. They
//   describe the image the chapter shows. For a sourced image, media.imageAlt
//   and media.imageCredit remain the fallback.
// - imageFileId: the upload's file id, which stays private.
function resolvePublicChapterImage(chapter: PublicOperationalRecord, uploadedImageUrl: string): {
  chapter: PublicOperationalRecord;
  imageWithheld: boolean;
} {
  const {
    imageFileId: _imageFileId,
    imageAlt: rawImageAlt,
    imageCredit: rawImageCredit,
    ...publicFields
  } = chapter;
  const media = normalizeObject(chapter.media);
  const seo = normalizeObject(chapter.seo);
  const imageAlt = cleanString(rawImageAlt);
  const imageCredit = cleanString(rawImageCredit);
  const sourcedImages = [chapter.image, media.image, media.ogImage].map(cleanString).filter(Boolean);
  const socialImage = cleanString(seo.ogImage);
  const sourcedImageApproved = cleanString(media.reviewStatus).toLowerCase() === 'approved';

  if (uploadedImageUrl) {
    const {
      image: _sourcedImage,
      ogImage: _sourcedSocialImage,
      imageAlt: _sourcedAlt,
      imageCredit: _sourcedCredit,
      imageSourceUrl: _sourcedPage,
      reviewStatus: _sourcedReviewStatus,
      ...otherMedia
    } = media;
    // A social image that only repeated the sourced chapter image follows the
    // upload. An independent one is itself a sourced image, so it stays only
    // if the sourced media was approved.
    const keepsOwnSocialImage =
      socialImage !== '' && !sourcedImages.includes(socialImage) && sourcedImageApproved;
    return {
      chapter: {
        ...publicFields,
        image: uploadedImageUrl,
        media: {
          ...otherMedia,
          image: uploadedImageUrl,
          ogImage: uploadedImageUrl,
          ...(imageAlt ? { imageAlt } : {}),
          ...(imageCredit ? { imageCredit } : {}),
          // The website shows a chapter image only when this says approved.
          // For an upload, attaching it is that approval.
          reviewStatus: 'approved',
        },
        ...(socialImage === ''
          ? {}
          : { seo: { ...seo, ogImage: keepsOwnSocialImage ? socialImage : uploadedImageUrl } }),
      },
      imageWithheld: false,
    };
  }

  if (sourcedImages.length === 0 && socialImage === '') {
    return { chapter: publicFields as PublicOperationalRecord, imageWithheld: false };
  }

  if (sourcedImageApproved) {
    const alt = imageAlt || cleanString(media.imageAlt);
    const credit = imageCredit || cleanString(media.imageCredit);
    return {
      chapter: {
        ...publicFields,
        media: {
          ...media,
          ...(alt ? { imageAlt: alt } : {}),
          ...(credit ? { imageCredit: credit } : {}),
        },
      },
      imageWithheld: false,
    };
  }

  // The media object describes the unreviewed image, so none of it is published.
  const { ogImage: _withheldSocialImage, ...otherSeo } = seo;
  return {
    chapter: {
      ...publicFields,
      image: '',
      media: {},
      seo: otherSeo,
    },
    imageWithheld: true,
  };
}

// An upload's public address must be an absolute web URL.
function toUploadedImageUrl(value: unknown): string {
  const url = cleanString(value);
  return /^https?:\/\/\S+$/i.test(url) ? url : '';
}

export function toPublicOperationalContentSnapshot({
  themes = [],
  people = [],
  chapters = [],
  chapterInitiatives = [],
  guilds = [],
  projects = [],
  generatedAt = new Date(),
}: {
  themes?: UnknownRecord[];
  people?: UnknownRecord[];
  chapters?: UnknownRecord[];
  chapterInitiatives?: UnknownRecord[];
  guilds?: UnknownRecord[];
  projects?: UnknownRecord[];
  generatedAt?: Date | string;
} = {},
  options: {
    onQuarantine?: (records: QuarantinedOperationalRecord[]) => void;
    onChapterImagesWithheld?: (chapters: WithheldChapterImage[]) => void;
    // Public URL of each chapter's uploaded image, by chapter slug.
    uploadedChapterImageUrls?: ReadonlyMap<string, string>;
  } = {}
): PublicOperationalContentSnapshot {
  assertPublishedOperationalInput({ themes, people, chapters, chapterInitiatives, guilds, projects });

  // Records that would violate the privacy boundary are quarantined (dropped
  // from the projection) instead of failing the whole snapshot: one bad record
  // must not take down the agent route and every site deploy. Privacy still
  // fails closed per record, and the final assert below stays absolute for the
  // surviving snapshot.
  const quarantined: QuarantinedOperationalRecord[] = [];

  // An image that is not cleared for publication costs the chapter its image,
  // never its place on the site.
  const chaptersWithWithheldImages = new Set<string>();
  const chaptersWithPublicImages = normalizeCollection(chapters, 'chapters').map((chapter) => {
    // A record cannot name its own upload; see resolvePublicChapterImage.
    const { uploadedImageUrl: _selfDeclaredUpload, ...record } = chapter;
    const resolved = resolvePublicChapterImage(
      record as PublicOperationalRecord,
      toUploadedImageUrl(options.uploadedChapterImageUrls?.get(chapter.slug))
    );
    if (resolved.imageWithheld) chaptersWithWithheldImages.add(chapter.slug);
    return resolved.chapter;
  });

  const publicChapters = quarantineUnsafeRecords(chaptersWithPublicImages, 'chapters', quarantined);
  const withheldChapterImages: WithheldChapterImage[] = publicChapters
    .filter((chapter) => chaptersWithWithheldImages.has(chapter.slug))
    .map((chapter) => ({ slug: chapter.slug, reason: 'unapproved_media' }));
  const publicGuilds = quarantineUnsafeRecords(normalizeCollection(guilds, 'guilds'), 'guilds', quarantined);
  const publicGuildSlugs = new Set(publicGuilds.map((guild) => guild.slug).filter(Boolean));
  const publicProjects = quarantineUnsafeRecords(
    normalizeCollection(projects, 'projects'),
    'projects',
    quarantined
  ).filter((project) => publicGuildSlugs.has(cleanString(project.guild ?? project.guildSlug)));
  const snapshot: PublicOperationalContentSnapshot = {
    version: PUBLIC_OPERATIONAL_CONTENT_VERSION,
    generatedAt: toIso(generatedAt),
    themes: quarantineUnsafeRecords(normalizeCollection(themes, 'themes'), 'themes', quarantined),
    people: quarantineUnsafeRecords(normalizeCollection(people, 'people'), 'people', quarantined),
    chapters: publicChapters,
    chapterInitiatives: quarantineUnsafeRecords(
      normalizeCollection(chapterInitiatives, 'chapterInitiatives'),
      'chapterInitiatives',
      quarantined
    ),
    guilds: publicGuilds,
    projects: publicProjects,
    locations: toPublicOperationalLocations(publicChapters),
    impactSourceBindings: toPublicOperationalImpactSourceBindings(publicChapters, generatedAt),
  };

  if (quarantined.length > 0) {
    if (options.onQuarantine) {
      options.onQuarantine(quarantined);
    } else {
      console.warn('public_operational_content_records_quarantined', quarantined);
    }
  }

  if (withheldChapterImages.length > 0) {
    if (options.onChapterImagesWithheld) {
      options.onChapterImagesWithheld(withheldChapterImages);
    } else {
      console.warn('public_operational_content_chapter_images_withheld', withheldChapterImages);
    }
  }

  return assertPublicOperationalContentSnapshot(snapshot);
}

export function containsPrivateOperationalContentField(value: unknown, seen: Set<object> = new Set()): boolean {
  if (!value || typeof value !== 'object') return false;
  if (seen.has(value)) return false;
  seen.add(value);

  return Object.entries(value).some(([key, nestedValue]) => {
    const normalizedKey = normalizeFieldKey(key);
    if (
      !PUBLIC_OPERATIONAL_CONTENT_EXACT_FIELD_KEY_ALLOWLIST.includes(normalizedKey) &&
      (
        PRIVATE_OPERATIONAL_CONTENT_EXACT_FIELD_KEYS.includes(normalizedKey) ||
        PRIVATE_OPERATIONAL_CONTENT_FIELD_PATTERNS.some((pattern) => normalizedKey.includes(pattern))
      )
    ) {
      return true;
    }

    if (typeof nestedValue === 'string' && cleanString(nestedValue).toLowerCase().startsWith('mailto:')) {
      return true;
    }

    return containsPrivateOperationalContentField(nestedValue, seen);
  });
}

function chapterHasPublicImageCandidate(chapter: UnknownRecord): boolean {
  const media = normalizeObject(chapter.media);
  const seo = normalizeObject(chapter.seo);
  return Boolean(
    cleanString(chapter.image) ||
    cleanString(media.image) ||
    cleanString(media.ogImage) ||
    cleanString(seo.ogImage)
  );
}

export function containsUnapprovedChapterMedia(value: unknown): boolean {
  const chapters = asArray((value as UnknownRecord)?.chapters);

  return chapters.some((chapter) => {
    const record = normalizeObject(chapter);
    const media = normalizeObject(record.media);
    const reviewStatus = cleanString(media.reviewStatus).toLowerCase();
    return chapterHasPublicImageCandidate(record) && reviewStatus !== 'approved';
  });
}

export function assertPublicOperationalContentSnapshot<T>(payload: T): T {
  if (containsPrivateOperationalContentField(payload)) {
    throw new Error('Public operational content snapshot contains private fields');
  }

  if (containsUnapprovedChapterMedia(payload)) {
    throw new Error('Public operational content snapshot contains unapproved chapter media');
  }

  for (const collection of PUBLIC_OPERATIONAL_CONTENT_COLLECTIONS) {
    const records = asArray((payload as UnknownRecord)?.[collection]);
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

export function toPublicWebsiteBuildMetadata({
  builtAt = new Date(),
  operationalSnapshotGeneratedAt,
}: {
  builtAt?: Date | string;
  operationalSnapshotGeneratedAt: Date | string;
}): PublicWebsiteBuildMetadata {
  return {
    version: PUBLIC_WEBSITE_BUILD_METADATA_VERSION,
    builtAt: requireIso(builtAt, 'builtAt'),
    operationalSnapshot: {
      generatedAt: requireIso(operationalSnapshotGeneratedAt, 'operationalSnapshot.generatedAt'),
    },
  };
}

export function assertPublicWebsiteBuildMetadata(payload: unknown): PublicWebsiteBuildMetadata {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('Public website build metadata must be an object');
  }
  if (containsPrivateOperationalContentField(payload)) {
    throw new Error('Public website build metadata contains private fields');
  }

  const record = payload as UnknownRecord;
  const rootKeys = Object.keys(record).sort();
  if (
    record.version !== PUBLIC_WEBSITE_BUILD_METADATA_VERSION ||
    rootKeys.join(',') !== 'builtAt,operationalSnapshot,version'
  ) {
    throw new Error('Public website build metadata has an invalid shape');
  }

  const operationalSnapshot = normalizeObject(record.operationalSnapshot);
  if (Object.keys(operationalSnapshot).join(',') !== 'generatedAt') {
    throw new Error('Public website build metadata has an invalid operational snapshot shape');
  }

  return toPublicWebsiteBuildMetadata({
    builtAt: requireIso(record.builtAt, 'builtAt'),
    operationalSnapshotGeneratedAt: requireIso(operationalSnapshot.generatedAt, 'operationalSnapshot.generatedAt'),
  });
}
