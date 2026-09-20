# Analysis Loader Runbook

Configuration reference and diagnosing failures for `analysis-loader`. See the
[README](../README.md) for what this service does and how it works.

## Configuration

All variables are `private` (internal configuration — nothing here is a secret or public-facing).
Unlike the ingestion-domain services, there are no `*_MODE` variables — this service always uses
its GCP adapters, with no dev-mode alternative.

| Variable | Type | Required | Default | Purpose |
| --- | --- | --- | --- | --- |
| `PROJECT_ID` | string | Yes | — | GCP project the BigQuery load job runs in |
| `BIGQUERY_DATASET` | string | Yes | — | Destination dataset |
| `BIGQUERY_TABLE` | string | Yes | — | Destination table |
| `PORT` | number | Yes | — | Port the HTTP push endpoint listens on. Cloud Run injects this automatically; `analysis-infra` doesn't set it explicitly |
| `LOGGING_LEVEL` | Effect `LogLevel` | No | `info` | Minimum log level |
| `OTEL_SERVICE_NAME` or `SERVICE_NAME` | string | Yes (one of the two) | — | Service name attached to traces/metrics |
| `OTEL_METRIC_EXPORT_INTERVAL` | integer (ms) | No | `60000` | How often metrics are exported |
| `OTEL_CLOUD_MONITORING_PREFIX` | string | No | `workload.googleapis.com` | Metric name prefix in Cloud Monitoring — `analysis-infra` overrides this |

`analysis-infra` also sets two env vars this service doesn't explicitly read:

- `STAGING_BUCKET_NAME` — genuinely unused. The bucket to read from is determined per-message
  from the Pub/Sub notification's `bucketId` attribute instead, not from a fixed env var.
- `GOOGLE_CLOUD_PROJECT` — not read via this service's own `Config` calls, but a conventional env
  var the underlying `@google-cloud/*` client libraries check themselves for default project
  resolution, so this is plausibly intentional rather than dead.

## Logging

The simplest logging profile of any service in this pipeline — two levels, nothing else:

| Level | Used for |
| --- | --- |
| `info` | One line, at the start of each BigQuery load (`Loading data from GCS object into BigQuery table`) |
| `error` | The full failure cause, dumped via `Effect.tapErrorCause(Effect.logError)` — once around the HTTP route handler, once around the top-level app |

No `debug`, `warning`, or `trace` calls exist anywhere in this service's own code. `core-io`
(`StorageReader`) and `core-vendor` (`BigQueryClient`, `StorageClient`) each separately log at
`trace` only, at construction time — see their own READMEs. `core-data` logs nothing.

## Diagnosing failures

### The load job fails

**Symptom:** a `500` response with the message "Something went wrong submitting the batch load
job" — this is the one error path this service handles explicitly, catching
`BigQueryClientIOError`.
**Steps:**
1. Check the BigQuery job's own error details (Cloud Console → BigQuery → Job history) — common
   causes are a schema mismatch between the fetched schema and the actual NDJSON rows, or the
   service account lacking `bigquery.dataEditor`/`bigquery.jobUser`.
2. Confirm the GCS object referenced by the Pub/Sub message's `objectId` attribute still exists —
   if the extractor's write failed or the object was since deleted, the load job has nothing to
   read.

### A push message fails with no clear error message

**Symptom:** an error response that isn't the friendly BigQuery-specific one above.
**Cause:** this is one of the two error paths that aren't explicitly handled —
`StorageReadError` (fetching the table schema from GCS failed) or a schema `ParseError` (the push
message itself, or the fetched schema JSON, didn't decode) — both only get logged via
`Effect.tapErrorCause(Effect.logError)`, not a tailored response. See
[docs/known-issues.md](./known-issues.md).
**Steps:**
1. Check the logged cause for which of the two it was.
2. For a `StorageReadError`: confirm the service account has `storage.objects.get` on the bucket
   named in `bucketId`, and that `schemaObjectId` still points at a real object (it should be
   `schemas/fact_checks_table_schema_v1.json` in core-infra's staging bucket).
3. For a schema `ParseError`: confirm the Pub/Sub push subscription's payload format and
   `analysis-infra`'s subscription config haven't drifted from what this service expects (a GCS
   object-finalized notification's attributes, not its full JSON body).

### Messages are being redelivered repeatedly

**Symptom:** the same batch keeps triggering `POST /load-jobs` again.
**Cause:** any non-2xx response nacks the Pub/Sub message, and `analysis-infra`'s subscription
retries up to 5 times before routing to its dead-letter topic.
**Steps:** fix the underlying cause (see above), or, if the batch itself is unrecoverable, let it
exhaust its delivery attempts and inspect it in the dead-letter bucket rather than letting it
retry indefinitely.

See [docs/known-issues.md](./known-issues.md) for this project's current accepted gaps.
