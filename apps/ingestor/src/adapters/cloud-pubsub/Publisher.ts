import { Config, ConfigError, Effect, flow, Layer, pipe, Schema } from 'effect'

import { PubsubClient, PubsubTopic } from '@news-research/cloud-pubsub'
import { IngestionAttempted } from '@news-research/ingestion/steps/ingest'
import { Node } from '@news-research/ingestion/util'

import { Publisher, PublisherError } from '../../Publisher'

const encodeEvent = pipe(
  IngestionAttempted,
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
      Effect.provideService(PubsubTopic.PubsubTopic, { topic }),
      Effect.withSpan('publish')
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
