/* hifi/comp-shell.jsx — primitives for the Components inventory page.
   Provides:
     - SpecCard       : developer-handoff card for ONE component
     - VariantStrip   : labeled row of alternative renders within a SpecCard
     - PropTable      : props matrix
     - CompSection    : section header + grid container for spec cards
     - CompNav        : sticky left rail with section anchors
     - CompPage       : outer page wrapper with topo wash + GP_Header */

const COMP_SECTIONS = [
  { id: 'foundations',  label: 'Foundations' },
  { id: 'colors',       label: 'Colors' },
  { id: 'type',         label: 'Type' },
  { id: 'spacing',      label: 'Spacing & radii' },
  { id: 'shadows',      label: 'Shadows & elevation' },
  { id: 'brand',        label: 'Brand & icons' },
  { id: 'chrome',       label: 'Chrome' },
  { id: 'buttons',      label: 'Buttons & links' },
  { id: 'inputs',       label: 'Inputs' },
  { id: 'chips',        label: 'Chips & badges' },
  { id: 'meta',         label: 'Meta lines' },
  { id: 'avatars',      label: 'Avatars' },
  { id: 'placeholders', label: 'Placeholders' },
  { id: 'cards',        label: 'Cards' },
  { id: 'rows',         label: 'List rows' },
  { id: 'sections',     label: 'Section blocks' },
  { id: 'hero',         label: 'Hero variants' },
  { id: 'article',      label: 'Article components' },
  { id: 'garden',       label: 'Garden specials' },
];

/* =====================================================================
   SpecCard — the workhorse. A single component's rendered example +
   import path + props + notes, packaged for developer handoff.
   ===================================================================== */
const SpecCard = ({
  name,            // 'GP_PrimaryButton'
  file,            // 'hifi/gp-shell.jsx'
  description,     // 1-2 line description
  props,           // [{name, type, default, notes}]
  notes,           // string[] of bullets, optional
  fullWidth,       // bool — span full grid row
  children,        // primary preview
  previewPad,      // override preview padding (number = px)
  previewBg,       // override preview surface ('canvas' | 'dark' | 'transparent')
}) => {
  const padding = previewPad ?? 28;
  const bg = previewBg === 'canvas'
    ? 'transparent'
    : previewBg === 'transparent'
    ? 'transparent'
    : 'var(--gp-green-950)';
  return (
    <div className={fullWidth ? 'comp-card comp-card-full' : 'comp-card'}>
      <div className="comp-card-header">
        <div className="comp-card-name">{name}</div>
        {file && <div className="comp-card-file">{file}</div>}
      </div>
      {description && <div className="comp-card-desc">{description}</div>}

      <div className="comp-preview" style={{ padding, background: bg }}>
        {children}
      </div>

      {props && props.length > 0 && (
        <PropTable rows={props} />
      )}

      {notes && notes.length > 0 && (
        <div className="comp-notes">
          {notes.map((n, i) => (
            <div key={i} className="comp-note">
              <span aria-hidden="true" className="comp-note-bullet">{'\u2022'}</span>
              <span>{n}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* VariantStrip — labeled horizontal row inside a SpecCard preview.
   Pass `items` as an array of { label, content } objects. */
const VariantStrip = ({ items, gap = 32, align = 'center' }) => (
  <div className="comp-variants" style={{ gap, alignItems: align }}>
    {items.map((it, i) => (
      <div key={i} className="comp-variant">
        <div className="comp-variant-render">{it.content}</div>
        <div className="comp-variant-label">{it.label}</div>
      </div>
    ))}
  </div>
);

/* PropTable — props matrix. */
const PropTable = ({ rows }) => (
  <div className="comp-props">
    <div className="comp-props-head">
      <span>Prop</span>
      <span>Type</span>
      <span>Default</span>
      <span>Notes</span>
    </div>
    {rows.map((r, i) => (
      <div key={i} className="comp-props-row">
        <span className="comp-props-name"><code>{r.name}</code></span>
        <span className="comp-props-type"><code>{r.type || '\u2014'}</code></span>
        <span className="comp-props-default">{r.default == null ? '\u2014' : <code>{String(r.default)}</code>}</span>
        <span className="comp-props-notes">{r.notes || '\u2014'}</span>
      </div>
    ))}
  </div>
);

/* CompSection — section header + grid wrapper. */
const CompSection = ({ id, label, lead, children, cols = 2 }) => (
  <section id={id} className={`comp-section comp-cols-${cols}`}>
    <div className="comp-section-header">
      <GP_Overline color="var(--gp-primary)">{label}</GP_Overline>
      {lead && (
        <div className="comp-section-lead">{lead}</div>
      )}
    </div>
    <div className="comp-grid">
      {children}
    </div>
  </section>
);

/* CompNav — sticky left rail. */
const CompNav = ({ active, onJump }) => (
  <nav className="comp-nav">
    <div className="comp-nav-title">Components</div>
    {COMP_SECTIONS.map(s => (
      <a key={s.id} href={`#${s.id}`} className={`comp-nav-item${active === s.id ? ' is-active' : ''}`}
         onClick={(e) => { onJump && onJump(s.id); }}>
        {s.label}
      </a>
    ))}
  </nav>
);

/* CompPage — outer wrapper. */
const CompPage = ({ bp = 'desktop', children }) => {
  const [active, setActive] = React.useState(COMP_SECTIONS[0].id);

  /* Track which section is in view (rough scroll-spy). */
  React.useEffect(() => {
    const sections = COMP_SECTIONS
      .map(s => document.getElementById(s.id))
      .filter(Boolean);
    if (!('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver((entries) => {
      const visible = entries
        .filter(e => e.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
      if (visible[0]) setActive(visible[0].target.id);
    }, { rootMargin: '-30% 0px -55% 0px', threshold: [0, 0.25, 0.5, 0.75, 1] });
    sections.forEach(s => io.observe(s));
    return () => io.disconnect();
  }, []);

  return (
    <div className="comp-page">
      <div aria-hidden="true" className="comp-page-topo" />
      <div className="comp-page-inner">
        <GP_Header bp={bp} activeNav={null} />
        <div className="comp-hero">
          <GP_Overline>Greenpill Network · Hi-Fi</GP_Overline>
          <h1 className="comp-hero-title">Components.</h1>
          <p className="comp-hero-body">
            Every component used anywhere across the eight hi-fi pages — atoms,
            blocks, and page-specific surfaces. Each card shows the rendered
            element, where it lives, its props, and usage notes for handoff.
          </p>
        </div>
        <div className="comp-body">
          <CompNav active={active} />
          <main className="comp-main">{children}</main>
        </div>
        <GP_Footer bp={bp} />
      </div>
    </div>
  );
};

Object.assign(window, {
  COMP_SECTIONS, SpecCard, VariantStrip, PropTable, CompSection, CompNav, CompPage,
});
