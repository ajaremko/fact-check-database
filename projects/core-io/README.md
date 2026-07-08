# core-io

Shared messaging and storage ports (`MessageBatch`, `MessageQueue`, `Publisher`, `StorageReader`, `StorageWriter`) and swappable adapters for moving data between pipeline stages, without binding business logic to a specific transport.

Each consumer wires the adapters appropriate to their own environment (local filesystem/in-memory for development, GCP Pub/Sub, GCS, or HTTP for production).

## Ports

- **`MessageBatch`** — a finite, pre-pulled batch of messages, each with only an `ack` (no `nack`). Use this for batch or cron-style jobs that pull a fixed set of work and process it to completion.
- **`MessageQueue`** — a live, continuously-fed queue of messages, each with both `ack` and `nack`. Use this for long-running services that consume an unbounded stream and need retry semantics on individual messages.
- **`Publisher`** — a single outbound `publish(data: Buffer)` capability. Use this for anything emitting an event or record downstream.
- **`StorageReader`** — a single `read(pointer: FilePointer)` capability returning the raw bytes at that pointer. Use this for anything that needs to fetch a previously-archived object.
- **`StorageWriter`** — a single `write({path, data, meta?, contentType?})` capability returning a `FilePointer` to the written object. Use this for anything that archives or persists a blob.

## Adapters

| Adapter                         | Port implemented | Environment | Notes                                                                                        |
| ------------------------------- | ---------------- | ----------- | -------------------------------------------------------------------------------------------- |
| `CloudPubsubMessageBatch`       | `MessageBatch`   | Production  | Pulls a batch from a Pub/Sub subscription; acks batch as one RPC when the scope closes       |
| `CloudPubsubMessageQueueFeeder` | `MessageQueue`   | Production  | Feeds the queue via native Pub/Sub SDK event listeners; ack/nack delegate to the SDK message |
| `CloudPubsubPublisher`          | `Publisher`      | Production  | Publishes to a Pub/Sub topic                                                                 |
| `FileSystemMessageBatch`        | `MessageBatch`   | Development | Reads every file in a directory into a batch                                                 |
| `FileSystemMessageQueueFeeder`  | `MessageQueue`   | Development | Reads every file in a directory and offers each onto the queue                               |
| `FileSystemPublisher`           | `Publisher`      | Development | Writes each published message to a timestamped file                                          |
| `HttpServerMessageQueueFeeder`  | `MessageQueue`   | Production  | Push-based ingestion entry point — accepts messages over an HTTP POST route                  |
| `InMemoryMessageQueue`          | `MessageQueue`   | Test        | In-memory queue used as a test double                                                        |
| `CloudStorageStorageReader`     | `StorageReader`  | Production  | Reads an object from GCS; re-derives the bucket per call from the pointer                    |
| `CloudStorageStorageWriter`     | `StorageWriter`  | Production  | Writes an object to a fixed GCS bucket configured at startup                                 |
| `FileSystemStorageReader`       | `StorageReader`  | Development | Reads a file from the local filesystem                                                       |
| `FileSystemStorageWriter`       | `StorageWriter`  | Development | Writes a file (and an optional `.meta.json` sidecar) to a local output directory             |
| `InMemoryStorageReader`         | `StorageReader`  | Test        | Reads from an in-memory key/value store used as a test double                                |
| `InMemoryStorageWriter`         | `StorageWriter`  | Test        | Writes to an in-memory key/value store used as a test double                                 |

Each adapter is imported via its own subpath export (e.g. `@news-research/core-io/adapters/FileSystemPublisher`) rather than the package root, so consumers only pull in the transport dependencies they actually use.

## What this library does NOT do

- Define business or domain logic for how messages are processed
- Retry or schedule redelivery — that's transport-level behavior (e.g. Pub/Sub subscription configuration)
- Guarantee exactly-once delivery — `ack`/`nack` only signal an outcome to the transport
- Guarantee storage semantics beyond what the underlying store provides — versioning, consistency, and durability are governed by GCS or the filesystem, not this library
- Provide a composition root — consuming apps choose and wire the adapter layer they need

## Required environment variables

| Variable                   | Used by                                                  |
| -------------------------- | -------------------------------------------------------- |
| `PUBSUB_SUBSCRIPTION_ID`   | `CloudPubsubMessageBatch`                                |
| `MESSAGE_BATCH_SIZE`       | `CloudPubsubMessageBatch`                                |
| `PUBSUB_SUBSCRIPTION_NAME` | `CloudPubsubMessageQueueFeeder`                          |
| `PUBSUB_TOPIC_NAME`        | `CloudPubsubPublisher`                                   |
| `MESSAGE_QUEUE_INPUT_DIR`  | `FileSystemMessageBatch`, `FileSystemMessageQueueFeeder` |
| `PUBLISHER_OUTPUT_DIR`     | `FileSystemPublisher`                                    |
| `PORT`                     | `HttpServerMessageQueueFeeder`                           |
| `STORAGE_BUCKET_NAME`      | `CloudStorageStorageWriter`                              |
| `STORAGE_OUTPUT_DIR`       | `FileSystemStorageWriter`                                |

## Project Structure

```
projects/core-io/
├── src/
│   ├── index.ts                  # Barrel export for ports (adapters are imported via subpath exports)
│   ├── ports/
│   │   ├── MessageBatch.ts       # Port: finite, pre-pulled batch
│   │   ├── MessageQueue.ts       # Port: live, continuously-fed queue
│   │   ├── Publisher.ts          # Port: outbound publish
│   │   ├── MessageBody.ts        # Shared message shape
│   │   ├── StorageReader.ts      # Port: read an object by FilePointer
│   │   ├── StorageWriter.ts      # Port: write an object, returns a FilePointer
│   │   └── FilePointer.ts        # Shared pointer shape (bucket/object)
│   ├── internal/                 # Shared implementation helpers, not part of the public API
│   └── adapters/
│       ├── CloudPubsub*.ts       # GCP Pub/Sub adapters (production)
│       ├── CloudStorageStorage*.ts   # GCS storage adapters (production)
│       ├── FileSystem*.ts        # Local filesystem adapters (development)
│       ├── HttpServerMessageQueueFeeder.ts  # HTTP push ingestion entry point
│       ├── InMemoryMessageQueue.ts          # Test double
│       └── InMemoryStorage*.ts              # Test doubles
```

## Building

Run `nx build core-io` to build the library.
