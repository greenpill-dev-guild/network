/* hifi/lib-bits.jsx — Library-specific atoms.
   ------------------------------------------------------------------
   This file used to define a parallel copy of every typography atom
   (HF_Display, HF_H1, HF_Body, HF_Overline, …) and CTA. Those duplicates
   have been removed — the HF_* names now ALIAS the GP_* atoms from
   gp-shell.jsx, so visual / token changes only ever live in one place.

   Things that remain unique to this file:
     · HF_DirectionContext + HF_DIRECTIONS (A / B / C / D explorations)
     · HF_BookCover (book-cover placeholder with tinted slab)
     · HF_TINTS (the book-cover color set)
     · HFCanvasNote — sticky note used in design-review canvases

   Note: the page is now LOCKED to direction C in lib-page.jsx. The other
   directions are kept here in case we want to explore again later, but
   the production page only ever sees C. */

/* --- direction config (consumed by every component) --- */
const HF_DirectionContext = React.createContext({
  key: 'C',
  pageBg: 'var(--gp-green-900)',
  density: 'packed',
  cardSurface: 'var(--gp-green-800)',
  cardElev:    'var(--gp-green-700)',
  cardBorder:  'var(--gp-border-soft)',
  useLime: true,
  hero: 'iconic',
  books: 'covers',
  sectionPad: 72,
  rowGap: 48,
  inset: 96,
  topoOnPage: true,
  showWordmarkFooter: false,
});

const useDirection = () => React.useContext(HF_DirectionContext);

const HF_DIRECTIONS = {
  A: {
    key: 'A', label: 'A · Editorial',
    pageBg: 'var(--gp-green-900)',
    density: 'spacious',
    cardSurface: 'transparent',
    cardElev:    'var(--gp-green-800)',
    cardBorder:  'rgba(42, 107, 82, 0.45)',
    useLime: true,
    hero: 'editorial',
    books: 'covers',
    sectionPad: 112,
    rowGap: 80,
    topoOnPage: true,
    showWordmarkFooter: true,
  },
  B: {
    key: 'B', label: 'B · Layered',
    pageBg: 'var(--gp-green-900)',
    density: 'balanced',
    cardSurface: 'var(--gp-green-800)',
    cardElev:    'var(--gp-green-700)',
    cardBorder:  'var(--gp-border-soft)',
    useLime: true,
    hero: 'featured',
    books: 'editorial-cards',
    sectionPad: 88,
    rowGap: 0,
    topoOnPage: false,
    showWordmarkFooter: false,
  },
  C: {
    key: 'C', label: 'C · Iconic',
    pageBg: 'var(--gp-green-900)',
    density: 'packed',
    cardSurface: 'var(--gp-green-800)',
    cardElev:    'var(--gp-green-700)',
    cardBorder:  'var(--gp-border-soft)',
    useLime: true,
    hero: 'iconic',
    books: 'covers',
    sectionPad: 72,
    rowGap: 48,
    topoOnPage: true,
    showWordmarkFooter: false,
  },
  D: {
    key: 'D', label: 'D · Mono',
    pageBg: 'var(--gp-green-900)',
    density: 'editorial',
    cardSurface: 'transparent',
    cardElev:    'transparent',
    cardBorder:  'rgba(240, 220, 160, 0.22)',
    useLime: false,
    hero: 'mono',
    books: 'numbered',
    sectionPad: 120,
    rowGap: 96,
    topoOnPage: true,
    showWordmarkFooter: true,
  },
};

/* --- inset helper: alias of GP_useInset to keep the lib API stable. --- */
const useInset = (bp) => GP_useInset(bp);

/* --- Typography aliases — pure wrappers around GP_* atoms.
   Existing call sites pass `size` / `style` / `color`; all flow through
   unchanged. --- */
const HF_Display = (props) => <GP_Display {...props} />;
const HF_H1      = (props) => <GP_H1      {...props} />;
const HF_H2      = (props) => <GP_H2      {...props} />;
const HF_H3      = (props) => <GP_H3      {...props} />;
const HF_Body    = (props) => <GP_Body    {...props} />;
const HF_Mute    = (props) => <GP_Mute    {...props} />;
const HF_Caption = (props) => <GP_Caption {...props} />;

/* HF_Overline: in direction D the overline goes gold; everywhere else it's
   lime. Keeps the historical behavior by reading the direction. */
const HF_Overline = ({ children, style, color }) => {
  const dir = useDirection();
  return (
    <GP_Overline
      style={style}
      color={color ?? (dir.useLime ? 'var(--gp-primary)' : 'var(--gp-secondary)')}
      size={11}
    >{children}</GP_Overline>
  );
};

/* HF_ArrowLink: same direction-aware color behavior. */
const HF_ArrowLink = ({ children, size = 14, color, href = '#', style }) => {
  const dir = useDirection();
  return (
    <GP_ArrowLink
      href={href}
      size={size}
      color={color ?? (dir.useLime ? 'var(--gp-primary)' : 'var(--gp-secondary)')}
      style={style}
    >{children}</GP_ArrowLink>
  );
};

/* CTAs — alias the GP_ buttons (which now have proper hover/active states). */
const HF_PrimaryButton = (props) => <GP_PrimaryButton {...props} />;
const HF_GhostButton   = (props) => <GP_GhostButton   {...props} />;

/* Section header — alias. */
const HF_SectionHeader = ({ overline, title, side, titleSize, bp }) => (
  <GP_SectionHeader
    overline={overline}
    title={title}
    side={side}
    titleSize={titleSize ?? 'clamp(28px, 3.2vw, 44px)'}
    bp={bp}
  />
);

/* Placeholder image — alias. */
const HF_PlaceImg = (props) => <GP_PlaceImg {...props} />;

/* Sticky canvas note — alias of GP_CanvasNote. */
const HFCanvasNote = (props) => <GP_CanvasNote {...props} />;

/* Rail arrows — alias of GP_RailArrows. */
const HF_RailArrows = (props) => <GP_RailArrows {...props} />;

/* ----------------------------------------------------------------------
   HF_BookCover — placeholder book cover with tinted slab.
   Title + author rendered on the cover so it reads as a book even
   without art. Surface tint varies by index so a rail of covers
   doesn't look flat.
   ---------------------------------------------------------------------- */

const HF_TINTS = [
  { bg: 'linear-gradient(155deg, #1A4D3A 0%, #143F30 100%)', accent: '#F0DCA0' },
  { bg: 'linear-gradient(155deg, #235C46 0%, #1A4D3A 100%)', accent: '#F0DCA0' },
  { bg: 'linear-gradient(155deg, #0F3D2E 0%, #0A2D21 100%)', accent: '#B8E835' },
  { bg: 'linear-gradient(155deg, #2A6B52 0%, #1A4D3A 100%)', accent: '#FAE8C2' },
  { bg: 'linear-gradient(155deg, #1A4D3A 0%, #0F3D2E 100%)', accent: '#F0DCA0' },
];

const HF_BookCover = ({ b, w, ratio = '3/4', i = 0, dense = false }) => {
  const tint = HF_TINTS[i % HF_TINTS.length];
  return (
    <div style={{
      position: 'relative',
      width: w,
      aspectRatio: ratio.replace('/', ' / '),
      background: tint.bg,
      borderRadius: 'var(--gp-radius-md)',
      overflow: 'hidden',
      boxShadow: '0 1px 0 0 rgba(255,255,255,0.06) inset, 0 16px 36px -18px rgba(0,0,0,0.55)',
    }}>
      <div aria-hidden="true" style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'url("hifi/assets/topo-bg.png")',
        backgroundSize: 'cover',
        opacity: 0.16,
        mixBlendMode: 'overlay',
      }} />
      <div style={{
        position: 'absolute', left: dense ? 14 : 22, right: dense ? 14 : 22, top: dense ? 18 : 26,
        height: 1, background: 'rgba(240,220,160,0.35)',
      }} />
      <div style={{
        position: 'absolute', left: dense ? 14 : 22, top: dense ? 26 : 36,
        fontFamily: 'var(--gp-font-mono)',
        fontSize: dense ? 9 : 10, color: 'rgba(250,247,238,0.6)',
        letterSpacing: '0.1em', textTransform: 'uppercase',
      }}>{b.edition ? `${b.edition} · ${b.y}` : b.y}</div>
      <div style={{
        position: 'absolute', left: dense ? 14 : 22, right: dense ? 14 : 22, top: dense ? 48 : 64,
        fontFamily: 'var(--gp-font-display)',
        fontSize: dense ? 18 : 28, fontWeight: 500,
        lineHeight: 1.05, letterSpacing: '-0.01em',
        color: tint.accent,
        textWrap: 'pretty',
        fontVariationSettings: 'var(--gp-display-vs)',
      }}>{b.t}</div>
      <div style={{
        position: 'absolute', left: dense ? 14 : 22, right: dense ? 14 : 22, bottom: dense ? 16 : 22,
        fontFamily: 'var(--gp-font-body)',
        fontSize: dense ? 10 : 12,
        color: 'rgba(250,247,238,0.75)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
      }}>
        <span>{b.a}</span>
        <span style={{ fontFamily: 'var(--gp-font-mono)', fontSize: dense ? 9 : 10, color: 'rgba(250,247,238,0.4)' }}>
          {b.pages}p
        </span>
      </div>
    </div>
  );
};

Object.assign(window, {
  HF_DirectionContext, HF_DIRECTIONS, useDirection, useInset,
  HF_Display, HF_H1, HF_H2, HF_H3,
  HF_Body, HF_Overline, HF_Mute, HF_Caption,
  HF_PrimaryButton, HF_GhostButton,
  HF_PlaceImg, HF_BookCover, HF_TINTS,
  HF_SectionHeader, HF_RailArrows, HF_ArrowLink,
  HFCanvasNote,
});
