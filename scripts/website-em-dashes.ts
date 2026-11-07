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
 * Every spelling that renders as an em dash counts: the character, the
 * JavaScript and JSON escapes (`\u2014`, `\u{2014}`), the CSS escape (`\2014`)
 * and the HTML references (`&mdash;`, `&#8212;`, `&#x2014;`, with or without
 * leading zeros or the closing semicolon).
 *
 * JSX text is not parsed, so .jsx and .tsx files are scanned whole: an em dash
 * there fails the check even inside a comment. The site has none today.
 *
 * Not scanned, because the text is owned elsewhere and is cleaned at its source:
 * - src/data/operational-content-snapshot.json: the fallback copy of the
 *   Directus-owned public snapshot. Steward copy is cleaned in Directus through
 *   an approved change set, and the hourly publish never runs this check.
 * - src/data/podcast-feed-snapshot.json: episode text from the podcast's RSS feed.
 * - Guides about the website (DESIGN.md, CLAUDE.md) and keystatic.config.ts,
 *   which sit outside src and public.
 *
 * A folder that cannot be read fails the check instead of being skipped.
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

const SCRIPT_EXTENSIONS = new Set(['.ts', '.js', '.mjs', '.cjs', '.mts', '.cts']);
const JSX_EXTENSIONS = new Set(['.tsx', '.jsx']);
const TEMPLATE_EXTENSIONS = new Set(['.mdx']);
const MARKUP_EXTENSIONS = new Set(['.md', '.mdoc', '.html', '.htm', '.svg', '.xml']);
const PLAIN_EXTENSIONS = new Set(['.json', '.txt', '.webmanifest', '.yaml', '.yml', '.csv']);
const SKIPPED_DIRECTORIES = new Set(['node_modules', 'dist', '.astro']);

// One pattern for the character and every spelling of it that renders as one.
// The lookaheads keep a longer number (`&#82120;`, `\20140`) from matching.
const EM_DASH = new RegExp(
  [
    '\\u2014',
    '\\\\u2014',
    '\\\\u\\{0*2014\\}',
    '\\\\0{0,2}2014(?![0-9a-f])',
    '&mdash;',
    '&#0*8212(?![0-9])',
    '&#x0*2014(?![0-9a-f])',
  ].join('|'),
  'gi',
);

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
// After the closing parenthesis of these, a slash starts a regular expression.
const CONDITION_KEYWORDS = new Set(['if', 'while', 'for', 'with']);

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
  // For each open parenthesis, whether it holds an if/while/for/with condition.
  const parens: boolean[] = [];
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
    if (ch === '(') {
      parens.push(CONDITION_KEYWORDS.has(previous));
      previous = '(';
      out += ch;
      i += 1;
      continue;
    }
    if (ch === ')') {
      // `if (x) /re/` holds a regular expression; `(a + b) / 2` a division.
      previous = parens.pop() ? '(' : ')';
      out += ch;
      i += 1;
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

/** CSS with its comments blanked out. Strings are kept, even when they hold a `/*`. */
export function stripStyleComments(source: string): string {
  let out = '';
  let i = 0;
  const n = source.length;
  while (i < n) {
    const ch = source[i];
    if (ch === '/' && source[i + 1] === '*') {
      const end = source.indexOf('*/', i + 2);
      const stop = end === -1 ? n : end + 2;
      out += blank(source.slice(i, stop));
      i = stop;
      continue;
    }
    if (ch === '"' || ch === '\'') {
      const start = i;
      i += 1;
      while (i < n && source[i] !== ch && source[i] !== '\n') {
        i += source[i] === '\\' ? 2 : 1;
      }
      i += 1;
      out += source.slice(start, i);
      continue;
    }
    out += ch;
    i += 1;
  }
  return out;
}

// In source order: an HTML comment, a `{/* */}` template comment, a script
// element or a style element. Browsers also end the elements at
// `</script >` and `</script foo>`, and a comment that holds a `<script>`
// hides it, so one pass that takes whichever comes first.
const MARKUP_PARTS = /(<!--[\s\S]*?(?:-->|$))|(\{\s*\/\*[\s\S]*?\*\/\s*\})|(<script\b[^>]*>)([\s\S]*?)(<\/script[^>]*>|$)|(<style\b[^>]*>)([\s\S]*?)(<\/style[^>]*>|$)/gi;

/**
 * Markup (HTML, SVG, Markdown, an .astro template) with its comments blanked
 * out: HTML comments, comments inside `<script>` and `<style>`, and, where
 * `templateComments` is set (.astro and .mdx), `{/* *\/}` comments. A `//`
 * comment inside an .astro template expression is not recognised, so an em
 * dash there is reported.
 */
export function stripMarkupComments(source: string, { templateComments = false } = {}): string {
  let out = '';
  let last = 0;
  for (const match of source.matchAll(MARKUP_PARTS)) {
    const at = match.index ?? 0;
    out += source.slice(last, at);
    if (match[1] !== undefined) out += blank(match[1]);
    else if (match[2] !== undefined) out += templateComments ? blank(match[2]) : match[2];
    else if (match[3] !== undefined) out += match[3] + stripScriptComments(match[4]) + match[5];
    else out += match[6] + stripStyleComments(match[7]) + match[8];
    last = at + match[0].length;
    if (match[0].length === 0) break;
  }
  return out + source.slice(last);
}

/** An .astro file with its comments blanked out: the frontmatter as a script, the rest as a template. */
export function stripAstroComments(source: string): string {
  const frontmatter = /^(\s*---\r?\n)([\s\S]*?)(\r?\n---)/.exec(source);
  if (!frontmatter) return stripMarkupComments(source, { templateComments: true });
  return frontmatter[1] + stripScriptComments(frontmatter[2]) + frontmatter[3]
    + stripMarkupComments(source.slice(frontmatter[0].length), { templateComments: true });
}

/** The text of `file` that counts as copy, with comments blanked, or null for a file type that is not text. */
export function copyText(file: string, source: string): string | null {
  const extension = extname(file).toLowerCase();
  if (extension === '.astro') return stripAstroComments(source);
  if (SCRIPT_EXTENSIONS.has(extension)) return stripScriptComments(source);
  if (extension === '.css') return stripStyleComments(source);
  if (TEMPLATE_EXTENSIONS.has(extension)) return stripMarkupComments(source, { templateComments: true });
  if (MARKUP_EXTENSIONS.has(extension)) return stripMarkupComments(source);
  if (JSX_EXTENSIONS.has(extension) || PLAIN_EXTENSIONS.has(extension)) return source;
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

/** Every file under `directory`, as paths relative to `root`. A folder that cannot be read throws. */
function listFiles(directory: string, root: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
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
  let result: { hits: EmDashHit[]; files: number };
  try {
    result = scanWebsiteCopy(process.cwd());
  } catch (error) {
    console.error(`website-em-dashes: could not read the website files: ${(error as Error).message}`);
    process.exit(2);
  }
  const { hits, files } = result;
  if (hits.length > 0) {
    console.error(`website-em-dashes: ${hits.length} em dash(es) in website copy:`);
    for (const hit of hits) console.error(`- ${hit.file}:${hit.line}: ${hit.excerpt}`);
    console.error('Rewrite each sentence with a comma, colon, period or parentheses, not a hyphen or an en dash.');
    console.error('Directus copy is cleaned in Directus through an approved change set, not in the committed snapshot.');
    process.exit(1);
  }
  console.log(`website-em-dashes: no em dashes in the copy of ${files} website files.`);
}
