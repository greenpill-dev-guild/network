import type {
  PublicAggregateCountsPayload,
  PublicMapStatePayload,
} from '@greenpill-network/shared/map-state';
import type { PublicMapNode } from '@greenpill-network/shared/map-nodes';

export const DEFAULT_PUBLIC_LOCATIONS_URL: 'https://greenpill.network/locations.json';
export const DEFAULT_PUBLIC_SOURCE_TIMEOUT_MS: 3000;
export const PUBLIC_MAP_STATE_ROUTE: '/map/state';
export const PUBLIC_COUNTS_ROUTE: '/public-counts';

export interface MapStateFetchResponse {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}

export interface MapStateRepository {
  getMapState(now?: Date | string): Promise<PublicMapStatePayload>;
  getPublicCounts(now?: Date | string): Promise<PublicAggregateCountsPayload>;
}

export function getPublicMapState(options?: {
  fetchImpl?: (url: string, init?: Record<string, unknown>) => Promise<MapStateFetchResponse>;
  locationsUrl?: string;
  mapNodeRepository?: {
    listPublic(): Promise<PublicMapNode[]>;
  };
  sourceTimeoutMs?: number;
  now?: Date | string;
}): Promise<PublicMapStatePayload>;

export function createMapStateRepository(options?: {
  fetchImpl?: (url: string, init?: Record<string, unknown>) => Promise<MapStateFetchResponse>;
  locationsUrl?: string;
  mapNodeRepository?: {
    listPublic(): Promise<PublicMapNode[]>;
  };
  sourceTimeoutMs?: number;
}): MapStateRepository;
