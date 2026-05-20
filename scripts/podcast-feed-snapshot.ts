#!/usr/bin/env bun

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputPath = resolve(rootDir, 'packages/website/src/data/podcast-feed-snapshot.json');
const sourceUrl = 'https://rss.libsyn.com/shows/400481/destinations/3304589.xml';
const archiveUrl = 'https://podcasts.apple.com/us/podcast/greenpill/id1609313639';
const recentLimit = 12;

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

function parseFeed(xml: string) {
  const channelPrefix = xml.match(/<channel>([\s\S]*?)<item>/i)?.[1] ?? xml;
  const channelImage = attribute(channelPrefix, 'itunes:image', 'href') || tag(channelPrefix, 'url');
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
      link: tag(item, 'link'),
      image: attribute(item, 'itunes:image', 'href') || channelImage,
      audioUrl: attribute(item, 'enclosure', 'url'),
      audioType: attribute(item, 'enclosure', 'type') || 'audio/mpeg',
      audioLength: attribute(item, 'enclosure', 'length'),
    };
  });

  return {
    sourceUrl,
    archiveUrl,
    title: tag(channelPrefix, 'title') || 'GreenPill',
    siteUrl: tag(channelPrefix, 'link'),
    description: summaryFromDescription(tag(channelPrefix, 'description') || tag(channelPrefix, 'itunes:summary')),
    image: channelImage,
    episodeCount: itemBlocks.length,
    lastBuildDate: toIsoDate(tag(channelPrefix, 'lastBuildDate') || tag(channelPrefix, 'pubDate')),
    generatedAt: new Date().toISOString(),
    episodes: episodes
      .filter((episode) => episode.title && episode.audioUrl)
      .slice(0, recentLimit),
  };
}

const response = await fetch(sourceUrl, {
  headers: { accept: 'application/rss+xml, application/xml, text/xml' },
});

if (!response.ok) {
  throw new Error(`Podcast RSS request failed with ${response.status}`);
}

const snapshot = parseFeed(await response.text());

if (snapshot.episodes.length === 0) {
  throw new Error('Podcast RSS snapshot did not produce playable episodes');
}

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`);

console.log(`Wrote ${snapshot.episodes.length} recent episodes from ${snapshot.episodeCount} RSS items.`);
