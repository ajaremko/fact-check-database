import { Config, Effect, Layer, pipe, Schema } from 'effect'
import { FileSystem } from '@effect/platform'

import { BigQueryTableSchemaSchema } from '@news-research/ingestion-core/pipeline/extract/contracts/v1'
import { Node } from '@news-research/ingestion-core/data'

import { FactChecksTableSchema } from '../FactChecksTableSchema'

const decodeFields = pipe(
  BigQueryTableSchemaSchema.fields.fields,
  Node.parseJson(),
  Node.parseUint8Array({ encoding: 'utf-8' }),
  Schema.decode
)

export const make = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem
  const path = yield* Config.string('CLAIMS_SCHEMA_PATH')
  const data = yield* fs.readFile(path)
  const fields = yield* decodeFields(data)
  return FactChecksTableSchema.of({ fields })
})

export const layer = Layer.effect(FactChecksTableSchema, make)
