export const MAP_NODE_STATUSES = Object.freeze(['pending', 'approved', 'rejected', 'archived']);

export const PRIVATE_MAP_NODE_FIELDS = Object.freeze([
  'email',
  'privateEmail',
  'private_email',
  'contactConsent',
  'contact_consent',
  'rawNote',
  'raw_note',
  'reviewNotes',
  'review_notes',
  'ipAddress',
  'ip_address',
  'rateLimitKey',
  'rate_limit_key',
  'spamScore',
  'spam_score',
  'spamSignals',
  'spam_signals',
  'userAgent',
  'user_agent',
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

export const PENDING_NODE_STORAGE_KEY = 'greenpill.pendingMapNodes.v1';
export const PENDING_NODE_UPDATED_EVENT = 'greenpill:pending-map-node';

const cleanString = (value) => (typeof value === 'string' ? value.trim() : '');
const normalizeFieldKey = (key) => cleanString(key).toLowerCase().replace(/[^a-z0-9]/g, '');
const PRIVATE_MAP_NODE_FIELD_KEYS = new Set(PRIVATE_MAP_NODE_FIELDS.map(normalizeFieldKey));
const PRIVATE_MAP_NODE_FIELD_PATTERNS = Object.freeze([
  'email',
  'contactconsent',
  'rawnote',
  'reviewnotes',
  'ipaddress',
  'ratelimit',
  'spam',
  'useragent',
]);

const normalizeNumber = (value) => {
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) ? number : null;
};

const normalizeThemes = (themes) => (
  Array.isArray(themes)
    ? themes.map(cleanString).filter(Boolean)
    : []
);

export function containsPrivateMapNodeField(value, seen = new Set()) {
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

export function toPublicMapNode(submission) {
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

export function createOptimisticPendingNode(input, now = new Date()) {
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

export function loadLocalPendingNodes(storage) {
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

export function saveLocalPendingNode(storage, input, now = new Date()) {
  if (!storage) return null;

  const node = createOptimisticPendingNode(input, now);
  const existing = loadLocalPendingNodes(storage);
  const next = [...existing.filter((item) => item.id !== node.id), node];
  storage.setItem(PENDING_NODE_STORAGE_KEY, JSON.stringify(next));
  return node;
}

export function removeLocalPendingNode(storage, id) {
  if (!storage) return [];

  const nodeId = cleanString(id);
  if (!nodeId) return loadLocalPendingNodes(storage);

  const next = loadLocalPendingNodes(storage).filter((item) => item.id !== nodeId);
  storage.setItem(PENDING_NODE_STORAGE_KEY, JSON.stringify(next));
  return next;
}
