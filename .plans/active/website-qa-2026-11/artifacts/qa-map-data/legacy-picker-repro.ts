// Logic-level reproduction of the June 2026 add-node location step
// (HomeMap.astro at 228168e, live from 2026-06-17 until ec740e9 on 2026-07-12).
// The functions below are copied from that file; only the DOM is replaced by
// plain variables. From the repo root:
//
//   mkdir -p tmp/qa-map-data
//   git show 228168e:packages/website/src/components/page-sections/HomeMap.astro > tmp/qa-map-data/HomeMap-228168e.astro
//   git show 228168e:packages/website/src/data/operational-content-snapshot.json > tmp/qa-map-data/snapshot-228168e.json
//   bun .plans/active/website-qa-2026-11/artifacts/qa-map-data/legacy-picker-repro.ts
//
// Output from 2026-11-06 is in legacy-picker-repro.out next to this file.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const input = (file: string) => readFileSync(resolve(process.cwd(), 'tmp/qa-map-data', file), 'utf8');
const legacySource = input('HomeMap-228168e.astro');
const snapshot = JSON.parse(input('snapshot-228168e.json'));

// --- copied constants and helpers (228168e) ---
const VIEW_W = 200;
const VIEW_H = 100;
const VISIBLE_VIEW_H = 88;
const lonToX = (lon: number) => ((lon + 180) / 360) * VIEW_W;
const latToY = (lat: number) => ((90 - lat) / 180) * VIEW_H;
const clean = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
const toFiniteNumber = (value: unknown) => {
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(num) ? num : null;
};
const xToLon = (x: number) => (x / VIEW_W) * 360 - 180;
const yToLat = (y: number) => 90 - (y / VIEW_H) * 180;

// Chapter anchors: the template rendered cx={c.x} cy={c.y}, and the place
// index read them back with Number(getAttribute('cx')).
const chapterPlaces = snapshot.chapters
  .filter((c: any) => !c.seo?.noindex && typeof c.lat === 'number' && typeof c.long === 'number')
  .map((c: any) => {
    const x = Number(String(lonToX(c.long)));
    const y = Number(String(latToY(c.lat)));
    return { label: clean(c.name) || 'Greenpill chapter', lat: yToLat(y), long: xToLon(x) };
  })
  .filter((place: any) => Number.isFinite(place.lat) && Number.isFinite(place.long));

// The bundled city list, read from the legacy source itself.
const bundledPlaces = [...legacySource.matchAll(/\{ label: '([^']+)', lat: (-?[\d.]+), long: (-?[\d.]+) \}/g)]
  .map(([, label, lat, long]) => ({ label, lat: Number(lat), long: Number(long) }));
const placeIndex = [...chapterPlaces, ...bundledPlaces];

const nearestPlace = (lat: number, long: number) => (
  placeIndex
    .map((place) => ({
      ...place,
      distance: Math.hypot(
        place.lat - lat,
        (place.long - long) * Math.cos(((place.lat + lat) / 2) * Math.PI / 180)
      ),
    }))
    .sort((a, b) => a.distance - b.distance)[0]
);
const cityIsKnown = (value: string) => {
  const lower = value.toLowerCase();
  return placeIndex.some((place) => place.label.toLowerCase() === lower);
};

// --- form state standing in for the hidden inputs ---
function createForm() {
  const form = { query: '', place: '', lat: '', long: '' };
  const setLocation = (lat: number, long: number, label: string) => {
    form.place = label;
    form.lat = lat.toFixed(6);
    form.long = long.toFixed(6);
  };
  // locationQuery 'input' listener, copied.
  const onQueryInput = () => {
    const raw = clean(form.query);
    if (raw.length < 2) return;
    const query = raw.toLowerCase();
    const match = placeIndex.find((place) => place.label.toLowerCase() === query)
      || placeIndex.find((place) => place.label.toLowerCase().startsWith(query))
      || placeIndex.find((place) => place.label.toLowerCase().includes(query));
    if (match) {
      setLocation(match.lat, match.long, match.label);
      return;
    }
    const lat = toFiniteNumber(form.lat);
    const long = toFiniteNumber(form.long);
    if (lat !== null && long !== null) {
      setLocation(lat, long, raw);
    } else {
      form.place = raw;
    }
  };
  // placeFromPointer, copied; rect is the mini-map SVG's bounding box.
  const placeFromPointer = (event: { clientX: number; clientY: number }, rect: { left: number; top: number; width: number; height: number }) => {
    const x = Math.min(VIEW_W, Math.max(0, ((event.clientX - rect.left) / rect.width) * VIEW_W));
    const y = Math.min(VISIBLE_VIEW_H, Math.max(0, ((event.clientY - rect.top) / rect.height) * VISIBLE_VIEW_H));
    const lat = yToLat(y);
    const long = xToLon(x);
    const typed = clean(form.query);
    const label = typed.length >= 2 && !cityIsKnown(typed)
      ? typed
      : (nearestPlace(lat, long)?.label || 'your place');
    setLocation(lat, long, label);
  };
  return {
    type(text: string) {
      for (let i = 1; i <= text.length; i += 1) {
        form.query = text.slice(0, i);
        onQueryInput();
      }
    },
    paste(text: string) {
      form.query = text;
      onQueryInput();
    },
    // pointerdown + pointermove under pointer capture: every point is applied.
    drag(points: Array<{ clientX: number; clientY: number }>, rect: { left: number; top: number; width: number; height: number }) {
      points.forEach((point) => placeFromPointer(point, rect));
    },
    // The submit handler posted toFiniteNumber(data.get('lat'|'long')).
    submitted() {
      return { placeName: form.place, lat: toFiniteNumber(form.lat), long: toFiniteNumber(form.long) };
    },
  };
}

const rect = { left: 100, top: 300, width: 320, height: 156 };
const scenarios: Array<{ live: string; how: string; run: () => { placeName: string; lat: number | null; long: number | null } }> = [
  {
    live: 'Eve | Brooklyn, new york | -22.9068, -43.1729',
    how: 'type "Brooklyn, new york" one key at a time',
    run: () => { const f = createForm(); f.type('Brooklyn, new york'); return f.submitted(); },
  },
  {
    live: 'Victor Porton (2 rows) | Ashkelon, Israel | -22.9068, -43.1729',
    how: 'type "Ashkelon, Israel" one key at a time',
    run: () => { const f = createForm(); f.type('Ashkelon, Israel'); return f.submitted(); },
  },
  {
    live: 'Emmanuel Jacobson | Port Harcourt | 0, 0',
    how: 'paste or autofill "Port Harcourt" (one input event)',
    run: () => { const f = createForm(); f.paste('Port Harcourt'); return f.submitted(); },
  },
  {
    live: 'kitblake | Rotterdam, Netherlands | 0, 0',
    how: 'paste or autofill "Rotterdam, Netherlands" (one input event)',
    run: () => { const f = createForm(); f.paste('Rotterdam, Netherlands'); return f.submitted(); },
  },
  {
    live: 'Ash | Florida | 90, 97.76261',
    how: 'type "Florida", then drag the pin up past the top edge of the mini-map',
    run: () => {
      const f = createForm();
      f.type('Florida');
      const clientX = rect.left + (lonToX(97.76261) / VIEW_W) * rect.width;
      f.drag([{ clientX, clientY: rect.top + 60 }, { clientX, clientY: rect.top - 40 }], rect);
      return f.submitted();
    },
  },
  {
    live: 'Swift Evo | Taiwan | 90, 176.912492',
    how: 'type "Taiwan", then drag the pin up past the top edge near the right side',
    run: () => {
      const f = createForm();
      f.type('Taiwan');
      const clientX = rect.left + (lonToX(176.912492) / VIEW_W) * rect.width;
      f.drag([{ clientX, clientY: rect.top + 40 }, { clientX, clientY: rect.top - 15 }], rect);
      return f.submitted();
    },
  },
  {
    live: 'Amio | Awka | 56.462976, -180',
    how: 'type "Awka", then drag the pin out past the left edge of the mini-map',
    run: () => {
      const f = createForm();
      f.type('Awka');
      const clientY = rect.top + (latToY(56.462976) / VISIBLE_VIEW_H) * rect.height;
      f.drag([{ clientX: rect.left + 80, clientY }, { clientX: rect.left - 30, clientY }], rect);
      return f.submitted();
    },
  },
  {
    live: 'kitblake | Amsterdam | 52.3676, 4.9041 (control: correct)',
    how: 'type "Amsterdam" one key at a time',
    run: () => { const f = createForm(); f.type('Amsterdam'); return f.submitted(); },
  },
  {
    live: 'Kaz | Toronto | 43.6532, -79.3832 (control: correct)',
    how: 'type "Toronto" one key at a time',
    run: () => { const f = createForm(); f.type('Toronto'); return f.submitted(); },
  },
];

console.log(`placeIndex: ${chapterPlaces.length} chapter anchors + ${bundledPlaces.length} bundled cities`);
console.log(`first labels containing "br": ${placeIndex.filter((p) => p.label.toLowerCase().includes('br')).slice(0, 2).map((p) => p.label).join(', ')}`);
console.log(`first labels containing "as": ${placeIndex.filter((p) => p.label.toLowerCase().includes('as')).slice(0, 2).map((p) => p.label).join(', ')}`);
console.log(`typed one key at a time instead: "Port Harcourt" -> ${JSON.stringify((() => { const f = createForm(); f.type('Port Harcourt'); return f.submitted(); })())}`);
console.log(`typed one key at a time instead: "Rotterdam, Netherlands" -> ${JSON.stringify((() => { const f = createForm(); f.type('Rotterdam, Netherlands'); return f.submitted(); })())}`);
for (const [lat, long, stored] of [[9.045151, 9.049479, 'Lagos'], [-20.157804, -48.541667, 'Campinas']] as const) {
  console.log(`a dragged pin at ${lat}, ${long} auto-labels as "${nearestPlace(lat, long).label}" (stored place: "${stored}")`);
}
console.log('');
for (const scenario of scenarios) {
  console.log(`live:   ${scenario.live}`);
  console.log(`input:  ${scenario.how}`);
  console.log(`posted: ${JSON.stringify(scenario.run())}`);
  console.log('');
}
