# Infrastructure Runbook

Operational procedures for deploying and troubleshooting `core-infra`.

## Configuration

Reference for the `core` Pulumi config namespace, read by `src/config.ts`. Every key is required
unless noted, and must be set with `pulumi config set core:<key> <value> --stack=<dev|prod>` (or
directly in `Pulumi.<stack>.yml`) before the stack will deploy.

| Key                           | Description                                                                                                   | dev                       | prod                       |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------- | -------------------------- |
| `core:project`                | GCP project ID this stack deploys into                                                                        | `fact-check-database-dev` | `fact-check-database-core` |
| `core:region`                 | GCP region for regional resources (the Artifact Registry, the staging bucket)                                 | `us-central1`             | `us-central1`              |
| `core:kmsLocation`            | Location of the CMEK key ring                                                                                 | `us-central1`             | `us-central1`              |
| `core:githubOrg`              | GitHub organization allowed to assume the CI/CD identity                                                      | `ajaremko`                | `ajaremko`                 |
| `core:githubRepo`             | GitHub repository allowed to assume the CI/CD identity                                                        | `fact-check-database`     | `fact-check-database`      |
| `core:workloadIdentityPoolId` | ID of the workload identity pool                                                                              | `shared-identity-pool-01` | `shared-identity-pool-01`  |
| `core:batchRetentionDays`     | Days before a batch file under `v1/type=fact_checks/` is deleted by the staging bucket's lifecycle rule       | `1`                       | `1`                        |
| `core:forceDestroyStorage`    | Whether `pulumi destroy` may delete a non-empty staging bucket. Default `false`.                              | `true`                    | `false`                    |
| `core:retainStorageOnDelete`  | Whether the staging bucket survives `pulumi destroy` instead of being deleted with the stack. Default `true`. | `false`                   | `true`                     |

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

Outside of the [initial bootstrap](./bootstrap.md), most deployments run through GitHub Actions.

**Manual deployment:**

```bash
nx preview core-infra --stack=<dev|prod>   # review changes
nx deploy core-infra --stack=<dev|prod>    # apply them
```

Deploy manually when:

- Running the initial bootstrap deployment.
- Automatic deployment fails because the GitHub Actions service account lacks a needed permission.

**Automatic deployment:** a push to `main` triggers
[`ci.yml`](../../../.github/workflows/ci.yml), which deploys the `dev` stack.
[`deploy.yml`](../../../.github/workflows/deploy.yml) deploys a chosen environment on manual
dispatch.

## Validating changes before merging

There is no automated `pulumi preview` check on pull requests — `ci.yml` only runs
`nx affected -t lint,test,build` before a merge to `main` triggers a real deploy to `dev`. Before
merging a change to this project, run a preview locally against `dev` and read the diff:

```bash
nx preview core-infra --stack=dev
```

Treat any resource replacement (not just an in-place update) as a reason to pause and confirm the
change is intentional — a replacement of the staging bucket, key ring, or artifact registry
destroys and recreates a resource every downstream project depends on.

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
objects failing to write to an encrypted bucket.

1. Confirm the key exists:
   `gcloud kms keys list --location=us-central1 --keyring=core-key-ring --project=$PROJECT_ID`
2. Check its IAM policy:
   `gcloud kms keys get-iam-policy <key-name> --location=us-central1 --keyring=core-key-ring --project=$PROJECT_ID`
3. Confirm the _consuming_ project's service account (for example `ingestion-infra`'s GCS
   service agent) has `roles/cloudkms.cryptoKeyEncrypterDecrypter` on the key — that binding
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
3. Confirm `github-actions-sa` has `roles/iam.workloadIdentityUser` for the identity pool
   principal: `gcloud iam service-accounts get-iam-policy github-actions-sa@$PROJECT_ID.iam.gserviceaccount.com`
4. Confirm the workflow has `id-token: write` permission and its `workload_identity_provider` /
   `service_account` inputs match this stack's outputs.

**Resolution:** update the attribute condition if the org or repo changed; re-grant
`workloadIdentityUser` if the binding was removed; confirm the workflow YAML matches the current
stack outputs (see the [README](../README.md#cicd-identity)).

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
