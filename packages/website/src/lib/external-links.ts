/**
 * The site-wide rule for links (November 2026 QA, finding 7):
 *
 * - A link to another site opens in a new tab (`target="_blank"`).
 * - Every link that can open a new tab, whether this rule or a template set
 *   its target (`_blank` or a named target), gets `rel="noopener"` and the
 *   accessible description "Opens in a new tab" through `aria-describedby`.
 * - Links within greenpill.network stay in the same tab.
 * - A link whose template already sets `target` keeps it, so a page can keep
 *   an external link in the same tab with `target="_self"`.
 *
 * `src/middleware.ts` applies the rule to every HTML page Astro renders, so
 * templates, file-backed content and Directus snapshot copy follow it in
 * `astro build` and `astro dev` alike. Links that page scripts create in the
 * browser are out of its reach and set these attributes themselves.
 */

export const NEW_TAB_HINT_ID = 'gp-new-tab-hint';
export const NEW_TAB_HINT_TEXT = 'Opens in a new tab';

const NEW_TAB_HINT_HTML = `<span id="${NEW_TAB_HINT_ID}" hidden>${NEW_TAB_HINT_TEXT}</span>`;

/** Hosts that count as this site: each given origin's host and its `www.` twin. */
export function siteHostsFor(...origins: Array<URL | undefined>): Set<string> {
  const hosts = new Set<string>();
  for (const origin of origins) {
    if (!origin) continue;
    const host = origin.host.toLowerCase();
    const bare = host.replace(/^www\./, '');
    hosts.add(bare);
    hosts.add(`www.${bare}`);
  }
  return hosts;
}

/**
 * True for an absolute or protocol-relative http(s) URL on another host.
 * Relative paths, fragments, `mailto:`, `tel:` and other schemes are not
 * external, and neither is anything that does not parse as a URL.
 */
export function isExternalHref(href: string, siteHosts: ReadonlySet<string>): boolean {
  const value = href.trim();
  let candidate: string;
  if (value.startsWith('//')) {
    candidate = `https:${value}`;
  } else if (/^https?:/i.test(value)) {
    candidate = value;
  } else {
    return false;
  }

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return false;
  }
  return !siteHosts.has(url.host.toLowerCase());
}

/** Adds `token` to a space-separated attribute value unless it is already there. */
export function withToken(value: string | null, token: string, { ignoreCase = false } = {}): string {
  const tokens = (value ?? '').split(/\s+/).filter(Boolean);
  const present = tokens.some((existing) =>
    ignoreCase ? existing.toLowerCase() === token.toLowerCase() : existing === token,
  );
  return (present ? tokens : [...tokens, token]).join(' ');
}

// The slice of Bun's HTMLRewriter (lol-html) this rule uses. Declared here so
// the module does not need Bun's global type declarations to compile.
interface RewriterElement {
  getAttribute(name: string): string | null;
  setAttribute(name: string, value: string): unknown;
  onEndTag(handler: (endTag: { before(content: string, options?: { html?: boolean }): unknown }) => void): void;
}

interface Rewriter {
  on(selector: string, handlers: { element(element: RewriterElement): void }): Rewriter;
  transform(response: Response): Response;
}

type RewriterConstructor = new () => Rewriter;

function htmlRewriter(): Rewriter {
  const Constructor = (globalThis as { HTMLRewriter?: RewriterConstructor }).HTMLRewriter;
  if (!Constructor) {
    throw new Error(
      'The external link rule needs Bun\'s HTMLRewriter. Run Astro on Bun, as the repo scripts do (`bun run build:website`, `bun run dev:website`, `bun run astro ...`).',
    );
  }
  return new Constructor();
}

// Target keywords that keep the navigation in an existing browsing context.
// Any other non-empty target, `_blank` or a name, can open a new tab.
const SAME_CONTEXT_TARGETS = new Set(['_self', '_parent', '_top', '_unfencedtop']);

/** True when a link with this `target` can open a new tab or window. */
export function opensNewContext(target: string): boolean {
  const value = target.trim().toLowerCase();
  return value !== '' && !SAME_CONTEXT_TARGETS.has(value);
}

/** Applies the rule to one link; returns true when the link can open a new tab. */
function applyLinkRule(link: RewriterElement, siteHosts: ReadonlySet<string>): boolean {
  const authoredTarget = link.getAttribute('target')?.trim() ?? '';
  let target = authoredTarget;
  if (!authoredTarget && isExternalHref(link.getAttribute('href') ?? '', siteHosts)) {
    target = '_blank';
    link.setAttribute('target', target);
  }
  if (!opensNewContext(target)) return false;

  link.setAttribute('rel', withToken(link.getAttribute('rel'), 'noopener', { ignoreCase: true }));
  link.setAttribute('aria-describedby', withToken(link.getAttribute('aria-describedby'), NEW_TAB_HINT_ID));
  return true;
}

/**
 * Applies the link rule to an HTML response and adds the hidden description
 * element once, at the end of `<body>`, when any link opens in a new tab.
 * Other responses pass through untouched.
 */
export function markExternalLinks(response: Response, siteHosts: ReadonlySet<string>): Response {
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().includes('text/html')) return response;

  let opensNewTab = false;
  let hintPresent = false;
  return htmlRewriter()
    .on('a[href]', {
      element(link) {
        if (applyLinkRule(link, siteHosts)) opensNewTab = true;
      },
    })
    .on(`#${NEW_TAB_HINT_ID}`, {
      element() {
        hintPresent = true;
      },
    })
    .on('body', {
      element(body) {
        body.onEndTag((endTag) => {
          if (opensNewTab && !hintPresent) endTag.before(NEW_TAB_HINT_HTML, { html: true });
        });
      },
    })
    .transform(response);
}
