// Database proof for the chapter image rules from migrations 029 and 031.
//
// It builds a scratch database on the local Postgres server, applies every
// migration to it, and drops it again. The dev database is never written to.
//
//   bun run db:local:up
//   bun run test:chapter-images:db
//
// Covered here because only a real database can show it:
// - the backfills, run against rows shaped like production before 029 and 031;
// - the trigger that keeps alt text and credit true to the image a chapter shows;
// - an update request holding NULL, never '', for alt text or credit nobody entered;
// - an accepted update request landing on the same columns as a direct edit;
// - a withheld image alert leaving the chapter's quarantine alert free.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDatabaseClient } from '@greenpill-network/agent/db';
import { getPublicOperationalContentSnapshot } from '@greenpill-network/agent/public-content';

const DEFAULT_DATABASE_URL = 'postgres://greenpill:greenpill@localhost:3304/greenpill_network';
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);
const IMAGE_MIGRATION = '029_chapter_image_alt_credit.sql';
const REQUEST_MIGRATION = '031_chapter_update_request_alt_credit.sql';

const migrationsDir = resolve(dirname(fileURLToPath(import.meta.url)), '../packages/agent/migrations');
const serverUrl = new URL(process.env.DATABASE_URL?.trim() || DEFAULT_DATABASE_URL);
if (!LOCAL_HOSTS.has(serverUrl.hostname)) {
  // The proof creates and drops a database and inserts published chapters.
  throw new Error(`Refusing to run against ${serverUrl.hostname}: this proof only runs on a local Postgres server.`);
}

const scratchName = `chapter_image_proof_${randomUUID().slice(0, 8)}`;
const scratchUrl = new URL(serverUrl);
scratchUrl.pathname = `/${scratchName}`;
const directusUrl = 'https://admin.example.test';

type Row = Record<string, any>;
type Sql = NonNullable<ReturnType<typeof createDatabaseClient>>;

function connect(url: URL): Sql {
  const client = createDatabaseClient({ url: url.href, max: 1 });
  if (!client) throw new Error('Could not create the chapter image proof database client.');
  return client;
}

let sql: Sql | null = null;
const server = connect(serverUrl);

async function insertChapter(slug: string, fields: Row = {}) {
  const { media, seo, links, ...rest } = fields;
  await sql!`
    insert into content.chapters ${sql!({
      slug,
      name: `Proof ${slug}`,
      publication_status: 'published',
      ...rest,
      ...(media === undefined ? {} : { media: sql!.json(media) }),
      ...(seo === undefined ? {} : { seo: sql!.json(seo) }),
      ...(links === undefined ? {} : { links: sql!.json(links) }),
    })}
  `;
}

// Sets only the named columns, the way Directus writes a partial edit.
async function editChapter(slug: string, fields: Row) {
  const { media, seo, links, ...rest } = fields;
  await sql!`
    update content.chapters set ${sql!({
      ...rest,
      ...(media === undefined ? {} : { media: sql!.json(media) }),
      ...(seo === undefined ? {} : { seo: sql!.json(seo) }),
      ...(links === undefined ? {} : { links: sql!.json(links) }),
    })}
    where slug = ${slug}
  `;
}

async function chapterRow(slug: string): Promise<Row> {
  const [row] = await sql!`
    select image, image_file, image_alt, image_credit, media, seo, updated_at
    from content.chapters
    where slug = ${slug}
  `;
  return row;
}

async function publicChapter(slug: string): Promise<Row | undefined> {
  const snapshot = await getPublicOperationalContentSnapshot(sql!, new Date(), directusUrl);
  return snapshot.chapters.find((chapter) => chapter.slug === slug);
}

// Sets only the named columns, the way Directus creates a request: a field
// the steward left untouched is not sent at all.
async function insertRequest(slug: string, fields: Row = {}): Promise<string> {
  const [request] = await sql!`
    insert into content.chapter_update_requests ${sql!({
      chapter_slug: slug,
      title: `Proof request for ${slug}`,
      summary: 'Chapter image proof request.',
      ...fields,
    })}
    returning id
  `;
  return request.id;
}

async function editRequest(id: string, fields: Row) {
  await sql!`update content.chapter_update_requests set ${sql!(fields)} where id = ${id}::uuid`;
}

async function requestDescription(id: string): Promise<[string | null, string | null]> {
  const [row] = await sql!`
    select proposed_image_alt, proposed_image_credit
    from content.chapter_update_requests
    where id = ${id}::uuid
  `;
  return [row.proposed_image_alt, row.proposed_image_credit];
}

async function acceptRequest(slug: string, proposal: { image?: string; alt?: string; credit?: string }) {
  const id = await insertRequest(slug, {
    proposed_image: proposal.image ?? '',
    proposed_image_alt: proposal.alt ?? '',
    proposed_image_credit: proposal.credit ?? '',
    request_status: 'pending_review',
  });
  await editRequest(id, { request_status: 'accepted' });
}

// Stands in for a file a steward uploaded through Directus.
async function uploadFile(): Promise<string> {
  const id = randomUUID();
  await sql!`insert into public.directus_files (id) values (${id}::uuid)`;
  return id;
}

async function alertRows(slug: string): Promise<Row[]> {
  const rows = await sql!`
    select kind, quarantine_reason
    from content.review_notifications
    where record_slug = ${slug}
    order by kind
  `;
  return rows.map((row) => ({ kind: row.kind, quarantine_reason: row.quarantine_reason }));
}

const sourced = (name: string, extra: Row = {}) => ({
  image: `/images/chapters/${name}.jpg`,
  ogImage: `/images/chapters/${name}.jpg`,
  reviewStatus: 'approved',
  ...extra,
});

const originalWarn = console.warn;
try {
  await server.unsafe(`create database ${scratchName}`);
  sql = connect(scratchUrl);
  // Migrations announce every "does not exist, skipping"; keep the output to the result.
  await sql`set client_min_messages = warning`;
  // The snapshot builder logs every withheld image and quarantine; the proof asserts them instead.
  console.warn = () => {};

  // Production has Directus tables, so migration 022 ties image_file to an
  // uploaded file there. Give the scratch database the same link.
  await sql`create table public.directus_files (id uuid primary key)`;

  const migrations = (await readdir(migrationsDir)).filter((file) => file.endsWith('.sql')).sort((a, b) => a.localeCompare(b));
  assert.ok(migrations.includes(IMAGE_MIGRATION));
  assert.ok(migrations.includes(REQUEST_MIGRATION));
  const readMigration = (file: string) => readFile(resolve(migrationsDir, file), 'utf8');
  const imageMigration = await readMigration(IMAGE_MIGRATION);
  const requestMigration = await readMigration(REQUEST_MIGRATION);
  for (const file of migrations.filter((name) => name < IMAGE_MIGRATION)) {
    await sql.unsafe(await readMigration(file));
  }

  // --- Backfill -----------------------------------------------------------
  // Rows as they exist before 029: description in media only, no new columns.
  const legacyUpload = await uploadFile();
  await insertChapter('legacy-approved', {
    image: '/images/chapters/legacy-approved.jpg',
    media: sourced('legacy-approved', {
      imageAlt: '  Original alt text.  ',
      imageCredit: 'Original Photographer',
      imageSourceUrl: 'https://example.test/source',
    }),
  });
  await insertChapter('legacy-credit-only', { media: sourced('legacy-credit-only', { imageCredit: 'Only a credit' }) });
  await insertChapter('legacy-upload', { image_file: legacyUpload, media: sourced('legacy-upload', { imageAlt: 'Hidden sourced alt.' }) });
  await insertChapter('legacy-blank', { media: sourced('legacy-blank', { imageAlt: '   ', imageCredit: '' }) });
  await insertChapter('legacy-not-text', { media: sourced('legacy-not-text', { imageAlt: 123, imageCredit: { by: 'someone' } }) });
  await insertChapter('legacy-array-media', { media: [] });
  await insertChapter('legacy-text-media', { media: 'not an object' });
  await insertChapter('legacy-no-image', {});

  const before = await sql`select slug, md5(to_jsonb(c)::text) as hash from content.chapters c`;
  await sql.unsafe(imageMigration);
  const after = await sql`
    select slug, md5((to_jsonb(c) - 'image_alt' - 'image_credit')::text) as hash, image_alt, image_credit
    from content.chapters c
  `;
  const backfilled = new Map(after.map((row) => [row.slug, row]));

  // A storage move: nothing but the two new columns changes, updated_at included.
  for (const row of before) {
    assert.equal(backfilled.get(row.slug)?.hash, row.hash, `backfill touched ${row.slug} outside the new columns`);
  }
  const description = (slug: string) => [backfilled.get(slug)?.image_alt, backfilled.get(slug)?.image_credit];
  assert.deepEqual(description('legacy-approved'), ['Original alt text.', 'Original Photographer']);
  assert.deepEqual(description('legacy-credit-only'), [null, 'Only a credit']);
  assert.deepEqual(description('legacy-upload'), [null, null], 'media describes the hidden sourced image, not the upload');
  assert.deepEqual(description('legacy-blank'), [null, null]);
  assert.deepEqual(description('legacy-not-text'), [null, null], 'non-text JSON is not turned into text');
  assert.deepEqual(description('legacy-array-media'), [null, null]);
  assert.deepEqual(description('legacy-text-media'), [null, null]);
  assert.deepEqual(description('legacy-no-image'), [null, null]);

  // Applying it again changes nothing at all.
  const settled = await sql`select slug, md5(to_jsonb(c)::text) as hash from content.chapters c`;
  await sql.unsafe(imageMigration);
  const replayed = new Map((await sql`select slug, md5(to_jsonb(c)::text) as hash from content.chapters c`).map((row) => [row.slug, row.hash]));
  for (const row of settled) assert.equal(replayed.get(row.slug), row.hash, `replay changed ${row.slug}`);

  // Existing images keep their description on the public page.
  let published = await publicChapter('legacy-approved');
  assert.equal(published?.media.imageAlt, 'Original alt text.');
  assert.equal(published?.media.imageCredit, 'Original Photographer');
  assert.equal(Object.hasOwn(published ?? {}, 'imageAlt'), false);
  assert.equal(Object.hasOwn(published ?? {}, 'imageFileId'), false);

  // --- Update request alt text and credit -----------------------------------
  for (const file of migrations.filter((name) => name > IMAGE_MIGRATION && name < REQUEST_MIGRATION)) {
    await sql.unsafe(await readMigration(file));
  }

  // Requests as they exist before 031, where an empty field holds ''.
  await insertChapter('request-legacy', { image: '/images/chapters/request-legacy.jpg', media: sourced('request-legacy') });
  const untouched = await insertRequest('request-legacy', { proposed_image: 'https://example.test/untouched.jpg' });
  const padded = await insertRequest('request-legacy', {
    proposed_image: 'https://example.test/padded.jpg',
    proposed_image_alt: '  Padded alt.  ',
    proposed_image_credit: '   ',
  });
  const described = await insertRequest('request-legacy', { proposed_image_alt: 'Kept alt.', proposed_image_credit: 'Kept credit' });
  // The defect: alt text nobody entered was '', and Data Studio's required
  // check only counts NULL as missing.
  assert.deepEqual(await requestDescription(untouched), ['', '']);
  // An accepted request whose empty credit the backfill rewrites.
  await acceptRequest('request-legacy', { image: 'https://example.test/accepted-legacy.jpg', alt: 'Accepted legacy alt.' });

  const digest = async (rows: PromiseLike<readonly Row[]>) => (await rows)[0].digest as string;
  const everyRequest = () => digest(sql!`
    select md5(string_agg(md5(to_jsonb(r)::text), '' order by r.id)) as digest
    from content.chapter_update_requests r
  `);
  const outsideTheMigration = async () => ({
    requests: await digest(sql!`
      select md5(string_agg(
        md5((to_jsonb(r) - 'proposed_image_alt' - 'proposed_image_credit')::text), '' order by r.id
      )) as digest
      from content.chapter_update_requests r
    `),
    chapters: await digest(sql!`
      select md5(string_agg(md5(to_jsonb(c)::text), '' order by c.slug)) as digest from content.chapters c
    `),
    reviewEmails: await digest(sql!`
      select md5(string_agg(md5(to_jsonb(n)::text), '' order by n.id)) as digest from content.review_notifications n
    `),
  });

  const beforeRequestMigration = await outsideTheMigration();
  await sql.unsafe(requestMigration);
  // A storage move: nothing but the two columns changes, updated_at included.
  // Rewriting an accepted request applies nothing to its chapter and queues
  // no review email.
  assert.deepEqual(await outsideTheMigration(), beforeRequestMigration);
  assert.deepEqual(await requestDescription(untouched), [null, null]);
  assert.deepEqual(await requestDescription(padded), ['Padded alt.', null]);
  assert.deepEqual(await requestDescription(described), ['Kept alt.', 'Kept credit']);

  // Nullable with no default: a field Data Studio never sent reaches its
  // required check as NULL.
  const requestColumns = await sql`
    select column_name, is_nullable, column_default
    from information_schema.columns
    where table_schema = 'content'
      and table_name = 'chapter_update_requests'
      and column_name in ('proposed_image_alt', 'proposed_image_credit')
    order by column_name
  `;
  assert.deepEqual(
    requestColumns.map((column) => [column.column_name, column.is_nullable, column.column_default]),
    [['proposed_image_alt', 'YES', null], ['proposed_image_credit', 'YES', null]]
  );

  // Applying it again changes nothing at all.
  const settledRequests = await everyRequest();
  await sql.unsafe(requestMigration);
  assert.equal(await everyRequest(), settledRequests);

  for (const file of migrations.filter((name) => name > REQUEST_MIGRATION)) {
    await sql.unsafe(await readMigration(file));
  }

  // NULL is the one empty value for every writer. A request created without
  // the two fields holds NULL, and blank text from the API or a script is
  // stored as NULL too.
  const omitted = await insertRequest('request-legacy', { proposed_image: 'https://example.test/omitted.jpg' });
  assert.deepEqual(await requestDescription(omitted), [null, null]);
  const blank = await insertRequest('request-legacy', { proposed_image_alt: '   ', proposed_image_credit: '' });
  assert.deepEqual(await requestDescription(blank), [null, null]);
  await editRequest(blank, { proposed_image_alt: '  Typed alt.  ', proposed_image_credit: 'Typed credit' });
  assert.deepEqual(await requestDescription(blank), ['Typed alt.', 'Typed credit']);
  await editRequest(blank, { proposed_image_alt: '', proposed_image_credit: null });
  assert.deepEqual(await requestDescription(blank), [null, null]);

  // --- New rows ------------------------------------------------------------
  // A seeded or imported chapter describes its sourced image in media only.
  await insertChapter('new-from-media', { media: sourced('new-from-media', { imageAlt: 'Imported alt.', imageCredit: 'Imported credit' }) });
  let row = await chapterRow('new-from-media');
  assert.deepEqual([row.image_alt, row.image_credit], ['Imported alt.', 'Imported credit']);

  // Blank text is stored as NULL, the one empty value.
  await insertChapter('new-blank', { image_alt: '   ', image_credit: '' });
  row = await chapterRow('new-blank');
  assert.deepEqual([row.image_alt, row.image_credit], [null, null]);

  // --- Direct edits while the sourced image shows --------------------------
  const slug = 'direct';
  await insertChapter(slug, {
    image: '/images/chapters/direct.jpg',
    media: sourced('direct', { imageAlt: 'Original alt.', imageCredit: 'Original credit', imageSourceUrl: 'https://example.test/direct' }),
    seo: { title: 'Direct', ogImage: '/images/chapters/direct.jpg' },
  });

  // A steward corrects the alt text in the form: it is recorded with the image.
  await editChapter(slug, { image_alt: 'Steward-corrected alt.' });
  row = await chapterRow(slug);
  assert.equal(row.image_alt, 'Steward-corrected alt.');
  assert.equal(row.media.imageAlt, 'Steward-corrected alt.');
  assert.equal(row.media.imageCredit, 'Original credit');
  published = await publicChapter(slug);
  assert.equal(published?.media.imageAlt, 'Steward-corrected alt.');

  // An unrelated edit leaves the image description alone.
  await editChapter(slug, { summary: 'A new summary.' });
  row = await chapterRow(slug);
  assert.deepEqual([row.image_alt, row.image_credit], ['Steward-corrected alt.', 'Original credit']);

  // Correcting the sourced image's address is not a different picture.
  await editChapter(slug, { image: 'https://example.test/moved/direct.jpg' });
  row = await chapterRow(slug);
  assert.deepEqual([row.image_alt, row.image_credit], ['Steward-corrected alt.', 'Original credit']);

  // An import replaces the sourced image and describes it in media only.
  await editChapter(slug, {
    image: '/images/chapters/direct-2.jpg',
    media: sourced('direct-2', { imageAlt: 'Alt for the second image.' }),
    seo: { title: 'Direct', ogImage: '/images/chapters/direct-2.jpg' },
  });
  row = await chapterRow(slug);
  assert.deepEqual([row.image_alt, row.image_credit], ['Alt for the second image.', null]);
  published = await publicChapter(slug);
  assert.equal(published?.media.imageAlt, 'Alt for the second image.');
  assert.equal(Object.hasOwn(published?.media ?? {}, 'imageCredit'), false);

  // The same import later corrects only the description.
  await editChapter(slug, { media: sourced('direct-2', { imageAlt: 'Corrected alt for the second image.', imageCredit: 'Second credit' }) });
  row = await chapterRow(slug);
  assert.deepEqual([row.image_alt, row.image_credit], ['Corrected alt for the second image.', 'Second credit']);

  // --- Uploads --------------------------------------------------------------
  const firstUpload = await uploadFile();
  const secondUpload = await uploadFile();

  // The upload arrives with new alt text. The credit named the sourced image's
  // photographer, so it goes; media keeps describing the sourced image.
  await editChapter(slug, { image_file: firstUpload, image_alt: 'First upload alt.' });
  row = await chapterRow(slug);
  assert.deepEqual([row.image_alt, row.image_credit], ['First upload alt.', null]);
  assert.equal(row.media.imageAlt, 'Corrected alt for the second image.');
  assert.equal(row.media.imageCredit, 'Second credit');

  published = await publicChapter(slug);
  assert.equal(published?.image, `${directusUrl}/assets/${firstUpload}`);
  assert.equal(published?.media.image, `${directusUrl}/assets/${firstUpload}`);
  assert.equal(published?.media.imageAlt, 'First upload alt.');
  assert.equal(Object.hasOwn(published?.media ?? {}, 'imageCredit'), false);
  assert.equal(Object.hasOwn(published?.media ?? {}, 'imageSourceUrl'), false);
  assert.equal(published?.seo.ogImage, `${directusUrl}/assets/${firstUpload}`);

  // Describing the upload does not rewrite the sourced image's description.
  await editChapter(slug, { image_credit: 'Upload credit' });
  row = await chapterRow(slug);
  assert.deepEqual([row.image_alt, row.image_credit], ['First upload alt.', 'Upload credit']);
  assert.equal(row.media.imageCredit, 'Second credit');

  // A different file without new text: nothing describes it yet.
  await editChapter(slug, { image_file: secondUpload });
  row = await chapterRow(slug);
  assert.deepEqual([row.image_alt, row.image_credit], [null, null]);

  // Known limit: text repeated unchanged looks the same as text not sent, so it
  // is emptied with the previous image. The steward guide says to enter it again.
  await editChapter(slug, { image_alt: 'Second upload alt.', image_credit: 'Chapter team' });
  await editChapter(slug, { image_file: firstUpload, image_alt: 'First upload again.', image_credit: 'Chapter team' });
  row = await chapterRow(slug);
  assert.deepEqual([row.image_alt, row.image_credit], ['First upload again.', null]);

  // Removing the upload brings the sourced image back with its own description.
  await editChapter(slug, { image_file: null });
  row = await chapterRow(slug);
  assert.deepEqual([row.image_alt, row.image_credit], ['Corrected alt for the second image.', 'Second credit']);
  published = await publicChapter(slug);
  assert.equal(published?.image, '/images/chapters/direct-2.jpg');
  assert.equal(published?.media.imageAlt, 'Corrected alt for the second image.');
  assert.equal(published?.media.imageCredit, 'Second credit');

  // Deleting the uploaded file itself, instead of taking it off the chapter,
  // ends the same way.
  const deletedUpload = await uploadFile();
  await editChapter(slug, { image_file: deletedUpload, image_alt: 'Soon deleted.', image_credit: 'Soon deleted' });
  await sql`delete from public.directus_files where id = ${deletedUpload}::uuid`;
  row = await chapterRow(slug);
  assert.equal(row.image_file, null);
  assert.deepEqual([row.image_alt, row.image_credit], ['Corrected alt for the second image.', 'Second credit']);

  // A first image on a chapter that had none keeps the text typed before it.
  await insertChapter('first-image', {});
  await editChapter('first-image', { image_alt: 'Typed before the upload.' });
  await editChapter('first-image', { image_file: await uploadFile() });
  row = await chapterRow('first-image');
  assert.equal(row.image_alt, 'Typed before the upload.');
  // With no sourced image there is nothing in media to describe.
  assert.deepEqual(row.media, {});

  // A sourced image kept only as media.ogImage is still the chapter's image:
  // its description is recorded with it, and an upload replaces it.
  await insertChapter('social-only', { media: { ogImage: '/images/chapters/social-only.jpg', imageAlt: 'Social-only alt.', reviewStatus: 'approved' } });
  row = await chapterRow('social-only');
  assert.equal(row.image_alt, 'Social-only alt.');
  await editChapter('social-only', { image_credit: 'Social-only credit' });
  assert.equal((await chapterRow('social-only')).media.imageCredit, 'Social-only credit');
  await editChapter('social-only', { image_file: await uploadFile() });
  row = await chapterRow('social-only');
  assert.deepEqual([row.image_alt, row.image_credit], [null, null]);
  assert.equal(Object.hasOwn((await publicChapter('social-only'))?.media ?? {}, 'imageAlt'), false);

  // --- Accepted update requests ---------------------------------------------
  // Without an image the request describes the image the chapter shows.
  await acceptRequest(slug, { alt: 'Reviewed alt.' });
  row = await chapterRow(slug);
  assert.deepEqual([row.image_alt, row.image_credit], ['Reviewed alt.', 'Second credit']);
  assert.equal(row.media.imageAlt, 'Reviewed alt.');
  assert.equal(row.image, '/images/chapters/direct-2.jpg');

  // A direct edit and an accepted request leave the same public description.
  await insertChapter('by-edit', { image: '/images/chapters/same.jpg', media: sourced('same') });
  await insertChapter('by-request', { image: '/images/chapters/same.jpg', media: sourced('same') });
  await editChapter('by-edit', { image_alt: 'Same alt.', image_credit: 'Same credit' });
  await acceptRequest('by-request', { alt: 'Same alt.', credit: 'Same credit' });
  const byEdit = await chapterRow('by-edit');
  const byRequest = await chapterRow('by-request');
  assert.deepEqual([byRequest.image_alt, byRequest.image_credit, byRequest.media], [byEdit.image_alt, byEdit.image_credit, byEdit.media]);
  assert.deepEqual((await publicChapter('by-request'))?.media, (await publicChapter('by-edit'))?.media);

  // An accepted image becomes the chapter's one image: it replaces the upload,
  // carries exactly the proposal's description, and the copied social image follows it.
  await editChapter(slug, { image_file: firstUpload, image_alt: 'Upload alt.', image_credit: 'Upload credit' });
  const accepted = 'https://example.test/accepted.jpg';
  await acceptRequest(slug, { image: accepted, alt: 'Accepted alt.' });
  row = await chapterRow(slug);
  assert.equal(row.image, accepted);
  assert.equal(row.image_file, null);
  assert.deepEqual([row.image_alt, row.image_credit], ['Accepted alt.', null]);
  assert.deepEqual(row.media, { image: accepted, ogImage: accepted, imageAlt: 'Accepted alt.', reviewStatus: 'approved' });
  assert.equal(row.seo.ogImage, accepted);

  // The accepted image keeps its description through an upload and back.
  await acceptRequest(slug, { alt: 'Accepted alt.', credit: 'Accepted credit' });
  await editChapter(slug, { image_file: secondUpload, image_alt: 'Temporary upload.' });
  await editChapter(slug, { image_file: null });
  row = await chapterRow(slug);
  assert.deepEqual([row.image_alt, row.image_credit], ['Accepted alt.', 'Accepted credit']);
  published = await publicChapter(slug);
  assert.equal(published?.image, accepted);
  assert.equal(published?.media.imageAlt, 'Accepted alt.');
  assert.equal(published?.media.imageCredit, 'Accepted credit');

  // A request that proposes the image the chapter already lists, with the same
  // credit the upload had, still lands exactly as proposed.
  await editChapter(slug, { image_file: firstUpload, image_alt: 'Upload alt.', image_credit: 'Shared credit' });
  await acceptRequest(slug, { image: accepted, alt: 'Accepted again.', credit: 'Shared credit' });
  row = await chapterRow(slug);
  assert.equal(row.image_file, null);
  assert.deepEqual([row.image_alt, row.image_credit], ['Accepted again.', 'Shared credit']);
  assert.equal(row.media.imageCredit, 'Shared credit');

  // An independent social image is an editorial choice and stays put.
  const social = '/images/chapters/social.jpg';
  await editChapter(slug, { seo: { title: 'Direct', ogImage: social } });
  const acceptedAgain = 'https://example.test/accepted-again.jpg';
  await acceptRequest(slug, { image: acceptedAgain, alt: 'Second accepted alt.', credit: 'Second Photographer' });
  row = await chapterRow(slug);
  assert.equal(row.image, acceptedAgain);
  assert.deepEqual([row.image_alt, row.image_credit], ['Second accepted alt.', 'Second Photographer']);
  assert.equal(row.seo.ogImage, social);

  // --- Alerts ---------------------------------------------------------------
  // An unreviewed sourced image is withheld; the chapter stays, with one alert.
  await insertChapter('unreviewed', {
    image: '/images/chapters/unreviewed.jpg',
    media: { image: '/images/chapters/unreviewed.jpg', imageAlt: 'Unreviewed alt.', reviewStatus: 'pending' },
  });
  published = await publicChapter('unreviewed');
  assert.ok(published, 'the chapter stays published');
  assert.equal(published?.image, '');
  assert.deepEqual(published?.media, {});
  await publicChapter('unreviewed');
  assert.deepEqual(await alertRows('unreviewed'), [{ kind: 'chapter_image_withheld', quarantine_reason: '' }]);

  // The same chapter is later dropped for a private value. That alert still goes out.
  await editChapter('unreviewed', { links: [{ label: 'Email', url: 'mailto:someone@example.test' }] });
  assert.equal(await publicChapter('unreviewed'), undefined);
  assert.deepEqual(await alertRows('unreviewed'), [
    { kind: 'chapter_image_withheld', quarantine_reason: '' },
    { kind: 'record_quarantined', quarantine_reason: 'private_field' },
  ]);

  console.log('Chapter image database proof passed.');
} finally {
  console.warn = originalWarn;
  await sql?.end({ timeout: 3 }).catch(() => {});
  await server.unsafe(`drop database if exists ${scratchName}`).catch((error) => {
    console.error(`Could not drop scratch database ${scratchName}: ${String(error).slice(0, 160)}`);
  });
  await server.end({ timeout: 3 }).catch(() => {});
}
