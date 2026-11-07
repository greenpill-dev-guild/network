#!/usr/bin/env bun

/*
 * Refreshes packages/website/src/data/podcast-feed-snapshot.json from the
 * Greenpill podcast RSS feed. The GitHub Pages workflow runs it before every
 * website build, including the hourly scheduled one, so new episodes and the
 * episode count reach the Library without a code change.
 *
 * Any failure (network, timeout, HTTP error, or a feed that fails
 * snapshotProblems below) exits non-zero and leaves the committed snapshot
 * untouched; the workflow then builds with that committed file instead of
 * blocking the publish.
 */

import { mkdir, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputPath = resolve(rootDir, 'packages/website/src/data/podcast-feed-snapshot.json');
const sourceUrl = 'https://rss.libsyn.com/shows/400481/destinations/3304589.xml';
const archiveUrl = 'https://podcasts.apple.com/us/podcast/greenpill/id1609313639';
const recentLimit = 12;
const fetchTimeoutMs = 30_000;

// A healthy feed carries hundreds of items, so fewer playable episodes than
// this means a degraded or truncated response. The content contract test holds
// the committed snapshot to the same minimum.
export const minimumRecentEpisodes = 8;

function decodeEntities(value: string) {
  const named: Record<string, string> = {
    amp: '&',
    apos: "'",
    gt: '>',
    lt: '<',
    nbsp: ' ',
    quot: '"',
  };

  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (_, entity: string) => {
    if (entity.startsWith('#x')) return String.fromCodePoint(Number.parseInt(entity.slice(2), 16));
    if (entity.startsWith('#')) return String.fromCodePoint(Number.parseInt(entity.slice(1), 10));
    return named[entity.toLowerCase()] ?? `&${entity};`;
  });
}

function unwrap(value = '') {
  let decoded = value.replace(/^<!\[CDATA\[|\]\]>$/g, '').trim();
  for (let index = 0; index < 2; index += 1) {
    decoded = decodeEntities(decoded);
  }
  return decoded.trim();
}

function stripHtml(value = '') {
  return unwrap(value)
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/p>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function tag(block: string, tagName: string) {
  const pattern = new RegExp(`<${escapeRegExp(tagName)}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escapeRegExp(tagName)}>`, 'i');
  return unwrap(block.match(pattern)?.[1] ?? '');
}

function attribute(block: string, tagName: string, attributeName: string) {
  const tagPattern = new RegExp(`<${escapeRegExp(tagName)}\\s+([^>]*)\\/?>`, 'i');
  const tagAttrs = block.match(tagPattern)?.[1] ?? '';
  const attrPattern = new RegExp(`${escapeRegExp(attributeName)}=["']([^"']+)["']`, 'i');
  return unwrap(tagAttrs.match(attrPattern)?.[1] ?? '');
}

function toIsoDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? '' : date.toISOString();
}

// Feed values become href and src attributes on greenpill.network, so the
// snapshot carries https URLs only. Anything else (javascript:, data:, http:,
// a relative path, text that is not a URL) comes back empty. The parsed href
// is returned, so the published value is exactly the one that was checked.
function httpsUrl(value: string) {
  if (!value) return '';
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.href : '';
  } catch {
    return '';
  }
}

function summaryFromDescription(description: string) {
  const text = stripHtml(description)
    .replace(/\s*Timestamps\b[\s\S]*$/i, '')
    .replace(/\s*Some of the materials\b[\s\S]*$/i, '')
    .replace(/\s*greenpill\.network\b[\s\S]*$/i, '')
    .trim();

  if (text.length <= 280) return text;
  const clipped = text.slice(0, 280);
  return `${clipped.slice(0, clipped.lastIndexOf(' ') || clipped.length).trim()}...`;
}

export function parseFeed(xml: string) {
  const channelPrefix = xml.match(/<channel>([\s\S]*?)<item>/i)?.[1] ?? xml;
  const channelImage = httpsUrl(attribute(channelPrefix, 'itunes:image', 'href')) || httpsUrl(tag(channelPrefix, 'url'));
  const itemBlocks = Array.from(xml.matchAll(/<item>([\s\S]*?)<\/item>/gi), (match) => match[1]);

  const episodes = itemBlocks.map((item) => {
    const description = tag(item, 'description') || tag(item, 'content:encoded');
    return {
      guid: tag(item, 'guid'),
      title: tag(item, 'itunes:title') || tag(item, 'title'),
      summary: summaryFromDescription(description),
      publishedAt: toIsoDate(tag(item, 'pubDate')),
      duration: tag(item, 'itunes:duration'),
      season: tag(item, 'itunes:season'),
      episode: tag(item, 'itunes:episode'),
      author: tag(item, 'itunes:author'),
      link: httpsUrl(tag(item, 'link')),
      image: httpsUrl(attribute(item, 'itunes:image', 'href')) || channelImage,
      audioUrl: httpsUrl(attribute(item, 'enclosure', 'url')),
      audioType: attribute(item, 'enclosure', 'type') || 'audio/mpeg',
      audioLength: attribute(item, 'enclosure', 'length'),
    };
  });

  const snapshot = {
    sourceUrl,
    archiveUrl,
    title: tag(channelPrefix, 'title') || 'GreenPill',
    siteUrl: httpsUrl(tag(channelPrefix, 'link')),
    description: summaryFromDescription(tag(channelPrefix, 'description') || tag(channelPrefix, 'itunes:summary')),
    image: channelImage,
    // The public episode count. Website pages read this field rather than a
    // hand-typed number, so it stays current with the feed.
    episodeCount: itemBlocks.length,
    lastBuildDate: toIsoDate(tag(channelPrefix, 'lastBuildDate') || tag(channelPrefix, 'pubDate')),
    generatedAt: new Date().toISOString(),
    // The Library renders every episode's audio and notes link, so an item
    // missing either one, or carrying a non-https one, is skipped.
    episodes: episodes
      .filter((episode) => episode.title && episode.audioUrl && episode.link)
      .slice(0, recentLimit),
  };
  const oldestPublishedAt = episodes
    .map((episode) => episode.publishedAt)
    .filter(Boolean)
    .sort()[0] ?? '';

  return { snapshot, oldestPublishedAt };
}

type PodcastFeedSnapshot = ReturnType<typeof parseFeed>['snapshot'];

// Everything a snapshot must hold before it may replace the committed one.
// Problems name episodes by position, so no feed text reaches the build log.
export function snapshotProblems(snapshot: PodcastFeedSnapshot) {
  const problems: string[] = [];
  if (snapshot.episodes.length < minimumRecentEpisodes) {
    problems.push(`${snapshot.episodes.length} playable episodes, fewer than ${minimumRecentEpisodes}`);
  }
  snapshot.episodes.forEach((episode, index) => {
    const position = `episode ${index + 1}`;
    if (!episode.title) problems.push(`${position} has no title`);
    if (!httpsUrl(episode.audioUrl)) problems.push(`${position} has no https audio URL`);
    if (!httpsUrl(episode.link)) problems.push(`${position} has no https notes link`);
    if (episode.image && !httpsUrl(episode.image)) problems.push(`${position} has a non-https image`);
  });
  if (snapshot.image && !httpsUrl(snapshot.image)) problems.push('the channel image is not https');
  return problems;
}

// Replaces the snapshot at targetPath only when the parsed feed passes
// snapshotProblems. The new file is written next to it and renamed into place,
// so a failure part way through never leaves a truncated snapshot behind.
export async function writeSnapshotFromFeed(feedXml: string, targetPath = outputPath) {
  const { snapshot, oldestPublishedAt } = parseFeed(feedXml);
  const problems = snapshotProblems(snapshot);
  if (problems.length > 0) {
    throw new Error(`Podcast feed failed the snapshot checks, so the existing snapshot stays: ${problems.join('; ')}`);
  }

  const temporaryPath = `${targetPath}.tmp`;
  await mkdir(dirname(targetPath), { recursive: true });
  await writeFile(temporaryPath, `${JSON.stringify(snapshot, null, 2)}\n`);
  await rename(temporaryPath, targetPath);
  return { snapshot, oldestPublishedAt };
}

if (import.meta.main) {
  const response = await fetch(sourceUrl, {
    headers: { accept: 'application/rss+xml, application/xml, text/xml' },
    signal: AbortSignal.timeout(fetchTimeoutMs),
  });

  if (!response.ok) {
    throw new Error(`Podcast RSS request failed with ${response.status}`);
  }

  const { snapshot, oldestPublishedAt } = await writeSnapshotFromFeed(await response.text());

  console.log(
    `Wrote ${snapshot.episodes.length} recent episodes from ${snapshot.episodeCount} RSS items ` +
      `(newest ${snapshot.episodes[0].publishedAt}, oldest item ${oldestPublishedAt || 'undated'}).`,
  );
}
