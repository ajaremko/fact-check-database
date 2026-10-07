# IAM Model

The IAM principals, roles, and bindings this project creates. See
[core-infra/docs/iam-model.md](../../core-infra/docs/iam-model.md) for the CI/CD identity that
deploys this stack — that identity is provisioned there, not here.

## Cross-project grant

The only IAM this project applies outside its own GCP project:

| Principal                                        | Role                            | On                                               | Purpose                                                                       |
| ------------------------------------------------ | ------------------------------- | ------------------------------------------------ | ----------------------------------------------------------------------------- |
| Cloud Run service agent (this project's project) | `roles/artifactregistry.reader` | core-infra's shared Artifact Registry repository | Lets Cloud Run in this project pull images published to core-infra's registry |

Applied via a second `gcp.Provider` (`coreProvider`) scoped to core-infra's project, with
`retainOnDelete: true` — this binding is defined here because it's inherently about this
project's identity reaching into core-infra, not something core-infra could define on its own.

## Service accounts

| Service account                  | Used by                                                                                                                                              | Roles                                                                                                                                                                                                                                                                                                                  |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `website-backend-sa`             | The backend Cloud Run service (`website-server`)                                                                                                     | `roles/storage.objectCreator` on the backend bucket; Secret Accessor on the Envoy, htpasswd, and oauth2-proxy config secrets; `roles/recaptchaenterprise.agent` and `roles/pubsub.publisher` (on the form-submissions topic) at project level; `cloudtrace.agent`, `telemetry.tracesWriter`, `monitoring.metricWriter` |
| `website-emailer-sa`             | The emailer Cloud Run service                                                                                                                        | `roles/storage.objectViewer` on the backend bucket; Secret Accessor on the Resend API key secret; the same trace/telemetry/monitoring writer roles                                                                                                                                                                     |
| `website-search-loader-sa`       | The search loader Cloud Run service                                                                                                                  | `roles/storage.objectViewer` on core-infra's staging bucket; Secret Accessor on the Algolia API key secret; the same trace/telemetry/monitoring writer roles                                                                                                                                                           |
| `website-algolia-integration-sa` | Not attached to any Cloud Run service — used only by Algolia's own BigQuery connector, configured manually (see [docs/bootstrap.md](./bootstrap.md)) | A custom project role (`websiteAlgoliaBigQueryIntegrator`) granting exactly the BigQuery/Storage read permissions the connector needs — narrower than any built-in BigQuery role                                                                                                                                       |

## Invoker service accounts

Two more service accounts exist solely to let Pub/Sub push messages to a Cloud Run service as an
authenticated OIDC identity:

| Service account           | Invokes                   | Grant                                                                                                                                                             |
| ------------------------- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `website-emailer-push-sa` | The emailer service       | `roles/run.invoker` on the service; used as the OIDC identity for both the `confirmationEmailSubscription` and `notificationEmailSubscription` push subscriptions |
| `website-loader-push-sa`  | The search loader service | `roles/run.invoker` on the service; used as the OIDC identity for the cross-project staging-storage push subscription                                             |

## Pub/Sub service agent grants

The project's Pub/Sub service agent needs storage access to auto-archive failed messages to the
shared dead-letter bucket, granted once (`pubsubServiceAccountIamRoles` in `src/deadletter/`)
rather than per subscription: `roles/storage.legacyBucketReader` and
`roles/storage.objectCreator` on `deadletterBucket`. Both the emailer's and the search loader's
dead-letter-topic archive subscriptions rely on this single grant.

## Trust model summary

Every service account here is attached directly to a Cloud Run service or used only to mint
short-lived invocation tokens — there are no downloaded keys for any of them, except the one
inherent exception: Algolia's BigQuery connector requires a real, downloaded service account key
uploaded into Algolia's own dashboard (see [docs/bootstrap.md](./bootstrap.md)), since Algolia is
an external SaaS product with no support for workload identity federation into this project. The
one identity with standing access outside this project is the Cloud Run service agent's Artifact
Registry grant into core-infra; everything else is scoped to this project's own buckets, topics,
and secrets.
