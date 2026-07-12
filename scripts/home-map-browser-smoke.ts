import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { accessSync, constants, readdirSync } from 'node:fs';
import { createServer } from 'node:http';
import { homedir, tmpdir } from 'node:os';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const distRoot = join(rootDir, 'packages/website/dist');
const routeHtmlPath = join(distRoot, 'index.html');
const required = process.env.HOME_MAP_BROWSER_SMOKE_REQUIRED === '1';

const privateEmail = 'private-member@example.org';
const liveMemberEmail = 'live-member@example.org';
const stewardEmail = 'steward@example.org';
const privateRawNote = 'private raw browser note';

const approvedMember = Object.freeze({
  id: 'submission:approved-member-1',
  sourceId: 'approved-member-1',
  type: 'member',
  name: 'Live Browser Member',
  place: 'Oakland',
  city: 'Oakland',
  region: 'California',
  country: 'United States',
  lat: 37.8044,
  long: -122.2712,
  role: 'member',
  themes: ['public', 'trees'],
  publicNote: 'Live member public note.',
  status: 'approved',
  source: 'approved-submission',
});

const approvedSteward = Object.freeze({
  id: 'submission:approved-steward-1',
  sourceId: 'approved-steward-1',
  type: 'steward',
  name: 'Trusted Browser Steward',
  place: 'Lagos',
  city: 'Lagos',
  region: '',
  country: 'Nigeria',
  lat: 6.5244,
  long: 3.3792,
  role: 'steward',
  chapterSlug: 'nigeria',
  // Public profile URL is an existing public node field; the desktop popover and
  // mobile rows surface it as an actionable link (new tab) — no payload change.
  profileUrl: 'https://example.org/trusted-steward',
  themes: ['public', 'events'],
  publicNote: 'Steward public note.',
  status: 'approved',
  source: 'approved-submission',
});

// A second approved member so the steward has two person-to-person edges with
// distinct themes — needed to prove the map renders more than one edge colour.
const approvedMemberEvents = Object.freeze({
  id: 'submission:approved-member-2',
  sourceId: 'approved-member-2',
  type: 'member',
  name: 'Events Browser Member',
  place: 'Berlin',
  city: 'Berlin',
  region: '',
  country: 'Germany',
  lat: 52.52,
  long: 13.405,
  role: 'member',
  themes: ['public', 'events'],
  publicNote: 'Events member public note.',
  status: 'approved',
  source: 'approved-submission',
});

function existsExecutable(path: string | undefined): path is string {
  if (!path) return false;
  try {
    accessSync(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
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
    } catch {
      // Cache directory absent.
    }
  };
  const pw = join(home, 'Library/Caches/ms-playwright');
  tryGlob(pw, (entry) => join(pw, entry, 'chrome-headless-shell-mac-arm64/chrome-headless-shell'));
  tryGlob(pw, (entry) => join(pw, entry, 'chrome-headless-shell-mac-x64/chrome-headless-shell'));
  tryGlob(pw, (entry) => join(pw, entry, 'chrome-mac/Chromium.app/Contents/MacOS/Chromium'));
  tryGlob(pw, (entry) => join(pw, entry, 'chrome-linux/chrome'));
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

function contentTypeFor(filePath: string): string {
  switch (extname(filePath)) {
    case '.css': return 'text/css; charset=utf-8';
    case '.js': return 'text/javascript; charset=utf-8';
    case '.json': return 'application/json; charset=utf-8';
    case '.png': return 'image/png';
    case '.jpg':
    case '.jpeg': return 'image/jpeg';
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
          response.writeHead(403);
          response.end('Forbidden');
          return;
        }
        const fileStat = await stat(candidatePath).catch(() => null);
        if (!fileStat) continue;
        const resolvedPath = fileStat.isDirectory() ? join(candidatePath, 'index.html') : candidatePath;
        const body = await readFile(resolvedPath);
        response.writeHead(200, { 'Content-Type': contentTypeFor(resolvedPath) });
        response.end(body);
        return;
      }
      response.writeHead(404);
      response.end('Not found');
    } catch {
      response.writeHead(404);
      response.end('Not found');
    }
  });

  await new Promise<void>((resolveListen, rejectListen) => {
    server.once('error', rejectListen);
    server.listen(0, '127.0.0.1', () => resolveListen());
  });

  const address = server.address();
  assert.ok(address && typeof address === 'object', 'expected static server to listen on a TCP port');
  return {
    origin: `http://127.0.0.1:${address.port}`,
    close: () => new Promise((resolveClose, rejectClose) => {
      server.close((error) => {
        if (error) rejectClose(error);
        else resolveClose();
      });
    }),
  };
}

async function launchChrome(chromeBinary: string): Promise<{ close: () => Promise<void>; webSocketUrl: string }> {
  const userDataDir = await mkdtemp(join(tmpdir(), 'home-map-browser-smoke-'));
  const isHeadlessShell = /headless[-_]shell/i.test(chromeBinary);
  const chrome = spawn(chromeBinary, [
    ...(isHeadlessShell ? [] : ['--headless=new']),
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--no-first-run',
    '--no-default-browser-check',
    '--force-color-profile=srgb',
    '--remote-debugging-port=0',
    `--user-data-dir=${userDataDir}`,
    'about:blank',
  ], { stdio: ['ignore', 'pipe', 'pipe'] });

  const webSocketUrl = await new Promise<string>((resolveUrl, rejectUrl) => {
    let output = '';
    const timer = setTimeout(() => {
      rejectUrl(new Error(`Chrome did not expose a DevTools URL. Output: ${output}`));
    }, 15000);
    const handleOutput = (chunk: Buffer) => {
      output += chunk.toString();
      const match = output.match(/DevTools listening on (ws:\/\/[^\s]+)/);
      if (!match) return;
      clearTimeout(timer);
      resolveUrl(match[1]);
    };
    chrome.stdout.on('data', handleOutput);
    chrome.stderr.on('data', handleOutput);
    chrome.once('exit', (code) => {
      clearTimeout(timer);
      rejectUrl(new Error(`Chrome exited before DevTools was ready with code ${code}. Output: ${output}`));
    });
    chrome.once('error', (error) => {
      clearTimeout(timer);
      rejectUrl(error);
    });
  });

  return {
    webSocketUrl,
    close: async () => {
      if (!chrome.killed) chrome.kill('SIGTERM');
      await new Promise((resolveExit) => {
        chrome.once('exit', resolveExit);
        setTimeout(resolveExit, 500);
      });
      if (!chrome.killed) chrome.kill('SIGKILL');
      await rm(userDataDir, { force: true, recursive: true }).catch(() => {});
    },
  };
}

class CdpClient {
  #socket: WebSocket;
  #nextId = 1;
  #pending = new Map<number, { resolve: (value: any) => void; reject: (error: Error) => void }>();
  #listeners = new Map<string, Set<(message: any) => void>>();

  private constructor(socket: WebSocket) {
    this.#socket = socket;
    this.#socket.addEventListener('message', (event) => {
      const message = JSON.parse(String(event.data));
      if (message.id && this.#pending.has(message.id)) {
        const pending = this.#pending.get(message.id);
        this.#pending.delete(message.id);
        if (message.error) pending?.reject(new Error(`${message.error.message || 'CDP error'} (${message.error.code})`));
        else pending?.resolve(message.result ?? {});
        return;
      }
      if (message.method) {
        for (const listener of this.#listeners.get(message.method) ?? []) listener(message);
      }
    });
  }

  static async connect(webSocketUrl: string): Promise<CdpClient> {
    const socket = new WebSocket(webSocketUrl);
    await new Promise<void>((resolveOpen, rejectOpen) => {
      socket.addEventListener('open', () => resolveOpen(), { once: true });
      socket.addEventListener('error', () => rejectOpen(new Error('Could not connect to Chrome DevTools')), { once: true });
    });
    return new CdpClient(socket);
  }

  on(method: string, listener: (message: any) => void): void {
    const listeners = this.#listeners.get(method) ?? new Set();
    listeners.add(listener);
    this.#listeners.set(method, listeners);
  }

  send(method: string, params: Record<string, any> = {}, sessionId?: string): Promise<any> {
    const id = this.#nextId++;
    const payload: Record<string, any> = { id, method, params };
    if (sessionId) payload.sessionId = sessionId;
    this.#socket.send(JSON.stringify(payload));
    return new Promise((resolveSend, rejectSend) => {
      this.#pending.set(id, { resolve: resolveSend, reject: rejectSend });
    });
  }

  close(): void {
    this.#socket.close();
  }
}

async function evaluate(client: CdpClient, sessionId: string, expression: string): Promise<any> {
  const result = await client.send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
  }, sessionId);
  if (result.exceptionDetails) {
    throw new Error(`Browser evaluation failed: ${JSON.stringify(result.exceptionDetails)}`);
  }
  return result.result?.value;
}

async function waitForExpression(
  client: CdpClient,
  sessionId: string,
  expression: string,
  timeoutMs = 5000
): Promise<void> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await evaluate(client, sessionId, expression).catch(() => false)) return;
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 60));
  }
  throw new Error(`Timed out waiting for browser expression: ${expression}`);
}

function jsonFulfillment(status: number, body: unknown) {
  return {
    responseCode: status,
    responseHeaders: [
      { name: 'Access-Control-Allow-Origin', value: '*' },
      { name: 'Access-Control-Allow-Methods', value: 'GET, POST, OPTIONS' },
      { name: 'Access-Control-Allow-Headers', value: 'Content-Type' },
      { name: 'Content-Type', value: 'application/json; charset=utf-8' },
    ],
    body: Buffer.from(JSON.stringify(body), 'utf8').toString('base64'),
  };
}

function corsPreflightFulfillment() {
  return {
    responseCode: 204,
    responseHeaders: [
      { name: 'Access-Control-Allow-Origin', value: '*' },
      { name: 'Access-Control-Allow-Methods', value: 'GET, POST, OPTIONS' },
      { name: 'Access-Control-Allow-Headers', value: 'Content-Type' },
      { name: 'Access-Control-Max-Age', value: '60' },
    ],
  };
}

type MapStatePhase = 'moderated-empty' | 'live-member' | 'live-steward';

function mapStateForPhase(phase: MapStatePhase) {
  const nodes = phase === 'moderated-empty'
    ? []
    : phase === 'live-member'
      ? [approvedMember]
      : [approvedMember, approvedSteward, approvedMemberEvents];
  // Person-to-person relationships only — no steward→chapter edge. Two edges with
  // distinct themes (public + events) so the steward lights up multiple colours.
  const edges = phase === 'live-steward'
    ? [
      {
        id: 'edge:submission:approved-member-1:submission:approved-steward-1:public',
        from: 'submission:approved-member-1',
        to: 'submission:approved-steward-1',
        kind: 'shared-theme',
        theme: 'public',
        weight: 1,
        source: 'generated-theme-match',
      },
      {
        id: 'edge:submission:approved-member-2:submission:approved-steward-1:events',
        from: 'submission:approved-member-2',
        to: 'submission:approved-steward-1',
        kind: 'shared-theme',
        theme: 'events',
        weight: 2,
        source: 'generated-theme-match',
      },
    ]
    : [];

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    intakeMode: phase === 'moderated-empty' ? 'moderated' : 'live',
    themes: [],
    nodes,
    edges,
    counts: {
      totalNodes: nodes.length,
      chapterNodes: 0,
      approvedSubmittedNodes: nodes.length,
      edges: edges.length,
      byType: {
        member: nodes.filter((node) => node.type === 'member').length,
        steward: nodes.filter((node) => node.type === 'steward').length,
      },
      byStatus: { approved: nodes.length },
      byTheme: { public: nodes.length },
      sources: [
        { source: 'chapter-locations', status: 'ok', count: 1, message: '' },
        { source: 'approved-map-nodes', status: nodes.length > 0 ? 'ok' : 'empty', count: nodes.length, message: '' },
      ],
    },
  };
}

function submitNodeExpression({
  themes,
  name,
  email,
  note,
  xRatio,
  yRatio,
}: {
  themes: string[];
  name: string;
  email: string;
  note: string;
  xRatio: number;
  yRatio: number;
}): string {
  return `
    (async () => {
      const clean = (value) => String(value || '').trim();
      const trigger = document.querySelector('[data-home-map-open]');
      trigger.click();
      for (const theme of ${JSON.stringify(themes)}) {
        document.querySelector(\`[data-theme-choice="\${theme}"]\`)?.click();
      }
      document.querySelector('[data-walkthrough-next]').click();
      const form = document.querySelector('[data-home-map-addnode-form]');
      form.elements.name.value = ${JSON.stringify(name)};
      form.elements.contact.value = ${JSON.stringify(email)};
      form.elements.publicNote.value = ${JSON.stringify(note)};
      form.dispatchEvent(new Event('input', { bubbles: true }));
      const svg = document.querySelector('[data-location-map] svg');
      const rect = svg.getBoundingClientRect();
      const pinX = rect.left + rect.width * ${xRatio};
      const pinY = rect.top + rect.height * ${yRatio};
      svg.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 31, pointerType: 'mouse', clientX: pinX, clientY: pinY }));
      svg.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 31, pointerType: 'mouse', clientX: pinX, clientY: pinY }));
      const confirmationReady = async () => {
        const started = performance.now();
        while (performance.now() - started < 1500) {
          if (clean(form.elements.locationConfirmationId.value)) return true;
          await new Promise((resolve) => setTimeout(resolve, 20));
        }
        return false;
      };
      if (!await confirmationReady()) throw new Error('map pin did not receive a reverse-confirmed location');
      form.dispatchEvent(new Event('input', { bubbles: true }));
      document.querySelector('[data-walkthrough-next]').click();
      form.requestSubmit();
      return {
        dialogOpen: document.querySelector('[data-home-map-addnode-dialog]').open,
        selectedThemeCount: [...document.querySelectorAll('[data-theme-choice][aria-pressed="true"]')].length,
        place: clean(form.elements.place.value),
        lat: clean(form.elements.lat.value),
        long: clean(form.elements.long.value),
        locationConfirmationId: clean(form.elements.locationConfirmationId.value),
      };
    })()
  `;
}

async function closeDialog(client: CdpClient, sessionId: string): Promise<void> {
  await evaluate(client, sessionId, `
    document.querySelector('[data-addnode-close]')?.click();
    true;
  `);
}

async function runSmoke(): Promise<void> {
  await stat(routeHtmlPath);
  const chromeBinary = findChromeBinary();
  if (!chromeBinary) {
    const message = 'No Chrome/Chromium binary found for Home map browser smoke. Set CHROME_BIN or HOME_MAP_BROWSER_SMOKE_REQUIRED=1 to enforce this check.';
    if (required) throw new Error(message);
    console.warn(`[home-map-browser-smoke] ${message} Skipping.`);
    return;
  }

  const staticServer = await startStaticServer();
  let chrome: { close: () => Promise<void>; webSocketUrl: string } | null = null;
  let client: CdpClient | null = null;

  try {
    chrome = await launchChrome(chromeBinary);
    client = await CdpClient.connect(chrome.webSocketUrl);
    const target = await client.send('Target.createTarget', { url: 'about:blank' });
    const attached = await client.send('Target.attachToTarget', {
      targetId: target.targetId,
      flatten: true,
    });
    const sessionId = attached.sessionId;
    let mapStatePhase: MapStatePhase = 'moderated-empty';
    const mapNodePosts: Array<Record<string, any>> = [];

    client.on('Fetch.requestPaused', (message) => {
      if (message.sessionId !== sessionId) return;
      const { request, requestId } = message.params;
      const fulfill = (status: number, body: unknown) => {
        client?.send('Fetch.fulfillRequest', {
          requestId,
          ...jsonFulfillment(status, body),
        }, sessionId).catch((error) => {
          throw error;
        });
      };

      if (request.method === 'OPTIONS') {
        client?.send('Fetch.fulfillRequest', {
          requestId,
          ...corsPreflightFulfillment(),
        }, sessionId).catch((error) => {
          throw error;
        });
        return;
      }

      if (request.method === 'GET' && request.url.endsWith('/map/state')) {
        fulfill(200, mapStateForPhase(mapStatePhase));
        return;
      }

      if (request.method === 'POST' && request.url.endsWith('/map-locations/search')) {
        fulfill(200, {
          results: [{
            confirmationId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
            label: 'Oakland, California, United States',
            lat: 37.8044,
            long: -122.2712,
            kind: 'settlement',
            attribution: '© OpenStreetMap contributors',
          }],
        });
        return;
      }

      if (request.method === 'POST' && request.url.endsWith('/map-locations/reverse')) {
        fulfill(200, {
          confirmation: {
            confirmationId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
            label: 'Oakland, California, United States',
            lat: 37.8044,
            long: -122.2712,
            kind: 'settlement',
            attribution: '© OpenStreetMap contributors',
          },
        });
        return;
      }

      if (request.method === 'POST' && request.url.endsWith('/map-nodes')) {
        const body = JSON.parse(request.postData || '{}');
        mapNodePosts.push(body);
        if (body.email === privateEmail) {
          fulfill(201, {
            node: {
              id: 'pending-browser-node',
              status: 'pending',
              displayName: body.displayName,
              placeName: 'Oakland, California, United States',
              lat: 37.8044,
              long: -122.2712,
              role: 'member',
              themes: body.themes,
              publicNote: body.publicNote,
            },
          });
          return;
        }
        if (body.email === liveMemberEmail) {
          mapStatePhase = 'live-member';
          fulfill(201, { node: approvedMember });
          return;
        }
        if (body.email === stewardEmail) {
          mapStatePhase = 'live-steward';
          fulfill(201, { node: approvedSteward });
          return;
        }
        fulfill(400, { error: { code: 'unexpected_email', message: 'Unexpected smoke email.' } });
        return;
      }

      fulfill(404, { error: { code: 'not_found' } });
    });

    await client.send('Runtime.enable', {}, sessionId);
    await client.send('Page.enable', {}, sessionId);
    await client.send('Network.enable', {}, sessionId);
    await client.send('Fetch.enable', {
      patterns: [
        { urlPattern: '*://127.0.0.1:3303/*', requestStage: 'Request' },
        { urlPattern: '*://localhost:3303/*', requestStage: 'Request' },
      ],
    }, sessionId);

    await client.send('Page.navigate', { url: `${staticServer.origin}/` }, sessionId);
    await waitForExpression(client, sessionId, "document.querySelector('[data-home-map]')");
    await waitForExpression(client, sessionId, "document.querySelector('[data-home-map-open]')");
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 1280,
      height: 768,
      deviceScaleFactor: 1,
      mobile: false,
    }, sessionId);
    const heroViewportProof = await evaluate(client, sessionId, `
      (async () => {
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        const actions = document.querySelector('.gp-home-hero-actions');
        const map = document.querySelector('.gp-home-hero-map');
        const hero = document.querySelector('.gp-home-hero');
        const actionRect = actions?.getBoundingClientRect();
        const mapRect = map?.getBoundingClientRect();
        const heroRect = hero?.getBoundingClientRect();
        return {
          missing: !actions || !map || !hero,
          viewportHeight: window.innerHeight,
          actionBottom: actionRect ? Math.round(actionRect.bottom) : null,
          actionTop: actionRect ? Math.round(actionRect.top) : null,
          mapHeight: mapRect ? Math.round(mapRect.height) : null,
          heroBottom: heroRect ? Math.round(heroRect.bottom) : null,
          ctaInsideViewport: Boolean(actionRect && actionRect.bottom <= window.innerHeight + 1 && actionRect.top >= 0),
        };
      })()
    `);
    assert.equal(heroViewportProof.missing, false, 'home hero viewport proof should find map and CTA actions');
    assert.equal(
      heroViewportProof.ctaInsideViewport,
      true,
      `home hero CTAs should stay inside a 1280x768 first viewport: ${JSON.stringify(heroViewportProof)}`
    );
    // Desktop viewport so the desktop section exercises the desktop popover and
    // its container-query layout (wide map container), not the mobile sheet. The
    // mobile section overrides to 375 later.
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 1280,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    }, sessionId);
    assert.equal(
      await evaluate(client, sessionId, "Boolean(document.querySelector('[data-node-id=\"chapter:nigeria\"]'))"),
      true,
      'expected the Nigeria chapter anchor to render as a geographic pin (chapters carry no relationship edges)'
    );
    const initialLegendCounts = await evaluate(client, sessionId, `
      (() => Object.fromEntries(
        [...document.querySelectorAll('[data-home-map-type-count]')]
          .map((node) => [node.dataset.homeMapTypeCount, Number(node.textContent.trim())])
      ))()
    `);
    assert.equal(initialLegendCounts.chapter > 0, true, 'chapter count should render from public chapter anchors');
    assert.equal(initialLegendCounts.steward, 0, 'steward count should render as 0 before live steward nodes appear');
    assert.equal(initialLegendCounts.member, 0, 'member count should render as 0 before live member nodes appear');
    await waitForExpression(client, sessionId, `
      (() => {
        const button = document.querySelector('[data-theme-choice="public"]');
        if (!button) return false;
        button.click();
        const toggled = button.getAttribute('aria-pressed') === 'true';
        if (toggled) button.click();
        return toggled && button.getAttribute('aria-pressed') === 'false';
      })()
    `);

    const addDialogLabelProof = await evaluate(client, sessionId, `
      (async () => {
        const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
        const trigger = document.querySelector('[data-home-map-open]');
        const dialog = document.querySelector('[data-home-map-addnode-dialog]');
        const titleFor = () => {
          const labelledBy = dialog?.getAttribute('aria-labelledby') || '';
          return (labelledBy ? document.getElementById(labelledBy)?.textContent : '')?.trim() || '';
        };
        window.scrollTo(0, 220);
        await wait(40);
        const scrollBeforeOpen = window.scrollY;
        trigger?.click();
        await wait(80);
        const stepOneName = titleFor();
        const scrollLockProof = {
          lockedClass: document.documentElement.classList.contains('gp-home-map-addnode-scroll-locked'),
          bodyPosition: document.body.style.position,
          bodyTop: document.body.style.top,
          bodyOverflowY: document.body.style.overflowY,
          scrollBeforeOpen,
        };
        dialog?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        await wait(40);
        const openAfterBackdropClick = Boolean(dialog?.open);
        const cancelEvent = new Event('cancel', { bubbles: false, cancelable: true });
        dialog?.dispatchEvent(cancelEvent);
        await wait(40);
        const openAfterCancel = Boolean(dialog?.open);
        dialog?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true, cancelable: true }));
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true, cancelable: true }));
        await wait(40);
        const openAfterEscape = Boolean(dialog?.open);
        const footer = document.querySelector('.gp-home-map-addnode-footer');
        const manage = document.querySelector('.gp-home-map-addnode-manage');
        const actions = document.querySelector('.gp-home-map-addnode-actions');
        const next = document.querySelector('[data-walkthrough-next]');
        const themeGrid = document.querySelector('.gp-home-map-addnode-theme-options');
        const themeStep = document.querySelector('[data-walkthrough-step="themes"]');
        const themeTitle = themeStep?.querySelector('h2');
        const themeCount = document.querySelector('[data-home-map-theme-count]');
        const dialogRect = dialog?.getBoundingClientRect();
        const footerRect = footer?.getBoundingClientRect();
        const manageRect = manage?.getBoundingClientRect();
        const actionsRect = actions?.getBoundingClientRect();
        const nextRect = next?.getBoundingClientRect();
        const stepRect = themeStep?.getBoundingClientRect();
        const themeTitleRect = themeTitle?.getBoundingClientRect();
        const themeCountRect = themeCount?.getBoundingClientRect();
        const themeRects = [...document.querySelectorAll('[data-theme-choice]')].map((node) => node.getBoundingClientRect());
        const footerStyle = footer ? getComputedStyle(footer) : null;
        const themeGridStyle = themeGrid ? getComputedStyle(themeGrid) : null;
        const lastThemeBottom = Math.max(
          ...themeRects.map((rect) => rect.bottom),
          themeCountRect?.bottom || Number.NEGATIVE_INFINITY
        );
        const layoutProof = {
          footerAtDialogBottom: Boolean(dialogRect && footerRect && Math.abs(dialogRect.bottom - footerRect.bottom) <= 2),
          actionGroupRightAligned: Boolean(footerRect && actionsRect && Math.abs(actionsRect.right - footerRect.right) <= 2),
          manageLeftAligned: Boolean(footerRect && manageRect && Math.abs(manageRect.left - footerRect.left) <= 2),
          manageAndActionsSameRow: Boolean(
            manageRect &&
            actionsRect &&
            Math.abs(((manageRect.top + manageRect.bottom) / 2) - ((actionsRect.top + actionsRect.bottom) / 2)) <= 8
          ),
          nextInsideActions: Boolean(actionsRect && nextRect && nextRect.left >= actionsRect.left - 1 && nextRect.right <= actionsRect.right + 1),
          footerBackground: footerStyle?.backgroundColor || '',
          footerBorderTopWidth: footerStyle?.borderTopWidth || '',
          themeGridColumns: themeGridStyle?.gridTemplateColumns.split(' ').filter(Boolean).length || 0,
          themeButtonCount: themeRects.length,
          themeTitleTopAnchored: Boolean(dialogRect && themeTitleRect && themeTitleRect.top - dialogRect.top <= 56),
          themeFooterGap: Boolean(footerRect && Number.isFinite(lastThemeBottom) && footerRect.top - lastThemeBottom >= 8),
          themesVisibleAboveFooter: Boolean(
            stepRect &&
            footerRect &&
            themeRects.length === 16 &&
            themeRects.every((rect) => rect.top >= stepRect.top - 1 && rect.bottom <= footerRect.top + 1)
          ),
        };
        document.querySelector('[data-theme-choice="public"]')?.click();
        document.querySelector('[data-walkthrough-next]')?.click();
        await wait(80);
        const stepTwoName = titleFor();
        const hiddenStepOne = Boolean(document.querySelector('[data-walkthrough-step="themes"]')?.hidden);
        const identityStep = document.querySelector('[data-walkthrough-step="identity"]');
        const identityTitle = identityStep?.querySelector('h2');
        const identityCopy = identityStep?.querySelector('.gp-home-map-addnode-copy');
        const cityField = identityStep?.querySelector('[data-location-text]');
        const miniMap = identityStep?.querySelector('[data-location-map]');
        const back = document.querySelector('[data-walkthrough-back]');
        const backRect = back?.getBoundingClientRect();
        const identityTitleRect = identityTitle?.getBoundingClientRect();
        const identityCopyRect = identityCopy?.getBoundingClientRect();
        const cityFieldRect = cityField?.getBoundingClientRect();
        const miniMapRect = miniMap?.getBoundingClientRect();
        const identityHeaderProof = {
          titleCentered: Boolean(dialogRect && identityTitleRect && Math.abs(((identityTitleRect.left + identityTitleRect.right) / 2) - ((dialogRect.left + dialogRect.right) / 2)) <= 2),
          copyCentered: Boolean(dialogRect && identityCopyRect && Math.abs(((identityCopyRect.left + identityCopyRect.right) / 2) - ((dialogRect.left + dialogRect.right) / 2)) <= 2),
          copyTextAlign: identityCopy ? getComputedStyle(identityCopy).textAlign : '',
          cityFieldAboveMap: Boolean(cityFieldRect && miniMapRect && cityFieldRect.bottom <= miniMapRect.top + 1),
          backVisibleTopLeft: Boolean(dialogRect && backRect && !back?.hidden && backRect.left <= dialogRect.left + 32 && backRect.top <= dialogRect.top + 32),
        };
        const form = document.querySelector('[data-home-map-addnode-form]');
        form.elements.name.value = 'Review Browser Member';
        form.elements.contact.value = 'review-browser@example.org';
        form.elements.publicNote.value = 'One-line required tagline.';
        const locationQuery = document.querySelector('[data-location-query]');
        locationQuery.value = 'Oakland';
        document.querySelector('[data-location-search]')?.click();
        await wait(80);
        document.querySelector('[data-location-results-list] button')?.click();
        form.dispatchEvent(new Event('input', { bubbles: true }));
        document.querySelector('[data-walkthrough-next]')?.click();
        await wait(80);
        const reviewStep = document.querySelector('[data-walkthrough-step="review"]');
        const reviewTitle = reviewStep?.querySelector('h2');
        const reviewCopy = reviewStep?.querySelector('.gp-home-map-addnode-copy');
        const reviewTitleRect = reviewTitle?.getBoundingClientRect();
        const reviewCopyRect = reviewCopy?.getBoundingClientRect();
        const reviewProof = {
          titleCentered: Boolean(dialogRect && reviewTitleRect && Math.abs(((reviewTitleRect.left + reviewTitleRect.right) / 2) - ((dialogRect.left + dialogRect.right) / 2)) <= 2),
          copyCentered: Boolean(dialogRect && reviewCopyRect && Math.abs(((reviewCopyRect.left + reviewCopyRect.right) / 2) - ((dialogRect.left + dialogRect.right) / 2)) <= 2),
          copyTextAlign: reviewCopy ? getComputedStyle(reviewCopy).textAlign : '',
          emailText: document.querySelector('[data-review-email]')?.textContent?.trim() || '',
          taglineText: document.querySelector('[data-review-note]')?.textContent?.trim() || '',
        };
        document.querySelector('[data-addnode-close]')?.click();
        await wait(40);
        const unlockProof = {
          unlockedClass: !document.documentElement.classList.contains('gp-home-map-addnode-scroll-locked'),
          bodyPosition: document.body.style.position,
          bodyTop: document.body.style.top,
          bodyOverflowY: document.body.style.overflowY,
          scrollRestored: Math.abs(window.scrollY - scrollBeforeOpen) <= 8,
        };
        return {
          stepOneName,
          stepTwoName,
          hiddenStepOne,
          dialogOpen: Boolean(dialog?.open),
          layoutProof,
          identityHeaderProof,
          reviewProof,
          scrollLockProof,
          openAfterBackdropClick,
          openAfterCancel,
          cancelDefaultPrevented: cancelEvent.defaultPrevented,
          openAfterEscape,
          unlockProof,
        };
      })()
    `);
    assert.match(addDialogLabelProof.stepOneName, /What are you here to grow/);
    assert.match(addDialogLabelProof.stepTwoName, /Drop your pin/);
    assert.equal(addDialogLabelProof.hiddenStepOne, true, 'add-node step 2 should not keep the hidden step 1 title as the dialog name');
    assert.equal(addDialogLabelProof.dialogOpen, false, 'add-node label proof should leave the dialog closed');
    assert.equal(
      addDialogLabelProof.identityHeaderProof.titleCentered,
      true,
      `add-node identity title should be centered: ${JSON.stringify(addDialogLabelProof.identityHeaderProof)}`
    );
    assert.equal(
      addDialogLabelProof.identityHeaderProof.copyCentered,
      true,
      `add-node identity subtitle should be centered: ${JSON.stringify(addDialogLabelProof.identityHeaderProof)}`
    );
    assert.equal(addDialogLabelProof.identityHeaderProof.copyTextAlign, 'center');
    assert.equal(
      addDialogLabelProof.identityHeaderProof.cityFieldAboveMap,
      true,
      `add-node identity place selector should render above the mini map: ${JSON.stringify(addDialogLabelProof.identityHeaderProof)}`
    );
    assert.equal(addDialogLabelProof.identityHeaderProof.backVisibleTopLeft, true, 'add-node Back should be a top-left icon button after the first step');
    assert.equal(
      addDialogLabelProof.reviewProof.titleCentered,
      true,
      `add-node review title should be centered: ${JSON.stringify(addDialogLabelProof.reviewProof)}`
    );
    assert.equal(
      addDialogLabelProof.reviewProof.copyCentered,
      true,
      `add-node review subtitle should be centered: ${JSON.stringify(addDialogLabelProof.reviewProof)}`
    );
    assert.equal(addDialogLabelProof.reviewProof.copyTextAlign, 'center');
    assert.equal(addDialogLabelProof.reviewProof.emailText, 'review-browser@example.org', 'review step should show the entered private email for correction');
    assert.equal(addDialogLabelProof.reviewProof.taglineText, 'One-line required tagline.', 'review step should show the required tagline');
    assert.equal(
      addDialogLabelProof.scrollLockProof.lockedClass,
      true,
      `add-node dialog should lock document scroll while open: ${JSON.stringify(addDialogLabelProof.scrollLockProof)}`
    );
    assert.equal(addDialogLabelProof.scrollLockProof.bodyPosition, 'fixed', 'add-node dialog should pin the page body while open');
    assert.equal(addDialogLabelProof.scrollLockProof.bodyOverflowY, 'hidden', 'add-node dialog should hide body overflow while open');
    assert.match(
      addDialogLabelProof.scrollLockProof.bodyTop,
      /^-\d+px$/,
      `add-node dialog should preserve the scroll offset while locking: ${JSON.stringify(addDialogLabelProof.scrollLockProof)}`
    );
    assert.equal(addDialogLabelProof.openAfterBackdropClick, true, 'add-node backdrop click should not close the dialog');
    assert.equal(addDialogLabelProof.cancelDefaultPrevented, true, 'add-node native cancel should be prevented');
    assert.equal(addDialogLabelProof.openAfterCancel, true, 'add-node native cancel should not close the dialog');
    assert.equal(addDialogLabelProof.openAfterEscape, true, 'add-node Escape keydown should not close the dialog');
    assert.equal(
      addDialogLabelProof.layoutProof.footerAtDialogBottom,
      true,
      `add-node footer should sit at the bottom of the dialog: ${JSON.stringify(addDialogLabelProof.layoutProof)}`
    );
    assert.equal(
      addDialogLabelProof.layoutProof.actionGroupRightAligned,
      true,
      `add-node primary actions should sit on the far right of the footer: ${JSON.stringify(addDialogLabelProof.layoutProof)}`
    );
    assert.equal(
      addDialogLabelProof.layoutProof.manageLeftAligned,
      true,
      `add-node manage link should sit on the left of the footer: ${JSON.stringify(addDialogLabelProof.layoutProof)}`
    );
    assert.equal(
      addDialogLabelProof.layoutProof.manageAndActionsSameRow,
      true,
      `add-node manage link and primary actions should share a footer row: ${JSON.stringify(addDialogLabelProof.layoutProof)}`
    );
    assert.equal(
      addDialogLabelProof.layoutProof.nextInsideActions,
      true,
      `add-node Continue should remain inside the right-aligned action group: ${JSON.stringify(addDialogLabelProof.layoutProof)}`
    );
    assert.match(addDialogLabelProof.layoutProof.footerBackground, /rgba\(0,\s*0,\s*0,\s*0\)|transparent/);
    assert.equal(addDialogLabelProof.layoutProof.footerBorderTopWidth, '0px', 'add-node footer should not render as a separate bordered bar');
    assert.equal(addDialogLabelProof.layoutProof.themeGridColumns, 2, 'desktop add-node theme picker should use a centered two-column grid');
    assert.equal(addDialogLabelProof.layoutProof.themeButtonCount, 16, 'desktop add-node theme picker should render the full canonical theme list');
    assert.equal(
      addDialogLabelProof.layoutProof.themeTitleTopAnchored,
      true,
      `add-node theme title should stay top-anchored, not vertically centered: ${JSON.stringify(addDialogLabelProof.layoutProof)}`
    );
    assert.equal(
      addDialogLabelProof.layoutProof.themeFooterGap,
      true,
      `add-node theme picker should keep breathing room above the footer: ${JSON.stringify(addDialogLabelProof.layoutProof)}`
    );
    assert.equal(
      addDialogLabelProof.layoutProof.themesVisibleAboveFooter,
      true,
      `desktop add-node theme picker should be visible without its own scroller: ${JSON.stringify(addDialogLabelProof.layoutProof)}`
    );
    assert.equal(
      addDialogLabelProof.unlockProof.unlockedClass,
      true,
      `add-node close button should release the document scroll lock: ${JSON.stringify(addDialogLabelProof.unlockProof)}`
    );
    assert.equal(addDialogLabelProof.unlockProof.bodyPosition, '', 'add-node close button should restore body positioning');
    assert.equal(addDialogLabelProof.unlockProof.bodyOverflowY, '', 'add-node close button should restore body overflow');
    assert.equal(addDialogLabelProof.unlockProof.scrollRestored, true, 'add-node close button should restore the previous page scroll position');

    const pendingPlacement = await evaluate(client, sessionId, submitNodeExpression({
      themes: ['public'],
      name: 'Pending Browser Member',
      email: privateEmail,
      note: 'Pending public note.',
      xRatio: 0.22,
      yRatio: 0.42,
    }));
    assert.equal(pendingPlacement.selectedThemeCount, 1);
    assert.notEqual(pendingPlacement.lat, '');
    assert.notEqual(pendingPlacement.long, '');
    assert.notEqual(pendingPlacement.locationConfirmationId, '');
    await waitForExpression(
      client,
      sessionId,
      "document.querySelector('[data-home-map-addnode-status]').textContent.includes('submitted for steward review')"
    );
    await waitForExpression(
      client,
      sessionId,
      "Boolean(document.querySelector('.gp-home-map-node-link.is-member.is-pending'))"
    );
    await closeDialog(client, sessionId);

    await evaluate(client, sessionId, submitNodeExpression({
      themes: ['public', 'trees'],
      name: 'Live Browser Member',
      email: liveMemberEmail,
      note: approvedMember.publicNote,
      xRatio: 0.16,
      yRatio: 0.29,
    }));
    await waitForExpression(
      client,
      sessionId,
      "Boolean(document.querySelector('[data-node-id=\"submission:approved-member-1\"].is-member'))"
    );
    await closeDialog(client, sessionId);

    await evaluate(client, sessionId, submitNodeExpression({
      themes: ['public', 'events'],
      name: 'Trusted Browser Steward',
      email: stewardEmail,
      note: approvedSteward.publicNote,
      xRatio: 0.51,
      yRatio: 0.46,
    }));
    await waitForExpression(
      client,
      sessionId,
      "Boolean(document.querySelector('[data-node-id=\"submission:approved-steward-1\"].is-steward'))"
    );
    // Both person-to-person threads (member↔steward, member2↔steward) must render
    // — chapters carry no edges.
    await waitForExpression(
      client,
      sessionId,
      "document.querySelectorAll('[data-home-map-dynamic-threads] .gp-home-map-thread').length === 2"
    );
    const liveLegendCounts = await evaluate(client, sessionId, `
      (() => Object.fromEntries(
        [...document.querySelectorAll('[data-home-map-type-count]')]
          .map((node) => [node.dataset.homeMapTypeCount, Number(node.textContent.trim())])
      ))()
    `);
    assert.equal(
      liveLegendCounts.member,
      3,
      'member count should include the local pending member and both approved live members'
    );
    assert.equal(liveLegendCounts.steward, 1, 'steward count should update when a live steward appears');

    const settledThreadProof = await evaluate(client, sessionId, `
      (async () => {
        const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
        const threadSelector = '[data-home-map-dynamic-threads] .gp-home-map-thread';
        const beforeThreads = [...document.querySelectorAll(threadSelector)];
        beforeThreads.forEach((thread, index) => {
          thread.dataset.motionProofId = \`thread-proof-\${index}\`;
        });
        const snapshot = (thread) => {
          const computed = getComputedStyle(thread);
          return {
            edgeId: thread.dataset.edgeId || '',
            proofId: thread.dataset.motionProofId || '',
            parentIndex: [...thread.parentNode.children].indexOf(thread),
            animationName: computed.animationName,
            dashOffset: Number.parseFloat(computed.strokeDashoffset) || 0,
            entering: thread.classList.contains('is-entering'),
            revealing: thread.classList.contains('is-revealing'),
          };
        };
        const before = beforeThreads.map(snapshot);
        await wait(4300);
        const after = [...document.querySelectorAll(threadSelector)].map(snapshot);
        return { before, after };
      })()
    `);
    assert.equal(settledThreadProof.before.length, 2, 'expected exactly two source-backed browser-smoke edges');
    assert.deepEqual(
      settledThreadProof.after.map((thread) => [thread.edgeId, thread.proofId, thread.parentIndex]),
      settledThreadProof.before.map((thread) => [thread.edgeId, thread.proofId, thread.parentIndex]),
      'polling must not replace, move, or re-tag existing dynamic thread DOM nodes'
    );
    for (const thread of settledThreadProof.after) {
      assert.equal(thread.animationName, 'none', 'settled idle threads should not have an active grow/reveal animation');
      assert.equal(thread.dashOffset, 0, 'settled idle threads should stay fully drawn');
      assert.equal(thread.entering, false, 'settled idle threads should not keep the entering class');
      assert.equal(thread.revealing, false, 'settled idle threads should not keep the reveal class');
    }

    const focusThreadProof = await evaluate(client, sessionId, `
      (async () => {
        const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
        const root = document.querySelector('[data-home-map]');
        const svg = document.querySelector('.gp-home-map-svg');
        const member = document.querySelector('[data-node-id="submission:approved-member-1"]');
        const dot = member?.querySelector('.gp-home-map-node-dot');
        const threads = () => [...document.querySelectorAll('[data-home-map-dynamic-threads] .gp-home-map-thread')];
        if (!root || !svg || !member || !dot) return { missing: true };
        const rect = svg.getBoundingClientRect();
        const cx = Number(dot.getAttribute('cx'));
        const cy = Number(dot.getAttribute('cy'));
        const viewBox = svg.viewBox.baseVal;
        const scale = Math.min(rect.width / viewBox.width, rect.height / viewBox.height);
        const offsetX = (rect.width - viewBox.width * scale) / 2;
        const offsetY = (rect.height - viewBox.height * scale) / 2;
        const clientX = rect.left + offsetX + (cx - viewBox.x) * scale;
        const clientY = rect.top + offsetY + (cy - viewBox.y) * scale;
        root.dispatchEvent(new PointerEvent('pointermove', {
          bubbles: true,
          clientX,
          clientY,
          pointerType: 'mouse',
        }));
        await wait(80);
        const focused = threads().map((thread) => ({
          edgeId: thread.dataset.edgeId || '',
          adjacent: thread.classList.contains('is-adj'),
          dim: thread.classList.contains('is-dim'),
          animationName: getComputedStyle(thread).animationName,
        }));
        await wait(2300);
        const focusedSettled = threads().map((thread) => ({
          edgeId: thread.dataset.edgeId || '',
          adjacent: thread.classList.contains('is-adj'),
          dim: thread.classList.contains('is-dim'),
          animationName: getComputedStyle(thread).animationName,
          revealing: thread.classList.contains('is-revealing'),
        }));
        root.dispatchEvent(new PointerEvent('pointermove', {
          bubbles: true,
          clientX: rect.left - 20,
          clientY: rect.top - 20,
          pointerType: 'mouse',
        }));
        root.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
        await wait(80);
        const idleAgain = threads().map((thread) => ({
          adjacent: thread.classList.contains('is-adj'),
          dim: thread.classList.contains('is-dim'),
          animationName: getComputedStyle(thread).animationName,
        }));
        const beforeClickScrollY = window.scrollY;
        member.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        await wait(80);
        const selectedRegion = document.querySelector('[data-home-map-selected]');
        const selectedRect = selectedRegion?.getBoundingClientRect();
        const canvasRect = root.getBoundingClientRect();
        const selectedStyle = selectedRegion ? getComputedStyle(selectedRegion) : null;
        const loopingAnimations = [...root.querySelectorAll('*')]
          .filter((el) => getComputedStyle(el).animationIterationCount === 'infinite')
          .map((el) => el.className?.toString() || el.tagName);
        const selected = threads().map((thread) => ({
          edgeId: thread.dataset.edgeId || '',
          adjacent: thread.classList.contains('is-adj'),
          dim: thread.classList.contains('is-dim'),
        }));
        return {
          missing: false,
          focused,
          focusedSettled,
          idleAgain,
          selected,
          selectedCardOpen: Boolean(selectedRegion && !selectedRegion.hidden),
          selectedCardText: selectedRegion?.textContent || '',
          selectedCardRole: selectedRegion?.getAttribute('role') || '',
          selectedCardPosition: selectedStyle?.position || '',
          selectedCardInCanvas: Boolean(selectedRegion && root.contains(selectedRegion)),
          selectedCardRect: selectedRect
            ? {
                left: Math.round(selectedRect.left),
                right: Math.round(selectedRect.right),
                top: Math.round(selectedRect.top),
                bottom: Math.round(selectedRect.bottom),
              }
            : null,
          canvasRect: {
            left: Math.round(canvasRect.left),
            right: Math.round(canvasRect.right),
            top: Math.round(canvasRect.top),
            bottom: Math.round(canvasRect.bottom),
          },
          selectedCardInsideStage: Boolean(
            selectedRect &&
            selectedRect.left >= canvasRect.left - 1 &&
            selectedRect.right <= canvasRect.right + 1 &&
            selectedRect.top >= canvasRect.top - 1 &&
            selectedRect.bottom <= canvasRect.bottom + 1
          ),
          scrollUnchanged: window.scrollY === beforeClickScrollY,
          loopingAnimations,
        };
      })()
    `);
    assert.equal(focusThreadProof.missing, false, 'expected member node and map geometry for focus proof');
    assert.equal(focusThreadProof.focused.filter((thread) => thread.adjacent).length, 1, 'member hover should reveal only its adjacent edge');
    assert.equal(focusThreadProof.focused.filter((thread) => thread.dim).length, 1, 'member hover should dim non-adjacent edges');
    assert.match(
      focusThreadProof.focused.find((thread) => thread.adjacent)?.animationName || '',
      /gpMapAdjacentThread/,
      'adjacent edge should reveal once when focus starts'
    );
    assert.equal(focusThreadProof.focusedSettled.filter((thread) => thread.adjacent).length, 1);
    assert.equal(
      focusThreadProof.focusedSettled.find((thread) => thread.adjacent)?.animationName,
      'none',
      'adjacent edge should stay locked without restarting reveal across polling'
    );
    assert.equal(
      focusThreadProof.focusedSettled.find((thread) => thread.adjacent)?.revealing,
      false,
      'adjacent edge should drop the one-shot reveal class after settling'
    );
    assert.equal(focusThreadProof.idleAgain.some((thread) => thread.adjacent || thread.dim), false, 'hover away should return threads to subtle idle state');
    assert.equal(focusThreadProof.selectedCardOpen, true, 'clicking the member should open the on-map selected-node card');
    assert.equal(focusThreadProof.selectedCardRole, 'region', 'selected node surface should be an interactive named region');
    assert.equal(focusThreadProof.selectedCardPosition, 'absolute', 'desktop selected node surface should be pinned inside the map');
    assert.equal(focusThreadProof.selectedCardInCanvas, true, 'selected node surface should live inside the map canvas');
    assert.equal(
      focusThreadProof.selectedCardInsideStage,
      true,
      `desktop selected node card should stay within the visible map stage ${JSON.stringify({
        selectedCardRect: focusThreadProof.selectedCardRect,
        canvasRect: focusThreadProof.canvasRect,
      })}`
    );
    assert.equal(focusThreadProof.scrollUnchanged, true, 'desktop node selection must not scroll the page');
    assert.match(focusThreadProof.selectedCardText, /Live Browser Member/);
    assert.match(focusThreadProof.selectedCardText, /\bMember\b/);
    assert.doesNotMatch(focusThreadProof.selectedCardText, /Member node/);
    assert.equal(focusThreadProof.selected.filter((thread) => thread.adjacent).length, 1, 'selected member should keep its adjacent edge locked');
    assert.deepEqual(focusThreadProof.loopingAnimations, [], 'map should not contain looping node or thread animations');

    const edgeTooltipProof = await evaluate(client, sessionId, `
      (() => {
        const hit = document.querySelector('.gp-home-map-thread-hit.is-adj[data-edge-id="edge:submission:approved-member-1:submission:approved-steward-1:public"]');
        const canvas = document.querySelector('[data-home-map]');
        const tooltip = document.querySelector('[data-home-map-edge-tooltip]');
        if (!hit || !canvas || !tooltip) return { missing: true };
        const rect = canvas.getBoundingClientRect();
        hit.dispatchEvent(new PointerEvent('pointerenter', {
          bubbles: true,
          clientX: rect.left + rect.width * 0.44,
          clientY: rect.top + rect.height * 0.5,
          pointerType: 'mouse',
        }));
        return {
          missing: false,
          hidden: tooltip.getAttribute('aria-hidden'),
          text: tooltip.textContent || '',
        };
      })()
    `);
    assert.equal(edgeTooltipProof.missing, false, 'expected an adjacent invisible edge hit path for the selected member');
    assert.equal(edgeTooltipProof.hidden, 'false', 'desktop edge hover should show the connection tooltip');
    assert.match(edgeTooltipProof.text, /Steward ↔ Member/);
    assert.match(edgeTooltipProof.text, /Public Goods/);
    assert.match(edgeTooltipProof.text, /Trusted Browser Steward/);

    const stewardVisual = await evaluate(client, sessionId, `
      (() => {
        const node = document.querySelector('[data-node-id="submission:approved-steward-1"]');
        const dot = node?.querySelector('.gp-home-map-node-dot');
        return {
          role: node?.getAttribute('data-node-role'),
          chapterSlug: node?.getAttribute('data-node-chapter-slug'),
          fill: dot ? getComputedStyle(dot).fill : '',
        };
      })()
    `);
    assert.equal(stewardVisual.role, 'Steward');
    assert.equal(stewardVisual.chapterSlug, 'nigeria');
    assert.match(stewardVisual.fill, /rgb\(240,\s*220,\s*160\)/, 'steward node should render with the gold token');

    await evaluate(client, sessionId, `
      document.querySelector('[data-node-id="submission:approved-steward-1"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
      true;
    `);
    await waitForExpression(
      client,
      sessionId,
      "document.querySelector('[data-home-map-selected]') && !document.querySelector('[data-home-map-selected]').hidden"
    );
    const selectedCard = await evaluate(client, sessionId, `
      (() => {
        const selected = document.querySelector('[data-home-map-selected]');
        const links = [...selected.querySelectorAll('[data-selected-links] a.gp-home-map-selected-link')];
        const chapterJump = selected.querySelector('[data-selected-links] button.gp-home-map-selected-link.is-chapter-jump');
        const edgeList = selected.querySelector('[data-selected-edge-list]');
        const chapterLink = links.find((a) => (a.getAttribute('href') || '').startsWith('/chapters/'));
        return {
          text: selected?.innerText || '',
          bioregionHidden: document.querySelector('[data-selected-bioregion]')?.hidden,
          profileNewTab: links.some((a) => a.target === '_blank' && a.getAttribute('href') === 'https://example.org/trusted-steward'),
          chapterHref: chapterLink ? chapterLink.getAttribute('href') : '',
          chapterJumpIsButton: Boolean(chapterJump),
          chapterJumpText: chapterJump ? chapterJump.textContent : '',
          edgeListVisible: Boolean(edgeList) && getComputedStyle(edgeList).display !== 'none',
        };
      })()
    `);
    assert.match(selectedCard.text, /Trusted Browser Steward/);
    // Desktop popover now carries compact selected-edge rows for direct graph
    // exploration; the old empty connection summary copy stays out.
    assert.equal(selectedCard.edgeListVisible, true, 'desktop selected popover should show selected connection rows');
    assert.doesNotMatch(selectedCard.text, /No public connections yet/);
    // One external link only: the profile (new tab). A steward's chapter is an
    // in-map jump BUTTON (opens the chapter node), not a second external link.
    assert.equal(selectedCard.profileNewTab, true, 'steward popover should expose a public profile link that opens in a new tab');
    assert.equal(selectedCard.chapterHref, '', 'steward popover must not carry a second external chapter link');
    assert.equal(selectedCard.chapterJumpIsButton, true, 'steward chapter affiliation should be an in-map jump button');
    assert.match(selectedCard.chapterJumpText, /→/, 'chapter jump should be labelled with the chapter name');
    assert.match(selectedCard.text, /Edit this node/);
    assert.equal(selectedCard.bioregionHidden, true, 'empty deferred bioregion should not be a selected-card centerpiece');

    // The steward is selected, so both its person-to-person edges are adjacent.
    // Theme colour is the only relationship signal, so they must render in more
    // than one colour — the map cannot be a monochrome decorative SVG.
    const stewardEdgeColours = await evaluate(client, sessionId, `
      (() => {
        const threads = [...document.querySelectorAll('[data-home-map-dynamic-threads] .gp-home-map-thread.is-adj')];
        const colours = new Set(threads.map((thread) => getComputedStyle(thread).stroke));
        return { adjacentCount: threads.length, distinctColours: colours.size, colours: [...colours] };
      })()
    `);
    assert.equal(stewardEdgeColours.adjacentCount, 2, 'selecting the steward should light up its two person-to-person edges');
    assert.equal(
      stewardEdgeColours.distinctColours >= 2,
      true,
      `the selected steward's adjacent edges should render in more than one theme colour (got ${JSON.stringify(stewardEdgeColours.colours)})`
    );

    // Desktop bounded drag-pan: zoom controls are visible on desktop now, so a
    // mouse user can zoom in and drag to pan. Reset → zoom from the centre →
    // drag centre-toward-centre so clamping at the bounds can't zero the pan.
    const desktopPanProof = await evaluate(client, sessionId, `
      (async () => {
        const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
        const root = document.querySelector('[data-home-map]');
        const svg = document.querySelector('.gp-home-map-svg');
        const zoomIn = document.querySelector('[data-home-map-zoom="in"]');
        const reset = document.querySelector('[data-home-map-zoom="reset"]');
        if (!root || !svg || !zoomIn || !reset) return { missing: true };
        reset.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        await wait(20);
        zoomIn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        zoomIn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        await wait(40);
        const zoomed = root.classList.contains('is-zoomed');
        const beforeViewBox = svg.getAttribute('viewBox') || '';
        const beforeUrl = location.href;
        const rect = root.getBoundingClientRect();
        const cx = rect.left + rect.width * 0.5;
        const cy = rect.top + rect.height * 0.5;
        root.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 31, pointerType: 'mouse', button: 0, clientX: cx, clientY: cy }));
        root.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerId: 31, pointerType: 'mouse', clientX: cx - 40, clientY: cy - 18 }));
        root.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 31, pointerType: 'mouse', clientX: cx - 40, clientY: cy - 18 }));
        await wait(40);
        return { missing: false, zoomed, beforeViewBox, afterViewBox: svg.getAttribute('viewBox') || '', beforeUrl, afterUrl: location.href };
      })()
    `);
    assert.equal(desktopPanProof.missing, false, 'expected desktop map + zoom controls for the drag-pan proof');
    assert.equal(desktopPanProof.zoomed, true, 'desktop zoom-in should zoom the map (zoom controls are visible on desktop)');
    assert.notEqual(desktopPanProof.afterViewBox, desktopPanProof.beforeViewBox, 'mouse drag should pan the zoomed desktop map (bounded)');
    assert.equal(desktopPanProof.afterUrl, desktopPanProof.beforeUrl, 'a drag-pan must not navigate the page');

    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 375,
      height: 812,
      deviceScaleFactor: 2,
      mobile: true,
    }, sessionId);
    await client.send('Emulation.setTouchEmulationEnabled', {
      enabled: true,
      maxTouchPoints: 2,
    }, sessionId);
    await evaluate(client, sessionId, `
      (async () => {
        const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
        document.querySelector('[data-selected-close]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        document.querySelector('[data-home-map-zoom="reset"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        await wait(40);
        const svg = document.querySelector('.gp-home-map-svg');
        const rect = svg?.getBoundingClientRect();
        // A prior desktop drag-pan intentionally suppresses the following SVG
        // click. Spend that flag on an empty map click before the mobile tap
        // proof, then the node activation below exercises the real open path.
        svg?.dispatchEvent(new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          clientX: rect ? rect.left + rect.width * 0.05 : 0,
          clientY: rect ? rect.top + rect.height * 0.05 : 0,
        }));
        await wait(80);
        return true;
      })()
    `);
    await waitForExpression(client, sessionId, "document.querySelector('[data-node-id=\"submission:approved-member-1\"]')");
    await waitForExpression(client, sessionId, "document.querySelector('.gp-home-map-thread-hit[data-edge-id=\"edge:submission:approved-member-1:submission:approved-steward-1:public\"]')");
    await new Promise((resolve) => setTimeout(resolve, 200));
    const mobileProof = await evaluate(client, sessionId, `
      (async () => {
        const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
        const root = document.querySelector('[data-home-map]');
        const svg = document.querySelector('.gp-home-map-svg');
        const member = document.querySelector('[data-node-id="submission:approved-member-1"]');
        const thread = document.querySelector('[data-home-map-dynamic-threads] .gp-home-map-thread');
        if (!root || !svg || !member || !thread) return { missing: true };
        // Let any in-flight deselect re-reveal (gpMapThreadResettle, ~620ms, from
        // the desktop flow's card close) settle before sampling the idle state.
        await wait(700);
        // Snapshot the idle thread state as primitives BEFORE any tap —
        // getComputedStyle returns a live object, and the first thread becomes
        // adjacent once its node is selected.
        const idleStyle = getComputedStyle(thread);
        const idleAnimation = idleStyle.animationName;
        const idleOpacity = Number.parseFloat(idleStyle.opacity);
        const fullViewBox = svg.getAttribute('viewBox') || '';
        const selectedIsOpen = () => Boolean(document.querySelector('[data-home-map-selected]') && !document.querySelector('[data-home-map-selected]').hidden);
        const activateNode = async (node) => {
          const rect = node.getBoundingClientRect();
          const clientX = rect.left + rect.width / 2;
          const clientY = rect.top + rect.height / 2;
          node.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true, pointerId: 71, pointerType: 'touch', clientX, clientY }));
          node.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, composed: true, pointerId: 71, pointerType: 'touch', clientX, clientY }));
          node.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true, cancelable: true, clientX, clientY }));
          await wait(80);
          if (!selectedIsOpen()) {
            node.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' }));
            await wait(80);
          }
        };

        const beforeTapScrollY = window.scrollY;
        await activateNode(member);
        await wait(120);
        const afterTapViewBox = svg.getAttribute('viewBox') || '';
        const bar = document.querySelector('[data-home-map-selected]');
        const edgeList = document.querySelector('[data-selected-edge-list]');
        const firstRow = document.querySelector('[data-selected-edge-row]');
        const rowCount = document.querySelectorAll('[data-selected-edge-row]').length;
        const barRect = bar?.getBoundingClientRect();
        const controlsRect = document.querySelector('[data-home-map-controls]')?.getBoundingClientRect();
        const rootRectAfterTap = root.getBoundingClientRect();
        const memberRectAfterTap = member.querySelector('.gp-home-map-node-dot')?.getBoundingClientRect();
        const rectsOverlap = (a, b) => Boolean(a && b && !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom));
        const barStyle = bar ? getComputedStyle(bar) : null;
        const barOpenAfterTap = Boolean(bar && !bar.hidden);
        const edgeListHiddenAfterTap = edgeList?.hidden;
        const barTextBeforeSwap = bar?.innerText || '';
        const visibleThemeRowsAfterTap = [...document.querySelectorAll('.gp-home-map-selected-themes, .gp-home-map-selected-edge-themes')]
          .filter((node) => {
            const rect = node.getBoundingClientRect();
            return getComputedStyle(node).display !== 'none' && rect.width > 0 && rect.height > 0;
          }).length;
        const activationDebug = {
          memberClass: member.getAttribute('class') || '',
          memberKey: member.dataset.memberKey || '',
          memberRole: member.getAttribute('role') || '',
          memberTabIndex: member.getAttribute('tabindex') || '',
          memberHidden: member.getAttribute('aria-hidden') || '',
          barExists: Boolean(bar),
          barHiddenAfterTap: bar ? Boolean(bar.hidden) : null,
          barTextAfterTap: bar?.innerText || '',
          rowCount,
        };
        firstRow?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        await wait(120);
        const afterRowViewBox = svg.getAttribute('viewBox') || '';
        const activeRowsAfterRow = document.querySelectorAll('[data-selected-edge-row].is-active').length;
        const barRectAfterRow = bar?.getBoundingClientRect();

        const stewardNode = document.querySelector('[data-node-id="submission:approved-steward-1"]');
        if (stewardNode) await activateNode(stewardNode);
        await wait(120);
        const barTextAfterSwap = bar?.innerText || '';
        const rowCountAfterSwap = document.querySelectorAll('[data-selected-edge-row]').length;
        const barOpenAfterSwap = Boolean(bar && !bar.hidden);
        const beforeExplicitZoomViewBox = svg.getAttribute('viewBox') || '';
        document.querySelector('[data-home-map-zoom="in"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        await wait(120);
        const afterExplicitZoomViewBox = svg.getAttribute('viewBox') || '';
        const beforePanViewBox = afterExplicitZoomViewBox;

        const rect = root.getBoundingClientRect();
        const panStartX = rect.left + rect.width * 0.5;
        const panStartY = rect.top + rect.height * 0.52;
        root.dispatchEvent(new PointerEvent('pointerdown', {
          bubbles: true,
          pointerId: 11,
          pointerType: 'touch',
          clientX: panStartX,
          clientY: panStartY,
        }));
        root.dispatchEvent(new PointerEvent('pointermove', {
          bubbles: true,
          pointerId: 11,
          pointerType: 'touch',
          clientX: panStartX + 44,
          clientY: panStartY + 18,
        }));
        root.dispatchEvent(new PointerEvent('pointerup', {
          bubbles: true,
          pointerId: 11,
          pointerType: 'touch',
          clientX: panStartX + 44,
          clientY: panStartY + 18,
        }));
        await wait(120);
        const afterPanViewBox = svg.getAttribute('viewBox') || '';

        const beforePinchViewBox = afterPanViewBox;
        root.dispatchEvent(new PointerEvent('pointerdown', {
          bubbles: true,
          pointerId: 21,
          pointerType: 'touch',
          clientX: rect.left + rect.width * 0.42,
          clientY: rect.top + rect.height * 0.5,
        }));
        root.dispatchEvent(new PointerEvent('pointerdown', {
          bubbles: true,
          pointerId: 22,
          pointerType: 'touch',
          clientX: rect.left + rect.width * 0.58,
          clientY: rect.top + rect.height * 0.5,
        }));
        root.dispatchEvent(new PointerEvent('pointermove', {
          bubbles: true,
          pointerId: 21,
          pointerType: 'touch',
          clientX: rect.left + rect.width * 0.35,
          clientY: rect.top + rect.height * 0.5,
        }));
        root.dispatchEvent(new PointerEvent('pointermove', {
          bubbles: true,
          pointerId: 22,
          pointerType: 'touch',
          clientX: rect.left + rect.width * 0.65,
          clientY: rect.top + rect.height * 0.5,
        }));
        root.dispatchEvent(new PointerEvent('pointerup', {
          bubbles: true,
          pointerId: 21,
          pointerType: 'touch',
          clientX: rect.left + rect.width * 0.35,
          clientY: rect.top + rect.height * 0.5,
        }));
        root.dispatchEvent(new PointerEvent('pointerup', {
          bubbles: true,
          pointerId: 22,
          pointerType: 'touch',
          clientX: rect.left + rect.width * 0.65,
          clientY: rect.top + rect.height * 0.5,
        }));
        await wait(120);
        const afterPinchViewBox = svg.getAttribute('viewBox') || '';

        const beforeCloseViewBox = svg.getAttribute('viewBox') || '';
        document.querySelector('[data-selected-close]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        await wait(120);
        const afterCloseViewBox = svg.getAttribute('viewBox') || '';
        const barClosedAfterClose = Boolean(bar?.hidden);

        const nearTapPointForMember = () => {
          const dotRect = member.querySelector('.gp-home-map-node-dot')?.getBoundingClientRect();
          const hitRect = member.querySelector('.gp-home-map-node-hit')?.getBoundingClientRect();
          if (!dotRect) return null;
          const center = {
            x: dotRect.left + dotRect.width / 2,
            y: dotRect.top + dotRect.height / 2,
          };
          const nearestOther = [...document.querySelectorAll('.gp-home-map-node-link:not(.is-filtered-out)')]
            .filter((node) => node !== member)
            .map((node) => {
              const rect = node.querySelector('.gp-home-map-node-dot')?.getBoundingClientRect();
              if (!rect) return null;
              const x = rect.left + rect.width / 2;
              const y = rect.top + rect.height / 2;
              return { x, y, distance: Math.hypot(center.x - x, center.y - y) };
            })
            .filter(Boolean)
            .sort((a, b) => a.distance - b.distance)[0];
          const dx = nearestOther ? center.x - nearestOther.x : 1;
          const dy = nearestOther ? center.y - nearestOther.y : 0;
          const magnitude = Math.hypot(dx, dy) || 1;
          const offset = Math.max(12, Math.max(hitRect?.width ?? 0, hitRect?.height ?? 0) / 2 + 4);
          return {
            clientX: center.x + (dx / magnitude) * offset,
            clientY: center.y + (dy / magnitude) * offset,
          };
        };
        const nearTapPoint = nearTapPointForMember();
        if (nearTapPoint) {
          svg.dispatchEvent(new PointerEvent('pointerdown', {
            bubbles: true,
            pointerId: 41,
            pointerType: 'mouse',
            clientX: nearTapPoint.clientX,
            clientY: nearTapPoint.clientY,
          }));
          svg.dispatchEvent(new PointerEvent('pointerup', {
            bubbles: true,
            pointerId: 41,
            pointerType: 'mouse',
            clientX: nearTapPoint.clientX,
            clientY: nearTapPoint.clientY,
          }));
          svg.dispatchEvent(new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            clientX: nearTapPoint.clientX,
            clientY: nearTapPoint.clientY,
          }));
        }
        await wait(120);
        const mouseNearTapBarOpen = Boolean(bar && !bar.hidden);

        if (nearTapPoint) {
          svg.dispatchEvent(new PointerEvent('pointerdown', {
            bubbles: true,
            pointerId: 42,
            pointerType: 'touch',
            clientX: nearTapPoint.clientX,
            clientY: nearTapPoint.clientY,
          }));
          svg.dispatchEvent(new PointerEvent('pointerup', {
            bubbles: true,
            pointerId: 42,
            pointerType: 'touch',
            clientX: nearTapPoint.clientX,
            clientY: nearTapPoint.clientY,
          }));
          svg.dispatchEvent(new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            clientX: nearTapPoint.clientX,
            clientY: nearTapPoint.clientY,
          }));
        }
        await wait(120);
        const nearestTapBarOpen = Boolean(bar && !bar.hidden);
        const nearestTapBarText = bar?.innerText || '';
        document.querySelector('[data-selected-close]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        await wait(120);

        const listToggle = document.querySelector('[data-home-map-list-toggle]');
        listToggle?.focus({ preventScroll: true });
        listToggle?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        await wait(160);
        const listDrawer = document.querySelector('[data-home-map-list]');
        const listClose = document.querySelector('[data-home-map-list-close]');
        const listRect = listDrawer?.getBoundingClientRect();
        const listRows = [...(listDrawer?.querySelectorAll('.gp-home-map-list-row') || [])];
        const visibleListRows = listRect
          ? listRows.filter((row) => {
              const rowRect = row.getBoundingClientRect();
              return rowRect.height > 0 && rowRect.bottom > listRect.top && rowRect.top < listRect.bottom;
            }).length
          : 0;
        const listStyle = listDrawer ? getComputedStyle(listDrawer) : null;
        const listOpen = Boolean(listDrawer && !listDrawer.hidden && listDrawer.open);
        const listAriaModal = listDrawer?.getAttribute('aria-modal') || '';
        const listPosition = listStyle?.position || '';
        listClose?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        await wait(120);
        const listClosed = Boolean(listDrawer?.hidden && !listDrawer?.open);
        const listFocusReturned = document.activeElement === listToggle;

        return {
          missing: false,
          fullViewBox,
          afterTapViewBox,
          afterRowViewBox,
          beforeExplicitZoomViewBox,
          afterExplicitZoomViewBox,
          beforePanViewBox,
          afterPanViewBox,
          beforePinchViewBox,
          afterPinchViewBox,
          beforeCloseViewBox,
          afterCloseViewBox,
          idleAnimation,
          idleOpacity,
          barOpen: barOpenAfterTap,
          activationDebug,
          selectedGeometry: {
            rootTop: rootRectAfterTap.top,
            rootBottom: rootRectAfterTap.bottom,
            barTop: barRect?.top ?? null,
            barBottom: barRect?.bottom ?? null,
            memberTop: memberRectAfterTap?.top ?? null,
            memberBottom: memberRectAfterTap?.bottom ?? null,
            memberWidth: memberRectAfterTap?.width ?? null,
            memberHeight: memberRectAfterTap?.height ?? null,
            barHeight: barRect?.height ?? null,
            barHeightAfterRow: barRectAfterRow?.height ?? null,
          },
          barOpenAfterSwap,
          barPosition: barStyle?.position || '',
          barInsideCanvas: Boolean(
            barRect &&
            barRect.left >= rootRectAfterTap.left - 1 &&
            barRect.right <= rootRectAfterTap.right + 1 &&
            barRect.top >= rootRectAfterTap.top - 1 &&
            barRect.bottom <= rootRectAfterTap.bottom + 1
          ),
          selectedNodeAboveBar: Boolean(
            barRect &&
            memberRectAfterTap &&
            memberRectAfterTap.width > 0 &&
            memberRectAfterTap.height > 0 &&
            memberRectAfterTap.top >= rootRectAfterTap.top - 1 &&
            memberRectAfterTap.bottom <= barRect.top - 6
          ),
          controlsOverlap: rectsOverlap(barRect, controlsRect),
          scrollUnchanged: window.scrollY === beforeTapScrollY,
          edgeListHidden: edgeListHiddenAfterTap,
          rowCount,
          activeRowsAfterRow,
          barTextBeforeSwap,
          barTextAfterSwap,
          rowCountAfterSwap,
          barClosedAfterClose,
          visibleThemeRowsAfterTap,
          mouseNearTapBarOpen,
          nearestTapBarOpen,
          nearestTapBarText,
          listOpen,
          listAriaModal,
          listPosition,
          visibleListRows,
          listClosed,
          listFocusReturned,
        };
      })()
    `);
    assert.equal(mobileProof.missing, false, 'expected mobile map proof fixtures to render');
    assert.equal(mobileProof.idleAnimation, 'none', 'mobile idle threads should not run a prominent grow animation');
    assert.equal(mobileProof.idleOpacity <= 0.3, true, 'mobile idle edges should stay quiet');
    assert.equal(mobileProof.barOpen, true, `tapping a node should open the mobile compact selected bar: ${JSON.stringify(mobileProof.activationDebug)}`);
    assert.equal(mobileProof.barPosition, 'absolute', 'mobile selected bar should be an over-map surface');
    assert.equal(mobileProof.barInsideCanvas, true, 'mobile selected bar should stay inside the map canvas');
    assert.equal(
      mobileProof.selectedNodeAboveBar,
      true,
      `selected mobile node should remain visible above the compact bar: ${JSON.stringify(mobileProof.selectedGeometry)}`
    );
    assert.equal(mobileProof.controlsOverlap, false, 'mobile selected bar should not overlap map controls at 375px');
    assert.equal(mobileProof.scrollUnchanged, true, 'opening the mobile selected bar must not scroll the page');
    assert.equal(
      mobileProof.edgeListHidden,
      false,
      `mobile selected node should show a connection list: ${JSON.stringify({
        text: mobileProof.barTextBeforeSwap,
        rowCount: mobileProof.rowCount,
        activation: mobileProof.activationDebug,
      })}`
    );
    assert.equal(mobileProof.rowCount > 0, true, 'mobile selected bar should render at least one connection chip');
    assert.equal(mobileProof.activeRowsAfterRow, 1, 'tapping a connection chip should highlight exactly that one edge row');
    assert.equal(mobileProof.afterTapViewBox, mobileProof.fullViewBox, 'tapping a node should not change the map viewBox');
    assert.equal(mobileProof.afterRowViewBox, mobileProof.afterTapViewBox, 'tapping a connection row should highlight without changing the map viewBox');
    assert.equal(
      typeof mobileProof.selectedGeometry.barHeight === 'number' &&
        typeof mobileProof.selectedGeometry.barHeightAfterRow === 'number' &&
        mobileProof.selectedGeometry.barHeight <= 184 &&
        mobileProof.selectedGeometry.barHeightAfterRow <= 184,
      true,
      `mobile selected bar should stay compact before and after chip tap: ${JSON.stringify(mobileProof.selectedGeometry)}`
    );
    assert.equal(mobileProof.visibleThemeRowsAfterTap, 0, 'mobile selected bar should not expose separate theme-chip rows');
    assert.match(mobileProof.barTextBeforeSwap, /Live Browser Member/);
    assert.match(mobileProof.barTextAfterSwap, /Trusted Browser Steward/);
    assert.equal(mobileProof.barOpenAfterSwap, true, 'tapping another node should swap the selected bar without closing it');
    assert.equal(mobileProof.rowCountAfterSwap > 0, true, 'swapped mobile bar should keep connection chips available');
    assert.notEqual(mobileProof.afterExplicitZoomViewBox, mobileProof.beforeExplicitZoomViewBox, 'mobile zoom control should change the bounded viewBox');
    assert.notEqual(mobileProof.afterPanViewBox, mobileProof.beforePanViewBox, 'mobile pan should change the bounded viewBox');
    assert.notEqual(mobileProof.afterPinchViewBox, mobileProof.beforePinchViewBox, 'mobile pinch should change the bounded viewBox');
    assert.notEqual(mobileProof.beforeCloseViewBox, mobileProof.fullViewBox, 'mobile close proof should start from a zoomed map');
    assert.match(mobileProof.afterCloseViewBox, /^0(?:\.00)? 0(?:\.00)? 200(?:\.00)? 88(?:\.00)?$/, 'closing the mobile selected bar should restore the full map viewBox');
    assert.equal(mobileProof.barClosedAfterClose, true, 'mobile selected bar close button should dismiss the bar');
    assert.equal(mobileProof.mouseNearTapBarOpen, false, 'nearest-node fallback should not activate from a mouse-origin near tap');
    assert.equal(mobileProof.nearestTapBarOpen, true, `near-node mobile canvas tap should open a selected bar: ${mobileProof.nearestTapBarText}`);
    assert.match(mobileProof.nearestTapBarText, /Live Browser Member/);
    assert.equal(mobileProof.listOpen, true, 'mobile List should open as a dialog sheet');
    assert.equal(mobileProof.listAriaModal, 'true', 'mobile List dialog should declare modal behavior while open');
    assert.equal(mobileProof.listPosition, 'fixed', 'mobile List dialog should be a top-layer bottom sheet, not a clipped map drawer');
    assert.equal(mobileProof.visibleListRows >= 4, true, `mobile List should show multiple rows at once (saw ${mobileProof.visibleListRows})`);
    assert.equal(mobileProof.listClosed, true, 'mobile List close button should close the dialog');
    assert.equal(mobileProof.listFocusReturned, true, 'mobile List close should return focus to the List button');

    const publicLeakCheck = await evaluate(client, sessionId, `
      (() => {
        const needles = ${JSON.stringify([privateEmail, liveMemberEmail, stewardEmail, privateRawNote])};
        const publicDom = document.querySelector('[data-home-map]')?.outerHTML || '';
        const selected = document.querySelector('[data-home-map-selected]')?.outerHTML || '';
        const storage = [];
        for (let index = 0; index < localStorage.length; index += 1) {
          const key = localStorage.key(index) || '';
          storage.push(key, localStorage.getItem(key) || '');
        }
        return needles.filter((needle) => publicDom.includes(needle) || selected.includes(needle) || storage.join('\\n').includes(needle));
      })()
    `);
    assert.deepEqual(publicLeakCheck, [], 'private emails/raw notes must not appear in public map DOM, selected card/bar, or local pending storage');

    assert.equal(mapNodePosts.length, 3, 'expected three controlled map-node submissions');
    assert.equal(mapNodePosts[0].themes.length, 1, 'moderated flow should accept one theme');
    assert.equal(mapNodePosts[1].themes.length, 2, 'live member flow should accept multiple themes');
    assert.equal(mapNodePosts[2].email, stewardEmail, 'steward flow should use the allowlisted email path');
    assert.equal(mapNodePosts.every((body) => typeof body.locationConfirmationId === 'string' && body.locationConfirmationId.length > 0), true);
    assert.equal(mapNodePosts.some((body) => Object.hasOwn(body, 'placeName') || Object.hasOwn(body, 'lat') || Object.hasOwn(body, 'long')), false);

    console.log('[home-map-browser-smoke] passed');
  } finally {
    client?.close();
    await chrome?.close().catch(() => {});
    await staticServer.close().catch(() => {});
  }
}

runSmoke().catch((error) => {
  console.error('[home-map-browser-smoke] failed');
  console.error(error);
  process.exitCode = 1;
});
