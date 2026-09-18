# IAM Model

The IAM principals, roles, and bindings this project creates for CI/CD deployment.

## GitHub Actions service account

| Property       | Value                                                                           |
| -------------- | ------------------------------------------------------------------------------- |
| Account ID     | `github-actions-sa`                                                             |
| Purpose        | Impersonated by every GitHub Actions workflow in this repository to deploy      |
| Authentication | Workload identity federation (OIDC) — no long-lived key exists for this account |

## Project-level roles

Granted to `github-actions-sa` on the `core` project:

| Role                                   | Purpose                                                                               |
| -------------------------------------- | ------------------------------------------------------------------------------------- |
| `roles/editor`                         | General resource creation and modification across every project this identity deploys |
| `roles/serviceusage.serviceUsageAdmin` | Enable and disable GCP APIs                                                           |
| `roles/iam.serviceAccountAdmin`        | Create and manage service accounts                                                    |
| `roles/compute.admin`                  | Manage compute resources                                                              |
| `roles/cloudkms.admin`                 | Manage KMS keys and key rings                                                         |

These roles are broad by design — the same identity deploys `core-infra` and every domain
project — and are the clearest candidate for tightening if this platform ever needed more than
one deploying identity. See "Possible improvements" below.

## Service account impersonation

| Principal                                                     | Role on `github-actions-sa`            | Purpose                                        |
| ------------------------------------------------------------- | -------------------------------------- | ---------------------------------------------- |
| GitHub OIDC principal, scoped to `${githubOrg}/${githubRepo}` | `roles/iam.workloadIdentityUser`       | Allow impersonation from a GitHub Actions run  |
| GitHub OIDC principal, scoped to `${githubOrg}/${githubRepo}` | `roles/iam.serviceAccountTokenCreator` | Generate short-lived access tokens for the run |

The attribute condition restricting both bindings:

```
assertion.repository == '${githubOrg}/${githubRepo}'
```

## Workload identity federation

| Component     | Value                                                      |
| ------------- | ---------------------------------------------------------- |
| Identity pool | `shared-identity-pool` (pool ID `shared-identity-pool-01`) |
| OIDC provider | `github-actions-oidc-provider`                             |
| Issuer        | `https://token.actions.githubusercontent.com`              |

Attribute mapping:

| Google attribute       | GitHub token claim     |
| ---------------------- | ---------------------- |
| `google.subject`       | `assertion.sub`        |
| `attribute.actor`      | `assertion.actor`      |
| `attribute.repository` | `assertion.repository` |

## Possible improvements

- Replace `roles/editor` with the specific resource-level roles each deploy step actually needs.
- Scope `roles/cloudkms.admin` to the one key ring this project manages, rather than the whole
  project.
- Add conditional IAM bindings keyed on resource labels if more than one team ever deploys
  through this identity.

## Note

An earlier version of this document listed a resource-level grant of the GCS service account on
`gcs-archive-encryption-key`. That binding is created in `ingestion-infra` — the project that
owns the bucket the key protects — not here. See [docs/encryption.md](./encryption.md).
