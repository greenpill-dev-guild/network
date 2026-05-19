import { config, fields, collection, singleton } from '@keystatic/core';

const stewardField = fields.array(
  fields.object({
    name: fields.text({ label: 'Name' }),
    role: fields.text({ label: 'Role' }),
    bio: fields.text({ label: 'Public Bio', multiline: true }),
    location: fields.text({ label: 'Public Location' }),
    personSlug: fields.text({ label: 'Person Slug' }),
    chapterSlug: fields.text({ label: 'Chapter Slug' }),
    avatar: fields.text({ label: 'Avatar Path' }),
    wallet: fields.text({ label: 'Wallet (optional)' }),
  }),
  { label: 'Stewards', itemLabel: (props) => props.fields.name.value },
);

const linkItemField = fields.object({
  label: fields.text({ label: 'Label' }),
  url: fields.text({ label: 'URL or Path' }),
  subtext: fields.text({ label: 'Card Subtext' }),
  handle: fields.text({ label: 'Handle or Detail' }),
  action: fields.text({ label: 'Action Label' }),
  icon: fields.text({ label: 'Icon Key' }),
  kind: fields.select({
    label: 'Kind',
    options: [
      { label: 'Internal', value: 'internal' },
      { label: 'External', value: 'external' },
      { label: 'Email', value: 'email' },
      { label: 'Form', value: 'form' },
      { label: 'Booking', value: 'booking' },
      { label: 'Social', value: 'social' },
    ],
    defaultValue: 'external',
  }),
});

const linkField = fields.array(
  linkItemField,
  { label: 'Links', itemLabel: (props) => props.fields.label.value },
);

const connectLinkCardsField = fields.array(
  linkItemField,
  { label: 'Connect Link Cards', itemLabel: (props) => props.fields.label.value },
);

const slugListField = (label: string, itemLabel = 'Slug') => fields.array(
  fields.text({ label: itemLabel }),
  { label, itemLabel: (props) => props.value },
);

const seoField = fields.object({
  title: fields.text({ label: 'SEO Title' }),
  description: fields.text({ label: 'SEO Description', multiline: true }),
  ogImage: fields.text({ label: 'OG Image Path' }),
  canonicalPath: fields.text({ label: 'Canonical Path' }),
  noindex: fields.checkbox({ label: 'Noindex', defaultValue: false }),
}, { label: 'SEO' });

const mediaField = fields.object({
  image: fields.text({ label: 'Primary Image Path' }),
  imageAlt: fields.text({ label: 'Primary Image Alt Text' }),
  ogImage: fields.text({ label: 'OG Image Path' }),
}, { label: 'Media' });

const ctaField = fields.object({
  label: fields.text({ label: 'Label' }),
  href: fields.text({ label: 'URL or Path' }),
  kind: fields.select({
    label: 'Kind',
    options: [
      { label: 'Internal', value: 'internal' },
      { label: 'External', value: 'external' },
      { label: 'Email', value: 'email' },
      { label: 'Form', value: 'form' },
      { label: 'Booking', value: 'booking' },
    ],
    defaultValue: 'internal',
  }),
}, { label: 'CTA' });

const proofSignalsField = fields.array(
  fields.object({
    label: fields.text({ label: 'Label' }),
    value: fields.text({ label: 'Value' }),
    source: fields.text({ label: 'Source' }),
    href: fields.text({ label: 'Proof URL or Path' }),
  }),
  { label: 'Proof Signals', itemLabel: (props) => props.fields.label.value },
);

const translationsField = fields.array(
  fields.object({
    language: fields.text({ label: 'Language' }),
    label: fields.text({ label: 'Display Label' }),
    href: fields.text({ label: 'URL or Path' }),
    slug: fields.text({ label: 'Related Entry Slug' }),
  }),
  { label: 'Translations', itemLabel: (props) => props.fields.language.value },
);

const publicPersonRefsField = fields.array(
  fields.object({
    personSlug: fields.text({ label: 'Person Slug' }),
    name: fields.text({ label: 'Fallback Name' }),
    role: fields.text({ label: 'Public Role' }),
    bio: fields.text({ label: 'Public Bio', multiline: true }),
    location: fields.text({ label: 'Public Location' }),
    chapterSlug: fields.text({ label: 'Chapter Slug' }),
    avatar: fields.text({ label: 'Avatar Path' }),
  }),
  { label: 'Public Members', itemLabel: (props) => props.fields.personSlug.value || props.fields.name.value },
);

const libraryCardField = fields.object({
  eyebrow: fields.text({ label: 'Eyebrow' }),
  title: fields.text({ label: 'Card Title Override' }),
  summary: fields.text({ label: 'Card Summary Override', multiline: true }),
  badge: fields.text({ label: 'Badge' }),
  surfaceType: fields.select({
    label: 'Surface Type',
    options: [
      { label: 'Book', value: 'book' },
      { label: 'Podcast', value: 'podcast' },
      { label: 'Playbook', value: 'playbook' },
      { label: 'Garden', value: 'garden' },
      { label: 'Tool', value: 'tool' },
      { label: 'Article', value: 'article' },
      { label: 'Video', value: 'video' },
      { label: 'External', value: 'external' },
    ],
    defaultValue: 'external',
  }),
  image: fields.text({ label: 'Card Image Path' }),
  imageAlt: fields.text({ label: 'Card Image Alt Text' }),
  href: fields.text({ label: 'Card URL or Path' }),
}, { label: 'Library / Garden Card Metadata' });

const featuredRefsField = fields.array(
  fields.object({
    collection: fields.select({
      label: 'Collection',
      options: [
        { label: 'Chapters', value: 'chapters' },
        { label: 'Guilds', value: 'guilds' },
        { label: 'Projects', value: 'projects' },
        { label: 'Stories', value: 'stories' },
        { label: 'Resources', value: 'resources' },
        { label: 'Books', value: 'books' },
      ],
      defaultValue: 'chapters',
    }),
    slug: fields.text({ label: 'Slug' }),
    label: fields.text({ label: 'Display Label' }),
  }),
  { label: 'Featured References', itemLabel: (props) => props.fields.slug.value },
);

const pageHeroField = fields.object({
  overline: fields.text({ label: 'Overline' }),
  title: fields.text({ label: 'Title' }),
  dek: fields.text({ label: 'Dek / Subtitle', multiline: true }),
  body: fields.text({ label: 'Body Copy', multiline: true }),
  primaryCta: ctaField,
  secondaryCta: ctaField,
  media: mediaField,
}, { label: 'Hero' });

const pageSectionField = fields.array(
  fields.object({
    key: fields.text({ label: 'Section Key' }),
    overline: fields.text({ label: 'Overline' }),
    title: fields.text({ label: 'Title' }),
    dek: fields.text({ label: 'Dek / Subtitle', multiline: true }),
    body: fields.text({ label: 'Body Copy', multiline: true }),
    cta: ctaField,
    featuredRefs: featuredRefsField,
  }),
  { label: 'Editable Page Sections', itemLabel: (props) => props.fields.key.value || props.fields.title.value },
);

const previewCardField = fields.object({
  kicker: fields.text({ label: 'Kicker' }),
  title: fields.text({ label: 'Title' }),
  body: fields.text({ label: 'Body', multiline: true }),
  meta: fields.text({ label: 'Meta' }),
  image: fields.text({ label: 'Image Path' }),
  imageAlt: fields.text({ label: 'Image Alt Text' }),
  cta: ctaField,
}, { label: 'Preview Card' });

const impactSourcesField = fields.object({
  impactEnabled: fields.checkbox({
    label: 'Show Impact Feed',
    defaultValue: false,
    description: 'Enable only after at least one public impact source is mapped.',
  }),
  greenGoodsGardenAddress: fields.text({
    label: 'Green Goods Garden Address',
    description: 'Public garden contract address, e.g. 0x...',
  }),
  greenGoodsChainId: fields.number({
    label: 'Green Goods Chain ID',
    defaultValue: 42161,
    description: 'Arbitrum is 42161.',
  }),
  karmaProjectUID: fields.text({
    label: 'KarmaGAP Project UID',
    description: 'Optional 0x project UID from KarmaGAP.',
  }),
  karmaProjectSlug: fields.text({
    label: 'KarmaGAP Project Slug',
    description: 'Optional public project slug from KarmaGAP.',
  }),
  karmaCommunitySlug: fields.text({
    label: 'KarmaGAP Community Slug',
    description: 'Optional community slug for aggregate impact endpoints.',
  }),
}, { label: 'Impact Sources' });

const regionOptions = [
  { label: 'Americas', value: 'americas' },
  { label: 'Africa', value: 'africa' },
  { label: 'Asia', value: 'asia' },
  { label: 'Europe', value: 'europe' },
  { label: 'Oceania', value: 'oceania' },
];

const entityStatusOptions = [
  { label: 'Active', value: 'active' },
  { label: 'Forming', value: 'forming' },
  { label: 'Inactive', value: 'inactive' },
];

const projectStatusOptions = [
  { label: 'Active', value: 'active' },
  { label: 'Beta', value: 'beta' },
  { label: 'Experimental', value: 'experimental' },
  { label: 'Archived', value: 'archived' },
];

const storyCategoryOptions = [
  { label: 'Chapter Update', value: 'chapter' },
  { label: 'Guild Update', value: 'guild' },
  { label: 'Program Update', value: 'program' },
  { label: 'Essay', value: 'essay' },
  { label: 'Field Report', value: 'field-report' },
];

const publicationStatusOptions = [
  { label: 'Draft', value: 'draft' },
  { label: 'Published', value: 'published' },
  { label: 'Archived', value: 'archived' },
];

const resourceKindOptions = [
  { label: 'Book', value: 'book' },
  { label: 'Podcast', value: 'podcast' },
  { label: 'Guide', value: 'guide' },
  { label: 'Tool', value: 'tool' },
  { label: 'Deck', value: 'deck' },
  { label: 'Article', value: 'article' },
  { label: 'Video', value: 'video' },
  { label: 'External', value: 'external' },
];

const resourceStatusOptions = publicationStatusOptions;

export default config({
  storage: { kind: 'local' },

  collections: {
    themes: collection({
      label: 'Themes',
      slugField: 'name',
      path: 'src/content/themes/*',
      format: { data: 'json' },
      columns: ['sortOrder'],
      schema: {
        name: fields.slug({ name: { label: 'Theme Name' } }),
        summary: fields.text({ label: 'Summary', multiline: true }),
        sortOrder: fields.number({ label: 'Sort Order', defaultValue: 0 }),
      },
    }),

    people: collection({
      label: 'People & Stewards',
      slugField: 'displayName',
      path: 'src/content/people/*',
      format: { data: 'json' },
      schema: {
        displayName: fields.slug({ name: { label: 'Display Name' } }),
        role: fields.text({ label: 'Public Role' }),
        avatar: fields.text({ label: 'Avatar Path' }),
        bio: fields.text({ label: 'Public Bio', multiline: true }),
        themeSlugs: slugListField('Public Theme Slugs', 'Theme Slug'),
        links: linkField,
        media: mediaField,
        seo: seoField,
      },
    }),

    chapters: collection({
      label: 'Chapters',
      slugField: 'name',
      path: 'src/content/chapters/*',
      format: { data: 'json' },
      schema: {
        name: fields.slug({ name: { label: 'Chapter Name' } }),
        city: fields.text({ label: 'City' }),
        country: fields.text({ label: 'Country' }),
        region: fields.select({ label: 'Region', options: regionOptions, defaultValue: 'americas' }),
        status: fields.select({ label: 'Status', options: entityStatusOptions, defaultValue: 'active' }),
        summary: fields.text({ label: 'Summary', multiline: true }),
        introQuote: fields.text({ label: 'Intro Quote', multiline: true }),
        introQuoteAttribution: fields.text({ label: 'Intro Quote Attribution' }),
        image: fields.text({ label: 'Image Path' }),
        founded: fields.text({ label: 'Founded (year)' }),
        lat: fields.number({ label: 'Latitude', validation: { isRequired: true } }),
        long: fields.number({ label: 'Longitude', validation: { isRequired: true } }),
        link: fields.url({ label: 'Primary Link (legacy / external)' }),
        stewards: stewardField,
        stewardSlugs: slugListField('Reusable Steward Slugs', 'Person Slug'),
        themeSlugs: slugListField('Theme Slugs', 'Theme Slug'),
        links: linkField,
        connectLinks: connectLinkCardsField,
        relatedChapterSlugs: slugListField('Related Chapter Slugs', 'Chapter Slug'),
        featuredStory: fields.object({
          storySlug: fields.text({ label: 'Story Slug' }),
          headline: fields.text({ label: 'Headline Override' }),
          blurb: fields.text({ label: 'Blurb Override', multiline: true }),
          image: fields.text({ label: 'Image Path' }),
          imageAlt: fields.text({ label: 'Image Alt Text' }),
        }, { label: 'Featured Story Card' }),
        featuredStorySlugs: slugListField('Featured Story Slugs', 'Story Slug'),
        authoredResourceSlugs: slugListField('Chapter-authored Resource Slugs', 'Resource Slug'),
        impactSources: impactSourcesField,
        featuredWeight: fields.number({ label: 'Featured Weight', defaultValue: 0 }),
        proofSignals: proofSignalsField,
        media: mediaField,
        seo: seoField,
      },
    }),

    guilds: collection({
      label: 'Guilds & Pods',
      slugField: 'name',
      path: 'src/content/guilds/*',
      format: { data: 'json' },
      schema: {
        name: fields.slug({ name: { label: 'Guild Name' } }),
        type: fields.select({
          label: 'Type',
          options: [
            { label: 'Guild', value: 'guild' },
            { label: 'Pod', value: 'pod' },
          ],
          defaultValue: 'guild',
        }),
        status: fields.select({ label: 'Status', options: entityStatusOptions, defaultValue: 'active' }),
        summary: fields.text({ label: 'Summary' }),
        description: fields.text({ label: 'Description', multiline: true }),
        foundedYear: fields.number({ label: 'Founded Year' }),
        oneliner: fields.text({ label: 'Public Oneliner' }),
        outputs: fields.array(
          fields.object({
            label: fields.text({ label: 'Output Label' }),
            summary: fields.text({ label: 'Summary', multiline: true }),
            href: fields.text({ label: 'URL or Path' }),
          }),
          { label: 'Outputs', itemLabel: (props) => props.fields.label.value },
        ),
        mandateParagraphs: fields.array(
          fields.text({ label: 'Paragraph', multiline: true }),
          { label: 'Mandate Paragraphs', itemLabel: (props) => props.value },
        ),
        cadence: fields.object({
          summary: fields.text({ label: 'Cadence Summary', multiline: true }),
          callTime: fields.text({ label: 'Call Time' }),
          format: fields.text({ label: 'Format' }),
          recordingsHref: fields.text({ label: 'Recordings URL or Path' }),
        }, { label: 'Cadence' }),
        principles: fields.array(
          fields.object({
            order: fields.number({ label: 'Order', defaultValue: 0 }),
            title: fields.text({ label: 'Title' }),
            body: fields.text({ label: 'Body', multiline: true }),
          }),
          { label: 'Principles', itemLabel: (props) => props.fields.title.value },
        ),
        image: fields.text({ label: 'Image Path' }),
        stewards: stewardField,
        stewardSlugs: slugListField('Reusable Steward Slugs', 'Person Slug'),
        memberSlugs: slugListField('Public Member Slugs', 'Person Slug'),
        publicMembers: publicPersonRefsField,
        themeSlugs: slugListField('Theme Slugs', 'Theme Slug'),
        links: linkField,
        connectLinks: connectLinkCardsField,
        featuredWeight: fields.number({ label: 'Featured Weight', defaultValue: 0 }),
        proofSignals: proofSignalsField,
        media: mediaField,
        seo: seoField,
      },
    }),

    projects: collection({
      label: 'Projects & Protocols',
      slugField: 'name',
      path: 'src/content/projects/*',
      format: { data: 'json' },
      schema: {
        name: fields.slug({ name: { label: 'Project Name' } }),
        status: fields.select({ label: 'Status', options: projectStatusOptions, defaultValue: 'active' }),
        guild: fields.text({ label: 'Guild (slug or name)' }),
        summary: fields.text({ label: 'Summary' }),
        description: fields.text({ label: 'Description', multiline: true }),
        image: fields.text({ label: 'Image Path' }),
        techStack: fields.array(fields.text({ label: 'Tech' }), {
          label: 'Tech Stack',
          itemLabel: (props) => props.value,
        }),
        repoUrl: fields.url({ label: 'Repository URL' }),
        liveUrl: fields.url({ label: 'Live URL' }),
        stewardSlugs: slugListField('Reusable Steward Slugs', 'Person Slug'),
        themeSlugs: slugListField('Theme Slugs', 'Theme Slug'),
        featuredWeight: fields.number({ label: 'Featured Weight', defaultValue: 0 }),
        proofSignals: proofSignalsField,
        media: mediaField,
        seo: seoField,
      },
    }),

    stories: collection({
      label: 'Stories & Updates',
      slugField: 'title',
      path: 'src/content/stories/*',
      format: { data: 'json' },
      schema: {
        title: fields.slug({ name: { label: 'Title' } }),
        status: fields.select({ label: 'Publication Status', options: publicationStatusOptions, defaultValue: 'draft' }),
        category: fields.select({
          label: 'Category',
          options: storyCategoryOptions,
          defaultValue: 'chapter',
        }),
        publishDate: fields.text({ label: 'Publish Date (YYYY-MM-DD)' }),
        updatedDate: fields.text({ label: 'Updated Date (YYYY-MM-DD)' }),
        dek: fields.text({ label: 'Dek / Subtitle', multiline: true }),
        excerpt: fields.text({ label: 'Excerpt', multiline: true }),
        region: fields.select({
          label: 'Region',
          options: [
            { label: 'Global', value: 'global' },
            ...regionOptions,
          ],
          defaultValue: 'global',
        }),
        tag: fields.text({ label: 'Primary Tag' }),
        tags: slugListField('Tags', 'Tag'),
        body: fields.text({
          label: 'Body (Markdown)',
          multiline: true,
          description: 'HiFi article convention: paragraphs separated by blank lines, ## headings, > pull quotes, markdown lists, and a final ## Thanks or ## Acknowledgements section when needed.',
        }),
        image: fields.text({ label: 'Header Image Path' }),
        author: fields.text({ label: 'Author' }),
        authorRole: fields.text({ label: 'Author Role' }),
        authorBio: fields.text({ label: 'Author Bio', multiline: true }),
        authorSlug: fields.text({ label: 'Author Person Slug' }),
        authorAvatar: fields.text({ label: 'Author Avatar Path' }),
        relatedChapter: fields.text({ label: 'Related Chapter (slug)' }),
        relatedGuild: fields.text({ label: 'Related Guild (slug)' }),
        relatedProjectSlugs: slugListField('Related Project Slugs', 'Project Slug'),
        relatedStorySlugs: slugListField('Related Story Slugs', 'Story Slug'),
        continueReadingStorySlugs: slugListField('Continue Reading Story Slugs', 'Story Slug'),
        themeSlugs: slugListField('Theme Slugs', 'Theme Slug'),
        translations: translationsField,
        proofSignals: proofSignalsField,
        featuredWeight: fields.number({ label: 'Featured Weight', defaultValue: 0 }),
        readTime: fields.text({ label: 'Read Time' }),
        media: mediaField,
        seo: seoField,
      },
    }),

    resources: collection({
      label: 'Resources',
      slugField: 'title',
      path: 'src/content/resources/*',
      format: { data: 'json' },
      columns: ['kind', 'status', 'featuredWeight'],
      schema: {
        title: fields.slug({ name: { label: 'Title' } }),
        kind: fields.select({ label: 'Kind', options: resourceKindOptions, defaultValue: 'external' }),
        status: fields.select({ label: 'Status', options: resourceStatusOptions, defaultValue: 'draft' }),
        summary: fields.text({ label: 'Summary', multiline: true }),
        description: fields.text({ label: 'Description', multiline: true }),
        author: fields.text({ label: 'Author / Host' }),
        publishDate: fields.text({ label: 'Publish Date (YYYY-MM-DD)' }),
        updatedDate: fields.text({ label: 'Updated Date (YYYY-MM-DD)' }),
        primaryUrl: fields.text({ label: 'Primary URL' }),
        resourcePath: fields.text({ label: 'Local Asset Path' }),
        image: fields.text({ label: 'Image Path' }),
        imageAlt: fields.text({ label: 'Image Alt Text' }),
        duration: fields.text({ label: 'Duration / Length' }),
        readTime: fields.text({ label: 'Read Time' }),
        episodeNumber: fields.text({ label: 'Podcast Episode Number' }),
        guest: fields.text({ label: 'Guest' }),
        host: fields.text({ label: 'Host' }),
        pages: fields.number({ label: 'Pages' }),
        edition: fields.text({ label: 'Edition' }),
        tags: slugListField('Tags', 'Tag'),
        themeSlugs: slugListField('Theme Slugs', 'Theme Slug'),
        relatedChapterSlugs: slugListField('Related Chapter Slugs', 'Chapter Slug'),
        relatedGuildSlugs: slugListField('Related Guild Slugs', 'Guild Slug'),
        relatedProjectSlugs: slugListField('Related Project Slugs', 'Project Slug'),
        featuredWeight: fields.number({ label: 'Featured Weight', defaultValue: 0 }),
        card: libraryCardField,
        media: mediaField,
        seo: seoField,
      },
    }),

    books: collection({
      label: 'Books',
      slugField: 'title',
      path: 'src/content/books/*',
      format: { data: 'json' },
      columns: ['group', 'sortOrder'],
      schema: {
        title: fields.slug({ name: { label: 'Book Title' } }),
        description: fields.text({ label: 'Description', multiline: true }),
        author: fields.text({ label: 'Author' }),
        publishYear: fields.text({ label: 'Publish Year' }),
        pages: fields.number({ label: 'Pages' }),
        edition: fields.text({ label: 'Edition' }),
        updatedDate: fields.text({ label: 'Updated Date (YYYY-MM-DD)' }),
        readTime: fields.text({ label: 'Read Time' }),
        image: fields.text({ label: 'Cover Image Path', description: 'e.g. /images/greenpill-cover.png' }),
        imageAlt: fields.text({ label: 'Image Alt Text' }),
        imageWidth: fields.number({ label: 'Image Width', defaultValue: 200 }),
        imageHeight: fields.number({ label: 'Image Height', defaultValue: 300 }),
        imageStyle: fields.text({ label: 'Image Style (optional)', description: 'Inline CSS, e.g. border: 1px solid var(--yellow)' }),
        ebookLink: fields.text({ label: 'Ebook PDF Path', description: 'e.g. /pdf/green-pill.pdf' }),
        formats: fields.array(
          fields.object({
            label: fields.text({ label: 'Format Label', description: 'e.g. Softcover, Hardcover, Audiobook' }),
            link: fields.text({ label: 'Format Link' }),
          }),
          { label: 'Additional Formats', itemLabel: (props) => props.fields.label.value },
        ),
        translations: fields.array(
          fields.object({
            language: fields.text({ label: 'Language' }),
            link: fields.text({ label: 'Translation PDF Path' }),
          }),
          { label: 'Translations', itemLabel: (props) => props.fields.language.value },
        ),
        sections: fields.array(
          fields.object({
            title: fields.text({ label: 'Section / Chapter Title' }),
            summary: fields.text({ label: 'Summary', multiline: true }),
            anchor: fields.text({ label: 'Anchor (optional)' }),
          }),
          { label: 'Sections / Chapters', itemLabel: (props) => props.fields.title.value },
        ),
        themeSlugs: slugListField('Theme Slugs', 'Theme Slug'),
        relatedStorySlugs: slugListField('Related Story Slugs', 'Story Slug'),
        relatedProjectSlugs: slugListField('Related Project Slugs', 'Project Slug'),
        group: fields.select({
          label: 'Book Group',
          options: [
            { label: 'Main', value: 'main' },
            { label: 'Bonus', value: 'bonus' },
          ],
          defaultValue: 'main',
        }),
        sortOrder: fields.number({ label: 'Sort Order', defaultValue: 0 }),
        card: libraryCardField,
        media: mediaField,
        seo: seoField,
      },
    }),
  },

  singletons: {
    siteSettings: singleton({
      label: 'Site Settings',
      path: 'src/content/site-settings',
      format: { data: 'json' },
      schema: {
        title: fields.text({ label: 'Site Title', validation: { isRequired: true } }),
        description: fields.text({ label: 'Site Description', multiline: true }),
        ogImage: fields.text({ label: 'OG Image URL' }),
        analyticsId: fields.text({ label: 'Google Analytics ID' }),
        seo: seoField,
      },
    }),

    homePage: singleton({
      label: 'Home Page',
      path: 'src/content/home-page',
      format: { data: 'json' },
      schema: {
        overline: fields.text({ label: 'Overline' }),
        title: fields.text({ label: 'Title' }),
        dek: fields.text({ label: 'Dek / Subtitle', multiline: true }),
        promise: fields.text({ label: 'Homepage Promise', multiline: true }),
        summary: fields.text({ label: 'Summary', multiline: true }),
        hero: pageHeroField,
        sections: pageSectionField,
        primaryCta: ctaField,
        secondaryCta: ctaField,
        proofSignals: proofSignalsField,
        featuredRefs: featuredRefsField,
        featuredChapterSlugs: slugListField('Featured Chapter Slugs', 'Chapter Slug'),
        featuredStorySlugs: slugListField('Featured Story Slugs', 'Story Slug'),
        featuredResourceSlugs: slugListField('Featured Resource Slugs', 'Resource Slug'),
        media: mediaField,
        seo: seoField,
      },
    }),

    library: singleton({
      label: 'Library Index',
      path: 'src/content/library',
      format: { data: 'json' },
      schema: {
        hero: pageHeroField,
        sections: pageSectionField,
        featuredBookSlugs: slugListField('Featured Book Slugs', 'Book Slug'),
        featuredResourceSlugs: slugListField('Featured Resource Slugs', 'Resource Slug'),
        featuredGuildSlugs: slugListField('Featured Guild Slugs', 'Guild Slug'),
        gardenCard: libraryCardField,
        proofSignals: proofSignalsField,
        seo: seoField,
      },
    }),

    storiesIndex: singleton({
      label: 'Stories Index',
      path: 'src/content/stories-index',
      format: { data: 'json' },
      schema: {
        hero: pageHeroField,
        sections: pageSectionField,
        featuredStorySlugs: slugListField('Featured Story Slugs', 'Story Slug'),
        topicTags: slugListField('Topic Filter Tags', 'Tag'),
        chapterTags: slugListField('Chapter Filter Slugs', 'Chapter Slug'),
        topicSpotlight: fields.object({
          topic: fields.text({ label: 'Topic' }),
          blurb: fields.text({ label: 'Blurb', multiline: true }),
          storySlugs: slugListField('Story Slugs', 'Story Slug'),
          proofSignals: proofSignalsField,
        }, { label: 'Topic Spotlight' }),
        translations: translationsField,
        newsletterCta: ctaField,
        submitStoryCta: ctaField,
        seo: seoField,
      },
    }),

    chaptersIndex: singleton({
      label: 'Chapters Index',
      path: 'src/content/chapters-index',
      format: { data: 'json' },
      schema: {
        hero: pageHeroField,
        sections: pageSectionField,
        featuredChapterSlugs: slugListField('Featured Chapter Slugs', 'Chapter Slug'),
        filterCopy: fields.object({
          regionLabel: fields.text({ label: 'Region Filter Label' }),
          statusLabel: fields.text({ label: 'Status Filter Label' }),
          searchPlaceholder: fields.text({ label: 'Search Placeholder' }),
          emptyState: fields.text({ label: 'Empty State', multiline: true }),
        }, { label: 'Filter Copy' }),
        proofSignals: proofSignalsField,
        seo: seoField,
      },
    }),

    garden: singleton({
      label: 'Garden',
      path: 'src/content/garden',
      format: { data: 'json' },
      schema: {
        title: fields.text({ label: 'Title' }),
        summary: fields.text({ label: 'Summary', multiline: true }),
        framing: fields.select({
          label: 'First-Release Framing',
          options: [
            { label: 'Flagship', value: 'flagship' },
            { label: 'Program', value: 'program' },
            { label: 'Support Example', value: 'support-example' },
            { label: 'Bridge', value: 'bridge' },
            { label: 'Light Mention', value: 'light-mention' },
          ],
          defaultValue: 'bridge',
        }),
        steps: fields.array(
          fields.object({
            level: fields.number({ label: 'Step Level' }),
            stage: fields.text({ label: 'Stage' }),
            levelLabel: fields.text({ label: 'Level Label' }),
            surfaceType: fields.select({
              label: 'Surface Type',
              options: [
                { label: 'Email', value: 'email' },
                { label: 'Telegram', value: 'telegram' },
                { label: 'Assessment', value: 'assessment' },
                { label: 'Steward Call', value: 'steward-call' },
                { label: 'Garden', value: 'garden' },
                { label: 'Playbook', value: 'playbook' },
              ],
              defaultValue: 'garden',
            }),
            kicker: fields.text({ label: 'Kicker' }),
            title: fields.text({ label: 'Title' }),
            body: fields.text({ label: 'Body', multiline: true }),
            meta: fields.text({ label: 'Meta' }),
            friction: fields.text({ label: 'Friction Label' }),
            cta: ctaField,
          }),
          { label: 'Steps', itemLabel: (props) => props.fields.title.value },
        ),
        afterCards: fields.array(
          fields.object({
            kicker: fields.text({ label: 'Kicker' }),
            title: fields.text({ label: 'Title' }),
            body: fields.text({ label: 'Body', multiline: true }),
            cta: ctaField,
          }),
          { label: 'After Garden Cards', itemLabel: (props) => props.fields.title.value },
        ),
        proofSignals: proofSignalsField,
        stickyCta: ctaField,
        emailPreview: previewCardField,
        telegramPreview: previewCardField,
        assessmentPreview: previewCardField,
        stewardCallPreview: previewCardField,
        media: mediaField,
        seo: seoField,
      },
    }),

    podcast: singleton({
      label: 'Podcast',
      path: 'src/content/podcast',
      format: { data: 'json' },
      schema: {
        title: fields.text({ label: 'Section Title' }),
        description: fields.text({ label: 'Description', multiline: true }),
        secondaryDescription: fields.text({ label: 'Secondary Description', multiline: true }),
        listenLink: fields.url({ label: 'Listen Anywhere URL' }),
        youtubeLink: fields.url({ label: 'YouTube URL' }),
        guestRecommendLink: fields.url({ label: 'Recommend Guest URL' }),
        coverImage: fields.text({ label: 'Cover Image Path' }),
        seo: seoField,
      },
    }),

    socialLinks: singleton({
      label: 'Social Links',
      path: 'src/content/social-links',
      format: { data: 'json' },
      schema: {
        discord: fields.url({ label: 'Discord' }),
        charmverse: fields.url({ label: 'Charmverse' }),
        charmverseInvite: fields.url({ label: 'Charmverse Invite' }),
        twitter: fields.url({ label: 'Twitter/X' }),
        twitterList: fields.url({ label: 'Twitter Chapter List' }),
        telegram: fields.url({ label: 'Telegram' }),
        warpcast: fields.url({ label: 'Warpcast' }),
        hub: fields.url({ label: 'Hub' }),
        youtube: fields.url({ label: 'YouTube' }),
      },
    }),
  },
});
