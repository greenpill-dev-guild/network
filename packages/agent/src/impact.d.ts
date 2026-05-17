export const AGENT_HOSTNAME: 'agent.greenpill.network';
export const MAP_NODE_SUBMISSIONS_ROUTE: '/map-nodes';
export const PUBLIC_MAP_NODES_ROUTE: '/map-nodes/public';
export const CHAPTER_IMPACT_ROUTE: '/impact/chapters/:slug';
export const CHAPTER_IMPACT_CACHE_TABLE: 'chapter_impact_snapshots';

export function buildChapterImpactPath(chapterSlug: string): string;
export function buildPublicChapterImpactUrl(chapterSlug: string, baseUrl?: string): string;
export function assertPublicImpactPayload<T>(payload: T): T;
