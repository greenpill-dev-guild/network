export interface ChapterImpactSources {
  impactEnabled: boolean;
  greenGoodsGardenAddress: string;
  greenGoodsChainId: number;
  karmaProjectUID: string;
  karmaProjectSlug: string;
  karmaCommunitySlug: string;
}

export interface PublicImpactSourceBinding {
  chapterSlug: string;
  chapterName: string;
  chapterPath: string;
  sources: ChapterImpactSources;
}

export interface PublicImpactEvent {
  id: string;
  title: string;
  type: string;
  status: string;
  publishedAt: string;
  url: string;
}

export interface PublicChapterImpactPayload {
  version: 1;
  chapterSlug: string;
  chapterName: string;
  generatedAt: string;
  sourceStatus: Array<{
    source: 'karma' | 'green-goods';
    configured: boolean;
    status: 'ok' | 'unavailable' | 'missing';
  }>;
  summary: {
    milestoneCount: number;
    updateCount: number;
    grantCount: number;
    gardenMemberCount: number;
    actionCount: number;
    assessmentCount: number;
    hypercertCount: number;
    proofLinkCount: number;
  };
  karma: null | {
    project: null | {
      uid: string;
      slug: string;
      title: string;
      url: string;
    };
    milestones: PublicImpactEvent[];
    updates: PublicImpactEvent[];
    grants: PublicImpactEvent[];
    communityImpact: null | {
      summary: string;
      segmentCount: number;
      indicatorCount: number;
    };
  };
  greenGoods: null | {
    garden: {
      address: string;
      chainId: number;
      name: string;
      location: string;
      gapProjectUID: string;
      roleCounts: {
        gardeners: number;
        operators: number;
        evaluators: number;
      };
      memberCount: number;
      url: string;
    };
    activity: {
      actionCount: number;
      assessmentCount: number;
      hypercertCount: number;
    };
  };
  proofLinks: Array<{
    label: string;
    url: string;
    source: 'karma' | 'green-goods';
  }>;
}

export const CHAPTER_IMPACT_AGENT_BASE: string;
export const CHAPTER_IMPACT_SOURCES_VERSION: 1;
export const CHAPTER_IMPACT_UI_ENABLED: boolean;
export const PRIVATE_CHAPTER_IMPACT_FIELDS: readonly string[];

export function hasConfiguredImpactSource(sources?: Partial<ChapterImpactSources> | null): boolean;
export function shouldRenderChapterImpactUi(sources?: Partial<ChapterImpactSources> | null, uiEnabled?: boolean): boolean;
export function buildChapterImpactEndpoint(chapterSlug: string, baseUrl?: string): string;
export function containsPrivateChapterImpactField(value: unknown, seen?: Set<object>): boolean;
export function normalizeImpactSources(sources?: Partial<ChapterImpactSources>): ChapterImpactSources;
export function toPublicImpactSourceBinding(chapter: { id: string; data: { name: string; impactSources?: Partial<ChapterImpactSources> } }): PublicImpactSourceBinding | null;
export function normalizeKarmaImpactSnapshot(snapshot?: Record<string, unknown>): PublicChapterImpactPayload['karma'];
export function normalizeGreenGoodsImpactSnapshot(snapshot?: Record<string, unknown>): PublicChapterImpactPayload['greenGoods'];
export function toPublicChapterImpactPayload(input?: {
  chapterSlug?: string;
  chapterName?: string;
  sources?: Partial<ChapterImpactSources>;
  karma?: Record<string, unknown>;
  greenGoods?: Record<string, unknown>;
  generatedAt?: Date | string;
}): PublicChapterImpactPayload;
