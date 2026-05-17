/* hifi/map-walkthrough.jsx — Add-yourself-to-the-map flow.
   Desktop: 3 steps (Themes → Identity → Arrival)
   Mobile:  4 steps (Welcome → Themes → Identity → Arrival)

   On submit, calls onComplete({ name, city, lat, lng, themes }) so the host
   page can spawn the new member node on the map with an arrival animation.
   Caches to localStorage so the node persists across page reloads.
   ----------------------------------------------------------------- */

const MW_STORAGE_KEY = 'gp.map.myNode';

/* Find the closest known reference city to a given lat/lng — used as the
   human-readable label after a click-to-place pin drop. */
function nearestCity(lat, lng) {
  const list = [
    ...MAP_MEMBER_CITIES,
    ...MAP_CHAPTERS.map(c => [c.name, c.lat, c.lng]),
  ];
  let best = null;
  let bestD = Infinity;
  for (const c of list) {
    const cLat = c[1], cLng = c[2];
    const d = Math.hypot(cLat - lat, (cLng - lng) * Math.cos((cLat + lat) / 2 * Math.PI / 180));
    if (d < bestD) { bestD = d; best = c; }
  }
  return { city: best, distance: bestD };
}

/* Check if a (lat, lng) point falls on a continent polygon. */
function isOnLand(lat, lng) {
  for (let i = 0; i < MW_CONTINENTS.length; i++) {
    if (mwPointInPolygon(lng, lat, MW_CONTINENTS[i])) return true;
  }
  return false;
}

/* Snap an ocean click to the nearest land cell in the dot grid. Returns
   {lat, lng} of the nearest land cell, or the original if no land found. */
function snapToLand(lat, lng) {
  const grid = MW_DEFAULT_GRID;
  const rows = grid.length;
  const cols = grid[0].length;
  let bestD = Infinity;
  let bestLat = lat, bestLng = lng;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!grid[r][c]) continue;
      const cLat = 90 - (r + 0.5) * (180 / rows);
      const cLng = -180 + (c + 0.5) * (360 / cols);
      const d = Math.hypot(cLat - lat, (cLng - lng) * Math.cos((cLat + lat) / 2 * Math.PI / 180));
      if (d < bestD) { bestD = d; bestLat = cLat; bestLng = cLng; }
    }
  }
  return { lat: bestLat, lng: bestLng };
}

function readMyNode() {
  try {
    const raw = localStorage.getItem(MW_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
function writeMyNode(node) {
  try { localStorage.setItem(MW_STORAGE_KEY, JSON.stringify(node)); } catch {}
}
function clearMyNode() {
  try { localStorage.removeItem(MW_STORAGE_KEY); } catch {}
}

const MapWalkthrough = ({ open, isMobile = false, onClose, onComplete }) => {
  const [step, setStep] = React.useState(0);
  const [themes, setThemes] = React.useState([]);
  const [name, setName] = React.useState('');
  const [social, setSocial] = React.useState('');
  const [pin, setPin] = React.useState(null);         // { lat, lng, label }
  const [inputMode, setInputMode] = React.useState('map'); // 'map' | 'text'
  const [cityQuery, setCityQuery] = React.useState('');
  const [planting, setPlanting] = React.useState(false);

  // Reset when opened.
  React.useEffect(() => {
    if (open) {
      setStep(0); setThemes([]); setName(''); setSocial('');
      setPin(null); setInputMode('map'); setCityQuery('');
      setPlanting(false);
    }
  }, [open]);

  // Step plan
  const steps = isMobile
    ? ['welcome', 'themes', 'identity', 'arrival']
    : ['themes', 'identity', 'arrival'];

  const stepKey = steps[step];

  // Fuzzy match the typed city → updates pin (text mode).
  React.useEffect(() => {
    if (inputMode !== 'text') return;
    const q = cityQuery.trim().toLowerCase();
    if (q.length < 2) return;
    const list = [...MAP_MEMBER_CITIES, ...MAP_CHAPTERS.map(c => [c.name, c.lat, c.lng])];
    const starts = list.find(c => c[0].toLowerCase().startsWith(q));
    const found = starts || list.find(c => c[0].toLowerCase().includes(q));
    if (found) setPin({ lat: found[1], lng: found[2], label: found[0] });
    else setPin(null);
  }, [cityQuery, inputMode]);

  const canAdvance = (() => {
    if (stepKey === 'welcome') return true;
    if (stepKey === 'themes') return themes.length >= 1;
    if (stepKey === 'identity') return name.trim().length >= 1 && pin;
    return true;
  })();

  const next = () => { if (step < steps.length - 1) setStep(step + 1); };
  const back = () => { if (step > 0) setStep(step - 1); };
  const jumpTo = (key) => {
    const idx = steps.indexOf(key);
    if (idx >= 0) setStep(idx);
  };

  // Plant the node.
  const handlePlant = () => {
    if (!pin) return;
    setPlanting(true);
    // small organic offset so two members in same place don't overlap
    const jLat = pin.lat + (Math.random() - 0.5) * 0.8;
    const jLng = pin.lng + (Math.random() - 0.5) * 0.8;
    const newNode = {
      type: 'member',
      id: `mb-self-${Date.now()}`,
      name: name.trim() || 'You',
      city: pin.label,
      lat: jLat,
      lng: jLng,
      themes,
      social: social.trim() || null,
      self: true,
    };
    writeMyNode(newNode);
    setTimeout(() => {
      onComplete && onComplete(newNode);
      setTimeout(() => { onClose && onClose(); }, 400);
    }, 700);
  };

  if (!open) return null;

  return (
    <div className="mw-overlay" style={{
      position: 'fixed', inset: 0, zIndex: 50,
      background: 'rgba(8, 28, 22, 0.78)',
      backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: isMobile ? 16 : 32,
      animation: 'mwFadeIn 240ms cubic-bezier(0.22,1,0.36,1)',
    }} onClick={(e) => { if (e.target === e.currentTarget) onClose && onClose(); }}>
      <div className="mw-card" style={{
        width: '100%',
        maxWidth: isMobile ? 420 : 720,
        background: 'var(--gp-card)',
        border: '1px solid var(--gp-border-soft)',
        borderRadius: 'var(--gp-radius-lg)',
        boxShadow: '0 30px 80px -20px rgba(0,0,0,0.7)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* topo wash inside the card */}
        <div aria-hidden="true" style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'url("hifi/assets/topo-bg.png")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.08,
          mixBlendMode: 'overlay',
          pointerEvents: 'none',
        }} />

        {/* close */}
        <button onClick={onClose} aria-label="Close" style={{
          position: 'absolute', top: 16, right: 16,
          width: 32, height: 32,
          background: 'transparent',
          border: '1px solid var(--gp-border-soft)',
          color: 'var(--gp-fg-dim)',
          borderRadius: '50%',
          cursor: 'pointer',
          fontSize: 18,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 2,
        }}>×</button>

        {/* progress dots */}
        <div style={{
          display: 'flex', gap: 6, position: 'absolute', top: 22, left: 24,
          zIndex: 2,
        }}>
          {steps.map((_, i) => (
            <span key={i} style={{
              width: i === step ? 22 : 6, height: 6,
              borderRadius: 3,
              background: i <= step ? 'var(--gp-primary)' : 'rgba(255,255,255,0.15)',
              transition: 'all 280ms',
            }} />
          ))}
        </div>

        <div style={{
          padding: isMobile ? '64px 22px 22px' : '64px 36px 28px',
          position: 'relative',
          zIndex: 1,
          minHeight: isMobile ? 580 : 640,   // lock height to prevent shift across steps
          display: 'flex',
          flexDirection: 'column',
        }}>
          <div style={{ flex: 1 }}>
          {stepKey === 'welcome' && <MW_Welcome onNext={next} />}
          {stepKey === 'themes' && (
            <MW_Themes
              isMobile={isMobile}
              themes={themes}
              setThemes={setThemes}
            />
          )}
          {stepKey === 'identity' && (
            <MW_Identity
              isMobile={isMobile}
              name={name}
              setName={setName}
              social={social}
              setSocial={setSocial}
              pin={pin}
              setPin={setPin}
              inputMode={inputMode}
              setInputMode={setInputMode}
              cityQuery={cityQuery}
              setCityQuery={setCityQuery}
            />
          )}
          {stepKey === 'arrival' && (
            <MW_Arrival
              name={name}
              themes={themes}
              social={social}
              pin={pin}
              planting={planting}
              onPlant={handlePlant}
              onEdit={jumpTo}
            />
          )}
          </div>

          {/* footer nav */}
          {stepKey !== 'arrival' && (
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              marginTop: 24,
              gap: 12,
            }}>
              {step > 0 ? (
                <button onClick={back} style={{
                  background: 'transparent',
                  color: 'var(--gp-fg-dim)',
                  border: 'none',
                  fontFamily: 'var(--gp-font-body)',
                  fontSize: 13, fontWeight: 600,
                  cursor: 'pointer',
                  padding: '12px 4px',
                }}>← Back</button>
              ) : (
                <span /> /* spacer keeps the next button right-aligned */
              )}

              <button onClick={next} disabled={!canAdvance} style={{
                background: canAdvance ? 'var(--gp-primary)' : 'var(--gp-green-700)',
                color: canAdvance ? 'var(--gp-primary-fg)' : 'var(--gp-fg-muted)',
                border: 'none',
                fontFamily: 'var(--gp-font-body)',
                fontSize: 14, fontWeight: 700,
                borderRadius: 'var(--gp-radius-pill)',
                padding: '12px 24px',
                cursor: canAdvance ? 'pointer' : 'default',
                transition: 'all 180ms',
                boxShadow: canAdvance ? '0 0 18px rgba(184, 232, 53, 0.35)' : 'none',
              }}>{step === steps.length - 2 ? 'Review →' : 'Continue →'}</button>
            </div>
          )}

          {/* arrival has its own controls (back + plant) */}
          {stepKey === 'arrival' && (
            <div style={{
              display: 'flex', justifyContent: 'flex-start', alignItems: 'center',
              marginTop: 12,
            }}>
              <button onClick={back} disabled={planting} style={{
                background: 'transparent',
                color: planting ? 'var(--gp-fg-muted)' : 'var(--gp-fg-dim)',
                border: 'none',
                fontFamily: 'var(--gp-font-body)',
                fontSize: 13, fontWeight: 600,
                cursor: planting ? 'default' : 'pointer',
                padding: '12px 4px',
                opacity: planting ? 0.4 : 1,
              }}>← Edit details</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ----- step: Welcome (mobile only) ----- */
const MW_Welcome = ({ onNext }) => (
  <div>
    <div style={{
      fontFamily: 'var(--gp-font-mono)',
      fontSize: 10, letterSpacing: '0.16em',
      color: 'var(--gp-primary)',
      textTransform: 'uppercase',
      fontWeight: 700,
      marginBottom: 12,
    }}>Join the network</div>
    <h2 style={{
      fontFamily: 'var(--gp-font-display)',
      fontSize: 32, color: 'var(--gp-secondary)',
      lineHeight: 1.05, marginBottom: 12,
      fontWeight: 500, letterSpacing: '-0.01em',
    }}>Plant yourself on the map.</h2>
    <p style={{
      fontFamily: 'var(--gp-font-body)',
      fontSize: 14, color: 'var(--gp-fg-dim)',
      lineHeight: 1.5, marginBottom: 8,
    }}>You're about to become a member of Greenpill — a global mycelium of people building regenerative things in public.</p>
    <p style={{
      fontFamily: 'var(--gp-font-body)',
      fontSize: 14, color: 'var(--gp-fg-dim)',
      lineHeight: 1.5,
    }}>Pick what you care about, drop your pin, and watch the threads find you.</p>
  </div>
);

/* ----- step: Themes ----- */
const MW_Themes = ({ isMobile, themes, setThemes }) => {
  const max = 4;
  const toggle = (id) => {
    if (themes.includes(id)) {
      setThemes(themes.filter(t => t !== id));
    } else if (themes.length < max) {
      setThemes([...themes, id]);
    }
  };
  return (
    <div>
      <div style={{
        fontFamily: 'var(--gp-font-mono)',
        fontSize: 10, letterSpacing: '0.16em',
        color: 'var(--gp-primary)',
        textTransform: 'uppercase',
        fontWeight: 700,
        marginBottom: 12,
      }}>Step · what you care about</div>
      <h2 style={{
        fontFamily: 'var(--gp-font-display)',
        fontSize: isMobile ? 28 : 34, color: 'var(--gp-secondary)',
        lineHeight: 1.05, marginBottom: 8,
        fontWeight: 500, letterSpacing: '-0.01em',
      }}>What are you here to grow?</h2>
      <p style={{
        fontFamily: 'var(--gp-font-body)',
        fontSize: 13, color: 'var(--gp-fg-dim)',
        marginBottom: 20,
      }}>Pick up to 4. These choose the color of your threads on the map and find your people.</p>

      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)',
        gap: 8,
      }}>
        {MAP_THEMES.map(t => {
          const on = themes.includes(t.id);
          const full = themes.length >= max && !on;
          return (
            <button key={t.id} onClick={() => toggle(t.id)} disabled={full} style={{
              padding: '10px 12px',
              borderRadius: 'var(--gp-radius-pill)',
              border: on ? `1.5px solid ${t.color}` : '1px solid var(--gp-border-soft)',
              background: on ? `${t.color}22` : 'transparent',
              color: on ? t.color : 'var(--gp-fg-dim)',
              fontFamily: 'var(--gp-font-body)',
              fontSize: 12,
              fontWeight: on ? 600 : 500,
              cursor: full ? 'not-allowed' : 'pointer',
              opacity: full ? 0.45 : 1,
              display: 'flex', alignItems: 'center', gap: 8,
              textAlign: 'left',
              transition: 'all 180ms',
              boxShadow: on ? `0 0 0 1px ${t.color}40, 0 4px 12px ${t.color}22` : 'none',
            }}>
              <span style={{
                width: 8, height: 8, borderRadius: '50%',
                background: t.color,
                flexShrink: 0,
                boxShadow: on ? `0 0 6px ${t.color}` : 'none',
              }} />
              {t.label}
            </button>
          );
        })}
      </div>

      <div style={{
        marginTop: 14,
        fontFamily: 'var(--gp-font-body)',
        fontSize: 11, color: 'var(--gp-fg-muted)',
      }}>{themes.length}/{max} selected</div>
    </div>
  );
};

/* ----- step: Identity ----- */
const MW_Identity = ({ isMobile, name, setName, social, setSocial,
                       pin, setPin, inputMode, setInputMode,
                       cityQuery, setCityQuery }) => {
  const inputStyle = {
    width: '100%',
    padding: '12px 14px',
    background: 'rgba(8, 28, 22, 0.6)',
    border: '1px solid var(--gp-border-soft)',
    borderRadius: 'var(--gp-radius-md)',
    color: 'var(--gp-fg)',
    fontFamily: 'var(--gp-font-body)',
    fontSize: 14,
    outline: 'none',
  };
  const labelStyle = {
    display: 'block',
    fontFamily: 'var(--gp-font-body)',
    fontSize: 11, fontWeight: 600,
    color: 'var(--gp-fg-dim)',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    marginBottom: 6,
  };

  return (
    <div>
      <div style={{
        fontFamily: 'var(--gp-font-mono)',
        fontSize: 10, letterSpacing: '0.16em',
        color: 'var(--gp-primary)',
        textTransform: 'uppercase',
        fontWeight: 700,
        marginBottom: 10,
      }}>Step · who & where</div>
      <h2 style={{
        fontFamily: 'var(--gp-font-display)',
        fontSize: 30, color: 'var(--gp-secondary)',
        lineHeight: 1.05, marginBottom: 6,
        marginTop: 0,
        fontWeight: 500, letterSpacing: '-0.01em',
      }}>Drop your pin.</h2>
      <p style={{
        fontFamily: 'var(--gp-font-body)',
        fontSize: 13, color: 'var(--gp-fg-dim)',
        marginBottom: 18, marginTop: 6,
      }}>Name yourself, place yourself, and add one link the network can reach you at.</p>

      <label style={{ display: 'block', marginBottom: 14 }}>
        <span style={labelStyle}>Display name</span>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="What should the network call you?"
          style={inputStyle}
        />
      </label>

      {/* Location: mini-map default, text fallback */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ ...labelStyle, marginBottom: 0 }}>Your place in the world</span>
          <button onClick={() => setInputMode(inputMode === 'map' ? 'text' : 'map')} style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--gp-primary)',
            fontFamily: 'var(--gp-font-body)',
            fontSize: 11, fontWeight: 600,
            cursor: 'pointer',
            padding: 0,
            letterSpacing: '0.02em',
          }}>{inputMode === 'map' ? 'or type a city ↗' : '← back to map'}</button>
        </div>

        {inputMode === 'map' ? (
          <MW_MiniMap pin={pin} onPin={(p) => setPin(p)} />
        ) : (
          <input
            value={cityQuery}
            onChange={e => setCityQuery(e.target.value)}
            placeholder="Berlin, Bogotá, Bali..."
            style={inputStyle}
            autoFocus
          />
        )}

        {/* fixed-height confirmation row */}
        <div style={{
          minHeight: 22,
          marginTop: 8,
          display: 'flex', alignItems: 'center', gap: 8,
          fontFamily: 'var(--gp-font-body)',
          fontSize: 11,
        }}>
          {pin ? (
            <>
              <span style={{
                width: 6, height: 6, borderRadius: '50%',
                background: 'var(--gp-primary)',
                boxShadow: '0 0 6px var(--gp-primary)',
              }} />
              <span style={{ color: 'var(--gp-primary)', fontWeight: 600 }}>Pinning near {pin.label}</span>
            </>
          ) : inputMode === 'map' ? (
            <span style={{ color: 'var(--gp-fg-muted)', fontStyle: 'italic' }}>Click anywhere on land to drop your pin</span>
          ) : cityQuery.trim().length < 2 ? (
            <span style={{ color: 'var(--gp-fg-muted)', fontStyle: 'italic' }}>—</span>
          ) : (
            <span style={{ color: 'var(--gp-fg-muted)', fontStyle: 'italic' }}>No match yet — try a major city</span>
          )}
        </div>
      </div>

      <label style={{ display: 'block' }}>
        <span style={labelStyle}>Social link <span style={{ opacity: 0.6, textTransform: 'none', letterSpacing: 0, fontWeight: 500 }}>· optional</span></span>
        <input
          value={social}
          onChange={e => setSocial(e.target.value)}
          placeholder="Portfolio, Twitter, LinkedIn — wherever to find you"
          style={inputStyle}
        />
      </label>
    </div>
  );
};

/* ----- MW_MiniMap: small clickable world for placing the pin ----- */
const MW_MiniMap = ({ pin, onPin }) => {
  const svgRef = React.useRef(null);
  const dots = React.useMemo(
    () => mwRenderDots(MW_DEFAULT_GRID, { color: 'var(--gp-green-500)', opacity: 0.55, r: 0.45 }),
    []
  );

  const handleClick = (e) => {
    const rect = svgRef.current.getBoundingClientRect();
    const xv = (e.clientX - rect.left) / rect.width * 200;
    const yv = (e.clientY - rect.top) / rect.height * 100;
    const lng = mcXToLon(xv);
    const lat = mcYToLat(yv);
    // If ocean click, snap to nearest land.
    const final = isOnLand(lat, lng) ? { lat, lng } : snapToLand(lat, lng);
    const { city } = nearestCity(final.lat, final.lng);
    onPin({
      lat: final.lat,
      lng: final.lng,
      label: city ? city[0] : 'Unknown',
    });
  };

  const pinX = pin ? mcLonToX(pin.lng) / 2 : null; // % within container
  const pinY = pin ? mcLatToY(pin.lat) : null;

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      aspectRatio: '2 / 1',
      background: 'radial-gradient(ellipse at center, rgba(20,68,52,0.65) 0%, rgba(11,46,35,0.95) 100%)',
      borderRadius: 'var(--gp-radius-md)',
      border: '1px solid var(--gp-border-soft)',
      overflow: 'hidden',
      cursor: 'crosshair',
    }} onClick={handleClick}>
      {/* topo wash */}
      <div aria-hidden="true" style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'url("hifi/assets/topo-bg.png")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        opacity: 0.14,
        mixBlendMode: 'overlay',
        pointerEvents: 'none',
      }} />
      <svg ref={svgRef} viewBox="0 0 200 100"
           preserveAspectRatio="xMidYMid meet"
           style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}>
        {dots}
      </svg>
      {pin && (
        <div style={{
          position: 'absolute',
          left: `${pinX}%`, top: `${pinY}%`,
          transform: 'translate(-50%, -50%)',
          width: 14, height: 14,
          borderRadius: '50%',
          background: 'var(--gp-off-white)',
          border: '2px solid var(--gp-primary)',
          boxShadow: '0 0 0 4px rgba(184, 232, 53, 0.22), 0 0 16px rgba(184, 232, 53, 0.65)',
          pointerEvents: 'none',
          animation: 'mwPlantPulse 2.4s ease-in-out infinite',
        }} />
      )}
      <div style={{
        position: 'absolute', bottom: 8, right: 10,
        fontFamily: 'var(--gp-font-mono)',
        fontSize: 9, letterSpacing: '0.14em',
        color: 'var(--gp-fg-muted)',
        textTransform: 'uppercase',
        fontWeight: 700,
        pointerEvents: 'none',
      }}>{pin ? '· click again to move ·' : '· click to place ·'}</div>
    </div>
  );
};

/* ----- step: Arrival (confirm + plant) ----- */
const MW_Arrival = ({ name, themes, social, pin, planting, onPlant, onEdit }) => {
  const themeObjs = themes.map(id => MAP_THEME_BY_ID[id]).filter(Boolean);
  const rowStyle = {
    display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
    padding: '10px 0',
    borderBottom: '1px solid var(--gp-border-soft)',
    gap: 12,
  };
  const labelStyle = {
    fontFamily: 'var(--gp-font-mono)',
    fontSize: 9, letterSpacing: '0.16em',
    color: 'var(--gp-fg-muted)',
    textTransform: 'uppercase',
    fontWeight: 700,
    flexShrink: 0,
    minWidth: 80,
  };
  const valStyle = {
    fontFamily: 'var(--gp-font-body)',
    fontSize: 14, color: 'var(--gp-fg)',
    fontWeight: 500,
    textAlign: 'right',
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  };
  const editLink = {
    fontFamily: 'var(--gp-font-body)',
    fontSize: 11,
    color: 'var(--gp-primary)',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '2px 4px',
    marginLeft: 8,
    flexShrink: 0,
  };

  return (
    <div>
      <div style={{
        fontFamily: 'var(--gp-font-mono)',
        fontSize: 10, letterSpacing: '0.16em',
        color: 'var(--gp-primary)',
        textTransform: 'uppercase',
        fontWeight: 700,
        marginBottom: 12,
      }}>Step · join the network</div>
      <h2 style={{
        fontFamily: 'var(--gp-font-display)',
        fontSize: 32, color: 'var(--gp-secondary)',
        lineHeight: 1.05, marginBottom: 18,
        marginTop: 0,
        fontWeight: 500, letterSpacing: '-0.01em',
      }}>{planting ? "You're taking root." : "Look right before you take root."}</h2>

      {/* preview node */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 16,
        padding: '16px 18px',
        background: 'rgba(8, 28, 22, 0.5)',
        border: '1px solid var(--gp-border-soft)',
        borderRadius: 'var(--gp-radius-md)',
        marginBottom: 14,
      }}>
        <div style={{
          width: 22, height: 22, borderRadius: '50%',
          background: 'var(--gp-off-white)',
          boxShadow: '0 0 0 4px rgba(250, 247, 238, 0.16), 0 0 20px rgba(250, 247, 238, 0.55)',
          flexShrink: 0,
          animation: planting ? 'mwPlantPulse 1.2s ease-in-out infinite' : 'none',
        }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: 'var(--gp-font-display)',
            fontSize: 20, color: 'var(--gp-secondary)',
            fontWeight: 500, marginBottom: 2,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{name || 'You'}</div>
          <div style={{
            fontFamily: 'var(--gp-font-mono)',
            fontSize: 10, letterSpacing: '0.14em',
            color: 'var(--gp-off-white)',
            textTransform: 'uppercase',
            fontWeight: 700,
          }}>Member · {pin ? pin.label : '—'}</div>
        </div>
      </div>

      {/* summary rows with edit links */}
      <div style={{ marginBottom: 18 }}>
        <div style={rowStyle}>
          <span style={labelStyle}>Themes</span>
          <span style={{ ...valStyle, display: 'flex', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 4, whiteSpace: 'normal' }}>
            {themeObjs.map(t => (
              <span key={t.id} style={{
                fontSize: 10, fontFamily: 'var(--gp-font-body)',
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: 'var(--gp-radius-pill)',
                color: t.color,
                background: `${t.color}1A`,
                border: `1px solid ${t.color}40`,
              }}>{t.label}</span>
            ))}
          </span>
          <button style={editLink} onClick={() => onEdit && onEdit('themes')} disabled={planting}>Edit</button>
        </div>
        <div style={rowStyle}>
          <span style={labelStyle}>Social</span>
          <span style={valStyle}>{social || <em style={{ color: 'var(--gp-fg-muted)', fontStyle: 'normal' }}>none</em>}</span>
          <button style={editLink} onClick={() => onEdit && onEdit('identity')} disabled={planting}>Edit</button>
        </div>
      </div>

      <button onClick={onPlant} disabled={planting} style={{
        background: 'var(--gp-primary)',
        color: 'var(--gp-primary-fg)',
        border: 'none',
        fontFamily: 'var(--gp-font-body)',
        fontSize: 15, fontWeight: 700,
        borderRadius: 'var(--gp-radius-pill)',
        padding: '14px 28px',
        cursor: planting ? 'default' : 'pointer',
        width: '100%',
        transition: 'all 180ms',
        boxShadow: '0 0 22px rgba(184, 232, 53, 0.45)',
        opacity: planting ? 0.7 : 1,
        letterSpacing: '0.02em',
      }}>{planting ? 'Connecting threads…' : 'Plant me on the map →'}</button>

      <p style={{
        marginTop: 12, marginBottom: 0,
        fontFamily: 'var(--gp-font-body)',
        fontSize: 11,
        color: 'var(--gp-fg-muted)',
        textAlign: 'center',
      }}>Your node is cached locally — refresh and it's still there.</p>
    </div>
  );
};

Object.assign(window, {
  MapWalkthrough, MW_Welcome, MW_Themes, MW_Identity, MW_Arrival, MW_MiniMap,
  readMyNode, writeMyNode, clearMyNode,
  nearestCity, isOnLand, snapToLand,
});
