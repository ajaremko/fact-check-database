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

Both message ports carry each message as a `MessageBody`: its `data`, optional `attributes`, `messageId` and `publishTime`, plus an optional `deliveryAttempt`. `HttpServerMessageQueueFeeder` and `CloudPubsubMessageBatch` set `deliveryAttempt`, from the push envelope and the pull response respectively. Pub/Sub includes it only for subscriptions with a dead-letter policy. A value above 1 marks a redelivery.

## Adapters

| Adapter                                   | Port implemented | Environment | Notes                                                                                                                                                                     |
| ----------------------------------------- | ---------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CloudPubsubMessageBatch`                 | `MessageBatch`   | Production  | Pulls a batch from a Pub/Sub subscription; acks the batch as one RPC when the scope closes successfully, and acks nothing if it closes with a failure                     |
| `CloudPubsubMessageQueueFeeder`           | `MessageQueue`   | Production  | Feeds the queue via native Pub/Sub SDK event listeners; ack/nack delegate to the SDK message                                                                              |
| `CloudPubsubPublisher`                    | `Publisher`      | Production  | Publishes to a Pub/Sub topic                                                                                                                                              |
| `FileSystemMessageBatch`                  | `MessageBatch`   | Development | Reads every file in a directory into a batch                                                                                                                              |
| `FileSystemMessageQueueFeeder`            | `MessageQueue`   | Development | Reads every file in a directory and offers each onto the queue                                                                                                            |
| `FileSystemPublisher`                     | `Publisher`      | Development | Writes each published message to a timestamped file                                                                                                                       |
| `HttpServerMessageQueueFeeder`            | `MessageQueue`   | Production  | Push-based ingestion entry point — accepts messages over an HTTP POST route                                                                                               |
| `InMemoryMessageQueue`                    | `MessageQueue`   | Test        | In-memory queue used as a test double                                                                                                                                     |
| `CloudStorageStorageReader`               | `StorageReader`  | Production  | Reads an object from GCS; re-derives the bucket per call from the pointer                                                                                                 |
| `CloudStorageStorageWriter`               | `StorageWriter`  | Production  | Writes an object to a fixed GCS bucket configured at startup                                                                                                              |
| `FileSystemStorageReader`                 | `StorageReader`  | Development | Reads a file from the local filesystem                                                                                                                                    |
| `FileSystemStorageWriter`                 | `StorageWriter`  | Development | Writes a file (and an optional `.meta.json` sidecar) to a local output directory                                                                                          |
| `FileSystemStorageWriterWithNotification` | `StorageWriter`  | Development | Wraps `FileSystemStorageWriter`; also depends on `Publisher` and publishes a GCS-object-finalized-style notification for any write whose path matches a configured prefix |
| `InMemoryStorageReader`                   | `StorageReader`  | Test        | Reads from an in-memory key/value store used as a test double                                                                                                             |
| `InMemoryStorageWriter`                   | `StorageWriter`  | Test        | Writes to an in-memory key/value store used as a test double                                                                                                              |

Each adapter is imported via its own subpath export (e.g. `@fact-check-database/core-io/adapters/FileSystemPublisher`) rather than the package root, so consumers only pull in the transport dependencies they actually use.

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

| Error               | Fields                               | Raised by                                                                                                             |
| ------------------- | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| `MessageQueueError` | `cause`, `message`                   | `CloudPubsubMessageQueueFeeder` (pushed onto the queue's `errors` queue)                                              |
| `PublisherError`    | `cause`, `message`                   | `CloudPubsubPublisher`, `FileSystemPublisher`                                                                         |
| `StorageReadError`  | `cause`, `path`, `bucket`, `message` | `CloudStorageStorageReader`, `FileSystemStorageReader`, `InMemoryStorageReader`                                       |
| `StorageWriteError` | `cause`, `path`, `bucket`, `message` | `CloudStorageStorageWriter`, `FileSystemStorageWriter` (and, transitively, `FileSystemStorageWriterWithNotification`) |

`MessageBatch` has no error type of its own — a batch either has messages or it doesn't, so there's no whole-batch failure to model. `InMemoryStorageWriter` never fails.

A consumer typically catches the tag it cares about:

```ts
import { Effect, pipe } from 'effect'

const program = pipe(
  writeFile({ path, data }),
  Effect.catchTag('StorageWriteError', (error) =>
    Effect.logError('failed to write object', {
      path: error.path,
      cause: error.cause,
    })
  )
)
```

## Logging

This library logs at three levels only. It never logs at `info`, `warning` or `error`: those levels belong to the consuming app, which decides what an adapter outcome means for its own workload.

- **`trace`**: expected steps, logged once each step has completed. Examples: an adapter was created, a batch was acquired, an object was written, a message was published.
- **`debug`**: unexpected conditions that the adapter continues past or returns as a typed error. Examples: a malformed Pub/Sub message skipped in `CloudPubsubMessageBatch`, an HTTP request rejected with a 400 by `HttpServerMessageQueueFeeder`, a subscription error in `CloudPubsubMessageQueueFeeder`.
- **`fatal`**: used only immediately before the adapter deliberately turns a failure into a defect (`Effect.die` / `Effect.orDie`), to record why the fiber is dying. Examples:
  - a failed batch acknowledge in `CloudPubsubMessageBatch`;
  - a failed payload encode in `FileSystemPublisher`;
  - a failed notification publish in `FileSystemStorageWriterWithNotification`. The notification failure is not swallowed: the object has already been written, but the write call dies.

### Annotations

Log messages are constant strings, such as `Message published`. Values are attached as structured log annotations so that they can be queried, rather than interpolated into the message text.

- Every adapter log carries `adapter`, set to the adapter's module name.
- Other keys follow the expression the value came from, e.g. `bucket.name`, `topic.name`, `entries.length`, `message.messageId`, `request.url`.
- Values are annotated with `Effect.annotateLogsScoped` as soon as they are computed, so later logs in the same operation carry them too.

Annotations are scoped to a single operation, meaning one adapter construction or one method call, and are closed when that operation finishes. They never persist on a layer's scope. If they did, every log the consuming app writes after building the layer would inherit the adapter's annotations. `src/adapters/logAnnotationScope.spec.ts` guards this.

Message adapters also copy the annotations that are active when a message is received into the message's `annotations` field. Consumers can re-apply them while processing that message.

**Never annotated:** message `data` and `attributes`, HTTP request bodies, storage object metadata, and parse-error messages. All of these can carry payload content, including incidental PII. Error logs annotate only the error's tag or name.

The port helper functions (`readFile`, `writeFile`, `publish`) are each wrapped in an `Effect.withSpan`, so calls through this library also show up as spans in whatever tracing backend the consuming app configures.

## Usage

Wiring a `StorageWriter` and writing to it:

```ts
import { Effect } from 'effect'
import { writeFile } from '@fact-check-database/core-io'
import { layer as FileSystemStorageWriter } from '@fact-check-database/core-io/adapters/FileSystemStorageWriter'

const program = writeFile({
  path: 'example.json',
  data: Buffer.from('{}'),
}).pipe(Effect.provide(FileSystemStorageWriter))
```

Consuming a `MessageQueue`:

```ts
import { Effect } from 'effect'
import { takeMessage } from '@fact-check-database/core-io'

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
