# Known Issues

## Partial test coverage

**Error:** No error. This is an accepted test-coverage gap.

**Where:** `app/loadBatch.spec.ts` covers `loadJobId` and all three `loadBatch` paths (new job,
job already exists, retry after a failed job), including the log lines each writes.
`app/index.spec.ts` covers the `POST /load-jobs` route: a successful load, a schema read failure,
and a redelivered message. These are not covered:

- `readSchema`'s cache: that a second request for the same schema doesn't fetch it again
- the route's `BigQueryClientIOError` and `ParseError` failure responses
- `main.ts` wiring: the pino logger, OpenTelemetry export and the `LOGGING_LEVEL` default

**Root cause:** Coverage was added alongside the logging work, where behavior changed. The rest was
not prioritized.

**Decision:** Leave the remaining gap for now, and add coverage when the relevant code next
changes.

**If this ever needs to be fixed:** Follow the existing specs. Spy on a real `BigQuery` client with
`vi.spyOn`, stub storage with `InMemoryStorageReader.layer({...})`, and capture logs with an inline
test logger.

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
