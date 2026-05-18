import {
  normalizeImpactSources,
  toPublicChapterImpactPayload,
} from '@greenpill-network/shared/chapter-impact';

export const DEFAULT_IMPACT_SOURCES_URL = 'https://greenpill.network/impact-sources.json';
export const DEFAULT_GREEN_GOODS_INDEXER_URL = 'https://indexer.hyperindex.xyz/0bf0e0f/v1/graphql';
export const DEFAULT_KARMA_API_BASE = 'https://gapapi.karmahq.xyz/v2';
export const DEFAULT_IMPACT_CACHE_TTL_SECONDS = 60 * 60 * 6;
export const DEFAULT_GREEN_GOODS_CHAIN_ID = 42161;

const cleanString = (value) => (typeof value === 'string' ? value.trim() : '');

const normalizeInteger = (value, fallback) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.trunc(number) : fallback;
};

const normalizeAddress = (value) => cleanString(value).toLowerCase();

export function getImpactSyncConfig(env = process.env) {
  return {
    impactSourcesUrl: cleanString(env.IMPACT_SOURCES_URL) || DEFAULT_IMPACT_SOURCES_URL,
    greenGoodsIndexerUrl: cleanString(env.GREEN_GOODS_INDEXER_URL) || DEFAULT_GREEN_GOODS_INDEXER_URL,
    karmaApiBase: cleanString(env.KARMA_API_BASE) || DEFAULT_KARMA_API_BASE,
    cacheTtlSeconds: normalizeInteger(env.IMPACT_CACHE_TTL_SECONDS, DEFAULT_IMPACT_CACHE_TTL_SECONDS),
    defaultChainId: normalizeInteger(env.GREEN_GOODS_CHAIN_ID, DEFAULT_GREEN_GOODS_CHAIN_ID),
  };
}

async function postGraphql({ fetchImpl, url, query, variables }) {
  const response = await fetchImpl(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`Green Goods indexer returned ${response.status}`);
  }

  const body = await response.json();
  if (body.errors?.length) {
    throw new Error(body.errors.map((error) => error.message).join('; '));
  }

  return body.data ?? {};
}

export async function fetchImpactSourceBindings({
  fetchImpl = globalThis.fetch,
  impactSourcesUrl = DEFAULT_IMPACT_SOURCES_URL,
} = {}) {
  const response = await fetchImpl(impactSourcesUrl, {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Impact sources returned ${response.status}`);
  }

  const body = await response.json();
  return Array.isArray(body?.chapters) ? body.chapters : [];
}

export async function fetchGreenGoodsGardenImpact({
  fetchImpl = globalThis.fetch,
  indexerUrl = DEFAULT_GREEN_GOODS_INDEXER_URL,
  gardenAddress,
  chainId = DEFAULT_GREEN_GOODS_CHAIN_ID,
} = {}) {
  const address = normalizeAddress(gardenAddress);
  if (!address) return null;

  const query = `
    query ChapterGardenImpact($chainId: Int!, $garden: String!) {
      Garden(where: {chainId: {_eq: $chainId}, id: {_ilike: $garden}}, limit: 1) {
        id
        chainId
        name
        description
        location
        bannerImage
        gardeners
        operators
        evaluators
        gapProjectUID
        createdAt
      }
      Hypercert(where: {chainId: {_eq: $chainId}, garden: {_ilike: $garden}}, limit: 100) {
        id
      }
    }
  `;

  const data = await postGraphql({
    fetchImpl,
    url: indexerUrl,
    query,
    variables: {
      chainId,
      garden: address,
    },
  });
  const garden = Array.isArray(data.Garden) ? data.Garden[0] : null;
  if (!garden) return null;

  return {
    garden: {
      ...garden,
      address: garden.id,
      chainId: garden.chainId ?? chainId,
    },
    activity: {
      actionCount: 0,
      assessmentCount: 0,
      hypercertCount: Array.isArray(data.Hypercert) ? data.Hypercert.length : 0,
    },
  };
}

export async function fetchKarmaImpact() {
  // Karma v2 remains intentionally scaffolded until chapter-specific project or
  // community IDs are curated. The adapter boundary is here so the sync job can
  // add Karma reads without changing the public payload shape.
  return null;
}

export async function syncChapterImpactSnapshots({
  fetchImpl = globalThis.fetch,
  repository,
  now = new Date(),
  config = getImpactSyncConfig(),
} = {}) {
  if (!repository?.saveSnapshot) {
    throw new Error('syncChapterImpactSnapshots requires a repository with saveSnapshot().');
  }

  const bindings = await fetchImpactSourceBindings({
    fetchImpl,
    impactSourcesUrl: config.impactSourcesUrl,
  });
  const staleAfter = new Date(now.getTime() + config.cacheTtlSeconds * 1000);
  const result = {
    checked: bindings.length,
    saved: 0,
    failed: 0,
    failures: [],
  };

  for (const binding of bindings) {
    const sources = normalizeImpactSources(binding.sources);
    let greenGoods = null;
    let karma = null;
    let lastError = null;

    try {
      if (sources.greenGoodsGardenAddress) {
        greenGoods = await fetchGreenGoodsGardenImpact({
          fetchImpl,
          indexerUrl: config.greenGoodsIndexerUrl,
          gardenAddress: sources.greenGoodsGardenAddress,
          chainId: sources.greenGoodsChainId || config.defaultChainId,
        });
      }

      if (sources.karmaProjectUID || sources.karmaProjectSlug || sources.karmaCommunitySlug) {
        karma = await fetchKarmaImpact({
          fetchImpl,
          karmaApiBase: config.karmaApiBase,
          sources,
        });
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }

    const payload = toPublicChapterImpactPayload({
      chapterSlug: binding.chapterSlug,
      chapterName: binding.chapterName,
      sources,
      karma,
      greenGoods,
      generatedAt: now,
    });

    await repository.saveSnapshot({
      chapterSlug: binding.chapterSlug,
      payload,
      sourceStatus: payload.sourceStatus,
      staleAfter,
      lastError,
    });

    if (lastError) {
      result.failed += 1;
      result.failures.push({ chapterSlug: binding.chapterSlug, error: lastError });
    } else {
      result.saved += 1;
    }
  }

  return result;
}
