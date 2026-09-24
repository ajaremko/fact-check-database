import { Config, ConfigError, Effect, Layer } from 'effect'

import * as PubsubClient from '@fact-check-database/core-vendor/cloud-pubsub/PubsubClient'
import * as PubsubTopic from '@fact-check-database/core-vendor/cloud-pubsub/PubsubTopic'

import { Publisher, PublisherError } from '../ports/Publisher'

const adapter = 'CloudPubsubPublisher'

/** Builds a {@link Publisher} that publishes each message to the current Pub/Sub topic. */
export const make = Effect.gen(function* () {
  const { topic } = yield* PubsubTopic.PubsubTopic
  yield* Effect.annotateLogsScoped({ adapter, 'topic.name': topic.name })
  yield* Effect.logTrace('Publisher created')

  return Publisher.of({
    publish: (data) =>
      Effect.gen(function* () {
        yield* Effect.annotateLogsScoped({ adapter, 'topic.name': topic.name })

        const messageId = yield* PubsubTopic.publishMessage({ data }).pipe(
          Effect.mapError(
            (cause) =>
              new PublisherError({
                cause,
                message: 'Failed to publish message',
              })
          ),
          Effect.provideService(PubsubTopic.PubsubTopic, { topic })
        )

        yield* Effect.annotateLogsScoped({ messageId })
        yield* Effect.logTrace('Message published')
      }).pipe(Effect.scoped),
  })
}).pipe(Effect.scoped)

/** Layer providing {@link Publisher} backed by the `PUBSUB_TOPIC_NAME` Pub/Sub topic. Production adapter. */
export const layer: Layer.Layer<
  Publisher,
  ConfigError.ConfigError,
  PubsubClient.PubsubClient
> = Layer.effect(Publisher, make).pipe(
  Layer.provide(PubsubTopic.layer(Config.string('PUBSUB_TOPIC_NAME')))
)
