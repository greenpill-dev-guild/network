import type { PublicOperationalContentSnapshot } from '@greenpill-network/shared/public-content';

export const PUBLIC_OPERATIONAL_CONTENT_ROUTE: '/content/public-snapshot';

export interface PublicContentRepository {
  getSnapshot(now?: Date | string): Promise<PublicOperationalContentSnapshot>;
}

export function getPublicOperationalContentSnapshot(
  sql: unknown,
  now?: Date | string,
): Promise<PublicOperationalContentSnapshot>;

export function createPublicContentRepository(options?: {
  createSql?: (options?: Record<string, unknown>) => unknown;
}): PublicContentRepository;
