// PRD-1409 map-node coordinate repair: the change set in
// ../../handoffs/qa-map-data.md. Run it only after Afo approves that change set
// and after the PR that adds coordinate validation has deployed network-agent.
//
// It runs inside the network-agent machine, which holds DATABASE_URL and the
// Supabase CA (docs: fly-token-and-prod-db-access memory, migrations 028/029):
//
//   fly ssh sftp shell -a network-agent      then: put repair-map-node-coordinates.cjs /tmp/repair-map-node-coordinates.cjs
//   fly ssh console -a network-agent -C "node /tmp/repair-map-node-coordinates.cjs"                    # dry run, writes nothing
//   fly ssh console -a network-agent -C "node /tmp/repair-map-node-coordinates.cjs --apply"            # all or nothing, prints a run id
//   fly ssh console -a network-agent -C "node /tmp/repair-map-node-coordinates.cjs --revert <run-id>"  # undo that run
//
// Only latitude and longitude change. Place text, names and every private
// field stay as they are. Each change is recorded in
// intake.map_node_location_repairs, the audit table PRD-617 added, so
// `bun run db:repair:map-node-locations -- --revert <run-id>` can undo it too.
'use strict';

const { createRequire } = require('node:module');
const { randomUUID } = require('node:crypto');

// /app is the agent image. A local rehearsal passes --require-from <package.json>.
function argumentValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? String(process.argv[index + 1] || '').trim() : '';
}
const postgres = createRequire(argumentValue('--require-from') || '/app/package.json')('postgres');

const RULE = 'prd-1409-approved-change-set';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// from: the stored point on 2026-11-06. to: the OpenStreetMap point for the
// stated place, read from Nominatim (the geocoder the map's place search uses).
const CHANGES = Object.freeze([
  { id: 'f52473d0-4d12-4e4e-a726-0dbb62d870d2', place: 'Florida', from: [90, 97.76261], to: [27.756767, -81.463984], osm: 'relation:162050' },
  { id: '79b7119a-6d6f-4680-9d6d-30fc7b509f43', place: 'Taiwan', from: [90, 176.912492], to: [23.973937, 120.982018], osm: 'relation:449220' },
  { id: '8804877c-508e-446d-bf27-bbb23b76598a', place: 'Awka', from: [56.462976, -180], to: [6.218947, 7.077437], osm: 'node:501540935' },
  { id: '21cb7662-1a87-4922-8373-4376f07a9c7c', place: 'Port Harcourt', from: [0, 0], to: [4.767658, 7.018853], osm: 'relation:3720765' },
  { id: 'fc0cb8bd-7be9-4c48-a1d1-5ed013834e07', place: 'Rotterdam, Netherlands', from: [0, 0], to: [51.924442, 4.47775], osm: 'relation:1411101' },
  { id: '10c4c9cb-baea-4e0b-983c-179c3eb88b1f', place: 'Brooklyn, new york', from: [-22.9068, -43.1729], to: [40.652601, -73.949721], osm: 'relation:9691750' },
  { id: '0a76afe9-f1c1-4032-acf8-cd89f5329209', place: 'Ashkelon, Israel', from: [-22.9068, -43.1729], to: [31.665319, 34.565044], osm: 'relation:1376782' },
  { id: '1cc9c540-9678-4a62-9418-f0bc9431f378', place: 'Ashkelon, Israel', from: [-22.9068, -43.1729], to: [31.665319, 34.565044], osm: 'relation:1376782' },
  { id: '20bb327b-e9ca-4b1d-a1c5-999c57c5ec49', place: 'Campinas', from: [-20.157804, -48.541667], to: [-22.905639, -47.059564], osm: 'relation:5684860' },
]);

const sameNumber = (a, b) => Math.abs(Number(a) - Number(b)) < 0.0000005;

async function dryRun(sql) {
  const rows = await sql`
    select id::text, place_name as "placeName", latitude::float8 as lat, longitude::float8 as long, status::text
    from intake.map_node_submissions
    where id::text in ${sql(CHANGES.map((change) => change.id))}
  `;
  const byId = new Map(rows.map((row) => [row.id, row]));
  const report = CHANGES.map((change) => {
    const row = byId.get(change.id);
    const ready = Boolean(row)
      && row.placeName === change.place
      && sameNumber(row.lat, change.from[0])
      && sameNumber(row.long, change.from[1]);
    return {
      id: change.id,
      place: row ? row.placeName : '(missing)',
      status: row ? row.status : '(missing)',
      current: row ? [row.lat, row.long] : null,
      expected: change.from,
      proposed: change.to,
      ready,
    };
  });
  console.log(JSON.stringify({ mode: 'dry-run', ready: report.filter((item) => item.ready).length, total: CHANGES.length, report }, null, 2));
}

async function apply(sql) {
  const runId = randomUUID();
  const changed = await sql.begin(async (tx) => {
    await tx`set local lock_timeout = '5s'`;
    let count = 0;
    for (const change of CHANGES) {
      const [row] = await tx`
        update intake.map_node_submissions
        set latitude = ${change.to[0]}, longitude = ${change.to[1]}, updated_at = now()
        where id = ${change.id}::uuid
          and place_name = ${change.place}
          and latitude = ${change.from[0]}
          and longitude = ${change.from[1]}
        returning place_name as "placeName"
      `;
      // Throwing rolls back every change in this run.
      if (!row) throw new Error(`Row ${change.id} no longer matches the reviewed values; nothing was changed.`);
      await tx`
        insert into intake.map_node_location_repairs (
          run_id, submission_id,
          previous_place_name, previous_latitude, previous_longitude,
          next_place_name, next_latitude, next_longitude,
          provider, provider_place_id, repair_rule
        )
        values (
          ${runId}::uuid, ${change.id}::uuid,
          ${row.placeName}, ${change.from[0]}, ${change.from[1]},
          ${row.placeName}, ${change.to[0]}, ${change.to[1]},
          'nominatim', ${change.osm}, ${RULE}
        )
      `;
      count += 1;
    }
    return count;
  });
  console.log(JSON.stringify({ mode: 'apply', runId, changed, total: CHANGES.length }, null, 2));
}

async function revert(sql, runId) {
  if (!UUID_PATTERN.test(runId)) throw new Error('--revert needs the run id printed by --apply.');
  const restored = await sql`
    with reverted as (
      update intake.map_node_submissions submission
      set latitude = repair.previous_latitude, longitude = repair.previous_longitude, updated_at = now()
      from intake.map_node_location_repairs repair
      where repair.run_id = ${runId}::uuid
        and repair.repair_rule = ${RULE}
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
  console.log(JSON.stringify({ mode: 'revert', runId, reverted: restored.length }, null, 2));
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set; run this inside the network-agent machine.');
  // Same client options as packages/agent/src/db.ts (pooler-safe, no prepared statements).
  const sql = postgres(process.env.DATABASE_URL, { max: 1, idle_timeout: 5, connect_timeout: 15, prepare: false });
  try {
    const revertRunId = argumentValue('--revert');
    if (revertRunId && process.argv.includes('--apply')) throw new Error('Choose --apply or --revert, not both.');
    if (revertRunId) await revert(sql, revertRunId);
    else if (process.argv.includes('--apply')) await apply(sql);
    else await dryRun(sql);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
