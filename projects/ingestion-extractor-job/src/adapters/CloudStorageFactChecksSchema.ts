import { Config, ConfigError, Effect, Layer, pipe, Schema } from 'effect'
import { ParseError } from 'effect/ParseResult'

import {
  StorageBucket,
  StorageClient,
} from '@news-research/ingestion-core/vendor/cloud-storage'
import { BigQueryTableSchemaSchema } from '@news-research/ingestion-core/pipeline/extract/contracts/v1'
import { Node } from '@news-research/ingestion-core/data'

import { FactChecksTableSchema } from '../FactChecksTableSchema'

const decodeFields = pipe(
  BigQueryTableSchemaSchema.fields.fields,
  Node.parseJson(),
  Node.parseBuffer({ encoding: 'utf-8' }),
  Schema.decode
)

export const make = Effect.gen(function* () {
  const uri = yield* Config.string('CLAIMS_SCHEMA_URI')
  const [buf] = yield* StorageBucket.downloadFile(uri)
  const fields = yield* decodeFields(buf)
  return FactChecksTableSchema.of({ fields })
})

export const layer: Layer.Layer<
  FactChecksTableSchema,
  ConfigError.ConfigError | ParseError | StorageBucket.StorageBucketIOError,
  StorageClient.StorageClient
> = Layer.effect(FactChecksTableSchema, make).pipe(
  Layer.provide(StorageBucket.layer(Config.string('ASSETS_BUCKET_NAME')))
)
