/* hifi/cd-page.jsx — Chapter Detail page composition + responsive frame. */

const CdPage = ({
  bp, fontKey,
  hero,             // 'landscape' | 'fullbleed' | 'typographic' | 'statstrip'
  storiesLayout,   // 'rows' | 'cards' | 'magazine'
  stewardsLayout,  // 'grid' | 'scroll' | 'portrait'
  showEvents, showLibrary, showRelated, showMap,
}) => {
  return (
    <HF_DirectionContext.Provider value={HF_DIRECTIONS.C}>
      <div className="cd-page" style={{
        position: 'relative',
        background: 'var(--gp-green-900)',
        color: 'var(--gp-fg)',
        fontFamily: 'var(--gp-font-body)',
        minHeight: '100%',
        overflow: 'hidden',
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

        <div style={{ position: 'relative', zIndex: 1 }}>
          <GP_Header bp={bp} activeNav="Chapters" />
          <CdBreadcrumb bp={bp} />

          <main>
            {hero === 'landscape'    && <CdHeroLandscape    bp={bp} />}
            {hero === 'fullbleed'    && <CdHeroFullBleed    bp={bp} />}
            {hero === 'typographic'  && <CdHeroTypographic  bp={bp} />}
            {hero === 'statstrip'    && <CdHeroStatStrip    bp={bp} />}

            <CdIntroSection bp={bp} />
            <CdStoriesSection bp={bp} layout={storiesLayout} />
            <CdStewardsSection bp={bp} layout={stewardsLayout} />
            {showEvents  && <CdEventsSection   bp={bp} />}
            {showLibrary && <CdLibrarySection  bp={bp} />}
            {showMap     && <CdLocationSection bp={bp} />}
            <CdConnectSection bp={bp} />
            {showRelated && <CdRelatedSection  bp={bp} />}
          </main>

          <GP_Footer bp={bp} />
        </div>
      </div>
    </HF_DirectionContext.Provider>
  );
};

/* Frame — matches the rest of the gallery. */
const CdFrame = (props) => {
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
        <CdPage {...props} />
      </div>
    </div>
  );
};

Object.assign(window, { CdPage, CdFrame });
