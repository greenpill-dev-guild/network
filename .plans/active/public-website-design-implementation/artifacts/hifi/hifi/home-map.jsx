/* hifi/home-map.jsx — Home hero map.
   Thin adapter around the canonical MapCanvas. Owns network composition
   (base + the user's locally-cached self node + new-node edges), but
   delegates UI state (walkthrough open, newNodeIds) to HmHero.
   ----------------------------------------------------------------- */

const HmMycelialMap = ({ chapters, density = 'medium', motion = 'pulse', myNode = null, newNodeIds = [] }) => {
  // Map the Home tweak "density" string → total node count.
  const totalNodes = density === 'sparse' ? 70
                   : density === 'dense'  ? 165
                   : 125;

  // Filter state from MapLegend (subscribes to custom event).
  const [filters, setFilters] = React.useState({
    themes: null,
    types: { chapter: true, steward: true, member: true },
  });
  React.useEffect(() => {
    const handler = (e) => setFilters(e.detail);
    window.addEventListener('mc-filter', handler);
    return () => window.removeEventListener('mc-filter', handler);
  }, []);

  const network = React.useMemo(() => {
    // Coerce home-data shape ({ c, lat, lng, theme }) into MAP_CHAPTERS shape.
    const ch = (chapters || []).slice(0, 14).map((c, i) => ({
      id: c.id || `ch-h-${i}`,
      name: c.c || c.name || `Chapter ${i}`,
      lat: c.lat,
      lng: c.lng,
      themes: c.themes
        || (c.theme === 'reforestation' ? ['trees','impact','public']
          : c.theme === 'currencies'    ? ['currency','mutual','gov']
          : c.theme === 'civics'        ? ['gov','public','impact']
          : c.theme === 'funding'       ? ['funding','public','opensrc']
          : c.theme === 'localism'      ? ['events','gov','public']
          : c.theme === 'desci'         ? ['desci','opensrc','ai']
          : c.theme === 'onboarding'    ? ['education','mutual','events']
          : c.theme === 'media'         ? ['stories','events','public']
          : ['public','trees','events']),
    }));

    const baseNet = generateMapNetwork({ chapters: ch, totalNodes, seed: 17 });
    if (!myNode) return baseNet;

    // Build edges for the user's self node against existing stewards + members.
    const newEdges = [];
    const nearStew = baseNet.stewards
      .map(s => ({ s, d: Math.hypot(s.lat - myNode.lat, (s.lng - myNode.lng) * Math.cos((s.lat + myNode.lat) / 2 * Math.PI / 180)) }))
      .filter(o => o.d < 18)
      .sort((a, b) => a.d - b.d)
      .slice(0, 2);
    nearStew.forEach(({ s }) => {
      const shared = s.themes.find(t => myNode.themes.includes(t));
      newEdges.push({ from: myNode.id, to: s.id, kind: 'sm', theme: shared || myNode.themes[0] });
    });

    const farMembers = baseNet.members
      .map(m => ({
        m,
        d: Math.hypot(m.lat - myNode.lat, (m.lng - myNode.lng) * Math.cos((m.lat + myNode.lat) / 2 * Math.PI / 180)),
        shared: m.themes.filter(t => myNode.themes.includes(t)).length,
      }))
      .filter(o => o.shared >= Math.min(2, myNode.themes.length) && o.d > 25)
      .sort((a, b) => b.shared - a.shared)
      .slice(0, 4);
    farMembers.forEach(({ m }) => {
      newEdges.push({
        from: myNode.id, to: m.id, kind: 'mm',
        theme: m.themes.find(t => myNode.themes.includes(t)) || myNode.themes[0],
      });
    });

    return {
      ...baseNet,
      nodes: [...baseNet.nodes, myNode],
      members: [...baseNet.members, myNode],
      edges: [...baseNet.edges, ...newEdges],
    };
  }, [chapters, totalNodes, myNode]);

  return (
    <MapCanvas
      network={network}
      worldStyle="dots"
      newNodeIds={newNodeIds}
      visibleTypes={filters.types}
      visibleThemes={filters.themes}
      initialGrow={motion !== 'still'}
      compact={false}
      showLegend={true}
    />
  );
};

Object.assign(window, { HmMycelialMap });
