# Runbook

This document covers how to interpret ingestor run output and diagnose common failure modes.

## Interpreting Run Logs

The ingestor uses structured logging via the Effect logger. Each log line includes contextual annotations attached at different scopes.

### Run-level annotations

Present on all log lines for the `processTargets` scope:

| Annotation    | Description                            |
| ------------- | -------------------------------------- |
| `runId`       | UUID for this run                      |
| `startedAt`   | Unix timestamp (ms) when the run began |
| `concurrency` | `MAX_CONCURRENCY` value in effect      |

### Target-level annotations

Present on log lines for individual target processing:

| Annotation   | Description                           |
| ------------ | ------------------------------------- |
| `source`     | Source name from the target list      |
| `url`        | URL being fetched                     |
| `collection` | Collection label from the target list |

### Key log messages

| Message                                   | Level | Meaning                                                         |
| ----------------------------------------- | ----- | --------------------------------------------------------------- |
| `Processing {n} targets`                  | info  | Run started with `n` targets loaded from the target list        |
| `Processing target {i}`                   | info  | Target `i+1` has started processing                             |
| `Processed {k} of {n} targets`            | info  | Run complete; `k` targets succeeded out of `n` total            |
| `Success rate {r} is below threshold {t}` | error | Run failed: too many targets did not produce a successful fetch |

## Diagnosing Failures

### Success rate below threshold

**Symptom**: The run exits with an error and logs `Success rate {r} is below threshold {t}`.

**Causes**:

- Multiple sources are unreachable (network issues, DNS failures, upstream outages)
- The target list contains stale or invalid URLs
- `SUCCESS_THRESHOLD` is set higher than the current reliability of the source set

**Steps**:

1. Check the archived records for failed sources. `NoResponseRecord` objects in the archive include an `error` field with the failure reason.
2. In production, inspect the `records/` prefix in the archive bucket, filtering by the failing `runId`.
3. If the failures are transient (upstream outage), the next scheduled run should recover automatically.
4. If a source is permanently unreachable, remove it from the target list.
5. If the threshold is misconfigured, adjust `SUCCESS_THRESHOLD` in the environment configuration.

### Fetch failures for specific sources

**Symptom**: Some targets log errors but the overall run succeeds (success rate above threshold).

**Steps**:

1. Examine the `error` annotation on the error log for the failing source.
2. Common causes:
   - `ECONNREFUSED` / `ENOTFOUND` — DNS or connectivity issue with the source host
   - `ETIMEDOUT` — source is slow or unresponsive
   - Non-2xx HTTP status (e.g. 403, 404, 500) — source responded but with an error status
3. All fetch failures are archived as `NoResponseRecord` objects, which can be inspected in the archive.
4. If failures are consistent across runs, consider removing the source from the target list.

### Archive failures

**Symptom**: Run fails with an `ArchiverError` for one or more targets.

**Steps**:

1. In production, verify that the service account has `storage.objects.create` permission on the archive bucket.
2. Check that `ARCHIVE_BUCKET_NAME` (prod) or `STORAGE_OUTPUT_DIR` (dev) is correctly configured.
3. Check GCS bucket quotas and storage availability.
4. Archive failures abort processing for the affected target. Other targets continue.

### Publisher failures

**Symptom**: Run fails with a `PublisherError` for one or more targets.

**Steps**:

1. In production, verify that the service account has `pubsub.topics.publish` permission on the configured topic.
2. Check that `PUBSUB_TOPIC_NAME` matches the topic provisioned by the infra project.
3. Pub/Sub publish failures are per-target. The target's archive record has already been written at this point, so the data is not lost — but the downstream sanitizer will not receive the event for that target.

### Target list unreadable

**Symptom**: Run fails immediately with a `TargetListError` and logs no target count.

**Steps**:

1. In development, verify that `TARGET_LIST_PATH` points to a valid, readable CSV file.
2. In production, verify that `TARGET_LIST_BUCKET_NAME` and `TARGET_LIST_URI` are set correctly and that the object exists in GCS.
3. Verify the CSV has the required header row: `collection,name,url`.
4. Check that the service account has `storage.objects.get` permission on the target list bucket.

## Checking Run Output Locally

After a local run, inspect the output directories:

```bash
# View archived records (YAML)
ls tmp/ingestor-archiver-output/*.yml

# View published events (JSON)
ls tmp/ingestor-publisher-output/
```

Each `.yml` file contains a structured `DataFetchedRecord` or `NoResponseRecord`. The accompanying `.metadata.json` file contains the flat metadata fields.
