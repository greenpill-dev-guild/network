import {
  containsPrivateChapterImpactField,
} from './chapter-impact.js';
import {
  containsPrivateMapNodeField,
  toPublicMapNode,
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
  { id: 'trees', label: 'Trees & Biodiversity', color: '#7BC74D', icon: 'tree' },
  { id: 'food', label: 'Food & Farms', color: '#A8D24A', icon: 'grain' },
  { id: 'water', label: 'Water & Waste', color: '#3FB6A8', icon: 'wave' },
  { id: 'energy', label: 'Clean Energy', color: '#F5CB45', icon: 'sun' },
  { id: 'gov', label: 'Local Governance', color: '#E8B14B', icon: 'gavel' },
  { id: 'events', label: 'Local Events', color: '#E89455', icon: 'flag' },
  { id: 'funding', label: 'Grants & Funding', color: '#E07856', icon: 'coin' },
  { id: 'currency', label: 'Community Currency', color: '#D86A4A', icon: 'currency' },
  { id: 'mutual', label: 'Mutual Aid', color: '#D87B97', icon: 'heart' },
  { id: 'stories', label: 'Storytelling', color: '#E0A6B8', icon: 'book' },
  { id: 'education', label: 'Education', color: '#F0DCA0', icon: 'mortar' },
  { id: 'opensrc', label: 'Open Source', color: '#5CC2D9', icon: 'fork' },
  { id: 'desci', label: 'DeSci', color: '#7DAEE0', icon: 'beaker' },
  { id: 'ai', label: 'AI & Automation', color: '#9B8FD9', icon: 'circuit' },
  { id: 'impact', label: 'Impact Tracking', color: '#86E0B5', icon: 'pulse' },
  { id: 'public', label: 'Public Goods', color: '#C9A4E0', icon: 'commons' },
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

const normalizeThemes = (themes: unknown): string[] => {
  if (!Array.isArray(themes)) return [];
  return [...new Set(themes.map(cleanString).filter(Boolean))];
};

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

const hasPublicBioregion = (value: unknown): value is string => {
  const bioregion = cleanString(value);
  return Boolean(bioregion) && bioregion.toLowerCase() !== 'bioregion pending';
};

export function generatePublicMapEdges(
  nodes: PublicMapStateNode[],
  { limit = 160, perNodeLimit = 4 }: { limit?: number; perNodeLimit?: number } = {}
): PublicMapStateEdge[] {
  const people = nodes.filter((node) => node.type === 'member' || node.type === 'steward');
  const chaptersBySlug = new Map(
    nodes
      .filter((node) => node.type === 'chapter')
      .flatMap((node) => {
        const keys = [node.slug, node.sourceId]
          .map(cleanString)
          .filter(Boolean);
        return keys.map((key) => [key, node] as const);
      })
  );
  const edges: PublicMapStateEdge[] = [];
  const edgeKeys = new Set<string>();
  const nodeEdgeCounts = new Map<string, number>();

  const addEdge = ({
    from,
    to,
    kind,
    theme,
    bioregion = '',
    weight = 1,
    source = 'generated-theme-match',
  }: {
    from: PublicMapStateNode;
    to: PublicMapStateNode;
    kind: string;
    theme: string;
    bioregion?: string;
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
      weight: Math.min(3, Math.max(1, weight)),
      source,
    });
  };

  for (const steward of people.filter((node) => node.type === 'steward')) {
    const chapterSlug = cleanString(steward.chapterSlug);
    const chapter = chapterSlug ? chaptersBySlug.get(chapterSlug) : null;
    if (!chapter) continue;
    const shared = sharedThemes(steward, chapter);
    addEdge({
      from: steward,
      to: chapter,
      kind: 'steward-chapter',
      theme: shared[0] || steward.primaryTheme || chapter.primaryTheme,
      weight: 2,
      source: 'source-backed',
    });
    if (edges.length >= limit) return edges;
  }

  const candidates: Array<{
    a: PublicMapStateNode;
    b: PublicMapStateNode;
    shared: string[];
    sharedBioregion: string;
    distance: number;
    score: number;
  }> = [];

  for (let i = 0; i < people.length; i += 1) {
    for (let j = i + 1; j < people.length; j += 1) {
      const shared = sharedThemes(people[i], people[j]);
      if (!shared.length) continue;
      const aBioregion = cleanString(people[i].bioregion);
      const bBioregion = cleanString(people[j].bioregion);
      const sharedBioregion = hasPublicBioregion(aBioregion) && aBioregion === bBioregion
        ? aBioregion
        : '';
      const distance = distanceDegrees(people[i], people[j]);
      candidates.push({
        a: people[i],
        b: people[j],
        shared,
        sharedBioregion,
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
      theme: candidate.shared[0],
      bioregion: candidate.sharedBioregion,
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

export function assertPublicMapStatePayload<T>(payload: T): T {
  if (containsPrivateMapStateField(payload)) {
    throw new Error('Public map-state payload contains private fields');
  }

  const nodes = Array.isArray((payload as UnknownRecord)?.nodes) ? (payload as UnknownRecord).nodes : [];
  const hasPendingNode = nodes.some((node: UnknownRecord) => (
    cleanString(node?.status).toLowerCase() === 'pending' ||
    cleanString(node?.source).toLowerCase().includes('pending')
  ));
  if (hasPendingNode) {
    throw new Error('Public map-state payload contains pending nodes');
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
