# Extractor Runbook

Configuration reference, output contract, and diagnosing failures for `ingestion-extractor`. See the [README](../README.md) for what this service does and how it works.

## Configuration

All variables are `private` (internal configuration — nothing here is a secret or public-facing).

| Variable                              | Type                  | Required                            | Default                   | Purpose                                                                                |
| ------------------------------------- | --------------------- | ----------------------------------- | ------------------------- | -------------------------------------------------------------------------------------- |
| `STORAGE_MODE`                        | `gcp` \| `filesystem` | No                                  | `gcp`                     | Selects the storage adapter (from `core-io`)                                           |
| `STORAGE_OUTPUT_DIR`                  | string                | Only if `STORAGE_MODE=filesystem`   | —                         | Local directory read from and written to                                               |
| `STORAGE_BUCKET_NAME`                 | string                | Only if `STORAGE_MODE=gcp`          | —                         | GCS bucket read from and written to                                                    |
| `MESSAGING_MODE`                      | `gcp` \| `filesystem` | No                                  | `gcp`                     | Selects the message-batch adapter (from `core-io`)                                     |
| `MESSAGE_QUEUE_INPUT_DIR`             | string                | Only if `MESSAGING_MODE=filesystem` | —                         | Local directory polled for queued notification files                                   |
| `PUBSUB_SUBSCRIPTION_ID`              | string                | Only if `MESSAGING_MODE=gcp`        | —                         | Pub/Sub subscription batches are pulled from                                           |
| `MESSAGE_BATCH_SIZE`                  | number                | Only if `MESSAGING_MODE=gcp`        | —                         | Maximum messages pulled per batch                                                      |
| `LOGGING_MODE`                        | `gcp` \| `console`    | No                                  | `gcp`                     | Pretty console logger vs. Pino/Cloud Logging JSON                                      |
| `LOGGING_LEVEL`                       | Effect `LogLevel`     | No                                  | `info`                    | Minimum log level                                                                      |
| `OTEL_MODE`                           | `gcp` \| `local`      | No                                  | `gcp`                     | Cloud Trace/Monitoring exporters vs. local OTLP                                        |
| `OTEL_SERVICE_NAME` or `SERVICE_NAME` | string                | Yes (one of the two)                | —                         | Service name attached to traces/metrics                                                |
| `OTEL_METRIC_EXPORT_INTERVAL`         | integer (ms)          | No                                  | `60000`                   | How often metrics are exported                                                         |
| `OTEL_CLOUD_MONITORING_PREFIX`        | string                | No, only used if `OTEL_MODE=gcp`    | `workload.googleapis.com` | Metric name prefix in Cloud Monitoring                                                 |
| `OTEL_EXPORTER_OTLP_ENDPOINT`         | string                | Only if `OTEL_MODE=local`           | —                         | Read directly by the OpenTelemetry OTLP exporter, not by this app's own `Config` calls |
| `MAX_CONCURRENCY`                     | integer               | No                                  | `10`                      | Maximum observations processed in parallel                                             |

`LOG_LEVEL` is **not** a real variable — nothing reads it. The real variable is `LOGGING_LEVEL`.
`FACT_CHECKS_TABLE_SCHEMA_PATH` and `BIGQUERY_DATASET`, if you see them in an old `.env`, are also
dead — nothing in this project reads either.

## Mode matrix

| Variable         | `filesystem`                                                      | `gcp` (default)                                                       |
| ---------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------- |
| `STORAGE_MODE`   | `core-io`'s `FileSystemStorageReader` + `FileSystemStorageWriter` | `core-io`'s `CloudStorageStorageReader` + `CloudStorageStorageWriter` |
| `MESSAGING_MODE` | `core-io`'s `FileSystemMessageBatch`                              | `core-io`'s `CloudPubsubMessageBatch`                                 |

See `core-io`'s own README for what each adapter does. There is no `Publisher` wired at all in
this service today — see [docs/known-issues.md](./known-issues.md).

## Output contract

Every batch is written as NDJSON via `core-contracts`'s `staging/v1` contracts — see
[core-contracts](../../core-contracts/README.md) for the canonical `FactChecksTableRowSchema`
field reference. In short, the real paths are:

```
v1/type=fact_checks/date={YYYY-MM-DD}/{extractionId}.batch.ndjson
v1/type=fact_checks_content/sha256={hash}.md
```

The batch file holds one row per extracted fact-check; a row's `content` field is a bounded
plain-text preview (500 characters, truncated at a word boundary), not the full Markdown — the
full content lives in the separate, content-addressed blob object, written once per fact-check
that has content and shared across re-fetches with identical content (same `sha256`, same blob).

Input decoding (the sanitizer's `SanitizerRecord` and the platform's `SourceConfig`) uses
`@news-research/ingestion-contracts` instead — this project's _output_ contract and its _input_
contract come from two different shared packages, which is expected: the input is what the
sanitizer defines, the output is what the staging table (owned by `core-infra`/`analysis-infra`)
defines.

## Logging

This service's own code uses three levels, never `trace` or `error`:

| Level     | Used for                                                                                                                                                                                    |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `debug`   | Startup mode selection, and per-run progress (`Processing {n} messages`, `Processed {k} of {n} messages`)                                                                                   |
| `info`    | Job start, `Skipping extraction for observation`, `Extracting fact checks for observation...`, and — notably — `Extraction failed`, despite the name, logs at `info`, not `warning`/`error` |
| `warning` | No fact checks extracted for the whole run; no pointer available for an observation (also skipped)                                                                                          |

`core-io` (which every storage/messaging call in this app goes through) separately logs at
`trace`/`warning` only, and `core-data` logs nothing — see each package's own README.

### A monitoring gap worth knowing about

A skipped observation and an observation whose extraction step throws are **both** recorded as
"succeeded, 0 rows" at the job level — `extractFactChecks`' own errors are caught locally and
turned into an empty result before they ever reach the per-message `Effect.all(..., {mode:
'either'})`. Only a failure reading or decoding the observation itself (before the extractor
runs) counts as a genuine job-level failure. There's also no dedicated skip/failure `Metric` —
`extracted_fact_check_rows` and `extracted_batches_written` only increment on the successful
path. **A run that skips or silently fails every observation looks identical, by metrics alone,
to a healthy run that extracted nothing because there was nothing to extract.** Distinguishing
them requires reading the per-item `info`/`warning` log lines, not just the job-completion metric.

## Diagnosing failures

### A specific observation is skipped or fails

**Steps:**

1. Find that observation's log line: `Skipping extraction for observation` (no content/http, or
   `shouldExtract: false`), `No pointer available for observation, skipping extraction` (no
   sanitized or raw body to read), or `Extraction failed` (the extractor itself threw — check the
   annotated cause).
2. If the cause is a `ParseError` from `decodeFeedXml`, the feed's XML likely doesn't match the
   RSS/Atom shape the selected extractor expects — check the source's `collection` value against
   the feed's actual format.
3. None of these fail the run — see "A monitoring gap worth knowing about" above for why metrics
   alone won't show this.

### The whole run fails

**Steps:**

1. Look for a `StorageReadError` (reading the observation record failed — check
   `STORAGE_BUCKET_NAME`/`STORAGE_OUTPUT_DIR` and service-account permissions) or
   `StorageWriteError` (writing the batch or a content blob failed) in the logged cause.
2. A `ParseError` decoding the observation record itself (as opposed to the feed XML inside it)
   means the sanitizer's output no longer matches `ObservationSchema` — check for a contract
   change upstream.

## Checking output locally

```bash
ls "$STORAGE_OUTPUT_DIR"
```

See [docs/known-issues.md](./known-issues.md) for this project's current accepted gaps.
