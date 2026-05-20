#!/usr/bin/env bun

import { readdir, readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createDirectusClient } from './directus-operational-content-setup.ts';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const seedDir = join(rootDir, 'packages/website/src/data/operational-content-seed');
const guildSlugs = Object.freeze([
  'dev-guild',
  'greensci',
  'writers-guild',
]);

type UnknownRecord = Record<string, any>;

const cleanString = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
const asArray = (value: unknown) => (Array.isArray(value) ? value : []);
const asObject = (value: unknown) => (
  value && typeof value === 'object' && !Array.isArray(value) ? value as UnknownRecord : {}
);

function usage() {
  return [
    'Usage: bun scripts/directus-operational-enrichment.ts [--dry-run]',
    '',
    'Applies checked-in public guild and visible chapter initiative enrichment to Directus.',
    'Inactive/noindex chapters are ignored so hidden chapter initiatives are not re-published.',
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

function hasApprovedMedia(record: UnknownRecord) {
  const media = asObject(record.media);
  const seo = asObject(record.seo);
  const hasImage = Boolean(
    cleanString(record.image) ||
    cleanString(media.image) ||
    cleanString(media.ogImage) ||
    cleanString(seo.ogImage)
  );
  return !hasImage || cleanString(media.reviewStatus) === 'approved';
}

function validateGuild(slug: string, record: UnknownRecord) {
  if (record.status && record.status !== 'active') {
    throw new Error(`Refusing to enrich non-active guild ${slug}`);
  }
  if (!hasApprovedMedia(record)) {
    throw new Error(`Guild ${slug} has image fields without approved media.reviewStatus`);
  }
  if (hasEmailLikeString(record)) {
    throw new Error(`Guild ${slug} contains an email-like string`);
  }
  if (asArray(record.connectLinks).filter((link) => cleanString(link?.url)).length === 0) {
    throw new Error(`Guild ${slug} is missing connectLinks`);
  }
}

function validateInitiative(slug: string, record: UnknownRecord, chapters: Map<string, UnknownRecord>) {
  const chapterSlug = cleanString(record.chapterSlug);
  const chapter = chapters.get(chapterSlug);
  if (!chapter) throw new Error(`Initiative ${slug} references missing chapter ${chapterSlug}`);
  if (chapter.status !== 'active') {
    throw new Error(`Refusing to enrich initiative ${slug} for non-active chapter ${chapterSlug}`);
  }
  if (chapter.seo?.noindex) {
    throw new Error(`Refusing to enrich initiative ${slug} for noindex chapter ${chapterSlug}`);
  }
  if (record.status && record.status !== 'active') {
    throw new Error(`Refusing to enrich non-active initiative ${slug}`);
  }
  if (hasEmailLikeString(record)) {
    throw new Error(`Initiative ${slug} contains an email-like string`);
  }
  if (asArray(record.links).filter((link) => cleanString(link?.url)).length === 0) {
    throw new Error(`Initiative ${slug} is missing source links`);
  }
}

function guildPayload(record: UnknownRecord, reviewedAt: string) {
  return {
    slug: record.slug,
    name: cleanString(record.name),
    type: cleanString(record.type) || 'guild',
    entity_status: cleanString(record.status) || 'active',
    summary: cleanString(record.summary),
    description: cleanString(record.description),
    founded_year: Number.isFinite(Number(record.foundedYear)) ? Number(record.foundedYear) : null,
    oneliner: cleanString(record.oneliner),
    image: cleanString(record.image),
    cadence: asObject(record.cadence),
    stewards: asArray(record.stewards),
    steward_slugs: pgTextArray(record.stewardSlugs),
    member_slugs: pgTextArray(record.memberSlugs),
    public_members: asArray(record.publicMembers),
    theme_slugs: pgTextArray(record.themeSlugs),
    links: asArray(record.links),
    connect_links: asArray(record.connectLinks),
    mandate_paragraphs: asArray(record.mandateParagraphs),
    outputs: asArray(record.outputs),
    principles: asArray(record.principles),
    featured_weight: Number(record.featuredWeight ?? 0),
    proof_signals: asArray(record.proofSignals),
    media: asObject(record.media),
    seo: asObject(record.seo),
    publication_status: 'published',
    published_at: reviewedAt,
    reviewed_at: reviewedAt,
    reviewed_by: 'system:operational-enrichment-cli',
    data: record,
  };
}

function initiativePayload(record: UnknownRecord, reviewedAt: string) {
  return {
    slug: record.slug,
    chapter_slug: cleanString(record.chapterSlug),
    title: cleanString(record.title),
    entity_status: cleanString(record.status) || 'active',
    summary: cleanString(record.summary),
    description: cleanString(record.description),
    theme_slugs: pgTextArray(record.themeSlugs),
    links: asArray(record.links),
    proof_signals: asArray(record.proofSignals),
    impact_sources: asObject(record.impactSources),
    related_story_slugs: pgTextArray(record.relatedStorySlugs),
    related_resource_slugs: pgTextArray(record.relatedResourceSlugs),
    featured_weight: Number(record.featuredWeight ?? 0),
    publication_status: 'published',
    published_at: reviewedAt,
    reviewed_at: reviewedAt,
    reviewed_by: 'system:operational-enrichment-cli',
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

export async function loadOperationalEnrichment() {
  const chapters = await readCollection('chapters');
  const resolvedGuilds = await Promise.all(guildSlugs.map((slug) => readJson('guilds', slug)));

  for (const guild of resolvedGuilds) {
    validateGuild(guild.slug, guild);
  }

  const initiatives = [...(await readCollection('chapter-initiatives')).values()]
    .filter((initiative) => {
      const chapter = chapters.get(cleanString(initiative.chapterSlug));
      return chapter?.status === 'active' && !chapter.seo?.noindex;
    })
    .sort((a, b) => cleanString(a.slug).localeCompare(cleanString(b.slug)));

  for (const initiative of initiatives) {
    validateInitiative(initiative.slug, initiative, chapters);
  }

  return {
    guilds: resolvedGuilds.sort((a, b) => cleanString(a.slug).localeCompare(cleanString(b.slug))),
    chapterInitiatives: initiatives,
  };
}

export async function applyOperationalEnrichment({ dryRun = false } = {}) {
  const enrichment = await loadOperationalEnrichment();
  const reviewedAt = new Date().toISOString();

  if (dryRun) {
    console.log(`Validated ${enrichment.guilds.length} guild enrichments.`);
    console.log(`Validated ${enrichment.chapterInitiatives.length} visible active chapter initiatives.`);
    console.log('Dry run only; Directus was not modified.');
    return;
  }

  const client = await createDirectusClient();
  const guildResults = [];
  const initiativeResults = [];

  for (const guild of enrichment.guilds) {
    const status = await upsertItem(client, 'guilds', guild.slug, guildPayload(guild, reviewedAt));
    guildResults.push(`${status}:${guild.slug}`);
  }

  for (const initiative of enrichment.chapterInitiatives) {
    const status = await upsertItem(
      client,
      'chapter_initiatives',
      initiative.slug,
      initiativePayload(initiative, reviewedAt)
    );
    initiativeResults.push(`${status}:${initiative.slug}`);
  }

  console.log(`Applied ${guildResults.length} guild records: ${guildResults.join(', ')}`);
  console.log(`Applied ${initiativeResults.length} chapter initiative records: ${initiativeResults.join(', ')}`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const options = parseArgs(process.argv.slice(2));
  await applyOperationalEnrichment(options);
}
