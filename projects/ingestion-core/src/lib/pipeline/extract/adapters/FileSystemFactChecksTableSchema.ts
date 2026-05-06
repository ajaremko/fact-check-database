import { Config, Effect, Layer, pipe, Schema } from 'effect'
import { FileSystem } from '@effect/platform'

import { Node } from '../../../data'

import { BigQueryTableSchemaSchema } from '../BigQueryTableSchema'
import { FactChecksTableSchema } from '../FactChecksTableSchema'

const decodeFields = pipe(
  BigQueryTableSchemaSchema.fields.fields,
  Node.parseJson(),
  Node.parseUint8Array({ encoding: 'utf-8' }),
  Schema.decode
)

export const make = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem
  const path = yield* Config.string('FACT_CHECKS_TABLE_SCHEMA_PATH')
  const data = yield* fs.readFile(path)
  const fields = yield* decodeFields(data)
  return FactChecksTableSchema.of({ fields })
})

export const layer = Layer.effect(FactChecksTableSchema, make)
