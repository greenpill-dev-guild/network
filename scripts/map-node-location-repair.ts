#!/usr/bin/env bun

import { randomUUID } from 'node:crypto';
import {
  createMapLocationRepository,
  MAP_LOCATION_RATE_LIMIT_MS,
  type MapLocationRepairCandidate,
} from '@greenpill-network/agent/map-locations';
import { createDatabaseClient, getMigrationDatabaseUrl } from '@greenpill-network/agent/db';

type SqlLike = any;

type MapNodeLocationRow = {
  id: string;
  placeName: string;
  city: string;
  region: string;
  country: string;
  lat: number;
  long: number;
};

type PlannedRepair = {
  row: MapNodeLocationRow;
  candidate: MapLocationRepairCandidate;
  distanceKm: number;
  rule: 'exact_place_label_with_context_unique_match';
};

const DEFAULT_LIMIT = 100;
const MINIMUM_REPAIR_DISTANCE_KM = 50;
const MAX_PROVIDER_THROTTLE_RETRIES = 12;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const clean = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');
const sleep = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function normalizedLabel(value: unknown): string {
  return clean(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function distanceKm(aLat: number, aLong: number, bLat: number, bLong: number): number {
  const radians = Math.PI / 180;
  const latitudeDelta = (bLat - aLat) * radians;
  const longitudeDelta = (bLong - aLong) * radians;
  const sinLatitude = Math.sin(latitudeDelta / 2);
  const sinLongitude = Math.sin(longitudeDelta / 2);
  const value = sinLatitude * sinLatitude
    + Math.cos(aLat * radians) * Math.cos(bLat * radians) * sinLongitude * sinLongitude;
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function locationQuery(row: MapNodeLocationRow): string {
  const values = [row.placeName, row.city, row.region, row.country]
    .map(clean)
    .filter(Boolean);
  return values.filter((value, index) => (
    values.findIndex((candidate) => normalizedLabel(candidate) === normalizedLabel(value)) === index
  )).join(', ');
}

function isExactPlaceMatch(row: MapNodeLocationRow, candidate: MapLocationRepairCandidate): boolean {
  const requestedPlace = normalizedLabel(clean(row.placeName).split(',')[0]);
  const candidatePlace = normalizedLabel(clean(candidate.label).split(',')[0]);
  if (!requestedPlace || !candidatePlace || requestedPlace !== candidatePlace) return false;

  // A matching settlement name alone is not enough: names such as Springfield
  // occur in many countries. Require every available city/region/country part
  // of the stored public location to be present in the provider's full label.
  const normalizedCandidateLabel = normalizedLabel(candidate.label);
  const candidateLabel = ` ${normalizedCandidateLabel} `;
  const context = [row.city, row.region, row.country]
    .map(normalizedLabel)
    .filter((part) => Boolean(part) && part !== requestedPlace);

  // A bare settlement label is not enough evidence to move a pin. The one
  // safe label-only case is a country whose full provider label is identical.
  if (context.length === 0) {
    return candidate.kind === 'country' && normalizedCandidateLabel === requestedPlace;
  }
  return context.every((part) => candidateLabel.includes(` ${part} `));
}

function argumentValue(name: string): string {
  const index = process.argv.indexOf(name);
  return index >= 0 ? clean(process.argv[index + 1]) : '';
}

function parseLimit(): number {
  const raw = argumentValue('--limit');
  if (!raw) return DEFAULT_LIMIT;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1 || value > 500) {
    throw new Error('--limit must be an integer from 1 to 500.');
  }
  return value;
}

function parseAfter(): string {
  const after = argumentValue('--after');
  if (!after) return '';
  if (!UUID_PATTERN.test(after)) throw new Error('--after must be a valid submission UUID.');
  return after;
}

async function listRows(sql: SqlLike, limit: number, after: string): Promise<{
  rows: MapNodeLocationRow[];
  nextCursor: string;
}> {
  // Fetch one extra record so a cursor is emitted only when another page
  // exists. Normalize only the requested page: malformed historical rows must
  // not cause a later valid row to be silently skipped.
  const queryLimit = limit + 1;
  const fetchedRows = after
    ? await sql`
    select
      id::text,
      place_name as "placeName",
      city,
      region,
      country,
      latitude::float8 as lat,
      longitude::float8 as long
    from intake.map_node_submissions
    where place_name is not null
      and latitude is not null
      and longitude is not null
      and latitude between -90 and 90
      and longitude between -180 and 180
      and id > ${after}::uuid
    order by id asc
    limit ${queryLimit}
  `
    : await sql`
    select
      id::text,
      place_name as "placeName",
      city,
      region,
      country,
      latitude::float8 as lat,
      longitude::float8 as long
    from intake.map_node_submissions
    where place_name is not null
      and latitude is not null
      and longitude is not null
      and latitude between -90 and 90
      and longitude between -180 and 180
    order by id asc
    limit ${queryLimit}
  `;

  const pageRows = fetchedRows.slice(0, limit);
  const rows = pageRows
    .map((row) => ({
      id: clean(row.id),
      placeName: clean(row.placeName),
      city: clean(row.city),
      region: clean(row.region),
      country: clean(row.country),
      lat: Number(row.lat),
      long: Number(row.long),
    }))
    .filter((row) => row.id && row.placeName && Number.isFinite(row.lat) && Number.isFinite(row.long));
  return {
    rows,
    nextCursor: fetchedRows.length > limit ? clean(pageRows.at(-1)?.id) : '',
  };
}

async function planRepairs(sql: SqlLike, limit: number, after: string): Promise<{
  inspected: number;
  candidatesUnavailable: number;
  ambiguous: number;
  unchanged: number;
  nextCursor: string;
  repairs: PlannedRepair[];
}> {
  const { rows, nextCursor } = await listRows(sql, limit, after);
  const repository = createMapLocationRepository({
    // Each lookup intentionally opens its own short-lived connection. The shared
    // cache/throttle table serializes this repair path with public map requests.
    createSql: () => createDatabaseClient({ url: getMigrationDatabaseUrl(), max: 1 }),
  });
  const repairs: PlannedRepair[] = [];
  let candidatesUnavailable = 0;
  let ambiguous = 0;
  let unchanged = 0;

  for (const row of rows) {
    let candidates: MapLocationRepairCandidate[] | null = null;
    for (let attempt = 0; attempt <= MAX_PROVIDER_THROTTLE_RETRIES; attempt += 1) {
      try {
        candidates = await repository.findRepairCandidates(locationQuery(row));
        break;
      } catch (error) {
        const code = clean((error as { code?: unknown } | null)?.code);
        if (code !== 'location_lookup_busy' || attempt === MAX_PROVIDER_THROTTLE_RETRIES) break;
        await sleep(MAP_LOCATION_RATE_LIMIT_MS);
      }
    }
    if (!candidates) {
      candidatesUnavailable += 1;
      continue;
    }

    const exactMatches = candidates.filter((candidate) => isExactPlaceMatch(row, candidate));
    if (exactMatches.length !== 1) {
      ambiguous += 1;
      continue;
    }

    const candidate = exactMatches[0];
    const separation = distanceKm(row.lat, row.long, candidate.lat, candidate.long);
    if (separation < MINIMUM_REPAIR_DISTANCE_KM) {
      unchanged += 1;
      continue;
    }

    repairs.push({
      row,
      candidate,
      distanceKm: separation,
      rule: 'exact_place_label_with_context_unique_match',
    });
  }

  return {
    inspected: rows.length,
    candidatesUnavailable,
    ambiguous,
    unchanged,
    // UUID ordering makes this cursor stable even when repairs update rows.
    nextCursor,
    repairs,
  };
}

async function applyRepairs(sql: SqlLike, repairs: PlannedRepair[], runId: string): Promise<number> {
  return sql.begin(async (tx) => {
    let applied = 0;
    for (const repair of repairs) {
      const [changed] = await tx`
        update intake.map_node_submissions
        set
          place_name = ${repair.candidate.label},
          latitude = ${repair.candidate.lat},
          longitude = ${repair.candidate.long},
          updated_at = now()
        where id = ${repair.row.id}::uuid
          and place_name = ${repair.row.placeName}
          and latitude = ${repair.row.lat}
          and longitude = ${repair.row.long}
        returning id::text
      `;
      if (!changed) continue;

      await tx`
        insert into intake.map_node_location_repairs (
          run_id,
          submission_id,
          previous_place_name,
          previous_latitude,
          previous_longitude,
          next_place_name,
          next_latitude,
          next_longitude,
          provider,
          provider_place_id,
          repair_rule
        )
        values (
          ${runId}::uuid,
          ${repair.row.id}::uuid,
          ${repair.row.placeName},
          ${repair.row.lat},
          ${repair.row.long},
          ${repair.candidate.label},
          ${repair.candidate.lat},
          ${repair.candidate.long},
          ${repair.candidate.provider},
          ${repair.candidate.providerPlaceId},
          ${repair.rule}
        )
      `;
      applied += 1;
    }
    return applied;
  });
}

async function revertRun(sql: SqlLike, runId: string): Promise<number> {
  const restored = await sql`
    with reverted as (
      update intake.map_node_submissions submission
      set
        place_name = repair.previous_place_name,
        latitude = repair.previous_latitude,
        longitude = repair.previous_longitude,
        updated_at = now()
      from intake.map_node_location_repairs repair
      where repair.run_id = ${runId}::uuid
        and repair.reverted_at is null
        and submission.id = repair.submission_id
        and submission.place_name = repair.next_place_name
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
  return restored.length;
}

const apply = process.argv.includes('--apply');
const revertRunId = argumentValue('--revert');
const after = parseAfter();

if (apply && revertRunId) {
  throw new Error('Choose either --apply or --revert <run-id>, not both.');
}

const databaseUrl = getMigrationDatabaseUrl();
if (!databaseUrl) {
  console.error('DATABASE_URL or DIRECT_DATABASE_URL is required to inspect or repair map-node locations.');
  process.exit(1);
}

const sql = createDatabaseClient({ url: databaseUrl, max: 1 });
if (!sql) {
  console.error('Could not initialize the database client.');
  process.exit(1);
}

try {
  if (revertRunId) {
    if (!UUID_PATTERN.test(revertRunId)) throw new Error('--revert must be a valid repair run UUID.');
    const reverted = await revertRun(sql, revertRunId);
    console.log(JSON.stringify({ mode: 'revert', runId: revertRunId, reverted }, null, 2));
  } else {
    const plan = await planRepairs(sql, parseLimit(), after);
    if (!apply) {
      console.log(JSON.stringify({
        mode: 'dry-run',
        note: 'No map-node submission rows were changed. Shared geocoder cache and throttle entries may be refreshed.',
        ...plan,
        repairs: plan.repairs.map((repair) => ({
          submissionId: repair.row.id,
          from: { label: repair.row.placeName, lat: repair.row.lat, long: repair.row.long },
          to: { label: repair.candidate.label, lat: repair.candidate.lat, long: repair.candidate.long },
          distanceKm: Number(repair.distanceKm.toFixed(1)),
          rule: repair.rule,
        })),
      }, null, 2));
    } else {
      const runId = randomUUID();
      const applied = await applyRepairs(sql, plan.repairs, runId);
      console.log(JSON.stringify({
        mode: 'apply',
        runId,
        inspected: plan.inspected,
        planned: plan.repairs.length,
        applied,
        skippedBecauseChanged: plan.repairs.length - applied,
        candidatesUnavailable: plan.candidatesUnavailable,
        ambiguous: plan.ambiguous,
        unchanged: plan.unchanged,
        nextCursor: plan.nextCursor,
      }, null, 2));
    }
  }
} finally {
  await sql.end({ timeout: 3 }).catch(() => {});
}
