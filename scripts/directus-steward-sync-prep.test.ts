import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buildChapterUpdateRequestDraft,
  parseArgs,
  prepareChapterUpdateRequests,
  resolveSchemaCollectionName,
  uniqueChapterSlugs,
} from './directus-steward-sync-prep.ts';

test('parseArgs keeps steward sync prep defaults explicit', () => {
  const options = parseArgs(['--input', '/tmp/assignments.tsv', '--dry-run']);

  assert.equal(options.input, '/tmp/assignments.tsv');
  assert.equal(options.titlePrefix, 'Refresh');
  assert.equal(options.dryRun, true);
});

test('uniqueChapterSlugs keeps first chapter assignment and ignores guild rows', () => {
  const slugs = uniqueChapterSlugs([
    { email: 'one@example.com', kind: 'chapter', slug: 'brasil' },
    { email: 'two@example.com', kind: 'chapter', slug: 'brasil' },
    { email: 'three@example.com', kind: 'guild', slug: 'dev-guild' },
    { email: 'four@example.com', kind: 'chapter', slug: 'nigeria' },
  ]);

  assert.deepEqual(slugs, ['brasil', 'nigeria']);
});

test('buildChapterUpdateRequestDraft preloads public chapter fields and a starter checklist', () => {
  const draft = buildChapterUpdateRequestDraft({
    slug: 'brasil',
    name: 'Greenpill Brasil',
    city: 'Rio de Janeiro',
    country: 'Brazil',
    summary: 'Public chapter summary.',
    primary_link: 'https://example.org',
    image: 'https://example.org/photo.jpg',
  }, {
    titlePrefix: 'Review',
  });

  assert.equal(draft.chapter_slug, 'brasil');
  assert.equal(draft.title, 'Review Greenpill Brasil profile');
  assert.equal(draft.proposed_summary, 'Public chapter summary.');
  assert.equal(draft.proposed_primary_link, 'https://example.org');
  assert.equal(draft.proposed_image, 'https://example.org/photo.jpg');
  assert.equal(draft.request_status, 'draft');
  assert.deepEqual(draft.requested_changes.currentReference, {
    name: 'Greenpill Brasil',
    city: 'Rio de Janeiro',
    country: 'Brazil',
  });
  assert.equal(draft.requested_changes.starterChecklist.length > 0, true);
});

test('resolveSchemaCollectionName supports Directus search-path collection names', () => {
  assert.equal(resolveSchemaCollectionName(['content_chapters'], 'content', 'chapters'), 'content_chapters');
  assert.equal(resolveSchemaCollectionName(['content.chapter_update_requests'], 'content', 'chapter_update_requests'), 'content.chapter_update_requests');
  assert.equal(resolveSchemaCollectionName(['chapter_update_requests'], 'content', 'chapter_update_requests'), 'chapter_update_requests');
});

test('prepareChapterUpdateRequests creates one draft per chapter and skips active requests', async () => {
  const posts: any[] = [];
  const existingBySlug = new Map([
    ['nigeria', { id: 'request-nigeria', title: 'Existing Nigeria refresh', request_status: 'pending_review' }],
  ]);
  const chapters = new Map([
    ['brasil', {
      slug: 'brasil',
      name: 'Greenpill Brasil',
      city: 'Rio de Janeiro',
      country: 'Brazil',
      summary: 'Brasil summary.',
      primary_link: 'https://brasil.example',
      image: '',
    }],
    ['nigeria', {
      slug: 'nigeria',
      name: 'Greenpill Nigeria',
      city: 'Lagos',
      country: 'Nigeria',
      summary: 'Nigeria summary.',
      primary_link: 'https://nigeria.example',
      image: '',
    }],
  ]);
  const client = {
    url: 'http://directus.test',
    async request(path: string, options: any = {}) {
      if (path === '/collections?limit=-1') {
        return {
          data: [
            { collection: 'chapters' },
            { collection: 'chapter_update_requests' },
          ],
        };
      }

      const url = new URL(path, 'http://directus.test');
      if (url.pathname === '/items/chapters') {
        const slug = url.searchParams.get('filter[slug][_eq]');
        return { data: slug && chapters.has(slug) ? [chapters.get(slug)] : [] };
      }

      if (url.pathname === '/items/chapter_update_requests' && options.method !== 'POST') {
        const slug = url.searchParams.get('filter[chapter_slug][_eq]');
        const existing = slug ? existingBySlug.get(slug) : null;
        return { data: existing ? [existing] : [] };
      }

      if (url.pathname === '/items/chapter_update_requests' && options.method === 'POST') {
        posts.push(options.body);
        return { data: { id: `created-${posts.length}` } };
      }

      throw new Error(`Unexpected request: ${path}`);
    },
  };

  const results = await prepareChapterUpdateRequests([
    { email: 'one@example.com', kind: 'chapter', slug: 'brasil' },
    { email: 'two@example.com', kind: 'chapter', slug: 'brasil' },
    { email: 'three@example.com', kind: 'guild', slug: 'dev-guild' },
    { email: 'four@example.com', kind: 'chapter', slug: 'nigeria' },
  ], {
    titlePrefix: 'Refresh',
    dryRun: false,
  }, client as any);

  assert.deepEqual(results.map((result) => result.status), ['created', 'skipped']);
  assert.equal(posts.length, 1);
  assert.equal(posts[0].chapter_slug, 'brasil');
  assert.equal(posts[0].title, 'Refresh Greenpill Brasil profile');
});
