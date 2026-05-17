/* hifi/cd-bits.jsx — Chapter Detail building blocks. */

/* Breadcrumb — thin wrapper around GP_Breadcrumb so call sites stay unchanged. */
const CdBreadcrumb = ({ bp }) => (
  <GP_Breadcrumb
    bp={bp}
    back={{ label: 'All chapters', href: 'Chapters (Hi-Fi).html' }}
    crumbs={[{ label: CD_CHAPTER.name }]}
  />
);

/* Avatar — alias of GP_Avatar. */
const CdAvatar = (props) => <GP_Avatar {...props} />;

/* Steward — grid cell. */
const CdStewardCell = ({ s, bp }) => (
  <div style={{
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
    padding: bp === 'mobile' ? 14 : 20,
    background: 'var(--gp-green-700)',
    border: '1px solid var(--gp-border-soft)',
    borderRadius: 'var(--gp-radius-lg)',
    textAlign: 'center',
    minWidth: 0,
  }}>
    <CdAvatar size={72} name={s.name} />
    <div style={{ fontFamily: 'var(--gp-font-display)', fontSize: 18, fontWeight: 500, color: 'var(--gp-secondary)', fontVariationSettings: 'var(--gp-display-vs)' }}>
      {s.name}
    </div>
    <div style={{ fontFamily: 'var(--gp-font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--gp-primary)' }}>
      {s.role}
    </div>
    <div style={{ fontFamily: 'var(--gp-font-body)', fontSize: 12, color: 'var(--gp-fg-muted)', lineHeight: 1.45 }}>
      {s.bio}
    </div>
    <div style={{ fontFamily: 'var(--gp-font-body)', fontSize: 11, color: 'var(--gp-fg-dim)', marginTop: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <svg aria-hidden="true" width="10" height="10" viewBox="0 0 12 12" fill="none" style={{ flex: 'none' }}>
        <path d="M6 1.5c-1.93 0-3.5 1.5-3.5 3.35 0 2.4 3.5 5.65 3.5 5.65s3.5-3.25 3.5-5.65C9.5 3 7.93 1.5 6 1.5z" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" />
        <circle cx="6" cy="4.85" r="1" fill="currentColor" />
      </svg>
      {s.location}
    </div>
  </div>
);

/* Steward — horizontal scroll item (narrow card without bio). */
const CdStewardScrollItem = ({ s }) => (
  <div style={{
    flex: '0 0 auto',
    width: 140,
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
    padding: '16px 12px',
  }}>
    <CdAvatar size={84} name={s.name} />
    <div style={{ fontFamily: 'var(--gp-font-display)', fontSize: 15, fontWeight: 500, color: 'var(--gp-secondary)', fontVariationSettings: 'var(--gp-display-vs)', textAlign: 'center', lineHeight: 1.2 }}>
      {s.name}
    </div>
    <div style={{ fontFamily: 'var(--gp-font-mono)', fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--gp-primary)', textAlign: 'center' }}>
      {s.role}
    </div>
  </div>
);

/* Steward — portrait row item (wide horizontal layout). */
const CdStewardPortraitRow = ({ s, bp }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: bp === 'mobile' ? 14 : 20,
    padding: bp === 'mobile' ? '14px 0' : '20px 0',
    borderBottom: '1px solid var(--gp-border-soft)',
  }}>
    <CdAvatar size={bp === 'mobile' ? 56 : 72} name={s.name} />
    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
        <span style={{
          fontFamily: 'var(--gp-font-display)',
          fontSize: bp === 'mobile' ? 18 : 22, fontWeight: 500,
          color: 'var(--gp-secondary)',
          fontVariationSettings: 'var(--gp-display-vs)',
        }}>{s.name}</span>
        <span style={{
          fontFamily: 'var(--gp-font-mono)',
          fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
          color: 'var(--gp-primary)',
        }}>{s.role}</span>
      </div>
      <span style={{ fontSize: 13, color: 'var(--gp-fg-muted)' }}>{s.bio}</span>
    </div>
    <span style={{
      fontSize: 11, color: 'var(--gp-fg-dim)', flex: 'none',
      display: bp === 'mobile' ? 'none' : 'inline-flex',
      alignItems: 'center', gap: 6,
    }}>
      <svg aria-hidden="true" width="10" height="10" viewBox="0 0 12 12" fill="none" style={{ flex: 'none' }}>
        <path d="M6 1.5c-1.93 0-3.5 1.5-3.5 3.35 0 2.4 3.5 5.65 3.5 5.65s3.5-3.25 3.5-5.65C9.5 3 7.93 1.5 6 1.5z" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" />
        <circle cx="6" cy="4.85" r="1" fill="currentColor" />
      </svg>
      {s.location}
    </span>
  </div>
);

/* Story — row layout (default; matches wireframe). */
const CdStoryRow = ({ s, bp, last }) => (
  <a href="#" style={{
    display: 'flex',
    flexDirection: bp === 'mobile' ? 'column' : 'row',
    gap: bp === 'mobile' ? 14 : 24,
    padding: bp === 'mobile' ? '20px 0' : '24px 0',
    borderBottom: last ? 'none' : '1px solid var(--gp-border-soft)',
    textDecoration: 'none', color: 'var(--gp-fg)',
    transition: 'opacity 200ms',
  }}>
    <div style={{ flex: '0 0 auto', width: bp === 'mobile' ? '100%' : 220 }}>
      <GP_PlaceImg label={s.photo} h={bp === 'mobile' ? 160 : 140} />
    </div>
    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{
          fontFamily: 'var(--gp-font-mono)',
          fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase',
          color: 'var(--gp-primary)',
        }}>{s.tag}</span>
        <span style={{ opacity: 0.4, fontSize: 10 }}>·</span>
        <span style={{ fontSize: 11, color: 'var(--gp-fg-dim)' }}>{s.date}</span>
      </div>
      <div style={{
        fontFamily: 'var(--gp-font-display)',
        fontSize: bp === 'mobile' ? 19 : 22, fontWeight: 500,
        color: 'var(--gp-secondary)',
        lineHeight: 1.2,
        fontVariationSettings: 'var(--gp-display-vs)',
        textWrap: 'pretty',
      }}>{s.title}</div>
      <div style={{ fontSize: 13, color: 'var(--gp-fg-muted)', lineHeight: 1.55 }}>{s.blurb}</div>
      <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 6 }}>
        <span style={{ fontFamily: 'var(--gp-font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--gp-fg-dim)' }}>{s.metric}</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--gp-primary)', whiteSpace: 'nowrap' }}>Read →</span>
      </div>
    </div>
  </a>
);

/* Story — card layout. */
const CdStoryCard = ({ s, bp }) => (
  <a href="#" style={{
    display: 'flex', flexDirection: 'column', gap: 12,
    padding: bp === 'mobile' ? 16 : 20,
    background: 'var(--gp-green-700)',
    border: '1px solid var(--gp-border-soft)',
    borderRadius: 'var(--gp-radius-lg)',
    textDecoration: 'none', color: 'var(--gp-fg)',
    minWidth: 0,
    transition: 'border-color 200ms',
  }}
  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(184,232,53,0.4)'; }}
  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--gp-border-soft)'; }}>
    <GP_PlaceImg label={s.photo} h={bp === 'mobile' ? 140 : 170} />
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{
        fontFamily: 'var(--gp-font-mono)',
        fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase',
        color: 'var(--gp-primary)',
      }}>{s.tag}</span>
      <span style={{ opacity: 0.4 }}>·</span>
      <span style={{ fontSize: 11, color: 'var(--gp-fg-dim)' }}>{s.date}</span>
    </div>
    <div style={{
      fontFamily: 'var(--gp-font-display)',
      fontSize: bp === 'mobile' ? 18 : 20, fontWeight: 500,
      color: 'var(--gp-secondary)',
      lineHeight: 1.2,
      fontVariationSettings: 'var(--gp-display-vs)',
      textWrap: 'pretty',
    }}>{s.title}</div>
    <div style={{ fontSize: 13, color: 'var(--gp-fg-muted)', lineHeight: 1.5 }}>{s.blurb}</div>
    <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 6 }}>
      <span style={{ fontFamily: 'var(--gp-font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--gp-fg-dim)' }}>{s.metric}</span>
      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--gp-primary)', whiteSpace: 'nowrap' }}>Read →</span>
    </div>
  </a>
);

/* Link row — used in connect block. */
const CdLinkRow = ({ l, last }) => (
  <a href="#" style={{
    display: 'flex', alignItems: 'center', gap: 18,
    padding: '18px 4px',
    borderBottom: last ? 'none' : '1px solid var(--gp-border-soft)',
    textDecoration: 'none', color: 'var(--gp-fg)',
    transition: 'background 180ms',
  }}
  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(184,232,53,0.04)'}
  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
  >
    <div style={{
      flex: 'none',
      width: 44, height: 44, borderRadius: 'var(--gp-radius-pill)',
      background: 'var(--gp-primary)',
      color: 'var(--gp-primary-fg)',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--gp-font-mono)',
      fontWeight: 700, fontSize: 13,
      letterSpacing: '0.04em',
    }}>{l.glyph}</div>
    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{ fontFamily: 'var(--gp-font-display)', fontSize: 17, fontWeight: 500, color: 'var(--gp-secondary)', fontVariationSettings: 'var(--gp-display-vs)' }}>{l.label}</span>
      <span style={{ fontSize: 12, color: 'var(--gp-fg-muted)' }}>{l.sub}</span>
    </div>
    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--gp-primary)', flex: 'none', whiteSpace: 'nowrap' }}>{l.handle} →</span>
  </a>
);

/* Event card. */
const CdEventCard = ({ e, bp }) => (
  <div style={{
    display: 'flex', gap: bp === 'mobile' ? 14 : 18,
    padding: bp === 'mobile' ? 16 : 20,
    background: 'var(--gp-green-700)',
    border: '1px solid var(--gp-border-soft)',
    borderRadius: 'var(--gp-radius-lg)',
    minWidth: 0,
  }}>
    <div style={{
      flex: 'none',
      width: bp === 'mobile' ? 64 : 76,
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
      paddingRight: bp === 'mobile' ? 14 : 18,
      borderRight: '1px solid var(--gp-border-soft)',
    }}>
      <div style={{
        fontFamily: 'var(--gp-font-mono)',
        fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase',
        color: 'var(--gp-primary)',
      }}>{e.when.split(' ')[0]}</div>
      <div style={{
        fontFamily: 'var(--gp-font-display)',
        fontSize: 30, fontWeight: 500,
        color: 'var(--gp-secondary)',
        lineHeight: 1,
        fontVariationSettings: 'var(--gp-display-vs)',
      }}>{e.when.split(' ')[1]}</div>
      <div style={{ fontFamily: 'var(--gp-font-mono)', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--gp-fg-dim)' }}>{e.when.split(' ')[2]}</div>
    </div>
    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{
          padding: '2px 8px', borderRadius: 'var(--gp-radius-pill)',
          background: e.kind === 'IRL' ? 'rgba(184,232,53,0.15)' : 'rgba(240,220,160,0.10)',
          border: `1px solid ${e.kind === 'IRL' ? 'rgba(184,232,53,0.4)' : 'rgba(240,220,160,0.3)'}`,
          fontFamily: 'var(--gp-font-body)', fontSize: 10, fontWeight: 700,
          letterSpacing: '0.08em', textTransform: 'uppercase',
          color: e.kind === 'IRL' ? 'var(--gp-primary)' : 'var(--gp-secondary)',
        }}>{e.kind}</span>
        <span style={{ fontSize: 11, color: 'var(--gp-fg-dim)' }}>{e.time}</span>
      </div>
      <div style={{
        fontFamily: 'var(--gp-font-display)',
        fontSize: bp === 'mobile' ? 17 : 19, fontWeight: 500,
        color: 'var(--gp-secondary)',
        lineHeight: 1.2,
        fontVariationSettings: 'var(--gp-display-vs)',
      }}>{e.title}</div>
      <div style={{ fontSize: 12, color: 'var(--gp-fg-muted)' }}>{e.where}</div>
      <div style={{
        marginTop: 4,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
      }}>
        <span style={{ fontSize: 11, color: 'var(--gp-fg-dim)' }}>
          <span style={{ whiteSpace: 'nowrap' }}>{e.rsvp} RSVP</span>
          {e.cap && <>{' · '}<span style={{ whiteSpace: 'nowrap' }}>{`${e.cap - e.rsvp} spots left`}</span></>}
        </span>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--gp-primary)', whiteSpace: 'nowrap', flex: 'none' }}>RSVP →</span>
      </div>
    </div>
  </div>
);

/* Library item — small (3-item row). */
const CdLibraryRow = ({ b, last }) => (
  <a href="Library (Hi-Fi).html" style={{
    display: 'flex', alignItems: 'center', gap: 16,
    padding: '14px 4px',
    borderBottom: last ? 'none' : '1px solid var(--gp-border-soft)',
    textDecoration: 'none', color: 'var(--gp-fg)',
  }}>
    <div style={{
      flex: 'none',
      width: 36, height: 36, borderRadius: 'var(--gp-radius-sm)',
      background: 'var(--gp-green-800)',
      border: '1px solid var(--gp-border-soft)',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--gp-font-mono)', fontSize: 10, fontWeight: 700,
      color: 'var(--gp-primary)',
      letterSpacing: '0.04em',
    }}>{b.kind}</div>
    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{ fontFamily: 'var(--gp-font-display)', fontSize: 16, fontWeight: 500, color: 'var(--gp-secondary)', fontVariationSettings: 'var(--gp-display-vs)' }}>{b.t}</span>
      <span style={{ fontSize: 12, color: 'var(--gp-fg-muted)' }}>{b.a} · {b.y}</span>
    </div>
    <span style={{ fontSize: 11, color: 'var(--gp-fg-dim)', fontFamily: 'var(--gp-font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{b.tag}</span>
  </a>
);

/* Related chapter card. */
const CdRelatedCard = ({ slug }) => {
  const all = [...CH_FEATURED, ...CH_COMPACT];
  const c = all.find(x => x.slug === slug);
  if (!c) return null;
  return (
    <a href={c.slug === 'nigeria' ? '#' : '#'}
      style={{
        display: 'flex', flexDirection: 'column', gap: 8,
        padding: 16,
        background: 'var(--gp-green-800)',
        border: '1px solid var(--gp-border-soft)',
        borderRadius: 'var(--gp-radius-md)',
        textDecoration: 'none', color: 'var(--gp-fg)',
        minWidth: 0,
      }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <ChMeta region={c.region} />
        <ChStatusChip status={c.status} />
      </div>
      <div style={{
        fontFamily: 'var(--gp-font-display)',
        fontSize: 18, fontWeight: 500,
        color: 'var(--gp-secondary)',
        fontVariationSettings: 'var(--gp-display-vs)',
      }}>{c.name}</div>
      <div style={{ fontSize: 12, color: 'var(--gp-fg-muted)' }}>{c.city || ''}</div>
    </a>
  );
};

Object.assign(window, {
  CdBreadcrumb, CdAvatar,
  CdStewardCell, CdStewardScrollItem, CdStewardPortraitRow,
  CdStoryRow, CdStoryCard,
  CdLinkRow, CdEventCard, CdLibraryRow, CdRelatedCard,
});
