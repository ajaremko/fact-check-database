# Contracts

This document describes the stable data types defined in this package: the events emitted by each pipeline stage, the records archived to cloud storage, and the layout of those objects in the archive.

Downstream systems depend on these contracts. Changes to schemas or archive paths should be treated as breaking changes.

## Ingest Stage

### IngestionAttempted Event

One event is produced per fetch attempt, regardless of whether the fetch succeeded or failed.

| Field           | Type              | Description                                                                 |
| --------------- | ----------------- | --------------------------------------------------------------------------- |
| `observationId` | `string`          | Deterministic hash of the fetch outcome; stable for identical content       |
| `runId`         | `string`          | UUID identifying the run that produced this event                           |
| `fetchedAt`     | `number`          | Unix timestamp (ms) at the moment of fetch                                  |
| `url`           | `string`          | The URL that was fetched                                                    |
| `finalUrl`      | `string?`         | Final URL after redirects (success only)                                    |
| `source.name`   | `string`          | Source name from the target list                                            |
| `source.collection` | `string`      | Collection label from the target list                                       |
| `http.status`   | `number`          | HTTP response status (0 on failure)                                         |
| `http.contentType` | `string?`      | Response content-type (success only)                                        |
| `http.etag`     | `string?`         | Response etag header (success only)                                         |
| `http.lastModified` | `string?`     | Response last-modified header (success only)                                |
| `content.sha256` | `string?`        | SHA-256 hash of the response body (success only)                            |
| `content.bytes` | `number?`         | Byte size of the response body (success only)                               |
| `error`         | `string?`         | Error message (failure only)                                                |
| `pointer`       | `FilePointer`     | Reference to the archived ingestor record                                   |

### IngestorRecord

Records are the durable, structured representation of each fetch attempt. They are archived to cloud storage and referenced by the `pointer` field in the `IngestionAttempted` event.

Records are stored as YAML and are a union of two types, discriminated by `outcome`:

**DataFetchedRecord** (`outcome: "data_fetched"`) — produced when the fetch succeeds:

| Field            | Type                          | Description                                        |
| ---------------- | ----------------------------- | -------------------------------------------------- |
| `version`        | `1`                           | Schema version                                     |
| `kind`           | `"fetch_attempt"`             | Record kind discriminator                          |
| `outcome`        | `"data_fetched"`              | Outcome discriminator                              |
| `runId`          | `string`                      | Run identifier                                     |
| `fetchedAt`      | `number`                      | Fetch timestamp (ms)                               |
| `url`            | `string`                      | Fetched URL                                        |
| `source`         | `{ name, collection }`        | Source identity from the target list               |
| `http`           | `{ status, contentType, etag, lastModified, headers }` | HTTP response metadata    |
| `content`        | `{ sha256, bytes }`           | Content hash and size                              |
| `pointer`        | `FilePointer`                 | Reference to the archived raw response body        |

**NoResponseRecord** (`outcome: "no_response"`) — produced when the fetch fails:

| Field       | Type                   | Description                                |
| ----------- | ---------------------- | ------------------------------------------ |
| `version`   | `1`                    | Schema version                             |
| `kind`      | `"fetch_attempt"`      | Record kind discriminator                  |
| `outcome`   | `"no_response"`        | Outcome discriminator                      |
| `runId`     | `string`               | Run identifier                             |
| `fetchedAt` | `number`               | Fetch timestamp (ms)                       |
| `url`       | `string`               | Attempted URL                              |
| `source`    | `{ name, collection }` | Source identity from the target list       |
| `error`     | `string`               | Error message describing the failure       |

**IngestionRecordMetadata** — flat fields written as cloud storage object metadata alongside the YAML record:

| Metadata key       | Description                           |
| ------------------ | ------------------------------------- |
| `id`               | Object identifier                     |
| `url`              | Fetched URL                           |
| `sourceName`       | Source name                           |
| `sourceCollection` | Collection label                      |
| `runId`            | Run identifier                        |
| `fetchedAt`        | Fetch timestamp (ms, stored as string)|

## Sanitize Stage

### SanitizerRecord

One `SanitizerRecord` is produced per successfully processed ingestor record. Records with `outcome: no_response` currently produce no output.

| Field              | Type                     | Description                                                         |
| ------------------ | ------------------------ | ------------------------------------------------------------------- |
| `sanitizationId`   | `string`                 | UUID assigned at processing time                                    |
| `label`            | `PolicyLabel`            | `SAFE_PUBLIC`, `RESTRICTED`, or `QUARANTINED`                       |
| `actions`          | `SanitizationAction[]`   | Ordered list of transformations applied during sanitization         |
| `rewriteBody`      | `boolean`                | Whether body rewriting was requested by the policy                  |
| `url`              | `string`                 | Normalized URL                                                      |
| `source`           | `{ name, collection }`   | Source identity from the original ingestor record                   |
| `fetchedAt`        | `number`                 | Original fetch timestamp (ms)                                       |
| `sanitizedAt`      | `number`                 | Sanitization timestamp (ms)                                         |
| `inputRecord`      | `FilePointer`            | Reference to the original ingestor record in the archive            |
| `sanitizedRaw`     | `FilePointer?`           | Reference to the rewritten body (not yet implemented)               |

**SanitizationAction** values include: `URL_NORMALIZED`, `BODY_STRIPPED`, `QUARANTINED_TOO_LARGE`, `QUARANTINED_CONTENT_TYPE`, and others defined in `SanitizerRecord.ts`.

**PolicyLabel** values: `SAFE_PUBLIC`, `RESTRICTED`, `QUARANTINED`.

## Archive Layout

Objects are written to a shared archive bucket by both the ingestor and sanitizer. The path structure is defined in `archivePath.ts` in this package.

### Raw response bodies (ingestor)

```
raw/source={name}/date={YYYY-MM-DD}/run={runId}/{id}.bin
```

- `{name}` — source `name` from the target list
- `{YYYY-MM-DD}` — date of the fetch, derived from `fetchedAt`
- `{runId}` — run UUID
- `{id}` — SHA-256 of the response body (success), or a timestamp-prefixed random identifier (failure)

### Ingestor records

```
records/source={name}/date={YYYY-MM-DD}/run={runId}/{id}.ingestor.yml
```

Stored as YAML. Each object carries `IngestionRecordMetadata` as cloud storage object metadata fields.

### Sanitizer records

```
records/{id}.sanitizer.yml
```

- `{id}` — `sanitizationId` UUID assigned at processing time

Stored as YAML. Each object carries flat metadata as cloud storage object metadata fields:

| Metadata key       | Description                                |
| ------------------ | ------------------------------------------ |
| `url`              | Normalized URL                             |
| `sourceName`       | Source name                                |
| `sourceCollection` | Collection label                           |
| `fetchedAt`        | Original fetch timestamp (ms, as string)   |
| `sanitizedAt`      | Sanitization timestamp (ms, as string)     |
| `id`               | Sanitization ID                            |

### Sanitized body objects (not yet implemented)

When body rewriting is implemented, modified response bodies will be written to:

```
sanitized/{id}.bin
```

The `sanitizedRaw` field in the `SanitizerRecord` will reference this object via a `FilePointer`.

## Encryption

All objects written to the archive bucket are encrypted using a customer-managed encryption key (CMEK) provisioned by the infra project. Neither the ingestor nor the sanitizer configures encryption directly — it is enforced at the bucket level.

See the [infra encryption documentation](../../infra/docs/encryption.md) for details.
