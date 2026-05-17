import {
  CHAPTER_IMPACT_AGENT_BASE,
  buildChapterImpactEndpoint,
  containsPrivateChapterImpactField,
} from '@greenpill-network/shared/chapter-impact';

export const AGENT_HOSTNAME = 'agent.greenpill.network';
export const MAP_NODE_SUBMISSIONS_ROUTE = '/map-nodes';
export const PUBLIC_MAP_NODES_ROUTE = '/map-nodes/public';
export const CHAPTER_IMPACT_ROUTE = '/impact/chapters/:slug';
export const CHAPTER_IMPACT_CACHE_TABLE = 'chapter_impact_snapshots';

export function buildChapterImpactPath(chapterSlug) {
  return `/impact/chapters/${encodeURIComponent(String(chapterSlug ?? '').trim())}`;
}

export function buildPublicChapterImpactUrl(chapterSlug, baseUrl = CHAPTER_IMPACT_AGENT_BASE) {
  return buildChapterImpactEndpoint(chapterSlug, baseUrl);
}

export function assertPublicImpactPayload(payload) {
  if (containsPrivateChapterImpactField(payload)) {
    throw new Error('Public chapter impact payload contains private fields');
  }

  return payload;
}
