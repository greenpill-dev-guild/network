/* hifi/gld-sections.jsx — Guild Detail page sections.
   Heroes (5 variants):
     - mandate-photo  — wireframe default: mandate copy + team photo side-by-side
     - mandate-diagram — mandate copy + refined system diagram side-by-side
     - typographic   — giant Dev Guild type, no image (diagram surfaces in mandate)
     - fullbleed     — working-session photo with copy overlaid
     - statstrip     — landscape photo + overlapping stat strip card
   Plus the secondary hero CTA → scrolls to #connect.
*/

/* Shared hero CTAs (primary "Join the guild" → smooth-scroll to #connect). */
const GldHeroCtas = ({ bp, variant = 'on-dark' }) => {
  const onClick = (e) => {
    e.preventDefault();
    const t = document.getElementById('connect');
    if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
      marginTop: bp === 'mobile' ? 8 : 12,
    }}>
      <a href="#connect" onClick={onClick} style={{
        appearance: 'none', textDecoration: 'none',
        display: 'inline-flex', alignItems: 'center', gap: 8,
        height: bp === 'mobile' ? 44 : 48,
        padding: '0 22px',
        borderRadius: 'var(--gp-radius-pill)',
        background: 'var(--gp-primary)',
        color: 'var(--gp-primary-fg)',
        fontFamily: 'var(--gp-font-body)',
        fontSize: 14, fontWeight: 600,
        letterSpacing: '0.005em',
        boxShadow: 'var(--gp-shadow-pill)',
        whiteSpace: 'nowrap',
      }}>
        Start contributing
        <span aria-hidden="true">→</span>
      </a>
      <a href="https://github.com" style={{
        textDecoration: 'none',
        display: 'inline-flex', alignItems: 'center', gap: 8,
        height: bp === 'mobile' ? 44 : 48,
        padding: '0 22px',
        borderRadius: 'var(--gp-radius-pill)',
        border: '1px solid var(--gp-border)',
        color: 'var(--gp-fg)',
        background: 'transparent',
        fontFamily: 'var(--gp-font-body)',
        fontSize: 14, fontWeight: 600,
        whiteSpace: 'nowrap',
      }}>
        View on GitHub
        <span aria-hidden="true">↗</span>
      </a>
    </div>
  );
};

/* =====================================================================
   HERO — Variant 1 · MANDATE + TEAM PHOTO (wireframe default)
   ===================================================================== */
const GldHeroMandatePhoto = ({ bp }) => {
  const inset = GP_useInset(bp);
  return (
    <section style={{
      padding: bp === 'mobile' ? '24px 20px 56px' : `${bp === 'tablet' ? 48 : 64}px ${inset}px 80px`,
      display: 'flex', flexDirection: 'column', gap: bp === 'mobile' ? 24 : 40,
    }}>
      <GldHeroHeader bp={bp} />
      <div style={{
        display: 'grid',
        gridTemplateColumns: bp === 'mobile' ? '1fr' : '1fr 1fr',
        gap: bp === 'mobile' ? 24 : 56,
        alignItems: 'flex-start',
      }}>
        <GldMandateCopy bp={bp} />
        <GldWorkingPhoto h={bp === 'mobile' ? 240 : bp === 'tablet' ? 340 : 440} />
      </div>
    </section>
  );
};

/* =====================================================================
   HERO — Variant 2 · MANDATE + DIAGRAM
   ===================================================================== */
const GldHeroMandateDiagram = ({ bp }) => {
  const inset = GP_useInset(bp);
  return (
    <section style={{
      padding: bp === 'mobile' ? '24px 20px 56px' : `${bp === 'tablet' ? 48 : 64}px ${inset}px 80px`,
      display: 'flex', flexDirection: 'column', gap: bp === 'mobile' ? 24 : 40,
    }}>
      <GldHeroHeader bp={bp} />
      <div style={{
        display: 'grid',
        gridTemplateColumns: bp === 'mobile' ? '1fr' : '1fr 1fr',
        gap: bp === 'mobile' ? 24 : 56,
        alignItems: 'center',
      }}>
        <GldMandateCopy bp={bp} />
        <GldDiagram h={bp === 'mobile' ? 320 : bp === 'tablet' ? 380 : 460} bp={bp} />
      </div>
    </section>
  );
};

/* =====================================================================
   HERO — Variant 3 · TYPOGRAPHIC
   When the hero is typographic (no image), the diagram surfaces just below
   inside its own section so the page still teaches what the guild builds.
   ===================================================================== */
const GldHeroTypographic = ({ bp }) => {
  const inset = GP_useInset(bp);
  return (
    <section style={{
      padding: bp === 'mobile' ? '36px 20px 24px' : `${bp === 'tablet' ? 88 : 128}px ${inset}px 56px`,
      display: 'flex', flexDirection: 'column', gap: bp === 'mobile' ? 22 : 36,
      position: 'relative',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <GldMeta />
        <GldStatusChip status={GLD_GUILD.status} size="lg" />
      </div>
      <h1 style={{
        margin: 0,
        fontFamily: 'var(--gp-font-display)',
        fontWeight: 500,
        fontVariationSettings: 'var(--gp-display-vs)',
        color: 'var(--gp-secondary)',
        letterSpacing: '-0.02em',
        lineHeight: 0.96,
        fontSize: bp === 'mobile' ? 'clamp(48px, 14vw, 72px)' : 'clamp(96px, 11vw, 192px)',
      }}>{GLD_GUILD.name}</h1>
      <div style={{
        display: 'flex', alignItems: 'baseline', gap: 18, flexWrap: 'wrap',
        paddingTop: 8,
        borderTop: '1px solid var(--gp-border-soft)',
        marginTop: 6,
      }}>
        <GP_Mute size={15} style={{ color: 'var(--gp-fg)' }}>{GLD_GUILD.oneliner}</GP_Mute>
      </div>
      <GldHeroCtas bp={bp} />
    </section>
  );
};

/* Diagram-as-section, used only with typographic hero. */
const GldDiagramSection = ({ bp }) => {
  const inset = GP_useInset(bp);
  return (
    <section style={{ padding: bp === 'mobile' ? '0 20px 40px' : `0 ${inset}px 56px` }}>
      <GldDiagram h={bp === 'mobile' ? 320 : bp === 'tablet' ? 420 : 500} bp={bp} />
    </section>
  );
};

/* =====================================================================
   HERO — Variant 4 · FULL-BLEED PHOTO
   ===================================================================== */
const GldHeroFullBleed = ({ bp }) => {
  const inset = GP_useInset(bp);
  return (
    <section style={{ position: 'relative' }}>
      <div style={{
        position: 'relative',
        width: '100%',
        height: bp === 'mobile' ? 540 : bp === 'tablet' ? 620 : 720,
        background: 'var(--gp-green-800)',
        overflow: 'hidden',
      }}>
        <div aria-hidden="true" style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'url("hifi/assets/topo-bg.png")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.55,
          mixBlendMode: 'overlay',
        }} />
        <div aria-hidden="true" style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(circle at 30% 40%, rgba(240,220,160,0.16), transparent 55%), radial-gradient(circle at 70% 60%, rgba(184,232,53,0.14), transparent 60%)',
        }} />
        <div aria-hidden="true" style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to bottom, rgba(10,45,33,0.05) 0%, rgba(10,45,33,0.55) 60%, rgba(10,45,33,0.92) 100%)',
        }} />
        <div style={{
          position: 'absolute', left: 0, right: 0, bottom: 0,
          padding: bp === 'mobile' ? '24px 20px' : `48px ${inset}px`,
          display: 'flex', flexDirection: 'column', gap: 14,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <GldMeta />
            <GldStatusChip status={GLD_GUILD.status} size="lg" />
          </div>
          <h1 style={{
            margin: 0,
            fontFamily: 'var(--gp-font-display)',
            fontWeight: 500,
            fontVariationSettings: 'var(--gp-display-vs)',
            color: 'var(--gp-secondary)',
            letterSpacing: '-0.015em',
            lineHeight: 1.0,
            fontSize: bp === 'mobile' ? 'clamp(40px, 12vw, 56px)' : 'clamp(64px, 7vw, 112px)',
          }}>{GLD_GUILD.name}</h1>
          <GP_Body size={bp === 'mobile' ? 15 : 18} style={{ maxWidth: 720, color: 'var(--gp-fg)' }}>
            {GLD_GUILD.oneliner}
          </GP_Body>
          <div style={{
            marginTop: 4,
            fontFamily: 'var(--gp-font-mono)',
            fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
            color: 'var(--gp-fg-dim)',
          }}>{GLD_GUILD.heroPhoto}</div>
          <GldHeroCtas bp={bp} />
        </div>
      </div>
    </section>
  );
};

/* =====================================================================
   HERO — Variant 5 · STAT STRIP
   Landscape photo + overlapping stat-strip card.
   ===================================================================== */
const GldHeroStatStrip = ({ bp }) => {
  const inset = GP_useInset(bp);
  return (
    <section style={{
      padding: bp === 'mobile' ? '24px 20px 14px' : `${bp === 'tablet' ? 48 : 64}px ${inset}px 32px`,
      display: 'flex', flexDirection: 'column', gap: bp === 'mobile' ? 18 : 28,
    }}>
      <GldHeroHeader bp={bp} compactCopy />

      <div style={{ position: 'relative' }}>
        <GldWorkingPhoto h={bp === 'mobile' ? 220 : bp === 'tablet' ? 320 : 420} />
        <div style={{
          position: bp === 'mobile' ? 'static' : 'absolute',
          left: bp === 'mobile' ? 0 : 24, right: bp === 'mobile' ? 0 : 24, bottom: -28,
          marginTop: bp === 'mobile' ? 14 : 0,
          background: 'var(--gp-green-700)',
          border: '1px solid var(--gp-border-soft)',
          borderRadius: 'var(--gp-radius-lg)',
          padding: bp === 'mobile' ? 18 : 28,
          boxShadow: bp === 'mobile' ? 'none' : '0 24px 60px -20px rgba(0,0,0,0.55)',
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: bp === 'mobile' ? 8 : 20,
        }}>
          {GLD_STATS.map((s, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{
                fontFamily: 'var(--gp-font-display)',
                fontWeight: 500,
                fontVariationSettings: 'var(--gp-display-vs)',
                fontSize: bp === 'mobile' ? 22 : 36,
                lineHeight: 1,
                letterSpacing: '-0.015em',
                color: i === 0 ? 'var(--gp-primary)' : 'var(--gp-secondary)',
              }}>{s.big}</span>
              <span style={{
                fontFamily: 'var(--gp-font-mono)',
                fontSize: bp === 'mobile' ? 9 : 11,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'var(--gp-fg-dim)',
              }}>{s.sub}</span>
            </div>
          ))}
        </div>
      </div>

      {bp !== 'mobile' && <div style={{ height: 36 }} />}
      <GldHeroCtas bp={bp} />
    </section>
  );
};

/* =====================================================================
   SHARED — hero header (meta + giant title + tagline + CTAs).
   Used by mandate-photo / mandate-diagram / statstrip.
   ===================================================================== */
const GldHeroHeader = ({ bp, compactCopy = false }) => (
  <div style={{
    display: 'flex', flexDirection: 'column', gap: bp === 'mobile' ? 12 : 16,
    maxWidth: 1000,
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
      <GldMeta />
      <GldStatusChip status={GLD_GUILD.status} size="lg" />
    </div>
    <h1 style={{
      margin: 0,
      fontFamily: 'var(--gp-font-display)',
      fontWeight: 500,
      fontVariationSettings: 'var(--gp-display-vs)',
      color: 'var(--gp-secondary)',
      letterSpacing: '-0.015em',
      lineHeight: 1.0,
      fontSize: bp === 'mobile' ? 'clamp(40px, 12vw, 56px)' : 'clamp(56px, 6.5vw, 96px)',
      textWrap: 'pretty',
    }}>{GLD_GUILD.name}</h1>
    {!compactCopy && (
      <GP_Body size={bp === 'mobile' ? 15 : 18} style={{
        maxWidth: 760,
        color: 'var(--gp-fg)',
      }}>{GLD_GUILD.oneliner}</GP_Body>
    )}
    <GldHeroCtas bp={bp} />
  </div>
);

/* =====================================================================
   MANDATE COPY — shared between hero variants 1 & 2.
   ===================================================================== */
const GldMandateCopy = ({ bp }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 600 }}>
    <GP_Overline>Mandate</GP_Overline>
    <GP_H2 size={bp === 'mobile' ? 24 : 'clamp(26px, 2.4vw, 36px)'}>What the Dev Guild does</GP_H2>
    <GP_Body size={bp === 'mobile' ? 14 : 16} style={{ color: 'var(--gp-fg)', lineHeight: 1.6 }}>
      {GLD_GUILD.mandate1}
    </GP_Body>
    <GP_Body size={bp === 'mobile' ? 14 : 16} style={{ color: 'var(--gp-fg-muted)', lineHeight: 1.6 }}>
      {GLD_GUILD.mandate2}
    </GP_Body>
    <GP_Body size={bp === 'mobile' ? 14 : 16} style={{ color: 'var(--gp-fg-muted)', lineHeight: 1.6 }}>
      {GLD_GUILD.mandate3}
    </GP_Body>
  </div>
);

/* Mandate-as-its-own-section — only used when hero is typographic / full-bleed
   / stat-strip (because in those variants the hero doesn't carry the mandate).
   For typographic / stat-strip we still want the mandate copy visible; for
   full-bleed we want the same — the copy on the photo is just the oneliner. */
const GldMandateSection = ({ bp }) => {
  const inset = GP_useInset(bp);
  return (
    <section style={{ padding: bp === 'mobile' ? '0 20px 56px' : `0 ${inset}px 80px` }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: bp === 'mobile' ? '1fr' : '2fr 1fr',
        gap: bp === 'mobile' ? 24 : 56,
        alignItems: 'start',
      }}>
        <GldMandateCopy bp={bp} />
        <div style={{
          padding: bp === 'mobile' ? 20 : 28,
          background: 'var(--gp-green-800)',
          border: '1px solid var(--gp-border-soft)',
          borderRadius: 'var(--gp-radius-lg)',
          display: 'flex', flexDirection: 'column', gap: 14,
        }}>
          <GP_Overline color="var(--gp-primary)">Cadence</GP_Overline>
          <div style={{
            fontFamily: 'var(--gp-font-display)',
            fontVariationSettings: 'var(--gp-display-vs)',
            fontWeight: 500,
            fontSize: 22, lineHeight: 1.2,
            color: 'var(--gp-secondary)',
          }}>{GLD_CADENCE.call}</div>
          <GP_Mute size={13}>{GLD_CADENCE.format}</GP_Mute>
          <GP_Mute size={13}>{GLD_CADENCE.recordings}</GP_Mute>
        </div>
      </div>
    </section>
  );
};

/* =====================================================================
   PROJECTS — 2-up grid (3 active + 1 placeholder).
   ===================================================================== */
const GldProjectsSection = ({ bp }) => {
  const inset = GP_useInset(bp);
  return (
    <section style={{ padding: bp === 'mobile' ? '0 20px 56px' : `0 ${inset}px 80px` }}>
      <GP_SectionHeader
        bp={bp}
        overline="Projects · in flight"
        title={<>What we're building</>}
        side={bp !== 'mobile' ? <GP_ArrowLink>All projects</GP_ArrowLink> : null}
      />
      <div style={{
        display: 'grid',
        gridTemplateColumns: bp === 'mobile' ? '1fr' : 'repeat(2, 1fr)',
        gap: bp === 'mobile' ? 14 : 20,
      }}>
        {GLD_PROJECTS.map((p, i) => <GldProjectCard key={i} p={p} bp={bp} />)}
      </div>
    </section>
  );
};

/* =====================================================================
   MEMBERS — avatar grid.
   ===================================================================== */
const GldMembersSection = ({ bp }) => {
  const inset = GP_useInset(bp);
  return (
    <section style={{ padding: bp === 'mobile' ? '0 20px 56px' : `0 ${inset}px 80px` }}>
      <GP_SectionHeader
        bp={bp}
        overline="Members · the team"
        title={<>{GLD_MEMBERS.length + GLD_MEMBER_MORE} contributors keep the lights on</>}
        side={bp !== 'mobile' ? <GP_ArrowLink>Meet everyone</GP_ArrowLink> : null}
      />
      <div style={{
        display: 'grid',
        gridTemplateColumns: bp === 'mobile' ? 'repeat(2, 1fr)' : bp === 'tablet' ? 'repeat(4, 1fr)' : 'repeat(6, 1fr)',
        gap: bp === 'mobile' ? 10 : 14,
      }}>
        {GLD_MEMBERS.map((m, i) => <GldMemberCell key={i} m={m} bp={bp} />)}
      </div>
      <div style={{
        marginTop: bp === 'mobile' ? 14 : 18,
        fontFamily: 'var(--gp-font-mono)',
        fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase',
        color: 'var(--gp-fg-dim)',
      }}>+ {GLD_MEMBER_MORE} more members</div>
    </section>
  );
};

/* =====================================================================
   HOW WE WORK — cadence callout + 4 principle cards.
   ===================================================================== */
const GldHowWeWorkSection = ({ bp }) => {
  const inset = GP_useInset(bp);
  return (
    <section style={{ padding: bp === 'mobile' ? '0 20px 56px' : `0 ${inset}px 80px` }}>
      <GP_SectionHeader
        bp={bp}
        overline="How we work"
        title="Cadence & principles"
        side={null}
      />

      {/* Cadence band — single row, gold-accented */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: bp === 'mobile' ? '1fr' : 'repeat(3, 1fr)',
        gap: bp === 'mobile' ? 10 : 0,
        padding: bp === 'mobile' ? 0 : 0,
        background: 'var(--gp-green-700)',
        border: '1px solid var(--gp-border-soft)',
        borderRadius: 'var(--gp-radius-lg)',
        overflow: 'hidden',
        marginBottom: bp === 'mobile' ? 18 : 28,
      }}>
        {[
          { k: 'Weekly call', v: GLD_CADENCE.call },
          { k: 'Format',      v: GLD_CADENCE.format },
          { k: 'Recordings',  v: GLD_CADENCE.recordings },
        ].map((row, i) => (
          <div key={i} style={{
            padding: bp === 'mobile' ? 16 : 24,
            display: 'flex', flexDirection: 'column', gap: 8,
            borderRight: (bp !== 'mobile' && i < 2) ? '1px solid var(--gp-border-soft)' : 'none',
            borderBottom: (bp === 'mobile' && i < 2) ? '1px solid var(--gp-border-soft)' : 'none',
          }}>
            <span style={{
              fontFamily: 'var(--gp-font-mono)',
              fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase',
              color: 'var(--gp-primary)',
            }}>{row.k}</span>
            <span style={{
              fontFamily: 'var(--gp-font-display)',
              fontVariationSettings: 'var(--gp-display-vs)',
              fontSize: bp === 'mobile' ? 18 : 22, fontWeight: 500,
              color: 'var(--gp-secondary)',
              lineHeight: 1.2,
            }}>{row.v}</span>
          </div>
        ))}
      </div>

      {/* Principles — 2×2 grid (desktop / tablet), stacked on mobile */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: bp === 'mobile' ? '1fr' : 'repeat(2, 1fr)',
        gap: bp === 'mobile' ? 12 : 18,
      }}>
        {GLD_PRINCIPLES.map((p, i) => <GldPrincipleCard key={i} p={p} bp={bp} />)}
      </div>
    </section>
  );
};

/* =====================================================================
   CONNECT — where the guild lives. Wireframe behaviour kept: this section
   IS the join CTA. Anchor id="connect" so hero CTAs can scroll here.
   ===================================================================== */
const GldConnectSection = ({ bp }) => {
  const inset = GP_useInset(bp);
  return (
    <section id="connect" style={{ padding: bp === 'mobile' ? '0 20px 56px' : `0 ${inset}px 80px` }}>
      <GP_SectionHeader
        bp={bp}
        overline="Connect"
        title="Where the guild lives"
        side={null}
      />
      <GP_Body size={bp === 'mobile' ? 14 : 16} style={{
        color: 'var(--gp-fg-muted)',
        marginBottom: 24,
        maxWidth: 720,
      }}>
        The guild coordinates here — use these to get in touch, follow along, or start contributing.
      </GP_Body>
      <div style={{
        display: 'grid',
        gridTemplateColumns: bp === 'mobile' ? '1fr' : 'repeat(2, 1fr)',
        gap: bp === 'mobile' ? 0 : '0 32px',
      }}>
        {GLD_LINKS.map((l, i) => {
          /* Compute "last in column" for mobile / desktop. */
          const cols = bp === 'mobile' ? 1 : 2;
          const lastIdxInThisCol = (() => {
            const col = i % cols;
            let lastIdx = -1;
            for (let j = 0; j < GLD_LINKS.length; j++) {
              if (j % cols === col) lastIdx = j;
            }
            return lastIdx;
          })();
          return <GldLinkRow key={i} l={l} last={i === lastIdxInThisCol} />;
        })}
      </div>
    </section>
  );
};

Object.assign(window, {
  GldHeroCtas, GldHeroHeader, GldMandateCopy, GldMandateSection,
  GldHeroMandatePhoto, GldHeroMandateDiagram, GldHeroTypographic,
  GldHeroFullBleed, GldHeroStatStrip, GldDiagramSection,
  GldProjectsSection, GldMembersSection, GldHowWeWorkSection, GldConnectSection,
});
