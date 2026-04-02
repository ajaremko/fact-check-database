# How the Sanitizer Works

The sanitizer is a long-running service. It consumes `IngestionAttempted` events continuously, applying a configurable content policy to each ingestor record and archiving the result. It does not exit after processing a batch — it runs until stopped.

## Data Flow

```
Pub/Sub Subscription
        │
        ▼
 Receive IngestionAttempted event
        │
        ▼
 Read IngestorRecord from archive (via pointer in event)
        │
        ├── outcome: data_fetched ──► Evaluate policy ──► Write SanitizerRecord ──► ack
        │
        └── outcome: no_response  ──► Log and acknowledge (no output written)
```

> **Note:** Downstream event publishing and body rewriting are not yet implemented. The service archives sanitizer records but does not notify consumers.

## Processing Steps

### 1. Load policy document

At startup the service reads the policy document once and holds it in memory for the lifetime of the process. The policy controls URL normalization, header dropping, content-type allowlists, size limits, and access labels per collection.

### 2. Start message handler and error handler

Two fibers run concurrently with unbounded concurrency:

- **Message handler** — processes messages from the queue in an infinite loop
- **Error handler** — logs queue-level errors; terminates the service if the subscription itself fails

### 3. Process each message

For each message received from the queue:

1. Parse the message body as an `IngestionAttempted` event
2. Use the event's `pointer` to read the corresponding `IngestorRecord` from the archive
3. If the record outcome is `no_response`, log the failure and acknowledge the message; no output is written
4. Evaluate the sanitization policy (see below)
5. Rewrite response body with incidental PII removed or obfuscated
6. Write the resulting `SanitizerRecord` to the archive
7. Publish a `SanitizeAttempted` event
8. Acknowledge the message

**On parse failure**, the message is acknowledged and discarded (`ack`). This prevents poison messages from blocking the queue indefinitely.

**On any other processing error**, the message is rejected and returned to the subscription for redelivery (`nack`).

### 4. Evaluate sanitization policy

Policy evaluation is performed by pure functions in `src/integration/`. For each `data_fetched` record:

1. **Normalize URL** — strip configured query parameters, remove fragment, lowercase hostname. Each modification is recorded as a `SanitizationAction`.
2. **Drop headers** — remove headers listed in the policy's `dropHeaders` field.
3. **Resolve rule** — look up the collection rule for the record's `source.collection`. Apply any source-specific override for the record's `source.name`.
4. **Check content type** — compare the response content-type against the rule's allowlist. Records with disallowed or missing content types are quarantined according to the rule's `onMissingContentType` setting.
5. **Check body size** — records exceeding the rule's `maxBytes` limit are quarantined.
6. **Assign label** — records that pass all checks receive the rule's `defaultLabel` (`SAFE_PUBLIC` or `RESTRICTED`); records that fail any check receive `QUARANTINED`.

The result is a `PolicyDecision` containing a `label`, an ordered list of `actions`, and a `rewriteBody` flag.

### 5. Archive sanitizer record

A `SanitizerRecord` is constructed from the policy decision, the original ingestor record fields, and a newly generated `sanitizationId` (UUID). The record is written to the archive along with flat GCS object metadata for filtering.

See [contracts.md](./contracts.md) for the archive path structure and metadata fields.

## Message Acknowledgement Behavior

| Condition                                       | Outcome                                   |
| ----------------------------------------------- | ----------------------------------------- |
| Record processed successfully                   | `ack` — message removed from subscription |
| Parse error (malformed event body)              | `ack` — message discarded; not retried    |
| Any other error (archive failure, policy error) | `nack` — message returned for redelivery  |
| Queue-level subscription error                  | Service terminates                        |

Discarding on parse failure is intentional: a message that cannot be decoded as a valid `IngestionAttempted` event cannot be processed regardless of how many times it is retried. If this occurs in volume, it typically indicates an upstream schema change — see the [runbook](./runbook.md).
