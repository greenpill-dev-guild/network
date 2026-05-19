import {
  CHAPTER_IMPACT_AGENT_BASE,
  buildChapterImpactEndpoint,
  containsPrivateChapterImpactField,
} from '@greenpill-network/shared/chapter-impact';

export const AGENT_HOSTNAME = 'agent.greenpill.network';
export const MAP_NODE_SUBMISSIONS_ROUTE = '/map-nodes';
export const PUBLIC_MAP_NODES_ROUTE = '/map-nodes/public';
export const MAP_NODE_EDIT_LINK_ROUTE = '/map-nodes/:id/edit-link';
export const MAP_NODE_EDIT_SESSION_ROUTE = '/map-nodes/edit-session';
export const MAP_NODE_UPDATE_REQUESTS_ROUTE = '/map-nodes/:id/update-requests';
export const CHAPTER_IMPACT_ROUTE = '/impact/chapters/:slug';
export const CHAPTER_IMPACT_CACHE_TABLE = 'impact.chapter_impact_snapshots';

export function buildChapterImpactPath(chapterSlug: string): string {
  return `/impact/chapters/${encodeURIComponent(String(chapterSlug ?? '').trim())}`;
}

export function buildPublicChapterImpactUrl(chapterSlug: string, baseUrl = CHAPTER_IMPACT_AGENT_BASE): string {
  return buildChapterImpactEndpoint(chapterSlug, baseUrl);
}

export function assertPublicImpactPayload<T>(payload: T): T {
  if (containsPrivateChapterImpactField(payload)) {
    throw new Error('Public chapter impact payload contains private fields');
  }

  return payload;
}
