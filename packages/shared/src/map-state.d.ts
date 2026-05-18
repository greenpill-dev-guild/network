export type PublicMapNodeType = 'chapter' | 'steward' | 'member' | 'project' | 'place';
export type PublicMapNodeSize = 'S' | 'M' | 'L';
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

export const PUBLIC_MAP_STATE_VERSION: 1;
export const PUBLIC_AGGREGATE_COUNTS_VERSION: 1;
export const PUBLIC_MAP_NODE_TYPES: readonly PublicMapNodeType[];
export const PUBLIC_MAP_NODE_SIZES: readonly PublicMapNodeSize[];
export const PUBLIC_MAP_SOURCE_STATUSES: readonly PublicMapSourceStatusValue[];
export const PUBLIC_COUNT_IDS: readonly PublicCountId[];
export const PUBLIC_COUNT_STATUSES: readonly PublicCountStatus[];
export const PUBLIC_MAP_THEMES: readonly PublicMapTheme[];

export function toPublicMapTheme(theme: Partial<PublicMapTheme>): PublicMapTheme | null;
export function toPublicMapStateChapterNode(location: Record<string, unknown>): PublicMapStateNode | null;
export function toPublicMapStateSubmittedNode(input: Record<string, unknown>): PublicMapStateNode | null;
export function normalizePublicMapSourceStatus(input: Partial<PublicMapSourceStatus>, fallbackSource?: string): PublicMapSourceStatus;
export function generatePublicMapEdges(nodes: PublicMapStateNode[], options?: { limit?: number }): PublicMapStateEdge[];
export function toPublicMapStatePayload(input?: {
  chapterLocations?: Record<string, unknown>[];
  publicMapNodes?: Record<string, unknown>[];
  themes?: Partial<PublicMapTheme>[];
  edges?: Partial<PublicMapStateEdge>[];
  sourceStatus?: Partial<PublicMapSourceStatus>[];
  generatedAt?: Date | string;
}): PublicMapStatePayload;
export function containsPrivateMapStateField(value: unknown, seen?: Set<object>): boolean;
export function assertPublicMapStatePayload<T>(payload: T): T;
export function toPublicAggregateCountsPayload(input?: {
  chapters?: number | Partial<PublicCountMetric>;
  guilds?: number | Partial<PublicCountMetric>;
  members?: number | Partial<PublicCountMetric>;
  stories?: number | Partial<PublicCountMetric>;
  topics?: number | Partial<PublicCountMetric>;
  libraryResources?: number | Partial<PublicCountMetric>;
  generatedAt?: Date | string;
}): PublicAggregateCountsPayload;
export function toPublicAggregateCountsFromMapState(
  mapState: Partial<PublicMapStatePayload>,
  overrides?: Partial<Record<PublicCountId, number | Partial<PublicCountMetric>>> & {
    generatedAt?: Date | string;
  },
): PublicAggregateCountsPayload;
export function assertPublicAggregateCountsPayload<T>(payload: T): T;
