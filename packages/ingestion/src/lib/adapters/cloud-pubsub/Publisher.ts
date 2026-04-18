import { Config, ConfigError, Effect, Layer } from 'effect'

import { PubsubClient, PubsubTopic } from '@news-research/cloud-pubsub'

import { Publisher } from '../../messaging'

export const make = Effect.gen(function* () {
  const { topic } = yield* PubsubTopic.PubsubTopic
  return Publisher.Publisher.of({
    publish: (data) =>
      PubsubTopic.publishMessage({ data }).pipe(
        Effect.mapError((cause) => new Publisher.PublisherError({ cause })),
        Effect.provideService(PubsubTopic.PubsubTopic, { topic })
      ),
  })
})

export const layer: Layer.Layer<
  Publisher.Publisher,
  ConfigError.ConfigError,
  PubsubClient.PubsubClient
> = Layer.effect(Publisher.Publisher, make).pipe(
  Layer.provide(PubsubTopic.layer(Config.string('PUBSUB_TOPIC_NAME')))
)
