# core-vendor

The platform's boundary with the external SDKs it depends on: Google Cloud Pub/Sub, Cloud Storage, BigQuery, Algolia, Pino, and a Cloud Run metadata helper.

Every SDK client is reached through an Effect `Context.Tag`, never constructed directly by application code. Every SDK call that can reject is wrapped in `Effect.tryPromise` so the failure lands in the Effect error channel as a typed error rather than a thrown exception. This is where that boundary lives, so the rest of the platform depends on Effect services, not on a specific vendor's client API.

The package is `@news-research/core-vendor`. There is no root export; every module is reached by its own subpath, imported as a namespace:

```ts
import * as StorageBucket from '@news-research/core-vendor/cloud-storage/StorageBucket'
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
import * as BigQueryClient from '@news-research/core-vendor/bigquery/BigQueryClient'

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
| `PubsubClient.layer()`           | `PubsubClient`           | —               | `Layer.effect` |
| `PubsubTopic.layer(name)`        | `PubsubTopic`            | `PubsubClient`  | `Layer.effect` |
| `PubsubSubscription.layer(name)` | `PubsubSubscription`     | `PubsubClient`  | `Layer.scoped` |
| `PubsubSubscriberClient.layer()` | `PubsubSubscriberClient` | —               | `Layer.effect` |
| `StorageClient.layer()`          | `StorageClient`          | —               | `Layer.effect` |
| `StorageBucket.layer(name)`      | `StorageBucket`          | `StorageClient` | `Layer.effect` |
| `BigQueryClient.layer()`         | `BigQueryClient`         | —               | `Layer.effect` |
| `AlgoliaSearchClient.layer()`    | `AlgoliaSearchClient`    | —               | `Layer.effect` |

`PubsubSubscription` is the one scoped layer: the subscription is closed via `subscription.close()` automatically when the enclosing Effect scope is released, so it must be provided through `Layer.scoped` or used inside `Effect.scoped`.

## Pub/Sub

`PubsubTopic` publishes; `PubsubSubscription` and `PubsubSubscriberClient` read, using two different SDK access patterns. `PubsubSubscription` wraps the SDK's own `Subscription`, which manages a persistent streaming pull internally and pushes messages as they arrive. `PubsubSubscriberClient` wraps the lower-level v1 `SubscriberClient` for manual, one-shot `pull`/`acknowledge` calls, which is what a batch-style job uses to fetch and process a bounded set of messages at a time.

```ts
import { Config, Effect } from 'effect'
import * as PubsubTopic from '@news-research/core-vendor/cloud-pubsub/PubsubTopic'
import * as PubsubSubscriberClient from '@news-research/core-vendor/cloud-pubsub/PubsubSubscriberClient'

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
import * as StorageBucket from '@news-research/core-vendor/cloud-storage/StorageBucket'

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
import * as BigQueryClient from '@news-research/core-vendor/bigquery/BigQueryClient'

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
import * as AlgoliaSearchClient from '@news-research/core-vendor/algolia/AlgoliaSearchClient'

AlgoliaSearchClient.saveObjects({ indexName: 'fact_checks', objects: records })
```

## Cloud Run

`cloudRunInstanceId` reads the running revision's numeric instance ID from the GCP metadata server. It only resolves on Google Compute infrastructure; anywhere else the request is unreachable and fails.

```ts
import { cloudRunInstanceId } from '@news-research/core-vendor/cloud-run'

cloudRunInstanceId
// → Effect<string, CloudRunInstanceError>
```

## Logging

Two modules combine to produce the platform's structured, Cloud-Logging-ready logger. `pino` adapts a Pino logger into an Effect `Logger`: it maps Effect log levels to Pino levels, merges log annotations, span durations, and the current fiber's name into each log line, and reduces a failure `Cause` to a plain `Error` when there is one to show. `pino-logging-gcp-config` builds the Pino options that shape the log output for Cloud Logging — service name and version, log level from configuration, and a formatter that renames a `cause` field to `err` so Cloud Logging renders it as an error report.

```ts
import { Effect, Logger } from 'effect'
import { pinoLogger } from '@news-research/core-vendor/pino'
import { make as gcpLoggingConfig } from '@news-research/core-vendor/pino-logging-gcp-config'

const logger = Logger.addScoped(
  gcpLoggingConfig.pipe(Effect.andThen((config) => pinoLogger(config)))
)

Effect.logInfo('started').pipe(Effect.provide(logger))
```

Every other module in this package — every Pub/Sub, Cloud Storage, BigQuery, and Algolia client, plus `cloudRunInstanceId` — logs at `trace` only, and only at construction time (creating a client, accessing a topic or bucket). None of them log at `info`, `warning`, `error`, or `fatal`, so a consuming app's own logging owns every level above `trace` without needing to work around anything this package does.

## Error convention

Each module exports one `Data.TaggedError` named after the module, carrying `cause` and `message`, so a caller can handle every failure from that vendor with a single `Effect.catchTag`:

`AlgoliaSearchClientIOError`, `BigQueryClientIOError`, `PubsubTopicIOError`, `PubsubSubscriberClientIOError`, `PubsubSubscriptionIOError`, `StorageBucketIOError`, `CloudRunInstanceError`.

`PubsubSubscriptionIOError` is declared but not currently thrown by `PubsubSubscription`'s layer itself; it is reserved for subscription-related failures a caller may want to distinguish.

```ts
PubsubTopic.publishMessage(message).pipe(
  Effect.catchTag('PubsubTopicIOError', (err) =>
    Effect.logError('Publish failed', err.cause)
  )
)
```

See [docs/known-issues.md](./docs/known-issues.md) for this package's current test-coverage gap.
