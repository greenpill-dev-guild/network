import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const agentDir = resolve(rootDir, 'packages/agent');
const envFile = resolve(rootDir, '.env.local');

const localDatabaseUrl = 'postgres://greenpill:greenpill@127.0.0.1:3304/greenpill_network';
const deprecatedLocalPort = ['543', '29'].join('');
const deprecatedLocalDatabaseUrls = new Set([
  `postgres://greenpill:greenpill@localhost:${deprecatedLocalPort}/greenpill_network`,
  `postgres://greenpill:greenpill@127.0.0.1:${deprecatedLocalPort}/greenpill_network`,
]);

function unquote(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseEnvLine(line: string): [string, string] | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return null;

  const normalized = trimmed.startsWith('export ') ? trimmed.slice(7).trim() : trimmed;
  const separatorIndex = normalized.indexOf('=');
  if (separatorIndex <= 0) return null;

  const key = normalized.slice(0, separatorIndex).trim();
  const value = normalized.slice(separatorIndex + 1);
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) return null;

  return [key, unquote(value)];
}

function loadLocalEnvDefaults(): void {
  if (!existsSync(envFile)) return;

  const content = readFileSync(envFile, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const parsed = parseEnvLine(line);
    if (!parsed) continue;

    const [key, value] = parsed;
    if (process.env[key] === undefined || process.env[key] === '') {
      process.env[key] = value;
    }
  }
}

loadLocalEnvDefaults();

process.env.AGENT_HOST ||= '127.0.0.1';
process.env.AGENT_PORT ||= '3303';
process.env.PORT ||= process.env.AGENT_PORT;

if (!process.env.DATABASE_URL || deprecatedLocalDatabaseUrls.has(process.env.DATABASE_URL)) {
  if (deprecatedLocalDatabaseUrls.has(process.env.DATABASE_URL ?? '')) {
    console.warn('Detected deprecated local DATABASE_URL port 54329; using dev-surface Postgres on 3304.');
  }
  process.env.DATABASE_URL = localDatabaseUrl;
}

if (!process.env.DIRECT_DATABASE_URL || deprecatedLocalDatabaseUrls.has(process.env.DIRECT_DATABASE_URL)) {
  process.env.DIRECT_DATABASE_URL = process.env.DATABASE_URL;
}

const child = spawn('bun', ['--watch', 'src/server.ts'], {
  cwd: agentDir,
  env: process.env,
  stdio: 'inherit',
});

const forwardSignal = (signal: NodeJS.Signals): void => {
  if (!child.killed) child.kill(signal);
};

process.on('SIGINT', forwardSignal);
process.on('SIGTERM', forwardSignal);

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
