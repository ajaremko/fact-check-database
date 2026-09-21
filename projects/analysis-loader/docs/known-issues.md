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
