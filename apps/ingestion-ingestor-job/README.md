# Ingestor

The ingestor is creates an append-only, auditable collection of observations.

It is a scheduled batch service that fetches content from a configured list of public URLs, archives the raw responses, and publishes ingestion events for downstream processing.

It is the first stage in the platform's data pipeline. Its outputs are consumed by the [sanitizer](../sanitizer/README.md), which applies content policy before data is made available for research use.

## Responsibilities

- Read a target list of URLs from configuration
- Fetch each URL over HTTP, recording both successes and failures
- Archive the raw response body and a structured record for each fetch attempt
- Publish an `IngestionAttempted` event for each attempt
- Enforce a configurable success threshold to gate the run

## What this service does not do

- Parse or interpret fetched content
- Apply content policy or sanitization
- Deduplicate observations across runs
- Maintain persistent state between runs

## Project Structure

```
apps/ingestor/
├── src/
│   ├── main.ts                  # Entry point
│   ├── program.ts               # Core processing logic
│   ├── ports/                   # Interface definitions (Fetcher, Archiver, Publisher, TargetList)
│   ├── adapters/
│   │   ├── http-client/         # HTTP fetching implementation
│   │   ├── filesystem/          # Local filesystem implementations (dev)
│   │   ├── cloud-storage/       # GCP Cloud Storage implementations (prod)
│   │   └── cloud-pubsub/        # GCP Pub/Sub implementation (prod)
│   ├── environments/            # Dependency wiring for dev and prod
│   ├── integration/             # Pure domain logic (record construction, event creation)
│   └── data/                    # Internal type definitions
├── assets/
│   └── target-list.csv          # Default target list for local development
└── .env.template                # Required environment variables for local runs
```

## Related Documentation

| Document                                                                          | Purpose                                                          |
| --------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| [docs/how-it-works.md](./docs/how-it-works.md)                                    | End-to-end data flow and processing behavior                     |
| [docs/configuration.md](./docs/configuration.md)                                  | Environment variables, adapter behavior, and target list format  |
| [docs/contracts.md](./docs/contracts.md)                                          | Output record schemas and archive layout                         |
| [docs/runbook.md](./docs/runbook.md)                                              | Interpreting logs and diagnosing failures                        |
| [@news-research/ingestion: ingest](../../packages/ingestion/docs/ingest.md)       | Per-target fetch and archive logic defined in the shared package |
| [@news-research/ingestion: contracts](../../packages/ingestion/docs/contracts.md) | Canonical record schemas and archive path structure              |
