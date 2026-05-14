# @news-research/ingestion-pipeline

[One-paragraph summary: what this package is, what it provides, and which consuming applications use it. Clarify that it contains pipeline stage logic, port interfacesand adapter implementations, but no environment wiring, or application configuration.]

---

## Overview

[Brief description of the four sequential pipeline stages and how each feeds into the next. Consider a simple text diagram or table showing: Ingest → Sanitize → Extract → Load, with a one-line description of each stage's role.]

---

## How to consume

[Description of various entry points]

```ts
// Import functionality by name
import { ingestFromSource } from '@news-research/ingestion-pipeline/ingest'
// Import port as namespace
import * as StorageWriter from '@news-research/ingestion-pipeline/shared/StorageWriter'
// Import adapter as namespace
import * as FileSystemStorageWriter from '@news-research/ingestion-pipeline/shared/adapters/FileSystemStorageWriter'
```

## Consuming Applications

[Table linking each stage to the app that runs it. Include links to app READMEs.]

| Application                    | Stage(s) | Description   |
| ------------------------------ | -------- | ------------- |
| `ingestion-pipeline-ingestor`  | Ingest   | [placeholder] |
| `ingestion-pipeline-sanitizer` | Sanitize | [placeholder] |
| `ingestion-pipeline-extractor` | Extract  | [placeholder] |
| `ingestion-pipeline-loader`    | Load     | [placeholder] |

---

## Package Architecture

[Explain the port/adapter pattern: ports (in `src/*/`) define capability interfaces; adapters implement them for specific transports (HTTP, GCS, filesystem, in-memory). Consuming apps are responsible for selecting and wiring adapters. This package ships both ports and adapters but does not wire them.]

---

## Pipeline Modules

### Ingest

[Describe `ingestFromSource()` (`src/ingest/ingestFromSource.ts`):]

- [What it takes as input: ingestion ID, timestamp, Source config]
- [What it does on success: archives raw response body, derives stable ObservationId by hashing]
- [What it does on failure: records error in observation, no body archived]
- [What it produces: `ObservationIngested` event with FilePointer to archived record]

[Describe `Fetcher` (`src/ingest/Fetcher.ts`):]

- [What it provides: port for injecting fetch functionality]
- [What it produces: `FetchResult` union type with http details]

[Describe `adapters` (`src/ingest/adapters/*.ts`):]

- [List each available adapter: HttpClientFetcher, InMemoryFetcher]

[Describe `contracts/v1` (`src/ingest/contracts/v1/*.ts`):]

- [Summarize each schema in the contracts directory]

### Sanitize

[Describe `sanitizeObservation()` (`src/sanitize/sanitizeObservation.ts`):]

- [What it takes: pointer to raw observation from Ingest stage]
- [What it does: reads and decodes record, evaluates SanitizerPolicy, assigns access label, writes record]
- [Policy decisions: SAFE_PUBLIC, RESTRICTED, QUARANTINED]
- [What it produces: `SanitizationAttempted` event with FilePointer to sanitized record]

[Describe `contracts/v1` (`src/sanitize/contracts/v1/*.ts`):]

- [Summarize each schema in the contracts directory]

### Extract

[Describe `extractFactChecks()` (`src/extract/extractFactChecks.ts`):]

- [What it takes: pointer to sanitized observation]
- [What it does: extracts fact check rows from sanitized response body]
- [Extraction strategies: RssExtractor, AtomExtractor — routed by collection type]
- [What it produces: array of `FactCheckRow` records (empty if ineligible)]

[Describe `contracts/v1` (`src/extract/contracts/v1/*.ts`):]

- [Summarize each schema in the contracts directory]

### Load

[Describe `loadBatch()` (`src/load/loadBatch.ts`):]

- [What it takes: GCS FilePointer and BigQuery table configuration]
- [What it does: creates and awaits a BigQuery load job from GCS URI]
- [What it produces: void — side effect is data landed in BigQuery table]

### Shared

[Describe `StorageReader` (`src/shared/StorageReader.ts`):]

- [What it provides: port for injecting read access to persistent storage]
- [What it takes: pointer to storage object]
- [What it produces: `Uint8Array` of object data]

[Describe `StorageWriter` (`src/shared/StorageWriter.ts`):]

- [What it provides: port for injecting write access to persistent storage]
- [What it takes: `string` path and `Uint8Array` of object data]
- [What it produces: pointer to storage object]

[Describe `adapters` (`src/ingest/adapters/*.ts`):]

- [List each available adapter: CloudStorageStorageReader, CloudStorageStorageWriter, etc...]

[Describe `contracts/v1` (`src/shared/contracts/v1/*.ts`):]

- [Summarize each schema in the contracts directory]

---

## Data Contracts

[Overview of versioned record schemas used as the canonical data model across stages. Contracts are consumer facing data and changes are breaking.]

---

## Related Documentation

[Table of detail documents — note which exist and which are still to be written.]

| Document            | Purpose                                                                     | Status          |
| ------------------- | --------------------------------------------------------------------------- | --------------- |
| `docs/ingest.md`    | Target configuration, ingestor record construction content lineage identity | [to be written] |
| `docs/sanitize.md`  | Policy configuration, sanitizer record construction, policy document format | [to be written] |
| `docs/extract.md`   | Staging facts table schema configuration, extraction strategies             | [to be written] |
| `docs/contracts.md` | Record schemas, event schemas, cloud storage archive layout                 | [to be written] |
