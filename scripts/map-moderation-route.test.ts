import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { runInNewContext } from 'node:vm';

const rootDir = resolve(new URL('..', import.meta.url).pathname);
const routeHtmlPath = join(rootDir, 'packages/website/dist/map/moderate/index.html');
let routeHtml = '';

function makeElement(id): any {
  const heading = { focusCalls: 0, focus() { this.focusCalls += 1; } };
  const paragraph = { textContent: '' };
  return {
    id,
    hidden: id !== 'moderation-loading',
    textContent: '',
    value: '',
    disabled: false,
    open: false,
    className: '',
    dataset: {},
    children: [],
    listeners: new Map(),
    addEventListener(type, listener) { this.listeners.set(type, listener); },
    append(child) { this.children.push(child); },
    replaceChildren(...children) { this.children = children; },
    focus() {},
    showModal() { this.open = true; },
    close() { this.open = false; },
    querySelector(selector) {
      if (selector === 'p') return paragraph;
      if (selector === 'h1, h2') return heading;
      return null;
    },
    _heading: heading,
    _paragraph: paragraph,
  };
}

function extractInlineController(html) {
  const openingTag = '<script>';
  const closingTag = '</script>';
  const start = html.indexOf(openingTag);
  const end = start === -1 ? -1 : html.indexOf(closingTag, start + openingTag.length);
  assert.ok(start !== -1 && end !== -1, 'expected an inline moderation controller');
  return html.slice(start + openingTag.length, end);
}

function openingTags(html, tagName) {
  const normalized = html.toLowerCase();
  const tags = [];
  let cursor = 0;
  while (cursor < normalized.length) {
    const start = normalized.indexOf(`<${tagName}`, cursor);
    if (start === -1) break;
    const end = normalized.indexOf('>', start);
    assert.notEqual(end, -1, `expected closing bracket for ${tagName} tag`);
    tags.push(normalized.slice(start, end + 1));
    cursor = end + 1;
  }
  return tags;
}

function response(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() { return body; },
  };
}

function createHarness({
  hash = '#token=moderation-token',
  fetchImpl,
}: {
  hash?: string;
  fetchImpl: (url: string, init: Record<string, any>) => Promise<any>;
}) {
  const ids = [
    'moderation-loading', 'moderation-invalid', 'moderation-failure', 'moderation-resolved',
    'moderation-pending', 'moderation-name', 'moderation-place', 'moderation-coordinates',
    'moderation-themes', 'moderation-public-note', 'moderation-submitted', 'moderation-expiry',
    'moderation-approve', 'moderation-decline', 'moderation-approve-dialog',
    'moderation-decline-dialog', 'moderation-approve-confirm', 'moderation-approve-cancel',
    'moderation-decline-confirm', 'moderation-decline-cancel', 'moderation-decline-note',
    'moderation-decline-count', 'moderation-action-failure', 'moderation-resolved-title',
    'moderation-resolved-message',
  ];
  const elements = new Map(ids.map((id) => [id, makeElement(id)]));
  const domListeners = new Map();
  const replaceCalls = [];
  const windowMock: any = {
    location: {
      hash,
      pathname: '/map/moderate',
      search: '',
      hostname: '127.0.0.1',
    },
    history: {
      state: { test: true },
      replaceState(...args) { replaceCalls.push(args); },
    },
    addEventListener(type, listener) { domListeners.set(type, listener); },
  };
  const documentMock: any = {
    title: 'Moderation test',
    getElementById(id) { return elements.get(id) ?? null; },
    createElement(tagName) { return makeElement(tagName); },
  };
  const context: any = {
    URLSearchParams,
    Intl,
    Date,
    Number,
    Object,
    Array,
    JSON,
    Error,
    document: documentMock,
    window: windowMock,
    fetch: fetchImpl,
  };
  windowMock.window = windowMock;
  windowMock.document = documentMock;
  windowMock.fetch = fetchImpl;
  runInNewContext(extractInlineController(routeHtml), context);
  return { elements, domListeners, replaceCalls };
}

async function load(harness) {
  const listener = harness.domListeners.get('DOMContentLoaded');
  assert.equal(typeof listener, 'function');
  listener();
  await new Promise((resolve) => setTimeout(resolve, 0));
}

async function click(element) {
  const listener = element.listeners.get('click');
  assert.equal(typeof listener, 'function');
  listener({ preventDefault() {} });
  await new Promise((resolve) => setTimeout(resolve, 0));
}

function visible(element) {
  return element.hidden === false;
}

const pendingSession = Object.freeze({
  state: 'pending',
  expiresAt: '2026-07-18T16:00:00.000Z',
  node: {
    id: '35cd495c-8043-4aa8-9cc0-5e5469b4fb70',
    displayName: 'Pending Greenpiller',
    placeName: 'Oakland',
    city: 'Oakland',
    region: 'California',
    country: 'United States',
    lat: 37.8044,
    long: -122.2712,
    themes: ['public', 'events'],
    publicNote: 'Growing a local network.',
    createdAt: '2026-07-11T16:00:00.000Z',
  },
});

test.before(async () => {
  routeHtml = await readFile(routeHtmlPath, 'utf8');
});

test('moderation page clears the fragment before resources and has no credential persistence', () => {
  const referrerIndex = routeHtml.indexOf('<meta name="referrer" content="no-referrer">');
  const scriptIndex = routeHtml.indexOf('<script>');
  assert.ok(referrerIndex > -1 && scriptIndex > -1 && referrerIndex < scriptIndex);
  assert.match(routeHtml, /window\.location\.hash/);
  assert.match(routeHtml, /window\.history\.replaceState/);
  assert.equal(routeHtml.includes('localStorage'), false);
  assert.equal(routeHtml.includes('sessionStorage'), false);
  assert.equal(routeHtml.includes('?token='), false);
  assert.equal(routeHtml.includes('<a '), false);
  const resourceTags = ['iframe', 'img', 'link', 'script', 'source']
    .flatMap((tagName) => openingTags(routeHtml, tagName));
  assert.equal(resourceTags.some((tag) => tag.includes('://')), false);
  const normalizedHtml = routeHtml.toLowerCase();
  assert.equal(normalizedHtml.includes('url(http://'), false);
  assert.equal(normalizedHtml.includes('url(https://'), false);
  assert.equal(normalizedHtml.includes('@import "http'), false);
  assert.equal(normalizedHtml.includes("@import 'http"), false);
  assert.match(routeHtml, /Content-Security-Policy/);
  assert.match(routeHtml, /default-src 'none'/);
  assert.match(routeHtml, /connect-src https:\/\/agent\.greenpill\.network http:\/\/127\.0\.0\.1:3303/);
  assert.equal(routeHtml.includes('name="owner_email"'), false);
  assert.equal(routeHtml.includes('name="raw_note"'), false);
  assert.equal(routeHtml.includes('name="ip_address"'), false);
  assert.equal(routeHtml.includes('name="spam_signals"'), false);
  assert.match(routeHtml, /name="robots" content="noindex,nofollow,noarchive"/);
});

test('missing moderation token shows the invalid state without calling the agent', async () => {
  let calls = 0;
  const harness = createHarness({ hash: '', fetchImpl: async () => { calls += 1; } });
  await load(harness);
  assert.equal(calls, 0);
  assert.equal(visible(harness.elements.get('moderation-invalid')), true);
});

test('valid moderation session renders only the review-safe pending fields', async () => {
  const calls = [];
  const harness = createHarness({
    fetchImpl: async (url, init) => {
      calls.push({ url, init });
      return response(200, pendingSession);
    },
  });
  assert.equal(harness.replaceCalls.length, 1);
  assert.equal(harness.replaceCalls[0][2], '/map/moderate');
  await load(harness);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'http://127.0.0.1:3303/map-nodes/moderation-session');
  assert.equal(JSON.parse(calls[0].init.body).token, 'moderation-token');
  assert.equal(visible(harness.elements.get('moderation-pending')), true);
  assert.equal(harness.elements.get('moderation-name').textContent, 'Pending Greenpiller');
  assert.equal(harness.elements.get('moderation-coordinates').textContent, '37.8044, -122.2712');
  assert.deepEqual(
    harness.elements.get('moderation-themes').children.map((child) => child.textContent),
    ['public', 'events']
  );
});

test('approve confirmation posts one explicit decision and shows the completed state', async () => {
  const calls = [];
  const harness = createHarness({
    fetchImpl: async (url, init) => {
      calls.push({ url, init });
      if (url.endsWith('/moderation-session')) return response(200, pendingSession);
      return response(200, { state: 'resolved', decision: 'approved', reviewedAt: '2026-07-11T16:05:00.000Z' });
    },
  });
  await load(harness);
  await click(harness.elements.get('moderation-approve'));
  assert.equal(harness.elements.get('moderation-approve-dialog').open, true);
  await click(harness.elements.get('moderation-approve-confirm'));
  assert.equal(calls.length, 2);
  assert.equal(calls[1].url, `http://127.0.0.1:3303/map-nodes/${pendingSession.node.id}/moderation`);
  assert.deepEqual(JSON.parse(calls[1].init.body), { token: 'moderation-token', decision: 'approved' });
  assert.equal(visible(harness.elements.get('moderation-resolved')), true);
  assert.equal(harness.elements.get('moderation-resolved-title').textContent, 'Node approved');
});

test('decline submits an optional private note and invalid links reveal no node details', async () => {
  const calls = [];
  const harness = createHarness({
    fetchImpl: async (url, init) => {
      calls.push({ url, init });
      if (url.endsWith('/moderation-session')) return response(200, pendingSession);
      return response(200, { state: 'resolved', decision: 'rejected', reviewedAt: '2026-07-11T16:05:00.000Z' });
    },
  });
  await load(harness);
  await click(harness.elements.get('moderation-decline'));
  harness.elements.get('moderation-decline-note').value = 'Duplicate promotional submission.';
  await click(harness.elements.get('moderation-decline-confirm'));
  assert.deepEqual(JSON.parse(calls[1].init.body), {
    token: 'moderation-token',
    decision: 'rejected',
    note: 'Duplicate promotional submission.',
  });
  assert.equal(harness.elements.get('moderation-resolved-title').textContent, 'Node declined');

  const invalidHarness = createHarness({
    fetchImpl: async () => response(401, { error: { code: 'invalid_moderation_link' } }),
  });
  await load(invalidHarness);
  assert.equal(visible(invalidHarness.elements.get('moderation-invalid')), true);
  assert.equal(invalidHarness.elements.get('moderation-name').textContent, '');
});
