import { Config, Effect, Layer } from 'effect'
import { PubSub } from '@google-cloud/pubsub'

import { Publisher, PublisherError } from '../../ports/Publisher'

export const make = Effect.gen(function* () {
  const topicName = yield* Config.string('PUBSUB_TOPIC_NAME')
  const client = new PubSub()
  const topic = client.topic(topicName)
  return Publisher.of({
    publish: (event) =>
      Effect.tryPromise({
        try: () => {
          const data = JSON.stringify(event)
          const dataBuffer = Buffer.from(data)
          return topic.publish(dataBuffer)
        },
        catch: (error) => new PublisherError({ raw: error }),
      }),
  })
})

export const layer = Layer.effect(Publisher, make)
