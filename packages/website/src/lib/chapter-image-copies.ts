// Site-hosted copies of remote chapter images.
//
// A chapter image address is either a site path (/images/...) or remote: an
// uploaded file that Directus serves, or an approved external address. The
// public site never references a remote one. The build fetches it, resizes it
// and serves the copy from its own origin, so a chapter page never waits on
// another machine. The admin machine in particular sleeps when idle and
// answers 503 for a minute or two while it wakes (PRD-1218).
//
// Nothing here imports Astro or Vite, so tests can load the module directly.
import { createHash } from 'node:crypto';
import { isIP } from 'node:net';
import sharp from 'sharp';

export const CHAPTER_IMAGE_COPY_DIR = '/images/chapters/copied';

// Where Directus serves uploads unless DIRECTUS_PUBLIC_URL says otherwise. The
// agent stamps this origin into the snapshot; a test keeps the two in step.
export const DEFAULT_DIRECTUS_PUBLIC_URL = 'https://admin.greenpill.network';

// Directus accepts uploads up to 25 MB.
const DEFAULT_MAX_SOURCE_BYTES = 30 * 1024 * 1024;
// The chapter hero is at most 920 CSS px wide.
const DISPLAY_MAX_SIDE_PX = 1600;
const SOCIAL_WIDTH_PX = 1200;
const SOCIAL_HEIGHT_PX = 630;
const SOCIAL_BACKGROUND = { r: 255, g: 255, b: 255 };
const COPIES_AT_ONCE = 3;
const MAX_REDIRECTS = 5;
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
// Stands in for the site when asking where a browser would take an address.
const SITE_STAND_IN = 'https://site.invalid';

export interface SiteImageFile {
  /** Path the site serves the file from. */
  path: string;
  /** File name under CHAPTER_IMAGE_COPY_DIR: a hash of the bytes plus the extension. */
  name: string;
  contentType: 'image/webp' | 'image/jpeg';
  width: number;
  height: number;
  /** Backed by its own ArrayBuffer, which is what a Response body accepts. */
  bytes: Uint8Array<ArrayBuffer>;
}

export interface ChapterImageCopy {
  kind: 'copy';
  /** For the chapter page and the directory card. */
  display: SiteImageFile;
  /** For og:image and twitter:image. */
  social: SiteImageFile;
}

export type UnusableChapterImageReason =
  | 'unsupported_address'
  | 'disallowed_redirect'
  | 'not_an_image'
  | 'too_large'
  | 'unreachable'
  | `http_${number}`;

export interface UnusableChapterImage {
  kind: 'unusable';
  reason: UnusableChapterImageReason;
}

export type ChapterImageOutcome = ChapterImageCopy | UnusableChapterImage;

export type ChapterImageField = 'image' | 'media.image' | 'media.ogImage' | 'seo.ogImage';

/** An image a chapter is published without, because it could not be copied. */
export interface DroppedChapterImage {
  slug: string;
  field: ChapterImageField;
  address: string;
  reason: UnusableChapterImageReason;
}

export interface ChapterImageRetry {
  /** How long to keep asking one source. No request runs past it. */
  deadlineMs: number;
  /** Time allowed for one request, body included. */
  attemptTimeoutMs: number;
  retryDelayMs: number;
  /** Stops asking after this many requests, whatever time is left. */
  maxAttempts?: number;
}

// Measured on 2026-10-09: the sleeping admin machine answered 503 after 46 s
// and Directus was listening 62 to 115 s after the machine started.
export const WAKING_SOURCE_RETRY: ChapterImageRetry = Object.freeze({
  deadlineMs: 5 * 60_000,
  attemptTimeoutMs: 90_000,
  retryDelayMs: 5_000,
});

export const OTHER_SOURCE_RETRY: ChapterImageRetry = Object.freeze({
  deadlineMs: 45_000,
  attemptTimeoutMs: 20_000,
  retryDelayMs: 2_000,
});

export const ASK_ONCE: ChapterImageRetry = Object.freeze({
  deadlineMs: 15_000,
  attemptTimeoutMs: 15_000,
  retryDelayMs: 0,
  maxAttempts: 1,
});

export class ChapterImageSourceUnreachableError extends Error {
  constructor(
    readonly address: string,
    readonly attempts: number,
    readonly lastFailure: string
  ) {
    super(`Chapter image source did not answer after ${attempts} attempt(s): ${address} (${lastFailure})`);
    this.name = 'ChapterImageSourceUnreachableError';
  }
}

type ChapterRecord = Record<string, unknown>;

// The chapter fields that hold an image address, and what the site uses each
// one for. resolvePublicChapterImage in packages/shared/src/public-content.ts
// decides which of them a chapter publishes.
const CHAPTER_IMAGE_FIELDS: ReadonlyArray<{
  field: ChapterImageField;
  holder: 'media' | 'seo' | null;
  key: string;
  use: 'display' | 'social';
}> = [
  { field: 'image', holder: null, key: 'image', use: 'display' },
  { field: 'media.image', holder: 'media', key: 'image', use: 'display' },
  { field: 'media.ogImage', holder: 'media', key: 'ogImage', use: 'social' },
  { field: 'seo.ogImage', holder: 'seo', key: 'ogImage', use: 'social' },
];

function parseAddress(address: string, base?: URL | string): URL | null {
  try {
    return new URL(address, base);
  } catch {
    return null;
  }
}

// Asked the way a browser would resolve it, not matched as text: a browser
// reads "//host/x" and "/\host/x" as another host.
function isSitePath(address: string): boolean {
  return address.startsWith('/') && parseAddress(address, SITE_STAND_IN)?.origin === SITE_STAND_IN;
}

function toOrigins(addresses: readonly string[]): Set<string> {
  return new Set(addresses.map((address) => parseAddress(address)?.origin ?? address));
}

// Every address here was typed by somebody, and the request leaves from a CI
// runner or a developer's machine, so it must not be steerable at that machine
// or its network.
// - An origin this project runs is fetched as configured, plain http on a
//   local stack included.
// - Anything else has to be https and name a host. An IP address and
//   localhost are refused. A name that points at a private address still has
//   to present a certificate valid for that name before a request is sent.
function mayFetch(url: URL, ownOrigins: ReadonlySet<string>): boolean {
  if (ownOrigins.has(url.origin)) return true;
  if (url.protocol !== 'https:') return false;
  const host = url.hostname.replace(/^\[|\]$/g, '').replace(/\.$/, '');
  return isIP(host) === 0 && host !== 'localhost' && !host.endsWith('.localhost');
}

function asRecord(value: unknown): ChapterRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as ChapterRecord) : null;
}

function readImageAddress(chapter: ChapterRecord, { holder, key }: { holder: string | null; key: string }): string {
  const record = holder ? asRecord(chapter[holder]) : chapter;
  const value = record?.[key];
  return typeof value === 'string' ? value.trim() : '';
}

function writeImageAddress(
  chapter: ChapterRecord,
  { holder, key }: { holder: string | null; key: string },
  address: string
): ChapterRecord {
  if (!holder) return { ...chapter, [key]: address };
  return { ...chapter, [holder]: { ...asRecord(chapter[holder]), [key]: address } };
}

/** The remote image addresses a chapter names, without repeats. */
export function remoteChapterImageAddresses(chapter: ChapterRecord): string[] {
  const addresses = CHAPTER_IMAGE_FIELDS
    .map((imageField) => readImageAddress(chapter, imageField))
    .filter((address) => address !== '' && !isSitePath(address));
  return [...new Set(addresses)];
}

/**
 * Points each remote image address of a chapter at its site-hosted copy. An
 * address without a usable copy is emptied, so the chapter keeps its page and
 * loses only that image.
 */
export function withSiteHostedChapterImages<T extends ChapterRecord>(
  chapter: T,
  outcomes: ReadonlyMap<string, ChapterImageOutcome>
): { chapter: T; dropped: DroppedChapterImage[] } {
  const dropped: DroppedChapterImage[] = [];
  let siteHosted: ChapterRecord = chapter;

  for (const imageField of CHAPTER_IMAGE_FIELDS) {
    const address = readImageAddress(chapter, imageField);
    if (address === '' || isSitePath(address)) continue;

    const outcome = outcomes.get(address);
    if (!outcome) throw new Error(`No copy outcome for chapter image ${address}`);

    if (outcome.kind === 'unusable') {
      dropped.push({
        slug: typeof chapter.slug === 'string' ? chapter.slug : '',
        field: imageField.field,
        address,
        reason: outcome.reason,
      });
    }
    siteHosted = writeImageAddress(
      siteHosted,
      imageField,
      outcome.kind === 'copy' ? outcome[imageField.use].path : ''
    );
  }

  return { chapter: siteHosted as T, dropped };
}

function unusable(reason: UnusableChapterImageReason): UnusableChapterImage {
  return { kind: 'unusable', reason };
}

function describeFailure(error: unknown): string {
  if (error instanceof Error) return error.name === 'Error' ? error.message : `${error.name}: ${error.message}`;
  return String(error);
}

// 5xx covers a machine that is still waking and Directus shedding load.
function saysTryAgain(status: number): boolean {
  return status === 408 || status === 425 || status === 429 || status >= 500;
}

async function readBody(response: Response, maxBytes: number): Promise<Uint8Array | 'too_large'> {
  if (!response.body) return new Uint8Array();

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel().catch(() => {});
      return 'too_large';
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

type DownloadAttempt =
  | { kind: 'downloaded'; bytes: Uint8Array }
  | { kind: 'try_again'; failure: string }
  | UnusableChapterImage;

interface DownloadOptions {
  fetchImage: typeof fetch;
  ownOrigins: ReadonlySet<string>;
  maxBytes: number;
}

async function readImageResponse(response: Response, maxBytes: number): Promise<DownloadAttempt> {
  if (!response.ok) {
    await response.body?.cancel().catch(() => {});
    return saysTryAgain(response.status)
      ? { kind: 'try_again', failure: `HTTP ${response.status}` }
      : unusable(`http_${response.status}`);
  }

  if (Number(response.headers.get('content-length')) > maxBytes) {
    await response.body?.cancel().catch(() => {});
    return unusable('too_large');
  }

  const bytes = await readBody(response, maxBytes);
  return bytes === 'too_large' ? unusable('too_large') : { kind: 'downloaded', bytes };
}

// Redirects are followed by hand so that every hop passes mayFetch. Left to
// fetch, an approved address could send the request anywhere.
async function attemptDownload(
  address: URL,
  timeoutMs: number,
  { fetchImage, ownOrigins, maxBytes }: DownloadOptions
): Promise<DownloadAttempt> {
  const signal = AbortSignal.timeout(timeoutMs);
  try {
    let hop = address;
    for (let redirects = 0; ; redirects += 1) {
      const response = await fetchImage(hop.href, {
        headers: { accept: 'image/*' },
        redirect: 'manual',
        signal,
      });
      if (!REDIRECT_STATUSES.has(response.status)) return await readImageResponse(response, maxBytes);

      await response.body?.cancel().catch(() => {});
      const next = parseAddress(response.headers.get('location') ?? '', hop);
      if (!next || redirects === MAX_REDIRECTS || !mayFetch(next, ownOrigins)) {
        return unusable('disallowed_redirect');
      }
      hop = next;
    }
  } catch (error) {
    // No answer, a dropped connection or a timeout says nothing about the image.
    return { kind: 'try_again', failure: describeFailure(error) };
  }
}

function toSiteImageFile(
  rendered: { data: Uint8Array; info: { width: number; height: number } },
  extension: 'webp' | 'jpg'
): SiteImageFile {
  const name = `${createHash('sha256').update(rendered.data).digest('hex').slice(0, 20)}.${extension}`;
  return {
    path: `${CHAPTER_IMAGE_COPY_DIR}/${name}`,
    name,
    contentType: extension === 'webp' ? 'image/webp' : 'image/jpeg',
    width: rendered.info.width,
    height: rendered.info.height,
    bytes: new Uint8Array(rendered.data),
  };
}

// Both files are re-encoded from the pixels alone: sharp applies the EXIF
// orientation and then leaves all metadata out, including camera location.
async function renderCopy(source: Uint8Array): Promise<ChapterImageOutcome> {
  try {
    const image = sharp(source, { failOn: 'error' }).rotate();
    const [display, social] = await Promise.all([
      image
        .clone()
        .resize({ width: DISPLAY_MAX_SIDE_PX, height: DISPLAY_MAX_SIDE_PX, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer({ resolveWithObject: true }),
      image
        .clone()
        .resize({ width: SOCIAL_WIDTH_PX, height: SOCIAL_HEIGHT_PX, fit: 'cover' })
        .flatten({ background: SOCIAL_BACKGROUND })
        .jpeg({ quality: 82, mozjpeg: true })
        .toBuffer({ resolveWithObject: true }),
    ]);
    return {
      kind: 'copy',
      display: toSiteImageFile(display, 'webp'),
      social: toSiteImageFile(social, 'jpg'),
    };
  } catch {
    return unusable('not_an_image');
  }
}

/**
 * Fetches one remote image and renders its site-hosted files. Throws
 * ChapterImageSourceUnreachableError when the source keeps saying try again,
 * or gives no answer, for as long as the retry allows.
 */
export async function copyRemoteChapterImage(
  address: string,
  {
    retry,
    ownOrigins = [],
    maxSourceBytes = DEFAULT_MAX_SOURCE_BYTES,
    fetch: fetchImage = fetch,
  }: { retry: ChapterImageRetry; ownOrigins?: readonly string[]; maxSourceBytes?: number; fetch?: typeof fetch }
): Promise<ChapterImageOutcome> {
  const download: DownloadOptions = { fetchImage, ownOrigins: toOrigins(ownOrigins), maxBytes: maxSourceBytes };
  const url = parseAddress(address);
  if (!url || !mayFetch(url, download.ownOrigins)) return unusable('unsupported_address');

  const deadline = Date.now() + retry.deadlineMs;
  for (let attempts = 1; ; attempts += 1) {
    const timeLeftMs = Math.max(deadline - Date.now(), 1);
    const attempt = await attemptDownload(url, Math.min(retry.attemptTimeoutMs, timeLeftMs), download);
    if (attempt.kind === 'downloaded') return renderCopy(attempt.bytes);
    if (attempt.kind === 'unusable') return attempt;

    if (attempts >= (retry.maxAttempts ?? Infinity) || Date.now() + retry.retryDelayMs >= deadline) {
      throw new ChapterImageSourceUnreachableError(address, attempts, attempt.failure);
    }
    await new Promise((resolve) => setTimeout(resolve, retry.retryDelayMs));
  }
}

export interface ChapterImageCopierOptions {
  /**
   * Origins this project runs, such as the Directus that serves uploads. They
   * are fetched as configured; every other address has to pass mayFetch.
   */
  ownOrigins: readonly string[];
  /**
   * True for the build that publishes the site. It keeps asking a source that
   * is slow to answer, and fails if one of the project's own origins never
   * does: that image exists, and the site must not go out without it. Any
   * other host that stays unreachable costs the chapter its image, because
   * nobody here can bring that host back.
   *
   * Everything else, the dev server and builds from the checked-in fallback,
   * asks each source once and never fails.
   */
  publishBuild: boolean;
  /**
   * How long an outcome is reused before the address is fetched again. Forever
   * by default, which suits a build. The dev server outlives the files it
   * shows, so it sets a limit.
   */
  reuseForMs?: number;
  retry?: { ownOrigin?: ChapterImageRetry; otherHost?: ChapterImageRetry; once?: ChapterImageRetry };
  maxSourceBytes?: number;
  fetch?: typeof fetch;
}

export interface ChapterImageCopier {
  /** Chapters whose image addresses all point at this site. */
  siteHostedChapters<T extends ChapterRecord>(
    chapters: readonly T[]
  ): Promise<{ chapters: T[]; dropped: DroppedChapterImage[] }>;
  /** Every file the site has to serve for the copies made so far. */
  files(): SiteImageFile[];
}

async function forEachLimited<T>(items: readonly T[], limit: number, run: (item: T) => Promise<void>) {
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const item = items[next];
      next += 1;
      await run(item);
    }
  });
  await Promise.all(workers);
}

/** Copies each remote address once, however many chapters or calls name it. */
export function createChapterImageCopier({
  ownOrigins,
  publishBuild,
  reuseForMs = Infinity,
  retry = {},
  maxSourceBytes,
  fetch: fetchImage,
}: ChapterImageCopierOptions): ChapterImageCopier {
  const ownOriginSet = toOrigins(ownOrigins);
  const outcomes = new Map<string, { outcome: Promise<ChapterImageOutcome>; settledAt: number | null }>();
  const files = new Map<string, SiteImageFile>();

  async function copy(address: string): Promise<ChapterImageOutcome> {
    const isOwn = ownOriginSet.has(parseAddress(address)?.origin ?? '');
    const patience = !publishBuild
      ? retry.once ?? ASK_ONCE
      : isOwn
        ? retry.ownOrigin ?? WAKING_SOURCE_RETRY
        : retry.otherHost ?? OTHER_SOURCE_RETRY;
    try {
      const outcome = await copyRemoteChapterImage(address, {
        retry: patience,
        ownOrigins,
        maxSourceBytes,
        fetch: fetchImage,
      });
      if (outcome.kind === 'copy') {
        files.set(outcome.display.path, outcome.display);
        files.set(outcome.social.path, outcome.social);
      }
      return outcome;
    } catch (error) {
      const mustHave = publishBuild && isOwn;
      if (error instanceof ChapterImageSourceUnreachableError && !mustHave) return unusable('unreachable');
      throw error;
    }
  }

  function outcomeFor(address: string): Promise<ChapterImageOutcome> {
    // A copy still in flight is always shared; the reuse time starts when it settles.
    const known = outcomes.get(address);
    if (known && (known.settledAt === null || Date.now() - known.settledAt <= reuseForMs)) return known.outcome;

    const entry: { outcome: Promise<ChapterImageOutcome>; settledAt: number | null } = {
      outcome: copy(address),
      settledAt: null,
    };
    const settle = () => {
      entry.settledAt = Date.now();
    };
    entry.outcome.then(settle, settle);
    outcomes.set(address, entry);
    return entry.outcome;
  }

  return {
    async siteHostedChapters<T extends ChapterRecord>(chapters: readonly T[]) {
      const addresses = [...new Set(chapters.flatMap(remoteChapterImageAddresses))];
      const settled = new Map<string, ChapterImageOutcome>();
      await forEachLimited(addresses, COPIES_AT_ONCE, async (address) => {
        settled.set(address, await outcomeFor(address));
      });

      const dropped: DroppedChapterImage[] = [];
      const siteHosted = chapters.map((chapter) => {
        const result = withSiteHostedChapterImages(chapter, settled);
        dropped.push(...result.dropped);
        return result.chapter;
      });
      return { chapters: siteHosted, dropped };
    },
    files() {
      return [...files.values()];
    },
  };
}
