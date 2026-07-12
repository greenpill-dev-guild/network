import { createHash } from 'node:crypto';
import {
  assertPublicMapLocationPayload,
  normalizeMapLatitude,
  normalizeMapLocationQuery,
  normalizeMapLongitude,
  type PublicMapLocation,
  type PublicMapLocationKind,
  type PublicMapLocationReversePayload,
  type PublicMapLocationSearchPayload,
} from '@greenpill-network/shared/map-locations';
import { createDatabaseClient } from './db.js';
import { AgentDataError, PublicInputError } from './errors.js';

type SqlLike = any;
type FetchLike = typeof fetch;
type UnknownRecord = Record<string, any>;
export type MapLocationErrorStage = 'reverse_lookup' | 'reverse_confirmation_write';

export interface MapLocationErrorEvent {
  stage: MapLocationErrorStage;
  errorName: string;
  errorCode?: string;
}

export const MAP_LOCATION_SEARCH_ROUTE = '/map-locations/search';
export const MAP_LOCATION_REVERSE_ROUTE = '/map-locations/reverse';
export const MAP_LOCATION_CONFIRMATION_TTL_MINUTES = 15;
export const MAP_LOCATION_CACHE_TTL_DAYS = 30;
export const MAP_LOCATION_RATE_LIMIT_MS = 1000;
export const MAP_LOCATION_REQUESTS_PER_MINUTE = 12;
export const MAP_LOCATION_CONFIRMATION_RETENTION_HOURS = 24;
export const MAP_LOCATION_CACHE_RETENTION_DAYS = 7;
export const MAP_LOCATION_REQUEST_LIMIT_RETENTION_HOURS = 24;
export const MAP_LOCATION_REVERSE_MAX_DISTANCE_KM = 25;
export const MAP_LOCATION_PROVIDER_TIMEOUT_MS = 12_000;
export const MAP_LOCATION_ATTRIBUTION = '© OpenStreetMap contributors';
export const DEFAULT_MAP_GEOCODER_BASE_URL = 'https://nominatim.openstreetmap.org';
export const DEFAULT_MAP_GEOCODER_USER_AGENT = 'GreenpillNetworkMap/1.0 (+https://greenpill.network)';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_QUERY_LENGTH = 120;
const MAP_LOCATION_GEOCODER_CACHE_VERSION = 'nominatim-v2';
const SETTLEMENT_TYPES = new Set([
  'city', 'town', 'village', 'municipality', 'hamlet', 'locality', 'suburb', 'neighbourhood', 'neighborhood', 'island',
]);
const REGION_TYPES = new Set(['state', 'province', 'region', 'county', 'district', 'municipal_district']);

interface NormalizedLocationCandidate {
  label: string;
  lat: number;
  long: number;
  kind: PublicMapLocationKind;
  providerId: string;
}

export interface MapLocationRepairCandidate {
  label: string;
  lat: number;
  long: number;
  kind: PublicMapLocationKind;
  provider: 'nominatim';
  providerPlaceId: string;
}

export interface MapLocationRequestMeta {
  rateLimitKey?: string;
}

export interface MapLocationCleanupResult {
  confirmationsDeleted: number;
  cachedLookupsDeleted: number;
  requestLimitsDeleted: number;
}

export interface MapLocationRepository {
  search(query: unknown, requestMeta?: MapLocationRequestMeta): Promise<PublicMapLocationSearchPayload>;
  reverse(lat: unknown, long: unknown, requestMeta?: MapLocationRequestMeta): Promise<PublicMapLocationReversePayload>;
  findRepairCandidates(query: unknown): Promise<MapLocationRepairCandidate[]>;
  cleanupExpired(): Promise<MapLocationCleanupResult>;
}

const cleanString = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

function mapLocationErrorEvent(stage: MapLocationErrorStage, error: unknown): MapLocationErrorEvent {
  const errorRecord = error && typeof error === 'object' ? error as UnknownRecord : {};
  const errorCode = cleanString(errorRecord.code);
  return {
    stage,
    errorName: error instanceof Error ? error.name : 'UnknownError',
    ...(errorCode ? { errorCode } : {}),
  };
}

function normalizeOsmId(value: unknown): string {
  if (typeof value === 'number' && Number.isSafeInteger(value) && value > 0) {
    return String(value);
  }
  return cleanString(value);
}

function hashKey(...parts: string[]): string {
  return createHash('sha256').update(parts.join('\u0000'), 'utf8').digest('hex');
}

function geocoderCacheKey(kind: 'search' | 'reverse', ...parts: string[]): string {
  return hashKey(MAP_LOCATION_GEOCODER_CACHE_VERSION, kind, ...parts);
}

function safeBaseUrl(value: unknown): string {
  const candidate = cleanString(value) || DEFAULT_MAP_GEOCODER_BASE_URL;
  try {
    const url = new URL(candidate);
    if (url.protocol !== 'https:') throw new Error('Map geocoder must use HTTPS.');
    return url.toString().replace(/\/$/, '');
  } catch {
    throw new AgentDataError('map_geocoder_not_configured', 'Map place search is not configured.');
  }
}

export function getMapGeocoderConfig(env: Record<string, string | undefined> = process.env) {
  return {
    baseUrl: safeBaseUrl(env.MAP_GEOCODER_BASE_URL),
    userAgent: cleanString(env.MAP_GEOCODER_USER_AGENT) || DEFAULT_MAP_GEOCODER_USER_AGENT,
  };
}

function normalizeQuery(value: unknown): string {
  const query = normalizeMapLocationQuery(value);
  if (query.length < 3) {
    throw new PublicInputError('invalid_location_query', 'Enter at least three characters to find a place.');
  }
  if (query.length > MAX_QUERY_LENGTH) {
    throw new PublicInputError('invalid_location_query', 'Place search must be 120 characters or fewer.');
  }
  return query;
}

function locationKind(raw: UnknownRecord): PublicMapLocationKind | null {
  const type = cleanString(raw.addresstype ?? raw.type).toLowerCase();
  const category = cleanString(raw.category ?? raw.class).toLowerCase();
  // `address.country_code` is present on settlements and administrative
  // boundaries too. Classify by Nominatim's explicit address type first so a
  // state/province boundary cannot be recorded as a country.
  if (type === 'country') return 'country';
  if (REGION_TYPES.has(type)) return 'region';
  if (SETTLEMENT_TYPES.has(type) || category === 'place') return 'settlement';
  return null;
}

function normalizeCandidate(raw: unknown): NormalizedLocationCandidate | null {
  const record = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as UnknownRecord : {};
  const label = cleanString(record.display_name ?? record.name ?? record.label);
  const lat = normalizeMapLatitude(record.lat);
  const long = normalizeMapLongitude(record.lon ?? record.long);
  const cachedKind = cleanString(record.kind);
  const kind = (cachedKind === 'settlement' || cachedKind === 'region' || cachedKind === 'country')
    ? cachedKind as PublicMapLocationKind
    : locationKind(record);
  const osmType = cleanString(record.osm_type);
  const osmId = normalizeOsmId(record.osm_id);
  // Cached entries use the normalized provider id; fresh Nominatim results
  // provide their OSM type/id separately. Accept either representation, never
  // inventing an id for a response we cannot trace in the audit record.
  const providerId = cleanString(record.providerId) || (osmType && osmId ? `${osmType}:${osmId}` : '');
  if (!label || lat === null || long === null || !kind || !providerId) return null;
  return {
    label,
    lat,
    long,
    kind,
    providerId,
  };
}

function dedupeCandidates(candidates: NormalizedLocationCandidate[]): NormalizedLocationCandidate[] {
  const seenProviderIds = new Set<string>();
  const seenLabels = new Set<string>();
  return candidates.filter((candidate) => {
    const labelKey = candidate.label.normalize('NFKC').replace(/\s+/g, ' ').toLocaleLowerCase('en-US');
    if (seenProviderIds.has(candidate.providerId) || seenLabels.has(labelKey)) return false;
    seenProviderIds.add(candidate.providerId);
    seenLabels.add(labelKey);
    return true;
  }).slice(0, 5);
}

function distanceKm(aLat: number, aLong: number, bLat: number, bLong: number): number {
  const radians = Math.PI / 180;
  const latitudeDelta = (bLat - aLat) * radians;
  const longitudeDelta = (bLong - aLong) * radians;
  const sinLatitude = Math.sin(latitudeDelta / 2);
  const sinLongitude = Math.sin(longitudeDelta / 2);
  const value = sinLatitude * sinLatitude
    + Math.cos(aLat * radians) * Math.cos(bLat * radians) * sinLongitude * sinLongitude;
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

async function withSql<T>(
  createSql: (options?: { max?: number }) => SqlLike | null,
  callback: (sql: SqlLike) => Promise<T> | T
): Promise<T> {
  const sql = createSql({ max: 1 });
  if (!sql) {
    throw new AgentDataError('database_not_configured', 'Map location confirmation is unavailable right now.');
  }

  try {
    return await callback(sql);
  } finally {
    await sql.end({ timeout: 3 }).catch(() => {});
  }
}

function toDate(value: unknown): Date | null {
  const date = value instanceof Date ? value : new Date(String(value ?? ''));
  return Number.isNaN(date.valueOf()) ? null : date;
}

function cachedCandidates(row: UnknownRecord | undefined, now: Date): NormalizedLocationCandidate[] | null {
  if (!row) return null;
  const expiresAt = toDate(row.expiresAt ?? row.expires_at);
  if (!expiresAt || expiresAt <= now || !Array.isArray(row.payload)) return null;
  return dedupeCandidates(row.payload.map(normalizeCandidate).filter((candidate): candidate is NormalizedLocationCandidate => Boolean(candidate)));
}

async function getCachedCandidates(sql: SqlLike, key: string, now: Date): Promise<NormalizedLocationCandidate[] | null> {
  const [row] = await sql`
    select payload, expires_at as "expiresAt"
    from intake.map_location_geocode_cache
    where lookup_key = ${key}
    limit 1
  `;
  return cachedCandidates(row, now);
}

async function reserveProviderRequest(sql: SqlLike, now: Date): Promise<void> {
  await sql.begin(async (tx) => {
    await tx`
      insert into intake.map_location_geocode_throttle (id, next_request_at)
      values (1, to_timestamp(0))
      on conflict (id) do nothing
    `;
    const [state] = await tx`
      select next_request_at as "nextRequestAt"
      from intake.map_location_geocode_throttle
      where id = 1
      for update
    `;
    const nextRequestAt = toDate(state?.nextRequestAt) ?? new Date(0);
    if (nextRequestAt > now) {
      throw new PublicInputError(
        'location_lookup_busy',
        'Place search is briefly busy. Please try again in a moment.',
        429
      );
    }
    await tx`
      update intake.map_location_geocode_throttle
      set next_request_at = ${new Date(now.getTime() + MAP_LOCATION_RATE_LIMIT_MS)}
      where id = 1
    `;
  });
}

async function reservePublicLocationRequest(
  sql: SqlLike,
  requestMeta: MapLocationRequestMeta | undefined,
  now: Date
): Promise<void> {
  const rateLimitKeyHash = hashKey('map-location-public-request', cleanString(requestMeta?.rateLimitKey) || 'anonymous');
  await sql.begin(async (tx) => {
    await tx`
      insert into intake.map_location_request_limits (
        rate_limit_key_hash,
        window_started_at,
        request_count
      )
      values (${rateLimitKeyHash}, ${now}, 0)
      on conflict (rate_limit_key_hash) do nothing
    `;
    const [state] = await tx`
      select
        window_started_at as "windowStartedAt",
        request_count as "requestCount"
      from intake.map_location_request_limits
      where rate_limit_key_hash = ${rateLimitKeyHash}
      for update
    `;
    const windowStartedAt = toDate(state?.windowStartedAt) ?? new Date(0);
    const requestCount = Number(state?.requestCount ?? 0);
    const windowElapsed = now.getTime() - windowStartedAt.getTime();

    if (windowElapsed >= 60 * 1000) {
      await tx`
        update intake.map_location_request_limits
        set
          window_started_at = ${now},
          request_count = 1,
          updated_at = now()
        where rate_limit_key_hash = ${rateLimitKeyHash}
      `;
      return;
    }

    if (requestCount >= MAP_LOCATION_REQUESTS_PER_MINUTE) {
      throw new PublicInputError(
        'location_request_rate_limited',
        'Too many location checks came from this network. Please try again in a minute.',
        429
      );
    }

    await tx`
      update intake.map_location_request_limits
      set
        request_count = request_count + 1,
        updated_at = now()
      where rate_limit_key_hash = ${rateLimitKeyHash}
    `;
  });
}

async function saveCachedCandidates(sql: SqlLike, key: string, kind: 'search' | 'reverse', candidates: NormalizedLocationCandidate[], now: Date): Promise<void> {
  await sql`
    insert into intake.map_location_geocode_cache (
      lookup_key,
      lookup_kind,
      payload,
      expires_at
    )
    values (
      ${key},
      ${kind},
      ${sql.json(candidates)},
      ${new Date(now.getTime() + MAP_LOCATION_CACHE_TTL_DAYS * 24 * 60 * 60 * 1000)}
    )
    on conflict (lookup_key) do update set
      payload = excluded.payload,
      lookup_kind = excluded.lookup_kind,
      expires_at = excluded.expires_at,
      updated_at = now()
  `;
}

async function nominatimRequest(
  path: 'search' | 'reverse',
  params: Record<string, string>,
  { fetchImpl, env }: { fetchImpl: FetchLike; env: Record<string, string | undefined> }
): Promise<NormalizedLocationCandidate[]> {
  const config = getMapGeocoderConfig(env);
  const url = new URL(`${config.baseUrl}/${path}`);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('limit', path === 'search' ? '5' : '1');
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), MAP_LOCATION_PROVIDER_TIMEOUT_MS);
  timeout.unref?.();

  let response: Response;
  try {
    response = await fetchImpl(url, {
      signal: controller.signal,
      headers: {
        accept: 'application/json',
        'accept-language': 'en',
        'user-agent': config.userAgent,
      },
    });
  } catch {
    throw new AgentDataError('location_provider_unavailable', 'Place search is unavailable. Please try again shortly.');
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new AgentDataError('location_provider_unavailable', 'Place search is unavailable. Please try again shortly.');
  }

  const payload = await response.json().catch(() => null);
  // Search returns an array while reverse returns one object. Treat a
  // proxy/login document or other successful-but-unexpected response as an
  // outage, rather than caching it as a 30-day "no result" for every user of
  // this place.
  const records = path === 'search'
    ? (Array.isArray(payload) ? payload : null)
    : (payload && typeof payload === 'object' && !Array.isArray(payload) ? [payload] : null);
  if (!records) {
    throw new AgentDataError('location_provider_unavailable', 'Place search is unavailable. Please try again shortly.');
  }
  return dedupeCandidates(records
    .map(normalizeCandidate)
    .filter((candidate): candidate is NormalizedLocationCandidate => Boolean(candidate)));
}

async function lookupCandidates(
  sql: SqlLike,
  {
    key,
    kind,
    now,
    load,
  }: {
    key: string;
    kind: 'search' | 'reverse';
    now: Date;
    load: () => Promise<NormalizedLocationCandidate[]>;
  }
): Promise<NormalizedLocationCandidate[]> {
  const cached = await getCachedCandidates(sql, key, now);
  if (cached) return cached;
  await reserveProviderRequest(sql, now);
  const candidates = await load();
  await saveCachedCandidates(sql, key, kind, candidates, now);
  return candidates;
}

async function createConfirmation(sql: SqlLike, candidate: NormalizedLocationCandidate, method: 'search' | 'reverse'): Promise<PublicMapLocation> {
  const [row] = await sql`
    insert into intake.map_location_confirmations (
      label,
      latitude,
      longitude,
      location_kind,
      attribution,
      provider,
      provider_place_id,
      confirmation_method,
      expires_at
    )
    values (
      ${candidate.label},
      ${candidate.lat},
      ${candidate.long},
      ${candidate.kind},
      ${MAP_LOCATION_ATTRIBUTION},
      'nominatim',
      ${candidate.providerId},
      ${method},
      ${new Date(Date.now() + MAP_LOCATION_CONFIRMATION_TTL_MINUTES * 60 * 1000)}
    )
    returning id::text as "confirmationId"
  `;

  return {
    confirmationId: cleanString(row?.confirmationId),
    label: candidate.label,
    lat: candidate.lat,
    long: candidate.long,
    kind: candidate.kind,
    attribution: MAP_LOCATION_ATTRIBUTION,
  };
}

export async function cleanupExpiredMapLocations(sql: SqlLike): Promise<MapLocationCleanupResult> {
  const [confirmations] = await sql`
    with deleted as (
      delete from intake.map_location_confirmations
      where expires_at < now() - ${MAP_LOCATION_CONFIRMATION_RETENTION_HOURS} * interval '1 hour'
      returning 1
    )
    select count(*)::int as count from deleted
  `;
  const [cachedLookups] = await sql`
    with deleted as (
      delete from intake.map_location_geocode_cache
      where expires_at < now() - ${MAP_LOCATION_CACHE_RETENTION_DAYS} * interval '1 day'
      returning 1
    )
    select count(*)::int as count from deleted
  `;
  const [requestLimits] = await sql`
    with deleted as (
      delete from intake.map_location_request_limits
      where window_started_at < now() - ${MAP_LOCATION_REQUEST_LIMIT_RETENTION_HOURS} * interval '1 hour'
      returning 1
    )
    select count(*)::int as count from deleted
  `;
  return {
    confirmationsDeleted: Number(confirmations?.count ?? 0),
    cachedLookupsDeleted: Number(cachedLookups?.count ?? 0),
    requestLimitsDeleted: Number(requestLimits?.count ?? 0),
  };
}

export async function consumeMapLocationConfirmation(sql: SqlLike, confirmationId: unknown): Promise<{
  label: string;
  lat: number;
  long: number;
  kind: PublicMapLocationKind;
  provider: string;
  providerPlaceId: string;
}> {
  const id = cleanString(confirmationId);
  if (!UUID_PATTERN.test(id)) {
    throw new PublicInputError('location_confirmation_required', 'Confirm your place before submitting.');
  }

  const [row] = await sql`
    update intake.map_location_confirmations
    set consumed_at = now()
    where id = ${id}::uuid
      and consumed_at is null
      and expires_at > now()
    returning
      label,
      latitude::float8 as lat,
      longitude::float8 as long,
      location_kind as kind,
      provider,
      provider_place_id as "providerPlaceId"
  `;
  const lat = normalizeMapLatitude(row?.lat);
  const long = normalizeMapLongitude(row?.long);
  const label = cleanString(row?.label);
  if (!row || lat === null || long === null || !label) {
    throw new PublicInputError('invalid_location_confirmation', 'This place confirmation has expired. Find and confirm the place again.');
  }

  return {
    label,
    lat,
    long,
    kind: row.kind as PublicMapLocationKind,
    provider: cleanString(row.provider),
    providerPlaceId: cleanString(row.providerPlaceId),
  };
}

export function createMapLocationRepository({
  createSql = createDatabaseClient,
  fetchImpl = globalThis.fetch,
  env = process.env,
  now = () => new Date(),
  reportError = (event) => console.warn('map_location_request_failed', event),
}: {
  createSql?: (options?: { max?: number }) => SqlLike | null;
  fetchImpl?: FetchLike;
  env?: Record<string, string | undefined>;
  now?: () => Date;
  reportError?: (event: MapLocationErrorEvent) => void;
} = {}): MapLocationRepository {
  return {
    async findRepairCandidates(query) {
      const normalizedQuery = normalizeQuery(query);
      const candidates = await withSql(createSql, async (sql) => {
        const timestamp = now();
        return lookupCandidates(sql, {
          key: geocoderCacheKey('search', normalizedQuery.toLowerCase()),
          kind: 'search',
          now: timestamp,
          load: () => nominatimRequest('search', { q: normalizedQuery }, { fetchImpl, env }),
        });
      });
      return candidates.map((candidate) => ({
        label: candidate.label,
        lat: candidate.lat,
        long: candidate.long,
        kind: candidate.kind,
        provider: 'nominatim' as const,
        providerPlaceId: candidate.providerId,
      }));
    },

    async search(query, requestMeta) {
      const normalizedQuery = normalizeQuery(query);
      const candidates = await withSql(createSql, async (sql) => {
        const timestamp = now();
        await reservePublicLocationRequest(sql, requestMeta, timestamp);
        return lookupCandidates(sql, {
          key: geocoderCacheKey('search', normalizedQuery.toLowerCase()),
          kind: 'search',
          now: timestamp,
          load: () => nominatimRequest('search', { q: normalizedQuery }, { fetchImpl, env }),
        });
      });
      if (candidates.length === 0) {
        throw new PublicInputError('location_not_found', 'No city, region, or country matched that search.', 404);
      }
      const results = await withSql(createSql, (sql) => Promise.all(candidates.map((candidate) => createConfirmation(sql, candidate, 'search'))));
      return assertPublicMapLocationPayload({ results });
    },

    async reverse(lat, long, requestMeta) {
      const latitude = normalizeMapLatitude(lat);
      const longitude = normalizeMapLongitude(long);
      if (latitude === null || longitude === null) {
        throw new PublicInputError('invalid_coordinates', 'Choose a valid point on the map.');
      }
      let candidates: NormalizedLocationCandidate[];
      try {
        candidates = await withSql(createSql, async (sql) => {
          const timestamp = now();
          await reservePublicLocationRequest(sql, requestMeta, timestamp);
          return lookupCandidates(sql, {
            key: geocoderCacheKey('reverse', latitude.toFixed(4), longitude.toFixed(4)),
            kind: 'reverse',
            now: timestamp,
            load: () => nominatimRequest('reverse', {
              lat: String(latitude),
              lon: String(longitude),
              zoom: '10',
            }, { fetchImpl, env }),
          });
        });
      } catch (error) {
        if (!(error instanceof PublicInputError)) {
          reportError(mapLocationErrorEvent('reverse_lookup', error));
        }
        throw error;
      }
      const candidate = candidates[0];
      if (!candidate || distanceKm(latitude, longitude, candidate.lat, candidate.long) > MAP_LOCATION_REVERSE_MAX_DISTANCE_KM) {
        throw new PublicInputError('location_not_confirmed', 'That pin is too far from a confirmed place. Try another point.', 422);
      }
      let confirmation: PublicMapLocation;
      try {
        confirmation = await withSql(createSql, (sql) => createConfirmation(sql, candidate, 'reverse'));
      } catch (error) {
        reportError(mapLocationErrorEvent('reverse_confirmation_write', error));
        throw error;
      }
      return assertPublicMapLocationPayload({ confirmation });
    },

    cleanupExpired() {
      return withSql(createSql, cleanupExpiredMapLocations);
    },
  };
}
