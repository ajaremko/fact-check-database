# Shared Infrastructure

Shared infrastructure provides platform-wide primitives that other systems consume but do not own. It exists to centralize governance-sensitive resources and ensure consistent security, encryption, and deployment identity across the platform.

## Deployment

Shared infrastructure is deployed via Pulumi through Nx:

```bash
nx preview shared-infra   # Preview changes
nx deploy shared-infra    # Apply changes
```

Shared infrastructure should be deployed via running the deploy command locally using a service account with elevated permissions before any consumer system (including CI deployments). See [bootstap documentation](./docs/bootstrap.md) for additional information on the initial deployment step.

## What Shared Infrastructure Provides

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

## Why These Resources Are Centralized

Shared infrastructure owns resources that:

1. **Require consistent governance** - Encryption keys and identity pools must be managed uniformly to ensure access revocation and audit capabilities work across all systems
2. **Are consumed by multiple systems** - Topics, buckets, and keys are used by ingestion, persistence, analysis, and operations
3. **Define platform-wide conventions** - Labels, naming patterns, and environment configuration

Resources remain in shared infrastructure only if they meet at least one of these criteria. System-specific resources belong in the owning system's infrastructure.

## Related Documentation

| Document                                   | Purpose                                      |
| ------------------------------------------ | -------------------------------------------- |
| [docs/contracts.md](./docs/contracts.md)   | Full stack output contract definitions       |
| [docs/bootstrap.md](./docs/bootstrap.md)   | Initial GCP project setup instructions       |
| [docs/encryption.md](./docs/encryption.md) | CMEK key management and rotation details     |
| [docs/iam-model.md](./docs/iam-model.md)   | IAM boundaries and access patterns           |
| [docs/runbook.md](./docs/runbook.md)       | Operational procedures and incident response |
