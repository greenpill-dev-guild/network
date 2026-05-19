import {
  createImpactRepository,
  getImpactSyncConfig,
  syncChapterImpactSnapshots,
} from '@greenpill-network/agent';

const result = await syncChapterImpactSnapshots({
  repository: createImpactRepository(),
  config: getImpactSyncConfig(),
});

console.log(JSON.stringify(result, null, 2));
