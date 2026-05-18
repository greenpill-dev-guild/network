import type postgres from 'postgres';
import type { PublicChapterImpactPayload } from '@greenpill-network/shared/chapter-impact';

export type CachedChapterImpactPayload = PublicChapterImpactPayload & {
  cache: {
    status: 'fresh' | 'stale';
    syncedAt: string;
    staleAfter: string;
  };
};

export function decorateCachedImpactPayload(
  row?: Record<string, unknown> | null,
  now?: Date,
): CachedChapterImpactPayload | null;
export function getCachedChapterImpact(
  sql: postgres.Sql,
  chapterSlug: string,
  now?: Date,
): Promise<CachedChapterImpactPayload | null>;
export function saveChapterImpactSnapshot(sql: postgres.Sql, snapshot?: {
  chapterSlug?: string;
  payload?: PublicChapterImpactPayload;
  sourceStatus?: PublicChapterImpactPayload['sourceStatus'];
  staleAfter?: Date | string;
  lastError?: string | null;
}): Promise<PublicChapterImpactPayload>;
export function createImpactRepository(options?: {
  createSql?: (options?: { max?: number }) => postgres.Sql | null;
}): {
  getChapterImpact(chapterSlug: string): Promise<CachedChapterImpactPayload | null>;
  saveSnapshot(snapshot: Parameters<typeof saveChapterImpactSnapshot>[1]): Promise<PublicChapterImpactPayload>;
};
