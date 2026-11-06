import { isPublicMapCoordinate, parseMapCoordinate } from './map-locations.js';

type UnknownRecord = Record<string, any>;

export type MapNodeStatus = 'pending' | 'approved' | 'rejected' | 'archived';
export type PublicBioregionSource = 'resolve-ecoregions-2017' | 'one-earth' | string;

export interface PublicMapNode {
  id: string;
  name: string;
  place: string;
  city: string;
  region: string;
  country: string;
  // Decision D2 (2026-11-06): the map no longer derives or publishes ecoregions.
  // The field stays in the contract and is always empty; bioregionId and
  // bioregionSource are never set.
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
      // Absent when the submission was resolved in Directus, which records no
      // decision timestamp on the access link.
      reviewedAt?: string;
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

// Strict: blank, null and boolean values are missing, never 0.
const normalizeNumber = parseMapCoordinate;

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

// Approved nodes reach the public map only at a plausible point. A stored pole,
// antimeridian or 0,0 is left off rather than drawn at the map's edge; the row
// itself is untouched so a repair or an owner edit can still fix it.
export function toPublicMapNode(submission: UnknownRecord): PublicMapNode | null {
  if (!submission || submission.status !== 'approved') return null;

  const lat = normalizeNumber(submission.lat);
  const long = normalizeNumber(submission.long);
  if (lat === null || long === null || !isPublicMapCoordinate(lat, long)) return null;

  return {
    id: cleanString(submission.id),
    name: cleanString(submission.name || submission.displayName),
    place: cleanString(submission.place || submission.placeName),
    city: cleanString(submission.city),
    region: cleanString(submission.region),
    country: cleanString(submission.country),
    // D2: stored region labels (ecoregion names written at intake until
    // 2026-11) are not published.
    bioregion: '',
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

  return {
    id: cleanString(input?.id) || cleanString(input?.localId) || `local-${Date.parse(createdAt)}`,
    name: cleanString(input?.name || input?.displayName),
    place: cleanString(input?.place || input?.placeName),
    city: cleanString(input?.city),
    region: cleanString(input?.region),
    country: cleanString(input?.country),
    bioregion: '',
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

    // Browsers that used the June 2026 add-node step can still hold a pending
    // node at 0,0 or a pole; it is dropped rather than drawn.
    return parsed
      .map((node) => createOptimisticPendingNode(node, node.createdAt || new Date()))
      .filter((node) => isPublicMapCoordinate(node.lat, node.long));
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
