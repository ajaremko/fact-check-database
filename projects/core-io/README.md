# core-io

Shared messaging and storage ports (`MessageBatch`, `MessageQueue`, `Publisher`, `StorageReader`, `StorageWriter`) and swappable adapters for moving data between applications, without binding business logic to a specific transport.

Each consumer application wires the adapters appropriate to their own environment (local filesystem/in-memory for development, GCP Pub/Sub, GCS, or HTTP for production).

## Development

```bash
nx test core-io       # run the vitest suite
nx typecheck core-io
nx lint core-io
nx build core-io
```

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
| `FileSystemStorageWriterWithNotification` | `StorageWriter` | Development | Wraps `FileSystemStorageWriter`; also depends on `Publisher` and publishes a GCS-object-finalized-style notification for any write whose path matches a configured prefix |
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

## Error handling

Each port defines its own `Data.TaggedError`, since a `MessageQueue` failure and a `StorageWriter` failure aren't the same kind of thing and a consumer usually wants to handle them differently:

| Error              | Fields                                    | Raised by                                                                          |
| ------------------ | ------------------------------------------ | ----------------------------------------------------------------------------------- |
| `MessageQueueError` | `cause`, `message`                        | `CloudPubsubMessageQueueFeeder` (pushed onto the queue's `errors` queue)           |
| `PublisherError`    | `cause`, `message`                        | `CloudPubsubPublisher`, `FileSystemPublisher`                                      |
| `StorageReadError`  | `cause`, `path`, `bucket`, `message`      | `CloudStorageStorageReader`, `FileSystemStorageReader`, `InMemoryStorageReader`     |
| `StorageWriteError` | `cause`, `path`, `bucket`, `message`      | `CloudStorageStorageWriter`, `FileSystemStorageWriter` (and, transitively, `FileSystemStorageWriterWithNotification`) |

`MessageBatch` has no error type of its own — a batch either has messages or it doesn't, so there's no whole-batch failure to model. `InMemoryStorageWriter` never fails.

A consumer typically catches the tag it cares about:

```ts
import { Effect, pipe } from 'effect'

const program = pipe(
  writeFile({ path, data }),
  Effect.catchTag('StorageWriteError', (error) =>
    Effect.logError('failed to write object', { path: error.path, cause: error.cause })
  )
)
```

## Logging

This library logs at two levels only, and never at `info`, `error`, or `fatal` — a consuming app's own logging owns everything above `trace`/`warning`:

- **`trace`** — construction and lifecycle events (an adapter being created, a batch or directory being read, processing counts) and nothing else.
- **`warning`** — recoverable anomalies the adapter chooses to continue past: a malformed message skipped in `CloudPubsubMessageBatch`, or a notification-publish failure swallowed in `FileSystemStorageWriterWithNotification` (the write itself still succeeds).

The port helper functions (`readFile`, `writeFile`, `publish`) are each wrapped in an `Effect.withSpan`, so calls through this library also show up as spans in whatever tracing backend the consuming app configures.

## Usage

Wiring a `StorageWriter` and writing to it:

```ts
import { Effect } from 'effect'
import { writeFile } from '@news-research/core-io'
import { layer as FileSystemStorageWriter } from '@news-research/core-io/adapters/FileSystemStorageWriter'

const program = writeFile({ path: 'example.json', data: Buffer.from('{}') }).pipe(
  Effect.provide(FileSystemStorageWriter)
)
```

Consuming a `MessageQueue`:

```ts
import { Effect } from 'effect'
import { takeMessage } from '@news-research/core-io'

const consume = Effect.gen(function* () {
  const { message, ack, nack } = yield* takeMessage
  const result = yield* Effect.either(handle(message))
  yield* result._tag === 'Right' ? ack : nack
}).pipe(Effect.forever)
```

## Adding a new port or adapter

1. A new port goes in `src/ports/` as a `Context.Tag` class, with its own `Data.TaggedError` if it can fail, and a helper function wrapped in `Effect.withSpan` if consumers call it directly (see the existing ports for the pattern).
2. A new adapter goes in `src/adapters/`, exporting `make` and a `layer` (a plain `Layer` constant, or a factory function when the adapter needs configuration a `Context.Tag` can't carry — see `HttpServerMessageQueueFeeder` or `InMemoryStorageReader` for that shape).
3. Add a subpath entry for the new adapter under `exports` in `package.json`.

See [docs/known-issues.md](./docs/known-issues.md) for this package's current test-coverage gap.
