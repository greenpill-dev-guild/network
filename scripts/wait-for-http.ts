#!/usr/bin/env bun

const [url, timeoutMsArg = '60000'] = process.argv.slice(2);
const timeoutMs = Number(timeoutMsArg);

if (!url) {
  console.error('Usage: wait-for-http <url> [timeoutMs]');
  process.exit(1);
}

const resolvedTimeoutMs = Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 60000;
const deadline = Date.now() + resolvedTimeoutMs;

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

while (Date.now() < deadline) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(3000) });
    if (response.ok) {
      console.log(`${url} is ready`);
      process.exit(0);
    }
  } catch {
    // Keep polling until the timeout. The caller decides whether a failure is fatal.
  }

  await sleep(750);
}

console.error(`${url} did not become ready within ${resolvedTimeoutMs}ms`);
process.exit(1);
