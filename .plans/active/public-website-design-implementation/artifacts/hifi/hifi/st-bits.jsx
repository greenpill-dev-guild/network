/* hifi/st-bits.jsx — Stories building blocks: filter bar, story rows, supporting strips. */

/* Tiny meta line: CHAPTER · TAG · DATE */
const StMeta = ({ chapter, tag, date, size = 10 }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
    {chapter && (
      <span style={{
        fontFamily: 'var(--gp-font-mono)',
        fontSize: size, letterSpacing: '0.14em', textTransform: 'uppercase',
        color: 'var(--gp-secondary)',
      }}>{chapter}</span>
    )}
    {chapter && tag && <span style={{ opacity: 0.4, fontSize: size }}>·</span>}
    {tag && (
      <span style={{
        fontFamily: 'var(--gp-font-mono)',
        fontSize: size, letterSpacing: '0.14em', textTransform: 'uppercase',
        color: 'var(--gp-primary)',
      }}>{tag}</span>
    )}
    {date && <span style={{ opacity: 0.4, fontSize: size }}>·</span>}
    {date && <span style={{ fontFamily: 'var(--gp-font-mono)', fontSize: size, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--gp-fg-dim)' }}>{date}</span>}
  </div>
);

/* Byline line for inside cards: AUTHOR · DATE · READ
   Each segment is non-wrapping so the byline breaks between · separators
   instead of mid-segment. */
const StByline = ({ author, date, read, color = 'var(--gp-fg-dim)' }) => (
  <span style={{
    fontFamily: 'var(--gp-font-body)',
    fontSize: 12, color,
    letterSpacing: '0.005em',
  }}>
    <span style={{ whiteSpace: 'nowrap' }}>{author}</span>
    {date && <><span aria-hidden="true">{' · '}</span><span style={{ whiteSpace: 'nowrap' }}>{date}</span></>}
    {read && <><span aria-hidden="true">{' · '}</span><span style={{ whiteSpace: 'nowrap' }}>{read}</span></>}
  </span>
);

/* ---------- Filter bar — 3 styles: pills (default), underlines, dropdown-only ---------- */

const StTopicPill = ({ children, active }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center',
    height: 32, padding: '0 14px',
    borderRadius: 'var(--gp-radius-pill)',
    background: active ? 'var(--gp-primary)' : 'transparent',
    border: active ? '1px solid var(--gp-primary)' : '1px solid var(--gp-border)',
    color: active ? 'var(--gp-primary-fg)' : 'var(--gp-fg-muted)',
    fontFamily: 'var(--gp-font-body)',
    fontSize: 13, fontWeight: 600,
    letterSpacing: '0.005em',
    whiteSpace: 'nowrap',
    flex: 'none',
    cursor: 'default',
    transition: 'background 200ms, color 200ms',
  }}>{children}</span>
);

const StTopicUnderline = ({ children, active }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center',
    height: 32, padding: '0 2px',
    borderBottom: active ? '2px solid var(--gp-primary)' : '2px solid transparent',
    color: active ? 'var(--gp-fg)' : 'var(--gp-fg-muted)',
    fontFamily: 'var(--gp-font-body)',
    fontSize: 14, fontWeight: 600,
    letterSpacing: '0.005em',
    whiteSpace: 'nowrap',
    flex: 'none',
  }}>{children}</span>
);

const StSelect = ({ label, value }) => (
  <div style={{
    display: 'inline-flex', alignItems: 'center', gap: 8,
    height: 32, padding: '0 14px',
    borderRadius: 'var(--gp-radius-pill)',
    border: '1px solid var(--gp-border)',
    background: 'var(--gp-green-800)',
    fontFamily: 'var(--gp-font-body)',
    fontSize: 13,
    color: 'var(--gp-fg)',
  }}>
    <span style={{ color: 'var(--gp-fg-dim)' }}>{label}:</span>
    <span style={{ fontWeight: 600 }}>{value}</span>
    <span aria-hidden="true" style={{ color: 'var(--gp-primary)', fontSize: 10, marginLeft: 2 }}>▾</span>
  </div>
);

const StFilterBar = ({ bp, style = 'pills', showChapter = true }) => {
  const mobile = bp === 'mobile';
  return (
    <div style={{
      display: 'flex',
      flexDirection: mobile ? 'column' : 'row',
      alignItems: mobile ? 'stretch' : 'center',
      justifyContent: 'space-between',
      gap: mobile ? 12 : 18,
      paddingBottom: 16,
      borderBottom: '1px solid var(--gp-border-soft)',
    }}>
      {style === 'dropdown' ? (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <StSelect label="Topic" value="All" />
          {showChapter && <StSelect label="Chapter" value="All chapters" />}
        </div>
      ) : (
        <div style={{
          display: 'flex',
          gap: style === 'underlines' ? 24 : 10,
          flexWrap: mobile ? 'nowrap' : 'wrap',
          overflowX: mobile ? 'auto' : 'visible',
          paddingBottom: mobile ? 4 : 0,
          paddingRight: mobile ? 24 : 0,
          msOverflowStyle: 'none', scrollbarWidth: 'none',
          maskImage: mobile ? 'linear-gradient(to right, #000 calc(100% - 24px), transparent 100%)' : undefined,
          WebkitMaskImage: mobile ? 'linear-gradient(to right, #000 calc(100% - 24px), transparent 100%)' : undefined,
        }}>
          {ST_TOPIC_TAGS.map((t, i) => (
            style === 'underlines'
              ? <StTopicUnderline key={t} active={i === 0}>{t}</StTopicUnderline>
              : <StTopicPill key={t} active={i === 0}>{t}</StTopicPill>
          ))}
        </div>
      )}
      {style !== 'dropdown' && (
        <div style={{ display: 'flex', gap: 8, flex: 'none' }}>
          {showChapter && <StSelect label="Chapter" value="All" />}
          <StSelect label="Sort" value="Newest" />
        </div>
      )}
    </div>
  );
};

/* ---------- Feed row — 2-col list with thumb on the left ---------- */

const StFeedRow = ({ item, bp, last, density = 'comfortable' }) => {
  const mobile = bp === 'mobile';
  const compact = density === 'compact';
  const thumbW = mobile ? '100%' : (compact ? 140 : 200);
  const thumbH = mobile ? 160 : (compact ? 100 : 140);
  return (
    <a href="Story (Hi-Fi).html" style={{
      display: 'flex',
      flexDirection: mobile ? 'column' : 'row',
      gap: mobile ? 12 : (compact ? 16 : 22),
      padding: mobile ? '18px 0' : (compact ? '16px 0' : '22px 0'),
      borderBottom: last ? 'none' : '1px solid var(--gp-border-soft)',
      textDecoration: 'none', color: 'var(--gp-fg)',
      minWidth: 0,
    }}>
      <div style={{ flex: 'none', width: thumbW }}>
        <GP_PlaceImg label={item.photo} h={thumbH} />
      </div>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: compact ? 5 : 8 }}>
        <StMeta chapter={item.chapter} tag={item.tag} />
        <div style={{
          fontFamily: 'var(--gp-font-display)',
          fontSize: mobile ? 20 : (compact ? 19 : 23),
          fontWeight: 500,
          color: 'var(--gp-secondary)',
          lineHeight: 1.2,
          fontVariationSettings: 'var(--gp-display-vs)',
          textWrap: 'pretty',
        }}>{item.title}</div>
        {!compact && (
          <div style={{
            fontFamily: 'var(--gp-font-body)',
            fontSize: 13, color: 'var(--gp-fg-muted)', lineHeight: 1.55,
          }}>{item.dek}</div>
        )}
        <div style={{
          marginTop: 'auto', paddingTop: 4,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8,
        }}>
          <StByline author={item.author} date={item.date} read={item.read} />
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--gp-primary)', whiteSpace: 'nowrap' }}>Read →</span>
        </div>
      </div>
    </a>
  );
};

/* ---------- Sub-feature card (paired beside the cinematic hero) ---------- */

const StSubFeatureCard = ({ item, bp, vertical = true }) => {
  const mobile = bp === 'mobile';
  return (
    <a href="Story (Hi-Fi).html" style={{
      display: 'flex',
      flexDirection: vertical ? 'column' : 'row',
      gap: vertical ? 14 : 18,
      padding: vertical ? 20 : 18,
      background: 'var(--gp-green-800)',
      border: '1px solid var(--gp-border-soft)',
      borderRadius: 'var(--gp-radius-lg)',
      textDecoration: 'none', color: 'var(--gp-fg)',
      minWidth: 0, flex: 1,
      transition: 'border-color 200ms',
    }}
    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(184,232,53,0.35)'; }}
    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--gp-border-soft)'; }}>
      <div style={{ flex: 'none', width: vertical ? '100%' : (mobile ? '40%' : 160) }}>
        <GP_PlaceImg label={item.photo} h={vertical ? (mobile ? 140 : 170) : 130} />
      </div>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <StMeta chapter={item.chapter} tag={item.tag} />
        <div style={{
          fontFamily: 'var(--gp-font-display)',
          fontSize: mobile ? 19 : 22,
          fontWeight: 500,
          color: 'var(--gp-secondary)',
          lineHeight: 1.2,
          fontVariationSettings: 'var(--gp-display-vs)',
          textWrap: 'pretty',
        }}>{item.title}</div>
        {vertical && !mobile && (
          <div style={{ fontSize: 13, color: 'var(--gp-fg-muted)', lineHeight: 1.5 }}>{item.dek}</div>
        )}
        <div style={{ marginTop: 'auto', paddingTop: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <StByline author={item.author} date={item.date} read={item.read} />
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--gp-primary)', whiteSpace: 'nowrap' }}>Read →</span>
        </div>
      </div>
    </a>
  );
};

/* ---------- Topic Spotlight block ---------- */

const StTopicSpotlight = ({ bp, data = ST_TOPIC_SPOTLIGHT }) => {
  const mobile = bp === 'mobile';
  return (
    <div style={{
      position: 'relative',
      display: 'grid',
      gridTemplateColumns: mobile ? '1fr' : '5fr 7fr',
      gap: mobile ? 24 : 40,
      padding: mobile ? 24 : 36,
      background: 'var(--gp-green-800)',
      border: '1px solid var(--gp-border-soft)',
      borderRadius: 'var(--gp-radius-xl)',
      overflow: 'hidden',
    }}>
      {/* topo wash inside */}
      <div aria-hidden="true" style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'url("hifi/assets/topo-bg.png")',
        backgroundSize: 'cover', backgroundPosition: 'center',
        opacity: 0.08, mixBlendMode: 'overlay', pointerEvents: 'none',
      }} />
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <GP_Overline>Topic spotlight</GP_Overline>
        <GP_H2 size={mobile ? 28 : 36} style={{ letterSpacing: '-0.01em' }}>{data.topic}</GP_H2>
        <GP_Body size={14} color="var(--gp-fg-muted)" style={{ maxWidth: 420 }}>{data.blurb}</GP_Body>
        <div style={{ display: 'flex', gap: 24, marginTop: 8 }}>
          {data.stats.map(s => (
            <div key={s.l} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{
                fontFamily: 'var(--gp-font-display)',
                fontSize: 32, fontWeight: 500,
                color: 'var(--gp-primary)',
                fontVariationSettings: 'var(--gp-display-vs)',
                lineHeight: 1,
              }}>{s.n}</span>
              <span style={{
                fontFamily: 'var(--gp-font-mono)', fontSize: 10,
                letterSpacing: '0.12em', textTransform: 'uppercase',
                color: 'var(--gp-fg-dim)',
              }}>{s.l}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 4 }}>
          <GP_ArrowLink>Explore the topic</GP_ArrowLink>
        </div>
      </div>
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 0 }}>
        <GP_Overline style={{ marginBottom: 16 }}>Essential reads</GP_Overline>
        {data.reads.map((r, i) => (
          <a key={i} href="Story (Hi-Fi).html" style={{
            display: 'flex', alignItems: 'baseline', gap: 14,
            padding: '14px 0',
            borderTop: '1px solid var(--gp-border-soft)',
            textDecoration: 'none', color: 'var(--gp-fg)',
          }}>
            <span style={{
              flex: 'none',
              fontFamily: 'var(--gp-font-mono)', fontSize: 10,
              letterSpacing: '0.14em', textTransform: 'uppercase',
              color: 'var(--gp-fg-dim)',
              width: 28,
            }}>{String(i + 1).padStart(2, '0')}</span>
            <span style={{
              flex: 1,
              fontFamily: 'var(--gp-font-display)', fontSize: mobile ? 18 : 21, fontWeight: 500,
              color: 'var(--gp-secondary)',
              lineHeight: 1.25,
              fontVariationSettings: 'var(--gp-display-vs)',
              textWrap: 'pretty',
            }}>{r.t}</span>
            <span style={{
              flex: 'none',
              fontFamily: 'var(--gp-font-mono)', fontSize: 10,
              letterSpacing: '0.14em', textTransform: 'uppercase',
              color: 'var(--gp-primary)',
            }}>{r.c}</span>
          </a>
        ))}
      </div>
    </div>
  );
};

/* ---------- Translations strip ---------- */

const StTranslationsStrip = ({ bp }) => {
  const mobile = bp === 'mobile';
  return (
    <div style={{
      padding: mobile ? '24px 0' : '28px 0',
      borderTop: '1px solid var(--gp-border-soft)',
      borderBottom: '1px solid var(--gp-border-soft)',
      display: 'flex',
      flexDirection: mobile ? 'column' : 'row',
      alignItems: mobile ? 'flex-start' : 'center',
      gap: mobile ? 14 : 28,
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 'none', minWidth: mobile ? 0 : 220 }}>
        <GP_Overline>Translations</GP_Overline>
        <GP_Mute size={12}>Recent stories, in new languages</GP_Mute>
      </div>
      <div style={{
        display: 'flex',
        flexDirection: mobile ? 'column' : 'row',
        gap: mobile ? 12 : 24,
        flex: 1,
        flexWrap: 'wrap',
      }}>
        {ST_TRANSLATIONS.map((tr, i) => (
          <div key={i} style={{
            display: 'flex', flexDirection: 'column', gap: 6,
            flex: '1 1 200px', minWidth: 0,
          }}>
            <span style={{
              fontFamily: 'var(--gp-font-display)',
              fontSize: 16, fontWeight: 500,
              color: 'var(--gp-secondary)',
              fontVariationSettings: 'var(--gp-display-vs)',
              textWrap: 'pretty',
              lineHeight: 1.25,
            }}>{tr.title}</span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {tr.langs.map(l => (
                <span key={l} style={{
                  display: 'inline-flex', alignItems: 'center',
                  height: 22, padding: '0 10px',
                  borderRadius: 'var(--gp-radius-pill)',
                  background: 'rgba(240,220,160,0.08)',
                  border: '1px solid rgba(240,220,160,0.22)',
                  fontFamily: 'var(--gp-font-body)',
                  fontSize: 11, fontWeight: 600,
                  color: 'var(--gp-secondary)',
                  letterSpacing: '0.005em',
                }}>{l}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ---------- Newsletter / subscribe ---------- */

const StNewsletter = ({ bp }) => {
  const mobile = bp === 'mobile';
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: mobile ? '1fr' : '6fr 6fr',
      gap: mobile ? 24 : 56,
      padding: mobile ? '40px 24px' : '56px 56px',
      background: 'var(--gp-green-700)',
      border: '1px solid var(--gp-border-soft)',
      borderRadius: 'var(--gp-radius-xl)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div aria-hidden="true" style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'url("hifi/assets/topo-bg.png")',
        backgroundSize: 'cover', backgroundPosition: 'center',
        opacity: 0.08, mixBlendMode: 'overlay', pointerEvents: 'none',
      }} />
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <GP_Overline>Field notes, monthly</GP_Overline>
        <GP_H2 size={mobile ? 28 : 38}>One letter. One chapter. Once a month.</GP_H2>
        <GP_Body size={14} color="var(--gp-fg-muted)" style={{ maxWidth: 440 }}>
          A single chapter takes the pen each month. No round-ups, no marketing.
          You can read the last four below.
        </GP_Body>
      </div>
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 14, justifyContent: 'center' }}>
        <form style={{
          display: 'flex',
          flexDirection: mobile ? 'column' : 'row',
          gap: 10,
        }} onSubmit={(e) => e.preventDefault()}>
          <input type="email" placeholder="you@email.com" style={{
            flex: 1,
            appearance: 'none',
            height: 48,
            padding: '0 18px',
            borderRadius: 'var(--gp-radius-pill)',
            border: '1px solid var(--gp-border)',
            background: 'var(--gp-green-900)',
            color: 'var(--gp-fg)',
            fontFamily: 'var(--gp-font-body)',
            fontSize: 15,
            outline: 'none',
          }} />
          <GP_PrimaryButton type="submit">Subscribe</GP_PrimaryButton>
        </form>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--gp-font-mono)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--gp-fg-dim)' }}>Last issues</span>
          {['Mar · Brasil', 'Feb · Cape Town', 'Jan · Berlin', 'Dec · C\u00f4te d\u2019Ivoire'].map(s => (
            <a key={s} href="#" style={{
              fontFamily: 'var(--gp-font-body)',
              fontSize: 12, color: 'var(--gp-fg-muted)',
              textDecoration: 'none',
              borderBottom: '1px dashed rgba(240,220,160,0.25)',
              paddingBottom: 2,
            }}>{s}</a>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ---------- Submit-a-story strip ---------- */

const StSubmitStrip = ({ bp }) => (
  <GP_CtaStrip
    bp={bp}
    tone="soft"
    overline="From a chapter"
    title="Have a story to share?"
    body={'The Writers Guild reviews and lightly edits chapter submissions \u2014 pitches welcome from stewards, contributors, and visiting researchers. We pay an honorarium for accepted longreads.'}
  >
    <GP_GhostButton>Editorial guide</GP_GhostButton>
    <GP_PrimaryButton>Submit a story →</GP_PrimaryButton>
  </GP_CtaStrip>
);

Object.assign(window, {
  StMeta, StByline,
  StTopicPill, StTopicUnderline, StSelect, StFilterBar,
  StFeedRow, StSubFeatureCard,
  StTopicSpotlight, StTranslationsStrip,
  StNewsletter, StSubmitStrip,
});
