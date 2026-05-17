/* hifi/comp-components.jsx — spec cards for shared GP_* atoms.
   Sections: chrome, buttons, inputs, chips, meta, avatars, placeholders. */

/* =====================================================================
   CHROME — header, footer, breadcrumb
   ===================================================================== */
const Comp_Chrome = () => (
  <CompSection id="chrome" label="Chrome" cols={1}
    lead="Header + footer are unified across all eight pages. Breadcrumbs sit just below the header on detail pages.">
    <SpecCard
      fullWidth
      name="GP_Header"
      file="hifi/gp-shell.jsx"
      description="Top navigation: logo lockup left, primary nav right. Active item gets a lime underline. On mobile (bp='mobile') it switches to a hamburger that opens a slide-down nav overlay."
      props={[
        { name: 'bp',        type: "'mobile' | 'tablet' | 'desktop'", default: '—', notes: 'Controls inset padding + mobile hamburger.' },
        { name: 'activeNav', type: "'Home' | 'Chapters' | 'Library' | 'Stories' | 'Garden'", default: "'Home'", notes: 'Highlights the matching link with a lime underline.' },
      ]}
      notes={[
        'Nav items live in GP_NAV_ITEMS constant — single source of truth.',
        'Logo links to Home (Hi-Fi).html, lime dot has a 14px glow.',
        'On mobile the hamburger animates to an X when expanded; the slide-down stays under 320px tall.',
      ]}
    >
      <div className="comp-chrome-wrap">
        <GP_Header bp="desktop" activeNav="Library" />
        <div className="comp-chrome-divider">Desktop · active = Library</div>
      </div>
      <div className="comp-chrome-wrap" style={{ maxWidth: 375, margin: '12px auto 0' }}>
        <GP_Header bp="mobile" activeNav="Garden" />
        <div className="comp-chrome-divider">Mobile · 375px</div>
      </div>
    </SpecCard>

    <SpecCard
      fullWidth
      name="GP_Footer"
      file="hifi/gp-shell.jsx"
      description="Four columns: Network · Get involved · Resources · Connect. Right rail shows the wordmark + CoordiNation tagline. Set showWordmark=true to swap to a centered wordmark above the columns (used by Library direction A · Editorial)."
      props={[
        { name: 'bp',           type: "'mobile' | 'tablet' | 'desktop'", default: '—',     notes: 'Stacks to 2 columns on mobile.' },
        { name: 'showWordmark', type: 'boolean',                          default: 'false', notes: 'When true, centers a full-width wordmark above the columns and drops the right-rail wordmark.' },
      ]}
      notes={[
        'Garden is the canonical name (not "Knowledge Map" / "Knowledge Garden").',
        'All column items now link to real pages (Chapters / Library / Stories / Garden / Guild) — # only for items without a destination yet.',
      ]}
      previewPad={0}
    >
      <GP_Footer bp="desktop" />
    </SpecCard>

    <SpecCard
      name="GP_Breadcrumb"
      file="hifi/gp-shell.jsx"
      description="Back-link + slash-separated trail. Used on Chapter, Story, Guild detail pages."
      props={[
        { name: 'bp',     type: 'breakpoint',                          default: '—', notes: 'Controls inset padding.' },
        { name: 'back',   type: '{ label, href }',                     default: '—', notes: 'Renders as "← {label}". Optional.' },
        { name: 'crumbs', type: '[{ label, href? }]',                  default: '[]', notes: 'Last crumb is rendered as the current page (no link).' },
      ]}
    >
      <GP_Breadcrumb
        bp="desktop"
        back={{ label: 'All stories', href: '#' }}
        crumbs={[{ label: 'Greenpill Brasil', href: '#' }, { label: 'ENVIRONMENTAL' }]}
      />
    </SpecCard>
  </CompSection>
);

/* =====================================================================
   BUTTONS & LINKS
   ===================================================================== */
const Comp_Buttons = () => (
  <CompSection id="buttons" label="Buttons & links">
    <SpecCard
      name="GP_PrimaryButton"
      file="hifi/gp-shell.jsx"
      description="Pill, lime fill, deep forest text. Carries the signature --gp-shadow-pill glow. Hover → lime-400, active → lime-600."
      props={[
        { name: 'style',  type: 'CSSProperties', default: '—', notes: 'Merges over inline style — use to tweak height/padding.' },
        { name: '...rest',type: 'HTMLButtonAttrs',default: '—', notes: 'onClick, type, disabled, etc.' },
      ]}
      notes={[
        'Use ONCE per screen — primary action only.',
        'No scale-down on press. Color shift is the press affordance per system spec.',
      ]}
    >
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <GP_PrimaryButton>Start a chapter</GP_PrimaryButton>
        <GP_PrimaryButton>Subscribe</GP_PrimaryButton>
      </div>
    </SpecCard>

    <SpecCard
      name="GP_GhostButton"
      file="hifi/gp-shell.jsx"
      description="Outline pill, hairline border. Hover fills green-800 and shifts text to lime-400."
      props={[
        { name: 'style',  type: 'CSSProperties',  default: '—', notes: '' },
        { name: '...rest',type: 'HTMLButtonAttrs',default: '—', notes: '' },
      ]}
    >
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <GP_GhostButton>Read the playbook</GP_GhostButton>
        <GP_GhostButton>Editorial guide</GP_GhostButton>
      </div>
    </SpecCard>

    <SpecCard
      name="GP_ArrowLink"
      file="hifi/gp-shell.jsx"
      description="Inline text link with a trailing → arrow. Color defaults to primary (lime); pass color='var(--gp-secondary)' for gold variants."
      props={[
        { name: 'size',  type: 'number',  default: '14',                     notes: 'Font size in px.' },
        { name: 'color', type: 'CSS color',default: 'var(--gp-primary)',     notes: 'Pass var(--gp-secondary) for direction D / mono pages.' },
        { name: 'href',  type: 'string',  default: "'#'",                    notes: '' },
      ]}
    >
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center' }}>
        <GP_ArrowLink>Browse all books</GP_ArrowLink>
        <GP_ArrowLink color="var(--gp-secondary)" size={13}>Read the editorial guide</GP_ArrowLink>
      </div>
    </SpecCard>

    <SpecCard
      name="GP_RailArrows"
      file="hifi/gp-shell.jsx"
      description="Round outline ‹ › pair for horizontal carousels (book rails, podcast rails)."
      props={[
        { name: 'onPrev', type: 'function', default: '—', notes: '' },
        { name: 'onNext', type: 'function', default: '—', notes: '' },
      ]}
    >
      <GP_RailArrows />
    </SpecCard>

    <SpecCard
      name="SdShareSaveButtons"
      file="hifi/sd-bits.jsx"
      description="Share + Save inline buttons. Used in Story Detail hero. Two tones: 'on-canvas' (default) and 'on-photo' (blurred glass over photography)."
      props={[
        { name: 'tone', type: "'on-canvas' | 'on-photo'", default: "'on-canvas'", notes: 'Photo tone gets backdrop-filter blur.' },
      ]}
    >
      {typeof SdShareSaveButtons === 'function' ? (
        <SdShareSaveButtons tone="on-canvas" />
      ) : <span style={{ color: 'var(--gp-fg-dim)' }}>Loaded with Story Detail</span>}
    </SpecCard>
  </CompSection>
);

/* =====================================================================
   INPUTS
   ===================================================================== */
const Comp_Inputs = () => (
  <CompSection id="inputs" label="Inputs">
    <SpecCard
      name="Email pill"
      file="inline (Newsletter / Garden)"
      description="The system's input atom — pill-shaped, transparent green-900 fill, hairline border. Focus ring is --gp-shadow-focus (3px lime at 40% opacity)."
      props={[
        { name: 'height',  type: 'px',    default: '48', notes: '40px variant used in the Garden ramp cards.' },
        { name: 'border',  type: 'token', default: 'var(--gp-border)', notes: 'On focus → var(--gp-primary).' },
      ]}
    >
      <form onSubmit={(e) => e.preventDefault()} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <input type="email" placeholder="you@email.com" style={{
          flex: '1 1 220px', minWidth: 220,
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
    </SpecCard>

    <SpecCard
      name="StSelect"
      file="hifi/st-bits.jsx"
      description="Inline pill-shaped dropdown with a 'Label: Value ▾' affordance. Visual-only — not a working select."
      props={[
        { name: 'label', type: 'string', default: '—', notes: 'The grey prefix.' },
        { name: 'value', type: 'string', default: '—', notes: 'The bold current value.' },
      ]}
    >
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {typeof StSelect === 'function' && (
          <>
            <StSelect label="Topic"   value="All" />
            <StSelect label="Chapter" value="All" />
            <StSelect label="Sort"    value="Newest" />
          </>
        )}
      </div>
    </SpecCard>

    <SpecCard
      fullWidth
      name="StFilterBar"
      file="hifi/st-bits.jsx"
      description="The Stories filter bar — topic pills + dropdown selects. Three render styles via the style prop: pills (default), underlines, dropdown-only."
      props={[
        { name: 'bp',          type: 'breakpoint',                              default: '—',         notes: '' },
        { name: 'style',       type: "'pills' | 'underlines' | 'dropdown'",     default: "'pills'",   notes: 'underlines = link-style row; dropdown = no chips, just selects.' },
        { name: 'showChapter', type: 'boolean',                                  default: 'true',     notes: 'Hide the Chapter select when not relevant.' },
      ]}
    >
      {typeof StFilterBar === 'function' ? (
        <StFilterBar bp="desktop" style="pills" />
      ) : null}
    </SpecCard>

    <SpecCard
      fullWidth
      name="ChFilterPill"
      file="hifi/ch-bits.jsx"
      description="Chapter-index filter chip with a count badge. Two kinds: single-select (region) and multi-select (status, with a checkbox)."
      props={[
        { name: 'active',  type: 'boolean',                                          default: 'false',   notes: 'Active fills with soft lime + lime border.' },
        { name: 'kind',    type: "'single' | 'multi'",                               default: "'single'", notes: 'multi shows a checkbox.' },
        { name: 'count',   type: 'number',                                           default: '—',        notes: 'Optional count badge.' },
        { name: 'onClick', type: 'function',                                         default: '—',        notes: '' },
      ]}
    >
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        {typeof ChFilterPill === 'function' && (
          <>
            <ChFilterPill active>All</ChFilterPill>
            <ChFilterPill>Americas</ChFilterPill>
            <ChFilterPill>Europe</ChFilterPill>
            <ChFilterPill kind="multi" active count={6}>Active</ChFilterPill>
            <ChFilterPill kind="multi" count={4}>Forming</ChFilterPill>
          </>
        )}
      </div>
    </SpecCard>
  </CompSection>
);

/* =====================================================================
   CHIPS & BADGES
   ===================================================================== */
const Comp_Chips = () => (
  <CompSection id="chips" label="Chips & badges">
    <SpecCard
      name="GP_StatusChip"
      file="hifi/gp-shell.jsx"
      description="Dot + label pill. Primary tone is lime (Active); secondary is gold (Forming, Upcoming, Pending)."
      props={[
        { name: 'tone', type: "'primary' | 'secondary'", default: "'primary'", notes: '' },
        { name: 'size', type: "'sm' | 'lg'",             default: "'sm'",      notes: '' },
      ]}
    >
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <GP_StatusChip tone="primary"  size="sm">Active</GP_StatusChip>
        <GP_StatusChip tone="secondary" size="sm">Forming</GP_StatusChip>
        <GP_StatusChip tone="primary"  size="lg">Active</GP_StatusChip>
        <GP_StatusChip tone="secondary" size="lg">Upcoming</GP_StatusChip>
      </div>
    </SpecCard>

    <SpecCard
      name="GP_Chip"
      file="hifi/gp-shell.jsx"
      description="The unified pill chip. Replaces inline pill implementations across topic filters, tech tags, translation chips, thanks-to chips. Set onClick to make it interactive."
      props={[
        { name: 'tone',   type: "'outline' | 'soft-lime' | 'soft-gold' | 'fill-lime'", default: "'outline'", notes: '' },
        { name: 'active', type: 'boolean', default: 'false', notes: 'Shortcut for tone=fill-lime.' },
        { name: 'size',   type: "'sm' | 'md' | 'lg'", default: "'md'", notes: 'sm = 22px, md = 30px, lg = 36px.' },
        { name: 'mono',   type: 'boolean', default: 'false', notes: 'Switches to mono uppercase rendering.' },
      ]}
    >
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <GP_Chip>Outline</GP_Chip>
        <GP_Chip tone="soft-lime">Soft lime</GP_Chip>
        <GP_Chip tone="soft-gold">Soft gold</GP_Chip>
        <GP_Chip active>Filled</GP_Chip>
        <GP_Chip mono tone="soft-lime">IRL</GP_Chip>
        <GP_Chip size="sm" tone="soft-gold">Português</GP_Chip>
      </div>
    </SpecCard>
  </CompSection>
);

/* =====================================================================
   META LINES
   ===================================================================== */
const Comp_Meta = () => (
  <CompSection id="meta" label="Meta lines">
    <SpecCard
      fullWidth
      name="GP_Meta"
      file="hifi/gp-shell.jsx"
      description="The unified mono inline-meta line. Pass an array of strings — renders 'A · B · C · …' in mono / uppercase / fg-dim. Use accentIndex to highlight one item in lime."
      props={[
        { name: 'items',       type: 'string[]',                  default: '[]',                 notes: '' },
        { name: 'size',        type: 'number',                    default: '10',                 notes: '10 for inline meta, 11 for slightly bolder labels.' },
        { name: 'color',       type: 'CSS color',                 default: 'var(--gp-fg-dim)',   notes: '' },
        { name: 'accentIndex', type: 'number',                    default: '—',                  notes: 'Highlights one item in --gp-primary.' },
      ]}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <GP_Meta items={['Chapter', 'Americas', 'Active']} />
        <GP_Meta items={['Story', 'Environmental', 'Mar 2026']} accentIndex={1} />
        <GP_Meta items={['Guild', 'Engineering']} accentIndex={1} />
        <GP_Meta items={['Greenpill Brasil', 'Environmental']} size={11} color="var(--gp-fg-muted)" />
      </div>
    </SpecCard>

    <SpecCard
      name="StMeta"
      file="hifi/st-bits.jsx"
      description="Stories-specific meta: chapter / tag / date. Chapter is gold; tag is lime; date is dim."
    >
      {typeof StMeta === 'function' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <StMeta chapter="Brasil" tag="ENVIRONMENTAL" date="MAR 2026" />
          <StMeta chapter="Cape Town" tag="DOCUMENTARY" />
        </div>
      )}
    </SpecCard>

    <SpecCard
      name="ChMeta"
      file="hifi/ch-bits.jsx"
      description="Chapter-card overline: 'CHAPTER / REGION'. Mono. Used at the top of Featured + Compact chapter cards."
    >
      {typeof ChMeta === 'function' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <ChMeta region="Americas" />
          <ChMeta region="Africa" />
        </div>
      )}
    </SpecCard>

    <SpecCard
      name="GldMeta"
      file="hifi/gld-bits.jsx"
      description="Guild-specific overline: 'GUILD · ENGINEERING' (vertical highlighted in lime)."
    >
      {typeof GldMeta === 'function' && <GldMeta />}
    </SpecCard>

    <SpecCard
      name="StByline"
      file="hifi/st-bits.jsx"
      description="Inline byline (no avatar): 'Author · Date · Read time'. For use INSIDE cards where space is tight."
    >
      {typeof StByline === 'function' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <StByline author="Camila R." date="Mar 2026" read="6 min" />
          <StByline author="Femi A." date="Feb 2026" />
        </div>
      )}
    </SpecCard>
  </CompSection>
);

/* =====================================================================
   AVATARS
   ===================================================================== */
const Comp_Avatars = () => (
  <CompSection id="avatars" label="Avatars">
    <SpecCard
      name="GP_Avatar"
      file="hifi/gp-shell.jsx"
      description="Initials in a green-700 disc with a soft gold inner glow. Replaces the formerly-duplicated CdAvatar / SdAvatar / GldAvatar (all now alias this)."
      props={[
        { name: 'size', type: 'number', default: '56', notes: 'Common: 32 / 56 / 72 / 84.' },
        { name: 'name', type: 'string', default: "''",  notes: 'First two initials are rendered.' },
      ]}
    >
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <GP_Avatar size={32} name="Camila R." />
        <GP_Avatar size={48} name="Femi A." />
        <GP_Avatar size={56} name="Sarah K." />
        <GP_Avatar size={72} name="Nasrin H." />
        <GP_Avatar size={96} name="Diego T." />
      </div>
    </SpecCard>

    <SpecCard
      name="GP_AvatarStack"
      file="hifi/gp-shell.jsx"
      description="Overlapped avatars + '+N more' indicator. For guild member previews, chapter steward strips, contributor lists."
      props={[
        { name: 'count', type: 'number', default: '3',  notes: 'Number of overlapped avatars to render.' },
        { name: 'extra', type: 'number', default: '0',  notes: 'Adds "+N more" text after the stack.' },
        { name: 'size',  type: 'number', default: '28', notes: '' },
      ]}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'flex-start' }}>
        <GP_AvatarStack count={4} extra={0} size={28} />
        <GP_AvatarStack count={5} extra={12} size={36} />
        <GP_AvatarStack count={3} extra={47} size={32} />
      </div>
    </SpecCard>

    <SpecCard
      fullWidth
      name="GP_LinkRow"
      file="hifi/gp-shell.jsx"
      description="Icon-badge + label + sub + handle-arrow. Used for connect / social handle blocks across Chapter, Guild, Story pages. shape='pill' lets the badge widen to fit longer text labels."
      props={[
        { name: 'glyph',  type: 'string | node', default: '—',        notes: 'Short label rendered in the lime badge.' },
        { name: 'label',  type: 'string',        default: '—',        notes: 'Display title.' },
        { name: 'sub',    type: 'string',        default: '—',        notes: 'Secondary line.' },
        { name: 'handle', type: 'string',        default: '—',        notes: 'Trailing handle (e.g. "@nigeria") with an arrow.' },
        { name: 'shape',  type: "'circle' | 'pill'", default: "'circle'", notes: 'Pill auto-widens to fit longer glyphs.' },
        { name: 'href',   type: 'string',        default: "'#'",      notes: '' },
      ]}
    >
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <GP_LinkRow glyph="TW" label="Twitter / X" sub="Network updates + chapter notes" handle="@greenpill" />
        <GP_LinkRow glyph="DC" label="Discord" sub="The Hub — guilds, pods, working sessions" handle="hub.greenpill" />
        <GP_LinkRow glyph="FC" label="Farcaster" sub="Frame conversations + cast threads" handle="@greenpill" shape="pill" last />
      </div>
    </SpecCard>
  </CompSection>
);

/* =====================================================================
   PLACEHOLDERS
   ===================================================================== */
const Comp_Placeholders = () => (
  <CompSection id="placeholders" label="Placeholders">
    <SpecCard
      name="GP_PlaceImg"
      file="hifi/gp-shell.jsx"
      description="The image placeholder used wherever real photography hasn't shipped. Green-800 surface with topo wash + faint gold radial sheen + mono corner label."
      props={[
        { name: 'label', type: 'string', default: '—',  notes: 'Caption rendered in the bottom-left in mono.' },
        { name: 'h',     type: 'number', default: '200',notes: 'Height in px. Ignored if `ratio` is set.' },
        { name: 'w',     type: 'string', default: '100%', notes: '' },
        { name: 'ratio', type: "'16/10' | '3/4' | '1/1' | …", default: '—', notes: 'CSS aspect-ratio string. Wins over h.' },
      ]}
    >
      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <GP_PlaceImg label="brasil · reforestation drive" h={180} />
        </div>
        <div style={{ flex: 1 }}>
          <GP_PlaceImg label="podcast · ep 218" ratio="1/1" h={null} />
        </div>
      </div>
    </SpecCard>

    <SpecCard
      name="GP_CanvasNote"
      file="hifi/gp-shell.jsx"
      description="Yellow sticky-note overlay for design rationale. Floats next to the element it's commenting on. Useful for mid-review canvases — should be stripped before production."
      props={[
        { name: 'pos', type: "'right' | 'left' | 'above' | 'inline'", default: "'right'", notes: '' },
      ]}
    >
      <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
        <GP_CanvasNote pos="inline">
          The chapter card hero photo should be 16:10 — anything wider stretches the steward portrait below.
        </GP_CanvasNote>
      </div>
    </SpecCard>

    <SpecCard
      name="HF_BookCover"
      file="hifi/lib-bits.jsx"
      description="Book-cover placeholder with a tinted slab. Renders title + edition + author + page count directly on the cover so a rail reads as books even without art."
      props={[
        { name: 'b',     type: '{ t, a, y, pages, edition? }', default: '—',     notes: 'Book data.' },
        { name: 'i',     type: 'number',                       default: '0',     notes: 'Index — picks a tint from HF_TINTS.' },
        { name: 'w',     type: 'string',                       default: '—',     notes: '' },
        { name: 'ratio', type: 'string',                       default: "'3/4'", notes: '' },
        { name: 'dense', type: 'boolean',                      default: 'false', notes: 'Smaller padding / type for thumbnail rails.' },
      ]}
    >
      <div style={{ display: 'flex', gap: 12 }}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} style={{ width: 84 }}>
            <HF_BookCover
              b={{ t: 'Greenpilled', a: 'K. Owocki', y: 2022, pages: 280, edition: '2nd' }}
              w="100%" i={i} dense
            />
          </div>
        ))}
      </div>
    </SpecCard>

    <SpecCard
      name="SdHeroPhoto"
      file="hifi/sd-bits.jsx"
      description="Hero photo placeholder for Story Detail. Topographic wash + warm radial gradients + optional scrim. Used by all SdHero* variants."
      props={[
        { name: 'h',         type: 'number',                  default: '—',                     notes: '' },
        { name: 'caption',   type: 'string',                  default: '—',                     notes: 'Mono pill in bottom-left.' },
        { name: 'radius',    type: 'CSS radius',              default: 'var(--gp-radius-xl)',   notes: '' },
        { name: 'scrim',     type: 'boolean',                 default: 'false',                 notes: '' },
        { name: 'scrimSide', type: "'bottom' | 'left'",       default: "'bottom'",              notes: '' },
      ]}
    >
      {typeof SdHeroPhoto === 'function' ? (
        <SdHeroPhoto h={220} caption="brasil · março 2026" scrim />
      ) : null}
    </SpecCard>
  </CompSection>
);

Object.assign(window, {
  Comp_Chrome, Comp_Buttons, Comp_Inputs, Comp_Chips, Comp_Meta, Comp_Avatars, Comp_Placeholders,
});
