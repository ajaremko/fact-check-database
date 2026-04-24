import { Config, ConfigError, Effect, Layer, pipe, Schema } from 'effect'
import { ParseError } from 'effect/ParseResult'

import { StorageBucket, StorageClient } from '@news-research/cloud-storage'
import { Node } from '@news-research/ingestion/util'

import { ClaimsSchema, FieldSchema } from '../../ClaimsSchema'

const decodeFields = pipe(
  Schema.Array(FieldSchema),
  Node.parseJson(),
  Node.parseBuffer({ encoding: 'utf-8' }),
  Schema.decode
)

export const make = Effect.gen(function* () {
  const uri = yield* Config.string('CLAIMS_SCHEMA_URI')
  const [buf] = yield* StorageBucket.downloadFile(uri)
  const fields = yield* decodeFields(buf)
  return ClaimsSchema.of({ fields })
})

export const layer: Layer.Layer<
  ClaimsSchema,
  ConfigError.ConfigError | ParseError | StorageBucket.StorageBucketIOError,
  StorageClient.StorageClient
> = Layer.effect(ClaimsSchema, make).pipe(
  Layer.provide(StorageBucket.layer(Config.string('ASSETS_BUCKET_NAME')))
)
