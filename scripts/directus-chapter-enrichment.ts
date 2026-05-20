#!/usr/bin/env bun

import { readdir, readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createDirectusClient } from './directus-operational-content-setup.ts';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const seedDir = join(rootDir, 'packages/website/src/data/operational-content-seed');
const activeChapterSlugs = Object.freeze([
  'brasil',
  'cape-town',
  'c-te-d-ivoire',
  'germany',
  'greensofa',
  'kenya',
  'koh-pha-ngan',
  'london-ontario',
  'new-york-city',
  'nigeria',
  'ottawa',
  'toronto',
]);

type UnknownRecord = Record<string, any>;

const cleanString = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
const asArray = (value: unknown) => (Array.isArray(value) ? value : []);
const asObject = (value: unknown) => (
  value && typeof value === 'object' && !Array.isArray(value) ? value as UnknownRecord : {}
);

function usage() {
  return [
    'Usage: bun scripts/directus-chapter-enrichment.ts [--dry-run]',
    '',
    'Applies checked-in public chapter enrichment to Directus using DIRECTUS_ADMIN_TOKEN.',
    'Only the 12 visible active chapter slugs and their referenced public people are touched.',
  ].join('\n');
}

function parseArgs(argv: string[]) {
  const options = { dryRun: false };
  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') {
      console.log(usage());
      process.exit(0);
    }
    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }
    throw new Error(`Unknown option: ${arg}\n\n${usage()}`);
  }
  return options;
}

function pgTextArray(values: unknown[]) {
  const cleaned = asArray(values).map(cleanString).filter(Boolean);
  if (cleaned.length === 0) return '{}';
  return `{${cleaned
    .map((value) => `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`)
    .join(',')}}`;
}

function hasEmailLikeString(value: unknown): boolean {
  if (typeof value === 'string') {
    return /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(value);
  }
  if (Array.isArray(value)) return value.some(hasEmailLikeString);
  if (!value || typeof value !== 'object') return false;
  return Object.values(value).some(hasEmailLikeString);
}

async function readJson(collection: string, slug: string) {
  const filePath = join(seedDir, collection, `${slug}.json`);
  return {
    ...JSON.parse(await readFile(filePath, 'utf8')),
    slug,
    id: slug,
  };
}

async function readCollection(collection: string) {
  const dir = join(seedDir, collection);
  const records = new Map<string, UnknownRecord>();
  for (const file of await readdir(dir)) {
    if (!file.endsWith('.json')) continue;
    const slug = file.replace(/\.json$/, '');
    records.set(slug, await readJson(collection, slug));
  }
  return records;
}

function validateChapter(slug: string, record: UnknownRecord) {
  if (record.status !== 'active') {
    throw new Error(`Refusing to enrich non-active chapter ${slug}`);
  }
  if (record.seo?.noindex) {
    throw new Error(`Refusing to enrich noindex chapter ${slug}`);
  }
  const media = asObject(record.media);
  const hasImage = Boolean(cleanString(record.image) || cleanString(media.image) || cleanString(media.ogImage));
  if (hasImage && cleanString(media.reviewStatus) !== 'approved') {
    throw new Error(`Chapter ${slug} has image fields without approved media.reviewStatus`);
  }
  if (hasEmailLikeString(record)) {
    throw new Error(`Chapter ${slug} contains an email-like string`);
  }
}

function personPayload(record: UnknownRecord, reviewedAt: string) {
  return {
    slug: record.slug,
    display_name: cleanString(record.displayName),
    role: cleanString(record.role),
    avatar: cleanString(record.avatar),
    bio: cleanString(record.bio),
    theme_slugs: pgTextArray(record.themeSlugs),
    links: asArray(record.links),
    media: asObject(record.media),
    seo: asObject(record.seo),
    publication_status: 'published',
    published_at: reviewedAt,
    reviewed_at: reviewedAt,
    reviewed_by: 'system:chapter-enrichment-cli',
    data: record,
  };
}

function chapterPayload(record: UnknownRecord, reviewedAt: string) {
  return {
    slug: record.slug,
    name: cleanString(record.name),
    city: cleanString(record.city),
    country: cleanString(record.country),
    region: cleanString(record.region),
    entity_status: cleanString(record.status) || 'active',
    summary: cleanString(record.summary),
    intro_quote: cleanString(record.introQuote),
    intro_quote_attribution: cleanString(record.introQuoteAttribution),
    image: cleanString(record.image),
    founded: cleanString(record.founded),
    latitude: record.lat ?? null,
    longitude: record.long ?? null,
    primary_link: cleanString(record.link),
    stewards: asArray(record.stewards),
    steward_slugs: pgTextArray(record.stewardSlugs),
    theme_slugs: pgTextArray(record.themeSlugs),
    links: asArray(record.links),
    connect_links: asArray(record.connectLinks),
    related_chapter_slugs: pgTextArray(record.relatedChapterSlugs),
    featured_story: asObject(record.featuredStory),
    featured_story_slugs: pgTextArray(record.featuredStorySlugs),
    authored_resource_slugs: pgTextArray(record.authoredResourceSlugs),
    impact_sources: asObject(record.impactSources),
    featured_weight: Number(record.featuredWeight ?? 0),
    proof_signals: asArray(record.proofSignals),
    media: asObject(record.media),
    seo: asObject(record.seo),
    publication_status: 'published',
    published_at: reviewedAt,
    reviewed_at: reviewedAt,
    reviewed_by: 'system:chapter-enrichment-cli',
    data: record,
  };
}

function filterBySlug(slug: string) {
  const params = new URLSearchParams();
  params.set('filter[slug][_eq]', slug);
  params.set('limit', '1');
  params.set('fields', 'slug');
  return params.toString();
}

async function itemExists(client: Awaited<ReturnType<typeof createDirectusClient>>, collection: string, slug: string) {
  const response = await client.request(`/items/${collection}?${filterBySlug(slug)}`);
  return Boolean(response?.data?.[0]?.slug);
}

async function upsertItem(
  client: Awaited<ReturnType<typeof createDirectusClient>>,
  collection: string,
  slug: string,
  payload: UnknownRecord
) {
  if (await itemExists(client, collection, slug)) {
    await client.request(`/items/${collection}/${encodeURIComponent(slug)}`, {
      method: 'PATCH',
      body: payload,
    });
    return 'updated';
  }

  await client.request(`/items/${collection}`, {
    method: 'POST',
    body: payload,
  });
  return 'created';
}

export async function loadChapterEnrichment() {
  const people = await readCollection('people');
  const chapters = [];
  const referencedPersonSlugs = new Set<string>();

  for (const slug of activeChapterSlugs) {
    const chapter = await readJson('chapters', slug);
    validateChapter(slug, chapter);
    chapters.push(chapter);
    for (const personSlug of asArray(chapter.stewardSlugs).map(cleanString).filter(Boolean)) {
      referencedPersonSlugs.add(personSlug);
    }
  }

  const publicPeople = [...referencedPersonSlugs].sort().map((slug) => {
    const person = people.get(slug);
    if (!person) throw new Error(`Chapter enrichment references missing person ${slug}`);
    if (!cleanString(person.displayName)) throw new Error(`Person ${slug} is missing displayName`);
    if (hasEmailLikeString(person)) throw new Error(`Person ${slug} contains an email-like string`);
    return person;
  });

  return {
    chapters,
    people: publicPeople,
  };
}

export async function applyChapterEnrichment({ dryRun = false } = {}) {
  const enrichment = await loadChapterEnrichment();
  const reviewedAt = new Date().toISOString();

  if (dryRun) {
    console.log(`Validated ${enrichment.chapters.length} active chapter enrichments.`);
    console.log(`Validated ${enrichment.people.length} referenced public people records.`);
    console.log('Dry run only; Directus was not modified.');
    return;
  }

  const client = await createDirectusClient();
  const chapterResults = [];
  const personResults = [];

  for (const person of enrichment.people) {
    const status = await upsertItem(client, 'people', person.slug, personPayload(person, reviewedAt));
    personResults.push(`${status}:${person.slug}`);
  }

  for (const chapter of enrichment.chapters) {
    const status = await upsertItem(client, 'chapters', chapter.slug, chapterPayload(chapter, reviewedAt));
    chapterResults.push(`${status}:${chapter.slug}`);
  }

  console.log(`Applied ${personResults.length} people records: ${personResults.join(', ')}`);
  console.log(`Applied ${chapterResults.length} chapter records: ${chapterResults.join(', ')}`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const options = parseArgs(process.argv.slice(2));
  await applyChapterEnrichment(options);
}
