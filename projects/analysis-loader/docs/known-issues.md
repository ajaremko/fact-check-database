# Known Issues

## No automated test coverage

**Error:** No error — an accepted test-coverage gap.
**Where:** The whole project. Zero `.spec.ts` files exist anywhere in `src/`.
**Root cause:** Unknown — every other service in this pipeline
(`ingestion-ingestor`, `ingestion-sanitizer`, `ingestion-extractor`) has real spec coverage; this
one was apparently never given any.
**Decision:** Leave as-is for now. Closing this means writing real coverage, not a small fix.
**If this ever needs to be fixed:** Add specs for `loadBatch` (mock `BigQueryClient`) and
`readSchema` (mock `StorageReader`) at minimum, following the pattern used in the sibling
services' `*.spec.ts` files.

## No local development path

**Error:** No error — a structural gap.
**Where:** The whole project. No `.env`/`.env.template`, no dev-mode storage adapter (unlike
every ingestion-domain service, which switches between a filesystem adapter and a GCP adapter).
**Root cause:** This service was built GCP-only from the start — `main.ts` wires exactly one
storage adapter and one BigQuery adapter, unconditionally.
**Decision:** Leave as-is. Adding a dev-mode path is a real feature, not a documentation fix.
**If this ever needs to be fixed:** Add a `STORAGE_MODE`-style switch (mirroring the ingestion
services) with a filesystem-backed alternative for both the schema fetch and the BigQuery load
step (the latter would need a local BigQuery emulator or a mocked client), plus a
`.env.template`.

## Two of three error sources aren't explicitly handled

**Error:** No error — an inconsistency in error handling, not a functional bug.
**Where:** `src/app/index.ts`'s route handler only catches `BigQueryClientIOError` with a
tailored `500` response. `StorageReadError` (from the schema fetch in `readSchema.ts`) and any
schema `ParseError` (a malformed push message or malformed fetched schema) are only logged via
`Effect.tapErrorCause(Effect.logError)`, not caught — they fall through to the HTTP framework's
default error response instead.
**Root cause:** Likely only the most commonly-hit failure mode (a BigQuery load error) was
handled explicitly; the other two are rarer in practice (a malformed message from Pub/Sub itself,
or the schema object going missing).
**Decision:** Leave as-is. All three failure modes already nack correctly (any non-2xx response
triggers redelivery) — the gap is in response consistency and log-based diagnosis, not
correctness.
**If this ever needs to be fixed:** Add `Effect.catchTags` for `StorageReadError` and `ParseError`
alongside the existing `BigQueryClientIOError` handling, each with its own clear response message.

## `STAGING_BUCKET_NAME` is provisioned but never read

**Error:** No error — dead configuration.
**Where:** `analysis-infra`'s Cloud Run service definition sets `STAGING_BUCKET_NAME`, but no
code in this project reads it (confirmed: zero references anywhere in `src/`). The bucket to read
from is instead determined per-message from the Pub/Sub notification's `bucketId` attribute.
**Root cause:** Likely provisioned defensively or left over from an earlier design that read a
fixed bucket rather than one carried per-message.
**Decision:** Leave as-is. Removing a provisioned env var is a change to `analysis-infra`, not to
this project — noting it here rather than reopening that project's docs in this pass.
**If this ever needs to be fixed:** Remove `STAGING_BUCKET_NAME` from
`analysis-infra/src/staging-dataset/loader/service.ts`'s env list once confirmed nothing else
depends on it being present.
