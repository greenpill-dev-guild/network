/* hifi/home-page.jsx — Home page composition.
   - Wraps everything in HF_DirectionContext.Provider value={HF_DIRECTIONS.C}.
   - Reuses GP_Header / GP_Footer from gp-shell.jsx so chrome is identical to Library.
   - Fully responsive (no fixed-width frame). Sections own their padding via CSS.
   --------------------------------------------------------------- */

/* viewport hook — only used to swap the header (hamburger on mobile) */
function useHmBreakpoint() {
  const get = () => {
    if (typeof window === 'undefined') return 'desktop';
    const w = window.innerWidth;
    if (w < 720) return 'mobile';
    if (w < 1100) return 'tablet';
    return 'desktop';
  };
  const [bp, setBp] = React.useState(get);
  React.useEffect(() => {
    const onResize = () => setBp(get());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return bp;
}

const HmHomePage = ({ density = 'medium', motion = 'pulse', forceBp = null }) => {
  const autoBp = useHmBreakpoint();
  const bp = forceBp || autoBp;

  return (
    <HF_DirectionContext.Provider value={HF_DIRECTIONS.C}>
      <div className="hm-page">
        {/* page-wide topographic wash */}
        <div aria-hidden="true" className="hm-page-topo" />

        <div className="hm-page-inner">
          <GP_Header bp={bp} activeNav="Home" />

          <main>
            <HmHero density={density} motion={motion} />
            <HmStoriesSection />
            <HmLibrarySection />
            <HmEcosystemSection />
            <HmGardenSection />
          </main>

          <GP_Footer bp={bp} />
        </div>
      </div>
    </HF_DirectionContext.Provider>
  );
};

Object.assign(window, { HmHomePage });
