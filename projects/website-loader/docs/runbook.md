# Search Loader Runbook

Configuration reference and diagnosing failures for `website-loader`. See the
[README](../README.md) for what this service does and how it works.

## Configuration

All variables are `private` (internal configuration — nothing here is a secret or public-facing).
Like `analysis-loader`, there are no `*_MODE` variables — this service always uses its GCP
adapters, with no dev-mode alternative.

| Variable                              | Type              | Required             | Default                   | Purpose                                                                                                                 |
| ------------------------------------- | ----------------- | -------------------- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `ALGOLIA_API_KEY`                     | string            | Yes                  | —                         | Algolia API key used to save objects                                                                                    |
| `ALGOLIA_APP_ID`                      | string            | Yes                  | —                         | Algolia application ID                                                                                                  |
| `ALGOLIA_INDEX_NAME`                  | string            | Yes                  | —                         | Destination index                                                                                                       |
| `PORT`                                | number            | Yes                  | —                         | Port the HTTP push endpoint listens on. Cloud Run injects this automatically; `website-infra` doesn't set it explicitly |
| `LOGGING_LEVEL`                       | Effect `LogLevel` | No                   | `info`                    | Minimum log level                                                                                                       |
| `OTEL_SERVICE_NAME` or `SERVICE_NAME` | string            | Yes (one of the two) | —                         | Service name attached to traces/metrics                                                                                 |
| `OTEL_METRIC_EXPORT_INTERVAL`         | integer (ms)      | No                   | `60000`                   | How often metrics are exported                                                                                          |
| `OTEL_CLOUD_MONITORING_PREFIX`        | string            | No                   | `workload.googleapis.com` | Metric name prefix in Cloud Monitoring — `website-infra` overrides this                                                 |

The Algolia client's transformation region is hardcoded to `us` in `main.ts`
(`transformationOptions: Config.succeed({ region: 'us' })`) — not configurable via environment
variable.

`website-infra` also sets `GOOGLE_CLOUD_PROJECT`, which this service doesn't read via its own
`Config` calls — but it's a conventional env var the underlying `@google-cloud/*` client libraries
check themselves for default project resolution, so this is plausibly intentional rather than
dead.

## Logging

The simplest logging profile of any service in this pipeline — two levels, nothing else:

| Level   | Used for                                                                                                      |
| ------- | ------------------------------------------------------------------------------------------------------------- |
| `info`  | Logged by `HttpMiddleware.logger` for each request; no other explicit `info` calls in this service's own code |
| `error` | The full failure cause, dumped via `Effect.tapErrorCause(Effect.logError)` around the route handler           |

`core-io` (`StorageReader`) and `core-vendor` (`AlgoliaSearchClient`) each separately log at
`trace` only, at construction time — see their own READMEs. `core-data` logs nothing.

## Diagnosing failures

### A batch fails to load

All three failure sources the route can hit are caught explicitly, each with its own `500`
message:

| Message                                               | Cause                                                                                 | Steps                                                                                                                                                                                                                                                                             |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "Something went wrong submitting the batch load job"  | `AlgoliaSearchClientIOError` — the Algolia save call itself failed                    | Check the Algolia dashboard for the index named by `ALGOLIA_INDEX_NAME` — common causes are an API key that lacks write access to that index, or a request that exceeds Algolia's record size limits                                                                              |
| "Something went wrong reading the batch from storage" | `StorageReadError` — reading the batch from GCS failed                                | Confirm the service account has `storage.objects.get` on the bucket named in `bucketId`, and that the GCS object referenced by the Pub/Sub message's `objectId` attribute still exists — if the extractor's write failed or the object was since deleted, there's nothing to read |
| "Something went wrong decoding the batch"             | A schema `ParseError` — the push message itself, or a row in the batch, didn't decode | Confirm the batch's rows still match `FactChecksTableRowSchema` — a change to that shared schema upstream, or a malformed row from the extractor, would show up here                                                                                                              |

Check the logged cause (`Effect.tapErrorCause(Effect.logError)`) to see which of the three
actually happened, and the full underlying error detail.

### Messages are being redelivered repeatedly

**Symptom:** the same batch keeps triggering `POST /load-jobs` again.
**Cause:** any non-2xx response nacks the Pub/Sub message, and the subscription retries up to 5
times before routing to its dead-letter topic.
**Steps:** fix the underlying cause (see above), or, if the batch itself is unrecoverable, let it
exhaust its delivery attempts and inspect it in the dead-letter bucket rather than letting it
retry indefinitely.

See [docs/known-issues.md](./known-issues.md) for this project's current accepted gaps.
