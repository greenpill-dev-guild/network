/* hifi/sd-page.jsx — Story Detail page composition + responsive frame. */

const SdPage = ({
  bp, fontKey,
  hero = 'stacked',
  readingWidth = 'standard',
  dropcap = false,
  pullquoteStyle = 'border',
  showStats = true,
  showTranslations = true,
  showShare = true,
  showAuthorBio = true,
  showContinue, showNewsletter, showSubmit,
}) => {
  return (
    <div className="sd-page" style={{
      position: 'relative',
      background: 'var(--gp-green-900)',
      color: 'var(--gp-fg)',
      fontFamily: 'var(--gp-font-body)',
      minHeight: '100%',
      overflow: 'hidden',
    }}>
      {/* dropcap CSS — only active when the prose paragraph carries the class */}
      <style>{`
        .sd-prose-dropcap-p::first-letter {
          font-family: var(--gp-font-display);
          font-weight: 500;
          font-variation-settings: var(--gp-display-vs);
          color: var(--gp-secondary);
          float: left;
          font-size: 88px;
          line-height: 0.82;
          padding: 6px 14px 0 0;
          letter-spacing: -0.02em;
        }
      `}</style>

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
        <SdBreadcrumb bp={bp} />

        <main>
          <SdArticleHero bp={bp} variant={hero} showShare={showShare} />
          <SdArticleBody
            bp={bp}
            readingWidth={readingWidth}
            dropcap={dropcap}
            pullquoteStyle={pullquoteStyle}
            showStats={showStats}
            showTranslations={showTranslations}
            showShare={showShare}
            showAuthorBio={showAuthorBio}
          />
          {showContinue && <SdContinueReadingSection bp={bp} />}
          {showNewsletter && <SdNewsletterSection bp={bp} />}
          {showSubmit && <SdSubmitSection bp={bp} />}
        </main>

        <GP_Footer bp={bp} />
      </div>
    </div>
  );
};

/* --- Responsive frame --- */
const SdFrame = (props) => {
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
        <SdPage {...props} />
      </div>
    </div>
  );
};

Object.assign(window, { SdPage, SdFrame });
