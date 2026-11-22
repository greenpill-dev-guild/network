import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import fc from 'fast-check';
import {
  PUBLIC_OPERATIONAL_CONTENT_COLLECTIONS,
  PUBLIC_OPERATIONAL_RECORD_FIELDS,
  containsPrivateOperationalContentField,
  toPublicOperationalContentSnapshot,
  type PublicChapterRecord,
  type PublicOperationalContentCollection,
  type PublicPersonRecord,
} from '@greenpill-network/shared/public-content';
import {
  MAP_NODE_STATUSES,
  PRIVATE_MAP_NODE_FIELDS,
  PUBLIC_MAP_NODE_FIELDS,
  containsPrivateMapNodeField,
  toPublicMapNode,
  type PublicMapNode,
} from '@greenpill-network/shared/map-nodes';
import {
  containsPrivateMapStateField,
  toPublicMapStateChapterNode,
  toPublicMapStateSubmittedNode,
  type PublicMapStateNode,
} from '@greenpill-network/shared/map-state';
import {
  PRIVATE_CHAPTER_IMPACT_FIELDS,
  containsPrivateChapterImpactField,
  toPublicChapterImpactPayload,
} from '@greenpill-network/shared/chapter-impact';
import { isPublicMapCoordinate } from '@greenpill-network/shared/map-locations';

// A value only ever placed in a field that must not be published. Finding it anywhere in a
// payload is a leak, whatever the key it travelled under.
const SECRET = 'SECRET-7f3a-never-public';
const RUNS = { numRuns: 300 };
// Each run builds whole snapshots; a loaded machine must not fail a property on time alone.
const SLOW = { timeout: 60_000 };

const committed = JSON.parse(
  readFileSync(new URL('../packages/website/src/data/operational-content-snapshot.json', import.meta.url), 'utf8'),
);

const leaks = (payload: unknown) => JSON.stringify(payload ?? null).includes(SECRET);

const UNSAFE_OBJECT_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

// Field names drawn both from the known private lists and at random, so the properties cover
// names nobody has thought of yet.
const knownPrivateKey = fc.constantFrom(
  ...PRIVATE_MAP_NODE_FIELDS,
  ...PRIVATE_CHAPTER_IMPACT_FIELDS,
  'pendingSubmission',
  'pending_submission',
  'stewardNotes',
  'adminNotes',
  'ip',
);
const anyKey = fc.oneof(knownPrivateKey, fc.string({ minLength: 1, maxLength: 16 }));
const secretValue = fc.constantFrom<unknown>(SECRET, { note: SECRET }, [SECRET], { nested: { deeper: SECRET } });

function extraFields(excluded: ReadonlySet<string>) {
  return fc.dictionary(
    anyKey.filter((key) => !excluded.has(key) && !UNSAFE_OBJECT_KEYS.has(key)),
    secretValue,
    { maxKeys: 6 },
  );
}

// Workflow fields the snapshot strips before it checks a record for private fields: they are
// dropped, not quarantined.
const OPERATIONAL_WORKFLOW_KEYS = new Set([
  'reviewedAt',
  'reviewed_at',
  'reviewedBy',
  'reviewed_by',
  'createdBy',
  'created_by',
  'updatedBy',
  'updated_by',
]);

// Inputs an operational record reads besides its published fields: the snapshot's own controls
// and the chapter image fields resolvePublicChapterImage turns into published alt text and credit.
const OPERATIONAL_CONTROL_KEYS = ['data', 'publicationStatus', 'publication_status', 'imageAlt', 'imageCredit'];

function publish(collection: PublicOperationalContentCollection, records: Record<string, unknown>[]) {
  return toPublicOperationalContentSnapshot(
    {
      // Projects are published only under a published guild.
      guilds: collection === 'guilds' ? records : committed.guilds,
      [collection]: records,
      generatedAt: committed.generatedAt,
    },
    { onQuarantine: () => {}, onChapterImagesWithheld: () => {} },
  );
}

for (const collection of PUBLIC_OPERATIONAL_CONTENT_COLLECTIONS) {
  const allowed = new Set<string>(PUBLIC_OPERATIONAL_RECORD_FIELDS[collection]);

  test(`a ${collection} record publishes only its allowlisted fields, and extra fields change nothing`, SLOW, () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...committed[collection]),
        extraFields(new Set([...allowed, ...OPERATIONAL_CONTROL_KEYS])),
        (base: Record<string, unknown>, extras) => {
          const baseline = publish(collection, [base])[collection];
          const snapshot = publish(collection, [{ ...base, ...extras }]);
          assert.ok(!leaks(snapshot), 'a value from a field outside the allowlist was published');
          const published = snapshot[collection];
          const checked = Object.fromEntries(
            Object.entries(extras).filter(([key]) => !OPERATIONAL_WORKFLOW_KEYS.has(key)),
          );
          if (containsPrivateOperationalContentField(checked)) {
            // A private-looking field quarantines the record rather than publish around it.
            assert.equal(published.length, 0);
            return;
          }
          assert.deepEqual(published, baseline);
          // The pick keeps the record's own key order, so a regenerated snapshot does not churn.
          assert.deepEqual(published.map(Object.keys), baseline.map(Object.keys));
          for (const record of published) {
            for (const key of Object.keys(record)) assert.ok(allowed.has(key), `${collection} published ${key}`);
          }
        },
      ),
      RUNS,
    );
  });

  test(`a private field nested inside a published ${collection} value is never published`, SLOW, () => {
    // Object values and arrays of objects (links, stewards, proof signals, public members).
    const isObject = (value: unknown) => value !== null && typeof value === 'object' && !Array.isArray(value);
    const objectFields = [...allowed].filter((field) =>
      committed[collection].some((record: Record<string, unknown>) => {
        const value = record[field];
        return isObject(value) || (Array.isArray(value) && value.some(isObject));
      }),
    );
    // Themes hold no object values, so there is nothing nested to plant a field in.
    if (collection === 'themes') {
      assert.deepEqual(objectFields, []);
      return;
    }
    assert.ok(objectFields.length > 0);
    fc.assert(
      fc.property(
        fc.constantFrom(...committed[collection]),
        fc.constantFrom(...objectFields),
        // Private elsewhere but public here: an operational record's `media`, and its media's
        // `reviewStatus`, which says whether the image may be shown.
        knownPrivateKey.filter((key) => !['media', 'reviewStatus', 'review_status'].includes(key)),
        (base: Record<string, unknown>, field, key) => {
          const value = base[field];
          const planted = Array.isArray(value)
            ? [{ ...(value.find(isObject) ?? {}), [key]: SECRET }, ...value]
            : { ...(isObject(value) ? (value as object) : {}), [key]: SECRET };
          const record = { ...base, [field]: planted };
          const snapshot = publish(collection, [record]);
          // The record is quarantined, or the field that held the value is withheld whole (an
          // unreviewed chapter image's media); either way nothing private is published.
          assert.ok(!leaks(snapshot));
          assert.ok(!containsPrivateOperationalContentField(snapshot[collection]));
        },
      ),
      RUNS,
    );
  });
}

test('a chapter that gives its point as latitude and longitude still gets a map location', () => {
  const base = committed.chapters.find((chapter: Record<string, any>) => chapter.lat && !chapter.seo?.noindex);
  const { lat, long, ...rest } = base;
  const snapshot = publish('chapters', [{ ...rest, latitude: lat, longitude: long }]);
  const location = snapshot.locations.find((entry) => entry.id === base.slug);
  assert.deepEqual(location && { lat: location.lat, long: location.long }, { lat, long });
  assert.ok(!('latitude' in snapshot.chapters[0]), 'the alias itself is not a published field');
});

const publicText = fc.string({ maxLength: 24 });
const publicCoordinate = fc
  .record({ lat: fc.double({ min: -85, max: 85, noNaN: true }), long: fc.double({ min: -179, max: 179, noNaN: true }) })
  .filter(({ lat, long }) => isPublicMapCoordinate(lat, long));

// Every field toPublicMapNode and toPublicMapStateSubmittedNode read; nothing else can reach them.
const MAP_NODE_INPUT_KEYS = new Set([
  ...PUBLIC_MAP_NODE_FIELDS,
  'displayName',
  'placeName',
  'intent',
  'chapter_slug',
  'profile_url',
  'type',
  'nodeType',
  'href',
]);

const submission = fc
  .record({
    id: fc.uuid(),
    name: publicText,
    place: publicText,
    city: publicText,
    region: publicText,
    country: publicText,
    role: publicText,
    publicNote: publicText,
    themes: fc.array(publicText, { maxLength: 3 }),
    coordinate: publicCoordinate,
    privateFields: fc.subarray([...PRIVATE_MAP_NODE_FIELDS]),
    extras: extraFields(MAP_NODE_INPUT_KEYS),
  })
  .map(({ coordinate, privateFields, extras, ...fields }) => ({
    ...fields,
    ...coordinate,
    ...Object.fromEntries(privateFields.map((field) => [field, SECRET])),
    ...extras,
  }));

test('an approved map node publishes only its public fields, never a private one', () => {
  fc.assert(
    fc.property(submission, (input) => {
      const node = toPublicMapNode({ ...input, status: 'approved' });
      assert.ok(node, 'an approved node at a public coordinate is published');
      assert.ok(!leaks(node));
      assert.ok(!containsPrivateMapNodeField(node));
      for (const key of Object.keys(node)) assert.ok(PUBLIC_MAP_NODE_FIELDS.includes(key), key);
    }),
    RUNS,
  );
});

test('a pending, rejected or archived submission is never published', () => {
  const unpublished = MAP_NODE_STATUSES.filter((status) => status !== 'approved');
  fc.assert(
    fc.property(submission, fc.constantFrom(...unpublished, undefined, ''), (input, status) => {
      assert.equal(toPublicMapNode({ ...input, status }), null);
      assert.equal(toPublicMapStateSubmittedNode({ ...input, status }), null);
    }),
    RUNS,
  );
});

test('map state nodes carry no private field or value', SLOW, () => {
  const CHAPTER_INPUT_KEYS = new Set([
    'lat',
    'latitude',
    'long',
    'lng',
    'longitude',
    'slug',
    'id',
    'name',
    'themes',
    'themeSlugs',
    'place',
    'city',
    'region',
    'country',
    'href',
    'link',
    'status',
  ]);
  const chapterLocation = fc
    .record({
      slug: fc.stringMatching(/^[a-z][a-z0-9-]{0,15}$/),
      name: publicText.filter((name) => name.trim() !== ''),
      city: publicText,
      country: publicText,
      themeSlugs: fc.array(publicText, { maxLength: 3 }),
      coordinate: publicCoordinate,
      extras: extraFields(CHAPTER_INPUT_KEYS),
    })
    .map(({ coordinate, extras, ...fields }) => ({ ...fields, ...coordinate, ...extras }));
  fc.assert(
    fc.property(submission, chapterLocation, (input, location) => {
      for (const node of [
        toPublicMapStateSubmittedNode({ ...input, status: 'approved' }),
        toPublicMapStateChapterNode(location),
      ]) {
        assert.ok(node);
        assert.ok(!leaks(node));
        assert.ok(!containsPrivateMapStateField(node));
      }
    }),
    RUNS,
  );
});

test('raw upstream impact feedback, media and private notes never reach the impact payload', () => {
  const withPrivate = (keys: string[]) => Object.fromEntries(keys.map((key) => [key, SECRET]));
  const privateKeys = fc.subarray([...PRIVATE_CHAPTER_IMPACT_FIELDS], { minLength: 1 });
  fc.assert(
    fc.property(privateKeys, privateKeys, privateKeys, privateKeys, (top, project, milestone, garden) => {
      const payload = toPublicChapterImpactPayload({
        chapterSlug: 'test-chapter',
        chapterName: 'Test chapter',
        sources: {
          impactEnabled: true,
          karmaProjectUID: '0xproject',
          greenGoodsGardenAddress: '0x0000000000000000000000000000000000000001',
          ...withPrivate(top),
        },
        karma: {
          ...withPrivate(top),
          project: {
            uid: '0xproject',
            slug: 'project',
            title: 'Project',
            url: 'https://gap.karmahq.xyz/project/project',
            ...withPrivate(project),
          },
          milestones: [{ uid: 'm1', title: 'Milestone', url: 'https://gap.karmahq.xyz/m1', ...withPrivate(milestone) }],
        },
        greenGoods: {
          ...withPrivate(top),
          garden: {
            address: '0x0000000000000000000000000000000000000001',
            chainId: 42161,
            name: 'Garden',
            ...withPrivate(garden),
          },
        },
        generatedAt: '2026-11-21T00:00:00.000Z',
      });
      assert.ok(!leaks(payload));
      assert.ok(!containsPrivateChapterImpactField(payload));
    }),
    RUNS,
  );
});

test('public payload types name their fields, so a private field does not type-check', () => {
  const chapter: PublicChapterRecord = { slug: 'a', id: 'a', name: 'A' };
  // @ts-expect-error a published chapter has no email
  const emailed: PublicChapterRecord = { slug: 'a', id: 'a', email: 'x@example.org' };
  // @ts-expect-error a published person has no raw note
  const noted: PublicPersonRecord = { slug: 'a', id: 'a', rawNote: 'x' };
  // @ts-expect-error a public map node has no pending submission
  const pending: Partial<PublicMapNode> = { id: 'a', pendingRevision: {} };
  // @ts-expect-error a map state node has no review notes
  const reviewed: Partial<PublicMapStateNode> = { id: 'a', reviewNotes: 'x' };
  assert.ok(chapter && emailed && noted && pending && reviewed);
});
