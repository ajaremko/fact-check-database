# core-messaging

Shared messaging ports (`MessageBatch`, `MessageQueue`, `Publisher`) and swappable adapters for moving data between pipeline stages, without binding business logic to a specific transport.

Each consumer wires the adapters appropriate to their own environment (local filesystem/in-memory for development, GCP Pub/Sub or HTTP for production).

## Ports

- **`MessageBatch`** — a finite, pre-pulled batch of messages, each with only an `ack` (no `nack`). Use this for batch or cron-style jobs that pull a fixed set of work and process it to completion.
- **`MessageQueue`** — a live, continuously-fed queue of messages, each with both `ack` and `nack`. Use this for long-running services that consume an unbounded stream and need retry semantics on individual messages.
- **`Publisher`** — a single outbound `publish(data: Buffer)` capability. Use this for anything emitting an event or record downstream.

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

Each adapter is imported via its own subpath export (e.g. `@news-research/core-messaging/adapters/FileSystemPublisher`) rather than the package root, so consumers only pull in the transport dependencies they actually use.

## What this library does NOT do

- Define business or domain logic for how messages are processed
- Retry or schedule redelivery — that's transport-level behavior (e.g. Pub/Sub subscription configuration)
- Guarantee exactly-once delivery — `ack`/`nack` only signal an outcome to the transport
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

## Project Structure

```
projects/core-messaging/
├── src/
│   ├── index.ts                  # Barrel export for ports (adapters are imported via subpath exports)
│   ├── ports/
│   │   ├── MessageBatch.ts       # Port: finite, pre-pulled batch
│   │   ├── MessageQueue.ts       # Port: live, continuously-fed queue
│   │   ├── Publisher.ts          # Port: outbound publish
│   │   └── MessageBody.ts        # Shared message shape
│   ├── internal/                 # Shared implementation helpers, not part of the public API
│   └── adapters/
│       ├── CloudPubsub*.ts       # GCP Pub/Sub adapters (production)
│       ├── FileSystem*.ts        # Local filesystem adapters (development)
│       ├── HttpServerMessageQueueFeeder.ts  # HTTP push ingestion entry point
│       └── InMemoryMessageQueue.ts          # Test double
```

## Building

Run `nx build core-messaging` to build the library.
