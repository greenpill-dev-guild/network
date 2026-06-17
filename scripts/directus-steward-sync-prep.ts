#!/usr/bin/env bun

import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { parseAssignments } from './directus-content-access.ts';
import { createDirectusClient } from './directus-operational-content-setup.ts';

const DEFAULT_TITLE_PREFIX = 'Refresh';
const ACTIVE_REQUEST_STATUSES = ['draft', 'pending_review', 'needs_changes'];

type Assignment = {
  email: string;
  kind: 'chapter' | 'guild';
  slug: string;
};

type PrepOptions = {
  input?: string;
  titlePrefix: string;
  dryRun: boolean;
};

type ChapterRecord = {
  slug: string;
  name?: string;
  city?: string;
  country?: string;
  summary?: string;
  primary_link?: string;
  image?: string;
};

type PrepResult = {
  chapter: string;
  title: string;
  status: 'created' | 'dry-run' | 'skipped';
  details: string;
};

function usage() {
  return [
    'Usage: bun scripts/directus-steward-sync-prep.ts --input assignments.tsv [options]',
    '',
    'Input TSV columns:',
    '  email<TAB>kind<TAB>slug',
    '',
    'Options:',
    `  --title-prefix <text>  Prefix for created request titles. Defaults to "${DEFAULT_TITLE_PREFIX}".`,
    '  --dry-run              Resolve chapters and print planned request rows without mutating Directus.',
  ].join('\n');
}

function takeValue(args: string[], index: number, flag: string) {
  const value = args[index + 1];
  if (!value || value.startsWith('--')) {
    throw new Error(`${flag} requires a value.`);
  }
  return value;
}

function cleanString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

export function parseArgs(argv: string[]): PrepOptions {
  const args = argv[0] === 'prep' ? argv.slice(1) : argv;
  const options: PrepOptions = {
    titlePrefix: DEFAULT_TITLE_PREFIX,
    dryRun: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--help' || arg === '-h') {
      console.log(usage());
      process.exit(0);
    }
    if (arg === '--input' || arg === '-i') {
      options.input = takeValue(args, index, arg);
      index += 1;
      continue;
    }
    if (arg === '--title-prefix') {
      options.titlePrefix = takeValue(args, index, arg);
      index += 1;
      continue;
    }
    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }
    throw new Error(`Unknown option: ${arg}\n\n${usage()}`);
  }

  if (!options.input) {
    throw new Error(`Missing --input.\n\n${usage()}`);
  }

  return options;
}

export function uniqueChapterSlugs(assignments: Assignment[]) {
  const seen = new Set<string>();
  const slugs: string[] = [];

  for (const assignment of assignments) {
    if (assignment.kind !== 'chapter' || seen.has(assignment.slug)) continue;
    seen.add(assignment.slug);
    slugs.push(assignment.slug);
  }

  return slugs;
}

function chapterLabel(chapter: ChapterRecord) {
  return cleanString(chapter.name) || chapter.slug;
}

export function buildChapterUpdateRequestDraft(chapter: ChapterRecord, options: Pick<PrepOptions, 'titlePrefix'>) {
  const name = chapterLabel(chapter);
  return {
    chapter_slug: chapter.slug,
    title: `${options.titlePrefix} ${name} profile`,
    summary: `Steward sync draft for reviewing ${name}'s public chapter profile before publisher review.`,
    proposed_summary: cleanString(chapter.summary),
    proposed_primary_link: cleanString(chapter.primary_link),
    proposed_image: cleanString(chapter.image),
    proposed_image_alt: '',
    proposed_image_credit: '',
    requested_changes: {
      starterChecklist: [
        'Confirm the public chapter summary is current.',
        'Confirm the primary public link and add any missing public links.',
        'Add proof signals with public sources when available.',
        'Add or confirm a public image, alt text, and image credit.',
        'Move request_status to pending_review when ready for publisher review.',
      ],
      currentReference: {
        name,
        city: cleanString(chapter.city),
        country: cleanString(chapter.country),
      },
    },
    request_status: 'draft',
  };
}

function encodeCollection(collection: string) {
  return encodeURIComponent(collection);
}

function baseCollectionName(collection: string) {
  return collection.replace(/^(content|intake)[._]/, '');
}

export function resolveSchemaCollectionName(availableCollectionNames: string[], schema: string, collection: string) {
  const names = new Set(availableCollectionNames);
  const candidates = [
    collection,
    `${schema}.${collection}`,
    `${schema}_${collection}`,
  ];
  const match = candidates.find((candidate) => names.has(candidate));
  if (!match) {
    throw new Error(`Directus collection for ${schema}.${collection} was not found.`);
  }
  return match;
}

async function getAvailableCollectionNames(client) {
  const response = await client.request('/collections?limit=-1');
  return (response?.data ?? []).map((collection) => collection.collection).filter(Boolean);
}

async function resolveCollections(client) {
  const available = await getAvailableCollectionNames(client);
  return {
    chapters: resolveSchemaCollectionName(available, 'content', 'chapters'),
    chapterUpdateRequests: resolveSchemaCollectionName(available, 'content', 'chapter_update_requests'),
  };
}

async function getChapter(client, collection: string, slug: string): Promise<ChapterRecord> {
  const params = new URLSearchParams();
  params.set('filter[slug][_eq]', slug);
  params.set('fields', 'slug,name,city,country,summary,primary_link,image');
  params.set('limit', '1');

  const response = await client.request(`/items/${encodeCollection(collection)}?${params.toString()}`);
  const chapter = response?.data?.[0];
  if (!chapter?.slug) {
    throw new Error(`Directus chapter not found: ${slug}`);
  }
  return chapter;
}

async function getExistingActiveRequest(client, collection: string, chapterSlug: string) {
  const params = new URLSearchParams();
  params.set('filter[chapter_slug][_eq]', chapterSlug);
  params.set('fields', 'id,title,request_status,updated_at');
  params.set('sort', '-updated_at');
  params.set('limit', '-1');

  const response = await client.request(`/items/${encodeCollection(collection)}?${params.toString()}`);
  return (response?.data ?? []).find((request) => ACTIVE_REQUEST_STATUSES.includes(request.request_status));
}

export async function prepareChapterUpdateRequests(
  assignments: Assignment[],
  options: Pick<PrepOptions, 'titlePrefix' | 'dryRun'>,
  client?: Awaited<ReturnType<typeof createDirectusClient>>
): Promise<PrepResult[]> {
  const directus = client ?? await createDirectusClient();
  const collections = await resolveCollections(directus);
  const results: PrepResult[] = [];

  for (const slug of uniqueChapterSlugs(assignments)) {
    const chapter = await getChapter(directus, collections.chapters, slug);
    const draft = buildChapterUpdateRequestDraft(chapter, options);
    const existing = await getExistingActiveRequest(directus, collections.chapterUpdateRequests, slug);

    if (existing?.id) {
      results.push({
        chapter: slug,
        title: existing.title || draft.title,
        status: 'skipped',
        details: `active ${existing.request_status} request already exists`,
      });
      continue;
    }

    if (!options.dryRun) {
      await directus.request(`/items/${encodeCollection(collections.chapterUpdateRequests)}`, {
        method: 'POST',
        body: draft,
      });
    }

    results.push({
      chapter: slug,
      title: draft.title,
      status: options.dryRun ? 'dry-run' : 'created',
      details: baseCollectionName(collections.chapterUpdateRequests),
    });
  }

  return results;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const assignments = parseAssignments(await readFile(options.input!, 'utf8')) as Assignment[];
  const client = await createDirectusClient();
  const results = await prepareChapterUpdateRequests(assignments, options, client);

  console.log(`Directus target: ${client.url}`);
  if (!results.length) {
    console.log('No chapter assignments found; no chapter update request drafts were created.');
    return;
  }
  for (const result of results) {
    console.log(`${result.status}: ${result.chapter} -> ${result.title} (${result.details})`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
