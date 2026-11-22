#!/usr/bin/env bun
// Runs before `agentic:browser-proof` and `agentic:verify` so their captures carry the right label
// (AGENTS.md, Browser Evidence). The run is clean-room proof: enough for public routes, never
// authenticated Brave proof. Without a browser `ui:verify` would skip and capture nothing, so the
// run stops here instead of passing as proof.
import { findChromeBinary } from './ui-verify.ts';

const sourceOnly = process.env.UI_VERIFY_SOURCE_ONLY === '1' || process.argv.includes('--source-only');
if (sourceOnly) {
  console.warn('[browser-qa] Source-only run: no captures, so this is not rendered proof.');
  process.exit(0);
}

const binary = findChromeBinary();
if (!binary) {
  console.error(
    '[browser-qa] No Chrome or Chromium binary found (set CHROME_BIN), so this run would capture nothing. Label the proof `none`.',
  );
  process.exit(1);
}

// The label names the engine that will run: discovery can pick Chromium or Edge as well as Chrome.
const engine = /edge/i.test(binary) ? 'Edge' : /chromium/i.test(binary) ? 'Chromium' : 'Chrome';
const label = `${process.env.CI === 'true' ? 'CI' : 'headless'} ${engine}`;
console.warn(
  `[browser-qa] Label these captures \`${label}\`. They are rendered proof for public routes; an authenticated-class change still needs authenticated Brave proof, or a note that it is pending and why.`,
);
