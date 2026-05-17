import postgres from 'postgres';

const DEFAULT_CONNECT_TIMEOUT_SECONDS = 3;
const DEFAULT_IDLE_TIMEOUT_SECONDS = 300;
const DEFAULT_MAX_LIFETIME_SECONDS = 600;

const cleanString = (value) => (typeof value === 'string' ? value.trim() : '');

export function getDatabaseUrl(env = process.env) {
  return cleanString(env.DATABASE_URL);
}

export function createDatabaseClient({
  url = getDatabaseUrl(),
  max = 5,
  connectTimeout = DEFAULT_CONNECT_TIMEOUT_SECONDS,
  idleTimeout = DEFAULT_IDLE_TIMEOUT_SECONDS,
  maxLifetime = DEFAULT_MAX_LIFETIME_SECONDS,
} = {}) {
  if (!url) return null;

  return postgres(url, {
    max,
    connect_timeout: connectTimeout,
    idle_timeout: idleTimeout,
    max_lifetime: maxLifetime,
    prepare: false,
  });
}

export async function checkDatabaseConnection(options = {}) {
  const providedClient = options.sql;
  const sql = providedClient ?? createDatabaseClient(options);
  if (!sql) {
    return {
      configured: false,
      connected: false,
      status: 'missing_database_url',
    };
  }

  try {
    const [result] = await sql`select 1::int as ok`;
    return {
      configured: true,
      connected: result?.ok === 1,
      status: result?.ok === 1 ? 'ok' : 'unexpected_response',
    };
  } catch (error) {
    return {
      configured: true,
      connected: false,
      status: 'connection_error',
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    if (!providedClient) {
      await sql.end({ timeout: 1 }).catch(() => {});
    }
  }
}
