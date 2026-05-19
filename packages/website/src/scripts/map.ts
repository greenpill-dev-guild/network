import {
  loadLocalPendingNodes,
  PENDING_NODE_STORAGE_KEY,
  PENDING_NODE_UPDATED_EVENT,
  removeLocalPendingNode,
  saveLocalPendingNode,
} from '@greenpill-network/shared/map-nodes';

type IntakeMode = 'moderated' | 'live';
type NodeType = 'chapter' | 'steward' | 'member' | 'project' | 'place';

interface Location {
  id?: string;
  slug?: string;
  name: string;
  place?: string;
  city?: string;
  region?: string;
  country?: string;
  lat: number;
  long: number;
  link?: string;
  href?: string;
  kind?: string;
  type?: string;
  role?: string;
  status?: string;
  source?: string;
  themes?: string[];
  primaryTheme?: string;
  publicNote?: string;
}

interface PublicMapTheme {
  id: string;
  label: string;
  color: string;
}

interface PublicMapEdge {
  id: string;
  from: string;
  to: string;
  theme?: string;
  weight?: number;
}

interface PublicMapState {
  intakeMode?: IntakeMode | string;
  themes?: PublicMapTheme[];
  nodes?: Location[];
  edges?: PublicMapEdge[];
}

interface RenderNode extends Location {
  id: string;
  type: NodeType;
  displayName: string;
  displayPlace: string;
  link?: string;
  local?: boolean;
}

const width = 758;
const height = 400;
const LOCATION_RADIUS = 6;
const LIVE_POLL_INTERVAL_MS = 2000;
const LOCAL_MAP_THEMES: PublicMapTheme[] = [
  { id: 'trees', label: 'Trees & Biodiversity', color: '#7BC74D' },
  { id: 'food', label: 'Food & Farms', color: '#A8D24A' },
  { id: 'water', label: 'Water & Waste', color: '#3FB6A8' },
  { id: 'energy', label: 'Clean Energy', color: '#F5CB45' },
  { id: 'gov', label: 'Local Governance', color: '#E8B14B' },
  { id: 'events', label: 'Local Events', color: '#E89455' },
  { id: 'funding', label: 'Grants & Funding', color: '#E07856' },
  { id: 'currency', label: 'Community Currency', color: '#D86A4A' },
  { id: 'mutual', label: 'Mutual Aid', color: '#D87B97' },
  { id: 'stories', label: 'Storytelling', color: '#E0A6B8' },
  { id: 'education', label: 'Education', color: '#F0DCA0' },
  { id: 'opensrc', label: 'Open Source', color: '#5CC2D9' },
  { id: 'desci', label: 'DeSci', color: '#7DAEE0' },
  { id: 'ai', label: 'AI & Automation', color: '#9B8FD9' },
  { id: 'impact', label: 'Impact Tracking', color: '#86E0B5' },
  { id: 'public', label: 'Public Goods', color: '#C9A4E0' },
];

const canvas = document.getElementById('canvas') as HTMLCanvasElement | null;

if (canvas) {
  const ctx = canvas.getContext('2d');
  const mapContainer = document.getElementById('map-container') as HTMLElement | null;
  const selectedCard = document.querySelector('.map-selected-card') as HTMLElement | null;
  const selectedName = document.querySelector('.map-selected-name') as HTMLElement | null;
  const selectedPlace = document.querySelector('.map-selected-place') as HTMLElement | null;
  const selectedThemes = document.querySelector('.map-selected-themes') as HTMLElement | null;
  const selectedAction = document.querySelector('.map-selected-action') as HTMLAnchorElement | null;
  const modePill = document.querySelector('.map-mode-pill') as HTMLElement | null;
  const modeCopy = document.querySelector('.map-mode-copy') as HTMLElement | null;
  const formModeCopy = document.querySelector('.map-form-mode-copy') as HTMLElement | null;
  const formStatus = document.querySelector('.map-form-status') as HTMLElement | null;
  const mapNodeForm = document.getElementById('map-node-form') as HTMLFormElement | null;

  if (ctx) {
    let publicNodes: RenderNode[] = [];
    let renderNodes: RenderNode[] = [];
    let publicEdges: PublicMapEdge[] = [];
    let publicThemes: PublicMapTheme[] = LOCAL_MAP_THEMES;
    let intakeMode: IntakeMode = 'moderated';
    let mapLoaded = false;
    let locationsLoaded = false;
    let mapIsVisible = true;
    let scale = 1;
    let pollTimer: number | undefined;

    const img = new Image();

    const isLocalHost = ['localhost', '127.0.0.1', '0.0.0.0'].includes(window.location.hostname);
    const agentBaseUrl = isLocalHost ? 'http://127.0.0.1:8787' : 'https://agent.greenpill.network';
    const themeById = () => new Map(publicThemes.map((theme) => [theme.id, theme]));

    const updateScale = () => {
      const elem = canvas.getBoundingClientRect();
      const newWidth = Math.abs(elem.right - elem.left);
      scale = newWidth ? width / newWidth : 1;
    };

    updateScale();
    window.addEventListener('load', updateScale);
    window.addEventListener('resize', () => {
      updateScale();
      drawMap();
    });

    const normalizeIntakeMode = (mode: string | undefined): IntakeMode => (
      mode === 'live' ? 'live' : 'moderated'
    );

    const stableNodeId = (node: Location, fallbackPrefix = 'node') => {
      if (node.id) {
        if (node.source === 'approved-submission' && !node.id.startsWith('submission:')) {
          return `submission:${node.id}`;
        }
        return node.id;
      }
      const idPart = (node.slug || node.name || fallbackPrefix)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') || fallbackPrefix;
      return `${fallbackPrefix}:${idPart}`;
    };

    const normalizeNodeType = (node: Location): NodeType => {
      const raw = `${node.type || node.kind || node.role || ''}`.toLowerCase();
      if (raw.includes('chapter')) return 'chapter';
      if (raw.includes('steward') || raw.includes('organizer') || raw.includes('coordinator')) return 'steward';
      if (raw.includes('project') || raw.includes('guild')) return 'project';
      if (raw.includes('place') || raw.includes('space')) return 'place';
      return 'member';
    };

    const normalizeRenderNode = (node: Location, fallbackPrefix = 'node'): RenderNode | null => {
      const lat = Number(node.lat);
      const long = Number(node.long);
      if (!Number.isFinite(lat) || !Number.isFinite(long) || !node.name?.trim()) return null;
      const displayPlace = node.place || node.city || [node.region, node.country].filter(Boolean).join(', ');

      return {
        ...node,
        id: stableNodeId(node, fallbackPrefix),
        type: normalizeNodeType(node),
        displayName: node.name,
        displayPlace: displayPlace || 'Greenpill Network',
        lat,
        long,
        link: node.href || node.link,
        themes: Array.isArray(node.themes) ? node.themes.filter(Boolean) : [],
      };
    };

    const getLocalPendingLocations = (): RenderNode[] => loadLocalPendingNodes(window.localStorage)
      .map((node) => normalizeRenderNode({
        ...node,
        name: node.name ? `${node.name} (pending)` : 'Your pending node',
        role: node.role || 'member',
        source: 'local-pending',
        status: 'pending',
      }, 'local'))
      .filter(Boolean) as RenderNode[];

    const setMapModeCopy = () => {
      const live = intakeMode === 'live';
      if (mapContainer) mapContainer.dataset.mapMode = intakeMode;
      if (modePill) modePill.textContent = live ? 'Live onboarding map' : 'Moderated map';
      if (modeCopy) {
        modeCopy.textContent = live
          ? 'Live mode is on: new nodes are approved by the workshop setting and refresh for everyone.'
          : 'Submitted nodes are steward-reviewed before they appear publicly.';
      }
      if (formModeCopy) {
        formModeCopy.textContent = live
          ? 'Live onboarding is on. Your node will appear publicly after submission.'
          : 'In moderated mode, your node appears locally while stewards review it.';
      }
    };

    const updateLocations = (nextPublicNodes: RenderNode[]) => {
      publicNodes = nextPublicNodes;
      const publicIds = new Set(publicNodes.map((node) => node.id));
      renderNodes = [
        ...publicNodes,
        ...getLocalPendingLocations().filter((node) => !publicIds.has(node.id)),
      ];
      locationsLoaded = true;
      setMapModeCopy();
      drawMap();
    };

    const getCoords = (latitude: number, longitude: number) => {
      const x = (width * (180 + longitude)) / 360 - 25;
      const y = (height * (90 - latitude)) / 180 + 45;
      return { x, y };
    };

    const drawBackground = () => {
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, '#07180f');
      gradient.addColorStop(0.48, '#0e2d1f');
      gradient.addColorStop(1, '#06120c');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      if (mapLoaded) {
        ctx.save();
        ctx.globalAlpha = 0.44;
        ctx.drawImage(img, 0, 0, width, height);
        ctx.restore();
      }

      ctx.save();
      ctx.strokeStyle = 'rgba(212, 245, 100, 0.08)';
      ctx.lineWidth = 1;
      for (let lng = -120; lng <= 120; lng += 60) {
        const start = getCoords(-72, lng);
        const end = getCoords(72, lng);
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
      }
      for (let lat = -45; lat <= 45; lat += 30) {
        const start = getCoords(lat, -178);
        const end = getCoords(lat, 178);
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
      }
      ctx.restore();
    };

    const drawConnection = (edge: PublicMapEdge, nodeById: Map<string, RenderNode>) => {
      const from = nodeById.get(edge.from);
      const to = nodeById.get(edge.to);
      if (!from || !to) return;

      const fromCoords = getCoords(from.lat, from.long);
      const toCoords = getCoords(to.lat, to.long);
      const theme = themeById().get(edge.theme || '');
      const weight = Math.max(1, Math.min(3, Number(edge.weight) || 1));
      const midX = (fromCoords.x + toCoords.x) / 2;
      const midY = (fromCoords.y + toCoords.y) / 2;
      const bend = Math.max(-34, Math.min(34, (toCoords.x - fromCoords.x) * 0.08));

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(fromCoords.x, fromCoords.y);
      ctx.quadraticCurveTo(midX, midY - bend, toCoords.x, toCoords.y);
      ctx.strokeStyle = theme?.color || 'rgba(212, 245, 100, 0.6)';
      ctx.globalAlpha = 0.24 + weight * 0.08;
      ctx.lineWidth = 0.85 + weight * 0.45;
      ctx.setLineDash([3, 8]);
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.restore();
    };

    const drawNode = (node: RenderNode) => {
      const { x, y } = getCoords(node.lat, node.long);
      const isPending = node.status === 'pending' || node.source === 'local-pending';
      const radius = node.type === 'chapter'
        ? LOCATION_RADIUS + 2
        : node.type === 'steward'
          ? LOCATION_RADIUS + 1
          : LOCATION_RADIUS;
      const color = node.type === 'chapter'
        ? '#123f2d'
        : node.type === 'steward'
          ? '#f0dca0'
          : node.type === 'project'
            ? '#60c7bc'
            : '#d4f564';

      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, radius + (isPending ? 2 : 0), 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.shadowColor = node.type === 'chapter' ? '#b8e835' : color;
      ctx.shadowBlur = node.type === 'chapter' ? 12 : 8;
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.lineWidth = node.type === 'chapter' ? 2.4 : 1.5;
      ctx.strokeStyle = node.type === 'chapter'
        ? '#b8e835'
        : node.type === 'steward'
          ? '#fff3be'
          : 'rgba(7, 24, 15, 0.92)';
      if (isPending) {
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = '#f0dca0';
      }
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    };

    const drawMap = () => {
      ctx.clearRect(0, 0, width, height);
      drawBackground();
      if (!locationsLoaded) return;

      const nodeById = new Map(renderNodes.map((node) => [node.id, node]));
      publicEdges.forEach((edge) => drawConnection(edge, nodeById));
      renderNodes
        .slice()
        .sort((a, b) => (a.type === 'chapter' ? 1 : 0) - (b.type === 'chapter' ? 1 : 0))
        .forEach(drawNode);
    };

    const getClickCoords = (event: MouseEvent | TouchEvent) => {
      const container = canvas.getBoundingClientRect();
      const point = 'clientX' in event ? event : event.touches[0] || event.changedTouches[0];
      return { x: point.clientX - container.left, y: point.clientY - container.top };
    };

    const findMapElement = (event: MouseEvent | TouchEvent) => {
      if (!locationsLoaded || !renderNodes.length || !scale) return undefined;
      const { x, y } = getClickCoords(event);
      return renderNodes.find((element) => {
        const coords = getCoords(element.lat, element.long);
        const xDiff = Math.abs(coords.x / scale - x);
        const yDiff = Math.abs(coords.y / scale - y);
        const hitRadius = Math.max((LOCATION_RADIUS + 6) / scale, 14);
        return xDiff <= hitRadius && yDiff <= hitRadius;
      });
    };

    const showSelectedNode = (node: RenderNode) => {
      if (!selectedCard || !selectedName || !selectedPlace || !selectedThemes || !selectedAction) return;
      selectedName.textContent = node.displayName;
      selectedPlace.textContent = node.displayPlace;
      selectedThemes.textContent = '';

      const themes = themeById();
      (node.themes || []).slice(0, 4).forEach((themeId) => {
        const chip = document.createElement('span');
        const theme = themes.get(themeId);
        chip.textContent = theme?.label || themeId;
        chip.style.setProperty('--theme-color', theme?.color || '#d4f564');
        selectedThemes.append(chip);
      });

      if (node.link && node.status !== 'pending') {
        selectedAction.href = node.link;
        selectedAction.classList.remove('hidden');
      } else {
        selectedAction.removeAttribute('href');
        selectedAction.classList.add('hidden');
      }

      selectedCard.classList.remove('hidden');
      window.requestAnimationFrame(() => {
        selectedCard.style.opacity = '1';
      });
    };

    const handleMapClick = (event: MouseEvent | TouchEvent) => {
      const element = findMapElement(event);
      if (element) showSelectedNode(element);
    };

    const mapStateToNodes = (state: PublicMapState): RenderNode[] => (state.nodes || [])
      .map((node) => normalizeRenderNode(node, node.type === 'chapter' ? 'chapter' : 'submission'))
      .filter(Boolean) as RenderNode[];

    const locationsToMapState = async (): Promise<PublicMapState> => {
      const response = await fetch('/locations.json', { cache: 'no-cache' });
      const locations = await response.json() as Location[];
      return {
        intakeMode: 'moderated',
        themes: LOCAL_MAP_THEMES,
        nodes: locations.map((location) => ({
          ...location,
          id: location.id || location.slug,
          type: 'chapter',
          href: location.href || location.link,
          source: 'chapter-content',
        })),
        edges: [],
      };
    };

    const fetchMapState = async (): Promise<PublicMapState> => {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 2500);
      try {
        const response = await fetch(`${agentBaseUrl}/map/state`, {
          cache: 'no-cache',
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`Map state request failed: ${response.status}`);
        return await response.json() as PublicMapState;
      } finally {
        window.clearTimeout(timeout);
      }
    };

    const clearLivePoll = () => {
      if (pollTimer) {
        window.clearTimeout(pollTimer);
        pollTimer = undefined;
      }
    };

    const scheduleLivePoll = () => {
      clearLivePoll();
      if (intakeMode !== 'live' || !mapIsVisible || document.visibilityState !== 'visible') return;
      pollTimer = window.setTimeout(() => {
        loadMapState({ silent: true }).catch(() => scheduleLivePoll());
      }, LIVE_POLL_INTERVAL_MS);
    };

    const applyMapState = (state: PublicMapState) => {
      intakeMode = normalizeIntakeMode(String(state.intakeMode || 'moderated'));
      publicThemes = Array.isArray(state.themes) && state.themes.length ? state.themes : LOCAL_MAP_THEMES;
      publicEdges = Array.isArray(state.edges) ? state.edges : [];
      updateLocations(mapStateToNodes(state));
      scheduleLivePoll();
    };

    const loadMapState = async ({ silent = false } = {}) => {
      try {
        const state = await fetchMapState();
        applyMapState(state);
      } catch (error) {
        if (!silent) {
          const fallbackState = await locationsToMapState();
          applyMapState(fallbackState);
        } else {
          scheduleLivePoll();
        }
      }
    };

    const setFormStatus = (message: string, tone: 'idle' | 'success' | 'error' = 'idle') => {
      if (!formStatus) return;
      formStatus.textContent = message;
      if (tone === 'idle') {
        formStatus.removeAttribute('data-tone');
      } else {
        formStatus.dataset.tone = tone;
      }
    };

    const getSelectedThemes = (formData: FormData) => formData
      .getAll('themes')
      .map((value) => String(value).trim())
      .filter(Boolean);

    const createLocalId = () => {
      if ('randomUUID' in crypto) return `local-${crypto.randomUUID()}`;
      return `local-${Date.now()}-${Math.round(Math.random() * 100000)}`;
    };

    const submitMapNode = async (event: SubmitEvent) => {
      event.preventDefault();
      if (!mapNodeForm) return;

      const submitButton = mapNodeForm.querySelector('button[type="submit"]') as HTMLButtonElement | null;
      const formData = new FormData(mapNodeForm);
      const name = String(formData.get('name') || '').trim();
      const place = String(formData.get('place') || '').trim();
      const lat = Number(formData.get('lat'));
      const long = Number(formData.get('long'));
      const themes = getSelectedThemes(formData);
      const publicNote = String(formData.get('publicNote') || '').trim();
      const email = String(formData.get('contact') || '').trim();

      if (!name || !place || !Number.isFinite(lat) || !Number.isFinite(long)) {
        setFormStatus('Add a name, place, latitude, and longitude before submitting.', 'error');
        return;
      }

      const localId = createLocalId();
      saveLocalPendingNode(window.localStorage, {
        id: localId,
        name,
        place,
        lat,
        long,
        role: 'member',
        themes,
        publicNote,
      });
      window.dispatchEvent(new Event(PENDING_NODE_UPDATED_EVENT));
      setFormStatus('Submitting your node...', 'idle');
      if (submitButton) submitButton.disabled = true;

      try {
        const response = await fetch(`${agentBaseUrl}/map-nodes`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            displayName: name,
            placeName: place,
            lat,
            long,
            role: 'member',
            themes,
            publicNote,
            email: email || undefined,
            contactConsent: Boolean(email),
          }),
        });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload?.error?.message || 'Map-node submission failed.');
        }

        const submittedNode = payload?.node || payload;
        if (submittedNode.status === 'approved') {
          removeLocalPendingNode(window.localStorage, localId);
          const approvedNode = normalizeRenderNode({
            ...submittedNode,
            id: `submission:${submittedNode.id}`,
            type: 'member',
            source: 'approved-submission',
          }, 'submission');
          if (approvedNode) {
            updateLocations([
              approvedNode,
              ...publicNodes.filter((node) => node.id !== approvedNode.id),
            ]);
            showSelectedNode(approvedNode);
          }
          setFormStatus('Live mode is on. Your node is approved and visible on the public map.', 'success');
        } else {
          setFormStatus('Saved locally and submitted for steward review.', 'success');
        }

        mapNodeForm.reset();
        window.dispatchEvent(new Event(PENDING_NODE_UPDATED_EVENT));
      } catch (error) {
        setFormStatus(
          error instanceof Error
            ? `Saved locally, but public submission failed: ${error.message}`
            : 'Saved locally, but public submission failed.',
          'error'
        );
      } finally {
        if (submitButton) submitButton.disabled = false;
      }
    };

    canvas.addEventListener('click', (event) => handleMapClick(event), false);
    canvas.addEventListener('touchstart', (event) => handleMapClick(event), false);
    canvas.addEventListener('mousemove', (event) => {
      canvas.style.cursor = findMapElement(event) ? 'pointer' : 'default';
    });

    mapNodeForm?.addEventListener('submit', submitMapNode);

    window.addEventListener('storage', (event) => {
      if (event.key === PENDING_NODE_STORAGE_KEY) {
        updateLocations(publicNodes);
      }
    });

    window.addEventListener(PENDING_NODE_UPDATED_EVENT, () => {
      updateLocations(publicNodes);
    });

    document.addEventListener('visibilitychange', scheduleLivePoll);

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        mapIsVisible = entries.some((entry) => entry.isIntersecting);
        scheduleLivePoll();
      }, { threshold: 0.1 });
      observer.observe(canvas);
    }

    img.addEventListener('load', () => {
      mapLoaded = true;
      drawMap();
    }, false);

    img.src = '/images/map.png';
    loadMapState().catch(() => {});
  }
}
