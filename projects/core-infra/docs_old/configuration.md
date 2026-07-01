# Stack Configuration

This document describes the Pulumi stack configuration for infrastructure modules.

## Configuration Structure

Stack configuration is namespaced by module, matching the modules in `apps/infra/src/`. Each module manages its own GCP project and region, enabling flexible deployment topologies.

**Development configuration:** All modules deploy to a single GCP project. This simplifies local development and reduces cost.

**Production configuration:** Modules can deploy to separate GCP projects, enabling isolation between platform infrastructure and workload-specific resources.

## Core Module

The `core` module provisions foundational infrastructure: KMS keys, storage buckets, IAM identities, and CI/CD integration.

| Key                    | Description               | Example             |
| ---------------------- | ------------------------- | ------------------- |
| `core:project`         | GCP project ID            | `news-research-dev` |
| `core:region`          | GCP region                | `us-central1`       |
| `core:tag`             | Resource tag for labeling | `news-research`     |
| `core:kmsLocation`     | KMS key ring location     | `us`                |
| `core:archiveLocation` | Storage bucket location   | `US`                |
| `core:archiveTTL`      | Archive retention in days | `30`                |
| `core:githubOrg`       | GitHub organization       | `your-org`          |
| `core:githubRepo`      | GitHub repository name    | `news-research`     |

## Ingestion Module

The `ingestion` module provisions data collection workloads.

| Key                 | Description               | Example             |
| ------------------- | ------------------------- | ------------------- |
| `ingestion:project` | GCP project ID            | `news-research-dev` |
| `ingestion:region`  | GCP region                | `us-central1`       |
| `ingestion:tag`     | Resource tag for labeling | `ingestion`         |

## Setting Configuration Values

For development (single project):

```bash
# Core module
pulumi config set core:project $PROJECT_ID
pulumi config set core:region us-central1
pulumi config set core:tag news-research
pulumi config set core:kmsLocation us
pulumi config set core:archiveLocation US
pulumi config set core:archiveTTL 30
pulumi config set core:githubOrg your-org
pulumi config set core:githubRepo news-research

# Ingestion module (same project in dev)
pulumi config set ingestion:project $PROJECT_ID
pulumi config set ingestion:region us-central1
pulumi config set ingestion:tag ingestion
```

For production (multiple projects), set each module's `project` to the appropriate GCP project ID.
