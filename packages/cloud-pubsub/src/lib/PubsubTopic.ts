import { Config, Context, Data, Effect, flow, Layer } from 'effect'
import { Topic, PublishOptions } from '@google-cloud/pubsub'
import type { MessageOptions } from '@google-cloud/pubsub/build/src/topic'

import { PubsubClient } from './PubsubClient'

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

export const layer = flow(make, Layer.effect(PubsubTopic))

export class PubsubTopicIOError extends Data.TaggedError('PubsubTopicIOError')<{
  readonly cause: unknown
}> {}

export function publish(message: MessageOptions) {
  return PubsubTopic.pipe(
    Effect.andThen(({ topic }) =>
      Effect.tryPromise({
        try: () => topic.publishMessage(message),
        catch: (cause) => new PubsubTopicIOError({ cause }),
      })
    )
  )
}
