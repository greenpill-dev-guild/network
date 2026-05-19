import type { Hono } from 'hono';
import type { PublicChapterImpactPayload } from '@greenpill-network/shared/chapter-impact';
import type {
  PublicAggregateCountsPayload,
  PublicMapStatePayload,
} from '@greenpill-network/shared/map-state';
import type {
  OptimisticPendingMapNode,
  PublicMapNode,
} from '@greenpill-network/shared/map-nodes';
import type { PublicMapIntakeMode } from '@greenpill-network/shared/map-state';
import type { PublicOperationalContentSnapshot } from '@greenpill-network/shared/public-content';

export interface AgentAppOptions {
  checkDatabase?: () => Promise<{
    configured: boolean;
    connected: boolean;
    status: string;
    error?: string;
  }>;
  impactRepository?: {
    getChapterImpact(chapterSlug: string): Promise<(PublicChapterImpactPayload & {
      cache?: {
        status: 'fresh' | 'stale';
        syncedAt: string;
        staleAfter: string;
      };
    }) | null>;
  };
  mapNodeRepository?: {
    createSubmission(input: Record<string, unknown>, requestMeta?: Record<string, unknown>): Promise<PublicMapNode | Omit<OptimisticPendingMapNode, 'source'> & {
      source: 'submitted-pending';
    }>;
    listPublic(): Promise<PublicMapNode[]>;
    getIntakeMode?(): Promise<PublicMapIntakeMode>;
  };
  mapStateRepository?: {
    getMapState(): Promise<PublicMapStatePayload>;
    getPublicCounts(): Promise<PublicAggregateCountsPayload>;
  };
  publicContentRepository?: {
    getSnapshot(): Promise<PublicOperationalContentSnapshot>;
  };
}

export const PUBLIC_CORS_ORIGINS: readonly [
  'https://greenpill.network',
  'https://www.greenpill.network',
  'http://localhost:4321',
  'http://127.0.0.1:4321',
];
export function createAgentApp(options?: AgentAppOptions): Hono;
export const app: Hono;
