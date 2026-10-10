import localSnapshot from '../data/operational-content-snapshot.json';
import {
  assertPublicOperationalContentSnapshot,
  toPublicOperationalImpactSourceBindings,
  toPublicOperationalLocations,
  type PublicOperationalContentCollection,
  type PublicOperationalContentSnapshot,
  type PublicOperationalRecord,
} from '@greenpill-network/shared/public-content';
import {
  createChapterImageCopier,
  DEFAULT_DIRECTUS_PUBLIC_URL,
  type DroppedChapterImage,
} from './chapter-image-copies.js';

const snapshotUrl = (
  process.env.OPERATIONAL_CONTENT_SNAPSHOT_URL ||
  process.env.PUBLIC_OPERATIONAL_CONTENT_SNAPSHOT_URL ||
  ''
).trim();

const shouldCacheRemoteSnapshot = !import.meta.env.DEV;
let snapshotPromise: Promise<PublicOperationalContentSnapshot> | null = null;

// The publish build runs against the live snapshot. It must not go out
// without an uploaded image it could have had, so it waits for the Directus
// that serves uploads and fails if that never answers. The dev server and
// builds from the checked-in fallback ask each source once and make do.
const isPublishBuild = snapshotUrl !== '' && !import.meta.env.DEV;
const chapterImageCopier = createChapterImageCopier({
  ownOrigins: [process.env.DIRECTUS_PUBLIC_URL?.trim() || DEFAULT_DIRECTUS_PUBLIC_URL],
  publishBuild: isPublishBuild,
  // The dev server reloads the snapshot on every call so edits show up. A
  // file replaced in Directus keeps its address, so let that show up too.
  reuseForMs: import.meta.env.DEV ? 60_000 : undefined,
});
const reportedDroppedImages = new Set<string>();

function reportDroppedChapterImage({ slug, field, address, reason }: DroppedChapterImage) {
  const key = `${slug} ${field} ${address}`;
  if (reportedDroppedImages.has(key)) return;
  reportedDroppedImages.add(key);

  const message = `Chapter "${slug}" is published without the image at ${field} (${reason}): ${address}`;
  console.warn(`[chapter-images] ${message}`);
  // Puts the warning on the workflow run summary; the build log is rarely read.
  // The command has to start a line, and Astro may be mid-line reporting a route.
  if (process.env.GITHUB_ACTIONS) console.log(`\n::warning title=Chapter image not published::${message}`);
}

// Pages only ever see site-hosted chapter images; see chapter-image-copies.ts.
async function siteHostedSnapshot(
  snapshot: PublicOperationalContentSnapshot
): Promise<PublicOperationalContentSnapshot> {
  const { chapters, dropped } = await chapterImageCopier.siteHostedChapters(snapshot.chapters);
  dropped.forEach(reportDroppedChapterImage);
  return { ...snapshot, chapters };
}

async function loadRemoteSnapshot(url: string) {
  const response = await fetch(url, {
    headers: { accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Operational content snapshot request failed with ${response.status}`);
  }

  return assertPublicOperationalContentSnapshot(
    await response.json()
  ) as PublicOperationalContentSnapshot;
}

export async function getOperationalContentSnapshot() {
  if (!snapshotUrl) {
    return siteHostedSnapshot(
      assertPublicOperationalContentSnapshot(localSnapshot) as PublicOperationalContentSnapshot
    );
  }

  if (!shouldCacheRemoteSnapshot) {
    return siteHostedSnapshot(await loadRemoteSnapshot(snapshotUrl));
  }

  snapshotPromise ??= loadRemoteSnapshot(snapshotUrl).then(siteHostedSnapshot);
  return snapshotPromise;
}

/** The files behind every site-hosted chapter image copy, for the route that serves them. */
export async function getChapterImageCopyFiles() {
  await getOperationalContentSnapshot();
  return chapterImageCopier.files();
}

export function asContentEntry(record: PublicOperationalRecord) {
  return {
    id: record.slug,
    slug: record.slug,
    data: record as PublicOperationalRecord & Record<string, any>,
  };
}

function hasNoindex(record: PublicOperationalRecord & Record<string, any>) {
  return Boolean(record.seo?.noindex);
}

export async function getOperationalCollection(collection: PublicOperationalContentCollection) {
  const snapshot = await getOperationalContentSnapshot();
  return snapshot[collection].map(asContentEntry);
}

export async function getOperationalChapterPages() {
  return getOperationalCollection('chapters');
}

export async function getOperationalChapters() {
  const chapters = await getOperationalChapterPages();
  return chapters.filter((item) => !hasNoindex(item.data));
}

export async function getOperationalChapterInitiatives(chapterSlug = '') {
  const initiatives = await getOperationalCollection('chapterInitiatives');
  return initiatives
    .filter((item) => !hasNoindex(item.data))
    .filter((item) => !chapterSlug || item.data.chapterSlug === chapterSlug)
    .sort((a, b) => (
      Number(b.data.featuredWeight ?? 0) - Number(a.data.featuredWeight ?? 0) ||
      String(a.data.title ?? a.id).localeCompare(String(b.data.title ?? b.id))
    ));
}

export async function getOperationalGuilds() {
  return getOperationalCollection('guilds');
}

export async function getOperationalProjects() {
  return getOperationalCollection('projects');
}

export async function getOperationalLocations() {
  const snapshot = await getOperationalContentSnapshot();
  return snapshot.locations.length
    ? snapshot.locations
    : toPublicOperationalLocations(snapshot.chapters);
}

export async function getOperationalImpactSourceBindings() {
  const snapshot = await getOperationalContentSnapshot();
  return snapshot.impactSourceBindings?.chapters
    ? snapshot.impactSourceBindings
    : toPublicOperationalImpactSourceBindings(snapshot.chapters, snapshot.generatedAt);
}
