# Sanitizer

The sanitizer makes data safe for broader access and downstream analytics. It is a long-running service that evaluates each ingested fetch attempt against a configurable content policy and archives a structured sanitizer record for downstream research use.

It is the second stage in the platform's data pipeline. Its inputs are produced by the [ingestor](../ingestion-ingestor/README.md). Its outputs are intended to be consumed by the [extractor](../ingestion-extractor/README.md).

## Responsibilities

- Consume storage-notification messages identifying a newly archived ingestor record
- Read the corresponding `IngestionRecord` from the archive
- Evaluate the fetch attempt against the active sanitization policy
- Assign a policy label (`SAFE_PUBLIC`, `RESTRICTED`, or `QUARANTINED`) to each record
- Archive a structured `SanitizerRecord` for every record it processes, including failed fetch attempts

## What this service does not do

- Fetch content from the network (the [ingestor](../ingestion-ingestor/README.md)'s job)
- Rewrite or strip response body content — see Roadmap below
- Publish a downstream event when it finishes — see Roadmap below
- Deduplicate across sanitization runs — see Roadmap below

## Roadmap

- [ ] Rewrite or strip response body content
- [ ] Publish a downstream event when a record is sanitized
- [ ] Apply deduplication across sanitization runs

## How it works

This is a long-running service, not a batch job — it consumes messages continuously and doesn't exit.

```
Message Queue
      │
      ▼
 Receive storage notification (bucket + object of a newly archived IngestionRecord)
      │
      ▼
 Read IngestionRecord from archive
      │
      ├── outcome: data_fetched ──► Evaluate policy ──► Write SanitizerRecord ──► ack
      │
      └── outcome: no_response  ──► Evaluate policy (quarantined) ──► Write SanitizerRecord ──► ack
```

### How it receives work

This service never consumes a domain-specific event. What arrives on its message queue is the same kind of raw GCS "object finalized" notification the ingestor's storage write triggers (see the [ingestor](../ingestion-ingestor/README.md)'s "How the hand-off to the sanitizer works") — decoded down to just `bucketId`/`objectId`, which becomes the pointer used to read the ingestor's record directly. There's no separate event schema in between.

### Processing steps

1. **Load the policy document** once at startup and hold it in memory for the process's lifetime.
2. **Receive a message** identifying a newly archived `IngestionRecord` (bucket + object).
3. **Read the record** from the archive using that pointer.
4. **Evaluate the sanitization policy** — see [docs/runbook.md](./docs/runbook.md) for the exact rule format and evaluation order.
5. **Archive a `SanitizerRecord`** — every record gets one, including `outcome: no_response` records (which are quarantined, not skipped).
6. **Acknowledge or reject the message** — see "Message acknowledgement" below.

### Message acknowledgement

| Condition | Outcome |
| --- | --- |
| Record processed successfully | `ack` |
| Parse error (message body doesn't decode) | `ack` — discarded, not retried; retrying a message that can't be decoded wouldn't help |
| Storage read or write failure | `nack` — redelivered |
| Message-queue-level error | The service's error-handling fiber logs it and fails; not currently isolated per-message |

## Development

```bash
nx serve ingestion-sanitizer       # run locally
nx test ingestion-sanitizer        # run the vitest suite
nx typecheck ingestion-sanitizer
nx lint ingestion-sanitizer
nx build ingestion-sanitizer
```

Two spec files give solid coverage of policy evaluation and the sanitize-one-record path; nothing currently covers `main.ts`'s wiring or the message-processing loop itself.

### Local setup

```bash
cp projects/ingestion-sanitizer/.env.template projects/ingestion-sanitizer/.env
```

| Variable | Purpose |
| --- | --- |
| `SANITIZER_POLICY_MODE=filesystem` | Read the policy document from disk instead of GCS |
| `SANITIZER_POLICY_PATH` | Path to the policy YAML (defaults to `assets/policy.yml` in the template) |
| `STORAGE_MODE=filesystem` | Read/write the archive on a local directory instead of GCS |
| `STORAGE_OUTPUT_DIR` | Directory sanitizer records are written to (also where ingestor records are read from) |
| `MESSAGING_MODE=filesystem` | Read queued messages from a local directory and simulate the notification locally |
| `MESSAGE_QUEUE_INPUT_DIR` | Directory to populate with notification JSON files (e.g. from a local ingestor run) |
| `PUBLISHER_OUTPUT_DIR` | Directory the simulated notification is written to |

See [docs/runbook.md](./docs/runbook.md) for the complete configuration reference, including production values.

## Related documentation

| Document | Purpose |
| --- | --- |
| [docs/runbook.md](./docs/runbook.md) | Configuration reference, policy format, and diagnosing failures |
| [docs/known-issues.md](./docs/known-issues.md) | Accepted, long-lived gaps and deferred fixes |
| [ingestion-contracts](../ingestion-contracts/README.md) | The canonical `SanitizerRecord` schema this service archives |
| [docs/fact-check-lifecycle.md](../../docs/fact-check-lifecycle.md) | The identifiers this service carries forward unchanged |
