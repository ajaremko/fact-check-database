# Fact Check Database – Secure Ingestion & Analysis Infrastructure

✨ This repository contains a fact check aggregator and production grade research platform designed to support information integrity, misinformation, and media ecosystem research. ✨

## Overview

The platform’s primary goal is to provide secure, auditable, and reproducible infrastructure for collecting, archiving, and analyzing public fact checking information sources (e.g. news feeds, fact-checking outputs).

This system emphasizes:

- strong data governance and operational rigor
- clear separation of responsibilities between system capabilities
- modularity and flexibility to adapt to changing requirements

This project is intended to be legible to:

- research infrastructure engineers
- digital operations leads
- academic and NGO research teams
- grant reviewers evaluating technical feasibility
- policy or integrity-focused technical programs

## Domains

The repository is organized around five domains, each a stage or branch of one pipeline. Data
flows one direction through ingestion to analysis and then to research and website.

```
ingestion-ingestor → ingestion-sanitizer → ingestion-extractor
        │
        ▼
  staging bucket (GCS, owned by core-infra)
        │
        ├──► analysis-loader ──► BigQuery ──► research-infra (read-only view)
        │
        └──► website-loader ──► Algolia index ──► website-server (public search)

website-server (contact / dataset access / tip forms)
        │
        ▼
  backend bucket (GCS) ──► website-emailer (confirmation + notification email)
```

### Core

Shared infrastructure and libraries with no domain of its own — the staging bucket, encryption
keys, and IAM baseline (`core-infra`), plus libraries (`core-contracts`, `core-data`, `core-io`,
`core-vendor`) used across every domain below.

| Project        | Kind    | Purpose                                 | Documentation                                    |
| -------------- | ------- | --------------------------------------- | ------------------------------------------------ |
| core-infra     | Infra   | Shared GCP bootstrap: bucket, CMEK, IAM | [README.md](./projects/core-infra/README.md)     |
| core-contracts | Library | Cross-domain schemas                    | [README.md](./projects/core-contracts/README.md) |
| core-data      | Library | Parsing/encoding utilities              | [README.md](./projects/core-data/README.md)      |
| core-io        | Library | Storage & messaging ports/adapters      | [README.md](./projects/core-io/README.md)        |
| core-vendor    | Library | Wrapped third-party SDK clients         | [README.md](./projects/core-vendor/README.md)    |

### Ingestion

Fetches public fact-checking sources (RSS feeds and similar), normalizes them, and extracts
structured fact-check records. Its output is a single artifact — an NDJSON batch written to a
shared staging bucket — consumed independently by two downstream domains.

| Project             | Kind    | Purpose                               | Documentation                                         |
| ------------------- | ------- | ------------------------------------- | ----------------------------------------------------- |
| ingestion-infra     | Infra   | Ingestion domain's Pulumi stack       | [README.md](./projects/ingestion-infra/README.md)     |
| ingestion-contracts | Library | Ingestion-domain schemas              | [README.md](./projects/ingestion-contracts/README.md) |
| ingestion-ingestor  | Service | Fetches sources                       | [README.md](./projects/ingestion-ingestor/README.md)  |
| ingestion-sanitizer | Service | Cleans and normalizes fetched content | [README.md](./projects/ingestion-sanitizer/README.md) |
| ingestion-extractor | Service | Extracts fact-check records           | [README.md](./projects/ingestion-extractor/README.md) |

### Analysis

Loads staged data into BigQuery and maintains a deduplicated dataset. This is
the privileged domain of an internal database maintenance team, not a public-facing one.

| Project         | Kind    | Purpose                            | Documentation                                     |
| --------------- | ------- | ---------------------------------- | ------------------------------------------------- |
| analysis-infra  | Infra   | Analysis domain's Pulumi stack     | [README.md](./projects/analysis-infra/README.md)  |
| analysis-loader | Service | Loads staged batches into BigQuery | [README.md](./projects/analysis-loader/README.md) |

### Research

Provisions controlled, read-only access to curated views of analysis's data — a separate domain
specifically so research access can be governed independently of the pipeline that produces the
data, without exposing the entire BigQuery dataset.

| Project        | Kind  | Purpose                              | Documentation                                    |
| -------------- | ----- | ------------------------------------ | ------------------------------------------------ |
| research-infra | Infra | Read-only BigQuery view for research | [README.md](./projects/research-infra/README.md) |

### Website

Loads the same staging data into a public search index, and separately runs the public-facing
site itself: informational pages, search, and three forms (contact, dataset access request, tip
submission) whose submissions flow back through GCS to trigger outbound email.

| Project           | Kind    | Purpose                                | Documentation                                       |
| ----------------- | ------- | -------------------------------------- | --------------------------------------------------- |
| website-infra     | Infra   | Website domain's Pulumi stack          | [README.md](./projects/website-infra/README.md)     |
| website-contracts | Library | Website-domain schemas                 | [README.md](./projects/website-contracts/README.md) |
| website-server    | App     | Public frontend                        | [README.md](./projects/website-server/README.md)    |
| website-loader    | Service | Loads staged batches into Algolia      | [README.md](./projects/website-loader/README.md)    |
| website-emailer   | Service | Sends confirmation/notification emails | [README.md](./projects/website-emailer/README.md)   |

A fact check's lifecycle, identity and deduplication are documented in
[docs/fact-check-lifecycle.md](./docs/fact-check-lifecycle.md).

New or updated project docs follow [docs/documentation-guidelines.md](./docs/documentation-guidelines.md).
Tests follow [docs/testing-guidelines.md](./docs/testing-guidelines.md).

## TODOs

See [docs/todo.md](./docs/todo.md) for the current backlog — the repository's open roadmap items
plus every project's outstanding known issues.

## Core Principles

### 1) Research-first infrastructure

The platform is designed to support:

- longitudinal studies
- reproducible analyses
- controlled data access
- transparent provenance and transformation histories

Rather than optimizing for throughput, this system prioritizes correctness, traceability, and auditability.

### 2) Strong governance by default

Even when working with public data, research infrastructure must assume:

- incidental PII risk
- evolving ethical constraints
- access revocation requirements
- multi-stakeholder environments

Accordingly, the platform incorporates:

- customer-managed encryption (CMEK)
- strict IAM boundaries
- audit logging
- least-privilege access patterns
- clear separation of data access and decryption authority

## Repository Structure

This repository is organized as an Nx monorepo with libraries, apps and pulumi infrastructure projects living alongside each other in `/projects`.

```
/
├── projects/                 # Contains IaC projects, apps and libraries
│   ├── core-infra/           # Core Pulumi infrastructure project
│   │   ├── src/              # IaC source
│   │   │   └── ...
│   │   └── docs/             # Infrastructure documentation
│   │
│   ├── core-contracts/       # Shared library
│   │   └── src/              # Library source code
│   │       └── ...
│   │
│   └── ingestion-ingestor/   # Dockerized applications (Cloud Run, workers, etc.)
│       ├── src/              # App source code
│       │   └── ...
│       └── docs/             # App documentation
│
├── docs/                     # Cross-cutting documentation
└── scripts/                  # Deployment and operational helpers
```

## Key Technologies

### Nx

Nx is used to manage this repository as a monorepo. In this project, Nx provides:

- a consistent structure for applications, libraries, and infrastructure code
- clear boundaries between shared libraries and capability-owned systems
- tooling to scaffold new services, libraries, and Pulumi projects in a uniform way
- task orchestration for builds, tests, container images, and deployments

This supports the platform’s emphasis on modularity while still enabling shared conventions and tooling across systems. From an operational perspective, Nx makes it possible to:

- reason about changes and their impact across systems
- automate multi-step workflows (e.g. build → package → deploy)
- scale the repository as additional systems and capabilities are added over time

Common commands used when working in this workspace:

```bash
# Scaffold a new node app
nx g @nx/node:app apps/ingestor --linter=eslint --unitTestRunner=none --e2eTestRunner=none --framework=none --docker

# Scaffold a new node library
nx g @nx/node:lib packages/cloud-storage --linter=eslint --unitTestRunner=none --publishable=false

# Move or rename an existing project
nx generate @nx/workspace:move --projectName=<name> --destination=<path> --newProjectName=<name>

# Publish a release
nx release --dockerVersionScheme=production --yes
```

### Pulumi

Pulumi is used in a configuration-driven manner:

- target GCP projects are defined in stack configuration (dev, prod)
- services discover resources via stack outputs, not hardcoded values
- environment parity is achieved through stack-specific configuration

This model demonstrates infrastructure patterns appropriate for grant-funded and multi-stakeholder environments.

### Docker

Docker is used to package applications and workers as container images.

Containers provide:

- reproducible execution environments across development, CI, and production
- clear isolation between services
- straightforward deployment to managed compute platforms (e.g. Cloud Run)

In this platform, Docker is treated as an implementation detail, not an orchestration layer. The focus is on:

- simple, single-purpose images
- explicit runtime configuration via environment variables
- predictable startup and failure behavior

This keeps operational complexity low while ensuring that services behave consistently across environments.

This repository also offers a containerized development environment defined in the `.devcontainer` directory. Using a containerized development environment ensures reproducibility of development dependency installation and configuration.

See [docs/devcontainer.md](./docs/devcontainer.md) for complete documentation of the devcontainer and what it provides.

## Known Issues & Mitigations

This project intentionally documents known ecosystem-level issues and the mitigations applied to ensure reliable operation in production-like environments.

- [Abort Controller Patch](./patches/abort-controller/README.md)
