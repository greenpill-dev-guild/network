// Database proof for the map node approval guard, migration 032 (PRD-1417).
//
// It builds a scratch database on the local Postgres server, applies every
// migration to it, and drops it again. The dev database is never written to.
//
//   bun run db:local:up
//   bun run test:map-node-approval-guard:db
//
// In the isolated dev machine there is no Docker: start Postgres on the Mac
// and keep dm-ports running instead (README, "In The Isolated Dev Machine").
//
// Covered here because only a real database can show it:
// - approving a node at 0,0 fails with a readable error, while declining or
//   archiving it works;
// - an owner update request that would move a node to 0,0 fails and stays
//   pending, including one that changes only the latitude;
// - an edge point (latitude ±90, longitude ±180) approves;
// - (0.0000001, 0) is stored as 0,0 and refused;
// - a normal approval and a normal update request still work;
// - rows saved before the guard keep working for other edits, and a revert of
//   the PRD-1409 repair that would put an approved node back at 0,0 fails as a
//   whole and changes nothing.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDatabaseClient } from '@greenpill-network/agent/db';

const DEFAULT_DATABASE_URL = 'postgres://greenpill:greenpill@localhost:3304/greenpill_network';
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);
const GUARD_MIGRATION = '032_map_node_approval_guard.sql';

const migrationsDir = resolve(dirname(fileURLToPath(import.meta.url)), '../packages/agent/migrations');
const serverUrl = new URL(process.env.DATABASE_URL?.trim() || DEFAULT_DATABASE_URL);
if (!LOCAL_HOSTS.has(serverUrl.hostname)) {
  // The proof creates and drops a database and writes approved map nodes.
  throw new Error(`Refusing to run against ${serverUrl.hostname}: this proof only runs on a local Postgres server.`);
}

const scratchName = `map_node_approval_proof_${randomUUID().slice(0, 8)}`;
const scratchUrl = new URL(serverUrl);
scratchUrl.pathname = `/${scratchName}`;

type Row = Record<string, any>;
type Sql = NonNullable<ReturnType<typeof createDatabaseClient>>;
type Problem = 'missing' | 'latitude_out_of_range' | 'longitude_out_of_range' | 'null_island';

// The reason each refusal gives, in the order the migration checks them.
const REASONS: Record<Problem, string> = {
  missing: 'it has no saved latitude and longitude',
  latitude_out_of_range: 'its saved latitude is outside -90 to 90',
  longitude_out_of_range: 'its saved longitude is outside -180 to 180',
  null_island: 'its saved point is latitude 0, longitude 0, a placeholder rather than a place',
};

function connect(url: URL): Sql {
  const client = createDatabaseClient({ url: url.href, max: 1 });
  if (!client) throw new Error('Could not create the approval guard proof database client.');
  return client;
}

let sql: Sql | null = null;
const server = connect(serverUrl);

// A submission as the agent, or the June 2026 client, wrote it: pending and at
// a real place unless the caller says otherwise.
async function insertNode(fields: Row = {}): Promise<string> {
  const [row] = await sql!`
    insert into intake.map_node_submissions ${sql!({
      display_name: 'Approval guard proof',
      place_name: 'Awka',
      latitude: 6.218947,
      longitude: 7.077437,
      ...fields,
    })}
    returning id::text
  `;
  return row.id;
}

// Sets only the named columns, the way Directus writes a partial edit.
function editNode(id: string, fields: Row) {
  return sql!`update intake.map_node_submissions set ${sql!(fields)} where id = ${id}::uuid`;
}

// updated_at is read as text so a comparison sees its microseconds.
async function nodeRow(id: string): Promise<Row> {
  const [row] = await sql!`
    select
      status::text as status,
      latitude::text as latitude,
      longitude::text as longitude,
      public_note,
      approved_at,
      updated_at::text as updated_at
    from intake.map_node_submissions
    where id = ${id}::uuid
  `;
  return { ...row };
}

// Status and stored point, as the database holds them.
async function state(id: string): Promise<[string, string, string]> {
  const row = await nodeRow(id);
  return [row.status, row.latitude, row.longitude];
}

// An owner update request as the agent records it: only the fields the owner
// changed are named in proposed_public_fields, and the request is tied to the
// node's updated_at at the time (read in SQL to keep its microseconds).
async function insertUpdateRequest(nodeId: string, proposal: { latitude?: number; longitude?: number; display_name?: string }): Promise<string> {
  const [row] = await sql!`
    insert into intake.map_node_update_requests (
      submission_id,
      current_submission_updated_at,
      proposed_public_fields,
      proposed_latitude,
      proposed_longitude,
      proposed_display_name
    )
    select
      submission.id,
      submission.updated_at,
      ${sql!.json(proposal)},
      ${proposal.latitude ?? null}::numeric,
      ${proposal.longitude ?? null}::numeric,
      ${proposal.display_name ?? null}::text
    from intake.map_node_submissions submission
    where submission.id = ${nodeId}::uuid
    returning id::text
  `;
  return row.id;
}

function setRequestStatus(id: string, status: string) {
  return sql!`update intake.map_node_update_requests set status = ${status} where id = ${id}::uuid`;
}

async function requestRow(id: string): Promise<Row> {
  const [row] = await sql!`
    select status::text as status, reviewed_at from intake.map_node_update_requests where id = ${id}::uuid
  `;
  return { status: row.status, reviewed_at: row.reviewed_at };
}

async function assertRefused(write: () => PromiseLike<unknown>, nodeId: string, problem: Problem, label: string) {
  let refusal: Row | null = null;
  try {
    await write();
  } catch (error) {
    refusal = error as Row;
  }
  assert.ok(refusal, `${label}: the approval guard let this write through`);
  assert.equal(refusal.code, '23514', `${label}: ${refusal.message}`);
  assert.equal(refusal.detail, `map_node_invalid_coordinates: ${problem}`, label);
  assert.equal(refusal.message, `Map node ${nodeId} can't be approved: ${REASONS[problem]}, so the public map can't show it.`, label);
  assert.equal(
    refusal.hint,
    'Decline or archive the node, or correct its location before approving it. If an owner update request would move it there, decline the request.',
    label
  );
}

const digest = async (query: PromiseLike<readonly Row[]>) => (await query)[0].digest as string;
const everySubmission = () => digest(sql!`
  select md5(string_agg(md5(to_jsonb(s)::text), '' order by s.id)) as digest
  from intake.map_node_submissions s
`);
const submissionConstraints = async () => (await sql!`
  select conname::text, pg_get_constraintdef(oid) as definition
  from pg_constraint
  where conrelid = 'intake.map_node_submissions'::regclass
  order by conname
`).map((row) => `${row.conname}: ${row.definition}`);
const guardTriggers = async () => (await sql!`
  select pg_get_triggerdef(oid) as definition
  from pg_trigger
  where tgrelid = 'intake.map_node_submissions'::regclass
    and tgname = 'map_node_submissions_approval_guard'
`).map((row) => row.definition as string);

try {
  await server.unsafe(`create database ${scratchName}`);
  sql = connect(scratchUrl);
  // Migrations announce every "does not exist, skipping"; keep the output to the result.
  await sql`set client_min_messages = warning`;

  const migrations = (await readdir(migrationsDir)).filter((file) => file.endsWith('.sql')).sort((a, b) => a.localeCompare(b));
  assert.ok(migrations.includes(GUARD_MIGRATION));
  const readMigration = (file: string) => readFile(resolve(migrationsDir, file), 'utf8');
  const guardMigration = await readMigration(GUARD_MIGRATION);
  for (const file of migrations.filter((name) => name < GUARD_MIGRATION)) {
    await sql.unsafe(await readMigration(file));
  }

  // --- Rows saved before the guard ------------------------------------------
  // Until now an approved node at 0,0 could be saved, as the June 2026 client
  // did for two nodes PRD-1409 later repaired.
  const legacyHidden = await insertNode({ status: 'approved', latitude: 0, longitude: 0, place_name: 'Port Harcourt' });
  // The PRD-1409 repair: two approved nodes moved, one off 0,0 and one off the
  // top edge, recorded in one run so either runner's --revert can undo it.
  const repairRun = randomUUID();
  const repairedFromZero = await insertNode({ status: 'approved', latitude: 51.924442, longitude: 4.47775, place_name: 'Rotterdam, Netherlands' });
  const repairedFromEdge = await insertNode({ status: 'approved', latitude: 27.756767, longitude: -81.463984, place_name: 'Florida' });
  for (const [id, place, previous, next] of [
    [repairedFromZero, 'Rotterdam, Netherlands', [0, 0], [51.924442, 4.47775]],
    [repairedFromEdge, 'Florida', [90, 97.76261], [27.756767, -81.463984]],
  ] as const) {
    await sql`
      insert into intake.map_node_location_repairs (
        run_id, submission_id,
        previous_place_name, previous_latitude, previous_longitude,
        next_place_name, next_latitude, next_longitude,
        provider, provider_place_id, repair_rule
      )
      values (
        ${repairRun}::uuid, ${id}::uuid,
        ${place}, ${previous[0]}, ${previous[1]},
        ${place}, ${next[0]}, ${next[1]},
        'nominatim', 'proof', 'prd-1409-approved-change-set'
      )
    `;
  }

  const constraintsBefore = await submissionConstraints();
  const rowsBefore = await everySubmission();
  await sql.unsafe(guardMigration);

  // The guard is a trigger, not a constraint, and it rewrites no stored row.
  assert.deepEqual(await submissionConstraints(), constraintsBefore, 'the guard added or changed a constraint');
  assert.equal(await everySubmission(), rowsBefore, 'applying the guard changed a stored row');
  assert.deepEqual(await guardTriggers(), [
    'CREATE TRIGGER map_node_submissions_approval_guard BEFORE INSERT OR UPDATE OF status, latitude, longitude ON intake.map_node_submissions FOR EACH ROW EXECUTE FUNCTION intake.map_node_approval_guard()',
  ]);

  // An old approved row at 0,0 stays as it was. Edits that name none of
  // status, latitude or longitude still work, such as scrubbing private data.
  await editNode(legacyHidden, { public_note: 'Edited after the guard.' });
  await editNode(legacyHidden, { raw_note: null, ip_address: null, user_agent: null });
  assert.equal((await nodeRow(legacyHidden)).public_note, 'Edited after the guard.');
  // Saving it as approved again is refused; archiving it works.
  await assertRefused(() => editNode(legacyHidden, { status: 'approved' }), legacyHidden, 'null_island', 're-approving an old 0,0 row');
  await editNode(legacyHidden, { status: 'archived' });
  assert.equal((await nodeRow(legacyHidden)).status, 'archived');

  // Reverting the repair would put an approved node back at 0,0. Both revert
  // runners restore a run in one statement, so the whole revert fails and
  // neither row moves.
  const revertRepairRun = () => sql!`
    with reverted as (
      update intake.map_node_submissions submission
      set latitude = repair.previous_latitude, longitude = repair.previous_longitude, updated_at = now()
      from intake.map_node_location_repairs repair
      where repair.run_id = ${repairRun}::uuid
        and repair.reverted_at is null
        and submission.id = repair.submission_id
        and submission.latitude = repair.next_latitude
        and submission.longitude = repair.next_longitude
      returning repair.id
    )
    update intake.map_node_location_repairs repair
    set reverted_at = now()
    from reverted
    where repair.id = reverted.id
    returning repair.id::text
  `;
  await assertRefused(revertRepairRun, repairedFromZero, 'null_island', 'reverting the repair of an approved 0,0 node');
  assert.deepEqual(await state(repairedFromZero), ['approved', '51.924442', '4.477750']);
  assert.deepEqual(await state(repairedFromEdge), ['approved', '27.756767', '-81.463984']);
  const [unreverted] = await sql`
    select count(*)::int as count
    from intake.map_node_location_repairs
    where run_id = ${repairRun}::uuid and reverted_at is null
  `;
  assert.equal(unreverted.count, 2);
  // Archiving that node first lets the same revert run. An approved node at
  // 0,0 was hidden from the public map anyway, and the edge point comes back.
  await editNode(repairedFromZero, { status: 'archived' });
  assert.equal((await revertRepairRun()).length, 2);
  assert.deepEqual(await state(repairedFromZero), ['archived', '0.000000', '0.000000']);
  assert.deepEqual(await state(repairedFromEdge), ['approved', '90.000000', '97.762610']);

  // --- Approving a pending node ----------------------------------------------
  // At 0,0: refused with a readable error, and the node stays pending.
  const pendingAtZero = await insertNode({ latitude: 0, longitude: 0, place_name: 'Rotterdam, Netherlands' });
  await assertRefused(() => editNode(pendingAtZero, { status: 'approved' }), pendingAtZero, 'null_island', 'approving at 0,0');
  assert.deepEqual(await state(pendingAtZero), ['pending', '0.000000', '0.000000']);
  assert.equal((await nodeRow(pendingAtZero)).approved_at, null);
  // Declining it works, and so does archiving it afterwards.
  await editNode(pendingAtZero, { status: 'rejected' });
  assert.equal((await nodeRow(pendingAtZero)).status, 'rejected');
  await editNode(pendingAtZero, { status: 'archived' });
  assert.equal((await nodeRow(pendingAtZero)).status, 'archived');
  // Archiving a pending 0,0 node directly works too.
  const archivedAtZero = await insertNode({ latitude: 0, longitude: 0 });
  await editNode(archivedAtZero, { status: 'archived' });
  assert.equal((await nodeRow(archivedAtZero)).status, 'archived');

  // PostgreSQL stores six decimals, so (0.0000001, 0) is saved as 0,0. The
  // guard sees the stored value and refuses it.
  const roundsToZero = await insertNode({ latitude: 0.0000001, longitude: 0 });
  assert.deepEqual(await state(roundsToZero), ['pending', '0.000000', '0.000000']);
  await assertRefused(() => editNode(roundsToZero, { status: 'approved' }), roundsToZero, 'null_island', 'approving (0.0000001, 0)');
  assert.equal((await nodeRow(roundsToZero)).status, 'pending');

  // A correction to a real place, then approval, works.
  await editNode(roundsToZero, { latitude: 4.767658, longitude: 7.018853 });
  await editNode(roundsToZero, { status: 'approved' });
  assert.deepEqual(await state(roundsToZero), ['approved', '4.767658', '7.018853']);

  // Edge points approve: a confirmed place can sit on the 180th meridian or a
  // pole, and the database can't tell one from a clamped pin.
  for (const [latitude, longitude] of [[-16.8, 180], [56.462976, -180], [90, 97.76261], [-90, 0]]) {
    const edge = await insertNode({ latitude, longitude });
    await editNode(edge, { status: 'approved' });
    assert.equal((await nodeRow(edge)).status, 'approved', `edge point ${latitude}, ${longitude} should approve`);
  }
  // 90.0000004 is stored as 90, an edge point, as the shared rule judges it.
  const roundsToEdge = await insertNode({ status: 'approved', latitude: 90.0000004, longitude: 10 });
  assert.deepEqual(await state(roundsToEdge), ['approved', '90.000000', '10.000000']);

  // A normal approval works and records when it happened.
  const normal = await insertNode({ latitude: 6.218947, longitude: 7.077437 });
  await editNode(normal, { status: 'approved' });
  const approved = await nodeRow(normal);
  assert.equal(approved.status, 'approved');
  assert.ok(approved.approved_at instanceof Date);

  // --- Saving an approved node directly ---------------------------------------
  // Live onboarding and admin edits insert approved rows. Every problem the
  // shared rule names is refused with the guard's own message, before the
  // column checks from migrations 001 and 018 would refuse the row less clearly.
  const refusedInserts: Array<[Problem, Row]> = [
    ['missing', { latitude: null, longitude: 10 }],
    ['missing', { latitude: 10, longitude: 'NaN' }],
    ['latitude_out_of_range', { latitude: 90.000001, longitude: 10 }],
    ['latitude_out_of_range', { latitude: -95, longitude: 10 }],
    ['longitude_out_of_range', { latitude: 10, longitude: 181 }],
    ['null_island', { latitude: 0, longitude: 0 }],
    ['null_island', { latitude: 0, longitude: -0.0000004 }],
  ];
  for (const [problem, point] of refusedInserts) {
    const id = randomUUID();
    await assertRefused(
      () => sql!`insert into intake.map_node_submissions ${sql!({ id, status: 'approved', display_name: 'Refused', place_name: 'Nowhere', ...point })}`,
      id,
      problem,
      `inserting an approved node at ${JSON.stringify(point)}`
    );
  }
  // Pending rows may still hold 0,0, as the June 2026 client wrote them.
  await insertNode({ latitude: 0, longitude: 0 });

  // --- Owner update requests ---------------------------------------------------
  // A request that moves an approved node to 0,0 fails, and stays pending.
  const movedToZero = await insertNode({ status: 'approved', latitude: 6.5244, longitude: 3.3792, place_name: 'Lagos' });
  const moveRequest = await insertUpdateRequest(movedToZero, { latitude: 0, longitude: 0 });
  const beforeMove = await nodeRow(movedToZero);
  await assertRefused(() => setRequestStatus(moveRequest, 'approved'), movedToZero, 'null_island', 'approving a request that moves a node to 0,0');
  assert.deepEqual(await requestRow(moveRequest), { status: 'pending', reviewed_at: null });
  assert.deepEqual(await nodeRow(movedToZero), beforeMove);
  // The steward can still decline it.
  await setRequestStatus(moveRequest, 'rejected');
  assert.equal((await requestRow(moveRequest)).status, 'rejected');

  // So does a request that changes only the latitude of a node on the prime
  // meridian: the node it would leave is at 0,0.
  const onMeridian = await insertNode({ status: 'approved', latitude: 9.4, longitude: 0, place_name: 'Prime meridian proof' });
  const latitudeRequest = await insertUpdateRequest(onMeridian, { latitude: 0 });
  const beforeLatitude = await nodeRow(onMeridian);
  await assertRefused(() => setRequestStatus(latitudeRequest, 'approved'), onMeridian, 'null_island', 'approving a latitude-only move to 0,0');
  assert.deepEqual(await requestRow(latitudeRequest), { status: 'pending', reviewed_at: null });
  assert.deepEqual(await nodeRow(onMeridian), beforeLatitude);

  // A request that moves a node to a real place, or only renames it, applies.
  const movedToPlace = await insertNode({ status: 'approved', latitude: 6.5244, longitude: 3.3792 });
  const placeRequest = await insertUpdateRequest(movedToPlace, { latitude: 51.924442, longitude: 4.47775 });
  await setRequestStatus(placeRequest, 'approved');
  assert.equal((await requestRow(placeRequest)).status, 'approved');
  assert.deepEqual(await state(movedToPlace), ['approved', '51.924442', '4.477750']);
  const renamed = await insertNode({ status: 'approved', latitude: -16.8, longitude: 180 });
  const renameRequest = await insertUpdateRequest(renamed, { display_name: 'Renamed proof node' });
  await setRequestStatus(renameRequest, 'approved');
  assert.equal((await requestRow(renameRequest)).status, 'approved');

  // --- Applying it again -------------------------------------------------------
  const settled = await everySubmission();
  await sql.unsafe(guardMigration);
  assert.equal(await everySubmission(), settled, 'replaying the guard changed a stored row');
  assert.equal((await guardTriggers()).length, 1);
  const afterReplay = await insertNode({ latitude: 0, longitude: 0 });
  await assertRefused(() => editNode(afterReplay, { status: 'approved' }), afterReplay, 'null_island', 'approving at 0,0 after a replay');

  console.log('Map node approval guard database proof passed.');
} finally {
  await sql?.end({ timeout: 3 }).catch(() => {});
  await server.unsafe(`drop database if exists ${scratchName}`).catch((error) => {
    console.error(`Could not drop scratch database ${scratchName}: ${String(error).slice(0, 160)}`);
  });
  await server.end({ timeout: 3 }).catch(() => {});
}
