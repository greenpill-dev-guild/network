import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { checkDatabaseConnection } from './db.js';
import {
  MAP_NODE_EDIT_LINK_ROUTE,
  MAP_NODE_EDIT_SESSION_ROUTE,
  MAP_NODE_SUBMISSIONS_ROUTE,
  MAP_NODE_UPDATE_REQUESTS_ROUTE,
  PUBLIC_MAP_NODES_ROUTE,
  assertPublicImpactPayload,
} from './impact.js';
import { createImpactRepository } from './impact-cache.js';
import {
  MAP_NODE_EDIT_LINK_NEUTRAL_RESPONSE,
  createMapNodeRepository,
  getRequestMeta,
  isValidOwnerEmail,
  normalizeOwnerEmail,
  publicErrorResponse,
} from './map-nodes.js';
import {
  PUBLIC_COUNTS_ROUTE,
  PUBLIC_MAP_STATE_ROUTE,
  createMapStateRepository,
} from './map-state.js';
import {
  NEWSLETTER_SUBSCRIBE_ROUTE,
  createNewsletterRepository,
} from './newsletter.js';
import {
  PUBLIC_OPERATIONAL_CONTENT_ROUTE,
  createPublicContentRepository,
} from './public-content.js';
import {
  RESEND_WEBHOOK_ROUTE,
  createResendWebhookRepository,
  handleResendWebhookRequest,
} from './resend-webhooks.js';
import {
  assertPublicAggregateCountsPayload,
  assertPublicMapStatePayload,
} from '@greenpill-network/shared/map-state';
import {
  assertPublicOperationalContentSnapshot,
} from '@greenpill-network/shared/public-content';
import {
  containsPrivateMapNodeField,
} from '@greenpill-network/shared/map-nodes';

type UnknownRecord = Record<string, any>;

export interface AgentAppOptions {
  checkDatabase?: () => Promise<UnknownRecord>;
  impactRepository?: UnknownRecord;
  mapNodeRepository?: UnknownRecord;
  mapStateRepository?: UnknownRecord;
  newsletterRepository?: UnknownRecord;
  publicContentRepository?: UnknownRecord;
  resendWebhookRepository?: UnknownRecord;
  reportEditLinkError?: (event: UnknownRecord) => void;
  env?: Record<string, string | undefined>;
}

export const PUBLIC_CORS_ORIGINS = Object.freeze([
  'https://greenpill.network',
  'https://www.greenpill.network',
  'http://localhost:4321',
  'http://127.0.0.1:4321',
]);

const PUBLIC_MAP_STATE_CACHE_CONTROL = 'no-store, max-age=0';

function toRouteErrorResponse(error) {
  const response = publicErrorResponse(error);
  return {
    status: response.status,
    body: assertPublicImpactPayload(response.body),
  };
}

function defaultReportEditLinkError(event: UnknownRecord): void {
  console.warn('map_node_edit_link_request_failed', event);
}

function reportSanitizedEditLinkError(
  reportEditLinkError: (event: UnknownRecord) => void,
  error: unknown
): void {
  try {
    reportEditLinkError({
      code: 'map_node_edit_link_request_failed',
      route: MAP_NODE_EDIT_LINK_ROUTE,
      errorName: error instanceof Error ? error.name : 'UnknownError',
    });
  } catch {
    // Public neutrality must not depend on telemetry.
  }
}

export function createAgentApp({
  checkDatabase = checkDatabaseConnection,
  impactRepository = createImpactRepository(),
  mapNodeRepository = createMapNodeRepository(),
  mapStateRepository = createMapStateRepository({ mapNodeRepository }),
  newsletterRepository,
  publicContentRepository = createPublicContentRepository(),
  resendWebhookRepository = createResendWebhookRepository(),
  reportEditLinkError = defaultReportEditLinkError,
  env = process.env,
}: AgentAppOptions = {}) {
  const app = new Hono();
  const newsletter = newsletterRepository ?? createNewsletterRepository({ env });

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

  app.post(RESEND_WEBHOOK_ROUTE, async (context) => {
    const rawBody = await context.req.text();
    try {
      const result = await handleResendWebhookRequest({
        rawBody,
        headers: {
          svixId: context.req.header('svix-id'),
          svixTimestamp: context.req.header('svix-timestamp'),
          svixSignature: context.req.header('svix-signature'),
        },
        webhookSecret: env.RESEND_WEBHOOK_SECRET ?? '',
        recipientHashSecret: env.RESEND_WEBHOOK_RECIPIENT_HASH_SECRET ?? '',
        repository: resendWebhookRepository as any,
      });
      return context.json(result.body, result.status as any);
    } catch {
      return context.json({
        ok: false,
        error: { code: 'webhook_persistence_failed' },
      }, 500);
    }
  });

  app.post(NEWSLETTER_SUBSCRIBE_ROUTE, async (context) => {
    let input: UnknownRecord = {};
    try {
      input = await context.req.json() as UnknownRecord;
    } catch {
      input = {};
    }

    const response = await (newsletter as any).subscribe(input);
    return context.json(response.body, response.status as any);
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
      return context.json(response.body, response.status as any);
    }
  });

  app.get(PUBLIC_MAP_STATE_ROUTE, async (context) => {
    try {
      const payload = await mapStateRepository.getMapState();
      context.header('Cache-Control', PUBLIC_MAP_STATE_CACHE_CONTROL);
      return context.json(assertPublicMapStatePayload(payload));
    } catch (error) {
      const response = publicErrorResponse(error);
      context.header('Cache-Control', PUBLIC_MAP_STATE_CACHE_CONTROL);
      return context.json(response.body, response.status as any);
    }
  });

  app.get(PUBLIC_COUNTS_ROUTE, async (context) => {
    try {
      const payload = await mapStateRepository.getPublicCounts();
      return context.json(assertPublicAggregateCountsPayload(payload));
    } catch (error) {
      const response = publicErrorResponse(error);
      return context.json(response.body, response.status as any);
    }
  });

  app.get(PUBLIC_OPERATIONAL_CONTENT_ROUTE, async (context) => {
    try {
      const payload = await publicContentRepository.getSnapshot();
      return context.json(assertPublicOperationalContentSnapshot(payload));
    } catch (error) {
      const response = publicErrorResponse(error);
      return context.json(response.body, response.status as any);
    }
  });

  app.post(MAP_NODE_SUBMISSIONS_ROUTE, async (context) => {
    try {
      const input = await context.req.json() as UnknownRecord;
      const email = normalizeOwnerEmail(input?.email ?? input?.privateEmail ?? input?.private_email);
      if (!isValidOwnerEmail(email)) {
        return context.json({
          error: {
            code: 'invalid_email',
            message: 'A valid email is required.',
          },
        }, 400);
      }
      const node = await mapNodeRepository.createSubmission(input, getRequestMeta(context));
      return context.json({ node }, 201);
    } catch (error) {
      const response = publicErrorResponse(error);
      return context.json(response.body, response.status as any);
    }
  });

  app.post(MAP_NODE_EDIT_LINK_ROUTE, async (context) => {
    let input: UnknownRecord = {};
    try {
      input = await context.req.json() as UnknownRecord;
    } catch {
      input = {};
    }

    const email = normalizeOwnerEmail(input?.email);
    if (!isValidOwnerEmail(email)) {
      return context.json({
        error: {
          code: 'invalid_email',
          message: 'A valid email is required.',
        },
      }, 400);
    }

    try {
      await mapNodeRepository.requestEditLink?.(
        context.req.param('id'),
        email,
        getRequestMeta(context)
      );
    } catch (error) {
      // Keep account/node/provider state private. Persisted attempts are the
      // primary operator surface; this sanitized event covers persistence loss.
      reportSanitizedEditLinkError(reportEditLinkError, error);
    }

    return context.json(MAP_NODE_EDIT_LINK_NEUTRAL_RESPONSE, 202);
  });

  app.post(MAP_NODE_EDIT_SESSION_ROUTE, async (context) => {
    try {
      let input: UnknownRecord = {};
      try {
        input = await context.req.json() as UnknownRecord;
      } catch {
        input = {};
      }
      const node = await mapNodeRepository.getEditSession(input?.token);
      if (containsPrivateMapNodeField(node)) {
        throw new Error('Edit-session node contains private fields.');
      }
      return context.json({ node });
    } catch (error) {
      const response = publicErrorResponse(error);
      return context.json(response.body, response.status as any);
    }
  });

  app.post(MAP_NODE_UPDATE_REQUESTS_ROUTE, async (context) => {
    try {
      let input: UnknownRecord = {};
      try {
        input = await context.req.json() as UnknownRecord;
      } catch {
        input = {};
      }
      const updateRequest = await mapNodeRepository.createUpdateRequest(
        context.req.param('id'),
        input,
        getRequestMeta(context)
      );
      return context.json({ updateRequest }, 201);
    } catch (error) {
      const response = publicErrorResponse(error);
      return context.json(response.body, response.status as any);
    }
  });

  app.get(PUBLIC_MAP_NODES_ROUTE, async (context) => {
    try {
      const nodes = await mapNodeRepository.listPublic();
      return context.json({ nodes });
    } catch (error) {
      const response = publicErrorResponse(error);
      return context.json(response.body, response.status as any);
    }
  });

  return app;
}

export const app = createAgentApp();
