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

# Referencing existing documentation

When generating or expanding functionality or documentation in this repository, reference existing documentation. Each project in the `apps` directory and each package in the `packages` directory should have `README.md` files describing their contents and functionality. Some readme files will link to additional documentaion within the project. Always make sure to raise an additional prompt if existing documentation doesn't match with new functionality or if new documentation should be created.

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

# Coding Delegation

Claude is trusted to implement coding tasks autonomously. Prefer doing over asking, except when:

- a task requires a design or architecture decision not derivable from existing patterns
- the change affects shared interfaces, schemas, or IAM configurations

When implementing:

- read existing code in the relevant area before writing new code
- follow patterns already established in the project
- run `nx affected` tests after changes
- flag if existing documentation is stale relative to new functionality

# Coding Style Guidelines

## General

- **Language**: All source code is TypeScript. Avoid `any`; use `unknown` at system boundaries.
- **Async/IO**: Use the [Effect](https://effect.website) library for all async and effectful operations. Do not use raw `Promise` or `async/await` outside of Effect bridging (`Effect.tryPromise`).
- **Effect composition**: Prefer `Effect.gen(function* () { ... })` for readable sequential composition. Use `Effect.all(..., { concurrency })` for parallel work.
- **Error handling**: Define custom errors with `Data.TaggedError('ErrorName')<{ readonly cause: unknown }>`. Use `Effect.catchTag()` for known errors; let unknown errors propagate. Express effectful code as thunks and wrap in an `Effect` to ensure errors are handled within effect.
- **Configuration**: Read all environment config via the `Config` Effect with schema validation and `.pipe(Config.withDefault(...))` for defaults. No hardcoded config values in source files.
- **Logging**: Use `Effect.logInfo` / `Effect.logError` with `.annotateLogs({ ... })` for structured context. Do not use `console.log`.
- **Schema validation**: Validate all data crossing system boundaries (inbound events, outbound records, config) with Effect `Schema`. Extract TypeScript types from schemas via `Schema.Schema.Type<typeof ...>` — do not define types separately from schemas. Schema transformations should support both `decode` and `encode` directions whenever possible.
- **Naming**: PascalCase for classes, interfaces, and schema variables (`FetcherError`, `IngestionAttemptedSchema`). camelCase for functions and variables (`parseJson`, `runId`). `UPPER_CASE` for environment variable names.
- **Tooling**: Run all builds, tests, and lint via `nx` (e.g. `nx run project:target`). Do not invoke `tsc`, `vitest`, or `eslint` directly.
- **Tests**: Follow [docs/testing-guidelines.md](docs/testing-guidelines.md).

## App Coding Style Guidelines

- **Composition root** (`src/environments/`): Wire layers together here. Maintain separate files for dev and prod environments. Development layers typically use the filesystem for IO rather than GCP infrastructure. No business logic in environment files.
- **Program** (`src/program.ts`): Core logic only. Receives all dependencies via Effect context. Should read clearly as a sequence of operations.
- **Entry point** (`src/main.ts`): Minimal — runs the program with the appropriate environment. No logic.
- **Domain logic** (`src/integration/`): Prefer pure functions (no effects) where possible. Policy evaluation, data transformation, and decision logic live here.
- **Data types** (`src/data/`): Plain TypeScript types or thin schemas used only internally within the app.
- **Configuration**: Require and access layer configuration from environment variables. Examples of configuration include concurrency limits and log levels via the `Config` package from effect. Use `Effect.all(..., { mode: 'either' })` when partial failure is acceptable; define a success threshold to gate overall run success.
- **Event processing loops**: Use `Queue.take(...).pipe(Effect.forever)` for infinite message consumption. Always `ack` or `nack` — never silently drop messages.

## Package Coding Style Guidelines

Packages are reusable libraries with no dependency on app-level code.

- **Scope**: Each package aims to wrap a single external SDK. Minimize mixing concerns.
- **Effect integration**: Wrap all effectful calls with `Effect.tryPromise({ try, catch })`. Expose `Context.Tag` classes for injectable services (e.g. `StorageClient`, `PubsubTopic`).
- **Layer factory pattern**: Export a `layer` constant or factory function. Callers should never instantiate SDK clients directly.
- **Combinator pattern** (`core-data`): Combinators are curried higher-order functions — they accept options and return a function `(schema) => schema`. This enables composition via `pipe()`.
- **No side effects at module load time**: Defer all initialization inside `Effect.gen()` or `Layer.effect()`.
- **`contracts` package**: All cross-app data contracts live here. Export schemas and types grouped by domain (e.g. `export * as IngestorRecord`). Domain-event or outcome records (e.g. `ingestion-contracts`' `IngestionRecord`) typically include `version` (literal), `kind`, and `outcome` discriminators, built via constructor functions that supply defaults for them — this is a pattern for that kind of record, not a requirement for every contract. External event schemas (e.g. GCP Pub/Sub or Cloud Storage payloads) and plain table/row/path schemas don't need it.

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

- scaffold apps, services, and shared libraries
- enforce consistent tooling and conventions
- orchestrate builds, tests, and deployments

Nx is not used to imply tight coupling between systems.

When generating documentation:

- describe systems in terms of their capabilities and responsibilities
- do not rely on Nx-specific terminology unless relevant
- assume projects may be deployed independently despite living in one repo

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
