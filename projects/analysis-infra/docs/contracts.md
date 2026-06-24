# Infrastructure Output Contract

The `apps/infra` project provisions all platform infrastructure. Stack outputs provide a stable interface for services, CI/CD pipelines, and operational tooling to discover resource identifiers without hardcoding names or project-specific values.

**Treat these outputs like a public API. Changing names or semantics can break downstream consumers.**

## Contract Goals

Outputs are designed to be:

- **Stable**: output names should rarely change.
- **Environment-aware**: values differ by stack (dev/prod) via Pulumi config.
- **Consumer-agnostic**: services and pipelines should not hardcode resource names.

Stability expectations:

- **Breaking changes**: renaming an output key, changing meaning, or changing resource identity (e.g. replacing a topic/bucket with a new one).
- **Non-breaking changes**: adding new outputs, adding optional resources with new keys, tightening docs.

## How to Consume Outputs

Outputs can be retrieved via the Pulumi CLI for use in scripts, CI/CD workflows, or application configuration:

```bash
# Get a specific output
pulumi stack output observationsTopicName --stack dev

# Get all outputs as JSON
pulumi stack output --json --stack dev
```

In CI/CD workflows (e.g. GitHub Actions), outputs are typically read once and passed to downstream steps as environment variables or configuration.

## Stack Outputs

| Output                                 | Type     | Description                              |
| -------------------------------------- | -------- | ---------------------------------------- |
| `gcpProject`                           | `string` | GCP project ID                           |
| `platformName`                         | `string` | Platform name for labeling and naming    |
| `stackName`                            | `string` | Current Pulumi stack (environment)       |
| `labels`                               | `object` | Standard labels applied to all resources |
| `observationsTopicName`                | `string` | Pub/Sub topic for observation messages   |
| `rawArchiveBucketName`                 | `string` | GCS bucket for raw data archival         |
| `gcsArchiveKeyName`                    | `string` | KMS key name for GCS encryption          |
| `bigQueryKeyName`                      | `string` | KMS key name for BigQuery encryption     |
| `githubActionServiceAccountEmail`      | `string` | CI/CD service account email              |
| `githubActionIdentityPoolProviderName` | `string` | OIDC provider for GitHub Actions         |
