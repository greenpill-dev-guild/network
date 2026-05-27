import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  assertPublicOperationalContentSnapshot,
  containsPrivateOperationalContentField,
  containsUnapprovedChapterMedia,
  toPublicOperationalContentSnapshot,
} from '@greenpill-network/shared/public-content';
import {
  buildDirectusOperationalPermissionPlan,
} from './directus-operational-content-setup.ts';
import {
  loadChapterEnrichment,
} from './directus-chapter-enrichment.ts';
import {
  loadOperationalEnrichment,
} from './directus-operational-enrichment.ts';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const editorialContentDir = join(rootDir, 'packages/website/src/content');
const operationalSeedDir = join(rootDir, 'packages/website/src/data/operational-content-seed');
const websitePagesDir = join(rootDir, 'packages/website/src/pages');
const websiteShellDir = join(rootDir, 'packages/website/src/components/shell');
const repoGuidancePaths = [
  join(rootDir, 'AGENTS.md'),
  join(rootDir, 'CLAUDE.md'),
  join(rootDir, 'README.md'),
];
const keystaticConfigPath = join(rootDir, 'packages/website/keystatic.config.ts');
const astroContentConfigPath = join(rootDir, 'packages/website/src/content/config.ts');
const snapshotPath = join(rootDir, 'packages/website/src/data/operational-content-snapshot.json');
const podcastSnapshotPath = join(rootDir, 'packages/website/src/data/podcast-feed-snapshot.json');
const operationalContentScriptPath = join(rootDir, 'scripts/operational-content.ts');
const homePagePath = join(rootDir, 'packages/website/src/pages/index.astro');
const libraryPagePath = join(rootDir, 'packages/website/src/pages/library/index.astro');
const storyDetailPagePath = join(rootDir, 'packages/website/src/pages/stories/[slug].astro');
const storiesIndexPagePath = join(rootDir, 'packages/website/src/pages/stories/index.astro');
const chapterPagePath = join(rootDir, 'packages/website/src/pages/chapters/[slug].astro');
const chapterInitiativesMigrationPath = join(rootDir, 'packages/agent/migrations/010_chapter_initiatives_operational_content.sql');
const activeChapterEnrichmentSlugs = [
  'brasil',
  'c-te-d-ivoire',
  'cape-town',
  'germany',
  'greensofa',
  'kenya',
  'koh-pha-ngan',
  'london-ontario',
  'new-york-city',
  'nigeria',
  'ottawa',
  'toronto',
];
const requiredEnrichedInitiativeSlugs = [
  'cape-town-ethereum-at-10',
  'germany-refi-community-activation',
  'greensofa-ethereum-localism-public-goods-tooling',
  'kenya-regenerative-agriculture-hub',
  'ottawa-reimagining-our-future',
  'toronto-local-impact-web3-solutions',
];

async function readJson(relativePath) {
  return JSON.parse(await readFile(join(editorialContentDir, relativePath), 'utf8'));
}

async function readCollection(collection) {
  const entries = new Map();
  const operationalCollections = ['themes', 'people', 'chapters', 'chapter-initiatives', 'guilds', 'projects'];
  const dir = join(
    operationalCollections.includes(collection)
      ? operationalSeedDir
      : editorialContentDir,
    collection
  );
  for (const file of await readdir(dir)) {
    if (!file.endsWith('.json')) continue;
    entries.set(file.replace(/\.json$/, ''), JSON.parse(await readFile(join(dir, file), 'utf8')));
  }
  return entries;
}

async function readAstroFiles(dir) {
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await readAstroFiles(fullPath));
    } else if (entry.name.endsWith('.astro')) {
      files.push(fullPath);
    }
  }
  return files;
}

async function readFilesWithExtensions(dir, extensions) {
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await readFilesWithExtensions(fullPath, extensions));
    } else if (extensions.some((extension) => entry.name.endsWith(extension))) {
      files.push(fullPath);
    }
  }
  return files;
}

function walk(value, visit, path = '$') {
  if (Array.isArray(value)) {
    value.forEach((item, index) => walk(item, visit, `${path}[${index}]`));
    return;
  }
  if (!value || typeof value !== 'object') return;
  visit(value, path);
  for (const [key, nested] of Object.entries(value)) {
    walk(nested, visit, `${path}.${key}`);
  }
}

function collectReferences(data, path) {
  const references = [];
  walk(data, (value, valuePath) => {
    if (value.collection === 'stories' && typeof value.slug === 'string' && value.slug) {
      references.push({ collection: 'stories', slug: value.slug, path: `${valuePath}.slug` });
    }
    if (value.collection === 'chapters' && typeof value.slug === 'string' && value.slug) {
      references.push({ collection: 'chapters', slug: value.slug, path: `${valuePath}.slug` });
    }
    if (typeof value.storySlug === 'string' && value.storySlug) {
      references.push({ collection: 'stories', slug: value.storySlug, path: `${valuePath}.storySlug` });
    }
    for (const key of ['storySlugs', 'featuredStorySlugs']) {
      if (!Array.isArray(value[key])) continue;
      value[key].forEach((slug, index) => {
        if (typeof slug === 'string' && slug) {
          references.push({ collection: 'stories', slug, path: `${valuePath}.${key}[${index}]` });
        }
      });
    }
    for (const key of ['relatedChapterSlugs', 'featuredChapterSlugs']) {
      if (!Array.isArray(value[key])) continue;
      value[key].forEach((slug, index) => {
        if (typeof slug === 'string' && slug) {
          references.push({ collection: 'chapters', slug, path: `${valuePath}.${key}[${index}]` });
        }
      });
    }
  }, path);
  return references;
}

test('public content references only generated chapters and published stories', async () => {
  const chapters = await readCollection('chapters');
  const stories = await readCollection('stories');
  const publicFiles = [
    'home-page.json',
    'chapters-index.json',
    'library.json',
    'stories-index.json',
    'garden.json',
  ];

  const references = [];
  for (const file of publicFiles) {
    references.push(...collectReferences(await readJson(file), file));
  }
  for (const [slug, chapter] of chapters) {
    if (chapter.seo?.noindex) continue;
    references.push(...collectReferences(chapter, `chapters/${slug}.json`));
  }

  const problems = [];
  for (const reference of references) {
    if (reference.collection === 'chapters') {
      const chapter = chapters.get(reference.slug);
      if (!chapter) {
        problems.push(`${reference.path} points at missing chapter '${reference.slug}'`);
      } else if (chapter.seo?.noindex) {
        problems.push(`${reference.path} points at noindex chapter '${reference.slug}'`);
      }
    }
    if (reference.collection === 'stories') {
      const story = stories.get(reference.slug);
      if (!story) {
        problems.push(`${reference.path} points at missing story '${reference.slug}'`);
      } else if (story.status !== 'published' || story.seo?.noindex) {
        problems.push(`${reference.path} points at unpublished story '${reference.slug}'`);
      }
    }
  }

  assert.deepEqual(problems, []);
});

test('operational content snapshot is public-safe and derived from approved operational collections', async () => {
  const snapshot = assertPublicOperationalContentSnapshot(
    JSON.parse(await readFile(snapshotPath, 'utf8'))
  );

  assert.equal(snapshot.version, 1);
  assert.equal(snapshot.chapters.length > 0, true);
  assert.equal(snapshot.chapterInitiatives.length > 0, true);
  assert.equal(snapshot.locations.length > 0, true);
  assert.equal(Array.isArray(snapshot.impactSourceBindings.chapters), true);
  assert.equal(containsPrivateOperationalContentField(snapshot), false);
});

test('Keystatic and Astro content configs expose editorial collections only', async () => {
  const [keystaticConfig, astroContentConfig] = await Promise.all([
    readFile(keystaticConfigPath, 'utf8'),
    readFile(astroContentConfigPath, 'utf8'),
  ]);
  const astroCollections = astroContentConfig.match(/export const collections = \{([\s\S]*?)\n\};/)?.[1] ?? '';

  for (const collection of ['themes', 'people', 'chapters', 'chapterInitiatives', 'chapter_initiatives', 'guilds', 'projects']) {
    assert.doesNotMatch(keystaticConfig, new RegExp(`\\b${collection}:\\s*collection\\(`));
    assert.doesNotMatch(astroCollections, new RegExp(`\\b${collection}\\b`));
  }
  assert.doesNotMatch(keystaticConfig, /Operational Project Slug|relatedProjectSlugs|value: 'projects'|chapterInitiatives|chapter_initiatives/);
  assert.doesNotMatch(astroContentConfig, /relatedProjectSlugs/);

  for (const collection of ['stories', 'resources', 'books']) {
    assert.match(keystaticConfig, new RegExp(`\\b${collection}:\\s*collection\\(`));
    assert.match(astroCollections, new RegExp(`\\b${collection}\\b`));
  }
});

test('editorial content does not carry project reference metadata', async () => {
  const problems = [];
  for (const filePath of await readFilesWithExtensions(editorialContentDir, ['.json'])) {
    const source = await readFile(filePath, 'utf8');
    if (/"collection"\s*:\s*"projects"|relatedProjectSlugs/.test(source)) {
      problems.push(filePath.replace(`${rootDir}/`, ''));
    }
  }

  assert.deepEqual(problems, []);
});

test('chapter initiatives are operational records and projects stay guild-owned', async () => {
  const snapshot = assertPublicOperationalContentSnapshot(
    JSON.parse(await readFile(snapshotPath, 'utf8'))
  );
  const chapterSlugs = new Set(snapshot.chapters.map((chapter) => chapter.slug));
  const guildSlugs = new Set(snapshot.guilds.map((guild) => guild.slug));
  const chapterInitiativeSeed = await readCollection('chapter-initiatives');

  assert.equal(chapterInitiativeSeed.size, snapshot.chapterInitiatives.length);
  for (const initiative of snapshot.chapterInitiatives) {
    assert.equal(typeof initiative.chapterSlug, 'string');
    assert.equal(chapterSlugs.has(initiative.chapterSlug), true);
    assert.equal(Object.hasOwn(initiative, 'guild'), false);
    assert.equal(Object.hasOwn(initiative, 'guildSlug'), false);
  }

  for (const project of snapshot.projects) {
    assert.equal(typeof project.guild, 'string');
    assert.equal(guildSlugs.has(project.guild), true);
    assert.equal(Object.hasOwn(project, 'chapterSlug'), false);
  }

  const projected = toPublicOperationalContentSnapshot({
    guilds: [{ slug: 'dev-guild', name: 'Dev Guild' }],
    projects: [
      { slug: 'valid-project', name: 'Valid Project', guild: 'dev-guild' },
      { slug: 'missing-guild-project', name: 'Missing Guild Project', guild: 'missing-guild' },
      { slug: 'blank-guild-project', name: 'Blank Guild Project', guild: '' },
    ],
  });
  assert.deepEqual(projected.projects.map((project) => project.slug), ['valid-project']);
});

test('chapter initiative cards do not render dead links when no URL is present', async () => {
  const source = await readFile(chapterPagePath, 'utf8');

  assert.match(source, /<article class="gp-chapter-initiative">/);
  assert.doesNotMatch(source, /href=\{href \|\| '#'\}/);
});

test('chapter pages render approved media and steward avatar cards', async () => {
  const [chapterPage, chapterIndexPage] = await Promise.all([
    readFile(chapterPagePath, 'utf8'),
    readFile(join(websitePagesDir, 'chapters/index.astro'), 'utf8'),
  ]);

  assert.match(chapterPage, /import Avatar from/);
  assert.match(chapterPage, /media\.reviewStatus === 'approved'/);
  assert.match(chapterPage, /gp-chapter-hero-media/);
  assert.match(chapterPage, /gp-chapter-steward-card/);
  assert.match(chapterIndexPage, /import AvatarStack from/);
  assert.match(chapterIndexPage, /approvedImageFor/);
  assert.match(chapterIndexPage, /gp-chapters-card-stewards/);
});

test('story pages render markdown lists and use authored featured ordering', async () => {
  const [storyDetailPage, storiesIndexPage, homePage] = await Promise.all([
    readFile(storyDetailPagePath, 'utf8'),
    readFile(storiesIndexPagePath, 'utf8'),
    readFile(homePagePath, 'utf8'),
  ]);

  assert.match(storyDetailPage, /kind: 'ul'/);
  assert.match(storyDetailPage, /kind: 'ol'/);
  assert.match(storyDetailPage, /<li>/);
  assert.match(storyDetailPage, /linkifyText/);
  assert.match(storyDetailPage, /gp-story-hero-media/);
  assert.match(storiesIndexPage, /featuredStoryRank/);
  assert.match(storiesIndexPage, /gp-stories-feature-media/);
  assert.match(storiesIndexPage, /gp-stories-card-media/);
  assert.match(homePage, /homeStoryRank/);
  assert.doesNotMatch(homePage, /Meta items=\{\['Chapter', region\]\}/);
});

test('published stories carry local image metadata', async () => {
  const stories = await readCollection('stories');
  const problems = [];

  for (const [slug, story] of stories) {
    if (story.status !== 'published' || story.seo?.noindex) continue;
    const image = story.image || '';
    const media = story.media ?? {};
    const seo = story.seo ?? {};

    if (!image) problems.push(`${slug} is missing image`);
    if (media.image !== image) problems.push(`${slug} media.image does not match image`);
    if (!media.imageAlt) problems.push(`${slug} is missing media.imageAlt`);
    if (media.ogImage !== image) problems.push(`${slug} media.ogImage does not match image`);
    if (seo.ogImage !== image) problems.push(`${slug} seo.ogImage does not match image`);

    if (image.startsWith('/images/')) {
      await readFile(join(rootDir, 'packages/website/public', image)).catch(() => {
        problems.push(`${slug} points at missing public image ${image}`);
      });
    }
  }

  assert.deepEqual(problems, []);
});

test('website page typography avoids viewport-scaled type and negative tracking', async () => {
  const problems = [];
  for (const filePath of await readAstroFiles(websitePagesDir)) {
    const source = await readFile(filePath, 'utf8');
    if (/font-size:\s*clamp\([^;]*(?:vw|vi)/.test(source)) {
      problems.push(`${filePath.replace(`${rootDir}/`, '')} uses viewport-scaled font-size`);
    }
    if (/letter-spacing:\s*-\d/.test(source)) {
      problems.push(`${filePath.replace(`${rootDir}/`, '')} uses negative letter-spacing`);
    }
  }

  assert.deepEqual(problems, []);
});

test('repo agent guidance points at the canonical website stylesheet', async () => {
  const problems = [];

  for (const filePath of repoGuidancePaths) {
    const source = await readFile(filePath, 'utf8');
    const label = filePath.replace(`${rootDir}/`, '');
    if (source.includes('packages/website/src/styles/global.css')) {
      problems.push(`${label} points at removed global.css`);
    }
    if (!source.includes('packages/website/src/styles/gp-tokens.css')) {
      problems.push(`${label} does not mention canonical gp-tokens.css`);
    }
  }

  assert.deepEqual(problems, []);
});

test('site shell keeps the graphic page background visible', async () => {
  const header = await readFile(join(websiteShellDir, 'SiteHeader.astro'), 'utf8');
  const footer = await readFile(join(websiteShellDir, 'SiteFooter.astro'), 'utf8');

  assert.match(header, /background:\s*none|rgba\(7,\s*24,\s*15,\s*0\.[0-6]/);
  assert.doesNotMatch(header, /var\(--gp-bg\)\s*92%/);
  assert.match(footer, /rgba\(7,\s*24,\s*15,\s*0\)/);
  assert.doesNotMatch(footer, /background:\s*var\(--gp-green-950\)/);
});

test('library podcast section uses RSS snapshot and in-page audio', async () => {
  const [libraryPage, podcastSnapshotSource] = await Promise.all([
    readFile(libraryPagePath, 'utf8'),
    readFile(podcastSnapshotPath, 'utf8'),
  ]);
  const podcastSnapshot = JSON.parse(podcastSnapshotSource);

  assert.equal(podcastSnapshot.sourceUrl, 'https://rss.libsyn.com/shows/400481/destinations/3304589.xml');
  assert.equal(podcastSnapshot.episodeCount, 296);
  assert.equal(podcastSnapshot.episodes.length >= 8, true);
  assert.equal(podcastSnapshot.episodes.every((episode) => episode.title && episode.audioUrl), true);

  assert.match(libraryPage, /import podcastFeed/);
  assert.match(libraryPage, /id="podcast"/);
  assert.match(libraryPage, /<audio class="gp-library-audio/);
  assert.match(libraryPage, /gardenGuides\.map/);
  assert.doesNotMatch(libraryPage, /episodeResources\.map/);
  assert.doesNotMatch(libraryPage, /guideResources\.map/);
  assert.doesNotMatch(libraryPage, /gp-library-play/);
});

test('operational content snapshot generation rejects private fields and non-published records', () => {
  assert.throws(
    () => toPublicOperationalContentSnapshot({
      chapters: [{
        slug: 'private-node',
        name: 'Private Node',
        lat: 1,
        long: 1,
        privateEmail: 'private@example.com',
      }],
    }),
    /private fields/
  );

  assert.equal(containsPrivateOperationalContentField({ ip: '127.0.0.1' }), true);
  assert.equal(containsPrivateOperationalContentField({ media: { reviewStatus: 'approved' } }), false);
  assert.equal(containsPrivateOperationalContentField({ media: { reviewNotes: 'internal note' } }), true);
  assert.equal(containsPrivateOperationalContentField({ rawSocialMetadata: { handle: '@example' } }), true);

  assert.throws(
    () => toPublicOperationalContentSnapshot({
      chapters: [{
        slug: 'draft-chapter',
        name: 'Draft Chapter',
        publicationStatus: 'pending_review',
      }],
    }),
    /non-published/
  );

  assert.throws(
    () => assertPublicOperationalContentSnapshot({
      version: 1,
      generatedAt: '2026-05-19T00:00:00.000Z',
      themes: [],
      people: [],
      chapters: [{ slug: 'draft-chapter', publicationStatus: 'pending_review' }],
      chapterInitiatives: [],
      guilds: [],
      projects: [],
      locations: [],
      impactSourceBindings: { version: 1, generatedAt: '2026-05-19T00:00:00.000Z', chapters: [] },
    }),
    /non-published/
  );
});

test('public operational chapter media requires approved provenance', () => {
  const base = {
    version: 1,
    generatedAt: '2026-05-20T00:00:00.000Z',
    themes: [],
    people: [],
    chapterInitiatives: [],
    guilds: [],
    projects: [],
    locations: [],
    impactSourceBindings: { version: 1, generatedAt: '2026-05-20T00:00:00.000Z', chapters: [] },
  };

  assert.equal(containsUnapprovedChapterMedia({
    ...base,
    chapters: [{
      slug: 'needs-photo',
      name: 'Needs Photo',
      media: { reviewStatus: 'needs-steward-photo' },
    }],
  }), false);

  assert.throws(
    () => assertPublicOperationalContentSnapshot({
      ...base,
      chapters: [{
        slug: 'pending-photo',
        name: 'Pending Photo',
        image: 'https://example.com/photo.jpg',
        media: { image: 'https://example.com/photo.jpg', reviewStatus: 'pending' },
      }],
    }),
    /unapproved chapter media/
  );

  assert.doesNotThrow(
    () => assertPublicOperationalContentSnapshot({
      ...base,
      chapters: [{
        slug: 'approved-photo',
        name: 'Approved Photo',
        image: 'https://example.com/photo.jpg',
        media: {
          image: 'https://example.com/photo.jpg',
          imageAlt: 'People gathered at a local chapter event.',
          imageSourceUrl: 'https://example.com/event',
          imageCredit: 'Example Chapter',
          reviewStatus: 'approved',
        },
      }],
    })
  );
});

test('Directus chapter enrichment targets visible active chapters and public people only', async () => {
  const enrichment = await loadChapterEnrichment();
  const emailLike = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;

  assert.deepEqual(
    enrichment.chapters.map((chapter) => chapter.slug).sort(),
    activeChapterEnrichmentSlugs
  );
  assert.equal(enrichment.people.length, 16);
  const chapterImageStatuses = enrichment.chapters.flatMap((chapter) => (
    chapter.image || chapter.media?.image || chapter.media?.ogImage || chapter.seo?.ogImage
      ? [`${chapter.slug}:${chapter.media?.reviewStatus}`]
      : []
  ));
  assert.equal(chapterImageStatuses.length, activeChapterEnrichmentSlugs.length);
  assert.deepEqual(
    chapterImageStatuses.sort(),
    activeChapterEnrichmentSlugs.map((slug) => `${slug}:approved`).sort()
  );
  assert.equal(emailLike.test(JSON.stringify(enrichment)), false);
  assert.equal(enrichment.people.every((person) => person.avatar === ''), true);
});

test('Directus operational enrichment targets public guilds and visible initiatives', async () => {
  const enrichment = await loadOperationalEnrichment();
  const emailLike = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
  const initiativeSlugs = new Set(enrichment.chapterInitiatives.map((initiative) => initiative.slug));
  const guildImageStatuses = enrichment.guilds.flatMap((guild) => (
    guild.image || guild.media?.image || guild.media?.ogImage || guild.seo?.ogImage
      ? [`${guild.slug}:${guild.media?.reviewStatus}`]
      : []
  ));

  assert.deepEqual(enrichment.guilds.map((guild) => guild.slug), ['dev-guild', 'greensci', 'writers-guild']);
  assert.deepEqual(guildImageStatuses.sort(), ['dev-guild:approved', 'writers-guild:approved']);
  for (const slug of requiredEnrichedInitiativeSlugs) {
    assert.equal(initiativeSlugs.has(slug), true);
  }
  assert.equal(enrichment.chapterInitiatives.some((initiative) => initiative.chapterSlug === 'uncommons'), false);
  assert.equal(emailLike.test(JSON.stringify(enrichment)), false);
});

test('Directus operational access plan separates draft editors from publishers', () => {
  const plan = buildDirectusOperationalPermissionPlan(['content.chapters', 'content.chapter_initiatives'], [
    'intake.map_node_submissions',
    'intake.map_node_private_contacts',
    'intake.map_node_reviews',
    'intake.map_node_intake_settings',
    'intake.map_node_edit_tokens',
    'intake.map_node_update_requests',
  ]);
  const editorUpdate = plan.permissions.find((permission) => (
    permission.role === 'Greenpill Steward Editor' &&
    permission.collection === 'content.chapters' &&
    permission.action === 'update'
  ));
  const publisherUpdate = plan.permissions.find((permission) => (
    permission.role === 'Greenpill Trusted Publisher' &&
    permission.collection === 'content.chapters' &&
    permission.action === 'update'
  ));
  const initiativeEditorUpdate = plan.permissions.find((permission) => (
    permission.role === 'Greenpill Steward Editor' &&
    permission.collection === 'content.chapter_initiatives' &&
    permission.action === 'update'
  ));
  const initiativePublisherUpdate = plan.permissions.find((permission) => (
    permission.role === 'Greenpill Trusted Publisher' &&
    permission.collection === 'content.chapter_initiatives' &&
    permission.action === 'update'
  ));
  const operator = plan.policies.find((policy) => policy.name === 'Greenpill Operator');
  const moderatorSubmissionRead = plan.permissions.find((permission) => (
    permission.role === 'Greenpill Steward Moderator' &&
    permission.collection === 'intake.map_node_submissions' &&
    permission.action === 'read'
  ));
  const moderatorPrivateContactRead = plan.permissions.find((permission) => (
    permission.role === 'Greenpill Steward Moderator' &&
    permission.collection === 'intake.map_node_private_contacts' &&
    permission.action === 'read'
  ));
  const trustedPrivateContactRead = plan.permissions.find((permission) => (
    permission.role === 'Greenpill Trusted Publisher' &&
    permission.collection === 'intake.map_node_private_contacts' &&
    permission.action === 'read'
  ));
  const moderatorUpdateRequestRead = plan.permissions.find((permission) => (
    permission.role === 'Greenpill Steward Moderator' &&
    permission.collection === 'intake.map_node_update_requests' &&
    permission.action === 'read'
  ));
  const moderatorEditTokenRead = plan.permissions.find((permission) => (
    permission.role === 'Greenpill Steward Moderator' &&
    permission.collection === 'intake.map_node_edit_tokens' &&
    permission.action === 'read'
  ));
  const trustedEditTokenRead = plan.permissions.find((permission) => (
    permission.role === 'Greenpill Trusted Publisher' &&
    permission.collection === 'intake.map_node_edit_tokens' &&
    permission.action === 'read'
  ));

  assert.equal(editorUpdate, undefined);
  assert.equal(initiativeEditorUpdate, undefined);
  assert.deepEqual(
    publisherUpdate.validation.publication_status._in,
    ['draft', 'pending_review', 'published', 'archived']
  );
  assert.equal(publisherUpdate.fields.includes('published_at'), true);
  assert.deepEqual(
    initiativePublisherUpdate.validation.publication_status._in,
    ['draft', 'pending_review', 'published', 'archived']
  );
  assert.equal(initiativePublisherUpdate.fields.includes('published_at'), true);
  assert.equal(publisherUpdate.fields.includes('reviewed_at'), true);
  assert.equal(publisherUpdate.fields.includes('reviewed_by'), true);
  assert.ok(moderatorSubmissionRead);
  assert.ok(trustedPrivateContactRead);
  assert.equal(moderatorSubmissionRead.fields.includes('raw_note'), false);
  assert.equal(moderatorSubmissionRead.fields.includes('ip_address'), false);
  assert.equal(moderatorSubmissionRead.fields.includes('user_agent'), false);
  assert.equal(moderatorPrivateContactRead, undefined);
  assert.ok(moderatorUpdateRequestRead);
  assert.equal(moderatorUpdateRequestRead.fields.includes('current_public_fields'), true);
  assert.equal(moderatorUpdateRequestRead.fields.includes('proposed_public_fields'), true);
  assert.equal(moderatorUpdateRequestRead.fields.includes('request_email'), false);
  assert.equal(moderatorUpdateRequestRead.fields.includes('requester_ip'), false);
  assert.equal(moderatorUpdateRequestRead.fields.includes('requester_user_agent'), false);
  assert.equal(moderatorUpdateRequestRead.fields.includes('rate_limit_key'), false);
  assert.equal(moderatorUpdateRequestRead.fields.includes('request_metadata'), false);
  assert.equal(moderatorEditTokenRead, undefined);
  assert.ok(trustedEditTokenRead);
  assert.equal(trustedEditTokenRead.fields.includes('token_hash'), true);
  assert.equal(trustedEditTokenRead.fields.includes('request_ip'), true);
  assert.deepEqual(trustedPrivateContactRead.fields, [
    'submission_id',
    'email',
    'contact_consent',
    'created_at',
  ]);
  assert.equal(operator.admin_access, true);
});

test('operational content migration preserves existing Directus-owned rows', async () => {
  const script = await readFile(operationalContentScriptPath, 'utf8');
  const migration = await readFile(chapterInitiativesMigrationPath, 'utf8');

  assert.match(script, /on conflict \(slug\) do nothing/);
  assert.match(script, /content\.chapter_initiatives/);
  assert.match(script, /--allow-existing/);
  assert.match(script, /content:migrate is a one-time seed/);
  assert.doesNotMatch(script, /publication_status = excluded\.publication_status/);
  assert.doesNotMatch(script, /data = excluded\.data/);
  assert.match(migration, /join content\.guilds guild on guild\.slug = project\.guild_slug/);
  assert.match(migration, /guild\.publication_status = 'published'/);
});
