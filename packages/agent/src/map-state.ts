import {
  assertPublicAggregateCountsPayload,
  assertPublicMapStatePayload,
  toPublicAggregateCountsFromMapState,
  toPublicMapStatePayload,
} from '@greenpill-network/shared/map-state';
import type {
  PublicAggregateCountsPayload,
  PublicMapStatePayload,
  PublicMapSourceStatus,
} from '@greenpill-network/shared/map-state';
import {
  AgentDataError,
  createMapNodeRepository,
} from './map-nodes.js';

export const DEFAULT_PUBLIC_LOCATIONS_URL = 'https://greenpill.network/locations.json';
export const DEFAULT_PUBLIC_SOURCE_TIMEOUT_MS = 3000;
export const PUBLIC_MAP_STATE_ROUTE = '/map/state';
export const PUBLIC_COUNTS_ROUTE = '/public-counts';

type UnknownRecord = Record<string, any>;
type FetchLike = typeof fetch;

export interface MapStateRepository {
  getMapState(now?: Date | string): Promise<PublicMapStatePayload>;
  getPublicCounts(now?: Date | string): Promise<PublicAggregateCountsPayload>;
}

const cleanString = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

function sourceStatus(
  source: string,
  status: PublicMapSourceStatus['status'],
  count = 0,
  message = ''
): PublicMapSourceStatus {
  return {
    source,
    status,
    count,
    message,
  };
}

function isMissingDatabase(error: unknown): boolean {
  return error instanceof AgentDataError && error.code === 'database_not_configured';
}

async function loadChapterLocations({
  fetchImpl,
  locationsUrl,
  sourceTimeoutMs,
}: {
  fetchImpl?: FetchLike;
  locationsUrl: string;
  sourceTimeoutMs: number;
}): Promise<{ items: UnknownRecord[]; status: PublicMapSourceStatus }> {
  const url = cleanString(locationsUrl);
  if (!url || typeof fetchImpl !== 'function') {
    return {
      items: [],
      status: sourceStatus(
        'chapter-locations',
        'not_configured',
        0,
        'Public chapter locations source is not configured.'
      ),
    };
  }

  let timeout: ReturnType<typeof setTimeout> | null = null;
  try {
    const controller = typeof AbortController === 'function'
      ? new AbortController()
      : null;
    timeout = controller && sourceTimeoutMs > 0
      ? setTimeout(() => controller.abort(), sourceTimeoutMs)
      : null;
    const response = await fetchImpl(url, {
      headers: {
        accept: 'application/json',
      },
      signal: controller?.signal,
    });
    if (!response.ok) {
      throw new Error(`locations_json_${response.status}`);
    }

    const json = await response.json();
    const items = Array.isArray(json)
      ? json
      : Array.isArray(json?.locations)
        ? json.locations
        : [];

    return {
      items,
      status: sourceStatus(
        'chapter-locations',
        items.length ? 'ok' : 'empty',
        items.length
      ),
    };
  } catch {
    return {
      items: [],
      status: sourceStatus(
        'chapter-locations',
        'unavailable',
        0,
        'Public chapter locations are unavailable.'
      ),
    };
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

async function loadApprovedMapNodes(mapNodeRepository: UnknownRecord): Promise<{
  items: UnknownRecord[];
  status: PublicMapSourceStatus;
}> {
  try {
    const items = await mapNodeRepository.listPublic();
    return {
      items,
      status: sourceStatus(
        'approved-map-nodes',
        items.length ? 'ok' : 'empty',
        items.length
      ),
    };
  } catch (error) {
    return {
      items: [],
      status: sourceStatus(
        'approved-map-nodes',
        isMissingDatabase(error) ? 'not_configured' : 'unavailable',
        0,
        isMissingDatabase(error)
          ? 'Approved map-node source is not configured.'
          : 'Approved map-node source is unavailable.'
      ),
    };
  }
}

async function loadIntakeMode(mapNodeRepository: UnknownRecord): Promise<'moderated' | 'live'> {
  if (typeof mapNodeRepository.getIntakeMode !== 'function') {
    return 'moderated';
  }

  try {
    return await mapNodeRepository.getIntakeMode();
  } catch {
    return 'moderated';
  }
}

export async function getPublicMapState({
  fetchImpl = globalThis.fetch,
  locationsUrl = DEFAULT_PUBLIC_LOCATIONS_URL,
  mapNodeRepository = createMapNodeRepository(),
  sourceTimeoutMs = DEFAULT_PUBLIC_SOURCE_TIMEOUT_MS,
  now = new Date(),
}: {
  fetchImpl?: FetchLike;
  locationsUrl?: string;
  mapNodeRepository?: UnknownRecord;
  sourceTimeoutMs?: number;
  now?: Date | string;
} = {}): Promise<PublicMapStatePayload> {
  const [chapterLocations, publicMapNodes, intakeMode] = await Promise.all([
    loadChapterLocations({ fetchImpl, locationsUrl, sourceTimeoutMs }),
    loadApprovedMapNodes(mapNodeRepository),
    loadIntakeMode(mapNodeRepository),
  ]);

  return assertPublicMapStatePayload(toPublicMapStatePayload({
    chapterLocations: chapterLocations.items,
    publicMapNodes: publicMapNodes.items,
    sourceStatus: [chapterLocations.status, publicMapNodes.status],
    intakeMode,
    generatedAt: now,
  }));
}

export function createMapStateRepository({
  fetchImpl = globalThis.fetch,
  locationsUrl = DEFAULT_PUBLIC_LOCATIONS_URL,
  mapNodeRepository = createMapNodeRepository(),
  sourceTimeoutMs = DEFAULT_PUBLIC_SOURCE_TIMEOUT_MS,
}: {
  fetchImpl?: FetchLike;
  locationsUrl?: string;
  mapNodeRepository?: UnknownRecord;
  sourceTimeoutMs?: number;
} = {}): MapStateRepository {
  return {
    getMapState(now = new Date()) {
      return getPublicMapState({
        fetchImpl,
        locationsUrl,
        mapNodeRepository,
        sourceTimeoutMs,
        now,
      });
    },
    async getPublicCounts(now = new Date()) {
      const mapState = await getPublicMapState({
        fetchImpl,
        locationsUrl,
        mapNodeRepository,
        sourceTimeoutMs,
        now,
      });

      return assertPublicAggregateCountsPayload(
        toPublicAggregateCountsFromMapState(mapState, { generatedAt: now })
      );
    },
  };
}
