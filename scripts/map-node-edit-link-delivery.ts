import { createMapNodeRepository } from '@greenpill-network/agent';

try {
  const result = await createMapNodeRepository().deliverQueuedEditLinks();
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
  if (code === 'database_not_configured') {
    console.error('DATABASE_URL is required to deliver queued map-node edit links.');
    process.exit(1);
  }
  throw error;
}
