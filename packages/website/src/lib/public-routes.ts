export const PUBLIC_GUILD_PAGE_SLUGS = ['dev-guild', 'writers-guild'] as const;

const publicGuildPageSlugs = new Set<string>(PUBLIC_GUILD_PAGE_SLUGS);

export function hasPublicGuildPage(slug: string | null | undefined) {
  return Boolean(slug && publicGuildPageSlugs.has(slug));
}

export function publicGuildPath(slug: string | null | undefined) {
  return hasPublicGuildPage(slug) ? `/guilds/${slug}` : '';
}
