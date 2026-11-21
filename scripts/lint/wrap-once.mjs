#!/usr/bin/env node
// wrap-once: raw timers, raw event listeners and unguarded async effects are
// wrapped once, in the files a repository names, and banned everywhere else.
//
//   node wrap-once.mjs [--config .agents/wrap-once.json] [--root .] [--json] [--baseline <file>]
//
// Lifted from Green Goods (scripts/quality/check-react-patterns.js rules 1 and 2,
// .claude/rules/react-patterns.md rule 3). These are the rules oxlint and Biome
// cannot express with an exemption for the one wrapper file, so they live here,
// as regex heuristics with no dependencies. Comments and string contents are
// blanked before matching. With --baseline, findings a shrink-only baseline
// already counts pass and only growth fails (see baseline.mjs).
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { compareBaseline, countFindings, describe, readBaseline } from './baseline.mjs';

const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', 'coverage', '.git', '__tests__', 'vendor', 'generated']);
const SOURCE = /\.(ts|tsx|js|jsx|mjs|cjs)$/;
const NOT_SOURCE = /\.(test|spec|stories)\.[cm]?[jt]sx?$|\.d\.ts$/;
// An effect counts as guarded when it names a mounted, cancelled, ignore, disposed,
// aborted or unsubscribed flag (in any case, as part of a longer name too) or
// returns a cleanup function (an effect that only cleans up returns one directly).
const GUARD = /mounted|cancel|ignore|dispos|abort|signal|unsubscrib|\balive\b|\bactive\b|\bstale\b|return\s*\(\s*\)\s*=>|=>\s*\(\s*\)\s*=>|return\s+function\b/i;

// Blank comments and string contents, keeping every newline, so a pattern inside
// a comment or a string does not count and line numbers stay right.
export function codeOnly(text) {
  let out = '';
  let i = 0;
  const n = text.length;
  while (i < n) {
    const c = text[i];
    const d = text[i + 1];
    if (c === '/' && d === '/') {
      while (i < n && text[i] !== '\n') { out += ' '; i++; }
      continue;
    }
    if (c === '/' && d === '*') {
      out += '  ';
      i += 2;
      while (i < n && !(text[i] === '*' && text[i + 1] === '/')) { out += text[i] === '\n' ? '\n' : ' '; i++; }
      if (i < n) { out += '  '; i += 2; }
      continue;
    }
    const quote = c === '"' || c === "'" || (c === '`' && text.indexOf('`', i + 1) !== -1);
    if (quote) {
      out += c;
      i++;
      while (i < n && text[i] !== c) {
        if (c !== '`' && text[i] === '\n') break;
        if (text[i] === '\\' && i + 1 < n) { out += ` ${text[i + 1] === '\n' ? '\n' : ' '}`; i += 2; continue; }
        out += text[i] === '\n' ? '\n' : ' ';
        i++;
      }
      if (text[i] === c) { out += c; i++; }
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

function callText(code, open) {
  let depth = 0;
  for (let i = open; i < code.length; i++) {
    if (code[i] === '(') depth++;
    else if (code[i] === ')' && --depth === 0) return code.slice(open, i + 1);
  }
  return code.slice(open);
}

const lineAt = (code, index) => code.slice(0, index).split('\n').length;

export const RULES = {
  'raw-timer': {
    title: 'raw setTimeout or setInterval',
    use: 'the repository timer wrapper',
    lines(code) {
      return code.split('\n').flatMap((line, i) => (/\b(setTimeout|setInterval)\s*\(/.test(line) ? [i + 1] : []));
    },
  },
  'raw-listener': {
    title: 'addEventListener without { once: true }',
    use: 'the repository listener wrapper, or { once: true }',
    lines(code) {
      const all = code.split('\n');
      return all.flatMap((line, i) => {
        if (!/\.addEventListener\s*\(/.test(line)) return [];
        return /once\s*:\s*true/.test(all.slice(i, i + 6).join('\n')) ? [] : [i + 1];
      });
    },
  },
  'async-effect': {
    title: 'async work in an effect without a mounted or cancelled guard',
    use: 'the repository async effect wrapper',
    lines(code) {
      const out = [];
      for (const m of code.matchAll(/\buse(?:Layout)?Effect\s*\(/g)) {
        const body = callText(code, m.index + m[0].length - 1);
        if (/\basync\b|\bawait\b|\.then\s*\(/.test(body) && !GUARD.test(body)) out.push(lineAt(code, m.index));
      }
      return out;
    },
  },
};

const posix = (p) => p.split(path.sep).join('/');
const covered = (file, entries = []) => entries.some((e) => (e.endsWith('/') ? file.startsWith(e) : file === e));

export function validateConfig(config, { root, checkFiles = true } = {}) {
  const errors = [];
  if (config?.version !== 1) errors.push('version must be 1');
  if (!config?.rules || typeof config.rules !== 'object') errors.push('rules must be an object');
  for (const [id, rule] of Object.entries(config?.rules || {})) {
    if (!RULES[id]) {
      errors.push(`unknown rule ${id}; known: ${Object.keys(RULES).join(', ')}`);
      continue;
    }
    if (rule === false) continue;
    if (!Array.isArray(rule.wrappers)) errors.push(`${id}: wrappers must list the files that may use the raw API`);
    for (const w of rule.wrappers || []) {
      if (checkFiles && root && !w.endsWith('/') && !fs.existsSync(path.join(root, w))) errors.push(`${id}: wrapper ${w} does not exist, so the exemption is stale`);
    }
  }
  return errors;
}

// files: [{ path, text }] with paths relative to the repository root.
export function scanFiles(files, config) {
  const findings = [];
  for (const { path: file, text } of files) {
    const code = codeOnly(text);
    const original = text.split('\n');
    for (const [id, rule] of Object.entries(config.rules || {})) {
      if (rule === false || covered(file, rule.wrappers)) continue;
      if (rule.scopes && !covered(file, rule.scopes.map((s) => (s.endsWith('/') ? s : `${s}/`)))) continue;
      for (const line of RULES[id].lines(code)) {
        findings.push({ rule: id, file, line, snippet: (original[line - 1] || '').trim().slice(0, 200), use: rule.use || RULES[id].use });
      }
    }
  }
  return findings;
}

export function listSources(root, scopes = ['.']) {
  const out = new Set();
  const walk = (dir) => {
    let entries = [];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (e.isDirectory()) {
        if (!SKIP_DIRS.has(e.name)) walk(path.join(dir, e.name));
      } else if (e.isFile() && SOURCE.test(e.name) && !NOT_SOURCE.test(e.name)) {
        out.add(posix(path.relative(root, path.join(dir, e.name))));
      }
    }
  };
  for (const scope of scopes) walk(path.join(root, scope));
  return [...out].sort();
}

export function run(root, config) {
  const files = listSources(root, config.scopes || ['.']).map((p) => ({ path: p, text: fs.readFileSync(path.join(root, p), 'utf8') }));
  return scanFiles(files, config);
}

function option(argv, name) {
  const i = argv.indexOf(name);
  return i === -1 ? undefined : argv[i + 1];
}

export function main(argv = process.argv.slice(2)) {
  const root = path.resolve(option(argv, '--root') || '.');
  const configFile = path.resolve(root, option(argv, '--config') || '.agents/wrap-once.json');
  let config;
  try {
    config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
  } catch (error) {
    console.error(`wrap-once: cannot read ${configFile}: ${error.message}`);
    return 2;
  }
  const errors = validateConfig(config, { root });
  if (errors.length) {
    for (const e of errors) console.error(`wrap-once: ${e}`);
    return 2;
  }
  const findings = run(root, config);
  const baselineFile = option(argv, '--baseline');
  const result = baselineFile ? compareBaseline(readBaseline(path.resolve(root, baselineFile)), countFindings(findings)) : null;
  if (argv.includes('--json')) {
    console.log(JSON.stringify({ findings, baseline: result }, null, 2));
  } else {
    for (const f of findings) console.log(`${f.file}:${f.line} ${f.rule}: ${f.snippet}  (use ${f.use})`);
    const byRule = Object.entries(countFindings(findings)).map(([r, files]) => `${r} ${Object.values(files).reduce((a, b) => a + b, 0)}`);
    console.log(findings.length ? `${findings.length} finding(s): ${byRule.join(', ')}` : 'wrap-once: no findings');
    if (result) for (const line of describe(result)) console.log(line);
  }
  if (result) return result.ok ? 0 : 1;
  return findings.length ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(fs.realpathSync(process.argv[1])).href) process.exitCode = main();
