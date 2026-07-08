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

- [] Instead of directly publishing events from ingestion services, just write to gcp and notify a topic in infra
- [] Migrate app specific code from `/projects/ingestion-pipeline` to the consuming project, create a shared `/projects/core-io` to contain shared application interfaces and implementations
- [] Rewrite project documentation
- [] Remove `ingestion-replay` project
- [] Sort fact checks feed on website using algolia queries rather than local sort

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

### Infrastructure

All infrastructure is provisioned through multiple Pulumi projects in `projects/*-infra/`.

See [projects/core-infra/README.md](./projects/core-infra/README.md) for infrastructure documentation.

| Stack           | Documentation                                     |
| --------------- | ------------------------------------------------- |
| core-infra      | [README.md](./projects/core-infra/README.md)      |
| ingestion-infra | [README.md](./projects/ingestion-infra/README.md) |
| analysis-infra  | [README.md](./projects/analysis-infra/README.md)  |
| research-infra  | [README.md](./projects/research-infra/README.md)  |
| website-infra   | [README.md](./projects/website-infra/README.md)   |

### Services

Dockerized applications (API services, workers, scheduled jobs) live in `projects/` as separate Nx projects. Each service:

- Has its own Dockerfile and deployment configuration
- Is deployed to managed compute (e.g. Cloud Run)

See further documentation for individual services:

| Service             | Documentation                                         |
| ------------------- | ----------------------------------------------------- |
| ingestion-ingestor  | [README.md](./projects/ingestion-ingestor/README.md)  |
| ingestion-sanitizer | [README.md](./projects/ingestion-sanitizer/README.md) |
| ingestion-extractor | [README.md](./projects/ingestion-extractor/README.md) |
| analysis-loader     | [README.md](./projects/analysis-loader/README.md)     |
| website-backend     | [README.md](./projects/website-backend/README.md)     |
| website-emailer     | [README.md](./projects/website-emailer/README.md)     |
| website-loader      | [README.md](./projects/website-loader/README.md)      |

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
