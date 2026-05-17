/* hifi/gld-bits.jsx — Guild Detail building blocks.
   - Breadcrumb back to "Guilds" (no index page yet — falls back to home).
   - Avatar (initials in green-700, gold inner glow).
   - Status chip — borrows ChStatusChip semantics but keeps the file standalone
     because the guild status set is just ACTIVE / UPCOMING.
   - Kind chip — "GUILD · ACTIVE" overline equivalent.
   - Member cell (avatar + name + role + chapter).
   - Project card (active + placeholder variants, two-column ready).
   - Principle card (numbered, used in How-we-work).
   - Diagram (refined nodes-and-edges over topo bg, curved hairlines, brand pills).
   - Link row (icon-pill + title + sub + handle).
*/

/* ───── Breadcrumb ─────
   Thin wrapper around GP_Breadcrumb. */
const GldBreadcrumb = ({ bp }) => (
  <GP_Breadcrumb
    bp={bp}
    back={{ label: 'Guilds', href: 'Home (Hi-Fi).html' }}
    crumbs={[{ label: GLD_GUILD.name }]}
  />
);

/* ───── Status chip ─────
   Thin wrapper around GP_StatusChip. */
const GldStatusChip = ({ status = 'ACTIVE', size = 'sm' }) => (
  <GP_StatusChip tone={status === 'ACTIVE' ? 'primary' : 'secondary'} size={size}>
    {status}
  </GP_StatusChip>
);

/* ───── Meta overline — "GUILD · ACTIVE" ───── */
const GldMeta = () => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 10,
    fontFamily: 'var(--gp-font-mono)',
    fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase',
    color: 'var(--gp-fg-dim)',
  }}>
    <span>{GLD_GUILD.kind}</span>
    <span aria-hidden="true" style={{ opacity: 0.5 }}>·</span>
    <span style={{ color: 'var(--gp-primary)' }}>Engineering</span>
  </div>
);

/* ───── Avatar ─────
   Alias of GP_Avatar. */
const GldAvatar = (props) => <GP_Avatar {...props} />;

/* ───── Member grid cell ───── */
const GldMemberCell = ({ m, bp }) => (
  <div style={{
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
    padding: bp === 'mobile' ? 14 : 20,
    background: 'var(--gp-green-700)',
    border: '1px solid var(--gp-border-soft)',
    borderRadius: 'var(--gp-radius-lg)',
    textAlign: 'center',
    minWidth: 0,
  }}>
    <GldAvatar size={bp === 'mobile' ? 56 : 72} name={m.name} />
    <div style={{
      fontFamily: 'var(--gp-font-display)',
      fontSize: bp === 'mobile' ? 15 : 18, fontWeight: 500,
      color: 'var(--gp-secondary)',
      fontVariationSettings: 'var(--gp-display-vs)',
      lineHeight: 1.2,
    }}>{m.name}</div>
    <div style={{
      fontFamily: 'var(--gp-font-mono)',
      fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
      color: 'var(--gp-primary)',
    }}>{m.role}</div>
    <div style={{
      fontFamily: 'var(--gp-font-body)',
      fontSize: 11,
      color: 'var(--gp-fg-dim)',
      marginTop: 'auto',
    }}>{m.chapter}</div>
  </div>
);

/* ───── Project card ───── */
const GldProjectCard = ({ p, bp }) => {
  const upcoming = p.status === 'UPCOMING';
  return (
    <a href="#" style={{
      display: 'flex', flexDirection: 'column', gap: 14,
      padding: bp === 'mobile' ? 18 : 28,
      background: upcoming ? 'transparent' : 'var(--gp-green-700)',
      border: upcoming
        ? '1px dashed rgba(42,107,82,0.7)'
        : '1px solid var(--gp-border-soft)',
      borderRadius: 'var(--gp-radius-lg)',
      textDecoration: 'none',
      color: 'var(--gp-fg)',
      opacity: upcoming ? 0.7 : 1,
      transition: 'border-color 200ms',
      minWidth: 0,
      cursor: upcoming ? 'default' : 'pointer',
    }}
    onMouseEnter={(e) => {
      if (!upcoming) e.currentTarget.style.borderColor = 'rgba(184,232,53,0.4)';
    }}
    onMouseLeave={(e) => {
      if (!upcoming) e.currentTarget.style.borderColor = 'var(--gp-border-soft)';
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40, height: 40,
            borderRadius: 'var(--gp-radius-md)',
            background: upcoming ? 'var(--gp-green-800)' : 'var(--gp-primary)',
            border: upcoming ? '1px dashed rgba(42,107,82,0.7)' : 'none',
            color: upcoming ? 'var(--gp-fg-dim)' : 'var(--gp-primary-fg)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--gp-font-mono)',
            fontSize: 12, fontWeight: 700, letterSpacing: '0.04em',
          }}>{p.short}</div>
          <div style={{
            fontFamily: 'var(--gp-font-mono)',
            fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase',
            color: 'var(--gp-fg-dim)',
            whiteSpace: 'nowrap',
          }}>PROJECT · {p.status}</div>
        </div>
        {upcoming && <GldStatusChip status="UPCOMING" />}
      </div>

      <div style={{
        fontFamily: 'var(--gp-font-display)',
        fontVariationSettings: 'var(--gp-display-vs)',
        fontWeight: 500,
        fontSize: bp === 'mobile' ? 22 : 28,
        lineHeight: 1.1,
        color: 'var(--gp-secondary)',
        letterSpacing: '-0.01em',
        textWrap: 'pretty',
      }}>{p.t}</div>

      <div style={{
        fontSize: 13,
        color: upcoming ? 'var(--gp-fg-dim)' : 'var(--gp-fg-muted)',
        lineHeight: 1.55,
      }}>{p.d}</div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
        {p.tech.map((x, i) => (
          <span key={i} style={{
            fontFamily: 'var(--gp-font-mono)',
            fontSize: 10, fontWeight: 600,
            padding: '4px 10px',
            border: `1px solid ${upcoming ? 'rgba(42,107,82,0.6)' : 'var(--gp-border)'}`,
            borderRadius: 'var(--gp-radius-pill)',
            color: upcoming ? 'var(--gp-fg-dim)' : 'var(--gp-fg-muted)',
            letterSpacing: '0.08em', textTransform: 'uppercase',
            background: upcoming ? 'transparent' : 'rgba(15,61,46,0.4)',
          }}>{x}</span>
        ))}
      </div>

      <div style={{
        marginTop: 'auto', paddingTop: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
      }}>
        <span style={{ fontSize: 11, color: 'var(--gp-fg-dim)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {p.lead ? `Lead · ${p.lead}` : '—'}
        </span>
        <span style={{
          fontSize: 12, fontWeight: 600,
          color: upcoming ? 'var(--gp-fg-dim)' : 'var(--gp-primary)',
          whiteSpace: 'nowrap', flex: 'none',
        }}>{upcoming ? '—' : 'Visit project →'}</span>
      </div>
    </a>
  );
};

/* ───── Principle card (How-we-work) ───── */
const GldPrincipleCard = ({ p, bp }) => (
  <div style={{
    display: 'flex', flexDirection: 'column', gap: 14,
    padding: bp === 'mobile' ? 20 : 28,
    background: 'var(--gp-green-800)',
    border: '1px solid var(--gp-border-soft)',
    borderRadius: 'var(--gp-radius-lg)',
    minWidth: 0,
  }}>
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
      <span style={{
        fontFamily: 'var(--gp-font-display)',
        fontVariationSettings: 'var(--gp-display-vs)',
        fontWeight: 500,
        fontSize: bp === 'mobile' ? 32 : 44,
        lineHeight: 1,
        color: 'var(--gp-primary)',
        letterSpacing: '-0.02em',
      }}>{p.n}</span>
      <span style={{
        flex: 1, height: 1, background: 'var(--gp-border-soft)',
        marginLeft: 8, marginRight: 0,
        transform: 'translateY(-6px)',
      }} />
    </div>
    <div style={{
      fontFamily: 'var(--gp-font-display)',
      fontVariationSettings: 'var(--gp-display-vs)',
      fontWeight: 500,
      fontSize: bp === 'mobile' ? 20 : 24,
      lineHeight: 1.15,
      color: 'var(--gp-secondary)',
      letterSpacing: '-0.005em',
      textWrap: 'pretty',
    }}>{p.t}</div>
    <div style={{ fontSize: 13, color: 'var(--gp-fg-muted)', lineHeight: 1.55 }}>
      {p.d}
    </div>
  </div>
);

/* ───── Connect link row ───── */
const GldLinkRow = ({ l, last }) => (
  <a href="#" style={{
    display: 'flex', alignItems: 'center', gap: 18,
    padding: '18px 4px',
    borderBottom: last ? 'none' : '1px solid var(--gp-border-soft)',
    textDecoration: 'none', color: 'var(--gp-fg)',
    transition: 'background 180ms',
  }}
  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(184,232,53,0.04)'; }}
  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
  >
    <div style={{
      flex: 'none',
      width: 44, height: 44,
      borderRadius: 'var(--gp-radius-pill)',
      background: 'var(--gp-primary)',
      color: 'var(--gp-primary-fg)',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--gp-font-mono)',
      fontWeight: 700,
      fontSize: l.glyph.length > 2 ? 9 : 12,
      letterSpacing: '0.06em',
    }}>{l.glyph}</div>
    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{
        fontFamily: 'var(--gp-font-display)',
        fontVariationSettings: 'var(--gp-display-vs)',
        fontSize: 17, fontWeight: 500,
        color: 'var(--gp-secondary)',
      }}>{l.label}</span>
      <span style={{ fontSize: 12, color: 'var(--gp-fg-muted)' }}>{l.sub}</span>
    </div>
    <span style={{
      fontSize: 12, fontWeight: 600,
      color: 'var(--gp-primary)', flex: 'none',
      whiteSpace: 'nowrap',
    }}>{l.handle} →</span>
  </a>
);

/* ───── Working-session photo placeholder ─────
   Re-uses GP_PlaceImg but layers a faint chartreuse accent corner. */
const GldWorkingPhoto = ({ h = 400 }) => (
  <div style={{ position: 'relative' }}>
    <GP_PlaceImg label={GLD_GUILD.heroPhoto} h={h} />
    <div aria-hidden="true" style={{
      position: 'absolute',
      left: 16, top: 16,
      padding: '6px 12px',
      background: 'rgba(15,61,46,0.7)',
      backdropFilter: 'blur(6px)',
      border: '1px solid rgba(184,232,53,0.3)',
      borderRadius: 'var(--gp-radius-pill)',
      fontFamily: 'var(--gp-font-mono)',
      fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
      color: 'var(--gp-primary)',
      whiteSpace: 'nowrap',
    }}>ETHDenver · 2026</div>
  </div>
);

/* ───── Diagram — refined nodes-and-edges, curved hairlines, brand pills.
   Used as the system-diagram hero variant + (when typographic) inside the
   mandate section. The container is responsive height.
   ───── */

/* Color tokens for the diagram */
const _gldDiagramColors = {
  rim:    'rgba(42,107,82,0.7)',     // node outer border (forest contour)
  glow:   'rgba(184,232,53,0.5)',    // soft chartreuse glow
  edge:   'rgba(240,220,160,0.55)',  // hairline color — gold
  centerBg: 'var(--gp-primary)',
};

const GldDiagram = ({ h = 420, bp }) => {
  const mobile = bp === 'mobile';

  /* Layout positions (percent). Center node at 50/50, four outputs around it. */
  const center = { x: 50, y: 50 };
  const positions = [
    { x: 18, y: 24 },  // top-left  — Funding tools
    { x: 82, y: 24 },  // top-right — Reputation primitives
    { x: 18, y: 78 },  // bot-left  — Attestation flows
    { x: 82, y: 78 },  // bot-right — Public surfaces
  ];

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: h,
      background: 'var(--gp-green-800)',
      borderRadius: 'var(--gp-radius-lg)',
      border: '1px solid var(--gp-border-soft)',
      overflow: 'hidden',
    }}>
      {/* topographic wash */}
      <div aria-hidden="true" style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'url("hifi/assets/topo-bg.png")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        opacity: 0.18,
        mixBlendMode: 'overlay',
      }} />
      {/* gold radial wash from center */}
      <div aria-hidden="true" style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(circle at 50% 50%, rgba(240,220,160,0.07), transparent 55%)',
      }} />

      {/* corner caption */}
      <div style={{
        position: 'absolute', top: 16, left: 16,
        fontFamily: 'var(--gp-font-mono)',
        fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase',
        color: 'var(--gp-fg-dim)',
        zIndex: 2,
      }}>What the Dev Guild builds</div>

      {/* SVG curved hairlines */}
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
      >
        <defs>
          <radialGradient id="gld-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%"  stopColor={_gldDiagramColors.glow} stopOpacity="0.25" />
            <stop offset="100%" stopColor={_gldDiagramColors.glow} stopOpacity="0" />
          </radialGradient>
        </defs>
        {/* soft glow ring around center */}
        <circle cx={center.x} cy={center.y} r="22" fill="url(#gld-glow)" />
        {/* curved bezier hairlines from center to each output */}
        {positions.map((p, i) => {
          const mx = (center.x + p.x) / 2;
          const my = (center.y + p.y) / 2;
          /* curl the midpoint slightly outward — sign per quadrant */
          const dx = p.x < center.x ? -6 : 6;
          const dy = p.y < center.y ? -4 : 4;
          const cx = mx + dx;
          const cy = my + dy;
          return (
            <path
              key={i}
              d={`M ${center.x} ${center.y} Q ${cx} ${cy} ${p.x} ${p.y}`}
              fill="none"
              stroke={_gldDiagramColors.edge}
              strokeWidth="0.4"
              strokeLinecap="round"
              strokeDasharray="0.8 1.2"
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
      </svg>

      {/* Center node — Dev Guild pill */}
      <div style={{
        position: 'absolute',
        left: `${center.x}%`, top: `${center.y}%`,
        transform: 'translate(-50%, -50%)',
        padding: mobile ? '10px 18px' : '14px 28px',
        background: _gldDiagramColors.centerBg,
        color: 'var(--gp-primary-fg)',
        borderRadius: 'var(--gp-radius-pill)',
        fontFamily: 'var(--gp-font-display)',
        fontVariationSettings: 'var(--gp-display-vs)',
        fontWeight: 500,
        fontSize: mobile ? 16 : 22,
        letterSpacing: '-0.005em',
        boxShadow: '0 0 0 6px rgba(184,232,53,0.15), 0 14px 38px -10px rgba(0,0,0,0.55)',
        zIndex: 2,
      }}>Dev Guild</div>

      {/* Output nodes */}
      {GLD_GUILD.outputs.map((o, i) => (
        <div key={i} style={{
          position: 'absolute',
          left: `${positions[i].x}%`, top: `${positions[i].y}%`,
          transform: 'translate(-50%, -50%)',
          display: 'flex', alignItems: 'center', gap: 10,
          padding: mobile ? '6px 10px 6px 6px' : '8px 16px 8px 8px',
          background: 'var(--gp-green-700)',
          border: '1px solid rgba(240,220,160,0.35)',
          borderRadius: 'var(--gp-radius-pill)',
          fontFamily: 'var(--gp-font-body)',
          fontSize: mobile ? 11 : 13,
          fontWeight: 600,
          color: 'var(--gp-secondary)',
          letterSpacing: '0.005em',
          whiteSpace: 'nowrap',
          zIndex: 2,
          boxShadow: '0 6px 20px -10px rgba(0,0,0,0.6)',
        }}>
          <span style={{
            width: mobile ? 22 : 26, height: mobile ? 22 : 26,
            borderRadius: '50%',
            background: 'var(--gp-green-900)',
            color: 'var(--gp-primary)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--gp-font-mono)',
            fontSize: mobile ? 9 : 10,
            fontWeight: 700, letterSpacing: '0.04em',
          }}>{o.glyph}</span>
          {o.label}
        </div>
      ))}
    </div>
  );
};

Object.assign(window, {
  GldBreadcrumb, GldStatusChip, GldMeta, GldAvatar,
  GldMemberCell, GldProjectCard, GldPrincipleCard, GldLinkRow,
  GldWorkingPhoto, GldDiagram,
});
