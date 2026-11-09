// Database proof for migration 034 (PRD-1443): change-request links and proof
// signals stay on their request's chapter, and a decided request takes no new
// ones.
//
// It builds a scratch database on the local Postgres server, applies every
// migration to it, and drops it again. The dev database is never written to.
//
//   bun run db:local:up
//   bun run test:update-request-children:db
//
// In the isolated dev machine there is no Docker: start Postgres on the Mac
// and keep dm-ports running instead (README, "In The Isolated Dev Machine").
//
// Covered here because only a real database can show it:
// - a link or proof signal on a draft, pending or needs-changes request is
//   stored, with chapter_slug filled from the request when the writer sent
//   none (as Data Studio's request form does) and kept when it matches;
// - one that names another chapter is refused by the foreign key instead of
//   being moved onto the request's chapter, and nothing is stored;
// - one on an accepted, declined or archived request is refused with a
//   readable reason, and nothing is stored;
// - rows a request already holds stay when it is decided, and can then no
//   longer be edited or deleted, while deleting the whole request still
//   removes them;
// - a row moved to another request is checked the same way, and an edit that
//   resends the row's own request is not a move;
// - an insert, edit or delete and a decision on the same request wait for each
//   other, so an acceptance applies the rows as they finally stand.
//
// Which chapters a steward may attach rows to is a Directus rule, proven by
// `bun run directus:steward:smoke`, not here.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDatabaseClient } from '@greenpill-network/agent/db';

const DEFAULT_DATABASE_URL = 'postgres://greenpill:greenpill@localhost:3304/greenpill_network';
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);
const GUARD_MIGRATION = '034_chapter_update_request_child_rows_guard.sql';
const OPEN_STATUSES = ['draft', 'pending_review', 'needs_changes'];
const DECIDED_STATUSES = ['accepted', 'declined', 'archived'];

const migrationsDir = resolve(dirname(fileURLToPath(import.meta.url)), '../packages/agent/migrations');
const serverUrl = new URL(process.env.DATABASE_URL?.trim() || DEFAULT_DATABASE_URL);
if (!LOCAL_HOSTS.has(serverUrl.hostname)) {
  // The proof creates and drops a database.
  throw new Error(`Refusing to run against ${serverUrl.hostname}: this proof only runs on a local Postgres server.`);
}

const scratchName = `update_request_children_proof_${randomUUID().slice(0, 8)}`;
const scratchUrl = new URL(serverUrl);
scratchUrl.pathname = `/${scratchName}`;
// postgres.js lets a `database` query parameter override the path.
scratchUrl.searchParams.delete('database');

type Sql = NonNullable<ReturnType<typeof createDatabaseClient>>;

function connect(url: URL): Sql {
  const client = createDatabaseClient({ url: url.href, max: 1 });
  if (!client) throw new Error('Could not create the update request children proof database client.');
  return client;
}

let sql: Sql | null = null;
// A second session on the scratch database, for the race between an insert
// and a decision.
let other: Sql | null = null;
// Set once this run has created the scratch database; nothing else is dropped.
let created = false;
const server = connect(serverUrl);

async function insertRequest(chapter: string, status: string): Promise<string> {
  const [request] = await sql!`
    insert into content.chapter_update_requests ${sql!({
      chapter_slug: chapter,
      title: `Proof request (${status})`,
      summary: 'Update request children proof.',
      request_status: status,
    })}
    returning id::text
  `;
  return request.id;
}

// A link as the request form writes it (no chapter_slug), or naming a chapter.
const insertLink = (requestId: string, chapter?: string) => sql!`
  insert into content.chapter_update_request_links ${sql!({
    update_request_id: requestId,
    ...(chapter === undefined ? {} : { chapter_slug: chapter }),
    label: 'Proof link',
    url: 'https://example.test/proof',
  })}
`;
const insertProofSignal = (requestId: string, chapter?: string) => sql!`
  insert into content.chapter_update_request_proof_signals ${sql!({
    update_request_id: requestId,
    ...(chapter === undefined ? {} : { chapter_slug: chapter }),
    label: 'Proof signal',
    value: '1',
  })}
`;

async function childRows(requestId: string) {
  return sql!`
    select 'link' as kind, chapter_slug from content.chapter_update_request_links where update_request_id = ${requestId}
    union all
    select 'proof_signal', chapter_slug from content.chapter_update_request_proof_signals where update_request_id = ${requestId}
    order by kind
  `;
}

const decidedRefusal = (status: string) => (error: any) => {
  assert.equal(error?.code, '23514', `expected a check_violation, got ${error?.code}: ${error?.message}`);
  assert.match(error.message, new RegExp(`^chapter_update_request_decided: change request [0-9a-f-]+ is ${status}, so it takes no new rows\\.$`));
  return true;
};
const changeRefusal = (status: string) => (error: any) => {
  assert.equal(error?.code, '23514', `expected a check_violation, got ${error?.code}: ${error?.message}`);
  assert.match(error.message, new RegExp(`^chapter_update_request_decided: change request [0-9a-f-]+ is ${status}, so its rows can no longer change\\.$`));
  return true;
};

try {
  await server.unsafe(`create database ${scratchName}`);
  created = true;
  sql = connect(scratchUrl);
  // Nothing is written until the connection is known to be the scratch database.
  const [connected] = await sql`select current_database() as name`;
  assert.equal(connected.name, scratchName, 'the proof is not connected to its scratch database');
  await sql`set client_min_messages = warning`;
  // Production has Directus tables, and migration 022 ties image_file to them.
  await sql`create table public.directus_files (id uuid primary key)`;

  const migrations = (await readdir(migrationsDir)).filter((file) => file.endsWith('.sql')).sort((a, b) => a.localeCompare(b));
  assert.ok(migrations.includes(GUARD_MIGRATION), `${GUARD_MIGRATION} is missing`);
  for (const file of migrations) await sql.unsafe(await readFile(resolve(migrationsDir, file), 'utf8'));

  for (const slug of ['proof-chapter', 'proof-other']) {
    await sql`insert into content.chapters ${sql({ slug, name: `Proof ${slug}`, publication_status: 'published' })}`;
  }

  // Open requests take rows on the request's chapter: filled when the writer
  // sent none or an empty one, kept when it names the same chapter.
  for (const status of OPEN_STATUSES) {
    const requestId = await insertRequest('proof-chapter', status);
    await insertLink(requestId);
    await insertProofSignal(requestId, '');
    await insertLink(requestId, 'proof-chapter');
    assert.deepEqual(
      (await childRows(requestId)).map((row) => `${row.kind}:${row.chapter_slug}`),
      ['link:proof-chapter', 'link:proof-chapter', 'proof_signal:proof-chapter'],
      `${status} request`
    );
  }

  // A row naming another chapter is refused, not moved onto the request's.
  const foreignKeyRefusal = (error: any) => {
    assert.equal(error?.code, '23503', `expected a foreign_key_violation, got ${error?.code}: ${error?.message}`);
    return true;
  };
  const mismatched = await insertRequest('proof-chapter', 'draft');
  await assert.rejects(insertLink(mismatched, 'proof-other'), foreignKeyRefusal);
  await assert.rejects(insertProofSignal(mismatched, 'proof-other'), foreignKeyRefusal);
  assert.deepEqual(await childRows(mismatched), [], 'mismatched chapter');

  // Decided requests refuse them, and keep none.
  for (const status of DECIDED_STATUSES) {
    const requestId = await insertRequest('proof-chapter', status);
    await assert.rejects(insertLink(requestId), decidedRefusal(status));
    await assert.rejects(insertProofSignal(requestId), decidedRefusal(status));
    assert.deepEqual(await childRows(requestId), [], `${status} request`);
  }

  // A request that is decided later keeps the rows it already has.
  const decidedLater = await insertRequest('proof-chapter', 'draft');
  await insertLink(decidedLater);
  await sql`update content.chapter_update_requests set request_status = 'archived' where id = ${decidedLater}`;
  await assert.rejects(insertProofSignal(decidedLater), decidedRefusal('archived'));
  assert.deepEqual((await childRows(decidedLater)).map((row) => row.kind), ['link']);
  // Its rows are fixed now: neither edited nor deleted.
  await assert.rejects(sql`update content.chapter_update_request_links set label = 'Edited proof link' where update_request_id = ${decidedLater}`, changeRefusal('archived'));
  await assert.rejects(sql`delete from content.chapter_update_request_links where update_request_id = ${decidedLater}`, changeRefusal('archived'));
  assert.deepEqual((await childRows(decidedLater)).map((row) => row.kind), ['link'], 'the archived request kept its row');
  // Deleting the whole request still takes its rows with it.
  await sql`delete from content.chapter_update_requests where id = ${decidedLater}`;
  assert.deepEqual(await childRows(decidedLater), [], 'the deleted request took its rows');

  // A row moved to another request goes through the same checks.
  const moveFrom = await insertRequest('proof-chapter', 'draft');
  const decidedTarget = await insertRequest('proof-chapter', 'archived');
  const otherChapterTarget = await insertRequest('proof-other', 'draft');
  const openTarget = await insertRequest('proof-chapter', 'needs_changes');
  await insertLink(moveFrom);
  const move = (target: string) => sql!`update content.chapter_update_request_links set update_request_id = ${target} where update_request_id = ${moveFrom}`;
  await assert.rejects(move(decidedTarget), decidedRefusal('archived'));
  await assert.rejects(move(otherChapterTarget), foreignKeyRefusal);
  await move(openTarget);
  assert.deepEqual((await childRows(openTarget)).map((row) => `${row.kind}:${row.chapter_slug}`), ['link:proof-chapter'], 'moved between open requests');
  assert.deepEqual(await childRows(decidedTarget), [], 'nothing moved onto the decided request');
  // On an open request, an edit that resends the row's request is not a move.
  await sql`update content.chapter_update_request_links set label = 'Edited proof link', update_request_id = ${openTarget} where update_request_id = ${openTarget}`;

  // An insert and a decision on the same request run one after the other.
  // lock_timeout turns "would wait" into an error the proof can assert.
  other = connect(scratchUrl);
  const lockWait = (error: any) => {
    assert.equal(error?.code, '55P03', `expected a lock_not_available wait, got ${error?.code}: ${error?.message}`);
    return true;
  };
  // An open insert holds the request, so an acceptance waits for it and then
  // applies the row with the rest.
  const insertFirst = await insertRequest('proof-chapter', 'pending_review');
  await sql.begin(async (tx) => {
    await tx`insert into content.chapter_update_request_links ${tx({ update_request_id: insertFirst, label: 'Late link', url: 'https://example.test/late' })}`;
    await assert.rejects(other!.begin(async (otx) => {
      await otx`set local lock_timeout = '500ms'`;
      await otx`update content.chapter_update_requests set request_status = 'accepted' where id = ${insertFirst}`;
    }), lockWait);
  });
  await other`update content.chapter_update_requests set request_status = 'accepted' where id = ${insertFirst}`;
  assert.deepEqual((await childRows(insertFirst)).map((row) => row.kind), ['link'], 'the late link is on the accepted request');
  // An open decision holds the request, so an insert waits for it and is then refused.
  const decisionFirst = await insertRequest('proof-chapter', 'pending_review');
  await other.begin(async (otx) => {
    await otx`update content.chapter_update_requests set request_status = 'declined' where id = ${decisionFirst}`;
    await assert.rejects(sql!.begin(async (tx) => {
      await tx`set local lock_timeout = '500ms'`;
      await tx`insert into content.chapter_update_request_links ${tx({ update_request_id: decisionFirst, label: 'Late link', url: 'https://example.test/late' })}`;
    }), lockWait);
  });
  await assert.rejects(insertLink(decisionFirst), decidedRefusal('declined'));
  assert.deepEqual(await childRows(decisionFirst), [], 'nothing reached the declined request');
  // Edits and deletes hold the request the same way: an acceptance waits for an
  // open edit, and a delete waits for an open acceptance and is then refused.
  const editFirst = await insertRequest('proof-chapter', 'pending_review');
  await insertLink(editFirst);
  await sql.begin(async (tx) => {
    await tx`update content.chapter_update_request_links set label = 'Edited before acceptance' where update_request_id = ${editFirst}`;
    await assert.rejects(other!.begin(async (otx) => {
      await otx`set local lock_timeout = '500ms'`;
      await otx`update content.chapter_update_requests set request_status = 'accepted' where id = ${editFirst}`;
    }), lockWait);
  });
  await other`update content.chapter_update_requests set request_status = 'accepted' where id = ${editFirst}`;
  const deleteAfter = await insertRequest('proof-chapter', 'pending_review');
  await insertLink(deleteAfter);
  await other.begin(async (otx) => {
    await otx`update content.chapter_update_requests set request_status = 'accepted' where id = ${deleteAfter}`;
    await assert.rejects(sql!.begin(async (tx) => {
      await tx`set local lock_timeout = '500ms'`;
      await tx`delete from content.chapter_update_request_links where update_request_id = ${deleteAfter}`;
    }), lockWait);
  });
  await assert.rejects(sql`delete from content.chapter_update_request_links where update_request_id = ${deleteAfter}`, changeRefusal('accepted'));
  assert.deepEqual((await childRows(deleteAfter)).map((row) => row.kind), ['link'], 'the accepted request kept its row');

  console.log('Update request children database proof passed.');
} finally {
  await other?.end({ timeout: 3 }).catch(() => {});
  await sql?.end({ timeout: 3 }).catch(() => {});
  if (created) {
    await server.unsafe(`drop database if exists ${scratchName}`).catch((error) => {
      console.error(`Could not drop scratch database ${scratchName}: ${String(error).slice(0, 160)}`);
    });
  }
  await server.end({ timeout: 3 }).catch(() => {});
}
