import { Config, ConfigError, Effect, Layer } from 'effect'

import * as PubsubClient from '@news-research/core-vendor/cloud-pubsub/PubsubClient'
import * as PubsubTopic from '@news-research/core-vendor/cloud-pubsub/PubsubTopic'

import { Publisher, PublisherError } from '../ports/Publisher'

/** Builds a {@link Publisher} that publishes each message to the current Pub/Sub topic. */
export const make = Effect.gen(function* () {
  const { topic } = yield* PubsubTopic.PubsubTopic
  yield* Effect.logTrace(`Creating pubsub publisher for topic: ${topic.name}`)
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

/** Layer providing {@link Publisher} backed by the `PUBSUB_TOPIC_NAME` Pub/Sub topic. Production adapter. */
export const layer: Layer.Layer<
  Publisher,
  ConfigError.ConfigError,
  PubsubClient.PubsubClient
> = Layer.effect(Publisher, make).pipe(
  Layer.provide(PubsubTopic.layer(Config.string('PUBSUB_TOPIC_NAME')))
)
