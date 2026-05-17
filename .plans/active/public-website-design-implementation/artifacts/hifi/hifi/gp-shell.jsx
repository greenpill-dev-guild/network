/* hifi/gp-shell.jsx — shared shell for all Greenpill hi-fi pages.
   Direction-locked to "C · Iconic" (the Library default) so every page reads
   from the same playbook. Exposes:
     - Typography atoms (GP_Display, GP_H1, GP_H2, GP_H3, GP_Body, GP_Overline, GP_Mute, GP_Caption)
     - Buttons + links (GP_PrimaryButton, GP_GhostButton, GP_ArrowLink)
     - Layout: GP_Page (topo wash), GP_Section, GP_SectionHeader
     - Chrome: GP_Header (active-nav aware), GP_Footer
     - Placeholders: GP_PlaceImg, GP_CanvasNote
   ----------------------------------------------------------------- */

/* ----------------------------------------------------------------------
   View mode + viewport detection
   ----------------------------------------------------------------------
   The baked Hi-Fi pages render inside a fixed-width scaling "gallery"
   frame by default (so the user can preview 1440 / 1024 / 375 widths
   side-by-side without resizing the browser). For the developer handoff
   it's also useful to see the page at its true viewport width — that's
   "raw" view, triggered by appending `?raw` to the URL.

   In raw mode the page skips the gallery + frame, renders edge-to-edge,
   and the `bp` prop is wired to a real viewport detector so layout
   layers (header collapse, grid column counts, etc.) update live as the
   browser resizes. ---------------------------------------------------- */

function detectGpBp(w) {
  if (typeof window === 'undefined') return 'desktop';
  const width = w ?? window.innerWidth;
  if (width < 720) return 'mobile';
  if (width < 1100) return 'tablet';
  return 'desktop';
}

/* Auto-detect viewport breakpoint. Updates on resize. */
function useGpAutoBp() {
  const [bp, setBp] = React.useState(() => detectGpBp());
  React.useEffect(() => {
    const onResize = () => setBp(detectGpBp());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return bp;
}

/* Read ?raw from the URL once. Static for the page lifetime. */
function useGpRawMode() {
  return React.useMemo(() => {
    if (typeof window === 'undefined') return false;
    try { return new URLSearchParams(window.location.search).has('raw'); }
    catch (e) { return false; }
  }, []);
}

/* GpViewToggle — link to flip between gallery and raw view. In gallery
   mode it sits inline (drop it in the hf-bar); in raw mode it floats as a
   fixed pill top-right so it never disrupts the page being shown. */
const GpViewToggle = () => {
  const raw = useGpRawMode();
  const href = React.useMemo(() => {
    if (typeof window === 'undefined') return '#';
    const url = new URL(window.location.href);
    if (raw) url.searchParams.delete('raw');
    else url.searchParams.set('raw', '1');
    return url.pathname + (url.search || '');
  }, [raw]);
  const label = raw ? '← Gallery view' : 'View raw ↗';
  const baseStyle = {
    fontFamily: 'var(--gp-font-mono)',
    fontSize: 11,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'var(--gp-fg-muted)',
    textDecoration: 'none',
    whiteSpace: 'nowrap',
  };
  if (raw) {
    return (
      <a href={href} style={{
        ...baseStyle,
        position: 'fixed',
        top: 16, right: 16,
        zIndex: 2147483600,
        padding: '8px 14px',
        background: 'rgba(20, 63, 48, 0.92)',
        border: '1px solid var(--gp-border)',
        borderRadius: 'var(--gp-radius-pill)',
        backdropFilter: 'blur(6px)',
        boxShadow: '0 8px 24px -12px rgba(0,0,0,0.5)',
      }}>{label}</a>
    );
  }
  return (
    <a href={href} style={{
      ...baseStyle,
      borderBottom: '1px solid rgba(184,232,53,0.3)',
      paddingBottom: 1,
    }}>{label}</a>
  );
};

/* ----------------------------------------------------------------------
   Typography atoms — direction-free.
   Body color defaults to var(--gp-fg). Display defaults to var(--gp-secondary).
   Display font (Spectral) and full type scale are defined in gp-tokens.css —
   atoms here just reference the CSS custom properties.
   ---------------------------------------------------------------------- */

const GP_Display = ({ children, size, style, as = 'h1' }) => React.createElement(as, {
  style: {
    fontFamily: 'var(--gp-font-display)',
    fontWeight: 500,
    fontSize: size ?? 'var(--gp-display-size)',
    lineHeight: 'var(--gp-display-lh)',
    letterSpacing: 'var(--gp-display-ls)',
    fontVariationSettings: 'var(--gp-display-vs)',
    color: 'var(--gp-secondary)',
    textWrap: 'pretty',
    margin: 0,
    ...style,
  }
}, children);

const GP_H1 = ({ children, size, style, as = 'h1' }) => React.createElement(as, {
  style: {
    fontFamily: 'var(--gp-font-display)',
    fontWeight: 500,
    fontSize: size ?? 'var(--gp-h1-size)',
    lineHeight: 'var(--gp-h1-lh)',
    letterSpacing: 'var(--gp-h1-ls)',
    fontVariationSettings: 'var(--gp-display-vs)',
    color: 'var(--gp-secondary)',
    textWrap: 'pretty',
    margin: 0,
    ...style,
  }
}, children);

const GP_H2 = ({ children, size, style, as = 'h2' }) => React.createElement(as, {
  style: {
    fontFamily: 'var(--gp-font-display)',
    fontWeight: 500,
    fontSize: size ?? 'var(--gp-h2-size)',
    lineHeight: 'var(--gp-h2-lh)',
    letterSpacing: 'var(--gp-h2-ls)',
    fontVariationSettings: 'var(--gp-display-vs)',
    color: 'var(--gp-secondary)',
    margin: 0,
    ...style,
  }
}, children);

const GP_H3 = ({ children, size, style, as = 'h3' }) => React.createElement(as, {
  style: {
    fontFamily: 'var(--gp-font-display)',
    fontWeight: 500,
    fontSize: size ?? 'var(--gp-h3-size)',
    lineHeight: 'var(--gp-h3-lh)',
    letterSpacing: 'var(--gp-h3-ls)',
    fontVariationSettings: 'var(--gp-display-vs)',
    color: 'var(--gp-secondary)',
    margin: 0,
    ...style,
  }
}, children);

const GP_Body = ({ children, size = 16, style, color }) => (
  <p style={{
    fontFamily: 'var(--gp-font-body)',
    fontSize: size,
    fontWeight: 400,
    lineHeight: 1.6,
    color: color ?? 'var(--gp-fg)',
    margin: 0,
    ...style,
  }}>{children}</p>
);

/* Section overline — body font, larger, used as the kicker over section titles.
   Canonical spec: 11px / 0.14em / weight 700, primary color. */
/* Section overline — body font, larger, used as the kicker over section titles.
   Canonical spec: 11px / 0.14em / weight 700, primary color.
   If the children is a single string containing " · " separators, render each
   segment as a non-wrapping inline span so the eyebrow breaks between
   segments instead of mid-segment. */
const GP_Overline = ({ children, style, color = 'var(--gp-primary)', size = 11 }) => {
  const renderChildren = () => {
    if (typeof children !== 'string') return children;
    const parts = children.split(/\s·\s/);
    return parts.map((seg, i) => (
      <React.Fragment key={i}>
        <span style={{ whiteSpace: 'nowrap' }}>{seg}</span>
        {i < parts.length - 1 && <span aria-hidden="true" style={{ opacity: 0.65 }}>{' · '}</span>}
      </React.Fragment>
    ));
  };
  return (
    <div style={{
      fontFamily: 'var(--gp-font-body)',
      fontSize: size,
      fontWeight: 700,
      lineHeight: 1.2,
      letterSpacing: '0.14em',
      textTransform: 'uppercase',
      color,
      ...style,
    }}>{renderChildren()}</div>
  );
};

const GP_Mute = ({ children, size = 13, style }) => (
  <span style={{
    fontFamily: 'var(--gp-font-body)',
    fontSize: size,
    color: 'var(--gp-fg-muted)',
    letterSpacing: '0.005em',
    ...style,
  }}>{children}</span>
);

const GP_Caption = ({ children, size = 12, style }) => (
  <span style={{
    fontFamily: 'var(--gp-font-body)',
    fontSize: size,
    color: 'var(--gp-fg-dim)',
    ...style,
  }}>{children}</span>
);

const GP_Mono = ({ children, size = 11, style }) => (
  <span style={{
    fontFamily: 'var(--gp-font-mono)',
    fontSize: size,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'var(--gp-fg-dim)',
    ...style,
  }}>{children}</span>
);

/* ----------------------------------------------------------------------
   CTAs + links
   ---------------------------------------------------------------------- */

/* Primary CTA — pill, lime fill, dark forest text. Hover \u2192 lime-400, active \u2192 lime-600. */
const GP_PrimaryButton = ({ children, style, onMouseEnter, onMouseLeave, onMouseDown, onMouseUp, ...rest }) => {
  const [hover, setHover] = React.useState(false);
  const [press, setPress] = React.useState(false);
  const bg = press ? 'var(--gp-lime-600)' : hover ? 'var(--gp-lime-400)' : 'var(--gp-primary)';
  return (
    <button
      {...rest}
      onMouseEnter={(e) => { setHover(true); onMouseEnter && onMouseEnter(e); }}
      onMouseLeave={(e) => { setHover(false); setPress(false); onMouseLeave && onMouseLeave(e); }}
      onMouseDown={(e) => { setPress(true); onMouseDown && onMouseDown(e); }}
      onMouseUp={(e) => { setPress(false); onMouseUp && onMouseUp(e); }}
      style={{
        appearance: 'none', border: 0,
        height: 48, padding: '0 28px',
        borderRadius: 'var(--gp-radius-pill)',
        background: bg,
        color: 'var(--gp-primary-fg)',
        fontFamily: 'var(--gp-font-body)', fontSize: 15, fontWeight: 600,
        letterSpacing: '0.005em', cursor: 'pointer',
        whiteSpace: 'nowrap',
        boxShadow: 'var(--gp-shadow-pill)',
        transition: 'background 200ms cubic-bezier(0.22, 1, 0.36, 1)',
        ...style,
      }}
    >{children}</button>
  );
};

/* Ghost CTA \u2014 transparent w/ hairline. Hover \u2192 green-800 fill, lime text. */
const GP_GhostButton = ({ children, style, onMouseEnter, onMouseLeave, ...rest }) => {
  const [hover, setHover] = React.useState(false);
  return (
    <button
      {...rest}
      onMouseEnter={(e) => { setHover(true); onMouseEnter && onMouseEnter(e); }}
      onMouseLeave={(e) => { setHover(false); onMouseLeave && onMouseLeave(e); }}
      style={{
        appearance: 'none',
        border: `1px solid ${hover ? 'rgba(184,232,53,0.4)' : 'var(--gp-border)'}`,
        height: 48, padding: '0 24px',
        borderRadius: 'var(--gp-radius-pill)',
        background: hover ? 'var(--gp-green-800)' : 'transparent',
        color: hover ? 'var(--gp-lime-400)' : 'var(--gp-fg)',
        fontFamily: 'var(--gp-font-body)', fontSize: 15, fontWeight: 600,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        transition: 'all 200ms cubic-bezier(0.22, 1, 0.36, 1)',
        ...style,
      }}
    >{children}</button>
  );
};

const GP_ArrowLink = ({ children, size = 14, color = 'var(--gp-primary)', href = '#', style }) => (
  <a href={href} style={{
    fontFamily: 'var(--gp-font-body)',
    fontSize: size, fontWeight: 600,
    color,
    textDecoration: 'none',
    letterSpacing: '0.005em',
    display: 'inline-flex', alignItems: 'center', gap: 6,
    whiteSpace: 'nowrap',
    ...style,
  }}>{children} <span aria-hidden="true">→</span></a>
);

/* ----------------------------------------------------------------------
   Layout
   ---------------------------------------------------------------------- */

const GP_useInset = (bp) => bp === 'mobile' ? 20 : bp === 'tablet' ? 48 : 96;

const GP_Page = ({ children, style }) => (
  <div style={{
    position: 'relative',
    background: 'var(--gp-green-900)',
    color: 'var(--gp-fg)',
    fontFamily: 'var(--gp-font-body)',
    minHeight: '100%',
    overflow: 'hidden',
    ...style,
  }}>
    {/* page topographic wash */}
    <div aria-hidden="true" style={{
      position: 'absolute', inset: 0,
      backgroundImage: 'url("hifi/assets/topo-bg.png")',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      opacity: 0.11,
      mixBlendMode: 'overlay',
      pointerEvents: 'none',
    }} />
    <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
  </div>
);

const GP_Section = ({ children, bp, padTop, padBottom, style }) => {
  const inset = GP_useInset(bp);
  return (
    <section style={{
      padding: bp === 'mobile'
        ? `${padTop ?? 48}px 20px ${padBottom ?? 48}px`
        : `${padTop ?? 72}px ${inset}px ${padBottom ?? 72}px`,
      position: 'relative',
      ...style,
    }}>{children}</section>
  );
};

const GP_SectionHeader = ({ overline, title, side, titleSize, bp }) => (
  <div style={{
    display: 'flex',
    flexDirection: bp === 'mobile' ? 'column' : 'row',
    justifyContent: 'space-between',
    alignItems: bp === 'mobile' ? 'flex-start' : 'flex-end',
    marginBottom: bp === 'mobile' ? 24 : 36,
    gap: bp === 'mobile' ? 14 : 32,
  }}>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 720 }}>
      <GP_Overline>{overline}</GP_Overline>
      <GP_H2 size={titleSize ?? (bp === 'mobile' ? 26 : 'clamp(28px, 3.2vw, 44px)')}>{title}</GP_H2>
    </div>
    {side && (
      <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 18 }}>
        {side}
      </div>
    )}
  </div>
);

/* ----------------------------------------------------------------------
   Header & Footer
   ---------------------------------------------------------------------- */

const GP_NAV_ITEMS = [
  { label: 'Chapters', href: 'Chapters (Hi-Fi).html' },
  { label: 'Library',  href: 'Library (Hi-Fi).html' },
  { label: 'Stories',  href: 'Stories (Hi-Fi).html' },
  { label: 'Garden',   href: 'Garden (Hi-Fi).html' },
];

const GP_Header = ({ bp, activeNav = 'Home' }) => {
  const inset = GP_useInset(bp);
  const [open, setOpen] = React.useState(false);

  /* Close the slide-down on resize so a desktop view never sees it. */
  React.useEffect(() => {
    if (bp !== 'mobile' && open) setOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bp]);

  return (
    <header style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: bp === 'mobile' ? '16px 20px' : `28px ${inset}px`,
      position: 'relative', zIndex: 5,
    }}>
      <a href="Home (Hi-Fi).html" style={{
        display: 'flex', alignItems: 'center', gap: 10,
        textDecoration: 'none', color: 'var(--gp-secondary)',
        fontFamily: 'var(--gp-font-display)', fontSize: 20, fontWeight: 500,
        letterSpacing: '-0.005em',
      }}>
        <span style={{
          width: 22, height: 22, borderRadius: '50%',
          background: 'var(--gp-primary)',
          display: 'inline-block',
          boxShadow: '0 0 14px rgba(184,232,53,0.5)',
        }} />
        Greenpill Network
      </a>
      {bp !== 'mobile' ? (
        <nav style={{ display: 'flex', gap: 36 }}>
          {GP_NAV_ITEMS.map(({ label, href }) => (
            <a key={label} href={href} style={{
              fontFamily: 'var(--gp-font-body)',
              fontSize: 14, fontWeight: 600,
              color: label === activeNav ? 'var(--gp-fg)' : 'var(--gp-fg-muted)',
              textDecoration: 'none',
              letterSpacing: '0.005em',
              paddingBottom: 4,
              ...(label === activeNav && {
                borderBottom: '1.5px solid var(--gp-primary)',
              }),
            }}>{label}</a>
          ))}
        </nav>
      ) : (
        <button
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          onClick={() => setOpen(o => !o)}
          style={{
            appearance: 'none', border: 0, background: 'transparent',
            width: 36, height: 36, padding: 0, cursor: 'pointer',
            display: 'flex', flexDirection: 'column', justifyContent: 'center',
            alignItems: 'flex-end',
            gap: 5,
          }}
        >
          {[0,1,2].map(i => (
            <span key={i} style={{
              display: 'block', width: 22, height: 1.5,
              background: 'var(--gp-fg)',
              transition: 'transform 200ms cubic-bezier(0.22, 1, 0.36, 1), opacity 200ms',
              transformOrigin: 'right center',
              ...(open && i === 0 && { transform: 'translateY(6.5px) rotate(-45deg)' }),
              ...(open && i === 1 && { opacity: 0 }),
              ...(open && i === 2 && { transform: 'translateY(-6.5px) rotate(45deg)' }),
            }} />
          ))}
        </button>
      )}

      {/* Slide-down mobile nav overlay */}
      {bp === 'mobile' && (
        <div
          aria-hidden={!open}
          style={{
            position: 'absolute',
            top: '100%', left: 0, right: 0,
            background: 'var(--gp-green-900)',
            borderBottom: '1px solid var(--gp-border-soft)',
            overflow: 'hidden',
            maxHeight: open ? 320 : 0,
            opacity: open ? 1 : 0,
            transition: 'max-height 280ms cubic-bezier(0.22, 1, 0.36, 1), opacity 200ms',
            pointerEvents: open ? 'auto' : 'none',
            zIndex: 6,
          }}
        >
          <nav style={{
            display: 'flex', flexDirection: 'column',
            padding: '8px 20px 24px',
          }}>
            {GP_NAV_ITEMS.map(({ label, href }) => (
              <a key={label} href={href} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 0',
                borderBottom: '1px solid var(--gp-border-soft)',
                fontFamily: 'var(--gp-font-display)',
                fontVariationSettings: 'var(--gp-display-vs)',
                fontSize: 22, fontWeight: 500,
                color: label === activeNav ? 'var(--gp-primary)' : 'var(--gp-secondary)',
                textDecoration: 'none',
                letterSpacing: '-0.005em',
              }}>
                {label}
                <span aria-hidden="true" style={{
                  fontFamily: 'var(--gp-font-body)',
                  fontSize: 14, color: 'var(--gp-fg-dim)',
                }}>{'\u2192'}</span>
              </a>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
};

/* GP_Footer
   - bp: 'mobile' | 'tablet' | 'desktop'
   - showWordmark: when true, renders a full-width gold "GREEN PILL" wordmark above
     the columns (Library-direction-A style). Defaults to false. */
const GP_Footer = ({ bp, showWordmark = false }) => {
  const inset = GP_useInset(bp);
  return (
    <footer style={{
      padding: bp === 'mobile' ? '48px 20px 36px' : `96px ${inset}px 56px`,
      borderTop: '1px solid var(--gp-border-soft)',
      marginTop: bp === 'mobile' ? 32 : 80,
      position: 'relative',
    }}>
      {showWordmark && (
        <div style={{
          display: 'flex', justifyContent: 'center',
          padding: bp === 'mobile' ? '0 0 32px' : '0 0 60px',
        }}>
          <img src="hifi/assets/green-pill-wordmark.svg" alt="GREEN PILL"
               style={{ height: bp === 'mobile' ? 32 : 56, opacity: 0.85 }} />
        </div>
      )}
      <div style={{
        display: 'grid',
        gridTemplateColumns: bp === 'mobile' ? '1fr 1fr' : 'repeat(4, 1fr) auto',
        gap: bp === 'mobile' ? 28 : 40,
        alignItems: 'flex-start',
      }}>
        {[
          ['Network',      [['Chapters', 'Chapters (Hi-Fi).html'], ['Guilds', 'Guild (Hi-Fi).html'], ['Podcast', '#'], ['Garden', 'Garden (Hi-Fi).html']]],
          ['Get involved', [['Start a chapter', '#'], ['Attend an event', '#'], ['Add yourself to the map', '#'], ['Become a steward', '#']]],
          ['Resources',    [['Library', 'Library (Hi-Fi).html'], ['Stories', 'Stories (Hi-Fi).html'], ['Garden', 'Garden (Hi-Fi).html'], ['Youtube', '#']]],
          ['Connect',      [['Linkedin', '#'], ['Twitter', '#'], ['Telegram', '#'], ['Hub', '#']]],
        ].map(([h, items]) => (
          <div key={h} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <GP_Overline color="var(--gp-primary)">{h}</GP_Overline>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {items.map(([item, href]) => (
                <a key={item} href={href} style={{
                  fontFamily: 'var(--gp-font-body)',
                  fontSize: 14,
                  color: 'var(--gp-fg-muted)',
                  textDecoration: 'none',
                }}>{item}</a>
              ))}
            </div>
          </div>
        ))}
        {bp !== 'mobile' && !showWordmark && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'flex-end',
            gap: 14, minWidth: 120,
          }}>
            <img src="hifi/assets/green-pill-wordmark.svg" alt="GREEN PILL"
                 style={{ height: 28, opacity: 0.85 }} />
            <GP_Caption style={{ textAlign: 'right' }}>
              A CoordiNation across<br />Nations &amp; Cultures.
            </GP_Caption>
          </div>
        )}
      </div>
      <div style={{
        marginTop: bp === 'mobile' ? 32 : 56,
        paddingTop: 20,
        borderTop: '1px solid var(--gp-border-soft)',
        display: 'flex',
        flexDirection: bp === 'mobile' ? 'column' : 'row',
        justifyContent: 'space-between',
        gap: 12,
        fontFamily: 'var(--gp-font-mono)',
        fontSize: 11,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color: 'var(--gp-fg-dim)',
      }}>
        <span>greenpill.network</span>
        <span>© 2026 Greenpill Network</span>
      </div>
    </footer>
  );
};

/* ----------------------------------------------------------------------
   Helpers
   ---------------------------------------------------------------------- */

const GP_PlaceImg = ({ label, h = 200, w, ratio, style, children }) => {
  const aspect = ratio ? { aspectRatio: ratio.replace('/', ' / '), height: 'auto' } : { height: h };
  return (
    <div style={{
      position: 'relative',
      width: w ?? '100%',
      ...aspect,
      background: 'var(--gp-green-800)',
      borderRadius: 'var(--gp-radius-md)',
      overflow: 'hidden',
      boxShadow: '0 1px 0 0 rgba(255,255,255,0.04) inset',
      ...style,
    }}>
      <div aria-hidden="true" style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'url("hifi/assets/topo-bg.png")',
        backgroundSize: 'cover', backgroundPosition: 'center',
        opacity: 0.18, mixBlendMode: 'overlay',
      }} />
      <div aria-hidden="true" style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(circle at 30% 25%, rgba(240,220,160,0.08), transparent 55%)',
      }} />
      {label && (
        <div style={{
          position: 'absolute', left: 12, right: 12, bottom: 10,
          fontFamily: 'var(--gp-font-mono)',
          fontSize: 9, letterSpacing: '0.08em',
          color: 'rgba(250,247,238,0.55)',
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>{label}</div>
      )}
      {children}
    </div>
  );
};

/* Yellow stickynote — design rationale floating on the canvas. */
const GP_CanvasNote = ({ children, pos = 'right', style }) => {
  const base = {
    background: 'rgba(255, 235, 130, 0.94)',
    color: '#3a2a06',
    border: '1px solid rgba(120, 92, 20, 0.35)',
    borderRadius: 6,
    padding: '10px 12px',
    fontFamily: 'var(--gp-font-body)',
    fontSize: 12,
    lineHeight: 1.45,
    boxShadow: '0 14px 30px -12px rgba(0,0,0,0.55), 0 2px 0 rgba(0,0,0,0.15)',
    transform: 'rotate(-1deg)',
    zIndex: 10,
    maxWidth: 280,
    ...style,
  };
  if (pos === 'inline') return <div style={{ ...base, marginTop: 12, maxWidth: '100%' }}>{children}</div>;
  return <div style={base}>{children}</div>;
};

/* ----------------------------------------------------------------------
   Responsive frame — wraps a page at a native breakpoint width and scales
   to fit the host. Match the Library pattern for consistent gallery view.
   ---------------------------------------------------------------------- */

const GP_Frame = ({ bp, children }) => {
  const frameW = bp === 'mobile' ? 375 : bp === 'tablet' ? 1024 : 1440;
  const [scale, setScale] = React.useState(1);
  const wrapRef = React.useRef(null);

  React.useEffect(() => {
    const update = () => {
      if (!wrapRef.current) return;
      const avail = wrapRef.current.parentElement.clientWidth - 48;
      setScale(Math.min(1, avail / frameW));
    };
    update();
    const ro = new ResizeObserver(update);
    if (wrapRef.current) ro.observe(wrapRef.current.parentElement);
    return () => ro.disconnect();
  }, [frameW]);

  return (
    <div ref={wrapRef} style={{ width: frameW * scale, margin: '0 auto' }}>
      <div style={{
        width: frameW,
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
        boxShadow: '0 20px 80px -20px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04)',
        borderRadius: 4,
        overflow: 'hidden',
      }}>{children}</div>
    </div>
  );
};

/* ----------------------------------------------------------------------
   Shared atoms — used across multiple pages.
   ---------------------------------------------------------------------- */

/* GP_Avatar — initials in a forest disc with a soft gold inner glow.
   Single source of truth for Steward/Author/Member avatars across pages. */
const GP_Avatar = ({ size = 56, name = '', style }) => {
  const initials = String(name).split(' ').map(s => s[0]).filter(Boolean).slice(0, 2).join('');
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'var(--gp-green-700)',
      border: '1px solid var(--gp-border-soft)',
      backgroundImage: 'radial-gradient(circle at 30% 25%, rgba(240,220,160,0.30), transparent 60%)',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      color: 'var(--gp-secondary)',
      fontFamily: 'var(--gp-font-display)',
      fontWeight: 500, fontSize: Math.round(size * 0.36),
      letterSpacing: '0.005em',
      flex: 'none',
      fontVariationSettings: 'var(--gp-display-vs)',
      ...style,
    }}>{initials}</div>
  );
};

/* GP_AvatarStack — overlapped avatars + "+N more" indicator. */
const GP_AvatarStack = ({ count = 3, extra = 0, size = 28, style }) => (
  <div style={{ display: 'flex', alignItems: 'center', ...style }}>
    {Array.from({ length: count }).map((_, i) => (
      <span key={i} style={{
        width: size, height: size, borderRadius: '50%',
        background: 'var(--gp-green-700)',
        border: '2px solid var(--gp-green-900)',
        backgroundImage: 'radial-gradient(circle at 30% 25%, rgba(240,220,160,0.30), transparent 60%)',
        marginLeft: i === 0 ? 0 : -Math.round(size * 0.32),
        flex: 'none',
      }} />
    ))}
    {extra > 0 && (
      <span style={{
        marginLeft: 8,
        fontFamily: 'var(--gp-font-mono)',
        fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase',
        color: 'var(--gp-fg-dim)',
      }}>+{extra} more</span>
    )}
  </div>
);

/* GP_Breadcrumb — back-link + slash-separated trail. Crumbs are
   { label, href? } objects; the last crumb is rendered as the current page
   (no link). */
/* GP_Breadcrumb — back-link + slash-separated trail. Crumbs are
   { label, href? } objects; the last crumb is rendered as the current page
   (no link). On mobile, if there are 2+ crumbs the middle ones collapse to
   a "…" so the trail stays on one line. */
const GP_Breadcrumb = ({ bp, crumbs = [], back }) => {
  const mobile = bp === 'mobile';
  const shown = mobile && crumbs.length > 1
    ? [{ label: '\u2026', collapsed: true }, crumbs[crumbs.length - 1]]
    : crumbs;
  return (
    <div style={{
      padding: bp === 'mobile' ? '10px 20px' : `14px ${GP_useInset(bp)}px`,
      borderBottom: '1px solid var(--gp-border-soft)',
      fontFamily: 'var(--gp-font-body)',
      fontSize: 13,
      color: 'var(--gp-fg-muted)',
      display: 'flex', alignItems: 'center', gap: 8,
      flexWrap: 'wrap',
    }}>
      {back && (
        <>
          <a href={back.href} style={{
            color: 'var(--gp-fg-muted)',
            textDecoration: 'none',
            display: 'inline-flex', alignItems: 'center', gap: 6,
            whiteSpace: 'nowrap',
          }}>
            <span aria-hidden="true">{'\u2190'}</span>
            <span>{back.label}</span>
          </a>
          {shown.length > 0 && <span style={{ opacity: 0.5 }}>/</span>}
        </>
      )}
      {shown.map((c, i) => {
        const last = i === shown.length - 1;
        const node = c.href && !last
          ? <a key={`l-${i}`} href={c.href} style={{ color: 'var(--gp-fg-muted)', textDecoration: 'none', whiteSpace: 'nowrap' }}>{c.label}</a>
          : <span key={`s-${i}`} style={{ color: last ? 'var(--gp-fg)' : 'var(--gp-fg-muted)', whiteSpace: 'nowrap', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{c.label}</span>;
        return (
          <React.Fragment key={i}>
            {node}
            {!last && <span style={{ opacity: 0.5 }}>/</span>}
          </React.Fragment>
        );
      })}
    </div>
  );
};

/* GP_StatusChip — dot + label pill. tone='primary' (active, lime) | 'secondary' (forming/upcoming, gold).
   size='sm' (default) | 'lg'. children = visible label. */
const GP_StatusChip = ({ tone = 'primary', size = 'sm', children, style }) => {
  const isPrimary = tone === 'primary';
  const fg = isPrimary ? 'var(--gp-primary)' : 'var(--gp-secondary)';
  const bg = isPrimary ? 'rgba(184,232,53,0.12)' : 'rgba(240,220,160,0.10)';
  const bd = isPrimary ? 'rgba(184,232,53,0.42)' : 'rgba(240,220,160,0.32)';
  const sizes = size === 'lg'
    ? { pad: '5px 12px', fs: 11 }
    : { pad: '3px 10px', fs: 10 };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: sizes.pad,
      borderRadius: 'var(--gp-radius-pill)',
      background: bg,
      border: `1px solid ${bd}`,
      fontFamily: 'var(--gp-font-body)',
      fontSize: sizes.fs, fontWeight: 700,
      letterSpacing: '0.1em', textTransform: 'uppercase',
      color: fg,
      ...style,
    }}>
      <span aria-hidden="true" style={{
        width: 6, height: 6, borderRadius: '50%',
        background: fg,
        boxShadow: isPrimary ? '0 0 6px rgba(184,232,53,0.65)' : 'none',
      }} />
      {children}
    </span>
  );
};

/* GP_Chip — pill chip. Used for filters, topic tags, tech labels, etc.
   tone='outline' (default) | 'soft-lime' | 'soft-gold' | 'fill-lime'
   active=true is a shortcut for tone='fill-lime'. */
const GP_Chip = ({ children, tone = 'outline', active, size = 'md', mono = false, style, onClick, ...rest }) => {
  const t = active ? 'fill-lime' : tone;
  const sizes = size === 'sm'
    ? { h: 22, pad: '0 10px', fs: 11 }
    : size === 'lg'
    ? { h: 36, pad: '0 16px', fs: 13 }
    : { h: 30, pad: '0 14px', fs: 13 };
  let bg = 'transparent', color = 'var(--gp-fg-muted)', border = 'var(--gp-border)';
  if (t === 'soft-lime') { bg = 'rgba(184,232,53,0.12)'; color = 'var(--gp-primary)'; border = 'rgba(184,232,53,0.42)'; }
  if (t === 'soft-gold') { bg = 'rgba(240,220,160,0.10)'; color = 'var(--gp-secondary)'; border = 'rgba(240,220,160,0.32)'; }
  if (t === 'fill-lime') { bg = 'var(--gp-primary)'; color = 'var(--gp-primary-fg)'; border = 'var(--gp-primary)'; }
  const Tag = onClick ? 'button' : 'span';
  return (
    <Tag
      {...rest}
      onClick={onClick}
      style={{
        appearance: 'none',
        display: 'inline-flex', alignItems: 'center', gap: 6,
        height: sizes.h, padding: sizes.pad,
        borderRadius: 'var(--gp-radius-pill)',
        background: bg,
        border: `1px solid ${border}`,
        color,
        fontFamily: mono ? 'var(--gp-font-mono)' : 'var(--gp-font-body)',
        fontSize: sizes.fs,
        fontWeight: mono ? 600 : 600,
        letterSpacing: mono ? '0.08em' : '0.005em',
        textTransform: mono ? 'uppercase' : 'none',
        cursor: onClick ? 'pointer' : 'default',
        whiteSpace: 'nowrap',
        transition: 'background 180ms cubic-bezier(0.22, 1, 0.36, 1), color 180ms, border-color 180ms',
        ...style,
      }}
    >{children}</Tag>
  );
};

/* GP_Meta — mono inline overline line. Pass array of strings; renders with " · " dividers.
   Canonical inline-meta spec: 10px / 0.12em / mono / uppercase / fg-dim. */
const GP_Meta = ({ items = [], size = 10, color = 'var(--gp-fg-dim)', accentIndex, style }) => (
  <div style={{
    display: 'inline-flex', alignItems: 'center', gap: 8,
    fontFamily: 'var(--gp-font-mono)',
    fontSize: size,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color,
    ...style,
  }}>
    {items.map((it, i) => (
      <React.Fragment key={i}>
        <span style={{
          color: i === accentIndex ? 'var(--gp-primary)' : 'inherit',
        }}>{it}</span>
        {i < items.length - 1 && <span aria-hidden="true" style={{ opacity: 0.5 }}>·</span>}
      </React.Fragment>
    ))}
  </div>
);

/* GP_LinkRow — icon-badge + label/sub + handle-arrow link. Used for
   social handles, connect blocks, etc. shape='circle' (44px disc) |
   'pill' (auto-width, label-style). */
const GP_LinkRow = ({ glyph, label, sub, handle, href = '#', shape = 'circle', last, style }) => {
  const isPill = shape === 'pill';
  return (
    <a href={href} style={{
      display: 'flex', alignItems: 'center', gap: 18,
      padding: '18px 4px',
      borderBottom: last ? 'none' : '1px solid var(--gp-border-soft)',
      textDecoration: 'none', color: 'var(--gp-fg)',
      transition: 'background 180ms',
      ...style,
    }}
    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(184,232,53,0.04)'; }}
    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      <div style={{
        flex: 'none',
        minWidth: 44, height: 44,
        width: isPill ? 'auto' : 44,
        padding: isPill ? '0 12px' : 0,
        borderRadius: 'var(--gp-radius-pill)',
        background: 'var(--gp-primary)',
        color: 'var(--gp-primary-fg)',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--gp-font-mono)',
        fontWeight: 700, fontSize: 13,
        letterSpacing: '0.06em',
      }}>{glyph}</div>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{
          fontFamily: 'var(--gp-font-display)',
          fontVariationSettings: 'var(--gp-display-vs)',
          fontSize: 17, fontWeight: 500,
          color: 'var(--gp-secondary)',
        }}>{label}</span>
        {sub && <span style={{ fontSize: 12, color: 'var(--gp-fg-muted)' }}>{sub}</span>}
      </div>
      {handle && (
        <span style={{
          fontSize: 12, fontWeight: 600,
          color: 'var(--gp-primary)', flex: 'none',
        }}>{handle} {'\u2192'}</span>
      )}
    </a>
  );
};

/* GP_RailArrows — round outline ‹ › pair for horizontal carousels. */
const GP_RailArrows = ({ onPrev, onNext, style }) => (
  <div style={{ display: 'flex', gap: 8, ...style }}>
    {[['\u2039', onPrev], ['\u203a', onNext]].map(([c, fn], i) => (
      <button key={i} onClick={fn} style={{
        appearance: 'none', border: '1px solid var(--gp-border)',
        background: 'transparent',
        width: 40, height: 40, borderRadius: '50%',
        color: 'var(--gp-fg)', fontSize: 18, cursor: 'pointer',
        fontFamily: 'var(--gp-font-body)',
        transition: 'background 180ms, border-color 180ms',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(184,232,53,0.4)'; e.currentTarget.style.background = 'var(--gp-green-800)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--gp-border)'; e.currentTarget.style.background = 'transparent'; }}
      >{c}</button>
    ))}
  </div>
);

/* GP_CtaStrip — the unified "Don't see your city / Have a story / Join the guild"
   bottom-of-page surface. Two tones:
     tone='lift'  — green-800 surface with corner glow (default; replaces ChStartStrip)
     tone='soft'  — transparent w/ hairline top border (replaces StSubmitStrip)
   Body is optional. Children render on the right as CTA buttons. */
const GP_CtaStrip = ({ bp, overline, title, body, children, tone = 'lift', style }) => {
  const mobile = bp === 'mobile';
  const isLift = tone === 'lift';
  return (
    <div style={{
      margin: isLift ? (mobile ? '40px 0 0' : '64px 0 0') : 0,
      padding: isLift
        ? (mobile ? '40px 24px' : '64px 56px')
        : (mobile ? '32px 0' : '40px 0'),
      background: isLift ? 'var(--gp-green-800)' : 'transparent',
      border: isLift ? '1px solid var(--gp-border-soft)' : 'none',
      borderTop: isLift ? '1px solid var(--gp-border-soft)' : '1px solid var(--gp-border-soft)',
      borderRadius: isLift ? 'var(--gp-radius-xl)' : 0,
      display: 'flex',
      flexDirection: mobile ? 'column' : 'row',
      alignItems: mobile ? 'flex-start' : (isLift ? 'center' : 'flex-end'),
      justifyContent: 'space-between',
      gap: mobile ? 20 : 32,
      position: 'relative',
      overflow: 'hidden',
      ...style,
    }}>
      {isLift && (
        <div aria-hidden="true" style={{
          position: 'absolute', top: -120, right: -120,
          width: 320, height: 320,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(184,232,53,0.16), transparent 65%)',
          pointerEvents: 'none',
        }} />
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 620, position: 'relative' }}>
        {overline && <GP_Overline>{overline}</GP_Overline>}
        <GP_H2 size={mobile ? 26 : 'clamp(28px, 3vw, 38px)'}>{title}</GP_H2>
        {body && <GP_Body size={14} style={{ color: 'var(--gp-fg-muted)' }}>{body}</GP_Body>}
      </div>
      <div style={{ display: 'flex', gap: 12, position: 'relative', flexWrap: 'wrap' }}>
        {children}
      </div>
    </div>
  );
};

Object.assign(window, {
  detectGpBp, useGpAutoBp, useGpRawMode, GpViewToggle,
  GP_Display, GP_H1, GP_H2, GP_H3, GP_Body, GP_Overline, GP_Mute, GP_Caption, GP_Mono,
  GP_PrimaryButton, GP_GhostButton, GP_ArrowLink,
  GP_useInset, GP_Page, GP_Section, GP_SectionHeader,
  GP_Header, GP_Footer, GP_NAV_ITEMS,
  GP_PlaceImg, GP_CanvasNote,
  GP_Frame,
  /* Shared atoms */
  GP_Avatar, GP_AvatarStack, GP_Breadcrumb, GP_StatusChip, GP_Chip, GP_Meta,
  GP_LinkRow, GP_RailArrows, GP_CtaStrip,
});
