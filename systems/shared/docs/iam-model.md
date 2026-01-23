# IAM Model

This document describes the IAM principals, roles, and bindings defined by shared infrastructure.

## Service Accounts

### GitHub Actions Service Account

| Property       | Value                                |
| -------------- | ------------------------------------ |
| Account ID     | `github-actions-sa`                  |
| Purpose        | CI/CD deployments via GitHub Actions |
| Authentication | Workload identity federation (OIDC)  |

This service account is impersonated by GitHub Actions workflows. No long-lived keys exist for this account.

### GCS Storage Service Agent

The default GCS service agent for the project. This is a Google-managed service account that performs encryption/decryption operations on behalf of Cloud Storage.

## IAM Bindings

### Project-Level Roles

| Principal           | Role                                   | Purpose                                    |
| ------------------- | -------------------------------------- | ------------------------------------------ |
| `github-actions-sa` | `roles/editor`                         | General resource creation and modification |
| `github-actions-sa` | `roles/serviceusage.serviceUsageAdmin` | Enable/disable GCP APIs                    |
| `github-actions-sa` | `roles/iam.serviceAccountAdmin`        | Create and manage service accounts         |
| `github-actions-sa` | `roles/compute.admin`                  | Manage compute resources                   |
| `github-actions-sa` | `roles/cloudkms.admin`                 | Manage KMS keys and key rings              |

### Service Account Impersonation

| Principal             | Target              | Role                                   | Purpose                                 |
| --------------------- | ------------------- | -------------------------------------- | --------------------------------------- |
| GitHub OIDC principal | `github-actions-sa` | `roles/iam.workloadIdentityUser`       | Allow impersonation from GitHub Actions |
| GitHub OIDC principal | `github-actions-sa` | `roles/iam.serviceAccountTokenCreator` | Generate access tokens                  |

The GitHub OIDC principal is scoped to a specific repository via the attribute condition:

```
assertion.repository == '{githubOrg}/{githubRepo}'
```

### Resource-Level Roles

| Principal                 | Resource                     | Role                                         | Purpose                                       |
| ------------------------- | ---------------------------- | -------------------------------------------- | --------------------------------------------- |
| GCS storage service agent | `gcs-archive-encryption-key` | `roles/cloudkms.cryptoKeyEncrypterDecrypter` | Encrypt/decrypt objects in raw-archive bucket |

## Workload Identity Federation

| Component     | Value                                         |
| ------------- | --------------------------------------------- |
| Identity Pool | `shared-identity-pool`                        |
| OIDC Provider | `github-actions-oidc-provider`                |
| Issuer URI    | `https://token.actions.githubusercontent.com` |

**Attribute Mapping:**

| Google Attribute       | GitHub Token Claim     |
| ---------------------- | ---------------------- |
| `google.subject`       | `assertion.sub`        |
| `attribute.actor`      | `assertion.actor`      |
| `attribute.repository` | `assertion.repository` |

## Note on Potential Security Improvements

The GitHub Actions service account currently has broad project-level permissions (`roles/editor`, `roles/cloudkms.admin`). For production environments with stricter security requirements, the following changes could be made:

- Replacing `roles/editor` with specific resource-level roles
- Scoping `roles/cloudkms.admin` to specific key rings rather than project-wide
- Adding conditional IAM bindings based on resource tags

## Consumer System IAM

Shared infrastructure defines only the IAM bindings listed above. Individual systems (ingestion, persistence, analysis) define their own service accounts and bindings as needed. Consumer systems may receive:

- Publisher/subscriber access to `observations-topic`
- Object read/write access to `raw-archive-bucket`
- Encrypter/decrypter access to KMS keys

These bindings are not defined in shared infrastructure and should be documented in each system's IAM model.
