# Ingest Stage

[One paragraph: purpose of this document. Covers the ingest stage in detail — how sources are configured, what happens during a fetch attempt, how observations are identified and archived, and the port interfaces that the stage depends on.]

---

## Source Configuration

[Describe the `Source` type (`src/shared/Source.ts`) and what each field means in operational terms:]

- `id` — [unique identifier for the source]
- `name` — [human-readable label; used in archive paths and log annotations]
- `url` — [the URL that will be fetched]
- `collection` — [feed format: `'rss'` or `'atom'`; determines which extractor is used downstream]

[Note where source configurations are expected to live — in the consuming application (`ingestion-pipeline-ingestor`), not in this package.]

---

## Fetch Behaviour

[Describe what `ingestFromSource` does during a fetch attempt and what guarantees it makes:]

### Success path

[What happens when `Fetcher.fetch` returns `FetchSuccess`:]

- [Raw response body is archived at `v1/raw/source={name}/date={date}/ingestion_id={id}/{observationId}.bin`]
- [An `IngestionRecord` with `outcome: 'data_fetched'` is archived as YAML at `v1/records/source={name}/date={date}/ingestion_id={id}/{observationId}.ingestion.yml`]
- [The record includes full HTTP metadata: `status`, `final_url`, `content_type`, `etag`, `last_modified`, `headers`, and a `content` block with SHA-256 and byte count]
- [An `ObservationIngested` event is returned with a pointer to the YAML record]

### Failure path

[What happens when `Fetcher.fetch` returns `FetchFailure` (network error, timeout, DNS failure, etc.):]

- [No body is archived]
- [An `IngestionRecord` with `outcome: 'no_response'` is archived, recording the error string]
- [An `ObservationIngested` event is still returned — the ingestor always emits one event per fetch attempt]

## Content Lineage Identity

[Explain `content_lineage_id` (`src/ingest/ObservationId.ts`) — what it is and why it matters:]

[The `content_lineage_id` is a SHA-256 hash of a normalised representation of the fetch result:]

- **On success**: hashes `{ version, success: true, url, sha256 }` — stable for identical content at the same URL
- **On failure**: hashes `{ version, success: false, url, fetchedAt, error }` — stable for identical errors at the same moment

[Because the ID is derived from content, re-running an ingestion over the same source will produce the same ID for unchanged content. This enables:]

- [deduplication of downstream events]
- [idempotent re-runs of the ingest stage]
- [content-addressable lookup of archived records]

## Archived Records

### Raw body (`FetchedBody`)

[Describe `FetchedBody` (`src/ingest/FetchedBody.ts`) and where raw bytes are stored:]

- [Archive path template: `v1/raw/source={sourceName}/date={date}/ingestion_id={ingestionId}/{observationId}.bin`]
- [Content-Type is preserved from the HTTP response when present]
- [No metadata is attached to the raw body object beyond what the path encodes]

### Ingestor record (`IngestionRecord`)

[Describe the YAML record written for each attempt and what it contains. Reference `src/shared/contracts/v1/IngestorRecord.ts`:]

| Field                | Present when | Description                              |
| -------------------- | ------------ | ---------------------------------------- |
| `version`            | always       | `1`                                      |
| `kind`               | always       | `'fetch_attempt'`                        |
| `outcome`            | always       | `'data_fetched'` or `'no_response'`      |
| `content_lineage_id` | always       | [SHA-256 identity hash]                  |
| `ingestion_batch_id` | always       | [ID of the ingestion run]                |
| `fetched_at`         | always       | [Unix timestamp of the fetch]            |
| `source`             | always       | [`{ id, name, url, collection }`]        |
| `error`              | failure only | [error message from the fetch]           |
| `status`             | success only | [HTTP response status code]              |
| `final_url`          | success only | [URL after redirects]                    |
| `content_type`       | success only | [HTTP Content-Type header value]         |
| `etag`               | success only | [ETag header value if present]           |
| `last_modified`      | success only | [Last-Modified header value if present]  |
| `headers`            | success only | [full response headers map]              |
| `content.sha256`     | success only | [SHA-256 of the raw body bytes]          |
| `content.bytes`      | success only | [byte length of the raw body]            |
| `content.raw`        | success only | [`FilePointer` to the archived raw body] |

[GCS object metadata fields (`IngestionRecordMetadata`): `observationId`, `ingestionId`, `sourceName`, `sourceCollection`, `fetchedAt`, `url` — stored as flat string attributes on the GCS object for quick lookup without reading the full YAML.]

## Fetcher Port

[Describe the `Fetcher` Context.Tag (`src/ingest/Fetcher.ts`) and its contract:]

```
fetch(source: Source, timestamp: Timestamp) → Effect<FetchResult, FetcherError>
```

[`FetchResult` is a tagged union:]

- `FetchSuccess` — [fields: `finalUrl`, `status`, `headers`, `etag`, `lastModified`, `contentType`, `bytes`, `sha256`, `body`]
- `FetchFailure` — [fields: `error`]

[`FetcherError` — tagged error for unexpected failures (not the same as `FetchFailure`, which represents a handled network-level non-response).]

### Available adapters

| Adapter             | Use case   | Notes                                                                                         |
| ------------------- | ---------- | --------------------------------------------------------------------------------------------- |
| `HttpClientFetcher` | Production | [Uses `@effect/platform` HTTP client; follows redirects; reads response body as `Uint8Array`] |
| `InMemoryFetcher`   | Testing    | [Returns pre-configured responses; deterministic; no network calls]                           |

## ObservationIngested Event

[Describe the event returned by `ingestFromSource` (`src/ingest/contracts/v1/ObservationIngested.ts`):]

[One event is emitted per fetch attempt, regardless of outcome. Fields:]

| Field                         | Description                                            |
| ----------------------------- | ------------------------------------------------------ |
| `version`                     | `1`                                                    |
| `content_lineage_id`          | [deterministic hash identifying this observation]      |
| `ingestion_batch_id`          | [ID of the ingestion run]                              |
| `fetched_at`                  | [Unix timestamp]                                       |
| `source`                      | [`{ id, name, url, collection }`]                      |
| `pointer`                     | [`FilePointer` to the archived `IngestionRecord` YAML] |
| `error` _(optional)_          | [error message if fetch failed]                        |
| `status` _(optional)_         | [HTTP status code]                                     |
| `final_url` _(optional)_      | [URL after redirects]                                  |
| `content_type` _(optional)_   | [HTTP Content-Type]                                    |
| `etag` _(optional)_           | [ETag]                                                 |
| `last_modified` _(optional)_  | [Last-Modified]                                        |
| `content_sha256` _(optional)_ | [SHA-256 of body bytes]                                |
| `content_bytes` _(optional)_  | [byte length of body]                                  |

[The `pointer` field always references the `IngestionRecord` YAML, not the raw body. Consumers that need the raw body should follow `record.content.raw`.]

## Archive Path Layout

[Describe the GCS path structure used by the ingest stage (`src/shared/contracts/v1/ArchivePath.ts`):]

```
v1/{collectionName}/source={sourceName}/date={YYYY-MM-DD}/ingestion_id={ingestionId}/{observationId}.{ext}
```

| Segment          | Ingestor record | Raw body |
| ---------------- | --------------- | -------- |
| `collectionName` | `records`       | `raw`    |
| `ext`            | `ingestion.yml` | `bin`    |

[The `date` segment is derived from `fetchedAt` and uses `yyyy-MM-dd` format. Partitioning by date allows efficient GCS lifecycle policies and BigQuery external table definitions.]

## Related

- [README.md — Ingest module overview](../README.md#ingest)
- [docs/sanitize.md — Sanitize stage, which consumes `ObservationIngested` events](./sanitize.md)
