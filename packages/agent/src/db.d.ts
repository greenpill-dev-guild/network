import type postgres from 'postgres';

export interface DatabaseClientOptions {
  url?: string;
  max?: number;
  connectTimeout?: number;
  idleTimeout?: number;
  maxLifetime?: number;
}

export interface DatabaseStatus {
  configured: boolean;
  connected: boolean;
  status: string;
  error?: string;
}

export function getDatabaseUrl(env?: Record<string, string | undefined>): string;
export function getMigrationDatabaseUrl(env?: Record<string, string | undefined>): string;
export function createDatabaseClient(options?: DatabaseClientOptions): postgres.Sql | null;
export function checkDatabaseConnection(options?: DatabaseClientOptions & {
  sql?: postgres.Sql;
}): Promise<DatabaseStatus>;
