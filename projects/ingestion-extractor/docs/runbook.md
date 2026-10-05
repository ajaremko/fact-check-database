# Extractor Runbook

Configuration reference, output contract, and diagnosing failures for `ingestion-extractor`. See the [README](../README.md) for what this service does and how it works.

## Configuration

All variables are `private` (internal configuration — nothing here is a secret or public-facing).

| Variable                              | Type                  | Required                            | Default                   | Purpose                                                                                         |
| ------------------------------------- | --------------------- | ----------------------------------- | ------------------------- | ----------------------------------------------------------------------------------------------- |
| `STORAGE_MODE`                        | `gcp` \| `filesystem` | No                                  | `gcp`                     | Selects the storage adapter (from `core-io`)                                                    |
| `STORAGE_OUTPUT_DIR`                  | string                | Only if `STORAGE_MODE=filesystem`   | —                         | Local directory read from and written to                                                        |
| `STORAGE_BUCKET_NAME`                 | string                | Only if `STORAGE_MODE=gcp`          | —                         | GCS bucket read from and written to                                                             |
| `MESSAGING_MODE`                      | `gcp` \| `filesystem` | No                                  | `gcp`                     | Selects the message-batch adapter (from `core-io`)                                              |
| `MESSAGE_QUEUE_INPUT_DIR`             | string                | Only if `MESSAGING_MODE=filesystem` | —                         | Local directory polled for queued notification files                                            |
| `PUBSUB_SUBSCRIPTION_ID`              | string                | Only if `MESSAGING_MODE=gcp`        | —                         | Pub/Sub subscription batches are pulled from                                                    |
| `MESSAGE_BATCH_SIZE`                  | number                | Only if `MESSAGING_MODE=gcp`        | —                         | Maximum messages per run, gathered over as many pulls as needed                                 |
| `MESSAGE_BATCH_PULL_TIMEOUT_MS`       | number (ms)           | No                                  | `10000`                   | Deadline for each pull after the first; how long a run waits to learn the subscription is empty |
| `LOGGING_MODE`                        | `gcp` \| `console`    | No                                  | `gcp`                     | Pretty console logger vs. Pino/Cloud Logging JSON                                               |
| `LOGGING_LEVEL`                       | Effect `LogLevel`     | No                                  | `info`                    | Minimum log level                                                                               |
| `OTEL_MODE`                           | `gcp` \| `local`      | No                                  | `gcp`                     | Cloud Trace/Monitoring exporters vs. local OTLP                                                 |
| `OTEL_SERVICE_NAME` or `SERVICE_NAME` | string                | Yes (one of the two)                | —                         | Service name attached to traces/metrics                                                         |
| `OTEL_METRIC_EXPORT_INTERVAL`         | integer (ms)          | No                                  | `60000`                   | How often metrics are exported                                                                  |
| `OTEL_CLOUD_MONITORING_PREFIX`        | string                | No, only used if `OTEL_MODE=gcp`    | `workload.googleapis.com` | Metric name prefix in Cloud Monitoring                                                          |
| `OTEL_EXPORTER_OTLP_ENDPOINT`         | string                | Only if `OTEL_MODE=local`           | —                         | Read directly by the OpenTelemetry OTLP exporter, not by this app's own `Config` calls          |
| `MAX_CONCURRENCY`                     | integer               | No                                  | `10`                      | Maximum observations processed in parallel                                                      |

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
v1/type=fact_checks/date={YYYY-MM-DD}/{extractorRunId}.batch.ndjson
```

The batch file holds one row per extracted fact-check. A row's `content` field is a short
plain-text preview of the article body: 500 characters, cut at a word boundary. It is kept for
research queries in BigQuery and is never sent to the website's search index. The full article
is deliberately not stored by the pipeline, because serving it would republish third-party
content. The feed body, article text included, remains only in the encrypted ingestion archive:
the raw body, and the sanitizer's rewritten copy when it wrote one.

Input decoding (the sanitizer's `SanitizerRecord` and the platform's `SourceConfig`) uses
`@fact-check-database/ingestion-contracts` instead — this project's _output_ contract and its _input_
contract come from two different shared packages, which is expected: the input is what the
sanitizer defines, the output is what the staging table (owned by `core-infra`/`analysis-infra`)
defines.

## Logging

This service's own code logs only at `info` and above. `trace` and `debug` belong to the shared
libraries it runs on, so `LOGGING_LEVEL` works as a dial for how deep to look.

### Levels this service uses

| Level   | Used for                                                                                                                                                                                                                                                                                                                                                                  |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `info`  | Startup: one `… mode selected` line per component (`mode.storage`, `mode.messaging`, `mode.otel`) and `Extractor job started`. Per message: `Observation skipped` (`skip.reason: not_extractable`) or `Fact checks extracted`. Per run: `Dropped duplicate fact check rows`, `Batch written` or `No batch written`, then `Extractor job completed` when no message failed |
| `warn`  | `Extraction failed`: the feed couldn't be parsed. `Observation skipped` with `skip.reason: no_body_pointer`. `Message redelivered`. `Extractor job completed` when some messages failed                                                                                                                                                                                   |
| `error` | `Message processing failed`: one line per message whose record couldn't be read or decoded, with `error._tag` and the failure attached as the log's cause                                                                                                                                                                                                                 |
| `fatal` | `Extractor job stopped`: the run is exiting non-zero, e.g. because the batch write failed or config is missing. `Extractor failed to start` only if the logger itself couldn't be configured                                                                                                                                                                              |

### What happens to each message

| Outcome                                                     | Acknowledged? | Meaning                                                                                        |
| ----------------------------------------------------------- | ------------- | ---------------------------------------------------------------------------------------------- |
| `Fact checks extracted` or `Observation skipped`            | Yes           | Processed; its rows, if any, are in this run's batch                                           |
| `Extraction failed`                                         | Yes           | Dropped: a feed that can't be parsed won't parse on a retry either                             |
| `Message processing failed`                                 | No            | Redelivered to a later run, and dead-lettered after the subscription's limit                   |
| Any message, when the run ends with `Extractor job stopped` | No            | Nothing is acknowledged, so a failed batch write loses no rows. The whole batch is redelivered |

Messages are acknowledged together, in one Pub/Sub call, when the run ends successfully, after the
batch is written.

### Choosing `LOGGING_LEVEL`

| Level   | What you see                                                                                                                                              | Use it when                                                                               |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `info`  | This service's own lines above: one outcome line per message, bracketed by the job's start and completion                                                 | Normal operation (the default)                                                            |
| `debug` | Adds the libraries' unexpected conditions: every failed SDK call with `module`, `error._tag` and `cause.code`, and a batch released without acknowledging | A message or the batch write fails and you need to know which storage call failed and how |
| `trace` | Adds every library step: the pull, each file read and written, the acknowledge                                                                            | Something hangs or behaves oddly and you need the exact call sequence                     |

The library levels are documented in the [core-io](../../core-io/README.md#logging) and
[core-vendor](../../core-vendor/README.md#logging) READMEs.

### Annotations

| Key                                                                                                | Set on                                                    |
| -------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `job.runId`, `job.concurrency`, `job.startedAt`                                                    | Every line in the run, including library lines            |
| `message.messageId`, `message.deliveryAttempt`, `subscriptionId`, `ackId`                          | Every line for a message (carried from the batch adapter) |
| `input.bucket`, `input.object`                                                                     | Every line for a message: the sanitizer record being read |
| `source.id`, `source.name`, `source.url`, `source.collection`, `extractor.id`, `extractor.version` | A message's lines once its record is decoded              |
| `skip.reason`                                                                                      | `Observation skipped`                                     |
| `batch.type`, `batch.rows`                                                                         | `Batch written`                                           |
| `error._tag`                                                                                       | `Message processing failed`                               |

### Dashboard events

Four lines carry an `event` payload from `ingestion-contracts`' `logging/v1`, which the
`ingestion-infra` data-extraction dashboard queries. Their names, fields and levels are a
contract:

| `event`                   | Logged on                                                       | Dashboard dependency                                                                              |
| ------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `extraction_succeeded`    | `Fact checks extracted`                                         | Filtered on `severity = 'INFO'`; reads `count`, `source.*`, `extractor.*`, `job.runId`            |
| `extraction_failed`       | `Extraction failed`                                             | Filtered on `severity = 'WARNING'`; reads `type`, `error`, `source.*`, `extractor.*`, `job.runId` |
| `batch_written`           | `Batch written`                                                 | Filtered on `severity = 'INFO'`; reads `batch.rows`, `batch.format`, `batch.path`                 |
| `extractor_job_completed` | `Extractor job completed` (info, or warning if messages failed) | No severity filter; reads `job.tasks`, `job.failures`, `job.rowsExtracted`                        |

`extraction_failed`'s `error` is a short summary of the first field that failed to decode (for
example `Missing at rss`), never the raw parse error, which can embed large parts of the feed.
Each event is attached to its one line only, never as a scoped annotation, so the dashboard
counts it once.

### A monitoring note

`Extraction failed` and `Observation skipped` both count as a successful message at the job level:
the message was handled and acknowledged, with no rows. `job.failures` counts only messages
whose record couldn't be read or decoded. To tell a run that extracted nothing because there was
nothing to extract from one where every feed failed to parse, look at the `Extraction failed`
warnings (or the dashboard's Extraction Errors panel), not the job-completed counts.

## Diagnosing failures

### A specific observation is skipped or fails

**Steps:**

1. Filter by `input.object` or `source.id` to find that message's outcome line:
   - `Observation skipped` with `skip.reason: not_extractable`: the record was quarantined, has
     no content or HTTP data, or isn't marked for extraction. Expected for quarantined sources.
   - `Observation skipped` with `skip.reason: no_body_pointer`: the record has neither a
     sanitized nor a raw body pointer, so there is nothing to read.
   - `Extraction failed`: the feed couldn't be parsed. Its `error` names the first failing field.
     The feed's XML likely doesn't match the RSS/Atom shape the selected extractor expects, so
     check the source's `collection` value against the feed's actual format.
   - `Message processing failed`: the sanitizer record couldn't be read (`StorageReadError`) or
     decoded (`ParseError`). The message is redelivered to a later run.
2. A `ParseError` decoding the sanitizer record itself (as opposed to the feed inside it) means
   the sanitizer's output no longer matches `ObservationSchema`. Check for a contract change
   upstream.
3. To see which storage call failed and with what status code, rerun with
   `LOGGING_LEVEL=debug` and filter on the same `input.object`.

### The whole run fails

**Symptom:** a fatal `Extractor job stopped`, and the process exits non-zero.

**Steps:**

1. Read the fatal line's cause. A `StorageWriteError` means writing the batch failed: check
   `STORAGE_BUCKET_NAME`/`STORAGE_OUTPUT_DIR` and the service account's permissions.
2. No message was acknowledged, so the next run receives the same batch again, logged as
   `Message redelivered`. No rows are lost.

### The run is killed without a fatal line (out of memory)

**Symptom:** the execution fails with `Container terminated on signal 11`, preceded by a
plain-text `FATAL ERROR: … JavaScript heap out of memory`. There is no `Extractor job stopped`
line, because the process dies before it can log one.

**Cause:** the extractor holds every row until the batch is written, and at that point also holds
the serialized batch. Node caps its heap at about half the container's memory, so the limit that
matters is half of the job's `memory` setting. A 1,000-message batch (about 17,000 rows, 56 MB of
NDJSON) measured about 370 MB of heap, which fits the job's 1 GiB (a 512 MB heap) but not Cloud
Run's default 512 MiB.

**Steps:**

1. Check the job's `memory` limit and `MESSAGE_BATCH_SIZE` in `ingestion-infra`. Raise them
   together: memory use grows with the number of rows in a batch.
2. Nothing was acknowledged, so the batch is redelivered. Each crashed run raises its messages'
   delivery attempt, and the subscription dead-letters them at 5, so fix the cause before
   re-running the job.

Rows are copied when they leave the extraction step (`detachFromFeed` in
`src/app/extractFactChecks.ts`) so they don't keep their source feed in memory. Without that copy
each message retains its whole feed, about 0.8 MB, and a batch needs several times more memory.

## Checking output locally

```bash
ls "$STORAGE_OUTPUT_DIR"
```

See [docs/known-issues.md](./known-issues.md) for this project's current accepted gaps.
