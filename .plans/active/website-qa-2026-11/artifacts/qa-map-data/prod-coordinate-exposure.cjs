// PRD-1409 review (Codex threads on #35): a READ-ONLY count of how many map
// rows the coordinate rule would refuse. It counts pending submissions and
// pending owner update requests by the point they would leave on the map
// (missing, out of range, 0,0, or on the edge), approved rows the public map
// hides or shows on the edge, and pending update requests for the nine rows
// in the approved repair. Every query runs in a `begin read only`
// transaction, so PostgreSQL refuses any write. It prints counts only: no
// ids, names, places, emails or notes.
//
// It runs inside the network-agent machine, which holds DATABASE_URL. One
// command from the repository root, leaving no file on the machine:
//
//   fly ssh console -a network-agent -C "node -e 'eval(atob(process.argv[1]))' $(base64 < .plans/active/website-qa-2026-11/artifacts/qa-map-data/prod-coordinate-exposure.cjs | tr -d '\n')"
(async () => {
  const postgres = require('module').createRequire('/app/package.json')('postgres');
  const sql = postgres(process.env.DATABASE_URL, { max: 1, idle_timeout: 5, connect_timeout: 15, prepare: false });
  const repairIds = [
    'f52473d0-4d12-4e4e-a726-0dbb62d870d2',
    '79b7119a-6d6f-4680-9d6d-30fc7b509f43',
    '8804877c-508e-446d-bf27-bbb23b76598a',
    '21cb7662-1a87-4922-8373-4376f07a9c7c',
    'fc0cb8bd-7be9-4c48-a1d1-5ed013834e07',
    '10c4c9cb-baea-4e0b-983c-179c3eb88b1f',
    '0a76afe9-f1c1-4032-acf8-cd89f5329209',
    '1cc9c540-9678-4a62-9418-f0bc9431f378',
    '20bb327b-e9ca-4b1d-a1c5-999c57c5ec49',
  ];
  try {
    const result = await sql.begin('read only', async (tx) => {
      const [readOnly] = await tx`show transaction_read_only`;
      const [submissions] = await tx`
        select
          count(*) filter (where status = 'pending')::int as pending_total,
          count(*) filter (where status = 'pending' and (latitude is null or longitude is null))::int as pending_missing,
          count(*) filter (where status = 'pending' and (abs(latitude) > 90 or abs(longitude) > 180))::int as pending_out_of_range,
          count(*) filter (where status = 'pending' and latitude = 0 and longitude = 0)::int as pending_null_island,
          count(*) filter (where status = 'pending' and (abs(latitude) = 90 or abs(longitude) = 180))::int as pending_edge,
          count(*) filter (where status = 'approved')::int as approved_total,
          count(*) filter (where status = 'approved' and ((latitude = 0 and longitude = 0) or abs(latitude) > 90 or abs(longitude) > 180))::int as approved_hidden,
          count(*) filter (where status = 'approved' and (abs(latitude) = 90 or abs(longitude) = 180))::int as approved_edge
        from intake.map_node_submissions
      `;
      const [updates] = await tx`
        select
          count(*)::int as pending_total,
          count(*) filter (where r.proposed_public_fields ? 'latitude' or r.proposed_public_fields ? 'longitude')::int as pending_changing_location,
          count(*) filter (where n.next_lat is null or n.next_long is null)::int as next_missing,
          count(*) filter (where abs(n.next_lat) > 90 or abs(n.next_long) > 180)::int as next_out_of_range,
          count(*) filter (where n.next_lat = 0 and n.next_long = 0)::int as next_null_island,
          count(*) filter (where abs(n.next_lat) = 90 or abs(n.next_long) = 180)::int as next_edge,
          count(*) filter (where (r.proposed_public_fields ? 'latitude' or r.proposed_public_fields ? 'longitude')
            and ((n.next_lat = 0 and n.next_long = 0) or abs(n.next_lat) >= 90 or abs(n.next_long) >= 180))::int as location_change_to_bad_or_edge,
          count(*) filter (where r.submission_id = any(${repairIds}::uuid[]))::int as pending_for_repair_rows
        from intake.map_node_update_requests r
        join intake.map_node_submissions s on s.id = r.submission_id
        cross join lateral (
          select
            case when r.proposed_public_fields ? 'latitude' then r.proposed_latitude else s.latitude end as next_lat,
            case when r.proposed_public_fields ? 'longitude' then r.proposed_longitude else s.longitude end as next_long
        ) n
        where r.status = 'pending'
      `;
      return { transactionReadOnly: readOnly.transaction_read_only, submissions, updateRequests: updates };
    });
    console.log(JSON.stringify(result, null, 1));
  } finally {
    await sql.end({ timeout: 3 });
  }
})().catch((error) => {
  console.error('count failed:', error && error.message);
  process.exitCode = 1;
});
