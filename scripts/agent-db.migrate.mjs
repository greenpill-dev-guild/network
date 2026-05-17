import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDatabaseClient, getDatabaseUrl } from '../packages/agent/src/db.js';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const privateMapSchemaPath = resolve(rootDir, 'packages/agent/migrations/001_private_map_node_schema.sql');

const chapterImpactSchema = `
create table if not exists chapter_impact_snapshots (
  chapter_slug text primary key,
  payload jsonb not null,
  source_status jsonb not null default '[]'::jsonb,
  synced_at timestamptz not null default now(),
  stale_after timestamptz not null default now() + interval '6 hours',
  error_count integer not null default 0,
  last_error text
);
`;

if (!getDatabaseUrl()) {
  console.error('DATABASE_URL is required. Copy .env.example to .env.local or run fly mpg proxy and set DATABASE_URL.');
  process.exit(1);
}

const sql = createDatabaseClient({ max: 1 });

try {
  const privateMapSchema = await readFile(privateMapSchemaPath, 'utf8');
  await sql.unsafe(privateMapSchema);
  await sql.unsafe(chapterImpactSchema);
  console.log('Applied agent database schema: map node intake and chapter impact cache.');
} finally {
  await sql.end({ timeout: 3 });
}
