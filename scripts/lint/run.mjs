#!/usr/bin/env node
// One lint gate for the repository: oxlint, the kit's wrap-once rules and
// Biome formatting, behind one shrink-only baseline (.agents/lint-baseline.json).
//
//   bun scripts/lint/run.mjs          check: fail on any new or grown finding
//   bun scripts/lint/run.mjs shrink   lower the baseline to what remains
//
// Counts are per rule and file, so code moving inside a file does not churn
// the baseline. A file that Biome would reformat counts once under
// `biome(format)`. baseline.mjs and wrap-once.mjs are copies of the shared
// agent kit (dev-surfaces agents/kit/lint); change them there first.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compareBaseline, countFindings, describe, normalizeFindings, readBaseline, shrinkBaseline } from './baseline.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const baselineFile = path.join(root, '.agents/lint-baseline.json');
export const OXLINT_TARGETS = ['packages/agent/src', 'packages/shared/src', 'packages/website/src', 'packages/admin', 'scripts'];

function runJson(command, args) {
  const result = spawnSync(command, args, { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (result.error) throw result.error;
  // A linter exits non-zero when it reports findings; only unreadable output is an error.
  const start = result.stdout.indexOf('{');
  if (start === -1) throw new Error(`${command} ${args.join(' ')} printed no JSON:\n${result.stderr || result.stdout}`);
  return JSON.parse(result.stdout.slice(start));
}

export function biomeFindings(doc) {
  return (doc.diagnostics || [])
    .filter((d) => d.category === 'format' && d.location?.path)
    .map((d) => ({ rule: 'biome(format)', file: d.location.path }));
}

export function collectFindings() {
  const oxlint = normalizeFindings(runJson('bun', ['x', 'oxlint', '--format=json', ...OXLINT_TARGETS]), { root });
  const wrapOnce = normalizeFindings(runJson('bun', ['scripts/lint/wrap-once.mjs', '--config', '.agents/wrap-once.json', '--root', '.', '--json']), { root });
  const biome = biomeFindings(runJson('bun', ['x', 'biome', 'format', '--reporter=json', '--max-diagnostics=none', '.']));
  return [...oxlint, ...wrapOnce, ...biome];
}

function main(command = 'check') {
  const counts = countFindings(collectFindings());
  const baseline = readBaseline(baselineFile);
  const result = compareBaseline(baseline, counts);
  for (const line of describe(result)) console.log(line);
  if (!result.ok) {
    console.error(`lint: ${result.grown.length + result.added.length} rule and file count(s) grew past .agents/lint-baseline.json. Fix them; the baseline only shrinks.`);
    return 1;
  }
  if (command === 'shrink') {
    fs.writeFileSync(baselineFile, `${JSON.stringify(shrinkBaseline(baseline, counts), null, 2)}\n`);
    console.log(`lint: lowered ${result.shrunk.length} count(s) in .agents/lint-baseline.json`);
  } else {
    console.log('lint: no new findings');
  }
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const command = process.argv[2] ?? 'check';
  if (!['check', 'shrink'].includes(command)) {
    console.error('usage: run.mjs [check|shrink]');
    process.exitCode = 2;
  } else {
    process.exitCode = main(command);
  }
}
