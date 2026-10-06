# Sanitizer Runbook

Configuration reference, policy document format, and diagnosing failures for `ingestion-sanitizer`. See the [README](../README.md) for what this service does and how it works.

## Configuration

All variables are `private` (internal configuration — nothing here is a secret or public-facing).

| Variable                              | Type                  | Required                                 | Default                   | Purpose                                                                                                                                |
| ------------------------------------- | --------------------- | ---------------------------------------- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `SANITIZER_POLICY_PATH`               | string                | Yes                                      | —                         | Path to the policy YAML. In dev and prod this is a Secret Manager version mounted into the service                                     |
| `STORAGE_MODE`                        | `gcp` \| `filesystem` | No                                       | `gcp`                     | Selects the archive read/write adapter (from `core-io`)                                                                                |
| `STORAGE_OUTPUT_DIR`                  | string                | Only if `STORAGE_MODE=filesystem`        | —                         | Local directory ingestor records are read from and sanitizer records are written to                                                    |
| `STORAGE_BUCKET_NAME`                 | string                | Only if `STORAGE_MODE=gcp`               | —                         | GCS bucket ingestor records are read from and sanitizer records are written to                                                         |
| `MESSAGING_MODE`                      | `gcp` \| `filesystem` | No                                       | `gcp`                     | Selects the message-queue feeder and notification adapters (from `core-io`)                                                            |
| `MESSAGE_QUEUE_INPUT_DIR`             | string                | Only if `MESSAGING_MODE=filesystem`      | —                         | Local directory polled for queued notification files                                                                                   |
| `PUBLISHER_OUTPUT_DIR`                | string                | Only if `MESSAGING_MODE=filesystem`      | —                         | Local directory the simulated notification is written to                                                                               |
| `PUBSUB_TOPIC_NAME`                   | string                | Only if `MESSAGING_MODE=gcp`             | —                         | Backs the (effectively unused in prod) `Publisher` layer — see `core-io`'s README                                                      |
| `PORT`                                | number                | Only if `MESSAGING_MODE=gcp`             | —                         | Port the HTTP push endpoint listens on                                                                                                 |
| `LOGGING_MODE`                        | `gcp` \| `console`    | No                                       | `gcp`                     | Pretty console logger vs. Pino/Cloud Logging JSON                                                                                      |
| `LOGGING_LEVEL`                       | Effect `LogLevel`     | No (main.ts) / **Yes** (Pino GCP config) | `info`                    | Minimum log level — required with no default when `LOGGING_MODE=gcp`, since the Pino GCP config reads it a second time with no default |
| `SERVICE_NAME`                        | string                | Yes, when `LOGGING_MODE=gcp`             | —                         | Read by the Pino GCP logging config                                                                                                    |
| `SERVICE_VERSION`                     | string                | Yes, when `LOGGING_MODE=gcp`             | —                         | Read by the Pino GCP logging config                                                                                                    |
| `OTEL_MODE`                           | `gcp` \| `local`      | No                                       | `gcp`                     | Cloud Trace/Monitoring exporters vs. local OTLP                                                                                        |
| `OTEL_SERVICE_NAME` or `SERVICE_NAME` | string                | Yes (one of the two)                     | —                         | Service name attached to traces/metrics                                                                                                |
| `OTEL_METRIC_EXPORT_INTERVAL`         | integer (ms)          | No                                       | `60000`                   | How often metrics are exported                                                                                                         |
| `OTEL_CLOUD_MONITORING_PREFIX`        | string                | No, only used if `OTEL_MODE=gcp`         | `workload.googleapis.com` | Metric name prefix in Cloud Monitoring                                                                                                 |
| `OTEL_EXPORTER_OTLP_ENDPOINT`         | string                | Only if `OTEL_MODE=local`                | —                         | Read directly by the OpenTelemetry OTLP exporter, not by this app's own `Config` calls                                                 |

`LOG_LEVEL` and `PUBSUB_SUBSCRIPTION_NAME` are **not** real variables — nothing in this project reads either. The real log-level variable is `LOGGING_LEVEL`; production message delivery is an HTTP push endpoint (`PORT`), not a pull subscription.

## Mode matrix

| Variable                     | `filesystem`                                                                      | `gcp` (default)                                                                   |
| ---------------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `STORAGE_MODE`               | `core-io`'s `FileSystemStorageWriterWithNotification` + `FileSystemStorageReader` | `core-io`'s `CloudStorageStorageWriter` + `CloudStorageStorageReader`             |
| `MESSAGING_MODE` (feeder)    | `core-io`'s `FileSystemMessageQueueFeeder`                                        | `core-io`'s `HttpServerMessageQueueFeeder`, mounted at `/ingestor-topic-messages` |
| `MESSAGING_MODE` (publisher) | `core-io`'s `FileSystemPublisher`                                                 | `core-io`'s `CloudPubsubPublisher`                                                |

The policy document has no mode: it is always read from the file at `SANITIZER_POLICY_PATH`.

The publisher exists only to satisfy `FileSystemStorageWriterWithNotification`'s dependency in dev — this service's own processing code never calls a publisher (see the README's Roadmap). In production, `CloudStorageStorageWriter` doesn't depend on `Publisher` at all, so the `CloudPubsubPublisher` layer is wired but not exercised by anything this app does.

## Policy document format

A YAML document, loaded once at startup and held for the process's lifetime. This section says
what each field does. Why the deployed policy has the values it has is in
[policy-rationale.md](./policy-rationale.md), and what to check before editing it is in
[Changing the policy](#changing-the-policy).

| Field              | Type     | Description                                                                                                                   |
| ------------------ | -------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `version`          | number   | The policy's revision. Written to every sanitizer record as `policy_version`. See [Changing the policy](#changing-the-policy) |
| `stripQueryParams` | string[] | Query parameters removed from URLs. See [Scrubbing](#scrubbing)                                                               |
| `dropHeaders`      | string[] | Response headers removed from every record, matched case-insensitively. See [Scrubbing](#scrubbing)                           |
| `collections`      | array    | Per-collection classification rules                                                                                           |
| `overrides`        | array    | Per-source overrides that extend a collection rule                                                                            |

### Collection rules

| Field                          | Type                                  | Required                  | Description                                                                                              |
| ------------------------------ | ------------------------------------- | ------------------------- | -------------------------------------------------------------------------------------------------------- |
| `collection`                   | string                                | Yes                       | Matches the target list's `collection` value (e.g. `rss`, `atom`)                                        |
| `maxBytes`                     | number                                | Yes                       | Records over this size are quarantined                                                                   |
| `defaultLabel`                 | `PolicyLabel`                         | Yes                       | Label assigned when nothing else quarantines the record (`SAFE_PUBLIC` or `RESTRICTED`)                  |
| `allowedContentTypeSubstrings` | string[]                              | No                        | Records whose content-type doesn't match are quarantined                                                 |
| `onMissingContentType`         | `ALLOW` \| `RESTRICT` \| `QUARANTINE` | No (default `QUARANTINE`) | What to do with a response that has no content-type. See step 4 of [Evaluation order](#evaluation-order) |
| `rewriteBody`                  | boolean                               | No (default `false`)      | Whether `stripQueryParams` is also applied to the URLs inside the body. See [Scrubbing](#scrubbing)      |

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
4. No content-type → the matched rule's `onMissingContentType` decides:
   - `QUARANTINE` (the default) → `QUARANTINED`, reason `QUARANTINED_UNEXPECTED_CONTENT_TYPE`.
   - `RESTRICT` → the record passes, but a `SAFE_PUBLIC` rule labels it `RESTRICTED`. The record's `error` says `Missing content-type`. A rule that is already `RESTRICTED` or `QUARANTINED` keeps its label.
   - `ALLOW` → the record passes as if the content-type had matched.
5. Content-type not allowed by the matched rule → `QUARANTINED`, reason `QUARANTINED_UNEXPECTED_CONTENT_TYPE`.
6. Otherwise → the matched rule's `defaultLabel`.

Only a `SAFE_PUBLIC` record is extracted. A `QUARANTINED` record also keeps its body as fetched:
the sanitizer does not rewrite it.

### Scrubbing

Classification decides who may use a record. Scrubbing removes what no downstream user should
receive at all. It runs after classification, and every step it applies is listed in the
record's `actions`.

**Why it exists.** A fetch record copies the publisher's response headers, and the extractor
copies them again into every row. Feed links often carry tracking parameters, and the extractor
derives a fact check's identity from its link.

- A `set-cookie` header is a session credential issued to the crawler. It has no research value
  and should not reach the dataset.
- `?utm_source=rss` says how a reader reached an article, not which article it is. Left in, the
  same article gets a different `fact_check_id` whenever a publisher changes its campaign tags.

**Headers.** `dropHeaders` applies to every record that has response metadata, quarantined ones
included.

- A listed header is removed from the record's `http.headers`. `Set-Cookie` matches a
  `set-cookie` entry.
- The fields the ingestor lifted out of the headers (`content_type`, `etag`, `last_modified`) are
  not affected.
- Action recorded: `DROPPED_HEADERS`.

**Query parameters.** An entry in `stripQueryParams` is a parameter name, matched
case-insensitively. An entry ending in `_` is a prefix: `utm_` matches `utm_source` and
`utm_medium`, while `gclid` matches only `gclid`.

- A listed parameter is removed with its value. Every other parameter, the order they are in and
  the fragment are kept as written, so `?p=4720` and `?resize=75,75` still work.
- When no parameter is left, the `?` is removed too.
- It always applies to the record's `http.final_url`. `source.url` is never changed: it is the
  feed's configured address.
- Action recorded: `QUERY_STRIPPED`.

**Bodies.** For a record that was not quarantined and whose rule sets `rewriteBody: true`, the
same parameters are removed from every `http://` or `https://` URL in the body.

- The sanitizer reads the raw body and edits only those URLs. It recognizes `&` written as
  `&amp;`, `&#038;` or `&#x26;`, and URLs inside CDATA sections and escaped HTML.
- Every other byte is left as fetched, whatever the feed's character encoding.
- If the body changed, the result is written as a sanitized copy (see
  [Archive contract](#archive-contract)). The record's `content.sanitized` points at it,
  `content.sha256` and `content.bytes` describe it, and `bytes_rewritten` is `true`.
- If nothing changed, no copy is written and the record points at the raw body, as it does for a
  rule without `rewriteBody`.
- The raw body is never modified. `input.raw` points at it in every record.
- Actions recorded: `QUERY_STRIPPED` and `BODY_REWRITTEN`.

**What scrubbing does not do.**

- It does not remove scripts, tracking pixels or other markup from the HTML inside feed items.
- It does not change relative URLs, or URLs nested inside another URL's parameter value.
- It reads a URL only up to an entity-encoded quote or bracket, such as `&quot;` or `&#039;`,
  because in escaped HTML that is where an attribute ends. A URL with one inside its path keeps
  the parameters that follow it. One of the 390 URLs carrying a listed parameter in a 52-feed
  sample was affected.
- It does not rewrite quarantined bodies. They are not extracted.

### Example (abridged from the local development policy)

The full parameter list is in `assets/policy.yml`, and each entry's basis is in
[policy-rationale.md](./policy-rationale.md#the-list).

```yaml
version: 1
stripQueryParams: [utm_, gclid, fbclid, ref_src, mc_eid] # 46 entries in the real file
dropHeaders: [set-cookie, cookie, authorization]
collections:
  - collection: rss
    allowedContentTypeSubstrings: [xml, rss, atom]
    onMissingContentType: QUARANTINE
    maxBytes: 8000000
    defaultLabel: SAFE_PUBLIC
    rewriteBody: true
  - collection: atom
    allowedContentTypeSubstrings: [xml, rss, atom]
    onMissingContentType: QUARANTINE
    maxBytes: 8000000
    defaultLabel: SAFE_PUBLIC
    rewriteBody: true
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

## Changing the policy

Two policy settings are part of how fact checks are identified. Changing them changes the
dataset's identity scheme, not only the sanitizer's behavior. The rules in this section are a
contract for anyone who edits the policy.

### Why the policy affects identity

A fact check's id is a hash of its source and its article URL (see
[docs/fact-check-lifecycle.md](../../../docs/fact-check-lifecycle.md#identity)). The extractor
reads that URL from the body the sanitizer hands on. A setting that changes the URLs in a body
therefore changes the ids computed from it.

Nothing downstream removes an id that is no longer produced. When a fact check's id changes, the
curated table and the search index keep the row under the old id and add one under the new id.

### What each setting does to ids

| Setting changed                                                     | Effect on fact-check ids                                                                                                        |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `stripQueryParams`: an entry added                                  | A fact check whose article URL carries that parameter gets a new id at its next fetch. It is then held twice                    |
| `stripQueryParams`: an entry removed                                | The reverse: the parameter returns to the URL, the id changes back, and the fact check is held twice                            |
| `rewriteBody`, on a collection rule or a source override            | The same as adding or removing every entry at once, for the sources the rule covers                                             |
| An entry that selects a page, such as `p`, `id` or `post_type`      | Different articles from one source collapse into one id, and each overwrites the last. Never list one                           |
| `dropHeaders`                                                       | None. Only the `http.headers` stored in rows change                                                                             |
| Labels and gates: `defaultLabel`, `maxBytes`, content-type settings | None. They decide whether a feed is extracted at all. A source that stops being `SAFE_PUBLIC` stops producing and updating rows |

Two further effects are not duplicates:

- **New versions.** An item whose text contains a newly stripped URL gets a new version hash
  (`fact_check.sha256`), because the hash covers the item's fields. The curated MERGE applies
  that as an update to the existing row.
- **A transition period.** The change applies to records sanitized after it. Records sanitized
  earlier and still waiting for the extractor keep their old URLs, so ids in the old form can
  arrive until that backlog clears.

### Before changing `stripQueryParams` or `rewriteBody`

1. **Check that the parameter never selects a page.** It must pass the selection rule in
   [policy-rationale.md](./policy-rationale.md#the-selection-rule).
2. **Check whether any article URL carries it.** Look for it in the staging table's
   `fact_check.canonical_url`, `fact_check.link` and `fact_check.guid`.
3. **If none does, the change does not touch identity.** It only affects links inside article
   text. Affected rows are updated in place.
4. **If some do, treat it as an identity change.** Each affected fact check will be held twice.
   Plan the removal of the superseded ids from the curated table and the search index as part
   of the same change.
5. **Record the entry.** Add it, with its basis, to the list in
   [policy-rationale.md](./policy-rationale.md#the-list), and make the same edit in all three
   policy files.
6. **Raise `version` by one**, in all three policy files. This applies to any change to the
   policy's values, not only to these two settings.

### How a record is traced to its policy

The sanitizer writes the policy's `version` to every sanitizer record as `policy_version`. The
extractor copies it onto each staging row as `sanitizer_policy_version`, and the curated MERGE
copies it onto the curated row. A fact check that appears under a new id can then be matched to
the policy revision that produced it:

- A curated row holds the policy version behind its current content. A later fetch under a new
  policy changes the value only if it also changes the row's content.
- Records written before the field was introduced have no `policy_version`, and their rows hold
  `NULL`.
- The value is only as reliable as step 6. A policy edited without raising `version` is recorded
  under the old number.

### When a change takes effect

The sanitizer reads the policy once, at startup. In dev and prod the policy is a Secret Manager
version mounted into the service, so deploying `ingestion-infra` publishes the new version and
starts a sanitizer revision that uses it. Locally, restart the service.

## Archive contract

Every processed record is archived as a `SanitizerRecord` — see [ingestion-contracts](../../ingestion-contracts/README.md) for the canonical schema. In short: `version: 1`, `kind: 'sanitized_record'`, classification in a `label` field (`SAFE_PUBLIC` | `RESTRICTED` | `QUARANTINED`).

Objects are written under (built by `ingestion-contracts`'s `ArchivePathSchema`, the same helper the ingestor uses):

```
v1/records/sanitizer/source={sourceId}/date={YYYY-MM-DD}/ingestor_run_id={ingestorRunId}/fetch_attempt.yml
```

Each record carries `policy_version`, the `version` of the policy that produced it. It is separate
from the record's own `version`, which is the record format's.

The path mirrors the `IngestionRecord` it was derived from — `source` + `ingestor_run_id` identify the fetch attempt, and there's no separate "sanitization ID" (see [docs/fact-check-lifecycle.md](../../../docs/fact-check-lifecycle.md)).

A body the sanitizer rewrote is written beside it, named after the SHA-256 of the rewritten bytes:

```
v1/sanitized/source={sourceId}/date={YYYY-MM-DD}/ingestor_run_id={ingestorRunId}/{contentSha256}.bin
```

- It exists only for a record whose body changed. Most records have none.
- It is written before the record that points at it, so a record never references a missing
  object.
- Writing it sends no notification. Only objects under `v1/records/` do.
- A redelivered message writes the same bytes to the same path.

## Logging

This service's own code logs only at `info` and above. `trace` and `debug` belong to the shared
libraries it runs on, so `LOGGING_LEVEL` works as a dial for how deep to look.

### Levels this service uses

| Level   | Used for                                                                                                                                                                                                                                                                                                                                  |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `info`  | Startup: one `… mode selected` line per component (`mode.storage`, `mode.messaging`, `mode.otel`), `Message queue feeder selected`, `Sanitizer policy loaded` and `Listening for messages`. Per message: `Message received`, then `Record sanitized` once the sanitizer record is written, for every decision label, quarantines included |
| `warn`  | `Message redelivered`: Pub/Sub's delivery attempt for this message is above 1                                                                                                                                                                                                                                                             |
| `error` | `Sanitization failed`: one line per failed message, with `error._tag`, `message.outcome` and the failure attached as the log's cause                                                                                                                                                                                                      |
| `fatal` | `Sanitizer stopped`: the service is exiting, because the message queue failed or startup failed (e.g. the policy document couldn't be read). `Sanitizer failed to start` only if the logger itself couldn't be configured                                                                                                                 |

Every message ends in exactly one outcome line: `Record sanitized` or `Sanitization failed`. A
failure's `message.outcome` says what happened to the message:

| `error._tag`                            | `message.outcome` | Meaning                                                                       |
| --------------------------------------- | ----------------- | ----------------------------------------------------------------------------- |
| `ParseError`                            | `ack`             | Dropped for good: retrying an unparseable message or record can't succeed     |
| `StorageReadError`, `StorageWriteError` | `nack`            | Retried by Pub/Sub, and dead-lettered after the subscription's limit          |
| `Defect` or any other tag               | `nack`            | An unexpected failure. Retried, then dead-lettered; the service keeps running |

### Choosing `LOGGING_LEVEL`

| Level   | What you see                                                                                                                                                      | Use it when                                                            |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `info`  | This service's own lines above: two lines per message                                                                                                             | Normal operation (the default)                                         |
| `debug` | Adds the libraries' unexpected conditions: every failed SDK call, with `module`, `error._tag` and the SDK status code as `cause.code`, and rejected push requests | A message fails and you need to know which storage call failed and how |
| `trace` | Adds every library step: push requests handled, files read and written                                                                                            | Something hangs or behaves oddly and you need the exact call sequence  |

The library levels are documented in the [core-io](../../core-io/README.md#logging) and
[core-vendor](../../core-vendor/README.md#logging) READMEs.

### Annotations

| Key                                                                             | Set on                                                                                           |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `message.messageId`, `message.deliveryAttempt`, `request.url`, `request.method` | Every line for a message pushed over HTTP (carried from core-io's feeder)                        |
| `input.bucket`, `input.object`                                                  | Every line for a message, once its notification is decoded: the ingestion record being sanitized |
| `source.id`, `source.name`, `source.url`, `source.collection`                   | `Record sanitized`                                                                               |
| `decision.label`, `decision.actions`                                            | `Record sanitized`                                                                               |
| `headers.dropped`, `body.urlsStripped`                                          | `Record sanitized`: how many headers were removed, and how many URLs in the body were changed    |
| `sanitized.object`                                                              | `Record sanitized`, only when a sanitized copy of the body was written                           |
| `record.object`                                                                 | `Record sanitized`: the sanitizer record written                                                 |
| `policy.uri` or `policy.path`, `policy.version`, `policy.collections.length`    | `Sanitizer policy loaded`                                                                        |
| `error._tag`, `message.outcome`                                                 | `Sanitization failed`                                                                            |

### Dashboard event

`Record sanitized` also carries the `record_sanitized` payload from `ingestion-contracts`'
`logging/v1`, which an `ingestion-infra` dashboard queries. It is a contract:

- The dashboard filters on `severity = 'INFO'`, so the line stays at `info` for every decision
  label. A quarantine is a normal policy outcome, not a warning; logging it higher would drop it
  from the panel.
- It reads `source.*` and `decision.label`, so those field names are fixed.
- The payload is attached to that one line only, never as a scoped annotation, so the dashboard
  counts each record once.

## Diagnosing failures

### High volume of parse failures

**Symptom:** `Sanitization failed` lines with `error._tag: ParseError` and `message.outcome: ack`. These messages are dropped, so no sanitizer record is written for them.
**Steps:**

1. Confirm the message actually is a GCS object-finalized-style notification with `bucketId`/`objectId` attributes — not some other message shape.
2. If the ingestor's storage write format changed, this decode step needs to change with it.

### Messages redelivered repeatedly (nack loop)

**Symptom:** `Message redelivered` warnings with a rising `message.deliveryAttempt`, and `Sanitization failed` lines with `error._tag` `StorageReadError` or `StorageWriteError` and `message.outcome: nack` for the same `message.messageId`.
**Steps:**

1. For a read failure: verify the service account has `storage.objects.get` on the archive bucket, and that the object referenced by the notification's `bucketId`/`objectId` actually exists — if the ingestor's own write failed, it won't. For a rule with `rewriteBody: true`, the sanitizer also reads the raw body the record points at. If that read fails, no record is written: the message is retried, so a record never points at a body the policy says must be rewritten.
2. For a write failure: verify `storage.objects.create` on the archive bucket, and check bucket quotas/availability.
3. To see which storage call failed and with what status code, set `LOGGING_LEVEL=debug` and filter on the same `message.messageId`.
4. Once the underlying issue is fixed, the next redelivery should succeed.

The same pattern with `error._tag: Defect` is an unexpected bug in this service. The message is nacked and eventually dead-lettered, and the service keeps processing other messages. The failure's cause carries the stack trace.

### Policy document unreadable

**Symptom:** the service logs a fatal `Sanitizer stopped` before any `Sanitizer policy loaded` line.
**Steps:**

1. In development, verify `SANITIZER_POLICY_PATH` points to a valid, readable YAML file.
2. In dev and prod, the file is the sanitizer-policy secret mounted at `/config/sanitizer-policy.yml` by `ingestion-infra`. Verify the service's revision mounts the secret's latest version, and that the service account can access the secret.
3. Validate the YAML against `src/contracts/SanitizerPolicy.ts` — a malformed policy fails schema decoding at startup.

### Message-queue-level errors

**Symptom:** the service logs a fatal `Sanitizer stopped` after it has been processing messages, and exits.
**Cause:** the message queue itself reported an error. It's handled by a separate fiber from per-message processing, so unlike a single message's failure it stops the service. The HTTP feeder rejects a malformed push request with a `400` (visible at `debug`) rather than failing the queue.
**Steps:** read the fatal line's cause, and restart the service once the underlying issue (permissions, connectivity) is resolved.

## Checking output locally

```bash
ls "$STORAGE_OUTPUT_DIR"
```

Sanitizer records are under `v1/records/sanitizer/`, and rewritten bodies under `v1/sanitized/`.
To see what a rewrite changed, compare a sanitized body with the raw body its record's
`input.raw` points at.
