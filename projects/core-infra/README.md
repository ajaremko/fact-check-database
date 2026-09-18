# core-infra

Shared platform infrastructure, provisioned via Pulumi: the pieces every other infrastructure
project in this repository depends on through a stack reference, plus the identity that lets
CI/CD deploy anything at all.

This project once held all of the platform's infrastructure as a single Pulumi program. As the
platform grew, ingestion, analysis, website, and research infrastructure were each split into
their own dedicated project. What remains here is what stayed genuinely shared: a Docker image
registry, a CMEK key ring, the staging bucket and topic that hand data from ingestion to
analysis and website, a workload identity pool, and the CI/CD service account GitHub Actions
uses to deploy every project in this repository, including this one.

## Project structure

```
projects/core-infra/
├── src/
│   ├── index.ts               # Composition root — re-exports every stack output
│   ├── config.ts              # `core` Pulumi config namespace
│   ├── project.ts             # Shared GCP provider and project service account
│   ├── services.ts            # GCP API enablement
│   ├── kms.ts                 # CMEK key ring and keys
│   ├── artifact-registry.ts   # Shared Docker registry
│   ├── identity-pool.ts       # Workload identity pool
│   ├── github-action-runner/  # GitHub Actions OIDC provider and service account
│   └── staging-storage/       # Staging bucket, topic, and BigQuery schema object
├── docs/                      # Infrastructure documentation
├── Pulumi.yml                 # Project definition
├── Pulumi.dev.yml             # Development stack config
└── Pulumi.prod.yml            # Production stack config
```

There is no `src/modules/` directory. Each capability above is its own top-level file or folder.
Capabilities substantial enough to need their own IAM, scheduling, and monitoring — ingestion,
analysis, website, research — are separate Pulumi projects instead, each holding a stack
reference back to this one.

## Deployment

Infrastructure is deployed via Pulumi through Nx:

```bash
nx preview core-infra --stack=<dev|prod>   # Preview changes
nx deploy core-infra --stack=<dev|prod>    # Apply changes
```

The initial deployment requires elevated permissions and must be run locally. See the
[bootstrap documentation](./docs/bootstrap.md) for setup instructions.

The [runbook](./docs/runbook.md) documents operational procedures for subsequent deployments.

## What this project provisions

### Core project

`gcpProject` and `gcpRegion` identify the GCP project and region this stack deploys into. Every
downstream project reads them to scope its own view of this project's resources — building a
second provider, for example, to grant IAM directly against resources that live here.

Exported as stack outputs:

| Output       | Type     |
| ------------ | -------- |
| `gcpProject` | `string` |
| `gcpRegion`  | `string` |

### GCP service enablement

| Service                | API                                   | Purpose                                     |
| ---------------------- | ------------------------------------- | ------------------------------------------- |
| Compute Engine         | `compute.googleapis.com`              | Required before enabling several other APIs |
| Cloud Resource Manager | `cloudresourcemanager.googleapis.com` | Project-level IAM and metadata              |
| IAM                    | `iam.googleapis.com`                  | Identity and access management              |
| IAM Credentials        | `iamcredentials.googleapis.com`       | Service account credential generation       |
| Security Token Service | `sts.googleapis.com`                  | Workload identity federation                |
| Pub/Sub                | `pubsub.googleapis.com`               | Staging bucket upload notifications         |
| Cloud KMS              | `cloudkms.googleapis.com`             | Encryption key management                   |
| Cloud Storage          | `storage.googleapis.com`              | Object storage                              |
| Artifact Registry      | `artifactregistry.googleapis.com`     | Docker image registry                       |

### Customer-managed encryption keys (CMEK)

| Resource                     | Purpose                                                                                                                                |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `gcs-archive-encryption-key` | Encrypts `ingestion-infra`'s raw archive bucket. The grant to that bucket's service account is created in `ingestion-infra`, not here. |
| `bigquery-encryption-key`    | Provisioned for BigQuery datasets, but no dataset currently references it — see [docs/encryption.md](./docs/encryption.md).            |

Exported as stack outputs:

| Output                                  | Type     |
| --------------------------------------- | -------- |
| `gcsArchiveKeyId` / `gcsArchiveKeyName` | `string` |
| `bigQueryKeyId` / `bigQueryKeyName`     | `string` |

### Artifact Registry

A single Docker repository (`core-artifact-registry`) that every domain project's Cloud Run
services and jobs pull images from. `ingestion-infra`, `analysis-infra`, and `website-infra`
each read its location, name, and repository ID via a stack reference, and each grants its own
Cloud Run service agent `roles/artifactregistry.reader` on it from its own project.

Exported as stack outputs:

| Output                                                                               | Type     |
| ------------------------------------------------------------------------------------ | -------- |
| `artifactRegistryLocation` / `artifactRegistryName` / `artifactRegistryRepositoryId` | `string` |
| `artifactRegistryUri` / `artifactRegistryBaseUri`                                    | `string` |

`artifactRegistryUri` and `artifactRegistryBaseUri` aren't read by anything outside this project
today.

### Staging storage

The hand-off point between the ingestion domain and the analysis and website domains: a GCS
bucket (`core-staging-bucket`), a Pub/Sub topic that fires on every finalized object under the
`fact_checks` path prefix, and a JSON object describing the BigQuery schema those objects
conform to. `ingestion-infra`'s extractor writes batches here; `analysis-infra`'s staging loader
and `website-infra`'s search loader each subscribe to the topic directly, from their own
projects.

Exported as stack outputs:

| Output                             | Type     |
| ---------------------------------- | -------- |
| `stagingStorageBucketName`         | `string` |
| `stagingStorageTopicName`          | `string` |
| `stagingStorageUploadNoficationId` | `string` |
| `factChecksTableDBSchemaObjectUri` | `string` |

`stagingStorageUploadNoficationId` and `factChecksTableDBSchemaObjectUri` aren't read by
anything today — the schema's actual location reaches the loader through the Pub/Sub message's
`schemaObjectId` attribute (set in `staging-storage/topic.ts`), not this output.

### Workload identity federation

| Resource               | Purpose                                                                          |
| ---------------------- | -------------------------------------------------------------------------------- |
| `shared-identity-pool` | Lets GitHub Actions authenticate to GCP without a long-lived service account key |

### CI/CD identity

| Resource                                | Purpose                                                                                     |
| --------------------------------------- | ------------------------------------------------------------------------------------------- |
| `github-actions-sa`                     | The service account every GitHub Actions workflow in this repository impersonates to deploy |
| `github-actions-identity-pool-provider` | The OIDC provider GitHub Actions authenticates through, scoped to this repository           |

See [docs/iam-model.md](./docs/iam-model.md) for the full role and binding list.

Exported as stack outputs:

| Output                                 | Type     |
| -------------------------------------- | -------- |
| `githubActionServiceAccountEmail`      | `string` |
| `githubActionIdentityPoolProviderName` | `string` |

## Consuming these outputs

Every output above is depended on by other infrastructure projects through a Pulumi
`StackReference`, not a compile-time import — no project's `package.json` lists
`@news-research/core-infra` as a dependency. Treat these outputs as a stable interface: renaming
one, changing what it means, or pointing it at a different resource is a breaking change for
whatever currently reads it, even though nothing tracks that dependency but the code itself.

A downstream Pulumi project opens a `StackReference` in its own `config.ts`:

```ts
const coreStackRef = new pulumi.StackReference(`${coreStackName}/${stackName}`)
export const stagingStorageBucketName = coreStackRef.getOutput(
  'stagingStorageBucketName'
)
```

GitHub Actions workflows read outputs directly through the Pulumi CLI instead of a
`StackReference`:

```bash
cd projects/core-infra
pulumi stack output --json --stack=<dev|prod>
```

## Adding new shared infrastructure

Something belongs here only if more than one domain project needs it — the same bar
`core-contracts` uses for schemas. Add it as a new top-level file or folder under `src/`,
following the existing pattern: a `services.ts` entry if it needs a new API enabled, resources
built from the shared `provider` in `project.ts`. Re-export any value a downstream project
should read as a stack output from `src/index.ts`, and once a downstream project depends on it,
treat it as a stable contract — see [Consuming these outputs](#consuming-these-outputs) above.

## Related documentation

| Document                                         | Purpose                                                    |
| ------------------------------------------------ | ---------------------------------------------------------- |
| [docs/bootstrap.md](./docs/bootstrap.md)         | Initial GCP project setup and first deployment             |
| [docs/configuration.md](./docs/configuration.md) | Stack configuration reference                              |
| [docs/encryption.md](./docs/encryption.md)       | CMEK key management and rationale                          |
| [docs/iam-model.md](./docs/iam-model.md)         | IAM roles, bindings, and the GitHub Actions identity model |
| [docs/runbook.md](./docs/runbook.md)             | Deployment ordering and troubleshooting                    |
