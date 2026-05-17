/* hifi/sd-bits.jsx — Story Detail building blocks. */

/* Breadcrumb — thin wrapper around GP_Breadcrumb. */
const SdBreadcrumb = ({ bp }) => (
  <GP_Breadcrumb
    bp={bp}
    back={{ label: 'All stories', href: 'Stories (Hi-Fi).html' }}
    crumbs={[
      { label: SD_STORY.chapter, href: '#' },
      { label: SD_STORY.tag },
    ]}
  />
);

/* Author avatar — alias of GP_Avatar. */
const SdAvatar = (props) => <GP_Avatar {...props} />;

/* Byline pair (avatar + author + role + date) */
const SdByline = ({ bp }) => {
  const mobile = bp === 'mobile';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <SdAvatar size={mobile ? 44 : 52} name={SD_STORY.author} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <span style={{
          fontFamily: 'var(--gp-font-display)',
          fontSize: mobile ? 16 : 18, fontWeight: 500,
          color: 'var(--gp-secondary)',
          fontVariationSettings: 'var(--gp-display-vs)',
        }}>{SD_STORY.author}</span>
        <span style={{
          fontFamily: 'var(--gp-font-mono)', fontSize: 10,
          letterSpacing: '0.12em', textTransform: 'uppercase',
          color: 'var(--gp-fg-dim)',
        }}>{SD_STORY.authorRole}</span>
      </div>
      <div style={{ height: 28, width: 1, background: 'var(--gp-border-soft)', margin: '0 4px' }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <span style={{ fontFamily: 'var(--gp-font-body)', fontSize: 13, color: 'var(--gp-fg)' }}>{SD_STORY.date}</span>
        <span style={{
          fontFamily: 'var(--gp-font-mono)', fontSize: 10,
          letterSpacing: '0.12em', textTransform: 'uppercase',
          color: 'var(--gp-fg-dim)',
        }}>{SD_STORY.read}</span>
      </div>
    </div>
  );
};

/* Stats strip — at-a-glance numbers under the byline. */
const SdStatStrip = ({ bp }) => {
  const mobile = bp === 'mobile';
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: mobile ? 'repeat(2, 1fr)' : `repeat(${SD_STORY.stats.length}, 1fr)`,
      gap: mobile ? 16 : 0,
      padding: mobile ? '20px 24px' : '24px 32px',
      background: 'var(--gp-green-800)',
      border: '1px solid var(--gp-border-soft)',
      borderRadius: 'var(--gp-radius-lg)',
    }}>
      {SD_STORY.stats.map((s, i) => (
        <div key={s.l} style={{
          display: 'flex', flexDirection: 'column', gap: 6,
          paddingLeft: (!mobile && i > 0) ? 24 : 0,
          borderLeft: (!mobile && i > 0) ? '1px solid var(--gp-border-soft)' : 'none',
        }}>
          <span style={{
            fontFamily: 'var(--gp-font-display)',
            fontSize: mobile ? 26 : 32, fontWeight: 500,
            color: 'var(--gp-primary)',
            fontVariationSettings: 'var(--gp-display-vs)',
            lineHeight: 1,
            letterSpacing: '-0.005em',
          }}>{s.n}</span>
          <span style={{
            fontFamily: 'var(--gp-font-mono)', fontSize: 10,
            letterSpacing: '0.14em', textTransform: 'uppercase',
            color: 'var(--gp-fg-dim)',
          }}>{s.l}</span>
        </div>
      ))}
    </div>
  );
};

/* The article body — renders typed blocks in a constrained column.
   Accepts variant flags:
     dropcap         — drop-cap on the very first <p>
     pullquoteStyle  — 'border' (default) | 'centered' | 'marks'
*/
const SdProse = ({ bp, dropcap = false, pullquoteStyle = 'border' }) => {
  const mobile = bp === 'mobile';
  const proseStyle = {
    fontFamily: 'var(--gp-font-body)',
    fontSize: mobile ? 17 : 19,
    lineHeight: 1.65,
    color: 'var(--gp-off-white-dim)',
    letterSpacing: '0.005em',
    margin: 0,
    textWrap: 'pretty',
  };
  /* Track whether we've rendered the first <p> yet, for the drop cap. */
  let firstParaSeen = false;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: mobile ? 18 : 22 }}>
      {SD_STORY.body.map((block, i) => {
        if (block.type === 'p') {
          const isFirst = !firstParaSeen;
          firstParaSeen = true;
          if (isFirst && dropcap) {
            return (
              <p key={i} style={proseStyle} className="sd-prose-dropcap-p">{block.text}</p>
            );
          }
          return <p key={i} style={proseStyle}>{block.text}</p>;
        }
        if (block.type === 'h2') {
          return (
            <h2 key={i} style={{
              fontFamily: 'var(--gp-font-display)',
              fontSize: mobile ? 28 : 36, fontWeight: 500,
              color: 'var(--gp-secondary)',
              lineHeight: 1.15,
              letterSpacing: '-0.01em',
              fontVariationSettings: 'var(--gp-display-vs)',
              margin: mobile ? '14px 0 0' : '22px 0 0',
              textWrap: 'pretty',
            }}>{block.text}</h2>
          );
        }
        if (block.type === 'pullquote') {
          return <SdPullQuote key={i} text={block.text} variant={pullquoteStyle} bp={bp} />;
        }
        if (block.type === 'list') {
          const Tag = block.ordered ? 'ol' : 'ul';
          return (
            <Tag key={i} style={{
              margin: 0,
              paddingLeft: mobile ? 22 : 28,
              display: 'flex', flexDirection: 'column', gap: 12,
              ...proseStyle,
            }}>
              {block.items.map((it, k) => (
                <li key={k} style={{
                  paddingLeft: 6,
                  ...(block.ordered ? {} : { listStyleType: 'square' }),
                }}>{it}</li>
              ))}
            </Tag>
          );
        }
        if (block.type === 'thanks') {
          return (
            <div key={i} style={{
              marginTop: mobile ? 16 : 24,
              padding: mobile ? 18 : 22,
              borderTop: '1px solid var(--gp-border-soft)',
              borderBottom: '1px solid var(--gp-border-soft)',
              display: 'flex', flexDirection: 'column', gap: 10,
            }}>
              <span style={{
                fontFamily: 'var(--gp-font-mono)', fontSize: 10,
                letterSpacing: '0.14em', textTransform: 'uppercase',
                color: 'var(--gp-primary)',
              }}>With thanks to</span>
              <div style={{
                display: 'flex', gap: 8, flexWrap: 'wrap',
              }}>
                {block.items.map(it => (
                  <span key={it} style={{
                    display: 'inline-flex', alignItems: 'center',
                    height: 28, padding: '0 12px',
                    borderRadius: 'var(--gp-radius-pill)',
                    background: 'rgba(240,220,160,0.08)',
                    border: '1px solid rgba(240,220,160,0.22)',
                    fontFamily: 'var(--gp-font-body)', fontSize: 12, fontWeight: 600,
                    color: 'var(--gp-secondary)',
                    whiteSpace: 'nowrap',
                  }}>{it}</span>
                ))}
              </div>
            </div>
          );
        }
        return null;
      })}
    </div>
  );
};

/* Author bio block — full-width at the bottom of the article. */
const SdAuthorBio = ({ bp }) => {
  const mobile = bp === 'mobile';
  return (
    <div style={{
      display: 'flex',
      flexDirection: mobile ? 'column' : 'row',
      alignItems: mobile ? 'flex-start' : 'center',
      gap: mobile ? 16 : 24,
      padding: mobile ? 20 : 28,
      background: 'var(--gp-green-800)',
      border: '1px solid var(--gp-border-soft)',
      borderRadius: 'var(--gp-radius-lg)',
    }}>
      <SdAvatar size={mobile ? 64 : 80} name={SD_STORY.author} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <GP_Overline>Written by</GP_Overline>
        <span style={{
          fontFamily: 'var(--gp-font-display)',
          fontSize: mobile ? 22 : 26, fontWeight: 500,
          color: 'var(--gp-secondary)',
          fontVariationSettings: 'var(--gp-display-vs)',
        }}>{SD_STORY.author}</span>
        <span style={{
          fontFamily: 'var(--gp-font-mono)', fontSize: 10,
          letterSpacing: '0.14em', textTransform: 'uppercase',
          color: 'var(--gp-primary)',
        }}>{SD_STORY.authorRole}</span>
        <p style={{
          margin: '6px 0 0',
          fontSize: 14,
          color: 'var(--gp-fg-muted)',
          lineHeight: 1.55,
        }}>{SD_STORY.authorBio}</p>
      </div>
      <div style={{ flex: 'none' }}>
        <GP_GhostButton style={{ height: 40, padding: '0 18px', fontSize: 13 }}>More from Camila</GP_GhostButton>
      </div>
    </div>
  );
};

/* Translations row — shown above + at bottom of article. */
const SdTranslationsRow = ({ bp }) => {
  const mobile = bp === 'mobile';
  return (
    <div style={{
      display: 'flex',
      flexDirection: mobile ? 'column' : 'row',
      alignItems: mobile ? 'flex-start' : 'center',
      gap: mobile ? 10 : 16,
      padding: '14px 0',
      borderTop: '1px solid var(--gp-border-soft)',
      borderBottom: '1px solid var(--gp-border-soft)',
    }}>
      <span style={{
        fontFamily: 'var(--gp-font-mono)', fontSize: 10,
        letterSpacing: '0.14em', textTransform: 'uppercase',
        color: 'var(--gp-fg-dim)',
      }}>Available in</span>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {SD_STORY.translations.map(l => (
          <a key={l} href="#" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            height: 30, padding: '0 14px',
            borderRadius: 'var(--gp-radius-pill)',
            background: 'rgba(240,220,160,0.08)',
            border: '1px solid rgba(240,220,160,0.30)',
            fontFamily: 'var(--gp-font-body)', fontSize: 12, fontWeight: 600,
            color: 'var(--gp-secondary)',
            textDecoration: 'none',
            letterSpacing: '0.005em',
            whiteSpace: 'nowrap',
          }}>
            <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--gp-primary)' }} />
            {l}
          </a>
        ))}
        <span style={{
          display: 'inline-flex', alignItems: 'center',
          height: 30, padding: '0 14px',
          fontFamily: 'var(--gp-font-body)', fontSize: 12,
          color: 'var(--gp-fg-muted)',
        }}>
          + 3 more languages in progress
        </span>
      </div>
      {!mobile && (
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--gp-fg-dim)' }}>
          Translated by the Writers Guild
        </span>
      )}
    </div>
  );
};

/* Share / footer for article — share buttons + chapter back-link. */
const SdArticleFooter = ({ bp }) => {
  const mobile = bp === 'mobile';
  return (
    <div style={{
      display: 'flex',
      flexDirection: mobile ? 'column' : 'row',
      alignItems: mobile ? 'flex-start' : 'center',
      justifyContent: 'space-between',
      gap: 16,
      paddingTop: 24,
      borderTop: '1px solid var(--gp-border-soft)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{
          fontFamily: 'var(--gp-font-mono)', fontSize: 10,
          letterSpacing: '0.14em', textTransform: 'uppercase',
          color: 'var(--gp-fg-dim)',
        }}>Share</span>
        {['Farcaster', 'X', 'Lens', 'Copy link'].map(s => (
          <a key={s} href="#" style={{
            display: 'inline-flex', alignItems: 'center',
            height: 30, padding: '0 12px',
            borderRadius: 'var(--gp-radius-pill)',
            border: '1px solid var(--gp-border)',
            background: 'transparent',
            fontFamily: 'var(--gp-font-body)', fontSize: 12, fontWeight: 600,
            color: 'var(--gp-fg-muted)',
            textDecoration: 'none',
            whiteSpace: 'nowrap',
          }}>{s}</a>
        ))}
      </div>
      <a href="#" style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        fontFamily: 'var(--gp-font-body)', fontSize: 13, fontWeight: 600,
        color: 'var(--gp-primary)',
        textDecoration: 'none',
        whiteSpace: 'nowrap',
      }}>
        Read more from Greenpill Brasil <span aria-hidden="true">→</span>
      </a>
    </div>
  );
};

/* "Continue reading" card */
const SdContinueCard = ({ item, bp }) => {
  const mobile = bp === 'mobile';
  return (
    <a href="#" style={{
      display: 'flex', flexDirection: 'column', gap: 12,
      padding: mobile ? 16 : 20,
      background: 'var(--gp-green-800)',
      border: '1px solid var(--gp-border-soft)',
      borderRadius: 'var(--gp-radius-lg)',
      textDecoration: 'none', color: 'var(--gp-fg)',
      transition: 'border-color 200ms',
      minWidth: 0,
    }}
    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(184,232,53,0.35)'; }}
    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--gp-border-soft)'; }}>
      <GP_PlaceImg label={item.photo} h={mobile ? 130 : 160} />
      <StMeta chapter={item.chapter} tag={item.tag} />
      <div style={{
        fontFamily: 'var(--gp-font-display)',
        fontSize: mobile ? 18 : 20, fontWeight: 500,
        color: 'var(--gp-secondary)',
        lineHeight: 1.2,
        fontVariationSettings: 'var(--gp-display-vs)',
        textWrap: 'pretty',
      }}>{item.title}</div>
      <div style={{ fontSize: 13, color: 'var(--gp-fg-muted)', lineHeight: 1.5 }}>{item.dek}</div>
      <div style={{ marginTop: 'auto', paddingTop: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <StByline author={item.author} date={item.date} read={item.read} />
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--gp-primary)', whiteSpace: 'nowrap' }}>Read →</span>
      </div>
    </a>
  );
};

/* Pull-quote with three variants. */
const SdPullQuote = ({ text, variant = 'border', bp }) => {
  const mobile = bp === 'mobile';
  const baseDisplay = {
    fontFamily: 'var(--gp-font-display)',
    fontWeight: 500,
    color: 'var(--gp-secondary)',
    fontVariationSettings: 'var(--gp-display-vs)',
    fontStyle: 'italic',
    letterSpacing: '-0.005em',
    textWrap: 'pretty',
  };
  if (variant === 'centered') {
    return (
      <blockquote style={{
        ...baseDisplay,
        margin: mobile ? '20px 0' : '32px 0',
        padding: mobile ? '12px 8px' : '16px 24px',
        fontSize: mobile ? 22 : 30,
        lineHeight: 1.28,
        textAlign: 'center',
      }}>
        <div aria-hidden="true" style={{ height: 1, width: 56, background: 'var(--gp-primary)', margin: mobile ? '0 auto 18px' : '0 auto 24px', opacity: 0.85 }} />
        {text}
        <div aria-hidden="true" style={{ height: 1, width: 56, background: 'var(--gp-primary)', margin: mobile ? '18px auto 0' : '24px auto 0', opacity: 0.85 }} />
      </blockquote>
    );
  }
  if (variant === 'marks') {
    return (
      <blockquote style={{
        ...baseDisplay,
        margin: mobile ? '20px 0' : '28px 0',
        position: 'relative',
        paddingLeft: mobile ? 48 : 72,
        paddingTop: mobile ? 18 : 22,
        fontSize: mobile ? 22 : 30,
        lineHeight: 1.28,
      }}>
        <span aria-hidden="true" style={{
          position: 'absolute', left: 0, top: mobile ? -10 : -14,
          fontFamily: 'var(--gp-font-display)',
          fontVariationSettings: 'var(--gp-display-vs)',
          fontSize: mobile ? 90 : 130,
          fontWeight: 500,
          color: 'var(--gp-primary)',
          lineHeight: 1,
        }}>{'\u201C'}</span>
        {text}
      </blockquote>
    );
  }
  /* border (default) */
  return (
    <blockquote style={{
      ...baseDisplay,
      margin: mobile ? '12px 0' : '20px 0',
      padding: mobile ? '20px 0 20px 18px' : '24px 0 24px 28px',
      borderLeft: '3px solid var(--gp-primary)',
      fontSize: mobile ? 22 : 30,
      lineHeight: 1.25,
    }}>
      {text}
    </blockquote>
  );
};

/* Share + save buttons — used across hero variants. */
const SdShareSaveButtons = ({ tone = 'on-canvas' }) => {
  const borderColor = tone === 'on-photo' ? 'rgba(250,247,238,0.28)' : 'var(--gp-border)';
  const bg          = tone === 'on-photo' ? 'rgba(15,61,46,0.55)'    : 'transparent';
  const color       = tone === 'on-photo' ? 'var(--gp-fg)'           : 'var(--gp-fg-muted)';
  const itemStyle = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    height: 36, padding: '0 14px',
    borderRadius: 'var(--gp-radius-pill)',
    border: `1px solid ${borderColor}`,
    background: bg,
    fontFamily: 'var(--gp-font-body)', fontSize: 13, fontWeight: 600,
    color,
    textDecoration: 'none',
    whiteSpace: 'nowrap',
    backdropFilter: tone === 'on-photo' ? 'blur(6px)' : undefined,
    WebkitBackdropFilter: tone === 'on-photo' ? 'blur(6px)' : undefined,
  };
  return (
    <div style={{ display: 'flex', gap: 8, flex: 'none' }}>
      <a href="#" style={itemStyle}><span aria-hidden="true">{'\u2197'}</span> Share</a>
      <a href="#" style={itemStyle}><span aria-hidden="true">{'\u2606'}</span> Save</a>
    </div>
  );
};

/* Hero photo placeholder — reusable across hero variants. */
const SdHeroPhoto = ({ h, caption, radius = 'var(--gp-radius-xl)', scrim = false, scrimSide = 'bottom', children }) => (
  <div style={{
    position: 'relative',
    height: h,
    width: '100%',
    borderRadius: radius,
    overflow: 'hidden',
    border: '1px solid var(--gp-border-soft)',
    background:
      'radial-gradient(ellipse at 70% 30%, rgba(240,220,160,0.22), transparent 60%), ' +
      'radial-gradient(ellipse at 25% 75%, rgba(184,232,53,0.14), transparent 60%), ' +
      'linear-gradient(135deg, #0c3326 0%, #103e2f 40%, #16513d 100%)',
  }}>
    <div aria-hidden="true" style={{
      position: 'absolute', inset: 0,
      backgroundImage: 'url("hifi/assets/topo-bg.png")',
      backgroundSize: 'cover', backgroundPosition: 'center',
      opacity: 0.35, mixBlendMode: 'screen',
    }} />
    {scrim && (
      <div aria-hidden="true" style={{
        position: 'absolute', inset: 0,
        background: scrimSide === 'bottom'
          ? 'linear-gradient(180deg, rgba(10,30,21,0) 0%, rgba(10,30,21,0.25) 45%, rgba(10,30,21,0.88) 100%)'
          : 'linear-gradient(90deg, rgba(10,30,21,0.85) 0%, rgba(10,30,21,0.25) 55%, rgba(10,30,21,0) 100%)',
      }} />
    )}
    {caption && (
      <div style={{
        position: 'absolute', left: 16, bottom: 14,
        maxWidth: '90%',
        padding: '8px 14px',
        borderRadius: 'var(--gp-radius-pill)',
        background: 'rgba(15, 61, 46, 0.65)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        border: '1px solid var(--gp-border-soft)',
        fontFamily: 'var(--gp-font-mono)',
        fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase',
        color: 'var(--gp-fg-muted)',
        zIndex: 2,
      }}>{caption}</div>
    )}
    {children}
  </div>
);

/* Reading progress bar — fixed at top of viewport. Rendered at App root
   (outside the scaled SdFrame) so position:fixed is anchored to the viewport. */
const SdReadingProgress = () => {
  const [pct, setPct] = React.useState(0);
  React.useEffect(() => {
    const onScroll = () => {
      const sc = document.scrollingElement || document.documentElement;
      const total = sc.scrollHeight - sc.clientHeight;
      setPct(total > 0 ? Math.min(1, Math.max(0, sc.scrollTop / total)) : 0);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <div aria-hidden="true" style={{
      position: 'fixed',
      top: 0, left: 0, right: 0,
      height: 3,
      background: 'rgba(184,232,53,0.10)',
      zIndex: 999,
      pointerEvents: 'none',
    }}>
      <div style={{
        height: '100%',
        width: `${pct * 100}%`,
        background: 'var(--gp-primary)',
        boxShadow: '0 0 12px rgba(184,232,53,0.55)',
        transition: 'width 80ms linear',
      }} />
    </div>
  );
};

Object.assign(window, {
  SdBreadcrumb, SdAvatar, SdByline, SdStatStrip,
  SdProse, SdAuthorBio, SdTranslationsRow,
  SdArticleFooter, SdContinueCard,
  SdPullQuote, SdShareSaveButtons, SdHeroPhoto, SdReadingProgress,
});
