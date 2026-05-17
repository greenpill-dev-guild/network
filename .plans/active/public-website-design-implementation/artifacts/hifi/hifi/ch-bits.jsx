/* hifi/ch-bits.jsx — Card + chrome primitives for the Chapter Index. */

/* Status chip — thin wrapper around GP_StatusChip. */
const ChStatusChip = ({ status, size = 'sm' }) => (
  <GP_StatusChip tone={status === 'ACTIVE' ? 'primary' : 'secondary'} size={size}>
    {status === 'ACTIVE' ? 'Active' : 'Forming'}
  </GP_StatusChip>
);

/* Region overline — "CHAPTER · AMERICAS · ACTIVE" */
const ChMeta = ({ region }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 8,
    fontFamily: 'var(--gp-font-mono)',
    fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase',
    color: 'var(--gp-fg-dim)',
  }}>
    <span>Chapter</span>
    <span style={{ opacity: 0.5 }}>/</span>
    <span style={{ color: 'var(--gp-fg-muted)' }}>{region}</span>
  </div>
);

/* Filter pill — single + multi select forms. */
const ChFilterPill = ({ active, onClick, children, kind = 'single', count }) => (
  <button onClick={onClick}
    style={{
      appearance: 'none', cursor: 'pointer',
      display: 'inline-flex', alignItems: 'center', gap: 8,
      padding: '8px 16px',
      borderRadius: 'var(--gp-radius-pill)',
      border: `1px solid ${active ? 'var(--gp-primary)' : 'var(--gp-border-soft)'}`,
      background: active ? 'rgba(184,232,53,0.13)' : 'transparent',
      color: active ? 'var(--gp-primary)' : 'var(--gp-fg-muted)',
      fontFamily: 'var(--gp-font-body)',
      fontSize: 13,
      fontWeight: 600,
      letterSpacing: '0.005em',
      whiteSpace: 'nowrap',
      flex: 'none',
      transition: 'all 180ms cubic-bezier(0.22, 1, 0.36, 1)',
    }}>
    {kind === 'multi' && (
      <span aria-hidden="true" style={{
        width: 12, height: 12, borderRadius: 3,
        border: `1.5px solid ${active ? 'var(--gp-primary)' : 'var(--gp-fg-dim)'}`,
        background: active ? 'var(--gp-primary)' : 'transparent',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {active && (
          <svg viewBox="0 0 12 12" width="10" height="10">
            <path d="M2.5 6 L5 8.5 L9.5 3.5" stroke="var(--gp-primary-fg)" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
    )}
    <span>{children}</span>
    {count != null && (
      <span style={{
        opacity: 0.55, fontSize: 11, fontWeight: 500,
      }}>{count}</span>
    )}
  </button>
);

/* Featured Chapter card — top-tier with hero photo, story, steward. */
const ChFeaturedCard = ({ c, density, bp }) => {
  const photoH = bp === 'mobile' ? 180 : density === 'compact' ? 160 : density === 'editorial' ? 240 : 200;
  return (
    <a href={c.slug === 'nigeria' ? 'Chapter (Hi-Fi).html' : '#'}
      style={{
        display: 'flex', flexDirection: 'column', gap: 16,
        padding: bp === 'mobile' ? 18 : density === 'compact' ? 20 : 24,
        background: 'var(--gp-green-700)',
        border: '1px solid var(--gp-border-soft)',
        borderRadius: 'var(--gp-radius-lg)',
        textDecoration: 'none', color: 'var(--gp-fg)',
        transition: 'border-color 200ms cubic-bezier(0.22, 1, 0.36, 1), transform 200ms cubic-bezier(0.22, 1, 0.36, 1)',
        minWidth: 0,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(184,232,53,0.45)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--gp-border-soft)'; }}
    >
      <GP_PlaceImg label={c.photo} h={photoH} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <ChMeta region={c.region} />
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <GP_H3 size={bp === 'mobile' ? 22 : density === 'editorial' ? 30 : 26}>{c.name}</GP_H3>
          <ChStatusChip status={c.status} />
        </div>
        <GP_Mute size={13}>{c.city}</GP_Mute>
      </div>

      {density !== 'compact' && (
        <div style={{
          fontFamily: 'var(--gp-font-display)',
          fontSize: bp === 'mobile' ? 16 : 18,
          lineHeight: 1.35,
          color: 'var(--gp-fg)',
          fontVariationSettings: 'var(--gp-display-vs)',
        }}>
          “{c.story}”
        </div>
      )}

      <GP_Body size={13} style={{ color: 'var(--gp-fg-muted)' }}>{c.blurb}</GP_Body>

      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginTop: 'auto',
        paddingTop: 4,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'var(--gp-green-600)',
            border: '1px solid var(--gp-border-soft)',
            backgroundImage: 'radial-gradient(circle at 30% 25%, rgba(240,220,160,0.35), transparent 60%)',
          }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--gp-fg)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.steward.name}</span>
            <span style={{ fontSize: 10, color: 'var(--gp-fg-dim)', letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{c.steward.role}</span>
          </div>
        </div>
        <span style={{
          fontFamily: 'var(--gp-font-body)',
          fontSize: 12, fontWeight: 600,
          color: 'var(--gp-primary)',
          letterSpacing: '0.005em',
        }}>Visit →</span>
      </div>
    </a>
  );
};

/* Compact Chapter card — directory tile, no photo. */
const ChCompactCard = ({ c, density, bp }) => {
  const photo = density === 'editorial';
  return (
    <a href={c.slug === 'nigeria' ? 'Chapter (Hi-Fi).html' : '#'}
      style={{
        display: 'flex', flexDirection: 'column', gap: photo ? 12 : 8,
        padding: bp === 'mobile' ? 14 : density === 'compact' ? 14 : 18,
        background: 'var(--gp-green-800)',
        border: '1px solid var(--gp-border-soft)',
        borderRadius: 'var(--gp-radius-md)',
        textDecoration: 'none', color: 'var(--gp-fg)',
        minHeight: photo ? undefined : (bp === 'mobile' ? 'auto' : 132),
        transition: 'border-color 200ms cubic-bezier(0.22, 1, 0.36, 1), background 200ms',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(184,232,53,0.32)'; e.currentTarget.style.background = 'var(--gp-green-700)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--gp-border-soft)'; e.currentTarget.style.background = 'var(--gp-green-800)'; }}
    >
      {photo && <GP_PlaceImg label={c.s} h={110} />}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
        <ChMeta region={c.region} />
        <ChStatusChip status={c.status} />
      </div>
      <div style={{
        fontFamily: 'var(--gp-font-display)',
        fontWeight: 500,
        fontSize: bp === 'mobile' ? 17 : density === 'compact' ? 18 : 20,
        lineHeight: 1.2,
        color: 'var(--gp-secondary)',
        letterSpacing: '-0.005em',
        fontVariationSettings: 'var(--gp-display-vs)',
      }}>{c.name}</div>
      <GP_Mute size={11}>{c.city}</GP_Mute>
      <div style={{
        fontFamily: 'var(--gp-font-body)',
        fontSize: 12,
        lineHeight: 1.45,
        color: 'var(--gp-fg-muted)',
      }}>{c.s}</div>
    </a>
  );
};

/* "Don't see your city" CTA strip — bottom of page. Uses GP_CtaStrip (lift tone). */
const ChStartStrip = ({ bp }) => (
  <GP_CtaStrip
    bp={bp}
    tone="lift"
    overline="Start a chapter"
    title="Don't see your city?"
    body="We'll help you set up a local node, find co-stewards, and connect you to the wider network."
  >
    <GP_PrimaryButton>Start a chapter →</GP_PrimaryButton>
    <GP_GhostButton>Read the playbook</GP_GhostButton>
  </GP_CtaStrip>
);

Object.assign(window, {
  ChStatusChip, ChMeta, ChFilterPill,
  ChFeaturedCard, ChCompactCard,
  ChStartStrip,
});
