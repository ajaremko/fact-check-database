# Contracts

This document describes the stable outputs of the ingestor: the events it publishes, the records it archives, and the layout of objects in cloud storage.

Downstream systems (primarily the sanitizer) depend on these contracts. Changes to schemas or archive paths should be treated as breaking changes.

Schema definitions for events and records are maintained in the [`@news-research/contracts`](../../../packages/contracts/README.md) package. The sections below document how the ingestor produces and stores those contracts.

## IngestionAttempted Event

One event is published per fetch attempt, regardless of whether the fetch succeeded or failed. Events are published to the configured Pub/Sub topic.

See [`IngestionAttempted`](../../../packages/contracts/README.md#ingestionattempted) in the contracts package for the full field reference.

## Ingestor Records

Records are the durable, structured representation of each fetch attempt. They are archived to cloud storage and referenced by the `pointer` field in the published event.

See [`IngestorRecord`](../../../packages/contracts/README.md#ingestorrecord) in the contracts package for the full field reference, including `DataFetchedRecord`, `NoResponseRecord`, and `IngestionRecordMetadata`.

## Cloud Storage Archive Layout

In production, objects are written to the configured GCS archive bucket using the following path structure.

### Raw response bodies

```
raw/source={name}/date={YYYY-MM-DD}/run={runId}/{id}.bin
```

- `{name}` — the source's `name` field from the target list
- `{YYYY-MM-DD}` — the date of the fetch (derived from `fetchedAt`)
- `{runId}` — the run UUID
- `{id}` — the SHA-256 of the response body (on success), or a timestamp-based random ID (on failure)

### Ingestor records

```
records/source={name}/date={YYYY-MM-DD}/run={runId}/{id}.ingestor.yml
```

Records are stored as YAML. Each record object also carries structured metadata as GCS object metadata fields:

| Metadata key | Description |
| --- | --- |
| `url` | Fetched URL |
| `sourceName` | Source name |
| `sourceCollection` | Collection label |
| `runId` | Run identifier |
| `fetchedAt` | Fetch timestamp (ms, as string) |
| `id` | Object identifier |

## Encryption

All objects written to the archive bucket are encrypted using a customer-managed encryption key (CMEK) provisioned by the infra project. The ingestor does not configure encryption directly — it is enforced at the bucket level by GCS.

See the [infra encryption documentation](../../infra/docs/encryption.md) for details.
