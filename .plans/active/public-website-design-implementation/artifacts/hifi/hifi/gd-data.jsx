/* hifi/gd-data.jsx — Garden page content.
   The 4-step participation ramp + after-garden cards.
   Stays tight to the wireframe copy, slightly polished for hi-fi. */

const GD_STEPS = [
  {
    n: 1,
    level: 1,
    stage: 'seed',
    levelLabel: 'LOWEST FRICTION',
    kicker: 'Step 1 · Stay in the loop',
    title: 'Subscribe to field notes',
    body: 'A monthly email with stories from chapters, new books, and the best podcast moments. Read in four minutes. Unsubscribe in one click.',
    meta: '~4 min · monthly · no account',
    cta: 'Subscribe',
    surface: 'email',
  },
  {
    n: 2,
    level: 2,
    stage: 'sapling',
    levelLabel: 'LIGHT FRICTION',
    kicker: 'Step 2 · Lurk or chat',
    title: 'Join the Telegram',
    body: 'Daily conversation across chapters, builders, and storytellers. Mostly English. Public — lurk for as long as you like.',
    meta: '~1,200 members · public · 24/7',
    cta: 'Open Telegram',
    surface: 'telegram',
  },
  {
    n: 3,
    level: 3,
    stage: 'budding',
    levelLabel: 'MEDIUM FRICTION',
    kicker: 'Step 3 · Match yourself',
    title: 'Take the Regen Assessment',
    body: 'A twelve-question, ~5-minute self-assessment. We map your answers to a chapter, a guild, and a recommended next step. No account required.',
    meta: '~5 min · 12 questions · anonymous',
    cta: 'Start assessment',
    surface: 'assessment',
  },
  {
    n: 4,
    level: 4,
    stage: 'flowering',
    levelLabel: 'HIGHEST FRICTION',
    kicker: 'Step 4 · Human-to-human',
    title: 'Book a steward call',
    body: 'Thirty minutes with a rotating steward. Best for people thinking about starting a chapter, joining a guild, or partnering on a regen project.',
    meta: '30 min · 1-on-1 · rotating stewards',
    cta: 'Book a call',
    surface: 'steward',
  },
];

const GD_AFTER = [
  {
    kicker: 'If you…',
    title: 'Want to join an existing chapter',
    body: 'Browse chapters by region or skill. Get connected with the local steward who runs it.',
    link: 'Find a chapter',
    href: 'Chapters (Hi-Fi).html',
  },
  {
    kicker: 'If you…',
    title: 'Want to start a new chapter',
    body: 'Add yourself to the map, then work through the Chapter Starter Kit with a steward.',
    link: 'Start a chapter',
    href: '#',
  },
  {
    kicker: 'If you…',
    title: 'Want to contribute a skill',
    body: 'Join a Guild — Dev, Writers, or GreenSci. Pick a starter task and ship in week one.',
    link: 'Visit guilds',
    href: '#',
  },
];

/* Mock copy for the four step surfaces — kept here so the bits file
   stays presentational. */

const GD_EMAIL_PREVIEW = {
  meta: 'Field Notes · March 2026',
  headline: 'Three chapters, one bioregion',
  excerpt: 'How LATAM·Brasil, LATAM·Bolivia, and Andes·Peru ran a shared funding round across watershed lines — and what they\'re trying next.',
  readers: '3,400 readers across 5 continents',
};

const GD_TELEGRAM_MESSAGES = [
  { who: 'Camila · LATAM·Brasil', t: 'New QF round opens Monday — anyone want to co-host the writeup?', when: '14:02' },
  { who: 'Tom · Dev Guild',        t: 'PR up for the Karma GAP integration. Reviews welcome.', when: '14:18' },
  { who: 'Lena · Berlin',          t: 'Greensofa #14 happening Thursday — RSVP in thread.', when: '14:24' },
  { who: 'Devansh · Bengaluru',    t: 'Translating the Owocki keynote to Kannada. Need 2 reviewers.', when: '14:31' },
];

const GD_ASSESSMENT_OPTIONS = [
  { label: 'Climate',              active: true  },
  { label: 'Local economy',        active: false },
  { label: 'Public goods',         active: true  },
  { label: 'Food sovereignty',     active: false },
  { label: 'Bioregions',           active: false },
  { label: 'Soil & water',         active: false },
  { label: 'Indigenous knowledge', active: false },
  { label: 'Onchain coordination', active: true  },
];

const GD_STEWARD_SLOTS = [
  { d: 'Mon', t: '09:00' },
  { d: 'Mon', t: '14:00' },
  { d: 'Wed', t: '10:00', active: true },
  { d: 'Wed', t: '16:00' },
  { d: 'Thu', t: '09:00' },
  { d: 'Thu', t: '13:00' },
  { d: 'Fri', t: '10:00' },
  { d: 'Fri', t: '15:00' },
];

const GD_STEWARD_PROFILE = {
  name: 'Camila R.',
  region: 'Brasil',
  topics: 'Regen funding · chapter ops',
  rotation: 'Mar 14–20',
  initials: 'CR',
};

Object.assign(window, {
  GD_STEPS, GD_AFTER,
  GD_EMAIL_PREVIEW, GD_TELEGRAM_MESSAGES,
  GD_ASSESSMENT_OPTIONS, GD_STEWARD_SLOTS, GD_STEWARD_PROFILE,
});
