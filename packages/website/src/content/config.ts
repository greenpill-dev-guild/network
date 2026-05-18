import { defineCollection, z } from 'astro:content';

const stewardSchema = z.object({
  name: z.string().default(''),
  role: z.string().optional().default(''),
  bio: z.string().optional().default(''),
  location: z.string().optional().default(''),
  personSlug: z.string().optional().default(''),
  chapterSlug: z.string().optional().default(''),
  avatar: z.string().optional().default(''),
  wallet: z.string().optional().default(''),
});

const linkSchema = z.object({
  label: z.string().default(''),
  url: z.string().default(''),
  subtext: z.string().optional().default(''),
  handle: z.string().optional().default(''),
  action: z.string().optional().default(''),
  icon: z.string().optional().default(''),
  kind: z.enum(['internal', 'external', 'email', 'form', 'booking', 'social']).optional().default('external'),
});

const slugListSchema = z.array(z.string()).optional().default([]);

const seoSchema = z.object({
  title: z.string().optional().default(''),
  description: z.string().optional().default(''),
  ogImage: z.string().optional().default(''),
  canonicalPath: z.string().optional().default(''),
  noindex: z.boolean().optional().default(false),
}).optional().default({});

const mediaSchema = z.object({
  image: z.string().optional().default(''),
  imageAlt: z.string().optional().default(''),
  ogImage: z.string().optional().default(''),
}).optional().default({});

const proofSignalSchema = z.object({
  label: z.string().default(''),
  value: z.string().default(''),
  source: z.string().optional().default(''),
  href: z.string().optional().default(''),
});

const translationSchema = z.object({
  language: z.string().default(''),
  label: z.string().optional().default(''),
  href: z.string().optional().default(''),
  slug: z.string().optional().default(''),
});

const publicPersonReferenceSchema = z.object({
  personSlug: z.string().optional().default(''),
  name: z.string().optional().default(''),
  role: z.string().optional().default(''),
  bio: z.string().optional().default(''),
  location: z.string().optional().default(''),
  chapterSlug: z.string().optional().default(''),
  avatar: z.string().optional().default(''),
});

const libraryCardSchema = z.object({
  eyebrow: z.string().optional().default(''),
  title: z.string().optional().default(''),
  summary: z.string().optional().default(''),
  badge: z.string().optional().default(''),
  surfaceType: z.enum(['book', 'podcast', 'playbook', 'garden', 'tool', 'article', 'video', 'external']).optional().default('external'),
  image: z.string().optional().default(''),
  imageAlt: z.string().optional().default(''),
  href: z.string().optional().default(''),
}).optional().default({});

const impactSourcesSchema = z.object({
  impactEnabled: z.boolean().optional().default(false),
  greenGoodsGardenAddress: z.string().optional().default(''),
  greenGoodsChainId: z.number().int().optional().default(42161),
  karmaProjectUID: z.string().optional().default(''),
  karmaProjectSlug: z.string().optional().default(''),
  karmaCommunitySlug: z.string().optional().default(''),
}).optional().default({});

const themes = defineCollection({
  type: 'data',
  schema: z.object({
    name: z.string(),
    summary: z.string().optional().default(''),
    sortOrder: z.number().optional().default(0),
  }),
});

const people = defineCollection({
  type: 'data',
  schema: z.object({
    displayName: z.string(),
    role: z.string().optional().default(''),
    avatar: z.string().optional().default(''),
    bio: z.string().optional().default(''),
    themeSlugs: slugListSchema,
    links: z.array(linkSchema).optional().default([]),
    media: mediaSchema,
    seo: seoSchema,
  }),
});

const chapters = defineCollection({
  type: 'data',
  schema: z.object({
    name: z.string(),
    city: z.string().optional().default(''),
    country: z.string().optional().default(''),
    region: z.enum(['americas', 'africa', 'asia', 'europe', 'oceania']).optional().default('americas'),
    status: z.enum(['active', 'forming', 'inactive']).optional().default('active'),
    summary: z.string().optional().default(''),
    introQuote: z.string().optional().default(''),
    introQuoteAttribution: z.string().optional().default(''),
    image: z.string().optional().default(''),
    founded: z.string().optional().default(''),
    lat: z.number(),
    long: z.number(),
    link: z.string().optional(),
    stewards: z.array(stewardSchema).optional().default([]),
    stewardSlugs: slugListSchema,
    themeSlugs: slugListSchema,
    links: z.array(linkSchema).optional().default([]),
    connectLinks: z.array(linkSchema).optional().default([]),
    relatedChapterSlugs: slugListSchema,
    featuredStory: z.object({
      storySlug: z.string().optional().default(''),
      headline: z.string().optional().default(''),
      blurb: z.string().optional().default(''),
      image: z.string().optional().default(''),
      imageAlt: z.string().optional().default(''),
    }).optional().default({}),
    featuredStorySlugs: slugListSchema,
    authoredResourceSlugs: slugListSchema,
    impactSources: impactSourcesSchema,
    featuredWeight: z.number().optional().default(0),
    proofSignals: z.array(proofSignalSchema).optional().default([]),
    media: mediaSchema,
    seo: seoSchema,
  }),
});

const guilds = defineCollection({
  type: 'data',
  schema: z.object({
    name: z.string(),
    type: z.enum(['guild', 'pod']).default('guild'),
    status: z.enum(['active', 'forming', 'inactive']).default('active'),
    summary: z.string().optional().default(''),
    description: z.string().optional().default(''),
    foundedYear: z.number().int().optional(),
    oneliner: z.string().optional().default(''),
    outputs: z.array(z.object({
      label: z.string().default(''),
      summary: z.string().optional().default(''),
      href: z.string().optional().default(''),
    })).optional().default([]),
    mandateParagraphs: z.array(z.string()).optional().default([]),
    cadence: z.object({
      summary: z.string().optional().default(''),
      callTime: z.string().optional().default(''),
      format: z.string().optional().default(''),
      recordingsHref: z.string().optional().default(''),
    }).optional().default({}),
    principles: z.array(z.object({
      order: z.number().optional().default(0),
      title: z.string().default(''),
      body: z.string().optional().default(''),
    })).optional().default([]),
    image: z.string().optional().default(''),
    stewards: z.array(stewardSchema).optional().default([]),
    stewardSlugs: slugListSchema,
    memberSlugs: slugListSchema,
    publicMembers: z.array(publicPersonReferenceSchema).optional().default([]),
    themeSlugs: slugListSchema,
    links: z.array(linkSchema).optional().default([]),
    connectLinks: z.array(linkSchema).optional().default([]),
    featuredWeight: z.number().optional().default(0),
    proofSignals: z.array(proofSignalSchema).optional().default([]),
    media: mediaSchema,
    seo: seoSchema,
  }),
});

const projects = defineCollection({
  type: 'data',
  schema: z.object({
    name: z.string(),
    status: z.enum(['active', 'beta', 'experimental', 'archived']).default('active'),
    guild: z.string().optional().default(''),
    summary: z.string().optional().default(''),
    description: z.string().optional().default(''),
    image: z.string().optional().default(''),
    techStack: z.array(z.string()).optional().default([]),
    repoUrl: z.string().optional().default(''),
    liveUrl: z.string().optional().default(''),
    stewardSlugs: slugListSchema,
    themeSlugs: slugListSchema,
    featuredWeight: z.number().optional().default(0),
    proofSignals: z.array(proofSignalSchema).optional().default([]),
    media: mediaSchema,
    seo: seoSchema,
  }),
});

const stories = defineCollection({
  type: 'data',
  schema: z.object({
    title: z.string(),
    category: z.enum(['chapter', 'guild', 'program', 'essay', 'field-report']).default('chapter'),
    publishDate: z.string().optional().default(''),
    updatedDate: z.string().optional().default(''),
    dek: z.string().optional().default(''),
    excerpt: z.string().optional().default(''),
    region: z.enum(['global', 'americas', 'africa', 'asia', 'europe', 'oceania']).optional().default('global'),
    tag: z.string().optional().default(''),
    tags: z.array(z.string()).optional().default([]),
    /*
     * HiFi article bodies stay Markdown for compatibility. Renderers should
     * support paragraphs, ## headings, > pull quotes, markdown lists, and a
     * final ## Thanks or ## Acknowledgements section.
     */
    body: z.string().optional().default(''),
    image: z.string().optional().default(''),
    author: z.string().optional().default(''),
    authorRole: z.string().optional().default(''),
    authorBio: z.string().optional().default(''),
    authorSlug: z.string().optional().default(''),
    authorAvatar: z.string().optional().default(''),
    relatedChapter: z.string().optional().default(''),
    relatedGuild: z.string().optional().default(''),
    relatedProjectSlugs: slugListSchema,
    relatedStorySlugs: slugListSchema,
    continueReadingStorySlugs: slugListSchema,
    themeSlugs: slugListSchema,
    translations: z.array(translationSchema).optional().default([]),
    proofSignals: z.array(proofSignalSchema).optional().default([]),
    featuredWeight: z.number().optional().default(0),
    readTime: z.string().optional().default(''),
    media: mediaSchema,
    seo: seoSchema,
  }),
});

const resources = defineCollection({
  type: 'data',
  schema: z.object({
    title: z.string(),
    kind: z.enum(['book', 'podcast', 'guide', 'tool', 'deck', 'article', 'video', 'external']).default('external'),
    status: z.enum(['draft', 'published', 'archived']).optional().default('draft'),
    summary: z.string().optional().default(''),
    description: z.string().optional().default(''),
    author: z.string().optional().default(''),
    publishDate: z.string().optional().default(''),
    updatedDate: z.string().optional().default(''),
    primaryUrl: z.string().optional().default(''),
    resourcePath: z.string().optional().default(''),
    image: z.string().optional().default(''),
    imageAlt: z.string().optional().default(''),
    duration: z.string().optional().default(''),
    readTime: z.string().optional().default(''),
    episodeNumber: z.string().optional().default(''),
    guest: z.string().optional().default(''),
    host: z.string().optional().default(''),
    pages: z.number().int().optional(),
    edition: z.string().optional().default(''),
    tags: z.array(z.string()).optional().default([]),
    themeSlugs: slugListSchema,
    relatedChapterSlugs: slugListSchema,
    relatedGuildSlugs: slugListSchema,
    relatedProjectSlugs: slugListSchema,
    featuredWeight: z.number().optional().default(0),
    card: libraryCardSchema,
    media: mediaSchema,
    seo: seoSchema,
  }),
});

const books = defineCollection({
  type: 'data',
  schema: z.object({
    title: z.string(),
    description: z.string().optional().default(''),
    author: z.string().optional().default(''),
    publishYear: z.string().optional().default(''),
    pages: z.number().int().optional(),
    edition: z.string().optional().default(''),
    updatedDate: z.string().optional().default(''),
    readTime: z.string().optional().default(''),
    image: z.string(),
    imageAlt: z.string(),
    imageWidth: z.number().optional().default(200),
    imageHeight: z.number().optional().default(300),
    imageStyle: z.string().optional().default(''),
    ebookLink: z.string(),
    formats: z.array(z.object({
      label: z.string(),
      link: z.string(),
    })).optional().default([]),
    translations: z.array(z.object({
      language: z.string(),
      link: z.string(),
    })).optional().default([]),
    sections: z.array(z.object({
      title: z.string(),
      summary: z.string().optional().default(''),
      anchor: z.string().optional().default(''),
    })).optional().default([]),
    themeSlugs: slugListSchema,
    relatedStorySlugs: slugListSchema,
    relatedProjectSlugs: slugListSchema,
    group: z.enum(['main', 'bonus']).default('main'),
    sortOrder: z.number().default(0),
    card: libraryCardSchema,
    media: mediaSchema,
    seo: seoSchema,
  }),
});

export const collections = {
  themes,
  people,
  chapters,
  guilds,
  projects,
  stories,
  resources,
  books,
};
