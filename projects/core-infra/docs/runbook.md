# Infrastructure Runbook

Operational procedures for deploying and troubleshooting `core-infra`.

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
- After rotating a KMS key.

**Automatic deployment:** a push to `main` triggers
[`ci.yml`](../../../.github/workflows/ci.yml), which deploys the `dev` stack.
[`deploy.yml`](../../../.github/workflows/deploy.yml) deploys a chosen environment on manual
dispatch.

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
stack outputs (see [docs/contracts.md](./contracts.md)).

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
