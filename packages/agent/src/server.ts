import { serve } from '@hono/node-server';
import { app } from './app.js';
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

export function startMapNodeEditLinkDeliverySweep({
  env = process.env,
  repository = createMapNodeRepository({ env }),
}: {
  env?: Record<string, string | undefined>;
  repository?: { deliverQueuedEditLinks?: (options?: { limit?: number }) => Promise<unknown> };
} = {}): (() => void) | null {
  if (!env.DATABASE_URL || env.MAP_NODE_EDIT_LINK_DELIVERY_SWEEP_ENABLED === 'false') return null;
  if (typeof repository.deliverQueuedEditLinks !== 'function') return null;
  const deliverQueuedEditLinks = repository.deliverQueuedEditLinks.bind(repository);

  let running = false;
  const run = async () => {
    if (running) return;
    running = true;
    try {
      await deliverQueuedEditLinks({ limit: 20 });
    } catch (error) {
      console.warn('map_node_edit_link_delivery_sweep_failed', {
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
  }, editLinkDeliverySweepIntervalMs);
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
