# Contracts

This document describes the stable outputs of the sanitizer: the records it archives and the layout of objects in cloud storage.

Schema definitions are maintained in the [`@news-research/contracts`](../../../packages/contracts/README.md) package. Changes to schemas or archive paths should be treated as breaking changes.

> **Note:** The sanitizer does not yet publish downstream events. When event publishing is implemented, this document will be updated to include the event schema and Pub/Sub topic contract.

## SanitizerRecord

One `SanitizerRecord` is written per successfully fetched ingestor record. Records with `outcome: no_response` are currently acknowledged without producing output.

See [`SanitizerRecord`](../../../packages/contracts/README.md#sanitizerrecord) in the contracts package for the full field reference, including `PolicyLabel`, `SanitizationAction`, and `SantizerRecordMetadata`.

## Cloud Storage Archive Layout

In production, objects are written to the configured GCS archive bucket using the following path structure.

### Sanitizer records

```
records/{id}.sanitizer.yml
```

- `{id}` — the `sanitizationId` UUID assigned at processing time

Records are stored as YAML. Each record object also carries structured metadata as GCS object metadata fields:

| Metadata key       | Description                              |
| ------------------ | ---------------------------------------- |
| `url`              | Normalized URL                           |
| `sourceName`       | Source name                              |
| `sourceCollection` | Collection label                         |
| `fetchedAt`        | Original fetch timestamp (ms, as string) |
| `sanitizedAt`      | Sanitization timestamp (ms, as string)   |
| `id`               | Sanitization ID                          |

### Sanitized body objects (not yet implemented)

When body rewriting is implemented, modified response bodies will be written to:

```
sanitized/{id}.bin
```

The `sanitizedRaw` field in the `SanitizerRecord` will reference this object via a `FilePointer`.

## Encryption

All objects written to the archive bucket are encrypted using a customer-managed encryption key (CMEK) provisioned by the infra project. The sanitizer does not configure encryption directly — it is enforced at the bucket level by GCS.

See the [infra encryption documentation](../../infra/docs/encryption.md) for details.
