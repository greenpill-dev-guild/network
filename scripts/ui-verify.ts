/**
 * ui-verify.ts — render every public website route at 375 / 1024 / 1440 and run
 * four validation channels against the rendered DOM:
 *   1. Visual + layout   (HARD): page/element overflow, wrapped pills/CTAs, 44px touch targets, off-token color
 *   2. Accessibility tree (HARD/WARN): landmarks present, interactive nodes named, no generic-as-control
 *   3. Automated a11y     (HARD/WARN): axe-core serious/critical (contrast, name-role-value, ARIA)
 *   4. Layout stability   (WARN→HARD): CLS over load, non-semantic controls, unlabeled inputs
 *
 * Screenshots are written to packages/website/.ui-verify/<slug>@<width>.png and a
 * machine-readable report to .ui-verify/report.json. Exits non-zero on any HARD violation.
 *
 * Usage:
 *   bun run ui:verify                 # build site, verify all discovered routes
 *   bun run ui:check                  # source-only CSS guardrails, no browser/build
 *   bun run ui:verify / /chapters     # verify specific routes
 *   UI_VERIFY_ORIGIN=http://localhost:4321 bun scripts/ui-verify.ts /   # against a running dev server (no build)
 *
 * Env:
 *   CHROME_BIN / CHROMIUM_BIN   explicit browser binary
 *   UI_VERIFY_ORIGIN            verify against this origin instead of building + serving dist
 *   UI_VERIFY_REQUIRED=1        fail (instead of skip) when no Chrome binary is found
 *   UI_VERIFY_WIDTHS=375,768    override the default 375,1024,1440 widths
 *   UI_VERIFY_SOURCE_ONLY=1     run only source CSS standard checks and exit
 *
 * Reuses the CDP-over-static-server pattern proven in scripts/map-edit-browser-smoke.ts;
 * adds no runtime dependency beyond the optional axe-core (channel 3 degrades to a warning if absent).
 * The report also records public /llms.txt reachability and WebMCP discovery status.
 */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { accessSync, constants, existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { tmpdir, homedir } from 'node:os';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const distRoot = join(rootDir, 'packages/website/dist');
const outDir = join(rootDir, 'packages/website/.ui-verify');
const websiteSrcRoot = join(rootDir, 'packages/website/src');
const sourceBaselinePath = join(rootDir, 'scripts/data/ui-source-baseline.tsv');
const required = process.env.UI_VERIFY_REQUIRED === '1';
const sourceOnly = process.env.UI_VERIFY_SOURCE_ONLY === '1' || process.argv.includes('--source-only');
const widths = (process.env.UI_VERIFY_WIDTHS || '375,1024,1440')
  .split(',')
  .map((w) => Number.parseInt(w.trim(), 10))
  .filter((w) => Number.isFinite(w) && w > 0);

type Severity = 'hard' | 'warn';
interface Violation { channel: string; code: string; sev: Severity; msg: string; route?: string; width?: number; }
interface LlmsTxtStatus {
  status: 'ok' | 'missing' | 'error';
  url: string;
  bytes?: number;
  contentType?: string;
  message?: string;
}
interface WebMcpSourceSignal {
  path: string;
  line: number;
  signal: string;
}
interface WebMcpRouteProbe {
  route: string;
  navigatorModelContext: boolean;
  registerToolType: string;
  declarativeTools: Array<{ name: string; description: string }>;
}
interface WebMcpDiscovery {
  status: 'not_configured' | 'detected' | 'error';
  message?: string;
  sourceSignals: WebMcpSourceSignal[];
  routeProbes: WebMcpRouteProbe[];
}

// ── Browser discovery (extends the smoke-test list with Playwright/Puppeteer caches) ──
function existsExecutable(p: string | undefined): p is string {
  if (!p) return false;
  try { accessSync(p, constants.X_OK); return true; } catch { return false; }
}

function discoverCachedChromium(): string[] {
  const home = homedir();
  const found: string[] = [];
  const tryGlob = (base: string, leaf: (entry: string) => string) => {
    try {
      for (const entry of readdirSync(base)) {
        const candidate = leaf(entry);
        if (existsExecutable(candidate)) found.push(candidate);
      }
    } catch { /* base dir absent */ }
  };
  const pw = join(home, 'Library/Caches/ms-playwright');
  tryGlob(pw, (e) => join(pw, e, 'chrome-headless-shell-mac-arm64/chrome-headless-shell'));
  tryGlob(pw, (e) => join(pw, e, 'chrome-headless-shell-mac-x64/chrome-headless-shell'));
  tryGlob(pw, (e) => join(pw, e, 'chrome-mac/Chromium.app/Contents/MacOS/Chromium'));
  tryGlob(pw, (e) => join(pw, e, 'chrome-linux/chrome'));
  const pup = join(home, '.cache/puppeteer/chrome');
  tryGlob(pup, (e) => join(pup, e, 'chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'));
  tryGlob(pup, (e) => join(pup, e, 'chrome-mac-x64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'));
  tryGlob(pup, (e) => join(pup, e, 'chrome-linux64/chrome'));
  return found;
}

function findChromeBinary(): string {
  const candidates = [
    process.env.CHROME_BIN,
    process.env.CHROMIUM_BIN,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    ...discoverCachedChromium(),
  ].filter(Boolean) as string[];
  for (const candidate of candidates) {
    if (existsExecutable(candidate)) return candidate;
  }
  return '';
}

// ── Static server over dist (verbatim approach from the smoke test) ──
function contentTypeFor(filePath: string): string {
  switch (extname(filePath)) {
    case '.css': return 'text/css; charset=utf-8';
    case '.js': return 'text/javascript; charset=utf-8';
    case '.json': return 'application/json; charset=utf-8';
    case '.txt': return 'text/plain; charset=utf-8';
    case '.png': return 'image/png';
    case '.jpg': case '.jpeg': return 'image/jpeg';
    case '.svg': return 'image/svg+xml';
    case '.webp': return 'image/webp';
    case '.woff2': return 'font/woff2';
    case '.ico': return 'image/x-icon';
    default: return 'text/html; charset=utf-8';
  }
}

async function startStaticServer(): Promise<{ close: () => Promise<void>; origin: string }> {
  const resolvedDistRoot = resolve(distRoot);
  const server = createServer(async (request, response) => {
    try {
      const requestUrl = new URL(request.url || '/', 'http://127.0.0.1');
      let relativePath = decodeURIComponent(requestUrl.pathname).replace(/^\/+/, '');
      const candidates = !relativePath
        ? ['index.html']
        : relativePath.endsWith('/')
          ? [`${relativePath}index.html`]
          : [relativePath, `${relativePath}.html`, `${relativePath}/index.html`];

      for (const candidate of candidates) {
        const candidatePath = resolve(distRoot, candidate);
        if (candidatePath !== resolvedDistRoot && !candidatePath.startsWith(`${resolvedDistRoot}${sep}`)) {
          response.writeHead(403); response.end('Forbidden'); return;
        }
        const fileStat = await stat(candidatePath).catch(() => null);
        if (!fileStat) continue;
        const resolvedPath = fileStat.isDirectory() ? join(candidatePath, 'index.html') : candidatePath;
        const body = await readFile(resolvedPath);
        response.writeHead(200, { 'Content-Type': contentTypeFor(resolvedPath) });
        response.end(body); return;
      }
      response.writeHead(404); response.end('Not found');
    } catch {
      response.writeHead(404); response.end('Not found');
    }
  });
  await new Promise<void>((res, rej) => { server.once('error', rej); server.listen(0, '127.0.0.1', () => res()); });
  const address = server.address();
  assert.ok(address && typeof address === 'object', 'static server should listen on a TCP port');
  return {
    origin: `http://127.0.0.1:${address.port}`,
    close: () => new Promise((res, rej) => server.close((e) => (e ? rej(e) : res()))),
  };
}

// ── Headless browser launch (adapts the smoke-test launcher for chrome-headless-shell) ──
async function launchChrome(chromeBinary: string): Promise<{ close: () => Promise<void>; webSocketUrl: string }> {
  const userDataDir = await mkdtemp(join(tmpdir(), 'ui-verify-'));
  const isHeadlessShell = /headless[-_]shell/i.test(chromeBinary);
  const args = [
    ...(isHeadlessShell ? [] : ['--headless=new']),
    '--disable-gpu', '--disable-dev-shm-usage', '--no-first-run',
    '--no-default-browser-check', '--force-color-profile=srgb',
    '--remote-debugging-port=0', `--user-data-dir=${userDataDir}`, 'about:blank',
  ];
  const chrome = spawn(chromeBinary, args, { stdio: ['ignore', 'pipe', 'pipe'] });
  const webSocketUrl = await new Promise<string>((res, rej) => {
    let output = '';
    const timer = setTimeout(() => rej(new Error(`Chrome did not expose a DevTools URL. Output: ${output}`)), 15000);
    const onData = (chunk: Buffer) => {
      output += chunk.toString();
      const match = output.match(/DevTools listening on (ws:\/\/[^\s]+)/);
      if (match) { clearTimeout(timer); res(match[1]); }
    };
    chrome.stdout.on('data', onData);
    chrome.stderr.on('data', onData);
    chrome.once('exit', (code) => { clearTimeout(timer); rej(new Error(`Chrome exited early (code ${code}). Output: ${output}`)); });
    chrome.once('error', (e) => { clearTimeout(timer); rej(e); });
  });
  return {
    webSocketUrl,
    close: async () => {
      if (!chrome.killed) chrome.kill('SIGTERM');
      await new Promise((res) => { chrome.once('exit', res); setTimeout(res, 500); });
      if (!chrome.killed) chrome.kill('SIGKILL');
      await rm(userDataDir, { force: true, recursive: true }).catch(() => {});
    },
  };
}

class CdpClient {
  #socket: WebSocket;
  #nextId = 1;
  #pending = new Map<number, { resolve: (v: any) => void; reject: (e: Error) => void }>();
  private constructor(socket: WebSocket) {
    this.#socket = socket;
    this.#socket.addEventListener('message', (event) => {
      const message = JSON.parse(String(event.data));
      if (message.id && this.#pending.has(message.id)) {
        const pending = this.#pending.get(message.id)!;
        this.#pending.delete(message.id);
        if (message.error) pending.reject(new Error(`${message.error.message || 'CDP error'} (${message.error.code})`));
        else pending.resolve(message.result ?? {});
      }
    });
  }
  static async connect(webSocketUrl: string): Promise<CdpClient> {
    const socket = new WebSocket(webSocketUrl);
    await new Promise<void>((res, rej) => {
      socket.addEventListener('open', () => res(), { once: true });
      socket.addEventListener('error', () => rej(new Error('Could not connect to Chrome DevTools')), { once: true });
    });
    return new CdpClient(socket);
  }
  send(method: string, params: Record<string, any> = {}, sessionId?: string): Promise<any> {
    const id = this.#nextId++;
    const payload: Record<string, any> = { id, method, params };
    if (sessionId) payload.sessionId = sessionId;
    this.#socket.send(JSON.stringify(payload));
    return new Promise((res, rej) => this.#pending.set(id, { resolve: res, reject: rej }));
  }
  close(): void { this.#socket.close(); }
}

async function evaluate(client: CdpClient, sessionId: string, expression: string): Promise<any> {
  const result = await client.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }, sessionId);
  if (result.exceptionDetails) throw new Error(`Browser eval failed: ${JSON.stringify(result.exceptionDetails)}`);
  return result.result?.value;
}

async function waitForExpression(client: CdpClient, sessionId: string, expression: string, timeoutMs = 8000): Promise<void> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await evaluate(client, sessionId, expression).catch(() => false)) return;
    await new Promise((res) => setTimeout(res, 60));
  }
  // Non-fatal: continue with whatever rendered (a route may legitimately never settle one channel).
}

// ── Route discovery from the built dist (overridable via CLI) ──
function discoverRoutes(): string[] {
  const routes = new Set<string>();
  const walk = (absDir: string, urlPrefix: string) => {
    for (const entry of readdirSync(absDir, { withFileTypes: true })) {
      if (entry.isDirectory()) walk(join(absDir, entry.name), `${urlPrefix}${entry.name}/`);
      else if (entry.name === 'index.html') routes.add(urlPrefix || '/');
    }
  };
  walk(distRoot, '/');
  routes.delete('/404/');
  return [...routes].sort();
}

function discoverRoutesForRun(origin: string | undefined): string[] {
  if (origin && !existsSync(distRoot)) return ['/'];
  return discoverRoutes();
}

function slugFor(route: string): string {
  const s = route.replace(/^\/+|\/+$/g, '').replace(/[^a-z0-9]+/gi, '-');
  return s || 'home';
}

// ── Source CSS standard check ───────────────────────────────────────────────
function sourceFilesToScan(): string[] {
  const files: string[] = [];
  const walk = (absDir: string) => {
    for (const entry of readdirSync(absDir, { withFileTypes: true })) {
      const abs = join(absDir, entry.name);
      if (entry.isDirectory()) walk(abs);
      else if (['.astro', '.css'].includes(extname(entry.name))) files.push(abs);
    }
  };
  walk(websiteSrcRoot);
  return files.sort();
}

function webMcpFilesToScan(): string[] {
  const files: string[] = [];
  const allowed = new Set(['.astro', '.html', '.js', '.jsx', '.mjs', '.ts', '.tsx']);
  const walk = (absDir: string) => {
    for (const entry of readdirSync(absDir, { withFileTypes: true })) {
      const abs = join(absDir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.astro') continue;
        walk(abs);
      } else if (allowed.has(extname(entry.name))) {
        files.push(abs);
      }
    }
  };
  walk(join(rootDir, 'packages/website'));
  return files.sort();
}

function stripCommentsPreserveLines(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, (match) => '\n'.repeat((match.match(/\n/g) || []).length));
}

function lineForIndex(source: string, index: number): number {
  return source.slice(0, index).split('\n').length;
}

function relativeSourcePath(absPath: string): string {
  return absPath.replace(`${rootDir}${sep}`, '');
}

async function auditLlmsTxt(baseOrigin: string): Promise<{ status: LlmsTxtStatus; violations: Violation[] }> {
  const url = `${baseOrigin}/llms.txt`;
  try {
    const response = await fetch(url, { redirect: 'manual' });
    const contentType = response.headers.get('content-type') || '';
    const body = await response.text().catch(() => '');
    const bytes = Buffer.byteLength(body);
    if (!response.ok) {
      return {
        status: { status: 'missing', url, contentType, bytes, message: `HTTP ${response.status}` },
        violations: [{ channel: 'llms', code: 'LLMS_TXT_MISSING', sev: 'hard', msg: `/llms.txt returned HTTP ${response.status}` }],
      };
    }
    if (!body.trim()) {
      return {
        status: { status: 'missing', url, contentType, bytes, message: 'empty body' },
        violations: [{ channel: 'llms', code: 'LLMS_TXT_EMPTY', sev: 'hard', msg: '/llms.txt was served but empty' }],
      };
    }
    return { status: { status: 'ok', url, contentType, bytes }, violations: [] };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      status: { status: 'error', url, message },
      violations: [{ channel: 'llms', code: 'LLMS_TXT_ERROR', sev: 'hard', msg: `/llms.txt could not be fetched: ${message}` }],
    };
  }
}

async function scanWebMcpSourceSignals(): Promise<WebMcpSourceSignal[]> {
  const patterns = [
    'navigator.modelContext',
    'registerTool',
    'toolname',
    'tooldescription',
  ];
  const signals: WebMcpSourceSignal[] = [];
  for (const file of webMcpFilesToScan()) {
    const source = await readFile(file, 'utf8').catch(() => '');
    if (!source) continue;
    const lines = source.split('\n');
    for (let index = 0; index < lines.length; index += 1) {
      for (const pattern of patterns) {
        if (lines[index].includes(pattern)) {
          signals.push({ path: relativeSourcePath(file), line: index + 1, signal: pattern });
        }
      }
    }
  }
  return signals;
}

function isAllowedMediaQuery(absPath: string, query: string): boolean {
  const rel = relativeSourcePath(absPath);
  if (
    rel === 'packages/website/src/components/shell/SiteHeader.astro' ||
    rel === 'packages/website/src/components/shell/SiteFooter.astro'
  ) return true;
  return /pointer\s*:\s*coarse/i.test(query) || /prefers-reduced-motion/i.test(query);
}

interface SourceFinding extends Violation { file: string; line: number; text: string; }
interface SourceBaselineEntry { file: string; code: string; needle: string; reason: string; }

const sourceTokenFiles = new Set([
  'packages/website/src/styles/gp-tokens.css',
  'packages/website/src/pages/design-system.astro',
]);

function sourceFinding(file: string, line: number, code: string, sev: Severity, text: string, msg: string): SourceFinding {
  return { channel: 'source', code, sev, file, line, text, msg };
}

function loadSourceBaseline(): SourceBaselineEntry[] {
  if (!existsSync(sourceBaselinePath)) return [];
  return readFileSync(sourceBaselinePath, 'utf8')
    .split('\n')
    .filter((line) => line.trim() && !line.startsWith('#'))
    .map((line, index) => {
      const [file, code, needle, reason] = line.split('\t');
      if (!file || !code || !needle || !reason) {
        throw new Error(`Invalid source baseline entry ${index + 1}: expected file, code, needle, reason`);
      }
      return { file, code, needle, reason };
    });
}

function isHomeMapDataColor(rel: string, text: string): boolean {
  if (rel !== 'packages/website/src/components/page-sections/HomeMap.astro') return false;
  return /\bcolor:\s*['"]#[0-9A-Fa-f]{3,8}['"]/.test(text) || /\?\?\s*['"]#[0-9A-Fa-f]{3,8}['"]/.test(text);
}

function shouldSkipRawDesignValue(rel: string, text: string): boolean {
  return sourceTokenFiles.has(rel) || isHomeMapDataColor(rel, text);
}

function collectLineSourceFindings(rel: string, scan: string): SourceFinding[] {
  const findings: SourceFinding[] = [];
  const lines = scan.split('\n');
  for (let index = 0; index < lines.length; index += 1) {
    const text = lines[index].trim();
    if (!text) continue;
    const line = index + 1;

    if (/\b(?:margin|padding|border|inset)-(?:left|right)\b|\b(?:left|right)\s*:/.test(text)) {
      findings.push(sourceFinding(rel, line, 'PHYSICAL_SIDE_PROPERTY', 'hard', text, `${rel}:${line} uses a physical side property; prefer logical inline/block properties or baseline an intentional positioned exception`));
    }

    if (/\b\d+(?:\.\d+)?vh\b/.test(text)) {
      findings.push(sourceFinding(rel, line, 'VIEWPORT_VH_UNIT', 'hard', text, `${rel}:${line} uses vh; prefer dvh/svh/lvh or baseline an intentional atmospheric exception`));
    }

    if (/font-size\s*:\s*(?!\s*(?:var|clamp|calc)\(|\s*(?:inherit|initial|unset)\b)[^;]+;/.test(text)) {
      findings.push(sourceFinding(rel, line, 'HARDCODED_FONT_SIZE', 'hard', text, `${rel}:${line} hardcodes font-size; use gp typography tokens or clamp() display tokens`));
    }

    if (!shouldSkipRawDesignValue(rel, text) && /#[0-9A-Fa-f]{3,8}|rgba\(|linear-gradient\(/.test(text)) {
      findings.push(sourceFinding(rel, line, 'RAW_DESIGN_VALUE', 'hard', text, `${rel}:${line} uses a raw design value; use gp tokens, color-mix from tokens, or baseline an intentional exception`));
    }
  }
  return findings;
}

async function collectSourceFindings(): Promise<SourceFinding[]> {
  const out: SourceFinding[] = [];
  for (const file of sourceFilesToScan()) {
    const source = await readFile(file, 'utf8');
    const scan = stripCommentsPreserveLines(source);
    const rel = relativeSourcePath(file);
    const mediaPattern = /@media\s+([^{]+)\{/g;
    let match: RegExpExecArray | null;
    while ((match = mediaPattern.exec(scan))) {
      const query = match[1].trim();
      if (isAllowedMediaQuery(file, query)) continue;
      const line = lineForIndex(scan, match.index);
      out.push(sourceFinding(rel, line, 'VIEWPORT_MEDIA_QUERY', 'hard', `@media ${query}`, `${rel}:${line} uses @media ${query}; use @container or document a reviewed exception`));
    }
    out.push(...collectLineSourceFindings(rel, scan));
  }
  return out;
}

async function writeSourceBaseline(): Promise<void> {
  const hits = await collectSourceFindings();
  const lines = [
    '# file\tcode\tneedle\treason',
    ...hits.map((hit) => `${hit.file}\t${hit.code}\t${hit.text}\tExisting audited Network CSS standard exception; convert to gp tokens, logical properties, or dynamic viewport primitives when touching this surface.`),
    '',
  ];
  writeFileSync(sourceBaselinePath, lines.join('\n'));
  console.log(`[ui-check] wrote ${hits.length} source baseline entr${hits.length === 1 ? 'y' : 'ies'} to ${relativeSourcePath(sourceBaselinePath)}`);
}

async function auditSourceCss(): Promise<Violation[]> {
  const findings = await collectSourceFindings();
  const baseline = loadSourceBaseline();
  const remaining = baseline.map((entry) => ({ ...entry, matched: false }));
  const unapproved: SourceFinding[] = [];

  for (const hit of findings) {
    const match = remaining.find((entry) => !entry.matched && entry.file === hit.file && entry.code === hit.code && hit.text.includes(entry.needle));
    if (match) {
      match.matched = true;
    } else {
      unapproved.push(hit);
    }
  }

  const stale = remaining.filter((entry) => !entry.matched);
  return [
    ...unapproved.map(({ file: _file, line: _line, text: _text, ...violation }) => violation),
    ...stale.map((entry) => ({
      channel: 'source',
      code: 'STALE_SOURCE_BASELINE',
      sev: 'hard' as Severity,
      msg: `${entry.file} ${entry.code} baseline no longer matches: ${entry.needle}`,
    })),
  ];
}

function printSourceViolations(scope: 'ui-check' | 'ui-verify', sourceViolations: Violation[]): void {
  if (sourceViolations.length === 0) return;
  console.log(`[${scope}] source checks: ${sourceViolations.length} violation(s)`);
  for (const x of sourceViolations) console.log(`      ${x.sev === 'hard' ? '✗' : '⚠'} [${x.channel}:${x.code}] ${x.msg}`);
  console.log('');
}

async function runSourceCheckOnly(): Promise<void> {
  const sourceViolations = await auditSourceCss();
  printSourceViolations('ui-check', sourceViolations);

  const hardCount = sourceViolations.filter((v) => v.sev === 'hard').length;
  const warnCount = sourceViolations.filter((v) => v.sev === 'warn').length;
  console.log(`[ui-check] ${hardCount} hard, ${warnCount} warn source violation(s).`);

  if (hardCount > 0) process.exitCode = 1;
}

// ── In-page assertion bundle for channels 1 & 4 (single expression, returns Violation[]) ──
const DOM_ASSERTIONS = `
(() => {
  const out = [];
  const W = window.innerWidth;
  const de = document.documentElement;
  const clientW = de.clientWidth;
  const tag = (el) => {
    let s = el.tagName.toLowerCase();
    if (el.id) s += '#' + el.id;
    else if (typeof el.className === 'string' && el.className.trim()) s += '.' + el.className.trim().split(/\\s+/).slice(0,2).join('.');
    return s;
  };
  // Channel 1A — page horizontal overflow
  const pageOver = de.scrollWidth > clientW + 1;
  if (pageOver) out.push({channel:'visual',code:'PAGE_OVERFLOW',sev:'hard',msg:'scrollWidth '+de.scrollWidth+' > clientWidth '+clientW});
  // Channel 1B — overflowing elements (the culprits). When the page overflows,
  // also flag elements wider than the viewport (catches centred/offset overflow
  // the right-edge test alone misses).
  let offenders = 0;
  for (const el of document.body.querySelectorAll('*')) {
    const cs = getComputedStyle(el);
    if (cs.position === 'fixed' || cs.display === 'none') continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    if (r.right > clientW + 1 || (pageOver && r.width > clientW + 1)) {
      let p = el.parentElement, scrollable = false;
      while (p) { const pc = getComputedStyle(p); if (/(auto|scroll)/.test(pc.overflowX)) { scrollable = true; break; } p = p.parentElement; }
      if (scrollable) continue;
      if (offenders < 10) { const par = el.parentElement ? tag(el.parentElement) : '?'; const txt = (el.textContent||'').trim().slice(0,40); out.push({channel:'visual',code:'OVERFLOW_ELEMENT',sev:'hard',msg:tag(el)+' '+Math.round(r.width)+'w right='+Math.round(r.right)+' > '+clientW+(txt?' — "'+txt+'"':'')+' in '+par}); }
      offenders++;
    }
  }
  // Channel 1C — touch targets (narrow widths only). Targets STANDALONE controls.
  // WCAG 2.5.8 exempts links inline in a text flow, so inline text links are skipped;
  // native checkbox/radio are exempt (their hit area is the associated label).
  if (W <= 420) {
    for (const el of document.querySelectorAll('a[href],button,[role="button"],[role="link"],input[type="button"],input[type="submit"],input[type="reset"],select,summary')) {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || el.offsetParent === null) continue;
      if (el.closest('svg')) continue; // SVG map pins / icon glyphs: essential-presentation exception
      const txt = (el.textContent || '').trim();
      if (el.tagName === 'A' && cs.display.includes('inline') && txt.length > 0) continue; // inline text link
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      const small = (r.width < 44 ? 1 : 0) + (r.height < 44 ? 1 : 0);
      // Both dims small = a genuinely untappable control (icon button/link) -> HARD.
      // One dim small (wide-but-short text/CTA link) -> WARN; WCAG treats these leniently.
      if (small === 2) out.push({channel:'visual',code:'TOUCH_TARGET',sev:'hard',msg:tag(el)+' '+Math.round(r.width)+'x'+Math.round(r.height)+' (both dims < 44)'});
      else if (small === 1) out.push({channel:'visual',code:'TOUCH_TARGET',sev:'warn',msg:tag(el)+' '+Math.round(r.width)+'x'+Math.round(r.height)+' (one dim < 44)'});
    }
  }
  // Channel 1D — wrapped pills / inline CTAs (broken lozenge / split arrow)
  for (const el of document.querySelectorAll('.gp-chip, .gp-arrow-link, [data-arrow-link], a[class*="arrow"]')) {
    if (el.getClientRects().length > 1) out.push({channel:'visual',code:'WRAP',sev:'hard',msg:tag(el)+' wrapped to '+el.getClientRects().length+' lines'});
  }
  // Channel 1E — pure white/black color (off-token; WARN, capped)
  let colorHits = 0;
  for (const el of document.body.querySelectorAll('*')) {
    if (colorHits >= 6) break;
    const cs = getComputedStyle(el);
    const c = cs.color, b = cs.backgroundColor;
    const bad = (v) => v === 'rgb(255, 255, 255)' || v === 'rgb(0, 0, 0)';
    if (el.textContent && el.textContent.trim() && bad(c)) { out.push({channel:'visual',code:'OFF_TOKEN_COLOR',sev:'warn',msg:tag(el)+' color '+c}); colorHits++; }
    else if (bad(b)) { out.push({channel:'visual',code:'OFF_TOKEN_COLOR',sev:'warn',msg:tag(el)+' background '+b}); colorHits++; }
  }
  // Channel 4 — semantic lint
  for (const el of document.querySelectorAll('div[onclick],span[onclick],div[role="button"],span[role="button"]')) {
    out.push({channel:'semantic',code:'NON_SEMANTIC_CONTROL',sev:'warn',msg:tag(el)+' acts as a control; use <button>/<a>'});
  }
  const svgInteractiveRoles = new Set(['button', 'link', 'checkbox', 'radio', 'switch', 'tab']);
  for (const el of document.querySelectorAll('svg [tabindex]:not([tabindex="-1"])')) {
    if (el.closest('[aria-hidden="true"]')) continue;
    const elTag = el.tagName.toLowerCase();
    if (elTag === 'a' || el.closest('a[href]')) continue;
    const role = el.getAttribute('role') || '';
    if (!svgInteractiveRoles.has(role)) {
      out.push({channel:'semantic',code:'FOCUSABLE_SVG_NO_ROLE',sev:'hard',msg:tag(el)+' is focusable inside SVG without an interactive role'});
      continue;
    }
    const label = el.getAttribute('aria-label') || el.getAttribute('title') || '';
    const labelledBy = el.getAttribute('aria-labelledby');
    const title = el.querySelector(':scope > title')?.textContent || '';
    if (!label.trim() && !labelledBy && !title.trim()) {
      out.push({channel:'semantic',code:'SVG_CONTROL_NO_NAME',sev:'hard',msg:tag(el)+' is a focusable SVG control without an accessible name'});
    }
  }
  for (const el of document.querySelectorAll('input:not([type="hidden"]),select,textarea')) {
    if (el.offsetParent === null && getComputedStyle(el).position !== 'fixed') continue; // not rendered
    const id = el.getAttribute('id');
    const explicit = id && document.querySelector('label[for="' + (window.CSS && CSS.escape ? CSS.escape(id) : id) + '"]');
    const implicit = el.closest('label'); // <label><input></label>
    if (!explicit && !implicit && !el.getAttribute('aria-label') && !el.getAttribute('aria-labelledby') && !el.getAttribute('title')) {
      out.push({channel:'semantic',code:'INPUT_NO_LABEL',sev:'warn',msg:tag(el)+' has no associated label'});
    }
  }
  // Channel 4 — cumulative layout shift (observer installed pre-navigation)
  const cls = (window.__uiVerifyCls && window.__uiVerifyCls.value) || 0;
  if (cls > 0.1) out.push({channel:'stability',code:'CLS',sev:'warn',msg:'cumulative layout shift '+cls.toFixed(3)+' > 0.1'});
  return out;
})()
`;

const CLS_OBSERVER = `
window.__uiVerifyCls = { value: 0 };
try {
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (!entry.hadRecentInput) window.__uiVerifyCls.value += entry.value;
    }
  }).observe({ type: 'layout-shift', buffered: true });
} catch {}
`;

// ── Channel 2 — accessibility tree ──
async function auditAccessibilityTree(client: CdpClient, sessionId: string): Promise<Violation[]> {
  const out: Violation[] = [];
  let tree;
  try { tree = await client.send('Accessibility.getFullAXTree', {}, sessionId); }
  catch { return [{ channel: 'a11y-tree', code: 'AXTREE_UNAVAILABLE', sev: 'warn', msg: 'could not capture accessibility tree' }]; }
  const nodes: any[] = tree.nodes || [];
  const roleOf = (n: any) => n?.role?.value;
  const nameOf = (n: any) => (n?.name?.value || '').trim();
  const roles = new Set(nodes.filter((n) => !n.ignored).map(roleOf));
  if (!roles.has('main')) out.push({ channel: 'a11y-tree', code: 'NO_MAIN_LANDMARK', sev: 'hard', msg: 'no main landmark in the accessibility tree' });
  if (!roles.has('navigation')) out.push({ channel: 'a11y-tree', code: 'NO_NAV_LANDMARK', sev: 'warn', msg: 'no navigation landmark' });
  const interactiveRoles = new Set(['button', 'link', 'textbox', 'checkbox', 'radio', 'combobox', 'menuitem', 'switch', 'tab', 'searchbox']);
  let unnamed = 0;
  for (const n of nodes) {
    if (n.ignored) continue;
    if (interactiveRoles.has(roleOf(n)) && !nameOf(n)) {
      if (unnamed < 8) out.push({ channel: 'a11y-tree', code: 'UNNAMED_CONTROL', sev: 'hard', msg: `${roleOf(n)} node has no accessible name` });
      unnamed++;
    }
  }
  return out;
}

// ── Channel 3 — axe-core (optional dependency; degrades to a warning if absent) ──
let axeSource: string | null | undefined;
async function loadAxeSource(): Promise<string | null> {
  if (axeSource !== undefined) return axeSource;
  const candidate = join(rootDir, 'node_modules/axe-core/axe.min.js');
  try { axeSource = await readFile(candidate, 'utf8'); }
  catch { axeSource = null; }
  return axeSource;
}

async function auditAxe(client: CdpClient, sessionId: string): Promise<Violation[]> {
  const source = await loadAxeSource();
  if (!source) return [{ channel: 'axe', code: 'AXE_NOT_INSTALLED', sev: 'warn', msg: 'axe-core not installed; run `bun add -d axe-core` to enable contrast/ARIA checks' }];
  await evaluate(client, sessionId, source + '\n;true');
  const raw = await evaluate(client, sessionId, `
    (async () => {
      try {
        const r = await axe.run(document, { resultTypes: ['violations'], runOnly: ['wcag2a','wcag2aa','best-practice'] });
        return r.violations.map(v => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.length, targets: v.nodes.slice(0,5).map(n => (n.target||[]).join(' ')) }));
      } catch (e) { return { error: String(e) }; }
    })()
  `);
  if (!Array.isArray(raw)) return [{ channel: 'axe', code: 'AXE_ERROR', sev: 'warn', msg: raw?.error || 'axe run failed' }];
  return raw.map((v: any) => ({
    channel: 'axe',
    code: v.id,
    sev: (v.impact === 'critical' || v.impact === 'serious') ? 'hard' as Severity : 'warn' as Severity,
    msg: `${v.help} (${v.impact}, ${v.nodes} node${v.nodes === 1 ? '' : 's'})${v.targets && v.targets.length ? ' — ' + v.targets.join(' | ') : ''}`,
  }));
}

async function probeWebMcpRoute(client: CdpClient, origin: string, route: string): Promise<WebMcpRouteProbe> {
  const target = await client.send('Target.createTarget', { url: 'about:blank' });
  const attached = await client.send('Target.attachToTarget', { targetId: target.targetId, flatten: true });
  const sessionId = attached.sessionId;
  const url = `${origin}${route}`;
  try {
    await client.send('Page.enable', {}, sessionId);
    await client.send('Runtime.enable', {}, sessionId);
    await client.send('Page.navigate', { url }, sessionId);
    await waitForExpression(client, sessionId, "location.href !== 'about:blank' && document.readyState === 'complete'", 12000);
    const probe = await evaluate(client, sessionId, `
      (() => {
        const modelContext = navigator.modelContext || null;
        const declarativeTools = [...document.querySelectorAll('form[toolname], form[tooldescription]')].map((form) => ({
          name: form.getAttribute('toolname') || '',
          description: form.getAttribute('tooldescription') || ''
        }));
        return {
          navigatorModelContext: Boolean(modelContext),
          registerToolType: typeof modelContext?.registerTool,
          declarativeTools
        };
      })()
    `).catch((error) => ({
      navigatorModelContext: false,
      registerToolType: 'undefined',
      declarativeTools: [],
      error: error instanceof Error ? error.message : String(error),
    }));
    return {
      route,
      navigatorModelContext: Boolean(probe.navigatorModelContext),
      registerToolType: String(probe.registerToolType || 'undefined'),
      declarativeTools: Array.isArray(probe.declarativeTools) ? probe.declarativeTools : [],
    };
  } finally {
    await client.send('Target.closeTarget', { targetId: target.targetId }).catch(() => {});
  }
}

async function discoverWebMcp(client: CdpClient, origin: string, routes: string[]): Promise<WebMcpDiscovery> {
  const sourceSignals = await scanWebMcpSourceSignals();
  try {
    const routeProbes: WebMcpRouteProbe[] = [];
    for (const route of routes) {
      routeProbes.push(await probeWebMcpRoute(client, origin, route));
    }
    const hasRuntimeSignal = routeProbes.some((probe) => (
      probe.navigatorModelContext ||
      probe.registerToolType !== 'undefined' ||
      probe.declarativeTools.length > 0
    ));
    const hasSourceSignal = sourceSignals.length > 0;
    return {
      status: hasRuntimeSignal || hasSourceSignal ? 'detected' : 'not_configured',
      message: hasRuntimeSignal || hasSourceSignal
        ? 'WebMCP signal detected; verify strategy, visibility, schema, confirmation, and forbidden-action rules before shipping runtime tools.'
        : 'No WebMCP runtime or declarative tool signals detected.',
      sourceSignals,
      routeProbes,
    };
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : String(error),
      sourceSignals,
      routeProbes: [],
    };
  }
}

// ── Per-route × width verification ──
async function verifyRouteAtWidth(client: CdpClient, origin: string, route: string, width: number): Promise<Violation[]> {
  const target = await client.send('Target.createTarget', { url: 'about:blank' });
  const attached = await client.send('Target.attachToTarget', { targetId: target.targetId, flatten: true });
  const sessionId = attached.sessionId;
  const tag = (v: Violation): Violation => ({ ...v, route, width });
  const url = `${origin}${route}`;
  try {
    await client.send('Page.enable', {}, sessionId);
    await client.send('Runtime.enable', {}, sessionId);
    await client.send('Emulation.setDeviceMetricsOverride', {
      width, height: 900, deviceScaleFactor: 1, mobile: width <= 420,
    }, sessionId);
    await client.send('Page.addScriptToEvaluateOnNewDocument', { source: CLS_OBSERVER }, sessionId);

    let routeState: { href: string; readyState: string; title: string; lang: string; bodyText: string } | null = null;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      await client.send('Page.navigate', { url }, sessionId);
      // Wait for the navigation to actually commit — about:blank already reports
      // readyState 'complete', so without the location guard axe can run on the
      // pre-navigation blank page (false document-title / html-has-lang).
      await waitForExpression(client, sessionId, "location.href !== 'about:blank' && document.readyState === 'complete'", 12000);
      routeState = await evaluate(client, sessionId, `(() => ({
        href: location.href,
        readyState: document.readyState,
        title: document.title || '',
        lang: document.documentElement.getAttribute('lang') || '',
        bodyText: (document.body?.innerText || '').trim()
      }))()`).catch(() => null);
      const staticNotFound = routeState?.bodyText === 'Not found' && !routeState.title && !routeState.lang;
      if (!staticNotFound) break;
      await new Promise((res) => setTimeout(res, 150));
    }

    if (routeState?.bodyText === 'Not found' && !routeState.title && !routeState.lang) {
      return [tag({ channel: 'harness', code: 'ROUTE_LOAD_FAILED', sev: 'hard', msg: `static server returned Not found for ${route}` })];
    }

    await waitForExpression(client, sessionId, 'document.fonts ? document.fonts.status === "loaded" : true', 6000);
    await evaluate(client, sessionId, `
      (async () => { await Promise.all([...document.images].filter(i=>!i.complete).map(i=>new Promise(r=>{i.onload=i.onerror=r; setTimeout(r,3000);}))); })()
    `).catch(() => {});
    await new Promise((res) => setTimeout(res, 400)); // settle late shifts

    // Guard against a blank/unrendered page so we never emit false a11y failures.
    const rendered = await evaluate(client, sessionId, "!!(document.title || (document.body && document.body.children.length))").catch(() => false);
    if (!rendered) return [tag({ channel: 'harness', code: 'ROUTE_LOAD_FAILED', sev: 'hard', msg: 'page did not render in time (blank document)' })];

    const violations: Violation[] = [];
    const dom = await evaluate(client, sessionId, DOM_ASSERTIONS);
    if (Array.isArray(dom)) violations.push(...dom);
    violations.push(...(await auditAccessibilityTree(client, sessionId)));
    violations.push(...(await auditAxe(client, sessionId)));

    const shot = await client.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true }, sessionId);
    await writeFile(join(outDir, `${slugFor(route)}@${width}.png`), Buffer.from(shot.data, 'base64'));

    return violations.map(tag);
  } finally {
    await client.send('Target.closeTarget', { targetId: target.targetId }).catch(() => {});
  }
}

async function run(): Promise<void> {
  if (process.argv.includes('--write-source-baseline')) {
    await writeSourceBaseline();
    return;
  }

  if (sourceOnly) {
    await runSourceCheckOnly();
    return;
  }

  const cliRoutes = process.argv.slice(2).filter((a) => a.startsWith('/'));
  const origin = process.env.UI_VERIFY_ORIGIN;
  const chromeBinary = findChromeBinary();
  if (!chromeBinary) {
    const message = 'No Chrome/Chromium binary found. Set CHROME_BIN, or UI_VERIFY_REQUIRED=1 to enforce.';
    if (required) throw new Error(message);
    console.warn(`[ui-verify] ${message} Skipping.`);
    return;
  }

  if (!origin && !existsSync(distRoot)) throw new Error(`No built site at ${distRoot}. Run \`bun run build:website\` first, or set UI_VERIFY_ORIGIN.`);
  await mkdir(outDir, { recursive: true });
  const routes = cliRoutes.length ? cliRoutes : discoverRoutesForRun(origin);

  const staticServer = origin ? null : await startStaticServer();
  const baseOrigin = origin || staticServer!.origin;
  const chrome = await launchChrome(chromeBinary);
  let client: CdpClient | null = null;
  const all: Violation[] = [];
  let llmsTxt: LlmsTxtStatus | null = null;
  let webMcp: WebMcpDiscovery | null = null;
  try {
    const sourceViolations = await auditSourceCss();
    all.push(...sourceViolations);
    printSourceViolations('ui-verify', sourceViolations);

    const llmsResult = await auditLlmsTxt(baseOrigin);
    llmsTxt = llmsResult.status;
    all.push(...llmsResult.violations);

    client = await CdpClient.connect(chrome.webSocketUrl);
    webMcp = await discoverWebMcp(client, baseOrigin, routes);
    console.log(`[ui-verify] ${routes.length} route(s) × widths [${widths.join(', ')}] via ${chromeBinary.split('/').pop()}\n`);
    console.log(`[ui-verify] llms.txt: ${llmsTxt.status}${llmsTxt.bytes ? ` (${llmsTxt.bytes} bytes)` : ''}`);
    console.log(`[ui-verify] WebMCP: ${webMcp.status} — ${webMcp.message}\n`);
    for (const route of routes) {
      for (const width of widths) {
        const v = await verifyRouteAtWidth(client, baseOrigin, route, width).catch((e) => ([{ channel: 'harness', code: 'ROUTE_ERROR', sev: 'hard' as Severity, msg: String(e), route, width }]));
        all.push(...v);
        const hard = v.filter((x) => x.sev === 'hard').length;
        const warn = v.filter((x) => x.sev === 'warn').length;
        const status = hard ? `✗ ${hard} hard` : (warn ? `⚠ ${warn} warn` : '✓');
        console.log(`  ${status.padEnd(10)} ${route}  @${width}`);
        for (const x of v) console.log(`      ${x.sev === 'hard' ? '✗' : '⚠'} [${x.channel}:${x.code}] ${x.msg}`);
      }
    }
  } finally {
    client?.close();
    await chrome.close().catch(() => {});
    await staticServer?.close().catch(() => {});
  }

  const hardCount = all.filter((v) => v.sev === 'hard').length;
  const warnCount = all.filter((v) => v.sev === 'warn').length;
  await writeFile(join(outDir, 'report.json'), JSON.stringify({ generatedAt: new Date().toISOString(), widths, routes, llmsTxt, webMcp, hardCount, warnCount, violations: all }, null, 2));
  console.log(`\n[ui-verify] ${hardCount} hard, ${warnCount} warn across ${routes.length} route(s). Screenshots + report.json in packages/website/.ui-verify/`);
  if (hardCount > 0) process.exitCode = 1;
}

run().catch((error) => { console.error('[ui-verify] failed'); console.error(error); process.exitCode = 1; });
