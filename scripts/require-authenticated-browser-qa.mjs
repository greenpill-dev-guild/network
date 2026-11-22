#!/usr/bin/env bun
// Runs before `agentic:browser-proof` and `agentic:verify` so their captures carry the right label
// (AGENTS.md, Browser Evidence). The run is clean-room proof: enough for public routes, never
// authenticated Brave proof.

const label = process.env.CI === 'true' ? 'CI Chrome' : 'headless Chrome';
console.warn(
  `[browser-qa] Label these captures \`${label}\`. They are rendered proof for public routes; an authenticated-class change still needs authenticated Brave proof, or a note that it is pending and why.`,
);
