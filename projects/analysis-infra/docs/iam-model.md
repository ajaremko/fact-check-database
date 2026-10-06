# IAM Model

The IAM principals, roles, and bindings this project creates. See
[core-infra/docs/iam-model.md](../../core-infra/docs/iam-model.md) for the CI/CD identity that
deploys this stack — that identity is provisioned there, not here.

## Cross-project grant

| Principal                                        | Role                            | On                                               | Purpose                                                                                   |
| ------------------------------------------------ | ------------------------------- | ------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| Cloud Run service agent (this project's project) | `roles/artifactregistry.reader` | core-infra's shared Artifact Registry repository | Lets Cloud Run in this project pull the staging loader's image from core-infra's registry |

Applied via a second `gcp.Provider` (`coreProvider`) scoped to core-infra's project, with
`retainOnDelete: true`.

## Service accounts

| Service account   | Used by                                            | Roles                                                                                                                                                                                                              |
| ----------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Staging loader SA | The staging loader Cloud Run service               | `storage.objectViewer` on core-infra's staging bucket; `bigquery.dataEditor` and `bigquery.jobUser` on the staging table; `cloudtrace.agent`, `telemetry.tracesWriter`, `monitoring.metricWriter` at project level |
| Curated loader SA | The BigQuery Data Transfer Service scheduled query | `bigquery.dataViewer` on the staging dataset; `bigquery.dataEditor` on the curated dataset; `bigquery.jobUser` at project level                                                                                    |

## A distinct trust pattern: impersonation, not attachment

Every service account above is either attached directly to a Cloud Run revision or — in the
curated loader's case — impersonated by a **Google-managed service**, not by another resource in
this project. The curated loader's service account grants `roles/iam.serviceAccountTokenCreator`
to the BigQuery Data Transfer Service's own service agent, which is what lets DTS run the
scheduled `MERGE` query with that account's BigQuery permissions. This is a different shape of
trust than the Cloud-Run-attached pattern every other service account here (and in the sibling
infra projects) uses, and worth knowing about specifically because there's no Cloud Run revision
or Pulumi resource that visibly "runs as" this identity — DTS does, on a schedule, outside this
project's own resources.

## Pub/Sub-related grants

The staging loader's push subscription setup also creates:

- An invoker service account granted `roles/run.invoker` on the loader service, so Pub/Sub can
  push messages to it.
- Storage grants (`legacyBucketReader`, `objectCreator`) for the Pub/Sub service agent on the
  dead-letter bucket, so failed messages can be archived there.
- A `pubsub.subscriber` grant on core-infra's staging topic (applied via `coreProvider`, since
  that topic lives in core-infra's project) and on this project's own subscription.

## Encryption key grant

The staging and curated tables are encrypted with a customer-managed key owned by `core-infra`.
One grant makes that work: this project's BigQuery service agent
(`bq-<project number>@bigquery-encryption.iam.gserviceaccount.com`) holds
`roles/cloudkms.cryptoKeyEncrypterDecrypter` on the key (`bigQueryServiceAgentKmsBinding` in
`src/encryption.ts`). In prod the key is in core-infra's project, so this is a second
cross-project grant.

- No service account in this project, and no research reader, holds any role on the key. They
  reach the data through their BigQuery roles, and BigQuery does the decrypting.
- Removing the grant, or disabling the key in `core-infra`, stops every read and write on both
  tables at once. Restoring it restores access; the data is untouched.

## Trust model summary

The staging loader's service account is a simple Cloud-Run-attached identity with no downloaded
keys. The curated loader's is impersonated by a Google-managed service rather than attached to
anything this project runs directly — the one relationship in this project's IAM model that isn't
visible just by looking at its Cloud Run resources.
