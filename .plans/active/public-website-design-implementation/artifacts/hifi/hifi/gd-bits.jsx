/* hifi/gd-bits.jsx — Garden page atoms.
   Growth-stage glyphs, friction bar, step number, and the four
   per-step surfaces (Email / Telegram / Assessment / Steward).
   All static / visual-only — no real interaction. */

/* ────────────────────────────────────────────────────────────────
   Growth glyphs — the page's central metaphor.
   Each step blooms one stage further: seed → sapling → budding → flowering.
   Drawn in chartreuse on a dark soil disc, signed with a soft glow.
   Size is the disc diameter; the plant scales inside.
   ──────────────────────────────────────────────────────────────── */

const GD_GrowthGlyph = ({ stage, size = 56, withDisc = true, glow = true, soilTone = 'var(--gp-green-800)' }) => {
  const s = size;
  const stroke = Math.max(1.4, s / 36);
  const lime  = 'var(--gp-primary)';
  const gold  = 'var(--gp-secondary)';
  const soil  = 'var(--gp-green-950)';

  /* Soil mound + base coords */
  const cx = s / 2;
  const ground = s * 0.78;
  const moundR = s * 0.42;

  const SoilLayer = (
    <g>
      <ellipse cx={cx} cy={ground} rx={moundR} ry={s * 0.06} fill={soil} opacity={0.85} />
    </g>
  );

  let plant = null;
  if (stage === 'seed') {
    plant = (
      <g>
        {SoilLayer}
        {/* tiny seed peeking */}
        <ellipse cx={cx} cy={ground - 1} rx={s * 0.08} ry={s * 0.05} fill={lime} />
        {/* one fragile sprout */}
        <path
          d={`M ${cx} ${ground - 2} C ${cx - s*0.04} ${ground - s*0.15}, ${cx + s*0.02} ${ground - s*0.22}, ${cx} ${ground - s*0.3}`}
          stroke={lime} strokeWidth={stroke} strokeLinecap="round" fill="none"
        />
        <ellipse cx={cx + s*0.03} cy={ground - s*0.3} rx={s*0.025} ry={s*0.025} fill={lime} />
      </g>
    );
  } else if (stage === 'sapling') {
    plant = (
      <g>
        {SoilLayer}
        {/* stem */}
        <path
          d={`M ${cx} ${ground} L ${cx} ${ground - s*0.42}`}
          stroke={lime} strokeWidth={stroke} strokeLinecap="round"
        />
        {/* two leaves */}
        <path
          d={`M ${cx} ${ground - s*0.28} C ${cx - s*0.18} ${ground - s*0.36}, ${cx - s*0.22} ${ground - s*0.22}, ${cx - s*0.06} ${ground - s*0.22}`}
          fill={lime}
        />
        <path
          d={`M ${cx} ${ground - s*0.36} C ${cx + s*0.18} ${ground - s*0.44}, ${cx + s*0.22} ${ground - s*0.3}, ${cx + s*0.06} ${ground - s*0.3}`}
          fill={lime}
        />
      </g>
    );
  } else if (stage === 'budding') {
    plant = (
      <g>
        {SoilLayer}
        {/* taller stem */}
        <path
          d={`M ${cx} ${ground} L ${cx} ${ground - s*0.6}`}
          stroke={lime} strokeWidth={stroke} strokeLinecap="round"
        />
        {/* paired leaves */}
        <path
          d={`M ${cx} ${ground - s*0.3} C ${cx - s*0.22} ${ground - s*0.42}, ${cx - s*0.26} ${ground - s*0.22}, ${cx - s*0.04} ${ground - s*0.22}`}
          fill={lime}
        />
        <path
          d={`M ${cx} ${ground - s*0.42} C ${cx + s*0.22} ${ground - s*0.54}, ${cx + s*0.26} ${ground - s*0.34}, ${cx + s*0.04} ${ground - s*0.34}`}
          fill={lime}
        />
        {/* closed bud at the top, gold-tipped */}
        <ellipse cx={cx} cy={ground - s*0.62} rx={s*0.07} ry={s*0.1} fill={gold} />
        <path
          d={`M ${cx - s*0.07} ${ground - s*0.6} Q ${cx} ${ground - s*0.5} ${cx + s*0.07} ${ground - s*0.6}`}
          stroke={lime} strokeWidth={stroke*0.8} fill="none"
        />
      </g>
    );
  } else if (stage === 'flowering') {
    plant = (
      <g>
        {SoilLayer}
        {/* tallest stem */}
        <path
          d={`M ${cx} ${ground} L ${cx} ${ground - s*0.62}`}
          stroke={lime} strokeWidth={stroke} strokeLinecap="round"
        />
        {/* leaves */}
        <path
          d={`M ${cx} ${ground - s*0.3} C ${cx - s*0.22} ${ground - s*0.42}, ${cx - s*0.26} ${ground - s*0.22}, ${cx - s*0.04} ${ground - s*0.22}`}
          fill={lime}
        />
        <path
          d={`M ${cx} ${ground - s*0.44} C ${cx + s*0.22} ${ground - s*0.56}, ${cx + s*0.26} ${ground - s*0.36}, ${cx + s*0.04} ${ground - s*0.36}`}
          fill={lime}
        />
        {/* flower: 5 gold petals + lime centre */}
        {[0, 72, 144, 216, 288].map(rot => {
          const cy = ground - s*0.7;
          const r = s*0.1;
          return (
            <ellipse
              key={rot}
              cx={cx} cy={cy - r*0.9}
              rx={r*0.55} ry={r}
              fill={gold}
              transform={`rotate(${rot} ${cx} ${cy})`}
            />
          );
        })}
        <circle cx={cx} cy={ground - s*0.7} r={s*0.07} fill={lime} />
      </g>
    );
  }

  const inner = (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} role="img" aria-label={`${stage} growth stage`}>
      {withDisc && (
        <circle
          cx={cx} cy={cx}
          r={cx - 1}
          fill={soilTone}
          stroke="rgba(184,232,53,0.18)"
          strokeWidth="1"
        />
      )}
      {plant}
    </svg>
  );

  if (!withDisc || !glow) return inner;
  return (
    <span style={{
      display: 'inline-block',
      borderRadius: '50%',
      boxShadow: '0 0 0 1px rgba(184,232,53,0.16), 0 0 28px -4px rgba(184,232,53,0.18)',
      lineHeight: 0,
    }}>{inner}</span>
  );
};

/* ────────────────────────────────────────────────────────────────
   Friction bars — refined version of the wireframe glyph.
   Filled bars are chartreuse; unfilled are border-soft.
   ──────────────────────────────────────────────────────────────── */
const GD_FrictionBar = ({ level = 1, count = 4, width = 18, height = 5, gap = 5 }) => (
  <div style={{ display: 'flex', gap, alignItems: 'center' }}>
    {Array.from({ length: count }, (_, i) => i + 1).map(i => (
      <span key={i} style={{
        width, height,
        borderRadius: 999,
        background: i <= level
          ? 'var(--gp-primary)'
          : 'rgba(42,107,82,0.5)',
        boxShadow: i <= level ? '0 0 10px -2px rgba(184,232,53,0.5)' : 'none',
        display: 'inline-block',
      }} />
    ))}
  </div>
);

/* ────────────────────────────────────────────────────────────────
   Big serif step numerals
   ──────────────────────────────────────────────────────────────── */
const GD_StepNumber = ({ n, of = 4, size = 80 }) => (
  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
    <span style={{
      fontFamily: 'var(--gp-font-display)',
      fontSize: size,
      fontWeight: 500,
      lineHeight: 0.9,
      color: 'var(--gp-secondary)',
      fontVariationSettings: 'var(--gp-display-vs)',
      letterSpacing: '-0.02em',
    }}>{String(n).padStart(2, '0')}</span>
    <span style={{
      fontFamily: 'var(--gp-font-body)',
      fontSize: 11, letterSpacing: '0.12em',
      color: 'var(--gp-fg-dim)',
      textTransform: 'uppercase',
    }}>/ {String(of).padStart(2, '0')}</span>
  </div>
);

/* ────────────────────────────────────────────────────────────────
   Topographic elevation line — alt friction indicator.
   Renders a thickening contour to imply "altitude / commitment".
   ──────────────────────────────────────────────────────────────── */
const GD_ElevationLine = ({ level = 1 }) => {
  const intensity = level / 4;
  return (
    <svg width="120" height="28" viewBox="0 0 120 28">
      {[0, 1, 2, 3].map(i => {
        const filled = i < level;
        const y = 24 - i * 5;
        return (
          <path
            key={i}
            d={`M 0 ${y} Q 30 ${y - 3} 60 ${y} T 120 ${y}`}
            fill="none"
            stroke={filled ? 'var(--gp-primary)' : 'rgba(42,107,82,0.5)'}
            strokeWidth={filled ? 1.6 : 1}
            opacity={filled ? 0.7 + i * 0.1 : 0.45}
          />
        );
      })}
    </svg>
  );
};

/* ────────────────────────────────────────────────────────────────
   The four step surfaces — static visual mockups, kept compact.
   All share the same dark inset look so they read as one family.
   ──────────────────────────────────────────────────────────────── */

const surfaceShell = (extra = {}) => ({
  background: 'var(--gp-green-800)',
  border: '1px solid var(--gp-border-soft)',
  borderRadius: 'var(--gp-radius-lg)',
  padding: 22,
  display: 'flex', flexDirection: 'column', gap: 14,
  position: 'relative',
  ...extra,
});

const GD_EmailSurface = ({ compact }) => (
  <div style={surfaceShell()}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <GP_Overline>Field notes · monthly</GP_Overline>
      <GP_Mono>vol 14</GP_Mono>
    </div>
    <GP_H3 size={22}>Field notes, in your inbox.</GP_H3>
    <GP_Body size={13}>One email a month. Stories from chapters, new books, and the best moments from the podcast. No spam, ever.</GP_Body>

    {/* Mini "preview" card */}
    {!compact && (
      <div style={{
        marginTop: 4,
        background: 'var(--gp-green-900)',
        border: '1px solid var(--gp-border-soft)',
        borderRadius: 'var(--gp-radius-md)',
        padding: 14,
        display: 'flex', flexDirection: 'column', gap: 6,
      }}>
        <GP_Mono>{GD_EMAIL_PREVIEW.meta}</GP_Mono>
        <div style={{
          fontFamily: 'var(--gp-font-display)',
          color: 'var(--gp-secondary)', fontWeight: 500,
          fontSize: 16, lineHeight: 1.25,
          fontVariationSettings: 'var(--gp-display-vs)',
        }}>{GD_EMAIL_PREVIEW.headline}</div>
        <GP_Caption style={{ color: 'var(--gp-fg-muted)' }}>{GD_EMAIL_PREVIEW.excerpt}</GP_Caption>
      </div>
    )}

    {/* email row */}
    <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
      <div style={{
        flex: 1,
        background: 'var(--gp-green-900)',
        border: '1px solid var(--gp-border-soft)',
        borderRadius: 'var(--gp-radius-pill)',
        padding: '12px 18px',
        fontSize: 13,
        color: 'var(--gp-fg-dim)',
        fontFamily: 'var(--gp-font-body)',
      }}>your@email</div>
      <button style={{
        appearance: 'none', border: 0,
        background: 'var(--gp-primary)',
        color: 'var(--gp-primary-fg)',
        borderRadius: 'var(--gp-radius-pill)',
        padding: '0 18px', height: 40,
        fontFamily: 'var(--gp-font-body)', fontSize: 13, fontWeight: 600,
        boxShadow: '0 0 22px -6px rgba(184,232,53,0.6)',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
      }}>Subscribe</button>
    </div>
    <GP_Caption>{GD_EMAIL_PREVIEW.readers}</GP_Caption>
  </div>
);

const GD_TelegramSurface = () => (
  <div style={surfaceShell()}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <GP_Overline>Telegram · daily chatter</GP_Overline>
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        fontFamily: 'var(--gp-font-mono)', fontSize: 10, letterSpacing: '0.08em',
        color: 'var(--gp-fg-dim)', textTransform: 'uppercase',
      }}>
        <span style={{
          width: 6, height: 6, borderRadius: 999,
          background: 'var(--gp-primary)',
          boxShadow: '0 0 8px rgba(184,232,53,0.7)',
        }} />
        live
      </span>
    </div>
    <GP_H3 size={22}>The main lobby</GP_H3>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {GD_TELEGRAM_MESSAGES.map((m, i) => {
        const initials = m.who.split(' ')[0].slice(0, 1);
        return (
          <div key={i} style={{
            display: 'flex', gap: 12, alignItems: 'flex-start',
            padding: '12px 0',
            borderTop: i === 0 ? 'none' : '1px solid var(--gp-border-soft)',
          }}>
            <span style={{
              flex: 'none',
              width: 28, height: 28, borderRadius: '50%',
              background: i % 2 === 0 ? 'var(--gp-green-600)' : 'var(--gp-green-700)',
              border: '1px solid var(--gp-border-soft)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--gp-font-body)', fontSize: 11, fontWeight: 700,
              color: 'var(--gp-secondary)',
            }}>{initials}</span>
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <GP_Mono style={{ color: 'var(--gp-primary)', textTransform: 'none' }}>{m.who}</GP_Mono>
                <GP_Mono>{m.when}</GP_Mono>
              </div>
              <div style={{
                fontFamily: 'var(--gp-font-body)', fontSize: 13, lineHeight: 1.4,
                color: 'var(--gp-fg)',
              }}>{m.t}</div>
            </div>
          </div>
        );
      })}
    </div>
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      paddingTop: 6, borderTop: '1px solid var(--gp-border-soft)',
    }}>
      <GP_Caption>~1,200 members · public</GP_Caption>
      <GP_ArrowLink size={13}>Open Telegram</GP_ArrowLink>
    </div>
  </div>
);

const GD_AssessmentSurface = () => (
  <div style={surfaceShell()}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <GP_Overline>Regen assessment</GP_Overline>
      <GP_Mono>Q 03 / 12</GP_Mono>
    </div>

    {/* progress */}
    <div style={{ height: 4, borderRadius: 999, background: 'rgba(42,107,82,0.5)', position: 'relative', overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: '25%',
        background: 'var(--gp-primary)',
        boxShadow: '0 0 14px rgba(184,232,53,0.45)',
      }} />
    </div>

    <GP_H3 size={22}>What's pulling you toward regen work?</GP_H3>
    <GP_Body size={13}>Pick anything that resonates. You can change these later.</GP_Body>

    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 2 }}>
      {GD_ASSESSMENT_OPTIONS.map((p, i) => (
        <span key={i} style={{
          fontFamily: 'var(--gp-font-body)',
          fontSize: 12, fontWeight: 600,
          padding: '8px 14px',
          borderRadius: 'var(--gp-radius-pill)',
          border: p.active ? '1px solid var(--gp-primary)' : '1px solid var(--gp-border-soft)',
          background: p.active ? 'rgba(184,232,53,0.16)' : 'transparent',
          color: p.active ? 'var(--gp-primary)' : 'var(--gp-fg-muted)',
          whiteSpace: 'nowrap',
        }}>{p.label}</span>
      ))}
    </div>

    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      paddingTop: 6, marginTop: 4, borderTop: '1px solid var(--gp-border-soft)',
    }}>
      <GP_Caption>~5 min · no account needed</GP_Caption>
      <button style={{
        appearance: 'none', border: 0,
        background: 'var(--gp-primary)',
        color: 'var(--gp-primary-fg)',
        borderRadius: 'var(--gp-radius-pill)',
        padding: '8px 18px',
        fontFamily: 'var(--gp-font-body)', fontSize: 12, fontWeight: 700,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
      }}>Continue →</button>
    </div>
  </div>
);

const GD_StewardSurface = () => {
  const p = GD_STEWARD_PROFILE;
  return (
    <div style={surfaceShell()}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <GP_Overline>Book a steward call</GP_Overline>
        <GP_Mono>30 min</GP_Mono>
      </div>
      <GP_H3 size={22}>Wednesday, 10:00 — Camila R.</GP_H3>

      {/* profile row */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '14px 0',
        borderTop: '1px solid var(--gp-border-soft)',
        borderBottom: '1px solid var(--gp-border-soft)',
      }}>
        <span style={{
          flex: 'none', width: 44, height: 44, borderRadius: '50%',
          background: 'var(--gp-green-600)',
          border: '1px solid var(--gp-border-soft)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--gp-font-display)', fontWeight: 500, fontSize: 16,
          color: 'var(--gp-secondary)',
          fontVariationSettings: 'var(--gp-display-vs)',
        }}>{p.initials}</span>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{
            fontFamily: 'var(--gp-font-body)', fontSize: 14, fontWeight: 600,
            color: 'var(--gp-fg)',
          }}>{p.name} · {p.region}</div>
          <GP_Caption>{p.topics} · this week: {p.rotation}</GP_Caption>
        </div>
        <span style={{
          fontFamily: 'var(--gp-font-body)', fontSize: 11, fontWeight: 700,
          color: 'var(--gp-primary)',
          letterSpacing: '0.06em', textTransform: 'uppercase',
        }}>Match ✓</span>
      </div>

      {/* slot grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
        {GD_STEWARD_SLOTS.map((slot, i) => (
          <div key={i} style={{
            padding: '10px 4px',
            textAlign: 'center',
            borderRadius: 'var(--gp-radius-sm)',
            border: slot.active
              ? '1px solid var(--gp-primary)'
              : '1px solid var(--gp-border-soft)',
            background: slot.active
              ? 'rgba(184,232,53,0.14)'
              : 'transparent',
            color: slot.active ? 'var(--gp-primary)' : 'var(--gp-fg-muted)',
            fontFamily: 'var(--gp-font-body)',
            fontSize: 11, fontWeight: 600,
            display: 'flex', flexDirection: 'column', gap: 2,
            cursor: 'default',
          }}>
            <span style={{ letterSpacing: '0.06em', textTransform: 'uppercase', opacity: 0.85 }}>{slot.d}</span>
            <span style={{ fontFeatureSettings: '"tnum"' }}>{slot.t}</span>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
        <button style={{
          appearance: 'none', border: 0,
          background: 'var(--gp-primary)',
          color: 'var(--gp-primary-fg)',
          borderRadius: 'var(--gp-radius-pill)',
          padding: '10px 20px',
          fontFamily: 'var(--gp-font-body)', fontSize: 13, fontWeight: 700,
          cursor: 'pointer',
          boxShadow: '0 0 22px -6px rgba(184,232,53,0.6)',
          whiteSpace: 'nowrap',
        }}>Book Wed 10:00 →</button>
      </div>
    </div>
  );
};

/* Choose-by-key dispatcher */
const GD_Surface = ({ kind }) => {
  if (kind === 'email')      return <GD_EmailSurface />;
  if (kind === 'telegram')   return <GD_TelegramSurface />;
  if (kind === 'assessment') return <GD_AssessmentSurface />;
  if (kind === 'steward')    return <GD_StewardSurface />;
  return null;
};

/* Lightweight inline CTA used by the "B" step layout. */
const GD_InlineCTA = ({ label }) => (
  <button style={{
    appearance: 'none', border: 0,
    background: 'var(--gp-primary)',
    color: 'var(--gp-primary-fg)',
    borderRadius: 'var(--gp-radius-pill)',
    padding: '12px 22px',
    fontFamily: 'var(--gp-font-body)', fontSize: 14, fontWeight: 600,
    boxShadow: '0 0 24px -6px rgba(184,232,53,0.55)',
    cursor: 'pointer', alignSelf: 'flex-start',
  }}>{label} →</button>
);

Object.assign(window, {
  GD_GrowthGlyph,
  GD_FrictionBar,
  GD_StepNumber,
  GD_ElevationLine,
  GD_EmailSurface,
  GD_TelegramSurface,
  GD_AssessmentSurface,
  GD_StewardSurface,
  GD_Surface,
  GD_InlineCTA,
});
