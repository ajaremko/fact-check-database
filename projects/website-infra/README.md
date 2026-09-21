# website-infra

Infrastructure for the public website domain: the backend Cloud Run service (the public site
itself, fronted by Envoy and a dev-only basic-auth sidecar), the Algolia search integration and
its BigQuery-loading service, the emailer service, a shared dead-letter bucket, and a plain
redirect service. Provisioned via Pulumi, depending on
[core-infra](../core-infra/README.md) for the platform's shared identity, Artifact Registry, and
the staging bucket/topic the ingestion pipeline writes to.

## Deployment

```bash
nx preview website-infra --stack=<dev|prod>   # Preview changes
nx deploy website-infra --stack=<dev|prod>    # Apply changes
```

`core-infra` must already be deployed to the same stack before this project can deploy. See
[docs/bootstrap.md](./docs/bootstrap.md) for initial setup and
[docs/runbook.md](./docs/runbook.md) for subsequent deployments and troubleshooting.

## What this project provisions

### Consumed from core-infra

Read via a `StackReference` in `src/config.ts`, not owned here:

| Output read | Used for |
| --- | --- |
| `gcpProject` / `gcpRegion` | Scoping a second provider (`coreProvider`) to grant IAM on core-infra's own resources |
| `stagingStorageBucketName` / `stagingStorageTopicName` | Where `website-loader` reads staged fact-check batches from |
| `artifactRegistryLocation` / `Name` / `RepositoryId` | Resolving each service's container image |

This project does **not** own or manage CMEK keys, the workload identity pool, or the GitHub
Actions CI/CD identity — those are core-infra's, documented in its own
[docs/encryption.md](../core-infra/docs/encryption.md) and
[docs/iam-model.md](../core-infra/docs/iam-model.md).

### GCP service enablement

| Service | API | Purpose |
| --- | --- | --- |
| IAM | `iam.googleapis.com` | Identity and access management |
| IAM Credentials | `iamcredentials.googleapis.com` | Service account credential generation |
| Compute Engine | `compute.googleapis.com` | Required before enabling several other APIs |
| Cloud Resource Manager | `cloudresourcemanager.googleapis.com` | Project-level IAM and metadata |
| Artifact Registry | `artifactregistry.googleapis.com` | Pulling container images from core-infra's registry |
| Cloud Run | `run.googleapis.com` | The backend, emailer, search loader, and redirect services |
| Cloud Storage | `storage.googleapis.com` | The backend and dead-letter buckets |
| Pub/Sub | `pubsub.googleapis.com` | Form-submission and staging-batch push subscriptions |
| Secret Manager | `secretmanager.googleapis.com` | Envoy/htpasswd/oauth2-proxy config, the Resend and Algolia API keys |
| reCAPTCHA Enterprise | `recaptchaenterprise.googleapis.com` | The form-abuse-protection key used by `website-server` |
| Cloud Domains / DNS | `domains.googleapis.com`, `dns.googleapis.com` | Enabled for the public domains, but domain verification and Cloud Run domain mapping are done manually — see [docs/bootstrap.md](./docs/bootstrap.md); no Pulumi resource here creates a domain mapping |

### Backend

The public site itself. `factCheckDatabaseBackendService` runs three containers in one Cloud Run
(v1) service: an Envoy sidecar (public entry point), a dev-only `oauth2-proxy` container gating
access behind `htpasswd` credentials, and the `website-server` container. `roles/run.invoker` is
granted to `allUsers` in every stack — the Envoy/oauth2-proxy layer is what actually restricts dev
access, not IAM. Backed by `backendBucket`, where `website-server`'s form submissions land before
triggering the emailer.

### Emailer

`emailerService` (Cloud Run v2) runs [website-emailer](../website-emailer/README.md). Two Pub/Sub
push subscriptions (`submissionSubscription`, `confirmationSubscription`) both subscribe to the
same form-submissions topic in the backend module and push to this service's two routes — see
`website-emailer`'s own README for why the route names don't match what each sends. Failed
deliveries dead-letter into the shared bucket below.

### Search

`website-loader` (Cloud Run v2, `search/loader/`) reads staged fact-check batches from
core-infra's staging bucket via a **cross-project** push subscription and writes them into an
Algolia index (`factChecksIndex`, plus a `factChecksOldestIndex` replica sorted the other way).
Separately, `algoliaServiceAccount` and a custom IAM role
(`websiteAlgoliaBigQueryIntegrator`) exist for Algolia's own BigQuery connector — a one-time
manual integration, not something this project's Pulumi code wires up itself; see
[docs/bootstrap.md](./docs/bootstrap.md).

### Dead-letter

One shared bucket (`deadletterBucket`) receives messages that exhaust delivery attempts from
**both** the emailer's `submissionSubscription` and the search loader's staging-storage
subscription, each via its own archive-topic-and-subscription pair.

### Redirect

`redirectService` — a plain Cloud Run (v1) service running the public `morbz/docker-web-redirect`
image, redirecting to the backend URL in dev or `mainDomain` in prod. No application code of its
own; exists purely as infrastructure.

## Related documentation

| Document | Purpose |
| --- | --- |
| [docs/bootstrap.md](./docs/bootstrap.md) | Project-specific setup delta beyond core-infra's central bootstrap doc |
| [docs/runbook.md](./docs/runbook.md) | Stack configuration, deployment, and troubleshooting |
| [docs/iam-model.md](./docs/iam-model.md) | Service accounts, roles, and the one cross-project grant |
| [docs/known-issues.md](./docs/known-issues.md) | Accepted, long-lived gaps and deferred fixes |
| [website-server](../website-server/README.md) | The public frontend running in the backend service |
| [website-emailer](../website-emailer/README.md) | The service running behind the emailer routes |
| [website-loader](../website-loader/README.md) | The service populating the Algolia index |
