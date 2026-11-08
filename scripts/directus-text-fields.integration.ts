// Database proof for the text field rule in scripts/directus-studio-setup.ts
// and migration 033.
//
// It builds a scratch database on the local Postgres server, applies every
// migration to it, and drops it again. The dev database is never written to.
//
//   bun run db:local:up
//   bun run test:text-fields:db
//
// In the isolated dev machine there is no Docker: start Postgres on the Mac
// and keep dm-ports running instead (README, "In The Isolated Dev Machine").
//
// Covered here because only a real database can show it:
// - every editable text field in the Data Studio plan agrees with its real
//   column, and before 033 exactly the required fields defaulting to '' did not;
// - 033 drops defaults and nothing else: no row changes, and applying it
//   again changes nothing;
// - a write without a required value is refused as missing, and blank text is
//   still refused by the not-blank checks;
// - an optional field takes '', which Data Studio now saves when one is emptied.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDatabaseClient } from '@greenpill-network/agent/db';
import {
  DIRECTUS_STUDIO_OPTIONAL_COLLECTIONS,
  buildDirectusStudioMetadataPlan,
  textFieldStorageProblems,
  type TextFieldColumn,
} from './directus-studio-setup.ts';

const DEFAULT_DATABASE_URL = 'postgres://greenpill:greenpill@localhost:3304/greenpill_network';
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);
const TEXT_FIELD_MIGRATION = '033_required_text_fields_without_blank_default.sql';

const migrationsDir = resolve(dirname(fileURLToPath(import.meta.url)), '../packages/agent/migrations');
const serverUrl = new URL(process.env.DATABASE_URL?.trim() || DEFAULT_DATABASE_URL);
if (!LOCAL_HOSTS.has(serverUrl.hostname)) {
  // The proof creates and drops a database.
  throw new Error(`Refusing to run against ${serverUrl.hostname}: this proof only runs on a local Postgres server.`);
}

const scratchName = `text_field_proof_${randomUUID().slice(0, 8)}`;
const scratchUrl = new URL(serverUrl);
scratchUrl.pathname = `/${scratchName}`;
// postgres.js lets a `database` query parameter override the path.
scratchUrl.searchParams.delete('database');

type Row = Record<string, any>;
type Sql = NonNullable<ReturnType<typeof createDatabaseClient>>;

function connect(url: URL): Sql {
  const client = createDatabaseClient({ url: url.href, max: 1 });
  if (!client) throw new Error('Could not create the text field proof database client.');
  return client;
}

let sql: Sql | null = null;
// Cleanup drops only a database this run created, never one that happened to
// have the same name.
let created = false;
const server = connect(serverUrl);

// The default the way Directus reports it in a field's schema: a text literal
// becomes its text, any other expression is a real value.
function columnDefault(expression: string | null): unknown {
  if (expression === null) return null;
  const literal = /^'((?:[^']|'')*)'::(?:text|character varying)$/.exec(expression);
  return literal ? literal[1].replaceAll("''", "'") : expression;
}

async function columns(): Promise<Map<string, TextFieldColumn>> {
  const rows = await sql!`
    select table_name, column_name, data_type, is_nullable, column_default
    from information_schema.columns
    where table_schema in ('content', 'intake', 'impact')
  `;
  return new Map(rows.map((row) => [
    `${row.table_name}.${row.column_name}`,
    {
      data_type: row.data_type,
      is_nullable: row.is_nullable === 'YES',
      default_value: columnDefault(row.column_default),
    },
  ]));
}

const plan = buildDirectusStudioMetadataPlan(undefined, undefined, undefined, undefined, [...DIRECTUS_STUDIO_OPTIONAL_COLLECTIONS]);

// Every planned field that disagrees with its column, as `collection.field`.
async function fieldsBreakingTheRule(): Promise<string[]> {
  const columnByField = await columns();
  const breaking: string[] = [];
  for (const { collection, field, meta } of plan.fields) {
    const special = Array.isArray(meta.special) ? meta.special : [];
    if (special.includes('o2m') || special.includes('alias')) continue;
    const column = columnByField.get(`${collection}.${field}`);
    assert.ok(column, `Data Studio metadata names ${collection}.${field}, which has no column`);
    if (textFieldStorageProblems(meta, column).length > 0) breaking.push(`${collection}.${field}`);
  }
  return breaking.sort();
}

// The Postgres error code a write is refused with, or null when it succeeds.
async function refusal(write: () => PromiseLike<unknown>): Promise<string | null> {
  try {
    await write();
    return null;
  } catch (error) {
    return (error as { code?: string }).code ?? String(error);
  }
}

const NOT_NULL = '23502';
const FOREIGN_KEY = '23503';
const CHECK = '23514';

// Sets only the named columns, the way Directus creates an item: a field
// nobody touched is not sent at all.
const insertRequest = (fields: Row) => sql!`
  insert into content.chapter_update_requests ${sql!({ chapter_slug: 'proof', ...fields })}
  returning id
`;
const insertLink = (requestId: string, fields: Row) => sql!`
  insert into content.chapter_update_request_links ${sql!({ update_request_id: requestId, ...fields })}
  returning id, chapter_slug
`;
const insertProofSignal = (requestId: string, fields: Row) => sql!`
  insert into content.chapter_update_request_proof_signals ${sql!({ update_request_id: requestId, ...fields })}
  returning id
`;
const insertInitiative = (fields: Row) => sql!`insert into content.chapter_initiatives ${sql!(fields)}`;
const insertProject = (fields: Row) => sql!`insert into content.projects ${sql!(fields)}`;

const digest = async () => (await sql!`
  select md5(string_agg(row_digest, '' order by row_digest)) as digest
  from (
    select md5(to_jsonb(r)::text) as row_digest from content.chapter_update_requests r
    union all select md5(to_jsonb(l)::text) from content.chapter_update_request_links l
    union all select md5(to_jsonb(p)::text) from content.chapter_update_request_proof_signals p
    union all select md5(to_jsonb(i)::text) from content.chapter_initiatives i
    union all select md5(to_jsonb(g)::text) from content.projects g
    union all select md5(to_jsonb(c)::text) from content.review_notifications c
  ) rows
`)[0].digest as string;

try {
  await server.unsafe(`create database ${scratchName}`);
  created = true;
  sql = connect(scratchUrl);
  // Nothing is written until the connection is known to be the scratch database.
  const [connected] = await sql`select current_database() as name`;
  assert.equal(connected.name, scratchName, 'the proof is not connected to its scratch database');
  // Migrations announce every "does not exist, skipping"; keep the output to the result.
  await sql`set client_min_messages = warning`;

  // Production has Directus tables, so the migrations tie uploads and steward
  // assignments to them there. Give the scratch database the same links.
  await sql`create table public.directus_files (id uuid primary key)`;
  await sql`create table public.directus_users (id uuid primary key)`;

  const migrations = (await readdir(migrationsDir)).filter((file) => file.endsWith('.sql')).sort((a, b) => a.localeCompare(b));
  assert.ok(migrations.includes(TEXT_FIELD_MIGRATION));
  const readMigration = (file: string) => readFile(resolve(migrationsDir, file), 'utf8');
  const textFieldMigration = await readMigration(TEXT_FIELD_MIGRATION);
  for (const file of migrations.filter((name) => name < TEXT_FIELD_MIGRATION)) {
    await sql.unsafe(await readMigration(file));
  }

  // --- Before 033 -------------------------------------------------------------
  // Rows shaped like production: a request with its child rows, an initiative,
  // and a project.
  await sql`insert into content.chapters ${sql({ slug: 'proof', name: 'Proof chapter' })}`;
  await sql`insert into content.guilds ${sql({ slug: 'proof-guild', name: 'Proof guild' })}`;
  const [request] = await insertRequest({ title: 'Existing request', summary: 'Already saved.', proposed_summary: 'Kept.' });
  await insertLink(request.id, { label: 'Existing link', url: 'https://example.test/link' });
  await insertProofSignal(request.id, { label: 'Existing signal', value: '1' });
  await insertInitiative({ slug: 'existing-initiative', chapter_slug: 'proof', title: 'Existing initiative' });
  await insertProject({ slug: 'existing-project', guild_slug: 'proof-guild', name: 'Existing project' });

  // The metadata asks for these fields, but their columns default to '', so
  // Data Studio let them through untouched. Nothing else disagrees.
  const requiredWithBlankDefault = [
    'chapter_initiatives.chapter_slug',
    'chapter_update_request_links.label',
    'chapter_update_request_links.url',
    'chapter_update_request_proof_signals.label',
    'chapter_update_request_proof_signals.value',
    'chapter_update_requests.summary',
    'chapter_update_requests.title',
    'projects.guild_slug',
  ];
  assert.deepEqual(await fieldsBreakingTheRule(), requiredWithBlankDefault);

  // The defect at the database: an untouched title arrived as '' and met the
  // not-blank check, which stewards see only as "An unexpected error occurred."
  assert.equal(await refusal(() => insertRequest({ summary: 'No title.' })), CHECK);
  assert.equal(await refusal(() => insertLink(request.id, { url: 'https://example.test/no-label' })), CHECK);
  // An untouched chapter arrived as '' and met the foreign key.
  assert.equal(await refusal(() => insertInitiative({ slug: 'no-chapter', title: 'No chapter' })), FOREIGN_KEY);

  // --- 033 --------------------------------------------------------------------
  const beforeMigration = await digest();
  await sql.unsafe(textFieldMigration);
  // Defaults only: no row changes, updated_at included, and no review email queued.
  assert.equal(await digest(), beforeMigration);
  // Applying it again changes nothing at all.
  await sql.unsafe(textFieldMigration);
  assert.equal(await digest(), beforeMigration);

  // Every editable text field now agrees with its column.
  assert.deepEqual(await fieldsBreakingTheRule(), []);

  for (const migration of migrations.filter((name) => name > TEXT_FIELD_MIGRATION)) {
    await sql.unsafe(await readMigration(migration));
  }

  // --- Required fields ------------------------------------------------------------
  // A required value that was never sent is refused as missing. Directus checks
  // the same thing before it writes, so callers get a readable message.
  assert.equal(await refusal(() => insertRequest({ summary: 'No title.' })), NOT_NULL);
  assert.equal(await refusal(() => insertRequest({ title: 'No summary.' })), NOT_NULL);
  assert.equal(await refusal(() => insertLink(request.id, { url: 'https://example.test/no-label' })), NOT_NULL);
  assert.equal(await refusal(() => insertLink(request.id, { label: 'No URL' })), NOT_NULL);
  assert.equal(await refusal(() => insertProofSignal(request.id, { value: '2' })), NOT_NULL);
  assert.equal(await refusal(() => insertProofSignal(request.id, { label: 'No value' })), NOT_NULL);
  assert.equal(await refusal(() => insertInitiative({ slug: 'no-chapter', title: 'No chapter' })), NOT_NULL);
  assert.equal(await refusal(() => insertProject({ slug: 'no-guild', name: 'No guild' })), NOT_NULL);

  // Blank text is still refused by the not-blank checks, for writers outside Directus.
  assert.equal(await refusal(() => insertRequest({ title: '', summary: 'Blank title.' })), CHECK);
  assert.equal(await refusal(() => insertRequest({ title: '   ', summary: 'Spaces only.' })), CHECK);
  assert.equal(await refusal(() => insertLink(request.id, { label: 'Blank URL', url: '' })), CHECK);
  assert.equal(await refusal(() => insertProofSignal(request.id, { label: 'Blank value', value: ' ' })), CHECK);
  assert.equal(await refusal(() => sql!`update content.chapter_update_requests set summary = '' where id = ${request.id}::uuid`), CHECK);

  // Filled-in rows still save.
  const [complete] = await insertRequest({ title: 'Complete request', summary: 'Everything filled in.' });
  const [link] = await insertLink(complete.id, { label: 'Chapter website', url: 'https://example.test' });
  // A child row's chapter still comes from its parent request: its '' default
  // stays for the database to fill.
  assert.equal(link.chapter_slug, 'proof');
  assert.equal(await refusal(() => insertProofSignal(complete.id, { label: 'Members', value: '25' })), null);
  assert.equal(await refusal(() => insertInitiative({ slug: 'new-initiative', chapter_slug: 'proof', title: 'New initiative' })), null);
  assert.equal(await refusal(() => insertProject({ slug: 'new-project', guild_slug: 'proof-guild', name: 'New project' })), null);

  // --- Optional fields ------------------------------------------------------------
  // An emptied optional field now arrives as '', and its column takes it.
  const emptied = await refusal(() => sql!`
    update content.chapter_update_requests
    set proposed_summary = '', proposed_primary_link = '', proposed_image = '', reviewer_notes = '', reviewed_by = ''
    where id = ${request.id}::uuid
  `);
  assert.equal(emptied, null);
  const [emptiedRequest] = await sql`
    select proposed_summary, proposed_primary_link, proposed_image, reviewer_notes, reviewed_by
    from content.chapter_update_requests
    where id = ${request.id}::uuid
  `;
  assert.deepEqual(Object.values(emptiedRequest), ['', '', '', '', '']);
  assert.equal(await refusal(() => sql!`
    update content.chapter_update_request_links
    set subtext = '', handle = '', action = '', icon = '', kind = ''
    where id = ${link.id}::uuid
  `), null);
  assert.equal(await refusal(() => sql!`
    update content.chapters
    set city = '', country = '', region = '', summary = '', intro_quote = '', intro_quote_attribution = '', founded = '', primary_link = ''
    where slug = 'proof'
  `), null);

  console.log('Text field database proof passed.');
} finally {
  await sql?.end({ timeout: 3 }).catch(() => {});
  if (created) {
    await server.unsafe(`drop database if exists ${scratchName}`).catch((error) => {
      console.error(`Could not drop scratch database ${scratchName}: ${String(error).slice(0, 160)}`);
    });
  }
  await server.end({ timeout: 3 }).catch(() => {});
}
