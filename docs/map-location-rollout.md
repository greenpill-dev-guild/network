# Map location integrity rollout

The map-location confirmation requirement defaults to enabled. The website must
be deployed with its confirmed-location picker before the agent begins rejecting
the previous raw place and coordinate fields.

## Safe deployment order

1. Set `MAP_LOCATION_CONFIRMATION_REQUIRED=false` on the private agent only.
2. Configure the agent's `MAP_GEOCODER_USER_AGENT` with a stable Greenpill
   contact URL or mailbox before enabling public requests. Leave
   `MAP_GEOCODER_BASE_URL` unset to use public Nominatim, or set it only to an
   approved HTTPS provider endpoint.
3. Deploy the agent migration and agent service. Confirm `/ready` and make one
   public-place search plus one reverse lookup against the deployed agent; a
   provider failure must return the retry-safe `location_provider_unavailable`
   error, never a cached "no result".
4. Deploy the website. Confirm search, direct map placement, reverse
   confirmation, submission, and the owner edit flow in authenticated Brave.
5. Set `MAP_LOCATION_CONFIRMATION_REQUIRED=true` and redeploy/restart the
   agent. The default is already true; the explicit setting makes the cutover
   visible in deployment configuration.
6. Run the repair command as a dry run, review its exact-label-and-context
   output, then use `--apply` only after steward approval. Keep its printed run
   id for rollback. If it returns `nextCursor`, repeat the same review/apply
   pair with `--after <nextCursor>` until the cursor is empty.

## Repair commands

```sh
bun run db:migrate
bun run db:repair:map-node-locations -- --limit 100
bun run db:repair:map-node-locations -- --limit 100 --apply
bun run db:repair:map-node-locations -- --limit 100 --after <nextCursor>
bun run db:repair:map-node-locations -- --revert <run-id>
```

The repair runner is intentionally conservative: it changes only a unique,
exact place label whose provider label also contains every available
disambiguating stored city, region, and country component, and is at least
50 km from the stored point. A label without disambiguating context is eligible
only when it is an exact country match. It uses the same one-request-per-second
provider throttle as the public picker.

Both dry-run and apply mode send the selected historical public place label and
its available city, region, and country context to the configured geocoder.
Run either mode only after the data owner has approved that disclosure; a dry
run has the same provider-data boundary as an apply run.
