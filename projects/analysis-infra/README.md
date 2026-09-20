# analysis-infra

Infrastructure for the analysis domain: a staging BigQuery table fed from the ingestion pipeline's output, a curated BigQuery table deduped and appended from staging on a schedule, and a translation service. Provisioned via Pulumi, depending on [core-infra](../core-infra/README.md) for the platform's shared identity, artifact registry, and the staging bucket/topic the ingestion pipeline writes to.

## Deployment

```bash
nx preview analysis-infra --stack=<dev|prod>   # Preview changes
nx deploy analysis-infra --stack=<dev|prod>    # Apply changes
```

`core-infra` must already be deployed to the same stack before this project can deploy. See [docs/bootstrap.md](./docs/bootstrap.md) for initial setup and [docs/runbook.md](./docs/runbook.md) for subsequent deployments and troubleshooting.

## What this project provisions

### Consumed from core-infra

Read via a `StackReference` in `src/config.ts`, not owned here:

| Output read | Used for |
| --- | --- |
| `gcpProject` / `gcpRegion` | Scoping a second provider (`coreProvider`) to grant IAM on core-infra's own resources |
| `stagingStorageTopicName` | What the staging loader's push subscription subscribes to |
| `stagingStorageBucketName` | Passed to the staging loader as `STAGING_BUCKET_NAME` |
| `artifactRegistryLocation` / `Name` / `RepositoryId` | Resolving the staging loader's container image |

This project does **not** own or manage CMEK keys, the workload identity pool, or the GitHub
Actions CI/CD identity — those are core-infra's.

### GCP service enablement

| Service | API | Purpose |
| --- | --- | --- |
| Compute Engine | `compute.googleapis.com` | Required before enabling several other APIs |
| Cloud Resource Manager | `cloudresourcemanager.googleapis.com` | Project-level IAM and metadata |
| Artifact Registry | `artifactregistry.googleapis.com` | Pulling the staging loader's image from core-infra's registry |
| Cloud Run | `run.googleapis.com` | The staging loader and translation services |
| Cloud Storage | `storage.googleapis.com` | The dead-letter bucket |
| Pub/Sub | `pubsub.googleapis.com` | The staging loader's push subscription and dead-letter topic |
| Cloud Observability / Trace / Telemetry / Monitoring | `observability`, `cloudtrace`, `telemetry`, `monitoring.googleapis.com` | Logging, tracing, and metrics |

### Staging dataset

BigQuery dataset `analysis_staging`, table `fact_checks` — schema imported from
`@news-research/core-contracts/staging/v1` (`FactChecksTableDBSchema`), the same canonical schema
`core-infra` uploads for `ingestion-extractor` to write against. Partitioned by `extracted_at`
(daily, 7-day partition expiration).

Fed by a Cloud Run **service** (`analysis-loader`), which receives work via a push subscription
on core-infra's staging topic (OIDC-authenticated), writes rows into this table, and — on
delivery failure after 5 attempts — routes to a dead-letter topic archived into a dedicated
dead-letter bucket.

| Output | Purpose |
| --- | --- |
| `stagingDatasetId` / `stagingFactChecksTableId` / `stagingTableRef` | Identify the dataset/table |
| `loaderServiceName` / `loaderSubscriptionName` | The Cloud Run service and its push subscription |
| `loaderDeadletterTopicName` / `loaderDeadletterTopicArchiveSubscriptionName` / `deadletterBucketName` | The failure path |
| `loaderInvokerServiceAccountEmail` | The identity Pub/Sub uses to push to the loader |
| `loaderBatchesLoadedCounterMetricType` | Custom metric for batches loaded |

### Curated dataset

BigQuery dataset `analysis_curated`, table `fact_checks` — schema hand-written here (not shared
with the staging schema; see [docs/known-issues.md](./docs/known-issues.md)). Partitioned by
`extracted_at` (monthly, no expiration).

Fed by a **BigQuery Data Transfer Service scheduled query** (not a Cloud Run job) running every 6
hours: a `MERGE` that dedupes on a hash of `source id + canonical URL + title` and only inserts
rows from staging that aren't already present — append-only, no update or delete path.

| Output | Purpose |
| --- | --- |
| `curatedDatasetId` / `curatedFactChecksTableId` / `curatedTableRef` | Identify the dataset/table — `curatedTableRef` is read by `research-infra`, the only cross-project consumer of any output this project has |
| `transferJobName` | The scheduled query job |

### Translation

A Cloud Run service running the public `libretranslate/libretranslate` image directly, plus a
models bucket. See [docs/known-issues.md](./docs/known-issues.md) — the bucket isn't currently
wired to the service, and the service doesn't go through core-infra's Artifact Registry the way
every other service in this project does.

| Output | Purpose |
| --- | --- |
| `translatorServiceName` | The Cloud Run service |
| `translationModelsBucketName` | The (currently unused) models bucket |

## Consuming these outputs

`research-infra` reads exactly one output from this stack — `curatedTableRef` — via its own
`StackReference`. Nothing else in this repo reads any other output here. Treat `curatedTableRef`
as a stable interface for that reason; the rest are informational (dashboard/CLI/CI use only).

## Related documentation

| Document | Purpose |
| --- | --- |
| [docs/bootstrap.md](./docs/bootstrap.md) | Project-specific setup delta beyond core-infra's central bootstrap doc |
| [docs/runbook.md](./docs/runbook.md) | Stack configuration, deployment, and troubleshooting |
| [docs/iam-model.md](./docs/iam-model.md) | Service accounts, roles, and the one cross-project grant |
| [docs/known-issues.md](./docs/known-issues.md) | Accepted, long-lived gaps and deferred fixes |
