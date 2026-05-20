import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { accessSync, constants } from 'node:fs';
import { createServer } from 'node:http';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const distRoot = join(rootDir, 'packages/website/dist');
const routeHtmlPath = join(distRoot, 'map/edit/index.html');
const required = process.env.MAP_EDIT_BROWSER_SMOKE_REQUIRED === '1';

const editableNode = Object.freeze({
  id: '11111111-1111-4111-8111-111111111111',
  display_name: 'Browser Smoke Node',
  place_name: 'Browser Smoke Place',
  city: 'Oakland',
  region: 'California',
  country: 'United States',
  latitude: 37.8,
  longitude: -122.2,
  themes: ['trees', 'ai'],
  public_note: 'Browser smoke public note.',
});

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
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    try {
      accessSync(candidate, constants.X_OK);
      return candidate;
    } catch {
      // Continue probing.
    }
  }

  return '';
}

function contentTypeFor(filePath: string): string {
  switch (extname(filePath)) {
    case '.css':
      return 'text/css; charset=utf-8';
    case '.js':
      return 'text/javascript; charset=utf-8';
    case '.json':
      return 'application/json; charset=utf-8';
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.svg':
      return 'image/svg+xml';
    case '.ico':
      return 'image/x-icon';
    default:
      return 'text/html; charset=utf-8';
  }
}

async function startStaticServer(): Promise<{ close: () => Promise<void>; origin: string }> {
  const server = createServer(async (request, response) => {
    try {
      const requestUrl = new URL(request.url || '/', 'http://127.0.0.1');
      let relativePath = decodeURIComponent(requestUrl.pathname).replace(/^\/+/, '');
      if (!relativePath || relativePath === 'map/edit') {
        relativePath = 'map/edit/index.html';
      } else if (relativePath.endsWith('/')) {
        relativePath = `${relativePath}index.html`;
      }

      const filePath = resolve(distRoot, relativePath);
      const resolvedDistRoot = resolve(distRoot);
      if (filePath !== resolvedDistRoot && !filePath.startsWith(`${resolvedDistRoot}${sep}`)) {
        response.writeHead(403);
        response.end('Forbidden');
        return;
      }

      const fileStat = await stat(filePath);
      const resolvedPath = fileStat.isDirectory() ? join(filePath, 'index.html') : filePath;
      const body = await readFile(resolvedPath);
      response.writeHead(200, { 'Content-Type': contentTypeFor(resolvedPath) });
      response.end(body);
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

async function launchChrome(chromeBinary: string): Promise<{
  close: () => Promise<void>;
  webSocketUrl: string;
}> {
  const userDataDir = await mkdtemp(join(tmpdir(), 'map-edit-browser-smoke-'));
  const chrome = spawn(chromeBinary, [
    '--headless=new',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--no-first-run',
    '--no-default-browser-check',
    '--remote-debugging-port=0',
    `--user-data-dir=${userDataDir}`,
    'about:blank',
  ], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });

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
        if (message.error) {
          pending?.reject(new Error(`${message.error.message || 'CDP error'} (${message.error.code})`));
        } else {
          pending?.resolve(message.result ?? {});
        }
        return;
      }

      if (message.method) {
        for (const listener of this.#listeners.get(message.method) ?? []) {
          listener(message);
        }
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
    if (await evaluate(client, sessionId, expression)) return;
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 50));
  }
  throw new Error(`Timed out waiting for browser expression: ${expression}`);
}

function jsonFulfillment(status: number, body: unknown) {
  return {
    responseCode: status,
    responseHeaders: [
      { name: 'Access-Control-Allow-Origin', value: '*' },
      { name: 'Access-Control-Allow-Methods', value: 'POST, OPTIONS' },
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
      { name: 'Access-Control-Allow-Methods', value: 'POST, OPTIONS' },
      { name: 'Access-Control-Allow-Headers', value: 'Content-Type' },
      { name: 'Access-Control-Max-Age', value: '60' },
    ],
  };
}

async function runSmoke(): Promise<void> {
  await stat(routeHtmlPath);
  const chromeBinary = findChromeBinary();
  if (!chromeBinary) {
    const message = 'No Chrome/Chromium binary found for map edit browser smoke. Set CHROME_BIN or MAP_EDIT_BROWSER_SMOKE_REQUIRED=1 to enforce this check.';
    if (required) throw new Error(message);
    console.warn(`[map-edit-browser-smoke] ${message} Skipping.`);
    return;
  }

  const staticServer = await startStaticServer();
  const chrome = await launchChrome(chromeBinary);
  let client: CdpClient | null = null;

  try {
    client = await CdpClient.connect(chrome.webSocketUrl);
    const target = await client.send('Target.createTarget', { url: 'about:blank' });
    const attached = await client.send('Target.attachToTarget', {
      targetId: target.targetId,
      flatten: true,
    });
    const sessionId = attached.sessionId;
    const networkRequests = [];
    const agentRequests = [];
    const updateRequests = [];

    client.on('Network.requestWillBeSent', (message) => {
      if (message.sessionId !== sessionId) return;
      networkRequests.push(message.params);
    });

    client.on('Fetch.requestPaused', (message) => {
      if (message.sessionId !== sessionId) return;
      const { request, requestId } = message.params;
      if (request.method === 'OPTIONS') {
        client?.send('Fetch.fulfillRequest', {
          requestId,
          ...corsPreflightFulfillment(),
        }, sessionId).catch((error) => {
          throw error;
        });
        return;
      }

      agentRequests.push({ method: request.method, url: request.url, postData: request.postData || '' });

      if (request.method === 'POST' && request.url.endsWith('/map-nodes/edit-session')) {
        client?.send('Fetch.fulfillRequest', {
          requestId,
          ...jsonFulfillment(200, { node: editableNode }),
        }, sessionId).catch((error) => {
          throw error;
        });
        return;
      }

      if (request.method === 'POST' && request.url.endsWith('/update-requests')) {
        updateRequests.push({ method: request.method, url: request.url, postData: request.postData || '' });
        client?.send('Fetch.fulfillRequest', {
          requestId,
          ...jsonFulfillment(201, { updateRequest: { id: 'request-1', status: 'pending' } }),
        }, sessionId).catch((error) => {
          throw error;
        });
        return;
      }

      client?.send('Fetch.fulfillRequest', {
        requestId,
        ...jsonFulfillment(404, { error: { code: 'not_found' } }),
      }, sessionId).catch((error) => {
        throw error;
      });
    });

    await client.send('Runtime.enable', {}, sessionId);
    await client.send('Page.enable', {}, sessionId);
    await client.send('Network.enable', {}, sessionId);
    await client.send('Fetch.enable', {
      patterns: [{ urlPattern: '*://127.0.0.1:8787/*', requestStage: 'Request' }],
    }, sessionId);

    await client.send('Page.navigate', {
      url: `${staticServer.origin}/map/edit?token=browser-token&keep=1#smoke`,
    }, sessionId);
    await waitForExpression(
      client,
      sessionId,
      "document.querySelector('#map-edit-form') && !document.querySelector('#map-edit-form').hidden"
    );

    assert.equal(
      await evaluate(client, sessionId, "location.href.includes('token=')"),
      false,
      'visible URL should not retain token'
    );
    assert.equal(
      await evaluate(client, sessionId, "new URL(location.href).search"),
      '?keep=1',
      'non-token query params should be preserved'
    );
    assert.equal(
      await evaluate(client, sessionId, `
        (() => {
          const token = 'browser-token';
          const storageContainsToken = (storage) => {
            try {
              for (let index = 0; index < storage.length; index += 1) {
                const key = storage.key(index) || '';
                const value = storage.getItem(key) || '';
                if (key.includes(token) || value.includes(token)) return true;
              }
            } catch {
              return false;
            }
            return false;
          };
          return (
            document.documentElement.outerHTML.includes(token) ||
            storageContainsToken(window.localStorage) ||
            storageContainsToken(window.sessionStorage)
          );
        })()
      `),
      false,
      'token should not persist in DOM or browser storage'
    );

    const leakedTokenRequest = networkRequests.find((request) => {
      if (request.type === 'Document') return false;
      const referer = request.request.headers?.Referer || request.request.headers?.referer || '';
      return request.request.url.includes('browser-token') || String(referer).includes('browser-token');
    });
    assert.equal(leakedTokenRequest, undefined, 'non-document requests should not leak token in URL or Referer');

    await evaluate(client, sessionId, "document.querySelector('#map-edit-form').requestSubmit(); true");
    await waitForExpression(
      client,
      sessionId,
      "document.querySelector('#map-edit-failure').textContent.includes('Make at least one')"
    );
    assert.equal(updateRequests.length, 0, 'unchanged submit should not create an update request');

    await evaluate(client, sessionId, `
      document.querySelector('textarea[name="public_note"]').value = 'Browser smoke update.';
      document.querySelector('#map-edit-form').requestSubmit();
      true;
    `);
    await waitForExpression(
      client,
      sessionId,
      "document.querySelector('#map-edit-success') && !document.querySelector('#map-edit-success').hidden"
    );

    assert.equal(agentRequests[0].url, 'http://127.0.0.1:8787/map-nodes/edit-session');
    assert.equal(updateRequests.length, 1, 'changed submit should create exactly one update request');
    const updateBody = JSON.parse(updateRequests[0].postData || '{}');
    assert.equal(updateBody.token, 'browser-token');
    assert.equal(updateBody.public_note, 'Browser smoke update.');
    assert.equal(Object.hasOwn(updateBody, 'email'), false);
    assert.equal(Object.hasOwn(updateBody, 'role'), false);
    assert.equal(Object.hasOwn(updateBody, 'type'), false);

    console.log('[map-edit-browser-smoke] passed');
  } finally {
    client?.close();
    await chrome.close().catch(() => {});
    await staticServer.close().catch(() => {});
  }
}

runSmoke().catch((error) => {
  console.error('[map-edit-browser-smoke] failed');
  console.error(error);
  process.exitCode = 1;
});
