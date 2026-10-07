# Known Issues

## One oversized record fails the whole batch

**Error:** `AlgoliaSearchClientIOError: Failed to save objects: Record at the position 534
objectID=… is too big size=31099/10000 bytes`. The `/load-jobs` route returns 500. Pub/Sub
redelivers the message, and after five attempts it goes to the dead-letter topic.
**Where:** `src/Program.ts`, which saves a batch with one `saveObjects` call, and
`src/transcodeBatch.ts`, which copies `fact_check.summary` into the search record whole.
**Root cause:** The search provider limits the size of a single record (10,000 bytes on the plan
in use) and rejects the whole save when one record is over it. Nothing bounds a record's size: a
publisher that puts a full article in its feed's description produces a summary of any length.
The record that first showed this, in dev on 2026-10-07, has a summary of 29,393 characters. A
fact check stays in its feed for days, so every later batch contains the same record and fails
the same way. While it does, no record from any batch reaches the index. At the time, 14 of the
1,223 fact checks in the staging table were over 9,000 bytes as table rows.
**Decision:** Not yet addressed. Tracked in [docs/todo.md](../../../docs/todo.md).
**If this ever needs to be fixed:** Bound the record in `transcodeBatch`: truncate `summary` to a
length that keeps the record under the limit. The alternative is to leave out a record that is
too big and log it, so the rest of the batch is saved. Batches that were dead-lettered need no
replay for fact checks still in a feed, because the next batch sends them again. A fact check
that left its feed while batches were failing has to be reloaded from its staging batch.

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

## Nothing removes records from the search index

**Error:** No error. The index only grows.
**Where:** `src/Program.ts`, which only ever calls `saveObjects`.
**Root cause:** The loader sees new staging batches and upserts what they contain. It has no signal that a fact check has left its feed or been withdrawn, so a record stays in the index for good. The index's size is bounded only by the search provider's plan.
**Decision:** Not yet addressed. Tracked in [docs/todo.md](../../../docs/todo.md).
**If this ever needs to be fixed:** Decide what should expire a record (for example, not seen in any fetch for a set period), then run a scheduled job that deletes those `objectID`s. The same job is the hook a takedown request needs.

## Records indexed before 2026-10 have no `published_at_timestamp`

**Error:** No error — some older fact checks sort last in both the newest-first and oldest-first views.
**Where:** The Algolia indices, which rank on `published_at_timestamp` (`website-infra/src/search/indices.ts`).
**Root cause:** The timestamp was added to search records in 2026-10, when the types of `published_at_raw` and `published_at_normalized` were corrected. A record is rewritten the next time its fact check appears in a staging batch, which covers every fact check still listed in a feed. A fact check that has left its feed keeps its old record: it has no timestamp, and its `published_at_raw` holds a re-serialized date instead of the publisher's string.
**Decision:** Leave them for now. Nothing in this project can rebuild the index, because the loader only ever sees new staging batches.
**If this ever needs to be fixed:** Rebuild the index from the curated BigQuery table, one record per `fact_check_id`. The same rebuild resolves the older content-hash records described above.
