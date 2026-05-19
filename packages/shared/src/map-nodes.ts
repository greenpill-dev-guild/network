type UnknownRecord = Record<string, any>;

export type MapNodeStatus = 'pending' | 'approved' | 'rejected' | 'archived';

export interface PublicMapNode {
  id: string;
  name: string;
  place: string;
  city: string;
  region: string;
  country: string;
  lat: number;
  long: number;
  role: string;
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
  'lat',
  'long',
  'role',
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

const normalizeThemes = (themes: unknown): string[] => (
  Array.isArray(themes)
    ? themes.map(cleanString).filter(Boolean)
    : []
);

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

  return {
    id: cleanString(submission.id),
    name: cleanString(submission.name || submission.displayName),
    place: cleanString(submission.place || submission.placeName),
    city: cleanString(submission.city),
    region: cleanString(submission.region),
    country: cleanString(submission.country),
    lat,
    long,
    role: cleanString(submission.role || submission.intent),
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
