import { Hono } from 'hono';
import { checkDatabaseConnection } from './db.js';
import {
  MAP_NODE_SUBMISSIONS_ROUTE,
  PUBLIC_MAP_NODES_ROUTE,
  assertPublicImpactPayload,
} from './impact.js';

export function createAgentApp({ checkDatabase = checkDatabaseConnection } = {}) {
  const app = new Hono();

  app.get('/health', (context) => context.json({
    ok: true,
    service: 'greenpill-network-agent',
  }));

  app.get('/ready', async (context) => {
    const database = await checkDatabase();
    const ok = database.connected === true;

    return context.json({
      ok,
      service: 'greenpill-network-agent',
      database,
    }, ok ? 200 : 503);
  });

  app.get('/impact/chapters/:slug', (context) => {
    const payload = assertPublicImpactPayload({
      error: {
        code: 'impact_cache_not_configured',
        message: 'Chapter impact cache is not implemented yet.',
      },
      chapterSlug: context.req.param('slug'),
    });

    return context.json(payload, 501);
  });

  app.post(MAP_NODE_SUBMISSIONS_ROUTE, (context) => context.json({
    error: {
      code: 'map_node_intake_not_configured',
      message: 'Private map-node intake is not implemented yet.',
    },
  }, 501));

  app.get(PUBLIC_MAP_NODES_ROUTE, (context) => context.json({
    error: {
      code: 'public_map_nodes_not_configured',
      message: 'Approved public map-node projection is not implemented yet.',
    },
  }, 501));

  return app;
}

export const app = createAgentApp();
