import {
  containsPrivateChapterImpactField,
} from './chapter-impact.js';
import {
  containsPrivateMapNodeField,
  derivePublicBioregionMetadataFromCoordinates,
  normalizePublicMapThemeSlugs,
  toPublicMapNode,
  type PublicBioregionSource,
} from './map-nodes.js';

type UnknownRecord = Record<string, any>;

export type PublicMapNodeType = 'chapter' | 'steward' | 'member' | 'project' | 'place';
export type PublicMapNodeSize = 'S' | 'M' | 'L';
export type PublicMapIntakeMode = 'moderated' | 'live';
export type PublicMapSourceStatusValue = 'ok' | 'empty' | 'not_configured' | 'unavailable';
export type PublicCountId = 'chapters' | 'guilds' | 'members' | 'stories' | 'topics' | 'libraryResources';
export type PublicCountStatus = 'ok' | 'not_configured' | 'unavailable';

export interface PublicMapTheme {
  id: string;
  label: string;
  color: string;
  icon: string;
}

export interface PublicMapStateNode {
  id: string;
  sourceId: string;
  slug?: string;
  type: PublicMapNodeType;
  name: string;
  place: string;
  city: string;
  region: string;
  country: string;
  bioregion?: string;
  bioregionId?: string;
  bioregionSource?: PublicBioregionSource;
  lat: number;
  long: number;
  href?: string;
  role?: string;
  chapterSlug?: string;
  profileUrl?: string;
  publicNote?: string;
  status: string;
  size: PublicMapNodeSize;
  themes: string[];
  primaryTheme: string;
  source: 'chapter-content' | 'approved-submission';
}

export interface PublicMapStateEdge {
  id: string;
  from: string;
  to: string;
  kind: string;
  theme: string;
  bioregion?: string;
  bioregionId?: string;
  bioregionSource?: PublicBioregionSource;
  weight: number;
  source: 'generated-theme-match' | 'source-backed' | string;
}

export interface PublicMapSourceStatus {
  source: string;
  status: PublicMapSourceStatusValue;
  count: number;
  message: string;
}

export interface PublicMapStatePayload {
  version: 1;
  generatedAt: string;
  themes: PublicMapTheme[];
  intakeMode: PublicMapIntakeMode;
  nodes: PublicMapStateNode[];
  edges: PublicMapStateEdge[];
  counts: {
    totalNodes: number;
    chapterNodes: number;
    approvedSubmittedNodes: number;
    edges: number;
    byType: Record<string, number>;
    byStatus: Record<string, number>;
    byTheme: Record<string, number>;
    sources: PublicMapSourceStatus[];
  };
}

export interface PublicCountMetric {
  id: PublicCountId;
  label: string;
  value: number | null;
  status: PublicCountStatus;
  source: string;
  message: string;
}

export interface PublicAggregateCountsPayload {
  version: 1;
  generatedAt: string;
  counts: PublicCountMetric[];
}

export const PUBLIC_MAP_STATE_VERSION = 1;
export const PUBLIC_AGGREGATE_COUNTS_VERSION = 1;

export const PUBLIC_MAP_INTAKE_MODES: readonly PublicMapIntakeMode[] = Object.freeze([
  'moderated',
  'live',
]);

export const PUBLIC_MAP_NODE_TYPES: readonly PublicMapNodeType[] = Object.freeze([
  'chapter',
  'steward',
  'member',
  'project',
  'place',
]);

export const PUBLIC_MAP_NODE_SIZES: readonly PublicMapNodeSize[] = Object.freeze(['S', 'M', 'L']);

export const PUBLIC_MAP_SOURCE_STATUSES: readonly PublicMapSourceStatusValue[] = Object.freeze([
  'ok',
  'empty',
  'not_configured',
  'unavailable',
]);

export const PUBLIC_COUNT_IDS: readonly PublicCountId[] = Object.freeze([
  'chapters',
  'guilds',
  'members',
  'stories',
  'topics',
  'libraryResources',
]);

export const PUBLIC_COUNT_STATUSES: readonly PublicCountStatus[] = Object.freeze([
  'ok',
  'not_configured',
  'unavailable',
]);

export const PUBLIC_MAP_THEMES: readonly PublicMapTheme[] = Object.freeze([
  { id: 'water', label: 'Water', color: '#2BA7FF', icon: 'wave' },
  { id: 'waste', label: 'Waste', color: '#8E6CFF', icon: 'recycle' },
  { id: 'opensrc', label: 'Open Source', color: '#00D5E8', icon: 'fork' },
  { id: 'impact', label: 'Impact Tracking', color: '#34D399', icon: 'pulse' },
  { id: 'trees', label: 'Trees & Biodiversity', color: '#75D063', icon: 'tree' },
  { id: 'food', label: 'Food & Farms', color: '#C6D84F', icon: 'grain' },
  { id: 'energy', label: 'Clean Energy', color: '#FFD84D', icon: 'sun' },
  { id: 'education', label: 'Education', color: '#1A9CFF', icon: 'mortar' },
  { id: 'events', label: 'Local Events', color: '#FF9F1C', icon: 'flag' },
  { id: 'funding', label: 'Grants & Funding', color: '#FF6B35', icon: 'coin' },
  { id: 'mutual', label: 'Mutual Aid', color: '#F472B6', icon: 'heart' },
  { id: 'stories', label: 'Storytelling', color: '#D946EF', icon: 'book' },
  { id: 'ai', label: 'AI & Automation', color: '#B067FF', icon: 'circuit' },
  { id: 'desci', label: 'DeSci', color: '#536DFE', icon: 'beaker' },
  { id: 'gov', label: 'Local Governance', color: '#7C9CFF', icon: 'gavel' },
  { id: 'public', label: 'Public Goods', color: '#B9A6C9', icon: 'commons' },
]);

const COUNT_LABELS: Readonly<Record<PublicCountId, string>> = Object.freeze({
  chapters: 'Chapters',
  guilds: 'Guilds',
  members: 'Members',
  stories: 'Stories',
  topics: 'Topics',
  libraryResources: 'Library resources',
});

const PRIVATE_MAP_STATE_FIELD_PATTERNS = Object.freeze([
  'private',
  'raw',
  'review',
  'email',
  'contact',
  'token',
  'owner',
  'ipaddress',
  'requestip',
  'requesterip',
  'ratelimit',
  'spam',
  'useragent',
  'requestuseragent',
  'requesteruseragent',
  'pending',
  'updaterequest',
  'revision',
  'proposed',
  'admin',
]);

const cleanString = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');
const normalizeFieldKey = (key: unknown): string => cleanString(key).toLowerCase().replace(/[^a-z0-9]/g, '');
const isPresent = <T>(value: T | null | undefined): value is T => value !== null && value !== undefined;

const normalizeNumber = (value: unknown): number | null => {
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) ? number : null;
};

const normalizeInteger = (value: unknown): number => {
  const number = normalizeNumber(value);
  return number === null ? 0 : Math.max(0, Math.trunc(number));
};

const toIso = (value: Date | string | null | undefined): string => {
  if (!value) return new Date().toISOString();
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.valueOf()) ? new Date().toISOString() : date.toISOString();
};

const cleanHref = (value: unknown): string => {
  const href = cleanString(value);
  if (href.startsWith('/') || href.startsWith('https://') || href.startsWith('http://')) {
    return href;
  }
  return '';
};

const normalizeThemes = normalizePublicMapThemeSlugs;

const makeIdPart = (value: unknown, fallback = 'node'): string => (
  cleanString(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || fallback
);

const normalizeMapNodeType = (value: unknown, fallback: PublicMapNodeType = 'member'): PublicMapNodeType => {
  const role = cleanString(value).toLowerCase();
  if ((PUBLIC_MAP_NODE_TYPES as readonly string[]).includes(role)) return role as PublicMapNodeType;
  if (role.includes('steward') || role.includes('organizer') || role.includes('coordinator')) {
    return 'steward';
  }
  if (role.includes('project') || role.includes('guild')) return 'project';
  if (role.includes('place') || role.includes('space') || role.includes('chapter house')) return 'place';
  if (role.includes('chapter')) return 'member';
  return fallback;
};

const mapSizeForType = (type: PublicMapNodeType): PublicMapNodeSize => {
  if (type === 'chapter') return 'L';
  if (type === 'steward' || type === 'project') return 'M';
  return 'S';
};

const normalizeSourceStatus = (status: unknown): PublicMapSourceStatusValue => {
  const cleaned = cleanString(status);
  return (PUBLIC_MAP_SOURCE_STATUSES as readonly string[]).includes(cleaned)
    ? cleaned as PublicMapSourceStatusValue
    : 'unavailable';
};

const normalizeCountStatus = (status: unknown): PublicCountStatus => {
  const cleaned = cleanString(status);
  return (PUBLIC_COUNT_STATUSES as readonly string[]).includes(cleaned)
    ? cleaned as PublicCountStatus
    : 'not_configured';
};

export const normalizePublicMapIntakeMode = (mode?: string): PublicMapIntakeMode => {
  const cleaned = cleanString(mode);
  return (PUBLIC_MAP_INTAKE_MODES as readonly string[]).includes(cleaned)
    ? cleaned as PublicMapIntakeMode
    : 'moderated';
};

export function toPublicMapTheme(theme: Partial<PublicMapTheme> & UnknownRecord): PublicMapTheme | null {
  const id = cleanString(theme?.id);
  if (!id) return null;
  return {
    id,
    label: cleanString(theme?.label) || id,
    color: cleanString(theme?.color),
    icon: cleanString(theme?.icon),
  };
}

export function toPublicMapStateChapterNode(location: UnknownRecord): PublicMapStateNode | null {
  const lat = normalizeNumber(location?.lat ?? location?.latitude);
  const long = normalizeNumber(location?.long ?? location?.lng ?? location?.longitude);
  if (lat === null || long === null) return null;

  const slug = cleanString(location?.slug ?? location?.id);
  const sourceId = slug || makeIdPart(location?.name);
  const name = cleanString(location?.name);
  if (!name) return null;

  const themes = normalizeThemes(location?.themes ?? location?.themeSlugs);
  const bioregion = derivePublicBioregionMetadataFromCoordinates(
    lat,
    long,
    location?.bioregion,
    location?.bioregionId ?? location?.bioregion_id,
    location?.bioregionSource ?? location?.bioregion_source
  );
  return {
    id: `chapter:${sourceId}`,
    sourceId,
    slug,
    type: 'chapter',
    name,
    place: cleanString(location?.place ?? location?.city ?? name),
    city: cleanString(location?.city),
    region: cleanString(location?.region),
    country: cleanString(location?.country),
    ...(bioregion?.name ? { bioregion: bioregion.name, bioregionId: bioregion.id, bioregionSource: bioregion.source } : {}),
    lat,
    long,
    href: cleanHref(location?.href ?? location?.link ?? (slug ? `/chapters/${slug}` : '')),
    status: cleanString(location?.status) || 'active',
    size: 'L',
    themes,
    primaryTheme: themes[0] || '',
    source: 'chapter-content',
  };
}

export function toPublicMapStateSubmittedNode(input: UnknownRecord): PublicMapStateNode | null {
  const node = toPublicMapNode(input);
  if (!node) return null;

  const type = normalizeMapNodeType(input?.type ?? input?.nodeType ?? node.role);
  const themes = normalizeThemes(node.themes);
  return {
    id: `submission:${node.id}`,
    sourceId: node.id,
    type,
    name: node.name,
    place: node.place,
    city: node.city,
    region: node.region,
    country: node.country,
    bioregion: node.bioregion,
    ...(node.bioregionId ? { bioregionId: node.bioregionId, bioregionSource: node.bioregionSource } : {}),
    lat: node.lat,
    long: node.long,
    href: cleanHref(input?.href ?? input?.profileUrl ?? node.profileUrl),
    role: node.role,
    chapterSlug: cleanString(input?.chapterSlug ?? input?.chapter_slug ?? node.chapterSlug),
    profileUrl: cleanHref(input?.profileUrl ?? input?.profile_url ?? node.profileUrl),
    publicNote: node.publicNote,
    status: 'approved',
    size: mapSizeForType(type),
    themes,
    primaryTheme: themes[0] || '',
    source: 'approved-submission',
  };
}

export function normalizePublicMapSourceStatus(
  input: Partial<PublicMapSourceStatus> & UnknownRecord,
  fallbackSource = ''
): PublicMapSourceStatus {
  return {
    source: cleanString(input?.source) || cleanString(fallbackSource),
    status: normalizeSourceStatus(input?.status),
    count: normalizeInteger(input?.count),
    message: cleanString(input?.message),
  };
}

const distanceDegrees = (a: PublicMapStateNode, b: PublicMapStateNode): number => (
  Math.hypot(
    a.lat - b.lat,
    (a.long - b.long) * Math.cos(((a.lat + b.lat) / 2) * Math.PI / 180)
  )
);

const sharedThemes = (a: PublicMapStateNode, b: PublicMapStateNode): string[] => (
  a.themes.filter((theme) => b.themes.includes(theme))
);

// Edge colour is the only relationship signal on the public map, so prefer a
// specific shared theme over the near-ubiquitous `public` (Public Goods) theme;
// keep `public` only when it is the sole shared theme. Deterministic — the first
// match preserves node A's theme order.
const PUBLIC_THEME_SLUG = 'public';
const firstSpecificTheme = (themes: string[]): string => (
  themes.find((theme) => theme && theme !== PUBLIC_THEME_SLUG) ?? ''
);
const pickSharedTheme = (shared: string[]): string => firstSpecificTheme(shared) || shared[0] || '';

const hasPublicBioregion = (value: unknown): value is string => {
  const bioregion = cleanString(value);
  return Boolean(bioregion) && bioregion.toLowerCase() !== 'bioregion pending';
};

export function generatePublicMapEdges(
  nodes: PublicMapStateNode[],
  { limit = 160, perNodeLimit = 4 }: { limit?: number; perNodeLimit?: number } = {}
): PublicMapStateEdge[] {
  const people = nodes.filter((node) => node.type === 'member' || node.type === 'steward');
  const edges: PublicMapStateEdge[] = [];
  const edgeKeys = new Set<string>();
  const nodeEdgeCounts = new Map<string, number>();

  const addEdge = ({
    from,
    to,
    kind,
    theme,
    bioregion = '',
    bioregionId = '',
    bioregionSource = '',
    weight = 1,
    source = 'generated-theme-match',
  }: {
    from: PublicMapStateNode;
    to: PublicMapStateNode;
    kind: string;
    theme: string;
    bioregion?: string;
    bioregionId?: string;
    bioregionSource?: PublicBioregionSource;
    weight?: number;
    source?: PublicMapStateEdge['source'];
  }) => {
    if (from.id === to.id || edges.length >= limit) return;
    const key = `${kind}:${[from.id, to.id].sort().join(':')}`;
    if (edgeKeys.has(key)) return;
    if ((nodeEdgeCounts.get(from.id) ?? 0) >= perNodeLimit) return;
    if ((nodeEdgeCounts.get(to.id) ?? 0) >= perNodeLimit) return;
    edgeKeys.add(key);
    nodeEdgeCounts.set(from.id, (nodeEdgeCounts.get(from.id) ?? 0) + 1);
    nodeEdgeCounts.set(to.id, (nodeEdgeCounts.get(to.id) ?? 0) + 1);
    edges.push({
      id: `edge:${from.id}:${to.id}:${theme || 'related'}`,
      from: from.id,
      to: to.id,
      kind,
      theme,
      ...(bioregion ? { bioregion } : {}),
      ...(bioregionId ? { bioregionId, bioregionSource } : {}),
      weight: Math.min(3, Math.max(1, weight)),
      source,
    });
  };

  // Relationships are person-to-person only (steward↔steward, steward↔member,
  // member↔member). Chapters stay as geographic anchors with no relationship
  // threads — there is intentionally no steward→chapter edge.
  const candidates: Array<{
    a: PublicMapStateNode;
    b: PublicMapStateNode;
    shared: string[];
    sharedBioregion: string;
    sharedBioregionId: string;
    sharedBioregionSource: PublicBioregionSource | '';
    distance: number;
    score: number;
  }> = [];

  for (let i = 0; i < people.length; i += 1) {
    for (let j = i + 1; j < people.length; j += 1) {
      const shared = sharedThemes(people[i], people[j]);
      if (!shared.length) continue;
      const aBioregion = cleanString(people[i].bioregion);
      const bBioregion = cleanString(people[j].bioregion);
      const aBioregionId = cleanString(people[i].bioregionId);
      const bBioregionId = cleanString(people[j].bioregionId);
      const sharedBioregionId = aBioregionId && aBioregionId === bBioregionId ? aBioregionId : '';
      const sharedBioregion = sharedBioregionId
        ? aBioregion || bBioregion
        : (
            hasPublicBioregion(aBioregion) && aBioregion === bBioregion
              ? aBioregion
              : ''
          );
      const sharedBioregionSource = sharedBioregionId
        ? people[i].bioregionSource || people[j].bioregionSource || 'resolve-ecoregions-2017'
        : '';
      const distance = distanceDegrees(people[i], people[j]);
      candidates.push({
        a: people[i],
        b: people[j],
        shared,
        sharedBioregion,
        sharedBioregionId,
        sharedBioregionSource,
        distance,
        score: shared.length * 4 + (sharedBioregion ? 2 : 0) - Math.min(distance, 90) / 60,
      });
    }
  }

  for (const candidate of candidates.sort((a, b) => (
    b.score - a.score ||
    b.shared.length - a.shared.length ||
    a.distance - b.distance ||
    a.a.name.localeCompare(b.a.name) ||
    a.b.name.localeCompare(b.b.name)
  ))) {
    addEdge({
      from: candidate.a,
      to: candidate.b,
      kind: 'shared-theme',
      theme: pickSharedTheme(candidate.shared),
      bioregion: candidate.sharedBioregion,
      bioregionId: candidate.sharedBioregionId,
      bioregionSource: candidate.sharedBioregionSource,
      weight: candidate.shared.length + (candidate.sharedBioregion ? 1 : 0),
    });
    if (edges.length >= limit) return edges;
  }

  return edges;
}

function normalizeEdge(edge: Partial<PublicMapStateEdge> & UnknownRecord): PublicMapStateEdge | null {
  const from = cleanString(edge?.from);
  const to = cleanString(edge?.to);
  if (!from || !to) return null;
  return {
    id: cleanString(edge?.id) || `edge:${from}:${to}`,
    from,
    to,
    kind: cleanString(edge?.kind) || 'related',
    theme: cleanString(edge?.theme),
    ...(cleanString(edge?.bioregion) ? { bioregion: cleanString(edge?.bioregion) } : {}),
    ...(cleanString(edge?.bioregionId ?? edge?.bioregion_id)
      ? {
          bioregionId: cleanString(edge?.bioregionId ?? edge?.bioregion_id),
          bioregionSource: cleanString(edge?.bioregionSource ?? edge?.bioregion_source) || 'resolve-ecoregions-2017',
        }
      : {}),
    weight: Math.max(1, normalizeInteger(edge?.weight) || 1),
    source: cleanString(edge?.source) || 'source-backed',
  };
}

function buildMapStateCounts(
  nodes: PublicMapStateNode[],
  edges: PublicMapStateEdge[],
  sourceStatus: PublicMapSourceStatus[]
): PublicMapStatePayload['counts'] {
  const byType: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  const byTheme: Record<string, number> = {};

  for (const node of nodes) {
    byType[node.type] = (byType[node.type] ?? 0) + 1;
    byStatus[node.status] = (byStatus[node.status] ?? 0) + 1;
    for (const theme of node.themes) {
      byTheme[theme] = (byTheme[theme] ?? 0) + 1;
    }
  }

  return {
    totalNodes: nodes.length,
    chapterNodes: nodes.filter((node) => node.type === 'chapter').length,
    approvedSubmittedNodes: nodes.filter((node) => node.source === 'approved-submission').length,
    edges: edges.length,
    byType,
    byStatus,
    byTheme,
    sources: sourceStatus,
  };
}

function countNodesForSource(nodes: PublicMapStateNode[], source: string): number | null {
  if (source === 'chapter-locations') {
    return nodes.filter((node) => node.type === 'chapter').length;
  }
  if (source === 'approved-map-nodes') {
    return nodes.filter((node) => node.source === 'approved-submission').length;
  }
  return null;
}

function normalizeMapStateSourceStatuses(
  sourceStatus: Array<Partial<PublicMapSourceStatus> & UnknownRecord> | undefined,
  nodes: PublicMapStateNode[]
): PublicMapSourceStatus[] {
  const sourceCounts = new Map([
    ['chapter-locations', countNodesForSource(nodes, 'chapter-locations')],
    ['approved-map-nodes', countNodesForSource(nodes, 'approved-map-nodes')],
  ]);

  const normalized = Array.isArray(sourceStatus) && sourceStatus.length
    ? sourceStatus.map((status) => {
      const source = cleanString(status?.source);
      const normalizedCount = sourceCounts.has(source) ? sourceCounts.get(source) : null;
      const next = normalizePublicMapSourceStatus({
        ...status,
        count: normalizedCount ?? status?.count,
      });
      return {
        ...next,
        status: next.status === 'ok' && next.count === 0 ? 'empty' as const : next.status,
      };
    }).filter((status) => status.source)
    : [];

  if (normalized.length) return normalized;

  return [
    normalizePublicMapSourceStatus({
      source: 'chapter-locations',
      status: (sourceCounts.get('chapter-locations') ?? 0) > 0 ? 'ok' : 'empty',
      count: sourceCounts.get('chapter-locations') ?? 0,
    }),
    normalizePublicMapSourceStatus({
      source: 'approved-map-nodes',
      status: (sourceCounts.get('approved-map-nodes') ?? 0) > 0 ? 'ok' : 'empty',
      count: sourceCounts.get('approved-map-nodes') ?? 0,
    }),
  ];
}

export function toPublicMapStatePayload({
  chapterLocations = [],
  publicMapNodes = [],
  themes = PUBLIC_MAP_THEMES,
  edges,
  sourceStatus,
  intakeMode = 'moderated',
  generatedAt = new Date(),
}: {
  chapterLocations?: UnknownRecord[];
  publicMapNodes?: UnknownRecord[];
  themes?: Array<Partial<PublicMapTheme> & UnknownRecord> | readonly PublicMapTheme[];
  edges?: Array<Partial<PublicMapStateEdge> & UnknownRecord>;
  sourceStatus?: Array<Partial<PublicMapSourceStatus> & UnknownRecord>;
  intakeMode?: PublicMapIntakeMode | string;
  generatedAt?: Date | string;
} = {}): PublicMapStatePayload {
  const publicThemes = themes
    .map(toPublicMapTheme)
    .filter(isPresent);
  const nodes = [
    ...chapterLocations.map(toPublicMapStateChapterNode).filter(isPresent),
    ...publicMapNodes.map(toPublicMapStateSubmittedNode).filter(isPresent),
  ]
    .sort((a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name));
  const uniqueNodes = [...new Map(nodes.map((node) => [node.id, node])).values()];
  const publicEdges = (Array.isArray(edges)
    ? edges.map(normalizeEdge).filter(isPresent)
    : generatePublicMapEdges(uniqueNodes))
    .filter((edge) => (
      uniqueNodes.some((node) => node.id === edge.from) &&
      uniqueNodes.some((node) => node.id === edge.to)
    ));
  const publicSourceStatus = normalizeMapStateSourceStatuses(sourceStatus, uniqueNodes);

  return assertPublicMapStatePayload({
    version: PUBLIC_MAP_STATE_VERSION,
    generatedAt: toIso(generatedAt),
    themes: publicThemes,
    intakeMode: normalizePublicMapIntakeMode(intakeMode),
    nodes: uniqueNodes,
    edges: publicEdges,
    counts: buildMapStateCounts(uniqueNodes, publicEdges, publicSourceStatus),
  });
}

export function containsPrivateMapStateField(value: unknown, seen: Set<object> = new Set()): boolean {
  if (containsPrivateMapNodeField(value) || containsPrivateChapterImpactField(value)) {
    return true;
  }
  if (!value || typeof value !== 'object') return false;
  if (seen.has(value)) return false;
  seen.add(value);

  return Object.entries(value).some(([key, nestedValue]) => {
    const normalizedKey = normalizeFieldKey(key);
    return (
      PRIVATE_MAP_STATE_FIELD_PATTERNS.some((pattern) => normalizedKey.includes(pattern)) ||
      containsPrivateMapStateField(nestedValue, seen)
    );
  });
}

function isPublicPersonMapNodeType(type: unknown): boolean {
  const normalizedType = cleanString(type);
  return normalizedType === 'member' || normalizedType === 'steward';
}

export function assertPublicMapStatePayload<T>(payload: T): T {
  if (containsPrivateMapStateField(payload)) {
    throw new Error('Public map-state payload contains private fields');
  }

  const nodes = Array.isArray((payload as UnknownRecord)?.nodes) ? (payload as UnknownRecord).nodes : [];
  const nodesById = new Map<string, UnknownRecord>();
  for (const node of nodes) {
    const id = cleanString(node?.id);
    if (id) nodesById.set(id, node);
  }

  const hasPendingNode = nodes.some((node: UnknownRecord) => (
    cleanString(node?.status).toLowerCase() === 'pending' ||
    cleanString(node?.source).toLowerCase().includes('pending')
  ));
  if (hasPendingNode) {
    throw new Error('Public map-state payload contains pending nodes');
  }

  const edges = Array.isArray((payload as UnknownRecord)?.edges) ? (payload as UnknownRecord).edges : [];
  for (const edge of edges) {
    const fromId = cleanString(edge?.from);
    const toId = cleanString(edge?.to);
    if (!fromId || !toId || fromId === toId) {
      throw new Error('Public map-state payload contains invalid edge endpoints');
    }

    const fromNode = nodesById.get(fromId);
    const toNode = nodesById.get(toId);
    if (!fromNode || !toNode) {
      throw new Error('Public map-state payload contains edge with unknown endpoint');
    }

    if (!isPublicPersonMapNodeType(fromNode.type) || !isPublicPersonMapNodeType(toNode.type)) {
      throw new Error('Public map-state payload contains non-person edge endpoint');
    }
  }

  return payload;
}

function normalizeCountMetric(id: PublicCountId, input: number | Partial<PublicCountMetric> = {}): PublicCountMetric {
  const source = typeof input === 'number' ? '' : cleanString(input?.source);
  const status = normalizeCountStatus(typeof input === 'number' ? 'ok' : input?.status);
  const numericValue = typeof input === 'number' ? input : input?.value;
  return {
    id,
    label: COUNT_LABELS[id],
    value: status === 'ok' ? normalizeInteger(numericValue) : null,
    status,
    source,
    message: typeof input === 'number' ? '' : cleanString(input?.message),
  };
}

export function toPublicAggregateCountsPayload({
  chapters,
  guilds,
  members,
  stories,
  topics,
  libraryResources,
  generatedAt = new Date(),
}: Partial<Record<PublicCountId, number | Partial<PublicCountMetric>>> & {
  generatedAt?: Date | string;
} = {}): PublicAggregateCountsPayload {
  return assertPublicAggregateCountsPayload({
    version: PUBLIC_AGGREGATE_COUNTS_VERSION,
    generatedAt: toIso(generatedAt),
    counts: [
      normalizeCountMetric('chapters', chapters),
      normalizeCountMetric('guilds', guilds),
      normalizeCountMetric('members', members),
      normalizeCountMetric('stories', stories),
      normalizeCountMetric('topics', topics),
      normalizeCountMetric('libraryResources', libraryResources),
    ],
  });
}

export function toPublicAggregateCountsFromMapState(
  mapState: Partial<PublicMapStatePayload>,
  overrides: Partial<Record<PublicCountId, number | Partial<PublicCountMetric>>> & {
    generatedAt?: Date | string;
  } = {}
): PublicAggregateCountsPayload {
  const chapterSource = mapState?.counts?.sources?.find((source) => source.source === 'chapter-locations');
  const chapterSourceStatus = chapterSource?.status === 'ok' || chapterSource?.status === 'empty'
    ? 'ok'
    : normalizeCountStatus(chapterSource?.status);

  return toPublicAggregateCountsPayload({
    generatedAt: overrides.generatedAt ?? mapState?.generatedAt ?? new Date(),
    chapters: overrides.chapters ?? {
      value: mapState?.counts?.chapterNodes ?? 0,
      status: chapterSourceStatus,
      source: 'map-state',
      message: chapterSource?.message,
    },
    guilds: overrides.guilds ?? {
      status: 'not_configured',
      source: 'private-admin-boundary',
      message: 'Public guild aggregate source is not configured.',
    },
    members: overrides.members ?? {
      status: 'not_configured',
      source: 'private-admin-boundary',
      message: 'Public member aggregate source is not configured.',
    },
    stories: overrides.stories ?? {
      status: 'not_configured',
      source: 'content-build-boundary',
      message: 'Public story aggregate source is not configured.',
    },
    topics: overrides.topics ?? {
      status: 'not_configured',
      source: 'content-build-boundary',
      message: 'Public topic aggregate source is not configured.',
    },
    libraryResources: overrides.libraryResources ?? {
      status: 'not_configured',
      source: 'content-build-boundary',
      message: 'Public library aggregate source is not configured.',
    },
  });
}

export function assertPublicAggregateCountsPayload<T>(payload: T): T {
  if (containsPrivateMapStateField(payload)) {
    throw new Error('Public aggregate counts payload contains private fields');
  }

  return payload;
}
