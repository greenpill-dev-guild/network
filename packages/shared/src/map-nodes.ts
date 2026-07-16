import { PUBLIC_ECOREGIONS, type PublicEcoregionRegion } from './public-ecoregions.js';

type UnknownRecord = Record<string, any>;

export { PUBLIC_ECOREGIONS, type PublicEcoregionRegion } from './public-ecoregions.js';

export type MapNodeStatus = 'pending' | 'approved' | 'rejected' | 'archived';
export type PublicBioregionSource = 'resolve-ecoregions-2017' | 'one-earth' | string;

export interface PublicBioregionMetadata {
  id: string;
  name: string;
  source: PublicBioregionSource;
}

export interface PublicMapNode {
  id: string;
  name: string;
  place: string;
  city: string;
  region: string;
  country: string;
  bioregion: string;
  bioregionId?: string;
  bioregionSource?: PublicBioregionSource;
  lat: number;
  long: number;
  role: string;
  chapterSlug?: string;
  profileUrl?: string;
  themes: string[];
  publicNote: string;
  status: 'approved';
  source: 'approved-submission';
}

export interface EditablePublicMapNode {
  id: string;
  display_name: string;
  place_name: string;
  city: string;
  region: string;
  country: string;
  latitude: number;
  longitude: number;
  themes: string[];
  public_note: string;
}

export type MapNodeModerationDecision = 'approved' | 'rejected';

export interface AuthenticatedMapNodeModerationNode {
  id: string;
  displayName: string;
  placeName: string;
  city: string;
  region: string;
  country: string;
  lat: number;
  long: number;
  themes: string[];
  publicNote: string;
  createdAt: string;
}

export type AuthenticatedMapNodeModerationSession =
  | {
      state: 'pending';
      node: AuthenticatedMapNodeModerationNode;
      expiresAt: string;
    }
  | {
      state: 'resolved';
      decision: MapNodeModerationDecision;
      reviewedAt: string;
    };

export interface AuthenticatedMapNodeModerationResult {
  state: 'resolved';
  decision: MapNodeModerationDecision;
  reviewedAt: string;
}

export interface OptimisticPendingMapNode extends Omit<PublicMapNode, 'status' | 'source' | 'lat' | 'long'> {
  lat: number | null;
  long: number | null;
  status: 'pending';
  source: 'local-pending';
  createdAt: string;
}

export interface PendingMapNodeStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const MAP_NODE_STATUSES: readonly MapNodeStatus[] = Object.freeze(['pending', 'approved', 'rejected', 'archived']);

export const PRIVATE_MAP_NODE_FIELDS = Object.freeze([
  'email',
  'privateEmail',
  'private_email',
  'ownerEmail',
  'owner_email',
  'contactConsent',
  'contact_consent',
  'rawNote',
  'raw_note',
  'token',
  'tokenHash',
  'token_hash',
  'tokenState',
  'token_state',
  'consumedAt',
  'consumed_at',
  'expiresAt',
  'expires_at',
  'pendingRevision',
  'pending_revision',
  'pendingUpdateRequest',
  'pending_update_request',
  'proposedPublicFields',
  'proposed_public_fields',
  'currentPublicFields',
  'current_public_fields',
  'requestMetadata',
  'request_metadata',
  'reviewNotes',
  'review_notes',
  'reviewStatus',
  'review_status',
  'reviewedBy',
  'reviewed_by',
  'reviewedAt',
  'reviewed_at',
  'ipAddress',
  'ip_address',
  'requestIp',
  'request_ip',
  'requesterIp',
  'requester_ip',
  'rateLimitKey',
  'rate_limit_key',
  'spamScore',
  'spam_score',
  'spamSignals',
  'spam_signals',
  'userAgent',
  'user_agent',
  'requestUserAgent',
  'request_user_agent',
  'requesterUserAgent',
  'requester_user_agent',
]);

export const PUBLIC_MAP_NODE_FIELDS = Object.freeze([
  'id',
  'name',
  'place',
  'city',
  'region',
  'country',
  'bioregion',
  'bioregionId',
  'bioregionSource',
  'lat',
  'long',
  'role',
  'chapterSlug',
  'profileUrl',
  'themes',
  'publicNote',
  'status',
  'source',
]);

export const EDITABLE_MAP_NODE_UPDATE_FIELDS: readonly (keyof Omit<EditablePublicMapNode, 'id'>)[] = Object.freeze([
  'display_name',
  'place_name',
  'city',
  'region',
  'country',
  'latitude',
  'longitude',
  'themes',
  'public_note',
]);

export const PENDING_NODE_STORAGE_KEY = 'greenpill.pendingMapNodes.v1';
export const PENDING_NODE_UPDATED_EVENT = 'greenpill:pending-map-node';

export const PUBLIC_MAP_THEME_ALIASES: Readonly<Record<string, string>> = Object.freeze({
  'coordination-tools': 'opensrc',
  currency: 'mutual',
  'knowledge-commons': 'education',
  'local-regeneration': 'trees',
  opensource: 'opensrc',
  'open-source': 'opensrc',
  'public-goods': 'public',
});

const cleanString = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');
const normalizeFieldKey = (key: unknown): string => cleanString(key).toLowerCase().replace(/[^a-z0-9]/g, '');
const PRIVATE_MAP_NODE_FIELD_KEYS = new Set(PRIVATE_MAP_NODE_FIELDS.map(normalizeFieldKey));
const PRIVATE_MAP_NODE_FIELD_PATTERNS = Object.freeze([
  'email',
  'owneremail',
  'contactconsent',
  'rawnote',
  'token',
  'consumed',
  'expires',
  'pendingrevision',
  'pendingupdate',
  'proposedpublicfields',
  'currentpublicfields',
  'requestmetadata',
  'review',
  'ipaddress',
  'requestip',
  'requesterip',
  'ratelimit',
  'spam',
  'useragent',
  'requestuseragent',
  'requesteruseragent',
]);

const normalizeNumber = (value: unknown): number | null => {
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) ? number : null;
};

const normalizePublicBioregion = (value: unknown): string => cleanString(value);

const PUBLIC_ECOREGION_BY_ID = new Map(PUBLIC_ECOREGIONS.regions.map((region) => [region.id, region]));
const ECOREGION_LOOKUP_TOLERANCE_DEGREES = 0.45;

export function findPublicEcoregionById(id: unknown): PublicEcoregionRegion | null {
  const regionId = cleanString(id);
  return regionId ? PUBLIC_ECOREGION_BY_ID.get(regionId) ?? null : null;
}

const pointInRing = (lon: number, lat: number, ring: PublicEcoregionRegion['polygons'][number][number]): boolean => {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersects = yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi + 1e-9) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
};

const pointInEcoregionPolygon = (
  lon: number,
  lat: number,
  polygon: PublicEcoregionRegion['polygons'][number]
): boolean => {
  const [outer, ...holes] = polygon;
  if (!outer || !pointInRing(lon, lat, outer)) return false;
  return !holes.some((hole) => pointInRing(lon, lat, hole));
};

const bboxContains = (bbox: PublicEcoregionRegion['bbox'], lon: number, lat: number): boolean => (
  lon >= bbox[0] && lon <= bbox[2] && lat >= bbox[1] && lat <= bbox[3]
);

const expandedBboxContains = (
  bbox: PublicEcoregionRegion['bbox'],
  lon: number,
  lat: number,
  tolerance: number
): boolean => (
  lon >= bbox[0] - tolerance &&
  lon <= bbox[2] + tolerance &&
  lat >= bbox[1] - tolerance &&
  lat <= bbox[3] + tolerance
);

const distanceToSegmentSq = (
  point: [number, number],
  start: [number, number],
  end: [number, number]
): number => {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  if (dx === 0 && dy === 0) {
    return (point[0] - start[0]) ** 2 + (point[1] - start[1]) ** 2;
  }
  const t = Math.max(0, Math.min(1, ((point[0] - start[0]) * dx + (point[1] - start[1]) * dy) / (dx * dx + dy * dy)));
  const projected: [number, number] = [start[0] + t * dx, start[1] + t * dy];
  return (point[0] - projected[0]) ** 2 + (point[1] - projected[1]) ** 2;
};

const distanceToRingSq = (lon: number, lat: number, ring: PublicEcoregionRegion['polygons'][number][number]): number => {
  let nearest = Number.POSITIVE_INFINITY;
  for (let i = 0; i < ring.length - 1; i += 1) {
    nearest = Math.min(nearest, distanceToSegmentSq([lon, lat], ring[i], ring[i + 1]));
  }
  return nearest;
};

const distanceToRegionSq = (lon: number, lat: number, region: PublicEcoregionRegion): number => {
  let nearest = Number.POSITIVE_INFINITY;
  for (const polygon of region.polygons) {
    const outer = polygon[0];
    if (outer) nearest = Math.min(nearest, distanceToRingSq(lon, lat, outer));
  }
  return nearest;
};

export function lookupPublicBioregionFromCoordinates(
  lat: unknown,
  long: unknown
): PublicBioregionMetadata | null {
  const latitude = normalizeNumber(lat);
  const longitude = normalizeNumber(long);
  if (latitude === null || longitude === null) return null;
  let nearestRegion: { region: PublicEcoregionRegion; distanceSq: number } | null = null;

  for (const region of PUBLIC_ECOREGIONS.regions) {
    if (!expandedBboxContains(region.bbox, longitude, latitude, ECOREGION_LOOKUP_TOLERANCE_DEGREES)) continue;
    if (region.polygons.some((polygon) => pointInEcoregionPolygon(longitude, latitude, polygon))) {
      return {
        id: region.id,
        name: region.name,
        source: region.source,
      };
    }
    const distanceSq = distanceToRegionSq(longitude, latitude, region);
    if (!nearestRegion || distanceSq < nearestRegion.distanceSq) {
      nearestRegion = { region, distanceSq };
    }
  }

  if (
    nearestRegion &&
    nearestRegion.distanceSq <= ECOREGION_LOOKUP_TOLERANCE_DEGREES * ECOREGION_LOOKUP_TOLERANCE_DEGREES
  ) {
    return {
      id: nearestRegion.region.id,
      name: nearestRegion.region.name,
      source: nearestRegion.region.source,
    };
  }

  return null;
}

export function derivePublicBioregionMetadataFromCoordinates(
  lat: unknown,
  long: unknown,
  knownBioregion?: unknown,
  knownBioregionId?: unknown,
  knownBioregionSource?: unknown
): PublicBioregionMetadata | null {
  const knownName = cleanString(knownBioregion);
  const knownId = cleanString(knownBioregionId);
  const knownSource = cleanString(knownBioregionSource) || 'resolve-ecoregions-2017';

  if (knownId) {
    const region = findPublicEcoregionById(knownId);
    return {
      id: knownId,
      name: knownName || region?.name || knownId,
      source: knownSource,
    };
  }

  return lookupPublicBioregionFromCoordinates(lat, long);
}

export function derivePublicBioregionFromCoordinates(
  lat: unknown,
  long: unknown,
  knownBioregion?: unknown
): string {
  const bioregion = cleanString(knownBioregion);
  if (bioregion) return bioregion;

  return derivePublicBioregionMetadataFromCoordinates(lat, long)?.name ?? '';
}

const cleanHref = (value: unknown): string => {
  const href = cleanString(value);
  if (href.startsWith('/') || href.startsWith('https://') || href.startsWith('http://')) {
    return href;
  }
  return '';
};

export const normalizePublicMapThemeSlug = (theme: unknown): string => {
  const slug = cleanString(theme);
  return PUBLIC_MAP_THEME_ALIASES[slug] ?? slug;
};

export const normalizePublicMapThemeSlugs = (themes: unknown): string[] => (
  Array.isArray(themes)
    ? [...new Set(themes.map(normalizePublicMapThemeSlug).filter(Boolean))]
    : []
);

const normalizeThemes = normalizePublicMapThemeSlugs;

export function containsPrivateMapNodeField(value: unknown, seen: Set<object> = new Set()): boolean {
  if (!value || typeof value !== 'object') return false;
  if (seen.has(value)) return false;
  seen.add(value);

  return Object.entries(value).some(([key, nestedValue]) => {
    const normalizedKey = normalizeFieldKey(key);
    return (
      PRIVATE_MAP_NODE_FIELD_KEYS.has(normalizedKey) ||
      PRIVATE_MAP_NODE_FIELD_PATTERNS.some((pattern) => normalizedKey.includes(pattern)) ||
      containsPrivateMapNodeField(nestedValue, seen)
    );
  });
}

export function toPublicMapNode(submission: UnknownRecord): PublicMapNode | null {
  if (!submission || submission.status !== 'approved') return null;

  const lat = normalizeNumber(submission.lat);
  const long = normalizeNumber(submission.long);
  if (lat === null || long === null) return null;
  const bioregion = derivePublicBioregionMetadataFromCoordinates(
    lat,
    long,
    submission.bioregion,
    submission.bioregionId ?? submission.bioregion_id,
    submission.bioregionSource ?? submission.bioregion_source
  );
  const knownBioregion = normalizePublicBioregion(submission.bioregion);

  return {
    id: cleanString(submission.id),
    name: cleanString(submission.name || submission.displayName),
    place: cleanString(submission.place || submission.placeName),
    city: cleanString(submission.city),
    region: cleanString(submission.region),
    country: cleanString(submission.country),
    bioregion: normalizePublicBioregion(knownBioregion || bioregion?.name),
    ...(bioregion?.id ? { bioregionId: bioregion.id, bioregionSource: bioregion.source } : {}),
    lat,
    long,
    role: cleanString(submission.role || submission.intent),
    chapterSlug: cleanString(submission.chapterSlug ?? submission.chapter_slug),
    profileUrl: cleanHref(submission.profileUrl ?? submission.profile_url),
    themes: normalizeThemes(submission.themes),
    publicNote: cleanString(submission.publicNote),
    status: 'approved',
    source: 'approved-submission',
  };
}

export function toEditablePublicMapNode(submission: UnknownRecord): EditablePublicMapNode | null {
  if (!submission) return null;

  const latitude = normalizeNumber(submission.latitude ?? submission.lat);
  const longitude = normalizeNumber(submission.longitude ?? submission.long ?? submission.lng);
  if (latitude === null || longitude === null) return null;

  const id = cleanString(submission.id);
  const displayName = cleanString(submission.display_name ?? submission.displayName ?? submission.name);
  const placeName = cleanString(submission.place_name ?? submission.placeName ?? submission.place);
  if (!id || !displayName || !placeName) return null;

  return {
    id,
    display_name: displayName,
    place_name: placeName,
    city: cleanString(submission.city),
    region: cleanString(submission.region),
    country: cleanString(submission.country),
    latitude,
    longitude,
    themes: normalizeThemes(submission.themes),
    public_note: cleanString(submission.public_note ?? submission.publicNote),
  };
}

export function toAuthenticatedMapNodeModerationNode(
  submission: UnknownRecord
): AuthenticatedMapNodeModerationNode | null {
  if (!submission) return null;

  const lat = normalizeNumber(submission.lat ?? submission.latitude);
  const long = normalizeNumber(submission.long ?? submission.longitude ?? submission.lng);
  const id = cleanString(submission.id);
  const displayName = cleanString(submission.displayName ?? submission.display_name ?? submission.name);
  const placeName = cleanString(submission.placeName ?? submission.place_name ?? submission.place);
  const createdAtValue = submission.createdAt ?? submission.created_at;
  const createdAt = createdAtValue instanceof Date
    ? createdAtValue.toISOString()
    : cleanString(createdAtValue);

  if (!id || !displayName || !placeName || lat === null || long === null || !createdAt) return null;

  const node: AuthenticatedMapNodeModerationNode = {
    id,
    displayName,
    placeName,
    city: cleanString(submission.city),
    region: cleanString(submission.region),
    country: cleanString(submission.country),
    lat,
    long,
    themes: normalizeThemes(submission.themes),
    publicNote: cleanString(submission.publicNote ?? submission.public_note),
    createdAt,
  };

  return containsPrivateMapNodeField(node) ? null : node;
}

export function createOptimisticPendingNode(
  input: UnknownRecord,
  now: Date | string = new Date()
): OptimisticPendingMapNode {
  const createdAt = now instanceof Date ? now.toISOString() : new Date(now).toISOString();
  const lat = normalizeNumber(input?.lat);
  const long = normalizeNumber(input?.long);
  const bioregion = derivePublicBioregionMetadataFromCoordinates(
    lat,
    long,
    input?.bioregion,
    input?.bioregionId ?? input?.bioregion_id,
    input?.bioregionSource ?? input?.bioregion_source
  );
  const knownBioregion = normalizePublicBioregion(input?.bioregion);

  return {
    id: cleanString(input?.id) || cleanString(input?.localId) || `local-${Date.parse(createdAt)}`,
    name: cleanString(input?.name || input?.displayName),
    place: cleanString(input?.place || input?.placeName),
    city: cleanString(input?.city),
    region: cleanString(input?.region),
    country: cleanString(input?.country),
    bioregion: normalizePublicBioregion(knownBioregion || bioregion?.name),
    ...(bioregion?.id ? { bioregionId: bioregion.id, bioregionSource: bioregion.source } : {}),
    lat,
    long,
    role: cleanString(input?.role || input?.intent),
    themes: normalizeThemes(input?.themes),
    publicNote: cleanString(input?.publicNote),
    status: 'pending',
    source: 'local-pending',
    createdAt,
  };
}

export function loadLocalPendingNodes(storage?: PendingMapNodeStorage | null): OptimisticPendingMapNode[] {
  if (!storage) return [];

  try {
    const raw = storage.getItem(PENDING_NODE_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((node) => createOptimisticPendingNode(node, node.createdAt || new Date()))
      .filter((node) => node.lat !== null && node.long !== null);
  } catch {
    return [];
  }
}

export function saveLocalPendingNode(
  storage: PendingMapNodeStorage | null | undefined,
  input: UnknownRecord,
  now: Date | string = new Date()
): OptimisticPendingMapNode | null {
  if (!storage) return null;

  const node = createOptimisticPendingNode(input, now);
  const existing = loadLocalPendingNodes(storage);
  const next = [...existing.filter((item) => item.id !== node.id), node];
  storage.setItem(PENDING_NODE_STORAGE_KEY, JSON.stringify(next));
  return node;
}

export function removeLocalPendingNode(
  storage: PendingMapNodeStorage | null | undefined,
  id: string
): OptimisticPendingMapNode[] {
  if (!storage) return [];

  const nodeId = cleanString(id);
  if (!nodeId) return loadLocalPendingNodes(storage);

  const next = loadLocalPendingNodes(storage).filter((item) => item.id !== nodeId);
  storage.setItem(PENDING_NODE_STORAGE_KEY, JSON.stringify(next));
  return next;
}

// A coordinate+name fingerprint used to recognize a local optimistic node once
// the same submission resurfaces as an approved public node. Coordinates round
// to two decimals (~1.1km) so an approved node that was nudged slightly during
// review still matches; an empty string means the node lacks enough public
// signal to reconcile and is left in place.
export function localPendingNodeSignature(node: UnknownRecord | null | undefined): string {
  const name = cleanString(node?.name ?? node?.displayName)
    .toLowerCase()
    .replace(/\s+/g, ' ');
  const lat = normalizeNumber(node?.lat ?? node?.latitude);
  const long = normalizeNumber(node?.long ?? node?.longitude);
  if (!name || lat === null || long === null) return '';
  return `${name}|${lat.toFixed(2)}|${long.toFixed(2)}`;
}

// Drops local pending nodes that now exist as approved public nodes so a browser
// that submitted in moderated mode stops drawing a duplicate after a steward
// approves it. Returns the removed nodes so the caller can clear their DOM.
export function reconcileLocalPendingNodes(
  storage: PendingMapNodeStorage | null | undefined,
  approvedNodes: UnknownRecord[] | null | undefined
): { removed: OptimisticPendingMapNode[]; remaining: OptimisticPendingMapNode[] } {
  const pending = loadLocalPendingNodes(storage);
  if (!storage || pending.length === 0) {
    return { removed: [], remaining: pending };
  }

  const approvedSignatures = new Set(
    (Array.isArray(approvedNodes) ? approvedNodes : [])
      .map((node) => localPendingNodeSignature(node))
      .filter(Boolean)
  );
  if (approvedSignatures.size === 0) {
    return { removed: [], remaining: pending };
  }

  const removed: OptimisticPendingMapNode[] = [];
  const remaining: OptimisticPendingMapNode[] = [];
  for (const node of pending) {
    const signature = localPendingNodeSignature(node);
    if (signature && approvedSignatures.has(signature)) {
      removed.push(node);
    } else {
      remaining.push(node);
    }
  }

  if (removed.length > 0) {
    storage.setItem(PENDING_NODE_STORAGE_KEY, JSON.stringify(remaining));
  }
  return { removed, remaining };
}
