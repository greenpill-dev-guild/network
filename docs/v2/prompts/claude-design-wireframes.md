# Claude Design Prompt — Greenpill Wireframes

Paste the block below into Claude Design as a single prompt.

---

```text
Design VERY low-fidelity wireframes for greenpill.network — a global regenerative network connecting local chapters, builders, and storytellers using web3 tools for real-world impact.

Think Balsamiq, paper sketch, whiteboard mockup. NOT a polished UI. Boxes and labels only. If a screen looks like a real product, you've failed — strip it back.

Style rules (strict):
- Pure grayscale. White background, light-grey filled boxes, mid-grey text. No background patterns, no gradients, no shadows. Rounded corners 4px max.
- All images are dashed-outline rectangles with a short label inside: "[image: Brasil chapter photo]". Never render anything that looks like a real photo.
- All icons are the literal text "[icon]" inside a small box. Do not draw icons.
- Type styling does not matter. Use a default sans, no font choices, no display treatments. Headings are just bigger text. Section labels are small uppercase captions.
- One color exception: primary call-to-action buttons are filled greenpill-green (#C2E812) with dark text, pill-shaped. This is the ONLY color anywhere. Everything else is greyscale.
- Inline red-italic annotations are allowed for interaction notes like "opens modal" or "filter pill, multi-select". They are handoff metadata, not visual design.

What NOT to include:
- No hover states, animations, or transitions visualized.
- No real imagery, stock photos, or illustration.
- No icon sets — just "[icon]" text placeholders.
- No polished spacing or design-system polish.
- No fancy typography, no font pairing.
- No color other than greenpill-green on CTAs.
- No "modern SaaS" feel. This is a structural artifact.

Render every screen at both desktop (1440px) and mobile (375px).

Use these real names so wireframes feel grounded:
- Chapters: Brasil, Kenya, Cape Town, New York City, Denver, Toronto, Côte d'Ivoire, Nigeria, India, Germany.
- Guilds: Dev Guild, Writers Guild.
- Projects: Green Goods, GreenWill.
- Books: Pathways to Regeneration, Ethereum Localism, Grassroots Economics, Onchain Capital Allocation v1, Onchain Capital Allocation v2, Impact DAOs, Onchain Impact Networks, Greenpill v0, MycoFi, Stuff Crypto OGs Know.

Every page shares the same chrome:
- Top nav: wordmark "GREENPILL" left; links right — Chapters, Library, Stories, Garden, Explorer. Mobile: hamburger.
- Compact footer: sitemap column, social column (Discord, Telegram, Twitter, Warpcast, YouTube, GitHub), small colophon.

Deliver six wireframe sets in this order:

---

1) HOME PAGE

Goal: explain Greenpill in five seconds, show the network as a living thing, route visitors to the next step.

Above the fold — a centered vertical stack, full container width, in this exact order top to bottom:
- H1: "A global regenerative network."
- A 2D world map (image placeholder, full width, prominent height) with ~18 chapter pins scattered across five regions.
- One-line subtitle: "Local chapters, builders, and storytellers coordinating real-world impact."
- Primary CTA pill: "+ Add your chapter" — annotation: opens the 3-step modal in set 2.

Band — Chapter Stories:
- Caption "CHAPTERS", H2 "Stories from the network", right-aligned "See all →".
- Bento grid with one large hero tile and three smaller tiles. Each tile: image placeholder, chapter name, one-line story headline, "Read →". Feature these four: Brasil ("200 trees planted onchain in a single weekend"), Kenya ("Grassroots Economics in practice"), Cape Town ("Onchain civic experiments"), NYC ("Public goods funding circle").
- Mobile: tiles stack single-column, hero first.

Band — The Library:
- Caption "LIBRARY", H2 "The Greenpill knowledge commons", right-aligned "Browse the library →".
- Five horizontal category tiles side-by-side: Books, Regen Toolkit, Podcasts, Guilds, Knowledge Gardens. Each has a label, a one-line description, and a "→". The last one shows a status pill "Coming soon" and is greyed out with no link.
- Mobile: tiles stack 2-up then 2-up then 1.

Band — Enter the Garden:
- Caption "PARTICIPATE", H2 "Enter the garden", small line "Meet the network where you are."
- Four entry tiles ordered by friction:
  1. "Stay in the loop" — inline email input + small "Subscribe" CTA.
  2. "Join Telegram" — external link "Open Telegram →".
  3. "Take the Regen Assessment" — CTA "Start".
  4. "Book a steward call" — link "Pick a time →".
- Mobile: tiles stack vertically full-width.

---

2) ADD-YOURSELF MODAL — 3 FRAMES

Modal overlays the home with a dim scrim. Show the home faintly behind as a single light-grey rectangle labeled "[home page, blurred]". No real redraw of the home.

Frame A — Open state:
- Centered modal panel, max 480px desktop / bottom sheet on mobile.
- H2 "Add yourself to the map", subtitle "No account needed. Takes about 30 seconds.", small ✕ top-right.
- One-line body. Primary CTA "Get started" centered.

Frame B — Form state:
- H2 "Where are you?".
- Stacked fields with labels above: City, Country (helper "or pick from list"), Chapter name (placeholder "e.g. Greenpill Lisbon"), Your role (radio: "I'm starting a chapter" / "I'm a regen project" / "I'm just curious"), Contact (optional email, helper "We won't share it.").
- Footer row: text link "← Back" left, Primary CTA "Add me to the map" right.
- Annotation: no auth, no wallet, no captcha. Submission writes a "pending" pin.

Frame C — Success state:
- H2 "You're on the map."
- Image placeholder of the map zoomed to the new pulsing pin.
- Confirmation copy: "Your pin is pending review by a steward — usually within 48 hours. In the meantime, here are 3 ways to start." Followed by three small link rows: "Join the Telegram →", "Read the Greenpill book →", "Find an existing chapter near you →".
- Primary CTA "Done" closes the modal.

---

3) LIBRARY PAGE

Goal: one consolidated page for everything Greenpill has made public — books first.

Top:
- Caption "LIBRARY", H1 "The Greenpill knowledge commons.", one-line description "Books, tools, podcasts, and the work of our guilds. Everything we've made public, in one place."

Filter row:
- Horizontal pills: All, Books (13), Regen Toolkit, Podcasts, Guilds, Knowledge Gardens (soon). Active pill is filled mid-grey. Mobile: pills scroll horizontally.

Desktop layout: 3-col sticky TOC sidebar on the left (jump links: Books, Regen Toolkit, Podcasts, Guilds, Knowledge Gardens — current section highlighted) + 9-col content on the right. Mobile: no sidebar.

Content sections (top to bottom):

Books — H2 "Books", one-line "13 titles. Translated across 10+ languages." Then a 5×2 grid of 10 book covers (each cell: dashed-outline rectangle "[image: book cover — title]", title below, author caption, "Read →"). Use the ten real titles listed at the top of this prompt. Below: small link "See bonus books →". Mobile: grid collapses to 2 columns.

Regen Toolkit — H2 "Regen Toolkit", one-line "Field-tested guides for local action." Three toolkit cards in a row: "Local Regen Playbook", "Chapter Starter Kit", "Steward Handbook". Each: caption "TOOLKIT", title, two-line description, "Open →".

Podcasts — H2 "Greenpill Podcast", one-line "200+ episodes on regenerative web3." Vertical list of 5 recent-episode rows (play icon, title, one-line description, duration, "Listen →"). Below: "Browse all episodes →".

Guilds — H2 "Guilds", one-line "Skill-based working groups." Two cards side-by-side: Dev Guild and Writers Guild. Each: status pill "ACTIVE", title, two-line summary, "Visit guild →".

Knowledge Gardens — H2 with status pill "Coming soon". Single greyed-out card: "Curated knowledge maps coming in V2." No link.

---

4) CHAPTERS INDEX PAGE

Goal: browse all ~18 chapters as a bento/masonry overview. Map is a secondary aid, not the headline.

Top:
- Caption "CHAPTERS", H1 "The local nodes of the Greenpill network.", one-line description "Active and forming chapters across five regions."

Mini-map strip — full-width image placeholder ~160px tall with ~18 pins, no labels. Top-right of strip: small toggle pill "View on map" — annotation: expands to full viewport.

Filter row:
- Region pills (single-select): All, Americas, Africa, Asia, Europe, Oceania.
- Status pills (multi-select, smaller, to the right): Active, Forming.

Featured cards (top of grid) — three large cards, each spanning 2 cols on desktop / full-width on mobile:
1. Greenpill Brasil — image placeholder, caption "CHAPTER · AMERICAS · ACTIVE", title, story headline "200 trees planted onchain in a single weekend.", small steward avatar + name, "Visit chapter →".
2. Greenpill Kenya — same shape, Africa, "Grassroots Economics in practice."
3. Greenpill Cape Town — same shape, Africa, "Onchain civic experiments."

Compact grid — 4 columns desktop / 2 columns mobile — for the remaining chapters (NYC, Denver, California, Toronto, Ottawa, London Ontario, Dominican Republic, Côte d'Ivoire, Nigeria, Uganda, India, Koh Pha-ngan, Germany, Uncommons, Greensofa). Each compact card: caption "CHAPTER · [region] · [status]", name, city, one-line summary. No image.

Bottom band — small section "Don't see your city?", H2, one-line "Start a chapter — we'll help.", Primary CTA "Start a chapter →".

---

5) SINGLE CHAPTER PAGE (use Greenpill Brasil)

Goal: a specific chapter's home — its story, its stewards, its current work, ways to connect.

Sticky breadcrumb just under nav: "← All Chapters".

Hero band:
- Caption "CHAPTER · AMERICAS", H1 "Greenpill Brasil".
- One-line location: "São Paulo, Brazil". Status pill "Active".
- Large image placeholder "[image: chapter hero photo — community gathering]", ~360px desktop / ~200px mobile.
- 2-3 line summary below the image.

Latest from this chapter:
- Caption "STORIES", H2 "Latest from Greenpill Brasil", right link "All stories →".
- Vertical list of 3 story rows. Each: thumb placeholder left, content right (title, one-line excerpt, date, "Read →"). Mobile: thumb above text.

Stewards:
- Caption "STEWARDS", H2 "The people".
- Horizontal row of steward cells (4 visible desktop / horizontal scroll mobile). Each: round avatar placeholder, name, caption role.

Connect:
- Caption "CONNECT", H2 "Where this chapter lives".
- Vertical list of link rows: Telegram, Discord, Workspace, Twitter. Each: small icon, label, "Open →".

CTA strip near the bottom — light-grey band, centered H2 "Join Greenpill Brasil.", subtitle "Stewards will reach out within 48 hours.", Primary CTA "Express interest". Annotation: opens the same modal as "Add your chapter" pre-filled — out of scope this pass.

---

6) GUILD DETAIL PAGE (use Dev Guild)

Goal: a guild's home — distinct from a chapter. Less place, more craft. No hero photo.

Sticky breadcrumb just under nav: "← All Guilds".

Hero band:
- Caption "GUILD · ACTIVE", H1 "Dev Guild".
- One-line purpose: "Building open-source coordination tools for the regenerative network."
- No image. A guild's identity is its work, not a photo.

Mandate:
- Caption "MANDATE", H2 "What the Dev Guild does".
- 3-4 short paragraphs of body prose, single column, max 720px wide. Mobile: full-width.

Projects:
- Caption "PROJECTS", H2 "What we're building", right link "All projects →".
- 2-col card grid (1-col mobile). Cards: Green Goods, GreenWill, plus 2 "[upcoming project placeholder]" cards. Each: caption "PROJECT · ACTIVE", title, two-line summary, small chip row of tech stack, "Visit project →".

Members:
- Caption "MEMBERS", H2 "Who's in the guild".
- Horizontal row of avatar cells (6 visible desktop / horizontal scroll mobile). Each: round avatar, name, caption role. Below row: small "+ 12 more members".

How to join:
- Light-grey filled box, full content width. H2 "How to join the Dev Guild".
- 3 numbered steps in a row (vertical stack on mobile):
  1. "Introduce yourself." One-line, link "Join the Discord →".
  2. "Pick a starter task." One-line, link "View good-first-issues →".
  3. "Ship something small." One-line.
- Below the steps: Primary CTA "Apply to join" centered.

Links:
- Caption "LINKS", H2 "Where the guild lives".
- Vertical list: GitHub, Discord, Workspace, Calls calendar. Each: small icon, label, "Open →".

---

Before you finish, audit each screen:
- Does it look like Balsamiq / a paper sketch, or like a real product? If it looks like a real product, strip styling and regenerate.
- Greenpill-green appears ONLY on primary CTA pills. Nowhere else. No green text, no green borders, no green accents.
- All images are dashed-outline rectangles with descriptive labels. Zero real photos, zero illustrations.
- All icons are "[icon]" text placeholders. Zero drawn icons.
- Every screen exists at desktop (1440px) and mobile (375px).
- The home hero stacks vertically: H1 → 2D map → subtitle → CTA. Full-width, centered. Not a split layout.
- The add-yourself modal has 3 distinct frames (open, form, success).
- Library books are a 5×2 grid on desktop, 2-col on mobile.
- Real chapter, book, guild, and project names appear throughout — no lorem.
- Knowledge Gardens shows as a "Coming soon" placeholder, not a real card.
- No hover states, no animations, no polished spacing. Boxes and labels only.
```
