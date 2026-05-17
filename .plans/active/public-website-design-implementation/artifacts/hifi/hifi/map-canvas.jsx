/* hifi/map-canvas.jsx — Mycelial map renderer.
   - Renders the world dot landmass (or outlines), nodes, and mycelial threads
   - Hover/focus: threads bloom on the active node, everything else dims,
     a floating card appears with name/role/themes
   - Threads grow in on load (stroke-dashoffset animation)
   - New-node arrival animation
   - Subtle filter legend (themes + types)
   - viewBox 0 0 200 100 — equirectangular projection
   ----------------------------------------------------------------- */

/* ----- coord helpers ----- */
const mcLonToX = (lon) => (lon + 180) / 360 * 200;
const mcLatToY = (lat) => (90 - lat) / 180 * 100;
const mcXToLon = (x) => x / 200 * 360 - 180;
const mcYToLat = (y) => 90 - y / 100 * 180;

/* Visual style for nodes by type. Brand colors only — chapter=lime,
   steward=gold, member=off-white. Theme color belongs on threads. */
const MC_NODE_STYLE = {
  chapter: { fill: 'var(--gp-primary)',  size: 14, ring: 'var(--gp-green-900)', glow: 'rgba(184, 232, 53, 0.55)' },
  steward: { fill: 'var(--gp-secondary)', size: 9,  ring: null,                   glow: 'rgba(240, 220, 160, 0.45)' },
  member:  { fill: 'var(--gp-off-white)', size: 5,  ring: null,                   glow: 'rgba(250, 247, 238, 0.40)' },
};

/* Catmull-Rom organic path between two points with a seeded wobble. */
function mcMycelialPath(x1, y1, x2, y2, seed, segments, jitterAmp) {
  const rand = mdRand(seed);
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len < 0.01) return { d: `M ${x1} ${y1}`, len: 0 };
  const px = -dy / len, py = dx / len;
  const points = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    let bx = x1 + dx * t;
    let by = y1 + dy * t;
    const taper = Math.sin(t * Math.PI);
    const w = (rand() - 0.5) * len * jitterAmp * taper;
    bx += px * w; by += py * w;
    points.push([bx, by]);
  }
  let d = `M ${points[0][0].toFixed(2)} ${points[0][1].toFixed(2)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    const k = 0.2;
    const c1x = p1[0] + (p2[0] - p0[0]) * k;
    const c1y = p1[1] + (p2[1] - p0[1]) * k;
    const c2x = p2[0] - (p3[0] - p1[0]) * k;
    const c2y = p2[1] - (p3[1] - p1[1]) * k;
    d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)} ${c2x.toFixed(2)} ${c2y.toFixed(2)} ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`;
  }
  return { d, len };
}

/* Pre-compute edge paths once. */
function mcBuildEdgePaths(edges, nodeIndex) {
  return edges.map((e, i) => {
    const a = nodeIndex[e.from];
    const b = nodeIndex[e.to];
    if (!a || !b) return null;
    const x1 = mcLonToX(a.lng), y1 = mcLatToY(a.lat);
    const x2 = mcLonToX(b.lng), y2 = mcLatToY(b.lat);
    const len = Math.hypot(x2 - x1, y2 - y1);
    const segs = Math.max(4, Math.min(14, Math.round(len / 3)));
    const jitter = e.kind === 'mm' ? 0.10 : e.kind === 'ss' ? 0.14 : 0.20;
    const path = mcMycelialPath(x1, y1, x2, y2, i * 17 + 31, segs, jitter);
    return { ...e, ...path, idx: i };
  }).filter(Boolean);
}

/* ----- the main canvas component ----- */
const MapCanvas = ({
  network,
  worldStyle = 'dots',                // 'dots' | 'outlines'
  newNodeIds = [],                    // ids that just arrived (for entrance anim)
  visibleTypes = { chapter: true, steward: true, member: true },
  visibleThemes = null,               // null = all visible; otherwise Set of theme ids
  onNodeClick = null,
  initialGrow = true,                 // play stroke-dash grow on first mount
  compact = false,                    // tighten layout (used by Home hero)
  showLegend = true,
}) => {
  const [hovered, setHovered] = React.useState(null);   // node id
  const [pinned, setPinned] = React.useState(null);     // node id (clicked)
  const [grown, setGrown] = React.useState(!initialGrow);
  const wrapRef = React.useRef(null);
  const [wrapBox, setWrapBox] = React.useState({ w: 1000, h: 500 });

  const focusedId = pinned ?? hovered;

  // node lookup
  const nodeIndex = React.useMemo(() => {
    const idx = {};
    network.nodes.forEach(n => { idx[n.id] = n; });
    return idx;
  }, [network]);

  const edgePaths = React.useMemo(
    () => mcBuildEdgePaths(network.edges, nodeIndex),
    [network, nodeIndex]
  );

  // edges adjacent to focused node
  const adjacentEdges = React.useMemo(() => {
    if (!focusedId) return new Set();
    const out = new Set();
    edgePaths.forEach(e => {
      if (e.from === focusedId || e.to === focusedId) out.add(e.idx);
    });
    return out;
  }, [focusedId, edgePaths]);

  const adjacentNodes = React.useMemo(() => {
    if (!focusedId) return new Set();
    const out = new Set([focusedId]);
    edgePaths.forEach(e => {
      if (e.from === focusedId) out.add(e.to);
      if (e.to === focusedId) out.add(e.from);
    });
    return out;
  }, [focusedId, edgePaths]);

  // resize observer for HTML overlay positioning
  React.useEffect(() => {
    if (!wrapRef.current) return;
    // measure immediately so initial render doesn't lag a frame behind
    const r = wrapRef.current.getBoundingClientRect();
    if (r.width) setWrapBox({ w: r.width, h: r.height });
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setWrapBox({ w: e.contentRect.width, h: e.contentRect.height });
    });
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  // trigger grow-in once on mount
  React.useEffect(() => {
    if (!initialGrow) return;
    const t = setTimeout(() => setGrown(true), 50);
    return () => clearTimeout(t);
  }, [initialGrow]);

  // dismiss pinned on outside click / Esc
  React.useEffect(() => {
    if (!pinned) return;
    const onKey = (e) => { if (e.key === 'Escape') setPinned(null); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [pinned]);

  /* ----- render ----- */
  const focusedNode = focusedId ? nodeIndex[focusedId] : null;
  const isFocused = focusedId != null;

  // node visibility filter
  const isNodeVisible = (n) => {
    if (!visibleTypes[n.type]) return false;
    if (visibleThemes && !n.themes.some(t => visibleThemes.has(t))) return false;
    return true;
  };

  return (
    <div ref={wrapRef} className="mc-wrap" style={{
      position: 'relative',
      width: '100%',
      aspectRatio: compact ? '2 / 1' : '2 / 1.05',
      borderRadius: compact ? 'var(--gp-radius-lg)' : 0,
      overflow: 'hidden',
      background: 'radial-gradient(ellipse at center, rgba(20,68,52,0.65) 0%, rgba(11,46,35,0.95) 100%)',
      border: compact ? '1px solid var(--gp-border-soft)' : 'none',
    }}>
      {/* topographic wash */}
      <div aria-hidden="true" style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'url("hifi/assets/topo-bg.png")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        opacity: 0.16,
        mixBlendMode: 'overlay',
        pointerEvents: 'none',
      }} />

      <svg viewBox="0 0 200 100" preserveAspectRatio="xMidYMid meet"
           style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        {/* graticule (equator + a few latitude lines) */}
        <g stroke="var(--gp-green-600)" strokeWidth="0.04" opacity="0.35" strokeDasharray="1 1.4">
          {[20, 35, 50, 65, 80].map(y => (
            <line key={`g-${y}`} x1="0" x2="200" y1={y} y2={y} />
          ))}
          {[40, 80, 120, 160].map(x => (
            <line key={`m-${x}`} x1={x} x2={x} y1="0" y2="100" />
          ))}
        </g>

        {/* world geography */}
        {worldStyle === 'outlines'
          ? mwRenderOutlines({ fill: 'var(--gp-green-800)', stroke: 'var(--gp-green-600)', strokeWidth: 0.15, opacity: 0.55 })
          : mwRenderDots(MW_DEFAULT_GRID, { color: 'var(--gp-green-500)', opacity: isFocused ? 0.30 : 0.50, r: 0.40 })
        }

        {/* edges — passive (rendered first, dimmed on focus) */}
        <g style={{ mixBlendMode: 'screen' }}>
          {edgePaths.map(e => {
            const a = nodeIndex[e.from], b = nodeIndex[e.to];
            if (!isNodeVisible(a) || !isNodeVisible(b)) return null;
            const active = adjacentEdges.has(e.idx);
            const dim = isFocused && !active;
            const t = MAP_THEME_BY_ID[e.theme];
            const stroke = t ? t.color : 'var(--gp-primary)';
            const width = e.kind === 'mm' ? 0.10 : e.kind === 'ss' ? 0.16 : 0.22;
            const opacity = dim ? 0.08 : active ? 0.95 : (e.kind === 'mm' ? 0.18 : e.kind === 'ss' ? 0.35 : 0.55);
            const grow = grown ? 0 : e.len;
            // staggered grow delay by index
            const growDelay = (e.idx * 35) % 1800;
            return (
              <path key={`e-${e.idx}`}
                    d={e.d}
                    fill="none"
                    stroke={active ? 'var(--gp-lime-400)' : stroke}
                    strokeWidth={active ? width * 1.6 : width}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={opacity}
                    style={{
                      strokeDasharray: e.len,
                      strokeDashoffset: grow,
                      transition: `stroke-dashoffset 1400ms cubic-bezier(0.22,1,0.36,1) ${growDelay}ms, opacity 240ms ease, stroke-width 240ms ease`,
                    }}
              />
            );
          })}
        </g>

        {/* nutrient blips travel along the focused node's edges */}
        {isFocused && grown && (
          <g>
            {edgePaths.filter(e => adjacentEdges.has(e.idx)).map(e => (
              <circle key={`blip-${e.idx}`} r="0.55" fill="var(--gp-lime-300)">
                <animateMotion dur="2.4s" repeatCount="indefinite" path={e.d} />
              </circle>
            ))}
          </g>
        )}

        {/* theme rings around focused node (subtle ripples) */}
        {focusedNode && grown && (
          <g style={{ pointerEvents: 'none' }}>
            <circle cx={mcLonToX(focusedNode.lng)} cy={mcLatToY(focusedNode.lat)}
                    r="2" fill="none"
                    stroke={MC_NODE_STYLE[focusedNode.type].fill}
                    strokeWidth="0.18" opacity="0.55">
              <animate attributeName="r" values="1.6;5.5;1.6" dur="3s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.55;0;0.55" dur="3s" repeatCount="indefinite" />
            </circle>
            <circle cx={mcLonToX(focusedNode.lng)} cy={mcLatToY(focusedNode.lat)}
                    r="3" fill="none"
                    stroke={MC_NODE_STYLE[focusedNode.type].fill}
                    strokeWidth="0.12" opacity="0.35">
              <animate attributeName="r" values="2.5;7;2.5" dur="3s" begin="0.8s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.35;0;0.35" dur="3s" begin="0.8s" repeatCount="indefinite" />
            </circle>
          </g>
        )}
      </svg>

      {/* HTML node layer (for nicer hover targets and labels) */}
      {network.nodes.map(n => {
        if (!isNodeVisible(n)) return null;
        const xPct = mcLonToX(n.lng) / 2;
        const yPct = mcLatToY(n.lat);
        const isFocusNode = focusedId === n.id;
        const isAdj = adjacentNodes.has(n.id);
        const dim = isFocused && !isAdj;
        const isNew = newNodeIds.includes(n.id);
        const isSelf = !!n.self;
        const sty = MC_NODE_STYLE[n.type];
        const base = sty.size;
        const size = isFocusNode ? base + 6 : (isSelf ? base + 2 : base);

        return (
          <div key={n.id}
               className={`mc-node mc-node-${n.type}${isNew ? ' mc-node-new' : ''}${isSelf ? ' mc-node-self' : ''}`}
               onMouseEnter={() => setHovered(n.id)}
               onMouseLeave={() => setHovered(null)}
               onClick={(e) => {
                 e.stopPropagation();
                 setPinned(pinned === n.id ? null : n.id);
                 onNodeClick && onNodeClick(n);
               }}
               style={{
                 position: 'absolute',
                 left: `${xPct}%`, top: `${yPct}%`,
                 transform: 'translate(-50%, -50%)',
                 width: size, height: size,
                 borderRadius: '50%',
                 background: sty.fill,
                 boxShadow: isFocusNode
                   ? `0 0 0 4px ${sty.glow}, 0 0 22px ${sty.glow}`
                   : isSelf
                     ? `0 0 0 5px rgba(184, 232, 53, 0.18), 0 0 0 9px rgba(184, 232, 53, 0.08), 0 0 22px rgba(184, 232, 53, 0.6)`
                     : `0 0 8px ${sty.glow}`,
                 border: isSelf
                   ? `2px solid var(--gp-primary)`
                   : sty.ring ? `2px solid ${sty.ring}` : 'none',
                 opacity: dim ? 0.18 : (n.type === 'member' && !isSelf ? 0.85 : 1),
                 cursor: 'pointer',
                 zIndex: isSelf ? 7 : n.type === 'chapter' ? 5 : n.type === 'steward' ? 4 : 3,
                 transition: 'all 240ms cubic-bezier(0.22,1,0.36,1)',
               }}
               aria-label={`${isSelf ? 'You · ' : ''}${n.type}: ${n.name}`}
          >
            {/* self node: persistent pulsing ring so user can find their own pin */}
            {isSelf && (
              <span aria-hidden="true" style={{
                position: 'absolute',
                inset: -8,
                borderRadius: '50%',
                border: '1.5px solid var(--gp-primary)',
                opacity: 0.6,
                pointerEvents: 'none',
                animation: 'mcSelfHalo 2.6s ease-in-out infinite',
              }} />
            )}
          </div>
        );
      })}

      {/* Floating focus card */}
      {focusedNode && (
        <MapFocusCard
          node={focusedNode}
          xPct={mcLonToX(focusedNode.lng) / 2}
          yPct={mcLatToY(focusedNode.lat)}
          wrapW={wrapBox.w}
          wrapH={wrapBox.h}
          adjacency={adjacentNodes}
          allNodes={nodeIndex}
          pinned={pinned === focusedNode.id}
          onClose={() => { setPinned(null); setHovered(null); }}
        />
      )}

      {/* Legend (themes + types) */}
      {showLegend && (
        <MapLegend />
      )}

      {/* Stats overlay inside the map (top-right). At narrow widths the
          overlay shrinks: drops labels, reduces gap + padding so it fits
          inside the map's right edge. */}
      {showLegend && (() => {
        const narrow = wrapBox.w < 520;
        return (
        <div className="mc-stats" style={{
          position: 'absolute',
          top: narrow ? 8 : 16, right: narrow ? 8 : 16,
          display: 'flex', gap: narrow ? 10 : 18,
          padding: narrow ? '6px 10px' : '10px 16px',
          background: 'rgba(11, 38, 28, 0.78)',
          border: '1px solid var(--gp-border-soft)',
          borderRadius: 'var(--gp-radius-pill)',
          backdropFilter: 'blur(6px)',
          zIndex: 12,
          fontFamily: 'var(--gp-font-body)',
          maxWidth: `calc(100% - ${narrow ? 16 : 32}px)`,
        }}>
          {[
            ['chapter', network.chapters.length, 'chapters', 'var(--gp-primary)',  'var(--gp-green-900)'],
            ['steward', network.stewards.length, 'stewards', 'var(--gp-secondary)', null],
            ['member',  network.members.length,  'members',  'var(--gp-off-white)', null],
          ].map(([id, n, lbl, fill, ring]) => (
            <div key={id} style={{ display: 'flex', alignItems: 'center', gap: narrow ? 4 : 8, whiteSpace: 'nowrap' }}>
              <span style={{
                width: 8, height: 8, borderRadius: '50%',
                background: fill,
                border: ring ? `1.5px solid ${ring}` : 'none',
                flexShrink: 0,
              }} />
              <span style={{
                fontFamily: 'var(--gp-font-display)',
                fontSize: narrow ? 14 : 18, fontWeight: 500,
                color: 'var(--gp-secondary)',
                lineHeight: 1,
              }}>{n}</span>
              {!narrow && (
                <span style={{
                  fontFamily: 'var(--gp-font-mono)',
                  fontSize: 9, letterSpacing: '0.14em',
                  color: 'var(--gp-fg-dim)',
                  textTransform: 'uppercase',
                  fontWeight: 700,
                }}>{lbl}</span>
              )}
            </div>
          ))}
        </div>
        );
      })()}
    </div>
  );
};

/* ----- Floating focus card ----- */
const MapFocusCard = ({ node, xPct, yPct, wrapW, wrapH, adjacency, allNodes, pinned, onClose }) => {
  // Decide which side to place card (avoid clipping).
  const goRight = xPct < 60;
  const goBottom = yPct < 50;
  const offset = 22;

  const conns = Array.from(adjacency).filter(id => id !== node.id).map(id => allNodes[id]).filter(Boolean);
  const stewardConns = conns.filter(n => n.type === 'steward').length;
  const memberConns = conns.filter(n => n.type === 'member').length;
  const chapterConns = conns.filter(n => n.type === 'chapter').length;

  const themeChips = node.themes.map(tid => MAP_THEME_BY_ID[tid]).filter(Boolean);

  const roleLabel = node.type === 'chapter' ? 'Chapter'
                  : node.type === 'steward' ? 'Steward'
                  : 'Member';

  return (
    <div className="mc-focus-card" style={{
      position: 'absolute',
      left: `${xPct}%`,
      top: `${yPct}%`,
      transform: `translate(${goRight ? `${offset}px` : `calc(-100% - ${offset}px)`}, ${goBottom ? `${offset}px` : `calc(-100% - ${offset}px)`})`,
      background: 'rgba(15, 50, 38, 0.96)',
      backdropFilter: 'blur(8px)',
      border: '1px solid rgba(184, 232, 53, 0.28)',
      borderRadius: 'var(--gp-radius-md)',
      padding: '14px 16px',
      minWidth: 220,
      maxWidth: 280,
      color: 'var(--gp-fg)',
      fontFamily: 'var(--gp-font-body)',
      boxShadow: '0 18px 48px -12px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.02)',
      zIndex: 30,
      pointerEvents: pinned ? 'auto' : 'none',
    }}>
      <div style={{
        fontFamily: 'var(--gp-font-mono)',
        fontSize: 9,
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        color: MC_NODE_STYLE[node.type].fill,
        marginBottom: 6,
        fontWeight: 700,
      }}>
        {roleLabel}{node.type === 'steward' && allNodes[node.chapterId] ? ` · ${allNodes[node.chapterId].name}` : ''}
        {node.type === 'member' && node.city ? ` · ${node.city}` : ''}
      </div>
      <div style={{
        fontFamily: 'var(--gp-font-display)',
        fontSize: node.type === 'chapter' ? 22 : 18,
        fontWeight: 500,
        color: 'var(--gp-secondary)',
        letterSpacing: '-0.01em',
        lineHeight: 1.1,
        marginBottom: 10,
      }}>{node.name}</div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 12 }}>
        {themeChips.map(t => (
          <span key={t.id} style={{
            fontSize: 10,
            fontFamily: 'var(--gp-font-body)',
            fontWeight: 600,
            padding: '3px 8px',
            borderRadius: 'var(--gp-radius-pill)',
            color: t.color,
            background: `${t.color}1A`,
            border: `1px solid ${t.color}40`,
          }}>{t.label}</span>
        ))}
      </div>

      <div style={{
        display: 'flex', gap: 12,
        paddingTop: 10,
        borderTop: '1px solid rgba(184, 232, 53, 0.12)',
        fontSize: 11, color: 'var(--gp-fg-dim)',
      }}>
        {chapterConns > 0 && <span><b style={{ color: 'var(--gp-fg)' }}>{chapterConns}</b> chapter{chapterConns > 1 ? 's' : ''}</span>}
        {stewardConns > 0 && <span><b style={{ color: 'var(--gp-fg)' }}>{stewardConns}</b> steward{stewardConns > 1 ? 's' : ''}</span>}
        {memberConns > 0 && <span><b style={{ color: 'var(--gp-fg)' }}>{memberConns}</b> member{memberConns > 1 ? 's' : ''}</span>}
        {!chapterConns && !stewardConns && !memberConns && <span style={{ fontStyle: 'italic' }}>no connections yet</span>}
      </div>

      {node.social && (
        <a href={node.social.startsWith('http') ? node.social : `https://${node.social}`}
           target="_blank" rel="noopener noreferrer"
           style={{
             display: 'inline-flex', alignItems: 'center', gap: 6,
             marginTop: 10,
             fontFamily: 'var(--gp-font-body)',
             fontSize: 11,
             color: 'var(--gp-primary)',
             textDecoration: 'none',
             fontWeight: 600,
             borderTop: '1px solid rgba(184, 232, 53, 0.12)',
             paddingTop: 10,
             width: '100%',
             wordBreak: 'break-all',
           }}>
          ↗ {node.social.replace(/^https?:\/\//, '')}
        </a>
      )}

      {pinned && (
        <button onClick={onClose} style={{
          position: 'absolute', top: 8, right: 8,
          background: 'transparent',
          border: 'none',
          color: 'var(--gp-fg-dim)',
          cursor: 'pointer',
          width: 20, height: 20,
          padding: 0,
          fontSize: 16, lineHeight: 1,
        }}>×</button>
      )}
    </div>
  );
};

/* ----- Subtle filter legend ----- */
const MapLegend = () => {
  const [tab, setTab] = React.useState(null);  // 'theme' | 'type' | null
  const [activeThemes, setActiveThemes] = React.useState(null); // null = all
  const [activeTypes, setActiveTypes] = React.useState({ chapter: true, steward: true, member: true });

  const toggleTheme = (id) => {
    const next = new Set(activeThemes || MAP_THEMES.map(t => t.id));
    if (next.has(id)) next.delete(id); else next.add(id);
    setActiveThemes(next.size === MAP_THEMES.length ? null : next);
    // emit via custom event for the container to consume
    window.dispatchEvent(new CustomEvent('mc-filter', { detail: { themes: next, types: activeTypes } }));
  };
  const toggleType = (t) => {
    const next = { ...activeTypes, [t]: !activeTypes[t] };
    setActiveTypes(next);
    window.dispatchEvent(new CustomEvent('mc-filter', { detail: { themes: activeThemes, types: next } }));
  };

  return (
    <div className="mc-legend" style={{
      position: 'absolute',
      left: 16, bottom: 16,
      display: 'flex', flexDirection: 'column', gap: 8,
      zIndex: 12,
      maxWidth: 380,
      pointerEvents: 'auto',
    }}>
      {/* expanded content */}
      {tab === 'theme' && (
        <div style={{
          background: 'rgba(11, 38, 28, 0.92)',
          border: '1px solid var(--gp-border-soft)',
          borderRadius: 'var(--gp-radius-md)',
          padding: 12,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 4,
          backdropFilter: 'blur(6px)',
        }}>
          {MAP_THEMES.map(t => {
            const on = !activeThemes || activeThemes.has(t.id);
            return (
              <button key={t.id} onClick={() => toggleTheme(t.id)} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '4px 6px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                opacity: on ? 1 : 0.35,
                color: on ? t.color : 'var(--gp-fg-dim)',
                fontFamily: 'var(--gp-font-body)',
                fontSize: 11,
                fontWeight: 500,
                textAlign: 'left',
                transition: 'opacity 160ms',
              }}>
                <span style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: t.color,
                  flexShrink: 0,
                  boxShadow: on ? `0 0 6px ${t.color}AA` : 'none',
                }} />
                {t.label}
              </button>
            );
          })}
        </div>
      )}

      {tab === 'type' && (
        <div style={{
          background: 'rgba(11, 38, 28, 0.92)',
          border: '1px solid var(--gp-border-soft)',
          borderRadius: 'var(--gp-radius-md)',
          padding: 12,
          display: 'flex', flexDirection: 'column', gap: 6,
          backdropFilter: 'blur(6px)',
        }}>
          {[
            ['chapter', 'Chapters', 14, 'var(--gp-primary)',  'var(--gp-green-900)'],
            ['steward', 'Stewards', 9,  'var(--gp-secondary)', null],
            ['member',  'Members',  5,  'var(--gp-off-white)', null],
          ].map(([id, label, sz, fill, ring]) => {
            const on = activeTypes[id];
            return (
              <button key={id} onClick={() => toggleType(id)} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '4px 6px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                opacity: on ? 1 : 0.35,
                color: on ? 'var(--gp-fg)' : 'var(--gp-fg-dim)',
                fontFamily: 'var(--gp-font-body)',
                fontSize: 12,
                fontWeight: 500,
                textAlign: 'left',
              }}>
                <span style={{
                  width: sz, height: sz, borderRadius: '50%',
                  background: fill,
                  flexShrink: 0,
                  border: ring ? `1.5px solid ${ring}` : 'none',
                }} />
                {label}
              </button>
            );
          })}
        </div>
      )}

      {/* tabs */}
      <div style={{
        display: 'flex',
        gap: 6,
        background: 'rgba(11, 38, 28, 0.72)',
        border: '1px solid var(--gp-border-soft)',
        borderRadius: 'var(--gp-radius-pill)',
        padding: 4,
        backdropFilter: 'blur(6px)',
        width: 'fit-content',
      }}>
        {[['theme', 'Themes'], ['type', 'Types']].map(([id, label]) => {
          const active = tab === id;
          return (
            <button key={id} onClick={() => setTab(active ? null : id)} style={{
              padding: '4px 10px',
              borderRadius: 'var(--gp-radius-pill)',
              background: active ? 'var(--gp-primary)' : 'transparent',
              color: active ? 'var(--gp-primary-fg)' : 'var(--gp-fg-dim)',
              border: 'none',
              fontFamily: 'var(--gp-font-body)',
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.04em',
              cursor: 'pointer',
              transition: 'all 160ms',
            }}>{label}</button>
          );
        })}
      </div>
    </div>
  );
};

Object.assign(window, {
  MapCanvas, MapFocusCard, MapLegend,
  mcLonToX, mcLatToY, mcXToLon, mcYToLat,
  mcMycelialPath, mcBuildEdgePaths,
  // Aliases used by ch-sections / cd-sections for inline dot maps.
  hmLonToX: mcLonToX, hmLatToY: mcLatToY,
});
