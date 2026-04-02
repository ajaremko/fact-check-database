# Sanitizer

The sanitizer makes data safe for broader access and downstream analytics. It is a long-running service that consumes `IngestionAttempted` events published by the ingestor, evaluates each fetch attempt against a configurable content policy, and archives a structured sanitizer record for downstream research use.

It is the second stage in the platform's data pipeline. Its inputs are produced by the [ingestor](../ingestor/README.md). Its outputs are intended to be consumed by the [extractor](../extractor/README.md).

## Responsibilities

- Consume `IngestionAttempted` events from the configured message queue
- Read the corresponding ingestor record from the archive
- Evaluate the fetch attempt against the active sanitization policy
- Inspect and rewrite fetched content
- Assign a policy label (`SAFE_PUBLIC`, `RESTRICTED`, or `QUARANTINED`) to each record
- Archive a structured `SanitizerRecord` for each successfully fetched attempt
- Publish a `SanitizeAttempted` event

## Todos

- [ ] Rewrite or strip response body content
- [ ] Process `no_response` ingestor records
- [ ] Publish downstream events
- [ ] Apply deduplication across sanitization runs

## Project Structure

```
apps/sanitizer/
├── src/
│   ├── main.ts                     # Entry point
│   ├── program.ts                  # Core processing logic
│   ├── ports/                      # Interface definitions (MessageQueue, Archiver, SanitizerPolicyDocument)
│   ├── adapters/
│   │   ├── filesystem/             # Local filesystem implementations (dev)
│   │   ├── cloud-storage/          # GCP Cloud Storage implementations (prod)
│   │   └── cloud-pubsub/           # GCP Pub/Sub implementation (prod)
│   ├── environments/               # Dependency wiring for dev and prod
│   ├── integration/                # Pure domain logic (policy evaluation, URL normalization)
│   └── data/                       # Internal type definitions (SanitizerPolicy)
├── assets/
│   └── policy.yml                  # Default policy document for local development
└── .env.template                   # Required environment variables for local runs
```

## Related Documentation

| Document                                         | Purpose                                                             |
| ------------------------------------------------ | ------------------------------------------------------------------- |
| [docs/how-it-works.md](./docs/how-it-works.md)   | End-to-end data flow and processing behavior                        |
| [docs/configuration.md](./docs/configuration.md) | Environment variables, adapter behavior, and policy document format |
| [docs/contracts.md](./docs/contracts.md)         | Output record schemas and archive layout                            |
| [docs/runbook.md](./docs/runbook.md)             | Interpreting logs and diagnosing failures                           |
