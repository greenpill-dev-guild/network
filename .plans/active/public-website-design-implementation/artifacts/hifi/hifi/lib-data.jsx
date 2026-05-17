/* hifi/lib-data.jsx — content for the hi-fi Library page.
   Same content shape as the wireframe so we can compare directly. */

const HF_BOOKS = [
  { t: 'Pathways to Regeneration',    a: 'Various Authors',        y: 2024, pages: 312 },
  { t: 'Ethereum Localism',           a: 'Vivek Singh & co.',      y: 2024, pages: 184 },
  { t: 'Grassroots Economics',        a: 'Will Ruddick',           y: 2023, pages: 240 },
  { t: 'Onchain Capital Allocation',  a: 'Kevin Owocki',           y: 2023, pages: 196, edition: 'v1' },
  { t: 'Onchain Capital Allocation',  a: 'Kevin Owocki',           y: 2024, pages: 224, edition: 'v2' },
  { t: 'Impact DAOs',                 a: 'Kevin Owocki',           y: 2022, pages: 168 },
  { t: 'Onchain Impact Networks',     a: 'Various Authors',        y: 2024, pages: 280 },
  { t: 'GreenPilled',                 a: 'Kevin Owocki',           y: 2022, pages: 256 },
  { t: 'MycoFi',                      a: 'Jeff Emmett',            y: 2023, pages: 144 },
  { t: 'Stuff Crypto OGs Know',       a: 'Various Authors',        y: 2024, pages: 208 },
];

const HF_FEATURE_EP = {
  n: 218, t: 'Onchain Impact Networks',
  g: 'Kevin Owocki & guests',
  dur: '58:14',
  age: '2 days ago',
  blurb: 'How regenerative funding flows from public goods to bioregional outcomes — and the protocols that make it legible.',
};

const HF_EPS = [
  { n: 217, t: 'Grassroots Economics in Kenya',     g: 'Will Ruddick',          dur: '62m', age: '1 week ago' },
  { n: 216, t: 'Localism, properly',                g: 'Vivek Singh',           dur: '49m', age: '2 weeks ago' },
  { n: 215, t: 'Stewarding a chapter',              g: 'Brasil & Cape Town',    dur: '71m', age: '3 weeks ago' },
  { n: 214, t: 'Allo Capital, end-to-end',          g: 'Kevin Owocki',          dur: '54m', age: '1 month ago' },
  { n: 213, t: 'MycoFi & living systems',           g: 'Jeff Emmett',           dur: '66m', age: '5 weeks ago' },
];

/* richer fields for the bento cards */
const HF_GUILD_DETAILS = {
  'Dev Guild':     { lead: 'Kevin Owocki', projects: 6 },
  'Writers Guild': { lead: 'Editorial circle', projects: 4 },
  'GreenSci':      { lead: 'Jeff Emmett', projects: 3 },
};
const HF_GARDEN_DETAILS = {
  'Local Regen Playbook': { read: '~2h read', updated: 'Updated 3d ago',  authors: 6, topics: ['Funding','Soil','Stewardship'] },
  'Chapter Starter Kit':  { read: '~45m read', updated: 'Updated 2w ago', authors: 4, topics: ['Onboarding','Rituals'] },
  'Steward Handbook':     { read: '~1h read', updated: 'Updated 1mo ago', authors: 5, topics: ['Ops','Conflict','Care'] },
};

const HF_GUILDS = [
  {
    t: 'Dev Guild',
    d: 'Building open-source coordination tools for the regenerative network.',
    m: 18, status: 'Active', featured: true,
    tags: ['Open source', 'Coordination'],
  },
  {
    t: 'Writers Guild',
    d: 'Stories, translations, longform research from the field.',
    m: 12, status: 'Active',
    tags: ['Editorial'],
  },
  {
    t: 'GreenSci',
    d: 'Open regenerative science — protocols, datasets, peer review.',
    m: 9, status: 'Active',
    tags: ['DeSci'],
  },
];

const HF_GARDEN = [
  {
    t: 'Local Regen Playbook',
    d: 'How to coordinate a real-world regenerative project end-to-end — from steward to soil.',
    chapters: 14, featured: true,
  },
  {
    t: 'Chapter Starter Kit',
    d: 'Everything you need to launch a Greenpill chapter in your city.',
    chapters: 8,
  },
  {
    t: 'Steward Handbook',
    d: 'Norms, rituals, and operating practices for chapter stewards.',
    chapters: 11,
  },
];

Object.assign(window, { HF_BOOKS, HF_FEATURE_EP, HF_EPS, HF_GUILDS, HF_GARDEN, HF_GUILD_DETAILS, HF_GARDEN_DETAILS });
