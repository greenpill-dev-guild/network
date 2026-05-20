import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { getOperationalChapters, getOperationalGuilds } from '../lib/operational-content';
import { hasPublicGuildPage } from '../lib/public-routes';

export const prerender = true;

const SITE_URL = 'https://greenpill.network';

type SitemapEntry = {
  path: string;
  changefreq: 'daily' | 'weekly' | 'monthly';
  priority: string;
};

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function toUrl(path: string) {
  const normalizedPath = path === '/' ? '/' : `/${path.replace(/^\/+|\/+$/g, '')}`;
  return `${SITE_URL}${normalizedPath === '/' ? '' : normalizedPath}`;
}

function uniqueEntries(entries: SitemapEntry[]) {
  const seen = new Set<string>();
  return entries.filter((entry) => {
    if (seen.has(entry.path)) return false;
    seen.add(entry.path);
    return true;
  });
}

export const GET: APIRoute = async () => {
  const chapters = await getOperationalChapters();
  const guilds = await getOperationalGuilds();
  const stories = await getCollection('stories');

  const entries = uniqueEntries([
    { path: '/', changefreq: 'weekly', priority: '1.0' },
    { path: '/garden', changefreq: 'weekly', priority: '0.9' },
    { path: '/library', changefreq: 'weekly', priority: '0.9' },
    { path: '/chapters', changefreq: 'weekly', priority: '0.8' },
    { path: '/stories', changefreq: 'weekly', priority: '0.8' },
    ...chapters.map((chapter) => ({
      path: `/chapters/${chapter.id}`,
      changefreq: 'monthly' as const,
      priority: '0.7',
    })),
    ...guilds
      .filter((guild) => hasPublicGuildPage(guild.id) && !guild.data.seo?.noindex)
      .map((guild) => ({
        path: `/guilds/${guild.id}`,
        changefreq: 'monthly' as const,
        priority: '0.7',
      })),
    ...stories
      .filter((story) => story.data.status === 'published' && !story.data.seo?.noindex)
      .map((story) => ({
        path: `/stories/${story.id}`,
        changefreq: 'monthly' as const,
        priority: '0.6',
      })),
  ]);

  const urls = entries
    .map((entry) => (
      [
        '  <url>',
        `    <loc>${escapeXml(toUrl(entry.path))}</loc>`,
        `    <changefreq>${entry.changefreq}</changefreq>`,
        `    <priority>${entry.priority}</priority>`,
        '  </url>',
      ].join('\n')
    ))
    .join('\n');

  return new Response(
    [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      urls,
      '</urlset>',
      '',
    ].join('\n'),
    {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
      },
    },
  );
};
