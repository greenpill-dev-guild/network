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
    const lat = normalizeMapLatitude(candidate?.lat);
    const long = normalizeMapLongitude(candidate?.long);
    if (!confirmationId || !label || lat === null || long === null) {
      throw new Error('Public map-location payload contains an invalid location');
    }
  }

  return payload;
}
