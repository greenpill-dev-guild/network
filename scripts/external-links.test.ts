import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  isExternalHref,
  markExternalLinks,
  NEW_TAB_HINT_ID,
  NEW_TAB_HINT_TEXT,
  opensNewContext,
  siteHostsFor,
  withBufferedHtml,
  withToken,
} from '../packages/website/src/lib/external-links.ts';

const SITE_HOSTS = siteHostsFor(new URL('https://greenpill.network'));
const HINT = `<span id="${NEW_TAB_HINT_ID}" hidden>${NEW_TAB_HINT_TEXT}</span>`;

const page = (body: string) => `<!DOCTYPE html><html lang="en"><head><title>t</title></head><body>${body}</body></html>`;

async function render(html: string, contentType = 'text/html; charset=utf-8'): Promise<string> {
  const response = new Response(html, { headers: { 'content-type': contentType } });
  return markExternalLinks(response, SITE_HOSTS).text();
}

describe('isExternalHref', () => {
  test('treats http(s) links to other hosts as external', () => {
    assert.equal(isExternalHref('https://farcaster.xyz/~/channel/greenpill', SITE_HOSTS), true);
    assert.equal(isExternalHref('http://example.org', SITE_HOSTS), true);
    assert.equal(isExternalHref('HTTPS://Example.ORG/Path', SITE_HOSTS), true);
    assert.equal(isExternalHref('//cdn.example.org/file.pdf', SITE_HOSTS), true);
    assert.equal(isExternalHref('  https://t.me/greenpill  ', SITE_HOSTS), true);
  });

  test('treats other greenpill.network subdomains as other sites', () => {
    assert.equal(isExternalHref('https://app.greenpill.network/login', SITE_HOSTS), true);
    assert.equal(isExternalHref('https://hub.greenpill.network', SITE_HOSTS), true);
  });

  test('keeps this site, relative links and non-web schemes internal', () => {
    for (const href of [
      'https://greenpill.network/library',
      'https://www.greenpill.network/',
      'HTTPS://GREENPILL.NETWORK/stories',
      '/garden#step-1',
      'library',
      '#podcast',
      '?page=2',
      'mailto:hello@example.org',
      'tel:+15555550100',
      'javascript:void(0)',
      'https://',
      '',
    ]) {
      assert.equal(isExternalHref(href, SITE_HOSTS), false, href);
    }
  });
});

describe('opensNewContext', () => {
  test('treats _blank and named targets as able to open a new tab', () => {
    for (const target of ['_blank', '_BLANK', ' _blank ', 'podcast-player', '_new']) {
      assert.equal(opensNewContext(target), true, target);
    }
  });

  test('treats empty targets and same-context keywords as the same tab', () => {
    for (const target of ['', '  ', '_self', '_parent', '_top', '_TOP', '_unfencedTop']) {
      assert.equal(opensNewContext(target), false, target);
    }
  });
});

describe('withToken', () => {
  test('adds a missing token and keeps existing ones in order', () => {
    assert.equal(withToken(null, 'noopener'), 'noopener');
    assert.equal(withToken('', 'noopener'), 'noopener');
    assert.equal(withToken('me  nofollow', 'noopener'), 'me nofollow noopener');
  });

  test('does not repeat a token that is already there', () => {
    assert.equal(withToken('noopener noreferrer', 'noopener'), 'noopener noreferrer');
    assert.equal(withToken('NoOpener', 'noopener', { ignoreCase: true }), 'NoOpener');
    assert.equal(withToken('Hint', 'hint'), 'Hint hint');
  });
});

describe('markExternalLinks', () => {
  test('opens an external link in a new tab with noopener and the hint', async () => {
    const html = await render(page('<a href="https://x.com/greenpillnet">X</a>'));
    assert.match(
      html,
      new RegExp(`<a href="https://x.com/greenpillnet" target="_blank" rel="noopener" aria-describedby="${NEW_TAB_HINT_ID}">X</a>`),
    );
  });

  test('adds the hidden hint once, at the end of body, however many links need it', async () => {
    const html = await render(
      page('<a href="https://a.example">A</a><p><a href="https://b.example">B</a></p><main>end</main>'),
    );
    assert.equal(html.split(`id="${NEW_TAB_HINT_ID}"`).length - 1, 1);
    assert.ok(html.endsWith(`<main>end</main>${HINT}</body></html>`), html);
  });

  test('leaves internal links and pages without new-tab links as they are', async () => {
    const body =
      '<a href="/library">Library</a><a href="https://greenpill.network/stories">Stories</a>' +
      '<a href="#main-content">Skip</a><a href="mailto:hello@example.org">Email</a><a>Placeholder</a>';
    assert.equal(await render(page(body)), page(body));
  });

  test('works alongside hand-set target and rel without repeating attributes', async () => {
    const html = await render(
      page('<a class="gp-home-eco-tile" href="https://gitcoin.co" target="_blank" rel="noopener noreferrer">Gitcoin</a>'),
    );
    assert.match(
      html,
      new RegExp(`<a class="gp-home-eco-tile" href="https://gitcoin.co" target="_blank" rel="noopener noreferrer" aria-describedby="${NEW_TAB_HINT_ID}">`),
    );
    assert.equal(html.match(/target=/g)?.length, 1);
    assert.equal(html.match(/rel=/g)?.length, 1);
  });

  test('keeps an author-set target, so a link can stay in the same tab', async () => {
    const body = '<a href="https://calendar.example/book" target="_self">Book</a>';
    assert.equal(await render(page(body)), page(body));
  });

  test('describes an internal link that a template opens in a new tab', async () => {
    const html = await render(page('<a href="/pdf/greenpill.pdf" target="_blank">Read the PDF</a>'));
    assert.match(
      html,
      new RegExp(`<a href="/pdf/greenpill.pdf" target="_blank" rel="noopener" aria-describedby="${NEW_TAB_HINT_ID}">`),
    );
  });

  test('describes a link with a named target, which can open a new tab', async () => {
    const html = await render(page('<a href="/library#podcast" target="podcast-player">Listen</a>'));
    assert.match(
      html,
      new RegExp(`<a href="/library#podcast" target="podcast-player" rel="noopener" aria-describedby="${NEW_TAB_HINT_ID}">`),
    );
  });

  test('leaves links that target an existing context alone', async () => {
    const body = '<a href="https://example.org" target="_top">Top</a><a href="https://example.org" target="_parent">Parent</a>';
    assert.equal(await render(page(body)), page(body));
  });

  test('treats an empty target as unset', async () => {
    const html = await render(page('<a href="https://luma.com/greenpill" target="">Events</a>'));
    assert.match(html, /<a href="https:\/\/luma.com\/greenpill" target="_blank" rel="noopener"/);
  });

  test('keeps an existing description and appends the hint id', async () => {
    const html = await render(page('<a href="https://example.org" aria-describedby="card-note">More</a>'));
    assert.match(html, new RegExp(`aria-describedby="card-note ${NEW_TAB_HINT_ID}"`));
  });

  test('is idempotent: a second pass changes nothing', async () => {
    const once = await render(page('<a href="https://example.org" target="_blank" rel="noopener">More</a>'));
    assert.equal(await render(once), once);
  });

  test('ignores link markup inside scripts', async () => {
    const body = '<script>const card = \'<a href="https://example.org">x</a>\';</script><a href="/garden">Garden</a>';
    assert.equal(await render(page(body)), page(body));
  });

  test('passes non-HTML responses through untouched', async () => {
    const json = '{"href":"<a href=\\"https://example.org\\">x</a>"}';
    assert.equal(await render(json, 'application/json'), json);
  });
});

describe('withBufferedHtml', () => {
  // Astro 7's dev server streams pages, and Bun's HTMLRewriter cannot pipe a
  // streamed body, so the middleware buffers the page before the link rule.
  const streamed = (body: string, contentType: string) =>
    new Response(
      new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(body));
          controller.close();
        },
      }),
      { status: 404, statusText: 'Not Found', headers: { 'content-type': contentType, 'x-page': 'kept' } },
    );

  test('lets the link rule rewrite a streamed page, keeping status and headers', async () => {
    const buffered = await withBufferedHtml(streamed(page('<a href="https://x.com/greenpillnet">X</a>'), 'text/html'));
    assert.equal(buffered.status, 404);
    assert.equal(buffered.statusText, 'Not Found');
    assert.equal(buffered.headers.get('x-page'), 'kept');
    const html = await markExternalLinks(buffered, SITE_HOSTS).text();
    assert.match(html, /<a href="https:\/\/x\.com\/greenpillnet" target="_blank" rel="noopener"/);
    assert.ok(html.includes(HINT), html);
  });

  test('returns other responses as they are, without reading them', async () => {
    const json = streamed('{"ok":true}', 'application/json');
    assert.equal(await withBufferedHtml(json), json);
    assert.equal(json.bodyUsed, false);
  });
});
