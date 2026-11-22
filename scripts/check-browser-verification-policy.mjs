#!/usr/bin/env bun

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';

const repoRoot = process.cwd();
const requiredPolicyFiles = ["AGENTS.md", "CLAUDE.md", "packages/website/CLAUDE.md", ".agents/skills/greenpill-ui/SKILL.md"];

// AGENTS.md owns the Browser Evidence rules; other guidance points to it instead of restating them.
const requiredPhrases = {
  'AGENTS.md': [
    '### Browser Evidence',
    'Label every rendered proof',
    'Authenticated-session proof is required only for the authenticated surface class',
    'record the authenticated-class proof as pending',
    'Do not substitute an isolated Browser, Playwright or DevTools MCP profile for authenticated-class proof',
  ],
  'packages/website/CLAUDE.md': ['`AGENTS.md` § Browser Evidence'],
  '.agents/skills/greenpill-ui/SKILL.md': ['`AGENTS.md` § Browser Evidence'],
};

// Guidance outside AGENTS.md and CLAUDE.md files that restated the old rule.
const extraGuidanceFiles = ['.agents/adapter.md', '.claude/context/validation-pipeline.md'];

const failures = [];

function fail(message) {
  failures.push(message);
}

function read(relPath) {
  return readFileSync(join(repoRoot, relPath), 'utf8');
}

function walk(dir, result = []) {
  if (!existsSync(dir)) return result;
  for (const entry of readdirSync(dir)) {
    if (
      [
        '.git',
        '.cache',
        '.claude',
        '.next',
        'node_modules',
        'dist',
        'build',
        'build-storybook',
        'output',
      ].includes(entry)
    ) {
      continue;
    }
    const fullPath = join(dir, entry);
    let stat;
    try {
      stat = statSync(fullPath);
    } catch {
      continue;
    }
    if (stat.isDirectory()) {
      walk(fullPath, result);
    } else if (entry === 'AGENTS.md' || entry === 'CLAUDE.md') {
      result.push(fullPath);
    }
  }
  return result;
}

for (const relPath of requiredPolicyFiles) {
  if (!existsSync(join(repoRoot, relPath))) {
    fail(`${relPath}: missing required Browser Evidence policy file`);
    continue;
  }

  // A one-line `@AGENTS.md` import carries AGENTS.md's policy, which is checked itself.
  const text = read(relPath);
  const importedGuide = join(dirname(relPath), 'AGENTS.md');
  if (relPath !== importedGuide && /^@(\.\/)?AGENTS\.md$/.test(text.trim()) && requiredPolicyFiles.includes(importedGuide)) continue;
  for (const phrase of requiredPhrases[relPath] ?? []) {
    if (!text.includes(phrase)) {
      fail(`${relPath}: missing required Browser Evidence phrase "${phrase}"`);
    }
  }
}

const stalePatterns = [
  /Browser verification has two lanes/i,
  /Use isolated browser proof/i,
  /deterministic public[-/ ](route|website|app|login)/i,
  /For local human\/agent browser walkthroughs[^\n]*isolated/i,
  /prefer Brave with an isolated/i,
  /use Brave with an\s+isolated/i,
  /shared posture Brave-first/i,
  /Use `bun run agentic:browser-proof/i,
  /Build-backed browser proof:\s*`bun run agentic:browser-proof`/i,
  /Brave MCP live DOM/i,
  /Brave-backed browser MCP/i,
  /DevTools MCP path for live browser debugging/i,
  /isolated\/public proof lane/i,
  /browser proof still runs in Brave/i,
  /only when the authenticated QA browser is Chrome\/Edge/i,
  /Brave-only QA/i,
  /Chrome\/Edge QA profiles/i,
  /for Brave-only QA/i,
  // The rule before Browser Evidence: every local check in authenticated Brave, or blocked.
  /Local agentic browser QA must use the authenticated Brave/i,
  /report QA as blocked/i,
  /mark the proof `BLOCKED`/i,
  /record that proof as blocked/i,
  /Do not use isolated Browser, Playwright, or DevTools MCP profiles for local QA/i,
];

for (const filePath of [...walk(repoRoot), ...extraGuidanceFiles.map((file) => join(repoRoot, file))]) {
  if (!existsSync(filePath)) continue;
  const relPath = relative(repoRoot, filePath);
  const text = readFileSync(filePath, 'utf8');
  for (const pattern of stalePatterns) {
    if (pattern.test(text)) {
      fail(`${relPath}: stale isolated-browser QA guidance matched ${pattern}`);
    }
  }
}

const packageJsonPath = join(repoRoot, 'package.json');
if (existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
  const scripts = packageJson.scripts ?? {};

  if (scripts['check:browser-verification-policy'] !== 'bun --no-env-file scripts/check-browser-verification-policy.mjs') {
    fail('package.json: missing check:browser-verification-policy script');
  }

  if (!scripts['agentic:check']?.includes('check:browser-verification-policy')) {
    fail('package.json: agentic:check must run check:browser-verification-policy');
  }

  if (
    scripts['agentic:browser-proof'] &&
    !scripts['agentic:browser-proof'].startsWith('bun scripts/require-authenticated-browser-qa.mjs && ')
  ) {
    fail('package.json: agentic:browser-proof must run require-authenticated-browser-qa.mjs first, which labels its captures');
  }

  if (
    scripts['agentic:verify'] &&
    scripts['agentic:verify'].includes('ui:verify') &&
    !scripts['agentic:verify'].startsWith('bun scripts/require-authenticated-browser-qa.mjs')
  ) {
    fail('package.json: agentic:verify must run require-authenticated-browser-qa.mjs first, which labels its captures');
  }
}

if (failures.length > 0) {
  console.error('Browser Evidence policy check failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(
  `Browser Evidence policy check passed for ${requiredPolicyFiles.length} guidance file(s).`,
);
