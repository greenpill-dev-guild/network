import { defineCollection, z } from 'astro:content';

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

const stories = defineCollection({
  type: 'data',
  schema: z.object({
    title: z.string(),
    status: z.enum(['draft', 'published', 'archived']).optional().default('draft'),
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
    group: z.enum(['main', 'bonus']).default('main'),
    sortOrder: z.number().default(0),
    card: libraryCardSchema,
    media: mediaSchema,
    seo: seoSchema,
  }),
});

export const collections = {
  stories,
  resources,
  books,
};
