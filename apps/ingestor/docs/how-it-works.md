# How the Ingestor Works

The ingestor is a one-shot batch process. Each run fetches a fixed set of targets, archives the results, and exits. It does not maintain state between runs or perform incremental fetching.

## Data Flow

```
Target List (CSV)
      │
      ▼
 Read Targets
      │
      ▼
 Fetch Each URL (parallel, bounded concurrency)
      │
      ├── Success ──► Archive body + Archive record ──► Publish event
      │
      └── Failure ──► Archive record (no body)    ──► Publish event
      │
      ▼
 Evaluate success rate
      │
      ├── Above threshold ──► Exit 0
      │
      └── Below threshold ──► Exit with error
```

## Processing Steps

### 1. Read configuration

At startup the service reads:

- A unique `runId` (UUID generated per run)
- `MAX_CONCURRENCY` — how many targets to fetch in parallel
- `SUCCESS_THRESHOLD` — minimum fraction of targets that must succeed
- `LOG_LEVEL` — controls verbosity

### 2. Read target list

The target list is a CSV file with three columns: `collection`, `name`, and `url`. All entries are loaded into memory before fetching begins.

### 3. Fetch targets

All targets are fetched concurrently up to `MAX_CONCURRENCY`. Fetches run in `either` mode: every target is attempted regardless of whether others fail. A failed fetch does not cancel in-flight requests.

For each fetch attempt, the service records:

- The timestamp at the moment of fetch (`fetchedAt`)
- The HTTP response status, content-type, etag, and last-modified headers
- The SHA-256 hash and byte size of the response body (on success)
- The error message (on failure)
- The final URL after any redirects

### 4. Archive results

For each attempt, the archiver writes:

- **On success**: the raw response body as a binary file, and a YAML record containing structured metadata
- **On failure**: a YAML record only (no body to store)

Each write returns a `FilePointer` — a reference to the stored object — which is included in the published event.

### 5. Publish events

After archiving, the service publishes one `IngestionAttempted` event per target. Events are consumed by the sanitizer for downstream processing. See [contracts.md](./contracts.md) for the full event schema.

### 6. Evaluate success rate

After all targets have been processed, the service calculates:

```
successRate = successCount / totalTargets
```

If `successRate < SUCCESS_THRESHOLD`, the run fails with an error. This guards against silent degradation where most sources become unreachable.

## Run Identity

Each run is assigned a UUID (`runId`) at startup. This value is included in every archived record and published event, making it possible to trace all outputs from a single run.

## Observation Identity

Each published event includes an `observationId` — a deterministic hash computed from the fetch outcome:

- **On success**: `sha256("v1|url={url}|sha256={contentHash}")`
- **On failure**: `sha256("v1|url={url}|t={fetchedAt}|error={error}")`

The `observationId` is stable for identical content fetched from the same URL, which allows downstream consumers to detect duplicate observations across runs.

## Partial Failure Behavior

The ingestor is designed to tolerate partial failures:

- Individual fetch failures are logged and archived as `no_response` records
- The pipeline continues processing remaining targets
- The run only fails if the overall success rate falls below `SUCCESS_THRESHOLD`

This means a run with some unreachable sources will still produce useful output for the sources that did respond.
