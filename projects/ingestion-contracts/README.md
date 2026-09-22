# ingestion-contracts

Versioned wire-format schemas for the ingestion pipeline's cross-app data contracts — the archived records, source configuration, and log-event payloads that flow between `ingestion-ingestor`, `ingestion-sanitizer`, and `ingestion-extractor`.

The package is `@fact-check-database/ingestion-contracts`. Every schema is reached by a flat named export from a specific versioned subpath (for example `@fact-check-database/ingestion-contracts/archive/v1`) — this is the convention every real consumer in this repo actually uses; prefer it over the root package, which only re-exports each subpath under a namespace (`archiveV1`, `configV1`, `loggingV1`, `sharedV1`) for the rare case that's more convenient.

## Contracts

- **`archive/v1`** — the archived record schemas and the GCS path convention they're stored under:
  - `FilePointer` — a reference to an archived object (bucket + object + optional generation)
  - `Source` — an ingestion source as recorded in an archived record (id, name, url, and a free-form `collection` string)
  - `ArchivePath` — the GCS object path convention for archived records (encode-only; see "Error handling")
  - `ContentLineageId` — a unique identifier correlating a fetch attempt's outcome (encode-only)
  - `NumberFromFormattedDate` — a bidirectional date-string ↔ Unix-milliseconds schema factory, used internally by `ArchivePath`/`ContentLineageId`
  - `IngestionRecord` (+ `IngestionRecordMetadata`) — the record produced for each HTTP fetch attempt. Discriminators: `version: 1`, `kind: 'fetch_attempt'`, `outcome: 'data_fetched' | 'no_response'`
  - `SanitizerRecord` (+ `SanitizerRecordMetadata`, `PolicyLabel`, `SanitizationAction`) — the record produced after a sanitization pass. Discriminators: `version: 1`, `kind: 'sanitized_record'`; classification lives in a `label` field (`PolicyLabel`), not a separate `outcome`
- **`config/v1`** — `SourceConfig`, the validated shape of one row in a target list: `id`, `name`, `url`, and `collection` constrained to `'atom' | 'rss'`. This is a stricter, config-time cousin of `archive/v1`'s `Source` — once a fetch attempt is archived, its `Source.collection` is stored as a free-form string rather than re-validated against the enum.
- **`logging/v1`** — 8 flat, `event`-discriminated schemas describing the structured log payloads the three ingestion services emit (`IngestionSucceeded`, `IngestionFailed`, `IngestionJobCompleted`, `RecordSanitized`, `ExtractionSucceeded`, `ExtractionFailed`, `ExtractionBatchWritten`, `ExtractionJobCompleted`). These are payload shapes for `Effect.annotateLogs`, not events published anywhere — see each consuming service's own runbook for what actually triggers them.
- **`shared/v1`** — `Timestamp`, a branded non-negative-number schema shared across the other domains.

## Development

```bash
nx build ingestion-contracts
nx test ingestion-contracts
nx typecheck ingestion-contracts
nx lint ingestion-contracts
```

## Error handling

This package defines no custom error types. A decode or encode failure is a `ParseResult.ParseError` in the Effect error channel, like any Effect `Schema`. `ArchivePath` and `ContentLineageId` are both encode-only: decoding either always fails with `ParseResult.Forbidden`, since recovering their fields from a path string or a lineage-ID string isn't implemented.

## Logging

This package does no logging of its own. `logging/v1`'s schemas describe _other_ services' log payloads — they aren't code that logs anything here.

## Usage examples

```ts
import { Schema } from 'effect'
import { IngestionRecordSchema } from '@fact-check-database/ingestion-contracts/archive/v1'

const encode = Schema.encodeSync(IngestionRecordSchema)
encode({
  version: 1,
  kind: 'fetch_attempt',
  outcome: 'data_fetched',
  content_lineage_id: '...',
  ingestion_batch_id: '...',
  fetched_at: 1704067200000,
  source: {
    id: 'politifact',
    name: 'politifact.com',
    url: 'https://...',
    collection: 'rss',
  },
})
```

```ts
import { Schema } from 'effect'
import { ArchivePathSchema } from '@fact-check-database/ingestion-contracts/archive/v1'

Schema.encodeSync(ArchivePathSchema)({
  version: 1,
  collectionName: 'records/ingestion',
  ext: 'yml',
  sourceId: 'politifact',
  date: 1704067200000,
  ingestionId: 'run-1',
  observationId: 'abc123',
})
// → "v1/records/ingestion/source=politifact/date=2024-01-01/ingestion_id=run-1/abc123.yml"
```

```ts
import { Schema } from 'effect'
import { SourceConfigSchema } from '@fact-check-database/ingestion-contracts/config/v1'

Schema.decodeUnknownSync(SourceConfigSchema)({
  id: 'politifact',
  name: 'politifact.com',
  url: 'https://www.politifact.com/rss/all/',
  collection: 'rss',
})
```
