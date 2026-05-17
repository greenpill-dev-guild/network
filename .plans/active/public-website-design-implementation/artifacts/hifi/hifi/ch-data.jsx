/* hifi/ch-data.jsx — Chapter index data.
   Full network list (active + forming), three "featured" with rich content
   for the top tier, plus pin coords for the map. */

const CH_FEATURED = [
  {
    slug: 'brasil',
    name: 'Greenpill Brasil',
    city: 'São Paulo, Brazil',
    region: 'AMERICAS',
    status: 'ACTIVE',
    story: '200 trees planted onchain in a single weekend',
    blurb: 'A QF round funded planting in five Atlantic-Forest bioregions — tracked by satellite, attested by stewards.',
    steward: { name: 'Camila R.', role: 'Lead Steward' },
    photo: 'reforestation drive · Atlantic Forest',
  },
  {
    slug: 'kenya',
    name: 'Greenpill Kenya',
    city: 'Nairobi, Kenya',
    region: 'AFRICA',
    status: 'ACTIVE',
    story: 'Grassroots Economics in practice',
    blurb: 'Six villages run community currencies, settled weekly onchain — the largest live regenerative monetary experiment.',
    steward: { name: 'David O.', role: 'Lead Steward' },
    photo: 'sarafu market in mukuru',
  },
  {
    slug: 'cape-town',
    name: 'Greenpill Cape Town',
    city: 'Cape Town, South Africa',
    region: 'AFRICA',
    status: 'ACTIVE',
    story: 'A neighbourhood budget, run as a quadratic round',
    blurb: 'Civic experiments in city-scale public-goods funding, with the City of Cape Town\u2019s data office.',
    steward: { name: 'Thandi M.', role: 'Lead Steward' },
    photo: 'city hall · cape town',
  },
];

/* Compact list — keep wireframe items, plus a few hi-fi tone polish. */
const CH_COMPACT = [
  { slug: 'nyc',         name: 'Greenpill NYC',           city: 'New York City, USA',     region: 'AMERICAS', status: 'ACTIVE',  s: 'Public-goods funding circle.',           lat:  40.7, lng: -74.0 },
  { slug: 'denver',      name: 'Greenpill Denver',        city: 'Denver, USA',            region: 'AMERICAS', status: 'ACTIVE',  s: 'ETHDenver community spine.',             lat:  39.7, lng:-104.9 },
  { slug: 'california',  name: 'Greenpill California',    city: 'San Francisco, USA',     region: 'AMERICAS', status: 'ACTIVE',  s: 'Bay Area regen builders.',                lat:  37.8, lng:-122.4 },
  { slug: 'toronto',     name: 'Greenpill Toronto',       city: 'Toronto, Canada',        region: 'AMERICAS', status: 'ACTIVE',  s: 'Quadratic-funding experiments.',          lat:  43.7, lng: -79.4 },
  { slug: 'ottawa',      name: 'Greenpill Ottawa',        city: 'Ottawa, Canada',         region: 'AMERICAS', status: 'FORMING', s: 'Civic-tech regen pilots.',                lat:  45.4, lng: -75.7 },
  { slug: 'london-on',   name: 'Greenpill London ON',     city: 'London, Canada',         region: 'AMERICAS', status: 'FORMING', s: 'Watershed-scale projects.',              lat:  43.0, lng: -81.2 },
  { slug: 'dr',          name: 'Greenpill DR',            city: 'Santo Domingo, DR',      region: 'AMERICAS', status: 'FORMING', s: 'Caribbean regen network.',                lat:  18.5, lng: -69.9 },
  { slug: 'bogota',      name: 'Greenpill Bogotá',        city: 'Bogotá, Colombia',       region: 'AMERICAS', status: 'ACTIVE',  s: 'Andean reforestation pilots.',           lat:   4.7, lng: -74.1 },
  { slug: 'buenos',      name: 'Greenpill Buenos Aires',  city: 'Buenos Aires, Argentina',region: 'AMERICAS', status: 'ACTIVE',  s: 'DeSci & open-research salons.',          lat: -34.6, lng: -58.4 },
  { slug: 'mexico',      name: 'Greenpill Mexico City',   city: 'Mexico City, MX',        region: 'AMERICAS', status: 'ACTIVE',  s: 'Community currencies pilots.',           lat:  19.4, lng: -99.1 },

  { slug: 'civoire',     name: "Greenpill Côte d'Ivoire", city: 'Abidjan, CI',            region: 'AFRICA',   status: 'ACTIVE',  s: 'Cocoa cooperatives onchain.',            lat:   5.4, lng:  -4.0 },
  { slug: 'nigeria',     name: 'Greenpill Nigeria',       city: 'Lagos, Nigeria',         region: 'AFRICA',   status: 'ACTIVE',  s: 'Web3 onboarding at scale.',              lat:   6.5, lng:   3.4 },
  { slug: 'uganda',      name: 'Greenpill Uganda',        city: 'Kampala, Uganda',        region: 'AFRICA',   status: 'FORMING', s: 'Soil & smallholder pilots.',             lat:   0.3, lng:  32.6 },

  { slug: 'india',       name: 'Greenpill India',         city: 'Bengaluru, India',       region: 'ASIA',     status: 'ACTIVE',  s: 'Public-goods funding ops.',              lat:  12.9, lng:  77.6 },
  { slug: 'kohphangan',  name: 'Greenpill Koh Pha-ngan',  city: 'Koh Pha-ngan, TH',       region: 'ASIA',     status: 'ACTIVE',  s: 'Island regenerative co-living.',         lat:   9.8, lng: 100.0 },
  { slug: 'tokyo',       name: 'Greenpill Tokyo',         city: 'Tokyo, Japan',           region: 'ASIA',     status: 'FORMING', s: 'Crypto-media translation node.',         lat:  35.7, lng: 139.7 },
  { slug: 'bali',        name: 'Greenpill Bali',          city: 'Ubud, Indonesia',        region: 'ASIA',     status: 'ACTIVE',  s: 'Permaculture & co-living circle.',       lat:  -8.3, lng: 115.0 },

  { slug: 'germany',     name: 'Greenpill Germany',       city: 'Berlin, Germany',        region: 'EUROPE',   status: 'ACTIVE',  s: 'Eastern Europe coordination.',           lat:  52.5, lng:  13.4 },
  { slug: 'uncommons',   name: 'Greenpill Uncommons',     city: 'Berlin, Germany',        region: 'EUROPE',   status: 'ACTIVE',  s: 'Researcher & writer node.',              lat:  52.5, lng:  13.5 },
  { slug: 'greensofa',   name: 'Greenpill Greensofa',     city: 'Berlin, Germany',        region: 'EUROPE',   status: 'FORMING', s: 'Living-room salon series.',              lat:  52.5, lng:  13.3 },
  { slug: 'lisbon',      name: 'Greenpill Lisbon',        city: 'Lisbon, Portugal',       region: 'EUROPE',   status: 'ACTIVE',  s: 'Iberian regen builders.',                lat:  38.7, lng:  -9.1 },

  { slug: 'sydney',      name: 'Greenpill Sydney',        city: 'Sydney, Australia',      region: 'OCEANIA',  status: 'FORMING', s: 'Coral-reef regeneration pilots.',        lat: -33.9, lng: 151.2 },
];

/* Featured rows also get coords for the map. */
const CH_FEATURED_COORDS = {
  brasil:    { lat: -15.8, lng: -47.9 },
  kenya:     { lat:  -1.3, lng:  36.8 },
  'cape-town': { lat: -33.9, lng: 18.4 },
};

/* All pins for the map: featured + compact. */
const CH_ALL_PINS = [
  ...CH_FEATURED.map(c => ({ c: c.name.replace('Greenpill ', ''), ...CH_FEATURED_COORDS[c.slug], slug: c.slug, status: c.status, size: 'L' })),
  ...CH_COMPACT.map(c => ({ c: c.name.replace('Greenpill ', ''), lat: c.lat, lng: c.lng, slug: c.slug, status: c.status, size: 'S' })),
];

const CH_REGIONS = ['AMERICAS', 'AFRICA', 'ASIA', 'EUROPE', 'OCEANIA'];

const CH_COUNTS = (() => {
  const all = [...CH_FEATURED, ...CH_COMPACT];
  const byRegion = {};
  CH_REGIONS.forEach(r => byRegion[r] = { active: 0, forming: 0 });
  all.forEach(c => {
    if (c.status === 'ACTIVE')  byRegion[c.region].active  += 1;
    if (c.status === 'FORMING') byRegion[c.region].forming += 1;
  });
  return {
    byRegion,
    total: all.length,
    active: all.filter(c => c.status === 'ACTIVE').length,
    forming: all.filter(c => c.status === 'FORMING').length,
  };
})();

Object.assign(window, {
  CH_FEATURED, CH_COMPACT, CH_ALL_PINS, CH_REGIONS, CH_COUNTS,
});
