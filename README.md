# Fact Check Database

A research data platform for information-integrity work. It collects the fact checks that
fact-checking organizations publish in their feeds, archives every fetch with its provenance,
and turns them into a deduplicated dataset for researchers and a public search site.

I designed, built and operate it on my own. It is a working demonstration of how I approach
infrastructure in this field: data governance, auditability and day-to-day operations are part
of the system, not something added afterwards.

**Site:** [factcheckdatabase.com](https://factcheckdatabase.com)

**Status:** Pre-launch. The pipeline runs continuously in both a development and a production
environment, against 52 public feeds. The site has not been publicly announced.

## At a glance

|                |                                                                                                                                                                                                                                                                                                                                                                       |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Scope          | 18 projects in one repository: 5 infrastructure stacks, 7 services and 6 shared libraries                                                                                                                                                                                                                                                                             |
| Platform       | Google Cloud: Cloud Run jobs and services, Pub/Sub, Cloud Storage, BigQuery, KMS, Secret Manager, Cloud Scheduler                                                                                                                                                                                                                                                     |
| Infrastructure | Pulumi, one stack per domain, each with a dev and a prod configuration                                                                                                                                                                                                                                                                                                |
| Delivery       | GitHub Actions for checks and image releases: pull requests are checked with no credentials, and a release can only push images. Workflows authenticate with Workload Identity Federation, so no service-account keys are stored. Infrastructure is deployed by hand, and a daily preview that cannot change cloud resources reports anything merged and not deployed |
| Code           | TypeScript throughout. The pipeline services are written with Effect, and data is schema-validated at every service boundary                                                                                                                                                                                                                                          |
| Operations     | A runbook for every service and stack, an IAM model for each stack that grants access, and a decision log of known issues                                                                                                                                                                                                                                             |

## How it works

```
 Publisher feeds (RSS / Atom)
        │  fetched every 4 hours
        ▼
   Ingestor ─────► Sanitizer ─────► Extractor        Cloud Run jobs and a service,
        │              │                │            handing off through Pub/Sub
        ▼              ▼                │
   Archive bucket (encrypted)           │  one batch file, twice a day
   raw bodies, sanitized copies,        ▼
   and a record of every step     Staging bucket
                                        │
                         ┌──────────────┴──────────────┐
                         ▼                             ▼
                  Analysis loader                Website loader
                         │                             │
                         ▼                             ▼
             BigQuery: staging → curated          Search index
               (merge every 4 hours)                   │
                         │                             ▼
                         ▼                        Public site
             Research view (read-only)
```

1. **Fetch.** Every four hours a job fetches each source's feed and archives the raw response
   beside a record of the attempt.
2. **Sanitize.** A policy labels each response. It drops credentials such as cookies from the
   stored headers and strips tracking parameters from links.
3. **Extract.** Twice a day a job parses the feeds labeled safe into fact-check records and
   writes them as one batch file.
4. **Load.** The batch is loaded into BigQuery and indexed for the public search site. The two
   loaders work independently.
5. **Curate.** A scheduled merge keeps one row per fact check. Researchers read it through a
   separate, read-only view.

Stages hand work to each other through Pub/Sub, which can deliver a message more than once.
Each stage is built to cope with that. How a fact check is identified, versioned and
deduplicated on the way through is set out in
[docs/fact-check-lifecycle.md](./docs/fact-check-lifecycle.md).

## What this project demonstrates

| Area                   | In this project                                                                                                                                                                                                                                                                             | Where to look                                                                                                                                                                                                                                                                                           |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Infrastructure as code | Five Pulumi stacks that find each other through stack outputs, never hardcoded names. Dev stacks share one GCP project; each domain's prod stack has its own. First-time setup and rollback are written down                                                                                | [core-infra](./projects/core-infra/README.md), its [bootstrap](./projects/core-infra/docs/bootstrap.md) and [runbook](./projects/core-infra/docs/runbook.md)                                                                                                                                            |
| CI/CD                  | A push to `main` lints, tests and builds only what changed, then publishes images. A push to `prod` cuts production image versions. Infrastructure deploys are a manual workflow, one environment at a time                                                                                 | [.github/workflows](./.github/workflows)                                                                                                                                                                                                                                                                |
| Security and access    | Customer-managed encryption keys with 90-day rotation. One service account per pipeline stage, holding only the roles that stage needs. Written procedures for revoking an operator or a service                                                                                            | [encryption.md](./projects/core-infra/docs/encryption.md), IAM models for [core](./projects/core-infra/docs/iam-model.md), [ingestion](./projects/ingestion-infra/docs/iam-model.md), [analysis](./projects/analysis-infra/docs/iam-model.md) and [website](./projects/website-infra/docs/iam-model.md) |
| Data governance        | A sanitization policy with a written reason for every value, measured against real feeds. Provenance on every record. Research access is a separate domain, so it is governed apart from the pipeline. The domain provisions a read-only view; granting access to it is a manual step today | [policy-rationale.md](./projects/ingestion-sanitizer/docs/policy-rationale.md), [research-infra](./projects/research-infra/README.md)                                                                                                                                                                   |
| Reliability            | Duplicate delivery is handled by design: fixed output paths, deterministic load-job ids, and one identity for each fact check. Messages that keep failing go to dead-letter topics and are archived                                                                                         | [fact-check-lifecycle.md](./docs/fact-check-lifecycle.md)                                                                                                                                                                                                                                               |
| Observability          | Structured logs with queryable fields and a fixed meaning for each level. OpenTelemetry traces and metrics. A Cloud Monitoring dashboard defined in code                                                                                                                                    | [core-io logging](./projects/core-io/README.md#logging), [ingestion-infra dashboard](./projects/ingestion-infra/README.md#dashboard), [a service runbook](./projects/ingestion-extractor/docs/runbook.md#logging)                                                                                       |
| Operations             | Runbooks organized by failure mode: symptom, cause, steps. Known issues recorded as decisions, including what was ruled out                                                                                                                                                                 | [extractor runbook](./projects/ingestion-extractor/docs/runbook.md#diagnosing-failures), [analysis-infra known issues](./projects/analysis-infra/docs/known-issues.md)                                                                                                                                  |
| Engineering practice   | Typed contracts shared between services. Tests written to read like documentation. The ingestion services also run locally against the filesystem in place of cloud services                                                                                                                | [ingestion-contracts](./projects/ingestion-contracts/README.md), [testing-guidelines.md](./docs/testing-guidelines.md), [devcontainer.md](./docs/devcontainer.md)                                                                                                                                       |

## Problems found by running it

Each of these surfaced in the running pipeline, was traced to a cause, and is documented where
the next operator will look.

- **Extraction jobs were killed for memory.** Parsed rows kept their whole source feed alive in
  memory. I measured the heap, changed the extractor to copy rows out of the feed, and sized the
  job's memory from the measurement.
  [Runbook entry](./projects/ingestion-extractor/docs/runbook.md#the-run-is-killed-without-a-fatal-line-out-of-memory).
- **About a third of each burst of records was sanitized twice.** Push deliveries timed out
  while new instances were starting, so Pub/Sub redelivered work that was still in progress. The
  fix was a longer acknowledgement deadline, with the reasoning recorded
  [beside the setting](./projects/ingestion-infra/src/sanitizer/subscription.ts).
- **Loads began failing a day after each deploy.** A storage lifecycle rule meant for batch
  files also matched the table's schema file and deleted it.
  [Runbook entry](./projects/core-infra/docs/runbook.md#troubleshooting-loads-fail-with-a-missing-schema-file).
- **A queue grew faster than it was drained.** Each extraction run took fewer records than
  arrived between runs, so messages were heading for expiry unread. Runs now pull until their
  batch is full, and the batch is sized against the arrival rate.
  [Lifecycle, stage 3](./docs/fact-check-lifecycle.md#3-extract-extractor).
- **Tracking parameters were part of a fact check's identity.** Feed links carried campaign
  tags, so a publisher changing its tags would have created a second record for the same
  article. I measured the real feeds, moved the stripping into the sanitizer, and wrote down
  how the policy and identity depend on each other.
  [Policy rationale](./projects/ingestion-sanitizer/docs/policy-rationale.md),
  [changing the policy](./projects/ingestion-sanitizer/docs/runbook.md#changing-the-policy).

## Scope and non-goals

The platform collects public information sources, archives them encrypted, normalizes them for
research, and gives controlled, auditable access to the result.

It does not:

- rank, recommend or amplify content;
- provide moderation or enforcement tooling;
- republish articles. A record keeps the feed's own summary and a short preview, never the full
  text.

The crawler identifies itself honestly on every request. Honoring `robots.txt`, per-host rate
limits and a publisher opt-out channel are planned and not yet built:
[docs/roadmap-bot-transparency.md](./docs/roadmap-bot-transparency.md).

## Domains and projects

The repository is organized around five domains, each a stage or branch of the pipeline above.
Every project has a README, and every service and stack a runbook.

### Core

Shared infrastructure and libraries that belong to no single domain: the staging bucket,
encryption keys and IAM baseline (`core-infra`), and the libraries used by every domain below.

| Project        | Kind    | Purpose                                 | Documentation                                    |
| -------------- | ------- | --------------------------------------- | ------------------------------------------------ |
| core-infra     | Infra   | Shared GCP bootstrap: bucket, CMEK, IAM | [README.md](./projects/core-infra/README.md)     |
| core-contracts | Library | Cross-domain schemas                    | [README.md](./projects/core-contracts/README.md) |
| core-data      | Library | Parsing/encoding utilities              | [README.md](./projects/core-data/README.md)      |
| core-io        | Library | Storage & messaging ports/adapters      | [README.md](./projects/core-io/README.md)        |
| core-vendor    | Library | Wrapped third-party SDK clients         | [README.md](./projects/core-vendor/README.md)    |

### Ingestion

Fetches public fact-checking feeds, applies the content policy to them, and extracts structured
fact-check records. Its output is one artifact: an NDJSON batch file written to the shared
staging bucket, which two downstream domains consume independently.

| Project             | Kind    | Purpose                                     | Documentation                                         |
| ------------------- | ------- | ------------------------------------------- | ----------------------------------------------------- |
| ingestion-infra     | Infra   | Ingestion domain's Pulumi stack             | [README.md](./projects/ingestion-infra/README.md)     |
| ingestion-contracts | Library | Ingestion-domain schemas                    | [README.md](./projects/ingestion-contracts/README.md) |
| ingestion-ingestor  | Service | Fetches sources                             | [README.md](./projects/ingestion-ingestor/README.md)  |
| ingestion-sanitizer | Service | Labels and scrubs each fetch under a policy | [README.md](./projects/ingestion-sanitizer/README.md) |
| ingestion-extractor | Service | Extracts fact-check records                 | [README.md](./projects/ingestion-extractor/README.md) |

### Analysis

Loads staged data into BigQuery and maintains a deduplicated dataset. This is the privileged
domain of an internal database maintenance team, not a public-facing one.

| Project         | Kind    | Purpose                            | Documentation                                     |
| --------------- | ------- | ---------------------------------- | ------------------------------------------------- |
| analysis-infra  | Infra   | Analysis domain's Pulumi stack     | [README.md](./projects/analysis-infra/README.md)  |
| analysis-loader | Service | Loads staged batches into BigQuery | [README.md](./projects/analysis-loader/README.md) |

### Research

Provisions controlled, read-only access to curated views of the analysis data. It is a separate
domain so that research access can be governed independently of the pipeline that produces the
data, without exposing the whole BigQuery dataset. Today the stack provisions the view and nothing
else: it grants no one access to the view, and access is granted by hand (see its
[known issues](./projects/research-infra/docs/known-issues.md)).

| Project        | Kind  | Purpose                              | Documentation                                    |
| -------------- | ----- | ------------------------------------ | ------------------------------------------------ |
| research-infra | Infra | Read-only BigQuery view for research | [README.md](./projects/research-infra/README.md) |

### Website

Loads the same staging data into a public search index, and runs the public site that searches
it.

| Project           | Kind    | Purpose                                | Documentation                                       |
| ----------------- | ------- | -------------------------------------- | --------------------------------------------------- |
| website-infra     | Infra   | Website domain's Pulumi stack          | [README.md](./projects/website-infra/README.md)     |
| website-contracts | Library | Website-domain schemas                 | [README.md](./projects/website-contracts/README.md) |
| website-server    | App     | Public frontend                        | [README.md](./projects/website-server/README.md)    |
| website-loader    | Service | Loads staged batches into Algolia      | [README.md](./projects/website-loader/README.md)    |
| website-emailer   | Service | Sends confirmation/notification emails | [README.md](./projects/website-emailer/README.md)   |

## Technology

| Tool              | Role in this repository                                                                                               |
| ----------------- | --------------------------------------------------------------------------------------------------------------------- |
| Nx                | One workspace for all 18 projects. Builds, tests, images and deploys run through it, limited to what a change affects |
| Pulumi            | Every cloud resource. Stack outputs are the contract between stacks                                                   |
| Docker, Cloud Run | Each service is one single-purpose image: a job for scheduled work, a service for push-driven work                    |
| Effect            | Typed errors, dependency injection, structured logging and tracing in the services                                    |
| Pub/Sub           | Hand-offs between stages, triggered by Cloud Storage notifications, with dead-letter topics                           |
| BigQuery          | Staging and curated tables, the scheduled merge, and the research view                                                |
| OpenTelemetry     | Traces and metrics, exported to Cloud Trace and Cloud Monitoring                                                      |
| Next.js, Algolia  | The public site and its search index                                                                                  |

## Working in the repository

A devcontainer provides the full toolchain: [docs/devcontainer.md](./docs/devcontainer.md).

```bash
npx nx run-many -t lint test typecheck    # check everything
npx nx affected -t lint,test,build        # what CI runs on a push
npx nx serve ingestion-sanitizer          # run one service locally (see its README for setup)
npx nx preview core-infra --stack=dev     # preview an infrastructure change
./scripts/run-pipeline.sh                 # run the three ingestion stages locally, in order (clears ./tmp first)
```

Project docs follow [docs/documentation-guidelines.md](./docs/documentation-guidelines.md), and
tests follow [docs/testing-guidelines.md](./docs/testing-guidelines.md).

## Known limits and roadmap

- Alerting covers the ingestion and analysis stacks: a stalled extraction backlog, dead-lettered
  messages, failed job runs and failed merges. The website stack has no alert policies yet. An
  alert notifies someone only where a stack sets an alert email.
- Infrastructure is deployed by hand, by whoever holds the rights to. A daily preview reports
  undeployed changes for four of the five stacks; the website stack is not covered.
- The crawler does not yet honor `robots.txt` (see [Scope and non-goals](#scope-and-non-goals)).

The full backlog is in [docs/todo.md](./docs/todo.md). Each project's accepted limitations are
in its own `docs/known-issues.md`. One dependency is patched, with the reason recorded:
[abort-controller patch](./patches/abort-controller/README.md).
