# Platform Infrastructure

This project provisions all platform infrastructure using Pulumi. It follows a modular monolith approach: a single Pulumi project with capability-specific modules organized under `src/modules/`.

## Project Structure

```
apps/infra/
├── src/
│   ├── index.ts              # Main entrypoint, composes modules
│   ├── config.ts             # Shared configuration
│   ├── modules/              # Capability-specific infrastructure (future)
│   │   └── <module>/         # e.g. ingestion, persistence, analysis
│   └── ...                   # Core infrastructure components
├── docs/                     # Infrastructure documentation
├── Pulumi.yml                # Project definition
├── Pulumi.dev.yml            # Development stack config
└── Pulumi.prod.yml           # Production stack config
```

This structure simplifies deployment ordering and state management compared to per-capability Pulumi projects, while maintaining logical separation of concerns.

## Deployment

Infrastructure is deployed via Pulumi through Nx:

```bash
nx preview infra   # Preview changes
nx deploy infra    # Apply changes
```

The initial deployment requires elevated permissions and must be run locally. See [bootstrap documentation](./docs/bootstrap.md) for setup instructions.

The [runbook](./docs/runbook.md) documents operational procedures for subsequent deployments.

## What This Project Provisions

### GCP Service Enablement

| Service                | API                             | Purpose                               |
| ---------------------- | ------------------------------- | ------------------------------------- |
| IAM                    | `iam.googleapis.com`            | Identity and access management        |
| IAM Credentials        | `iamcredentials.googleapis.com` | Service account credential generation |
| Security Token Service | `sts.googleapis.com`            | Workload identity federation          |
| Pub/Sub                | `pubsub.googleapis.com`         | Messaging primitives                  |
| Cloud KMS              | `cloudkms.googleapis.com`       | Encryption key management             |
| Cloud Storage          | `storage.googleapis.com`        | Object storage                        |

### Customer-Managed Encryption Keys (CMEK)

| Resource                     | Purpose                             |
| ---------------------------- | ----------------------------------- |
| `gcs-archive-encryption-key` | Encrypts raw archive bucket objects |
| `bigquery-encryption-key`    | Encrypts BigQuery datasets          |

### Archival Storage

| Resource             | Purpose                                 | Notes                                                                            |
| -------------------- | --------------------------------------- | -------------------------------------------------------------------------------- |
| `raw-archive-bucket` | Long-term storage for ingested raw data | CMEK-encrypted, configurable TTL, uniform bucket access, public access prevented |

### Messaging Primitives

| Resource             | Purpose                                                          |
| -------------------- | ---------------------------------------------------------------- |
| `observations-topic` | Central Pub/Sub topic for observation ingestion and distribution |

### Workload Identity Federation

| Resource               | Purpose                                                                  |
| ---------------------- | ------------------------------------------------------------------------ |
| `shared-identity-pool` | External workload authentication without long-lived service account keys |

### CI/CD Identity

| Resource                                | Purpose                                                                                   |
| --------------------------------------- | ----------------------------------------------------------------------------------------- |
| `github-actions-sa`                     | Service account impersonated by GitHub Actions                                            |
| `github-actions-identity-pool-provider` | Facilitates authentication from GitHub Actions workflows via workload identity federation |

## Adding New Infrastructure Modules

As the platform evolves, capability-specific infrastructure (e.g. ingestion pipelines, BigQuery datasets, Cloud Run services) should be added as modules under `src/modules/`. Each module:

- Encapsulates resources for a specific capability
- Imports shared primitives (keys, topics, buckets) from the main project
- Is composed into the main entrypoint (`src/index.ts`)

This keeps related resources together while maintaining a single deployment unit.

## Related Documentation

| Document                                   | Purpose                                      |
| ------------------------------------------ | -------------------------------------------- |
| [docs/contracts.md](./docs/contracts.md)   | Stack output contract definitions            |
| [docs/bootstrap.md](./docs/bootstrap.md)   | Initial GCP project setup instructions       |
| [docs/encryption.md](./docs/encryption.md) | CMEK key management and rotation details     |
| [docs/iam-model.md](./docs/iam-model.md)   | IAM boundaries and access patterns           |
| [docs/runbook.md](./docs/runbook.md)       | Operational procedures and incident response |
