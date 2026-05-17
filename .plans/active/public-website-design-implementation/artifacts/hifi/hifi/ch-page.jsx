/* hifi/ch-page.jsx — Chapter Index page composition + responsive frame. */

const ChPage = ({ bp, hero, mapTreatment, density, featuredMode, grouped, fontKey }) => {
  const [region, setRegion] = React.useState('ALL');
  const [statuses, setStatuses] = React.useState(['ACTIVE', 'FORMING']);
  const toggleStatus = (s) => setStatuses(prev =>
    prev.includes(s) ? (prev.length === 1 ? prev : prev.filter(x => x !== s)) : [...prev, s]
  );

  // Reset state when tweaks change so the user lands on a sensible view.
  React.useEffect(() => { setRegion('ALL'); }, [grouped]);

  return (
    <HF_DirectionContext.Provider value={HF_DIRECTIONS.C}>
      <div className="ch-page" style={{
        position: 'relative',
        background: 'var(--gp-green-900)',
        color: 'var(--gp-fg)',
        fontFamily: 'var(--gp-font-body)',
        minHeight: '100%',
        overflow: 'hidden',
      }}>
        {/* page-wide topographic wash */}
        <div aria-hidden="true" style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'url("hifi/assets/topo-bg.png")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.11,
          mixBlendMode: 'overlay',
          pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <GP_Header bp={bp} activeNav="Chapters" />

          <main>
            {hero === 'typographic' && <ChHeroTypographic bp={bp} />}
            {hero === 'imagery'     && <ChHeroImagery     bp={bp} />}
            {hero === 'map'         && <ChHeroMapLed      bp={bp} mapTreatment={mapTreatment === 'none' ? 'mycelial' : mapTreatment} />}

            {/* Standalone map block (only when hero isn't map-led) */}
            {hero !== 'map' && mapTreatment !== 'none' && (
              <div style={{ marginTop: 8 }}>
                <ChMapBlock bp={bp} treatment={mapTreatment} />
              </div>
            )}

            <ChFilterBar
              bp={bp}
              region={region} setRegion={setRegion}
              statuses={statuses} toggleStatus={toggleStatus}
            />

            <ChListSection
              bp={bp}
              region={region}
              statuses={statuses}
              density={density}
              featuredMode={featuredMode}
              grouped={grouped}
            />
          </main>

          <GP_Footer bp={bp} />
        </div>
      </div>
    </HF_DirectionContext.Provider>
  );
};

/* Frame — matches Home/Library: render at native breakpoint width, scale to fit. */
const ChFrame = (props) => {
  const frameW = props.bp === 'mobile' ? 375 : props.bp === 'tablet' ? 1024 : 1440;
  const [scale, setScale] = React.useState(1);
  const [innerH, setInnerH] = React.useState(0);
  const wrapRef = React.useRef(null);
  const innerRef = React.useRef(null);

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

  React.useEffect(() => {
    if (!innerRef.current) return;
    const ro = new ResizeObserver(entries => {
      for (const e of entries) setInnerH(e.contentRect.height);
    });
    ro.observe(innerRef.current);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={wrapRef} style={{
      width: frameW * scale,
      height: innerH * scale || undefined,
      margin: '0 auto',
    }}>
      <div ref={innerRef} style={{
        width: frameW,
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
        boxShadow: '0 20px 80px -20px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04)',
        borderRadius: 4,
        overflow: 'hidden',
      }}>
        <ChPage {...props} />
      </div>
    </div>
  );
};

Object.assign(window, { ChPage, ChFrame });
