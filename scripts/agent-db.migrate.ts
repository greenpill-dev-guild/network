import { readdir, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDatabaseClient, getMigrationDatabaseUrl } from '@greenpill-network/agent/db';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const migrationsDir = resolve(rootDir, 'packages/agent/migrations');

const migrationUrl = getMigrationDatabaseUrl();

if (!migrationUrl) {
  console.error('DATABASE_URL is required. Copy .env.example to .env.local or run fly mpg proxy and set DATABASE_URL.');
  process.exit(1);
}

const sql = createDatabaseClient({ url: migrationUrl, max: 1 });

try {
  await sql.unsafe(`
    create schema if not exists audit;
    create table if not exists audit.agent_schema_migrations (
      version text primary key,
      applied_at timestamptz not null default now()
    );
  `);

  const migrationFiles = (await readdir(migrationsDir))
    .filter((file) => file.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b));

  for (const file of migrationFiles) {
    const [existing] = await sql`
      select version from audit.agent_schema_migrations where version = ${file}
    `;

    if (existing) {
      console.log(`Skipping already applied migration: ${file}`);
      continue;
    }

    const migration = await readFile(resolve(migrationsDir, file), 'utf8');
    await sql.unsafe(migration);
    await sql`
      insert into audit.agent_schema_migrations (version) values (${file})
    `;
    console.log(`Applied migration: ${file}`);
  }

  console.log('Applied agent database migrations.');
} finally {
  await sql.end({ timeout: 3 });
}
