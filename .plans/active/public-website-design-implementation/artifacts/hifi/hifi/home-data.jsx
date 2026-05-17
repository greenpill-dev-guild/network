/* hifi/home-data.jsx — content for the Home page. */

const HM_CHAPTERS = [
  { c: 'Brasil',           lat: -15.8, lng: -47.9,  theme: 'reforestation', size: 'L' },
  { c: 'Kenya',            lat:  -1.3, lng:  36.8,  theme: 'currencies',     size: 'M' },
  { c: 'Cape Town',        lat: -33.9, lng:  18.4,  theme: 'civics',         size: 'M' },
  { c: 'New York City',    lat:  40.7, lng: -74.0,  theme: 'funding',        size: 'M' },
  { c: 'Berlin',           lat:  52.5, lng:  13.4,  theme: 'localism',       size: 'M' },
  { c: 'Buenos Aires',     lat: -34.6, lng: -58.4,  theme: 'desci',          size: 'S' },
  { c: 'Lagos',            lat:   6.5, lng:   3.4,  theme: 'onboarding',     size: 'S' },
  { c: 'Bogotá',           lat:   4.7, lng: -74.1,  theme: 'reforestation',  size: 'S' },
  { c: 'Bengaluru',        lat:  12.9, lng:  77.6,  theme: 'desci',          size: 'S' },
  { c: 'Tokyo',            lat:  35.7, lng: 139.7,  theme: 'media',          size: 'S' },
  { c: 'San Francisco',    lat:  37.8, lng:-122.4,  theme: 'funding',        size: 'M' },
  { c: 'Lisbon',           lat:  38.7, lng:  -9.1,  theme: 'localism',       size: 'S' },
  { c: 'Mexico City',      lat:  19.4, lng: -99.1,  theme: 'currencies',     size: 'S' },
  { c: 'Bali',             lat:  -8.3, lng: 115.0,  theme: 'reforestation',  size: 'S' },
];

const HM_STORIES = [
  {
    chapter: 'Brasil',
    region: 'BRASIL',
    title: '200 trees planted onchain in a single weekend',
    blurb: 'Tracked by satellite, attested by stewards, funded by a public-goods round — the first proof-of-impact reforestation drive.',
    photo: 'tree-planting ceremony · BR',
    big: true,
  },
  {
    chapter: 'Kenya',
    region: 'KENYA',
    title: 'Grassroots Economics in practice',
    blurb: 'Six Kenyan villages running their own community currencies, settled weekly onchain.',
    photo: 'sarafu market in mukuru',
  },
  {
    chapter: 'Cape Town',
    region: 'CAPE TOWN',
    title: 'Onchain civic experiments',
    blurb: 'A neighbourhood budget, run as a quadratic round.',
    photo: 'city hall · cape town',
  },
  {
    chapter: 'New York City',
    region: 'NEW YORK CITY',
    title: 'Public goods funding circle',
    blurb: 'Twelve NYC contributors, one quarterly round, no application fees.',
    photo: 'NYC subway hackathon',
  },
];

const HM_LIB_PREVIEW = {
  featuredBook: {
    t: 'Onchain Impact Networks',
    a: 'Various authors',
    y: 2024,
    blurb: 'How regenerative networks coordinate funding, reputation, and storytelling — without intermediaries.',
  },
  featuredEp: {
    n: 218,
    t: 'Onchain Impact Networks',
    g: 'Kevin Owocki & guests',
    dur: '58:14',
    age: '2 days ago',
  },
  topBooks: [
    { t: 'GreenPilled',                a: 'Kevin Owocki',  y: 2022 },
    { t: 'MycoFi',                     a: 'Jeff Emmett',   y: 2023 },
    { t: 'Onchain Capital Allocation', a: 'Kevin Owocki',  y: 2024, edition: 'v2' },
    { t: 'Pathways to Regeneration',   a: 'Various',       y: 2024 },
  ],
  guilds: [
    { t: 'Dev Guild',     d: 'Open-source coordination tools.',     members: 18 },
    { t: 'Writers Guild', d: 'Stories, translations, longform.',     members: 12 },
    { t: 'GreenSci',      d: 'Open regenerative science.',           members:  9 },
  ],
};

const HM_GARDEN_STEPS = [
  {
    n: 1,
    friction: 'Lowest friction',
    t: 'Stay in the loop',
    d: 'A monthly digest. Stories from chapters, new books, upcoming activations. No spam.',
    cta: 'Subscribe',
    kind: 'email',
  },
  {
    n: 2,
    friction: '',
    t: 'Join the Telegram',
    d: 'Daily chatter from across the network. Drop in and listen, or jump in.',
    cta: 'Open Telegram',
    kind: 'external',
  },
  {
    n: 3,
    friction: '',
    t: 'Take the Regen Assessment',
    d: 'Five minutes. We match you to chapters and guilds based on what you bring and seek.',
    cta: 'Start the assessment',
    kind: 'flow',
  },
  {
    n: 4,
    friction: 'Highest friction',
    t: 'Book a steward call',
    d: 'Thirty minutes with a network steward. Ask anything. Get pointed at the right people.',
    cta: 'Pick a time',
    kind: 'booking',
  },
];

/* Theme → chartreuse-ish color, kept restrained.
   For real data we will color-code in the actual map design. */
const HM_THEME_COLORS = {
  reforestation: '#9BC326',
  currencies:    '#5BA889',
  civics:        '#F0DCA0',
  funding:       '#B8E835',
  localism:      '#8DC9AE',
  desci:         '#C4F02C',
  onboarding:    '#FAE8C2',
  media:         '#D4F564',
};

Object.assign(window, { HM_CHAPTERS, HM_STORIES, HM_LIB_PREVIEW, HM_GARDEN_STEPS, HM_THEME_COLORS });
