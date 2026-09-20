# Ingestor Runbook

Configuration reference, operational reference, and diagnosing failures for `ingestion-ingestor`. See the [README](../README.md) for what this service does and how it works.

## Configuration

All variables are `private` (internal configuration — nothing here is a secret or public-facing).

| Variable | Type | Required | Default | Purpose |
| --- | --- | --- | --- | --- |
| `SOURCE_LIST_MODE` | `gcp` \| `filesystem` | No | `gcp` | Selects the target-list adapter |
| `TARGET_LIST_PATH` | string | Only if `SOURCE_LIST_MODE=filesystem` | — | Path to the target list CSV |
| `TARGET_LIST_BUCKET_NAME` | string | Only if `SOURCE_LIST_MODE=gcp` | — | GCS bucket containing the target list CSV |
| `TARGET_LIST_URI` | string | Only if `SOURCE_LIST_MODE=gcp` | — | Object path within `TARGET_LIST_BUCKET_NAME` |
| `STORAGE_MODE` | `gcp` \| `filesystem` | No | `gcp` | Selects the archive-storage adapter (from `core-io`) |
| `STORAGE_OUTPUT_DIR` | string | Only if `STORAGE_MODE=filesystem` | — | Local directory archived bodies and records are written to |
| `STORAGE_BUCKET_NAME` | string | Only if `STORAGE_MODE=gcp` | — | GCS bucket archived bodies and records are written to |
| `MESSAGING_MODE` | `gcp` \| `filesystem` | No | `gcp` | Selects the notification adapter (from `core-io`) |
| `PUBLISHER_OUTPUT_DIR` | string | Only if `MESSAGING_MODE=filesystem` | — | Local directory the simulated notification is written to |
| `PUBSUB_TOPIC_NAME` | string | Only if `MESSAGING_MODE=gcp` | — | Pub/Sub topic backing the (effectively unused in prod — see below) `Publisher` layer |
| `LOGGING_MODE` | `gcp` \| `console` | No | `gcp` | Pretty console logger vs. Pino/Cloud Logging JSON |
| `LOGGING_LEVEL` | Effect `LogLevel` | No | `info` | Minimum log level |
| `OTEL_MODE` | `gcp` \| `local` | No | `gcp` | Cloud Trace/Monitoring exporters vs. local OTLP |
| `OTEL_SERVICE_NAME` or `SERVICE_NAME` | string | Yes (one of the two) | — | Service name attached to traces/metrics |
| `OTEL_METRIC_EXPORT_INTERVAL` | integer (ms) | No | `60000` | How often metrics are exported |
| `OTEL_SHUTDOWN_TIMEOUT` | integer (ms) | No | `15000` | Grace period for exporters to flush on shutdown |
| `OTEL_CLOUD_MONITORING_PREFIX` | string | No, only used if `OTEL_MODE=gcp` | `workload.googleapis.com` | Metric name prefix in Cloud Monitoring |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | string | Only if `OTEL_MODE=local` | — | Read directly by the OpenTelemetry OTLP exporter (not by this app's own `Config` calls) |
| `MAX_CONCURRENCY` | integer | No | `10` | Maximum targets fetched in parallel |
| `SUCCESS_THRESHOLD` | number 0–1 | No | `0.8` | Minimum fraction of targets that must succeed |

`LOG_LEVEL` is **not** a real variable — nothing in this project reads it. If you see it in an old `.env`, it's dead; the real variable is `LOGGING_LEVEL`.

## Mode matrix

| Variable | `filesystem` | `gcp` (default) |
| --- | --- | --- |
| `SOURCE_LIST_MODE` | this project's own `FileSystemSourceList` | this project's own `CloudStorageSourceList` |
| `STORAGE_MODE` | `core-io`'s `FileSystemStorageWriterWithNotification` | `core-io`'s `CloudStorageStorageWriter` |
| `MESSAGING_MODE` | `core-io`'s `FileSystemPublisher` | `core-io`'s `CloudPubsubPublisher` |

The target-list adapters are local to this project; storage and messaging come from `@news-research/core-io` — see that package's own README for what each adapter does. `CloudStorageStorageWriter` never calls a `Publisher` itself (see "How the hand-off to the sanitizer works" in the README) — the `MESSAGING_MODE=gcp` layer exists so `FileSystemStorageWriterWithNotification` has a `Publisher` to use in dev; in production it's provided but not exercised by this app's own code.

## Target list format

A CSV file with a required header row and four columns:

| Column | Description |
| --- | --- |
| `id` | Stable identifier for the source. Used in the archive path — changing it breaks path continuity for that source's history. |
| `name` | Human-readable name, used in log annotations and metric tags. |
| `collection` | Must be exactly `atom` or `rss` — the feed format `ingestion-extractor` uses to parse this source's output later in the pipeline. |
| `url` | The URL to fetch. |

Adding a source means appending a row and redeploying (or waiting for the next scheduled run) — no code change needed. Removing a source means deleting its row; historical records remain in the archive. Rows with unreachable URLs aren't removed automatically — fetch failures are archived as `outcome: 'no_response'` records (see below).

## Archive contract

Every fetch attempt is archived as an `IngestionRecord` — see [ingestion-contracts](../../ingestion-contracts/README.md) for the canonical schema. In short: `version: 1`, `kind: 'fetch_attempt'`, `outcome: 'data_fetched' | 'no_response'`.

Objects are written under two path templates (built by `ingestion-contracts`'s `ArchivePathSchema`, not hand-assembled here):

```
v1/records/ingestion/source={sourceId}/date={YYYY-MM-DD}/ingestion_id={ingestionId}/{observationId}.yml
v1/raw/source={sourceId}/date={YYYY-MM-DD}/ingestion_id={ingestionId}/{observationId}.bin
```

- `{sourceId}` — the target list's `id` column, not `name`.
- `{ingestionId}` — the run's `runId`, threaded through under this name.
- `{observationId}` — see "Run and observation identity" in the README.
- The raw body (`.bin`) is only written on a successful fetch; a failed attempt writes only the record (`.yml`).

## Logging

This app's own code uses four levels, never `warning`:

| Level | Used for |
| --- | --- |
| `trace` | Low-level step tracing inside a single fetch attempt (`Fetching data from source target`, `Writing fetch failure record`, `Writing raw response body`), and source-list construction |
| `debug` | Mode-selection at startup (`Using filesystem/gcs source list`, `...storage`, `...messaging`, `...otel configuration`) and per-run progress (`Processing {n} targets`, `Requesting content from source {i}`, `Processed {k} of {n} targets`) |
| `info` | Job start (`Starting ingestor job run {runId}`), and — notably — **both** outcomes of a fetch attempt: `Ingestion succeeded` and `Ingestion failed` log at the same level, distinguished only by message text and annotations, not severity |
| `error` | A per-target failure's full cause, dumped once via `Effect.tapErrorCause(Effect.logError)` when any step in that target's pipeline fails |

`core-io` (which every storage/messaging call in this app goes through) separately logs at `trace`/`warning` only, and `core-data` logs nothing at all — see each package's own README. There's no overlap to reconcile: this app's `error` level isn't used by either dependency.

### Spans and annotations

- `jobRun` span (whole run): annotated with `job.runId`, `job.concurrency`, `job.startedAt`, `job.successThreshold`.
- `processTarget` span (one target): annotated with `source.index`.
- `ingestFromSource` span (nested inside `processTarget`): annotated with `source.id`, `source.name`, `source.url`, `source.collection`.
- The `content_request_results` metric counter is tagged with `result_status`/`result_status_code`/`result_content_type` per attempt, and `source_name`/`source_collection`.

## Diagnosing failures

### Success rate below threshold

**Symptom:** the run exits with a failure whose message is exactly `Success rate {r} is below threshold {t}`. This isn't a logged error line — it's an `Effect.fail`, surfaced by the runtime's own unhandled-failure reporting when the process exits non-zero.

**Steps:**
1. Look for `Ingestion failed` log lines and their `result.error` annotation for the run's `runId`.
2. In production, list the `records/` prefix in the archive bucket for that `ingestion_id` and inspect the `outcome: 'no_response'` records.
3. If failures are transient (an upstream outage), the next scheduled run should recover on its own.
4. If a source is permanently unreachable, remove its row from the target list.
5. If the threshold itself is miscalibrated for the current source set's reliability, adjust `SUCCESS_THRESHOLD`.

### A specific target fails but the run still passes

**Steps:**
1. Find that target's `error` log line (`Effect.tapErrorCause(Effect.logError)`) and read the dumped cause.
2. The cause will be one of: a `FetcherError` (network/DNS/timeout/non-2xx — see `HttpClientFetcher`'s error message), a `StorageWriteError` from `core-io` (permission or connectivity issue writing the archive), or a `ParseResult.ParseError` (a schema encode failure — should not happen in normal operation; if it does, something about the fetched content or config is unexpected).
3. If failures for that source are consistent across runs, consider removing it from the target list.

### A target fails immediately with no fetch attempt logged

**Symptom:** no `Fetching data from source target` trace line for that target, but the run continues (or, if this affects every target, the whole run may fail as an unhandled defect rather than a normal per-target failure).

**Cause:** `ingestFromSource`'s `decodeContext` step decodes its arguments *synchronously*, outside the Effect error channel — unlike every other failure mode in this pipeline, a bad value here (e.g. a target-list row with an invalid `collection`) isn't isolated by `Effect.all(..., { mode: 'either' })`. See [docs/known-issues.md](./known-issues.md).

### Target list unreadable

**Symptom:** the run fails immediately, before any `Processing {n} targets` log line appears.

**Steps:**
1. In development, verify `TARGET_LIST_PATH` points to a valid, readable CSV file with the header row `id,name,collection,url`.
2. In production, verify `TARGET_LIST_BUCKET_NAME`/`TARGET_LIST_URI` are correct and the object exists, and that the service account has `storage.objects.get` on that bucket.

## Checking run output locally

With the local setup from the README, archived output lands wherever you configured:

```bash
# Archived records (YAML) and raw bodies
ls "$STORAGE_OUTPUT_DIR"

# Simulated storage notifications
ls "$PUBLISHER_OUTPUT_DIR"
```

See [docs/known-issues.md](./known-issues.md) for this project's current accepted gaps.
