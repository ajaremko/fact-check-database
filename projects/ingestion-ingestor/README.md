# Ingestor

The ingestor creates an append-only, auditable collection of observations.

It is a scheduled batch job that fetches content from a configured list of public URLs and archives the raw responses and a structured record of each attempt. It is the first stage in the platform's data pipeline. Its output is consumed by the [sanitizer](../ingestion-sanitizer/README.md), which applies content policy before data is made available for research use.

## Responsibilities

- Read a target list of URLs from configuration
- Fetch each URL over HTTP, recording both successes and failures
- Archive the raw response body and a structured record for each fetch attempt
- Enforce a configurable success threshold to gate the run

## What this service does not do

- Parse or interpret fetched content
- Apply content policy or sanitization
- Deduplicate observations across runs
- Maintain persistent state between runs
- Publish an event directly — see "How the hand-off to the sanitizer works" below

## How it works

Each run fetches a fixed set of targets, archives the results, and exits. It does not maintain state between runs or perform incremental fetching.

```
Target List (CSV)
      │
      ▼
 Read Targets
      │
      ▼
 Fetch Each URL (parallel, bounded concurrency)
      │
      ├── Success ──► Archive body + record
      │
      └── Failure ──► Archive record (no body)
      │
      ▼
 Evaluate success rate
      │
      ├── Above threshold ──► Exit 0
      │
      └── Below threshold ──► Exit with error
```

### Processing steps

1. **Read configuration.** At startup the service generates a `runId` (UUID) and reads `MAX_CONCURRENCY` and `SUCCESS_THRESHOLD`. See [docs/runbook.md](./docs/runbook.md) for the complete configuration reference.
2. **Read the target list.** A CSV file with `collection`, `name`, `url`, and `id` columns, loaded entirely into memory before fetching begins.
3. **Fetch targets.** All targets are fetched concurrently up to `MAX_CONCURRENCY`, in `either` mode: every target is attempted regardless of whether others fail, and a failed fetch doesn't cancel in-flight requests.
4. **Archive results.** On success, the raw response body and a structured record are both written to storage. On failure, only the record is written (there's no body). Both writes go through `@fact-check-database/core-io`'s `StorageWriter` port — this project owns no storage code of its own.
5. **Evaluate the success rate.** Once every target has been attempted, `successRate = successCount / totalTargets`. If it's below `SUCCESS_THRESHOLD`, the run fails — see [docs/runbook.md](./docs/runbook.md) for exactly what that failure looks like.

### How the hand-off to the sanitizer works

This service never calls a publisher directly — `ingestFromSource` only writes to storage. The hand-off to the sanitizer is triggered by the write itself, and looks different in each environment:

- **In development** (`STORAGE_MODE=filesystem`), `core-io`'s `FileSystemStorageWriterWithNotification` adapter synthesizes a GCS-style "object finalized" notification and publishes it after every write under the `records/` prefix, so a local run can be exercised end-to-end without GCP infrastructure.
- **In production** (`STORAGE_MODE=gcp`), writing the record to the configured GCS bucket triggers a real bucket-level Pub/Sub notification — infrastructure provisioned by `ingestion-infra`, not application code in this project. The sanitizer's push subscription receives it from there.

### Run and fetch identity

Each run gets a UUID at startup, carried as `ingestor_run_id` (`ingestorRunId` in code). It's included in every archived record and appears in the GCS archive path, making it possible to trace every output of one run.

A run fetches each source once, so `source.id` + `ingestor_run_id` identify a fetch attempt; there is no separate fetch or observation id. A successful fetch's body is archived under its `content_sha256`, so identical bytes fetched by different runs are recognizable by name. See [docs/fact-check-lifecycle.md](../../docs/fact-check-lifecycle.md) for how these identifiers carry through to BigQuery.

### Partial failure behavior

Each target's fetch, archive, and record-write sequence runs independently through `Effect.all(..., { mode: 'either' })`, so one bad target doesn't fail the run — the run only fails afterward, if the overall success rate falls below `SUCCESS_THRESHOLD`.

## Development

```bash
nx serve ingestion-ingestor       # run locally
nx test ingestion-ingestor        # run the vitest suite
nx typecheck ingestion-ingestor
nx lint ingestion-ingestor
nx build ingestion-ingestor
```

Three spec files cover the schemas (`FetchedBody`, `Observation`) and the core `ingestFromSource` logic.

### Local setup

Copy the environment template and run against the local filesystem — no GCP credentials required:

```bash
cp projects/ingestion-ingestor/.env.template projects/ingestion-ingestor/.env
```

| Variable                    | Purpose                                                                                                     |
| --------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `TARGET_LIST_PATH`          | Path to the target list CSV, always read from a file (defaults to `assets/target-list.csv` in the template) |
| `STORAGE_MODE=filesystem`   | Archive to a local directory instead of GCS                                                                 |
| `STORAGE_OUTPUT_DIR`        | Directory archived bodies and records are written to                                                        |
| `MESSAGING_MODE=filesystem` | Simulate the storage notification locally instead of using Pub/Sub                                          |
| `PUBLISHER_OUTPUT_DIR`      | Directory the simulated notification is written to                                                          |

See [docs/runbook.md](./docs/runbook.md) for the complete configuration reference, including production values.

## Related documentation

| Document                                                           | Purpose                                                                                            |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| [docs/runbook.md](./docs/runbook.md)                               | Configuration reference, operations, and diagnosing failures                                       |
| [ingestion-contracts](../ingestion-contracts/README.md)            | The canonical `IngestionRecord` schema this service archives                                       |
| [docs/known-issues.md](./docs/known-issues.md)                     | Accepted, long-lived gaps and deferred fixes                                                       |
| [docs/fact-check-lifecycle.md](../../docs/fact-check-lifecycle.md) | Identifiers this service mints (`ingestor_run_id`, `content_sha256`) and how they carry downstream |
