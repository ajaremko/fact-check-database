# Known Issues

## No automated test coverage

**Error:** No error — an accepted test-coverage gap.
**Where:** The whole project. Zero `.spec.ts` files exist anywhere in `src/`.
**Root cause:** Unknown — same gap as `analysis-loader`, the other consumer of the same staging
batches.
**Decision:** Leave as-is for now. Closing this means writing real coverage, not a small fix.
**If this ever needs to be fixed:** Add specs for `transcodeBatch` (pure function, easy to test
directly against fixture NDJSON) and the `/load-jobs` route (mock `StorageReader` and
`AlgoliaSearchClient`) at minimum.

## No local development path

**Error:** No error — a structural gap.
**Where:** The whole project. No `.env`/`.env.template`, no dev-mode storage adapter. `main.ts`
wires exactly one storage adapter, one logger, and one OTel configuration, all unconditionally.
**Root cause:** This service was built GCP-only from the start, same as `analysis-loader`.
**Decision:** Leave as-is. Adding a dev-mode path is a real feature, not a documentation fix.
**If this ever needs to be fixed:** Add a `STORAGE_MODE`-style switch (mirroring the
ingestion/emailer services) with a filesystem-backed alternative for the batch read, plus a
`.env.template`. A local Algolia sandbox index would also be needed to exercise the save step.

## Two of three error sources aren't explicitly handled

**Error:** No error — an inconsistency in error handling, not a functional bug.
**Where:** `src/Program.ts`'s route handler only catches `AlgoliaSearchClientIOError` with a
tailored `500` response. `StorageReadError` (from the batch read) and any schema `ParseError` (a
malformed push message or a batch row that no longer matches `FactChecksTableRowSchema`) are only
logged via `Effect.tapErrorCause(Effect.logError)`, not caught — they fall through to the HTTP
framework's default error response instead.
**Root cause:** Likely only the most commonly-hit failure mode (an Algolia save error) was handled
explicitly; the other two are rarer in practice.
**Decision:** Leave as-is. All three failure modes already nack correctly (any non-2xx response
triggers redelivery) — the gap is in response consistency and log-based diagnosis, not
correctness.
**If this ever needs to be fixed:** Add `Effect.catchTags` for `StorageReadError` and `ParseError`
alongside the existing `AlgoliaSearchClientIOError` handling, each with its own clear response
message.
