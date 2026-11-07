type UnknownRecord = Record<string, any>;

export type PublicMapLocationKind = 'settlement' | 'region' | 'country';

export interface PublicMapLocation {
  confirmationId: string;
  label: string;
  lat: number;
  long: number;
  kind: PublicMapLocationKind;
  attribution: string;
}

export interface PublicMapLocationSearchPayload {
  results: PublicMapLocation[];
}

export interface PublicMapLocationReversePayload {
  confirmation: PublicMapLocation;
}

const cleanString = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

export function normalizeMapLocationQuery(value: unknown): string {
  return cleanString(value).replace(/\s+/g, ' ');
}

export function normalizeMapLatitude(value: unknown): number | null {
  if (typeof value !== 'number' && (typeof value !== 'string' || !value.trim())) return null;
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) && number >= -90 && number <= 90 ? number : null;
}

export function normalizeMapLongitude(value: unknown): number | null {
  if (typeof value !== 'number' && (typeof value !== 'string' || !value.trim())) return null;
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) && number >= -180 && number <= 180 ? number : null;
}

// Reads a coordinate without the `Number('')` / `Number(null)` trap: blank,
// null, boolean and non-numeric values are missing, never 0.
export function parseMapCoordinate(value: unknown): number | null {
  if (typeof value !== 'number' && (typeof value !== 'string' || !value.trim())) return null;
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

// Why a latitude/longitude pair can never be a map node's location: missing or
// non-numeric, out of range, or exactly 0,0 (an empty field read as 0, never a
// place someone gave). Refused with an explicit error, never clamped.
export type MapCoordinateProblem =
  | 'missing'
  | 'latitude_out_of_range'
  | 'longitude_out_of_range'
  | 'null_island';

export const MAP_COORDINATE_PROBLEM_MESSAGES: Readonly<Record<MapCoordinateProblem, string>> = Object.freeze({
  missing: 'Enter both a latitude and a longitude.',
  latitude_out_of_range: 'Latitude must be between -90 and 90.',
  longitude_out_of_range: 'Longitude must be between -180 and 180.',
  null_island: 'Latitude 0, longitude 0 is a placeholder, not a place. Find and confirm the place again.',
});

export function getMapCoordinateProblem(lat: unknown, long: unknown): MapCoordinateProblem | null {
  const latitude = parseMapCoordinate(lat);
  const longitude = parseMapCoordinate(long);
  if (latitude === null || longitude === null) return 'missing';
  if (Math.abs(latitude) > 90) return 'latitude_out_of_range';
  if (Math.abs(longitude) > 180) return 'longitude_out_of_range';
  if (latitude === 0 && longitude === 0) return 'null_island';
  return null;
}

export function isPublicMapCoordinate(lat: unknown, long: unknown): boolean {
  return getMapCoordinateProblem(lat, long) === null;
}

// A point exactly on the map's edge: latitude ±90 or longitude ±180. Real
// places sit there (Fiji spans the 180th meridian), and so does every pin a
// broken client clamped to the edge. Only a confirmed geocoder result can tell
// the two apart, so an edge point is accepted from a confirmation and refused
// from raw coordinates.
export function isMapEdgeCoordinate(lat: unknown, long: unknown): boolean {
  const latitude = parseMapCoordinate(lat);
  const longitude = parseMapCoordinate(long);
  if (latitude === null || longitude === null) return false;
  return Math.abs(latitude) === 90 || Math.abs(longitude) === 180;
}

export const MAP_EDGE_COORDINATE_MESSAGE =
  'A point on the edge of the map needs a confirmed place. Find and confirm your place.';

export function containsPrivateMapLocationField(value: unknown, seen: Set<object> = new Set()): boolean {
  if (!value || typeof value !== 'object') return false;
  if (seen.has(value as object)) return false;
  seen.add(value as object);

  return Object.entries(value as UnknownRecord).some(([key, nested]) => {
    const normalized = key.replace(/[^a-z0-9]/gi, '').toLowerCase();
    return (
      ['email', 'token', 'private', 'ip', 'useragent', 'ratelimit', 'query'].some((needle) => normalized.includes(needle)) ||
      containsPrivateMapLocationField(nested, seen)
    );
  });
}

export function assertPublicMapLocationPayload<T>(payload: T): T {
  if (containsPrivateMapLocationField(payload)) {
    throw new Error('Public map-location payload contains private fields');
  }

  const candidates = Array.isArray((payload as UnknownRecord)?.results)
    ? (payload as UnknownRecord).results
    : [(payload as UnknownRecord)?.confirmation].filter(Boolean);

  for (const candidate of candidates) {
    const confirmationId = cleanString(candidate?.confirmationId);
    const label = cleanString(candidate?.label);
    if (!confirmationId || !label || !isPublicMapCoordinate(candidate?.lat, candidate?.long)) {
      throw new Error('Public map-location payload contains an invalid location');
    }
  }

  return payload;
}
