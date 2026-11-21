import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import test from 'node:test';

const rootDir = resolve(new URL('..', import.meta.url).pathname);

const ROOTS = ['packages/', 'scripts/', 'docs/', 'config/', '.agents/', '.claude/', '.github/', '.plans/'];
const ROOT_FILES = new Set(['AGENTS.md', 'CLAUDE.md', 'README.md', 'package.json', 'bunfig.toml', 'tsconfig.base.json']);

function markdownFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(join(rootDir, dir), { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...markdownFiles(path));
    else if (entry.name.endsWith('.md')) out.push(path);
  }
  return out;
}

export function guidanceFiles(): string[] {
  const files = ['AGENTS.md', 'CLAUDE.md', 'packages/website/CLAUDE.md', '.agents/adapter.md'];
  files.push(...markdownFiles('.agents/skills'), ...markdownFiles('.claude/context'));
  return files.filter((file) => existsSync(join(rootDir, file)));
}

// A repository path named in guidance: a backticked token or a relative
// markdown link that starts at a known top-level folder or root file.
export function namedPaths(text: string): string[] {
  const candidates = [
    ...[...text.matchAll(/`([^`\s]+)`/g)].map((m) => m[1]),
    ...[...text.matchAll(/\]\(([^)\s#]+)(?:#[^)]*)?\)/g)].map((m) => m[1]),
  ];
  const paths = new Set<string>();
  for (const raw of candidates) {
    const path = raw.replace(/[),.;:]+$/, '').replace(/:\d+(-\d+)?$/, '');
    if (/[*<>{}$]/.test(path) || /^[a-z]+:\/\//.test(path)) continue;
    if (ROOTS.some((root) => path.startsWith(root)) || ROOT_FILES.has(path)) paths.add(path);
  }
  return [...paths];
}

// Build output such as packages/website/dist/ is gitignored and absent on a
// clean checkout. Guidance may name it, so paths under a plain .gitignore entry
// (a folder name like `dist/`, or an anchored path) are exempt.
const ignoreRules = readFileSync(join(rootDir, '.gitignore'), 'utf8')
  .split('\n')
  .map((line) => line.trim().replace(/^\*\*\//, ''))
  .filter((line) => line && !line.startsWith('#') && !line.startsWith('!') && !/[*?[]/.test(line));

export function isIgnored(path: string): boolean {
  const segments = path.split('/').filter(Boolean);
  return ignoreRules.some((rule) => {
    const bare = rule.replace(/^\//, '').replace(/\/$/, '');
    if (rule.startsWith('/') || bare.includes('/')) return path === bare || path.startsWith(`${bare}/`);
    return segments.includes(bare);
  });
}

function relativeLinks(file: string, text: string): string[] {
  return [...text.matchAll(/\]\((\.\.?\/[^)\s#]+)(?:#[^)]*)?\)/g)].map((m) => relative(rootDir, resolve(rootDir, dirname(file), m[1])));
}

test('every repository path named in agent guidance exists', () => {
  const missing: string[] = [];
  for (const file of guidanceFiles()) {
    const text = readFileSync(join(rootDir, file), 'utf8');
    for (const path of [...namedPaths(text), ...relativeLinks(file, text)]) {
      if (!existsSync(join(rootDir, path)) && !isIgnored(path)) missing.push(`${file}: ${path}`);
    }
  }
  assert.deepEqual(missing, [], `guidance names paths that do not exist:\n${missing.join('\n')}`);
});

test('the path extractor finds backticked and linked repository paths', () => {
  const text = 'See `packages/website/src/content.config.ts:12` and [guide](docs/x.md#y), not `bun run dev` or `packages/*/x`.';
  assert.deepEqual(namedPaths(text).sort(), ['docs/x.md', 'packages/website/src/content.config.ts']);
  assert.ok(statSync(join(rootDir, 'AGENTS.md')).isFile());
  assert.ok(isIgnored('packages/website/dist/'), 'build output is exempt');
  assert.ok(!isIgnored('packages/website/src/content.config.ts'), 'source paths are checked');
});
