import type { PublicImpactSourceBinding } from './chapter-impact.js';

export type PublicOperationalContentCollection = 'themes' | 'people' | 'chapters' | 'guilds' | 'projects';

export interface PublicOperationalRecord {
  slug: string;
  id: string;
  [key: string]: unknown;
}

export interface PublicOperationalLocation {
  id: string;
  name: string;
  lat: number;
  long: number;
  link: string;
  kind: 'chapter';
  status: string;
  themes: string[];
}

export interface PublicOperationalImpactSourcePayload {
  version: 1;
  generatedAt: string;
  chapters: PublicImpactSourceBinding[];
}

export interface PublicOperationalContentSnapshot {
  version: 1;
  generatedAt: string;
  themes: PublicOperationalRecord[];
  people: PublicOperationalRecord[];
  chapters: PublicOperationalRecord[];
  guilds: PublicOperationalRecord[];
  projects: PublicOperationalRecord[];
  locations: PublicOperationalLocation[];
  impactSourceBindings: PublicOperationalImpactSourcePayload;
}

export const PUBLIC_OPERATIONAL_CONTENT_VERSION: 1;
export const PUBLIC_OPERATIONAL_CONTENT_COLLECTIONS: readonly PublicOperationalContentCollection[];

export function toPublicOperationalLocations(chapters?: Record<string, unknown>[]): PublicOperationalLocation[];
export function toPublicOperationalImpactSourceBindings(
  chapters?: Record<string, unknown>[],
  generatedAt?: Date | string,
): PublicOperationalImpactSourcePayload;
export function toPublicOperationalContentSnapshot(input?: {
  themes?: Record<string, unknown>[];
  people?: Record<string, unknown>[];
  chapters?: Record<string, unknown>[];
  guilds?: Record<string, unknown>[];
  projects?: Record<string, unknown>[];
  generatedAt?: Date | string;
}): PublicOperationalContentSnapshot;
export function containsPrivateOperationalContentField(value: unknown, seen?: Set<object>): boolean;
export function assertPublicOperationalContentSnapshot<T>(payload: T): T;
