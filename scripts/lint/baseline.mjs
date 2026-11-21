#!/usr/bin/env node
// A shrink-only lint baseline: per rule and file, the number of findings a
// repository still carries. Counts may go down; they never go up.
//
//   node baseline.mjs check  <baseline.json> <findings.json>
//   node baseline.mjs shrink <baseline.json> <findings.json>
//   node baseline.mjs init   <baseline.json> <findings.json>
//
// findings.json is the --json output of wrap-once.mjs, ESLint's JSON formatter
// or oxlint's --format=json. Counting per rule and file, not per line, keeps the
// baseline stable when code moves inside a file. `check` fails on any growth and
// on any rule and file the baseline does not list. `shrink` lowers counts to
// what remains and refuses to run while anything grew. `init` writes a first
// baseline and refuses to overwrite one: to grow a baseline, edit the file by
// hand in a reviewed change.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const toPosix = (p) => p.split(path.sep).join('/');

function relativeFile(file, root) {
  const f = String(file || '');
  return toPosix(path.isAbsolute(f) ? path.relative(root, f) : f);
}

// Findings from any of the supported reporters, as [{ rule, file }].
export function normalizeFindings(doc, { root = process.cwd() } = {}) {
  if (Array.isArray(doc?.findings)) return doc.findings.map((f) => ({ rule: f.rule, file: relativeFile(f.file, root) }));
  if (Array.isArray(doc?.diagnostics)) {
    // oxlint --format=json: { diagnostics: [{ code: "eslint(no-debugger)", filename }] }
    return doc.diagnostics.map((d) => ({ rule: d.code || 'unknown', file: relativeFile(d.filename, root) }));
  }
  if (Array.isArray(doc)) {
    // ESLint JSON: [{ filePath, messages: [{ ruleId }] }]
    return doc.flatMap((r) => (r.messages || []).map((m) => ({ rule: m.ruleId || 'parse-error', file: relativeFile(r.filePath, root) })));
  }
  throw new Error('unrecognized findings: expected wrap-once, ESLint or oxlint JSON');
}

export function countFindings(findings) {
  const counts = {};
  for (const { rule, file } of findings) {
    counts[rule] ??= {};
    counts[rule][file] = (counts[rule][file] || 0) + 1;
  }
  return counts;
}

export function compareBaseline(baseline, counts) {
  const known = baseline?.counts || {};
  const grown = [];
  const added = [];
  const shrunk = [];
  for (const [rule, files] of Object.entries(counts)) {
    for (const [file, now] of Object.entries(files)) {
      const was = known[rule]?.[file] || 0;
      if (now > was) (was === 0 ? added : grown).push({ rule, file, was, now });
    }
  }
  for (const [rule, files] of Object.entries(known)) {
    for (const [file, was] of Object.entries(files)) {
      const now = counts[rule]?.[file] || 0;
      if (now < was) shrunk.push({ rule, file, was, now });
    }
  }
  return { grown, added, shrunk, ok: grown.length === 0 && added.length === 0 };
}

export function shrinkBaseline(baseline, counts) {
  const result = compareBaseline(baseline, counts);
  if (!result.ok) throw new Error(`refusing to shrink: ${result.grown.length + result.added.length} count(s) grew; fix them, or raise the baseline by hand in a reviewed change`);
  const next = {};
  for (const [rule, files] of Object.entries(baseline.counts || {})) {
    for (const [file, was] of Object.entries(files)) {
      const now = Math.min(was, counts[rule]?.[file] || 0);
      if (now > 0) (next[rule] ??= {})[file] = now;
    }
  }
  return { ...baseline, counts: sortCounts(next) };
}

function sortCounts(counts) {
  return Object.fromEntries(Object.keys(counts).sort().map((rule) => [rule, Object.fromEntries(Object.keys(counts[rule]).sort().map((f) => [f, counts[rule][f]]))]));
}

export function newBaseline(counts, note = 'Shrink-only: counts may go down, never up. Lower them with baseline.mjs shrink.') {
  return { version: 1, note, counts: sortCounts(counts) };
}

export function readBaseline(file) {
  const doc = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (doc.version !== 1 || typeof doc.counts !== 'object') throw new Error(`${file} is not a version 1 baseline`);
  return doc;
}

const writeJson = (file, doc) => fs.writeFileSync(file, `${JSON.stringify(doc, null, 2)}\n`);

export function describe(result) {
  const lines = [];
  for (const g of result.grown) lines.push(`grew   ${g.rule} ${g.file}: ${g.was} -> ${g.now}`);
  for (const a of result.added) lines.push(`new    ${a.rule} ${a.file}: ${a.now}`);
  if (result.shrunk.length) lines.push(`${result.shrunk.length} count(s) went down; run baseline.mjs shrink to lock that in`);
  return lines;
}

export function main(argv = process.argv.slice(2)) {
  const [command, baselineFile, findingsFile] = argv;
  if (!['check', 'shrink', 'init'].includes(command) || !baselineFile || !findingsFile) {
    console.error('usage: baseline.mjs check|shrink|init <baseline.json> <findings.json>');
    return 2;
  }
  const counts = countFindings(normalizeFindings(JSON.parse(fs.readFileSync(findingsFile, 'utf8'))));
  if (command === 'init') {
    if (fs.existsSync(baselineFile)) {
      console.error(`${baselineFile} exists; a baseline only shrinks. Raise a count by hand in a reviewed change.`);
      return 1;
    }
    writeJson(baselineFile, newBaseline(counts));
    console.log(`wrote ${baselineFile}`);
    return 0;
  }
  const baseline = readBaseline(baselineFile);
  const result = compareBaseline(baseline, counts);
  for (const line of describe(result)) console.log(line);
  if (command === 'check') return result.ok ? 0 : 1;
  if (!result.ok) {
    console.error('refusing to shrink while counts grew');
    return 1;
  }
  writeJson(baselineFile, shrinkBaseline(baseline, counts));
  console.log(`${baselineFile}: ${result.shrunk.length} count(s) lowered`);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(fs.realpathSync(process.argv[1])).href) process.exitCode = main();
