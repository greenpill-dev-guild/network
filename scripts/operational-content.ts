#!/usr/bin/env bun

import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDatabaseClient, getMigrationDatabaseUrl } from '@greenpill-network/agent/db';
import {
  assertPublicOperationalContentSnapshot,
  toPublicOperationalContentSnapshot,
} from '@greenpill-network/shared/public-content';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// These folders are operational seed inputs for Directus/Postgres and the
// checked-in fallback snapshot. Keystatic authoring is editorial-only.
const operationalSeedDir = join(rootDir, 'packages/website/src/data/operational-content-seed');
const snapshotPath = join(rootDir, 'packages/website/src/data/operational-content-snapshot.json');
const shouldWriteSnapshot = process.argv.includes('--write-snapshot');
const shouldMigrate = process.argv.includes('--migrate');
const shouldAllowExistingMigration = process.argv.includes('--allow-existing');

const cleanString = (value) => (typeof value === 'string' ? value.trim() : '');
const asArray = (value) => (Array.isArray(value) ? value : []);
const asObject = (value) => (
  value && typeof value === 'object' && !Array.isArray(value) ? value : {}
);

async function readCollection(collection) {
  const dir = join(operationalSeedDir, collection);
  const records = [];
  for (const file of await readdir(dir)) {
    if (!file.endsWith('.json')) continue;
    const slug = file.replace(/\.json$/, '');
    const data = JSON.parse(await readFile(join(dir, file), 'utf8'));
    records.push({
      ...data,
      slug,
      id: slug,
    });
  }
  return records;
}

async function loadOperationalContent() {
  return toPublicOperationalContentSnapshot({
    generatedAt: new Date(),
    themes: await readCollection('themes'),
    people: await readCollection('people'),
    chapters: await readCollection('chapters'),
    chapterInitiatives: await readCollection('chapter-initiatives'),
    guilds: await readCollection('guilds'),
    projects: await readCollection('projects'),
  });
}

const numberOrNull = (value) => {
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) ? number : null;
};

async function upsertThemes(tx, records) {
  for (const record of records) {
    await tx`
      insert into content.themes (
        slug,
        name,
        summary,
        sort_order,
        publication_status,
        published_at,
        reviewed_at,
        reviewed_by,
        data
      )
      values (
        ${record.slug},
        ${cleanString(record.name)},
        ${cleanString(record.summary)},
        ${Number(record.sortOrder ?? 0)},
        'published'::content.publication_status,
        now(),
        now(),
        'system:initial-operational-content-migration',
        ${tx.json(record)}
      )
      on conflict (slug) do nothing
    `;
  }
}

async function upsertPeople(tx, records) {
  for (const record of records) {
    await tx`
      insert into content.people (
        slug,
        display_name,
        role,
        avatar,
        bio,
        theme_slugs,
        links,
        media,
        seo,
        publication_status,
        published_at,
        reviewed_at,
        reviewed_by,
        data
      )
      values (
        ${record.slug},
        ${cleanString(record.displayName)},
        ${cleanString(record.role)},
        ${cleanString(record.avatar)},
        ${cleanString(record.bio)},
        ${asArray(record.themeSlugs)},
        ${tx.json(asArray(record.links))},
        ${tx.json(asObject(record.media))},
        ${tx.json(asObject(record.seo))},
        'published'::content.publication_status,
        now(),
        now(),
        'system:initial-operational-content-migration',
        ${tx.json(record)}
      )
      on conflict (slug) do nothing
    `;
  }
}

async function upsertChapters(tx, records) {
  for (const record of records) {
    await tx`
      insert into content.chapters (
        slug,
        name,
        city,
        country,
        region,
        entity_status,
        summary,
        intro_quote,
        intro_quote_attribution,
        image,
        founded,
        latitude,
        longitude,
        primary_link,
        stewards,
        steward_slugs,
        theme_slugs,
        links,
        connect_links,
        related_chapter_slugs,
        featured_story,
        featured_story_slugs,
        authored_resource_slugs,
        impact_sources,
        featured_weight,
        proof_signals,
        media,
        seo,
        publication_status,
        published_at,
        reviewed_at,
        reviewed_by,
        data
      )
      values (
        ${record.slug},
        ${cleanString(record.name)},
        ${cleanString(record.city)},
        ${cleanString(record.country)},
        ${cleanString(record.region)},
        ${cleanString(record.status) || 'active'},
        ${cleanString(record.summary)},
        ${cleanString(record.introQuote)},
        ${cleanString(record.introQuoteAttribution)},
        ${cleanString(record.image)},
        ${cleanString(record.founded)},
        ${numberOrNull(record.lat)},
        ${numberOrNull(record.long)},
        ${cleanString(record.link)},
        ${tx.json(asArray(record.stewards))},
        ${asArray(record.stewardSlugs)},
        ${asArray(record.themeSlugs)},
        ${tx.json(asArray(record.links))},
        ${tx.json(asArray(record.connectLinks))},
        ${asArray(record.relatedChapterSlugs)},
        ${tx.json(asObject(record.featuredStory))},
        ${asArray(record.featuredStorySlugs)},
        ${asArray(record.authoredResourceSlugs)},
        ${tx.json(asObject(record.impactSources))},
        ${Number(record.featuredWeight ?? 0)},
        ${tx.json(asArray(record.proofSignals))},
        ${tx.json(asObject(record.media))},
        ${tx.json(asObject(record.seo))},
        'published'::content.publication_status,
        now(),
        now(),
        'system:initial-operational-content-migration',
        ${tx.json(record)}
      )
      on conflict (slug) do nothing
    `;
  }
}

async function upsertChapterInitiatives(tx, records) {
  for (const record of records) {
    await tx`
      insert into content.chapter_initiatives (
        slug,
        chapter_slug,
        title,
        entity_status,
        summary,
        description,
        theme_slugs,
        links,
        proof_signals,
        impact_sources,
        related_story_slugs,
        related_resource_slugs,
        featured_weight,
        publication_status,
        published_at,
        reviewed_at,
        reviewed_by,
        data
      )
      values (
        ${record.slug},
        ${cleanString(record.chapterSlug)},
        ${cleanString(record.title)},
        ${cleanString(record.status) || 'active'},
        ${cleanString(record.summary)},
        ${cleanString(record.description)},
        ${asArray(record.themeSlugs)},
        ${tx.json(asArray(record.links))},
        ${tx.json(asArray(record.proofSignals))},
        ${tx.json(asObject(record.impactSources))},
        ${asArray(record.relatedStorySlugs)},
        ${asArray(record.relatedResourceSlugs)},
        ${Number(record.featuredWeight ?? 0)},
        'published'::content.publication_status,
        now(),
        now(),
        'system:initial-operational-content-migration',
        ${tx.json(record)}
      )
      on conflict (slug) do nothing
    `;
  }
}

async function upsertGuilds(tx, records) {
  for (const record of records) {
    await tx`
      insert into content.guilds (
        slug,
        name,
        type,
        entity_status,
        summary,
        description,
        founded_year,
        oneliner,
        image,
        cadence,
        stewards,
        steward_slugs,
        member_slugs,
        public_members,
        theme_slugs,
        links,
        connect_links,
        mandate_paragraphs,
        outputs,
        principles,
        featured_weight,
        proof_signals,
        media,
        seo,
        publication_status,
        published_at,
        reviewed_at,
        reviewed_by,
        data
      )
      values (
        ${record.slug},
        ${cleanString(record.name)},
        ${cleanString(record.type) || 'guild'},
        ${cleanString(record.status) || 'active'},
        ${cleanString(record.summary)},
        ${cleanString(record.description)},
        ${numberOrNull(record.foundedYear)},
        ${cleanString(record.oneliner)},
        ${cleanString(record.image)},
        ${tx.json(asObject(record.cadence))},
        ${tx.json(asArray(record.stewards))},
        ${asArray(record.stewardSlugs)},
        ${asArray(record.memberSlugs)},
        ${tx.json(asArray(record.publicMembers))},
        ${asArray(record.themeSlugs)},
        ${tx.json(asArray(record.links))},
        ${tx.json(asArray(record.connectLinks))},
        ${tx.json(asArray(record.mandateParagraphs))},
        ${tx.json(asArray(record.outputs))},
        ${tx.json(asArray(record.principles))},
        ${Number(record.featuredWeight ?? 0)},
        ${tx.json(asArray(record.proofSignals))},
        ${tx.json(asObject(record.media))},
        ${tx.json(asObject(record.seo))},
        'published'::content.publication_status,
        now(),
        now(),
        'system:initial-operational-content-migration',
        ${tx.json(record)}
      )
      on conflict (slug) do nothing
    `;
  }
}

async function upsertProjects(tx, records) {
  for (const record of records) {
    await tx`
      insert into content.projects (
        slug,
        name,
        entity_status,
        guild_slug,
        summary,
        description,
        image,
        tech_stack,
        repo_url,
        live_url,
        steward_slugs,
        theme_slugs,
        featured_weight,
        proof_signals,
        media,
        seo,
        publication_status,
        published_at,
        reviewed_at,
        reviewed_by,
        data
      )
      values (
        ${record.slug},
        ${cleanString(record.name)},
        ${cleanString(record.status) || 'active'},
        ${cleanString(record.guild)},
        ${cleanString(record.summary)},
        ${cleanString(record.description)},
        ${cleanString(record.image)},
        ${asArray(record.techStack)},
        ${cleanString(record.repoUrl)},
        ${cleanString(record.liveUrl)},
        ${asArray(record.stewardSlugs)},
        ${asArray(record.themeSlugs)},
        ${Number(record.featuredWeight ?? 0)},
        ${tx.json(asArray(record.proofSignals))},
        ${tx.json(asObject(record.media))},
        ${tx.json(asObject(record.seo))},
        'published'::content.publication_status,
        now(),
        now(),
        'system:initial-operational-content-migration',
        ${tx.json(record)}
      )
      on conflict (slug) do nothing
    `;
  }
}

async function countExistingOperationalRows(tx) {
  const [row] = await tx`
    select
      (
        (select count(*) from content.themes) +
        (select count(*) from content.people) +
        (select count(*) from content.chapters) +
        (select count(*) from content.chapter_initiatives) +
        (select count(*) from content.guilds) +
        (select count(*) from content.projects)
      )::int as count
  `;
  return Number(row?.count ?? 0);
}

async function migrateSnapshot(snapshot) {
  const databaseUrl = getMigrationDatabaseUrl();
  if (!databaseUrl) {
    throw new Error('DATABASE_URL or DIRECT_DATABASE_URL is required for --migrate');
  }

  const sql = createDatabaseClient({ url: databaseUrl, max: 1 });
  try {
    await sql.begin(async (tx) => {
      const existingRows = await countExistingOperationalRows(tx);
      if (existingRows > 0 && !shouldAllowExistingMigration) {
        throw new Error(
          `Found ${existingRows} existing operational content rows. ` +
          'content:migrate is a one-time seed and did not modify Directus-owned records. ' +
          'Use --allow-existing only for controlled recovery; it inserts missing rows without overwriting conflicts.'
        );
      }

      await upsertThemes(tx, snapshot.themes);
      await upsertPeople(tx, snapshot.people);
      await upsertChapters(tx, snapshot.chapters);
      await upsertChapterInitiatives(tx, snapshot.chapterInitiatives);
      await upsertGuilds(tx, snapshot.guilds);
      await upsertProjects(tx, snapshot.projects);
    });
  } finally {
    await sql.end({ timeout: 3 }).catch(() => {});
  }
}

const snapshot = assertPublicOperationalContentSnapshot(await loadOperationalContent());

if (shouldWriteSnapshot) {
  await mkdir(dirname(snapshotPath), { recursive: true });
  await writeFile(snapshotPath, `${JSON.stringify(snapshot, null, 2)}\n`);
}

if (shouldMigrate) {
  await migrateSnapshot(snapshot);
}

console.log(`Validated public operational content snapshot v${snapshot.version}`);
console.log(`Themes: ${snapshot.themes.length}`);
console.log(`People: ${snapshot.people.length}`);
console.log(`Chapters: ${snapshot.chapters.length}`);
console.log(`Chapter initiatives: ${snapshot.chapterInitiatives.length}`);
console.log(`Guilds: ${snapshot.guilds.length}`);
console.log(`Projects: ${snapshot.projects.length}`);
console.log(`Locations: ${snapshot.locations.length}`);
console.log(`Impact source bindings: ${snapshot.impactSourceBindings.chapters.length}`);
if (shouldWriteSnapshot) console.log(`Wrote ${snapshotPath}`);
if (shouldMigrate) console.log('Migrated operational content into Postgres.');
