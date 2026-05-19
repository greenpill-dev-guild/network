import {
  assertPublicOperationalContentSnapshot,
  toPublicOperationalContentSnapshot,
} from '@greenpill-network/shared/public-content';
import { createDatabaseClient } from './db.js';
import { AgentDataError } from './map-nodes.js';

export const PUBLIC_OPERATIONAL_CONTENT_ROUTE = '/content/public-snapshot';

async function withSql(createSql, callback) {
  const sql = createSql({ max: 1 });
  if (!sql) {
    throw new AgentDataError(
      'database_not_configured',
      'The agent database is not configured.'
    );
  }

  try {
    return await callback(sql);
  } finally {
    await sql.end({ timeout: 3 }).catch(() => {});
  }
}

function rowsToRecords(rows) {
  return rows.map((row) => ({
    slug: row.slug,
    ...(row.data && typeof row.data === 'object' ? row.data : {}),
  }));
}

export async function getPublicOperationalContentSnapshot(sql, now = new Date()) {
  const themes = await sql`
    select slug, data
    from content.public_themes
    order by sort_order, name
  `;
  const people = await sql`
    select slug, data
    from content.public_people
    order by display_name
  `;
  const chapters = await sql`
    select slug, data
    from content.public_chapters
    order by name
  `;
  const guilds = await sql`
    select slug, data
    from content.public_guilds
    order by name
  `;
  const projects = await sql`
    select slug, data
    from content.public_projects
    order by name
  `;

  return assertPublicOperationalContentSnapshot(toPublicOperationalContentSnapshot({
    generatedAt: now,
    themes: rowsToRecords(themes),
    people: rowsToRecords(people),
    chapters: rowsToRecords(chapters),
    guilds: rowsToRecords(guilds),
    projects: rowsToRecords(projects),
  }));
}

export function createPublicContentRepository({ createSql = createDatabaseClient } = {}) {
  return {
    getSnapshot(now = new Date()) {
      return withSql(createSql, (sql) => getPublicOperationalContentSnapshot(sql, now));
    },
  };
}
