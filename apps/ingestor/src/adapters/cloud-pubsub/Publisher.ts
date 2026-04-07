import { Config, ConfigError, Effect, flow, Layer, pipe, Schema } from 'effect'

import { PubsubClient, PubsubTopic } from '@news-research/cloud-pubsub'
import { IngestionAttemptedSchema } from '@news-research/ingestion/ingest'
import { Node } from '@news-research/node'

import { Publisher, PublisherError } from '../../ports/Publisher'

const encodeEvent = pipe(
  IngestionAttemptedSchema,
  Node.parseJson(),
  Node.parseBuffer({ encoding: 'utf-8' }),
  Schema.encode
)

export const make = Effect.gen(function* () {
  const { topic } = yield* PubsubTopic.PubsubTopic
  return Publisher.of({
    publish: flow(
      encodeEvent,
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
