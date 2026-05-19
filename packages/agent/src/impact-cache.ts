import {
  toPublicChapterImpactPayload,
} from '@greenpill-network/shared/chapter-impact';
import type { PublicChapterImpactPayload } from '@greenpill-network/shared/chapter-impact';
import { createDatabaseClient } from './db.js';
import { assertPublicImpactPayload } from './impact.js';
import { AgentDataError } from './map-nodes.js';

type SqlLike = any;
type UnknownRecord = Record<string, any>;

export type CachedChapterImpactPayload = PublicChapterImpactPayload & {
  cache: {
    status: 'fresh' | 'stale';
    syncedAt: string;
    staleAfter: string;
  };
};

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

const toIso = (value: unknown): string => {
  if (!value) return '';
  const date = value instanceof Date || typeof value === 'string' || typeof value === 'number'
    ? new Date(value)
    : new Date('');
  return Number.isNaN(date.valueOf()) ? '' : date.toISOString();
};

export function decorateCachedImpactPayload(row?: UnknownRecord | null, now = new Date()): CachedChapterImpactPayload | null {
  if (!row) return null;

  const payload = row.payload && typeof row.payload === 'object'
    ? row.payload
    : toPublicChapterImpactPayload();
  const staleAfter = row.staleAfter ?? row.stale_after;
  const syncedAt = row.syncedAt ?? row.synced_at;
  const isStale = staleAfter ? new Date(staleAfter).getTime() <= now.getTime() : false;

  return assertPublicImpactPayload({
    ...payload,
    sourceStatus: row.sourceStatus ?? row.source_status ?? payload.sourceStatus ?? [],
    cache: {
      status: isStale ? 'stale' : 'fresh',
      syncedAt: toIso(syncedAt),
      staleAfter: toIso(staleAfter),
    },
  });
}

export async function getCachedChapterImpact(sql: SqlLike, chapterSlug: string, now = new Date()): Promise<CachedChapterImpactPayload | null> {
  const [row] = await sql`
    select
      chapter_slug as "chapterSlug",
      payload,
      source_status as "sourceStatus",
      synced_at as "syncedAt",
      stale_after as "staleAfter",
      error_count as "errorCount",
      last_error as "lastError"
    from impact.chapter_impact_snapshots
    where chapter_slug = ${chapterSlug}
  `;

  return decorateCachedImpactPayload(row, now);
}

export async function saveChapterImpactSnapshot(sql: SqlLike, {
  chapterSlug,
  payload,
  sourceStatus = payload?.sourceStatus ?? [],
  staleAfter,
  lastError = null,
}: {
  chapterSlug?: string;
  payload?: PublicChapterImpactPayload;
  sourceStatus?: PublicChapterImpactPayload['sourceStatus'];
  staleAfter?: Date | string;
  lastError?: string | null;
} = {}): Promise<PublicChapterImpactPayload> {
  const publicPayload = assertPublicImpactPayload(payload ?? toPublicChapterImpactPayload());
  const errorCount = lastError ? 1 : 0;

  await sql`
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
      ${chapterSlug},
      ${sql.json(publicPayload)},
      ${sql.json(sourceStatus)},
      now(),
      ${staleAfter},
      ${errorCount},
      ${lastError}
    )
    on conflict (chapter_slug) do update set
      payload = excluded.payload,
      source_status = excluded.source_status,
      synced_at = excluded.synced_at,
      stale_after = excluded.stale_after,
      error_count = case
        when excluded.last_error is null then 0
        else impact.chapter_impact_snapshots.error_count + 1
      end,
      last_error = excluded.last_error
  `;

  return publicPayload;
}

export function createImpactRepository({ createSql = createDatabaseClient }: {
  createSql?: (options?: { max?: number }) => SqlLike | null;
} = {}) {
  return {
    getChapterImpact(chapterSlug) {
      return withSql(createSql, (sql) => getCachedChapterImpact(sql, chapterSlug));
    },
    saveSnapshot(snapshot) {
      return withSql(createSql, (sql) => saveChapterImpactSnapshot(sql, snapshot));
    },
  };
}
