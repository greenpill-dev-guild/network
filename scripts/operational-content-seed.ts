import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

// Postgres jsonb keeps object keys shortest first, then in byte order.
const byJsonbKeyOrder = (a: string, b: string) => (
  Buffer.byteLength(a) - Buffer.byteLength(b) || Buffer.compare(Buffer.from(a), Buffer.from(b))
);

export function inJsonbKeyOrder(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(inJsonbKeyOrder);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.keys(value).sort(byJsonbKeyOrder).map((key) => [key, inJsonbKeyOrder(value[key])])
  );
}

// Reads one operational content seed folder (one JSON file per record).
//
// The agent reads each record as `{ slug, ...data }` from a jsonb view, so the
// live snapshot, and the fallback written from it, carry jsonb key order. Seed
// records take the same shape, so a snapshot written from the seeds matches
// one written from the agent when the content matches. The file name still
// decides the slug and id.
export async function readOperationalSeedCollection(seedDir: string, collection: string) {
  const dir = join(seedDir, collection);
  const records = [];
  for (const file of await readdir(dir)) {
    if (!file.endsWith('.json')) continue;
    const slug = file.replace(/\.json$/, '');
    const data = JSON.parse(await readFile(join(dir, file), 'utf8'));
    records.push({
      slug,
      ...(inJsonbKeyOrder({ ...data, slug, id: slug }) as Record<string, unknown>),
    });
  }
  return records;
}
