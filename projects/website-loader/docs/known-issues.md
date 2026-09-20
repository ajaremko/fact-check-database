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

## `STAGING_BUCKET_NAME` is provisioned but never read

**Error:** No error — dead configuration.
**Where:** `website-infra`'s `search/loader/service.ts` sets `STAGING_BUCKET_NAME`, but no code in
this project reads it (confirmed: zero references anywhere in `src/`). The bucket to read from is
instead determined per-message from the Pub/Sub notification's `bucketId` attribute — the same
finding already documented for `analysis-infra`'s equivalent variable in
`analysis-loader/docs/known-issues.md`.
**Root cause:** Likely provisioned defensively or left over from an earlier design that read a
fixed bucket rather than one carried per-message.
**Decision:** Leave as-is. Removing a provisioned env var is a change to `website-infra`, not to
this project — noting it here rather than reopening that project's docs in this pass.
**If this ever needs to be fixed:** Remove `STAGING_BUCKET_NAME` from
`website-infra/src/search/loader/service.ts`'s env list once confirmed nothing else depends on it
being present.
