import { Config, Effect, Layer, pipe, Schema } from 'effect'
import { PubSub } from '@google-cloud/pubsub'

import { Publisher, PublisherError } from '../../ports/Publisher'
import { ObservationFetchedSchema } from '../../domain/Observation'
import { parseBuffer, parseJson } from '../../utils/schema'

// ObservationFetched -> JSON -> Buffer
const encodeMessage = pipe(
  ObservationFetchedSchema,
  parseJson(),
  parseBuffer({ encoding: 'utf-8' }),
  Schema.encode
)

export const make = Effect.gen(function* () {
  const topicName = yield* Config.string('PUBSUB_TOPIC_NAME')
  const client = new PubSub()
  const topic = client.topic(topicName)
  return Publisher.of({
    publish: (event) =>
      Effect.gen(function* () {
        const data = yield* encodeMessage(event).pipe(
          Effect.mapError((raw) => new PublisherError({ raw }))
        )
        yield* Effect.tryPromise({
          try: () => topic.publishMessage({ data }),
          catch: (raw) => new PublisherError({ raw }),
        })
      }),
  })
})

export const layer = Layer.effect(Publisher, make)
