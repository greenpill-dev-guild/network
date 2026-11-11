export const PUBLIC_GUILD_PAGE_SLUGS = ['dev-guild', 'writers-guild'] as const;

const publicGuildPageSlugs = new Set<string>(PUBLIC_GUILD_PAGE_SLUGS);

export function hasPublicGuildPage(slug: string | null | undefined) {
  return Boolean(slug && publicGuildPageSlugs.has(slug));
}

export function publicGuildPath(slug: string | null | undefined) {
  return hasPublicGuildPage(slug) ? `/guilds/${slug}` : '';
}

// Stands in for this site's origin while a path is resolved; the .invalid
// top-level domain never names a real host.
const SITE_ORIGIN = 'https://site.invalid';

/**
 * True for a path this site serves, read the way a browser reads it. A browser
 * turns `//host`, `/\host` and `/<tab>/host` into addresses on another host,
 * so a value counts only when it starts with `/` and still resolves here.
 */
export function isSitePath(value: string | null | undefined): value is string {
  const path = value?.trim() ?? '';
  if (!path.startsWith('/')) return false;
  try {
    return new URL(path, SITE_ORIGIN).origin === SITE_ORIGIN;
  } catch {
    return false;
  }
}
