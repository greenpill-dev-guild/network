/**
 * YouTube rules for the click-to-load player (components/ui/YouTubePlayer.astro).
 *
 * The site never loads YouTube on its own: a page shows a site-hosted poster,
 * and only a visitor's press of play swaps in the privacy-enhanced embed from
 * youtube-nocookie.com. Without JavaScript the poster is a plain link to the
 * video on YouTube.
 */

export const YOUTUBE_EMBED_ORIGIN = 'https://www.youtube-nocookie.com';

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

/** True for a YouTube video ID: the 11 characters after `v=` in a watch link. */
export function isYouTubeId(value: string | undefined): value is string {
  return YOUTUBE_ID.test(value ?? '');
}

/**
 * Seconds from a chapter or duration timestamp: "02:40" is 160 and "1:02:03"
 * is 3723. Anything else (minutes past 59 without hours, words) is undefined.
 */
export function parseTimestamp(value: string | undefined): number | undefined {
  const match = /^(?:(\d+):)?([0-5]?\d):([0-5]\d)$/.exec((value ?? '').trim());
  if (!match) return undefined;
  const [, hours = '0', minutes, seconds] = match;
  return Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds);
}

/** "48:54" reads "49 min" and "1:02:03" reads "1 hr 2 min"; an unreadable duration is empty. */
export function durationLabel(value: string | undefined): string {
  const seconds = parseTimestamp(value);
  if (seconds === undefined) return '';
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes < 60) return `${minutes} min`;
  const rest = minutes % 60;
  return rest ? `${Math.floor(minutes / 60)} hr ${rest} min` : `${minutes / 60} hr`;
}

/** The video's page on YouTube, at a start time when one is given. */
export function youtubeWatchUrl(id: string, startSeconds = 0): string {
  const url = new URL('https://www.youtube.com/watch');
  url.searchParams.set('v', id);
  if (startSeconds > 0) url.searchParams.set('t', `${startSeconds}s`);
  return url.href;
}

/** The privacy-enhanced embed the player loads after a press of play. */
export function youtubeEmbedUrl(id: string, startSeconds = 0): string {
  const url = new URL(`/embed/${id}`, YOUTUBE_EMBED_ORIGIN);
  url.searchParams.set('autoplay', '1');
  url.searchParams.set('rel', '0');
  if (startSeconds > 0) url.searchParams.set('start', String(startSeconds));
  return url.href;
}
