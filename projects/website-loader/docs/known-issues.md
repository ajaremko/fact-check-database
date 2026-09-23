# Known Issues

## The `/load-jobs` route has no test coverage

**Error:** No error — an accepted test-coverage gap.
**Where:** `src/Program.ts`'s route handler. `transcodeBatch` now has spec coverage
(`src/transcodeBatch.spec.ts`, added via a `vitest.config.mts` this project didn't previously
have — `nx test website-loader` is a real target now), but the route itself, which wires together
`StorageReader` and `AlgoliaSearchClient`, is still untested.
**Root cause:** Unknown — same gap as `analysis-loader`, the other consumer of the same staging
batches.
**Decision:** Leave as-is for now. Closing this means writing real coverage, not a small fix.
**If this ever needs to be fixed:** Add a spec for the `/load-jobs` route (mock `StorageReader` and
`AlgoliaSearchClient`).

## No local development path

**Error:** No error — a structural gap.
**Where:** The whole project. No `.env`/`.env.template`, no dev-mode storage adapter. `main.ts`
wires exactly one storage adapter, one logger, and one OTel configuration, all unconditionally.
**Root cause:** This service was built GCP-only from the start, same as `analysis-loader`.
**Decision:** Leave as-is. This is an intentional decision: The app serves to load a file into bigquery - all functionality comes from SDKs. To test it locally would mean mocking everything to the point that it would be a completely different app being run locally.
**If this ever needs to be fixed:** Add a `STORAGE_MODE`-style switch (mirroring the
ingestion/emailer services) with a filesystem-backed alternative for the batch read, plus a
`.env.template`. A local Algolia sandbox index would also be needed to exercise the save step.

## Search records indexed before 2026-09 are keyed by content hash

**Error:** No error — duplicate search results for some older fact checks.
**Where:** The Algolia index written by `src/transcodeBatch.ts`.
**Root cause:** Before the pipeline-wide identity change (see
[docs/fact-check-lifecycle.md](../../../docs/fact-check-lifecycle.md)), `objectID` was the item's content hash, so every
edit to a fact check's title or summary created an additional record. Records now use
`fact_check_id`, which a later batch overwrites in place, but records written under the old scheme
aren't overwritten — their `objectID`s never recur.
**Decision:** Leave them for now. Clearing the index would also remove fact checks that no longer
appear in any feed, because the loader only ever sees new staging batches.
**If this ever needs to be fixed:** Rebuild the index from the curated BigQuery table (one record
per `fact_check_id`), then delete every record whose `objectID` isn't in that set.
