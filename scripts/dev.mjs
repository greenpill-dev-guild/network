#!/usr/bin/env node

import { spawn } from "node:child_process";
import net from "node:net";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const localDatabaseUrl = "postgres://greenpill:greenpill@127.0.0.1:3304/greenpill_network";
const directusDatabaseUrl = "postgres://greenpill:greenpill@host.docker.internal:3304/greenpill_network";

const dbEnv = {
  DATABASE_URL: localDatabaseUrl,
  DIRECT_DATABASE_URL: localDatabaseUrl,
};

const directusEnv = {
  DIRECTUS_PUBLIC_URL: "http://localhost:3302",
  DIRECTUS_DB_CONNECTION_STRING: directusDatabaseUrl,
  DIRECTUS_ADMIN_EMAIL: "admin@greenpill.network",
  DIRECTUS_ADMIN_PASSWORD: "directus-local-password",
  DIRECTUS_CORS_ORIGIN:
    "http://localhost:3301,http://127.0.0.1:3301,http://localhost:3302,https://greenpill.network,https://www.greenpill.network,https://network-admin.fly.dev,https://admin.greenpill.network",
};

const agentEnv = {
  ...dbEnv,
  AGENT_HOST: "127.0.0.1",
  AGENT_PORT: "3303",
  PORT: "3303",
};

const longRunningTargets = [
  {
    label: "website",
    command: ["bun", "run", "dev:website"],
    env: {},
    url: "http://localhost:3301/",
    readyUrl: "http://localhost:3301/",
  },
  {
    label: "directus",
    command: ["bun", "run", "dev:admin"],
    env: directusEnv,
    url: "http://localhost:3302/",
    readyUrl: "http://localhost:3302/server/ping",
  },
  {
    label: "agent",
    command: ["bun", "run", "dev:agent"],
    env: agentEnv,
    url: "http://localhost:3303/health",
    readyUrl: "http://localhost:3303/health",
  },
];

let shuttingDown = false;
const children = [];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function targetEnv(extra = {}) {
  return {
    ...process.env,
    ...extra,
  };
}

function pipe(label, stream, writer) {
  if (!stream) return;
  const rl = readline.createInterface({ input: stream });
  rl.on("line", (line) => writer.write(`[${label}] ${line}\n`));
}

function spawnTarget(target) {
  const child = spawn(target.command[0], target.command.slice(1), {
    cwd: repoRoot,
    env: targetEnv(target.env),
    stdio: ["ignore", "pipe", "pipe"],
  });

  children.push(child);
  pipe(target.label, child.stdout, process.stdout);
  pipe(target.label, child.stderr, process.stderr);
  child.on("exit", (code, signal) => {
    if (shuttingDown) return;
    console.error(
      `[dev] ${target.label} exited${signal ? ` from ${signal}` : ` with ${code ?? 1}`}. Stopping Network dev.`,
    );
    void cleanup(code ?? 1);
  });
  return child;
}

function killChild(child, signal = "SIGTERM") {
  if (!child.pid || child.killed) return;
  try {
    process.kill(-child.pid, signal);
  } catch {
    try {
      child.kill(signal);
    } catch {
      // Already gone.
    }
  }
}

async function runCommand(label, command, env = {}) {
  console.log(`[dev] ${label}`);
  const child = spawn(command[0], command.slice(1), {
    cwd: repoRoot,
    env: targetEnv(env),
    stdio: ["ignore", "pipe", "pipe"],
  });
  children.push(child);
  pipe(label, child.stdout, process.stdout);
  pipe(label, child.stderr, process.stderr);

  const exitCode = await new Promise((resolve) => {
    child.on("exit", (code, signal) => {
      if (signal) resolve(1);
      else resolve(code ?? 1);
    });
  });
  const index = children.indexOf(child);
  if (index >= 0) children.splice(index, 1);

  if (exitCode !== 0) {
    throw new Error(`${label} failed with exit code ${exitCode}`);
  }
}

async function waitForTcp(host, port, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const connected = await new Promise((resolve) => {
      const socket = net.connect({ host, port });
      socket.once("connect", () => {
        socket.destroy();
        resolve(true);
      });
      socket.once("error", () => resolve(false));
      socket.setTimeout(2000, () => {
        socket.destroy();
        resolve(false);
      });
    });
    if (connected) return;
    await sleep(750);
  }
  throw new Error(`Timed out waiting for ${host}:${port}`);
}

async function waitForHttp(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(3000) });
      await response.arrayBuffer().catch(() => undefined);
      if (response.ok) return;
    } catch {
      // Service is still booting.
    }
    await sleep(1000);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function cleanup(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;

  for (const child of children) killChild(child);
  await sleep(1500);
  for (const child of children) killChild(child, "SIGKILL");

  await runCommand("directus down", ["bun", "run", "admin:down"]).catch((error) => {
    console.error(`[dev] ${error instanceof Error ? error.message : String(error)}`);
  });
  await runCommand("postgres down", ["bun", "run", "db:local:down"]).catch((error) => {
    console.error(`[dev] ${error instanceof Error ? error.message : String(error)}`);
  });

  process.exit(exitCode);
}

process.on("SIGINT", () => {
  void cleanup(0);
});
process.on("SIGTERM", () => {
  void cleanup(0);
});

try {
  console.log("[dev] Greenpill Network local environment starting.");
  await runCommand("postgres up", ["bun", "run", "db:local:up"]);
  await waitForTcp("127.0.0.1", 3304, 60_000);
  await runCommand("build packages", ["bun", "run", "build:packages"], dbEnv);
  await runCommand("database migrations", ["bun", "--no-env-file", "scripts/agent-db.migrate.ts"], dbEnv);
  await runCommand(
    "operational content seed",
    ["bun", "--no-env-file", "scripts/operational-content.ts", "--migrate", "--allow-existing"],
    dbEnv,
  );

  const website = longRunningTargets.find((target) => target.label === "website");
  const directus = longRunningTargets.find((target) => target.label === "directus");
  const agent = longRunningTargets.find((target) => target.label === "agent");

  spawnTarget(website);
  spawnTarget(directus);
  await waitForHttp(directus.readyUrl, 120_000);
  await runCommand("directus bootstrap", ["bun", "run", "directus:local:bootstrap"], directusEnv);
  spawnTarget(agent);

  await Promise.all([
    waitForHttp(website.readyUrl, 120_000),
    waitForHttp(directus.readyUrl, 120_000),
    waitForHttp(agent.readyUrl, 120_000),
  ]);

  console.log("[dev] Greenpill Network local environment ready:");
  for (const target of longRunningTargets) console.log(`[dev] ${target.label}: ${target.url}`);
  console.log("[dev] Postgres: postgres://greenpill:greenpill@127.0.0.1:3304/greenpill_network");
  console.log("[dev] Press Ctrl+C to stop.");

  await new Promise(() => {});
} catch (error) {
  console.error(`[dev] ${error instanceof Error ? error.message : String(error)}`);
  await cleanup(1);
}
