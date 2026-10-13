#!/usr/bin/env node

import { spawn } from "node:child_process";
import net from "node:net";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const localDatabaseUrl = "postgres://greenpill:greenpill@localhost:3304/greenpill_network";
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
  DIRECTUS_PUBLIC_URL: "http://localhost:3302",
  AGENT_HOST: "localhost",
  AGENT_PORT: "3303",
  PORT: "3303",
};

// `db:local:up` and `admin:down` in package.json name the same two files.
const postgresComposeFile = "packages/agent/docker-compose.yml";
const directusComposeFile = "packages/admin/docker-compose.yml";

const longRunningTargets = [
  {
    label: "website",
    command: ["bun", "--no-env-file", "scripts/dev-website.ts"],
    env: {},
    url: "http://localhost:3301/",
    readyUrl: "http://localhost:3301/",
  },
  {
    label: "directus",
    command: ["bun", "--no-env-file", "scripts/docker-compose.ts", "-f", directusComposeFile, "up", "admin-directus"],
    env: directusEnv,
    url: "http://localhost:3302/",
    readyUrl: "http://localhost:3302/server/ping",
  },
  {
    label: "agent",
    command: ["bun", "--no-env-file", "scripts/run-agent-dev.ts"],
    env: agentEnv,
    url: "http://localhost:3303/health",
    readyUrl: "http://localhost:3303/health",
  },
];

// A service that is already running is used as it is and left running at exit; this run stops only what it
// started. That covers a stack you started yourself, and the isolated dev machine, where Docker stays on the Mac:
// Postgres and Directus are started there with `docker compose`, `dm-ports` relays their ports in, and this
// coordinator runs everything else against them.
let startedPostgres = false;
let startedDirectus = false;

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

// True when Postgres itself answers on the port. A bare TCP connect is not enough: inside the isolated dev
// machine the port is relayed from the Mac, and the relay accepts a connection even when nothing listens behind
// it. Postgres answers an SSLRequest with a single byte, "S" or "N".
function postgresAnswers(host, port, timeoutMs = 2000) {
  return new Promise((resolve) => {
    const socket = net.connect({ host, port });
    const finish = (answer) => {
      socket.destroy();
      resolve(answer);
    };
    socket.setTimeout(timeoutMs, () => finish(false));
    socket.once("error", () => finish(false));
    socket.once("close", () => resolve(false));
    socket.once("connect", () => socket.write(Buffer.from([0, 0, 0, 8, 4, 210, 22, 47])));
    socket.once("data", (data) => finish(data[0] === 0x53 || data[0] === 0x4e));
  });
}

async function waitForPostgres(host, port, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await postgresAnswers(host, port)) return;
    await sleep(750);
  }
  throw new Error(`Timed out waiting for Postgres on ${host}:${port}`);
}

// What Docker says about a Compose service: "running", "stopped", or "unavailable" when there is no Docker to ask
// (inside the isolated dev machine) or the question itself fails.
function composeServiceState(composeFile, service) {
  return new Promise((resolve) => {
    const child = spawn(
      "bun",
      ["--no-env-file", "scripts/docker-compose.ts", "-f", composeFile, "ps", "--status", "running", "-q", service],
      { cwd: repoRoot, stdio: ["ignore", "pipe", "ignore"] },
    );
    let output = "";
    child.stdout.on("data", (chunk) => {
      output += chunk;
    });
    child.once("error", () => resolve("unavailable"));
    child.once("exit", (code) => {
      if (code !== 0) resolve("unavailable");
      else resolve(output.trim() ? "running" : "stopped");
    });
  });
}

// "running" when the service answers, or when Docker has its container up although it did not answer just now:
// one slow reply must not make this run take over, and later stop, a service it did not start.
async function serviceState(answers, composeFile, service) {
  if (await answers()) return "running";
  return composeServiceState(composeFile, service);
}

async function httpAnswers(url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(3000) });
    await response.arrayBuffer().catch(() => undefined);
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForHttp(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await httpAnswers(url)) return;
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

  if (startedDirectus) {
    await runCommand("directus down", ["bun", "run", "admin:down"]).catch((error) => {
      console.error(`[dev] ${error instanceof Error ? error.message : String(error)}`);
    });
  }
  if (startedPostgres) {
    await runCommand("postgres down", ["bun", "run", "db:local:down"]).catch((error) => {
      console.error(`[dev] ${error instanceof Error ? error.message : String(error)}`);
    });
  }

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
  const postgres = await serviceState(() => postgresAnswers("localhost", 3304), postgresComposeFile, "agent-postgres");
  if (postgres === "running") {
    console.log("[dev] Postgres is already running on localhost:3304; using it and leaving it running at exit.");
  } else {
    await runCommand("postgres up", ["bun", "run", "db:local:up"]);
    startedPostgres = postgres === "stopped";
  }
  await waitForPostgres("localhost", 3304, 60_000);
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
  const directusState = await serviceState(() => httpAnswers(directus.readyUrl), directusComposeFile, "admin-directus");
  if (directusState === "running") {
    console.log("[dev] Directus is already running on localhost:3302; using it and leaving it running at exit.");
  } else {
    spawnTarget(directus);
    startedDirectus = directusState === "stopped";
  }
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
  console.log("[dev] Postgres: postgres://greenpill:greenpill@localhost:3304/greenpill_network");
  console.log("[dev] Press Ctrl+C to stop.");

  await new Promise(() => {});
} catch (error) {
  console.error(`[dev] ${error instanceof Error ? error.message : String(error)}`);
  await cleanup(1);
}
