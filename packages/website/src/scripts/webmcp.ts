type WebMcpTool = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute: (input?: Record<string, unknown>) => unknown;
  annotations?: {
    readOnlyHint?: boolean;
  };
};

type WebMcpModelContext = {
  registerTool: (tool: WebMcpTool, options?: { signal?: AbortSignal }) => void;
};

const MAX_TEXT_LENGTH = 180;
const MAX_ITEMS = 12;

const cleanText = (value = '', maxLength = MAX_TEXT_LENGTH) => (
  value.replace(/\s+/g, ' ').trim().slice(0, maxLength)
);

const isVisible = (element: Element | null) => {
  if (!element) return false;
  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);
  return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden';
};

const visibleText = (selector: string, limit = MAX_ITEMS) => (
  Array.from(document.querySelectorAll(selector))
    .filter(isVisible)
    .map((element) => cleanText(element.textContent || ''))
    .filter(Boolean)
    .slice(0, limit)
);

const visibleLinks = (selector = 'main a[href], nav a[href]', limit = MAX_ITEMS) => (
  Array.from(document.querySelectorAll<HTMLAnchorElement>(selector))
    .filter(isVisible)
    .map((link) => ({
      label: cleanText(link.textContent || link.getAttribute('aria-label') || ''),
      href: link.href,
    }))
    .filter((link) => link.label && link.href)
    .slice(0, limit)
);

const currentPageKind = () => {
  const path = window.location.pathname;
  if (path === '/' || path === '') return 'home';
  if (path.startsWith('/chapters/')) return 'chapter';
  if (path.startsWith('/guilds/')) return 'guild';
  if (path.startsWith('/stories/')) return 'story';
  if (path.startsWith('/garden')) return 'garden';
  if (path.startsWith('/library')) return 'library';
  return 'public';
};

const describePage = (input: Record<string, unknown> = {}) => {
  const includeLinks = input.includeLinks !== false;
  const metaDescription = document
    .querySelector('meta[name="description"]')
    ?.getAttribute('content');

  return {
    url: window.location.href,
    path: window.location.pathname,
    kind: currentPageKind(),
    title: document.title,
    description: cleanText(metaDescription || ''),
    h1: cleanText(document.querySelector('h1')?.textContent || ''),
    headings: visibleText('main h1, main h2, main h3', 10),
    visibleControls: visibleText('main button, main summary, main label', 12),
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    links: includeLinks ? visibleLinks() : [],
  };
};

const readMapNode = (element: Element) => ({
  type: element.getAttribute('data-node-type') || '',
  name: cleanText(element.getAttribute('data-node-name') || ''),
  role: cleanText(element.getAttribute('data-node-role') || ''),
  place: cleanText(element.getAttribute('data-node-place') || ''),
  themes: cleanText(element.getAttribute('data-node-themes') || '').split(' ').filter(Boolean),
});

const summarizeMap = (input: Record<string, unknown> = {}) => {
  const root = document.querySelector('[data-home-map]');
  if (!root) {
    return {
      available: false,
      message: 'The Greenpill public map is not visible on this page.',
    };
  }

  const includeNodes = input.includeNodes !== false;
  const requestedMax = Number(input.maxNodes || 8);
  const maxNodes = Number.isFinite(requestedMax) ? Math.min(Math.max(requestedMax, 1), MAX_ITEMS) : 8;
  const scope = root.closest('.gp-home-map') || document;
  const selected = scope.querySelector<HTMLElement>('[data-home-map-selected]:not([hidden])');
  const nodeElements = Array.from(root.querySelectorAll('.gp-home-map-node-link:not(.is-filtered-out)'));
  const typeFilters = Array.from(scope.querySelectorAll<HTMLButtonElement>('[data-type-filter]'))
    .map((button) => ({
      type: button.dataset.typeFilter || '',
      active: button.getAttribute('aria-pressed') !== 'false',
    }));
  const themeFilters = Array.from(scope.querySelectorAll<HTMLButtonElement>('[data-theme-filter]'))
    .map((button) => ({
      theme: button.dataset.themeFilter || '',
      label: cleanText(button.textContent || ''),
      active: button.getAttribute('aria-pressed') !== 'false',
    }));

  return {
    available: true,
    visibleNodeCount: nodeElements.length,
    activeTypes: typeFilters.filter((item) => item.active).map((item) => item.type),
    activeThemes: themeFilters.filter((item) => item.active).map((item) => item.label || item.theme),
    selectedNode: selected
      ? {
          kicker: cleanText(selected.querySelector('[data-selected-kicker]')?.textContent || ''),
          name: cleanText(selected.querySelector('[data-selected-name]')?.textContent || ''),
          place: cleanText(selected.querySelector('[data-selected-place]')?.textContent || ''),
          bioregion: cleanText(selected.querySelector('[data-selected-bioregion]')?.textContent || ''),
          themes: visibleText('[data-selected-themes] span', 8),
          connections: cleanText(selected.querySelector('[data-selected-connections]')?.textContent || ''),
        }
      : null,
    nodes: includeNodes ? nodeElements.slice(0, maxNodes).map(readMapNode) : [],
  };
};

const registerGreenpillNetworkWebMcpTools = () => {
  const modelContext = (navigator as Navigator & { modelContext?: WebMcpModelContext }).modelContext;
  if (!modelContext || typeof modelContext.registerTool !== 'function') return;

  const controller = new AbortController();
  const options = { signal: controller.signal };

  modelContext.registerTool(
    {
      name: 'describe_greenpill_network_page',
      description:
        'Describe the current visible Greenpill Network public page, including public headings, visible controls, reduced-motion state, and optionally visible links.',
      inputSchema: {
        type: 'object',
        properties: {
          includeLinks: {
            type: 'boolean',
            description: 'Whether to include visible public links from the current page.',
          },
        },
      },
      execute: describePage,
      annotations: {
        readOnlyHint: true,
      },
    },
    options,
  );

  if (document.querySelector('[data-home-map]')) {
    modelContext.registerTool(
      {
        name: 'summarize_greenpill_network_map',
        description:
          'Summarize the currently visible public Greenpill Network map state, including active filters, selected node details, and visible public nodes.',
        inputSchema: {
          type: 'object',
          properties: {
            includeNodes: {
              type: 'boolean',
              description: 'Whether to include visible public map nodes in the output.',
            },
            maxNodes: {
              type: 'number',
              description: 'Maximum visible public map nodes to return, from 1 to 12.',
            },
          },
        },
        execute: summarizeMap,
        annotations: {
          readOnlyHint: true,
        },
      },
      options,
    );
  }

  window.addEventListener('pagehide', () => controller.abort(), { once: true });
};

registerGreenpillNetworkWebMcpTools();
