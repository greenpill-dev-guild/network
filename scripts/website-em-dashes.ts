#!/usr/bin/env bun
/**
 * Fails when website copy carries an em dash (U+2014). The house rule for
 * copy (website QA, November 2026, finding 18, and the hub spec's copy rule):
 * a sentence that wants an em dash uses a comma, colon, period or parentheses
 * instead. Green Goods runs the same rule (PRD-1303).
 *
 * What counts as copy: every text file under packages/website/src (pages,
 * components, layouts, file-backed content, the operational content seed,
 * browser scripts and helpers) and the text files under packages/website/public.
 * Code comments are not copy, so `//` and block comments in scripts, CSS
 * comments, HTML comments and `{/* *\/}` template comments are skipped.
 * An escaped em dash (`—`, `\u{2014}`) and the HTML entities (`&mdash;`,
 * `&#8212;`, `&#x2014;`) count as one.
 *
 * Not scanned, because the text is owned elsewhere and is cleaned at its source:
 * - src/data/operational-content-snapshot.json: the fallback copy of the
 *   Directus-owned public snapshot. Steward copy is cleaned in Directus through
 *   an approved change set, and the hourly publish never runs this check.
 * - src/data/podcast-feed-snapshot.json: episode text from the podcast's RSS feed.
 * - Guides about the website (DESIGN.md, CLAUDE.md) and keystatic.config.ts,
 *   which sit outside src and public.
 *
 * Run from the repository root: `bun run check:em-dashes`.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { extname, join, relative, sep } from 'node:path';

export const WEBSITE_ROOTS = ['packages/website/src', 'packages/website/public'];

export const SKIPPED_FILES = new Set([
  'packages/website/src/data/operational-content-snapshot.json',
  'packages/website/src/data/podcast-feed-snapshot.json',
]);

const SCRIPT_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.mts', '.cts']);
const MARKUP_EXTENSIONS = new Set(['.md', '.mdx', '.mdoc', '.html', '.htm', '.svg', '.xml']);
const PLAIN_EXTENSIONS = new Set(['.json', '.txt', '.webmanifest', '.yaml', '.yml', '.csv']);
const SKIPPED_DIRECTORIES = new Set(['node_modules', 'dist', '.astro']);

// One pattern for the character and every spelling of it that renders as one.
const EM_DASH = /—|\\u2014|\\u\{2014\}|&mdash;|&#8212;|&#x2014;/gi;

export interface EmDashHit {
  file: string;
  line: number;
  excerpt: string;
}

/** Replaces every character of `text` except line breaks with a space, so line numbers survive. */
function blank(text: string): string {
  return text.replace(/[^\n]/g, ' ');
}

const REGEX_PRECEDERS = new Set([...'(,=:[!&|?{};+-*%<>~^']);
const REGEX_KEYWORDS = new Set([
  'return', 'typeof', 'instanceof', 'in', 'of', 'new', 'delete', 'void', 'throw',
  'case', 'do', 'else', 'yield', 'await',
]);

/**
 * JavaScript or TypeScript source with its comments blanked out. Strings,
 * template literals (with nested `${}` expressions) and regular expression
 * literals are kept, so copy inside them is still checked.
 */
export function stripScriptComments(source: string): string {
  let out = '';
  let i = 0;
  const n = source.length;
  // For each open template literal, the brace depth at which its `${` opened.
  const templates: number[] = [];
  let depth = 0;
  // The last code token seen, to tell a regular expression from a division.
  let previous = '';

  const readQuoted = (quote: string) => {
    const start = i;
    i += 1;
    while (i < n && source[i] !== quote && source[i] !== '\n') {
      i += source[i] === '\\' ? 2 : 1;
    }
    i += 1;
    out += source.slice(start, i);
    previous = quote;
  };

  // Reads template text up to the closing backtick or a `${`; returns true at `${`.
  const readTemplateText = () => {
    const start = i;
    while (i < n) {
      if (source[i] === '\\') { i += 2; continue; }
      if (source[i] === '`') { i += 1; out += source.slice(start, i); previous = '`'; return false; }
      if (source[i] === '$' && source[i + 1] === '{') { i += 2; out += source.slice(start, i); previous = '{'; return true; }
      i += 1;
    }
    out += source.slice(start, i);
    return false;
  };

  const startsRegex = () => {
    if (previous === '' || REGEX_PRECEDERS.has(previous)) return true;
    return REGEX_KEYWORDS.has(previous);
  };

  while (i < n) {
    const ch = source[i];
    const next = source[i + 1];

    if (ch === '/' && next === '/') {
      const end = source.indexOf('\n', i);
      const stop = end === -1 ? n : end;
      out += blank(source.slice(i, stop));
      i = stop;
      continue;
    }
    if (ch === '/' && next === '*') {
      const end = source.indexOf('*/', i + 2);
      const stop = end === -1 ? n : end + 2;
      out += blank(source.slice(i, stop));
      i = stop;
      continue;
    }
    if (ch === '\'' || ch === '"') {
      readQuoted(ch);
      continue;
    }
    if (ch === '`') {
      i += 1;
      out += '`';
      if (readTemplateText()) {
        templates.push(depth);
        depth += 1;
      }
      continue;
    }
    if (ch === '/' && startsRegex()) {
      const start = i;
      i += 1;
      let inClass = false;
      while (i < n && source[i] !== '\n') {
        if (source[i] === '\\') { i += 2; continue; }
        if (source[i] === '[') inClass = true;
        else if (source[i] === ']') inClass = false;
        else if (source[i] === '/' && !inClass) { i += 1; break; }
        i += 1;
      }
      while (i < n && /[a-z]/i.test(source[i])) i += 1;
      out += source.slice(start, i);
      previous = ')';
      continue;
    }
    if (ch === '{') {
      depth += 1;
    } else if (ch === '}') {
      depth -= 1;
      if (templates.length > 0 && templates[templates.length - 1] === depth) {
        templates.pop();
        i += 1;
        out += '}';
        if (readTemplateText()) {
          templates.push(depth);
          depth += 1;
        }
        continue;
      }
    }

    if (/[A-Za-z_$]/.test(ch)) {
      const word = /^[A-Za-z_$][\w$]*/.exec(source.slice(i, i + 64))?.[0] ?? ch;
      out += word;
      i += word.length;
      previous = word;
      continue;
    }
    if (!/\s/.test(ch)) previous = ch;
    out += ch;
    i += 1;
  }
  return out;
}

/** CSS with its comments blanked out. */
export function stripStyleComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?(\*\/|$)/g, blank);
}

/** Markup with its HTML comments blanked out. */
export function stripMarkupComments(source: string): string {
  return source.replace(/<!--[\s\S]*?(-->|$)/g, blank);
}

/**
 * An .astro file with its comments blanked out: the frontmatter and each
 * `<script>` as scripts, each `<style>` as CSS, and the template's HTML
 * comments and `{/* *\/}` comments. A `//` comment inside a template
 * expression is not recognised, so an em dash there is reported.
 */
export function stripAstroComments(source: string): string {
  let rest = source;
  let out = '';
  const frontmatter = /^(\s*---\r?\n)([\s\S]*?)(\r?\n---)/.exec(rest);
  if (frontmatter) {
    out += frontmatter[1] + stripScriptComments(frontmatter[2]) + frontmatter[3];
    rest = rest.slice(frontmatter[0].length);
  }
  const blocks = /(<script\b[^>]*>)([\s\S]*?)(<\/script>)|(<style\b[^>]*>)([\s\S]*?)(<\/style>)/gi;
  let last = 0;
  let match: RegExpExecArray | null;
  const template = (text: string) => stripMarkupComments(text).replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, blank);
  while ((match = blocks.exec(rest))) {
    out += template(rest.slice(last, match.index));
    out += match[1]
      ? match[1] + stripScriptComments(match[2]) + match[3]
      : match[4] + stripStyleComments(match[5]) + match[6];
    last = match.index + match[0].length;
  }
  return out + template(rest.slice(last));
}

/** The text of `file` that counts as copy, with comments blanked, or null for a file type that is not text. */
export function copyText(file: string, source: string): string | null {
  const extension = extname(file).toLowerCase();
  if (extension === '.astro') return stripAstroComments(source);
  if (SCRIPT_EXTENSIONS.has(extension)) return stripScriptComments(source);
  if (extension === '.css') return stripStyleComments(source);
  if (MARKUP_EXTENSIONS.has(extension)) return stripMarkupComments(source);
  if (PLAIN_EXTENSIONS.has(extension)) return source;
  return null;
}

/** One hit per em dash in the copy of a file, with its line and a short excerpt. */
export function emDashHits(file: string, source: string): EmDashHit[] {
  const text = copyText(file, source);
  if (text === null) return [];
  const hits: EmDashHit[] = [];
  const lines = text.split('\n');
  const sourceLines = source.split('\n');
  lines.forEach((line, index) => {
    for (const match of line.matchAll(EM_DASH)) {
      const at = match.index ?? 0;
      const original = sourceLines[index] ?? line;
      const excerpt = original.slice(Math.max(0, at - 40), at + 40).trim();
      hits.push({ file, line: index + 1, excerpt });
    }
  });
  return hits;
}

function listFiles(directory: string, root: string): string[] {
  let entries;
  try {
    entries = readdirSync(directory, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries.flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return SKIPPED_DIRECTORIES.has(entry.name) ? [] : listFiles(path, root);
    return entry.isFile() ? [relative(root, path).split(sep).join('/')] : [];
  });
}

/** Scans the website copy under `root` (the repository root). */
export function scanWebsiteCopy(root: string): { hits: EmDashHit[]; files: number } {
  const files = WEBSITE_ROOTS.flatMap((dir) => listFiles(join(root, dir), root))
    .filter((file) => !SKIPPED_FILES.has(file))
    .filter((file) => copyText(file, '') !== null)
    .sort();
  const hits = files.flatMap((file) => emDashHits(file, readFileSync(join(root, file), 'utf8')));
  return { hits, files: files.length };
}

if (import.meta.main) {
  const { hits, files } = scanWebsiteCopy(process.cwd());
  if (hits.length > 0) {
    console.error(`website-em-dashes: ${hits.length} em dash(es) in website copy:`);
    for (const hit of hits) console.error(`- ${hit.file}:${hit.line}: ${hit.excerpt}`);
    console.error('Rewrite each sentence with a comma, colon, period or parentheses, not a hyphen or an en dash.');
    console.error('Directus copy is cleaned in Directus through an approved change set, not in the committed snapshot.');
    process.exit(1);
  }
  console.log(`website-em-dashes: no em dashes in the copy of ${files} website files.`);
}
