/* hifi/st-page.jsx — Stories index page composition + frame. */

const StPage = ({
  bp, fontKey,
  featured,        // 'cinematic' | 'side' | 'type'
  filterStyle,     // 'pills' | 'underlines' | 'dropdown'
  density,         // 'comfortable' | 'compact'
  showSubmit,
  showChapter,
  showTopicSpotlight,
  showTranslations,
  showNewsletter,
}) => {
  return (
    <div className="st-page" style={{
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
        opacity: 0.10,
        mixBlendMode: 'overlay',
        pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <GP_Header bp={bp} activeNav="Stories" />

        <main>
          <StIntroSection bp={bp} />
          <StFeatured bp={bp} treatment={featured} />
          <StSubFeaturesSection bp={bp} />

          {showTopicSpotlight && <StTopicSpotlightSection bp={bp} />}

          <StFeedSection
            bp={bp}
            filterStyle={filterStyle}
            density={density}
            showChapter={showChapter}
          />

          {showTranslations && <StTranslationsSection bp={bp} />}
          {showNewsletter && <StNewsletterSection bp={bp} />}
          {showSubmit && <StSubmitSection bp={bp} />}
        </main>

        <GP_Footer bp={bp} />
      </div>
    </div>
  );
};

/* --- Responsive frame --- */
const StFrame = (props) => {
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
        <StPage {...props} />
      </div>
    </div>
  );
};

Object.assign(window, { StPage, StFrame });
