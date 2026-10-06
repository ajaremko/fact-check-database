# Known Issues

## Partial test coverage

**Error:** No error. This is an accepted test-coverage gap.

**Where:** `app/loadBatch.spec.ts` covers `loadJobId` and all three `loadBatch` paths (new job,
job already exists, retry after a failed job), including the log lines each writes.
`app/index.spec.ts` covers the `POST /load-jobs` route: a successful load, a schema read failure,
and a redelivered message. `app/readSchema.spec.ts` covers the schema cache: one fetch per schema,
and a failed read retried on the next request. These are not covered:

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

## Load jobs pass both an explicit schema and `autodetect`

**Error:** No error. An unclear setting.

**Where:** `src/app/loadBatch.ts`, which sets `schema` and `autodetect: true` on the same load job.

**Root cause:** The reason for setting both is not recorded. The explicit schema, read from the staging bucket, is the one that should apply. With autodetection also on, it is not clear which wins for a field the schema does not list, so a batch that does not match the schema may load where it should fail.

**Decision:** Not yet addressed. Tracked in [docs/todo.md](../../../docs/todo.md).

**If this ever needs to be fixed:** Load a batch with an extra field and one with a wrong type, with `autodetect` on and off, and keep whichever setting rejects both. Record the reason next to the setting.
