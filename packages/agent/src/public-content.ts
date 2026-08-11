import {
  assertPublicOperationalContentSnapshot,
  toPublicOperationalContentSnapshot,
} from '@greenpill-network/shared/public-content';
import type {
  PublicOperationalContentSnapshot,
  QuarantinedOperationalRecord,
} from '@greenpill-network/shared/public-content';
import { enqueueQuarantineAlerts } from './content-operations.js';
import { createDatabaseClient } from './db.js';
import { AgentDataError } from './map-nodes.js';

export const PUBLIC_OPERATIONAL_CONTENT_ROUTE = '/content/public-snapshot';
export const DEFAULT_DIRECTUS_PUBLIC_URL = 'https://admin.greenpill.network';

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

function directusPublicUrlFromEnv(env = process.env): string {
  return String(env.DIRECTUS_PUBLIC_URL || DEFAULT_DIRECTUS_PUBLIC_URL).trim().replace(/\/+$/, '');
}

export function buildDirectusAssetUrl(fileId: unknown, directusPublicUrl = directusPublicUrlFromEnv()): string {
  const normalizedFileId = typeof fileId === 'string' ? fileId.trim() : '';
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(normalizedFileId)) {
    return '';
  }
  const baseUrl = String(directusPublicUrl || DEFAULT_DIRECTUS_PUBLIC_URL).trim().replace(/\/+$/, '');
  return `${baseUrl}/assets/${encodeURIComponent(normalizedFileId)}`;
}

function toPublicChapterRecord(row: UnknownRecord, directusPublicUrl: string): UnknownRecord {
  const record = rowsToRecords([row])[0] ?? {};
  const assetUrl = buildDirectusAssetUrl(record.imageFileId, directusPublicUrl);
  const { imageFileId: _imageFileId, ...publicRecord } = record;
  return assetUrl ? { ...publicRecord, image: assetUrl } : publicRecord;
}

export async function getPublicOperationalContentSnapshot(
  sql: SqlLike,
  now: Date | string = new Date(),
  directusPublicUrl = directusPublicUrlFromEnv()
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
  const chapterInitiatives = await sql`
    select slug, data
    from content.public_chapter_initiatives
    order by chapter_slug, featured_weight desc, title
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

  const quarantined: QuarantinedOperationalRecord[] = [];
  const snapshot = assertPublicOperationalContentSnapshot(toPublicOperationalContentSnapshot({
    generatedAt: now,
    themes: rowsToRecords(themes),
    people: rowsToRecords(people),
    chapters: chapters.map((chapter) => toPublicChapterRecord(chapter, directusPublicUrl)),
    chapterInitiatives: rowsToRecords(chapterInitiatives),
    guilds: rowsToRecords(guilds),
    projects: rowsToRecords(projects),
  }, {
    onQuarantine: (records) => {
      quarantined.push(...records);
    },
  }));

  if (quarantined.length > 0) {
    console.warn('public_operational_content_records_quarantined', quarantined);
    await enqueueQuarantineAlerts(sql, quarantined);
  }

  return snapshot;
}

export function createPublicContentRepository({
  createSql = createDatabaseClient,
  directusPublicUrl = directusPublicUrlFromEnv(),
}: {
  createSql?: (options?: { max?: number }) => SqlLike | null;
  directusPublicUrl?: string;
} = {}): PublicContentRepository {
  return {
    getSnapshot(now = new Date()) {
      return withSql(createSql, (sql) => getPublicOperationalContentSnapshot(sql, now, directusPublicUrl));
    },
  };
}
