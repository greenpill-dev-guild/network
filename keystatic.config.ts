import { config, fields, collection, singleton } from '@keystatic/core';

const stewardField = fields.array(
  fields.object({
    name: fields.text({ label: 'Name' }),
    role: fields.text({ label: 'Role' }),
    avatar: fields.text({ label: 'Avatar Path' }),
    wallet: fields.text({ label: 'Wallet (optional)' }),
  }),
  { label: 'Stewards', itemLabel: (props) => props.fields.name.value },
);

const linkField = fields.array(
  fields.object({
    label: fields.text({ label: 'Label' }),
    url: fields.url({ label: 'URL' }),
  }),
  { label: 'Links', itemLabel: (props) => props.fields.label.value },
);

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

export default config({
  storage: { kind: 'local' },

  collections: {
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
        image: fields.text({ label: 'Image Path' }),
        founded: fields.text({ label: 'Founded (year)' }),
        lat: fields.number({ label: 'Latitude', validation: { isRequired: true } }),
        long: fields.number({ label: 'Longitude', validation: { isRequired: true } }),
        link: fields.url({ label: 'Primary Link (legacy / external)' }),
        stewards: stewardField,
        links: linkField,
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
        image: fields.text({ label: 'Image Path' }),
        stewards: stewardField,
        links: linkField,
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
      },
    }),

    stories: collection({
      label: 'Stories & Updates',
      slugField: 'title',
      path: 'src/content/stories/*',
      format: { data: 'json' },
      schema: {
        title: fields.slug({ name: { label: 'Title' } }),
        category: fields.select({
          label: 'Category',
          options: storyCategoryOptions,
          defaultValue: 'chapter',
        }),
        publishDate: fields.text({ label: 'Publish Date (YYYY-MM-DD)' }),
        excerpt: fields.text({ label: 'Excerpt', multiline: true }),
        body: fields.text({ label: 'Body (Markdown)', multiline: true }),
        image: fields.text({ label: 'Header Image Path' }),
        author: fields.text({ label: 'Author' }),
        authorAvatar: fields.text({ label: 'Author Avatar Path' }),
        relatedChapter: fields.text({ label: 'Related Chapter (slug)' }),
        relatedGuild: fields.text({ label: 'Related Guild (slug)' }),
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
        group: fields.select({
          label: 'Book Group',
          options: [
            { label: 'Main', value: 'main' },
            { label: 'Bonus', value: 'bonus' },
          ],
          defaultValue: 'main',
        }),
        sortOrder: fields.number({ label: 'Sort Order', defaultValue: 0 }),
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
