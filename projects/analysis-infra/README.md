# analysis-infra

Infrastructure for the analysis domain: a staging BigQuery table fed from the ingestion pipeline's output, and a curated BigQuery table holding one row per fact check, merged from staging on a schedule. Provisioned via Pulumi, depending on [core-infra](../core-infra/README.md) for the platform's shared identity, artifact registry, and the staging bucket/topic the ingestion pipeline writes to.

## Deployment

```bash
nx preview analysis-infra --stack=<dev|prod>   # Preview changes
nx deploy analysis-infra --stack=<dev|prod>    # Apply changes
```

`core-infra` must already be deployed to the same stack before this project can deploy. See [docs/bootstrap.md](./docs/bootstrap.md) for initial setup and [docs/runbook.md](./docs/runbook.md) for subsequent deployments and troubleshooting.

## What this project provisions

### Consumed from core-infra

Read via a `StackReference` in `src/config.ts`, not owned here:

| Output read                                          | Used for                                                                                                                                                           |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `gcpProject` / `gcpRegion`                           | Scoping a second provider (`coreProvider`) to grant IAM on core-infra's own resources                                                                              |
| `stagingStorageTopicName`                            | What the staging loader's push subscription subscribes to                                                                                                          |
| `stagingStorageBucketName`                           | Granting the staging loader's service account read access to core-infra's staging bucket (not passed as an env var — the bucket is determined per-message instead) |
| `artifactRegistryLocation` / `Name` / `RepositoryId` | Resolving the staging loader's container image                                                                                                                     |

This project does **not** own or manage CMEK keys, the workload identity pool, or the GitHub
Actions CI/CD identity — those are core-infra's.

### GCP service enablement

| Service                                              | API                                                                     | Purpose                                                       |
| ---------------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------- |
| Compute Engine                                       | `compute.googleapis.com`                                                | Required before enabling several other APIs                   |
| Cloud Resource Manager                               | `cloudresourcemanager.googleapis.com`                                   | Project-level IAM and metadata                                |
| Artifact Registry                                    | `artifactregistry.googleapis.com`                                       | Pulling the staging loader's image from core-infra's registry |
| Cloud Run                                            | `run.googleapis.com`                                                    | The staging loader service                                    |
| Cloud Storage                                        | `storage.googleapis.com`                                                | The dead-letter bucket                                        |
| Pub/Sub                                              | `pubsub.googleapis.com`                                                 | The staging loader's push subscription and dead-letter topic  |
| Cloud Observability / Trace / Telemetry / Monitoring | `observability`, `cloudtrace`, `telemetry`, `monitoring.googleapis.com` | Logging, tracing, metrics and alerts                          |

### Staging dataset

BigQuery dataset `analysis_staging`, table `fact_checks` — schema imported from
`@fact-check-database/core-contracts/staging/v1` (`FactChecksTableDBSchema`), the same canonical schema
`core-infra` uploads for `ingestion-extractor` to write against. Partitioned by `extracted_at`
(daily, 7-day partition expiration).

Both this table and the curated one are encrypted with core-infra's BigQuery key
(`bigQueryKeyId`), a customer-managed key, and each dataset names that key as its default for any
table created later. BigQuery encrypts and decrypts as its own service agent, which this stack
grants use of the key. The loader, the scheduled query and research readers need no access to it.
Removing the grant or disabling the key makes the tables unreadable, which is the revocation
switch for this data. See [docs/iam-model.md](./docs/iam-model.md#encryption-key-grant).

Fed by a Cloud Run **service** (`analysis-loader`), which receives work via a push subscription
on core-infra's staging topic (OIDC-authenticated), writes rows into this table, and — on
delivery failure after 5 attempts — routes to a dead-letter topic archived into a dedicated
dead-letter bucket.

Both subscriptions, the loader's and the dead-letter archive's, are set never to expire
(`expirationPolicy.ttl: ''`). Pub/Sub deletes a subscription that has had no activity for 31 days unless told otherwise, and a healthy pipeline can leave a dead-letter archive subscription idle for longer than that.

| Output                                                                                                | Purpose                                         |
| ----------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| `stagingDatasetId` / `stagingFactChecksTableId` / `stagingTableRef`                                   | Identify the dataset/table                      |
| `loaderServiceName` / `loaderSubscriptionName`                                                        | The Cloud Run service and its push subscription |
| `loaderDeadletterTopicName` / `loaderDeadletterTopicArchiveSubscriptionName` / `deadletterBucketName` | The failure path                                |
| `loaderInvokerServiceAccountEmail`                                                                    | The identity Pub/Sub uses to push to the loader |
| `loaderBatchesLoadedCounterMetricType`                                                                | Custom metric for batches loaded                |

### Curated dataset

BigQuery dataset `analysis_curated`, table `fact_checks` — schema hand-written here. Unlike the
staging schema, nothing else in the repo consumes this shape in code (its only other reference is
`research-infra`'s marts view, a SQL string against a stack-output table ref, not a TypeScript
decode/encode boundary), so there's no shared `core-contracts` schema to import from. Partitioned
by `extracted_at` (monthly, no expiration).

Fed by a **BigQuery Data Transfer Service scheduled query** (not a Cloud Run job) running every 6
hours. Staging is an observation log — the same fact check appears once for every fetch that
listed it — and this `MERGE` collapses those observations into **one row per fact check**:

- **Identity:** `fact_check_id` is computed by the extractor and read from staging as-is — a hash
  of source id + article URL, excluding the title so a headline edit doesn't create a second fact
  check. See [docs/fact-check-lifecycle.md](../../docs/fact-check-lifecycle.md) for the definition.
- **Latest version wins:** within a run, only the most recent observation (by `fetched_at`) of
  each fact check is used. An existing curated row is updated in place when a newer observation
  carries a different content version (`fact_check_sha256`); an older
  observation never overwrites a newer one. Because of this, `extracted_at` on a curated row is
  when its _current_ version was extracted, not when the fact check was first seen.
- **Window:** each run reads the last 7 days of staging (the staging partition expiry). The merge
  is idempotent, so overlapping windows are harmless and a failed or skipped run is caught up by
  the next one.
- **No delete path:** fact checks that disappear from a feed stay in the curated table.
- **Policy provenance:** `sanitizer_policy_version` is the revision of the sanitizer policy behind
  the row's current content version. It is set on insert and whenever the row is updated, and is
  `NULL` for rows whose source record predates the field. It lets an id change be traced to the
  policy change that caused it (see the sanitizer runbook's
  [Changing the policy](../ingestion-sanitizer/docs/runbook.md#changing-the-policy)).

Rows curated before this identity scheme was introduced (2026-09) keep their original ids — a hash
of `source id + canonical URL (or feed URL) + title` — and were not backfilled, so those older
fact checks can appear more than once (see [known-issues.md](./docs/known-issues.md)).

| Output                                                              | Purpose                                                                                                                                    |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `curatedDatasetId` / `curatedFactChecksTableId` / `curatedTableRef` | Identify the dataset/table — `curatedTableRef` is read by `research-infra`, the only cross-project consumer of any output this project has |
| `transferJobName`                                                   | The scheduled query job                                                                                                                    |

### Alerting

Two Cloud Monitoring alert policies, built on metrics Pub/Sub and the BigQuery Data Transfer
Service publish themselves:

- **Batches dead-lettered:** the staging loader's subscription gave up on a batch notification,
  so that batch was not loaded.
- **Curated transfer run failed:** a run of the scheduled query that merges staging into the
  curated table finished without succeeding.

When `analysis:alertEmail` is set, incidents are emailed to that address through one notification
channel. When it is unset, the policies still exist and their incidents show in the console only.
See [docs/runbook.md](./docs/runbook.md#alerts) for what each alert means and what to check.

| Output                                                               | Purpose                                                                    |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `loaderDeadLetterAlertPolicyName` / `transferFailureAlertPolicyName` | The two alert policies                                                     |
| `alertEmailChannelName`                                              | The email notification channel. Absent when `analysis:alertEmail` is unset |

## Consuming these outputs

`research-infra` reads exactly one output from this stack — `curatedTableRef` — via its own
`StackReference`. Nothing else in this repo reads any other output here. Treat `curatedTableRef`
as a stable interface for that reason; the rest are informational (dashboard/CLI/CI use only).

## Related documentation

| Document                                 | Purpose                                                                |
| ---------------------------------------- | ---------------------------------------------------------------------- |
| [docs/bootstrap.md](./docs/bootstrap.md) | Project-specific setup delta beyond core-infra's central bootstrap doc |
| [docs/runbook.md](./docs/runbook.md)     | Stack configuration, deployment, and troubleshooting                   |
| [docs/iam-model.md](./docs/iam-model.md) | Service accounts, roles, and the one cross-project grant               |
