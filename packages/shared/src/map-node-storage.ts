type UnknownRecord = Record<string, any>;

export type PublicBioregionSource = 'resolve-ecoregions-2017' | 'one-earth' | string;

export interface PendingMapNodeStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface OptimisticPendingMapNode {
  id: string;
  name: string;
  place: string;
  city: string;
  region: string;
  country: string;
  bioregion: string;
  bioregionId?: string;
  bioregionSource?: PublicBioregionSource;
  lat: number | null;
  long: number | null;
  role: string;
  chapterSlug?: string;
  profileUrl?: string;
  themes: string[];
  publicNote: string;
  status: 'pending';
  source: 'local-pending';
  createdAt: string;
}

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

const normalizeNumber = (value: unknown): number | null => {
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) ? number : null;
};

const normalizePublicBioregion = (value: unknown): string => cleanString(value);

export const normalizePublicMapThemeSlug = (theme: unknown): string => {
  const slug = cleanString(theme);
  return PUBLIC_MAP_THEME_ALIASES[slug] ?? slug;
};

export const normalizePublicMapThemeSlugs = (themes: unknown): string[] => (
  Array.isArray(themes)
    ? [...new Set(themes.map(normalizePublicMapThemeSlug).filter(Boolean))]
    : []
);

export function createLocalPendingMapNode(
  input: UnknownRecord,
  now: Date | string = new Date()
): OptimisticPendingMapNode {
  const createdAt = now instanceof Date ? now.toISOString() : new Date(now).toISOString();

  return {
    id: cleanString(input?.id) || cleanString(input?.localId) || `local-${Date.parse(createdAt)}`,
    name: cleanString(input?.name || input?.displayName),
    place: cleanString(input?.place || input?.placeName),
    city: cleanString(input?.city),
    region: cleanString(input?.region),
    country: cleanString(input?.country),
    bioregion: normalizePublicBioregion(input?.bioregion),
    ...(cleanString(input?.bioregionId ?? input?.bioregion_id)
      ? {
          bioregionId: cleanString(input?.bioregionId ?? input?.bioregion_id),
          bioregionSource: cleanString(input?.bioregionSource ?? input?.bioregion_source) || 'resolve-ecoregions-2017',
        }
      : {}),
    lat: normalizeNumber(input?.lat),
    long: normalizeNumber(input?.long),
    role: cleanString(input?.role || input?.intent),
    chapterSlug: cleanString(input?.chapterSlug ?? input?.chapter_slug),
    profileUrl: cleanString(input?.profileUrl ?? input?.profile_url),
    themes: normalizePublicMapThemeSlugs(input?.themes),
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
      .map((node) => createLocalPendingMapNode(node, node.createdAt || new Date()))
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

  const node = createLocalPendingMapNode(input, now);
  const existing = loadLocalPendingNodes(storage);
  const next = [...existing.filter((item) => item.id !== node.id), node];
  try {
    storage.setItem(PENDING_NODE_STORAGE_KEY, JSON.stringify(next));
  } catch {
    return null;
  }
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

export function localPendingNodeSignature(node: UnknownRecord | null | undefined): string {
  const name = cleanString(node?.name ?? node?.displayName)
    .toLowerCase()
    .replace(/\s+/g, ' ');
  const lat = normalizeNumber(node?.lat ?? node?.latitude);
  const long = normalizeNumber(node?.long ?? node?.longitude);
  if (!name || lat === null || long === null) return '';
  return `${name}|${lat.toFixed(2)}|${long.toFixed(2)}`;
}

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
