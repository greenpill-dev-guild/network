import {
  toPublicWebsiteBuildMetadata,
  type PublicWebsiteBuildMetadata,
} from '@greenpill-network/shared/public-content';
import { getOperationalContentSnapshot } from './operational-content.js';

export async function getWebsiteBuildMetadata(
  builtAt: Date | string = new Date()
): Promise<PublicWebsiteBuildMetadata> {
  const snapshot = await getOperationalContentSnapshot();
  return toPublicWebsiteBuildMetadata({
    builtAt,
    operationalSnapshotGeneratedAt: snapshot.generatedAt,
  });
}
