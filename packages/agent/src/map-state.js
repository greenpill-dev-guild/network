import {
  assertPublicAggregateCountsPayload,
  assertPublicMapStatePayload,
  toPublicAggregateCountsFromMapState,
  toPublicMapStatePayload,
} from '@greenpill-network/shared/map-state';
import {
  AgentDataError,
  createMapNodeRepository,
} from './map-nodes.js';

export const DEFAULT_PUBLIC_LOCATIONS_URL = 'https://greenpill.network/locations.json';
export const DEFAULT_PUBLIC_SOURCE_TIMEOUT_MS = 3000;
export const PUBLIC_MAP_STATE_ROUTE = '/map/state';
export const PUBLIC_COUNTS_ROUTE = '/public-counts';

const cleanString = (value) => (typeof value === 'string' ? value.trim() : '');

function sourceStatus(source, status, count = 0, message = '') {
  return {
    source,
    status,
    count,
    message,
  };
}

function isMissingDatabase(error) {
  return error instanceof AgentDataError && error.code === 'database_not_configured';
}

async function loadChapterLocations({ fetchImpl, locationsUrl, sourceTimeoutMs }) {
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

  let timeout = null;
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

async function loadApprovedMapNodes(mapNodeRepository) {
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

export async function getPublicMapState({
  fetchImpl = globalThis.fetch,
  locationsUrl = DEFAULT_PUBLIC_LOCATIONS_URL,
  mapNodeRepository = createMapNodeRepository(),
  sourceTimeoutMs = DEFAULT_PUBLIC_SOURCE_TIMEOUT_MS,
  now = new Date(),
} = {}) {
  const [chapterLocations, publicMapNodes] = await Promise.all([
    loadChapterLocations({ fetchImpl, locationsUrl, sourceTimeoutMs }),
    loadApprovedMapNodes(mapNodeRepository),
  ]);

  return assertPublicMapStatePayload(toPublicMapStatePayload({
    chapterLocations: chapterLocations.items,
    publicMapNodes: publicMapNodes.items,
    sourceStatus: [chapterLocations.status, publicMapNodes.status],
    generatedAt: now,
  }));
}

export function createMapStateRepository({
  fetchImpl = globalThis.fetch,
  locationsUrl = DEFAULT_PUBLIC_LOCATIONS_URL,
  mapNodeRepository = createMapNodeRepository(),
  sourceTimeoutMs = DEFAULT_PUBLIC_SOURCE_TIMEOUT_MS,
} = {}) {
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
