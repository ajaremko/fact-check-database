# Shared Stack Output Contract

The `systems/shared/infra` project provisions shared platform primitives (KMS keys, Pub/Sub topics, archival buckets, and standard labels). Other systems (ingest, persist, analysis, ops) consume these primitives via **Pulumi StackReferences**.

This document defines the **stable output contract** exposed by `systems/shared/infra`.

**Treat these outputs like a public API. Changing names or semantics can break downstream deployments.**

## Contract Goals

Core outputs are designed to be:

- **Stable**: output names should rarely change.
- **Environment-aware**: values differ by stack (dev/prod) via Pulumi config.
- **Project-agnostic for consumers**: feature systems should not hardcode resource names.
- **Minimal**: core exports only shared primitives needed by multiple systems.

## Output Namespaces & Stability

All outputs are exported at the root level (no nested objects) to simplify consumption.

Stability expectations:

- **Breaking changes**: renaming an output key, changing meaning, or changing resource identity (e.g. replacing a topic/bucket with a new one).
- **Non-breaking changes**: adding new outputs, adding optional resources with new keys, tightening docs.

## How to Consume Outputs

Consumer systems reference shared infrastructure via Pulumi StackReferences:

```typescript
import * as pulumi from '@pulumi/pulumi'

const sharedStack = new pulumi.StackReference(
  'organization/news-research-shared/dev'
)
const topicName = sharedStack.getOutput('observationsTopicName')
```

## Stack Outputs

| Output                                 | Type     | Description                              |
| -------------------------------------- | -------- | ---------------------------------------- |
| `gcpProject`                           | `string` | Shared GCP project ID                    |
| `platformName`                         | `string` | Platform name for labeling and naming    |
| `stackName`                            | `string` | Current Pulumi stack (environment)       |
| `labels`                               | `object` | Standard labels applied to all resources |
| `observationsTopicName`                | `string` | Pub/Sub topic for observation messages   |
| `rawArchiveBucketName`                 | `string` | GCS bucket for raw data archival         |
| `gcsArchiveKeyName`                    | `string` | KMS key name for GCS encryption          |
| `bigQueryKeyName`                      | `string` | KMS key name for BigQuery encryption     |
| `githubActionServiceAccountEmail`      | `string` | CI/CD service account email              |
| `githubActionIdentityPoolProviderName` | `string` | OIDC provider for GitHub Actions         |
