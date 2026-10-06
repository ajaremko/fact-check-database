# Infrastructure Runbook

Operational procedures for deploying and troubleshooting `ingestion-infra`. See the
[README](../README.md) for what this project provisions.

## Configuration

Reference for the `ingestion` Pulumi config namespace, read by `src/config.ts`. Set with
`pulumi config set ingestion:<key> <value> --stack=<dev|prod>` (or directly in
`Pulumi.<stack>.yml`).

| Key                                    | Description                                                                                                                                          | Required            | dev                                     | prod                            |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- | --------------------------------------- | ------------------------------- |
| `ingestion:coreStackName`              | The core-infra stack this project reads a `StackReference` from                                                                                      | Yes                 | `alfredsyoung/fact-check-database-core` | same                            |
| `ingestion:project`                    | GCP project ID this stack deploys into                                                                                                               | Yes                 | `fact-check-database-dev`               | `fact-check-database-ingestion` |
| `ingestion:region`                     | GCP region for regional resources                                                                                                                    | Yes                 | `us-central1`                           | `us-central1`                   |
| `ingestion:tag`                        | Docker image tag for all three services                                                                                                              | No                  | set per-deploy                          | set per-deploy                  |
| `ingestion:ingestorSchedule`           | Cron schedule for the ingestor job. Unset means manual-trigger only                                                                                  | No                  | `0 */4 * * *`                           | `0 */4 * * *`                   |
| `ingestion:extractorSchedule`          | Cron schedule for the extractor job. Unset means manual-trigger only                                                                                 | No                  | `0 */12 * * *`                          | `0 */12 * * *`                  |
| `ingestion:logLevel`                   | Log level passed to all three services                                                                                                               | Yes                 | `trace`                                 | `info`                          |
| `ingestion:logRetentionDays`           | Retention on the project's `_Default` log bucket                                                                                                     | Yes                 | `1`                                     | `30`                            |
| `ingestion:eventLogRetentionDays`      | Age-based deletion window for the event log bucket. Unset disables the rule; a code comment recommends leaving it unset in prod                      | No                  | set in dev                              | unset                           |
| `ingestion:deadletterRetentionDays`    | Age-based deletion window for the deadletter bucket. Same unset-in-prod recommendation                                                               | No                  | set in dev                              | unset                           |
| `ingestion:deadletterSoftDeleteDays`   | Soft-delete window on the deadletter bucket. A code comment recommends this be _set_ in production                                                   | No                  | unset                                   | `30`                            |
| `ingestion:archiveNearlineAfterDays`   | Age in days at which an archive object moves to Nearline storage. Unset means it never does                                                          | No                  | unset                                   | `30`                            |
| `ingestion:archiveColdlineAfterDays`   | Age in days at which an archive object moves to Coldline storage. Unset means it never does. Must be greater than the Nearline age when both are set | No                  | unset                                   | `90`                            |
| `ingestion:alertEmail`                 | Email address that receives alert notifications. Unset means the alert policies exist but notify nobody. See [Alerts](#alerts)                       | No                  | unset                                   | set per deployment              |
| `ingestion:extractorBacklogAlertHours` | Age in hours of the oldest unextracted record at which the backlog alert fires                                                                       | No, default `24`    | unset                                   | unset                           |
| `ingestion:alertAutoCloseSeconds`      | How long an alert incident stays open after its signal stops reporting data. Accepts 1800 to 604800                                                  | No, default `3600`  | unset                                   | unset                           |
| `ingestion:forceDestroyStorage`        | Whether `pulumi destroy` may delete non-empty buckets, including the raw archive bucket                                                              | No, default `false` | `true`                                  | `false`                         |
| `ingestion:retainStorageOnDelete`      | Whether buckets survive `pulumi destroy` instead of being deleted with the stack, including the raw archive bucket                                   | No, default `true`  | `false`                                 | `true`                          |

### Archive storage classes

The archive bucket is a permanent record that is rarely read once the pipeline has processed it.
`archiveNearlineAfterDays` and `archiveColdlineAfterDays` move its objects to cheaper storage
classes as they age. Nothing is deleted.

- **Both unset** (dev): every object stays in Standard storage.
- **Both set** (prod): an object moves to Nearline at the first age and to Coldline at the second.
- **Only the Coldline age set:** objects move straight from Standard to Coldline.
- The rules cover the whole bucket: raw bodies, sanitized copies, and ingestor and sanitizer
  records.
- After a change, Cloud Storage applies the rules to existing objects within about a day.

Two costs to keep in mind when choosing ages:

- **Minimum storage duration.** Nearline bills at least 30 days and Coldline at least 90. Leave at
  least 30 days between the two ages, or the unused Nearline days are still charged. The deploy
  warns when the gap is shorter.
- **Retrieval.** Reading an object in Nearline or Coldline costs a per-gigabyte fee that Standard
  does not have. Routine processing is unaffected, since the sanitizer and extractor read an
  object within days of its fetch. A replay or an audit of old fetches pays it.

## Commands

```bash
nx preview ingestion-infra --stack=<dev|prod>   # review changes
nx deploy ingestion-infra --stack=<dev|prod>    # apply them
nx refresh ingestion-infra --stack=<dev|prod>   # reconcile state with reality
nx destroy ingestion-infra --stack=<dev|prod>   # tear down — see the storage-config caveats above first
nx output ingestion-infra --stack=<dev|prod>    # print stack outputs
```

## Deployment ordering

`core-infra` must be deployed first — this project fails to deploy without it (the `StackReference`
resolves at this project's deploy time). Nothing else in this repo currently depends on
`ingestion-infra` deploying first; `analysis-infra` depends on `core-infra` directly, not on this
stack (see the README's "Consuming these outputs").

## Updating the source list or sanitizer policy

There are no encryption keys or long-lived credentials owned by this project to rotate. The
closest equivalent operational procedure is updating the two Secret Manager-backed config
documents the ingestor and sanitizer actually read at runtime:

1. Edit the per-stack file: `src/assets/sources.<dev|prod>.yml` (target list, in the format the [ingestor runbook](../../ingestion-ingestor/docs/runbook.md#target-list-format) describes) or
   `src/assets/sanitizer-policy.<dev|prod>.yml` (sanitizer policy).
2. Redeploy (`nx deploy ingestion-infra --stack=<dev|prod>`) — this creates a new Secret Manager
   version and updates the Cloud Run job/service to mount it.

## Revoking access

No service account in this project holds a downloaded key — every one is attached directly to its
Cloud Run job/service or used only for invocation, so there's nothing to rotate the way
`core-infra`'s root credentials need to be. To revoke a service's access, remove its IAM binding
(see [docs/iam-model.md](./iam-model.md)) or delete the service account if decommissioning the
service entirely.

## Alerts

The stack creates three Cloud Monitoring alert policies. Each opens an incident when its condition
is met. When `ingestion:alertEmail` is set, the incident is also emailed to that address. When it
is unset, as in dev, incidents appear only under Alerting in the Cloud console.

| Alert                                  | Signal                                                                             | Fires when                                                     |
| -------------------------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Ingestion: extractor backlog is ageing | Age of the oldest unacknowledged message on the extractor subscription             | It exceeds `ingestion:extractorBacklogAlertHours` (default 24) |
| Ingestion: messages dead-lettered      | Messages the sanitizer or extractor subscription forwards to its dead-letter topic | Any message is forwarded                                       |
| Ingestion: job execution failed        | Cloud Run's count of failed executions of the ingestor or extractor job            | Any execution fails                                            |

All three read metrics that Pub/Sub and Cloud Run publish themselves, so they work even when a
service fails before it can log. For the last two, the incident's condition name says which stage
is affected.

An incident on the backlog alert closes when the age drops back under the threshold. The other
two signals only report when a failure happens, so their incidents close once
`ingestion:alertAutoCloseSeconds` have passed since the last one (an hour by default).

### Extractor backlog is ageing

**Meaning:** sanitizer records are waiting longer than expected for the extractor. Pub/Sub drops
a message once it is older than the subscription's 7-day retention, so a backlog left alone ends
in records that are never extracted.

**Steps:**

1. List the extractor job's recent executions. A missing execution points at the schedule (see
   [A scheduled job never runs](#a-scheduled-job-never-runs)). A failed one will also have raised
   the job-failure alert.
2. If executions are succeeding, compare the "Unacked Messages" dashboard panel with the
   extractor's per-run limit (`MESSAGE_BATCH_SIZE`). A backlog larger than the limit means records
   arrive faster than they are taken.
3. To clear a backlog, execute the extractor job manually until the panel returns to its normal
   level: `gcloud run jobs execute ingestion-extractor-job --region=<region> --project=<project>`.

The threshold suits a 12-hour extractor schedule, where the age normally climbs to about 12 hours
and drops. Raise `ingestion:extractorBacklogAlertHours` if the schedule is made less frequent.

### Messages dead-lettered

**Meaning:** a message failed 5 delivery attempts. The record it points to was not processed by
that stage, and nothing replays it automatically (see [known-issues.md](./known-issues.md)).

**Steps:**

1. Read the affected stage's error logs around the time of the incident.
2. Find the message in the deadletter bucket, under `sanitizer-deadletter/` or
   `extractor-deadletter/`. Its attributes name the archive object it points to. A message
   dead-lettered before October 2026 may be missing: the archive subscription could expire then,
   and dev's had.
3. See [Pub/Sub delivery failures](#pubsub-delivery-failures) for the delivery-side checks.

### Job execution failed

**Meaning:** an ingestor or extractor execution finished as failed.

- An ingestor failure means the run crashed, or fewer sources succeeded than its success
  threshold allows. The next scheduled run fetches every source again.
- An extractor failure means no batch was written. Its messages are redelivered to the next run
  once the 600-second ack deadline passes.

**Steps:**

1. Open the failed execution in Cloud Run and read its logs. The jobs log a fatal
   `... job stopped` or `... failed to start` line with the cause.
2. If there is no fatal line, the container was killed before it could log. Check the execution's
   exit reason for an out-of-memory kill.
3. For image and secret problems, see [Image pull failures](#image-pull-failures) and
   [Secret access errors](#secret-access-errors).

### What the alerts do not cover

- An ingestor that never starts. No execution means no failed execution, and nothing downstream
  ages. The extractor is covered, because its backlog ages when it does not run.
- The sanitizer service failing outright, except through the dead-letter alert once its messages
  exhaust their retries.
- The analysis stack, which has its own alerts (see its
  [runbook](../../analysis-infra/docs/runbook.md#alerts)), and the website stack, which has none
  yet.

## Diagnosing failures

### A scheduled job never runs

**Symptom:** the ingestor or extractor job has no recent executions, and there's no Cloud
Scheduler job for it.
**Cause:** `ingestion:ingestorSchedule`/`extractorSchedule` is unset for this stack — both
services fall back to manual-trigger-only when their schedule config is empty.
**Resolution:** set the schedule config and redeploy, or trigger the job manually:
`gcloud run jobs execute ingestion-ingestor-job --region=<region> --project=<project>` (or
`ingestion-extractor-job`).

### Image pull failures

**Symptom:** a Cloud Run job/service revision fails to start with a permission or not-found error
pulling its image.
**Steps:**

1. Confirm `ingestion:tag` is set to a real, published tag — if unset, the service silently falls
   back to a public placeholder image (`gcr.io/google-samples/hello-app`), which will look like it
   deployed but isn't running the real service.
2. Confirm the Cloud Run service agent has `roles/artifactregistry.reader` on core-infra's
   registry (`src/iam.ts`'s `cloudRunArtifactRegistryReader`) — this is a cross-project grant and
   the one place a permissions issue here isn't local to this project.

### Pub/Sub delivery failures

**Symptom:** the sanitizer isn't receiving new work, or the extractor's subscription backlog is
growing.
**Steps:**

1. For the sanitizer (push subscription on the ingestor's topic): confirm the push invoker service
   account has `roles/run.invoker` on the sanitizer service, and check the subscription's
   dead-letter topic (`ingestion-sanitizer-deadletter-topic`, reachable via its own archive
   subscription into the deadletter bucket under `sanitizer-deadletter/`) for messages that
   exhausted delivery attempts.
2. For the extractor (pull subscription on the sanitizer's topic): check
   `ingestion-extractor-deadletter-topic` (archived to `extractor-deadletter/`) the same way — 5
   failed deliveries sends a message there instead of retrying indefinitely.

### Secret access errors

**Symptom:** the ingestor job or sanitizer service fails to start, unable to read its mounted
config.
**Steps:**

1. Confirm the service's own service account has `roles/secretmanager.secretAccessor` on the
   relevant secret (`ingestion-source-list` for the ingestor, `ingestion-sanitizer-policy` for the
   sanitizer) — see [docs/iam-model.md](./iam-model.md).
2. Confirm a secret version actually exists for the current stack (each stack's version is created
   from `src/assets/sources.<stack>.yml` / `sanitizer-policy.<stack>.yml` at deploy time).

## Checking output locally

```bash
nx output ingestion-infra --stack=<dev|prod>
```
