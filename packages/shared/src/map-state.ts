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
  source: 'chapter-content' | 'approved-submission' | 'generated-density';
}

export interface PublicMapStateEdge {
  id: string;
  from: string;
  to: string;
  kind: string;
  theme: string;
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

export function generatePublicMapEdges(
  nodes: PublicMapStateNode[],
  { limit = 160 }: { limit?: number } = {}
): PublicMapStateEdge[] {
  const stewards = nodes.filter((node) => node.type === 'steward');
  const members = nodes.filter((node) => node.type === 'member');
  const edges: PublicMapStateEdge[] = [];
  const edgeKeys = new Set<string>();
  const stewardEdgeLimit = Math.min(
    Math.max(0, limit),
    Math.max(0, Math.ceil(stewards.length * 0.75))
  );

  const addEdge = ({
    from,
    to,
    kind,
    theme,
    weight = 1,
  }: {
    from: PublicMapStateNode;
    to: PublicMapStateNode;
    kind: string;
    theme: string;
    weight?: number;
  }) => {
    if (from.id === to.id || edges.length >= limit) return;
    const key = `${kind}:${[from.id, to.id].sort().join(':')}`;
    if (edgeKeys.has(key)) return;
    edgeKeys.add(key);
    edges.push({
      id: `edge:${from.id}:${to.id}:${theme || 'related'}`,
      from: from.id,
      to: to.id,
      kind,
      theme,
      weight: Math.min(3, Math.max(1, weight)),
      source: 'generated-theme-match',
    });
  };

  // Steward-member edges are the primary local web: members find nearby
  // stewards first, with shared themes increasing the relationship weight.
  for (const member of members) {
    const nearStewards = stewards
      .map((steward) => ({
        steward,
        shared: sharedThemes(member, steward),
        distance: distanceDegrees(member, steward),
      }))
      .filter((candidate) => candidate.distance <= 12)
      .sort((a, b) => (
        b.shared.length - a.shared.length ||
        a.distance - b.distance ||
        a.steward.name.localeCompare(b.steward.name)
      ))
      .slice(0, 2);

    for (const match of nearStewards) {
      addEdge({
        from: member,
        to: match.steward,
        kind: 'steward-member',
        theme: match.shared[0] || member.primaryTheme || match.steward.primaryTheme,
        weight: match.shared.length || 1,
      });
      if (edges.length >= limit) return edges;
    }
  }

  // Steward-steward edges carry cross-chapter thematic relationships.
  const stewardCandidates: Array<{
    a: PublicMapStateNode;
    b: PublicMapStateNode;
    shared: string[];
    distance: number;
  }> = [];
  for (let i = 0; i < stewards.length; i += 1) {
    for (let j = i + 1; j < stewards.length; j += 1) {
      const shared = sharedThemes(stewards[i], stewards[j]);
      if (!shared.length) continue;
      stewardCandidates.push({
        a: stewards[i],
        b: stewards[j],
        shared,
        distance: distanceDegrees(stewards[i], stewards[j]),
      });
    }
  }
  let stewardEdgesAdded = 0;
  for (const candidate of stewardCandidates.sort((a, b) => (
    b.shared.length - a.shared.length ||
    a.distance - b.distance ||
    a.a.name.localeCompare(b.a.name)
  ))) {
    if (stewardEdgesAdded >= stewardEdgeLimit) break;
    const edgeCountBefore = edges.length;
    addEdge({
      from: candidate.a,
      to: candidate.b,
      kind: 'steward-steward',
      theme: candidate.shared[0],
      weight: candidate.shared.length,
    });
    if (edges.length > edgeCountBefore) stewardEdgesAdded += 1;
    if (edges.length >= limit) return edges;
  }

  // Member-member edges stay rarer and require stronger theme overlap.
  const memberCandidates: Array<{
    a: PublicMapStateNode;
    b: PublicMapStateNode;
    shared: string[];
    distance: number;
  }> = [];
  for (let i = 0; i < members.length; i += 1) {
    for (let j = i + 1; j < members.length; j += 1) {
      const shared = sharedThemes(members[i], members[j]);
      if (shared.length < 2) continue;
      const distance = distanceDegrees(members[i], members[j]);
      if (distance < 30) continue;
      memberCandidates.push({ a: members[i], b: members[j], shared, distance });
    }
  }
  for (const candidate of memberCandidates.sort((a, b) => (
    b.shared.length - a.shared.length ||
    b.distance - a.distance ||
    a.a.name.localeCompare(b.a.name)
  ))) {
    addEdge({
      from: candidate.a,
      to: candidate.b,
      kind: 'member-member',
      theme: candidate.shared[0],
      weight: candidate.shared.length,
    });
    if (edges.length >= limit) return edges;
  }

  return edges;
}

const ANONYMOUS_DENSITY_PLACES = Object.freeze([
  { label: 'Lagos', city: 'Lagos', region: '', country: 'Nigeria', lat: 6.5244, long: 3.3792 },
  { label: 'Berlin', city: 'Berlin', region: '', country: 'Germany', lat: 52.52, long: 13.405 },
  { label: 'Bogota', city: 'Bogota', region: '', country: 'Colombia', lat: 4.711, long: -74.0721 },
  { label: 'Bali', city: 'Bali', region: '', country: 'Indonesia', lat: -8.3405, long: 115.092 },
  { label: 'Toronto', city: 'Toronto', region: 'Ontario', country: 'Canada', lat: 43.6532, long: -79.3832 },
  { label: 'New York City', city: 'New York City', region: 'New York', country: 'United States', lat: 40.7128, long: -74.006 },
  { label: 'Nairobi', city: 'Nairobi', region: '', country: 'Kenya', lat: -1.2864, long: 36.8172 },
  { label: 'Cape Town', city: 'Cape Town', region: '', country: 'South Africa', lat: -33.9249, long: 18.4241 },
  { label: 'Sao Paulo', city: 'Sao Paulo', region: '', country: 'Brazil', lat: -23.5505, long: -46.6333 },
  { label: 'Tokyo', city: 'Tokyo', region: '', country: 'Japan', lat: 35.6762, long: 139.6503 },
  { label: 'Lisbon', city: 'Lisbon', region: '', country: 'Portugal', lat: 38.7223, long: -9.1393 },
  { label: 'London', city: 'London', region: '', country: 'United Kingdom', lat: 51.5072, long: -0.1276 },
  { label: 'Buenos Aires', city: 'Buenos Aires', region: '', country: 'Argentina', lat: -34.6037, long: -58.3816 },
  { label: 'Accra', city: 'Accra', region: '', country: 'Ghana', lat: 5.6037, long: -0.187 },
  { label: 'Mumbai', city: 'Mumbai', region: 'Maharashtra', country: 'India', lat: 19.076, long: 72.8777 },
  { label: 'Manila', city: 'Manila', region: '', country: 'Philippines', lat: 14.5995, long: 120.9842 },
]);

const densityHash = (value: string): number => Array.from(value).reduce((acc, char) => (
  ((acc * 31) + char.charCodeAt(0)) % 100000
), 17);

const densityJitter = (seed: number): number => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

function generateAnonymousDensityNodes(
  baseNodes: PublicMapStateNode[],
  themes: PublicMapTheme[],
  { targetTotal = 96 }: { targetTotal?: number } = {}
): PublicMapStateNode[] {
  if (baseNodes.length === 0) return [];

  const themeIds = themes.map((theme) => theme.id).filter(Boolean);
  if (themeIds.length === 0) return [];

  const existingMemberLike = baseNodes.filter((node) => (
    node.type === 'member' || node.type === 'steward'
  )).length;
  const targetCount = Math.max(0, Math.min(84, targetTotal - baseNodes.length - existingMemberLike));
  const densityNodes: PublicMapStateNode[] = [];

  const chapterAnchors = baseNodes.filter((node) => node.type === 'chapter');
  const anchors = chapterAnchors.length ? chapterAnchors : baseNodes;

  for (let index = 0; index < targetCount; index += 1) {
    const anchor = index % 2 === 0 && anchors.length
      ? anchors[index % anchors.length]
      : null;
    const place = ANONYMOUS_DENSITY_PLACES[index % ANONYMOUS_DENSITY_PLACES.length];
    const seed = densityHash(`${place.label}:${index}:${anchor?.id ?? ''}`);
    const latBase = anchor ? anchor.lat : place.lat;
    const longBase = anchor ? anchor.long : place.long;
    const lat = Math.max(-58, Math.min(72, latBase + (densityJitter(seed) - 0.5) * (anchor ? 8 : 3)));
    const long = Math.max(-178, Math.min(178, longBase + (densityJitter(seed + 7) - 0.5) * (anchor ? 14 : 6)));
    const primaryTheme = anchor?.themes[index % Math.max(1, anchor.themes.length)]
      || themeIds[index % themeIds.length];
    const themesForNode = [
      primaryTheme,
      themeIds[(index * 3 + 1) % themeIds.length],
      themeIds[(index * 5 + 2) % themeIds.length],
    ].filter(Boolean);
    const themes = [...new Set(themesForNode)];
    const id = `density:${index + 1}`;

    densityNodes.push({
      id,
      sourceId: id,
      type: 'member',
      name: 'Anonymous member',
      place: anchor ? `${anchor.name} orbit` : place.label,
      city: anchor?.city || place.city,
      region: anchor?.region || place.region,
      country: anchor?.country || place.country,
      lat,
      long,
      role: 'anonymous-density',
      status: 'anonymous',
      size: 'S',
      themes,
      primaryTheme: themes[0] || '',
      source: 'generated-density',
    });
  }

  return densityNodes;
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
  if (source === 'generated-density') {
    return nodes.filter((node) => node.source === 'generated-density').length;
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
    ['generated-density', countNodesForSource(nodes, 'generated-density')],
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
    normalizePublicMapSourceStatus({
      source: 'generated-density',
      status: (sourceCounts.get('generated-density') ?? 0) > 0 ? 'ok' : 'empty',
      count: sourceCounts.get('generated-density') ?? 0,
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
  const uniqueBaseNodes = [...new Map(nodes.map((node) => [node.id, node])).values()];
  const densityNodes = generateAnonymousDensityNodes(uniqueBaseNodes, publicThemes);
  const uniqueNodes = [...new Map([...uniqueBaseNodes, ...densityNodes].map((node) => [node.id, node])).values()];
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
