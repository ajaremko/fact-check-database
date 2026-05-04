# Ingest Stage

The ingest stage is responsible for processing a single URL target: fetching it over HTTP, archiving the response, and producing an `IngestionAttempted` event. The core function is `ingestFromSourceTarget`, exported from `@news-research/ingestion/steps/ingest`.

This function is called once per target per run. It handles both success and failure cases uniformly — every attempt, regardless of outcome, produces an archived record and a published event.

## Required Ports

`ingestFromSourceTarget` depends on two ports that must be provided by the consuming application:

| Port       | Responsibility                                                                                         |
| ---------- | ------------------------------------------------------------------------------------------------------ |
| `Fetcher`  | Performs HTTP fetches; returns either a full `Response` or a `NoResponse` on failure                   |
| `Archiver` | Writes raw response bodies and structured records to durable storage; returns `FilePointer` references |

## Per-Target Data Flow

```
SourceTarget (url, name, collection)
        │
        ▼
Fetcher.fetch(url) → FetchResult
        │
        ├── Success ──► archiveBody ──► archiveRecord ──► IngestionAttempted event
        │
        └── Failure ──► archiveRecord (no body)   ──► IngestionAttempted event
```

### On success

1. The raw response body is archived as a binary file. The archive returns a `FilePointer` to the stored object.
2. A `DataFetchedRecord` is constructed containing HTTP response metadata (status, content-type, etag, last-modified, headers), content metadata (SHA-256 hash, byte size), and the body `FilePointer`.
3. The record is archived as a YAML file alongside flat object metadata. The archive returns a second `FilePointer`.
4. An `IngestionAttempted` event is constructed and returned, referencing the record `FilePointer`.

### On failure

1. A `NoResponseRecord` is constructed containing the error message.
2. The record is archived as a YAML file. No body file is written.
3. An `IngestionAttempted` event is constructed and returned, referencing the record `FilePointer`.

## Archive File Naming

Archive objects are written under a path determined by the source name, fetch date, and run identifier:

```
source={name}/date={YYYY-MM-DD}/run={runId}/
```

Within that directory, individual files are named by an identifier derived from the fetch outcome:

- **On success** — the SHA-256 hash of the response body. This makes the identifier stable and idempotent for identical content.
- **On failure** — a timestamp-prefixed random value, since there is no content hash to derive from.

## Observation Identity

Each `IngestionAttempted` event includes an `observationId` — a deterministic hash computed from the fetch outcome:

- **On success**: `sha256("v1|url={url}|sha256={contentHash}")`
- **On failure**: `sha256("v1|url={url}|t={fetchedAt}|error={error}")`

The `observationId` is stable for identical content fetched from the same URL, which allows downstream consumers to detect duplicate observations across runs.

## Partial Failure Behavior

`ingestFromSourceTarget` does not throw on fetch failure. Instead, it returns an `IngestionAttempted` event in all cases. The calling application is responsible for counting successes and failures across a run and deciding whether the run as a whole should be considered successful.
