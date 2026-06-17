import { writeFile } from 'node:fs/promises';

const GEOJSON_URL = 'https://ecoregions.appspot.com/ecoregions2017c.json';
const LEGEND_URL = 'https://ecoregions.appspot.com/legendData.js';
const EARTH_ENGINE_URL = 'https://developers.google.com/earth-engine/datasets/catalog/RESOLVE_ECOREGIONS_2017';
const SIMPLIFY_TOLERANCE_DEGREES = 0.18;

type Position = [number, number];
type Ring = Position[];
type Polygon = Ring[];

type GeoFeature = {
  id: number | string;
  geometry?: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: Polygon | Polygon[];
  } | null;
};

type LegendBiome = {
  biome: string;
  ecoregions: Array<{
    id: string;
    name: string;
    color: string;
    realm: string;
  }>;
};

const roundCoord = (value: unknown): number => Number(Number(value).toFixed(2));

const samePosition = (a: Position, b: Position): boolean => a[0] === b[0] && a[1] === b[1];

const distanceSq = (a: Position, b: Position): number => {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  return dx * dx + dy * dy;
};

const perpendicularDistanceSq = (point: Position, start: Position, end: Position): number => {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  if (dx === 0 && dy === 0) return distanceSq(point, start);
  const t = Math.max(0, Math.min(1, ((point[0] - start[0]) * dx + (point[1] - start[1]) * dy) / (dx * dx + dy * dy)));
  const projection: Position = [start[0] + t * dx, start[1] + t * dy];
  return distanceSq(point, projection);
};

const simplifyOpenRing = (points: Position[], toleranceSq: number): Position[] => {
  if (points.length <= 2) return points;

  let maxDistanceSq = 0;
  let index = 0;
  const start = points[0];
  const end = points[points.length - 1];

  for (let i = 1; i < points.length - 1; i += 1) {
    const distance = perpendicularDistanceSq(points[i], start, end);
    if (distance > maxDistanceSq) {
      index = i;
      maxDistanceSq = distance;
    }
  }

  if (maxDistanceSq <= toleranceSq) return [start, end];

  const left = simplifyOpenRing(points.slice(0, index + 1), toleranceSq);
  const right = simplifyOpenRing(points.slice(index), toleranceSq);
  return left.slice(0, -1).concat(right);
};

const simplifyClosedRing = (ring: Ring): Ring => {
  if (ring.length <= 12) return ring;
  const closed = samePosition(ring[0], ring[ring.length - 1]);
  const open = closed ? ring.slice(0, -1) : [...ring];
  if (open.length <= 12) return closed ? [...open, open[0]] : open;

  let farthestIndex = 1;
  let farthestDistance = 0;
  for (let i = 1; i < open.length; i += 1) {
    const distance = distanceSq(open[0], open[i]);
    if (distance > farthestDistance) {
      farthestDistance = distance;
      farthestIndex = i;
    }
  }

  const toleranceSq = SIMPLIFY_TOLERANCE_DEGREES * SIMPLIFY_TOLERANCE_DEGREES;
  const firstHalf = simplifyOpenRing(open.slice(0, farthestIndex + 1), toleranceSq);
  const secondHalf = simplifyOpenRing([...open.slice(farthestIndex), open[0]], toleranceSq);
  const simplified = firstHalf.slice(0, -1).concat(secondHalf);
  const unique = simplified.filter((point, index) => index === 0 || !samePosition(point, simplified[index - 1]));
  if (unique.length < 3) return ring;
  const closedSimplified = samePosition(unique[0], unique[unique.length - 1]) ? unique : [...unique, unique[0]];
  return closedSimplified.length >= 4 ? closedSimplified : ring;
};

const normalizeRing = (ring: unknown): Ring => {
  if (!Array.isArray(ring)) return [];
  const normalized = ring
    .map((point) => {
      if (!Array.isArray(point) || point.length < 2) return null;
      const lon = roundCoord(point[0]);
      const lat = roundCoord(point[1]);
      if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;
      return [lon, lat] as Position;
    })
    .filter((point): point is Position => Boolean(point));

  return normalized.length >= 4 ? simplifyClosedRing(normalized) : [];
};

const normalizePolygon = (polygon: unknown): Polygon => {
  if (!Array.isArray(polygon)) return [];
  return polygon
    .map(normalizeRing)
    .filter((ring) => ring.length >= 4);
};

const bboxFor = (polygons: Polygon[]): [number, number, number, number] => {
  let minLon = 180;
  let minLat = 90;
  let maxLon = -180;
  let maxLat = -90;

  for (const polygon of polygons) {
    for (const ring of polygon) {
      for (const [lon, lat] of ring) {
        minLon = Math.min(minLon, lon);
        minLat = Math.min(minLat, lat);
        maxLon = Math.max(maxLon, lon);
        maxLat = Math.max(maxLat, lat);
      }
    }
  }

  return [
    roundCoord(minLon),
    roundCoord(minLat),
    roundCoord(maxLon),
    roundCoord(maxLat),
  ];
};

const fetchText = async (url: string): Promise<string> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }
  return response.text();
};

const parseLegend = (text: string) => {
  const rawJson = text.trim().replace(/^var\s+legendData\s*=\s*/, '').replace(/;\s*$/, '');
  const biomes = JSON.parse(rawJson) as LegendBiome[];
  const byId = new Map<string, { name: string; biome: string; realm: string; color: string }>();

  for (const biome of biomes) {
    for (const region of biome.ecoregions) {
      byId.set(region.id, {
        name: region.name,
        biome: biome.biome,
        realm: region.realm,
        color: region.color,
      });
    }
  }

  return byId;
};

const geometryPolygons = (feature: GeoFeature): Polygon[] => {
  if (!feature.geometry) return [];
  if (feature.geometry.type === 'Polygon') {
    const polygon = normalizePolygon(feature.geometry.coordinates);
    return polygon.length ? [polygon] : [];
  }
  if (feature.geometry.type === 'MultiPolygon') {
    return (feature.geometry.coordinates as unknown[])
      .map(normalizePolygon)
      .filter((polygon) => polygon.length);
  }
  return [];
};

const main = async () => {
  const [geoText, legendText] = await Promise.all([
    fetchText(GEOJSON_URL),
    fetchText(LEGEND_URL),
  ]);
  const geojson = JSON.parse(geoText) as { features: GeoFeature[] };
  const metadataById = parseLegend(legendText);

  const regions = geojson.features
    .map((feature) => {
      const id = String(feature.id);
      const polygons = geometryPolygons(feature);
      const metadata = metadataById.get(id);
      if (!id || polygons.length === 0 || !metadata) return null;
      return {
        id,
        name: metadata.name,
        source: 'resolve-ecoregions-2017',
        biome: metadata.biome,
        realm: metadata.realm,
        color: metadata.color,
        bbox: bboxFor(polygons),
        polygons,
      };
    })
    .filter(Boolean)
    .sort((a, b) => Number(a!.id) - Number(b!.id));

  const dataset = {
    version: 1,
    simplifyToleranceDegrees: SIMPLIFY_TOLERANCE_DEGREES,
    generatedFrom: {
      geometryUrl: GEOJSON_URL,
      metadataUrl: LEGEND_URL,
      catalogUrl: EARTH_ENGINE_URL,
      license: 'CC-BY-4.0',
    },
    source: {
      id: 'resolve-ecoregions-2017',
      label: 'RESOLVE Ecoregions 2017',
      license: 'CC-BY-4.0',
      url: EARTH_ENGINE_URL,
    },
    regions,
  };

  const json = `${JSON.stringify(dataset)}\n`;
  await writeFile('packages/shared/src/public-ecoregions.json', json);
  await writeFile(
    'packages/shared/src/public-ecoregions.ts',
    [
      '// Generated by scripts/generate-public-ecoregions.ts from RESOLVE Ecoregions 2017 public data.',
      '// Do not edit by hand; rerun the generator when changing the source snapshot.',
      '',
      'export type PublicEcoregionSourceId = \'resolve-ecoregions-2017\';',
      'export type PublicEcoregionPosition = [number, number];',
      'export type PublicEcoregionRing = PublicEcoregionPosition[];',
      'export type PublicEcoregionPolygon = PublicEcoregionRing[];',
      '',
      'export interface PublicEcoregionRegion {',
      '  id: string;',
      '  name: string;',
      '  source: PublicEcoregionSourceId;',
      '  biome: string;',
      '  realm: string;',
      '  color: string;',
      '  bbox: [number, number, number, number];',
      '  polygons: PublicEcoregionPolygon[];',
      '}',
      '',
      'export interface PublicEcoregionDataset {',
      '  version: 1;',
      '  generatedFrom: {',
      '    geometryUrl: string;',
      '    metadataUrl: string;',
      '    catalogUrl: string;',
      '    license: string;',
      '  };',
      '  source: {',
      '    id: PublicEcoregionSourceId;',
      '    label: string;',
      '    license: string;',
      '    url: string;',
      '  };',
      '  regions: PublicEcoregionRegion[];',
      '}',
      '',
      `export const PUBLIC_ECOREGIONS = JSON.parse(${JSON.stringify(JSON.stringify(dataset))}) as PublicEcoregionDataset;`,
      '',
    ].join('\n')
  );

  console.log(`Wrote ${regions.length} public ecoregion outlines.`);
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
