# @news-research/ingestion-core

The `ingestion` package contains the core business logic and port interfaces for the platform's ingest and sanitize pipeline stages.

It is consumed by two applications:

- [`ingestor`](../../apps/ingestor/README.md) — runs the ingest stage as a scheduled batch job
- [`sanitizer`](../../apps/sanitizer/README.md) — runs the sanitize stage as a long-running service

The package does not include adapter implementations, environment wiring, or application configuration. Those responsibilities belong to the consuming applications.

## Entry Points

| Entry Point                                    | Contents                                                                                         |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `@news-research/ingestion-core`                | Shared data types: `IngestorRecord`, `SanitizerRecord`, `FilePointer`, archive path utilities    |
| `@news-research/ingestion-core/steps/ingest`   | Ingest stage: `ingestFromSourceTarget`, `Archiver`, `Fetcher`, `IngestionAttempted`              |
| `@news-research/ingestion-core/steps/sanitize` | Sanitize stage: `sanitizeRawObservation`, `Archiver`, `SanitizerPolicy`, `SanitizationAttempted` |

## Related Documentation

| Document                                 | Purpose                                                                        |
| ---------------------------------------- | ------------------------------------------------------------------------------ |
| [docs/ingest.md](./docs/ingest.md)       | Per-target fetch and archive logic, observation identity, port interfaces      |
| [docs/sanitize.md](./docs/sanitize.md)   | Policy evaluation logic, sanitizer record construction, policy document format |
| [docs/contracts.md](./docs/contracts.md) | Record schemas, event schemas, and cloud storage archive layout                |
