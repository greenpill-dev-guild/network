import {
  assertPublicOperationalContentSnapshot,
  toPublicOperationalContentSnapshot,
} from '@greenpill-network/shared/public-content';
import type { PublicOperationalContentSnapshot } from '@greenpill-network/shared/public-content';
import { createDatabaseClient } from './db.js';
import { AgentDataError } from './map-nodes.js';

export const PUBLIC_OPERATIONAL_CONTENT_ROUTE = '/content/public-snapshot';

type SqlLike = any;
type UnknownRecord = Record<string, any>;

export interface PublicContentRepository {
  getSnapshot(now?: Date | string): Promise<PublicOperationalContentSnapshot>;
}

async function withSql<T>(createSql: (options?: { max?: number }) => SqlLike | null, callback: (sql: SqlLike) => Promise<T> | T): Promise<T> {
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

function rowsToRecords(rows: UnknownRecord[]): UnknownRecord[] {
  return rows.map((row) => ({
    slug: row.slug,
    ...(row.data && typeof row.data === 'object' ? row.data : {}),
  }));
}

export async function getPublicOperationalContentSnapshot(
  sql: SqlLike,
  now: Date | string = new Date()
): Promise<PublicOperationalContentSnapshot> {
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

export function createPublicContentRepository({ createSql = createDatabaseClient }: {
  createSql?: (options?: { max?: number }) => SqlLike | null;
} = {}): PublicContentRepository {
  return {
    getSnapshot(now = new Date()) {
      return withSql(createSql, (sql) => getPublicOperationalContentSnapshot(sql, now));
    },
  };
}
