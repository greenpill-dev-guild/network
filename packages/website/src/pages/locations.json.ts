import { getOperationalLocations } from '../lib/operational-content';

export async function GET() {
  const locations = await getOperationalLocations();

  return new Response(JSON.stringify(locations, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
}
