import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { checkDatabaseConnection } from './db.js';
import {
  MAP_NODE_SUBMISSIONS_ROUTE,
  PUBLIC_MAP_NODES_ROUTE,
  assertPublicImpactPayload,
} from './impact.js';
import { createImpactRepository } from './impact-cache.js';
import {
  createMapNodeRepository,
  getRequestMeta,
  publicErrorResponse,
} from './map-nodes.js';
import {
  PUBLIC_COUNTS_ROUTE,
  PUBLIC_MAP_STATE_ROUTE,
  createMapStateRepository,
} from './map-state.js';
import {
  PUBLIC_OPERATIONAL_CONTENT_ROUTE,
  createPublicContentRepository,
} from './public-content.js';
import {
  assertPublicAggregateCountsPayload,
  assertPublicMapStatePayload,
} from '@greenpill-network/shared/map-state';
import {
  assertPublicOperationalContentSnapshot,
} from '@greenpill-network/shared/public-content';

export const PUBLIC_CORS_ORIGINS = Object.freeze([
  'https://greenpill.network',
  'https://www.greenpill.network',
  'http://localhost:4321',
  'http://127.0.0.1:4321',
]);

function toRouteErrorResponse(error) {
  const response = publicErrorResponse(error);
  return {
    status: response.status,
    body: assertPublicImpactPayload(response.body),
  };
}

export function createAgentApp({
  checkDatabase = checkDatabaseConnection,
  impactRepository = createImpactRepository(),
  mapNodeRepository = createMapNodeRepository(),
  mapStateRepository = createMapStateRepository({ mapNodeRepository }),
  publicContentRepository = createPublicContentRepository(),
} = {}) {
  const app = new Hono();

  app.use('*', cors({
    origin: (origin) => PUBLIC_CORS_ORIGINS.includes(origin) ? origin : '',
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type'],
    maxAge: 600,
  }));

  app.get('/health', (context) => context.json({
    ok: true,
    service: 'network-agent',
  }));

  app.get('/ready', async (context) => {
    const database = await checkDatabase();
    const ok = database.connected === true;

    return context.json({
      ok,
      service: 'network-agent',
      database,
    }, ok ? 200 : 503);
  });

  app.get('/impact/chapters/:slug', async (context) => {
    try {
      const chapterSlug = context.req.param('slug');
      const payload = await impactRepository.getChapterImpact(chapterSlug);
      if (!payload) {
        return context.json(assertPublicImpactPayload({
          error: {
            code: 'impact_cache_miss',
            message: 'No cached chapter impact data is available yet.',
          },
          chapterSlug,
        }), 404);
      }

      return context.json(assertPublicImpactPayload(payload));
    } catch (error) {
      const response = toRouteErrorResponse(error);
      return context.json(response.body, response.status);
    }
  });

  app.get(PUBLIC_MAP_STATE_ROUTE, async (context) => {
    try {
      const payload = await mapStateRepository.getMapState();
      return context.json(assertPublicMapStatePayload(payload));
    } catch (error) {
      const response = publicErrorResponse(error);
      return context.json(response.body, response.status);
    }
  });

  app.get(PUBLIC_COUNTS_ROUTE, async (context) => {
    try {
      const payload = await mapStateRepository.getPublicCounts();
      return context.json(assertPublicAggregateCountsPayload(payload));
    } catch (error) {
      const response = publicErrorResponse(error);
      return context.json(response.body, response.status);
    }
  });

  app.get(PUBLIC_OPERATIONAL_CONTENT_ROUTE, async (context) => {
    try {
      const payload = await publicContentRepository.getSnapshot();
      return context.json(assertPublicOperationalContentSnapshot(payload));
    } catch (error) {
      const response = publicErrorResponse(error);
      return context.json(response.body, response.status);
    }
  });

  app.post(MAP_NODE_SUBMISSIONS_ROUTE, async (context) => {
    try {
      const input = await context.req.json();
      const node = await mapNodeRepository.createSubmission(input, getRequestMeta(context));
      return context.json({ node }, 201);
    } catch (error) {
      const response = publicErrorResponse(error);
      return context.json(response.body, response.status);
    }
  });

  app.get(PUBLIC_MAP_NODES_ROUTE, async (context) => {
    try {
      const nodes = await mapNodeRepository.listPublic();
      return context.json({ nodes });
    } catch (error) {
      const response = publicErrorResponse(error);
      return context.json(response.body, response.status);
    }
  });

  return app;
}

export const app = createAgentApp();
