# Ingestor Runbook

Configuration reference, operational reference, and diagnosing failures for `ingestion-ingestor`. See the [README](../README.md) for what this service does and how it works.

## Configuration

All variables are `private` (internal configuration — nothing here is a secret or public-facing).

| Variable                              | Type                  | Required                            | Default                   | Purpose                                                                                                  |
| ------------------------------------- | --------------------- | ----------------------------------- | ------------------------- | -------------------------------------------------------------------------------------------------------- |
| `TARGET_LIST_PATH`                    | string                | Yes                                 | —                         | Path to the target list YAML file. In dev and prod this is a Secret Manager version mounted into the job |
| `STORAGE_MODE`                        | `gcp` \| `filesystem` | No                                  | `gcp`                     | Selects the archive-storage adapter (from `core-io`)                                                     |
| `STORAGE_OUTPUT_DIR`                  | string                | Only if `STORAGE_MODE=filesystem`   | —                         | Local directory archived bodies and records are written to                                               |
| `STORAGE_BUCKET_NAME`                 | string                | Only if `STORAGE_MODE=gcp`          | —                         | GCS bucket archived bodies and records are written to                                                    |
| `MESSAGING_MODE`                      | `gcp` \| `filesystem` | No                                  | `gcp`                     | Selects the notification adapter (from `core-io`)                                                        |
| `PUBLISHER_OUTPUT_DIR`                | string                | Only if `MESSAGING_MODE=filesystem` | —                         | Local directory the simulated notification is written to                                                 |
| `PUBSUB_TOPIC_NAME`                   | string                | Only if `MESSAGING_MODE=gcp`        | —                         | Pub/Sub topic backing the (effectively unused in prod — see below) `Publisher` layer                     |
| `LOGGING_MODE`                        | `gcp` \| `console`    | No                                  | `gcp`                     | Pretty console logger vs. Pino/Cloud Logging JSON                                                        |
| `LOGGING_LEVEL`                       | Effect `LogLevel`     | No                                  | `info`                    | Minimum log level                                                                                        |
| `OTEL_MODE`                           | `gcp` \| `local`      | No                                  | `gcp`                     | Cloud Trace/Monitoring exporters vs. local OTLP                                                          |
| `OTEL_SERVICE_NAME` or `SERVICE_NAME` | string                | Yes (one of the two)                | —                         | Service name attached to traces/metrics                                                                  |
| `OTEL_METRIC_EXPORT_INTERVAL`         | integer (ms)          | No                                  | `60000`                   | How often metrics are exported                                                                           |
| `OTEL_SHUTDOWN_TIMEOUT`               | integer (ms)          | No                                  | `15000`                   | Grace period for exporters to flush on shutdown                                                          |
| `OTEL_CLOUD_MONITORING_PREFIX`        | string                | No, only used if `OTEL_MODE=gcp`    | `workload.googleapis.com` | Metric name prefix in Cloud Monitoring                                                                   |
| `OTEL_EXPORTER_OTLP_ENDPOINT`         | string                | Only if `OTEL_MODE=local`           | —                         | Read directly by the OpenTelemetry OTLP exporter (not by this app's own `Config` calls)                  |
| `MAX_CONCURRENCY`                     | integer               | No                                  | `10`                      | Maximum targets fetched in parallel                                                                      |
| `SUCCESS_THRESHOLD`                   | number 0–1            | No                                  | `0.8`                     | Minimum fraction of targets that must succeed                                                            |

`LOG_LEVEL` is **not** a real variable — nothing in this project reads it. If you see it in an old `.env`, it's dead; the real variable is `LOGGING_LEVEL`.

## Mode matrix

| Variable         | `filesystem`                                          | `gcp` (default)                         |
| ---------------- | ----------------------------------------------------- | --------------------------------------- |
| `STORAGE_MODE`   | `core-io`'s `FileSystemStorageWriterWithNotification` | `core-io`'s `CloudStorageStorageWriter` |
| `MESSAGING_MODE` | `core-io`'s `FileSystemPublisher`                     | `core-io`'s `CloudPubsubPublisher`      |

The target list has no mode: it is always read from the file at `TARGET_LIST_PATH`. Storage and messaging come from `@fact-check-database/core-io` — see that package's own README for what each adapter does. `CloudStorageStorageWriter` never calls a `Publisher` itself (see "How the hand-off to the sanitizer works" in the README) — the `MESSAGING_MODE=gcp` layer exists so `FileSystemStorageWriterWithNotification` has a `Publisher` to use in dev; in production it's provided but not exercised by this app's own code.

## Target list format

A YAML file with two top-level keys: `defaults` and `sources`.

```yaml
defaults:
  timeoutSeconds: 30

sources:
  - id: politifact
    name: politifact.com
    collection: rss
    url: https://www.politifact.com/rss/factchecks/

  - id: example
    name: Example
    collection: atom
    url: https://example.org/feed
    timeoutSeconds: 90
    enabled: false
    notes: Paused while the publisher moves its feed.
```

| Field                      | Required           | Description                                                                                                                                           |
| -------------------------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `defaults.timeoutSeconds`  | Yes                | Seconds a fetch may take before it is abandoned. Applies to every source that doesn't set its own                                                     |
| `sources[].id`             | Yes                | Stable identifier for the source. It names the source's archive path and is part of every `fact_check_id`, so it must be unique and must never change |
| `sources[].name`           | Yes                | Human-readable name, used in log annotations and metric tags                                                                                          |
| `sources[].collection`     | Yes                | Must be exactly `atom` or `rss`: the feed format `ingestion-extractor` uses to parse this source's output later in the pipeline                       |
| `sources[].url`            | Yes                | The URL to fetch                                                                                                                                      |
| `sources[].timeoutSeconds` | No                 | Overrides `defaults.timeoutSeconds` for this source, for a publisher that is slow to respond                                                          |
| `sources[].enabled`        | No, default `true` | `false` keeps the source in the list without fetching it. A disabled source doesn't count towards the run's success rate                              |
| `sources[].notes`          | No                 | Free text for whoever maintains the list. The ingestor ignores it                                                                                     |

The whole file is validated at startup, and an invalid file stops the run before any fetch:

- **Ids must be unique**, disabled sources included. Two sources sharing an id would overwrite
  each other's fetch records and merge their fact checks. The error names each duplicated id.
- A timeout must be a positive number.
- A `collection` other than `atom` or `rss` is rejected.

A fetch that outlasts its timeout is interrupted and archived as an `outcome: 'no_response'`
record with the error `Timed out after <n>s (GET <url>)`, like any other fetch that got no
response. It counts as a failed source for the run's success threshold.

Adding a source means adding an entry and redeploying `ingestion-infra`: no code change is
needed. To stop fetching a source, set `enabled: false` or delete its entry; historical records
remain in the archive either way. Sources with unreachable URLs aren't removed automatically.

## Archive contract

Every fetch attempt is archived as an `IngestionRecord` — see [ingestion-contracts](../../ingestion-contracts/README.md) for the canonical schema. In short: `version: 1`, `kind: 'fetch_attempt'`, `outcome: 'data_fetched' | 'no_response'`.

Objects are written under two path templates (built by `ingestion-contracts`'s `ArchivePathSchema`, not hand-assembled here):

```
v1/records/ingestion/source={sourceId}/date={YYYY-MM-DD}/ingestor_run_id={ingestorRunId}/fetch_attempt.yml
v1/raw/source={sourceId}/date={YYYY-MM-DD}/ingestor_run_id={ingestorRunId}/{contentSha256}.bin
```

- `{sourceId}` — the target list's `id` column, not `name`.
- `{ingestorRunId}` — the run's `runId`, logged as `job.runId` at startup.
- `{contentSha256}` — SHA-256 of the response body. See [docs/fact-check-lifecycle.md](../../../docs/fact-check-lifecycle.md).
- The raw body (`.bin`) is only written on a successful fetch; a failed attempt writes only the record (`.yml`).

## Logging

This service's own code logs only at `info` and above. `trace` and `debug` belong to the shared
libraries it runs on, so `LOGGING_LEVEL` works as a dial for how deep to look.

### Levels this service uses

| Level   | Used for                                                                                                                                                                                                                                                                        |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `info`  | Startup: one `… mode selected` line per component (`mode.storage`, `mode.messaging`, `mode.otel`), `Ingestor job started` and `Source list loaded`. Per source: `Source fetched` once a 2xx response is archived. At the end: `Ingestor job completed` when the run passes      |
| `warn`  | `Source returned an error status`: a non-2xx response, archived as usual. `Source unreachable`: no response at all, so only the attempt record is archived                                                                                                                      |
| `error` | `Source ingestion failed`: one line per source whose pipeline failed (a storage write, or encoding its record), with the failure attached as the log's cause. `Ingestor job completed` when the run falls below `SUCCESS_THRESHOLD`                                             |
| `fatal` | `Ingestor job stopped`: the run is exiting non-zero, either because the success rate was too low (`error._tag: SuccessThresholdNotMet`) or because startup failed (e.g. an unreadable target list). `Ingestor failed to start` only if the logger itself couldn't be configured |

Each source produces exactly one outcome line: `Source fetched`, `Source returned an error status`,
`Source unreachable` or `Source ingestion failed`. An outcome line is logged only after the
attempt's record has been written to the archive.

### Choosing `LOGGING_LEVEL`

| Level   | What you see                                                                                                                          | Use it when                                                                      |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `info`  | This service's own lines above: one outcome line per source, bracketed by the job's start and completion                              | Normal operation (the default)                                                   |
| `debug` | Adds the libraries' unexpected conditions: every failed SDK call, with `module`, `error._tag` and the SDK status code as `cause.code` | A source's pipeline fails and you need to know which storage call failed and how |
| `trace` | Adds every library step: clients created, buckets opened, each file written                                                           | Something hangs or behaves oddly and you need the exact call sequence            |

The library levels are documented in the [core-io](../../core-io/README.md#logging) and
[core-vendor](../../core-vendor/README.md#logging) READMEs.

### Annotations

| Key                                                                           | Set on                                            |
| ----------------------------------------------------------------------------- | ------------------------------------------------- |
| `job.runId`, `job.concurrency`, `job.startedAt`, `job.successThreshold`       | Every line in the run, including library lines    |
| `source.index`, `source.id`, `source.name`, `source.url`, `source.collection` | Every line logged while that source is processed  |
| `result.status_code`, `result.final_url`, `content.bytes`, `content.sha256`   | A source's lines once its response has arrived    |
| `body.object`, `record.object`                                                | A source's lines once each has been archived      |
| `sourceList.path`, `sources.length`, `sources.disabled`                       | `Source list loaded`                              |
| `error._tag`                                                                  | `Source ingestion failed`, `Ingestor job stopped` |

### Dashboard events

Three lines also carry an `event` payload from `ingestion-contracts`' `logging/v1`, and the
`ingestion-infra` dashboards query them. Their event names and fields are a contract:

| `event`                  | Logged on                                                               | Dashboard dependency                                                      |
| ------------------------ | ----------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `fetch_success`          | `Source fetched` (info) and `Source returned an error status` (warning) | `source.*`, `result.status`, `result.status_code`, `result.content_type`  |
| `fetch_failure`          | `Source unreachable`                                                    | Must stay at **warning**; the dashboard filters on `severity = 'WARNING'` |
| `ingestor_job_completed` | `Ingestor job completed` (info on success, error on failure)            | `job.tasks`, `job.failures`, `job.successThreshold`, `job.result`         |

Each event is attached to its one line only, never as a scoped annotation, so the dashboards count
each event once.

### Spans and metrics

- `jobRun` span (whole run), `processTarget` span (one source), and `ingestFromSource` nested
  inside it.
- The `content_request_results` metric counter is tagged with
  `result_status`/`result_status_code`/`result_content_type` per attempt, and
  `source_name`/`source_collection`.

## Diagnosing failures

### Success rate below threshold

**Symptom:** the run ends with an error-level `Ingestor job completed` line (`job.result: failure`), followed by a fatal `Ingestor job stopped` with `error._tag: SuccessThresholdNotMet`, and exits non-zero.

**Steps:**

1. Filter the run's lines by `job.runId`, and look at each source's outcome line. `Source unreachable` carries `result.error`, and `Source ingestion failed` carries `error._tag` and the full cause.
2. In production, list the `records/` prefix in the archive bucket for that `ingestor_run_id` and inspect the `outcome: 'no_response'` records.
3. If failures are transient (an upstream outage), the next scheduled run should recover on its own.
4. If a source is permanently unreachable, remove its row from the target list.
5. If the threshold itself is miscalibrated for the current source set's reliability, adjust `SUCCESS_THRESHOLD`.

### A specific target fails but the run still passes

**Steps:**

1. Filter by `source.id` to find that source's outcome line. `Source unreachable` and `Source returned an error status` are warnings about the source itself. `Source ingestion failed` is an error in this service's own pipeline.
2. For `Source ingestion failed`, the cause is one of: a `FetcherError` (the response arrived but its body couldn't be read. Network, DNS and timeout failures are logged as `Source unreachable` instead, and non-2xx responses as `Source returned an error status`), a `StorageWriteError` from `core-io` (permission or connectivity issue writing the archive), or a `ParseResult.ParseError` (either a schema encode failure when writing the record, or `ingestFromSource`'s own `decodeContext` step rejecting a malformed target-list row, e.g. an invalid `collection` value — both are isolated to that one target, same as every other failure mode here).
3. To see which storage call failed and with what status code, rerun with `LOGGING_LEVEL=debug` and filter on the same `source.id`.
4. If failures for that source are consistent across runs, consider removing it from the target list.

### Target list unreadable

**Symptom:** the run logs a fatal `Ingestor job stopped` before any `Source list loaded` line appears.

**Steps:**

1. In development, verify `TARGET_LIST_PATH` points to a readable YAML file in the [target list format](#target-list-format). The fatal line's error says which field failed validation, and names any duplicated id.
2. In dev and prod, the file is the source-list secret mounted at `/config/sources.yml` by `ingestion-infra`. Verify the job's revision mounts the secret's latest version, and that the job's service account can access the secret.

## Checking run output locally

With the local setup from the README, archived output lands wherever you configured:

```bash
# Archived records (YAML) and raw bodies
ls "$STORAGE_OUTPUT_DIR"

# Simulated storage notifications
ls "$PUBLISHER_OUTPUT_DIR"
```
