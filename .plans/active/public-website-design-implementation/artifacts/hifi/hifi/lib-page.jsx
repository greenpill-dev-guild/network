/* hifi/lib-page.jsx — full Library page composition.
   Locked to direction C in production. The other directions are still
   reachable for future explorations (kept in HF_DIRECTIONS) but the page
   tweak panel no longer surfaces them.

   Header + footer are unified with the rest of the site (GP_Header /
   GP_Footer). The footer's wordmark column toggles on for directions that
   ask for it (A · Editorial, D · Mono). */

const HFHero = ({ inset, bp, override }) => {
  const dir = useDirection();
  const which = override && override !== 'auto' ? override : dir.hero;
  if (which === 'editorial') return <HFHeroEditorial inset={inset} bp={bp} />;
  if (which === 'featured')  return <HFHeroFeatured  inset={inset} bp={bp} />;
  if (which === 'iconic')    return <HFHeroIconic    inset={inset} bp={bp} />;
  if (which === 'mono')      return <HFHeroMono      inset={inset} bp={bp} />;
  return <HFHeroEditorial inset={inset} bp={bp} />;
};

/* --- Section wrapper. In direction B we alternate surface tones; otherwise
   sections share the page bg with the topo wash. */

const HFSection = ({ children, inset, bp, mood = 'page', last }) => {
  const dir = useDirection();
  let bg = 'transparent';
  let withTopo = false;

  if (dir.key === 'B') {
    if (mood === 'lift')  { bg = 'var(--gp-green-800)';  withTopo = false; }
    if (mood === 'card')  { bg = 'var(--gp-green-700)';  withTopo = false; }
  }

  return (
    <section style={{
      position: 'relative',
      background: bg,
      padding: bp === 'mobile'
        ? `48px 20px ${last ? 24 : 48}px`
        : `${dir.sectionPad}px ${inset}px ${last ? Math.max(40, dir.sectionPad - 32) : dir.sectionPad}px`,
    }}>
      {withTopo && (
        <div aria-hidden="true" style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'url("hifi/assets/topo-bg.png")',
          backgroundSize: 'cover',
          opacity: 0.08,
          mixBlendMode: 'overlay',
          pointerEvents: 'none',
        }} />
      )}
      <div style={{ position: 'relative' }}>
        {children}
      </div>
    </section>
  );
};

/* --- Hairline divider for direction D (mono) --- */

const HFDivider = ({ inset, bp }) => (
  <div style={{
    padding: bp === 'mobile' ? '0 20px' : `0 ${inset}px`,
  }}>
    <div style={{ height: 1, background: 'rgba(240,220,160,0.18)' }} />
  </div>
);

/* --- The page --- */

const HFLibraryPage = ({ direction = 'C', breakpoint, heroOverride }) => {
  const dir = HF_DIRECTIONS[direction] || HF_DIRECTIONS.C;
  const bp = breakpoint;
  const inset = useInset(bp);

  return (
    <HF_DirectionContext.Provider value={dir}>
      <div style={{
        position: 'relative',
        background: dir.pageBg,
        color: 'var(--gp-fg)',
        fontFamily: 'var(--gp-font-body)',
        minHeight: '100%',
        overflow: 'hidden',
      }}>
        {/* page topographic wash */}
        {dir.topoOnPage && (
          <div aria-hidden="true" style={{
            position: 'absolute', inset: 0,
            backgroundImage: 'url("hifi/assets/topo-bg.png")',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: dir.key === 'D' ? 0.08 : 0.11,
            mixBlendMode: 'overlay',
            pointerEvents: 'none',
          }} />
        )}

        <div style={{ position: 'relative', zIndex: 1 }}>
          <GP_Header bp={bp} activeNav="Library" />
          <HFHero inset={inset} bp={bp} override={heroOverride} />

          {dir.key === 'D' && <HFDivider inset={inset} bp={bp} />}

          <HFSection inset={inset} bp={bp} mood={dir.key === 'B' ? 'lift' : 'page'}>
            <HFBooksSection inset={inset} bp={bp} />
          </HFSection>

          {dir.key === 'D' && <HFDivider inset={inset} bp={bp} />}

          <HFSection inset={inset} bp={bp} mood="page">
            <HFPodcastSection inset={inset} bp={bp} />
          </HFSection>

          {dir.key === 'D' && <HFDivider inset={inset} bp={bp} />}

          <HFSection inset={inset} bp={bp} mood={dir.key === 'B' ? 'card' : 'page'} last>
            <HFBentoSection inset={inset} bp={bp} />
          </HFSection>

          <GP_Footer bp={bp} showWordmark={dir.showWordmarkFooter} />
        </div>
      </div>
    </HF_DirectionContext.Provider>
  );
};

/* --- Responsive scaler: the Library renders at its native frame width
   (1440 / 1024 / 375) and scales down to fit the viewport. */

const HFFrame = ({ direction, breakpoint, heroOverride }) => {
  const frameW = breakpoint === 'mobile' ? 375 : breakpoint === 'tablet' ? 1024 : 1440;
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
    <div ref={wrapRef} style={{
      width: frameW * scale,
      margin: '0 auto',
    }}>
      <div style={{
        width: frameW,
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
        boxShadow: '0 20px 80px -20px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04)',
        borderRadius: 4,
        overflow: 'hidden',
      }}>
        <HFLibraryPage
          direction={direction}
          breakpoint={breakpoint}
          heroOverride={heroOverride}
        />
      </div>
    </div>
  );
};

Object.assign(window, { HFLibraryPage, HFFrame });
