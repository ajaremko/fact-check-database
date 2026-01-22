<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

# General Guidelines for working with Nx

- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- You have access to the Nx MCP server and its tools, use them to help the user
- When answering questions about the repository, use the `nx_workspace` tool first to gain an understanding of the workspace architecture where applicable.
- When working in individual projects, use the `nx_project_details` mcp tool to analyze and understand the specific project structure and dependencies
- For questions around nx configuration, best practices or if you're unsure, use the `nx_docs` tool to get relevant, up-to-date docs. Always use this instead of assuming things about nx configuration
- If the user needs help with an Nx configuration or project graph error, use the `nx_workspace` tool to get any errors

<!-- nx configuration end-->

# Project Context & Purpose

This repository is a portfolio project that demonstrates how to design, deploy, and operate production-grade research infrastructure for information integrity, misinformation, and media ecosystem research.

The project is not intended to be a full end-user product. Instead, it focuses on:

- infrastructure architecture
- data governance and security
- operational maturity
- reproducibility and auditability
- clear separation of system responsibilities

All documentation, code, and infrastructure should be written as if this platform were supporting grant-funded academic or NGO research, even though it is implemented as a standalone portfolio project.

When generating documentation, prioritize clarity, rationale, and operational intent over exhaustive implementation detail.

# Intended Audience

Documentation in this repository is written for a mixed audience, including:

- research infrastructure engineers
- digital operations and platform leads
- academic or NGO research teams
- grant reviewers evaluating technical feasibility
- security-conscious or governance-conscious stakeholders

Assume readers are technically literate but not necessarily familiar with this specific codebase.

Documentation should:

- explain why systems exist, not just how
- make system boundaries and responsibilities explicit
- avoid product-marketing language
- avoid assuming access to institutional knowledge

# Architectural Orientation

This platform is organized around capability-oriented systems, not technical layers.

Each system (e.g. core, ingest, persist, analysis, ops):

- owns its own infrastructure, services, and documentation
- is independently deployable
- exposes explicit contracts to other systems
- has clearly defined responsibilities and non-responsibilities

Shared infrastructure is intentionally minimal and exists to provide:

- governance anchors (e.g. encryption keys)
- shared messaging primitives
- archival storage
- deployment identity and conventions

When generating documentation:

- do not collapse multiple systems into a single conceptual unit
- do not assume a monolithic deployment
- treat cross-system interactions as contracts, not implicit coupling

# Scope & Non-Goals

This project explicitly does not aim to:

- operate as a content platform
- rank, recommend, or amplify content
- design UX or behavioral interventions
- integrate directly with social media engagement surfaces
- provide real-time moderation or enforcement tooling

The platform’s role is limited to:

- collecting public information sources
- archiving and encrypting data at rest
- normalizing observations for downstream research
- enabling controlled, auditable access for analysis

Documentation should avoid implying product, policy enforcement, or moderation use cases.

# Security & Governance Assumptions

Even though the platform primarily handles public data, it is designed under the assumption that:

- incidental PII may appear in datasets
- access revocation may be required
- multiple stakeholders may have different trust levels
- auditability and separation of duties matter

As a result, the platform uses:

- customer-managed encryption keys (CMEK) via Cloud KMS
- strict IAM boundaries
- workload identity federation for CI/CD
- least-privilege access patterns
- explicit documentation of access models

When generating documentation:

- explain security decisions in plain language
- prefer describing intent and guarantees over low-level mechanics
- clearly state what protections exist and what is out of scope

# Documentation Style Guidelines

When generating or expanding documentation in this repository:

- Prefer short sections with clear headings
- Use bullet points for responsibilities and guarantees
- Separate “what this system does” from “what it does not do”
- Avoid speculative language (“could”, “might”) unless explicitly noted
- Treat infrastructure outputs and interfaces as stable contracts
- Assume documentation may be read independently of the code

Documentation should read like something that could plausibly be included in:

- a grant technical appendix
- an internal platform design review
- a handoff document for a new infra engineer

# Nx & Monorepo Context (Reminder)

This repository is managed as an Nx monorepo.

Nx is used to:

- scaffold systems, services, and shared libraries
- enforce consistent tooling and conventions
- orchestrate builds, tests, and deployments

Nx is not used to imply tight coupling between systems.

When generating documentation:

- describe systems in terms of their capabilities and responsibilities
- do not rely on Nx-specific terminology unless relevant
- assume systems may be deployed independently despite living in one repo

# What to Optimize For

When generating documentation for this project, optimize for:

- Legibility – a new reader should quickly understand system roles
- Credibility – decisions should appear intentional and defensible
- Operational realism – systems should feel runnable and maintainable
- Governance awareness – access, encryption, and auditability matter

# Do not optimize for:

- brevity at the expense of clarity
- impressiveness through complexity
- completeness over correctness
