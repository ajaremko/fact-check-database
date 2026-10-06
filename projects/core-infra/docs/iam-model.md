# IAM Model

The IAM principals, roles, and bindings this project creates for GitHub Actions. Infrastructure is
deployed by hand, so no GitHub Actions identity can create, change or delete infrastructure.

## The two identities

|                   | Release identity                                                                                                | Preview identity                                                                                |
| ----------------- | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Account ID        | `github-actions-sa`                                                                                             | `github-preview-sa`                                                                             |
| Purpose           | Pushes container images                                                                                         | Reads resources for the daily `pulumi preview`                                                  |
| May be assumed by | One workflow on one branch: `ci.yml` on `main` in dev, `release.yml` on `prod` in prod (`core:releaseWorkflow`) | `preview.yml` on `main` (`core:previewWorkflow`)                                                |
| Holds             | `roles/artifactregistry.writer` on the shared registry, and nothing else                                        | `roles/viewer` on this project. Each stack with a project of its own grants the same role there |
| Authentication    | Workload identity federation (OIDC). No key exists                                                              | The same                                                                                        |

What each can and cannot do:

- **The release identity** can push and pull images in one registry. It holds no project-level
  role, so it cannot read data, change infrastructure, or touch keys.
- **The preview identity** can view resource configuration. It cannot change anything, and viewer
  does not include reading bucket objects, BigQuery table data or secret values.

## Service account impersonation

Each identity trusts runs of exactly one workflow file on one branch. A run of any other
workflow, or of the same workflow on another branch, is refused.

| Principal                                         | Role                                                                     | On                  |
| ------------------------------------------------- | ------------------------------------------------------------------------ | ------------------- |
| Runs whose `workflow_ref` is the release workflow | `roles/iam.workloadIdentityUser`, `roles/iam.serviceAccountTokenCreator` | `github-actions-sa` |
| Runs whose `workflow_ref` is the preview workflow | `roles/iam.workloadIdentityUser`, `roles/iam.serviceAccountTokenCreator` | `github-preview-sa` |

The principal is written against the identity pool as
`attribute.workflow_ref/<org>/<repo>/.github/workflows/<file>@refs/heads/<branch>`.

To revoke either identity's access, remove its `workloadIdentityUser` binding, or its role grant.

## Workload identity federation

| Component     | Value                                                      |
| ------------- | ---------------------------------------------------------- |
| Identity pool | `shared-identity-pool` (pool ID `shared-identity-pool-01`) |
| OIDC provider | `github-actions-oidc-provider`                             |
| Issuer        | `https://token.actions.githubusercontent.com`              |

The provider accepts tokens from this repository only:

```
assertion.repository == '${githubOrg}/${githubRepo}'
```

Attribute mapping:

| Google attribute         | GitHub token claim       |
| ------------------------ | ------------------------ |
| `google.subject`         | `assertion.sub`          |
| `attribute.actor`        | `assertion.actor`        |
| `attribute.repository`   | `assertion.repository`   |
| `attribute.workflow_ref` | `assertion.workflow_ref` |

## What is not covered

- Whoever deploys by hand uses their own Google Cloud credentials, with whatever roles those
  carry. This project does not define or limit them.
- The Pulumi Cloud token used by the preview workflow is managed in Pulumi Cloud and GitHub, not
  here. It is a full-access token: it can change a stack's recorded state, though the identity the
  workflow runs as cannot change cloud resources.

## Note

An earlier version of this document listed a resource-level grant of the GCS service account on
`gcs-archive-encryption-key`. That binding is created in `ingestion-infra`, the project that owns
the bucket the key protects, not here. See [docs/encryption.md](./encryption.md).
