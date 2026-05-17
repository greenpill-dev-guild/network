import { serve } from '@hono/node-server';
import { app } from './app.js';

const parsePort = (value, fallback) => {
  const port = Number.parseInt(value ?? '', 10);
  return Number.isFinite(port) && port > 0 ? port : fallback;
};

const port = parsePort(process.env.PORT || process.env.AGENT_PORT, 8787);
const hostname = process.env.AGENT_HOST || '0.0.0.0';

serve({
  fetch: app.fetch,
  hostname,
  port,
}, (info) => {
  console.log(`network-agent listening on http://${info.address}:${info.port}`);
});
