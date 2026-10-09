import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { createDirectusClient } from './directus-operational-content-setup.ts';

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

type FakeResponse = { status: number; body?: string };

function respondWith(responses: FakeResponse[]) {
  const calls: Array<{ url: string; method: string }> = [];
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), method: init?.method ?? 'GET' });
    const next = responses.shift();
    if (!next) throw new Error('unexpected request');
    return new Response(next.body ?? null, { status: next.status });
  }) as typeof fetch;
  return calls;
}

const underPressure: FakeResponse = {
  status: 503,
  body: JSON.stringify({ errors: [{ message: 'Service "api" is unavailable. Under pressure.' }] }),
};

const client = () => createDirectusClient({
  url: 'https://directus.example.test',
  token: 'test-token',
  busyRetryDelaysMs: [0, 0],
});

test('a request Directus turned away under pressure is sent again', async () => {
  const calls = respondWith([
    underPressure,
    underPressure,
    { status: 200, body: JSON.stringify({ data: { field: 'image_alt' } }) },
  ]);

  const directus = await client();
  const result = await directus.request('/fields/chapters/image_alt', { method: 'PATCH', body: { meta: {} } });

  assert.deepEqual(result, { data: { field: 'image_alt' } });
  assert.deepEqual(calls.map((call) => call.method), ['PATCH', 'PATCH', 'PATCH']);
});

test('a create turned away under pressure is sent again, because nothing was created', async () => {
  const calls = respondWith([underPressure, { status: 200, body: JSON.stringify({ data: { id: 'new-user' } }) }]);

  const directus = await client();
  const result = await directus.request('/users', { method: 'POST', body: { email: 'steward@example.test' } });

  assert.deepEqual(result, { data: { id: 'new-user' } });
  assert.equal(calls.length, 2);
});

test('the retries are bounded', async () => {
  const calls = respondWith([underPressure, underPressure, underPressure]);

  const directus = await client();
  await assert.rejects(
    directus.request('/fields/chapters/image_alt', { method: 'PATCH', body: { meta: {} } }),
    /PATCH \/fields\/chapters\/image_alt failed with 503/
  );
  assert.equal(calls.length, 3);
});

test('a create that failed for another reason is not repeated', async () => {
  // Directus may have started the work, so sending it again could create a duplicate.
  const calls = respondWith([
    { status: 503, body: JSON.stringify({ errors: [{ message: 'Service "files" is unavailable.' }] }) },
  ]);

  const directus = await client();
  await assert.rejects(
    directus.request('/users', { method: 'POST', body: { email: 'steward@example.test' } }),
    /POST \/users failed with 503/
  );
  assert.equal(calls.length, 1);
});

test('other failures are reported at once', async () => {
  const calls = respondWith([{ status: 403, body: JSON.stringify({ errors: [{ message: 'Forbidden' }] }) }]);

  const directus = await client();
  await assert.rejects(directus.request('/items/chapters/nigeria', { method: 'PATCH', body: {} }), / failed with 403:/);
  assert.equal(calls.length, 1);
});
