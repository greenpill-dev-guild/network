export type MapNodeStatus = 'pending' | 'approved' | 'rejected' | 'archived';

export interface PublicMapNode {
  id: string;
  name: string;
  place: string;
  city: string;
  region: string;
  country: string;
  lat: number;
  long: number;
  role: string;
  themes: string[];
  publicNote: string;
  status: 'approved';
  source: 'approved-submission';
}

export interface OptimisticPendingMapNode extends Omit<PublicMapNode, 'status' | 'source'> {
  lat: number | null;
  long: number | null;
  status: 'pending';
  source: 'local-pending';
  createdAt: string;
}

export const MAP_NODE_STATUSES: readonly MapNodeStatus[];
export const PRIVATE_MAP_NODE_FIELDS: readonly string[];
export const PUBLIC_MAP_NODE_FIELDS: readonly string[];
export const PENDING_NODE_STORAGE_KEY: string;
export const PENDING_NODE_UPDATED_EVENT: string;

export function containsPrivateMapNodeField(value: unknown, seen?: Set<object>): boolean;
export function toPublicMapNode(submission: Record<string, unknown>): PublicMapNode | null;
export function createOptimisticPendingNode(input: Record<string, unknown>, now?: Date | string): OptimisticPendingMapNode;
export function loadLocalPendingNodes(storage?: Storage | null): OptimisticPendingMapNode[];
export function saveLocalPendingNode(storage: Storage | null | undefined, input: Record<string, unknown>, now?: Date | string): OptimisticPendingMapNode | null;
