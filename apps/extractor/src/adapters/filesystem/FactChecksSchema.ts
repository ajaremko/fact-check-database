import { Config, Effect, Layer, pipe, Schema } from 'effect'
import { FileSystem } from '@effect/platform'

import { Node } from '@news-research/ingestion/data'

import { FactChecksSchema, FieldSchema } from '../../FactChecksSchema'

const decodeFields = pipe(
  Schema.Array(FieldSchema),
  Node.parseJson(),
  Node.parseUint8Array({ encoding: 'utf-8' }),
  Schema.decode
)

export const make = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem
  const path = yield* Config.string('CLAIMS_SCHEMA_PATH')
  const data = yield* fs.readFile(path)
  const fields = yield* decodeFields(data)
  return FactChecksSchema.of({ fields })
})

export const layer = Layer.effect(FactChecksSchema, make)
