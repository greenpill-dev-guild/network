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
  themes: ['public', 'events'],
  publicNote: 'Steward public note.',
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
      : [approvedMember, approvedSteward];
  const edges = phase === 'live-steward'
    ? [
      {
        id: 'edge:submission:approved-steward-1:chapter:nigeria:public',
        from: 'submission:approved-steward-1',
        to: 'chapter:nigeria',
        kind: 'steward-chapter',
        theme: 'public',
        weight: 2,
        source: 'source-backed',
      },
      {
        id: 'edge:submission:approved-member-1:submission:approved-steward-1:public',
        from: 'submission:approved-member-1',
        to: 'submission:approved-steward-1',
        kind: 'shared-theme',
        theme: 'public',
        weight: 1,
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
    (() => {
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
      svg.dispatchEvent(new MouseEvent('click', {
        bubbles: true,
        clientX: rect.left + rect.width * ${xRatio},
        clientY: rect.top + rect.height * ${yRatio},
      }));
      form.dispatchEvent(new Event('input', { bubbles: true }));
      document.querySelector('[data-walkthrough-next]').click();
      form.requestSubmit();
      return {
        dialogOpen: document.querySelector('[data-home-map-addnode-dialog]').open,
        selectedThemeCount: [...document.querySelectorAll('[data-theme-choice][aria-pressed="true"]')].length,
        place: clean(form.elements.place.value),
        lat: clean(form.elements.lat.value),
        long: clean(form.elements.long.value),
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

      if (request.method === 'POST' && request.url.endsWith('/map-nodes')) {
        const body = JSON.parse(request.postData || '{}');
        mapNodePosts.push(body);
        if (body.email === privateEmail) {
          fulfill(201, {
            node: {
              id: 'pending-browser-node',
              status: 'pending',
              displayName: body.displayName,
              placeName: body.placeName,
              lat: body.lat,
              long: body.long,
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
      patterns: [{ urlPattern: '*://127.0.0.1:3303/*', requestStage: 'Request' }],
    }, sessionId);

    await client.send('Page.navigate', { url: `${staticServer.origin}/` }, sessionId);
    await waitForExpression(client, sessionId, "document.querySelector('[data-home-map]')");
    await waitForExpression(client, sessionId, "document.querySelector('[data-home-map-open]')");
    assert.equal(
      await evaluate(client, sessionId, "Boolean(document.querySelector('[data-node-id=\"chapter:nigeria\"]'))"),
      true,
      'expected the Nigeria chapter anchor to exist for steward-chapter proof'
    );
    assert.equal(
      await evaluate(client, sessionId, "document.querySelector('.gp-home-map-legend') && !document.querySelector('[data-home-map-stat-count]')"),
      true,
      'map should render a count-free identity legend, not steward/member counts'
    );
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
    await waitForExpression(
      client,
      sessionId,
      "Boolean(document.querySelector('.gp-home-map-thread[data-from=\"submission:approved-steward-1\"][data-to=\"chapter:nigeria\"], .gp-home-map-thread[data-from=\"chapter:nigeria\"][data-to=\"submission:approved-steward-1\"]'))"
    );

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
    const selectedPanel = await evaluate(client, sessionId, `
      (() => {
        const selected = document.querySelector('[data-home-map-selected]');
        return {
          text: selected?.innerText || '',
          bioregionHidden: document.querySelector('[data-selected-bioregion]')?.hidden,
        };
      })()
    `);
    assert.match(selectedPanel.text, /Trusted Browser Steward/);
    assert.match(selectedPanel.text, /Steward public note/);
    assert.match(selectedPanel.text, /connected to/i);
    assert.equal(selectedPanel.bioregionHidden, true, 'empty deferred bioregion should not be a selected-panel centerpiece');

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
    assert.deepEqual(publicLeakCheck, [], 'private emails/raw notes must not appear in public map DOM, selected panel, or local pending storage');

    assert.equal(mapNodePosts.length, 3, 'expected three controlled map-node submissions');
    assert.equal(mapNodePosts[0].themes.length, 1, 'moderated flow should accept one theme');
    assert.equal(mapNodePosts[1].themes.length, 2, 'live member flow should accept multiple themes');
    assert.equal(mapNodePosts[2].email, stewardEmail, 'steward flow should use the allowlisted email path');

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
