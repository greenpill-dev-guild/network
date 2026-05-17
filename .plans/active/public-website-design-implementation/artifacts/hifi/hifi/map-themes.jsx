/* hifi/map-themes.jsx — Theme catalog for the mycelial map.
   16 themes, each with a hand-tuned hue that pops on the deep-forest canvas
   while staying within the regenerative palette (no neon, no cold tech-blue).
   Organized roughly: greens → yellows → oranges → reds/pinks → cyans → blues → grays.
   ----------------------------------------------------------------- */

const MAP_THEMES = [
  // Earth + regeneration cluster (greens, yellow-greens)
  { id: 'trees',     label: 'Trees & Biodiversity',   color: '#7BC74D', icon: 'tree'      },
  { id: 'food',      label: 'Food & Farms',           color: '#A8D24A', icon: 'grain'     },
  { id: 'water',     label: 'Water & Waste',          color: '#3FB6A8', icon: 'wave'      },
  { id: 'energy',    label: 'Clean Energy',           color: '#F5CB45', icon: 'sun'       },

  // Civic / coordination cluster (golds, oranges, terracotta)
  { id: 'gov',       label: 'Local Governance',       color: '#E8B14B', icon: 'gavel'     },
  { id: 'events',    label: 'Local Events',           color: '#E89455', icon: 'flag'      },
  { id: 'funding',   label: 'Grants & Funding',       color: '#E07856', icon: 'coin'      },
  { id: 'currency',  label: 'Community Currency',     color: '#D86A4A', icon: 'currency'  },

  // People + culture cluster (pinks, mauves, coral)
  { id: 'mutual',    label: 'Mutual Aid',             color: '#D87B97', icon: 'heart'     },
  { id: 'stories',   label: 'Storytelling',           color: '#E0A6B8', icon: 'book'      },
  { id: 'education', label: 'Education',              color: '#F0DCA0', icon: 'mortar'    },

  // Open knowledge + science cluster (cool greens, teals, blues)
  { id: 'opensrc',   label: 'Open Source',            color: '#5CC2D9', icon: 'fork'      },
  { id: 'desci',     label: 'DeSci',                  color: '#7DAEE0', icon: 'beaker'    },
  { id: 'ai',        label: 'AI & Automation',        color: '#9B8FD9', icon: 'circuit'   },

  // Impact + commons cluster
  { id: 'impact',    label: 'Impact Tracking',        color: '#86E0B5', icon: 'pulse'     },
  { id: 'public',    label: 'Public Goods',           color: '#C9A4E0', icon: 'commons'   },
];

const MAP_THEME_BY_ID = Object.fromEntries(MAP_THEMES.map(t => [t.id, t]));

/* Get the dominant color for a node with multiple themes — first theme wins.
   Used as the node fill. Secondary themes get rendered as a thin ring or
   secondary dot. */
function themeColor(themeIds) {
  if (!themeIds || !themeIds.length) return 'var(--gp-primary)';
  const t = MAP_THEME_BY_ID[themeIds[0]];
  return t ? t.color : 'var(--gp-primary)';
}

/* Average a set of theme colors for a node that holds multiple — used for
   the ring color around members with 2-3 themes. */
function themeRingColor(themeIds) {
  if (!themeIds || themeIds.length < 2) return null;
  const t = MAP_THEME_BY_ID[themeIds[1]];
  return t ? t.color : null;
}

Object.assign(window, { MAP_THEMES, MAP_THEME_BY_ID, themeColor, themeRingColor });
