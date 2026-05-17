/* hifi/comp-blocks.jsx — spec cards for higher-order blocks.
   Sections: cards, rows, sections (blocks), hero variants, article, garden.

   Note: this file imports component references from the page-specific
   bits files. The Components HTML loads all of them, so calling
   ChFeaturedCard / SdProse / GD_GrowthGlyph here is safe. */

/* ───── Sample data — kept local so cards render without depending on
   the per-page data files being loaded. We pluck a few entries when the
   data files ARE present (they are, in the components page), and fall
   back to inline samples if not. ───── */

const _sampleChapter = () => (typeof CH_FEATURED !== 'undefined' && CH_FEATURED[0]) || {
  slug: 'nigeria', name: 'Greenpill Nigeria',
  region: 'AFRICA', status: 'ACTIVE', city: 'Lagos',
  photo: 'lagos · onboarding salon',
  story: 'Onboarded 240+ founders into web3 via salons across Lagos and Abuja.',
  blurb: 'Africa\u2019s largest active node. Monthly salons, twice-yearly grants.',
  steward: { name: 'Femi A.', role: 'Steward · Lagos' },
};
const _sampleCompactChapter = () => (typeof CH_COMPACT !== 'undefined' && CH_COMPACT[0]) || {
  slug: 'berlin', name: 'Greenpill Berlin',
  region: 'EUROPE', status: 'ACTIVE', city: 'Berlin',
  s: 'Salon series + a working group on regenerative urban infrastructure.',
};

const _sampleStory = () => (typeof ST_STORIES !== 'undefined' && ST_STORIES[0]) || {
  chapter: 'BRASIL', tag: 'ENVIRONMENTAL', date: 'MAR 2026',
  title: 'A reforestation grant cycle, told in five voices.',
  dek: 'The Brasil chapter put 18k USD into ten community-led reforestation projects across S\u00e3o Paulo.',
  author: 'Camila R.', read: '6 min', photo: 'reforestation drive'
};

/* =====================================================================
   CARDS — anything that's a self-contained card unit.
   ===================================================================== */
const Comp_Cards = () => (
  <CompSection id="cards" label="Cards">
    <SpecCard
      fullWidth
      name="ChFeaturedCard"
      file="hifi/ch-bits.jsx"
      description="Top-tier chapter card with hero photo, story pull-quote, blurb, and steward avatar row. Used in the Chapters index featured rail."
      props={[
        { name: 'c',       type: 'Chapter', default: '—', notes: 'Chapter data object.' },
        { name: 'density', type: "'compact' | 'comfortable' | 'editorial'", default: "'comfortable'", notes: 'Compact hides the story pull-quote.' },
        { name: 'bp',      type: 'breakpoint', default: '—', notes: '' },
      ]}
    >
      <div style={{ maxWidth: 420 }}>
        {typeof ChFeaturedCard === 'function' && (
          <ChFeaturedCard c={_sampleChapter()} density="comfortable" bp="desktop" />
        )}
      </div>
    </SpecCard>

    <SpecCard
      name="ChCompactCard"
      file="hifi/ch-bits.jsx"
      description="Directory tile for chapter index. Photo optional (editorial density only)."
      props={[
        { name: 'c',       type: 'Chapter',          default: '—', notes: '' },
        { name: 'density', type: 'string',           default: "'comfortable'", notes: 'editorial = with photo.' },
      ]}
    >
      <div style={{ maxWidth: 360 }}>
        {typeof ChCompactCard === 'function' && (
          <ChCompactCard c={_sampleCompactChapter()} density="comfortable" bp="desktop" />
        )}
      </div>
    </SpecCard>

    <SpecCard
      name="CdRelatedCard"
      file="hifi/cd-bits.jsx"
      description="Smaller related-chapter card. Used in the bottom-of-page recommendations strip on Chapter Detail."
      props={[
        { name: 'slug', type: 'string', default: '—', notes: 'Looks up CH_FEATURED + CH_COMPACT by slug.' },
      ]}
    >
      <div style={{ maxWidth: 280 }}>
        {typeof CdRelatedCard === 'function' && typeof CH_FEATURED !== 'undefined' && CH_FEATURED[1] && (
          <CdRelatedCard slug={CH_FEATURED[1].slug} />
        )}
      </div>
    </SpecCard>

    <SpecCard
      name="CdStoryCard"
      file="hifi/cd-bits.jsx"
      description="Story card layout — photo on top, meta + display title + dek below. Used in Chapter Detail's stories section."
    >
      <div style={{ maxWidth: 320 }}>
        {typeof CdStoryCard === 'function' && (
          <CdStoryCard s={{
            photo: 'reforestation drive', tag: 'ENVIRONMENTAL', date: 'MAR 2026',
            title: 'How Brasil ran a five-city reforestation cycle.',
            blurb: 'A look at how the chapter coordinated tree-planting across S\u00e3o Paulo, Salvador, and three smaller cities.',
            metric: '$18,000 GRANTED',
          }} bp="desktop" />
        )}
      </div>
    </SpecCard>

    <SpecCard
      fullWidth
      name="GldProjectCard"
      file="hifi/gld-bits.jsx"
      description="Guild project card. Two states: ACTIVE (solid surface, clickable) and UPCOMING (dashed border, dimmed)."
      props={[
        { name: 'p', type: 'Project', default: '—', notes: '{ short, t, d, tech, lead, status }' },
      ]}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {typeof GldProjectCard === 'function' && (
          <>
            <GldProjectCard p={{
              short: 'AT', t: 'Attestation toolkit',
              d: 'Open libraries for attestations across EAS + Verax. Used by 40+ public-goods projects.',
              tech: ['typescript', 'eas', 'verax'],
              lead: 'Sarah K.', status: 'ACTIVE',
            }} bp="desktop" />
            <GldProjectCard p={{
              short: 'GR', t: 'Greenpill registry',
              d: 'A federated registry for regenerative project verification. Co-designed with Allo Capital.',
              tech: ['next', 'allo', 'graphql'],
              lead: null, status: 'UPCOMING',
            }} bp="desktop" />
          </>
        )}
      </div>
    </SpecCard>

    <SpecCard
      fullWidth
      name="GldPrincipleCard"
      file="hifi/gld-bits.jsx"
      description="Numbered principle card. Used in the guild How-We-Work section. Big serif numeral + rule line + display title + body."
      props={[
        { name: 'p', type: '{ n, t, d }', default: '—', notes: '' },
      ]}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {typeof GldPrincipleCard === 'function' && (
          <>
            <GldPrincipleCard p={{ n: '01', t: 'Build in the open.', d: 'Every project is public from day one. Issues, design docs, and decisions live in the repo, not in a private Notion.' }} bp="desktop" />
            <GldPrincipleCard p={{ n: '02', t: 'Ship before polish.', d: 'A rough working tool in chapter hands beats a perfect prototype we never deploy. The network reviews live.' }} bp="desktop" />
          </>
        )}
      </div>
    </SpecCard>

    <SpecCard
      name="SdContinueCard"
      file="hifi/sd-bits.jsx"
      description="Continue-reading card shown at the bottom of an article. Same parts as a story card but used in a 3-up row at the article footer."
    >
      <div style={{ maxWidth: 280 }}>
        {typeof SdContinueCard === 'function' && (
          <SdContinueCard item={{
            photo: 'cape town · city hall', chapter: 'CAPE TOWN', tag: 'DOCUMENTARY',
            title: 'Anchor tenants for a regenerative city block.',
            dek: 'A council-led pilot brings four regenerative tenants into a single block.',
            author: 'Sarah K.', date: 'Feb 2026', read: '8 min',
          }} bp="desktop" />
        )}
      </div>
    </SpecCard>

    <SpecCard
      name="HmEcosystemTile"
      file="hifi/home-sections.jsx"
      description="The ecosystem-partner tile from Home. Lime dot + display name + body blurb on green-700, with a soft hover glow on the dot."
    >
      <div style={{ maxWidth: 280 }}>
        {typeof HmEcosystemTile === 'function' && (
          <HmEcosystemTile org={{ name: 'Gitcoin', blurb: 'Public goods funding' }} />
        )}
      </div>
    </SpecCard>
  </CompSection>
);

/* =====================================================================
   ROWS — list rows, library rows, event cards, steward rows.
   ===================================================================== */
const Comp_Rows = () => (
  <CompSection id="rows" label="List rows" cols={1}>
    <SpecCard
      fullWidth
      name="StFeedRow"
      file="hifi/st-bits.jsx"
      description="The Stories feed row: thumbnail left, meta + display title + dek + byline right. Two densities (compact / comfortable)."
      props={[
        { name: 'item',    type: 'Story',                            default: '—',              notes: '' },
        { name: 'density', type: "'compact' | 'comfortable'",        default: "'comfortable'",  notes: '' },
        { name: 'last',    type: 'boolean',                          default: 'false',          notes: 'Hides the bottom divider.' },
      ]}
    >
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {typeof StFeedRow === 'function' && typeof ST_STORIES !== 'undefined' && (
          <>
            <StFeedRow item={ST_STORIES[0]} bp="desktop" />
            <StFeedRow item={ST_STORIES[1] || ST_STORIES[0]} bp="desktop" />
            <StFeedRow item={ST_STORIES[2] || ST_STORIES[0]} bp="desktop" last />
          </>
        )}
      </div>
    </SpecCard>

    <SpecCard
      fullWidth
      name="StSubFeatureCard"
      file="hifi/st-bits.jsx"
      description="Sub-feature card — used in pairs beside the cinematic hero on Stories index. Switches to a horizontal layout when vertical=false."
      props={[
        { name: 'item',     type: 'Story', default: '—', notes: '' },
        { name: 'vertical', type: 'boolean',default: 'true', notes: '' },
      ]}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {typeof StSubFeatureCard === 'function' && typeof ST_STORIES !== 'undefined' && (
          <>
            <StSubFeatureCard item={ST_STORIES[1] || ST_STORIES[0]} bp="desktop" />
            <StSubFeatureCard item={ST_STORIES[2] || ST_STORIES[0]} bp="desktop" />
          </>
        )}
      </div>
    </SpecCard>

    <SpecCard
      fullWidth
      name="CdStoryRow"
      file="hifi/cd-bits.jsx"
      description="Row-style story (Chapter Detail variant). Horizontal — photo left, content right — with a single mono metric line at the bottom."
    >
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {typeof CdStoryRow === 'function' && (
          <>
            <CdStoryRow s={{
              photo: 'lagos · onboarding salon', tag: 'ONBOARDING', date: 'MAR 2026',
              title: 'A web3 onboarding flow that doesn\u2019t feel like one.',
              blurb: 'How the Lagos chapter brought 240 founders into web3 over four months — without a single token presale.',
              metric: '240 FOUNDERS · 4 MO',
            }} bp="desktop" last />
          </>
        )}
      </div>
    </SpecCard>

    <SpecCard
      fullWidth
      name="CdEventCard"
      file="hifi/cd-bits.jsx"
      description="Event card with a left-side date stack (month / day / year) and a body containing kind chip, time, title, location, RSVP count."
      props={[
        { name: 'e', type: 'Event', default: '—', notes: '{ when, time, kind, title, where, rsvp, cap }' },
      ]}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {typeof CdEventCard === 'function' && (
          <>
            <CdEventCard e={{
              when: 'MAR 18 2026', time: '18:30',
              kind: 'IRL', title: 'Regen finance salon · Lagos',
              where: 'Yaba, Lagos · 25 seats',
              rsvp: 14, cap: 25,
            }} bp="desktop" />
            <CdEventCard e={{
              when: 'APR 02 2026', time: '15:00 UTC',
              kind: 'ONLINE', title: 'Co-stewards monthly · Open call',
              where: 'Discord · Hub server',
              rsvp: 42,
            }} bp="desktop" />
          </>
        )}
      </div>
    </SpecCard>

    <SpecCard
      fullWidth
      name="CdLibraryRow"
      file="hifi/cd-bits.jsx"
      description="Small library item row — 3-item list on Chapter Detail. Square kind-badge + display title + author/year + tag."
    >
      <div style={{ display: 'flex', flexDirection: 'column', padding: '0 4px' }}>
        {typeof CdLibraryRow === 'function' && (
          <>
            <CdLibraryRow b={{ kind: 'BK', t: 'Greenpilled (2nd ed)', a: 'Kevin Owocki', y: 2024, tag: 'CORE' }} />
            <CdLibraryRow b={{ kind: 'PC', t: 'The localism dilemma',  a: 'Greenpill podcast', y: 2025, tag: 'EP 218' }} />
            <CdLibraryRow b={{ kind: 'PB', t: 'Chapter playbook v3',   a: 'Stewards guild', y: 2026, tag: 'PB' }} last />
          </>
        )}
      </div>
    </SpecCard>

    <SpecCard
      fullWidth
      name="CdStewardPortraitRow / CdStewardCell / CdStewardScrollItem"
      file="hifi/cd-bits.jsx"
      description="Three layouts for the same steward data. PortraitRow = horizontal list item (Chapter Detail default). Cell = card grid cell. ScrollItem = narrow vertical for a side-scrolling rail."
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div>
          <GP_Overline size={10} style={{ marginBottom: 12 }}>Portrait row</GP_Overline>
          {typeof CdStewardPortraitRow === 'function' && (
            <CdStewardPortraitRow s={{
              name: 'Femi A.', role: 'Steward · Lagos',
              bio: 'Onboards founders, runs the salon series, sits on the grant council.',
              location: 'Lagos, Nigeria',
            }} bp="desktop" />
          )}
        </div>
        <div>
          <GP_Overline size={10} style={{ marginBottom: 12 }}>Cell + scroll item</GP_Overline>
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            {typeof CdStewardCell === 'function' && (
              <div style={{ width: 240 }}>
                <CdStewardCell s={{
                  name: 'Nasrin H.', role: 'Co-steward · Abuja',
                  bio: 'Runs the writers circle and the monthly all-hands.',
                  location: 'Abuja',
                }} bp="desktop" />
              </div>
            )}
            {typeof CdStewardScrollItem === 'function' && (
              <CdStewardScrollItem s={{ name: 'Diego T.', role: 'Steward · Brasil' }} />
            )}
            {typeof CdStewardScrollItem === 'function' && (
              <CdStewardScrollItem s={{ name: 'Sarah K.', role: 'Steward · Cape Town' }} />
            )}
          </div>
        </div>
      </div>
    </SpecCard>

    <SpecCard
      name="GldMemberCell"
      file="hifi/gld-bits.jsx"
      description="Guild member grid cell. Avatar + name + role + chapter. Used in the Members grid."
    >
      <div style={{ maxWidth: 200 }}>
        {typeof GldMemberCell === 'function' && (
          <GldMemberCell m={{ name: 'Sarah K.', role: 'Lead engineer', chapter: 'Cape Town' }} bp="desktop" />
        )}
      </div>
    </SpecCard>
  </CompSection>
);

/* =====================================================================
   SECTION BLOCKS
   ===================================================================== */
const Comp_Sections = () => (
  <CompSection id="sections" label="Section blocks" cols={1}>
    <SpecCard
      fullWidth
      name="GP_SectionHeader"
      file="hifi/gp-shell.jsx"
      description="The canonical section header — overline + title + optional side slot. Used at the top of every major section across the site."
      props={[
        { name: 'overline',  type: 'string',  default: '—', notes: '' },
        { name: 'title',     type: 'string',  default: '—', notes: '' },
        { name: 'titleSize', type: 'number|string', default: 'clamp(28–44px)', notes: '' },
        { name: 'side',      type: 'ReactNode',     default: '—', notes: 'Right-aligned slot — typically a GP_ArrowLink or GP_RailArrows.' },
        { name: 'bp',        type: 'breakpoint',    default: '—', notes: '' },
      ]}
    >
      <GP_SectionHeader
        overline="Stories · Field reports"
        title="What chapters are working on."
        bp="desktop"
        side={<GP_ArrowLink>View all 42 stories</GP_ArrowLink>}
      />
    </SpecCard>

    <SpecCard
      fullWidth
      name="GP_CtaStrip"
      file="hifi/gp-shell.jsx"
      description="The unified bottom-of-section CTA. Replaces ChStartStrip, StSubmitStrip, and inline CTA implementations. Two tones."
      props={[
        { name: 'tone',     type: "'lift' | 'soft'", default: "'lift'", notes: 'lift = green-800 card with corner glow. soft = transparent with top hairline.' },
        { name: 'overline', type: 'string',          default: '—', notes: '' },
        { name: 'title',    type: 'string',          default: '—', notes: '' },
        { name: 'body',     type: 'string',          default: '—', notes: '' },
        { name: 'children', type: 'ReactNode',       default: '—', notes: 'Right-side CTA buttons.' },
      ]}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <GP_CtaStrip
          bp="desktop"
          tone="lift"
          overline="Start a chapter"
          title="Don't see your city?"
          body="We'll help you set up a local node, find co-stewards, and connect you to the wider network."
        >
          <GP_PrimaryButton>Start a chapter →</GP_PrimaryButton>
          <GP_GhostButton>Read the playbook</GP_GhostButton>
        </GP_CtaStrip>
        <GP_CtaStrip
          bp="desktop"
          tone="soft"
          overline="From a chapter"
          title="Have a story to share?"
          body="The Writers Guild reviews and lightly edits chapter submissions. We pay an honorarium for accepted longreads."
        >
          <GP_GhostButton>Editorial guide</GP_GhostButton>
          <GP_PrimaryButton>Submit a story →</GP_PrimaryButton>
        </GP_CtaStrip>
      </div>
    </SpecCard>

    <SpecCard
      fullWidth
      name="StTopicSpotlight"
      file="hifi/st-bits.jsx"
      description="Two-column spotlight block: overline + display title + body + stat row on the left, numbered essential-reads list on the right. Used on the Stories index."
    >
      {typeof StTopicSpotlight === 'function' ? <StTopicSpotlight bp="desktop" /> : null}
    </SpecCard>

    <SpecCard
      fullWidth
      name="StTranslationsStrip"
      file="hifi/st-bits.jsx"
      description="Recent translations row — title + soft-gold language chips. Hairline top + bottom."
    >
      {typeof StTranslationsStrip === 'function' ? <StTranslationsStrip bp="desktop" /> : null}
    </SpecCard>

    <SpecCard
      fullWidth
      name="StNewsletter"
      file="hifi/st-bits.jsx"
      description="The 'Field notes, monthly' newsletter block. Two columns: copy left, email pill + last-issue links right. Reused on Story Detail."
    >
      {typeof StNewsletter === 'function' ? <StNewsletter bp="desktop" /> : null}
    </SpecCard>
  </CompSection>
);

/* =====================================================================
   HERO VARIANTS — Library + Story + Guild
   ===================================================================== */
const Comp_Heroes = () => (
  <CompSection id="hero" label="Hero variants" cols={1}
    lead="Hero treatments for the four major page archetypes. Library exposes all four through the heroOverride tweak; the other pages each pick one canonical hero.">
    <SpecCard
      fullWidth
      name="HFHeroEditorial / Featured / Iconic / Mono"
      file="hifi/lib-sections.jsx"
      description="The four Library hero treatments. Direction C uses Iconic by default; the heroOverride tweak swaps in any of the others."
      props={[
        { name: 'editorial', type: 'variant', default: '—', notes: 'Spacious display headline + reading stats row. Used by Library direction A.' },
        { name: 'featured',  type: 'variant', default: '—', notes: 'Hero + featured-book pull. Used by direction B.' },
        { name: 'iconic',    type: 'variant', default: '—', notes: 'Hero with the 3D pill capsule. Default for direction C (production).' },
        { name: 'mono',      type: 'variant', default: '—', notes: 'Type-led editorial monograph. Used by direction D.' },
      ]}
      notes={[
        'Use the Library page Tweaks panel to preview each variant at native scale.',
        'For a single-page preview here, only the title pattern + structural notes are shown — these heroes need their full 1440px frame to read correctly.',
      ]}
    >
      <div className="comp-hero-grid">
        {[
          { key: 'editorial', label: 'Editorial', body: 'Spacious. Display headline + reading stats. Direction A.' },
          { key: 'featured',  label: 'Featured',  body: 'Hero + featured book hand-pull. Direction B.' },
          { key: 'iconic',    label: 'Iconic',    body: 'Hero w/ 3D pill capsule. Direction C — production.' },
          { key: 'mono',      label: 'Mono',      body: 'Typographic editorial monograph. Direction D.' },
        ].map(v => (
          <div key={v.key} className="comp-hero-thumb">
            <div className="comp-hero-thumb-label">
              <code>{v.key}</code>
              <span>{v.label}</span>
            </div>
            <div className="comp-hero-thumb-body">{v.body}</div>
          </div>
        ))}
      </div>
    </SpecCard>
  </CompSection>
);

/* =====================================================================
   ARTICLE COMPONENTS — Story Detail's reading column
   ===================================================================== */
const Comp_Article = () => (
  <CompSection id="article" label="Article components" cols={1}>
    <SpecCard
      fullWidth
      name="SdStatStrip"
      file="hifi/sd-bits.jsx"
      description="At-a-glance stat row under the article byline. Lime display numerals + mono labels, separated by hairlines."
    >
      {typeof SdStatStrip === 'function' ? <SdStatStrip bp="desktop" /> : null}
    </SpecCard>

    <SpecCard
      fullWidth
      name="SdByline"
      file="hifi/sd-bits.jsx"
      description="Avatar + author / role + divider + date / read time. Used at the top of an article."
    >
      {typeof SdByline === 'function' ? <SdByline bp="desktop" /> : null}
    </SpecCard>

    <SpecCard
      fullWidth
      name="SdPullQuote"
      file="hifi/sd-bits.jsx"
      description="Three pull-quote variants. Border (default) is left-rule. Centered has dashed rules above + below. Marks shows a giant gold quotation glyph."
      props={[
        { name: 'text',    type: 'string',                                         default: '—',          notes: '' },
        { name: 'variant', type: "'border' | 'centered' | 'marks'",                default: "'border'",   notes: '' },
      ]}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
        {typeof SdPullQuote === 'function' && (
          <>
            <SdPullQuote variant="border"   text={'We didn\u2019t pitch crypto. We pitched a co-op that could send payments to itself.'} bp="desktop" />
            <SdPullQuote variant="centered" text={'A chapter is a place where money flows in two directions, not one.'} bp="desktop" />
            <SdPullQuote variant="marks"    text={'The day the cooperative voted to take its first grant in stablecoins, nothing visible changed.'} bp="desktop" />
          </>
        )}
      </div>
    </SpecCard>

    <SpecCard
      fullWidth
      name="SdAuthorBio"
      file="hifi/sd-bits.jsx"
      description="Author bio block — full-width, with 'Written by' overline, large display name, mono role tag, paragraph, and a ghost-button CTA to more articles."
    >
      {typeof SdAuthorBio === 'function' ? <SdAuthorBio bp="desktop" /> : null}
    </SpecCard>

    <SpecCard
      fullWidth
      name="SdTranslationsRow"
      file="hifi/sd-bits.jsx"
      description="Translations strip: 'Available in' label + language chips + 'translated by' attribution. Hairlines top and bottom."
    >
      {typeof SdTranslationsRow === 'function' ? <SdTranslationsRow bp="desktop" /> : null}
    </SpecCard>

    <SpecCard
      fullWidth
      name="SdArticleFooter"
      file="hifi/sd-bits.jsx"
      description="Bottom-of-article share row: 'Share' label + share pills + a chapter back-link."
    >
      {typeof SdArticleFooter === 'function' ? <SdArticleFooter bp="desktop" /> : null}
    </SpecCard>

    <SpecCard
      fullWidth
      name="SdReadingProgress"
      file="hifi/sd-bits.jsx"
      description="Fixed-position scroll progress bar. 3px tall, lime fill with glow, sits at the top of the viewport."
      notes={['Renders at App root (outside any scaled frame) so position:fixed anchors to the viewport.']}
    >
      <div style={{ position: 'relative', height: 8, background: 'rgba(184,232,53,0.10)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ width: '63%', height: '100%', background: 'var(--gp-primary)', boxShadow: '0 0 12px rgba(184,232,53,0.55)' }} />
      </div>
    </SpecCard>
  </CompSection>
);

/* =====================================================================
   GARDEN SPECIALS — the page-specific iconography for Garden.
   ===================================================================== */
const Comp_Garden = () => (
  <CompSection id="garden" label="Garden specials">
    <SpecCard
      fullWidth
      name="GD_GrowthGlyph"
      file="hifi/gd-bits.jsx"
      description="Page-specific growth-stage icon. The Garden ramp's central metaphor: each step blooms one stage further — seed, sapling, budding, flowering."
      props={[
        { name: 'stage',    type: "'seed' | 'sapling' | 'budding' | 'flowering'", default: '—',                 notes: '' },
        { name: 'size',     type: 'number',                                       default: '56',                notes: 'Disc diameter.' },
        { name: 'withDisc', type: 'boolean',                                      default: 'true',              notes: 'When false, just the plant — no soil disc.' },
        { name: 'glow',     type: 'boolean',                                      default: 'true',              notes: 'Soft chartreuse glow ring.' },
        { name: 'soilTone', type: 'CSS color',                                    default: 'var(--gp-green-800)', notes: '' },
      ]}
    >
      <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        {['seed', 'sapling', 'budding', 'flowering'].map(stage => (
          <div key={stage} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            {typeof GD_GrowthGlyph === 'function' && <GD_GrowthGlyph stage={stage} size={80} />}
            <code style={{ fontFamily: 'var(--gp-font-mono)', fontSize: 11, color: 'var(--gp-fg-dim)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{stage}</code>
          </div>
        ))}
      </div>
    </SpecCard>

    <SpecCard
      name="GD_FrictionBar"
      file="hifi/gd-bits.jsx"
      description="Friction / commitment indicator — refined from the wireframe glyph. Filled bars are chartreuse with a soft glow; unfilled are border-soft."
      props={[
        { name: 'level', type: 'number', default: '1', notes: 'How many bars are filled.' },
        { name: 'count', type: 'number', default: '4', notes: 'Total bars.' },
      ]}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {[1, 2, 3, 4].map(level => (
          <div key={level} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {typeof GD_FrictionBar === 'function' && <GD_FrictionBar level={level} count={4} />}
            <code style={{ fontFamily: 'var(--gp-font-mono)', fontSize: 11, color: 'var(--gp-fg-dim)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Step {level} · level={level}</code>
          </div>
        ))}
      </div>
    </SpecCard>

    <SpecCard
      name="GD_StepNumber"
      file="hifi/gd-bits.jsx"
      description="Big serif step numeral with a smaller '/ NN' counter. Used at the top-left of each Garden step card."
      props={[
        { name: 'n',    type: 'number', default: '—',  notes: 'Current step.' },
        { name: 'of',   type: 'number', default: '4',  notes: 'Total steps.' },
        { name: 'size', type: 'number', default: '80', notes: 'Font size.' },
      ]}
    >
      <div style={{ display: 'flex', gap: 28, alignItems: 'baseline', flexWrap: 'wrap' }}>
        {typeof GD_StepNumber === 'function' && (
          <>
            <GD_StepNumber n={1} of={4} size={56} />
            <GD_StepNumber n={2} of={4} size={56} />
            <GD_StepNumber n={3} of={4} size={56} />
            <GD_StepNumber n={4} of={4} size={56} />
          </>
        )}
      </div>
    </SpecCard>

    <SpecCard
      fullWidth
      name="GldDiagram"
      file="hifi/gld-bits.jsx"
      description="Refined nodes-and-edges diagram: center Dev Guild pill, four output nodes connected by curved dashed gold hairlines, all over the topo wash. Used as the system-diagram hero variant."
      props={[
        { name: 'h',  type: 'number', default: '420', notes: 'Container height.' },
        { name: 'bp', type: 'breakpoint', default: '—', notes: '' },
      ]}
    >
      {typeof GldDiagram === 'function' ? <GldDiagram h={320} bp="desktop" /> : null}
    </SpecCard>
  </CompSection>
);

Object.assign(window, {
  Comp_Cards, Comp_Rows, Comp_Sections, Comp_Heroes, Comp_Article, Comp_Garden,
});
