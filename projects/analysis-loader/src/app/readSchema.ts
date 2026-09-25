import { Context, Data, Effect, Schema } from 'effect'

import * as Node from '@fact-check-database/core-data/Node'
import { FilePointer, readFile } from '@fact-check-database/core-io'

const decodeSchema = Schema.Object.pipe(
  Node.parseJson(),
  Node.parseUint8Array({ encoding: 'utf-8' }),
  Schema.decode
)

/**
 * Reads and decodes a BigQuery table schema from storage. Wrapped in
 * `Effect.cachedFunction` below, so this body runs, and logs, only on a cache
 * miss: once per schema object per instance.
 */
function fetchSchema(pointer: FilePointer) {
  return Effect.gen(function* () {
    yield* Effect.annotateLogsScoped({
      'schema.bucket': pointer.bucket,
      'schema.object': pointer.object,
    })
    const schema = yield* readFile(pointer).pipe(Effect.andThen(decodeSchema))
    yield* Effect.logInfo('Batch schema read')
    return schema
  }).pipe(Effect.scoped, Effect.withSpan('readSchema'))
}

const makeSchemaReader = Effect.map(
  Effect.cachedFunction(fetchSchema),
  // The cache compares keys with `Equal`, which is by reference for plain
  // objects. `Data.struct` makes pointers with the same fields equal, so a
  // schema is fetched once rather than on every request.
  (read) => ({ read: (pointer: FilePointer) => read(Data.struct(pointer)) })
)

type SchemaReader = Effect.Effect.Success<typeof makeSchemaReader>

const SchemaReader = Context.GenericTag<SchemaReader>('SchemaReader')

export const provideSchemaReader = Effect.provideServiceEffect(
  SchemaReader,
  makeSchemaReader
)

export const { read: readSchema } = Effect.serviceFunctions(SchemaReader)
