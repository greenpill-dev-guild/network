/* hifi/gld-page.jsx — Guild Detail page composition + responsive frame.
   Sections are conditional based on tweaks. The hero variant determines whether
   the mandate is part of the hero (mandate-photo / mandate-diagram) or sits in
   its own section (typographic / fullbleed / statstrip).
*/

const GldPage = ({
  bp, fontKey,
  hero,             // 'mandate-photo' | 'mandate-diagram' | 'typographic' | 'fullbleed' | 'statstrip'
  showProjects,
  showMembers,
  showHowWeWork,
}) => {
  /* Whether the hero itself already includes the mandate copy.
     Variants 1 & 2 do; the others need a standalone mandate section. */
  const heroOwnsMandate = hero === 'mandate-photo' || hero === 'mandate-diagram';

  return (
    <HF_DirectionContext.Provider value={HF_DIRECTIONS.C}>
      <div className="gld-page" style={{
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
          <GP_Header bp={bp} activeNav="Garden" />
          <GldBreadcrumb bp={bp} />

          <main>
            {hero === 'mandate-photo'   && <GldHeroMandatePhoto   bp={bp} />}
            {hero === 'mandate-diagram' && <GldHeroMandateDiagram bp={bp} />}
            {hero === 'typographic'     && <GldHeroTypographic    bp={bp} />}
            {hero === 'fullbleed'       && <GldHeroFullBleed      bp={bp} />}
            {hero === 'statstrip'       && <GldHeroStatStrip      bp={bp} />}

            {/* Typographic hero is image-less in the hero, but the diagram is
                so brand-defining we surface it just below as its own section. */}
            {hero === 'typographic'  && <GldDiagramSection bp={bp} />}

            {/* Mandate copy is present in the hero for variants 1 & 2.
                For all other heroes, render it as a section below. */}
            {!heroOwnsMandate && <GldMandateSection bp={bp} />}

            {showProjects   && <GldProjectsSection   bp={bp} />}
            {showHowWeWork  && <GldHowWeWorkSection  bp={bp} />}
            {showMembers    && <GldMembersSection    bp={bp} />}
            <GldConnectSection bp={bp} />
          </main>

          <GP_Footer bp={bp} />
        </div>
      </div>
    </HF_DirectionContext.Provider>
  );
};

/* Responsive frame — matches the rest of the gallery. */
const GldFrame = (props) => {
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
        <GldPage {...props} />
      </div>
    </div>
  );
};

Object.assign(window, { GldPage, GldFrame });
