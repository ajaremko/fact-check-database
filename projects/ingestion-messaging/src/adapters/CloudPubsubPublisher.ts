import { Config, ConfigError, Effect, Layer } from 'effect'

import * as PubsubClient from '@news-research/ingestion-vendor/cloud-pubsub/PubsubClient'
import * as PubsubTopic from '@news-research/ingestion-vendor/cloud-pubsub/PubsubTopic'

import { Publisher, PublisherError } from '../Publisher'

export const make = Effect.gen(function* () {
  const { topic } = yield* PubsubTopic.PubsubTopic
  return Publisher.of({
    publish: (data) =>
      PubsubTopic.publishMessage({ data }).pipe(
        Effect.mapError(
          (cause) =>
            new PublisherError({
              cause,
              message: 'Failed to publish message',
            })
        ),
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
