# Contracts

This document describes the stable outputs of the ingestor: the events it publishes, the records it archives, and the layout of objects in cloud storage.

Downstream systems (primarily the sanitizer) depend on these contracts. Changes to schemas or archive paths should be treated as breaking changes.

## IngestionAttempted Event

One event is published per fetch attempt, regardless of whether the fetch succeeded or failed. Events are published to the configured Pub/Sub topic.

The canonical schema is defined in `packages/contracts/src/lib/IngestionAttempted.ts`.

| Field | Type | Description |
| --- | --- | --- |
| `observationId` | `string` | Deterministic hash of the fetch outcome. See [Observation Identity](./how-it-works.md#observation-identity). |
| `runId` | `string` | UUID assigned to the run that produced this event |
| `fetchedAt` | `number` | Unix timestamp (ms) at the moment of fetch |
| `url` | `string` | The original URL that was fetched |
| `finalUrl` | `string?` | The final URL after redirects, if different from `url` |
| `source.name` | `string` | Source identifier from the target list |
| `source.collection` | `string` | Collection label from the target list |
| `http.status` | `number` | HTTP response status code (0 on fetch failure) |
| `http.contentType` | `string?` | Response content-type header |
| `http.etag` | `string?` | Response etag header |
| `http.lastModified` | `string?` | Response last-modified header |
| `content.sha256` | `string?` | SHA-256 hex digest of the response body (success only) |
| `content.bytes` | `number?` | Response body size in bytes (success only) |
| `error` | `string?` | Error message (failure only) |
| `pointer` | `FilePointer` | Reference to the archived record object |

### FilePointer

A `FilePointer` references a specific object in cloud storage:

| Field | Type | Description |
| --- | --- | --- |
| `bucket` | `string` | Storage bucket name |
| `object` | `string` | Object path within the bucket |

## Ingestor Records

Records are the durable, structured representation of each fetch attempt. They are archived to cloud storage and referenced by the `pointer` field in the published event.

The canonical schemas are defined in `packages/contracts/src/lib/IngestorRecord.ts`.

All records share these discriminator fields:

| Field | Value | Description |
| --- | --- | --- |
| `version` | `1` | Schema version |
| `kind` | `fetch_attempt` | Record type |
| `outcome` | `data_fetched` or `no_response` | Fetch result |

### DataFetchedRecord

Produced when the HTTP fetch returns a response body.

| Field | Type | Description |
| --- | --- | --- |
| `runId` | `string` | Run identifier |
| `fetchedAt` | `number` | Unix timestamp (ms) of the fetch |
| `url` | `string` | Fetched URL |
| `source.name` | `string` | Source name |
| `source.collection` | `string` | Collection label |
| `http.status` | `number` | HTTP status code |
| `http.contentType` | `string?` | Content-type header |
| `http.etag` | `string?` | Etag header |
| `http.lastModified` | `string?` | Last-modified header |
| `http.headers` | `Record<string, string>` | Full response headers |
| `content.sha256` | `string?` | SHA-256 hex digest of body |
| `content.bytes` | `number?` | Body size in bytes |
| `pointer` | `FilePointer` | Reference to the archived body object |

### NoResponseRecord

Produced when the HTTP fetch fails (network error, timeout, DNS failure, etc.).

| Field | Type | Description |
| --- | --- | --- |
| `runId` | `string` | Run identifier |
| `fetchedAt` | `number` | Unix timestamp (ms) of the attempt |
| `url` | `string` | Attempted URL |
| `finalUrl` | `string?` | Final URL if a redirect was followed before failure |
| `source.name` | `string` | Source name |
| `source.collection` | `string` | Collection label |
| `error` | `string` | Error message describing the failure |

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
