/* hifi/gd-page.jsx — Garden page composition.
   Receives tweak state, assembles header / hero / ramp / steps / after / footer
   inside a scaled frame at 1440 / 1024 / 375. */

const GdPage = ({
  bp,
  heroVariant,
  stepLayout,
  indicator,
  rampMode,
  accentMix,
  showAfter,
  showRamp,
  ctaPlacement,
  topoOpacity,
  gardenOverlay,
}) => {
  const inset = GP_useInset(bp);

  return (
    <div style={{
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
        opacity: topoOpacity,
        mixBlendMode: 'overlay',
        pointerEvents: 'none',
      }} />
      {gardenOverlay && (
        <div aria-hidden="true" style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'url("hifi/assets/garden-overlay.jpg")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.18,
          mixBlendMode: 'overlay',
          pointerEvents: 'none',
        }} />
      )}

      <div style={{ position: 'relative', zIndex: 1 }}>
        <GP_Header bp={bp} activeNav="Garden" />

        <GD_Hero bp={bp} variant={heroVariant} accentMix={accentMix} />

        {showRamp && <GD_RampScale bp={bp} mode={rampMode} />}

        {/* steps section */}
        <section style={{
          padding: bp === 'mobile' ? '8px 20px 24px' : `${stepLayout === 'card' ? 56 : 24}px ${inset}px 56px`,
        }}>
          {GD_STEPS.map((s, i) => (
            <GD_Step
              key={s.n}
              step={s}
              bp={bp}
              layout={stepLayout}
              indicator={indicator}
              last={i === GD_STEPS.length - 1}
              ctaPlacement={ctaPlacement}
            />
          ))}
        </section>

        {(ctaPlacement === 'sticky' || ctaPlacement === 'both') &&
          <GD_StickyCTA bp={bp} />}

        {showAfter && (
          <section style={{
            padding: bp === 'mobile' ? '40px 20px 56px' : `80px ${inset}px 96px`,
            borderTop: '1px solid var(--gp-border-soft)',
            marginTop: bp === 'mobile' ? 24 : 40,
          }}>
            <GD_AfterGarden bp={bp} />
          </section>
        )}

        <GP_Footer bp={bp} />
      </div>
    </div>
  );
};

/* Frame: scales the native 1440/1024/375 design down to fit the host. */
const GdFrame = (props) => {
  const frameW = props.bp === 'mobile' ? 375 : props.bp === 'tablet' ? 1024 : 1440;
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
      }}>
        <GdPage {...props} />
      </div>
    </div>
  );
};

Object.assign(window, { GdPage, GdFrame });
