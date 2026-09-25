# core-vendor

The platform's boundary with the external SDKs it depends on: Google Cloud Pub/Sub, Cloud Storage, BigQuery, Algolia, Pino, and a Cloud Run metadata helper.

Every SDK client is reached through an Effect `Context.Tag`, never constructed directly by application code. Every SDK call that can reject is wrapped in `Effect.tryPromise` so the failure lands in the Effect error channel as a typed error rather than a thrown exception. This is where that boundary lives, so the rest of the platform depends on Effect services, not on a specific vendor's client API.

The package is `@fact-check-database/core-vendor`. There is no root export; every module is reached by its own subpath, imported as a namespace:

```ts
import * as StorageBucket from '@fact-check-database/core-vendor/cloud-storage/StorageBucket'
```

| Subpath                               | Provides                               |
| ------------------------------------- | -------------------------------------- |
| `cloud-pubsub/PubsubClient`           | Shared Pub/Sub client (publish side)   |
| `cloud-pubsub/PubsubTopic`            | A topic to publish to                  |
| `cloud-pubsub/PubsubSubscription`     | A subscription for streaming pull      |
| `cloud-pubsub/PubsubSubscriberClient` | A v1 subscriber client for manual pull |
| `cloud-storage/StorageClient`         | Shared Cloud Storage client            |
| `cloud-storage/StorageBucket`         | A bucket to read and write objects in  |
| `bigquery/BigQueryClient`             | Shared BigQuery client and job helpers |
| `algolia/AlgoliaSearchClient`         | Shared Algolia client and index writes |
| `cloud-run`                           | Cloud Run instance metadata            |
| `pino`                                | Pino-backed Effect `Logger`            |
| `pino-logging-gcp-config`             | Cloud Logging formatting for Pino      |

## What this library does NOT do

- Implement retry or backoff policies — no `Effect.retry`/`Schedule` appears anywhere here; a caller that needs retries wraps a call to this library with its own policy
- Paginate results — `StorageBucket.getFilesStream` streams a bucket listing, but BigQuery and Pub/Sub calls return whatever the SDK gives back in one call
- Contain business or domain logic — every module only wraps an SDK call behind an Effect service
- Cache or reuse a client across requests beyond what `Layer` scoping already provides

## Development

```bash
nx test core-vendor       # run the vitest suite
nx typecheck core-vendor
nx lint core-vendor
nx build core-vendor
```

The two Pino specs write real log files under `tmp/` and assert on their parsed contents, so they run slower than the rest of the suite (each file takes a couple of seconds) and their test cases run sequentially.

## The service-and-layer pattern

Every client module (`PubsubClient`, `PubsubTopic`, `PubsubSubscription`, `PubsubSubscriberClient`, `StorageClient`, `StorageBucket`, `BigQueryClient`, `AlgoliaSearchClient`) follows the same shape:

- A `Context.Tag` class naming the service and the SDK object it carries.
- A private `make` that builds the SDK object.
- An exported `layer`, built with `flow(make, Layer.effect(Tag))`, that turns `make` into an Effect layer.

`StorageBucket` is the one exception: alongside the private, `Config`-based `makeConfig` its `layer` actually uses, it also exports a **public** `make(bucketName: string, config?: BucketOptions)` for a caller that already has a resolved bucket name and doesn't need the `Layer`/`Config` machinery. No consumer in this repo currently calls it, but it's a deliberate, documented alternative, not an oversight.

Configuration is threaded through as `Config.Config<T>` values, one per option key, rather than as already-resolved values. That means a layer reads its configuration from the environment when the Effect runtime actually needs it, not when the layer is constructed:

```ts
import { Config } from 'effect'
import * as BigQueryClient from '@fact-check-database/core-vendor/bigquery/BigQueryClient'

// Application Default Credentials, no extra options
Effect.provide(BigQueryClient.layer())

// Explicit project, read from the environment at runtime
Effect.provide(
  BigQueryClient.layer({ projectId: Config.string('GCP_PROJECT_ID') })
)
```

Client layers (`PubsubClient`, `StorageClient`, `BigQueryClient`) take this configuration as optional; omitted, they use Application Default Credentials, which resolve automatically in Cloud Run via the attached service account. Resource layers (`PubsubTopic`, `PubsubSubscription`, `StorageBucket`) instead take a required name — a topic, subscription, or bucket — as a `Config.Config<string>`, and depend on their client layer being provided in the same stack.

| Layer                            | Provides                 | Requires        | Lifetime       |
| -------------------------------- | ------------------------ | --------------- | -------------- |
| `PubsubClient.layer()`           | `PubsubClient`           | —               | `Layer.scoped` |
| `PubsubTopic.layer(name)`        | `PubsubTopic`            | `PubsubClient`  | `Layer.effect` |
| `PubsubSubscription.layer(name)` | `PubsubSubscription`     | `PubsubClient`  | `Layer.scoped` |
| `PubsubSubscriberClient.layer()` | `PubsubSubscriberClient` | —               | `Layer.scoped` |
| `StorageClient.layer()`          | `StorageClient`          | —               | `Layer.effect` |
| `StorageBucket.layer(name)`      | `StorageBucket`          | `StorageClient` | `Layer.effect` |
| `BigQueryClient.layer()`         | `BigQueryClient`         | —               | `Layer.effect` |
| `AlgoliaSearchClient.layer()`    | `AlgoliaSearchClient`    | —               | `Layer.effect` |

Three layers are scoped, because they hold open connections: `PubsubClient`, `PubsubSubscriberClient` and `PubsubSubscription`. Each calls the SDK's `close()` when the enclosing Effect scope is released. Providing them with `Layer.provide` or `Effect.provide` handles this automatically. Because `PubsubSubscription` depends on `PubsubClient`, subscriptions close before the client that created them, which is the order the Pub/Sub SDK requires. A failed `close()` is logged at `debug` and otherwise ignored, since releasing a resource cannot fail.

## Pub/Sub

`PubsubTopic` publishes; `PubsubSubscription` and `PubsubSubscriberClient` read, using two different SDK access patterns. `PubsubSubscription` wraps the SDK's own `Subscription`, which manages a persistent streaming pull internally and pushes messages as they arrive. `PubsubSubscriberClient` wraps the lower-level v1 `SubscriberClient` for manual, one-shot `pull`/`acknowledge` calls, which is what a batch-style job uses to fetch and process a bounded set of messages at a time.

```ts
import { Config, Effect } from 'effect'
import * as PubsubTopic from '@fact-check-database/core-vendor/cloud-pubsub/PubsubTopic'
import * as PubsubSubscriberClient from '@fact-check-database/core-vendor/cloud-pubsub/PubsubSubscriberClient'

// Publish
PubsubTopic.publishMessage({
  data: Buffer.from(JSON.stringify(payload)),
}).pipe(Effect.provide(PubsubTopic.layer(Config.string('PUBSUB_TOPIC_NAME'))))

// Pull and acknowledge
Effect.gen(function* () {
  const [{ receivedMessages }] = yield* PubsubSubscriberClient.pull(
    subscriptionId
  )
  yield* PubsubSubscriberClient.acknowledge(
    subscriptionId,
    (receivedMessages ?? []).map((m) => m.ackId)
  )
})
```

## Cloud Storage

`StorageBucket` covers the object operations the platform needs: write, download, move, and list, either as a full listing or as a stream for buckets too large to list in one call.

```ts
import { Effect, Stream } from 'effect'
import * as StorageBucket from '@fact-check-database/core-vendor/cloud-storage/StorageBucket'

Effect.gen(function* () {
  yield* StorageBucket.writeFile(
    'path/to/file.json',
    Buffer.from(JSON.stringify(payload))
  )

  const [data] = yield* StorageBucket.downloadFile('path/to/file.json')
  const contents = data.toString('utf-8')

  const files = yield* StorageBucket.getFilesStream({
    prefix: 'v1/type=fact_checks/',
  })
  yield* Stream.runForEach(files, (file) => Effect.logInfo(file.name))
})
```

## BigQuery

`BigQueryClient` starts a job and separately waits for it to finish, so a caller can start a job and decide independently whether and how long to wait.

```ts
import { Effect } from 'effect'
import * as BigQueryClient from '@fact-check-database/core-vendor/bigquery/BigQueryClient'

Effect.gen(function* () {
  const job = yield* BigQueryClient.createJob({
    configuration: {
      load: {
        /* ... */
      },
    },
  })
  yield* BigQueryClient.awaitJob(job)
})
```

## Algolia

`AlgoliaSearchClient` writes records to a search index, with or without the index's configured transformation rules applied.

```ts
import * as AlgoliaSearchClient from '@fact-check-database/core-vendor/algolia/AlgoliaSearchClient'

AlgoliaSearchClient.saveObjects({ indexName: 'fact_checks', objects: records })
```

## Cloud Run

`cloudRunInstanceId` reads the running revision's numeric instance ID from the GCP metadata server. It only resolves on Google Compute infrastructure; anywhere else the request is unreachable and fails.

```ts
import { cloudRunInstanceId } from '@fact-check-database/core-vendor/cloud-run'

cloudRunInstanceId
// → Effect<string, CloudRunInstanceError>
```

## Logging

Two modules combine to produce the platform's structured, Cloud-Logging-ready logger. `pino` adapts a Pino logger into an Effect `Logger`: it maps Effect log levels to Pino levels, merges log annotations, span durations, and the current fiber's name into each log line, and reduces a failure `Cause` to a plain `Error` when there is one to show. `pino-logging-gcp-config` builds the Pino options that shape the log output for Cloud Logging — service name and version, log level from configuration, and a formatter that renames a `cause` field to `err` so Cloud Logging renders it as an error report.

```ts
import { Effect, Logger } from 'effect'
import { pinoLogger } from '@fact-check-database/core-vendor/pino'
import { make as gcpLoggingConfig } from '@fact-check-database/core-vendor/pino-logging-gcp-config'

const logger = Logger.addScoped(
  gcpLoggingConfig.pipe(Effect.andThen((config) => pinoLogger(config)))
)

Effect.logInfo('started').pipe(Effect.provide(logger))
```

### This library's own log output

Every module in this package logs at two levels only. It never logs at `info`, `warning`, `error` or `fatal`. Those levels belong to the consuming app, which decides what a vendor outcome means for its own workload.

- **`trace`**: expected steps, logged once each has completed. That covers acquiring and releasing resources ("Client created", "Bucket opened", "Subscription closed", "Logger flushed") and each SDK action ("Messages pulled", "File written", "Job created", "Objects saved").
- **`debug`**: unexpected conditions. Every SDK call that fails logs a debug entry ("File write failed", "Job creation failed") before its typed error reaches the caller. A failed `close()` or log flush during release is logged at debug and otherwise ignored.

This package never deliberately kills the process, so it has no use for `fatal`.

#### Annotations

Log messages are constant strings. Values are attached as structured annotations so they can be queried.

- Every log carries `module`, set to the module's name, e.g. `module=StorageBucket`. When a `core-io` adapter calls into this package, both keys appear: `adapter=CloudStorageStorageWriter module=StorageBucket`.
- Other keys follow the value's source, e.g. `bucket.name`, `file.name`, `topic.name`, `subscriptionId`, `ackIds.length`, `job.id`, `indexName`, `objects.length`.
- Annotations are scoped to one construction, action or release, and are closed when it finishes. They never persist on a layer's scope, so they don't leak into the consuming app's logs. `src/logAnnotationScope.spec.ts` guards this.

A failure's debug entry is annotated with only the error's tag (`error._tag`) and the SDK's status code (`cause.code`) when there is one. The raw SDK error is never logged, because its message can echo request contents. The full error is still available to the caller on the typed error's `cause`.

**Never annotated:** message data and attributes, file contents, SDK option objects (which can carry credentials such as Algolia's `apiKey`), and records sent to Algolia.

## Error convention

Each module exports one `Data.TaggedError` named after the module, carrying `cause` and `message`, so a caller can handle every failure from that vendor with a single `Effect.catchTag`:

`AlgoliaSearchClientIOError`, `BigQueryClientIOError`, `PubsubClientIOError`, `PubsubTopicIOError`, `PubsubSubscriberClientIOError`, `PubsubSubscriptionIOError`, `StorageBucketIOError`, `CloudRunInstanceError`.

`PubsubClientIOError` and `PubsubSubscriptionIOError` are raised only when `close()` fails during release. They are logged at `debug` and swallowed there, so callers never receive them.

```ts
PubsubTopic.publishMessage(message).pipe(
  Effect.catchTag('PubsubTopicIOError', (err) =>
    Effect.logError('Publish failed', err.cause)
  )
)
```

See [docs/known-issues.md](./docs/known-issues.md) for this package's remaining test-coverage gaps.
