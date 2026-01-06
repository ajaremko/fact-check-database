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

### 3) Capability-oriented architecture

The system is organized around capabilities rather than technical layers.

Each capability owns its own:

- applications and services
- infrastructure
- documentation
- deployment lifecycle

This makes the platform easier to understand for non-engineering stakeholders and aligns with how research programs are funded, reviewed, and carried out.

## Repository Structure

High-level layout:

```
/
├── docs/ # High-level, cross-cutting documentation
├── packages/ # Cross-cutting libraries (schemas, config, utilities)
├── scripts/ # Deployment and operational helpers
├── systems/ # Capability-specific systems (ingestion, persistence, analysis, operations, etc.)
```

Individual systems are self-contained:

```
systems/<system-name>/
├── infra/ # Pulumi project for this feature
├── services/ # Applications, workers, etc.
├── docs/ # System-specific documentation & runbooks
└── README.md # System-specific overview and responsibilities
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

### Pulumi

Pulumi is used for provisioning infrastructure. Each system owns its own Pulumi project and deployment lifecycle, while a small shared project defines common infrastructure. This approach enables:

- independent deployments per capability
- explicit infrastructure contracts via stack outputs
- environment parity without code changes (single-project dev vs multi-project prod)
- clear ownership of resources and access boundaries

Pulumi is used in a configuration-driven manner:

- target GCP projects are defined in stack configuration
- systems are unaware of where they are deployed
- cross-system dependencies are resolved via stack references, not hardcoded values

This model aligns well with grant-funded and multi-stakeholder environments, where infrastructure boundaries, access control, and auditability are as important as functionality.

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
