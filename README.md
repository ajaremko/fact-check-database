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

## TODOs

- [x] Instead of directly publishing events from ingestion services, just write to gcp and notify a topic in infra
- [x] Migrate app specific code from `/projects/ingestion-pipeline` to the consuming project, create a shared `/projects/core-io` to contain shared application interfaces and implementations
- [ ] Rewrite project documentation
  - [x] Rewrite `core-infra` README and `docs/` to match its current, post-domain-split scope
  - [ ] De-duplicate `ingestion-infra`, `analysis-infra`, `research-infra`, `website-infra` READMEs — currently identical boilerplate, none document the stack's actual resources
  - [ ] Rewrite `website-infra/docs/algolia.md` and `docs-to-write.md` — topically correct but still rough TODO checklists, not finished docs
- [x] Remove `ingestion-replay` project
- [x] Remove `analysis-nlp` project
- [x] Remove `website-liquid-informatics` project
- [] Sort fact checks feed on website using algolia queries rather than local sort
- [] Verify fact checks are deduped correctly in ingestion and analysis slices

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

### Project Index

Every project under `projects/` is listed below, grouped by domain. This table is the
canonical entry point for navigating project-level documentation — use it to check
which projects are documented and to jump into any project's README.

**Status legend:** ✅ documented · ❌ missing

#### Core

Shared libraries with no dependency on app-level code, used across every domain.

| Project        | Kind    | Status | Documentation                                    |
| -------------- | ------- | :----: | ------------------------------------------------ |
| core-infra     | Infra   |   ✅   | [README.md](./projects/core-infra/README.md)     |
| core-contracts | Library |   ✅   | [README.md](./projects/core-contracts/README.md) |
| core-data      | Library |   ✅   | [README.md](./projects/core-data/README.md)      |
| core-io        | Library |   ✅   | [README.md](./projects/core-io/README.md)        |
| core-vendor    | Library |   ✅   | [README.md](./projects/core-vendor/README.md)    |

#### Ingestion

Collects public fact-checking sources and normalizes them into the raw archive.

| Project             | Kind    | Status | Documentation                                         |
| ------------------- | ------- | :----: | ----------------------------------------------------- |
| ingestion-infra     | Infra   |   ✅   | [README.md](./projects/ingestion-infra/README.md)     |
| ingestion-contracts | Library |   ✅   | [README.md](./projects/ingestion-contracts/README.md) |
| ingestion-ingestor  | Service |   ✅   | [README.md](./projects/ingestion-ingestor/README.md)  |
| ingestion-sanitizer | Service |   ✅   | [README.md](./projects/ingestion-sanitizer/README.md) |
| ingestion-extractor | Service |   ✅   | [README.md](./projects/ingestion-extractor/README.md) |

#### Analysis

Loads archived data for research use and runs NLP analysis (e.g. stance detection).

| Project         | Kind    | Status | Documentation                                    |
| --------------- | ------- | :----: | ------------------------------------------------ |
| analysis-infra  | Infra   |   ✅   | [README.md](./projects/analysis-infra/README.md) |
| analysis-loader | Service |   ✅   | [README.md](./projects/analysis-loader/README.md) |

#### Research

Infrastructure supporting controlled, auditable access for research use of the archive.

| Project        | Kind  | Status | Documentation                                    |
| -------------- | ----- | :----: | ------------------------------------------------ |
| research-infra | Infra |   ✅   | [README.md](./projects/research-infra/README.md) |

#### Website

Public-facing fact-check database, search, and supporting services.

| Project           | Kind    | Status | Documentation                                       |
| ----------------- | ------- | :----: | --------------------------------------------------- |
| website-infra     | Infra   |   ✅   | [README.md](./projects/website-infra/README.md)     |
| website-contracts | Library |   ✅   | [README.md](./projects/website-contracts/README.md) |
| website-server    | App     |   ✅   | [README.md](./projects/website-server/README.md)    |
| website-loader    | Service |   ✅   | [README.md](./projects/website-loader/README.md)    |
| website-emailer   | Service |   ✅   | [README.md](./projects/website-emailer/README.md)   |

> Note: the `ingestion-infra`, `analysis-infra`, and `website-infra` READMEs are currently
> near-identical copies of one another and need to be rewritten to reflect each stack's
> actual, distinct resources (tracked in TODOs below). `core-infra`'s README and `docs/`
> have been rewritten to match its current, post-domain-split scope.

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

See [docs/nx.md](./docs/nx.md) for examples of common nx commands to run in the workspace.

### Pulumi

Pulumi is used in a configuration-driven manner:

- target GCP projects are defined in stack configuration (dev, prod)
- services discover resources via stack outputs, not hardcoded values
- environment parity is achieved through stack-specific configuration

This model demonstrating infrastructure patterns appropriate for grant-funded and multi-stakeholder environments.

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

This repository also offers a containerized development environment defined in the `.devcontainer` directory. Using a containerized development environment ensures repoducibility of development dependency installation and configuation.

See [docs/devcontainer.md](./docs/devcontainer.md) for complete documentation of the devcontainer and what it provides.

## Known Issues & Mitigations

This project intentionally documents known ecosystem-level issues and the mitigations applied to ensure reliable operation in production-like environments.

- [Abort Controller Patch](./patches/abort-controller/README.md)
