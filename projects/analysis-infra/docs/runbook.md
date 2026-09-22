# Infrastructure Runbook

Operational procedures for deploying and troubleshooting `analysis-infra`. See the
[README](../README.md) for what this project provisions.

## Configuration

Reference for the `analysis` Pulumi config namespace, read by `src/config.ts`. Set with
`pulumi config set analysis:<key> <value> --stack=<dev|prod>` (or directly in
`Pulumi.<stack>.yml`).

| Key | Description | Required | Default |
| --- | --- | --- | --- |
| `analysis:coreStackName` | The core-infra stack this project reads a `StackReference` from | Yes | — |
| `analysis:project` | GCP project ID this stack deploys into | Yes | — |
| `analysis:region` | GCP region for regional resources | Yes | — |
| `analysis:logLevel` | Log level passed to the staging loader | Yes | — |
| `analysis:tag` | Docker image tag for the staging loader | No | none — falls back to a public placeholder image if unset |
| `analysis:tableDeletionProtection` | Whether the BigQuery tables have Pulumi/GCP deletion protection | No | `true` — dev overrides to `false` for easy iteration |
| `analysis:retainTablesOnDelete` | Whether the tables survive `pulumi destroy` | No | `true` — dev overrides to `false` for easy iteration |
| `analysis:forceDestroyStorage` | Whether `pulumi destroy` may delete a non-empty dead-letter bucket | No | `false` |
| `analysis:retainStorageOnDelete` | Whether the dead-letter bucket survives `pulumi destroy` | No | `true` |
| `analysis:deadletterRetentionDays` | Age-based deletion window for the dead-letter bucket. Unset disables the rule | No | unset |
| `analysis:deadletterSoftDeleteDays` | Soft-delete window on the dead-letter bucket | No | unset |

## Commands

```bash
nx preview analysis-infra --stack=<dev|prod>   # review changes
nx deploy analysis-infra --stack=<dev|prod>    # apply them
nx refresh analysis-infra --stack=<dev|prod>   # reconcile state with reality
nx destroy analysis-infra --stack=<dev|prod>   # tear down — read the config-flag caveats above first
nx output analysis-infra --stack=<dev|prod>    # print stack outputs
```

## Deployment ordering

`core-infra` must be deployed first — this project's `StackReference` fails to resolve otherwise.
`research-infra` depends on this stack's `curatedTableRef` output, so deploy this project before
`research-infra`, and redeploy `research-infra` if `curatedTableRef` ever changes.

## Diagnosing failures

### The staging loader isn't receiving new batches

**Steps:**
1. Confirm core-infra's staging topic (`stagingStorageTopicName`) still exists and that this
   project's push subscription (`loaderSubscriptionName`) is attached to it.
2. Confirm the invoker service account (`loaderInvokerServiceAccountEmail`) still has
   `roles/run.invoker` on the loader service — this is what lets Pub/Sub push to it.
3. Check the dead-letter topic (`loaderDeadletterTopicName`) — after 5 failed delivery attempts,
   messages land there instead of retrying indefinitely. Its own archive subscription writes
   failed messages into the dead-letter bucket under `loader-deadletter/` for inspection.

### Rows aren't appearing in the curated table

**Steps:**
1. Check the BigQuery Data Transfer Service run history for `transferJobName` (Cloud Console →
   BigQuery → Data Transfers) — this runs as a scheduled query, not a Cloud Run job, so its logs
   live there, not in Cloud Run/Cloud Logging the way every other service in this repo's infra
   does.
2. Confirm the curated loader's service account still has `bigquery.dataViewer` on the staging
   dataset and `bigquery.dataEditor` on the curated dataset, and that Google's own BigQuery Data
   Transfer Service agent still has `serviceAccountTokenCreator` on that service account — this
   impersonation grant is what lets DTS run the query as that identity at all.
3. Remember the transfer only looks at rows with `extracted_at` in roughly the last 24 hours, and
   only inserts rows that don't already match an existing curated row's dedup hash — a row that's
   older than that window when the schedule catches up won't be picked up.

## Access notes

No service account in this project holds a downloaded key. The one trust relationship worth
knowing about beyond ordinary Cloud-Run-attached identities: the curated loader's service account
is impersonated by Google's own BigQuery Data Transfer Service agent (granted
`serviceAccountTokenCreator`), not by another service in this project — that's how the scheduled
query runs with that account's BigQuery permissions without a human or a Cloud Run revision ever
holding its credentials directly.

## Checking output locally

```bash
nx output analysis-infra --stack=<dev|prod>
```

See [docs/known-issues.md](./known-issues.md) for this project's current accepted gaps.
