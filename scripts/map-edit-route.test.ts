import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { runInNewContext } from 'node:vm';

const rootDir = resolve(new URL('..', import.meta.url).pathname);
const routeHtmlPath = join(rootDir, 'packages/website/dist/map/edit/index.html');
let routeHtml = '';

function makeElement(id): any {
  return {
    id,
    hidden: id === 'map-edit-form' || id === 'map-edit-invalid' || id === 'map-edit-success' || id === 'map-edit-failure',
    textContent: '',
    disabled: false,
    value: '',
    checked: false,
    children: [],
    listeners: new Map(),
    addEventListener(type, listener) {
      this.listeners.set(type, listener);
    },
    append(child) {
      this.children.push(child);
    },
  };
}

async function readRouteHtml() {
  try {
    return await readFile(routeHtmlPath, 'utf8');
  } catch (error) {
    throw new Error(`Build the website before running map edit route tests: ${routeHtmlPath}`, { cause: error });
  }
}

function extractInlineController(html) {
  const match = html.match(/<script>([\s\S]*?)<\/script>/);
  assert.ok(match?.[1], 'expected the built map edit route to include an inline controller script');
  return match[1];
}

function createHarness({
  search = '?token=review-token',
  hostname = '127.0.0.1',
  fetchImpl,
}: {
  search?: string;
  hostname?: string;
  fetchImpl: (url: string, init: Record<string, any>) => Promise<{ ok: boolean; json: () => Promise<any> }>;
}) {
  const script = extractInlineController(routeHtml);
  const replaceCalls = [];
  const domListeners = new Map();
  const inputs = new Map([
    ['display_name', makeElement('display_name')],
    ['place_name', makeElement('place_name')],
    ['city', makeElement('city')],
    ['region', makeElement('region')],
    ['country', makeElement('country')],
    ['latitude', makeElement('latitude')],
    ['longitude', makeElement('longitude')],
    ['public_note', makeElement('public_note')],
  ]);
  const themeInputs = ['trees', 'food', 'ai'].map((id) => ({
    type: 'checkbox',
    name: 'themes',
    value: id,
    checked: false,
  }));
  const form: any = makeElement('map-edit-form');
  form.elements = {
    namedItem(name) {
      return inputs.get(name) ?? null;
    },
  };
  form.querySelectorAll = (selector) => (
    selector === 'input[name="themes"][type="checkbox"]' ? themeInputs : []
  );
  const elements = new Map([
    ['map-edit-loading', makeElement('map-edit-loading')],
    ['map-edit-invalid', makeElement('map-edit-invalid')],
    ['map-edit-success', makeElement('map-edit-success')],
    ['map-edit-failure', makeElement('map-edit-failure')],
    ['map-edit-form', form],
    ['map-edit-submit', makeElement('map-edit-submit')],
    ['map-edit-extra-themes', makeElement('map-edit-extra-themes')],
  ]);

  class FakeFormData {
    get(name) {
      if (name === 'themes') {
        return themeInputs.find((input) => input.checked)?.value ?? null;
      }
      return inputs.get(name)?.value ?? '';
    }

    getAll(name) {
      if (name !== 'themes') return [];
      const extraThemeValues = (elements.get('map-edit-extra-themes')?.children ?? [])
        .filter((child) => child.name === 'themes')
        .map((child) => child.value);
      return themeInputs
        .filter((input) => input.checked)
        .map((input) => input.value)
        .concat(extraThemeValues);
    }
  }

  const windowMock: any = {
    location: {
      search,
      pathname: '/map/edit',
      hash: '#review',
      hostname,
    },
    history: {
      state: { test: true },
      replaceState(...args) {
        replaceCalls.push(args);
      },
    },
    addEventListener(type, listener) {
      domListeners.set(type, listener);
    },
  };
  const context: any = {
    URLSearchParams,
    FormData: FakeFormData,
    Set,
    Array,
    Number,
    String,
    Error,
    JSON,
    document: {
      title: 'Map edit route test',
      getElementById(id) {
        return elements.get(id) ?? null;
      },
      createElement(tagName) {
        return makeElement(tagName);
      },
    },
    window: windowMock,
    fetch: fetchImpl,
  };
  context.window.window = context.window;
  context.window.document = context.document;
  context.window.fetch = fetchImpl;

  runInNewContext(script, context);

  return {
    replaceCalls,
    domListeners,
    elements,
    inputs,
    themeInputs,
    form,
  };
}

async function runDomLoaded(harness) {
  const listener = harness.domListeners.get('DOMContentLoaded');
  assert.equal(typeof listener, 'function', 'expected DOMContentLoaded listener to be registered');
  await listener();
  await new Promise((resolve) => setTimeout(resolve, 0));
}

function visible(element) {
  return element.hidden === false;
}

function routeFetchResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    async json() {
      return body;
    },
  };
}

const editableNode = Object.freeze({
  id: '11111111-1111-4111-8111-111111111111',
  display_name: 'Reviewer Node',
  place_name: 'Review Place',
  city: 'Oakland',
  region: 'California',
  country: 'United States',
  latitude: 37.8,
  longitude: -122.2,
  themes: ['trees', 'ai', 'unknown-theme'],
  public_note: 'Public only.',
});

test.before(async () => {
  routeHtml = await readRouteHtml();
});

test('built map edit route clears tokens before resource links and avoids token persistence surfaces', () => {
  const html = routeHtml;
  const referrerIndex = html.indexOf('<meta name="referrer" content="no-referrer">');
  const scriptIndex = html.indexOf('<script>');
  const stylesheetIndex = html.indexOf('<link rel="stylesheet"');

  assert.ok(referrerIndex > -1, 'expected no-referrer policy before resource links');
  assert.ok(scriptIndex > -1, 'expected an inline cleanup/controller script');
  assert.ok(stylesheetIndex > -1, 'expected Astro stylesheet link in built output');
  assert.ok(referrerIndex < stylesheetIndex, 'no-referrer policy must apply before stylesheet/resource links');
  assert.ok(scriptIndex < stylesheetIndex, 'token cleanup script must run before stylesheet/resource links');
  assert.equal(html.includes('localStorage'), false);
  assert.equal(html.includes('sessionStorage'), false);
  assert.equal(html.includes('dataset'), false);
  assert.equal(html.includes('console.'), false);
  assert.equal(html.includes('navigator.sendBeacon'), false);
  assert.equal(html.includes('<a '), false);
});

test('built map edit route defines the H1 type token it relies on', () => {
  // The standalone page carries its own inline tokens; a missing --gp-h1-size
  // previously rendered the panel H1 at the tiny UA default size.
  assert.match(routeHtml, /--gp-h1-size:\s*clamp\(/);
  assert.match(routeHtml, /font-size:\s*var\(--gp-h1-size\)/);
});

test('missing token shows invalid-link state without calling the agent', async () => {
  const fetches = [];
  const harness = createHarness({
    search: '',
    fetchImpl: async (url, init) => {
      fetches.push({ url, init });
      throw new Error('fetch should not run without a token');
    },
  });

  await runDomLoaded(harness);

  assert.equal(harness.replaceCalls.length, 0);
  assert.equal(fetches.length, 0);
  assert.equal(visible(harness.elements.get('map-edit-invalid')), true);
  assert.equal(harness.elements.get('map-edit-form').hidden, true);
});

test('invalid edit-session token clears the URL and shows only invalid-link copy', async () => {
  const fetches = [];
  const harness = createHarness({
    search: '?token=bad-token&keep=1',
    fetchImpl: async (url, init) => {
      fetches.push({ url, init });
      return routeFetchResponse(400, { error: { code: 'invalid_edit_link' } });
    },
  });

  assert.equal(harness.replaceCalls[0][2], '/map/edit?keep=1#review');
  await runDomLoaded(harness);

  assert.equal(fetches.length, 1);
  assert.equal(fetches[0].url, 'http://127.0.0.1:3303/map-nodes/edit-session');
  assert.deepEqual(JSON.parse(fetches[0].init.body), { token: 'bad-token' });
  assert.equal(visible(harness.elements.get('map-edit-invalid')), true);
  assert.equal(harness.elements.get('map-edit-failure').hidden, true);
});

test('edit-session service failures show generic failure copy instead of invalid-link copy', async () => {
  const harness = createHarness({
    fetchImpl: async () => routeFetchResponse(503, { error: { code: 'database_not_configured' } }),
  });

  await runDomLoaded(harness);

  assert.equal(harness.elements.get('map-edit-invalid').hidden, true);
  assert.equal(visible(harness.elements.get('map-edit-failure')), true);
  assert.match(
    harness.elements.get('map-edit-failure').textContent,
    /could not check this edit link/i
  );
});

test('edit-session network failures show generic failure copy instead of invalid-link copy', async () => {
  const harness = createHarness({
    fetchImpl: async () => {
      throw new Error('network unavailable');
    },
  });

  await runDomLoaded(harness);

  assert.equal(harness.elements.get('map-edit-invalid').hidden, true);
  assert.equal(visible(harness.elements.get('map-edit-failure')), true);
});

test('valid edit-session renders editable public fields and preserves unknown themes', async () => {
  const harness = createHarness({
    fetchImpl: async () => routeFetchResponse(200, { node: editableNode }),
  });

  await runDomLoaded(harness);

  assert.equal(visible(harness.elements.get('map-edit-form')), true);
  assert.equal(harness.inputs.get('display_name').value, editableNode.display_name);
  assert.equal(harness.inputs.get('place_name').value, editableNode.place_name);
  assert.equal(harness.inputs.get('latitude').value, editableNode.latitude);
  assert.equal(harness.inputs.get('longitude').value, editableNode.longitude);
  assert.equal(harness.themeInputs.find((input) => input.value === 'trees').checked, true);
  assert.equal(harness.themeInputs.find((input) => input.value === 'ai').checked, true);
  assert.equal(
    harness.elements.get('map-edit-extra-themes').children.some((child) => child.value === 'unknown-theme'),
    true
  );
});

test('unchanged submit is blocked before update-request token consumption', async () => {
  const fetches = [];
  const harness = createHarness({
    fetchImpl: async (url, init) => {
      fetches.push({ url, init });
      return routeFetchResponse(200, { node: editableNode });
    },
  });

  await runDomLoaded(harness);
  await harness.form.listeners.get('submit')({ preventDefault() {} });
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.equal(fetches.length, 1);
  assert.equal(fetches[0].url.endsWith('/map-nodes/edit-session'), true);
  assert.match(harness.elements.get('map-edit-failure').textContent, /at least one public-field change/i);
  assert.equal(harness.elements.get('map-edit-success').hidden, true);
});

test('changed submit posts only editable public fields plus token to update-requests', async () => {
  const fetches = [];
  const harness = createHarness({
    fetchImpl: async (url, init) => {
      fetches.push({ url, init });
      if (url.endsWith('/map-nodes/edit-session')) {
        return routeFetchResponse(200, { node: editableNode });
      }
      return routeFetchResponse(201, { updateRequest: { id: 'request-1', status: 'pending' } });
    },
  });

  await runDomLoaded(harness);
  harness.inputs.get('public_note').value = 'Updated public note.';
  await harness.form.listeners.get('submit')({ preventDefault() {} });
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.equal(fetches.length, 2);
  assert.equal(
    fetches[1].url,
    'http://127.0.0.1:3303/map-nodes/11111111-1111-4111-8111-111111111111/update-requests'
  );
  const body = JSON.parse(fetches[1].init.body);
  assert.deepEqual(Object.keys(body).sort(), [
    'city',
    'country',
    'display_name',
    'latitude',
    'longitude',
    'place_name',
    'public_note',
    'region',
    'themes',
    'token',
  ]);
  assert.equal(body.token, 'review-token');
  assert.equal(body.public_note, 'Updated public note.');
  assert.equal(Object.hasOwn(body, 'role'), false);
  assert.equal(Object.hasOwn(body, 'type'), false);
  assert.equal(Object.hasOwn(body, 'email'), false);
  assert.equal(visible(harness.elements.get('map-edit-success')), true);
  assert.equal(harness.elements.get('map-edit-form').hidden, true);
});

test('production hostname uses the production agent endpoint', async () => {
  const fetches = [];
  const harness = createHarness({
    hostname: 'greenpill.network',
    fetchImpl: async (url, init) => {
      fetches.push({ url, init });
      return routeFetchResponse(400, { error: { code: 'invalid_edit_link' } });
    },
  });

  await runDomLoaded(harness);

  assert.equal(fetches[0].url, 'https://agent.greenpill.network/map-nodes/edit-session');
  assert.equal(fetches[0].url.includes('review-token'), false);
});
