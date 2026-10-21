// Database proof for snapshot alert episodes (migration 030).
//
// It builds a scratch database on the local Postgres server, applies every
// migration to it, and drops it again. The dev database is never written to.
//
//   bun run db:local:up
//   bun run test:snapshot-alerts:db
//
// Covered here because only a real database can show it:
// - an agent released ahead of 030 still alerts on the schema before it;
// - 030 keeps every alert already sent, and applying it twice changes nothing;
// - a record that is fixed ends its episode, and breaking it again sends
//   exactly one new alert;
// - renders during one episode send one alert, also when they run at once;
// - a render that changes nothing writes nothing.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deliverQueuedContentReviewNotifications } from '@greenpill-network/agent';
import { createDatabaseClient } from '@greenpill-network/agent/db';
import { getPublicOperationalContentSnapshot } from '@greenpill-network/agent/public-content';

const DEFAULT_DATABASE_URL = 'postgres://greenpill:greenpill@localhost:3304/greenpill_network';
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);
const EPISODE_MIGRATION = '030_snapshot_alert_episodes.sql';

const migrationsDir = resolve(dirname(fileURLToPath(import.meta.url)), '../packages/agent/migrations');
const serverUrl = new URL(process.env.DATABASE_URL?.trim() || DEFAULT_DATABASE_URL);
if (!LOCAL_HOSTS.has(serverUrl.hostname)) {
  // The proof creates and drops a database and inserts published records.
  throw new Error(`Refusing to run against ${serverUrl.hostname}: this proof only runs on a local Postgres server.`);
}

const scratchName = `snapshot_alert_proof_${randomUUID().slice(0, 8)}`;
const scratchUrl = new URL(serverUrl);
scratchUrl.pathname = `/${scratchName}`;
const directusUrl = 'https://admin.example.test';

type Row = Record<string, any>;
type Sql = NonNullable<ReturnType<typeof createDatabaseClient>>;

function connect(url: URL, max = 1): Sql {
  const client = createDatabaseClient({ url: url.href, max });
  if (!client) throw new Error('Could not create the snapshot alert proof database client.');
  return client;
}

let sql: Sql | null = null;
let pool: Sql | null = null;
const server = connect(serverUrl);

const mailto = [{ label: 'Email', url: 'mailto:someone@example.test' }];
const sourcedImage = (slug: string, reviewStatus: 'pending' | 'approved') => ({
  image: `/images/chapters/${slug}.jpg`,
  reviewStatus,
});

async function insertChapter(slug: string, fields: Row = {}) {
  const { media, links, ...rest } = fields;
  await sql!`
    insert into content.chapters ${sql!({
      slug,
      name: `Proof ${slug}`,
      publication_status: 'published',
      ...rest,
      ...(media === undefined ? {} : { media: sql!.json(media) }),
      ...(links === undefined ? {} : { links: sql!.json(links) }),
    })}
  `;
}

// Sets only the named columns, the way Directus writes a partial edit.
async function editChapter(slug: string, fields: Row) {
  const { media, links, ...rest } = fields;
  await sql!`
    update content.chapters set ${sql!({
      ...rest,
      ...(media === undefined ? {} : { media: sql!.json(media) }),
      ...(links === undefined ? {} : { links: sql!.json(links) }),
    })}
    where slug = ${slug}
  `;
}

// One render of the public snapshot, the way the agent route makes it.
// Returns the slugs of the chapters that are public.
async function render(client: any = sql): Promise<string[]> {
  const snapshot = await getPublicOperationalContentSnapshot(client, new Date(), directusUrl);
  return snapshot.chapters.map((chapter) => String(chapter.slug));
}

// Runs the agent's delivery sweep against a stand-in for the email provider.
// Returns what it sent, as "quarantined <collection>/<slug>" or
// "image withheld chapters/<slug>".
async function deliver(): Promise<string[]> {
  const sent: string[] = [];
  await deliverQueuedContentReviewNotifications(sql!, {
    env: {
      RESEND_API_KEY: 'proof-resend-key',
      CONTENT_REVIEW_EMAIL_FROM: 'Greenpill <alerts@example.test>',
      CONTENT_REVIEW_RECIPIENTS: 'operator@example.test',
      CONTENT_REVIEW_DIRECTUS_URL: directusUrl,
    },
    fetchImpl: (async (_url: unknown, options: { body: string }) => {
      const email = JSON.parse(options.body);
      const record = String(email.text).match(/\/admin\/content\/(\S+)/)?.[1];
      sent.push(`${/image withheld/.test(email.subject) ? 'image withheld' : 'quarantined'} ${record}`);
      return Response.json({ id: `proof-email-${randomUUID()}` });
    }) as unknown as typeof fetch,
  });
  return sent.sort();
}

// The alert rows of one record, oldest first, as "<kind> <open|resolved> <delivery status>".
// Reads resolved_at through JSON so it also works on the schema before 030.
async function alerts(slug: string): Promise<string[]> {
  const rows = await sql!`
    select kind, status, (to_jsonb(alert) ->> 'resolved_at') is null as open
    from content.review_notifications alert
    where record_slug = ${slug}
    order by created_at, kind
  `;
  return rows.map((row) => `${row.kind} ${row.open ? 'open' : 'resolved'} ${row.status}`);
}

// Stands in for time passing. Every alert becomes an hour older, well past the
// minute an alert stays open before a render may resolve it.
async function anHourLater() {
  await sql!`update content.review_notifications set created_at = created_at - interval '1 hour'`;
}

// A fingerprint of every alert row: of all its columns, and of the columns it
// had before 030 added resolved_at.
async function alertFingerprints(): Promise<{ allColumns: string[]; columnsBefore030: string[] }> {
  const rows = await sql!`
    select
      id,
      md5(to_jsonb(alert)::text) as all_columns,
      md5((to_jsonb(alert) - 'resolved_at')::text) as columns_before_030
    from content.review_notifications alert
    order by id
  `;
  return {
    allColumns: rows.map((row) => `${row.id} ${row.all_columns}`),
    columnsBefore030: rows.map((row) => `${row.id} ${row.columns_before_030}`),
  };
}

async function alertIndexes(): Promise<string[]> {
  const rows = await sql!`
    select indexname, indexdef
    from pg_indexes
    where schemaname = 'content' and tablename = 'review_notifications'
    order by indexname
  `;
  return rows.map((row) => `${row.indexname}: ${row.indexdef}`);
}

async function openAlertCount(): Promise<number> {
  const [row] = await sql!`select count(*)::int as open from content.review_notifications where resolved_at is null`;
  return row.open;
}

const warnings: unknown[][] = [];
const alertFailures = () => warnings
  .filter(([event]) => event === 'public_snapshot_alerts_failed')
  .map(([, detail]) => detail);

const originalWarn = console.warn;
try {
  await server.unsafe(`create database ${scratchName}`);
  sql = connect(scratchUrl);
  pool = connect(scratchUrl, 8);
  // Migrations announce every "does not exist, skipping"; keep the output to the result.
  await sql`set client_min_messages = warning`;
  // The snapshot builder logs every quarantine and withheld image; the proof asserts them instead.
  console.warn = (...args: unknown[]) => { warnings.push(args); };

  // Production has Directus tables: migrations tie to them and the delivery
  // sweep reads users. Give the scratch database the same.
  await sql`create table public.directus_files (id uuid primary key)`;
  await sql`create table public.directus_users (id uuid primary key, email text, status text)`;

  const migrations = (await readdir(migrationsDir)).filter((file) => file.endsWith('.sql')).sort((a, b) => a.localeCompare(b));
  assert.ok(migrations.includes(EPISODE_MIGRATION));
  const episodeMigration = await readFile(resolve(migrationsDir, EPISODE_MIGRATION), 'utf8');
  for (const file of migrations.filter((name) => name < EPISODE_MIGRATION)) {
    await sql.unsafe(await readFile(resolve(migrationsDir, file), 'utf8'));
  }

  // --- An agent released ahead of the migration ------------------------------
  // A merge deploys the agent, and 030 is applied by hand. On the schema before
  // 030 the agent must keep alerting the way it did.
  await insertChapter('healthy');
  await insertChapter('fixed-before-030', { links: mailto });
  await insertChapter('still-dropped', { links: mailto });
  await insertChapter('image-approved-before-030', { media: sourcedImage('image-approved-before-030', 'pending') });
  await insertChapter('image-still-withheld', { media: sourcedImage('image-still-withheld', 'pending') });

  assert.deepEqual(
    (await render()).sort(),
    ['healthy', 'image-approved-before-030', 'image-still-withheld'],
    'dropped records leave the snapshot; a withheld image does not take its chapter along'
  );
  await render();
  assert.deepEqual(await deliver(), [
    'image withheld chapters/image-approved-before-030',
    'image withheld chapters/image-still-withheld',
    'quarantined chapters/fixed-before-030',
    'quarantined chapters/still-dropped',
  ]);
  assert.deepEqual(await deliver(), [], 'two renders, one email per record');

  // Both get fixed. This schema has nowhere to record it, which is the gap 030 closes.
  await editChapter('fixed-before-030', { links: [] });
  await editChapter('image-approved-before-030', { media: sourcedImage('image-approved-before-030', 'approved') });
  assert.deepEqual((await render()).sort(), [
    'fixed-before-030',
    'healthy',
    'image-approved-before-030',
    'image-still-withheld',
  ]);
  assert.deepEqual(await alerts('fixed-before-030'), ['record_quarantined open sent']);
  assert.deepEqual(
    alertFailures().at(-1),
    { step: 'resolve', errorName: 'PostgresError', code: '42703' },
    'the missing column is logged, and the snapshot is served anyway'
  );
  assert.equal(alertFailures().some((failure: any) => failure.step === 'open'), false);

  // --- Migration 030 ---------------------------------------------------------
  const beforeMigration = await alertFingerprints();
  assert.equal(beforeMigration.allColumns.length, 4);
  await sql.unsafe(episodeMigration);
  // Every alert already sent is kept exactly as it was, and starts out open.
  const migrated = await alertFingerprints();
  assert.deepEqual(migrated.columnsBefore030, beforeMigration.columnsBefore030);
  assert.equal(await openAlertCount(), 4);

  // Applying it again changes nothing at all.
  const indexes = await alertIndexes();
  await sql.unsafe(episodeMigration);
  assert.deepEqual((await alertFingerprints()).allColumns, migrated.allColumns);
  assert.deepEqual(await alertIndexes(), indexes);

  // 026 and 029 created the two indexes that 030 rebuilds. Applied after it,
  // out of order or by mistake, they must not bring the old definitions back:
  // those would silently swallow the alert for every later episode.
  for (const file of ['026_content_review_notifications.sql', '029_chapter_image_alt_credit.sql']) {
    await sql.unsafe(await readFile(resolve(migrationsDir, file), 'utf8'));
  }
  assert.deepEqual(await alertIndexes(), indexes);

  warnings.length = 0;

  // --- Episodes --------------------------------------------------------------
  // Production's rows are weeks old by the time 030 lands. The first render
  // ends the two episodes that were already over and leaves the other two open.
  await anHourLater();
  await render();
  assert.deepEqual(await alerts('fixed-before-030'), ['record_quarantined resolved sent']);
  assert.deepEqual(await alerts('image-approved-before-030'), ['chapter_image_withheld resolved sent']);
  assert.deepEqual(await alerts('still-dropped'), ['record_quarantined open sent']);
  assert.deepEqual(await alerts('image-still-withheld'), ['chapter_image_withheld open sent']);
  assert.deepEqual(await deliver(), [], 'resolving an alert sends nothing');

  // The reported failure: months later a steward adds another mailto: link.
  // The chapter leaves the site again, and this time the operator hears of it.
  await editChapter('fixed-before-030', { links: mailto });
  assert.equal((await render()).includes('fixed-before-030'), false);
  await render();
  assert.deepEqual(await alerts('fixed-before-030'), [
    'record_quarantined resolved sent',
    'record_quarantined open queued',
  ]);
  assert.deepEqual(await deliver(), ['quarantined chapters/fixed-before-030']);
  await anHourLater();
  await render();
  assert.deepEqual(await deliver(), [], 'one alert for the whole episode, however long it lasts');

  // Fixed again: that episode ends too, and both stay on record.
  await editChapter('fixed-before-030', { links: [] });
  await render();
  assert.deepEqual(await alerts('fixed-before-030'), [
    'record_quarantined resolved sent',
    'record_quarantined resolved sent',
  ]);

  // The same for a withheld image: unapproved again, one new alert, approved, resolved.
  await editChapter('image-approved-before-030', { media: sourcedImage('image-approved-before-030', 'pending') });
  await render();
  await render();
  assert.deepEqual(await deliver(), ['image withheld chapters/image-approved-before-030']);
  await editChapter('image-approved-before-030', { media: sourcedImage('image-approved-before-030', 'approved') });
  await anHourLater();
  await render();
  assert.deepEqual(await alerts('image-approved-before-030'), [
    'chapter_image_withheld resolved sent',
    'chapter_image_withheld resolved sent',
  ]);

  // A record that is unpublished is no longer dropped from anything.
  await editChapter('still-dropped', { publication_status: 'draft' });
  await render();
  assert.deepEqual(await alerts('still-dropped'), ['record_quarantined resolved sent']);

  // --- A withheld image on a chapter that is then dropped ----------------------
  // The chapter has an open image alert. A mailto: link now drops the chapter.
  // A dropped chapter is not in the snapshot, so nothing is known about its
  // image, and the image alert stays open.
  await editChapter('image-still-withheld', { links: mailto });
  await render();
  assert.deepEqual(await deliver(), ['quarantined chapters/image-still-withheld']);
  await anHourLater();
  await render();
  assert.deepEqual(await alerts('image-still-withheld'), [
    'chapter_image_withheld open sent',
    'record_quarantined open sent',
  ]);

  // The link is removed and the chapter is back, still without its image. That
  // is the image episode the operator already heard about, not a new one.
  await editChapter('image-still-withheld', { links: [] });
  assert.equal((await render()).includes('image-still-withheld'), true);
  assert.deepEqual(await alerts('image-still-withheld'), [
    'chapter_image_withheld open sent',
    'record_quarantined resolved sent',
  ]);
  assert.deepEqual(await deliver(), []);

  // A brief observed recovery ends the episode immediately. A recurrence
  // within the same minute must send one new alert rather than be suppressed.
  await insertChapter('just-broken', { links: mailto });
  await render();
  assert.deepEqual(await deliver(), ['quarantined chapters/just-broken']);
  await editChapter('just-broken', { links: [] });
  await render();
  assert.deepEqual(await alerts('just-broken'), ['record_quarantined resolved sent']);
  await editChapter('just-broken', { links: mailto });
  await render();
  await render();
  assert.deepEqual(await alerts('just-broken'), [
    'record_quarantined resolved sent',
    'record_quarantined open queued',
  ]);
  assert.deepEqual(await deliver(), ['quarantined chapters/just-broken']);

  // --- A collection the contract and Directus name differently -----------------
  // The alert is stored under the Directus name. A render must look for it
  // under that same name, or it would end and reopen the episode every time.
  const reviewed = new Date();
  await sql`
    insert into content.chapter_initiatives ${sql({
      slug: 'proof-initiative',
      chapter_slug: 'healthy',
      title: 'Proof initiative',
      publication_status: 'published',
      published_at: reviewed,
      reviewed_at: reviewed,
      links: sql.json(mailto),
    })}
  `;
  await render();
  await anHourLater();
  await render();
  await anHourLater();
  await render();
  assert.deepEqual(await alerts('proof-initiative'), ['record_quarantined open queued']);
  assert.deepEqual(await deliver(), ['quarantined chapter_initiatives/proof-initiative']);

  // --- Renders at the same moment --------------------------------------------
  await insertChapter('raced', { links: mailto });
  await Promise.all(Array.from({ length: 8 }, () => render(pool)));
  assert.deepEqual(await alerts('raced'), ['record_quarantined open queued']);
  assert.deepEqual(await deliver(), ['quarantined chapters/raced']);

  await editChapter('raced', { links: [] });
  await anHourLater();
  await Promise.all(Array.from({ length: 8 }, () => render(pool)));
  assert.deepEqual(await alerts('raced'), ['record_quarantined resolved sent']);

  // Deliberately overlap observations across the break and the fix. The
  // second renderer must wait before reading, not merely before updating alerts.
  await insertChapter('overlap', { links: mailto });
  await render();
  assert.deepEqual(await deliver(), ['quarantined chapters/overlap']);
  for (const transition of ['fix', 'break']) {
    let markRead!: () => void;
    let resume!: () => void;
    const read = new Promise<void>((resolve) => { markRead = resolve; });
    const resumed = new Promise<void>((resolve) => { resume = resolve; });
    let paused = false;
    const pausedClient = new Proxy(pool!, {
      get(target, key, receiver) {
        if (key !== 'begin') return Reflect.get(target, key, receiver);
        return (callback: (tx: any) => Promise<unknown>) => target.begin((tx) => callback(new Proxy(tx, {
          async apply(fn, self, args) {
            const rows = await Reflect.apply(fn, self, args);
            if (!paused && Array.isArray(args[0]) && args[0].join(' ').includes('from content.public_chapters')) {
              paused = true;
              markRead();
              await resumed;
            }
            return rows;
          },
        })));
      },
    });
    const older = render(pausedClient);
    let newer: Promise<string[]> | undefined;
    try {
      await read;
      await editChapter('overlap', { links: transition === 'fix' ? [] : mailto });
      newer = render(pool);
      const waiting = (async () => {
        const deadline = Date.now() + 5000;
        while (Date.now() < deadline) {
          const [row] = await sql!`
            select exists (
              select 1 from pg_stat_activity
              where datname = current_database() and wait_event = 'advisory'
            ) as waiting
          `;
          if (row.waiting) return 'waiting';
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
        return 'timeout';
      })();
      assert.equal(await Promise.race([waiting, newer.then(() => 'completed')]), 'waiting');
    } finally { resume(); }
    await Promise.all([older, newer]);
    assert.deepEqual(await alerts('overlap'), transition === 'fix'
      ? ['record_quarantined resolved sent']
      : ['record_quarantined resolved sent', 'record_quarantined open queued']);
  }
  assert.deepEqual(await deliver(), ['quarantined chapters/overlap']);
  // Leave the later steady-state probe with its original three open alerts.
  await editChapter('overlap', { links: [] });
  await render();

  // The database itself refuses a second open alert for a record. That is what
  // keeps renders that race each other at one row.
  await assert.rejects(
    async () => {
      await sql!`
        insert into content.review_notifications (kind, record_collection, record_slug, quarantine_reason)
        values ('record_quarantined', 'chapters', 'just-broken', 'private_field')
      `;
    },
    { code: '23505' }
  );
  // Only snapshot alerts have episodes.
  await assert.rejects(
    async () => {
      await sql!`
        insert into content.review_notifications (kind, chapter_slug, initiative_slug, resolved_at)
        values ('initiative_pending', 'healthy', 'proof-initiative', now())
      `;
    },
    { code: '23514' }
  );

  // --- A render that changes nothing writes nothing ----------------------------
  // The snapshot route is a public read path. Three alerts are open and all of
  // them still hold, so the render's transaction never needs a transaction id.
  assert.equal(await openAlertCount(), 3);
  await sql.begin(async (tx) => {
    await render(tx);
    const [state] = await tx`select pg_current_xact_id_if_assigned() is not null as wrote`;
    assert.equal(state.wrote, false, 'a render in a steady state must not write');
  });
  // The same probe does see the render that opens an alert.
  await insertChapter('breaks-last', { links: mailto });
  await sql.begin(async (tx) => {
    await render(tx);
    const [state] = await tx`select pg_current_xact_id_if_assigned() is not null as wrote`;
    assert.equal(state.wrote, true);
  });

  // --- A render that cannot get the lock in time ------------------------------
  // A stuck render must not hold up the others, the website build's included.
  // The one that waits too long serves the snapshot and leaves alerts alone,
  // and the next render that gets the lock records them.
  const lockSkips = () => warnings.filter(([event]) => event === 'public_snapshot_alerts_skipped').length;
  const skipsBefore = lockSkips();
  const stuck = connect(scratchUrl);
  try {
    await stuck`select pg_advisory_lock(713026030)`;
    await insertChapter('behind-the-lock', { links: mailto });
    const startedAt = Date.now();
    assert.equal((await render()).includes('behind-the-lock'), false, 'the snapshot is served, without the dropped record');
    assert.ok(Date.now() - startedAt < 15_000, 'the render stops waiting for the lock');
    assert.deepEqual(await alerts('behind-the-lock'), [], 'alerts wait for a render that gets the lock');
    assert.equal(lockSkips(), skipsBefore + 1);
  } finally {
    await stuck`select pg_advisory_unlock(713026030)`.catch(() => {});
    await stuck.end({ timeout: 3 }).catch(() => {});
  }
  await render();
  assert.deepEqual(await alerts('behind-the-lock'), ['record_quarantined open queued']);

  assert.deepEqual(alertFailures(), [], 'no render after 030 failed to record its alerts');
  console.log('Snapshot alert episode database proof passed.');
} finally {
  console.warn = originalWarn;
  await pool?.end({ timeout: 3 }).catch(() => {});
  await sql?.end({ timeout: 3 }).catch(() => {});
  await server.unsafe(`drop database if exists ${scratchName}`).catch((error) => {
    console.error(`Could not drop scratch database ${scratchName}: ${String(error).slice(0, 160)}`);
  });
  await server.end({ timeout: 3 }).catch(() => {});
}
