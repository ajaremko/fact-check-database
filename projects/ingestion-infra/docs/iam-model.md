# IAM Model

The IAM principals, roles, and bindings this project creates. See
[core-infra/docs/iam-model.md](../../core-infra/docs/iam-model.md) for the CI/CD identity that
deploys this stack — that identity is provisioned there, not here.

## Cross-project grant

The only IAM this project applies outside its own GCP project:

| Principal | Role | On | Purpose |
| --- | --- | --- | --- |
| Cloud Run service agent (this project's project) | `roles/artifactregistry.reader` | core-infra's shared Artifact Registry repository | Lets Cloud Run in this project pull images published to core-infra's registry |

Applied via a second `gcp.Provider` (`coreProvider`) scoped to core-infra's project, with
`retainOnDelete: true` — this binding is defined here because it's inherently about this
project's identity reaching into core-infra, not something core-infra could define on its own.

## Service accounts

One dedicated service account per pipeline stage, each scoped to only what that stage needs:

| Service account | Used by | Roles |
| --- | --- | --- |
| `ingestion-ingestion-sa` (account ID `ingestion-ingestor`) | Ingestor job | Secret Accessor on the source-list secret; `roles/storage.objectCreator` on the raw archive bucket; `cloudtrace.agent`, `telemetry.tracesWriter`, `monitoring.metricWriter` at project level |
| `ingestion-extractor-sa` | Extractor job | `roles/storage.objectViewer` on the raw archive bucket; `roles/storage.objectCreator` on core-infra's staging bucket; `roles/pubsub.subscriber` on its own subscription; the same trace/telemetry/monitoring writer roles |
| `ingestion-sanitizer-sa` | Sanitizer service | Secret Accessor on the sanitizer-policy secret; `roles/storage.objectAdmin` on the raw archive bucket — broader than the other two (**admin**, not create/view-only), since the sanitizer both reads ingestor records and writes sanitizer records back to the same bucket; the same trace/telemetry/monitoring writer roles |

## Invoker service accounts

Three more service accounts exist solely to let one GCP service invoke another, via
`createInvokerServiceAccount`:

| Service account | Invokes | Grant |
| --- | --- | --- |
| `ingestion-ingestor-push-sa` | The ingestor Cloud Run **job** | `roles/run.invoker` on the job, plus `roles/iam.serviceAccountTokenCreator` granted to the Cloud Scheduler service agent so it can mint tokens as this SA |
| `ingestion-extractor-push-sa` | The extractor Cloud Run **job** | Same pattern, for the extractor's Cloud Scheduler trigger |
| `ingestion-sanitizer-push-sa` | The sanitizer Cloud Run **service** | `roles/run.invoker` on the service; used as the OIDC identity for the Pub/Sub push subscription that delivers ingestor events to it |

## Pub/Sub service agent grants

The project's Pub/Sub service agent needs storage access to auto-archive messages, granted once
by each shared factory helper rather than per call site:

- `createArchivedTopic` grants `roles/storage.legacyBucketReader` and `roles/storage.objectCreator`
  on the **event log bucket** — used by the ingestor and sanitizer topics' auto-archive
  subscriptions.
- `createDeadletteredSubscription` grants the same pair on the **deadletter bucket** — used by the
  extractor's and sanitizer's dead-letter-topic archive subscriptions — plus publish rights on
  each dead-letter topic itself.

## Trust model summary

Every service account here is attached directly to a Cloud Run job/service or used only to mint
short-lived invocation tokens — there are no downloaded keys for any of them. The one identity
with standing access outside this project is the Cloud Run service agent's Artifact Registry
grant into core-infra; everything else is scoped to this project's own buckets, topics, and
secrets.
