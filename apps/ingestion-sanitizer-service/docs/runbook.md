# Runbook

This document covers how to interpret sanitizer output and diagnose common failure modes.

## Interpreting Logs

The sanitizer uses structured logging via the Effect logger. Each log line includes contextual annotations attached during message processing.

### Per-message annotations

Present on log lines for individual message processing:

| Annotation | Description                                  |
| ---------- | -------------------------------------------- |
| `url`      | URL from the ingestor record being processed |
| `source`   | Source name from the ingestor record         |

### Key log messages

| Message                                                              | Level | Meaning                                                             |
| -------------------------------------------------------------------- | ----- | ------------------------------------------------------------------- |
| `Starting sanitizer...`                                              | info  | Service started and policy loaded successfully                      |
| `Fetched data for {url} with content-type {ct}`                      | info  | `data_fetched` record received; about to evaluate policy            |
| `Policy decision for {url}: label={l}, actions={a}, rewriteBody={b}` | info  | Policy evaluated; shows the assigned label and sanitization actions |
| `Wrote sanitizer record for {url} to pointer {p}`                    | info  | Record archived successfully                                        |
| `Fetch attempt for {url} failed with error: {e}`                     | info  | `no_response` record received; acknowledged without output          |
| `Message queue error: {cause}`                                       | error | Subscription-level error; service will terminate                    |

## Diagnosing Failures

### High volume of parse failures

**Symptom**: Messages are being acknowledged without producing sanitizer records; parse errors appear in logs.

**Cause**: The message body cannot be decoded as a valid `IngestionAttempted` event. Parse failures result in `ack` — the message is discarded and not retried.

**Steps**:

1. Inspect a raw message from the Pub/Sub subscription to verify its structure matches the `IngestionAttempted` schema in `@news-research/contracts`.
2. Check whether the ingestor was recently updated with a schema change that is not yet reflected in the contracts package.
3. If the upstream schema has changed, update the contracts package and redeploy the sanitizer.

### Messages not being processed (nack loop)

**Symptom**: Messages are being redelivered repeatedly; processing errors appear in logs.

**Cause**: A non-parse error is occurring during record processing (archive read, policy evaluation, or archive write). These result in `nack` — the message is returned to the subscription and redelivered.

**Steps**:

1. Check the error log for the specific error type (`ArchiverError`, etc.).
2. Diagnose the root cause using the sections below.
3. Once the underlying issue is resolved, messages will be processed on the next redelivery.

### Archive read failures

**Symptom**: Processing errors with an `ArchiverError` when reading an ingestor record.

**Steps**:

1. Verify the service account has `storage.objects.get` permission on the archive bucket.
2. Check that `ARCHIVE_BUCKET_NAME` (prod) or `MESSAGE_QUEUE_INPUT_DIR` (dev) is correctly configured.
3. Verify the object referenced by the event's `pointer` field exists in the bucket. If the ingestor's archiving step failed for that record, the object may not be present.

### Archive write failures

**Symptom**: Processing errors with an `ArchiverError` when writing a sanitizer record.

**Steps**:

1. Verify the service account has `storage.objects.create` permission on the archive bucket.
2. Check that `ARCHIVE_BUCKET_NAME` (prod) or `SANITIZER_OUTPUT_DIR` (dev) is correctly configured.
3. Check GCS bucket quotas and storage availability.
4. Write failures result in `nack` — the affected message will be redelivered once the underlying issue is resolved.

### Policy document unreadable

**Symptom**: Service fails to start; error loading the policy document.

**Steps**:

1. In development, verify that `SANITIZER_POLICY_PATH` points to a valid, readable YAML file.
2. In production, verify that `ASSETS_BUCKET_NAME` and `SANITIZER_POLICY_URI` are set correctly and that the object exists in GCS.
3. Verify the service account has `storage.objects.get` permission on the assets bucket.
4. Validate the policy YAML against the schema in `src/data/SanitizerPolicy.ts` — a malformed policy will fail schema decoding at startup.

### Subscription-level errors

**Symptom**: Log line `Message queue error: {cause}` followed by service termination.

**Cause**: The Pub/Sub subscription itself encountered an error (e.g. permission denied, subscription deleted, connectivity failure).

**Steps**:

1. Verify the service account has `pubsub.subscriptions.consume` permission on the subscription.
2. Check that `PUBSUB_SUBSCRIPTION_NAME` matches the subscription provisioned by the infra project.
3. Verify the subscription exists and is attached to the correct topic.
4. Restart the service once the underlying issue is resolved — it will resume consuming from the subscription's unacknowledged message backlog.

## Checking Output Locally

After a local run, inspect the output directory:

```bash
# View archived sanitizer records (YAML)
ls tmp/sanitizer-output/*.yml

# View accompanying metadata files (JSON)
ls tmp/sanitizer-output/*.metadata.json
```

Each `.yml` file contains a `SanitizerRecord`. The accompanying `.metadata.json` file contains the flat metadata fields written as GCS object metadata in production.
