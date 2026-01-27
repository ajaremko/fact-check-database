# Shared Infrastructure Runbook

Operational procedures for deploying and troubleshooting shared infrastructure.

## Redeploying Shared Infrastructure

**Outside of the [initial bootstrap procedure](./bootstrap.md), most deployments can be carried out by github action workflows.**

### Manual Deployment

To run a deployment manually, first review changes before applying:

```bash
nx preview infra
```

Apply changes:

```bash
nx deploy infra
```

When to deploy manually:

- Initial bootstrap deployment
- When automatic deployment fails due to incorrect or missing permissions on the Github Action service account
- After rotating KMS keys

### Automatic Deployment

Changes pushed to the `main` branch of the repository will trigger the [CI workflow](../../../.github/workflows/ci.yml). This workflow run the pulumi deploy command automatically to update the development deployment.

When to deploy automatically:

- After modifying Pulumi stack configuration
- After updating infrastructure code

### Deployment Order

Shared infrastructure must be deployed before any consumer system. If redeploying after changes that affect outputs (topic names, bucket names, key names), downstream systems may need redeployment to pick up new references.

## Troubleshooting: Bucket Creation Failures

### Symptoms

- Pulumi reports "Error creating Bucket"
- "Billing account not found" or "billing is disabled"
- "Location constraint" errors

### Diagnostic Steps

1. **Check billing status:**

   ```bash
   gcloud billing projects describe $PROJECT_ID
   ```

2. **Verify storage API is enabled:**

   ```bash
   gcloud services list --enabled --project=$PROJECT_ID | grep storage
   ```

3. **Check service account permissions:**
   ```bash
   gcloud projects get-iam-policy $PROJECT_ID \
     --flatten="bindings[].members" \
     --filter="bindings.role:roles/storage"
   ```

### Resolution

- Link billing account if missing
- Enable `storage.googleapis.com` API
- Grant `roles/storage.admin` to deploying service account

## Troubleshooting: CMEK Permission Errors

### Symptoms

- "Permission denied on Cloud KMS key"
- "cryptoKeyVersions.useToEncrypt" permission errors
- Objects fail to write to encrypted bucket

### Diagnostic Steps

1. **Verify the KMS key exists and is enabled:**

   ```bash
   gcloud kms keys list \
     --location=us \
     --keyring=<keyring-name> \
     --project=$PROJECT_ID
   ```

2. **Check the key's IAM policy:**

   ```bash
   gcloud kms keys get-iam-policy <key-name> \
     --location=us \
     --keyring=<keyring-name> \
     --project=$PROJECT_ID
   ```

3. **Verify the GCS service account has encrypter/decrypter role:**

   ```bash
   # Get the GCS service account
   gcloud storage service-agent --project=$PROJECT_ID

   # Should show: service-<project-number>@gs-project-accounts.iam.gserviceaccount.com
   ```

### Resolution

- Grant `roles/cloudkms.cryptoKeyEncrypterDecrypter` to the GCS service account on the specific key
- Verify the key is not disabled or scheduled for destruction
- Check that the key ring location matches the bucket location requirements

## Troubleshooting: CI Authentication Failures

### Symptoms

- GitHub Actions workflow fails with "Unable to authenticate"
- "Token exchange failed" errors
- "Permission denied" when impersonating service account

### Diagnostic Steps

1. **Verify the workload identity pool exists:**

   ```bash
   gcloud iam workload-identity-pools describe shared-identity-pool-01 \
     --location=global \
     --project=$PROJECT_ID
   ```

2. **Verify the OIDC provider exists and has correct configuration:**

   ```bash
   gcloud iam workload-identity-pools providers describe github-actions-oidc-provider \
     --workload-identity-pool=shared-identity-pool-01 \
     --location=global \
     --project=$PROJECT_ID
   ```

3. **Check the attribute condition matches the repository:**
   The provider should have an attribute condition like:

   ```
   assertion.repository == 'org/repo'
   ```

4. **Verify service account IAM bindings:**

   ```bash
   gcloud iam service-accounts get-iam-policy \
     github-actions-sa@$PROJECT_ID.iam.gserviceaccount.com
   ```

   Should include `roles/iam.workloadIdentityUser` for the identity pool principal.

5. **Check GitHub workflow configuration:**
   - Workflow must have `id-token: write` permission
   - `workload_identity_provider` must match the provider name
   - `service_account` must match the service account email

### Resolution

- Update attribute condition if repository name changed
- Re-grant workloadIdentityUser role if binding was removed
- Verify the GitHub workflow YAML matches Pulumi stack outputs

## Logs and Audit Information

### Cloud Audit Logs

Access audit logs in the GCP Console:

- **Navigation:** Logging > Logs Explorer
- **Filter by service:** `protoPayload.serviceName="cloudkms.googleapis.com"` for KMS operations

Or via CLI:

```bash
gcloud logging read "protoPayload.serviceName=cloudkms.googleapis.com" \
  --project=$PROJECT_ID \
  --limit=50
```

### KMS Key Usage

View key usage and operations:

```bash
gcloud logging read 'resource.type="cloudkms_cryptokey"' \
  --project=$PROJECT_ID \
  --limit=50
```

### IAM Policy Changes

Audit IAM modifications:

```bash
gcloud logging read 'protoPayload.methodName="SetIamPolicy"' \
  --project=$PROJECT_ID \
  --limit=50
```

### Pulumi State and History

View deployment history:

```bash
cd apps/infra
pulumi stack history
```

View current stack outputs:

```bash
pulumi stack output
```

Export current state for inspection:

```bash
pulumi stack export
```
