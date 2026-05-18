import type { PublicImpactSourceBinding } from '@greenpill-network/shared/chapter-impact';
import type { PublicChapterImpactPayload } from '@greenpill-network/shared/chapter-impact';

export interface ImpactSyncConfig {
  impactSourcesUrl: string;
  greenGoodsIndexerUrl: string;
  karmaApiBase: string;
  cacheTtlSeconds: number;
  defaultChainId: number;
}

export interface ImpactSyncResult {
  checked: number;
  saved: number;
  failed: number;
  failures: Array<{
    chapterSlug: string;
    error: string;
  }>;
}

export const DEFAULT_IMPACT_SOURCES_URL: string;
export const DEFAULT_GREEN_GOODS_INDEXER_URL: string;
export const DEFAULT_KARMA_API_BASE: string;
export const DEFAULT_IMPACT_CACHE_TTL_SECONDS: number;
export const DEFAULT_GREEN_GOODS_CHAIN_ID: number;

export function getImpactSyncConfig(env?: Record<string, string | undefined>): ImpactSyncConfig;
export function fetchImpactSourceBindings(options?: {
  fetchImpl?: typeof fetch;
  impactSourcesUrl?: string;
}): Promise<PublicImpactSourceBinding[]>;
export function fetchGreenGoodsGardenImpact(options?: {
  fetchImpl?: typeof fetch;
  indexerUrl?: string;
  gardenAddress?: string;
  chainId?: number;
}): Promise<Record<string, unknown> | null>;
export function fetchKarmaImpact(): Promise<null>;
export function syncChapterImpactSnapshots(options?: {
  fetchImpl?: typeof fetch;
  repository?: {
    saveSnapshot(snapshot: {
      chapterSlug: string;
      payload: PublicChapterImpactPayload;
      sourceStatus: PublicChapterImpactPayload['sourceStatus'];
      staleAfter: Date;
      lastError: string | null;
    }): Promise<unknown>;
  };
  now?: Date;
  config?: ImpactSyncConfig;
}): Promise<ImpactSyncResult>;
