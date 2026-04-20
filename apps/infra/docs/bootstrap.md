# Bootstrap and First Deployment

This document covers the one-time manual steps required to bootstrap core infrastructure before CI/CD can run unattended.

## Why Manual Bootstrap Is Required

Core infrastructure creates the CI/CD identity (GitHub Actions service account and workload identity provider) that all subsequent deployments use. This creates a chicken-and-egg problem: the identity CI needs to authenticate doesn't exist until core infrastructure is deployed.

A human administrator must run the first deployment using a temporary bootstrap service account with elevated permissions. After this initial deployment, CI/CD can operate fully unattended using workload identity federation.

## Prerequisites

Before starting, ensure you have:

- GCP account with billing enabled
- `gcloud` CLI installed and authenticated
- Pulumi CLI installed with access token configured (`PULUMI_ACCESS_TOKEN`)
- Node.js 18+ (for Pulumi runtime)

If developing within the devcontainer configured in this repository, gcloud, pulumi and node will already be installed and configured correctly.

## Step 1: Create GCP Project

Create a new GCP project and link it to a billing account:

```bash
# Set your desired project ID
export PROJECT_ID="news-research-dev"

# Create the project
gcloud projects create $PROJECT_ID --name="News Research Dev"

# Link to billing (replace BILLING_ACCOUNT_ID with your billing account)
gcloud billing projects link $PROJECT_ID --billing-account=BILLING_ACCOUNT_ID

# Set as active project
gcloud config set project $PROJECT_ID
```

## Step 2: Create Bootstrap Service Account

### Create a Service Account

Run the following commands in the [Cloud Shell](https://console.cloud.google.com/cloudshell) feature of the GCP Console. Cloud Shell provides a pre-authenticated environment with `gcloud` already configured.

Create a temporary service account with elevated permissions for the initial deployment:

```bash
# Create the bootstrap service account
gcloud iam service-accounts create bootstrap-deployer \
  --display-name="Bootstrap Deployer" \
  --description="Temporary account for initial infrastructure deployment"

# Store the service account email
export BOOTSTRAP_SA="bootstrap-deployer@${PROJECT_ID}.iam.gserviceaccount.com"
```

Grant the Owner role:

```bash
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${BOOTSTRAP_SA}" \
  --role="roles/owner"
```

> **Note:** Using granular roles (Editor, IAM Admin, KMS Admin, etc.) is more secure. However, for this situation, the Owner role simplifies setup. The bootstrap service account and its credentials should still be deleted after the initial deployment.

### Multi-Project Deployments

Infrastructure modules can deploy resources to different GCP projects. In production configurations, this enables separation of concerns (e.g., core platform infrastructure in one project, ingestion workloads in another).

The bootstrap service account must have the required roles in **every** GCP project where infrastructure will be deployed. For each additional project:

```bash
export ADDITIONAL_PROJECT_ID="news-research-ingestion"

gcloud projects add-iam-policy-binding $ADDITIONAL_PROJECT_ID \
  --member="serviceAccount:${BOOTSTRAP_SA}" \
  --role="roles/owner"
```

Generate a JSON key for Pulumi authentication:

```bash
# Create and download the key
gcloud iam service-accounts keys create bootstrap-key.json \
  --iam-account=$BOOTSTRAP_SA

# Configure Pulumi to use this key
export GOOGLE_CREDENTIALS=$(cat bootstrap-key.json)
```

## Step 3: Enable Initial APIs

Enable the APIs required before Pulumi can run. Pulumi will enable additional APIs, but these must be available first:

```bash
gcloud services enable cloudresourcemanager.googleapis.com --project=$PROJECT_ID
gcloud services enable iam.googleapis.com --project=$PROJECT_ID
gcloud services enable iamcredentials.googleapis.com --project=$PROJECT_ID
gcloud services enable sts.googleapis.com --project=$PROJECT_ID
```

## Step 4: Configure Pulumi Stack

Navigate to the shared infrastructure directory and select the appropriate stack:

```bash
cd apps/infra

# Select or create the stack
pulumi stack select dev  # or 'prod' for production
```

See [Stack Configuration](./configuration.md) for the full list of configuration values and their descriptions.

## Step 5: Run First Deployment

Preview the changes to verify configuration:

```bash
nx preview infra
```

If the preview looks correct, apply the changes:

```bash
nx deploy infra
```

This deployment creates all infrastructure resources. See the [README](../README.md) for a complete list of what gets provisioned.

After successful deployment, note the stack outputs:

```bash
pulumi stack output
```

Key outputs needed for CI/CD setup:

| Output                                 | Purpose                               |
| -------------------------------------- | ------------------------------------- |
| `githubActionServiceAccountEmail`      | Service account CI will impersonate   |
| `githubActionIdentityPoolProviderName` | Workload identity provider for GitHub |
| `gcpProject`                           | GCP project ID                        |

## Step 6: Configure CI/CD

After the first deployment, configure GitHub Actions to use workload identity federation.

### Add Repository Secret

Add the Pulumi access token as a repository secret:

1. Go to repository Settings > Secrets and variables > Actions
2. Create a new secret named `PULUMI_ACCESS_TOKEN`
3. Set the value to your Pulumi access token

### Verify CI Authentication

The CI workflow reads stack outputs to configure workload identity authentication:

1. `gcpProject` - Target GCP project
2. `githubActionIdentityPoolProviderName` - OIDC provider for authentication
3. `githubActionServiceAccountEmail` - Service account to impersonate

No additional configuration is required. GitHub Actions will authenticate using OIDC tokens that are validated against the workload identity provider created during bootstrap.

## Step 7: Cleanup Bootstrap Credentials

After CI/CD is verified working, remove the bootstrap service account key:

```bash
# List keys for the bootstrap service account
gcloud iam service-accounts keys list --iam-account=$BOOTSTRAP_SA

# Delete the key (replace KEY_ID with the actual key ID)
gcloud iam service-accounts keys delete KEY_ID --iam-account=$BOOTSTRAP_SA

# Delete the local key file
rm bootstrap-key.json

# Optionally delete the bootstrap service account entirely
gcloud iam service-accounts delete $BOOTSTRAP_SA
```

This cleanup is important for security hygiene. After bootstrap, no long-lived service account keys should exist. All deployments should use workload identity federation.

## Troubleshooting

### API Not Enabled Errors

If you see errors about APIs not being enabled:

```bash
# Check which APIs are enabled
gcloud services list --enabled --project=$PROJECT_ID

# Enable the missing API
gcloud services enable <api-name>.googleapis.com --project=$PROJECT_ID
```

### Permission Denied Errors

If Pulumi reports permission denied:

1. Verify the bootstrap service account has all required roles
2. Check that `GOOGLE_CREDENTIALS` is set correctly
3. Ensure the service account key hasn't expired

```bash
# Verify roles
gcloud projects get-iam-policy $PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:${BOOTSTRAP_SA}"
```

### Billing Not Linked

If resource creation fails with billing errors:

```bash
# Check billing status
gcloud billing projects describe $PROJECT_ID

# Link to billing account
gcloud billing projects link $PROJECT_ID --billing-account=BILLING_ACCOUNT_ID
```

### Workload Identity Not Working

If CI/CD fails to authenticate after bootstrap:

1. Verify the GitHub repository matches `platform:githubOrg/platform:githubRepo` configuration
2. Check that the workflow has `id-token: write` permission
3. Confirm the workload identity provider was created successfully:

```bash
gcloud iam workload-identity-pools providers describe github-actions-oidc-provider \
  --workload-identity-pool=shared-identity-pool-01 \
  --location=global \
  --project=$PROJECT_ID
```

### Traces Not Appearing in Trace Explorer

Pulumi cannot currently provision cloud tracing completely. The cloud observability api is still missing programatic management of many resources so this may be the reason for the missing Pulumi functionality.

You will see the following banner in the trace explorer UI:

`Trace storage is not initialized for this project. Enable trace storage to begin collecting trace data.`

Simply click the enable button or follow this guide to enabling tracing from the trace explorer UI in the relevant GCP projects.

See: https://docs.cloud.google.com/trace/docs/troubleshooting#verify-data-stored
