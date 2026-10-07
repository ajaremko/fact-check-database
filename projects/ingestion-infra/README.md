# ingestion-infra

Infrastructure for the ingestion pipeline: the scheduled ingestor job, the always-on sanitizer service, the scheduled extractor job, and the storage/messaging that connects them. Provisioned via Pulumi, depending on [core-infra](../core-infra/README.md) for the platform's shared identity, encryption key, and Artifact Registry.

## Deployment

```bash
nx preview ingestion-infra --stack=<dev|prod>   # Preview changes
nx deploy ingestion-infra --stack=<dev|prod>    # Apply changes
```

`core-infra` must already be deployed to the same stack before this project can deploy. See [docs/bootstrap.md](./docs/bootstrap.md) for initial setup and [docs/runbook.md](./docs/runbook.md) for subsequent deployments and troubleshooting.

## What this project provisions

### Consumed from core-infra

Read via a `StackReference` in `src/config.ts`, not owned here:

| Output read                                            | Used for                                                                              |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| `gcpProject` / `gcpRegion`                             | Scoping a second provider (`coreProvider`) to grant IAM on core-infra's own resources |
| `stagingStorageBucketName` / `stagingStorageTopicName` | Where the extractor writes its output batches                                         |
| `artifactRegistryLocation` / `Name` / `RepositoryId`   | Resolving each service's container image                                              |
| `gcsArchiveKeyId`                                      | Encrypting this project's raw archive bucket                                          |

This project does **not** own or manage CMEK keys, the workload identity pool, or the GitHub
Actions CI/CD identity — those are core-infra's, documented in its own
[docs/encryption.md](../core-infra/docs/encryption.md) and
[docs/iam-model.md](../core-infra/docs/iam-model.md).

### GCP service enablement

| Service                                              | API                                                                     | Purpose                                               |
| ---------------------------------------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------- |
| Compute Engine                                       | `compute.googleapis.com`                                                | Required before enabling several other APIs           |
| Cloud Resource Manager                               | `cloudresourcemanager.googleapis.com`                                   | Project-level IAM and metadata                        |
| Artifact Registry                                    | `artifactregistry.googleapis.com`                                       | Pulling container images from core-infra's registry   |
| Cloud Run                                            | `run.googleapis.com`                                                    | The ingestor/extractor jobs and the sanitizer service |
| Cloud Scheduler                                      | `cloudscheduler.googleapis.com`                                         | Triggering the ingestor and extractor jobs on a cron  |
| Cloud Storage                                        | `storage.googleapis.com`                                                | Archive, event-log, and deadletter buckets            |
| Pub/Sub                                              | `pubsub.googleapis.com`                                                 | Ingestor → sanitizer → extractor hand-off             |
| Cloud Observability / Trace / Telemetry / Monitoring | `observability`, `cloudtrace`, `telemetry`, `monitoring.googleapis.com` | Logging, tracing, the pipeline dashboard and alerts   |
| Secret Manager                                       | `secretmanager.googleapis.com`                                          | The source list and sanitizer policy documents        |

### Storage

| Bucket                        | Purpose                                                                                    | Notes                                                                                                                                                                                                                        |
| ----------------------------- | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ingestion-archive-bucket`    | Permanent store for raw fetch bodies, sanitized copies, and ingestor and sanitizer records | CMEK-encrypted with core-infra's key; never deleted. Objects move to Nearline and then Coldline as they age when `archiveNearlineAfterDays`/`archiveColdlineAfterDays` are set (prod), and stay in Standard when unset (dev) |
| `ingestion-event-log-bucket`  | Auto-archived copy of every message published to the ingestor and sanitizer topics         | Age-based deletion in dev only, via `eventLogRetentionDays`; unset (permanent) in prod by design                                                                                                                             |
| `ingestion-deadletter-bucket` | Messages that exhausted delivery attempts on the extractor's or sanitizer's subscription   | Age-based deletion plus optional soft-delete                                                                                                                                                                                 |

### Pipeline: ingestor → sanitizer → extractor

The three services chain together through storage notifications and Pub/Sub, not direct calls:

1. **Ingestor** (`ingestion-ingestor-job`, a Cloud Run Job) — triggered by Cloud Scheduler on
   `ingestion:ingestorSchedule` if set, otherwise run manually. Reads its target list from a Secret
   Manager secret and writes fetch records to the archive bucket.
2. That write triggers a GCS notification into the **ingestor topic**
   (`ingestion-ingestor-topic`), which auto-archives every message to the event log bucket and
   push-delivers to the sanitizer. The push subscription's ack deadline is 60s: a request still
   running at the deadline is redelivered, and each ingestor run publishes one notification per
   source at once, so the deadline must cover the sanitizer's slowest requests during that burst.
3. **Sanitizer** (`ingestion-sanitizer-service`, a Cloud Run Service, not a scheduled job) —
   receives work via an OIDC-authenticated push subscription, reads its policy from a Secret
   Manager secret, and writes sanitized records back to the same archive bucket. It scales between
   0 and 3 instances: to zero between ingestor runs, and capped at 3 so a burst of notifications
   can't start an unbounded number of instances. Each instance handles one message at a time, so
   the cap also bounds how fast a burst clears. In dev, a run's 52 notifications are served by 2
   instances with the slowest request at about 25 seconds, inside the 60s ack deadline. Revisit
   the cap if the source list grows several times over.
4. That write triggers a GCS notification into the **sanitizer topic**
   (`ingestion-sanitizer-topic`), which the extractor pulls from (with a dead-letter topic after 5
   failed delivery attempts). The subscription's ack deadline is 600s (the Pub/Sub maximum): the
   extractor acknowledges a batch only after writing its output, so the deadline has to cover the
   whole run — a shorter one causes messages still being processed to be redelivered and extracted
   again by the next run.
5. **Extractor** (`ingestion-extractor-job`, a Cloud Run Job) — triggered by Cloud Scheduler on
   `ingestion:extractorSchedule` if set. Writes extracted batches into **core-infra's** shared
   staging bucket for `analysis-infra`/`website-infra` to load. The job runs with 1 GiB of memory
   and takes up to 1,000 messages per run. The two are sized together: the extractor holds a whole
   batch in memory until it is written, so a larger `MESSAGE_BATCH_SIZE` needs more memory.

Three shared factory helpers in `src/shared/` standardize repeated pieces of this wiring rather
than each service reimplementing them: Cloud Scheduler → Cloud Run Job invocation
(`createJobScheduler`), a topic with an auto-archive-to-GCS subscription (`createArchivedTopic`),
and a subscription with a dead-letter topic (`createDeadletteredSubscription`).

Every subscription these helpers create is set never to expire (`expirationPolicy.ttl: ''`). Pub/Sub deletes a subscription that has had no activity for 31 days unless told otherwise, and a healthy pipeline can leave a dead-letter archive subscription idle for longer than that.

See [docs/iam-model.md](./docs/iam-model.md) for each service's service account and role grants.

### Dashboard

One Cloud Monitoring dashboard (`ingestion-dashboard`) with six sections: Overview (per-service
result breakdowns), Content Ingestion and Data Extraction (log-analytics tables per pipeline
stage), System Logs (raw log output from all pipeline components), Messaging (Pub/Sub
backlog/throughput), and Storage (bucket sizes).

Per-source figures come from two places. Fact checks extracted per source is a metric, shown in
the Overview's "Fact Checks Extracted by Source" panel. Per-source fetch results and sanitizer
decisions come from the log-based tables in the Content Ingestion section: the ingestor's and
sanitizer's metrics are not labelled by source, because a per-source label multiplies a metric's
time series by the length of the source list. Those tables cover the log retention period
(`ingestion:logRetentionDays`).

The definition is sent in the form Cloud Monitoring stores it, without default-valued properties
and without a description, so that a preview reports the dashboard as changed only when it is. See
[docs/runbook.md](./docs/runbook.md#the-daily-preview-reports-the-dashboard-as-changed).

### Alerting

Three Cloud Monitoring alert policies, built on metrics Pub/Sub and Cloud Run publish themselves:

- **Extractor backlog is ageing:** the oldest record waiting for the extractor is older than
  `ingestion:extractorBacklogAlertHours` (default 24).
- **Messages dead-lettered:** the sanitizer or extractor subscription gave up on a message.
- **Job execution failed:** an ingestor or extractor run finished as failed.

When `ingestion:alertEmail` is set, incidents are emailed to that address through one
notification channel. When it is unset, the policies still exist and their incidents show in the
console only. See [docs/runbook.md](./docs/runbook.md#alerts) for what each alert means and what
to check.

| Output                                                                                        | Purpose                                                                     |
| --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `extractorBacklogAlertPolicyName` / `deadLetterAlertPolicyName` / `jobFailureAlertPolicyName` | The three alert policies                                                    |
| `alertEmailChannelName`                                                                       | The email notification channel. Absent when `ingestion:alertEmail` is unset |

## Consuming these outputs

Unlike `core-infra`, nothing else in this repository reads `ingestion-infra`'s stack outputs via a
`StackReference` today — they exist for the dashboard, for `pulumi stack output`, and for CI, not
for another Pulumi project's config. If that changes, treat the affected outputs the same way
core-infra treats its own: a stable interface, breaking to rename or repoint.

## Related documentation

| Document                                       | Purpose                                                                |
| ---------------------------------------------- | ---------------------------------------------------------------------- |
| [docs/bootstrap.md](./docs/bootstrap.md)       | Project-specific setup delta beyond core-infra's central bootstrap doc |
| [docs/runbook.md](./docs/runbook.md)           | Stack configuration, deployment, and troubleshooting                   |
| [docs/iam-model.md](./docs/iam-model.md)       | Service accounts, roles, and the one cross-project grant               |
| [docs/known-issues.md](./docs/known-issues.md) | Accepted, long-lived gaps and deferred fixes                           |
