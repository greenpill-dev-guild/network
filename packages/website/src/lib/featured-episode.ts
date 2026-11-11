/**
 * The homepage's featured-episode band (components/page-sections/
 * FeaturedEpisode.astro), built from `featuredEpisode` in home-page.json.
 *
 * The block holds only the band's framing copy and names a story. The story
 * owns the episode itself: its YouTube video, duration, date and poster image.
 * An empty story slug hides the band, and so does a story that is not
 * published or has no playable video, so a half-finished edit never renders
 * an empty player.
 */

import { durationLabel, isYouTubeId } from './youtube.js';

export interface FeaturedEpisodeConfig {
  storySlug?: string;
  overline?: string;
  title?: string;
  dek?: string;
  cta?: { label?: string; href?: string };
}

/** The parts of a story entry the band reads. */
export interface FeaturedEpisodeStory {
  id: string;
  data: {
    title: string;
    status?: string;
    publishDate?: string;
    dek?: string;
    excerpt?: string;
    image?: string;
    media?: { image?: string };
    seo?: { noindex?: boolean };
    video?: { youtubeId?: string; duration?: string };
  };
}

export interface FeaturedEpisodeView {
  storyId: string;
  storyHref: string;
  overline: string[];
  title: string;
  dek: string;
  /** The story's authored date (YYYY-MM-DD); the page formats it. */
  publishDate: string;
  /** "49 min", or empty when the story gives no readable duration. */
  durationLabel: string;
  /** An extra link beside "Episode notes", such as the Hub discussion: a site path or an https address. */
  cta?: { label: string; href: string };
  video: { id: string; title: string; duration: string; poster: string };
}

export function featuredEpisodeView(
  config: FeaturedEpisodeConfig | undefined,
  stories: readonly FeaturedEpisodeStory[],
): FeaturedEpisodeView | undefined {
  const slug = config?.storySlug?.trim();
  if (!slug) return undefined;

  const story = stories.find((entry) => entry.id === slug);
  if (!story || story.data.status !== 'published' || story.data.seo?.noindex) return undefined;

  const videoId = story.data.video?.youtubeId?.trim();
  const poster = story.data.media?.image || story.data.image || '';
  if (!isYouTubeId(videoId) || !poster) return undefined;

  const duration = story.data.video?.duration?.trim() ?? '';
  const ctaLabel = config?.cta?.label?.trim();
  const ctaHref = safeCtaHref(config?.cta?.href);

  return {
    storyId: story.id,
    storyHref: `/stories/${story.id}`,
    overline: (config?.overline ?? '').split('·').map((segment) => segment.trim()).filter(Boolean),
    title: config?.title?.trim() || story.data.title,
    dek: config?.dek?.trim() || story.data.dek || story.data.excerpt || '',
    publishDate: story.data.publishDate ?? '',
    durationLabel: durationLabel(duration),
    cta: ctaLabel && ctaHref ? { label: ctaLabel, href: ctaHref } : undefined,
    video: { id: videoId, title: story.data.title, duration, poster },
  };
}

// Stands in for this site's origin while a path is resolved; the .invalid
// top-level domain never names a real host.
const SITE_ORIGIN = 'https://site.invalid';

/**
 * The CTA's href when it is an https address or a path on this site, read the
 * way a browser reads it. A browser turns `/\host/path` (or a path with a tab
 * or newline inside `//`) into a link to another host, so a path counts only
 * when it still resolves to this site. Anything else leaves the link out.
 */
function safeCtaHref(value: string | undefined): string | undefined {
  const href = value?.trim();
  if (!href) return undefined;
  try {
    if (/^https:\/\//i.test(href)) return new URL(href).protocol === 'https:' ? href : undefined;
    if (!href.startsWith('/')) return undefined;
    return new URL(href, SITE_ORIGIN).origin === SITE_ORIGIN ? href : undefined;
  } catch {
    return undefined;
  }
}
