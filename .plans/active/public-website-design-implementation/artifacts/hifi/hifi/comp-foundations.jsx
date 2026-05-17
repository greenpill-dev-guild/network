/* hifi/comp-foundations.jsx — design-token spec cards.
   Sections: foundations (overview), colors, type, spacing, shadows, brand. */

/* ───── helpers used only inside this file ───── */
const Swatch = ({ token, hex, label, dark }) => (
  <div className="comp-swatch">
    <div className="comp-swatch-tile" style={{ background: hex }}>
      <span style={{ color: dark ? 'var(--gp-fg)' : 'var(--gp-primary-fg)', fontFamily: 'var(--gp-font-mono)', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.8 }}>{hex}</span>
    </div>
    <div className="comp-swatch-meta">
      <code className="comp-swatch-token">{token}</code>
      <span className="comp-swatch-label">{label}</span>
    </div>
  </div>
);

const TypeRow = ({ label, sample, meta, family, size, weight, lh, ls, vs, color }) => (
  <div className="comp-type-row">
    <div className="comp-type-render" style={{
      fontFamily: family, fontSize: size, fontWeight: weight, lineHeight: lh,
      letterSpacing: ls, fontVariationSettings: vs, color: color || 'var(--gp-secondary)',
    }}>{sample}</div>
    <div className="comp-type-meta">
      <div className="comp-type-name">{label}</div>
      <code>{meta}</code>
    </div>
  </div>
);

/* =====================================================================
   FOUNDATIONS — top of page overview card.
   ===================================================================== */
const Comp_Foundations = () => (
  <CompSection id="foundations" label="Foundations" cols={1}
    lead="The system in one card. Three colors do almost all the work; type splits warmly between Spectral (display, gold) and Manrope (body, off-white); everything sits on the deep-forest canvas with a topographic wash overlaid at 8–12% opacity.">
    <SpecCard
      fullWidth
      name="Design language"
      description="A regenerative network-society. Earthy-premium, optimistic, organic-meets-digital. The pill capsule is the brand's recurring hero element; the topographic background is signature."
      props={[
        { name: 'palette',        type: 'tokens', default: 'forest / lime / gold', notes: '#0F3D2E · #B8E835 · #F0DCA0 — never #FFFFFF for body' },
        { name: 'display font',   type: 'family', default: 'Spectral',             notes: 'gold (--gp-secondary). Italic variant available for editorial accents.' },
        { name: 'body font',      type: 'family', default: 'Manrope',              notes: 'off-white (--gp-fg). Weight 400 body, 600–700 labels' },
        { name: 'corner family',  type: 'system', default: 'round',                notes: '6 · 12 · 20 · 32 · 9999. NEVER mix rounded + sharp in one view' },
        { name: 'lime accent',    type: 'rule',   default: 'one per screen',       notes: 'reserved for CTAs, icon-badges, key highlights' },
      ]}
      notes={[
        'Topographic linework backdrop at 8–12% opacity, mix-blend-mode: overlay. Use .gp-topo or hifi/assets/topo-bg.png.',
        'Avoid: pure white, gradient buttons, purple/blue gradients, generic noise, dot grids, frosted-glass, mesh gradients.',
        'No drop shadows on flat UI. Hierarchy via tonal layering: green-900 → 800 → 700 → 600.',
      ]}
    >
      <div className="comp-foundation-hero">
        <div className="comp-foundation-grid">
          <div className="comp-foundation-tile" style={{ background: '#0F3D2E', color: 'var(--gp-fg)' }}>
            <div className="comp-foundation-bigtoken">--gp-bg</div>
            <div className="comp-foundation-bighex">#0F3D2E</div>
            <div className="comp-foundation-tilelabel">Deep Forest · canvas</div>
          </div>
          <div className="comp-foundation-tile" style={{ background: '#B8E835', color: 'var(--gp-primary-fg)' }}>
            <div className="comp-foundation-bigtoken">--gp-primary</div>
            <div className="comp-foundation-bighex">#B8E835</div>
            <div className="comp-foundation-tilelabel">Greenpill Lime · single accent</div>
          </div>
          <div className="comp-foundation-tile" style={{ background: '#F0DCA0', color: '#3a2a06' }}>
            <div className="comp-foundation-bigtoken">--gp-secondary</div>
            <div className="comp-foundation-bighex">#F0DCA0</div>
            <div className="comp-foundation-tilelabel">Steward Gold · headlines</div>
          </div>
        </div>
        <div className="comp-foundation-headlines">
          <span style={{ fontFamily: 'var(--gp-font-display)', fontSize: 56, color: 'var(--gp-secondary)', fontVariationSettings: 'var(--gp-display-vs)', fontWeight: 500, lineHeight: 1, letterSpacing: '-0.01em' }}>Spectral</span>
          <span style={{ fontFamily: 'var(--gp-font-body)', fontSize: 20, color: 'var(--gp-fg)', letterSpacing: '0.005em' }}>Manrope</span>
        </div>
      </div>
    </SpecCard>
  </CompSection>
);

/* =====================================================================
   COLORS
   ===================================================================== */
const Comp_Colors = () => (
  <CompSection id="colors" label="Colors" cols={1}
    lead="Three colors do almost all the work; the green and gold ramps provide tonal hierarchy. Lime is reserved as a single accent.">
    <SpecCard
      fullWidth
      name="Brand colors"
      file="hifi/gp-tokens.css"
      description="The three colors that drive everything."
      props={[
        { name: '--gp-bg',        type: 'color', default: '#0F3D2E', notes: 'Page canvas. Almost everything sits on this.' },
        { name: '--gp-primary',   type: 'color', default: '#B8E835', notes: 'Lime accent. ONE primary action per screen.' },
        { name: '--gp-secondary', type: 'color', default: '#F0DCA0', notes: 'Steward gold. Display headlines only — never body.' },
        { name: '--gp-fg',        type: 'color', default: '#FAF7EE', notes: 'Warm off-white body copy. Never #FFFFFF.' },
        { name: '--gp-error',     type: 'color', default: '#E07856', notes: 'Earthy terracotta. Never saturated red.' },
      ]}
    >
      <div className="comp-color-row">
        <Swatch token="--gp-bg"        hex="#0F3D2E" label="Deep Forest" />
        <Swatch token="--gp-primary"   hex="#B8E835" label="Greenpill Lime" />
        <Swatch token="--gp-secondary" hex="#F0DCA0" label="Steward Gold" />
        <Swatch token="--gp-fg"        hex="#FAF7EE" label="Warm Off-white" />
        <Swatch token="--gp-error"     hex="#E07856" label="Earthy Terracotta" />
      </div>
    </SpecCard>

    <SpecCard
      fullWidth
      name="Green ramp"
      file="hifi/gp-tokens.css"
      description="Tonal layers for hierarchy on the forest canvas. Hierarchy is carried by tonal step, not by shadows."
      props={[
        { name: '--gp-green-900', type: 'color', default: '#0F3D2E', notes: 'Page background (alias of --gp-bg).' },
        { name: '--gp-green-800', type: 'color', default: '#143F30', notes: 'Section surface, inputs.' },
        { name: '--gp-green-700', type: 'color', default: '#1A4D3A', notes: 'Card surface (--gp-card).' },
        { name: '--gp-green-600', type: 'color', default: '#235C46', notes: 'Elevated card (--gp-card-elev).' },
        { name: '--gp-green-500', type: 'color', default: '#2A6B52', notes: 'Hairline / contour (--gp-border).' },
      ]}
    >
      <div className="comp-color-row">
        <Swatch token="--gp-green-950" hex="#0A2D21" label="Deepest" />
        <Swatch token="--gp-green-900" hex="#0F3D2E" label="Canvas" />
        <Swatch token="--gp-green-800" hex="#143F30" label="Surface" />
        <Swatch token="--gp-green-700" hex="#1A4D3A" label="Card" />
        <Swatch token="--gp-green-600" hex="#235C46" label="Elevated" />
        <Swatch token="--gp-green-500" hex="#2A6B52" label="Border" />
      </div>
    </SpecCard>

    <SpecCard
      fullWidth
      name="Lime ramp"
      file="hifi/gp-tokens.css"
      description="Greenpill chartreuse. Used as a SINGLE accent — at most one primary surface per screen."
      props={[
        { name: '--gp-lime-400', type: 'color', default: '#C9F052', notes: 'Hover state for primary buttons.' },
        { name: '--gp-lime-500', type: 'color', default: '#B8E835', notes: 'Default (alias of --gp-primary).' },
        { name: '--gp-lime-600', type: 'color', default: '#A6D328', notes: 'Active / pressed.' },
        { name: '--gp-lime-700', type: 'color', default: '#86AB22', notes: 'For lime on white (a11y) — never use the brand 500 there.' },
      ]}
    >
      <div className="comp-color-row">
        <Swatch token="--gp-lime-200" hex="#E5F8AB" label="Faintest" dark />
        <Swatch token="--gp-lime-300" hex="#D8F37D" label="Pale" dark />
        <Swatch token="--gp-lime-400" hex="#C9F052" label="Hover" dark />
        <Swatch token="--gp-lime-500" hex="#B8E835" label="Default" dark />
        <Swatch token="--gp-lime-600" hex="#A6D328" label="Active" />
        <Swatch token="--gp-lime-700" hex="#86AB22" label="On-white" />
      </div>
    </SpecCard>

    <SpecCard
      fullWidth
      name="Gold ramp"
      file="hifi/gp-tokens.css"
      description="Steward gold. Display headlines, ornament rules, secondary accents. Editorial weight, never coldness."
    >
      <div className="comp-color-row">
        <Swatch token="--gp-gold-200" hex="#FAE8C2" label="Pale" dark />
        <Swatch token="--gp-gold-300" hex="#F5E0AE" label="Cream" dark />
        <Swatch token="--gp-gold-400" hex="#F0DCA0" label="Default" dark />
        <Swatch token="--gp-gold-500" hex="#E6CB80" label="Brass" dark />
        <Swatch token="--gp-gold-600" hex="#C9A861" label="Dim" />
      </div>
    </SpecCard>

    <SpecCard
      fullWidth
      name="Semantic colors"
      file="hifi/gp-tokens.css"
      description="Success and warning intentionally reuse primary / secondary so the system never invents new accents. Only error gets its own color."
      props={[
        { name: '--gp-success', type: 'color', default: '#B8E835', notes: 'Aliases --gp-primary.' },
        { name: '--gp-warning', type: 'color', default: '#F0DCA0', notes: 'Aliases --gp-secondary.' },
        { name: '--gp-error',   type: 'color', default: '#E07856', notes: 'Earthy terracotta. Never a saturated red.' },
        { name: '--gp-info',    type: 'color', default: '#B8E835', notes: 'Aliases --gp-primary.' },
      ]}
    >
      <div className="comp-color-row">
        <Swatch token="--gp-success" hex="#B8E835" label="Success" dark />
        <Swatch token="--gp-warning" hex="#F0DCA0" label="Warning" dark />
        <Swatch token="--gp-error"   hex="#E07856" label="Error"   />
      </div>
    </SpecCard>
  </CompSection>
);

/* =====================================================================
   TYPE
   ===================================================================== */
const Comp_Type = () => (
  <CompSection id="type" label="Type" cols={1}
    lead="Spectral (display, gold) for all headlines and pull-quotes; Manrope (body, off-white) for everything else. Never Inter, Roboto, Arial, Open Sans, Lato.">
    <SpecCard
      fullWidth
      name="Display scale"
      file="hifi/gp-shell.jsx"
      description="GP_Display, GP_H1–H3. All render in Spectral / weight 500 / gold by default."
      props={[
        { name: 'as',    type: "'h1'|'h2'|'h3'|…", default: "'h1'", notes: 'Semantic element override.' },
        { name: 'size',  type: 'number | string',  default: 'token-driven', notes: 'Overrides --gp-{display|h1|h2|h3}-size for that instance.' },
        { name: 'style', type: 'CSSProperties',    default: '—',    notes: 'Merges over inline style.' },
      ]}
    >
      <div className="comp-type-stack">
        <TypeRow label="GP_Display"
          sample={'Everything we\u2019ve made public.'}
          meta="--gp-display-size · clamp(56–104px)"
          family="var(--gp-font-display)" size={80} weight={500} lh={1.05} ls="-0.02em" vs="normal" />
        <TypeRow label="GP_H1"
          sample="A CoordiNation across Nations."
          meta="--gp-h1-size · clamp(40–72px)"
          family="var(--gp-font-display)" size={56} weight={500} lh={1.1} ls="-0.015em" vs="normal" />
        <TypeRow label="GP_H2"
          sample="Read the books."
          meta="--gp-h2-size · clamp(28–44px)"
          family="var(--gp-font-display)" size={36} weight={500} lh={1.15} ls="-0.01em" vs="normal" />
        <TypeRow label="GP_H3"
          sample="The eight activities of a chapter."
          meta="--gp-h3-size · clamp(22–28px)"
          family="var(--gp-font-display)" size={24} weight={500} lh={1.2} ls="-0.005em" vs="normal" />
      </div>
    </SpecCard>

    <SpecCard
      fullWidth
      name="Body & inline"
      file="hifi/gp-shell.jsx"
      description="GP_Body / GP_Mute / GP_Caption / GP_Mono / GP_Overline. All Manrope. Body sits on warm off-white; mute / caption / overline step the color down."
      props={[
        { name: 'GP_Body',     type: 'p',    default: 'fg, 16px',      notes: 'Reading copy. Accepts size prop for 14/15/17/19.' },
        { name: 'GP_Mute',     type: 'span', default: 'fg-muted, 13px', notes: 'De-emphasized inline copy.' },
        { name: 'GP_Caption',  type: 'span', default: 'fg-dim, 12px',  notes: 'Smallest scale.' },
        { name: 'GP_Mono',     type: 'span', default: 'fg-dim, 11px',  notes: 'Mono uppercase. Used for kicker overlines, ID tags.' },
        { name: 'GP_Overline', type: 'div',  default: 'primary, 11px / 0.14em', notes: 'Section overline. Set size={10} for inline meta. ALL CAPS.' },
      ]}
    >
      <div className="comp-type-stack">
        <TypeRow label="GP_Body"  sample="Field-tested books, two hundred conversations, and the playbooks behind them — open, free, and made by the network." meta="16px / 1.6 lh / weight 400 / fg" family="var(--gp-font-body)" size={16} weight={400} lh={1.6} color="var(--gp-fg)" />
        <TypeRow label="GP_Mute"  sample="Two hundred and eighteen conversations on regenerative web3." meta="13px / weight 400 / fg-muted" family="var(--gp-font-body)" size={13} weight={400} lh={1.6} color="var(--gp-fg-muted)" />
        <TypeRow label="GP_Caption" sample="© 2026 Greenpill Network" meta="12px / weight 400 / fg-dim" family="var(--gp-font-body)" size={12} weight={400} lh={1.5} color="var(--gp-fg-dim)" />
        <TypeRow label="GP_Overline" sample="LIBRARY · KNOWLEDGE COMMONS" meta="11px / weight 700 / 0.14em / primary" family="var(--gp-font-body)" size={11} weight={700} lh={1} ls="0.14em" color="var(--gp-primary)" />
        <TypeRow label="GP_Mono"  sample="CHAPTER · AMERICAS · ACTIVE" meta="11px / mono / 0.08em / fg-dim" family="var(--gp-font-mono)" size={11} weight={400} lh={1} ls="0.08em" color="var(--gp-fg-dim)" />
      </div>
    </SpecCard>
  </CompSection>
);

/* =====================================================================
   SPACING & RADII
   ===================================================================== */
const Comp_Spacing = () => (
  <CompSection id="spacing" label="Spacing & radii">
    <SpecCard
      name="Spacing scale"
      file="hifi/gp-tokens.css"
      description="8px base grid with a 4px half-step. Generous negative space is mandatory — sections breathe at 96px+ vertical on desktop."
      props={[
        { name: '--gp-space-xs',  type: 'rem', default: '4px',  notes: '0.25rem — half-step.' },
        { name: '--gp-space-sm',  type: 'rem', default: '8px',  notes: '0.5rem — base unit.' },
        { name: '--gp-space-md',  type: 'rem', default: '16px', notes: '1rem — default inline gap.' },
        { name: '--gp-space-lg',  type: 'rem', default: '24px', notes: '1.5rem — comfortable card padding.' },
        { name: '--gp-space-xl',  type: 'rem', default: '32px', notes: '2rem — generous card padding.' },
        { name: '--gp-space-2xl', type: 'rem', default: '48px', notes: '3rem — minor section gap.' },
        { name: '--gp-space-3xl', type: 'rem', default: '64px', notes: '4rem — section padding mobile.' },
        { name: '--gp-space-4xl', type: 'rem', default: '96px', notes: '6rem — section padding desktop.' },
        { name: '--gp-space-5xl', type: 'rem', default: '128px',notes: '8rem — hero margins.' },
      ]}
    >
      <div className="comp-space-stack">
        {[
          ['xs',  4],   ['sm',  8],   ['md',  16],  ['lg',  24],
          ['xl',  32],  ['2xl', 48],  ['3xl', 64],  ['4xl', 96],
        ].map(([k, n]) => (
          <div key={k} className="comp-space-bar">
            <code>--gp-space-{k}</code>
            <div className="comp-space-rule" style={{ width: n }} />
            <span>{n}px</span>
          </div>
        ))}
      </div>
    </SpecCard>

    <SpecCard
      name="Radii"
      file="hifi/gp-tokens.css"
      description="ONE corner family — round. Never mix rounded + sharp in the same view. Pill (9999) is signature."
      props={[
        { name: '--gp-radius-sm',   type: 'px',  default: '6px',    notes: 'Inputs, small chips, table cells.' },
        { name: '--gp-radius-md',   type: 'px',  default: '12px',   notes: 'Cards, panels, popovers, modals.' },
        { name: '--gp-radius-lg',   type: 'px',  default: '20px',   notes: 'Hero cards, partner logos, image containers.' },
        { name: '--gp-radius-xl',   type: 'px',  default: '32px',   notes: 'Full-bleed feature blocks.' },
        { name: '--gp-radius-pill', type: 'px',  default: '9999px', notes: 'All buttons, all chips, all icon-badges. Signature.' },
      ]}
    >
      <div className="comp-radii-row">
        {[
          ['sm',   6,   80],
          ['md',  12,   80],
          ['lg',  20,   80],
          ['xl',  32,   80],
          ['pill','999',80],
        ].map(([k, r, s]) => (
          <div key={k} className="comp-radii-cell">
            <div className="comp-radii-tile" style={{
              width: s, height: s,
              borderRadius: r === '999' ? 9999 : r,
            }} />
            <code>--gp-radius-{k}</code>
            <span className="comp-radii-meta">{r === '999' ? '9999px' : `${r}px`}</span>
          </div>
        ))}
      </div>
    </SpecCard>
  </CompSection>
);

/* =====================================================================
   SHADOWS & ELEVATION
   ===================================================================== */
const Comp_Shadows = () => (
  <CompSection id="shadows" label="Shadows & elevation">
    <SpecCard
      fullWidth
      name="Elevation tokens"
      file="hifi/gp-tokens.css"
      description="The system is mostly flat. Hierarchy is carried by tonal layering. The few shadow tokens that exist are for specific signature treatments — the pill glow, photography surfaces, and the deck's deep pill shadow."
      props={[
        { name: '--gp-shadow-pill',    type: 'shadow', default: 'lime glow',   notes: 'Signature chartreuse bioluminescent glow. ONCE per screen, primary CTA.' },
        { name: '--gp-shadow-card',    type: 'shadow', default: 'soft drop',   notes: 'Only over photography. Never on flat UI.' },
        { name: '--gp-shadow-card-lg', type: 'shadow', default: 'soft drop+',  notes: 'Larger variant for hero photography.' },
        { name: '--gp-shadow-deep',    type: 'shadow', default: 'directional', notes: '-7px 7px 28px on the floating pill capsule asset.' },
        { name: '--gp-shadow-focus',   type: 'shadow', default: '3px lime',    notes: 'Focus ring at 40% opacity. Never remove.' },
      ]}
    >
      <div className="comp-shadow-row">
        <div className="comp-shadow-tile" style={{ boxShadow: 'var(--gp-shadow-pill)', background: 'var(--gp-primary)' }}>
          <span>pill</span>
        </div>
        <div className="comp-shadow-tile" style={{ boxShadow: 'var(--gp-shadow-card)', background: 'var(--gp-green-700)' }}>
          <span>card</span>
        </div>
        <div className="comp-shadow-tile" style={{ boxShadow: 'var(--gp-shadow-card-lg)', background: 'var(--gp-green-700)' }}>
          <span>card-lg</span>
        </div>
        <div className="comp-shadow-tile" style={{ boxShadow: 'var(--gp-shadow-deep)', background: 'var(--gp-green-700)' }}>
          <span>deep</span>
        </div>
        <div className="comp-shadow-tile" style={{ boxShadow: 'var(--gp-shadow-focus)', background: 'var(--gp-green-800)' }}>
          <span>focus</span>
        </div>
      </div>
    </SpecCard>

    <SpecCard
      fullWidth
      name="Tonal layering"
      description="The system's primary depth device. 5% lightness step per layer. No drop shadows on these surfaces."
    >
      <div className="comp-tonal-row">
        {[
          ['--gp-green-900', '#0F3D2E', 'Canvas'],
          ['--gp-green-800', '#143F30', 'Surface'],
          ['--gp-green-700', '#1A4D3A', 'Card'],
          ['--gp-green-600', '#235C46', 'Elevated'],
        ].map(([t, h, l]) => (
          <div key={t} className="comp-tonal-card" style={{ background: h }}>
            <code>{t}</code>
            <span>{l}</span>
          </div>
        ))}
      </div>
    </SpecCard>
  </CompSection>
);

/* =====================================================================
   BRAND & ICONS
   ===================================================================== */
const Comp_Brand = () => (
  <CompSection id="brand" label="Brand & icons">
    <SpecCard
      name="Wordmark"
      file="hifi/assets/green-pill-wordmark.svg"
      description="The 'GREEN PILL' gold serif wordmark. Lockup form. Used on the deck cover and the Library direction A footer."
    >
      <img src="hifi/assets/green-pill-wordmark.svg" alt="GREEN PILL" style={{ height: 48, opacity: 0.95 }} />
    </SpecCard>

    <SpecCard
      name="Pill motif"
      file="hifi/assets/pill-motif.png"
      description="The 3D chartreuse pill capsule. Coral-ridged, slightly bioluminescent. Primary hero motif."
    >
      <img src="hifi/assets/pill-motif.png" alt="Greenpill capsule" style={{ height: 160, maxWidth: '100%', objectFit: 'contain', filter: 'drop-shadow(-7px 7px 28px rgba(22,50,31,0.6))' }} />
    </SpecCard>

    <SpecCard
      name="Coordination globe"
      file="hifi/assets/coordination-globe.png"
      description="Same coral-ridge texture wrapped on a sphere. Reserved for global / cross-chapter / 'CoordiNation' framings."
    >
      <img src="hifi/assets/coordination-globe.png" alt="Coordination globe" style={{ height: 160, maxWidth: '100%', objectFit: 'contain' }} />
    </SpecCard>

    <SpecCard
      name="Topographic backdrop"
      file="hifi/assets/topo-bg.png"
      description="The signature backdrop. Use at 8–12% opacity in mix-blend-mode: overlay over the forest canvas. Never replace with noise / dot grids / mesh."
    >
      <div className="comp-topo-preview">
        <div className="comp-topo-bg" />
        <div className="comp-topo-label">8–12% over --gp-green-900</div>
      </div>
    </SpecCard>

    <SpecCard
      fullWidth
      name="Icon-badge bullets"
      description="The brand's signature iconographic element: a filled forest-green glyph in a chartreuse circle. Appears in the eight-activity wheel, Chapters/Guilds/Pods row, Why-partner slide, partner logos, social handles row."
      props={[
        { name: 'size', type: '28 / 56 / 80 / 200', default: '56', notes: '28 = chip (no glyph). 56 = default body badge. 80 = hero. 200 = slide tile.' },
        { name: 'glyph', type: 'svg | string', default: '—', notes: 'Phosphor (Fill weight) is the primary recommendation. Lucide is acceptable for inline-nav.' },
      ]}
    >
      <div className="comp-iconbadge-row">
        {[28, 56, 80, 120].map(s => (
          <div key={s} className="comp-iconbadge-cell">
            <div className="comp-iconbadge" style={{ width: s, height: s }}>
              {s >= 56 && (
                <svg viewBox="0 0 24 24" width={Math.round(s * 0.45)} height={Math.round(s * 0.45)} aria-hidden="true">
                  <path fill="var(--gp-primary-fg)" d="M12 2 L14.5 8.5 L21 9.3 L16 13.8 L17.5 20 L12 16.7 L6.5 20 L8 13.8 L3 9.3 L9.5 8.5 Z" />
                </svg>
              )}
            </div>
            <span>{s}px</span>
          </div>
        ))}
      </div>
    </SpecCard>
  </CompSection>
);

Object.assign(window, {
  Comp_Foundations, Comp_Colors, Comp_Type, Comp_Spacing, Comp_Shadows, Comp_Brand,
});
