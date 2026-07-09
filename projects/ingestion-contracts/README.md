# ingestion-contracts

Versioned wire-format schemas for the ingestion pipeline's cross-app data contracts — the events and records that flow between `ingestion-pipeline`'s stages and the standalone services (`ingestion-extractor`, `ingestion-ingestor`, `ingestion-sanitizer`) that consume them.

Schemas are organized by pipeline stage, mirroring `ingestion-pipeline`'s own internal module layout, with a `shared/v1` folder holding the value types and records common to more than one stage.

## Contracts

- **`shared/v1`** — foundational, cross-stage schemas:
  - `FilePointer` — a reference to an archived object (bucket + object + optional generation)
  - `Source` — an ingestion source (id, name, url, collection)
  - `ArchivePath` — the GCS object path convention for archived records
  - `ContentLineageId` — a unique identifier correlating a fetch attempt's outcome
  - `IngestionRecord` (+ `IngestionRecordMetadata`) — the archived record produced for each HTTP fetch attempt
  - `SanitizerRecord` (+ `SanitizerRecordMetadata`, `PolicyLabel`, `SanitizationAction`) — the archived record produced after a sanitization pass
- **`ingest/v1`** — `ObservationIngested`, the event published by the ingestor per fetch attempt
- **`sanitize/v1`** — `ObservationSanitized`, the event published by the sanitizer after processing an ingested observation
- **`extract/v1`** — `ExtractionBatchReady`, the event published when a batch of extracted records is ready for downstream consumption

Every schema is exported both as a flat named export (e.g. `ObservationIngestedSchema`) and under a domain namespace (e.g. `IngestionRecord.IngestionRecordSchema`), per this repo's contracts-package convention.

## What this library does NOT do

- Implement any ingestion, sanitization, or extraction logic — it only defines the shape of the data those stages produce and consume
- Provide storage or messaging adapters — see `@news-research/core-io` for those
- Guarantee backward compatibility across versions — each schema is explicitly versioned (`version` literal) so breaking changes ship as a new version rather than mutating an existing one

## Project Structure

```
projects/ingestion-contracts/
├── src/
│   ├── index.ts        # Barrel: flat + domain-namespaced exports
│   ├── shared/v1/       # Cross-stage value types and archived records
│   ├── ingest/v1/       # Ingestor event schema
│   ├── sanitize/v1/     # Sanitizer event schema
│   └── extract/v1/      # Extractor event schema
```

## Building

Run `nx build ingestion-contracts` to build the library.
