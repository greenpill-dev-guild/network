import type postgres from 'postgres';
import type {
  OptimisticPendingMapNode,
  PublicMapNode,
} from '@greenpill-network/shared/map-nodes';

export interface RequestMeta {
  ipAddress?: string;
  userAgent?: string;
  rateLimitKey?: string;
}

export interface PublicMapNodeSubmissionInput {
  displayName?: string;
  name?: string;
  placeName?: string;
  place?: string;
  city?: string;
  region?: string;
  country?: string;
  lat?: number | string;
  latitude?: number | string;
  long?: number | string;
  lng?: number | string;
  longitude?: number | string;
  role?: string;
  intent?: string;
  themes?: string[];
  publicNote?: string;
  public_note?: string;
  rawNote?: string;
  raw_note?: string;
  email?: string;
  privateEmail?: string;
  private_email?: string;
  contactConsent?: boolean;
  contact_consent?: boolean;
}

export type SubmittedPendingMapNode = Omit<OptimisticPendingMapNode, 'source'> & {
  source: 'submitted-pending';
};

export class PublicInputError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status?: number);
}

export class AgentDataError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status?: number);
}

export function publicErrorResponse(error: unknown): {
  status: number;
  body: {
    error: {
      code: string;
      message: string;
    };
  };
};
export function getRequestMeta(context: {
  req: {
    header(name: string): string | undefined;
  };
}): RequestMeta;
export function createMapNodeSubmission(
  sql: postgres.Sql,
  input: PublicMapNodeSubmissionInput,
  requestMeta?: RequestMeta,
): Promise<SubmittedPendingMapNode>;
export function listPublicMapNodes(sql: postgres.Sql): Promise<PublicMapNode[]>;
export function createMapNodeRepository(options?: {
  createSql?: (options?: { max?: number }) => postgres.Sql | null;
}): {
  createSubmission(input: PublicMapNodeSubmissionInput, requestMeta?: RequestMeta): Promise<SubmittedPendingMapNode>;
  listPublic(): Promise<PublicMapNode[]>;
};
