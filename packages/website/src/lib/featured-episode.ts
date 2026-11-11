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
  const ctaHref = config?.cta?.href?.trim();

  return {
    storyId: story.id,
    storyHref: `/stories/${story.id}`,
    overline: (config?.overline ?? '').split('·').map((segment) => segment.trim()).filter(Boolean),
    title: config?.title?.trim() || story.data.title,
    dek: config?.dek?.trim() || story.data.dek || story.data.excerpt || '',
    publishDate: story.data.publishDate ?? '',
    durationLabel: durationLabel(duration),
    // A site path or an https address; anything else (http:, javascript:, a
    // protocol-relative //host) leaves the link out.
    cta: ctaLabel && ctaHref && /^(?:https:\/\/|\/(?!\/))/.test(ctaHref) ? { label: ctaLabel, href: ctaHref } : undefined,
    video: { id: videoId, title: story.data.title, duration, poster },
  };
}
