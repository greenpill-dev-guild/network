import { defineMiddleware } from 'astro:middleware';
import { markExternalLinks, siteHostsFor } from './lib/external-links';

// Runs for every page Astro renders: at build time for this static site, and
// on each request in `astro dev`. See lib/external-links.ts for the rule.
export const onRequest = defineMiddleware(async (context, next) => {
  const response = await next();
  return markExternalLinks(response, siteHostsFor(context.site, context.url));
});
