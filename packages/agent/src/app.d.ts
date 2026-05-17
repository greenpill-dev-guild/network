import type { Hono } from 'hono';

export interface AgentAppOptions {
  checkDatabase?: () => Promise<{
    configured: boolean;
    connected: boolean;
    status: string;
    error?: string;
  }>;
}

export function createAgentApp(options?: AgentAppOptions): Hono;
export const app: Hono;
