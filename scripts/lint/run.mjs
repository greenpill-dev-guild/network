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
import {
  compareBaseline,
  countFindings,
  describe,
  normalizeFindings,
  readBaseline,
  shrinkBaseline,
} from './baseline.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const baselineFile = path.join(root, '.agents/lint-baseline.json');
export const OXLINT_TARGETS = [
  'packages/agent/src',
  'packages/shared/src',
  'packages/website/src',
  'packages/admin',
  'scripts',
];

function runJson(command, args) {
  const result = spawnSync(command, args, { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (result.error) throw result.error;
  // A linter exits non-zero when it reports findings; only unreadable output is an error.
  const start = result.stdout.indexOf('{');
  if (start === -1) throw new Error(`${command} ${args.join(' ')} printed no JSON:\n${result.stderr || result.stdout}`);
  return JSON.parse(result.stdout.slice(start));
}

// Each reader fails closed: a tool that read nothing, or reported something
// other than findings, stops the gate instead of passing it with fewer counts.
export function oxlintFindings(doc) {
  if (!(doc.number_of_files > 0)) throw new Error('oxlint linted no files; check OXLINT_TARGETS and .oxlintrc.json');
  return normalizeFindings(doc, { root });
}

export function biomeFindings(doc) {
  const diagnostics = doc.diagnostics || [];
  const other = diagnostics.filter((d) => d.category !== 'format' || !d.location?.path);
  if (other.length)
    throw new Error(
      `biome reported ${other.length} diagnostic(s) that are not formatting, such as ${other[0].category}: ${other[0].message}`,
    );
  const summary = doc.summary || {};
  if (summary.diagnosticsNotPrinted !== 0 || summary.errors !== diagnostics.length) {
    throw new Error(
      `biome's summary (${summary.errors} errors, ${summary.diagnosticsNotPrinted} not printed) does not match its ${diagnostics.length} diagnostics; the JSON reporter may have changed`,
    );
  }
  if (!(summary.unchanged + summary.changed > 0))
    throw new Error('biome formatted no files; check biome.json files.includes');
  return diagnostics.map((d) => ({ rule: 'biome(format)', file: d.location.path }));
}

export function wrapOnceFindings(
  doc,
  config = JSON.parse(fs.readFileSync(path.join(root, '.agents/wrap-once.json'), 'utf8')),
) {
  const missing = (config.scopes || []).filter((scope) => !fs.existsSync(path.join(root, scope)));
  if (!config.scopes?.length || missing.length)
    throw new Error(`wrap-once scopes missing: ${missing.join(', ') || 'none configured'}`);
  return normalizeFindings(doc, { root });
}

export function collectFindings() {
  const oxlint = oxlintFindings(runJson('bun', ['x', 'oxlint', '--format=json', ...OXLINT_TARGETS]));
  const wrapOnce = wrapOnceFindings(
    runJson('bun', ['scripts/lint/wrap-once.mjs', '--config', '.agents/wrap-once.json', '--root', '.', '--json']),
  );
  const biome = biomeFindings(
    runJson('bun', ['x', 'biome', 'format', '--reporter=json', '--max-diagnostics=none', '.']),
  );
  return [...oxlint, ...wrapOnce, ...biome];
}

function main(command = 'check') {
  const counts = countFindings(collectFindings());
  const baseline = readBaseline(baselineFile);
  const result = compareBaseline(baseline, counts);
  for (const line of describe(result)) console.log(line);
  if (!result.ok) {
    console.error(
      `lint: ${result.grown.length + result.added.length} rule and file count(s) grew past .agents/lint-baseline.json. Fix them; the baseline only shrinks.`,
    );
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
