import { createMapNodeRepository } from '@greenpill-network/agent';

try {
  const result = await createMapNodeRepository().cleanupEditFlow();
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
  if (code === 'database_not_configured') {
    console.error('DATABASE_URL is required to clean up map-node edit tokens and private request metadata.');
    process.exit(1);
  }
  throw error;
}
