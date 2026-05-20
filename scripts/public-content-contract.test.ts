import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  assertPublicOperationalContentSnapshot,
  containsPrivateOperationalContentField,
  toPublicOperationalContentSnapshot,
} from '@greenpill-network/shared/public-content';
import {
  buildDirectusOperationalPermissionPlan,
} from './directus-operational-content-setup.ts';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const editorialContentDir = join(rootDir, 'packages/website/src/content');
const operationalSeedDir = join(rootDir, 'packages/website/src/data/operational-content-seed');
const websitePagesDir = join(rootDir, 'packages/website/src/pages');
const websiteShellDir = join(rootDir, 'packages/website/src/components/shell');
const keystaticConfigPath = join(rootDir, 'packages/website/keystatic.config.ts');
const astroContentConfigPath = join(rootDir, 'packages/website/src/content/config.ts');
const snapshotPath = join(rootDir, 'packages/website/src/data/operational-content-snapshot.json');
const operationalContentScriptPath = join(rootDir, 'scripts/operational-content.ts');

async function readJson(relativePath) {
  return JSON.parse(await readFile(join(editorialContentDir, relativePath), 'utf8'));
}

async function readCollection(collection) {
  const entries = new Map();
  const dir = join(
    ['themes', 'people', 'chapters', 'guilds', 'projects'].includes(collection)
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

  for (const collection of ['themes', 'people', 'chapters', 'guilds', 'projects']) {
    assert.doesNotMatch(keystaticConfig, new RegExp(`\\b${collection}:\\s*collection\\(`));
    assert.doesNotMatch(astroCollections, new RegExp(`\\b${collection}\\b`));
  }
  assert.doesNotMatch(keystaticConfig, /Operational Project Slug|relatedProjectSlugs|value: 'projects'/);
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

test('site shell keeps the graphic page background visible', async () => {
  const header = await readFile(join(websiteShellDir, 'SiteHeader.astro'), 'utf8');
  const footer = await readFile(join(websiteShellDir, 'SiteFooter.astro'), 'utf8');

  assert.match(header, /rgba\(7,\s*24,\s*15,\s*0\.[0-6]/);
  assert.doesNotMatch(header, /var\(--gp-bg\)\s*92%/);
  assert.match(footer, /rgba\(7,\s*24,\s*15,\s*0\)/);
  assert.doesNotMatch(footer, /background:\s*var\(--gp-green-950\)/);
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
      guilds: [],
      projects: [],
      locations: [],
      impactSourceBindings: { version: 1, generatedAt: '2026-05-19T00:00:00.000Z', chapters: [] },
    }),
    /non-published/
  );
});

test('Directus operational access plan separates draft editors from publishers', () => {
  const plan = buildDirectusOperationalPermissionPlan(['content.chapters'], [
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

  assert.deepEqual(editorUpdate.validation.publication_status._in, ['draft', 'pending_review']);
  assert.equal(editorUpdate.fields.includes('published_at'), false);
  assert.equal(editorUpdate.fields.includes('reviewed_at'), false);
  assert.equal(editorUpdate.fields.includes('reviewed_by'), false);
  assert.deepEqual(
    publisherUpdate.validation.publication_status._in,
    ['draft', 'pending_review', 'published', 'archived']
  );
  assert.equal(publisherUpdate.fields.includes('published_at'), true);
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

  assert.match(script, /on conflict \(slug\) do nothing/);
  assert.match(script, /--allow-existing/);
  assert.match(script, /content:migrate is a one-time seed/);
  assert.doesNotMatch(script, /publication_status = excluded\.publication_status/);
  assert.doesNotMatch(script, /data = excluded\.data/);
});
