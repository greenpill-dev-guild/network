import localSnapshot from '../data/operational-content-snapshot.json';
import {
  assertPublicOperationalContentSnapshot,
  toPublicOperationalImpactSourceBindings,
  toPublicOperationalLocations,
  type PublicOperationalContentCollection,
  type PublicOperationalContentSnapshot,
  type PublicOperationalRecord,
} from '@greenpill-network/shared/public-content';

const snapshotUrl = (
  process.env.OPERATIONAL_CONTENT_SNAPSHOT_URL ||
  process.env.PUBLIC_OPERATIONAL_CONTENT_SNAPSHOT_URL ||
  ''
).trim();

let snapshotPromise: Promise<PublicOperationalContentSnapshot> | null = null;

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
    return assertPublicOperationalContentSnapshot(
      localSnapshot
    ) as PublicOperationalContentSnapshot;
  }

  snapshotPromise ??= loadRemoteSnapshot(snapshotUrl);
  return snapshotPromise;
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

export async function getOperationalChapters() {
  const chapters = await getOperationalCollection('chapters');
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
