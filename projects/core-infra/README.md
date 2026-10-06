# core-infra

Shared platform infrastructure, provisioned via Pulumi: the pieces every other infrastructure
project in this repository depends on through a stack reference, plus the identity that lets
CI/CD deploy anything at all.

## Project structure

```
projects/core-infra/
├── src/            # One flat file or folder per capability — see "What this project provisions" below
├── docs/           # Infrastructure documentation
├── Pulumi.yml      # Project definition
├── Pulumi.dev.yml  # Development stack config
└── Pulumi.prod.yml # Production stack config
```

There is no `src/modules/` directory — each capability described below is its own top-level
file under `src/`, or a folder once it needs more than one file. Capabilities substantial enough
to need their own IAM, scheduling, and monitoring are separate Pulumi projects instead, each
holding a stack reference back to this one.

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
downstream project reads them to scope its own view of this project's resources. For example, a
downstream project can build a second provider from them to grant IAM directly against resources
that live here.

Exported as stack outputs:

| Output       | Type     | Purpose                                        |
| ------------ | -------- | ---------------------------------------------- |
| `gcpProject` | `string` | GCP project ID this stack deploys into         |
| `gcpRegion`  | `string` | GCP region for this stack's regional resources |

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

| Output                                  | Type     | Purpose                                                                                 |
| --------------------------------------- | -------- | --------------------------------------------------------------------------------------- |
| `gcsArchiveKeyId` / `gcsArchiveKeyName` | `string` | Identifies the key used to encrypt raw archive data                                     |
| `bigQueryKeyId` / `bigQueryKeyName`     | `string` | Identifies the key that encrypts the analysis BigQuery tables. Read by `analysis-infra` |

### Artifact Registry

A single Docker repository (`core-artifact-registry`) that every domain project's Cloud Run
services and jobs pull images from. `ingestion-infra`, `analysis-infra`, and `website-infra`
each read its location, name, and repository ID via a stack reference, and each grants its own
Cloud Run service agent `roles/artifactregistry.reader` on it from its own project.

Exported as stack outputs:

| Output                                                                               | Type     | Purpose                                                                                    |
| ------------------------------------------------------------------------------------ | -------- | ------------------------------------------------------------------------------------------ |
| `artifactRegistryLocation` / `artifactRegistryName` / `artifactRegistryRepositoryId` | `string` | Lets a downstream project build the registry's image path and grant itself reader access   |
| `artifactRegistryUri` / `artifactRegistryBaseUri`                                    | `string` | Convenience forms of the registry address; not read by anything outside this project today |

### Staging storage

The hand-off point between the ingestion domain and the analysis and website domains: a GCS
bucket (`core-staging-bucket`), a Pub/Sub topic that fires on every finalized object under the
`v1/type=fact_checks/` path prefix, and a JSON object describing the BigQuery schema those objects
conform to. `ingestion-infra`'s extractor writes batches here; `analysis-infra`'s staging loader
and `website-infra`'s search loader each subscribe to the topic directly, from their own
projects. The prefix ends in a slash on purpose: GCS matches prefixes as literal strings, so
without it any sibling path such as `v1/type=fact_checks_<x>/` would also notify the loaders,
which can only load batch files.

Batch files are deleted `core:batchRetentionDays` after they are written. The lifecycle rule is
scoped to the same `v1/type=fact_checks/` prefix, so it never touches the schema file under
`schemas/`, which the analysis loader reads on every load.

Exported as stack outputs:

| Output                             | Type     | Purpose                                                                                                                                                                         |
| ---------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `stagingStorageBucketName`         | `string` | Lets a downstream project read the objects written here, or grant its own service account access                                                                                |
| `stagingStorageTopicName`          | `string` | Lets a downstream project create its own subscription for new staging objects                                                                                                   |
| `stagingStorageUploadNoficationId` | `string` | Identifies the storage notification; not read by anything today                                                                                                                 |
| `factChecksTableDBSchemaObjectUri` | `string` | Points at the uploaded BigQuery schema file; not read by anything today — the schema's location instead reaches the loader via the Pub/Sub message's `schemaObjectId` attribute |

### Workload identity federation

| Resource               | Purpose                                                                          |
| ---------------------- | -------------------------------------------------------------------------------- |
| `shared-identity-pool` | Lets GitHub Actions authenticate to GCP without a long-lived service account key |

### CI/CD identities

| Resource                                | Purpose                                                                                                             |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `github-actions-sa`                     | The release identity. The image release workflow impersonates it to push to the registry. It holds no other role    |
| `github-preview-sa`                     | The preview identity. The daily `pulumi preview` workflow impersonates it. It can view resources and change nothing |
| `github-actions-identity-pool-provider` | The OIDC provider GitHub Actions authenticates through, scoped to this repository                                   |

Each identity can be assumed by one workflow file on one branch only. Neither can deploy:
infrastructure is deployed by hand. See [docs/iam-model.md](./docs/iam-model.md).

See [docs/iam-model.md](./docs/iam-model.md) for the full role and binding list.

Exported as stack outputs:

| Output                                 | Type     | Purpose                                                                                                                                         |
| -------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `githubActionServiceAccountEmail`      | `string` | The release identity's email. Copied into the `*_RELEASE_SERVICE_ACCOUNT` repository variables                                                  |
| `githubPreviewServiceAccountEmail`     | `string` | The preview identity's email. Read by the other stacks to grant it viewer, and copied into the `*_PREVIEW_SERVICE_ACCOUNT` repository variables |
| `githubActionIdentityPoolProviderName` | `string` | The provider GitHub Actions authenticates through. Copied into the `*_WIF_PROVIDER` repository variables                                        |

## Consuming these outputs

Every output above is depended on by other infrastructure projects through a Pulumi
`StackReference`, not a compile-time import — no project's `package.json` lists
`@fact-check-database/core-infra` as a dependency. Treat these outputs as a stable interface: renaming
one, changing what it means, or pointing it at a different resource is a breaking change for
whatever currently reads it, even though nothing tracks that dependency but the code itself.

A downstream Pulumi project opens a `StackReference` in its own `config.ts`:

```ts
const coreStackRef = new pulumi.StackReference(`${coreStackName}/${stackName}`)
export const stagingStorageBucketName = coreStackRef.getOutput(
  'stagingStorageBucketName'
)
```

GitHub Actions workflows do not read outputs at run time. The few they need are copied into
repository variables, so the release workflows hold no Pulumi token. See
[GitHub Actions configuration](./docs/runbook.md#github-actions-configuration) for the list and
how to refresh one:

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

## History

This project once held all of the platform's infrastructure as a single Pulumi program. As the
platform grew, ingestion, analysis, website, and research infrastructure were each split into
their own dedicated project. What remains here is what stayed genuinely shared: a Docker image
registry, a CMEK key ring, the staging bucket and topic that hand data from ingestion to
analysis and website, a workload identity pool, and the two service accounts GitHub Actions
uses: one to push images and one to preview infrastructure read-only.

## Related documentation

| Document                                       | Purpose                                                       |
| ---------------------------------------------- | ------------------------------------------------------------- |
| [docs/bootstrap.md](./docs/bootstrap.md)       | Initial GCP project setup and first deployment                |
| [docs/encryption.md](./docs/encryption.md)     | CMEK key management and rationale                             |
| [docs/iam-model.md](./docs/iam-model.md)       | IAM roles, bindings, and the GitHub Actions identity model    |
| [docs/runbook.md](./docs/runbook.md)           | Stack configuration, deployment ordering, and troubleshooting |
| [docs/known-issues.md](./docs/known-issues.md) | Accepted, long-lived gaps and deferred fixes                  |
