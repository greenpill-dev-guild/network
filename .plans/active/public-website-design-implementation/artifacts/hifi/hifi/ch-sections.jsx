/* hifi/ch-sections.jsx — Chapter Index sections.
   - Hero (3 variants): typographic, imagery-led, map-led
   - Map block (3 treatments): mycelial (reuse HmMycelialMap), flat-pins, none
   - Filter bar
   - List section with optional region grouping + density modes + featured tier toggle
   - Start-a-chapter strip
*/

/* =====================================================================
   HERO
   ===================================================================== */

/* Variant 1: TYPOGRAPHIC — big serif statement, no imagery. */
const ChHeroTypographic = ({ bp }) => {
  return (
    <div style={{
      padding: bp === 'mobile' ? '40px 20px 24px' : `${bp === 'tablet' ? 64 : 88}px ${GP_useInset(bp)}px 32px`,
      display: 'flex', flexDirection: 'column',
      gap: bp === 'mobile' ? 18 : 28,
    }}>
      <GP_Overline>Chapters · {CH_COUNTS.total} nodes</GP_Overline>

      <h1 style={{
        margin: 0,
        fontFamily: 'var(--gp-font-display)',
        fontWeight: 500,
        fontVariationSettings: 'var(--gp-display-vs)',
        color: 'var(--gp-secondary)',
        letterSpacing: '-0.015em',
        lineHeight: 1.02,
        fontSize: bp === 'mobile' ? 'clamp(34px, 10vw, 44px)' : bp === 'tablet' ? 56 : 'clamp(56px, 6.6vw, 88px)',
        textWrap: 'pretty',
        maxWidth: 1100,
      }}>
        The local nodes of the<br />
        <em style={{ fontStyle: 'italic', color: 'var(--gp-primary)' }}>Greenpill</em>{' '}
        <span style={{ color: 'var(--gp-secondary)' }}>network.</span>
      </h1>

      <div style={{
        display: 'flex', alignItems: 'center', flexWrap: 'wrap',
        gap: bp === 'mobile' ? 14 : 24,
        marginTop: 4,
      }}>
        <GP_Body size={bp === 'mobile' ? 15 : 17} style={{ color: 'var(--gp-fg-muted)', maxWidth: 620 }}>
          Active and forming chapters across five regions — bioregional hubs running
          local activities, onchain.
        </GP_Body>
      </div>

      {/* stat ribbon */}
      <div style={{
        display: 'flex', flexWrap: 'wrap',
        gap: bp === 'mobile' ? 14 : 28,
        marginTop: bp === 'mobile' ? 4 : 12,
        paddingTop: bp === 'mobile' ? 16 : 24,
        borderTop: '1px solid var(--gp-border-soft)',
      }}>
        <ChStatPair big={CH_COUNTS.total}    sub="Chapters" />
        <ChStatPair big={CH_COUNTS.active}   sub="Active" accent />
        <ChStatPair big={CH_COUNTS.forming}  sub="Forming" />
        <ChStatPair big="5"                  sub="Regions" />
      </div>
    </div>
  );
};

/* Small stat — used in the typographic hero ribbon and elsewhere. */
const ChStatPair = ({ big, sub, accent }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
    <span style={{
      fontFamily: 'var(--gp-font-display)',
      fontWeight: 500,
      fontVariationSettings: 'var(--gp-display-vs)',
      fontSize: 'clamp(32px, 3vw, 44px)',
      lineHeight: 1,
      letterSpacing: '-0.015em',
      color: accent ? 'var(--gp-primary)' : 'var(--gp-secondary)',
    }}>{big}</span>
    <span style={{
      fontFamily: 'var(--gp-font-mono)',
      fontSize: 11,
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      color: 'var(--gp-fg-dim)',
    }}>{sub}</span>
  </div>
);

/* Variant 2: IMAGERY-LED — left text, right photo collage. */
const ChHeroImagery = ({ bp }) => {
  const stack = bp === 'mobile' || bp === 'tablet';
  return (
    <div style={{
      padding: bp === 'mobile' ? '40px 20px 24px' : `${bp === 'tablet' ? 64 : 88}px ${GP_useInset(bp)}px 32px`,
      display: 'grid',
      gridTemplateColumns: stack ? '1fr' : '1.05fr 1fr',
      gap: bp === 'mobile' ? 28 : 56,
      alignItems: 'center',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: bp === 'mobile' ? 18 : 24 }}>
        <GP_Overline>Chapters · {CH_COUNTS.total} nodes</GP_Overline>
        <h1 style={{
          margin: 0,
          fontFamily: 'var(--gp-font-display)',
          fontWeight: 500,
          fontVariationSettings: 'var(--gp-display-vs)',
          color: 'var(--gp-secondary)',
          letterSpacing: '-0.015em',
          lineHeight: 1.04,
          fontSize: bp === 'mobile' ? 'clamp(30px, 9vw, 40px)' : 'clamp(40px, 4.8vw, 64px)',
          textWrap: 'pretty',
        }}>
          The local nodes of the Greenpill network.
        </h1>
        <GP_Body size={bp === 'mobile' ? 14 : 16} style={{ color: 'var(--gp-fg-muted)', maxWidth: 520 }}>
          Active and forming chapters across five regions — bioregional hubs running
          local activities, onchain.
        </GP_Body>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, paddingTop: 8 }}>
          <ChStatPair big={CH_COUNTS.total}   sub="Chapters" />
          <ChStatPair big={CH_COUNTS.active}  sub="Active" accent />
          <ChStatPair big={CH_COUNTS.forming} sub="Forming" />
        </div>
      </div>

      {/* photo collage — three stagger */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(6, 1fr)',
        gridTemplateRows: 'repeat(6, 1fr)',
        aspectRatio: '5 / 4',
        width: '100%',
        gap: 12,
      }}>
        <div style={{ gridColumn: '1 / 5', gridRow: '1 / 5' }}>
          <GP_PlaceImg label="brasil · reforestation drive" h={null} style={{ height: '100%' }} />
        </div>
        <div style={{ gridColumn: '5 / 7', gridRow: '1 / 4' }}>
          <GP_PlaceImg label="kenya · sarafu market" h={null} style={{ height: '100%' }} />
        </div>
        <div style={{ gridColumn: '5 / 7', gridRow: '4 / 7' }}>
          <GP_PlaceImg label="cape town · city hall" h={null} style={{ height: '100%' }} />
        </div>
        <div style={{ gridColumn: '1 / 5', gridRow: '5 / 7' }}>
          <GP_PlaceImg label="lagos · onboarding salon" h={null} style={{ height: '100%' }} />
        </div>
      </div>
    </div>
  );
};

/* Variant 3: MAP-LED — small intro + huge embedded map. */
const ChHeroMapLed = ({ bp, mapTreatment }) => (
  <div style={{
    padding: bp === 'mobile' ? '32px 20px 24px' : `${bp === 'tablet' ? 56 : 72}px ${GP_useInset(bp)}px 32px`,
    display: 'flex', flexDirection: 'column',
    gap: bp === 'mobile' ? 20 : 32,
  }}>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 880 }}>
      <GP_Overline>Chapters · {CH_COUNTS.total} nodes</GP_Overline>
      <h1 style={{
        margin: 0,
        fontFamily: 'var(--gp-font-display)',
        fontWeight: 500,
        fontVariationSettings: 'var(--gp-display-vs)',
        color: 'var(--gp-secondary)',
        letterSpacing: '-0.015em',
        lineHeight: 1.04,
        fontSize: bp === 'mobile' ? 'clamp(30px, 9vw, 40px)' : 'clamp(40px, 4.6vw, 60px)',
        textWrap: 'pretty',
      }}>
        Where the network lives.
      </h1>
      <GP_Body size={bp === 'mobile' ? 14 : 16} style={{ color: 'var(--gp-fg-muted)' }}>
        Hover a pin to see the chapter — or scroll on to browse the full directory.
      </GP_Body>
    </div>

    <ChMapBlock bp={bp} treatment={mapTreatment} hero />
  </div>
);

/* =====================================================================
   MAP BLOCK — three treatments
   ===================================================================== */

const ChMapBlock = ({ bp, treatment, hero }) => {
  if (treatment === 'none') return null;
  if (treatment === 'mycelial') return <ChMapMycelial bp={bp} hero={hero} />;
  if (treatment === 'pins')     return <ChMapFlat     bp={bp} hero={hero} />;
  return null;
};

/* Treatment 1: MYCELIAL — reuses HmMycelialMap from the Home page. */
const ChMapMycelial = ({ bp, hero }) => (
  <div style={{
    position: 'relative',
    padding: hero ? 0 : (bp === 'mobile' ? '0 20px 32px' : `0 ${GP_useInset(bp)}px 40px`),
  }}>
    <HmMycelialMap chapters={CH_ALL_PINS} density="medium" motion="pulse" />
    <ChMapCaption bp={bp} />
  </div>
);

/* Treatment 2: FLAT PINS — minimal dotted world, status-coded pins, no threads. */
const ChMapFlat = ({ bp, hero }) => {
  // Reuse the dot grid + lon/lat helpers from home-map.jsx, but flat (no threads).
  // We mount HmMycelialMap with motion 'still' and overlay status-coded pins ourselves.
  return (
    <div style={{
      position: 'relative',
      padding: hero ? 0 : (bp === 'mobile' ? '0 20px 32px' : `0 ${GP_useInset(bp)}px 40px`),
    }}>
      <div style={{
        position: 'relative',
        width: '100%',
        aspectRatio: '2 / 1',
        borderRadius: 'var(--gp-radius-lg)',
        overflow: 'hidden',
        background: 'linear-gradient(180deg, rgba(20,63,48,0.7) 0%, rgba(15,61,46,0.4) 100%)',
        border: '1px solid var(--gp-border-soft)',
      }}>
        {/* topo wash */}
        <div aria-hidden="true" style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'url("hifi/assets/topo-bg.png")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.18,
          mixBlendMode: 'overlay',
          pointerEvents: 'none',
        }} />
        <ChFlatMapSvg pins={CH_ALL_PINS} />
      </div>
      <ChMapCaption bp={bp} flat />
    </div>
  );
};

/* The bare-pins SVG world for the FLAT treatment. */
const ChFlatMapSvg = ({ pins }) => {
  // Build dot grid once (relying on home-map having injected hmBuildWorldGrid + helpers).
  const dots = React.useMemo(() => {
    if (typeof hmLonToX !== 'function') return null;
    const HM_GRID_W = 60, HM_GRID_H = 24;
    const cellW = 200 / HM_GRID_W;
    const cellH = 100 / HM_GRID_H;
    // mirror the same world grid hmBuildWorldGrid() builds; but it's not exported,
    // so we read it from HmMycelialMap mount? Easier: import inline copy.
    return null;
  }, []);

  return (
    <svg viewBox="0 0 200 100" preserveAspectRatio="xMidYMid meet"
         style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
      {/* equator + meridian */}
      <g stroke="var(--gp-green-500)" strokeWidth="0.05" opacity="0.35">
        <line x1="0" x2="200" y1="50" y2="50" />
        <line x1="100" x2="100" y1="0" y2="100" />
      </g>

      {/* dot world from the same grid the home map renders.
         We re-derive it inline (small copy of hmBuildWorldGrid) so the flat
         treatment doesn't depend on home-map exporting it. */}
      <ChDotWorld />

      {/* pins, status-coded */}
      {pins.map((p, i) => {
        const x = hmLonToX(p.lon ?? p.lng);
        const y = hmLatToY(p.lat);
        const isActive = p.status === 'ACTIVE';
        return (
          <g key={`flat-${i}`}>
            {isActive && (
              <circle cx={x} cy={y} r="2.2"
                      fill="rgba(184,232,53,0.18)" />
            )}
            <circle cx={x} cy={y} r={isActive ? 0.95 : 0.75}
                    fill={isActive ? 'var(--gp-primary)' : 'var(--gp-secondary)'}
                    stroke="var(--gp-green-900)" strokeWidth="0.25" />
          </g>
        );
      })}
    </svg>
  );
};

/* Inline copy of the world dot grid (so flat-map works even if HmMycelialMap
   hasn't been rendered yet). Kept small. */
const ChDotWorld = React.memo(function ChDotWorld() {
  const grid = React.useMemo(() => {
    const HM_GRID_W = 60, HM_GRID_H = 24;
    const g = Array.from({ length: HM_GRID_H }, () => Array(HM_GRID_W).fill(' '));
    const fill = (r0, r1, c0, c1) => {
      for (let r = r0; r <= r1; r++)
        for (let c = c0; c <= c1; c++)
          if (r >= 0 && r < HM_GRID_H && c >= 0 && c < HM_GRID_W) g[r][c] = '#';
    };
    // (same shape data as hmBuildWorldGrid)
    fill(1,1,27,29); fill(2,4,25,30); fill(4,5,25,28);
    fill(2,2,5,11); fill(3,3,7,12);
    fill(3,5,3,8); fill(3,6,9,22); fill(6,7,11,22);
    fill(7,9,12,22); fill(9,9,21,22);
    fill(9,11,14,19); fill(11,12,17,19); fill(10,10,20,22);
    fill(11,12,19,25); fill(13,14,19,26); fill(15,15,19,24);
    fill(16,16,19,22); fill(17,17,19,21); fill(18,18,19,20);
    fill(5,6,29,31); fill(7,7,29,31);
    fill(3,4,31,34); fill(5,6,31,34);
    fill(6,7,32,38); fill(7,8,33,34); fill(5,7,35,39);
    fill(2,4,32,56); fill(4,6,36,56); fill(6,7,39,55); fill(7,8,45,55);
    fill(7,8,37,41); fill(8,10,38,43);
    fill(8,9,30,43); fill(9,10,31,43); fill(10,11,32,42);
    fill(11,13,32,42); fill(13,14,33,42); fill(14,15,34,41);
    fill(15,16,34,40); fill(16,17,35,38);
    fill(14,16,43,43);
    fill(8,9,41,45); fill(9,10,42,45); fill(10,11,42,44); fill(11,12,43,44);
    fill(7,8,46,55); fill(8,9,47,55); fill(9,10,48,53);
    fill(6,8,55,57);
    fill(10,11,47,51); fill(11,12,48,51);
    fill(12,13,47,54); fill(13,14,49,54);
    fill(10,11,53,54);
    fill(14,14,50,56); fill(15,16,49,56); fill(16,17,50,55); fill(17,17,51,53);
    fill(16,17,58,58); fill(17,18,58,58);
    return g;
  }, []);

  const HM_GRID_W = 60, HM_GRID_H = 24;
  const cellW = 200 / HM_GRID_W;
  const cellH = 100 / HM_GRID_H;
  const out = [];
  for (let r = 0; r < HM_GRID_H; r++) {
    for (let c = 0; c < HM_GRID_W; c++) {
      if (grid[r][c] === '#') {
        out.push(
          <circle key={`d-${r}-${c}`}
            cx={c * cellW + cellW / 2}
            cy={r * cellH + cellH / 2}
            r={0.55}
            fill="var(--gp-green-500)"
            opacity={0.48}
          />
        );
      }
    }
  }
  return <g>{out}</g>;
});

/* Map legend strip. */
const ChMapCaption = ({ bp, flat }) => (
  <div style={{
    marginTop: 12,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    flexWrap: 'wrap', gap: 12,
    fontFamily: 'var(--gp-font-mono)',
    fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase',
    color: 'var(--gp-fg-dim)',
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--gp-primary)', boxShadow: '0 0 6px rgba(184,232,53,0.5)' }} />
        <span>{CH_COUNTS.active} Active</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--gp-secondary)' }} />
        <span>{CH_COUNTS.forming} Forming</span>
      </div>
      {!flat && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: 0.65 }}>
          <span style={{ width: 16, height: 1, background: 'var(--gp-primary)' }} />
          <span>Mycelial threads</span>
        </div>
      )}
    </div>
    <button style={{
      appearance: 'none',
      border: '1px solid var(--gp-border-soft)',
      background: 'transparent',
      color: 'var(--gp-fg-muted)',
      borderRadius: 'var(--gp-radius-pill)',
      padding: '6px 14px',
      fontFamily: 'var(--gp-font-body)',
      fontSize: 12, fontWeight: 600,
      letterSpacing: '0.005em',
      cursor: 'pointer',
      whiteSpace: 'nowrap',
      flex: 'none',
    }}>⌖ Open full map</button>
  </div>
);

/* =====================================================================
   FILTER BAR
   ===================================================================== */

const ChFilterBar = ({ bp, region, setRegion, statuses, toggleStatus }) => (
  <div style={{
    padding: bp === 'mobile' ? '0 20px 20px' : `0 ${GP_useInset(bp)}px 28px`,
    display: 'flex',
    flexDirection: bp === 'mobile' ? 'column' : 'row',
    alignItems: bp === 'mobile' ? 'stretch' : 'center',
    justifyContent: 'space-between',
    gap: bp === 'mobile' ? 14 : 16,
  }}>
    <div style={{
      display: 'flex', gap: 8, flexWrap: 'wrap',
      overflowX: bp === 'mobile' ? 'auto' : 'visible',
    }}>
      <ChFilterPill active={region === 'ALL'}      onClick={() => setRegion('ALL')}>All</ChFilterPill>
      {CH_REGIONS.map(r => (
        <ChFilterPill key={r} active={region === r} onClick={() => setRegion(r)}>
          {r.charAt(0) + r.slice(1).toLowerCase()}
        </ChFilterPill>
      ))}
    </div>
    <div style={{ display: 'flex', gap: 8 }}>
      <ChFilterPill kind="multi" active={statuses.includes('ACTIVE')}  onClick={() => toggleStatus('ACTIVE')}>
        Active <span style={{ opacity: 0.55, marginLeft: 2 }}>{CH_COUNTS.active}</span>
      </ChFilterPill>
      <ChFilterPill kind="multi" active={statuses.includes('FORMING')} onClick={() => toggleStatus('FORMING')}>
        Forming <span style={{ opacity: 0.55, marginLeft: 2 }}>{CH_COUNTS.forming}</span>
      </ChFilterPill>
    </div>
  </div>
);

/* =====================================================================
   LIST SECTION — filter-aware
   ===================================================================== */

const ChListSection = ({ bp, region, statuses, density, featuredMode, grouped }) => {
  const inset = GP_useInset(bp);

  // Filter both tiers.
  const ftrShown = featuredMode !== 'compactOnly'
    ? CH_FEATURED.filter(c =>
        (region === 'ALL' || c.region === region) && statuses.includes(c.status)
      )
    : [];

  const cmpShown = featuredMode !== 'featuredOnly'
    ? CH_COMPACT.filter(c =>
        (region === 'ALL' || c.region === region) && statuses.includes(c.status)
      )
    : (featuredMode === 'featuredOnly'
      // when only featured, push featured into compact-style if compact mode would have been used
      ? CH_FEATURED.filter(c =>
          (region === 'ALL' || c.region === region) && statuses.includes(c.status)
        )
      : []);

  // featured grid columns
  const ftrCols = bp === 'mobile' ? 1
                : bp === 'tablet' ? 2
                : (density === 'editorial' ? 2 : 3);

  // compact grid columns — always 1 col at mobile so the status chip
  // doesn't get clipped and city titles can breathe.
  const cmpCols = bp === 'mobile' ? 1
                : bp === 'tablet' ? (density === 'editorial' ? 2 : 3)
                : (density === 'compact' ? 5 : density === 'editorial' ? 3 : 4);

  return (
    <div style={{ padding: bp === 'mobile' ? '0 20px 56px' : `0 ${inset}px 80px` }}>
      {/* Featured tier — only when not grouped (grouping handles its own) */}
      {!grouped && ftrShown.length > 0 && featuredMode !== 'compactOnly' && (
        <div style={{ marginBottom: bp === 'mobile' ? 24 : 32 }}>
          <ChSubheading label="Featured chapters" sub="Rich stories handpicked by stewards." />
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${ftrCols}, minmax(0, 1fr))`,
            gap: bp === 'mobile' ? 16 : 20,
          }}>
            {ftrShown.map(c => <ChFeaturedCard key={c.slug} c={c} density={density} bp={bp} />)}
          </div>
        </div>
      )}

      {/* Compact / directory tier */}
      {!grouped && featuredMode !== 'featuredOnly' && cmpShown.length > 0 && (
        <div>
          <ChSubheading label="Full directory" sub={`${cmpShown.length} chapters`} />
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${cmpCols}, minmax(0, 1fr))`,
            gap: bp === 'mobile' ? 10 : 14,
          }}>
            {cmpShown.map(c => <ChCompactCard key={c.slug} c={c} density={density} bp={bp} />)}
          </div>
        </div>
      )}

      {/* Grouped by region — emits one section per region with featured + compact mixed */}
      {grouped && (
        <ChGrouped bp={bp} region={region} statuses={statuses} density={density} featuredMode={featuredMode} ftrCols={ftrCols} cmpCols={cmpCols} />
      )}

      <ChStartStrip bp={bp} />
    </div>
  );
};

/* Section title between groups. */
const ChSubheading = ({ label, sub }) => (
  <div style={{
    display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap',
    marginBottom: 18,
  }}>
    <GP_Overline>{label}</GP_Overline>
    {sub && <GP_Caption style={{ letterSpacing: 0 }}>{sub}</GP_Caption>}
  </div>
);

/* Grouped by region. */
const ChGrouped = ({ bp, region, statuses, density, featuredMode, ftrCols, cmpCols }) => {
  const regions = region === 'ALL' ? CH_REGIONS : [region];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: bp === 'mobile' ? 36 : 56 }}>
      {regions.map(r => {
        const ftr = featuredMode !== 'compactOnly'
          ? CH_FEATURED.filter(c => c.region === r && statuses.includes(c.status))
          : [];
        const cmp = featuredMode !== 'featuredOnly'
          ? CH_COMPACT.filter(c => c.region === r && statuses.includes(c.status))
          : [];
        const total = ftr.length + cmp.length;
        if (total === 0) return null;
        return (
          <div key={r}>
            <div style={{
              display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
              marginBottom: 24, gap: 16, flexWrap: 'wrap',
              borderBottom: '1px solid var(--gp-border-soft)',
              paddingBottom: 16,
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <GP_Overline>{r}</GP_Overline>
                <GP_H3 size={bp === 'mobile' ? 22 : 32}>
                  {r.charAt(0) + r.slice(1).toLowerCase()}
                </GP_H3>
              </div>
              <GP_Caption>{total} chapter{total === 1 ? '' : 's'}</GP_Caption>
            </div>

            {ftr.length > 0 && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${ftrCols}, minmax(0, 1fr))`,
                gap: bp === 'mobile' ? 14 : 18,
                marginBottom: cmp.length > 0 ? (bp === 'mobile' ? 14 : 18) : 0,
              }}>
                {ftr.map(c => <ChFeaturedCard key={c.slug} c={c} density={density} bp={bp} />)}
              </div>
            )}

            {cmp.length > 0 && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${cmpCols}, minmax(0, 1fr))`,
                gap: bp === 'mobile' ? 10 : 14,
              }}>
                {cmp.map(c => <ChCompactCard key={c.slug} c={c} density={density} bp={bp} />)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

Object.assign(window, {
  ChHeroTypographic, ChHeroImagery, ChHeroMapLed,
  ChMapBlock, ChFilterBar, ChListSection,
});
