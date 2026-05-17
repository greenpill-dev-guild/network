/* hifi/home-sections.jsx — Home page sections, built on HF primitives.
   Loads after lib-bits.jsx + lib-sections.jsx + home-map.jsx + home-data.jsx.
   Direction context is set at the page level (HF_DIRECTIONS.C). */

/* =====================================================================
   HERO — stacked centered: H1 → mycelial map → subtitle → CTA
   ===================================================================== */

const HmHero = ({ density, motion }) => {
  const [myNode, setMyNode] = React.useState(() => (typeof readMyNode === 'function' ? readMyNode() : null));
  const [walkthroughOpen, setWalkthroughOpen] = React.useState(false);
  const [newNodeIds, setNewNodeIds] = React.useState([]);
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const compute = () => setIsMobile(window.innerWidth < 720);
    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, []);

  const handleComplete = (node) => {
    setMyNode(node);
    setNewNodeIds([node.id]);
    setTimeout(() => setNewNodeIds([]), 5000);
  };

  const ctaLabel = myNode ? 'Update your node →' : 'Find your people →';

  return (
    <section className="hm-section hm-hero">
      <div className="hm-hero-inner">
        <HF_H1
          size="clamp(40px, 6.4vw, 96px)"
          style={{
            textAlign: 'center',
            textWrap: 'balance',
            maxWidth: 1040,
            margin: '0 auto',
            letterSpacing: '-0.02em',
          }}
        >
          A global regenerative network.
        </HF_H1>

        <div className="hm-hero-map">
          <HmMycelialMap
            chapters={HM_CHAPTERS}
            density={density}
            motion={motion}
            myNode={myNode}
            newNodeIds={newNodeIds}
          />
        </div>

        <HF_Body
          size={18}
          color="var(--gp-fg-muted)"
          style={{
            textAlign: 'center',
            maxWidth: 640,
            margin: '0 auto',
            textWrap: 'pretty',
          }}
        >
          Drop in to see who you connect with — by theme, role, and what you bring or seek. Fourteen chapters and counting, across five continents.
        </HF_Body>

        <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 12 }}>
          <HF_PrimaryButton onClick={() => setWalkthroughOpen(true)}>{ctaLabel}</HF_PrimaryButton>
          <HF_GhostButton onClick={() => { window.location.href = 'Chapters (Hi-Fi).html'; }}>Browse chapters</HF_GhostButton>
        </div>
      </div>

      <MapWalkthrough
        open={walkthroughOpen}
        isMobile={isMobile}
        onClose={() => setWalkthroughOpen(false)}
        onComplete={handleComplete}
      />
    </section>
  );
};

/* =====================================================================
   CHAPTER STORIES — wireframe grid:
   Desktop: 3 cols × 2 rows
     [BIG spans rows 1-2 | s0 row 1 | s1 row 1]
     [BIG continues       | s2 spans cols 2-3 row 2 (wide) ]
   Tablet: 2 cols (big top full, then 3 small)
   Mobile: 1 col stack
   ===================================================================== */

const HmStoryBig = ({ s }) => (
  <article className="hm-story hm-story-big">
    <HF_PlaceImg label={s.photo} h={null} ratio="16/10" />
    <div className="hm-story-body">
      <HF_Overline>Chapter · {s.region}</HF_Overline>
      <HF_H2 size="clamp(24px, 2.4vw, 34px)" style={{ letterSpacing: '-0.01em' }}>
        {s.title}
      </HF_H2>
      <HF_Body size={15} color="var(--gp-fg-muted)" style={{ textWrap: 'pretty' }}>
        {s.blurb}
      </HF_Body>
      <div style={{ marginTop: 'auto' }}>
        <HF_ArrowLink>Read the story</HF_ArrowLink>
      </div>
    </div>
  </article>
);

const HmStorySmall = ({ s, wide }) => (
  <article className={`hm-story ${wide ? 'hm-story-wide' : 'hm-story-small'}`}>
    <HF_PlaceImg label={s.photo} h={null} ratio={wide ? '16/6' : '4/3'} />
    <div className="hm-story-body">
      <HF_Overline>Chapter · {s.region}</HF_Overline>
      <HF_H3 size={20} style={{ letterSpacing: '-0.005em', textWrap: 'pretty' }}>
        {s.title}
      </HF_H3>
      <HF_Body size={13} color="var(--gp-fg-muted)" style={{ textWrap: 'pretty' }}>
        {s.blurb}
      </HF_Body>
      <div style={{ marginTop: 'auto' }}>
        <HF_ArrowLink size={13}>Read</HF_ArrowLink>
      </div>
    </div>
  </article>
);

const HmStoriesSection = () => {
  const [big, ...rest] = HM_STORIES;
  return (
    <section className="hm-section">
      <div className="hm-section-head">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 720 }}>
          <HF_Overline>Chapters · From the field</HF_Overline>
          <HF_H2 size="clamp(28px, 3.2vw, 44px)">Stories from the network.</HF_H2>
        </div>
        <HF_ArrowLink>See all stories</HF_ArrowLink>
      </div>

      <div className="hm-stories-grid">
        <HmStoryBig s={big} />
        <HmStorySmall s={rest[0]} />
        <HmStorySmall s={rest[1]} />
        <HmStorySmall s={rest[2]} wide />
      </div>
    </section>
  );
};

/* =====================================================================
   LIBRARY PREVIEW — 6-tile bento, 12-col × 3-row desktop:
     Books     col 1-5  rows 1-2 (4×2 covers)
     Podcast   col 6-12 row 1
     Dev Guild col 6-9  row 2
     GreenSci  col 10-12 row 2
     Toolkit   col 1-6  row 3
     Knowledge Map (soon) col 7-12 row 3
   ===================================================================== */

const HmBentoTile = ({ className = '', soon, accent, children, href }) => {
  const dir = useDirection();
  return (
    <div
      className={`hm-bento-tile ${className}`}
      style={{
        background: accent
          ? 'linear-gradient(155deg, rgba(184,232,53,0.06), rgba(20,63,48,0.5))'
          : dir.cardElev,
        border: `1px solid ${accent ? 'rgba(184,232,53,0.32)' : dir.cardBorder}`,
        borderRadius: 'var(--gp-radius-lg)',
        padding: 'clamp(20px, 2vw, 28px)',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        position: 'relative',
        overflow: 'hidden',
        minWidth: 0,
        boxSizing: 'border-box',
        opacity: soon ? 0.78 : 1,
      }}
    >
      {children}
    </div>
  );
};

const HmStatusPill = ({ children, tone = 'soon' }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', gap: 6,
    height: 24, padding: '0 10px',
    border: '1px solid var(--gp-border-soft)',
    borderRadius: 'var(--gp-radius-pill)',
    fontFamily: 'var(--gp-font-mono)',
    fontSize: 10, letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'var(--gp-fg-muted)',
    flex: 'none',
  }}>
    <span style={{
      width: 6, height: 6, borderRadius: '50%',
      background: tone === 'soon' ? 'var(--gp-gold-500)' : 'var(--gp-primary)',
    }} />
    {children}
  </span>
);

/* ----- Books tile: 4×2 grid of HF_BookCovers ----- */
const HmLibBooks = () => {
  // First 8 books in two rows of 4
  const books = HF_BOOKS.slice(0, 8);
  return (
    <HmBentoTile className="hm-lib-books">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <HF_Overline>Books · 10 titles</HF_Overline>
        <HF_Caption style={{ fontFamily: 'var(--gp-font-mono)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          All free
        </HF_Caption>
      </div>
      <HF_H3 size={24} style={{ letterSpacing: '-0.01em' }}>Read the books.</HF_H3>
      <div className="hm-lib-books-grid">
        {books.map((b, i) => (
          <HF_BookCover key={i} b={b} w="100%" i={i} dense />
        ))}
      </div>
      <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
        <HF_Mute size={13}>10+ languages · field-tested.</HF_Mute>
        <HF_ArrowLink size={13}>Browse all</HF_ArrowLink>
      </div>
    </HmBentoTile>
  );
};

/* ----- Podcast wide tile: feature episode hero ----- */
const HmLibPodcast = () => (
  <HmBentoTile className="hm-lib-podcast">
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
      <HF_Overline>Podcast · 218 episodes</HF_Overline>
      <HF_Caption style={{ fontFamily: 'var(--gp-font-mono)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        Latest · {HF_FEATURE_EP.age}
      </HF_Caption>
    </div>
    <div className="hm-lib-podcast-body">
      <div className="hm-lib-podcast-cover">
        <HF_PlaceImg label={`COVER · EP ${HF_FEATURE_EP.n}`} h={null} ratio="1/1" />
      </div>
      <div className="hm-lib-podcast-text">
        <HF_Mute size={12} style={{ fontFamily: 'var(--gp-font-mono)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Ep {HF_FEATURE_EP.n}
        </HF_Mute>
        <HF_H3 size="clamp(20px, 2vw, 28px)" style={{ letterSpacing: '-0.01em', textWrap: 'pretty' }}>
          {HF_FEATURE_EP.t}
        </HF_H3>
        <HF_Mute size={13}>{HF_FEATURE_EP.g}</HF_Mute>
        <HF_Body size={13} color="var(--gp-fg-muted)" style={{ marginTop: 4, textWrap: 'pretty' }}>
          {HF_FEATURE_EP.blurb}
        </HF_Body>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 'auto', paddingTop: 8 }}>
          <button aria-label="Play episode" style={{
            appearance: 'none', border: 0, flex: 'none',
            width: 40, height: 40, borderRadius: '50%',
            background: 'var(--gp-primary)', color: 'var(--gp-primary-fg)',
            fontSize: 13, cursor: 'pointer',
            boxShadow: 'var(--gp-shadow-pill)',
          }}>▶</button>
          <div style={{ flex: 1, height: 4, background: 'var(--gp-green-600)', borderRadius: 2, position: 'relative', minWidth: 0 }}>
            <div style={{ position: 'absolute', inset: 0, width: '18%', background: 'var(--gp-primary)', borderRadius: 2 }} />
          </div>
          <HF_Caption style={{ fontFamily: 'var(--gp-font-mono)', flex: 'none', whiteSpace: 'nowrap' }}>
            10:42 / {HF_FEATURE_EP.dur}
          </HF_Caption>
        </div>
      </div>
    </div>
  </HmBentoTile>
);

/* ----- Dev Guild tile ----- */
const HmLibDev = () => (
  <HmBentoTile className="hm-lib-dev">
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
      <HF_Overline>Guild · Active</HF_Overline>
      <HF_Caption style={{ fontFamily: 'var(--gp-font-mono)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        18 builders
      </HF_Caption>
    </div>
    <HF_H3 size={22} style={{ letterSpacing: '-0.01em' }}>Dev Guild</HF_H3>
    <HF_Body size={13} color="var(--gp-fg-muted)" style={{ textWrap: 'pretty' }}>
      Open-source coordination tools for the regenerative network.
    </HF_Body>
    <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {[
          'linear-gradient(135deg, #2A6B52, #1A4D3A)',
          'linear-gradient(135deg, #F0DCA0, #B8954D)',
          'linear-gradient(135deg, #B8E835, #6BAA1E)',
          'linear-gradient(135deg, #1A4D3A, #0F3D2E)',
          'linear-gradient(135deg, #FAE8C2, #C8A86E)',
        ].map((bg, i) => (
          <div key={i} style={{
            width: 26, height: 26, borderRadius: '50%',
            border: '1.5px solid var(--gp-green-700)',
            background: bg,
            marginLeft: i === 0 ? 0 : -8,
            flex: 'none',
          }} />
        ))}
      </div>
      <HF_ArrowLink size={13}>Visit</HF_ArrowLink>
    </div>
  </HmBentoTile>
);

/* ----- GreenSci tile (narrower) ----- */
const HmLibGreenSci = () => (
  <HmBentoTile className="hm-lib-greensci">
    <HF_Overline>Guild · DeSci</HF_Overline>
    <HF_H3 size={22} style={{ letterSpacing: '-0.01em' }}>GreenSci</HF_H3>
    <HF_Body size={13} color="var(--gp-fg-muted)" style={{ textWrap: 'pretty' }}>
      Open regenerative science — protocols, datasets, peer review.
    </HF_Body>
    <div style={{ marginTop: 'auto' }}>
      <HF_ArrowLink size={13}>Visit guild</HF_ArrowLink>
    </div>
  </HmBentoTile>
);

/* ----- Regen Toolkit tile ----- */
const HmLibToolkit = () => (
  <HmBentoTile className="hm-lib-toolkit">
    <HF_Overline>Regen toolkit</HF_Overline>
    <HF_H3 size="clamp(22px, 2vw, 28px)" style={{ letterSpacing: '-0.01em' }}>
      Field-tested guides for local action.
    </HF_H3>
    <HF_Body size={14} color="var(--gp-fg-muted)" style={{ textWrap: 'pretty' }}>
      Local Regen Playbook · Chapter Starter Kit · Steward Handbook.
    </HF_Body>
    <div style={{ marginTop: 'auto' }}>
      <HF_ArrowLink>Open toolkit</HF_ArrowLink>
    </div>
  </HmBentoTile>
);

/* ----- Knowledge Map (coming soon) tile ----- */
const HmLibMap = () => (
  <HmBentoTile className="hm-lib-map" soon>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
      <HF_Overline color="var(--gp-gold-500)">Knowledge Map</HF_Overline>
      <HmStatusPill tone="soon">Coming soon</HmStatusPill>
    </div>
    <HF_H3 size="clamp(22px, 2vw, 28px)" style={{ letterSpacing: '-0.01em', color: 'var(--gp-secondary)' }}>
      A living atlas of regenerative practice.
    </HF_H3>
    <HF_Body size={14} color="var(--gp-fg-muted)" style={{ textWrap: 'pretty' }}>
      Cross-link every book, episode, and field guide into one navigable terrain.
    </HF_Body>
    <div style={{ marginTop: 'auto' }}>
      <HF_Mute size={13}>In design</HF_Mute>
    </div>
  </HmBentoTile>
);

const HmLibrarySection = () => (
  <section className="hm-section">
    <div className="hm-section-head">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 720 }}>
        <HF_Overline>Library · Knowledge commons</HF_Overline>
        <HF_H2 size="clamp(28px, 3.2vw, 44px)">The Greenpill commons.</HF_H2>
      </div>
      <HF_ArrowLink>Browse the library</HF_ArrowLink>
    </div>

    <div className="hm-lib-grid">
      <HmLibBooks />
      <HmLibPodcast />
      <HmLibDev />
      <HmLibGreenSci />
      <HmLibToolkit />
      <HmLibMap />
    </div>
  </section>
);

/* =====================================================================
   ECOSYSTEM — centered intro + 4-col grid of org tiles, hover state.
   ===================================================================== */

const HM_ECOSYSTEM = [
  { name: 'Gitcoin',            blurb: 'Public goods funding' },
  { name: 'Octant',             blurb: 'Epoch-based public goods' },
  { name: 'Allo Capital',       blurb: 'Capital allocation protocol' },
  { name: 'How To DAO',         blurb: 'DAO operating handbook' },
  { name: 'Ethereum Localism',  blurb: 'Local-first crypto' },
  { name: 'Regen Coordination', blurb: 'Regen network coordination' },
  { name: 'Vrbs',               blurb: 'Onchain civic art' },
  { name: 'JournoDAO',          blurb: 'Independent regen media' },
];

const HmEcosystemTile = ({ org }) => (
  <a href="#" className="hm-eco-tile">
    <span className="hm-eco-mark" aria-hidden="true" />
    <span className="hm-eco-name">{org.name}</span>
    <span className="hm-eco-blurb">{org.blurb}</span>
  </a>
);

const HmEcosystemSection = () => (
  <section className="hm-section hm-section-center">
    <div className="hm-eco-intro">
      <HF_Overline>Ecosystem · Communities in the regen ecosystem</HF_Overline>
      <HF_H2 size="clamp(28px, 3.2vw, 44px)" style={{ textAlign: 'center' }}>
        Stronger together.
      </HF_H2>
      <HF_Body
        size={16}
        color="var(--gp-fg-muted)"
        style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto', textWrap: 'pretty' }}
      >
        Greenpill sits inside a wider regenerative web3 ecosystem — funders, builders, storytellers, scientists. A few of the communities we coordinate with.
      </HF_Body>
    </div>

    <div className="hm-eco-grid">
      {HM_ECOSYSTEM.map(o => (
        <HmEcosystemTile key={o.name} org={o} />
      ))}
    </div>

    <div style={{ display: 'flex', justifyContent: 'center', marginTop: 'clamp(24px, 3vw, 36px)' }}>
      <HF_ArrowLink>See all collaborators</HF_ArrowLink>
    </div>
  </section>
);

/* =====================================================================
   GARDEN RAMP — 4 numbered steps. Stay in loop / Telegram / Assessment / Steward call
   ===================================================================== */

const HmGardenStep = ({ step }) => {
  return (
    <article className="hm-garden-card">
      <div className="hm-garden-head">
        <span className="hm-garden-num">{String(step.n).padStart(2, '0')}</span>
        {step.friction && (
          <HF_Caption style={{
            fontFamily: 'var(--gp-font-mono)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--gp-fg-dim)',
          }}>
            {step.friction}
          </HF_Caption>
        )}
      </div>
      <HF_H3 size={22} style={{ letterSpacing: '-0.01em', textWrap: 'pretty' }}>
        {step.t}
      </HF_H3>
      <HF_Body size={13} color="var(--gp-fg-muted)" style={{ textWrap: 'pretty' }}>
        {step.d}
      </HF_Body>
      <div className="hm-garden-action">
        {step.kind === 'email' ? (
          <form className="hm-garden-email" onSubmit={(e) => e.preventDefault()}>
            <input
              type="email"
              placeholder="your@email"
              aria-label="Email address"
              className="hm-garden-input"
            />
            <button type="submit" className="hm-garden-btn">Subscribe</button>
          </form>
        ) : step.kind === 'external' ? (
          <HF_ArrowLink size={14}>{step.cta}</HF_ArrowLink>
        ) : step.kind === 'flow' ? (
          <button className="hm-garden-btn hm-garden-btn-wide">{step.cta} →</button>
        ) : (
          <HF_ArrowLink size={14}>{step.cta}</HF_ArrowLink>
        )}
      </div>
    </article>
  );
};

const HmGardenSection = () => (
  <section className="hm-section">
    <div className="hm-section-head">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 720 }}>
        <HF_Overline>Participate · Enter the garden</HF_Overline>
        <HF_H2 size="clamp(28px, 3.2vw, 44px)">Meet the network where you are.</HF_H2>
      </div>
      <HF_ArrowLink>Open the garden</HF_ArrowLink>
    </div>

    <div className="hm-garden-grid">
      {HM_GARDEN_STEPS.map(s => (
        <HmGardenStep key={s.n} step={s} />
      ))}
    </div>
  </section>
);

Object.assign(window, {
  HmHero,
  HmStoriesSection,
  HmLibrarySection,
  HmEcosystemSection,
  HmGardenSection,
});
