/* hifi/st-data.jsx — Stories index data. */

const ST_HERO = {
  overline: 'Stories',
  title: 'Field notes from the network.',
  blurb: 'Long-reads, postmortems, and steward notes — written by chapters around the world. Edited by the Writers Guild.',
};

/* The single cinematic featured story. */
const ST_FEATURED = {
  slug: '200-trees-brasil',
  chapter: 'Brasil',
  region: 'Latin America',
  tag: 'Onchain Reforestation',
  title: '200 trees planted onchain in a single weekend.',
  dek: 'How Greenpill Brasil ran a quadratic-funding round that funded reforestation across five bioregions — and what we\u2019d do differently next time.',
  author: 'Camila R.',
  authorRole: 'Steward · Greenpill Brasil',
  date: 'Mar 2026',
  read: '14 min read',
  photo: 'hero — atlantic forest canopy, dawn',
};

/* Two sub-features. */
const ST_SUB_FEATURES = [
  {
    slug: 'grassroots-economics-mukuru',
    chapter: 'Kenya',
    tag: 'Public Goods',
    title: 'Grassroots Economics, six months in',
    dek: 'Community currencies in Mukuru \u2014 what\u2019s working, what\u2019s not, and what changed when we stopped trying to be a payments app.',
    author: 'David O.',
    date: 'Mar 2026',
    read: '8 min',
    photo: 'mukuru market — community currency in use',
  },
  {
    slug: 'civic-experiments-postmortem',
    chapter: 'Cape Town',
    tag: 'Field Report',
    title: 'Onchain civic experiments \u2014 a postmortem',
    dek: 'Three pilots, two pivots, one quiet success. The honest account of a year running public-goods experiments in a city that didn\u2019t ask for them.',
    author: 'Thandi M.',
    date: 'Feb 2026',
    read: '12 min',
    photo: 'cape town — civic hall workshop',
  },
];

/* Topic tags for the filter bar. */
const ST_TOPIC_TAGS = [
  'All',
  'Onchain Reforestation',
  'Public Goods',
  'Steward Notes',
  'Translations',
  'Field Reports',
];

const ST_CHAPTER_TAGS = [
  'All chapters', 'Brasil', 'Kenya', 'Cape Town', 'NYC', 'India', 'Berlin', '+12 more',
];

/* The feed below the features. */
const ST_FEED = [
  {
    slug: 'grassroots-economics-mukuru',
    chapter: 'Kenya', tag: 'Public Goods',
    title: 'Grassroots Economics, six months in',
    dek: 'What we learned running community currencies in Mukuru \u2014 and what changed when we stopped trying to be a payments app.',
    author: 'David O.', date: 'Mar 2026', read: '8 min',
    photo: 'thumb — mukuru market',
  },
  {
    slug: 'civic-experiments-postmortem',
    chapter: 'Cape Town', tag: 'Field Report',
    title: 'Onchain civic experiments \u2014 a postmortem',
    dek: 'Three pilots, two pivots, one quiet success. An honest account.',
    author: 'Thandi M.', date: 'Feb 2026', read: '12 min',
    photo: 'thumb — cape town workshop',
  },
  {
    slug: 'public-goods-shoestring',
    chapter: 'NYC', tag: 'Steward Notes',
    title: 'Running a public-goods funding circle on a shoestring',
    dek: 'The tools, rituals, and small social contracts we wish we knew sooner.',
    author: 'M. Chen', date: 'Feb 2026', read: '6 min',
    photo: 'thumb — brooklyn living room',
  },
  {
    slug: 'pathways-translations',
    chapter: 'India', tag: 'Translations',
    title: 'Pathways to Regeneration \u2014 now in Hindi & Tamil',
    dek: 'Eight weeks, four contributors, two languages, one editorial process that almost worked.',
    author: 'Priya R.', date: 'Jan 2026', read: '4 min',
    photo: 'thumb — chennai library',
  },
  {
    slug: 'greensofa-berlin',
    chapter: 'Berlin', tag: 'Steward Notes',
    title: 'Greensofa: a living-room salon, codified',
    dek: 'How a regular dinner became a network ritual \u2014 and the small invariants that kept it from collapsing.',
    author: 'Lena W.', date: 'Jan 2026', read: '7 min',
    photo: 'thumb — berlin apartment salon',
  },
  {
    slug: 'cocoa-cooperatives-onchain',
    chapter: 'C\u00f4te d\u2019Ivoire', tag: 'Onchain Reforestation',
    title: 'Cocoa cooperatives, onchain',
    dek: 'A field report from Abidjan: 14 cooperatives, 1 attestation flow, a lot of patience.',
    author: 'A\u00efcha K.', date: 'Dec 2025', read: '10 min',
    photo: 'thumb — abidjan cooperative',
  },
  {
    slug: 'qf-round-lessons',
    chapter: 'Brasil', tag: 'Public Goods',
    title: 'What a small QF round taught us about consensus',
    dek: 'A $4k round funded twelve projects \u2014 and surfaced disagreements no spreadsheet could.',
    author: 'Rafa S.', date: 'Dec 2025', read: '9 min',
    photo: 'thumb — qf round',
  },
  {
    slug: 'workshop-format-lagos',
    chapter: 'Nigeria', tag: 'Field Report',
    title: 'A workshop format that survived contact with reality',
    dek: 'Two years of iterating on a 90-minute onboarding session for Web3-curious organizers.',
    author: 'Tunde A.', date: 'Nov 2025', read: '7 min',
    photo: 'thumb — lagos workshop',
  },
];

/* Topic spotlight \u2014 editorial highlight on a topic hub. */
const ST_TOPIC_SPOTLIGHT = {
  topic: 'Onchain Reforestation',
  blurb: 'A growing thread of fieldwork from Brasil, C\u00f4te d\u2019Ivoire, and Kenya \u2014 funding, planting, and verifying restoration with cryptoeconomic primitives.',
  stats: [
    { n: '14', l: 'Stories' },
    { n: '6',  l: 'Chapters' },
    { n: '~2,300', l: 'Trees logged' },
  ],
  reads: [
    { t: '200 trees planted onchain in a single weekend.', c: 'Brasil' },
    { t: 'Cocoa cooperatives, onchain', c: 'C\u00f4te d\u2019Ivoire' },
    { t: 'The case for attestation, not certificates', c: 'Kenya' },
  ],
};

/* Recent translations strip on the index. */
const ST_TRANSLATIONS = [
  { title: 'Pathways to Regeneration', langs: ['Hindi', 'Tamil', 'Portugu\u00eas'] },
  { title: '200 trees planted onchain', langs: ['Portugu\u00eas', 'Espa\u00f1ol'] },
  { title: 'Greensofa, codified', langs: ['Deutsch', 'Fran\u00e7ais'] },
];

Object.assign(window, {
  ST_HERO, ST_FEATURED, ST_SUB_FEATURES,
  ST_TOPIC_TAGS, ST_CHAPTER_TAGS, ST_FEED,
  ST_TOPIC_SPOTLIGHT, ST_TRANSLATIONS,
});
