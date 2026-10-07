# Infrastructure Runbook

Operational procedures for deploying and troubleshooting `core-infra`.

## Configuration

Reference for the `core` Pulumi config namespace, read by `src/config.ts`. Every key is required
unless noted, and must be set with `pulumi config set core:<key> <value> --stack=<dev|prod>` (or
directly in `Pulumi.<stack>.yml`) before the stack will deploy.

| Key                           | Description                                                                                                       | dev                           | prod                          |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------- | ----------------------------- | ----------------------------- |
| `core:project`                | GCP project ID this stack deploys into                                                                            | `fact-check-database-dev`     | `fact-check-database-core`    |
| `core:region`                 | GCP region for regional resources (the Artifact Registry, the staging bucket)                                     | `us-central1`                 | `us-central1`                 |
| `core:kmsLocation`            | Location of the CMEK key ring                                                                                     | `us-central1`                 | `us-central1`                 |
| `core:bigQueryKmsLocation`    | Location of the BigQuery key's key ring. Must match the location of the BigQuery datasets. Optional, default `us` | unset                         | unset                         |
| `core:githubOrg`              | GitHub organization allowed to assume the CI/CD identity                                                          | `ajaremko`                    | `ajaremko`                    |
| `core:githubRepo`             | GitHub repository allowed to assume the CI/CD identity                                                            | `fact-check-database`         | `fact-check-database`         |
| `core:releaseWorkflow`        | The one workflow file and branch that may act as the release identity, as `<file>@<ref>`                          | `ci.yml@refs/heads/main`      | `release.yml@refs/heads/prod` |
| `core:previewWorkflow`        | The one workflow file and branch that may act as the preview identity                                             | `preview.yml@refs/heads/main` | `preview.yml@refs/heads/main` |
| `core:workloadIdentityPoolId` | ID of the workload identity pool                                                                                  | `shared-identity-pool-01`     | `shared-identity-pool-01`     |
| `core:batchRetentionDays`     | Days before a batch file under `v1/type=fact_checks/` is deleted by the staging bucket's lifecycle rule           | `1`                           | `1`                           |
| `core:forceDestroyStorage`    | Whether `pulumi destroy` may delete a non-empty staging bucket. Default `false`.                                  | `true`                        | `false`                       |
| `core:retainStorageOnDelete`  | Whether the staging bucket survives `pulumi destroy` instead of being deleted with the stack. Default `true`.     | `false`                       | `true`                        |

Every domain project points back at this stack through its own `<domain>:coreStackName` config
key (for example `ingestion:coreStackName`) and a Pulumi `StackReference` — see the
[README](../README.md#consuming-these-outputs) for what each one reads from here.

## Deployment ordering

`core-infra` must be deployed before any domain project (`ingestion-infra`, `analysis-infra`,
`website-infra`) — each opens a `StackReference` to this stack and fails to deploy if it doesn't
exist yet. `research-infra` depends on `analysis-infra` instead, so it deploys after that.

If a change here affects an output a downstream project reads (a renamed key, a replaced
resource), that downstream project needs to be redeployed to pick up the new value — a
`StackReference` is resolved at the consumer's deploy time, not pushed when core-infra changes.

Each domain project's own `docs/bootstrap.md` covers creating its GCP project and pointing its
`coreStackName` config back at this stack; this runbook covers only `core-infra` itself.

## Redeploying

Every stack in this repository is deployed by hand. No GitHub Actions workflow deploys
infrastructure, and no GitHub Actions identity has the rights to.

```bash
nx preview core-infra --stack=<dev|prod>   # review changes
nx deploy core-infra --stack=<dev|prod>    # apply them
```

Deploy the dev stack from a clean checkout of `main`, and the prod stack from a clean checkout of
`prod`. [docs/git-strategy.md](../../../docs/git-strategy.md) describes what each branch stands
for and how a change is promoted. Pulumi Cloud records each update, who ran it and from which
commit, which is the audit trail for deployments.

## Validating changes before merging

Pull requests run lint, test, typecheck and build ([`pr.yml`](../../../.github/workflows/pr.yml)).
They do not preview infrastructure. Before merging a change to this project, run a preview
locally against `dev` and read the diff:

```bash
nx preview core-infra --stack=dev
```

Treat any resource replacement (not just an in-place update) as a reason to pause and confirm the
change is intentional — a replacement of the staging bucket, key ring, or artifact registry
destroys and recreates a resource every downstream project depends on.

## The daily drift preview

[`preview.yml`](../../../.github/workflows/preview.yml) runs `pulumi preview` every day at 06:00
UTC against the core, ingestion, analysis and research stacks, in dev and prod. It can also be
run by hand from the Actions tab. `website-infra` is not covered, because previewing it needs an
Algolia admin key.

- **A job fails when its stack has pending changes.** That means the code differs from what was
  last deployed. The job summary shows the diff. The usual resolution is to deploy the stack.
- **Each environment is compared with the branch it is deployed from.** Dev jobs read `main` and
  prod jobs read `prod`. A change that is on `main` and not yet promoted does not fail a prod job.
  The exception is a diff that shows only the `ingestion-infra` dashboard, which has a
  [different cause](../../ingestion-infra/docs/runbook.md#the-daily-preview-reports-the-dashboard-as-changed).
- **It compares code with Pulumi's recorded state**, not with the live cloud. It does not notice a
  resource changed by hand in the console.
- **It cannot change cloud resources.** It runs as `github-preview-sa`, which can only view them.
- **Its Pulumi token is not read-only.** It uses the `PULUMI_ACCESS_TOKEN` secret, a full-access
  token, because the Pulumi plan in use offers no read-only one. With it, a workflow could alter
  or delete a stack's recorded state, though not the cloud resources themselves. `preview.yml` is
  the only workflow that receives it. Replace it with a read-only token if the plan ever allows.

## GitHub Actions configuration

The workflows take the names they need from repository variables, not from Pulumi, so the release
workflows hold no Pulumi token.

| Variable (`DEV_` and `PROD_` of each) | Value                             | Source                                        |
| ------------------------------------- | --------------------------------- | --------------------------------------------- |
| `GCP_PROJECT_ID`                      | The core project's id             | `gcpProject` output                           |
| `WIF_PROVIDER`                        | The identity provider's full name | `githubActionIdentityPoolProviderName` output |
| `RELEASE_SERVICE_ACCOUNT`             | The release identity's email      | `githubActionServiceAccountEmail` output      |
| `PREVIEW_SERVICE_ACCOUNT`             | The preview identity's email      | `githubPreviewServiceAccountEmail` output     |
| `ARTIFACT_REGISTRY_URI`               | The registry's URI                | `artifactRegistryUri` output                  |
| `ARTIFACT_REGISTRY_BASE_URI`          | The registry's host               | `artifactRegistryBaseUri` output              |

None is secret. Update a variable if its output ever changes, for example after recreating the
identity pool: `gh variable set DEV_WIF_PROVIDER --body "$(pulumi stack output githubActionIdentityPoolProviderName --stack=dev)"`.

The one secret is `PULUMI_ACCESS_TOKEN`, used only by the preview workflow. The release workflows
do not receive it.

## KMS key rotation

The 90-day rotation `docs/encryption.md` describes is automatic and requires no operator action:
Cloud KMS creates a new primary key version on schedule, new encrypt operations use it, and
existing data stays readable because old key versions are retained and still decrypt it. No
redeploy is needed — Pulumi's `CryptoKey` resource manages the rotation policy, not individual
key versions.

A manual rotation (for example, responding to a suspected key compromise) is a rare exception:
create a new version and promote it to primary directly against the key —

```bash
gcloud kms keys versions create --key=<key-name> --location=us-central1 --keyring=core-key-ring \
  --project=$PROJECT_ID
gcloud kms keys set-primary-version --key=<key-name> --location=us-central1 --keyring=core-key-ring \
  --project=$PROJECT_ID --version=<new-version-number>
```

The BigQuery key is in a different key ring and location: use `--location=us
--keyring=core-bigquery-key-ring` for it. Keep old versions of either key enabled. Data written
under an old version is unreadable once that version is disabled or destroyed.

— which also needs no redeploy, since every Pulumi resource and downstream IAM grant references
the key by name, not by version.

## Troubleshooting: bucket creation failures

**Symptoms:** "Error creating Bucket", "billing is disabled", "Location constraint" errors.

1. Check billing: `gcloud billing projects describe $PROJECT_ID`
2. Check the Storage API is enabled:
   `gcloud services list --enabled --project=$PROJECT_ID | grep storage`
3. Check the deploying identity's storage permissions:
   ```bash
   gcloud projects get-iam-policy $PROJECT_ID \
     --flatten="bindings[].members" --filter="bindings.role:roles/storage"
   ```

**Resolution:** link billing, enable `storage.googleapis.com`, grant `roles/storage.admin` to the
deploying identity.

## Troubleshooting: CMEK permission errors

**Symptoms:** "Permission denied on Cloud KMS key", `cryptoKeyVersions.useToEncrypt` errors,
objects failing to write to an encrypted bucket, or BigQuery loads and queries failing on the
analysis tables.

The commands below name the archive key's key ring. For the BigQuery key, substitute
`--location=us --keyring=core-bigquery-key-ring`.

1. Confirm the key exists:
   `gcloud kms keys list --location=us-central1 --keyring=core-key-ring --project=$PROJECT_ID`
2. Check its IAM policy:
   `gcloud kms keys get-iam-policy <key-name> --location=us-central1 --keyring=core-key-ring --project=$PROJECT_ID`
3. Confirm the _consuming_ project's service account (`ingestion-infra`'s GCS service agent for
   the archive key, `analysis-infra`'s BigQuery service agent for the BigQuery key) has `roles/cloudkms.cryptoKeyEncrypterDecrypter` on the key — that binding
   lives in the consuming project, not here.

**Resolution:** grant the missing binding in the consuming project; verify the key isn't
disabled or scheduled for destruction; confirm the key ring's location matches the bucket's.

## Troubleshooting: CI authentication failures

**Symptoms:** "Unable to authenticate", "Token exchange failed", "Permission denied"
impersonating the service account.

1. Confirm the identity pool exists:
   `gcloud iam workload-identity-pools describe shared-identity-pool-01 --location=global --project=$PROJECT_ID`
2. Confirm the OIDC provider exists with the right attribute condition:
   `gcloud iam workload-identity-pools providers describe github-actions-oidc-provider --workload-identity-pool=shared-identity-pool-01 --location=global --project=$PROJECT_ID`
3. Confirm the service account (`github-actions-sa` or `github-preview-sa`) has
   `roles/iam.workloadIdentityUser` for the right workflow principal:
   `gcloud iam service-accounts get-iam-policy github-actions-sa@$PROJECT_ID.iam.gserviceaccount.com`.
   The principal names one workflow file and branch. A workflow that was renamed, or a run from
   another branch, is refused by design: update `core:releaseWorkflow` or `core:previewWorkflow`
   and redeploy.
4. Confirm the job has `id-token: write` permission and that the repository variables match this
   stack's outputs (see [GitHub Actions configuration](#github-actions-configuration)).

**Resolution:** update the attribute condition if the org or repo changed; re-grant
`workloadIdentityUser` if the binding was removed; confirm the repository variables match the
current stack outputs (see the [README](../README.md#cicd-identities)).

## Troubleshooting: loads fail with a missing schema file

**Symptom:** `analysis-loader` logs `Load request failed` with `error._tag: StorageReadError` and
`No such object: …/schemas/fact_checks_table_schema_v1.json`.

**Cause:** the schema object is no longer in the staging bucket, while Pulumi's state still records
it as present. Before the lifecycle rule was scoped to batch files, it deleted this object a day
after each deploy.

**Steps:**

1. Confirm the object is missing: `gcloud storage ls gs://<staging-bucket>/schemas/`.
2. Redeploy with a refresh, so Pulumi notices the missing object and uploads it again:
   `pulumi up --refresh`.
3. The loader retries a failed schema read on the next request, so no restart is needed.

## Rolling back a deploy

Prefer reverting the git commit that introduced the bad change and redeploying over hand-editing
Pulumi state — the state file is a derived record of what's actually running, not a source of
truth to edit directly.

1. Find the last good update: `pulumi stack history --stack=<dev|prod>`.
2. If an update is still in progress or was interrupted (a CI run cancelled mid-apply, a local
   `nx deploy` killed with Ctrl-C), clear it before retrying: `pulumi cancel --stack=<dev|prod>`.
3. Revert the offending commit in git, then redeploy: `nx deploy core-infra --stack=<dev|prod>`.
4. If a resource was changed outside of Pulumi (a manual `gcloud` command, a console edit), run
   `pulumi refresh --stack=<dev|prod>` to reconcile Pulumi's state with reality before the next
   deploy, rather than letting the next `pulumi up` fight an unexpected diff.

## Revoking operator access

This project has exactly one operator identity today — see
[docs/bootstrap.md](./bootstrap.md#pulumi-cloud-account-and-access-token) and
[Create Core GCP Project and Root Service Account](./bootstrap.md#create-core-gcp-project-and-root-service-account)
for how it was set up. To revoke it:

- **GCP service account key**: delete or rotate the `pulumi-cli` service account's JSON key from
  the GCP console (IAM → Service Accounts → Keys), or delete the service account itself if it's
  being replaced.
- **Pulumi Cloud access token**: revoke it from **Settings → Access Tokens** in the Pulumi Cloud
  console, then generate a replacement if deploys need to continue under a new token.
- **Project ownership**: the `pulumi-cli` service account holds the `Owner` role directly on both
  GCP projects. Revoking it without first granting `Owner` (or an equivalent role) to a
  replacement principal will leave the projects without an administrator able to manage IAM.

This is distinct from revoking a _consuming_ project's access to a CMEK key, which is scoped to
that project and covered in [docs/encryption.md](./encryption.md#access-model).

## Audit logs

```bash
# KMS operations
gcloud logging read 'protoPayload.serviceName="cloudkms.googleapis.com"' --project=$PROJECT_ID --limit=50

# IAM policy changes
gcloud logging read 'protoPayload.methodName="SetIamPolicy"' --project=$PROJECT_ID --limit=50
```

Pulumi state:

```bash
cd projects/core-infra
pulumi stack history --stack=<dev|prod>
pulumi stack output --stack=<dev|prod>
```
