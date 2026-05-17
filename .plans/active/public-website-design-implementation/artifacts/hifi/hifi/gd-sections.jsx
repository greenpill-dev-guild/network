/* hifi/gd-sections.jsx — Garden page sections.
   Composes the bits into the Hero, the per-step blocks (with 4 layout
   variants), the ramp-scale strip, and the After-the-Garden cards. */

/* ────────────────────────────────────────────────────────────────
   Hero — "Enter the garden."
   Four variants:
     - typographic : type only, oversized headline
     - pill        : 3D pill capsule motif on right
     - globe       : coordination globe on right
     - photo       : full-bleed garden photo with overlay text
   ──────────────────────────────────────────────────────────────── */

const GD_Hero = ({ bp, variant = 'typographic', accentMix = 'balanced' }) => {
  const inset = GP_useInset(bp);

  const eyebrow = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={{
        width: 6, height: 6, borderRadius: 999,
        background: 'var(--gp-primary)',
        boxShadow: '0 0 10px rgba(184,232,53,0.7)',
      }} />
      <GP_Mono>Garden · the participation ramp</GP_Mono>
    </div>
  );

  /* Display headline — the single hero typographic moment. */
  const headlineSize = bp === 'mobile' ? 44 : bp === 'tablet' ? 72 : 96;
  const headline = (
    <h1 style={{
      fontFamily: 'var(--gp-font-display)',
      fontWeight: 500,
      fontSize: headlineSize,
      lineHeight: 1.02,
      letterSpacing: '-0.02em',
      fontVariationSettings: 'var(--gp-display-vs)',
      color: 'var(--gp-secondary)',
      margin: 0,
      textWrap: 'pretty',
    }}>
      Enter the<br />
      <span style={{
        fontStyle: 'italic',
        color: accentMix === 'chartreuse' ? 'var(--gp-primary)' : 'var(--gp-secondary)',
      }}>garden.</span>
    </h1>
  );

  const sub = (
    <GP_Body size={bp === 'mobile' ? 16 : 19} style={{ maxWidth: 580, color: 'var(--gp-fg-muted)' }}>
      Four ways to meet the network where you are — from a single email to a face-to-face conversation. Pick whichever pace fits.
    </GP_Body>
  );

  /* ── PHOTO variant — full-bleed dark hero with overlay text ─────── */
  if (variant === 'photo') {
    return (
      <section style={{
        position: 'relative',
        padding: bp === 'mobile' ? '0' : `0 ${inset}px`,
        marginBottom: bp === 'mobile' ? 24 : 56,
      }}>
        <div style={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: bp === 'mobile' ? 0 : 'var(--gp-radius-xl)',
          minHeight: bp === 'mobile' ? 520 : bp === 'tablet' ? 560 : 640,
          padding: bp === 'mobile' ? '88px 24px 56px' : '120px 80px 80px',
          background: 'var(--gp-green-800)',
        }}>
          {/* simulated garden photo */}
          <div aria-hidden="true" style={{
            position: 'absolute', inset: 0,
            background:
              'radial-gradient(ellipse at 20% 80%, rgba(184,232,53,0.16), transparent 55%),' +
              'radial-gradient(ellipse at 80% 20%, rgba(240,220,160,0.18), transparent 55%),' +
              'radial-gradient(ellipse at 50% 100%, rgba(35,92,70,0.6), transparent 70%),' +
              'linear-gradient(180deg, var(--gp-green-900), var(--gp-green-950))',
          }} />
          <div aria-hidden="true" style={{
            position: 'absolute', inset: 0,
            backgroundImage: 'url("hifi/assets/topo-bg.png")',
            backgroundSize: 'cover',
            opacity: 0.22,
            mixBlendMode: 'overlay',
          }} />
          {/* faint contour rings */}
          <svg aria-hidden="true" style={{ position: 'absolute', right: -120, bottom: -120, opacity: 0.18 }}
               width="540" height="540" viewBox="0 0 540 540">
            {[40, 90, 140, 200, 270, 350].map((r, i) => (
              <circle key={i} cx="270" cy="270" r={r} fill="none"
                stroke="var(--gp-primary)" strokeWidth={1} opacity={0.8 - i * 0.1} />
            ))}
          </svg>

          <div style={{ position: 'relative', maxWidth: 760, display: 'flex', flexDirection: 'column', gap: 28 }}>
            {eyebrow}
            {headline}
            {sub}
          </div>
        </div>
      </section>
    );
  }

  /* ── PILL / GLOBE variants — split layout with motif on right ──── */
  if (variant === 'pill' || variant === 'globe') {
    const asset = variant === 'pill' ? 'hifi/assets/pill-motif.png' : 'hifi/assets/coordination-globe.png';
    return (
      <section style={{
        padding: bp === 'mobile' ? '36px 20px 16px' : `${bp === 'tablet' ? 80 : 112}px ${inset}px 56px`,
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: bp === 'mobile' ? '1fr' : '1.2fr 0.8fr',
          gap: bp === 'mobile' ? 28 : 48,
          alignItems: 'center',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: bp === 'mobile' ? 18 : 28 }}>
            {eyebrow}
            {headline}
            {sub}
          </div>
          <div style={{
            position: 'relative',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            minHeight: bp === 'mobile' ? 260 : 360,
          }}>
            {/* glow */}
            <div aria-hidden="true" style={{
              position: 'absolute', inset: '12%',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(184,232,53,0.32), transparent 65%)',
              filter: 'blur(36px)',
            }} />
            <img src={asset}
                 alt={variant === 'pill' ? 'Greenpill capsule' : 'Coordination globe'}
                 style={{
                   position: 'relative',
                   maxWidth: '100%',
                   maxHeight: bp === 'mobile' ? 260 : 420,
                   filter: 'drop-shadow(-7px 7px 28px rgba(22,50,31,0.6))',
                 }} />
          </div>
        </div>
      </section>
    );
  }

  /* ── TYPOGRAPHIC (default) — type only, oversized ────────────── */
  return (
    <section style={{
      padding: bp === 'mobile' ? '40px 20px 8px' : `${bp === 'tablet' ? 96 : 128}px ${inset}px 56px`,
    }}>
      <div style={{ maxWidth: 980, display: 'flex', flexDirection: 'column', gap: bp === 'mobile' ? 18 : 36 }}>
        {eyebrow}
        {headline}
        {sub}
      </div>
    </section>
  );
};

/* ────────────────────────────────────────────────────────────────
   Ramp scale — the "less commitment ←→ more commitment" strip
   placed under the hero. Two modes: bar (default) or growth (glyphs).
   ──────────────────────────────────────────────────────────────── */

const GD_RampScale = ({ bp, mode = 'bar' }) => {
  const inset = GP_useInset(bp);
  return (
    <div style={{
      padding: bp === 'mobile' ? '8px 20px 24px' : `8px ${inset}px 36px`,
      borderBottom: '1px solid var(--gp-border-soft)',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: bp === 'mobile' ? 12 : 22,
      }}>
        <GP_Mono style={{ whiteSpace: 'nowrap' }}>Less commitment</GP_Mono>
        <div style={{ flex: 1, position: 'relative' }}>
          {mode === 'bar' && (
            <>
              <div style={{
                height: 1,
                background: 'linear-gradient(90deg, rgba(42,107,82,0.6), rgba(184,232,53,0.7))',
              }} />
              {[12.5, 37.5, 62.5, 87.5].map((p, i) => (
                <div key={i} style={{
                  position: 'absolute', left: `${p}%`, top: -5,
                  width: 10, height: 10, borderRadius: '50%',
                  background: 'var(--gp-green-900)',
                  border: `1px solid ${i === 3 ? 'var(--gp-primary)' : 'var(--gp-border)'}`,
                  transform: 'translateX(-50%)',
                  boxShadow: i === 3 ? '0 0 12px rgba(184,232,53,0.6)' : 'none',
                }} />
              ))}
            </>
          )}
          {mode === 'growth' && (
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '0 16px',
            }}>
              {['seed', 'sapling', 'budding', 'flowering'].map(s => (
                <GD_GrowthGlyph key={s} stage={s} size={36} withDisc={false} glow={false} />
              ))}
            </div>
          )}
          {mode === 'elevation' && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              {[1, 2, 3, 4].map(l => <GD_ElevationLine key={l} level={l} />)}
            </div>
          )}
        </div>
        <GP_Mono style={{ whiteSpace: 'nowrap' }}>More commitment</GP_Mono>
      </div>
    </div>
  );
};

/* ────────────────────────────────────────────────────────────────
   Indicator — chooses the per-step friction visual.
   ──────────────────────────────────────────────────────────────── */
const GD_Indicator = ({ kind, level, stage }) => {
  if (kind === 'none') return null;
  if (kind === 'growth') return <GD_GrowthGlyph stage={stage} size={72} />;
  if (kind === 'elevation') return <GD_ElevationLine level={level} />;
  /* bar (default) */
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <GD_FrictionBar level={level} />
      <GP_Mono style={{ fontSize: 9 }}>
        {level === 1 ? 'Lowest friction' : level === 4 ? 'Highest friction' : level === 2 ? 'Light friction' : 'Medium friction'}
      </GP_Mono>
    </div>
  );
};

/* ────────────────────────────────────────────────────────────────
   Step block — FOUR layout variants matching the SVG options shown
   in the question form.
     1 = stripe-rail  (chartreuse vertical stripe + 2 col)
     2 = stacked     (header row, surface below full-width)
     3 = three-col   (numeric badge | text | surface — wireframe-ish)
     4 = card        (unified mid-forest card, surface inset)
   ──────────────────────────────────────────────────────────────── */

const GD_Step = ({ step, bp, layout = 'card', indicator = 'bars', last, ctaPlacement = 'inline' }) => {
  /* Mobile collapses every layout to a single column. */
  if (bp === 'mobile') return <GD_StepMobile step={step} indicator={indicator} last={last} />;

  /* Header pieces shared across desktop layouts. */
  const numeral = <GD_StepNumber n={step.n} of={GD_STEPS.length} size={layout === 'card' ? 64 : 72} />;
  const indicatorEl = <GD_Indicator kind={indicator} level={step.level} stage={step.stage} />;

  const headerText = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <GP_Overline>{step.kicker}</GP_Overline>
      <GP_H2 size={layout === 'stacked' ? 'clamp(34px, 4vw, 48px)' : 32}>{step.title}</GP_H2>
      <GP_Body size={15} style={{ maxWidth: 560 }}>{step.body}</GP_Body>
      <GP_Mono style={{ marginTop: 4 }}>{step.meta}</GP_Mono>
      {(ctaPlacement === 'inline' || ctaPlacement === 'both') &&
        <div style={{ marginTop: 12 }}><GD_InlineCTA label={step.cta} /></div>}
    </div>
  );

  /* ── VARIANT 4 · CARD ─────────────────────────────────────────── */
  if (layout === 'card') {
    return (
      <article style={{
        position: 'relative',
        background: 'var(--gp-green-700)',
        border: '1px solid var(--gp-border-soft)',
        borderRadius: 'var(--gp-radius-xl)',
        padding: bp === 'tablet' ? '32px 32px 36px' : '40px 48px 44px',
        marginBottom: last ? 0 : 24,
        overflow: 'hidden',
      }}>
        {/* faint topo wash inside card */}
        <div aria-hidden="true" style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'url("hifi/assets/topo-bg.png")',
          backgroundSize: 'cover',
          opacity: 0.05, mixBlendMode: 'overlay', pointerEvents: 'none',
        }} />
        <div style={{
          position: 'relative',
          display: 'grid',
          gridTemplateColumns: '0.95fr 1.1fr',
          gap: 48,
          alignItems: 'flex-start',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, justifyContent: 'space-between' }}>
              {numeral}
              {indicator === 'growth' ? null : indicatorEl}
            </div>
            {indicator === 'growth' && (
              <div style={{ marginTop: -4 }}>
                <GD_GrowthGlyph stage={step.stage} size={88} />
              </div>
            )}
            {headerText}
          </div>
          <div>{GD_Surface ? <GD_Surface kind={step.surface} /> : null}</div>
        </div>
      </article>
    );
  }

  /* ── VARIANT 1 · STRIPE-RAIL ──────────────────────────────────── */
  if (layout === 'stripe') {
    return (
      <article style={{
        display: 'grid',
        gridTemplateColumns: 'auto 1fr 1.1fr',
        gap: 40,
        alignItems: 'flex-start',
        padding: '40px 0',
        borderBottom: last ? 'none' : '1px solid var(--gp-border-soft)',
      }}>
        {/* vertical chartreuse stripe with growth glyph */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
          width: 56,
        }}>
          <GD_GrowthGlyph stage={step.stage} size={48} withDisc={false} glow={false} />
          <div style={{
            width: 4, flex: 1, minHeight: 160,
            background: 'linear-gradient(180deg, var(--gp-primary), rgba(184,232,53,0.15))',
            borderRadius: 999,
            boxShadow: '0 0 18px -4px rgba(184,232,53,0.5)',
          }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {numeral}
          {indicatorEl}
          {headerText}
        </div>
        <div>{GD_Surface ? <GD_Surface kind={step.surface} /> : null}</div>
      </article>
    );
  }

  /* ── VARIANT 2 · STACKED ──────────────────────────────────────── */
  if (layout === 'stacked') {
    return (
      <article style={{
        padding: '48px 0',
        borderBottom: last ? 'none' : '1px solid var(--gp-border-soft)',
        display: 'flex', flexDirection: 'column', gap: 36,
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'auto 1fr auto',
          gap: 40,
          alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <GD_GrowthGlyph stage={step.stage} size={72} />
            {numeral}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <GP_Overline>{step.kicker}</GP_Overline>
            <GP_H2 size="clamp(34px, 4vw, 48px)">{step.title}</GP_H2>
          </div>
          <div>{indicatorEl}</div>
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1.2fr',
          gap: 40, alignItems: 'flex-start',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 4 }}>
            <GP_Body size={16} style={{ maxWidth: 520 }}>{step.body}</GP_Body>
            <GP_Mono>{step.meta}</GP_Mono>
            {(ctaPlacement === 'inline' || ctaPlacement === 'both') &&
              <div style={{ marginTop: 12 }}><GD_InlineCTA label={step.cta} /></div>}
          </div>
          <div>{GD_Surface ? <GD_Surface kind={step.surface} /> : null}</div>
        </div>
      </article>
    );
  }

  /* ── VARIANT 3 · THREE-COL (wireframe-ish, refined) ───────────── */
  /* default fallback */
  return (
    <article style={{
      display: 'grid',
      gridTemplateColumns: 'auto 1.05fr 1.2fr',
      gap: 48,
      alignItems: 'flex-start',
      padding: '52px 0',
      borderBottom: last ? 'none' : '1px solid var(--gp-border-soft)',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18, width: 132 }}>
        <GD_GrowthGlyph stage={step.stage} size={72} />
        {numeral}
        {indicator !== 'growth' && indicatorEl}
      </div>
      {headerText}
      <div>{GD_Surface ? <GD_Surface kind={step.surface} /> : null}</div>
    </article>
  );
};

/* Mobile step — single column. */
const GD_StepMobile = ({ step, indicator, last }) => (
  <article style={{
    padding: '32px 0',
    borderBottom: last ? 'none' : '1px solid var(--gp-border-soft)',
    display: 'flex', flexDirection: 'column', gap: 14,
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <GD_GrowthGlyph stage={step.stage} size={56} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <GD_StepNumber n={step.n} of={GD_STEPS.length} size={36} />
        {indicator !== 'none' && indicator !== 'growth' && (
          <GD_FrictionBar level={step.level} width={14} height={4} />
        )}
      </div>
    </div>
    <GP_Overline>{step.kicker}</GP_Overline>
    <GP_H2 size={26}>{step.title}</GP_H2>
    <GP_Body size={14}>{step.body}</GP_Body>
    <GP_Mono>{step.meta}</GP_Mono>
    <div style={{ marginTop: 4 }}><GD_Surface kind={step.surface} /></div>
  </article>
);

/* ────────────────────────────────────────────────────────────────
   After the garden — three small cards.
   ──────────────────────────────────────────────────────────────── */

const GD_AfterGarden = ({ bp }) => (
  <div>
    <div style={{
      display: 'flex',
      flexDirection: bp === 'mobile' ? 'column' : 'row',
      justifyContent: 'space-between',
      alignItems: bp === 'mobile' ? 'flex-start' : 'flex-end',
      gap: bp === 'mobile' ? 14 : 32,
      marginBottom: bp === 'mobile' ? 24 : 40,
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 640 }}>
        <GP_Overline>After the garden</GP_Overline>
        <GP_H2 size={bp === 'mobile' ? 26 : 'clamp(32px, 3.4vw, 44px)'}>What happens next</GP_H2>
        <GP_Body size={bp === 'mobile' ? 14 : 16} style={{ color: 'var(--gp-fg-muted)' }}>
          Most people stop at step 1 or 2 — that's fine. For those who want more, here's where each path leads.
        </GP_Body>
      </div>
    </div>
    <div style={{
      display: 'grid',
      gridTemplateColumns: bp === 'mobile' ? '1fr' : 'repeat(3, 1fr)',
      gap: bp === 'mobile' ? 14 : 20,
    }}>
      {GD_AFTER.map((p, i) => (
        <a key={i} href={p.href} style={{
          textDecoration: 'none',
          background: 'var(--gp-green-700)',
          border: '1px solid var(--gp-border-soft)',
          borderRadius: 'var(--gp-radius-lg)',
          padding: bp === 'mobile' ? 22 : 28,
          display: 'flex', flexDirection: 'column', gap: 12,
          minHeight: bp === 'mobile' ? 0 : 220,
          transition: 'border-color 200ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
        onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(184,232,53,0.32)'}
        onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(42,107,82,0.4)'}
        >
          <GP_Overline>{p.kicker}</GP_Overline>
          <GP_H3 size={bp === 'mobile' ? 20 : 24}>{p.title}</GP_H3>
          <GP_Body size={14} style={{ color: 'var(--gp-fg-muted)', flex: 1 }}>{p.body}</GP_Body>
          <span style={{
            fontFamily: 'var(--gp-font-body)',
            fontSize: 14, fontWeight: 600,
            color: 'var(--gp-primary)',
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}>{p.link} <span aria-hidden="true">→</span></span>
        </a>
      ))}
    </div>
  </div>
);

/* ────────────────────────────────────────────────────────────────
   Sticky bottom CTA — a thin pill that follows the page when
   `ctaPlacement === 'sticky'` or `'both'`. Stays inside the frame
   bottom (relative position; no fixed positioning so it works in
   the scaled hi-fi frame).
   ──────────────────────────────────────────────────────────────── */

const GD_StickyCTA = ({ bp }) => {
  const inset = GP_useInset(bp);
  return (
    <div style={{
      position: 'sticky',
      bottom: bp === 'mobile' ? 16 : 24,
      zIndex: 4,
      padding: bp === 'mobile' ? '0 20px' : `0 ${inset}px`,
      pointerEvents: 'none',
      marginTop: 24,
    }}>
      <div style={{
        margin: '0 auto',
        maxWidth: 720,
        pointerEvents: 'auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        background: 'rgba(15, 61, 46, 0.92)',
        border: '1px solid var(--gp-border)',
        borderRadius: 'var(--gp-radius-pill)',
        padding: bp === 'mobile' ? '10px 14px 10px 20px' : '12px 16px 12px 28px',
        boxShadow: '0 18px 60px -20px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.03)',
        backdropFilter: 'blur(8px)',
      }}>
        <span style={{
          fontFamily: 'var(--gp-font-body)', fontSize: 13, fontWeight: 600,
          color: 'var(--gp-fg)',
        }}>Not sure where to start?</span>
        <button style={{
          appearance: 'none', border: 0,
          background: 'var(--gp-primary)',
          color: 'var(--gp-primary-fg)',
          borderRadius: 'var(--gp-radius-pill)',
          padding: '10px 18px',
          fontFamily: 'var(--gp-font-body)', fontSize: 13, fontWeight: 700,
          cursor: 'pointer',
          boxShadow: '0 0 22px -6px rgba(184,232,53,0.6)',
        }}>Take the assessment →</button>
      </div>
    </div>
  );
};

Object.assign(window, {
  GD_Hero, GD_RampScale, GD_Step, GD_AfterGarden, GD_StickyCTA, GD_Indicator,
});
