import { Context, Effect, Schema, flow } from 'effect'

import * as Node from '@news-research/core-data/Node'
import { readFile } from '@news-research/core-io'

const decodeSchema = Schema.Object.pipe(
  Node.parseJson(),
  Node.parseUint8Array({ encoding: 'utf-8' }),
  Schema.decode
)

const makeSchemaReader = Effect.map(
  Effect.cachedFunction(
    flow(readFile, Effect.andThen(decodeSchema), Effect.withSpan('readSchema'))
  ),
  (read) => ({ read })
)

type SchemaReader = Effect.Effect.Success<typeof makeSchemaReader>

const SchemaReader = Context.GenericTag<SchemaReader>('SchemaReader')

export const provideSchemaReader = Effect.provideServiceEffect(
  SchemaReader,
  makeSchemaReader
)

export const { read: readSchema } = Effect.serviceFunctions(SchemaReader)
