# News Research – Secure Ingestion & Analysis Infrastructure

✨ This repository contains a production grade research platform designed to support information integrity, misinformation, and media ecosystem research. ✨

## Overview

The platform’s primary goal is to provide secure, auditable, and reproducible infrastructure for collecting, archiving, and analyzing public information sources (e.g. news feeds, fact-checking outputs, large-scale media datasets).

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

This repository is organized as an Nx monorepo with a pulumi infrastructure in apps/infra alongside other services.

```
/
├── apps/
│   ├── infra/                # Consolidated Pulumi infrastructure project
│   │   ├── src/
│   │   │   ├── modules/      # Capability-specific infrastructure modules
│   │   │   └── ...           # Core platform primitives
│   │   └── docs/             # Infrastructure documentation
│   └── <service>/            # Dockerized applications (Cloud Run, workers, etc.)
├── packages/                 # Shared libraries (schemas, config, utilities)
├── docs/                     # Cross-cutting documentation
└── scripts/                  # Deployment and operational helpers
```

### Infrastructure

All infrastructure is provisioned through a single Pulumi project at `apps/infra/`. This simplifies deployment ordering and state management while maintaining logical separation via modules.

See [apps/infra/README.md](./apps/infra/README.md) for infrastructure documentation.

### Services

Dockerized applications (API services, workers, scheduled jobs) live in `apps/` as separate Nx projects. Each service:

- Has its own Dockerfile and deployment configuration
- Is deployed to managed compute (e.g. Cloud Run)

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

### Pulumi

Pulumi provisions all infrastructure through a single project at `apps/infra/`. This modular monolith approach:

- consolidates deployment into a single state and lifecycle
- eliminates cross-project stack references and ordering complexity
- maintains logical separation via modules within `apps/infra/src/modules/`
- exposes stable outputs for services and CI/CD to consume

Pulumi is used in a configuration-driven manner:

- target GCP projects are defined in stack configuration (dev, prod)
- services discover resources via stack outputs, not hardcoded values
- environment parity is achieved through stack-specific configuration

This model simplifies operations for a portfolio project while demonstrating infrastructure patterns appropriate for grant-funded and multi-stakeholder environments.

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
