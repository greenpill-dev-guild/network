// Build proof for site-hosted chapter image copies (PRD-1218).
//
// Runs a real `astro build` against a snapshot served from this machine. In
// it one chapter has an uploaded image and another names a web page as its
// image. The image source answers 503 once, the way the admin machine does
// while it wakes, and then redirects to the file. Nothing outside this
// machine is contacted, and the build goes to a temporary directory, not to
// dist.
//
//   bun run test:chapter-image-copies:build
//
// Covered here because only a build can show it:
// - sharp running under Bun inside the Astro build;
// - the chapter page, the directory card and og:image naming the copies;
// - the copies landing in the build output;
// - one download per image, however many pages name it.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const websiteDir = join(rootDir, 'packages/website');
const snapshotPath = join(websiteDir, 'src/data/operational-content-snapshot.json');
// The website package owns the sharp dependency, so the fixture uses its copy.
const sharp = createRequire(join(websiteDir, 'package.json'))('sharp');

const SNAPSHOT_PATH = '/content/public-snapshot';
const UPLOAD_PATH = '/assets/1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed';
const UPLOAD_FILE_PATH = '/files/1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed.jpg';
const SHARED_FILE_PATH = '/file/d/abc/view';
const SITE_URL = 'https://greenpill.network';
const COPIED_IMAGE = /^\/images\/chapters\/copied\/[0-9a-f]{20}\.(webp|jpg)$/;

type Chapter = Record<string, any>;

const photo: Buffer = await sharp({
  create: { width: 2400, height: 1600, channels: 3, background: { r: 40, g: 120, b: 60 } },
}).jpeg().toBuffer();

const requests = new Map<string, number>();
let snapshotBody = '';

const server = createServer((request, response) => {
  const path = new URL(request.url ?? '/', 'http://localhost').pathname;
  const count = (requests.get(path) ?? 0) + 1;
  requests.set(path, count);

  if (path === SNAPSHOT_PATH) {
    return response.writeHead(200, { 'content-type': 'application/json' }).end(snapshotBody);
  }
  if (path === UPLOAD_PATH) {
    // The first request finds the source still waking. After that it points at the file.
    if (count === 1) return response.writeHead(503).end('Service unavailable');
    return response.writeHead(302, { location: UPLOAD_FILE_PATH }).end();
  }
  if (path === UPLOAD_FILE_PATH) {
    return response.writeHead(200, { 'content-type': 'image/jpeg', 'content-length': photo.length }).end(photo);
  }
  if (path === SHARED_FILE_PATH) {
    return response.writeHead(200, { 'content-type': 'text/html' }).end('<html><body>Sign in to view this file</body></html>');
  }
  return response.writeHead(404).end();
});
await new Promise<void>((listening) => server.listen(0, '127.0.0.1', listening));
const serverAddress = server.address();
if (!serverAddress || typeof serverAddress === 'string') throw new Error('The local content source did not start.');
const origin = `http://127.0.0.1:${serverAddress.port}`;

function hasSiteImage(chapter: Chapter): boolean {
  return chapter.media?.reviewStatus === 'approved' && String(chapter.media?.image ?? '').startsWith('/');
}

// Start from the checked-in snapshot, so the build renders real chapters.
const snapshot = JSON.parse(await readFile(snapshotPath, 'utf8'));
const [uploaded, sharedLink]: Chapter[] = snapshot.chapters.filter(hasSiteImage);
assert.ok(uploaded && sharedLink, 'the checked-in snapshot has two chapters with a site-hosted image');

const uploadAddress = `${origin}${UPLOAD_PATH}`;
const sharedLinkSiteImage: string = sharedLink.media.image;
uploaded.image = uploadAddress;
uploaded.media = { ...uploaded.media, image: uploadAddress, ogImage: uploadAddress };
uploaded.seo = { ...uploaded.seo, ogImage: uploadAddress };
sharedLink.image = `${origin}${SHARED_FILE_PATH}`;
for (const chapter of snapshot.chapters as Chapter[]) {
  // Any other remote image would send the build out to the network.
  if (chapter !== uploaded && chapter !== sharedLink && !String(chapter.image ?? '').startsWith('/')) {
    chapter.image = chapter.media?.image ?? '';
  }
}
snapshotBody = JSON.stringify(snapshot);

const outDir = await mkdtemp(join(tmpdir(), 'chapter-image-build-'));

function runBuild(): Promise<{ exitCode: number; output: string }> {
  return new Promise((resolveRun, rejectRun) => {
    const build = spawn(process.execPath, ['--bun', 'astro', 'build', '--outDir', outDir], {
      cwd: websiteDir,
      env: {
        ...process.env,
        // The two settings that make this a publish build that trusts and waits for this source.
        OPERATIONAL_CONTENT_SNAPSHOT_URL: `${origin}${SNAPSHOT_PATH}`,
        DIRECTUS_PUBLIC_URL: origin,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '';
    build.stdout.on('data', (chunk) => { output += chunk; });
    build.stderr.on('data', (chunk) => { output += chunk; });
    build.once('error', rejectRun);
    build.once('exit', (code) => resolveRun({ exitCode: code ?? 1, output }));
  });
}

function heroImage(html: string): string {
  return /class="gp-chapter-hero-media"[\s\S]*?<img[^>]*?\ssrc="([^"]+)"/.exec(html)?.[1] ?? '';
}

function metaContent(html: string, attribute: string): string {
  return new RegExp(`<meta ${attribute} content="([^"]+)"`).exec(html)?.[1] ?? '';
}

async function chapterHtmlFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true, recursive: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.html'))
    .map((entry) => join(entry.parentPath, entry.name));
}

try {
  console.log(`Building the website against ${origin} ...`);
  const { exitCode, output } = await runBuild();
  assert.equal(exitCode, 0, `the build failed:\n${output.slice(-4000)}`);

  // The chapter page shows the copy and offers the social copy to link previews.
  const uploadedHtml = await readFile(join(outDir, 'chapters', uploaded.slug, 'index.html'), 'utf8');
  const displayPath = heroImage(uploadedHtml);
  assert.match(displayPath, COPIED_IMAGE, `the ${uploaded.slug} hero image is a site-hosted copy`);
  assert.ok(displayPath.endsWith('.webp'));
  const socialUrl = metaContent(uploadedHtml, 'property="og:image"');
  assert.ok(socialUrl.startsWith(`${SITE_URL}/`), `og:image is on the site: ${socialUrl}`);
  const socialPath = socialUrl.slice(SITE_URL.length);
  assert.match(socialPath, COPIED_IMAGE);
  assert.ok(socialPath.endsWith('.jpg'));
  assert.equal(metaContent(uploadedHtml, 'name="twitter:image"'), socialUrl);

  // The directory card uses the same copy.
  const directoryHtml = await readFile(join(outDir, 'chapters/index.html'), 'utf8');
  assert.ok(directoryHtml.includes(`src="${displayPath}"`), 'the directory card shows the copy');

  // Both files are in the build output, at the sizes the site expects.
  const display = await sharp(await readFile(join(outDir, displayPath))).metadata();
  assert.deepEqual([display.format, display.width, display.height], ['webp', 1600, 1067]);
  const social = await sharp(await readFile(join(outDir, socialPath))).metadata();
  assert.deepEqual([social.format, social.width, social.height], ['jpeg', 1200, 630]);
  assert.deepEqual((await readdir(join(outDir, 'images/chapters/copied'))).sort(), [
    displayPath.split('/').pop(),
    socialPath.split('/').pop(),
  ].sort());

  // A web page is not an image: that chapter falls back to its site image, and the build says so.
  const sharedLinkHtml = await readFile(join(outDir, 'chapters', sharedLink.slug, 'index.html'), 'utf8');
  assert.equal(heroImage(sharedLinkHtml), sharedLinkSiteImage);
  assert.ok(
    output.includes(`Chapter "${sharedLink.slug}" is published without the image at image (not_an_image)`),
    'the build log names the chapter and the reason'
  );

  // No chapter page reaches back to the source.
  for (const file of await chapterHtmlFiles(join(outDir, 'chapters'))) {
    assert.equal((await readFile(file, 'utf8')).includes(origin), false, `${file} names the image source`);
  }

  // One refused request while the source woke, then one redirect and one
  // download for every page that uses the image.
  assert.equal(requests.get(UPLOAD_PATH), 2);
  assert.equal(requests.get(UPLOAD_FILE_PATH), 1);
  assert.equal(requests.get(SHARED_FILE_PATH), 1);

  console.log('Chapter image build proof passed.');
} finally {
  await new Promise((closed) => server.close(closed));
  await rm(outDir, { recursive: true, force: true });
}
