import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { before, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { DEFAULT_DIRECTUS_PUBLIC_URL as AGENT_DIRECTUS_PUBLIC_URL } from '@greenpill-network/agent/public-content';
import { toPublicOperationalContentSnapshot } from '@greenpill-network/shared/public-content';
import {
  CHAPTER_IMAGE_COPY_DIR,
  ChapterImageSourceUnreachableError,
  copyRemoteChapterImage,
  createChapterImageCopier,
  DEFAULT_DIRECTUS_PUBLIC_URL,
  remoteChapterImageAddresses,
  withSiteHostedChapterImages,
  type ChapterImageCopy,
  type ChapterImageRetry,
} from '../packages/website/src/lib/chapter-image-copies.ts';

// The website package owns the sharp dependency, so the fixtures use its copy.
const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sharp = createRequire(resolve(rootDir, 'packages/website/package.json'))('sharp');

const DIRECTUS = 'https://admin.example.test';
const UPLOAD = `${DIRECTUS}/assets/1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed`;
const ELSEWHERE = 'https://images.example.org';
const LOCAL_DIRECTUS = 'http://localhost:3302';
const quickRetry: ChapterImageRetry = { deadlineMs: 1000, attemptTimeoutMs: 500, retryDelayMs: 5 };
const briefRetry: ChapterImageRetry = { deadlineMs: 60, attemptTimeoutMs: 500, retryDelayMs: 5 };
const quickRetries = { ownOrigin: quickRetry, otherHost: quickRetry };
const briefRetries = { ownOrigin: briefRetry, otherHost: briefRetry };

let photo: Buffer;
let logo: Buffer;

before(async () => {
  // A phone photo: landscape pixels, an EXIF note to show it rotated, and a camera location.
  photo = await sharp({ create: { width: 3000, height: 2000, channels: 3, background: { r: 40, g: 120, b: 60 } } })
    .withMetadata({
      orientation: 6,
      exif: { IFD3: { GPSLatitudeRef: 'N', GPSLatitude: '51/1 30/1 3230/100' } },
    })
    .jpeg()
    .toBuffer();
  logo = await sharp({ create: { width: 400, height: 300, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .png()
    .toBuffer();
});

type Reply = (init?: RequestInit) => Response | Promise<Response>;

const serves = (bytes: () => Buffer, type: string): Reply => () =>
  new Response(new Uint8Array(bytes()), { headers: { 'content-type': type, 'content-length': String(bytes().length) } });
const servesPhoto = serves(() => photo, 'image/jpeg');
const servesLogo = serves(() => logo, 'image/png');
const answers = (status: number): Reply => () => new Response('', { status });
const redirectsTo = (location: string): Reply => () => new Response('', { status: 302, headers: { location } });
const servesPage: Reply = () =>
  new Response('<html><body>Sign in to view this file</body></html>', { headers: { 'content-type': 'text/html' } });
// No content-length: the size is only known as the body arrives.
const streamsPhoto: Reply = () =>
  new Response(new ReadableStream({
    start(controller) {
      controller.enqueue(photo.subarray(0, 1000));
      controller.enqueue(photo.subarray(1000));
      controller.close();
    },
  }));
const dropsConnection: Reply = () => {
  throw new TypeError('fetch failed');
};
const neverAnswers: Reply = (init) =>
  new Promise((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () => reject(init.signal?.reason));
  });

// Stands in for the hosts a build would fetch from. A list of replies is used in
// order, and its last entry answers every later request.
function imageSources(routes: Record<string, Reply | Reply[]>) {
  const requests = new Map<string, number>();
  const fetchImage = (async (input: string | URL | Request, init?: RequestInit) => {
    const address = String(input);
    const count = (requests.get(address) ?? 0) + 1;
    requests.set(address, count);
    const route = routes[address];
    if (!route) return new Response('', { status: 404 });
    const reply = Array.isArray(route) ? route[Math.min(count, route.length) - 1] : route;
    return reply(init);
  }) as typeof fetch;
  return { fetch: fetchImage, requests };
}

type CopyOptions = Partial<Parameters<typeof copyRemoteChapterImage>[1]>;

async function expectCopy(address: string, source: { fetch: typeof fetch }, options: CopyOptions = {}): Promise<ChapterImageCopy> {
  const outcome = await copyRemoteChapterImage(address, { retry: quickRetry, fetch: source.fetch, ...options });
  assert.equal(outcome.kind, 'copy', `expected a copy of ${address}, got ${JSON.stringify(outcome)}`);
  return outcome as ChapterImageCopy;
}

async function unusableReason(address: string, source: { fetch: typeof fetch }, options: CopyOptions = {}) {
  const outcome = await copyRemoteChapterImage(address, { retry: quickRetry, fetch: source.fetch, ...options });
  assert.equal(outcome.kind, 'unusable', `expected ${address} to be unusable`);
  return outcome.kind === 'unusable' ? outcome.reason : '';
}

function stringValues(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(stringValues);
  if (value && typeof value === 'object') return Object.values(value).flatMap(stringValues);
  return [];
}

test('a remote image is copied as a resized page file and a social file', async () => {
  const copy = await expectCopy(UPLOAD, imageSources({ [UPLOAD]: servesPhoto }));

  const display = await sharp(Buffer.from(copy.display.bytes)).metadata();
  assert.equal(display.format, 'webp');
  // 3000x2000 turned upright is 2000x3000, then fitted inside 1600.
  assert.deepEqual([display.width, display.height], [1067, 1600]);
  assert.deepEqual([copy.display.width, copy.display.height], [1067, 1600]);
  assert.equal(copy.display.contentType, 'image/webp');

  const social = await sharp(Buffer.from(copy.social.bytes)).metadata();
  assert.equal(social.format, 'jpeg');
  assert.deepEqual([social.width, social.height], [1200, 630]);
  assert.equal(copy.social.contentType, 'image/jpeg');

  for (const file of [copy.display, copy.social]) {
    assert.match(file.name, /^[0-9a-f]{20}\.(webp|jpg)$/);
    assert.equal(file.path, `${CHAPTER_IMAGE_COPY_DIR}/${file.name}`);
  }
  assert.ok(copy.display.bytes.byteLength < photo.length);
});

test('a copy carries none of the camera data from the original', async () => {
  const original = await sharp(photo).metadata();
  assert.ok(original.exif, 'the fixture carries EXIF data');
  assert.equal(original.orientation, 6);

  const copy = await expectCopy(UPLOAD, imageSources({ [UPLOAD]: servesPhoto }));
  for (const file of [copy.display, copy.social]) {
    const metadata = await sharp(Buffer.from(file.bytes)).metadata();
    assert.equal(metadata.exif, undefined);
    assert.equal(metadata.orientation, undefined);
  }
});

test('a small image is not enlarged for the page', async () => {
  const address = `${ELSEWHERE}/logo.png`;
  const copy = await expectCopy(address, imageSources({ [address]: servesLogo }));
  assert.deepEqual([copy.display.width, copy.display.height], [400, 300]);
  // The social file always has the card shape; transparency lands on white.
  assert.deepEqual([copy.social.width, copy.social.height], [1200, 630]);
  const { data } = await sharp(Buffer.from(copy.social.bytes)).raw().toBuffer({ resolveWithObject: true });
  assert.ok(data[0] > 250 && data[1] > 250 && data[2] > 250, 'the social file has a white background');
});

test('the same pixels get the same file name wherever they come from', async () => {
  const mirror = `${ELSEWHERE}/mirror.jpg`;
  const source = imageSources({ [UPLOAD]: servesPhoto, [mirror]: servesPhoto });
  const [upload, mirrored] = await Promise.all([expectCopy(UPLOAD, source), expectCopy(mirror, source)]);
  assert.equal(upload.display.name, mirrored.display.name);
  assert.equal(upload.social.name, mirrored.social.name);
});

test('a source that is still waking is waited out', async () => {
  // A sleeping machine first gives no answer in time, then 503, then the file.
  const source = imageSources({ [UPLOAD]: [dropsConnection, answers(503), answers(503), servesPhoto] });
  const copy = await expectCopy(UPLOAD, source);
  assert.equal(copy.display.width, 1067);
  assert.equal(source.requests.get(UPLOAD), 4);
});

test('an address that does not serve a usable image is unusable, not an error', async () => {
  const page = `${ELSEWHERE}/file/d/abc/view`;
  const refused = `${DIRECTUS}/assets/00000000-0000-4000-8000-000000000000`;
  const unsized = `${ELSEWHERE}/unsized.jpg`;
  const source = imageSources({
    [page]: servesPage,
    [refused]: answers(403),
    [UPLOAD]: servesPhoto,
    [unsized]: streamsPhoto,
  });

  assert.equal(await unusableReason(page, source), 'not_an_image');
  assert.equal(await unusableReason(refused, source), 'http_403');
  assert.equal(await unusableReason(`${ELSEWHERE}/gone.jpg`, source), 'http_404');
  assert.equal(await unusableReason(UPLOAD, source, { maxSourceBytes: 1000 }), 'too_large');
  assert.equal(await unusableReason(unsized, source, { maxSourceBytes: 1000 }), 'too_large');
  // A refusal or a bad body is an answer, so it is not asked for again.
  assert.equal(source.requests.get(page), 1);
  assert.equal(source.requests.get(refused), 1);
});

test('a body that arrives without a stated size is still copied', async () => {
  const unsized = `${ELSEWHERE}/unsized.jpg`;
  const copy = await expectCopy(unsized, imageSources({ [unsized]: streamsPhoto }));
  assert.deepEqual([copy.display.width, copy.display.height], [1067, 1600]);
});

test('an address the build must not fetch is unusable without a request', async () => {
  const source = imageSources({});
  for (const address of [
    'javascript:alert(1)',
    'data:image/png;base64,AAAA',
    'images/chapters/relative.jpg',
    '//cdn.example.org/image.jpg',
    'http://example.org/image.jpg',
    'ftp://example.org/image.jpg',
    // This machine and its network, by name, by address, and by address in disguise.
    'http://localhost:8080/admin',
    'https://localhost/image.jpg',
    'https://printer.localhost/image.jpg',
    'https://127.0.0.1/image.jpg',
    'https://2130706433/image.jpg',
    'https://[::1]/image.jpg',
    'https://192.168.1.10/image.jpg',
    'https://169.254.169.254/latest/meta-data',
    `${LOCAL_DIRECTUS}/assets/1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed`,
  ]) {
    assert.equal(await unusableReason(address, source), 'unsupported_address', address);
  }
  assert.equal(source.requests.size, 0);
});

test('the Directus this project runs is fetched as configured, plain http on a local stack included', async () => {
  const local = `${LOCAL_DIRECTUS}/assets/1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed`;
  const source = imageSources({ [local]: servesPhoto });
  const copy = await expectCopy(local, source, { ownOrigins: [LOCAL_DIRECTUS] });
  assert.equal(copy.display.contentType, 'image/webp');
  // Naming one origin does not open the rest of the machine.
  assert.equal(
    await unusableReason('http://localhost:8080/admin', source, { ownOrigins: [LOCAL_DIRECTUS] }),
    'unsupported_address'
  );
});

test('a redirect is followed only to an address the build may fetch', async () => {
  const cdn = 'https://cdn.example.net/photo.jpg';
  const metadata = 'http://169.254.169.254/latest/meta-data';
  const admin = 'http://localhost:8080/admin';
  const source = imageSources({
    [`${ELSEWHERE}/moved.jpg`]: redirectsTo('/photo.jpg'),
    [`${ELSEWHERE}/photo.jpg`]: servesPhoto,
    [`${ELSEWHERE}/on-a-cdn.jpg`]: redirectsTo(cdn),
    [cdn]: servesPhoto,
    [`${ELSEWHERE}/to-metadata.jpg`]: redirectsTo(metadata),
    [`${ELSEWHERE}/to-this-machine.jpg`]: redirectsTo(admin),
    [`${ELSEWHERE}/nowhere.jpg`]: answers(302),
    [`${ELSEWHERE}/loop.jpg`]: redirectsTo('/loop.jpg'),
    [metadata]: servesPhoto,
    [admin]: servesPhoto,
  });

  await expectCopy(`${ELSEWHERE}/moved.jpg`, source);
  await expectCopy(`${ELSEWHERE}/on-a-cdn.jpg`, source);
  assert.equal(await unusableReason(`${ELSEWHERE}/to-metadata.jpg`, source), 'disallowed_redirect');
  assert.equal(await unusableReason(`${ELSEWHERE}/to-this-machine.jpg`, source), 'disallowed_redirect');
  assert.equal(await unusableReason(`${ELSEWHERE}/nowhere.jpg`, source), 'disallowed_redirect');
  assert.equal(await unusableReason(`${ELSEWHERE}/loop.jpg`, source), 'disallowed_redirect');

  // The request never leaves for an address the build may not fetch.
  assert.equal(source.requests.get(metadata), undefined);
  assert.equal(source.requests.get(admin), undefined);
  assert.equal(source.requests.get(`${ELSEWHERE}/loop.jpg`), 6);
});

test('a source that never answers is reported as unreachable', async () => {
  const down = imageSources({ [UPLOAD]: answers(503) });
  await assert.rejects(
    copyRemoteChapterImage(UPLOAD, { retry: briefRetry, fetch: down.fetch }),
    (error: unknown) => {
      assert.ok(error instanceof ChapterImageSourceUnreachableError);
      assert.equal(error.address, UPLOAD);
      assert.equal(error.attempts, down.requests.get(UPLOAD));
      assert.ok(error.attempts >= 2, `asked again before giving up (${error.attempts} attempts)`);
      assert.equal(error.lastFailure, 'HTTP 503');
      return true;
    }
  );

  // Each request gets its own time limit, so a hung connection cannot stall the build.
  const hung = imageSources({ [UPLOAD]: neverAnswers });
  await assert.rejects(
    copyRemoteChapterImage(UPLOAD, { retry: { deadlineMs: 80, attemptTimeoutMs: 20, retryDelayMs: 5 }, fetch: hung.fetch }),
    (error: unknown) => {
      assert.ok(error instanceof ChapterImageSourceUnreachableError);
      assert.match(error.lastFailure, /timed? ?out/i);
      assert.ok(error.attempts >= 2);
      return true;
    }
  );
});

test('no request runs past the deadline', async () => {
  const hung = imageSources({ [UPLOAD]: neverAnswers });
  const started = Date.now();
  await assert.rejects(
    // One request would be allowed ten seconds; the deadline leaves it a fraction of one.
    copyRemoteChapterImage(UPLOAD, { retry: { deadlineMs: 100, attemptTimeoutMs: 10_000, retryDelayMs: 5 }, fetch: hung.fetch }),
    ChapterImageSourceUnreachableError
  );
  assert.ok(Date.now() - started < 2000, `gave up at the deadline (${Date.now() - started} ms)`);
});

test('a retry that allows one request asks once', async () => {
  const source = imageSources({ [UPLOAD]: [answers(503), servesPhoto] });
  await assert.rejects(
    copyRemoteChapterImage(UPLOAD, { retry: { ...quickRetry, maxAttempts: 1 }, fetch: source.fetch }),
    ChapterImageSourceUnreachableError
  );
  assert.equal(source.requests.get(UPLOAD), 1);
});

// The agent stamps the upload address; the website decides which origin it trusts.
test('the website trusts the same Directus origin the agent publishes', () => {
  assert.equal(DEFAULT_DIRECTUS_PUBLIC_URL, AGENT_DIRECTUS_PUBLIC_URL);
});

function publishedChapters(chapters: Record<string, unknown>[], uploads: Record<string, string> = {}) {
  return toPublicOperationalContentSnapshot({ chapters }, {
    onQuarantine: () => {},
    onChapterImagesWithheld: () => {},
    uploadedChapterImageUrls: new Map(Object.entries(uploads)),
  }).chapters as Array<Record<string, any>>;
}

test('a chapter with an uploaded image names only site-hosted files afterwards', async () => {
  const [published] = publishedChapters([{
    slug: 'forming-chapter',
    name: 'Forming Chapter',
    imageFileId: '1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed',
    imageAlt: 'Stewards planting trees at the first chapter meetup.',
    seo: { title: 'Forming Chapter', ogImage: '/images/chapters/forming-old.jpg' },
    media: { image: '/images/chapters/forming-old.jpg', ogImage: '/images/chapters/forming-old.jpg', reviewStatus: 'approved' },
  }], { 'forming-chapter': UPLOAD });
  assert.deepEqual(remoteChapterImageAddresses(published), [UPLOAD]);
  assert.ok(stringValues(published).some((value) => value === UPLOAD), 'the published chapter names the upload');

  const source = imageSources({ [UPLOAD]: servesPhoto });
  const copier = createChapterImageCopier({
    ownOrigins: [DIRECTUS],
    publishBuild: true,
    retry: quickRetries,
    fetch: source.fetch,
  });
  const { chapters: [chapter], dropped } = await copier.siteHostedChapters([published]);
  const copy = await expectCopy(UPLOAD, source);

  assert.deepEqual(dropped, []);
  assert.equal(chapter.image, copy.display.path);
  assert.equal(chapter.media.image, copy.display.path);
  assert.equal(chapter.media.ogImage, copy.social.path);
  assert.equal(chapter.seo.ogImage, copy.social.path);
  assert.equal(chapter.media.imageAlt, 'Stewards planting trees at the first chapter meetup.');
  // If the shared contract ever puts the upload address in another field, this fails.
  assert.deepEqual(stringValues(chapter).filter((value) => value === UPLOAD), [], 'no field still names the upload');
  assert.deepEqual(remoteChapterImageAddresses(chapter), []);
  assert.deepEqual(copier.files().map((file) => file.path).sort(), [copy.display.path, copy.social.path].sort());
});

test('a chapter whose images are already on the site is left as it is', async () => {
  const [published] = publishedChapters([{
    slug: 'settled-chapter',
    name: 'Settled Chapter',
    image: '/images/chapters/settled.jpg',
    media: { image: '/images/chapters/settled.jpg', ogImage: '/images/chapters/settled.jpg', reviewStatus: 'approved' },
    seo: { ogImage: '/images/chapters/settled.jpg' },
  }]);

  const source = imageSources({});
  const copier = createChapterImageCopier({ ownOrigins: [DIRECTUS], publishBuild: true, fetch: source.fetch });
  const { chapters: [chapter], dropped } = await copier.siteHostedChapters([published]);
  assert.equal(chapter, published);
  assert.deepEqual(dropped, []);
  assert.deepEqual(copier.files(), []);
  assert.equal(source.requests.size, 0);
});

test('an address that is not an image costs the chapter that field and nothing else', async () => {
  // The GreenSofa record held a file-sharing page in `image` beside a good site image.
  const page = `${ELSEWHERE}/file/d/abc/view`;
  const [published] = publishedChapters([{
    slug: 'shared-link-chapter',
    name: 'Shared Link Chapter',
    image: page,
    media: { image: '/images/chapters/shared-link.jpg', ogImage: '/images/chapters/shared-link.jpg', reviewStatus: 'approved' },
  }]);

  const copier = createChapterImageCopier({
    ownOrigins: [DIRECTUS],
    publishBuild: true,
    retry: quickRetries,
    fetch: imageSources({ [page]: servesPage }).fetch,
  });
  const { chapters: [chapter], dropped } = await copier.siteHostedChapters([published]);
  assert.equal(chapter.image, '');
  assert.equal(chapter.image || chapter.media.image, '/images/chapters/shared-link.jpg');
  assert.equal(chapter.name, 'Shared Link Chapter');
  assert.deepEqual(dropped, [{ slug: 'shared-link-chapter', field: 'image', address: page, reason: 'not_an_image' }]);
});

test('an address a browser would take to another host is never left in place', async () => {
  // Each of these starts with a slash, and a browser still leaves the site for evil.example.
  const chapter = {
    slug: 'disguised-chapter',
    image: '/\\evil.example/image.jpg',
    media: { image: '//evil.example/image.jpg', ogImage: '/\t/evil.example/image.jpg', reviewStatus: 'approved' },
    seo: { ogImage: '/images/chapters/disguised.jpg' },
  };
  assert.equal(remoteChapterImageAddresses(chapter).length, 3);

  const source = imageSources({});
  const copier = createChapterImageCopier({ ownOrigins: [DIRECTUS], publishBuild: true, fetch: source.fetch });
  const { chapters: [published], dropped } = await copier.siteHostedChapters([chapter]);
  assert.equal(published.image, '');
  assert.deepEqual(published.media, { image: '', ogImage: '', reviewStatus: 'approved' });
  assert.equal(published.seo.ogImage, '/images/chapters/disguised.jpg');
  assert.deepEqual(dropped.map((image) => image.reason), ['unsupported_address', 'unsupported_address', 'unsupported_address']);
  assert.equal(source.requests.size, 0);
});

test('an unreachable source fails the copy only when the project runs that source', async () => {
  const external = `${ELSEWHERE}/retired-host.jpg`;
  const chapters = [
    { slug: 'uploaded-chapter', image: UPLOAD, media: { reviewStatus: 'approved' } },
    { slug: 'sourced-chapter', image: external, media: { reviewStatus: 'approved' } },
  ];
  const source = imageSources({ [UPLOAD]: answers(503), [external]: answers(503) });

  // The publish build runs Directus, so a missing upload must stop it.
  const publishBuild = createChapterImageCopier({
    ownOrigins: [`${DIRECTUS}/`],
    publishBuild: true,
    retry: briefRetries,
    fetch: source.fetch,
  });
  await assert.rejects(publishBuild.siteHostedChapters(chapters), ChapterImageSourceUnreachableError);

  // Nobody here can bring someone else's host back, so that chapter loses its image.
  const { chapters: [sourced], dropped } = await publishBuild.siteHostedChapters([chapters[1]]);
  assert.equal(sourced.image, '');
  assert.deepEqual(dropped, [{ slug: 'sourced-chapter', field: 'image', address: external, reason: 'unreachable' }]);
  assert.ok((source.requests.get(external) ?? 0) >= 2, 'another host is asked again before it is given up on');
});

test('the dev server and fallback builds ask each source once and never fail', async () => {
  const external = `${ELSEWHERE}/slow-host.jpg`;
  const chapters = [
    { slug: 'uploaded-chapter', image: UPLOAD, media: { reviewStatus: 'approved' } },
    { slug: 'sourced-chapter', image: external, media: { reviewStatus: 'approved' } },
  ];
  // Both would serve the file on a second request.
  const source = imageSources({ [UPLOAD]: [answers(503), servesPhoto], [external]: [dropsConnection, servesPhoto] });

  const devServer = createChapterImageCopier({ ownOrigins: [DIRECTUS], publishBuild: false, fetch: source.fetch });
  const { chapters: published, dropped } = await devServer.siteHostedChapters(chapters);
  assert.deepEqual(published.map((chapter) => chapter.image), ['', '']);
  assert.deepEqual(dropped.map((image) => image.reason), ['unreachable', 'unreachable']);
  assert.equal(source.requests.get(UPLOAD), 1);
  assert.equal(source.requests.get(external), 1);
});

test('one address is fetched once, however many chapters and calls name it', async () => {
  const chapters = [
    { slug: 'first', image: UPLOAD, media: { image: UPLOAD, ogImage: UPLOAD, reviewStatus: 'approved' } },
    { slug: 'second', image: UPLOAD, media: { reviewStatus: 'approved' } },
  ];
  const source = imageSources({ [UPLOAD]: servesPhoto });

  const copier = createChapterImageCopier({
    ownOrigins: [DIRECTUS],
    publishBuild: true,
    retry: quickRetries,
    fetch: source.fetch,
  });
  const first = await copier.siteHostedChapters(chapters);
  const again = await copier.siteHostedChapters(chapters);
  assert.equal(source.requests.get(UPLOAD), 1);
  assert.deepEqual(again.chapters, first.chapters);
  assert.equal(first.chapters[0].image, first.chapters[1].image);
  assert.equal(copier.files().length, 2);
});

test('a copy is fetched again once its reuse time has passed', async () => {
  // Replace File in Directus swaps the pixels and keeps the address.
  const chapters = [{ slug: 'replaced', image: UPLOAD, media: { reviewStatus: 'approved' } }];
  const source = imageSources({ [UPLOAD]: [servesPhoto, servesLogo] });

  const devServer = createChapterImageCopier({
    ownOrigins: [DIRECTUS],
    publishBuild: false,
    reuseForMs: 200,
    fetch: source.fetch,
  });
  const first = await devServer.siteHostedChapters(chapters);
  const soonAfter = await devServer.siteHostedChapters(chapters);
  assert.equal(source.requests.get(UPLOAD), 1);
  assert.equal(soonAfter.chapters[0].image, first.chapters[0].image);

  await new Promise((resolve) => setTimeout(resolve, 300));
  const later = await devServer.siteHostedChapters(chapters);
  assert.equal(source.requests.get(UPLOAD), 2);
  assert.notEqual(later.chapters[0].image, first.chapters[0].image);
  // The earlier file stays served, for a page that was rendered before the swap.
  assert.equal(devServer.files().length, 4);
});

test('a chapter is never rewritten without knowing what became of its image', () => {
  assert.throws(
    () => withSiteHostedChapterImages({ slug: 'unsettled', image: 'https://example.org/image.jpg' }, new Map()),
    /No copy outcome/
  );
});
