import { serve } from '@hono/node-server';
import { app } from './app.js';
import { createContentOperationsRepository } from './content-operations.js';
import { getImpactSyncConfig, syncChapterImpactSnapshots } from './green-goods-impact.js';
import { createImpactRepository } from './impact-cache.js';
import { createMapLocationRepository } from './map-locations.js';
import { createMapNodeRepository } from './map-nodes.js';

const parsePort = (value: string | undefined, fallback: number): number => {
  const port = Number.parseInt(value ?? '', 10);
  return Number.isFinite(port) && port > 0 ? port : fallback;
};

const parsePositiveInteger = (value: string | undefined, fallback: number): number => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const port = parsePort(process.env.PORT || process.env.AGENT_PORT, 3303);
const hostname = process.env.AGENT_HOST || '0.0.0.0';
const editLinkDeliverySweepIntervalMs = parsePositiveInteger(
  process.env.MAP_NODE_EDIT_LINK_DELIVERY_SWEEP_INTERVAL_MS,
  5 * 60 * 1000
);
const moderationDeliverySweepIntervalMs = parsePositiveInteger(
  process.env.MAP_NODE_MODERATION_DELIVERY_SWEEP_INTERVAL_MS,
  editLinkDeliverySweepIntervalMs
);
const mapLocationCleanupSweepIntervalMs = parsePositiveInteger(
  process.env.MAP_LOCATION_CLEANUP_SWEEP_INTERVAL_MS,
  6 * 60 * 60 * 1000
);

export function startMapNodeEditLinkDeliverySweep({
  env = process.env,
  repository = createMapNodeRepository({ env }),
}: {
  env?: Record<string, string | undefined>;
  repository?: {
    deliverQueuedEditLinks?: (options?: { limit?: number }) => Promise<unknown>;
    deliverQueuedModerationNotifications?: (options?: { limit?: number }) => Promise<unknown>;
  };
} = {}): (() => void) | null {
  if (!env.DATABASE_URL) return null;
  const deliverQueuedEditLinks = env.MAP_NODE_EDIT_LINK_DELIVERY_SWEEP_ENABLED === 'false'
    ? null
    : repository.deliverQueuedEditLinks?.bind(repository);
  const deliverQueuedModerationNotifications = env.MAP_NODE_MODERATION_DELIVERY_SWEEP_ENABLED === 'false'
    ? null
    : repository.deliverQueuedModerationNotifications?.bind(repository);
  if (!deliverQueuedEditLinks && !deliverQueuedModerationNotifications) return null;

  let running = false;
  const run = async () => {
    if (running) return;
    running = true;
    try {
      if (deliverQueuedEditLinks) await deliverQueuedEditLinks({ limit: 20 });
      if (deliverQueuedModerationNotifications) {
        await deliverQueuedModerationNotifications({ limit: 20 });
      }
    } catch (error) {
      console.warn('map_node_delivery_sweep_failed', {
        errorName: error instanceof Error ? error.name : 'UnknownError',
      });
    } finally {
      running = false;
    }
  };

  const bootTimer = setTimeout(() => {
    void run();
  }, 1000);
  const interval = setInterval(() => {
    void run();
  }, Math.min(editLinkDeliverySweepIntervalMs, moderationDeliverySweepIntervalMs));
  bootTimer.unref?.();
  interval.unref?.();

  return () => {
    clearTimeout(bootTimer);
    clearInterval(interval);
  };
}

export function startMapLocationCleanupSweep({
  env = process.env,
  repository = createMapLocationRepository({ env }),
}: {
  env?: Record<string, string | undefined>;
  repository?: { cleanupExpired?: () => Promise<unknown> };
} = {}): (() => void) | null {
  if (!env.DATABASE_URL || env.MAP_LOCATION_CLEANUP_SWEEP_ENABLED === 'false') return null;
  const cleanupExpired = repository.cleanupExpired?.bind(repository);
  if (!cleanupExpired) return null;

  let running = false;
  const run = async () => {
    if (running) return;
    running = true;
    try {
      await cleanupExpired();
    } catch (error) {
      console.warn('map_location_cleanup_sweep_failed', {
        errorName: error instanceof Error ? error.name : 'UnknownError',
      });
    } finally {
      running = false;
    }
  };

  const bootTimer = setTimeout(() => {
    void run();
  }, 2000);
  const interval = setInterval(() => {
    void run();
  }, mapLocationCleanupSweepIntervalMs);
  bootTimer.unref?.();
  interval.unref?.();

  return () => {
    clearTimeout(bootTimer);
    clearInterval(interval);
  };
}

export function startContentOperationsSweep({
  env = process.env,
  repository = createContentOperationsRepository({ env }),
}: {
  env?: Record<string, string | undefined>;
  repository?: {
    maybeDispatchContentRebuild?: () => Promise<unknown>;
    deliverQueuedReviewNotifications?: (options?: { limit?: number }) => Promise<unknown>;
    expireLiveOnboardingIfDue?: () => Promise<unknown>;
  };
} = {}): (() => void) | null {
  if (!env.DATABASE_URL || env.CONTENT_OPERATIONS_SWEEP_ENABLED === 'false') return null;
  const dispatch = repository.maybeDispatchContentRebuild?.bind(repository);
  const deliver = repository.deliverQueuedReviewNotifications?.bind(repository);
  const expire = repository.expireLiveOnboardingIfDue?.bind(repository);
  if (!dispatch && !deliver && !expire) return null;

  const intervalMs = parsePositiveInteger(env.CONTENT_OPERATIONS_SWEEP_INTERVAL_MS, 60 * 1000);

  let running = false;
  const run = async () => {
    if (running) return;
    running = true;
    try {
      if (expire) await expire();
      if (dispatch) await dispatch();
      if (deliver) await deliver({ limit: 20 });
    } catch (error) {
      console.warn('content_operations_sweep_failed', {
        errorName: error instanceof Error ? error.name : 'UnknownError',
      });
    } finally {
      running = false;
    }
  };

  const bootTimer = setTimeout(() => {
    void run();
  }, 3000);
  const interval = setInterval(() => {
    void run();
  }, intervalMs);
  bootTimer.unref?.();
  interval.unref?.();

  return () => {
    clearTimeout(bootTimer);
    clearInterval(interval);
  };
}

export function startImpactSyncSweep({
  env = process.env,
}: {
  env?: Record<string, string | undefined>;
} = {}): (() => void) | null {
  if (!env.DATABASE_URL || env.IMPACT_SYNC_SWEEP_ENABLED === 'false') return null;

  const intervalMs = parsePositiveInteger(env.IMPACT_SYNC_SWEEP_INTERVAL_MS, 6 * 60 * 60 * 1000);

  let running = false;
  const run = async () => {
    if (running) return;
    running = true;
    try {
      const result = await syncChapterImpactSnapshots({
        repository: createImpactRepository(),
        config: getImpactSyncConfig(env),
      });
      console.log('impact_sync_sweep_completed', {
        checked: result.checked,
        saved: result.saved,
        failed: result.failed,
      });
    } catch (error) {
      console.warn('impact_sync_sweep_failed', {
        errorName: error instanceof Error ? error.name : 'UnknownError',
      });
    } finally {
      running = false;
    }
  };

  const bootTimer = setTimeout(() => {
    void run();
  }, 15_000);
  const interval = setInterval(() => {
    void run();
  }, intervalMs);
  bootTimer.unref?.();
  interval.unref?.();

  return () => {
    clearTimeout(bootTimer);
    clearInterval(interval);
  };
}

serve({
  fetch: app.fetch,
  hostname,
  port,
}, (info) => {
  console.log(`network-agent listening on http://${info.address}:${info.port}`);
});

startMapNodeEditLinkDeliverySweep();
startMapLocationCleanupSweep();
startContentOperationsSweep();
startImpactSyncSweep();
