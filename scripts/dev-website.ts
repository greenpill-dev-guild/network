#!/usr/bin/env bun

import { watch } from 'node:fs';
import { spawn, type ChildProcess } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const websiteDir = resolve(rootDir, 'packages/website');
const websitePort = process.env.NETWORK_WEBSITE_PORT ?? '3301';
const operationalSeedDir = resolve(rootDir, 'packages/website/src/data/operational-content-seed');

let snapshotTimer: ReturnType<typeof setTimeout> | null = null;
let snapshotRunning = false;
let snapshotQueued = false;

function runCommand(label: string, cmd: string[], cwd = rootDir) {
  console.log(`[dev:website] ${label}`);
  return spawn(cmd[0], cmd.slice(1), {
    cwd,
    stdio: 'inherit',
  });
}

async function waitForSuccess(label: string, cmd: string[], cwd = rootDir) {
  const proc = runCommand(label, cmd, cwd);
  const exitCode = await waitForExit(proc);
  if (exitCode !== 0) {
    throw new Error(`${label} failed with exit code ${exitCode}`);
  }
}

function waitForExit(proc: ChildProcess) {
  return new Promise<number>((resolveExit) => {
    proc.once('exit', (code, signal) => {
      if (typeof code === 'number') {
        resolveExit(code);
        return;
      }
      resolveExit(signal ? 1 : 0);
    });
  });
}

async function writeOperationalSnapshot(reason: string) {
  if (snapshotRunning) {
    snapshotQueued = true;
    return;
  }

  snapshotRunning = true;
  try {
    await waitForSuccess(
      `refreshing operational content snapshot (${reason})`,
      ['bun', 'run', 'content:snapshot']
    );
  } catch (error) {
    console.error(
      `[dev:website] operational content snapshot refresh failed: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  } finally {
    snapshotRunning = false;
    if (snapshotQueued) {
      snapshotQueued = false;
      await writeOperationalSnapshot('queued change');
    }
  }
}

function scheduleOperationalSnapshot(fileName = 'seed file change') {
  if (snapshotTimer) clearTimeout(snapshotTimer);
  snapshotTimer = setTimeout(() => {
    snapshotTimer = null;
    void writeOperationalSnapshot(fileName);
  }, 150);
}

function startOperationalContentWatcher() {
  try {
    const watcher = watch(
      operationalSeedDir,
      { recursive: true },
      (_eventType, fileName) => {
        const changedFile = String(fileName || '');
        if (!changedFile.endsWith('.json')) return;
        scheduleOperationalSnapshot(changedFile);
      }
    );

    watcher.on('error', (error) => {
      console.error(`[dev:website] operational content watcher failed: ${error.message}`);
    });

    console.log(`[dev:website] watching ${operationalSeedDir}`);
    return watcher;
  } catch (error) {
    console.error(
      `[dev:website] could not start operational content watcher: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return null;
  }
}

await waitForSuccess('building workspace packages', ['bun', 'run', 'build:packages']);

const watcher = startOperationalContentWatcher();
const astro = runCommand('starting Astro dev server', ['bun', '--bun', 'astro', 'dev', '--host', '127.0.0.1', '--port', websitePort], websiteDir);

const close = () => {
  watcher?.close();
  astro.kill();
};

process.on('SIGINT', () => {
  close();
  process.exit(130);
});
process.on('SIGTERM', () => {
  close();
  process.exit(143);
});

const exitCode = await waitForExit(astro);
watcher?.close();
process.exit(exitCode);
