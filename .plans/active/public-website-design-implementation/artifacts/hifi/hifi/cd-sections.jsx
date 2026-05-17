/* hifi/cd-sections.jsx — Chapter Detail sections (Nigeria).
   - Hero (4 variants): landscape, full-bleed, typographic, stat-strip
   - Intro paragraph (with optional pull-quote)
   - Stories (3 layouts: rows / cards / magazine)
   - Stewards (3 layouts: grid / scroll / portrait)
   - Events (cards)
   - Library (rows)
   - Connect (list rows)
   - Location map (small mycelial-style pin map zoomed to the country)
   - Related chapters (region peers)
*/

/* =====================================================================
   HERO
   ===================================================================== */

/* Variant 1 — LANDSCAPE PHOTO HERO (matches wireframe). */
const CdHeroLandscape = ({ bp }) => (
  <div style={{
    padding: bp === 'mobile' ? '24px 20px 14px' : `${bp === 'tablet' ? 48 : 64}px ${GP_useInset(bp)}px 32px`,
    display: 'flex', flexDirection: 'column', gap: bp === 'mobile' ? 18 : 28,
  }}>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 1000 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <ChMeta region={CD_CHAPTER.region} />
        <ChStatusChip status={CD_CHAPTER.status} size="lg" />
      </div>
      <h1 style={{
        margin: 0,
        fontFamily: 'var(--gp-font-display)',
        fontWeight: 500,
        fontVariationSettings: 'var(--gp-display-vs)',
        color: 'var(--gp-secondary)',
        letterSpacing: '-0.015em',
        lineHeight: 1.02,
        fontSize: bp === 'mobile' ? 'clamp(32px, 9vw, 42px)' : 'clamp(48px, 5.6vw, 80px)',
        textWrap: 'pretty',
      }}>{CD_CHAPTER.name}</h1>
      <GP_Mute size={15}>{CD_CHAPTER.city} · Founded {CD_CHAPTER.founded}</GP_Mute>
    </div>
    <GP_PlaceImg label={CD_CHAPTER.hero} h={bp === 'mobile' ? 220 : bp === 'tablet' ? 320 : 440} />
  </div>
);

/* Variant 2 — FULL-BLEED PHOTO with copy overlaid. */
const CdHeroFullBleed = ({ bp }) => (
  <div style={{ position: 'relative' }}>
    <div style={{
      position: 'relative',
      width: '100%',
      height: bp === 'mobile' ? 540 : bp === 'tablet' ? 620 : 720,
      background: 'var(--gp-green-800)',
      overflow: 'hidden',
    }}>
      {/* Photo placeholder layer */}
      <div aria-hidden="true" style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'url("hifi/assets/topo-bg.png")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        opacity: 0.5,
        mixBlendMode: 'overlay',
      }} />
      <div aria-hidden="true" style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(circle at 30% 40%, rgba(240,220,160,0.15), transparent 55%), radial-gradient(circle at 70% 60%, rgba(184,232,53,0.12), transparent 60%)',
      }} />
      {/* gradient bottom for legibility */}
      <div aria-hidden="true" style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to bottom, rgba(10,45,33,0.05) 0%, rgba(10,45,33,0.55) 60%, rgba(10,45,33,0.92) 100%)',
      }} />

      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        padding: bp === 'mobile' ? '24px 20px' : `48px ${GP_useInset(bp)}px`,
        display: 'flex', flexDirection: 'column', gap: 14,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <ChMeta region={CD_CHAPTER.region} />
          <ChStatusChip status={CD_CHAPTER.status} size="lg" />
        </div>
        <h1 style={{
          margin: 0,
          fontFamily: 'var(--gp-font-display)',
          fontWeight: 500,
          fontVariationSettings: 'var(--gp-display-vs)',
          color: 'var(--gp-secondary)',
          letterSpacing: '-0.015em',
          lineHeight: 1.02,
          fontSize: bp === 'mobile' ? 'clamp(36px, 11vw, 48px)' : 'clamp(56px, 6vw, 96px)',
        }}>{CD_CHAPTER.name}</h1>
        <GP_Mute size={15}>{CD_CHAPTER.city} · Founded {CD_CHAPTER.founded}</GP_Mute>

        {/* photo source caption */}
        <div style={{
          marginTop: 4,
          fontFamily: 'var(--gp-font-mono)',
          fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
          color: 'var(--gp-fg-dim)',
        }}>{CD_CHAPTER.hero}</div>
      </div>
    </div>
  </div>
);

/* Variant 3 — TYPOGRAPHIC, no photo. */
const CdHeroTypographic = ({ bp }) => (
  <div style={{
    padding: bp === 'mobile' ? '48px 20px 24px' : `${bp === 'tablet' ? 88 : 128}px ${GP_useInset(bp)}px 56px`,
    display: 'flex', flexDirection: 'column', gap: bp === 'mobile' ? 18 : 32,
    position: 'relative',
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
      <ChMeta region={CD_CHAPTER.region} />
      <ChStatusChip status={CD_CHAPTER.status} size="lg" />
    </div>
    <h1 style={{
      margin: 0,
      fontFamily: 'var(--gp-font-display)',
      fontWeight: 500,
      fontVariationSettings: 'var(--gp-display-vs)',
      color: 'var(--gp-secondary)',
      letterSpacing: '-0.02em',
      lineHeight: 0.96,
      fontSize: bp === 'mobile' ? 'clamp(44px, 13vw, 62px)' : 'clamp(80px, 10vw, 168px)',
    }}>{CD_CHAPTER.name}</h1>
    <div style={{
      display: 'flex', alignItems: 'baseline', gap: 20, flexWrap: 'wrap',
      paddingTop: 8,
      borderTop: '1px solid var(--gp-border-soft)',
      marginTop: 8,
    }}>
      <GP_Mute size={15} style={{ color: 'var(--gp-fg)' }}>{CD_CHAPTER.city}</GP_Mute>
      <span style={{ opacity: 0.4 }}>·</span>
      <GP_Mute size={15}>Founded {CD_CHAPTER.founded}</GP_Mute>
      <span style={{ opacity: 0.4 }}>·</span>
      <GP_Mute size={15}>{CD_STATS[0].big} members · {CD_STATS[1].big} stewards</GP_Mute>
    </div>
  </div>
);

/* Variant 4 — LANDSCAPE + STAT STRIP overlay at the bottom. */
const CdHeroStatStrip = ({ bp }) => (
  <div style={{
    padding: bp === 'mobile' ? '24px 20px 14px' : `${bp === 'tablet' ? 48 : 64}px ${GP_useInset(bp)}px 32px`,
    display: 'flex', flexDirection: 'column', gap: bp === 'mobile' ? 18 : 28,
  }}>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 1000 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <ChMeta region={CD_CHAPTER.region} />
        <ChStatusChip status={CD_CHAPTER.status} size="lg" />
      </div>
      <h1 style={{
        margin: 0,
        fontFamily: 'var(--gp-font-display)',
        fontWeight: 500,
        fontVariationSettings: 'var(--gp-display-vs)',
        color: 'var(--gp-secondary)',
        letterSpacing: '-0.015em',
        lineHeight: 1.02,
        fontSize: bp === 'mobile' ? 'clamp(32px, 9vw, 42px)' : 'clamp(48px, 5.6vw, 80px)',
      }}>{CD_CHAPTER.name}</h1>
      <GP_Mute size={15}>{CD_CHAPTER.city}</GP_Mute>
    </div>

    {/* photo + overlapping stat strip */}
    <div style={{ position: 'relative' }}>
      <GP_PlaceImg label={CD_CHAPTER.hero} h={bp === 'mobile' ? 220 : bp === 'tablet' ? 320 : 420} />
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
        gridTemplateColumns: bp === 'mobile' ? 'repeat(4, 1fr)' : 'repeat(4, 1fr)',
        gap: bp === 'mobile' ? 8 : 20,
      }}>
        {CD_STATS.map((s, i) => (
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

    {/* spacer for absolute strip overlap on desktop */}
    {bp !== 'mobile' && <div style={{ height: 28 }} />}
  </div>
);

/* =====================================================================
   INTRO paragraph
   ===================================================================== */

const CdIntroSection = ({ bp }) => (
  <div style={{
    padding: bp === 'mobile' ? '24px 20px 48px' : `48px ${GP_useInset(bp)}px 80px`,
  }}>
    <div style={{
      display: 'grid',
      gridTemplateColumns: bp === 'mobile' ? '1fr' : '2fr 1fr',
      gap: bp === 'mobile' ? 24 : 56,
      alignItems: 'start',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 760 }}>
        <GP_Overline>About this chapter</GP_Overline>
        <p style={{
          margin: 0,
          fontFamily: 'var(--gp-font-display)',
          fontVariationSettings: 'var(--gp-display-vs)',
          fontWeight: 500,
          fontSize: bp === 'mobile' ? 20 : 'clamp(22px, 1.8vw, 28px)',
          lineHeight: 1.35,
          color: 'var(--gp-fg)',
          textWrap: 'pretty',
        }}>
          {CD_CHAPTER.intro}
        </p>
      </div>

      {/* Pull quote in side rail */}
      <div style={{
        padding: bp === 'mobile' ? 20 : 28,
        background: 'var(--gp-green-800)',
        border: '1px solid var(--gp-border-soft)',
        borderRadius: 'var(--gp-radius-lg)',
        display: 'flex', flexDirection: 'column', gap: 16,
        position: 'relative',
      }}>
        <span aria-hidden="true" style={{
          fontFamily: 'var(--gp-font-display)',
          fontSize: 48, lineHeight: 0.6,
          color: 'var(--gp-primary)',
          opacity: 0.7,
        }}>“</span>
        <p style={{
          margin: 0,
          fontFamily: 'var(--gp-font-display)',
          fontVariationSettings: 'var(--gp-display-vs)',
          fontWeight: 500,
          fontStyle: 'italic',
          fontSize: bp === 'mobile' ? 16 : 18,
          lineHeight: 1.4,
          color: 'var(--gp-secondary)',
        }}>{CD_CHAPTER.introQuote.replace(/^"|"$/g, '')}</p>
        <div style={{
          fontFamily: 'var(--gp-font-mono)',
          fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase',
          color: 'var(--gp-fg-dim)',
        }}>— {CD_CHAPTER.introQuoteBy}</div>
      </div>
    </div>
  </div>
);

/* =====================================================================
   STORIES section — three layouts
   ===================================================================== */

const CdStoriesSection = ({ bp, layout }) => {
  const inset = GP_useInset(bp);
  return (
    <section style={{ padding: bp === 'mobile' ? '0 20px 56px' : `0 ${inset}px 80px` }}>
      <GP_SectionHeader
        bp={bp}
        overline="Stories · via Karma GAP"
        title={<>Latest from {CD_CHAPTER.name.replace('Greenpill ', '')}</>}
        side={bp !== 'mobile' ? <GP_ArrowLink>All stories</GP_ArrowLink> : null}
      />
      {layout === 'rows' && (
        <div>
          {CD_STORIES.map((s, i) => <CdStoryRow key={i} s={s} bp={bp} last={i === CD_STORIES.length - 1} />)}
        </div>
      )}
      {layout === 'cards' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: bp === 'mobile' ? '1fr' : bp === 'tablet' ? 'repeat(2, 1fr)' : 'repeat(2, 1fr)',
          gap: bp === 'mobile' ? 14 : 20,
        }}>
          {CD_STORIES.map((s, i) => <CdStoryCard key={i} s={s} bp={bp} />)}
        </div>
      )}
      {layout === 'magazine' && <CdStoriesMagazine bp={bp} />}
    </section>
  );
};

/* Magazine: 1 big lead + 3 small. */
const CdStoriesMagazine = ({ bp }) => {
  const [lead, ...rest] = CD_STORIES;
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: bp === 'mobile' ? '1fr' : '1.4fr 1fr',
      gap: bp === 'mobile' ? 14 : 28,
    }}>
      {/* Lead */}
      <a href="#" style={{
        display: 'flex', flexDirection: 'column', gap: 14,
        textDecoration: 'none', color: 'var(--gp-fg)',
      }}>
        <GP_PlaceImg label={lead.photo} h={bp === 'mobile' ? 220 : 400} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            fontFamily: 'var(--gp-font-mono)',
            fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase',
            color: 'var(--gp-primary)',
          }}>{lead.tag}</span>
          <span style={{ opacity: 0.4 }}>·</span>
          <span style={{ fontSize: 11, color: 'var(--gp-fg-dim)' }}>{lead.date}</span>
          <span style={{ opacity: 0.4 }}>·</span>
          <span style={{ fontSize: 11, color: 'var(--gp-fg-dim)' }}>{lead.metric}</span>
        </div>
        <h3 style={{
          margin: 0,
          fontFamily: 'var(--gp-font-display)',
          fontVariationSettings: 'var(--gp-display-vs)',
          fontWeight: 500,
          fontSize: bp === 'mobile' ? 24 : 'clamp(28px, 3vw, 40px)',
          lineHeight: 1.1,
          color: 'var(--gp-secondary)',
          letterSpacing: '-0.01em',
          textWrap: 'pretty',
        }}>{lead.title}</h3>
        <GP_Body size={14} style={{ color: 'var(--gp-fg-muted)' }}>{lead.blurb}</GP_Body>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--gp-primary)', whiteSpace: 'nowrap' }}>Read →</span>
      </a>

      {/* Sidebar list */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {rest.map((s, i) => (
          <a key={i} href="#" style={{
            display: 'flex', gap: 14,
            padding: '16px 0',
            borderBottom: i === rest.length - 1 ? 'none' : '1px solid var(--gp-border-soft)',
            textDecoration: 'none', color: 'var(--gp-fg)',
          }}>
            <GP_PlaceImg label={s.photo} h={null} style={{ width: 100, height: 80, flex: 'none' }} />
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontFamily: 'var(--gp-font-mono)', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--gp-primary)' }}>{s.tag} · {s.date}</span>
              <span style={{ fontFamily: 'var(--gp-font-display)', fontSize: 16, fontWeight: 500, color: 'var(--gp-secondary)', lineHeight: 1.25, fontVariationSettings: 'var(--gp-display-vs)' }}>{s.title}</span>
              <span style={{ fontSize: 11, color: 'var(--gp-fg-dim)' }}>{s.metric}</span>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
};

/* =====================================================================
   STEWARDS section
   ===================================================================== */

const CdStewardsSection = ({ bp, layout }) => {
  const inset = GP_useInset(bp);
  return (
    <section style={{ padding: bp === 'mobile' ? '0 20px 56px' : `0 ${inset}px 80px` }}>
      <GP_SectionHeader
        bp={bp}
        overline="Stewards · the people"
        title={<>{CD_STEWARDS.length} stewards keep this node humming</>}
        side={bp !== 'mobile' ? <GP_ArrowLink>Meet the team</GP_ArrowLink> : null}
      />

      {layout === 'grid' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: bp === 'mobile' ? '1fr 1fr' : bp === 'tablet' ? 'repeat(3, 1fr)' : 'repeat(3, 1fr)',
          gap: bp === 'mobile' ? 10 : 18,
        }}>
          {CD_STEWARDS.map((s, i) => <CdStewardCell key={i} s={s} bp={bp} />)}
        </div>
      )}

      {layout === 'scroll' && (
        <div style={{
          display: 'flex',
          overflowX: 'auto',
          gap: 4,
          padding: '4px 0',
          margin: bp === 'mobile' ? '0 -20px' : `0 -${inset}px`,
          paddingLeft: bp === 'mobile' ? 20 : inset,
          paddingRight: bp === 'mobile' ? 20 : inset,
          scrollSnapType: 'x mandatory',
        }}>
          {CD_STEWARDS.map((s, i) => (
            <div key={i} style={{ scrollSnapAlign: 'start' }}>
              <CdStewardScrollItem s={s} />
            </div>
          ))}
        </div>
      )}

      {layout === 'portrait' && (
        <div>
          {CD_STEWARDS.map((s, i) => <CdStewardPortraitRow key={i} s={s} bp={bp} />)}
        </div>
      )}
    </section>
  );
};

/* =====================================================================
   EVENTS section
   ===================================================================== */

const CdEventsSection = ({ bp }) => {
  const inset = GP_useInset(bp);
  return (
    <section style={{ padding: bp === 'mobile' ? '0 20px 56px' : `0 ${inset}px 80px` }}>
      <GP_SectionHeader
        bp={bp}
        overline="Events · upcoming"
        title="Drop in"
        side={bp !== 'mobile' ? <GP_ArrowLink>All events</GP_ArrowLink> : null}
      />
      <div style={{
        display: 'grid',
        gridTemplateColumns: bp === 'mobile' ? '1fr' : 'repeat(3, 1fr)',
        gap: bp === 'mobile' ? 12 : 18,
      }}>
        {CD_EVENTS.map((e, i) => <CdEventCard key={i} e={e} bp={bp} />)}
      </div>
    </section>
  );
};

/* =====================================================================
   LIBRARY section
   ===================================================================== */

const CdLibrarySection = ({ bp }) => {
  const inset = GP_useInset(bp);
  return (
    <section style={{ padding: bp === 'mobile' ? '0 20px 56px' : `0 ${inset}px 80px` }}>
      <GP_SectionHeader
        bp={bp}
        overline="Library · from this chapter"
        title="Authored & translated"
        side={bp !== 'mobile' ? <GP_ArrowLink>All resources</GP_ArrowLink> : null}
      />
      <div>
        {CD_LIBRARY.map((b, i) => <CdLibraryRow key={i} b={b} last={i === CD_LIBRARY.length - 1} />)}
      </div>
    </section>
  );
};

/* =====================================================================
   LOCATION map — small zoomed-to-country map.
   Uses the same world dot-grid as the index page, but centers on Nigeria
   with a wider pin pulse to communicate "this is here".
   ===================================================================== */

const CdLocationSection = ({ bp }) => {
  const inset = GP_useInset(bp);
  return (
    <section style={{ padding: bp === 'mobile' ? '0 20px 56px' : `0 ${inset}px 80px` }}>
      <GP_SectionHeader
        bp={bp}
        overline="Map · this node"
        title="On the network"
      />
      <div style={{
        position: 'relative',
        width: '100%',
        aspectRatio: bp === 'mobile' ? '4 / 3' : '5 / 2',
        background: 'linear-gradient(180deg, rgba(20,63,48,0.7) 0%, rgba(15,61,46,0.4) 100%)',
        border: '1px solid var(--gp-border-soft)',
        borderRadius: 'var(--gp-radius-lg)',
        overflow: 'hidden',
      }}>
        <div aria-hidden="true" style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'url("hifi/assets/topo-bg.png")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.18,
          mixBlendMode: 'overlay',
        }} />
        <svg viewBox="0 0 200 100" preserveAspectRatio="xMidYMid slice"
             style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
          <ChDotWorld />
          {/* All other chapter pins — dimmed */}
          {CH_ALL_PINS.filter(p => p.slug !== 'nigeria').map((p, i) => (
            <circle key={`ctx-${i}`}
              cx={hmLonToX(p.lon ?? p.lng)} cy={hmLatToY(p.lat)}
              r={0.7}
              fill={p.status === 'ACTIVE' ? 'var(--gp-primary)' : 'var(--gp-secondary)'}
              opacity={0.32} />
          ))}
        </svg>
        {/* Nigeria pin overlay (positioned via percent) */}
        <div style={{
          position: 'absolute',
          left: `${hmLonToX(CD_CHAPTER.lng) / 2}%`,
          top:  `${hmLatToY(CD_CHAPTER.lat)}%`,
          transform: 'translate(-50%, -50%)',
        }}>
          <div style={{
            position: 'relative',
            width: 22, height: 22,
            borderRadius: '50%',
            background: 'var(--gp-primary)',
            border: '2px solid var(--gp-green-900)',
            boxShadow: '0 0 0 8px rgba(184,232,53,0.18), 0 0 28px rgba(184,232,53,0.55)',
            animation: 'hmLiveDot 2.6s ease-in-out infinite',
          }} />
          <div style={{
            position: 'absolute',
            left: '50%', top: '-12px',
            transform: 'translate(-50%, -100%)',
            background: 'var(--gp-green-700)',
            border: '1px solid var(--gp-border-soft)',
            borderRadius: 'var(--gp-radius-pill)',
            padding: '6px 14px',
            fontFamily: 'var(--gp-font-body)',
            fontSize: 12, fontWeight: 600,
            color: 'var(--gp-secondary)',
            whiteSpace: 'nowrap',
            boxShadow: '0 8px 24px -8px rgba(0,0,0,0.5)',
          }}>{CD_CHAPTER.city}</div>
        </div>

        <div style={{
          position: 'absolute', bottom: 14, left: 16,
          display: 'flex', alignItems: 'center', gap: 10,
          fontFamily: 'var(--gp-font-mono)',
          fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase',
          color: 'var(--gp-fg-dim)',
          pointerEvents: 'none',
        }}>
          <span>{CD_CHAPTER.lat.toFixed(2)}°N · {CD_CHAPTER.lng.toFixed(2)}°E</span>
        </div>
      </div>
    </section>
  );
};

/* =====================================================================
   CONNECT — list of links with big icon-pill on the left.
   ===================================================================== */

const CdConnectSection = ({ bp }) => {
  const inset = GP_useInset(bp);
  return (
    <section style={{ padding: bp === 'mobile' ? '0 20px 56px' : `0 ${inset}px 80px` }}>
      <GP_SectionHeader
        bp={bp}
        overline="Connect"
        title="Where this chapter lives"
        side={null}
      />
      <GP_Body size={bp === 'mobile' ? 14 : 16} style={{ color: 'var(--gp-fg-muted)', marginBottom: 24, maxWidth: 720 }}>
        The chapter coordinates here — use these to get in touch or join.
      </GP_Body>

      <div style={{
        display: 'grid',
        gridTemplateColumns: bp === 'mobile' ? '1fr' : 'repeat(2, 1fr)',
        gap: bp === 'mobile' ? 0 : '0 32px',
        padding: bp === 'mobile' ? 0 : 0,
      }}>
        {CD_LINKS.map((l, i) => {
          const col = bp === 'mobile' ? 0 : i % 2;
          const lastInColCount = bp === 'mobile' ? 1 : 2;
          const lastInThisCol = i >= CD_LINKS.length - lastInColCount;
          return <CdLinkRow key={i} l={l} last={lastInThisCol} />;
        })}
      </div>
    </section>
  );
};

/* =====================================================================
   RELATED CHAPTERS — peers in same region.
   ===================================================================== */

const CdRelatedSection = ({ bp }) => {
  const inset = GP_useInset(bp);
  return (
    <section style={{ padding: bp === 'mobile' ? '0 20px 56px' : `0 ${inset}px 80px` }}>
      <GP_SectionHeader
        bp={bp}
        overline="More from Africa"
        title="Sister chapters"
        side={bp !== 'mobile' ? <GP_ArrowLink href="Chapters (Hi-Fi).html">All chapters</GP_ArrowLink> : null}
      />
      <div style={{
        display: 'grid',
        gridTemplateColumns: bp === 'mobile' ? '1fr' : 'repeat(4, 1fr)',
        gap: bp === 'mobile' ? 10 : 14,
      }}>
        {CD_RELATED.map((slug, i) => <CdRelatedCard key={i} slug={slug} />)}
      </div>
    </section>
  );
};

Object.assign(window, {
  CdHeroLandscape, CdHeroFullBleed, CdHeroTypographic, CdHeroStatStrip,
  CdIntroSection, CdStoriesSection, CdStewardsSection,
  CdEventsSection, CdLibrarySection, CdLocationSection,
  CdConnectSection, CdRelatedSection,
});
