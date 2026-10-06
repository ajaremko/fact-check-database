# Infrastructure Runbook

Operational procedures for deploying and troubleshooting `analysis-infra`. See the
[README](../README.md) for what this project provisions.

## Configuration

Reference for the `analysis` Pulumi config namespace, read by `src/config.ts`. Set with
`pulumi config set analysis:<key> <value> --stack=<dev|prod>` (or directly in
`Pulumi.<stack>.yml`).

| Key                                 | Description                                                                                                                    | Required | Default                                                  |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | -------- | -------------------------------------------------------- |
| `analysis:coreStackName`            | The core-infra stack this project reads a `StackReference` from                                                                | Yes      | —                                                        |
| `analysis:project`                  | GCP project ID this stack deploys into                                                                                         | Yes      | —                                                        |
| `analysis:region`                   | GCP region for regional resources                                                                                              | Yes      | —                                                        |
| `analysis:logLevel`                 | Log level passed to the staging loader                                                                                         | Yes      | —                                                        |
| `analysis:tag`                      | Docker image tag for the staging loader                                                                                        | No       | none — falls back to a public placeholder image if unset |
| `analysis:tableDeletionProtection`  | Whether the BigQuery tables have Pulumi/GCP deletion protection                                                                | No       | `true` — dev overrides to `false` for easy iteration     |
| `analysis:retainTablesOnDelete`     | Whether the tables survive `pulumi destroy`                                                                                    | No       | `true` — dev overrides to `false` for easy iteration     |
| `analysis:forceDestroyStorage`      | Whether `pulumi destroy` may delete a non-empty dead-letter bucket                                                             | No       | `false`                                                  |
| `analysis:retainStorageOnDelete`    | Whether the dead-letter bucket survives `pulumi destroy`                                                                       | No       | `true`                                                   |
| `analysis:deadletterRetentionDays`  | Age-based deletion window for the dead-letter bucket. Unset disables the rule                                                  | No       | unset                                                    |
| `analysis:deadletterSoftDeleteDays` | Soft-delete window on the dead-letter bucket                                                                                   | No       | unset                                                    |
| `analysis:alertEmail`               | Email address that receives alert notifications. Unset means the alert policies exist but notify nobody. See [Alerts](#alerts) | No       | unset                                                    |
| `analysis:alertAutoCloseSeconds`    | How long an alert incident stays open after its signal stops reporting data. Accepts 1800 to 604800                            | No       | `3600`                                                   |

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

## Alerts

The stack creates two Cloud Monitoring alert policies. Each opens an incident when its condition
is met. When `analysis:alertEmail` is set, the incident is also emailed to that address. When it
is unset, as in dev, incidents appear only under Alerting in the Cloud console.

| Alert                                 | Signal                                                                       | Fires when                          |
| ------------------------------------- | ---------------------------------------------------------------------------- | ----------------------------------- |
| Analysis: batches dead-lettered       | Messages the staging loader's subscription forwards to its dead-letter topic | Any message is forwarded            |
| Analysis: curated transfer run failed | Completed runs of the curated scheduled query, by outcome                    | Any run finishes without succeeding |

Both read metrics that Pub/Sub and the BigQuery Data Transfer Service publish themselves. Both
signals only report when something happens, so an incident closes once
`analysis:alertAutoCloseSeconds` have passed since the last one (an hour by default).

### Batches dead-lettered

**Meaning:** a batch notification failed 5 delivery attempts to the staging loader. The batch it
points to was not loaded into the staging table, so its fact checks are missing from staging and
will not reach the curated table. Nothing replays the message automatically.

**Steps:**

1. Read the staging loader's error logs around the time of the incident, and check the BigQuery
   job history for a failed load job. A schema mismatch between the batch and the staging table
   is the usual cause of a batch that fails every attempt.
2. Look for the message in the dead-letter bucket under `loader-deadletter/`. Its attributes name
   the batch file. A message dead-lettered before October 2026 may be missing: the archive
   subscription could expire then, and dev's had.
3. The batch file itself is in core-infra's staging bucket until its retention period passes.
   Once the cause is fixed, loading it again means re-sending its notification or re-uploading
   the file.
4. See [The staging loader isn't receiving new batches](#the-staging-loader-isnt-receiving-new-batches)
   for the delivery-side checks.

### Curated transfer run failed

**Meaning:** a run of the "Curated Fact Checks Transfer Job" scheduled query finished without
succeeding, so the curated table was not updated by that run. The alert fires on a failed run and
on a cancelled one.

**Steps:**

1. Open the transfer's run history (Cloud Console → BigQuery → Data Transfers) and read the
   failed run's error message.
2. The query reads the last 7 days of staging and is safe to run again, so the next successful
   run catches up. Trigger a run by hand once the cause is fixed if the next scheduled one is
   hours away.
3. Staging rows expire after 7 days. Runs that keep failing for longer than that lose data, so
   treat a second consecutive failure as urgent.
4. See [Rows aren't appearing in the curated table](#rows-arent-appearing-in-the-curated-table)
   for the access checks.

### What the alerts do not cover

- A transfer that stops running altogether, for example a disabled config. No run means no failed
  run.
- The staging loader failing outright, except through the dead-letter alert once its messages
  exhaust their retries.
- A staging table that receives no new batches because the ingestion pipeline upstream has
  stopped. The ingestion stack's own alerts cover that.

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
3. Remember the transfer only looks at staging rows with `extracted_at` in the last 7 days (the
   staging partition expiry), and a fact check that's already curated is only _updated_ — not
   re-inserted — and only when a newer fetch carries different content. A staging row older than
   7 days when the schedule catches up won't be picked up.

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
