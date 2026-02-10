import { Config, ConfigError, Effect, Layer, pipe, Schema } from 'effect'

import { PubsubClient, PubsubTopic } from '@news-research/cloud-pubsub'

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

// const topicName = yield* Config.string('PUBSUB_TOPIC_NAME')

export const make = Effect.gen(function* () {
  const { topic } = yield* PubsubTopic.PubsubTopic
  return Publisher.of({
    publish: (event) =>
      encodeMessage(event).pipe(
        Effect.andThen((data) => PubsubTopic.publishMessage({ data })),
        Effect.mapError((cause) => new PublisherError({ cause })),
        Effect.provideService(PubsubTopic.PubsubTopic, { topic })
      ),
  })
})

export const layer: Layer.Layer<
  Publisher,
  ConfigError.ConfigError,
  PubsubClient.PubsubClient
> = Layer.effect(Publisher, make).pipe(
  Layer.provide(PubsubTopic.layer(Config.string('PUBSUB_TOPIC_NAME')))
)
