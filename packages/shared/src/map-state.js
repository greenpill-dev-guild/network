import {
  containsPrivateChapterImpactField,
} from './chapter-impact.js';
import {
  containsPrivateMapNodeField,
  toPublicMapNode,
} from './map-nodes.js';

export const PUBLIC_MAP_STATE_VERSION = 1;
export const PUBLIC_AGGREGATE_COUNTS_VERSION = 1;

export const PUBLIC_MAP_INTAKE_MODES = Object.freeze([
  'moderated',
  'live',
]);

export const PUBLIC_MAP_NODE_TYPES = Object.freeze([
  'chapter',
  'steward',
  'member',
  'project',
  'place',
]);

export const PUBLIC_MAP_NODE_SIZES = Object.freeze(['S', 'M', 'L']);

export const PUBLIC_MAP_SOURCE_STATUSES = Object.freeze([
  'ok',
  'empty',
  'not_configured',
  'unavailable',
]);

export const PUBLIC_COUNT_IDS = Object.freeze([
  'chapters',
  'guilds',
  'members',
  'stories',
  'topics',
  'libraryResources',
]);

export const PUBLIC_COUNT_STATUSES = Object.freeze([
  'ok',
  'not_configured',
  'unavailable',
]);

export const PUBLIC_MAP_THEMES = Object.freeze([
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

const COUNT_LABELS = Object.freeze({
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
  'ipaddress',
  'ratelimit',
  'spam',
  'useragent',
  'pending',
  'admin',
]);

const cleanString = (value) => (typeof value === 'string' ? value.trim() : '');
const normalizeFieldKey = (key) => cleanString(key).toLowerCase().replace(/[^a-z0-9]/g, '');

const normalizeNumber = (value) => {
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) ? number : null;
};

const normalizeInteger = (value) => {
  const number = normalizeNumber(value);
  return number === null ? 0 : Math.max(0, Math.trunc(number));
};

const toIso = (value) => {
  if (!value) return new Date().toISOString();
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.valueOf()) ? new Date().toISOString() : date.toISOString();
};

const cleanHref = (value) => {
  const href = cleanString(value);
  if (href.startsWith('/') || href.startsWith('https://') || href.startsWith('http://')) {
    return href;
  }
  return '';
};

const normalizeThemes = (themes) => {
  if (!Array.isArray(themes)) return [];
  return [...new Set(themes.map(cleanString).filter(Boolean))];
};

const makeIdPart = (value, fallback = 'node') => (
  cleanString(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || fallback
);

const normalizeMapNodeType = (value, fallback = 'member') => {
  const role = cleanString(value).toLowerCase();
  if (PUBLIC_MAP_NODE_TYPES.includes(role)) return role;
  if (role.includes('steward') || role.includes('organizer') || role.includes('coordinator')) {
    return 'steward';
  }
  if (role.includes('project') || role.includes('guild')) return 'project';
  if (role.includes('place') || role.includes('space') || role.includes('chapter house')) return 'place';
  if (role.includes('chapter')) return 'member';
  return fallback;
};

const mapSizeForType = (type) => {
  if (type === 'chapter') return 'L';
  if (type === 'steward' || type === 'project') return 'M';
  return 'S';
};

const normalizeSourceStatus = (status) => {
  const cleaned = cleanString(status);
  return PUBLIC_MAP_SOURCE_STATUSES.includes(cleaned) ? cleaned : 'unavailable';
};

const normalizeCountStatus = (status) => {
  const cleaned = cleanString(status);
  return PUBLIC_COUNT_STATUSES.includes(cleaned) ? cleaned : 'not_configured';
};

export const normalizePublicMapIntakeMode = (mode) => {
  const cleaned = cleanString(mode);
  return PUBLIC_MAP_INTAKE_MODES.includes(cleaned) ? cleaned : 'moderated';
};

export function toPublicMapTheme(theme) {
  const id = cleanString(theme?.id);
  if (!id) return null;
  return {
    id,
    label: cleanString(theme?.label) || id,
    color: cleanString(theme?.color),
    icon: cleanString(theme?.icon),
  };
}

export function toPublicMapStateChapterNode(location) {
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

export function toPublicMapStateSubmittedNode(input) {
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
    role: node.role,
    publicNote: node.publicNote,
    status: 'approved',
    size: mapSizeForType(type),
    themes,
    primaryTheme: themes[0] || '',
    source: 'approved-submission',
  };
}

export function normalizePublicMapSourceStatus(input, fallbackSource = '') {
  return {
    source: cleanString(input?.source) || cleanString(fallbackSource),
    status: normalizeSourceStatus(input?.status),
    count: normalizeInteger(input?.count),
    message: cleanString(input?.message),
  };
}

const distanceDegrees = (a, b) => (
  Math.hypot(
    a.lat - b.lat,
    (a.long - b.long) * Math.cos(((a.lat + b.lat) / 2) * Math.PI / 180)
  )
);

const sharedThemes = (a, b) => a.themes.filter((theme) => b.themes.includes(theme));

export function generatePublicMapEdges(nodes, { limit = 160 } = {}) {
  const chapters = nodes.filter((node) => node.type === 'chapter');
  const nonChapters = nodes.filter((node) => node.type !== 'chapter');
  const edges = [];

  for (let i = 0; i < chapters.length; i += 1) {
    for (let j = i + 1; j < chapters.length; j += 1) {
      const shared = sharedThemes(chapters[i], chapters[j]);
      if (!shared.length) continue;
      edges.push({
        id: `edge:${chapters[i].id}:${chapters[j].id}:${shared[0]}`,
        from: chapters[i].id,
        to: chapters[j].id,
        kind: 'chapter-theme',
        theme: shared[0],
        weight: Math.min(3, shared.length),
        source: 'generated-theme-match',
      });
      if (edges.length >= limit) return edges;
    }
  }

  for (const node of nonChapters) {
    const match = chapters
      .map((chapter) => ({
        chapter,
        shared: sharedThemes(node, chapter),
        distance: distanceDegrees(node, chapter),
      }))
      .filter((candidate) => candidate.shared.length > 0)
      .sort((a, b) => b.shared.length - a.shared.length || a.distance - b.distance)[0];

    if (!match) continue;
    edges.push({
      id: `edge:${node.id}:${match.chapter.id}:${match.shared[0]}`,
      from: node.id,
      to: match.chapter.id,
      kind: 'node-theme',
      theme: match.shared[0],
      weight: Math.min(3, match.shared.length),
      source: 'generated-theme-match',
    });
    if (edges.length >= limit) return edges;
  }

  return edges;
}

function normalizeEdge(edge) {
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

function buildMapStateCounts(nodes, edges, sourceStatus) {
  const byType = {};
  const byStatus = {};
  const byTheme = {};

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

function countNodesForSource(nodes, source) {
  if (source === 'chapter-locations') {
    return nodes.filter((node) => node.type === 'chapter').length;
  }
  if (source === 'approved-map-nodes') {
    return nodes.filter((node) => node.source === 'approved-submission').length;
  }
  return null;
}

function normalizeMapStateSourceStatuses(sourceStatus, nodes) {
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
        status: next.status === 'ok' && next.count === 0 ? 'empty' : next.status,
      };
    }).filter((status) => status.source)
    : [];

  if (normalized.length) return normalized;

  return [
    normalizePublicMapSourceStatus({
      source: 'chapter-locations',
      status: sourceCounts.get('chapter-locations') > 0 ? 'ok' : 'empty',
      count: sourceCounts.get('chapter-locations'),
    }),
    normalizePublicMapSourceStatus({
      source: 'approved-map-nodes',
      status: sourceCounts.get('approved-map-nodes') > 0 ? 'ok' : 'empty',
      count: sourceCounts.get('approved-map-nodes'),
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
} = {}) {
  const publicThemes = themes
    .map(toPublicMapTheme)
    .filter(Boolean);
  const nodes = [
    ...chapterLocations.map(toPublicMapStateChapterNode).filter(Boolean),
    ...publicMapNodes.map(toPublicMapStateSubmittedNode).filter(Boolean),
  ].sort((a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name));
  const uniqueNodes = [...new Map(nodes.map((node) => [node.id, node])).values()];
  const publicEdges = (Array.isArray(edges) ? edges.map(normalizeEdge).filter(Boolean) : generatePublicMapEdges(uniqueNodes))
    .filter((edge) => uniqueNodes.some((node) => node.id === edge.from) && uniqueNodes.some((node) => node.id === edge.to));
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

export function containsPrivateMapStateField(value, seen = new Set()) {
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

export function assertPublicMapStatePayload(payload) {
  if (containsPrivateMapStateField(payload)) {
    throw new Error('Public map-state payload contains private fields');
  }

  const nodes = Array.isArray(payload?.nodes) ? payload.nodes : [];
  const hasPendingNode = nodes.some((node) => (
    cleanString(node?.status).toLowerCase() === 'pending' ||
    cleanString(node?.source).toLowerCase().includes('pending')
  ));
  if (hasPendingNode) {
    throw new Error('Public map-state payload contains pending nodes');
  }

  return payload;
}

function normalizeCountMetric(id, input = {}) {
  const source = cleanString(input?.source);
  const status = normalizeCountStatus(input?.status ?? (Number.isFinite(input) ? 'ok' : 'not_configured'));
  const numericValue = typeof input === 'number' ? input : input?.value;
  return {
    id,
    label: COUNT_LABELS[id],
    value: status === 'ok' ? normalizeInteger(numericValue) : null,
    status,
    source,
    message: cleanString(input?.message),
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
} = {}) {
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

export function toPublicAggregateCountsFromMapState(mapState, overrides = {}) {
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

export function assertPublicAggregateCountsPayload(payload) {
  if (containsPrivateMapStateField(payload)) {
    throw new Error('Public aggregate counts payload contains private fields');
  }

  return payload;
}
