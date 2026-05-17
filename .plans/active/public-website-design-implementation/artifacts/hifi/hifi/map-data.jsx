/* hifi/map-data.jsx — Network data model for the mycelial map.
   Three node types: chapter (anchor) · steward (cluster) · member (orbit).
   Procedural but seeded — same data every render.
   Plus edge generation following the relationship rules:
     1) Steward ↔ Member within a chapter (dense local web)
     2) Steward ↔ Steward across chapters when sharing a theme (long threads)
     3) Member ↔ Member across chapters when sharing 2+ themes (rare)
   ----------------------------------------------------------------- */

/* ----- seeded RNG ----- */
function mdRand(seed) {
  let s = (seed | 0) || 1;
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
}
function mdPick(rand, arr) { return arr[Math.floor(rand() * arr.length)]; }
function mdPickN(rand, arr, n) {
  const copy = arr.slice();
  const out = [];
  for (let i = 0; i < n && copy.length; i++) {
    out.push(copy.splice(Math.floor(rand() * copy.length), 1)[0]);
  }
  return out;
}

/* ----- canonical chapter list (anchors) ----- */
const MAP_CHAPTERS = [
  { id: 'ch-bra', name: 'Brasil',        lat: -15.8, lng: -47.9, themes: ['trees','funding','public']    },
  { id: 'ch-ken', name: 'Kenya',         lat:  -1.3, lng:  36.8, themes: ['currency','mutual','gov']     },
  { id: 'ch-cpt', name: 'Cape Town',     lat: -33.9, lng:  18.4, themes: ['gov','public','impact']       },
  { id: 'ch-nyc', name: 'New York City', lat:  40.7, lng: -74.0, themes: ['funding','public','opensrc']  },
  { id: 'ch-ber', name: 'Berlin',        lat:  52.5, lng:  13.4, themes: ['opensrc','desci','public']    },
  { id: 'ch-bue', name: 'Buenos Aires',  lat: -34.6, lng: -58.4, themes: ['desci','currency','opensrc']  },
  { id: 'ch-lag', name: 'Lagos',         lat:   6.5, lng:   3.4, themes: ['education','currency','mutual'] },
  { id: 'ch-bog', name: 'Bogotá',        lat:   4.7, lng: -74.1, themes: ['trees','food','impact']       },
  { id: 'ch-blr', name: 'Bengaluru',     lat:  12.9, lng:  77.6, themes: ['desci','opensrc','ai']        },
  { id: 'ch-tyo', name: 'Tokyo',         lat:  35.7, lng: 139.7, themes: ['stories','ai','opensrc']      },
  { id: 'ch-sfo', name: 'San Francisco', lat:  37.8, lng:-122.4, themes: ['funding','ai','opensrc']      },
  { id: 'ch-lis', name: 'Lisbon',        lat:  38.7, lng:  -9.1, themes: ['events','public','energy']    },
  { id: 'ch-mex', name: 'Mexico City',   lat:  19.4, lng: -99.1, themes: ['currency','mutual','events']  },
  { id: 'ch-bal', name: 'Bali',          lat:  -8.3, lng: 115.0, themes: ['trees','water','events']      },
];

/* ----- city seed list for spreading members across populated regions ----- */
const MAP_MEMBER_CITIES = [
  // Americas
  ['Vancouver',49.3,-123.1],['Seattle',47.6,-122.3],['Portland',45.5,-122.7],
  ['Los Angeles',34.0,-118.2],['Denver',39.7,-105.0],['Austin',30.3,-97.7],
  ['Chicago',41.9,-87.6],['Toronto',43.7,-79.4],['Montréal',45.5,-73.6],
  ['Boston',42.4,-71.1],['Miami',25.8,-80.2],['Philadelphia',39.95,-75.16],
  ['Detroit',42.3,-83.0],['Atlanta',33.7,-84.4],['Houston',29.8,-95.4],
  ['Guadalajara',20.7,-103.4],['Monterrey',25.7,-100.3],['San José CR',9.9,-84.1],
  ['Panama City',8.98,-79.5],['Havana',23.1,-82.4],['Quito',-0.2,-78.5],
  ['Lima',-12.1,-77.0],['Medellín',6.2,-75.6],['Santiago',-33.4,-70.7],
  ['São Paulo',-23.5,-46.6],['Rio de Janeiro',-22.9,-43.2],['Salvador',-13.0,-38.5],
  ['Recife',-8.05,-34.9],['Belo Horizonte',-19.9,-43.9],['Porto Alegre',-30.0,-51.2],
  ['Asunción',-25.3,-57.5],['Montevideo',-34.9,-56.2],['La Paz',-16.5,-68.2],
  ['Caracas',10.5,-66.9],
  // Europe
  ['London',51.5,-0.1],['Dublin',53.3,-6.3],['Edinburgh',55.95,-3.2],
  ['Amsterdam',52.4,4.9],['Paris',48.9,2.3],['Brussels',50.85,4.35],
  ['Madrid',40.4,-3.7],['Barcelona',41.4,2.2],['Porto',41.15,-8.6],
  ['Rome',41.9,12.5],['Milan',45.5,9.2],['Athens',38.0,23.7],
  ['Vienna',48.2,16.4],['Prague',50.1,14.4],['Warsaw',52.2,21.0],
  ['Copenhagen',55.7,12.6],['Stockholm',59.3,18.1],['Oslo',59.9,10.75],
  ['Helsinki',60.2,24.95],['Reykjavik',64.1,-21.9],['Zürich',47.4,8.55],
  ['Istanbul',41.0,28.97],['Bucharest',44.4,26.1],['Kyiv',50.45,30.5],
  // Africa & Middle East
  ['Marrakech',31.6,-8.0],['Casablanca',33.6,-7.6],['Cairo',30.0,31.2],
  ['Addis Ababa',9.0,38.7],['Nairobi',-1.3,36.8],['Kampala',0.3,32.6],
  ['Accra',5.6,-0.2],['Dakar',14.7,-17.4],['Abidjan',5.3,-4.0],
  ['Kigali',-1.95,30.05],['Dar es Salaam',-6.8,39.3],['Johannesburg',-26.2,28.0],
  ['Tel Aviv',32.1,34.8],['Beirut',33.9,35.5],['Dubai',25.2,55.3],
  ['Riyadh',24.7,46.7],['Tehran',35.7,51.4],
  // South & East Asia
  ['Mumbai',19.1,72.9],['Delhi',28.6,77.2],['Kolkata',22.6,88.4],
  ['Chennai',13.1,80.3],['Hyderabad',17.4,78.5],['Colombo',6.9,79.9],
  ['Kathmandu',27.7,85.3],['Dhaka',23.8,90.4],['Karachi',24.9,67.0],
  ['Bangkok',13.75,100.5],['Hanoi',21.0,105.8],['Ho Chi Minh City',10.8,106.7],
  ['Kuala Lumpur',3.15,101.7],['Singapore',1.35,103.8],['Jakarta',-6.2,106.85],
  ['Manila',14.6,120.98],['Cebu',10.3,123.9],
  ['Hong Kong',22.3,114.2],['Taipei',25.0,121.5],['Seoul',37.55,127.0],
  ['Beijing',39.9,116.4],['Shanghai',31.2,121.5],['Shenzhen',22.55,114.1],
  ['Osaka',34.7,135.5],['Sapporo',43.05,141.35],
  // Oceania
  ['Sydney',-33.85,151.2],['Melbourne',-37.8,145.0],['Brisbane',-27.5,153.0],
  ['Perth',-31.95,115.85],['Auckland',-36.85,174.8],['Wellington',-41.3,174.8],
  ['Christchurch',-43.5,172.6],
];

/* ----- procedural network generation ----- */
function generateMapNetwork({
  chapters = MAP_CHAPTERS,
  totalNodes = 125,
  chapterCount = null,                // null → use all entries in `chapters`
  seed = 42,
} = {}) {
  const rand = mdRand(seed);

  const chList = chapters.slice(0, chapterCount ?? chapters.length);

  // Allocate: ~12 chapters, ~30% stewards, ~remainder members.
  const chN = chList.length;
  const remaining = Math.max(0, totalNodes - chN);
  const stN = Math.round(remaining * 0.35);
  const mbN = remaining - stN;

  const chapterNodes = chList.map((c, i) => ({
    type: 'chapter',
    id: c.id,
    name: c.name,
    lat: c.lat,
    lng: c.lng,
    themes: c.themes,
    size: 'L',
  }));

  const themeIds = MAP_THEMES.map(t => t.id);

  // Stewards cluster around their chapter (jitter 2-5°). Each steward shares
  // at least one theme with their chapter.
  const stewardNodes = [];
  const stewardNamesPool = MAP_STEWARD_NAMES.slice();
  for (let i = 0; i < stN; i++) {
    const chapter = chList[i % chN];
    const r = 2 + rand() * 3.5;
    const a = rand() * Math.PI * 2;
    const lat = chapter.lat + Math.sin(a) * r;
    const lng = chapter.lng + Math.cos(a) * (r * 1.4); // slightly wider in lng
    const themes = [
      chapter.themes[Math.floor(rand() * chapter.themes.length)],
    ];
    if (rand() > 0.4) themes.push(mdPick(rand, themeIds.filter(t => !themes.includes(t))));
    stewardNodes.push({
      type: 'steward',
      id: `st-${chapter.id}-${i}`,
      name: stewardNamesPool[i % stewardNamesPool.length],
      chapterId: chapter.id,
      lat, lng,
      themes,
      size: 'M',
    });
  }

  // Members spread across populated cities globally; not affiliated with a
  // chapter, but each has 1-3 themes.
  const memberNodes = [];
  for (let i = 0; i < mbN; i++) {
    const [city, baseLat, baseLng] = MAP_MEMBER_CITIES[i % MAP_MEMBER_CITIES.length];
    const lat = baseLat + (rand() - 0.5) * 1.6;
    const lng = baseLng + (rand() - 0.5) * 1.6;
    const themeCount = 1 + Math.floor(rand() * 2.5); // 1-3
    const themes = mdPickN(rand, themeIds, themeCount);
    memberNodes.push({
      type: 'member',
      id: `mb-${i}`,
      name: MAP_MEMBER_NAMES[i % MAP_MEMBER_NAMES.length],
      city,
      lat, lng,
      themes,
      size: 'S',
    });
  }

  const nodes = [...chapterNodes, ...stewardNodes, ...memberNodes];

  // ---------- edge generation ----------
  const edges = [];

  // 1) Steward ↔ Member within local radius (~12° great-circle approx).
  //    Members near a chapter pick up local stewards.
  const LOCAL_R_DEG = 12;
  memberNodes.forEach(m => {
    const nearStewards = stewardNodes
      .map(s => ({ s, d: Math.hypot(s.lat - m.lat, (s.lng - m.lng) * Math.cos((s.lat + m.lat) / 2 * Math.PI / 180)) }))
      .filter(o => o.d < LOCAL_R_DEG)
      .sort((a, b) => a.d - b.d)
      .slice(0, 2);
    nearStewards.forEach(({ s }) => {
      const shared = m.themes.filter(t => s.themes.includes(t)).length;
      // Always connect at least 1 nearby steward; extra weight if sharing themes.
      edges.push({
        from: m.id, to: s.id,
        kind: 'sm', // steward-member
        shared,
        theme: m.themes.find(t => s.themes.includes(t)) || m.themes[0],
      });
    });
  });

  // 2) Steward ↔ Steward across chapters when sharing a theme.
  for (let i = 0; i < stewardNodes.length; i++) {
    for (let j = i + 1; j < stewardNodes.length; j++) {
      const a = stewardNodes[i], b = stewardNodes[j];
      if (a.chapterId === b.chapterId) continue;
      const shared = a.themes.filter(t => b.themes.includes(t));
      if (!shared.length) continue;
      // Probabilistic: not every shared-theme pair connects (else hairball).
      if (rand() < 0.18) {
        edges.push({ from: a.id, to: b.id, kind: 'ss', shared: shared.length, theme: shared[0] });
      }
    }
  }

  // 3) Member ↔ Member across chapters (rare long threads, require 2+ shared themes).
  for (let i = 0; i < memberNodes.length; i++) {
    for (let j = i + 1; j < memberNodes.length; j++) {
      const a = memberNodes[i], b = memberNodes[j];
      const shared = a.themes.filter(t => b.themes.includes(t));
      if (shared.length < 2) continue;
      // Distance check — only "long threads" (>30°).
      const d = Math.hypot(a.lat - b.lat, (a.lng - b.lng) * Math.cos((a.lat + b.lat) / 2 * Math.PI / 180));
      if (d < 30) continue;
      if (rand() < 0.06) {
        edges.push({ from: a.id, to: b.id, kind: 'mm', shared: shared.length, theme: shared[0] });
      }
    }
  }

  return { nodes, edges, chapters: chapterNodes, stewards: stewardNodes, members: memberNodes };
}

/* ----- name pools ----- */
const MAP_STEWARD_NAMES = [
  'Ananya Iyer','Mateus Cardoso','Wangari Mathenge','Yuki Watanabe','Kofi Asante',
  'Sofía Vargas','Lukas Heinrich','Aisha Diallo','Jin Park','Camila Rocha',
  'Tomás Herrera','Nia Adebayo','Erik Lindqvist','Priya Sharma','Hugo Almeida',
  'Layla Hassan','Ravi Iyer','Mira Kovač','Olu Bankole','Sara Mahmoud',
  'Hiroshi Tanaka','Adaeze Eze','Diego Salazar','Ines Costa','Karim El-Sayed',
  'Mei Lin','Felipe Nunes','Zara Ahmed','Bruno Pereira','Sami Nazari',
  'Iris Bauer','Tariq Hassan','Lola Diop','Ethan Wright','Naomi Goldberg',
  'Carlos Mendoza','Asha Mwangi','Hina Yamada','Nikolaj Sørensen','Marina Petrova',
];

const MAP_MEMBER_NAMES = [
  'Alex','Jordan','Sam','Casey','Riley','Avery','Quinn','Rowan','Skyler','Sage',
  'Robin','Reese','Parker','Charlie','Morgan','Drew','Emerson','Frankie','Hayden','Indigo',
  'Jamie','Kai','Lane','Mika','Nico','Ode','Paz','Remy','Shay','Tess',
  'Uma','Vee','Wren','Xan','Yara','Zen','Bea','Coco','Dani','Eli',
  'Fae','Gigi','Hira','Iri','Joss','Kit','Lev','Mae','Niko','Oso',
  'Pim','Que','Rui','Sol','Tam','Une','Vic','Wim','Xio','Yev',
  'Zia','Bri','Cy','Dee','Em','Fi','Gen','Hud','Inu','Jet','Kez','Lia','Mo',
];

Object.assign(window, {
  MAP_CHAPTERS, MAP_MEMBER_CITIES, MAP_STEWARD_NAMES, MAP_MEMBER_NAMES,
  generateMapNetwork, mdRand,
});
