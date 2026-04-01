import { Config, Context, Data, Effect, flow, Layer } from 'effect'
import { Topic, PublishOptions } from '@google-cloud/pubsub'
import type { MessageOptions } from '@google-cloud/pubsub/build/src/topic'

import { PubsubClient } from './PubsubClient'

/**
 * Provides a Google Cloud Pub/Sub `Topic` for publishing messages.
 *
 * Requires `PubsubClient` in the layer stack.
 */
export class PubsubTopic extends Context.Tag('PubsubTopic')<
  PubsubTopic,
  {
    readonly topic: Topic
  }
>() {}

type TopicOptionsConfig = {
  [k in keyof PublishOptions]?: Config.Config<NonNullable<PublishOptions[k]>>
}

function make(topicName: Config.Config<string>, config?: TopicOptionsConfig) {
  return Effect.gen(function* () {
    const { client } = yield* PubsubClient
    const name = yield* topicName
    if (config) {
      const options = yield* Config.all(config)
      const topic = client.topic(name, options)
      return { topic }
    }
    const topic = client.topic(name)
    return { topic }
  })
}

/**
 * Creates an Effect layer providing a `PubsubTopic`.
 *
 * `topicName` is required and must be a `Config.Config<string>`, typically an
 * environment variable. Optional publish options follow the same pattern.
 *
 * @example
 * Effect.provide(PubsubTopic.layer(Config.string('PUBSUB_TOPIC_NAME')))
 */
export const layer = flow(make, Layer.effect(PubsubTopic))

/**
 * Thrown when a `topic.publishMessage()` call rejects.
 *
 * @example
 * yield* PubsubTopic.publishMessage(message).pipe(
 *   Effect.catchTag('PubsubTopicIOError', (err) => Effect.logError('Publish failed', err.cause))
 * )
 */
export class PubsubTopicIOError extends Data.TaggedError('PubsubTopicIOError')<{
  readonly cause: unknown
}> {}

/**
 * Publishes a single message to the topic and returns the message ID.
 *
 * Requires `PubsubTopic` in context. Any rejection from the underlying
 * `topic.publishMessage()` call is caught and wrapped as a `PubsubTopicIOError`.
 *
 * @example
 * yield* PubsubTopic.publishMessage({ data: Buffer.from(JSON.stringify(payload)) })
 */
export function publishMessage(message: MessageOptions) {
  return PubsubTopic.pipe(
    Effect.andThen(({ topic }) =>
      Effect.tryPromise({
        try: () => topic.publishMessage(message),
        catch: (cause) => new PubsubTopicIOError({ cause }),
      })
    )
  )
}
