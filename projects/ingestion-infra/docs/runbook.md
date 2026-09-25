# Infrastructure Runbook

Operational procedures for deploying and troubleshooting `ingestion-infra`. See the
[README](../README.md) for what this project provisions.

## Configuration

Reference for the `ingestion` Pulumi config namespace, read by `src/config.ts`. Set with
`pulumi config set ingestion:<key> <value> --stack=<dev|prod>` (or directly in
`Pulumi.<stack>.yml`).

| Key                                  | Description                                                                                                                     | Required            | dev                                     | prod                            |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- | ------------------- | --------------------------------------- | ------------------------------- |
| `ingestion:coreStackName`            | The core-infra stack this project reads a `StackReference` from                                                                 | Yes                 | `alfredsyoung/fact-check-database-core` | same                            |
| `ingestion:project`                  | GCP project ID this stack deploys into                                                                                          | Yes                 | `fact-check-database-dev`               | `fact-check-database-ingestion` |
| `ingestion:region`                   | GCP region for regional resources                                                                                               | Yes                 | `us-central1`                           | `us-central1`                   |
| `ingestion:tag`                      | Docker image tag for all three services                                                                                         | No                  | set per-deploy                          | set per-deploy                  |
| `ingestion:ingestorSchedule`         | Cron schedule for the ingestor job. Unset means manual-trigger only                                                             | No                  | `0 */4 * * *`                           | `0 */4 * * *`                   |
| `ingestion:extractorSchedule`        | Cron schedule for the extractor job. Unset means manual-trigger only                                                            | No                  | `0 */12 * * *`                          | `0 */12 * * *`                  |
| `ingestion:logLevel`                 | Log level passed to all three services                                                                                          | Yes                 | `info` (or as configured)               | `info`                          |
| `ingestion:logRetentionDays`         | Retention on the project's `_Default` log bucket                                                                                | Yes                 | —                                       | —                               |
| `ingestion:eventLogRetentionDays`    | Age-based deletion window for the event log bucket. Unset disables the rule; a code comment recommends leaving it unset in prod | No                  | set in dev                              | unset                           |
| `ingestion:deadletterRetentionDays`  | Age-based deletion window for the deadletter bucket. Same unset-in-prod recommendation                                          | No                  | set in dev                              | unset                           |
| `ingestion:deadletterSoftDeleteDays` | Soft-delete window on the deadletter bucket. A code comment recommends this be _set_ in production                              | No                  | unset                                   | `30`                            |
| `ingestion:forceDestroyStorage`      | Whether `pulumi destroy` may delete non-empty buckets, including the raw archive bucket                                         | No, default `false` | `true`                                  | `true`                          |
| `ingestion:retainStorageOnDelete`    | Whether buckets survive `pulumi destroy` instead of being deleted with the stack, including the raw archive bucket              | No, default `true`  | `false`                                 | `false`                         |

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

1. Edit the per-stack file: `src/assets/sources.<dev|prod>.csv` (target list) or
   `src/assets/sanitizer-policy.<dev|prod>.yml` (sanitizer policy).
2. Redeploy (`nx deploy ingestion-infra --stack=<dev|prod>`) — this creates a new Secret Manager
   version and updates the Cloud Run job/service to mount it.

## Revoking access

No service account in this project holds a downloaded key — every one is attached directly to its
Cloud Run job/service or used only for invocation, so there's nothing to rotate the way
`core-infra`'s root credentials need to be. To revoke a service's access, remove its IAM binding
(see [docs/iam-model.md](./iam-model.md)) or delete the service account if decommissioning the
service entirely.

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
   from `src/assets/sources.<stack>.csv` / `sanitizer-policy.<stack>.yml` at deploy time).

## Checking output locally

```bash
nx output ingestion-infra --stack=<dev|prod>
```
