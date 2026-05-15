# @news-research/ingestion-pipeline

This package contains the core business logic, port interfaces, and adapter implementations for the platform's four-stage ingestion pipeline: **Ingest**, **Sanitize**, **Extract**, and **Load**.

| Stage        | Purpose                                                                                | Api                              | Input                                                       | Output                                                                        |
| ------------ | -------------------------------------------------------------------------------------- | -------------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------- |
| **Ingest**   | Request data from configured sources, archive response and metadata                    | `ingestFromSource`               | `Source` config                                             | `ObservationIngested` event + archived `IngestionRecord`                      |
| **Sanitize** | Evaluate a policy to classify safety of ingested responses, rewrite bytes if necessary | `sanitizeObservation`            | Pointer to `IngestionRecord`, instance of `SanitizerPolicy` | `ObservationSanitized` event, `SanitizerRecord` record                        |
| **Extract**  | Extract structured data from raw or rewritten bytes                                    | `extractFactChecks`/`writeBatch` | Pointer to `SanitizerRecord`, array of `FactCheckRows`      | Array of `FactCheckRow` records, `ExtractionBatchReady` event, archived batch |
| **Load**     | Load extracted data for analysis                                                       | `loadBatch`                      | GCS staging pointer + BigQuery table config                 | N/A                                                                           |

## Pipeline Modules

### Ingest

**`ingestFromSource(args: { ingestionId, timestamp, source })`** (`src/ingest/ingestFromSource.ts`)

Fetches content from a single source and archives a record of the attempt regardless of outcome.

- Calls `Fetcher.fetch(source, timestamp)` to retrieve content
- Derives a stable `content_lineage_id` by SHA-256 hashing the fetch result — enabling deduplication across runs
- **On success**: archives the raw response body to storage, then writes an `IngestionRecord` with a pointer to the body and full HTTP metadata
- **On failure**: writes an `IngestionRecord` with `outcome: 'no_response'` and the error description; no body is archived
- Returns an `ObservationIngested` event containing the `content_lineage_id`, HTTP metadata, and a `FilePointer` to the archived YAML record

**`Fetcher` port** (`src/ingest/Fetcher.ts`)

Injectable interface for HTTP fetching.

- `fetch(source: Source, timestamp: Timestamp) → Effect<FetchResult, FetcherError>`
- `FetchResult` is a tagged union:
  - `FetchSuccess` — `{ finalUrl, status, headers, etag, lastModified, contentType, bytes, sha256, body }`
  - `FetchFailure` — `{ error }`

**Adapters** (`src/ingest/adapters/`)

| Adapter             | Use                                          |
| ------------------- | -------------------------------------------- |
| `HttpClientFetcher` | Production HTTP fetch via `@effect/platform` |
| `InMemoryFetcher`   | Deterministic stub for testing               |

**Contracts** (`src/ingest/contracts/v1/`)

| Schema                | Description                                                                                                                                                                                                                                                                                                                    |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ObservationIngested` | Event emitted per fetch attempt. Carries `content_lineage_id`, `ingestion_batch_id`, `fetched_at`, `source`, optional HTTP fields (`status`, `final_url`, `content_type`, `etag`, `last_modified`, `content_sha256`, `content_bytes`), and `pointer` to the archived record. One event is emitted regardless of fetch outcome. |

---

### Sanitize

**`sanitizeObservation(args: { policy, pointer, timestamp })`** (`src/sanitize/sanitizeObservation.ts`)

Applies a sanitization policy to an archived ingestor record and writes a sanitized record documenting the outcome.

- Reads and decodes the `IngestionRecord` at `pointer` from storage
- Calls `evaluatePolicy(policy, observation)` to produce a `PolicyDecision`
- Constructs a `SanitizedObservation` capturing the decision, policy label, audit actions, and references to the original record and raw body
- Writes the sanitized record to storage as a YAML file
- Returns an `ObservationSanitized` event with the access label, action list, and `FilePointer` to the sanitized record

**`evaluatePolicy(policy, observation)`** (`src/sanitize/evaluatePolicy.ts`)

Pure function — no effects. Applies policy gates in order:

1. **Fetch failure gate** — quarantines if the ingestor recorded no response
2. **Size gate** — quarantines if body exceeds `rule.maxBytes`
3. **Content-type gate** — quarantines if content-type is not in `allowedContentTypeSubstrings`
4. **Pass** — assigns `rule.defaultLabel` (`SAFE_PUBLIC` or `RESTRICTED`)

**`SanitizerPolicy`** (`src/sanitize/SanitizerPolicy.ts`)

Versioned policy document. Fields:

| Field              | Description                                                |
| ------------------ | ---------------------------------------------------------- |
| `version`          | Policy document version (integer)                          |
| `stripQueryParams` | Query parameter names to remove from recorded URLs         |
| `dropHeaders`      | Response header names to omit from sanitized records       |
| `collections`      | Array of `CollectionRule` — one per source collection type |
| `overrides`        | Optional array of `SourceOverride` — per-source exceptions |

Each `CollectionRule` specifies: `collection`, `maxBytes`, `defaultLabel`, `allowedContentTypeSubstrings`, `onMissingContentType`, and `rewriteBody`.

Each `SourceOverride` allows selectively overriding `maxBytes`, `defaultLabel`, `allowedContentTypeSubstrings`, and `rewriteBody` for a named source.

**Contracts** (`src/sanitize/contracts/v1/`)

| Schema                 | Description                                                                                                                                                                                                                                                                        |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ObservationSanitized` | Event emitted after policy evaluation. Carries `content_lineage_id`, `ingestion_batch_id`, `sanitizer_batch_id`, `fetched_at`, `sanitized_at`, `source`, `label` (access classification), `actions` (audit trail), optional content fields, and `pointer` to the sanitized record. |

---

### Extract

**`extractFactChecks(ctx: { extractionId, observationId, pointer, extractedAt })`** (`src/extract/extractFactChecks.ts`)

Parses structured fact check data from a sanitized observation's response body.

- Reads and decodes the `SanitizerRecord` at `pointer`
- **Skips extraction** (returns `[]`) if the observation has no HTTP metadata, no content, or `shouldExtract` is false
- Selects an extractor by matching `source.collection` and `source.name` against the registered extraction strategies
- **If no extractor matches**: logs a warning and returns `[]`
- Reads response bytes from the `sanitized` pointer if available; falls back to `raw`
- Calls the matched extractor and maps results to `FactCheckRow` records ready for BigQuery encoding
- Extraction errors are logged as warnings and produce an empty result rather than failing the effect

**Extraction strategies** (`src/extract/extraction-strategy/`)

| Strategy        | Collection | Description                                                   |
| --------------- | ---------- | ------------------------------------------------------------- |
| `RssExtractor`  | `rss`      | Parses RSS 2.0 feed XML, extracts items as fact check records |
| `AtomExtractor` | `atom`     | Parses Atom feed XML, extracts entries as fact check records  |

Each strategy implements `canHandle({ collection, name }) → boolean` and `extractor({ timestamp, record, data }) → Effect<FactCheck[]>`.

**`writeBatch`** (`src/extract/writeBatch.ts`)

Serialises an array of `FactCheckRow` records to newline-delimited JSON and writes them as a staging file to storage. Returns an `ExtractionBatchReady` event.

**Contracts** (`src/extract/contracts/v1/`)

| Schema                 | Description                                                                                                                                                                                                                                                                                                                              |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ExtractionBatchReady` | Event emitted after a batch is staged. Carries `extraction_batch_id`, `extracted_at`, `pointer` (GCS staging file), `table` (dataset and table IDs), and `source_format`.                                                                                                                                                                |
| `StagingPath`          | GCS path for a staged extraction file: `v1/datasetId={id}/tableId={id}/date={date}/{extractionId}.{ext}`                                                                                                                                                                                                                                 |
| `FactChecksTable`      | BigQuery table schema definition (used when creating or loading the target table)                                                                                                                                                                                                                                                        |
| `FactChecksTableRow`   | Row schema for the `fact_checks` table. Fields include `content_lineage_id`, `content_sha256`, `extracted_at`, `fetched_at`, `ingestion_id`, `extraction_id`, `extractor_id`, `extractor_version`, `source`, `fact_check` (title, claim, summary, link, verdict, published date), and `http` (final URL, status, content type, headers). |

---

### Load

**`loadBatch(input: { projectId, pointer, table, sourceFormat, schema })`** (`src/load/loadBatch.ts`)

Loads a GCS-staged file into a BigQuery table using a BigQuery load job.

- Constructs GCS URI: `gs://{pointer.bucket}/{pointer.object}`
- Creates a BigQuery load job with `autodetect: true` and the provided `sourceFormat` and `schema`
- Awaits job completion before returning
- Requires `BigQueryClient` from Effect context (provided by the consuming application)
- Returns `void`; side effect is rows appended to the destination BigQuery table

---

### Shared

**`StorageReader`** (`src/shared/StorageReader.ts`)

Port for reading opaque byte sequences from persistent storage.

- `read(pointer: FilePointer) → Effect<Uint8Array, StorageReadError>`
- `readFile` — convenience wrapper with tracing span

**`StorageWriter`** (`src/shared/StorageWriter.ts`)

Port for writing opaque byte sequences to persistent storage.

- `write({ path, data, meta?, contentType? }) → Effect<FilePointer, StorageWriteError>`
- Returns a `FilePointer` referencing the written object
- `writeFile` — convenience wrapper with tracing span

**Storage adapters** (`src/shared/adapters/`)

| Adapter                            | Use                               |
| ---------------------------------- | --------------------------------- |
| `CloudStorageStorageReader/Writer` | Production (Google Cloud Storage) |
| `FileSystemStorageReader/Writer`   | Local development                 |
| `InmemoryStorageReader/Writer`     | Unit testing                      |

**Shared contracts** (`src/shared/contracts/v1/`)

| Schema                    | Description                                                                                                                                                                                                                                             |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `IngestionRecord`         | Archived YAML record for a fetch attempt. Discriminators: `kind: 'fetch_attempt'`, `outcome: 'data_fetched' \| 'no_response'`. Includes source, HTTP metadata, and optional `content` block with SHA-256, byte count, and raw body pointer.             |
| `IngestionRecordMetadata` | Flat key-value metadata stored as GCS object attributes alongside each `IngestionRecord`. Fields: `observationId`, `ingestionId`, `sourceName`, `sourceCollection`, `fetchedAt`, `url`.                                                                 |
| `SanitizerRecord`         | Archived YAML record for a sanitization outcome. Discriminator: `kind: 'sanitized_record'`. Includes `label`, ordered `actions[]`, `input` pointers to the original ingestor record and raw body, and optional `content` block if bytes were rewritten. |
| `SanitizerRecordMetadata` | Flat GCS object metadata for sanitizer records. Fields: `observationId`, `ingestionId`, `sourceName`, `sourceCollection`, `fetchedAt`, `sanitizedAt`, `url`.                                                                                            |
| `ArchivePath`             | GCS object path for archived pipeline records: `v1/{collectionName}/source={sourceName}/date={date}/ingestion_id={ingestionId}/{observationId}.{ext}`                                                                                                   |
| `FilePointer`             | Reference to a GCS object: `{ bucket, object }`. The linking type between pipeline stages.                                                                                                                                                              |
| `Source`                  | Data source descriptor: `{ id, name, url, collection: 'atom' \| 'rss' }`. Drives fetch routing and extractor selection.                                                                                                                                 |
| `ContentLineageId`        | Deterministic SHA-256 hash of a fetch result. Stable across re-ingestion of identical content; used for deduplication.                                                                                                                                  |

## Consuming Modules

Each stage exposes its own entry points for the stage root, stage ports and stage adapters. Shared ports and adapters can be consumed similarly.

```ts
// Import a stage function by name
import { ingestFromSource } from '@news-research/ingestion-pipeline/ingest'

// Import a port as a namespace
import * as StorageWriter from '@news-research/ingestion-pipeline/shared/StorageWriter'

// Import an adapter as a namespace
import * as FileSystemStorageWriter from '@news-research/ingestion-pipeline/shared/adapters/FileSystemStorageWriter'
```

## Data Contracts

Contracts are defined per pipeline stage and include records, events and storage paths.

**Contracts are consumer-facing.** Changes to field names, types, or discriminator values are breaking changes that affect all consuming applications and any downstream systems reading from GCS or BigQuery.

**Contracts are versioned.** Backwards compatibilitiy between different versions of contracts should be maintained until it is certain all pipeline data has been migrated to their latest versions. Contract schemas include a `version` field whenever possible to definatively discriminate between versions.

## Related Documentation

| Document            | Purpose                                                                      | Status        |
| ------------------- | ---------------------------------------------------------------------------- | ------------- |
| `docs/ingest.md`    | Target configuration, ingestor record construction, content lineage identity | to be written |
| `docs/sanitize.md`  | Policy configuration, sanitizer record construction, policy document format  | to be written |
| `docs/extract.md`   | Staging facts table schema, extraction strategies, extractor interface       | to be written |
| `docs/contracts.md` | Record schemas, event schemas, cloud storage archive layout                  | to be written |
