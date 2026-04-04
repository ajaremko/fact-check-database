# @news-research/contracts

Shared Effect schemas and types for cross-app data contracts.

## Domains

The package exports four namespaces:

- **`FilePointer`** — reference to a storage object
- **`IngestionAttempted`** — event published per fetch attempt
- **`IngestorRecord`** — durable records archived by the ingestor
- **`SantizerRecord`** — durable records archived by the sanitizer

All record types include `version`, `kind`, and `outcome` discriminators. Treat schema changes as breaking changes — downstream systems depend on these contracts.

## FilePointer

A `FilePointer` identifies a specific file object. It is embedded in events and records to link them to their archived payloads.

| Field        | Type      | Description                                                                    |
| ------------ | --------- | ------------------------------------------------------------------------------ |
| `bucket`     | `string`  | Storage bucket name                                                            |
| `object`     | `string`  | Object path within the bucket                                                  |
| `generation` | `number?` | GCS object generation number; when present, pins reads to an immutable version |

## IngestionAttempted

One event is published per fetch attempt, regardless of whether the fetch succeeded or failed.

| Field               | Type          | Description                                            |
| ------------------- | ------------- | ------------------------------------------------------ |
| `observationId`     | `string`      | Deterministic hash of the fetch outcome                |
| `runId`             | `string`      | UUID assigned to the run that produced this event      |
| `fetchedAt`         | `number`      | Unix timestamp (ms) at the moment of fetch             |
| `url`               | `string`      | The original URL that was fetched                      |
| `finalUrl`          | `string?`     | The final URL after redirects, if different from `url` |
| `source.name`       | `string`      | Source identifier from the target list                 |
| `source.collection` | `string`      | Collection label from the target list                  |
| `http.status`       | `number`      | HTTP response status code (0 on fetch failure)         |
| `http.contentType`  | `string?`     | Response content-type header                           |
| `http.etag`         | `string?`     | Response etag header                                   |
| `http.lastModified` | `string?`     | Response last-modified header                          |
| `content.sha256`    | `string?`     | SHA-256 hex digest of the response body (success only) |
| `content.bytes`     | `number?`     | Response body size in bytes (success only)             |
| `error`             | `string?`     | Error message (failure only)                           |
| `pointer`           | `FilePointer` | Reference to the archived ingestor record object       |

## IngestorRecord

Records are the durable, structured representation of each fetch attempt. They are archived to cloud storage by the ingestor and referenced by the `pointer` field in the published event.

All records share these discriminator fields:

| Field     | Value                           | Description    |
| --------- | ------------------------------- | -------------- |
| `version` | `1`                             | Schema version |
| `kind`    | `fetch_attempt`                 | Record type    |
| `outcome` | `data_fetched` or `no_response` | Fetch result   |

### DataFetchedRecord

Produced when the HTTP fetch returns a response body.

| Field               | Type                     | Description                           |
| ------------------- | ------------------------ | ------------------------------------- |
| `runId`             | `string`                 | Run identifier                        |
| `fetchedAt`         | `number`                 | Unix timestamp (ms) of the fetch      |
| `url`               | `string`                 | Fetched URL                           |
| `source.name`       | `string`                 | Source name                           |
| `source.collection` | `string`                 | Collection label                      |
| `http.status`       | `number`                 | HTTP status code                      |
| `http.contentType`  | `string?`                | Content-type header                   |
| `http.etag`         | `string?`                | Etag header                           |
| `http.lastModified` | `string?`                | Last-modified header                  |
| `http.headers`      | `Record<string, string>` | Full response headers                 |
| `content.sha256`    | `string?`                | SHA-256 hex digest of body            |
| `content.bytes`     | `number?`                | Body size in bytes                    |
| `pointer`           | `FilePointer`            | Reference to the archived body object |

### NoResponseRecord

Produced when the HTTP fetch fails (network error, timeout, DNS failure, etc.).

| Field               | Type      | Description                                         |
| ------------------- | --------- | --------------------------------------------------- |
| `runId`             | `string`  | Run identifier                                      |
| `fetchedAt`         | `number`  | Unix timestamp (ms) of the attempt                  |
| `url`               | `string`  | Attempted URL                                       |
| `finalUrl`          | `string?` | Final URL if a redirect was followed before failure |
| `source.name`       | `string`  | Source name                                         |
| `source.collection` | `string`  | Collection label                                    |
| `error`             | `string`  | Error message describing the failure                |

### IngestionRecordMetadata

Flat metadata stored as GCS object metadata fields alongside each archived record.

| Field              | Type     | Description                                               |
| ------------------ | -------- | --------------------------------------------------------- |
| `url`              | `string` | Fetched URL                                               |
| `sourceName`       | `string` | Source name                                               |
| `sourceCollection` | `string` | Collection label                                          |
| `runId`            | `string` | Run identifier                                            |
| `fetchedAt`        | `number` | Fetch timestamp (ms); stored as string, decoded as number |
| `id`               | `string` | Object identifier                                         |

## SanitizerRecord

Records produced by the sanitizer after processing an ingestor record. Each sanitizer record references its input ingestor record and documents the policy decision applied.

### PolicyLabel

High-level access classification assigned to each sanitized record:

| Value         | Description                                            |
| ------------- | ------------------------------------------------------ |
| `SAFE_PUBLIC` | Content is suitable for unrestricted downstream access |
| `RESTRICTED`  | Content requires access controls before use            |
| `QUARANTINED` | Content is withheld from downstream use pending review |

### SanitizationAction

Traceable actions applied by the sanitizer. Multiple actions may be recorded per record; the full list forms an audit trail.

| Value                                 | Description                                             |
| ------------------------------------- | ------------------------------------------------------- |
| `NONE`                                | No modification was made                                |
| `URL_NORMALIZED`                      | URL was normalized (e.g. scheme or host casing)         |
| `QUERY_STRIPPED`                      | Query parameters were removed                           |
| `FRAGMENT_STRIPPED`                   | URL fragment was removed                                |
| `DROPPED_HEADERS`                     | Response headers were removed from the output           |
| `BODY_STRIPPED`                       | Response body was removed from the output               |
| `BODY_REWRITTEN`                      | Response body was modified                              |
| `QUARANTINED_TOO_LARGE`               | Record quarantined because body exceeded size limit     |
| `QUARANTINED_UNEXPECTED_CONTENT_TYPE` | Record quarantined due to unexpected content type       |
| `QUARANTINED_FETCH_FAILED`            | Record quarantined because the originating fetch failed |

### SanitizerRecord fields

| Field               | Type                      | Description                                          |
| ------------------- | ------------------------- | ---------------------------------------------------- |
| `kind`              | `sanitized_record`        | Record type discriminator                            |
| `version`           | `1`                       | Schema version discriminator                         |
| `sanitizationId`    | `string`                  | UUID or deterministic hash for this sanitization run |
| `runId`             | `string`                  | Run identifier                                       |
| `fetchedAt`         | `number`                  | Unix timestamp (ms) of the original fetch, carried forward from the ingestor record |
| `sanitizedAt`       | `number`                  | Unix timestamp (ms) at the time of sanitization      |
| `input.record`      | `FilePointer`             | Pointer to the input ingestor record                 |
| `input.raw`         | `FilePointer?`            | Pointer to the raw bytes of the input, if retained   |
| `url`               | `string`                  | Normalized URL                                       |
| `finalUrl`          | `string?`                 | Final URL after redirects, if different from `url`   |
| `source.name`       | `string`                  | Source name                                          |
| `source.collection` | `string`                  | Collection label                                     |
| `http.status`       | `number`                  | HTTP status code                                     |
| `http.contentType`  | `string?`                 | Content-type header                                  |
| `http.etag`         | `string?`                 | Etag header                                          |
| `http.lastModified` | `string?`                 | Last-modified header                                 |
| `http.headers`      | `Record<string, string>?` | Response headers; omitted in sanitized outputs       |
| `content.sha256`    | `string?`                 | SHA-256 hex digest of content                        |
| `content.bytes`     | `number?`                 | Content size in bytes                                |
| `policy.label`      | `PolicyLabel`             | Access classification                                |
| `policy.actions`    | `SanitizationAction[]`    | Ordered list of actions applied                      |
| `policy.notes`      | `string?`                 | Free-text rationale for the policy decision          |
| `sanitizedRaw`      | `FilePointer?`            | Pointer to rewritten body, if the body was modified  |
| `error`             | `string?`                 | Error description for quarantined records            |

### SantizerRecordMetadata

Flat metadata stored as GCS object metadata fields alongside each archived sanitizer record.

| Field              | Type     | Description                                                      |
| ------------------ | -------- | ---------------------------------------------------------------- |
| `url`              | `string` | Normalized URL                                                   |
| `sourceName`       | `string` | Source name                                                      |
| `sourceCollection` | `string` | Collection label                                                 |
| `fetchedAt`        | `number` | Original fetch timestamp (ms)                                    |
| `sanitizedAt`      | `number` | Sanitization timestamp (ms); stored as string, decoded as number |
| `id`               | `string` | Object identifier                                                |
