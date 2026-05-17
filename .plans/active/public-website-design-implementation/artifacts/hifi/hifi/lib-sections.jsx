/* hifi/lib-sections.jsx — hero variants + section blocks (books, podcast, bento).
   Each respects the active Direction (A/B/C/D) and the breakpoint. */

/* =====================================================================
   HEROES — one per direction.  Optional override via tweak forces a
   specific variant regardless of direction.
   ===================================================================== */

/* A — Editorial: large gold display headline, count strip, topo backdrop, no motif. */
const HFHeroEditorial = ({ inset, bp }) => (
  <section style={{
    padding: bp === 'mobile' ? '48px 20px 24px' : `120px ${inset}px 56px`,
    display: 'flex', flexDirection: 'column', gap: bp === 'mobile' ? 18 : 28,
    maxWidth: 1280, boxSizing: 'border-box',
  }}>
    <HF_Overline>Library · Knowledge commons</HF_Overline>
    <HF_Display
      size={bp === 'mobile' ? 44 : bp === 'tablet' ? 64 : 'clamp(64px, 7.5vw, 104px)'}
      style={{ maxWidth: 1020 }}
    >
      Everything we&rsquo;ve made public.
    </HF_Display>
    <HF_Body size={bp === 'mobile' ? 16 : 19} color="var(--gp-fg-muted)" style={{ maxWidth: 680 }}>
      Field-tested books, two hundred conversations, working guilds, and the playbooks behind them — open, free, and made by the network.
    </HF_Body>
    <div style={{
      display: 'flex', flexWrap: 'wrap',
      gap: bp === 'mobile' ? 14 : 32,
      marginTop: bp === 'mobile' ? 8 : 16, alignItems: 'center',
    }}>
      {[
        ['10', 'Books'],
        ['218', 'Podcast episodes'],
        ['3', 'Guilds'],
        ['3', 'Knowledge garden guides'],
      ].map(([num, label], i, arr) => (
        <React.Fragment key={label}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <span style={{
              fontFamily: 'var(--gp-font-display)',
              fontSize: bp === 'mobile' ? 22 : 28, fontWeight: 500,
              color: 'var(--gp-secondary)',
            }}>{num}</span>
            <HF_Mute size={bp === 'mobile' ? 12 : 14}>{label}</HF_Mute>
          </div>
          {i < arr.length - 1 && bp !== 'mobile' && (
            <span style={{ color: 'var(--gp-border)', opacity: 0.6 }}>·</span>
          )}
        </React.Fragment>
      ))}
    </div>
  </section>
);

/* B — Featured: lead with the latest book/episode pulled forward. */
const HFHeroFeatured = ({ inset, bp }) => (
  <section style={{
    padding: bp === 'mobile' ? '40px 20px 20px' : `88px ${inset}px 40px`,
    display: 'grid',
    gridTemplateColumns: bp === 'mobile' ? '1fr' : '1.1fr 1fr',
    gap: bp === 'mobile' ? 32 : 80,
    alignItems: 'center',
  }}>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <HF_Overline>Library</HF_Overline>
      <HF_H1
        size={bp === 'mobile' ? 36 : bp === 'tablet' ? 52 : 'clamp(48px, 5.6vw, 76px)'}
      >
        Everything we&rsquo;ve made public.
      </HF_H1>
      <HF_Body size={bp === 'mobile' ? 15 : 17} color="var(--gp-fg-muted)" style={{ maxWidth: 540 }}>
        Books, podcasts, guilds, and field playbooks from a network operating across five continents.
      </HF_Body>
      <div style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
        <HF_PrimaryButton>Browse books</HF_PrimaryButton>
        <HF_GhostButton>Latest episode →</HF_GhostButton>
      </div>
    </div>
    {/* featured card */}
    <div style={{
      background: 'var(--gp-green-700)',
      border: '1px solid var(--gp-border-soft)',
      borderRadius: 'var(--gp-radius-lg)',
      padding: bp === 'mobile' ? 20 : 28,
      display: 'flex', flexDirection: 'column', gap: 16,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <HF_Overline>Just released</HF_Overline>
        <HF_Caption>{HF_FEATURE_EP.age}</HF_Caption>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 18, alignItems: 'center' }}>
        <HF_BookCover b={HF_BOOKS[6]} w="100%" i={2} dense />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <HF_H3 size={bp === 'mobile' ? 20 : 22}>{HF_FEATURE_EP.t}</HF_H3>
          <HF_Mute size={13}>Ep {HF_FEATURE_EP.n} · {HF_FEATURE_EP.g}</HF_Mute>
          <HF_Body size={13} color="var(--gp-fg-muted)" style={{ marginTop: 4 }}>
            {HF_FEATURE_EP.blurb}
          </HF_Body>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
        <button style={{
          appearance: 'none', border: 0,
          width: 40, height: 40, borderRadius: '50%',
          background: 'var(--gp-primary)', color: 'var(--gp-primary-fg)',
          fontSize: 14, cursor: 'pointer',
          boxShadow: 'var(--gp-shadow-pill)',
        }}>▶</button>
        <div style={{ flex: 1, height: 4, background: 'var(--gp-green-600)', borderRadius: 2, position: 'relative' }}>
          <div style={{ position: 'absolute', inset: 0, width: '12%', background: 'var(--gp-primary)', borderRadius: 2 }} />
        </div>
        <HF_Caption style={{ fontFamily: 'var(--gp-font-mono)' }}>06:48 / {HF_FEATURE_EP.dur}</HF_Caption>
      </div>
    </div>
  </section>
);

/* C — Iconic: pill capsule motif right, content left.  The brand's signature move. */
const HFHeroIconic = ({ inset, bp }) => (
  <section style={{
    padding: bp === 'mobile' ? '32px 20px 20px' : `72px ${inset}px 32px`,
    display: 'grid',
    gridTemplateColumns: bp === 'mobile' ? '1fr' : '1.2fr 0.9fr',
    gap: bp === 'mobile' ? 24 : 48,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  }}>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22, position: 'relative', zIndex: 1 }}>
      <HF_Overline>The Library · Greenpill Network</HF_Overline>
      <HF_Display
        size={bp === 'mobile' ? 40 : bp === 'tablet' ? 56 : 'clamp(56px, 6.4vw, 88px)'}
      >
        Everything we&rsquo;ve made public.
      </HF_Display>
      <HF_Body size={bp === 'mobile' ? 15 : 18} color="var(--gp-fg-muted)" style={{ maxWidth: 540 }}>
        A growing commons of regenerative coordination — written, recorded, and stewarded by the network.
      </HF_Body>
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 24,
        marginTop: 8, alignItems: 'center',
        fontFamily: 'var(--gp-font-mono)',
        fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase',
        color: 'var(--gp-fg-dim)',
      }}>
        <span>10 books</span>
        <span style={{ opacity: 0.4 }}>·</span>
        <span>218 episodes</span>
        <span style={{ opacity: 0.4 }}>·</span>
        <span>3 guilds</span>
        <span style={{ opacity: 0.4 }}>·</span>
        <span>3 garden guides</span>
      </div>
    </div>
    <div style={{
      position: 'relative',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: bp === 'mobile' ? 240 : 360,
    }}>
      {/* lime glow disc behind */}
      <div aria-hidden="true" style={{
        position: 'absolute', inset: '8%',
        background: 'radial-gradient(circle, rgba(184,232,53,0.18), transparent 65%)',
        filter: 'blur(20px)',
        animation: 'hfPulse 3.2s cubic-bezier(0.22, 1, 0.36, 1) infinite',
      }} />
      <img
        src="hifi/assets/pill-motif.png"
        alt=""
        style={{
          width: '90%', maxWidth: 460, height: 'auto',
          transform: 'rotate(-18deg)',
          filter: 'drop-shadow(-7px 7px 28px rgba(22,50,31,0.6))',
          position: 'relative', zIndex: 1,
        }}
      />
    </div>
  </section>
);

/* D — Mono: type-led, gold wordmark, hairline rule, NO lime in body. */
const HFHeroMono = ({ inset, bp }) => (
  <section style={{
    padding: bp === 'mobile' ? '56px 20px 28px' : `136px ${inset}px 80px`,
    display: 'flex', flexDirection: 'column', gap: bp === 'mobile' ? 22 : 40,
    maxWidth: 1240, boxSizing: 'border-box',
  }}>
    <div style={{
      fontFamily: 'var(--gp-font-mono)',
      fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase',
      color: 'var(--gp-fg-dim)',
      display: 'flex', justifyContent: 'space-between',
      paddingBottom: 16,
      borderBottom: '1px solid rgba(240,220,160,0.18)',
    }}>
      <span>The Greenpill Library · Vol. I</span>
      <span>Edited by the network</span>
    </div>
    <HF_Display
      size={bp === 'mobile' ? 48 : bp === 'tablet' ? 80 : 'clamp(72px, 9vw, 132px)'}
      style={{
        letterSpacing: '-0.025em',
        fontVariationSettings: '"SOFT" 30, "WONK" 1',
      }}
    >
      Everything<br />we&rsquo;ve made<br /><em style={{ fontStyle: 'italic', color: 'var(--gp-secondary)', opacity: 0.85 }}>public.</em>
    </HF_Display>
    <div style={{
      display: 'flex',
      flexDirection: bp === 'mobile' ? 'column' : 'row',
      justifyContent: 'space-between',
      alignItems: bp === 'mobile' ? 'flex-start' : 'flex-end',
      gap: 32,
      paddingTop: 24,
      borderTop: '1px solid rgba(240,220,160,0.18)',
    }}>
      <HF_Body size={bp === 'mobile' ? 15 : 17} color="var(--gp-fg)" style={{ maxWidth: 560 }}>
        A field commons for regenerative coordination. Read freely, cite generously, fork at will.
      </HF_Body>
      <div style={{
        fontFamily: 'var(--gp-font-mono)',
        fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase',
        color: 'var(--gp-fg-muted)',
        display: 'flex', flexDirection: 'column', gap: 6, textAlign: bp === 'mobile' ? 'left' : 'right',
      }}>
        <span>10 books — 218 episodes</span>
        <span>3 guilds — 3 garden guides</span>
      </div>
    </div>
  </section>
);

/* =====================================================================
   BOOKS RAIL
   ===================================================================== */

/* covers — desktop: 5-col × 2-row grid (10 books fits exactly).
   Mobile: horizontal carousel.  "View more" appears only if data exceeds visible. */
const HFBooksCovers = ({ inset, bp }) => {
  const dir = useDirection();
  const dense = dir.density === 'packed' || dir.density === 'editorial';

  // grid params per breakpoint
  const cols = bp === 'mobile' ? null : bp === 'tablet' ? 4 : 5;
  const rows = 2;
  const visibleCount = cols ? cols * rows : HF_BOOKS.length;
  const visible = HF_BOOKS.slice(0, visibleCount);
  const hasMore = HF_BOOKS.length > visibleCount;

  /* mobile carousel */
  if (bp === 'mobile') {
    const coverW = 168;
    return (
      <div>
        <HF_SectionHeader
          overline="Books · The foundation"
          title="Read the books."
        />
        <div style={{ position: 'relative', marginRight: -20 }}>
          <div style={{
            display: 'flex', gap: 16,
            overflowX: 'auto',
            paddingRight: 20,
            scrollSnapType: 'x mandatory',
            scrollbarWidth: 'none',
            WebkitOverflowScrolling: 'touch',
          }}>
            {HF_BOOKS.map((b, i) => (
              <div key={i} style={{
                flex: 'none', width: coverW,
                display: 'flex', flexDirection: 'column', gap: 12,
                scrollSnapAlign: 'start',
              }}>
                <HF_BookCover b={b} w="100%" i={i} dense />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <HF_Body size={14} style={{ color: 'var(--gp-fg)', fontWeight: 500, lineHeight: 1.3 }}>
                    {b.t}{b.edition ? ` ${b.edition}` : ''}
                  </HF_Body>
                  <HF_Mute size={12}>{b.a}</HF_Mute>
                </div>
              </div>
            ))}
          </div>
          {/* carousel dots */}
          <div style={{
            display: 'flex', gap: 6, justifyContent: 'center',
            marginTop: 20, paddingRight: 20,
          }}>
            {[0,1,2].map(i => (
              <span key={i} style={{
                width: i === 0 ? 18 : 6, height: 6, borderRadius: 3,
                background: i === 0 ? (dir.useLime ? 'var(--gp-primary)' : 'var(--gp-secondary)') : 'var(--gp-border)',
                transition: 'width 200ms',
              }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* desktop / tablet — 2-row grid with inline expand */
  const [expanded, setExpanded] = React.useState(false);
  const shown = expanded ? HF_BOOKS : visible;
  return (
    <div>
      <HF_SectionHeader
        overline="Books · The foundation"
        title="Read the books."
      />
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        rowGap: bp === 'tablet' ? 32 : 40,
        columnGap: bp === 'tablet' ? 22 : 28,
      }}>
        {shown.map((b, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <HF_BookCover b={b} w="100%" i={i} dense={dense} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <HF_Body size={15} style={{ color: 'var(--gp-fg)', fontWeight: 500, lineHeight: 1.3 }}>
                {b.t}{b.edition ? ` ${b.edition}` : ''}
              </HF_Body>
              <HF_Mute size={12}>{b.a}</HF_Mute>
            </div>
          </div>
        ))}
      </div>
      {hasMore && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 40 }}>
          <button
            onClick={() => setExpanded(e => !e)}
            style={{
              appearance: 'none',
              border: '1px solid var(--gp-border)',
              background: 'transparent',
              height: 44, padding: '0 28px',
              borderRadius: 'var(--gp-radius-pill)',
              color: 'var(--gp-fg)',
              fontFamily: 'var(--gp-font-body)', fontSize: 14, fontWeight: 600,
              cursor: 'pointer',
            }}>
            {expanded
              ? 'Show fewer ↑'
              : `Show all ${HF_BOOKS.length} books ↓`}
          </button>
        </div>
      )}
    </div>
  );
};

/* editorial-cards — book + pull quote / meta side panel */
const HFBooksEditorial = ({ inset, bp }) => (
  <div>
    <HF_SectionHeader
      overline="Books · The foundation"
      title="Read the books."
      side={bp !== 'mobile' && <HF_ArrowLink>All 10</HF_ArrowLink>}
    />
    <div style={{
      display: 'grid',
      gridTemplateColumns: bp === 'mobile' ? '1fr' : bp === 'tablet' ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)',
      gap: bp === 'mobile' ? 20 : 28,
    }}>
      {HF_BOOKS.slice(0, 6).map((b, i) => (
        <div key={i} style={{
          background: 'var(--gp-green-700)',
          border: '1px solid var(--gp-border-soft)',
          borderRadius: 'var(--gp-radius-lg)',
          padding: 24,
          display: 'grid',
          gridTemplateColumns: '110px 1fr',
          gap: 20,
          alignItems: 'center',
        }}>
          <HF_BookCover b={b} w="100%" i={i} dense />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <HF_Mute size={11} style={{ fontFamily: 'var(--gp-font-mono)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {b.edition ? `${b.edition} · ${b.y}` : `Published ${b.y}`}
            </HF_Mute>
            <HF_H3 size={20}>{b.t}</HF_H3>
            <HF_Mute size={13}>{b.a}</HF_Mute>
            <HF_Mute size={11} style={{ fontFamily: 'var(--gp-font-mono)', marginTop: 4 }}>
              {b.pages} pages
            </HF_Mute>
          </div>
        </div>
      ))}
    </div>
  </div>
);

/* numbered — print-monograph table of contents */
const HFBooksNumbered = ({ inset, bp }) => (
  <div>
    <HF_SectionHeader
      overline="Books · The foundation"
      title="Read the books."
      side={bp !== 'mobile' && (
        <HF_Mute size={12} style={{ fontFamily: 'var(--gp-font-mono)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Ten volumes · all open
        </HF_Mute>
      )}
    />
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {HF_BOOKS.map((b, i) => (
        <a key={i} href="#" style={{
          textDecoration: 'none', color: 'inherit',
          display: 'grid',
          gridTemplateColumns: bp === 'mobile' ? '32px 1fr auto' : '56px 1fr 200px auto',
          gap: bp === 'mobile' ? 14 : 24,
          alignItems: 'baseline',
          padding: bp === 'mobile' ? '20px 0' : '28px 0',
          borderTop: '1px solid rgba(240,220,160,0.18)',
          ...(i === HF_BOOKS.length - 1 && { borderBottom: '1px solid rgba(240,220,160,0.18)' }),
        }}>
          <span style={{
            fontFamily: 'var(--gp-font-mono)',
            fontSize: bp === 'mobile' ? 11 : 13,
            color: 'var(--gp-fg-dim)',
            letterSpacing: '0.05em',
          }}>{String(i + 1).padStart(2, '0')}</span>
          <span style={{
            fontFamily: 'var(--gp-font-display)',
            fontSize: bp === 'mobile' ? 20 : 28,
            fontWeight: 500,
            color: 'var(--gp-secondary)',
            lineHeight: 1.15,
          }}>{b.t}{b.edition ? <em style={{ fontStyle: 'italic', opacity: 0.7, fontSize: '0.7em', marginLeft: 8 }}>{b.edition}</em> : null}</span>
          {bp !== 'mobile' && (
            <HF_Mute size={13} style={{ fontFamily: 'var(--gp-font-body)' }}>{b.a}</HF_Mute>
          )}
          <span style={{
            fontFamily: 'var(--gp-font-mono)',
            fontSize: bp === 'mobile' ? 10 : 11,
            color: 'var(--gp-fg-dim)',
            letterSpacing: '0.05em',
          }}>{b.y} · {b.pages}p</span>
        </a>
      ))}
    </div>
  </div>
);

const HFBooksSection = ({ inset, bp }) => {
  const dir = useDirection();
  if (dir.books === 'editorial-cards') return <HFBooksEditorial inset={inset} bp={bp} />;
  if (dir.books === 'numbered')        return <HFBooksNumbered  inset={inset} bp={bp} />;
  return <HFBooksCovers inset={inset} bp={bp} />;
};

/* =====================================================================
   PODCAST — feature episode + list (matches wireframe)
   ===================================================================== */

const HFPodcastFeature = ({ bp }) => {
  const dir = useDirection();
  const isMono = !dir.useLime;
  return (
    <div style={{
      background: dir.cardElev,
      border: `1px solid ${dir.cardBorder}`,
      borderRadius: 'var(--gp-radius-lg)',
      padding: bp === 'mobile' ? 22 : 32,
      display: 'flex', flexDirection: 'column', gap: 18,
      height: '100%', boxSizing: 'border-box',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <HF_Overline>Latest episode · {HF_FEATURE_EP.age}</HF_Overline>
        <HF_Caption style={{ fontFamily: 'var(--gp-font-mono)' }}>{HF_FEATURE_EP.dur}</HF_Caption>
      </div>
      <HF_PlaceImg label={`COVER · EP ${HF_FEATURE_EP.n}`} h={bp === 'mobile' ? 180 : 220} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <HF_Mute size={12} style={{ fontFamily: 'var(--gp-font-mono)', letterSpacing: '0.06em' }}>
          EP {HF_FEATURE_EP.n}
        </HF_Mute>
        <HF_H2 size={bp === 'mobile' ? 24 : 30}>{HF_FEATURE_EP.t}</HF_H2>
        <HF_Mute size={13}>{HF_FEATURE_EP.g}</HF_Mute>
      </div>
      <HF_Body size={14} color="var(--gp-fg-muted)" style={{ lineHeight: 1.55 }}>
        {HF_FEATURE_EP.blurb}
      </HF_Body>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 'auto', paddingTop: 8 }}>
        <button style={{
          appearance: 'none', border: 0,
          width: 48, height: 48, borderRadius: '50%',
          background: isMono ? 'var(--gp-secondary)' : 'var(--gp-primary)',
          color: 'var(--gp-primary-fg)',
          fontSize: 15, cursor: 'pointer',
          boxShadow: isMono ? 'none' : 'var(--gp-shadow-pill)',
        }}>▶</button>
        <div style={{ flex: 1, height: 4, background: 'var(--gp-green-600)', borderRadius: 2, position: 'relative' }}>
          <div style={{
            position: 'absolute', left: 0, top: 0, width: '18%', height: '100%',
            background: isMono ? 'var(--gp-secondary)' : 'var(--gp-primary)',
            borderRadius: 2,
          }} />
        </div>
        <HF_Caption style={{ fontFamily: 'var(--gp-font-mono)' }}>10:42 / {HF_FEATURE_EP.dur}</HF_Caption>
      </div>
    </div>
  );
};

const HFEpisodeRow = ({ ep, last }) => {
  const dir = useDirection();
  return (
    <a href="#" style={{
      textDecoration: 'none', color: 'inherit',
      display: 'grid',
      gridTemplateColumns: '64px 1fr auto auto',
      gap: 18, alignItems: 'center',
      padding: '20px 0',
      borderBottom: last ? 'none' : `1px solid ${dir.cardBorder}`,
    }}>
      <HF_PlaceImg label={`EP ${ep.n}`} h={64} w={64} />
      <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <HF_Mute size={11} style={{ fontFamily: 'var(--gp-font-mono)', letterSpacing: '0.06em' }}>
          EP {ep.n} · {ep.age}
        </HF_Mute>
        <span style={{
          fontFamily: 'var(--gp-font-display)',
          fontSize: 19, fontWeight: 500, color: 'var(--gp-secondary)',
          lineHeight: 1.2, letterSpacing: '-0.005em',
        }}>{ep.t}</span>
        <HF_Mute size={12}>{ep.g}</HF_Mute>
      </div>
      <HF_Caption style={{ fontFamily: 'var(--gp-font-mono)' }}>{ep.dur}</HF_Caption>
      <div style={{
        width: 36, height: 36, borderRadius: '50%',
        border: '1px solid var(--gp-border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 12, color: 'var(--gp-fg)',
      }}>▶</div>
    </a>
  );
};

const HFPodcastSection = ({ inset, bp }) => (
  <div>
    <HF_SectionHeader
      overline="Podcast · Most active surface"
      title="218 conversations on regenerative web3."
      side={bp !== 'mobile' && <HF_ArrowLink>Browse all episodes</HF_ArrowLink>}
    />
    <div style={{
      display: 'grid',
      gridTemplateColumns: bp === 'mobile' || bp === 'tablet' ? '1fr' : '1.2fr 1fr',
      gap: bp === 'mobile' ? 28 : 36,
    }}>
      <HFPodcastFeature bp={bp} />
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {HF_EPS.map((ep, i) => (
          <HFEpisodeRow key={ep.n} ep={ep} last={i === HF_EPS.length - 1} />
        ))}
      </div>
    </div>
    {bp === 'mobile' && (
      <div style={{
        display: 'flex', justifyContent: 'center',
        marginTop: 28, paddingTop: 24,
        borderTop: '1px solid var(--gp-border-soft)',
      }}>
        <HF_ArrowLink>Browse all 218 episodes</HF_ArrowLink>
      </div>
    )}
  </div>
);

/* =====================================================================
   BENTO — Guilds + Knowledge Garden
   Split into two distinct sub-sections, each with its own "view all".
   Card structures are differentiated per type.
   ===================================================================== */

/* Status pill (active / cohort / etc.) */
const HFStatusPill = ({ label, dotColor }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', gap: 6,
    height: 24, padding: '0 10px',
    border: '1px solid var(--gp-border-soft)',
    borderRadius: 'var(--gp-radius-pill)',
    fontFamily: 'var(--gp-font-mono)',
    fontSize: 10, letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'var(--gp-fg-muted)',
  }}>
    <span style={{
      width: 6, height: 6, borderRadius: '50%',
      background: dotColor,
    }} />
    {label}
  </span>
);

/* Avatar stack — used in guilds */
const HFAvatarStack = ({ count, extra = 0, size = 28 }) => (
  <div style={{ display: 'flex', alignItems: 'center' }}>
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} style={{
        width: size, height: size, borderRadius: '50%',
        border: '1.5px solid var(--gp-green-700)',
        background: [
          'linear-gradient(135deg, #2A6B52, #1A4D3A)',
          'linear-gradient(135deg, #F0DCA0, #B8954D)',
          'linear-gradient(135deg, #B8E835, #6BAA1E)',
          'linear-gradient(135deg, #1A4D3A, #0F3D2E)',
          'linear-gradient(135deg, #FAE8C2, #C8A86E)',
        ][i % 5],
        marginLeft: i === 0 ? 0 : -8,
      }} />
    ))}
    {extra > 0 && (
      <span style={{
        height: size,
        marginLeft: 10,
        display: 'inline-flex', alignItems: 'center',
        fontFamily: 'var(--gp-font-mono)',
        fontSize: 11,
        color: 'var(--gp-fg-muted)',
        letterSpacing: '0.04em',
      }}>+{extra} more</span>
    )}
  </div>
);

/* --- GUILD CARD --- */
const HFGuildCard = ({ item, featured }) => {
  const dir = useDirection();
  const det = HF_GUILD_DETAILS[item.t] || {};
  return (
    <div style={{
      position: 'relative',
      background: featured
        ? 'linear-gradient(155deg, rgba(184,232,53,0.06), rgba(20,63,48,0.5))'
        : 'rgba(20, 63, 48, 0.5)',
      border: featured
        ? `1px solid ${dir.useLime ? 'rgba(184,232,53,0.35)' : 'var(--gp-border-soft)'}`
        : `1px solid ${dir.cardBorder}`,
      borderRadius: 'var(--gp-radius-lg)',
      padding: 24,
      display: 'flex', flexDirection: 'column', gap: 16,
      height: '100%', minHeight: 300,
      boxSizing: 'border-box',
    }}>
      {/* header row: overline + lead */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <HF_Overline color={dir.useLime ? 'var(--gp-primary)' : 'var(--gp-secondary)'}>
          Guild
        </HF_Overline>
        <span style={{
          fontFamily: 'var(--gp-font-mono)', fontSize: 11,
          color: 'var(--gp-fg-dim)', letterSpacing: '0.06em', textTransform: 'uppercase',
        }}>Led by {det.lead || '—'}</span>
      </div>

      {/* title + description */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <HF_H3 size={24} style={{ letterSpacing: '-0.01em' }}>{item.t}</HF_H3>
        <HF_Body size={14} color="var(--gp-fg-muted)" style={{ lineHeight: 1.5 }}>
          {item.d}
        </HF_Body>
      </div>

      {/* tags */}
      {item.tags && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {item.tags.map(tg => (
            <span key={tg} style={{
              fontFamily: 'var(--gp-font-body)',
              fontSize: 11, fontWeight: 600,
              padding: '4px 10px',
              border: '1px solid var(--gp-border-soft)',
              borderRadius: 'var(--gp-radius-pill)',
              color: 'var(--gp-fg-muted)',
              whiteSpace: 'nowrap',
            }}>{tg}</span>
          ))}
        </div>
      )}

      {/* stats strip: members + projects */}
      <div style={{
        marginTop: 'auto',
        display: 'flex', flexDirection: 'column', gap: 14,
        paddingTop: 16,
        borderTop: `1px solid ${dir.cardBorder}`,
      }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12,
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{
              fontFamily: 'var(--gp-font-display)', fontSize: 28, fontWeight: 500,
              color: 'var(--gp-secondary)', letterSpacing: '-0.01em',
              lineHeight: 1,
            }}>{item.m}</span>
            <span style={{
              fontFamily: 'var(--gp-font-mono)', fontSize: 10,
              color: 'var(--gp-fg-dim)', letterSpacing: '0.08em', textTransform: 'uppercase',
            }}>Members</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{
              fontFamily: 'var(--gp-font-display)', fontSize: 28, fontWeight: 500,
              color: 'var(--gp-secondary)', letterSpacing: '-0.01em',
              lineHeight: 1,
            }}>{det.projects ?? '—'}</span>
            <span style={{
              fontFamily: 'var(--gp-font-mono)', fontSize: 10,
              color: 'var(--gp-fg-dim)', letterSpacing: '0.08em', textTransform: 'uppercase',
            }}>Active projects</span>
          </div>
        </div>
        <HF_ArrowLink size={13}>Visit guild</HF_ArrowLink>
      </div>
    </div>
  );
};

/* --- KNOWLEDGE GARDEN CARD --- */
const HFGardenCard = ({ item, featured }) => {
  const dir = useDirection();
  const det = HF_GARDEN_DETAILS[item.t] || {};
  return (
    <div style={{
      position: 'relative',
      background: 'rgba(20, 63, 48, 0.5)',
      border: `1px solid ${dir.cardBorder}`,
      borderRadius: 'var(--gp-radius-lg)',
      padding: 24,
      display: 'flex', flexDirection: 'column', gap: 16,
      height: '100%', minHeight: 300,
      boxSizing: 'border-box',
      overflow: 'hidden',
    }}>
      {/* garden overlay texture */}
      <div aria-hidden="true" style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'url("hifi/assets/garden-overlay.jpg")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        opacity: featured ? 0.22 : 0.14,
        mixBlendMode: 'overlay',
        pointerEvents: 'none',
      }} />
      {/* gold corner mark */}
      <div aria-hidden="true" style={{
        position: 'absolute', top: 0, left: 0,
        width: 2, height: 36,
        background: 'var(--gp-gold-300)',
        opacity: 0.6,
      }} />

      <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <HF_Overline color="var(--gp-gold-300)">
          Knowledge Garden
        </HF_Overline>
        <span style={{
          fontFamily: 'var(--gp-font-mono)', fontSize: 11,
          color: 'var(--gp-fg-muted)', letterSpacing: '0.06em', textTransform: 'uppercase',
        }}>{det.read || ''}</span>
      </div>

      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <HF_H3 size={24} style={{ letterSpacing: '-0.01em' }}>{item.t}</HF_H3>
        <HF_Body size={14} color="var(--gp-fg-muted)" style={{ lineHeight: 1.5 }}>
          {item.d}
        </HF_Body>
      </div>

      {/* topics */}
      {det.topics && (
        <div style={{ position: 'relative', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {det.topics.map(tg => (
            <span key={tg} style={{
              fontFamily: 'var(--gp-font-body)',
              fontSize: 11, fontWeight: 600,
              padding: '4px 10px',
              background: 'rgba(240,220,160,0.08)',
              border: '1px solid rgba(240,220,160,0.22)',
              borderRadius: 'var(--gp-radius-pill)',
              color: 'var(--gp-gold-300)',
              whiteSpace: 'nowrap',
            }}>{tg}</span>
          ))}
        </div>
      )}

      <div style={{
        position: 'relative',
        marginTop: 'auto',
        paddingTop: 16,
        borderTop: `1px solid ${dir.cardBorder}`,
        display: 'flex', flexDirection: 'column', gap: 14,
      }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
          gap: 12,
          fontFamily: 'var(--gp-font-mono)', fontSize: 11,
          color: 'var(--gp-fg-dim)', letterSpacing: '0.06em', textTransform: 'uppercase',
        }}>
          <span>{det.updated}</span>
          <span>{det.authors} authors</span>
        </div>
        <HF_ArrowLink size={13} color="var(--gp-gold-300)">Open guide</HF_ArrowLink>
      </div>
    </div>
  );
};

const HFBentoSection = ({ inset, bp }) => {
  const dir = useDirection();
  const grid = bp === 'mobile' ? '1fr' : bp === 'tablet' ? '1fr 1fr' : 'repeat(3, 1fr)';
  const gap = bp === 'mobile' ? 14 : 20;
  // On tablet: 2 cards top, 3rd card spans both columns at the bottom
  const spanLast = bp === 'tablet';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: bp === 'mobile' ? 56 : 80, position: 'relative' }}>
      {/* GUILDS */}
      <div>
        <HF_SectionHeader
          overline="Guilds · Working circles"
          title="Build with the network."
        />
        <div style={{ display: 'grid', gridTemplateColumns: grid, gap }}>
          {HF_GUILDS.map((g, i) => (
            <div
              key={g.t}
              style={spanLast && i === HF_GUILDS.length - 1 ? { gridColumn: '1 / -1' } : undefined}
            >
              <HFGuildCard item={g} featured={i === 0} />
            </div>
          ))}
        </div>
      </div>

      {/* KNOWLEDGE GARDEN */}
      <div>
        <HF_SectionHeader
          overline="Knowledge Garden · Living guides"
          title="Learn how the network operates."
        />
        <div style={{ display: 'grid', gridTemplateColumns: grid, gap }}>
          {HF_GARDEN.map((g, i) => (
            <div
              key={g.t}
              style={spanLast && i === HF_GARDEN.length - 1 ? { gridColumn: '1 / -1' } : undefined}
            >
              <HFGardenCard item={g} featured={i === 0} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

Object.assign(window, {
  HFHeroEditorial, HFHeroFeatured, HFHeroIconic, HFHeroMono,
  HFBooksSection, HFPodcastSection, HFBentoSection,
});
