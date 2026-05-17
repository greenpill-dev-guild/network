/* hifi/gld-data.jsx — Guild Detail content for the Dev Guild. */

const GLD_GUILD = {
  slug: 'dev',
  name: 'Dev Guild',
  kind: 'GUILD',
  status: 'ACTIVE',
  founded: 2023,
  oneliner: 'Building open-source coordination tools for the regenerative network.',
  /* What the guild builds — used by the diagram hero & as labels. */
  outputs: [
    { label: 'Funding tools',          glyph: 'FN' },
    { label: 'Reputation primitives',  glyph: 'RP' },
    { label: 'Attestation flows',      glyph: 'AT' },
    { label: 'Public surfaces',        glyph: 'PS' },
  ],
  /* Two-paragraph mandate copy, kept close to the wireframe voice. */
  mandate1: 'The Dev Guild is the engineering arm of Greenpill Network. We design and ship the open-source software that lets chapters coordinate without intermediaries — funding tools, reputation primitives, attestation flows, and the public-facing surfaces of the network.',
  mandate2: 'We work in small, autonomous strike teams. Most projects are seeded by a single chapter and then opened up to the wider guild. We default to public — every repo, every issue, every retrospective.',
  mandate3: 'Where existing tools already do the job (Gitcoin, Allo, EAS, Safe), we integrate rather than rebuild.',
  /* Photo placeholder caption, used by hero variants that show an image. */
  heroPhoto: 'working session — Dev Guild at ETHDenver',
};

/* ───── Stats — for the stat-strip hero ───── */
const GLD_STATS = [
  { big: '14',  sub: 'Active repos' },
  { big: '42',  sub: 'Contributors' },
  { big: '186', sub: 'Merged PRs · YTD' },
  { big: '11',  sub: 'Chapters using tools' },
];

/* ───── Projects ─────
   Keeping the wireframe's two + the user-supplied PGSP + one placeholder so the
   2-up grid stays visually balanced at 2×2. */
const GLD_PROJECTS = [
  {
    t: 'Green Goods',
    short: 'GG',
    d: 'Onchain marketplace for verified regenerative goods. EAS-backed product attestations, chapter-scoped storefronts.',
    tech: ['Solidity', 'Next.js', 'EAS'],
    status: 'ACTIVE',
    lead: 'Asha P.',
  },
  {
    t: 'GreenWill',
    short: 'GW',
    d: 'Legacy & estate tooling for regen donors — programmable bequests routed to chapter-curated public goods.',
    tech: ['Foundry', 'Safe', 'GraphQL'],
    status: 'ACTIVE',
    lead: 'Nia K.',
  },
  {
    t: 'Public Goods Staking Protocol',
    short: 'PGSP',
    d: 'Staked yield streamed to chapter-curated funding rounds. Solves the cold-start problem for new QF pools.',
    tech: ['Solidity', 'Reth', 'wagmi'],
    status: 'ACTIVE',
    lead: 'Rafa O.',
  },
  {
    t: 'Upcoming project',
    short: '··',
    d: 'Two-line summary will go here once the strike team is staffed.',
    tech: ['TBD', 'TBD'],
    status: 'UPCOMING',
    lead: null,
  },
];

/* ───── Members ─────
   Wireframe set, with a couple of extra fields (focus, chapter) so the
   hi-fi card has somewhere to put a little more texture. */
const GLD_MEMBERS = [
  { name: 'Asha P.',  role: 'Solidity',         chapter: 'Lagos'    },
  { name: 'Tom W.',   role: 'Frontend',         chapter: 'Berlin'   },
  { name: 'Nia K.',   role: 'Smart Contracts',  chapter: 'Nairobi'  },
  { name: 'Jules H.', role: 'Design Eng',       chapter: 'Bristol'  },
  { name: 'Rafa O.',  role: 'Protocol Research',chapter: 'São Paulo'},
  { name: 'Eva M.',   role: 'DevOps',           chapter: 'Lisbon'   },
];

const GLD_MEMBER_MORE = 12;

/* ───── How we work — cadence + principles ───── */
const GLD_CADENCE = {
  call: 'Wednesdays · 16:00 UTC',
  format: 'Google Meet · open to all',
  recordings: 'Posted to YouTube within 24h',
};

const GLD_PRINCIPLES = [
  {
    n: '01',
    t: 'Public by default',
    d: 'Every repo is open-source, every issue is public, every retrospective is posted. If you can read GitHub, you can follow along.',
  },
  {
    n: '02',
    t: 'Async-first',
    d: 'Decisions happen in writing — RFCs in Charmverse, design discussion in GitHub, status async in Telegram. The weekly call is for ambiguity, not status.',
  },
  {
    n: '03',
    t: 'Strike teams',
    d: 'Small, autonomous teams (2–5 people) ship a project end-to-end. Most teams form around a chapter need, then open up to the wider guild.',
  },
  {
    n: '04',
    t: 'Integrate before rebuild',
    d: 'Where Gitcoin, Allo, EAS, or Safe already solve the problem, we integrate. We only build new primitives when the network genuinely lacks one.',
  },
];

/* ───── Connect — where the guild lives ───── */
const GLD_LINKS = [
  { label: 'GitHub',                  sub: 'greenpill-dev-guild',        handle: 'Visit org',          glyph: 'GH' },
  { label: 'Telegram',                sub: '#dev-guild',                 handle: 'Join channel',       glyph: 'TG' },
  { label: 'Workspace · Charmverse',  sub: 'RFCs, proposals, retros',    handle: 'Open workspace',     glyph: 'CV' },
  { label: 'Weekly call',             sub: 'Wed 16:00 UTC · open',       handle: 'Add to calendar',    glyph: 'CAL' },
  { label: 'Good-first-issues',       sub: 'Across all active repos',    handle: 'Browse',             glyph: 'GI' },
];

Object.assign(window, {
  GLD_GUILD, GLD_STATS, GLD_PROJECTS,
  GLD_MEMBERS, GLD_MEMBER_MORE,
  GLD_CADENCE, GLD_PRINCIPLES, GLD_LINKS,
});
