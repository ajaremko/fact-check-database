# @news-research/cloud-pubsub

An Effect-based wrapper around the `@google-cloud/pubsub` SDK.

## Exported Services

The package exports three namespaces: `PubsubClient`, `PubsubTopic`, and `PubsubSubscription`. Each exposes a `Context.Tag` class, a `layer` factory, and (where applicable) utility functions and error types.

```typescript
import {
  PubsubClient,
  PubsubTopic,
  PubsubSubscription,
} from '@news-research/cloud-pubsub'
```

---

### PubsubClient

Provides a shared `PubSub` client instance. This is the base layer that `PubsubTopic` and `PubsubSubscription` both depend on.

**Layer factory:**

```typescript
PubsubClient.layer(config?: PubsubOptionsConfig): Layer<PubsubClient>
```

`config` is optional. When omitted, the client is instantiated with no arguments and uses Application Default Credentials. When provided, each key maps to a `Config.Config<T>` value resolved at Effect runtime.

```typescript
// Using ADC (typical in Cloud Run)
Effect.provide(PubsubClient.layer())

// With explicit options
Effect.provide(
  PubsubClient.layer({
    projectId: Config.string('PUBSUB_PROJECT_ID'),
  })
)
```

---

### PubsubTopic

Provides a `Topic` instance for publishing messages. Requires `PubsubClient` in the layer stack.

**Layer factory:**

```typescript
PubsubTopic.layer(topicName: Config.Config<string>, config?: TopicOptionsConfig): Layer<PubsubTopic, never, PubsubClient>
```

`topicName` is required and must be a `Config.Config<string>` — typically an env var read via `Config.string(...)`.

```typescript
Effect.provide(PubsubTopic.layer(Config.string('PUBSUB_TOPIC_NAME')))
```

**Publishing messages:**

```typescript
PubsubTopic.publishMessage(message: MessageOptions): Effect<string | number, PubsubTopicIOError, PubsubTopic>
```

Publishes a single message and returns the message ID on success. Wraps the underlying promise in `Effect.tryPromise`, catching any rejection as a `PubsubTopicIOError`.

```typescript
PubsubTopic.publishMessage({ data: Buffer.from(JSON.stringify(payload)) })
```

**Error type:**

```typescript
class PubsubTopicIOError extends Data.TaggedError('PubsubTopicIOError')<{
  readonly cause: unknown
}>
```

---

### PubsubSubscription

Provides a `Subscription` instance for receiving messages. Requires `PubsubClient` in the layer stack.

Unlike `PubsubClient` and `PubsubTopic`, this layer is **scoped**: the subscription is automatically closed when the Effect scope is released. This ensures the subscriber connection is properly torn down on shutdown.

**Layer factory:**

```typescript
PubsubSubscription.layer(subscriptionName: Config.Config<string>, config?: SubscriptionOptionsConfig): Layer<PubsubSubscription, never, PubsubClient>
```

```typescript
Effect.provide(
  PubsubSubscription.layer(Config.string('PUBSUB_SUBSCRIPTION_NAME'))
)
```

The subscription is acquired on layer construction and released (via `subscription.close()`) when the enclosing scope exits.

**Error type:**

```typescript
class PubsubSubscriptionIOError extends Data.TaggedError('PubsubSubscriptionIOError')<{
  readonly cause: unknown
}>
```

---

## Layer Composition

`PubsubTopic` and `PubsubSubscription` both depend on `PubsubClient`. Provide them in order:

```typescript
program.pipe(
  Effect.provide(PubsubTopic.layer(Config.string('PUBSUB_TOPIC_NAME'))),
  Effect.provide(PubsubClient.layer())
)
```

Or compose the layers explicitly:

```typescript
const layer = PubsubTopic.layer(Config.string('PUBSUB_TOPIC_NAME')).pipe(
  Layer.provide(PubsubClient.layer())
)

program.pipe(Effect.provide(layer))
```

For programs that publish and subscribe concurrently, both can be provided alongside a single shared client:

```typescript
program.pipe(
  Effect.provide(PubsubTopic.layer(Config.string('PUBSUB_TOPIC_NAME'))),
  Effect.provide(
    PubsubSubscription.layer(Config.string('PUBSUB_SUBSCRIPTION_NAME'))
  ),
  Effect.provide(PubsubClient.layer())
)
```

---

## Configuration

Topic and subscription names are passed as `Config.Config<string>` values rather than plain strings.

```typescript
PubsubTopic.layer(Config.string('PUBSUB_TOPIC_NAME'))
```

Optional publish and subscriber options follow the same pattern — each key in the options object is wrapped in `Config.Config<T>`:

```typescript
PubsubTopic.layer(Config.string('PUBSUB_TOPIC_NAME'), {
  batching: Config.boolean('PUBSUB_BATCHING_ENABLED'),
})
```

---

## Error Handling

| Error                       | Thrown by                               | Cause                                                           |
| --------------------------- | --------------------------------------- | --------------------------------------------------------------- |
| `PubsubTopicIOError`        | `PubsubTopic.publishMessage`            | Any rejection from the underlying `topic.publishMessage()` call |
| `PubsubSubscriptionIOError` | Reserved for subscription IO operations | Not currently thrown by the layer itself                        |

Catch specific errors with `Effect.catchTag`:

```typescript
yield *
  PubsubTopic.publishMessage(message).pipe(
    Effect.catchTag('PubsubTopicIOError', (err) => {
      yield * Effect.logError('Publish failed', err.cause)
      return Effect.fail(err)
    })
  )
```
