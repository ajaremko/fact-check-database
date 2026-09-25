# Analysis Loader Runbook

Configuration reference and diagnosing failures for `analysis-loader`. See the
[README](../README.md) for what this service does and how it works.

## Configuration

All variables are `private` (internal configuration — nothing here is a secret or public-facing).
Unlike the ingestion-domain services, there are no `*_MODE` variables — this service always uses
its GCP adapters, with no dev-mode alternative.

| Variable                              | Type              | Required             | Default                   | Purpose                                                                                                                  |
| ------------------------------------- | ----------------- | -------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `PROJECT_ID`                          | string            | Yes                  | —                         | GCP project the BigQuery load job runs in                                                                                |
| `BIGQUERY_DATASET`                    | string            | Yes                  | —                         | Destination dataset                                                                                                      |
| `BIGQUERY_TABLE`                      | string            | Yes                  | —                         | Destination table                                                                                                        |
| `PORT`                                | number            | Yes                  | —                         | Port the HTTP push endpoint listens on. Cloud Run injects this automatically; `analysis-infra` doesn't set it explicitly |
| `LOGGING_LEVEL`                       | Effect `LogLevel` | No                   | `info`                    | Minimum log level                                                                                                        |
| `OTEL_SERVICE_NAME` or `SERVICE_NAME` | string            | Yes (one of the two) | —                         | Service name attached to traces/metrics                                                                                  |
| `OTEL_METRIC_EXPORT_INTERVAL`         | integer (ms)      | No                   | `60000`                   | How often metrics are exported                                                                                           |
| `OTEL_CLOUD_MONITORING_PREFIX`        | string            | No                   | `workload.googleapis.com` | Metric name prefix in Cloud Monitoring — `analysis-infra` overrides this                                                 |

`analysis-infra` also sets `GOOGLE_CLOUD_PROJECT`, which this service doesn't read via its own
`Config` calls — but it's a conventional env var the underlying `@google-cloud/*` client libraries
check themselves for default project resolution, so this is plausibly intentional rather than
dead.

## Logging

The service's own code logs only at `info` and above. `trace` and `debug` belong to the shared
libraries it runs on, so `LOGGING_LEVEL` works as a dial for how deep to look.

### Levels this service uses

| Level   | Used for                                                                                                                                                                                                                                                        |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `info`  | The normal life of each request: `Load request received`, `Batch schema read` (only when the schema is actually fetched, not on a cache hit), `Load job created` or `Load job already exists for this batch, awaiting it`, `Load job completed`, `Batch loaded` |
| `warn`  | Recoverable but notable: `Message redelivered` (Pub/Sub's delivery attempt is above 1), `Previous load job for this batch failed, retrying`                                                                                                                     |
| `error` | `Load request failed`, logged exactly once per failed request, with the failure attached as the log's cause so Cloud Error Reporting groups it. The service responds `500`                                                                                      |
| `fatal` | `Server stopped`: the HTTP server itself failed (missing configuration, the port could not be bound) and the process is exiting                                                                                                                                 |

### Choosing `LOGGING_LEVEL`

| Level   | What you see                                                                                                                                                                                 | Use it when                                                           |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `info`  | This service's own lines above: one short story per batch                                                                                                                                    | Normal operation (the default)                                        |
| `debug` | Adds the libraries' unexpected conditions: every failed SDK call, with `module`, `error._tag` and the SDK status code as `cause.code` (e.g. BigQuery's `409` when a load job already exists) | A request fails and you need to know which SDK call failed and how    |
| `trace` | Adds every library step: clients created, files read, jobs created and awaited                                                                                                               | Something hangs or behaves oddly and you need the exact call sequence |

The library levels are documented in the [core-io](../../core-io/README.md#logging) and
[core-vendor](../../core-vendor/README.md#logging) READMEs.

### Request annotations

Every line logged while a request runs carries these annotations, including the libraries'
`debug`/`trace` lines, so one batch's lines can be filtered together:

| Key                                                | Value                                                                    |
| -------------------------------------------------- | ------------------------------------------------------------------------ |
| `message.messageId`                                | The Pub/Sub message id; the same across redeliveries                     |
| `message.deliveryAttempt`                          | Which delivery this is, starting at 1 (set only when Pub/Sub sends it)   |
| `subscription`                                     | The push subscription's full resource name                               |
| `batch.bucket`, `batch.object`, `batch.generation` | The staged batch object being loaded                                     |
| `batch.datasetId`, `batch.tableId`                 | The destination table                                                    |
| `schema.object`                                    | The table schema object read from storage                                |
| `job.id`, `job.retryId`                            | The deterministic load job id, and the retry id if a previous job failed |
| `loadRequest_ms`                                   | Time since the request started                                           |

A failed request's error line also carries `error._tag` and `response.status`.

## Diagnosing failures

### A batch fails to load

All three failure sources the route can hit are caught explicitly, each with its own `500`
message:

| Message                                                      | Cause                                                                                      | Steps                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| "Something went wrong submitting the batch load job"         | `BigQueryClientIOError` — the load job itself failed                                       | Check the BigQuery job's own error details (Cloud Console → BigQuery → Job history) — common causes are a schema mismatch between the fetched schema and the actual NDJSON rows, or the service account lacking `bigquery.dataEditor`/`bigquery.jobUser`                                                                                                                                                                                         |
| "Something went wrong reading the batch schema from storage" | `StorageReadError` — fetching the table schema from GCS failed                             | Confirm the service account has `storage.objects.get` on the bucket named in `bucketId`, and that `schemaObjectId` still points at a real object (it should be `schemas/fact_checks_table_schema_v1.json` in core-infra's staging bucket). Also confirm the GCS object referenced by the Pub/Sub message's `objectId` attribute still exists — if the extractor's write failed or the object was since deleted, the load job has nothing to read |
| "Something went wrong decoding the batch or schema"          | A schema `ParseError` — the push message itself, or the fetched schema JSON, didn't decode | Confirm the Pub/Sub push subscription's payload format and `analysis-infra`'s subscription config haven't drifted from what this service expects (a GCS object-finalized notification's attributes, not its full JSON body)                                                                                                                                                                                                                      |

Filter on `Load request failed`: its `error._tag` says which of the three happened, and its cause
carries the full error. To see which SDK call failed and with what status code, raise
`LOGGING_LEVEL` to `debug` and look for lines with the same `message.messageId`.

### Messages are being redelivered repeatedly

**Symptom:** the same batch keeps triggering `POST /load-jobs` again. Each redelivery logs a
`Message redelivered` warning with its `message.deliveryAttempt`.
**Cause:** any non-2xx response nacks the Pub/Sub message, and `analysis-infra`'s subscription
retries up to 5 times before routing to its dead-letter topic.
**Steps:** fix the underlying cause (see above), or, if the batch itself is unrecoverable, let it
exhaust its delivery attempts and inspect it in the dead-letter bucket rather than letting it
retry indefinitely.

Redeliveries (and replays from the dead-letter bucket) don't duplicate staging rows: each batch
object version maps to one deterministic load job id (`load_<hash>`), so a batch that already
loaded logs "Load job already exists for this batch, awaiting it" and returns success without a
second append. To deliberately load a batch again, re-upload the object — a new generation gets a
new job id.

See [docs/known-issues.md](./known-issues.md) for this project's current accepted gaps.
