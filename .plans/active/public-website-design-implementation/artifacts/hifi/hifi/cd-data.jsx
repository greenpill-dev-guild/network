/* hifi/cd-data.jsx — Chapter Detail content for Greenpill Nigeria. */

const CD_CHAPTER = {
  slug: 'nigeria',
  name: 'Greenpill Nigeria',
  region: 'AFRICA',
  status: 'ACTIVE',
  city: 'Lagos, Nigeria',
  founded: 2023,
  /* coordinates for the in-page location map */
  lat: 6.5,
  lng: 3.4,
  hero: 'community gathering — Yaba, Lagos',
  intro: "Greenpill Nigeria is a community of Web3 onboarders, public-goods funders, and storytellers across Lagos, Abuja, and Port Harcourt. We run open salons every Saturday, coordinate quadratic-funding rounds for grassroots builders, and translate regenerative-economics resources into Yoruba, Igbo, and Hausa.",
  introQuote: `"We're onboarding the next million Africans to Web3 — through public goods, not speculation."`,
  introQuoteBy: 'Adaeze N. · Lead Steward',
};

/* ───── Stats — at-a-glance header ───── */
const CD_STATS = [
  { big: '218', sub: 'Members' },
  { big: '12',  sub: 'Stewards' },
  { big: '34',  sub: 'Stories' },
  { big: '2023', sub: 'Founded' },
];

/* ───── Stewards ───── */
const CD_STEWARDS = [
  { name: 'Adaeze N.', role: 'Lead Steward',     bio: 'Public-goods researcher; ex-Gitcoin.',    location: 'Lagos' },
  { name: 'Tunde A.',  role: 'Onchain Ops',      bio: 'Smart-contract dev; runs QF rounds.',     location: 'Abuja' },
  { name: 'Ifeoma O.', role: 'Storytelling',     bio: 'Documentary filmmaker; YouTube lead.',    location: 'Lagos' },
  { name: 'Bola K.',   role: 'Partnerships',     bio: 'Connects DAOs to civic orgs.',            location: 'Port Harcourt' },
  { name: 'Chidi M.',  role: 'Translations',     bio: 'Igbo & English; ex-publishing.',          location: 'Enugu' },
  { name: 'Ngozi U.',  role: 'Community',        bio: 'Hosts the Saturday Salons.',              location: 'Lagos' },
];

/* ───── Stories (via Karma GAP) ───── */
const CD_STORIES = [
  {
    title: 'Onboarding 200 first-time Web3 users in Yaba',
    blurb: 'A weekend-long onboarding salon in collaboration with Lagos Hardware Library — wallets, public-goods, and a live QF round.',
    photo: 'yaba onboarding salon · feb 2026',
    date: 'Mar 2026',
    tag: 'IMPACT REPORT',
    metric: '200 onboarded',
  },
  {
    title: 'Translating GreenPilled into Yoruba',
    blurb: 'Open call: 6 contributors, 10 weeks, peer-reviewed by the Writers Guild. First-ever African-language edition.',
    photo: 'translation workshop · lagos',
    date: 'Feb 2026',
    tag: 'STORY',
    metric: '6 contributors',
  },
  {
    title: 'A neighbourhood QF round in Port Harcourt',
    blurb: 'Quadratic funding for local public goods — community gardens, mobile libraries, a women-in-Web3 cohort.',
    photo: 'qf round announcement',
    date: 'Jan 2026',
    tag: 'IMPACT REPORT',
    metric: '₦4.2M distributed',
  },
  {
    title: 'Webcrypto vs Cashback: A Lagos field study',
    blurb: 'How 30 Lagos merchants used onchain rewards vs traditional cashback — early data, mixed lessons.',
    photo: 'lagos market field study',
    date: 'Dec 2025',
    tag: 'RESEARCH',
    metric: '30 merchants',
  },
];

/* ───── Upcoming events ───── */
const CD_EVENTS = [
  {
    when: 'Sat 25 May',
    time: '14:00 WAT',
    title: 'Saturday Salon · Public-goods funding 101',
    where: 'Hardware Library, Yaba',
    rsvp: 18,
    cap: 30,
    kind: 'IRL',
  },
  {
    when: 'Tue 04 Jun',
    time: '18:00 WAT',
    title: 'QF Round · open call review',
    where: 'Zoom · members only',
    rsvp: 44,
    cap: null,
    kind: 'Online',
  },
  {
    when: 'Sat 15 Jun',
    time: '10:00 WAT',
    title: 'Steward Day · Abuja chapter retreat',
    where: 'Wuse II, Abuja',
    rsvp: 7,
    cap: 12,
    kind: 'IRL',
  },
];

/* ───── Library — what this chapter has authored / translated ───── */
const CD_LIBRARY = [
  { t: 'GreenPilled · Yoruba edition', a: 'Owocki, K. (tr. Chidi M.)', y: 2026, kind: 'BOOK', tag: 'Translation' },
  { t: 'Public-goods 101 — onboarding deck', a: 'Greenpill Nigeria',     y: 2025, kind: 'DECK', tag: 'Resource' },
  { t: 'Field notes from a Port Harcourt QF round', a: 'Adaeze N.',      y: 2026, kind: 'NOTE', tag: 'Research' },
];

/* ───── Connect links — where this chapter coordinates ───── */
const CD_LINKS = [
  { label: 'Telegram',                 sub: '@greenpill_ng',            handle: 'Join the channel',     glyph: 'TG' },
  { label: 'Workspace · Charmverse',    sub: 'Stewards & guild rooms',   handle: 'Open workspace',       glyph: 'CV' },
  { label: 'Twitter / X',               sub: '@greenpill_ng',            handle: 'Follow',               glyph: 'X'  },
  { label: 'Karma GAP',                 sub: 'Impact reports',           handle: 'View reports',         glyph: 'KG' },
  { label: 'YouTube',                   sub: 'Saturday Salon recordings',handle: 'Watch',                glyph: 'YT' },
  { label: 'Email',                     sub: 'lagos@greenpill.network',  handle: 'Send a message',       glyph: '@'  },
];

/* ───── Related chapters in same region ───── */
const CD_RELATED = ['civoire', 'kenya', 'cape-town', 'uganda'];

Object.assign(window, {
  CD_CHAPTER, CD_STATS, CD_STEWARDS, CD_STORIES, CD_EVENTS,
  CD_LIBRARY, CD_LINKS, CD_RELATED,
});
