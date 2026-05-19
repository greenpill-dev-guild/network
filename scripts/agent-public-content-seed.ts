#!/usr/bin/env bun

import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDatabaseClient, getMigrationDatabaseUrl } from '@greenpill-network/agent/db';
import { assertPublicImpactPayload } from '@greenpill-network/agent/impact';
import { toPublicChapterImpactPayload } from '@greenpill-network/shared/chapter-impact';
import {
  containsPrivateMapNodeField,
  toPublicMapNode,
} from '@greenpill-network/shared/map-nodes';
import {
  assertPublicMapStatePayload,
  toPublicMapStatePayload,
} from '@greenpill-network/shared/map-state';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fixturePath = resolve(rootDir, 'packages/agent/fixtures/public-content-seed.json');
const dryRun = process.argv.includes('--dry-run');

const cleanString = (value) => (typeof value === 'string' ? value.trim() : '');

function requiredString(value, label) {
  const cleaned = cleanString(value);
  if (!cleaned) {
    throw new Error(`Missing required ${label}`);
  }
  return cleaned;
}

function normalizeThemes(value) {
  return Array.isArray(value)
    ? [...new Set(value.map(cleanString).filter(Boolean))]
    : [];
}

function normalizeSeedMapNode(node) {
  const status = cleanString(node.status) || 'approved';
  if (status !== 'approved') {
    throw new Error(`Seed map node ${node.id || node.displayName || 'unknown'} must be approved`);
  }

  const normalized = {
    id: requiredString(node.id, 'map node id'),
    status,
    displayName: requiredString(node.displayName || node.name, 'map node displayName'),
    placeName: requiredString(node.placeName || node.place, 'map node placeName'),
    city: cleanString(node.city),
    region: cleanString(node.region),
    country: cleanString(node.country),
    lat: Number(node.lat),
    long: Number(node.long),
    role: cleanString(node.role) || 'place',
    themes: normalizeThemes(node.themes),
    publicNote: cleanString(node.publicNote),
    approvedAt: cleanString(node.approvedAt),
  };

  if (!Number.isFinite(normalized.lat) || !Number.isFinite(normalized.long)) {
    throw new Error(`Seed map node ${normalized.id} must include finite lat/long coordinates`);
  }

  if (containsPrivateMapNodeField(node) || containsPrivateMapNodeField(normalized)) {
    throw new Error(`Seed map node ${normalized.id} contains private fields`);
  }

  const publicNode = toPublicMapNode(normalized);
  if (!publicNode) {
    throw new Error(`Seed map node ${normalized.id} cannot be projected publicly`);
  }

  return normalized;
}

function normalizeSeedImpactSnapshot(snapshot) {
  const chapterSlug = requiredString(snapshot.chapterSlug, 'chapter impact chapterSlug');
  const payload = assertPublicImpactPayload(toPublicChapterImpactPayload(snapshot.payload));
  const sourceStatus = payload.sourceStatus ?? [];
  const staleAfter = requiredString(snapshot.staleAfter, `${chapterSlug} staleAfter`);

  return {
    chapterSlug,
    payload,
    sourceStatus,
    staleAfter,
  };
}

async function readFixture() {
  const raw = await readFile(fixturePath, 'utf8');
  const fixture = JSON.parse(raw);
  const publicMapNodes = (fixture.publicMapNodes ?? []).map(normalizeSeedMapNode);
  const chapterImpactSnapshots = (fixture.chapterImpactSnapshots ?? []).map(normalizeSeedImpactSnapshot);

  assertPublicMapStatePayload(toPublicMapStatePayload({
    generatedAt: fixture.generatedAt,
    publicMapNodes,
    sourceStatus: [
      { source: 'approved-map-nodes', status: publicMapNodes.length > 0 ? 'ok' : 'empty', count: publicMapNodes.length },
    ],
  }));

  return {
    version: fixture.version,
    publicMapNodes,
    chapterImpactSnapshots,
  };
}

async function seedMapNodes(tx, nodes) {
  for (const node of nodes) {
    await tx`
      insert into intake.map_node_submissions (
        id,
        status,
        display_name,
        place_name,
        city,
        region,
        country,
        latitude,
        longitude,
        role,
        themes,
        public_note,
        raw_note,
        spam_score,
        spam_signals,
        rate_limit_key,
        ip_address,
        user_agent,
        approved_at
      )
      values (
        ${node.id},
        'approved',
        ${node.displayName},
        ${node.placeName},
        ${node.city || null},
        ${node.region || null},
        ${node.country || null},
        ${node.lat},
        ${node.long},
        ${node.role || null},
        ${node.themes},
        ${node.publicNote || null},
        null,
        null,
        '{}'::jsonb,
        null,
        null,
        null,
        ${node.approvedAt || null}
      )
      on conflict (id) do update set
        status = 'approved',
        display_name = excluded.display_name,
        place_name = excluded.place_name,
        city = excluded.city,
        region = excluded.region,
        country = excluded.country,
        latitude = excluded.latitude,
        longitude = excluded.longitude,
        role = excluded.role,
        themes = excluded.themes,
        public_note = excluded.public_note,
        raw_note = null,
        spam_score = null,
        spam_signals = '{}'::jsonb,
        rate_limit_key = null,
        ip_address = null,
        user_agent = null,
        approved_at = coalesce(excluded.approved_at, intake.map_node_submissions.approved_at, now()),
        archived_at = null,
        updated_at = now()
    `;
  }
}

async function seedImpactSnapshots(tx, snapshots) {
  for (const snapshot of snapshots) {
    await tx`
      insert into impact.chapter_impact_snapshots (
        chapter_slug,
        payload,
        source_status,
        synced_at,
        stale_after,
        error_count,
        last_error
      )
      values (
        ${snapshot.chapterSlug},
        ${tx.json(snapshot.payload)},
        ${tx.json(snapshot.sourceStatus)},
        now(),
        ${snapshot.staleAfter},
        0,
        null
      )
      on conflict (chapter_slug) do update set
        payload = excluded.payload,
        source_status = excluded.source_status,
        synced_at = excluded.synced_at,
        stale_after = excluded.stale_after,
        error_count = 0,
        last_error = null
    `;
  }
}

const fixture = await readFixture();

if (dryRun) {
  console.log(`Validated public content seed fixture v${fixture.version}`);
  console.log(`Map nodes: ${fixture.publicMapNodes.length}`);
  console.log(`Chapter impact snapshots: ${fixture.chapterImpactSnapshots.length}`);
  process.exit(0);
}

const databaseUrl = getMigrationDatabaseUrl();
if (!databaseUrl) {
  console.error('DATABASE_URL or DIRECT_DATABASE_URL is required to apply the public content seed.');
  console.error('Run with --dry-run to validate the fixture without writing to Postgres.');
  process.exit(1);
}

const sql = createDatabaseClient({ url: databaseUrl, max: 1 });
try {
  await sql.begin(async (tx) => {
    await seedMapNodes(tx, fixture.publicMapNodes);
    await seedImpactSnapshots(tx, fixture.chapterImpactSnapshots);
  });
  console.log(`Seeded ${fixture.publicMapNodes.length} approved public map nodes.`);
  console.log(`Seeded ${fixture.chapterImpactSnapshots.length} chapter impact snapshots.`);
} finally {
  await sql.end({ timeout: 3 }).catch(() => {});
}
