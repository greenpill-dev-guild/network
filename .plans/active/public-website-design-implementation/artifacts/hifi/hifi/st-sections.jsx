/* hifi/st-sections.jsx — Stories index composed sections. */

/* ---------- Page intro ---------- */

const StIntroSection = ({ bp }) => {
  const mobile = bp === 'mobile';
  const inset = GP_useInset(bp);
  return (
    <section style={{
      padding: mobile ? '36px 20px 24px' : `${72}px ${inset}px 32px`,
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: mobile ? 14 : 22, maxWidth: 880 }}>
        <GP_Overline>{ST_HERO.overline}</GP_Overline>
        <GP_H1
          size={mobile ? 38 : 'clamp(48px, 5.6vw, 84px)'}
          style={{ letterSpacing: '-0.015em', lineHeight: 1.04 }}
        >{ST_HERO.title}</GP_H1>
        <GP_Body size={mobile ? 15 : 17} color="var(--gp-off-white-dim)" style={{ maxWidth: 660 }}>
          {ST_HERO.blurb}
        </GP_Body>
        <div style={{
          marginTop: 6,
          display: 'flex', gap: 28, alignItems: 'baseline',
          flexWrap: 'wrap',
        }}>
          <span style={{
            fontFamily: 'var(--gp-font-mono)', fontSize: 11,
            letterSpacing: '0.12em', textTransform: 'uppercase',
            color: 'var(--gp-fg-dim)',
          }}>{ST_FEED.length + 24} stories</span>
          <span style={{ opacity: 0.4 }}>·</span>
          <span style={{
            fontFamily: 'var(--gp-font-mono)', fontSize: 11,
            letterSpacing: '0.12em', textTransform: 'uppercase',
            color: 'var(--gp-fg-dim)',
          }}>18 chapters contributing</span>
          <span style={{ opacity: 0.4 }}>·</span>
          <span style={{
            fontFamily: 'var(--gp-font-mono)', fontSize: 11,
            letterSpacing: '0.12em', textTransform: 'uppercase',
            color: 'var(--gp-fg-dim)',
          }}>Edited by the Writers Guild</span>
        </div>
      </div>
    </section>
  );
};

/* ---------- Featured story — cinematic full-bleed ---------- */

const StFeaturedCinematic = ({ bp }) => {
  const mobile = bp === 'mobile';
  const inset = GP_useInset(bp);
  const heroH = mobile ? 480 : (bp === 'tablet' ? 580 : 680);
  return (
    <section style={{
      padding: mobile ? '8px 20px 32px' : `12px ${inset}px 48px`,
    }}>
      <a href="Story (Hi-Fi).html" style={{
        position: 'relative', display: 'block',
        height: heroH,
        borderRadius: 'var(--gp-radius-xl)',
        overflow: 'hidden',
        background: 'var(--gp-green-800)',
        textDecoration: 'none', color: 'var(--gp-fg)',
        border: '1px solid var(--gp-border-soft)',
      }}>
        {/* Textured forest backdrop (placeholder for a real photo) */}
        <div aria-hidden="true" style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'url("hifi/assets/topo-bg.png")',
          backgroundSize: 'cover', backgroundPosition: 'center',
          opacity: 0.32,
          mixBlendMode: 'screen',
        }} />
        <div aria-hidden="true" style={{
          position: 'absolute', inset: 0,
          background:
            'radial-gradient(ellipse at 70% 30%, rgba(240,220,160,0.20), transparent 55%), ' +
            'radial-gradient(ellipse at 25% 75%, rgba(184,232,53,0.16), transparent 60%), ' +
            'linear-gradient(135deg, #0c3326 0%, #103e2f 40%, #16513d 100%)',
        }} />
        {/* Bottom-to-top dark gradient so overlay copy stays legible */}
        <div aria-hidden="true" style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(180deg, rgba(10,45,33,0) 30%, rgba(10,45,33,0.55) 65%, rgba(10,45,33,0.92) 100%)',
        }} />
        {/* Photo-tag in the top-right corner */}
        <div style={{
          position: 'absolute', top: mobile ? 16 : 24, right: mobile ? 16 : 28,
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 14px',
          background: 'rgba(15, 61, 46, 0.70)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          borderRadius: 'var(--gp-radius-pill)',
          border: '1px solid rgba(184,232,53,0.35)',
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: 'var(--gp-primary)',
            boxShadow: '0 0 8px rgba(184,232,53,0.6)',
          }} />
          <span style={{
            fontFamily: 'var(--gp-font-mono)', fontSize: 10,
            letterSpacing: '0.14em', textTransform: 'uppercase',
            color: 'var(--gp-fg)',
            fontWeight: 700,
          }}>Featured story</span>
        </div>
        {/* Overlay content */}
        <div style={{
          position: 'absolute', left: 0, right: 0, bottom: 0,
          padding: mobile ? '24px 20px 28px' : `${bp === 'tablet' ? 36 : 48}px ${bp === 'tablet' ? 40 : 56}px`,
          display: 'flex', flexDirection: 'column', gap: mobile ? 14 : 18,
          maxWidth: 980,
        }}>
          <StMeta chapter={`Chapter · ${ST_FEATURED.chapter}`} tag={ST_FEATURED.tag} size={11} />
          <GP_H1
            size={mobile ? 30 : (bp === 'tablet' ? 44 : 60)}
            style={{ letterSpacing: '-0.015em', lineHeight: 1.04, maxWidth: 900 }}
          >{ST_FEATURED.title}</GP_H1>
          {!mobile && (
            <GP_Body size={16} color="var(--gp-off-white-dim)" style={{ maxWidth: 640 }}>
              {ST_FEATURED.dek}
            </GP_Body>
          )}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap',
            marginTop: 4,
          }}>
            <StByline author={ST_FEATURED.author} date={ST_FEATURED.date} read={ST_FEATURED.read} color="var(--gp-fg-muted)" />
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              fontFamily: 'var(--gp-font-body)',
              fontSize: 14, fontWeight: 600, color: 'var(--gp-primary)',
            }}>Read the story <span aria-hidden="true">→</span></span>
          </div>
        </div>
      </a>
    </section>
  );
};

/* ---------- Featured — side-by-side (image left, copy right) ---------- */

const StFeaturedSideBySide = ({ bp }) => {
  const mobile = bp === 'mobile';
  const inset = GP_useInset(bp);
  return (
    <section style={{
      padding: mobile ? '8px 20px 32px' : `12px ${inset}px 48px`,
    }}>
      <a href="Story (Hi-Fi).html" style={{
        display: 'grid',
        gridTemplateColumns: mobile ? '1fr' : '7fr 5fr',
        gap: mobile ? 20 : 40,
        textDecoration: 'none', color: 'var(--gp-fg)',
        alignItems: 'center',
      }}>
        <div style={{
          height: mobile ? 240 : 520,
          borderRadius: 'var(--gp-radius-xl)',
          overflow: 'hidden',
          position: 'relative',
          border: '1px solid var(--gp-border-soft)',
          background:
            'radial-gradient(ellipse at 70% 30%, rgba(240,220,160,0.18), transparent 60%), ' +
            'linear-gradient(135deg, #0c3326 0%, #103e2f 50%, #16513d 100%)',
        }}>
          <div aria-hidden="true" style={{
            position: 'absolute', inset: 0,
            backgroundImage: 'url("hifi/assets/topo-bg.png")',
            backgroundSize: 'cover', backgroundPosition: 'center',
            opacity: 0.32, mixBlendMode: 'screen',
          }} />
          <div style={{
            position: 'absolute', top: 16, left: 18,
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '6px 12px',
            background: 'rgba(15, 61, 46, 0.65)',
            borderRadius: 'var(--gp-radius-pill)',
            border: '1px solid rgba(184,232,53,0.35)',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--gp-primary)' }} />
            <span style={{ fontFamily: 'var(--gp-font-mono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--gp-fg)' }}>Featured</span>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: mobile ? 14 : 18 }}>
          <StMeta chapter={`Chapter · ${ST_FEATURED.chapter}`} tag={ST_FEATURED.tag} size={11} />
          <GP_H1 size={mobile ? 30 : 44} style={{ letterSpacing: '-0.015em', lineHeight: 1.06 }}>
            {ST_FEATURED.title}
          </GP_H1>
          <GP_Body size={15} color="var(--gp-off-white-dim)">{ST_FEATURED.dek}</GP_Body>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginTop: 4 }}>
            <StByline author={ST_FEATURED.author} date={ST_FEATURED.date} read={ST_FEATURED.read} color="var(--gp-fg-muted)" />
            <span style={{ fontFamily: 'var(--gp-font-body)', fontSize: 14, fontWeight: 600, color: 'var(--gp-primary)', whiteSpace: 'nowrap' }}>Read →</span>
          </div>
        </div>
      </a>
    </section>
  );
};

/* ---------- Featured — typographic (giant headline first, image below) ---------- */

const StFeaturedTypographic = ({ bp }) => {
  const mobile = bp === 'mobile';
  const inset = GP_useInset(bp);
  return (
    <section style={{
      padding: mobile ? '8px 20px 32px' : `12px ${inset}px 48px`,
    }}>
      <a href="Story (Hi-Fi).html" style={{
        display: 'flex', flexDirection: 'column', gap: mobile ? 20 : 28,
        textDecoration: 'none', color: 'var(--gp-fg)',
      }}>
        <StMeta chapter={`Featured · Chapter ${ST_FEATURED.chapter}`} tag={ST_FEATURED.tag} size={12} />
        <GP_H1
          size={mobile ? 38 : 'clamp(60px, 7vw, 108px)'}
          style={{ letterSpacing: '-0.02em', lineHeight: 1.02, maxWidth: 1200 }}
        >{ST_FEATURED.title}</GP_H1>
        <div style={{
          display: 'flex',
          flexDirection: mobile ? 'column' : 'row',
          alignItems: mobile ? 'flex-start' : 'flex-end',
          justifyContent: 'space-between',
          gap: mobile ? 14 : 32,
          paddingBottom: 8,
        }}>
          <GP_Body size={mobile ? 14 : 16} color="var(--gp-off-white-dim)" style={{ maxWidth: 620 }}>
            {ST_FEATURED.dek}
          </GP_Body>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 'none', textAlign: mobile ? 'left' : 'right' }}>
            <StByline author={ST_FEATURED.author} date={ST_FEATURED.date} read={ST_FEATURED.read} color="var(--gp-fg-muted)" />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--gp-primary)', whiteSpace: 'nowrap' }}>Read the story →</span>
          </div>
        </div>
        <div style={{
          position: 'relative',
          height: mobile ? 260 : 460,
          borderRadius: 'var(--gp-radius-xl)',
          overflow: 'hidden',
          border: '1px solid var(--gp-border-soft)',
          background:
            'radial-gradient(ellipse at 60% 35%, rgba(240,220,160,0.18), transparent 60%), ' +
            'linear-gradient(135deg, #0c3326 0%, #103e2f 50%, #16513d 100%)',
        }}>
          <div aria-hidden="true" style={{
            position: 'absolute', inset: 0,
            backgroundImage: 'url("hifi/assets/topo-bg.png")',
            backgroundSize: 'cover', backgroundPosition: 'center',
            opacity: 0.32, mixBlendMode: 'screen',
          }} />
        </div>
      </a>
    </section>
  );
};

const StFeatured = ({ bp, treatment }) => {
  if (treatment === 'side')   return <StFeaturedSideBySide bp={bp} />;
  if (treatment === 'type')   return <StFeaturedTypographic bp={bp} />;
  return <StFeaturedCinematic bp={bp} />;
};

/* ---------- Sub-features row ---------- */

const StSubFeaturesSection = ({ bp }) => {
  const mobile = bp === 'mobile';
  const inset = GP_useInset(bp);
  return (
    <section style={{
      padding: mobile ? '8px 20px 24px' : `8px ${inset}px 32px`,
    }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: mobile ? '1fr' : '1fr 1fr',
        gap: mobile ? 16 : 24,
      }}>
        {ST_SUB_FEATURES.map(item => (
          <StSubFeatureCard key={item.slug} item={item} bp={bp} vertical />
        ))}
      </div>
    </section>
  );
};

/* ---------- Filter bar + feed ---------- */

const StFeedSection = ({ bp, filterStyle, density, showChapter }) => {
  const mobile = bp === 'mobile';
  const inset = GP_useInset(bp);
  return (
    <section style={{
      padding: mobile ? '24px 20px 24px' : `40px ${inset}px 24px`,
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        marginBottom: 18,
        gap: 14,
        flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <GP_Overline>The feed</GP_Overline>
          <GP_H2 size={mobile ? 26 : 36}>All stories</GP_H2>
        </div>
        {!mobile && (
          <GP_Mute size={12}>Showing {ST_FEED.length} of {ST_FEED.length + 24}</GP_Mute>
        )}
      </div>

      <StFilterBar bp={bp} style={filterStyle} showChapter={showChapter} />

      <div style={{
        display: 'grid',
        gridTemplateColumns: mobile ? '1fr' : '1fr 1fr',
        columnGap: mobile ? 0 : 48,
        rowGap: 0,
      }}>
        {ST_FEED.map((item, i) => (
          <StFeedRow
            key={item.slug}
            item={item}
            bp={bp}
            density={density}
            last={mobile ? i === ST_FEED.length - 1 : (i >= ST_FEED.length - 2)}
          />
        ))}
      </div>

      <div style={{
        display: 'flex', justifyContent: 'center',
        paddingTop: mobile ? 24 : 36,
      }}>
        <GP_GhostButton>Load more stories</GP_GhostButton>
      </div>
    </section>
  );
};

/* ---------- Topic spotlight ---------- */

const StTopicSpotlightSection = ({ bp }) => {
  const mobile = bp === 'mobile';
  const inset = GP_useInset(bp);
  return (
    <section style={{
      padding: mobile ? '32px 20px' : `48px ${inset}px`,
    }}>
      <StTopicSpotlight bp={bp} />
    </section>
  );
};

/* ---------- Translations ---------- */

const StTranslationsSection = ({ bp }) => {
  const mobile = bp === 'mobile';
  const inset = GP_useInset(bp);
  return (
    <section style={{
      padding: mobile ? '0 20px' : `0 ${inset}px`,
    }}>
      <StTranslationsStrip bp={bp} />
    </section>
  );
};

/* ---------- Newsletter ---------- */

const StNewsletterSection = ({ bp }) => {
  const mobile = bp === 'mobile';
  const inset = GP_useInset(bp);
  return (
    <section style={{
      padding: mobile ? '32px 20px' : `56px ${inset}px`,
    }}>
      <StNewsletter bp={bp} />
    </section>
  );
};

/* ---------- Submit strip ---------- */

const StSubmitSection = ({ bp }) => {
  const mobile = bp === 'mobile';
  const inset = GP_useInset(bp);
  return (
    <section style={{
      padding: mobile ? '0 20px 24px' : `0 ${inset}px 48px`,
    }}>
      <StSubmitStrip bp={bp} />
    </section>
  );
};

Object.assign(window, {
  StIntroSection,
  StFeatured, StFeaturedCinematic, StFeaturedSideBySide, StFeaturedTypographic,
  StSubFeaturesSection,
  StFeedSection,
  StTopicSpotlightSection,
  StTranslationsSection,
  StNewsletterSection,
  StSubmitSection,
});
