import { Config, ConfigError, Effect, Layer, pipe, Schema } from 'effect'
import { ParseError } from 'effect/ParseResult'

import { StorageBucket, StorageClient } from '../../../vendor/cloud-storage'
import { Node } from '../../../data'

import { BigQueryTableSchemaSchema } from '../BigQueryTableSchema'
import { FactChecksTableSchema } from '../FactChecksTableSchema'

const decodeFields = pipe(
  BigQueryTableSchemaSchema.fields.fields,
  Node.parseJson(),
  Node.parseBuffer({ encoding: 'utf-8' }),
  Schema.decode
)

export const make = Effect.gen(function* () {
  const uri = yield* Config.string('FACT_CHECKS_TABLE_SCHEMA_URI')
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
