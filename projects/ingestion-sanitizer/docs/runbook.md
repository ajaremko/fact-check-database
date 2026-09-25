# Sanitizer Runbook

Configuration reference, policy document format, and diagnosing failures for `ingestion-sanitizer`. See the [README](../README.md) for what this service does and how it works.

## Configuration

All variables are `private` (internal configuration — nothing here is a secret or public-facing).

| Variable                              | Type                  | Required                                   | Default                   | Purpose                                                                                                                                |
| ------------------------------------- | --------------------- | ------------------------------------------ | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `SANITIZER_POLICY_MODE`               | `gcp` \| `filesystem` | No                                         | `gcp`                     | Selects the policy-document adapter                                                                                                    |
| `SANITIZER_POLICY_PATH`               | string                | Only if `SANITIZER_POLICY_MODE=filesystem` | —                         | Local path to the policy YAML                                                                                                          |
| `ASSETS_BUCKET_NAME`                  | string                | Only if `SANITIZER_POLICY_MODE=gcp`        | —                         | GCS bucket containing the policy document                                                                                              |
| `SANITIZER_POLICY_URI`                | string                | Only if `SANITIZER_POLICY_MODE=gcp`        | —                         | Object path within `ASSETS_BUCKET_NAME`                                                                                                |
| `STORAGE_MODE`                        | `gcp` \| `filesystem` | No                                         | `gcp`                     | Selects the archive read/write adapter (from `core-io`)                                                                                |
| `STORAGE_OUTPUT_DIR`                  | string                | Only if `STORAGE_MODE=filesystem`          | —                         | Local directory ingestor records are read from and sanitizer records are written to                                                    |
| `STORAGE_BUCKET_NAME`                 | string                | Only if `STORAGE_MODE=gcp`                 | —                         | GCS bucket ingestor records are read from and sanitizer records are written to                                                         |
| `MESSAGING_MODE`                      | `gcp` \| `filesystem` | No                                         | `gcp`                     | Selects the message-queue feeder and notification adapters (from `core-io`)                                                            |
| `MESSAGE_QUEUE_INPUT_DIR`             | string                | Only if `MESSAGING_MODE=filesystem`        | —                         | Local directory polled for queued notification files                                                                                   |
| `PUBLISHER_OUTPUT_DIR`                | string                | Only if `MESSAGING_MODE=filesystem`        | —                         | Local directory the simulated notification is written to                                                                               |
| `PUBSUB_TOPIC_NAME`                   | string                | Only if `MESSAGING_MODE=gcp`               | —                         | Backs the (effectively unused in prod) `Publisher` layer — see `core-io`'s README                                                      |
| `PORT`                                | number                | Only if `MESSAGING_MODE=gcp`               | —                         | Port the HTTP push endpoint listens on                                                                                                 |
| `LOGGING_MODE`                        | `gcp` \| `console`    | No                                         | `gcp`                     | Pretty console logger vs. Pino/Cloud Logging JSON                                                                                      |
| `LOGGING_LEVEL`                       | Effect `LogLevel`     | No (main.ts) / **Yes** (Pino GCP config)   | `info`                    | Minimum log level — required with no default when `LOGGING_MODE=gcp`, since the Pino GCP config reads it a second time with no default |
| `SERVICE_NAME`                        | string                | Yes, when `LOGGING_MODE=gcp`               | —                         | Read by the Pino GCP logging config                                                                                                    |
| `SERVICE_VERSION`                     | string                | Yes, when `LOGGING_MODE=gcp`               | —                         | Read by the Pino GCP logging config                                                                                                    |
| `OTEL_MODE`                           | `gcp` \| `local`      | No                                         | `gcp`                     | Cloud Trace/Monitoring exporters vs. local OTLP                                                                                        |
| `OTEL_SERVICE_NAME` or `SERVICE_NAME` | string                | Yes (one of the two)                       | —                         | Service name attached to traces/metrics                                                                                                |
| `OTEL_METRIC_EXPORT_INTERVAL`         | integer (ms)          | No                                         | `60000`                   | How often metrics are exported                                                                                                         |
| `OTEL_CLOUD_MONITORING_PREFIX`        | string                | No, only used if `OTEL_MODE=gcp`           | `workload.googleapis.com` | Metric name prefix in Cloud Monitoring                                                                                                 |
| `OTEL_EXPORTER_OTLP_ENDPOINT`         | string                | Only if `OTEL_MODE=local`                  | —                         | Read directly by the OpenTelemetry OTLP exporter, not by this app's own `Config` calls                                                 |

`LOG_LEVEL` and `PUBSUB_SUBSCRIPTION_NAME` are **not** real variables — nothing in this project reads either. The real log-level variable is `LOGGING_LEVEL`; production message delivery is an HTTP push endpoint (`PORT`), not a pull subscription.

## Mode matrix

| Variable                     | `filesystem`                                                                      | `gcp` (default)                                                                   |
| ---------------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `SANITIZER_POLICY_MODE`      | this project's own `FileSystemSanitizerPolicyDocument`                            | this project's own `CloudStorageSanitizerPolicyDocument`                          |
| `STORAGE_MODE`               | `core-io`'s `FileSystemStorageWriterWithNotification` + `FileSystemStorageReader` | `core-io`'s `CloudStorageStorageWriter` + `CloudStorageStorageReader`             |
| `MESSAGING_MODE` (feeder)    | `core-io`'s `FileSystemMessageQueueFeeder`                                        | `core-io`'s `HttpServerMessageQueueFeeder`, mounted at `/ingestor-topic-messages` |
| `MESSAGING_MODE` (publisher) | `core-io`'s `FileSystemPublisher`                                                 | `core-io`'s `CloudPubsubPublisher`                                                |

The publisher exists only to satisfy `FileSystemStorageWriterWithNotification`'s dependency in dev — this service's own processing code never calls a publisher (see the README's Roadmap). In production, `CloudStorageStorageWriter` doesn't depend on `Publisher` at all, so the `CloudPubsubPublisher` layer is wired but not exercised by anything this app does.

## Policy document format

A YAML document, loaded once at startup and held for the process's lifetime.

| Field              | Type     | Description                                                                                |
| ------------------ | -------- | ------------------------------------------------------------------------------------------ |
| `version`          | number   | Policy schema version                                                                      |
| `stripQueryParams` | string[] | **Declared and populated, but never read** — see [docs/known-issues.md](./known-issues.md) |
| `dropHeaders`      | string[] | **Declared and populated, but never read** — see [docs/known-issues.md](./known-issues.md) |
| `collections`      | array    | Per-collection classification rules                                                        |
| `overrides`        | array    | Per-source overrides that extend a collection rule                                         |

### Collection rules

| Field                          | Type                                  | Required                  | Description                                                                                |
| ------------------------------ | ------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------ |
| `collection`                   | string                                | Yes                       | Matches the target list's `collection` value (e.g. `rss`, `atom`)                          |
| `maxBytes`                     | number                                | Yes                       | Records over this size are quarantined                                                     |
| `defaultLabel`                 | `PolicyLabel`                         | Yes                       | Label assigned when nothing else quarantines the record (`SAFE_PUBLIC` or `RESTRICTED`)    |
| `allowedContentTypeSubstrings` | string[]                              | No                        | Records whose content-type doesn't match are quarantined                                   |
| `onMissingContentType`         | `ALLOW` \| `RESTRICT` \| `QUARANTINE` | No (default `QUARANTINE`) | Behavior when content-type is absent                                                       |
| `rewriteBody`                  | boolean                               | No                        | **Declared and populated, but never read** — see [docs/known-issues.md](./known-issues.md) |

### Source overrides

| Field                                                                        | Type                          | Description                                   |
| ---------------------------------------------------------------------------- | ----------------------------- | --------------------------------------------- |
| `sourceName`                                                                 | string                        | Must match the target list's `name`           |
| `maxBytes` / `defaultLabel` / `allowedContentTypeSubstrings` / `rewriteBody` | optional, same types as above | Overrides the matched collection rule's value |

### Evaluation order

For every record, in order:

1. No `raw` content (the ingestor recorded `outcome: no_response`) → `QUARANTINED`, reason `QUARANTINED_FETCH_FAILED`. This _does_ produce a `SanitizerRecord` — it isn't skipped.
2. Empty response body → `QUARANTINED`, reason `QUARANTINED_EMPTY_BODY`.
3. Body larger than the matched rule's `maxBytes` → `QUARANTINED`, reason `QUARANTINED_TOO_LARGE`.
4. Content-type not allowed by the matched rule → `QUARANTINED`, reason `QUARANTINED_UNEXPECTED_CONTENT_TYPE`.
5. Otherwise → the matched rule's `defaultLabel`.

### Example (the real local development policy)

```yaml
version: 1
stripQueryParams: [utm_, fbclid, gclid, mc_cid, mc_eid]
dropHeaders: [set-cookie, cookie, authorization]
collections:
  - collection: rss
    allowedContentTypeSubstrings: [xml, rss, atom]
    onMissingContentType: ALLOW
    maxBytes: 8000000
    defaultLabel: SAFE_PUBLIC
  - collection: atom
    allowedContentTypeSubstrings: [xml, rss, atom]
    onMissingContentType: ALLOW
    maxBytes: 8000000
    defaultLabel: SAFE_PUBLIC
  - collection: api
    allowedContentTypeSubstrings: [json]
    onMissingContentType: RESTRICT
    maxBytes: 16000000
    defaultLabel: SAFE_PUBLIC
  - collection: html
    allowedContentTypeSubstrings: [html]
    onMissingContentType: RESTRICT
    maxBytes: 20000000
    defaultLabel: RESTRICTED
  - collection: default
    maxBytes: 1000000
    defaultLabel: RESTRICTED
    onMissingContentType: RESTRICT
```

## Archive contract

Every processed record is archived as a `SanitizerRecord` — see [ingestion-contracts](../../ingestion-contracts/README.md) for the canonical schema. In short: `version: 1`, `kind: 'sanitized_record'`, classification in a `label` field (`SAFE_PUBLIC` | `RESTRICTED` | `QUARANTINED`).

Objects are written under (built by `ingestion-contracts`'s `ArchivePathSchema`, the same helper the ingestor uses):

```
v1/records/sanitizer/source={sourceId}/date={YYYY-MM-DD}/ingestor_run_id={ingestorRunId}/fetch_attempt.yml
```

The path mirrors the `IngestionRecord` it was derived from — `source` + `ingestor_run_id` identify the fetch attempt, and there's no separate "sanitization ID" (see [docs/fact-check-lifecycle.md](../../../docs/fact-check-lifecycle.md)). No sanitized-body object path exists yet (see the README's Roadmap).

## Logging

This service's own code uses three levels, never `warning` and almost never `trace`:

| Level   | Used for                                                                                                                                                                       |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `trace` | Policy-document construction only (`Reading sanitizer policy from path: ...`), in the filesystem adapter                                                                       |
| `debug` | Startup mode selection, and per-message steps (`Listening for messages...`, `Reading observation from pointer`, `Evaluating policy for observation`, `Observation labeled: X`) |
| `info`  | `Sanitizing observation` at the start of each message, and `Record sanitized` (with `decision.label`, `decision.error`, and `source.*` annotations) at the end                 |
| `error` | A message's full failure cause, dumped via `Effect.tapErrorCause(Effect.logError)`; also used for message-queue-level errors                                                   |

`core-io` (which every storage/messaging call in this app goes through) separately logs at `trace`/`warning` only, and `core-data` logs nothing — see each package's own README.

## Diagnosing failures

### High volume of parse failures

**Symptom:** messages are acknowledged without producing sanitizer records; `ParseError` appears in the logged cause.
**Steps:**

1. Confirm the message actually is a GCS object-finalized-style notification with `bucketId`/`objectId` attributes — not some other message shape.
2. If the ingestor's storage write format changed, this decode step needs to change with it.

### Messages redelivered repeatedly (nack loop)

**Symptom:** the same message keeps reappearing; `StorageReadError` or `StorageWriteError` appears in the logged cause.
**Steps:**

1. For a read failure: verify the service account has `storage.objects.get` on the archive bucket, and that the object referenced by the notification's `bucketId`/`objectId` actually exists — if the ingestor's own write failed, it won't.
2. For a write failure: verify `storage.objects.create` on the archive bucket, and check bucket quotas/availability.
3. Once the underlying issue is fixed, the next redelivery should succeed.

### Policy document unreadable

**Symptom:** the service fails to start.
**Steps:**

1. In development, verify `SANITIZER_POLICY_PATH` points to a valid, readable YAML file.
2. In production, verify `ASSETS_BUCKET_NAME`/`SANITIZER_POLICY_URI` are correct and the service account has `storage.objects.get` on that bucket.
3. Validate the YAML against `src/contracts/SanitizerPolicy.ts` — a malformed policy fails schema decoding at startup.

### Message-queue-level errors

**Symptom:** the service logs an error and stops processing.
**Cause:** the queue feeder itself failed (e.g. a lost connection or an invalid message the feeder couldn't parse into a `QueueMessage` at all) — this is handled by a separate fiber from per-message processing and isn't currently isolated the way a single message's failure is.
**Steps:** check the logged cause for specifics; restart the service once the underlying issue (permissions, connectivity) is resolved.

## Checking output locally

```bash
ls "$STORAGE_OUTPUT_DIR"
```

See [docs/known-issues.md](./known-issues.md) for this project's current accepted gaps.
