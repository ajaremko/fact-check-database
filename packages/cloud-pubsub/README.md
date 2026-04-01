# @news-research/cloud-pubsub

An Effect-based wrapper around the `@google-cloud/pubsub` SDK.

## Exported Services

Three services are provided:

- **`PubsubClient`** — shared GCP client; required by the other two
- **`PubsubTopic`** — publisher for a named topic; exposes `publishMessage()`
- **`PubsubSubscription`** — scoped subscriber for a named subscription; closes automatically on scope release

## Examples

### Publishing messages

Create an effect using `publishMessage` that published as message to the Pubsub topic in context. The returned Effect resolves to the published message ID.

```typescript
import { PubsubClient, PubsubTopic } from '@news-research/cloud-pubsub'

const data = Buffer.from(JSON.stringify({ foo: 'bar' }))

const program = PubsubTopic.publishMessage({ data })

program.pipe(
  Effect.provide(PubsubTopic.layer(Config.string('PUBSUB_TOPIC_NAME'))),
  Effect.provide(PubsubClient.layer())
)
```

### Subscribing to messages

`PubsubSubscription` exposes the underlying `Subscription` object from `@google-cloud/pubsub`. Attach a `message` event listener to receive messages; call `message.ack()` to acknowledge or `message.nack()` to reject and redeliver. The subscription is closed automatically when the Effect scope exits.

```typescript
import { Effect, Queue } from 'effect'
import { PubsubClient, PubsubSubscription } from '@news-research/cloud-pubsub'

const program = Effect.gen(function* () {
  const { subscription } = yield* PubsubSubscription.PubsubSubscription
  const queue = yield* Queue.unbounded<string>()

  yield* Effect.sync(() => {
    subscription.on('message', (message) => {
      const body = message.data.toString('utf-8')
      Effect.runFork(Queue.offer(queue, body))
      message.ack()
    })
  })

  // Process messages from the queue
  while (true) {
    const body = yield* Queue.take(queue)
    yield* Effect.log(body)
  }
})

program.pipe(
  Effect.provide(
    PubsubSubscription.layer(Config.string('PUBSUB_SUBSCRIPTION_NAME'))
  ),
  Effect.provide(PubsubClient.layer())
)
```
