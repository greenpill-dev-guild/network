import { defineCollection, z } from 'astro:content';

const stewardSchema = z.object({
  name: z.string().default(''),
  role: z.string().optional().default(''),
  avatar: z.string().optional().default(''),
  wallet: z.string().optional().default(''),
});

const linkSchema = z.object({
  label: z.string().default(''),
  url: z.string().default(''),
});

const slugListSchema = z.array(z.string()).optional().default([]);

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
    image: z.string().optional().default(''),
    founded: z.string().optional().default(''),
    lat: z.number(),
    long: z.number(),
    link: z.string().optional(),
    stewards: z.array(stewardSchema).optional().default([]),
    stewardSlugs: slugListSchema,
    themeSlugs: slugListSchema,
    links: z.array(linkSchema).optional().default([]),
    impactSources: impactSourcesSchema,
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
    image: z.string().optional().default(''),
    stewards: z.array(stewardSchema).optional().default([]),
    stewardSlugs: slugListSchema,
    themeSlugs: slugListSchema,
    links: z.array(linkSchema).optional().default([]),
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
  }),
});

const stories = defineCollection({
  type: 'data',
  schema: z.object({
    title: z.string(),
    category: z.enum(['chapter', 'guild', 'program', 'essay', 'field-report']).default('chapter'),
    publishDate: z.string().optional().default(''),
    excerpt: z.string().optional().default(''),
    body: z.string().optional().default(''),
    image: z.string().optional().default(''),
    author: z.string().optional().default(''),
    authorAvatar: z.string().optional().default(''),
    relatedChapter: z.string().optional().default(''),
    relatedGuild: z.string().optional().default(''),
    relatedProjectSlugs: slugListSchema,
    themeSlugs: slugListSchema,
  }),
});

const books = defineCollection({
  type: 'data',
  schema: z.object({
    title: z.string(),
    description: z.string().optional().default(''),
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
  }),
});

export const collections = { themes, people, chapters, guilds, projects, stories, books };
